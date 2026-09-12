import { createGrid, allocField, checkField, forEachInterior } from "./grid.js";
import { applyL5, l5Row, ellipticRow, solvePoisson } from "./operators.js";
import { allocVelocity, cornerPsi, faceFluxes, cellVelocity, maxAbsDivergence } from "./velocity.js";
import { advect } from "./advect.js";

const DEFAULTS = { advSafety: 0.25, diffSafety: 0.5, sourceCap: 0.1,
  scaleA: 1, scaleChi: 1, minDt: 1e-14, maxDt: 0.01, maxRetries: 8,
  retryFactor: 0.5, adaptiveHeadroom: 0.9 };
const ROUNDING_SLACK = 32 * Number.EPSILON;

/** Float64 axisymmetric Navier–Stokes with an explicit boundary policy.
 * Arrays exposed by getters are read-only views by contract. All trial work
 * has independent storage; publication occurs only after final preparation.
 */
export class NSAxisymSolver {
  constructor({ nr, nz, R, Z, nu, boundary, limits = {}, poisson = {}, source = null }) {
    this.grid = createGrid({ nr, nz, R, Z });
    if (!Number.isFinite(nu) || nu <= 0) throw new RangeError("Viscosity must be finite and positive");
    if (typeof boundary?.fill !== "function" || typeof boundary?.psi !== "function") {
      throw new TypeError("An explicit boundary policy is required");
    }
    if (source !== null && typeof source !== "function") throw new TypeError("Invalid test source");
    this.nu = nu; this.boundary = boundary; this.source = source;
    this.limits = Object.freeze({ ...DEFAULTS, ...limits });
    for (const key of ["advSafety","diffSafety","sourceCap","scaleA","scaleChi","minDt","maxDt","adaptiveHeadroom"]) {
      if (!Number.isFinite(this.limits[key]) || this.limits[key] <= 0) throw new RangeError("Invalid limit: " + key);
    }
    if (this.limits.advSafety > DEFAULTS.advSafety || this.limits.diffSafety > DEFAULTS.diffSafety ||
        this.limits.adaptiveHeadroom > 1 ||
        !Number.isInteger(this.limits.maxRetries) || this.limits.maxRetries < 0 ||
        this.limits.retryFactor <= 0 || this.limits.retryFactor >= 1 || !Number.isFinite(this.limits.retryFactor)) {
      throw new RangeError("Unsafe stability/retry options");
    }
    this.poisson = { ...poisson };
    this._accepted = this._allocate(); this._original = this._allocate();
    this._trial = this._allocate(); this._candidate = this._allocate();
    this._ra = allocField(this.grid); this._rc = allocField(this.grid);
    this._r0a = allocField(this.grid); this._r0c = allocField(this.grid);
    this._lap = allocField(this.grid);
    this.t = 0; this.stepIndex = 0; this._initialized = false;
  }

  _allocate() {
    const g = this.grid;
    return { a: allocField(g), chi: allocField(g), phi: allocField(g), ...allocVelocity(g) };
  }

  /** Accepted swirl samples, including current boundary ghosts; read-only view. */
  get a() { return this._accepted.a; }
  /** Accepted scaled vorticity samples; read-only view. */
  get chi() { return this._accepted.chi; }
  /** Accepted regular streamfunction samples; read-only view. */
  get phi() { return this._accepted.phi; }

  _sample(target, input, time) {
    target.fill(0);
    if (typeof input === "function") {
      forEachInterior(this.grid, (i,j,k) => { target[k] = input(this.grid.rc(i),this.grid.zc(j),time); });
    } else {
      checkField(this.grid, input, true); target.set(input);
    }
  }

  /** Initialize from samplers or owned copies of ghost-sized arrays. Returns status. */
  initialize({ a, chi, phiGuess = () => 0, time = 0 }) {
    if (!Number.isFinite(time)) throw new RangeError("Invalid initial time");
    const s = this._candidate;
    this._sample(s.a,a,time); this._sample(s.chi,chi,time); this._sample(s.phi,phiGuess,time);
    const prepared = this._prepare(s,time,s.phi);
    if (!prepared.converged) return { accepted: false, reason: prepared.reason, poisson: prepared };
    [this._accepted,this._candidate] = [s,this._accepted];
    this.t = time; this.stepIndex = 0; this._initialized = true;
    return { accepted: true, poisson: prepared };
  }

  _prepare(s, time, guess) {
    const g = this.grid;
    try {
      if (guess !== s.phi) s.phi.set(guess);
      this.boundary.fill(g,s,time);
      checkField(g,s.a,true); checkField(g,s.chi,true); checkField(g,s.phi,true);
      const result = solvePoisson(g,s.phi,s.chi,{ ...this.poisson, boundary: this.boundary.poissonBoundary });
      if (!result.converged) return result;
      this.boundary.afterSolve?.(g,s,time);
      checkField(g,s.chi,true);
      cornerPsi(g,s.phi,s.psi,this.boundary.psi,time);
      faceFluxes(g,s.psi,s.Fr,s.Fz); cellVelocity(g,s.Fr,s.Fz,s.ur,s.uz);
      return result;
    } catch (error) {
      return { converged: false, reason: "invalid-state", message: error.message,
        residual: Infinity, target: 0, sweeps: 0 };
    }
  }

  _source(s, i, j, k, time) {
    const g = this.grid, W = g.W;
    const strain = (s.phi[k+W]-s.phi[k-W])/g.dz;
    const external = this.source ? this.source(g.rc(i),g.zc(j),time) : null;
    return { strain, a: s.a[k]*strain+(external?.a ?? 0),
      chi: (s.a[k+W]**2-s.a[k-W]**2)/(2*g.dz)+(external?.chi ?? 0) };
  }

  _rhs(s,time,ra,rc) {
    const g = this.grid;
    advect(g,s.a,s.Fr,s.Fz,ra); advect(g,s.chi,s.Fr,s.Fz,rc);
    applyL5(g,s.a,this._lap);
    forEachInterior(g,(i,j,k)=> {
      const src = this._source(s,i,j,k,time);
      ra[k] += this.nu*this._lap[k]+src.a; rc[k] += src.chi;
    });
    applyL5(g,s.chi,this._lap);
    forEachInterior(g,(_i,_j,k)=> { rc[k] += this.nu*this._lap[k]; });
    checkField(g,ra,true); checkField(g,rc,true);
  }

  _chooseDt(s,time) {
    const g = this.grid, o = this.limits;
    let aScale = o.scaleA, cScale = o.scaleChi;
    forEachInterior(g,(_i,_j,k)=> {
      aScale = Math.max(aScale,Math.abs(s.a[k])); cScale = Math.max(cScale,Math.abs(s.chi[k]));
    });
    let dt = o.maxDt, limitingMechanism = "max-dt";
    forEachInterior(g,(i,j,k)=> {
      const r = j*(g.nr+1)+i, z = j*g.nr+i;
      const outgoing = Math.max(s.Fr[r+1],0)+Math.max(-s.Fr[r],0)+
        Math.max(s.Fz[z+g.nr],0)+Math.max(-s.Fz[z],0);
      const row = this.boundary.poissonBoundary ? ellipticRow(g,i,j,this.boundary.poissonBoundary) : l5Row(g,i);
      const A = outgoing/(g.rc(i)*g.dr*g.dz), D = this.nu*row.d*(this.boundary.diffusionFactor ?? 1);
      const transport = 1/(A/o.advSafety+D/o.diffSafety);
      const src = this._source(s,i,j,k,time);
      const rate = Math.max(Math.abs(src.strain), Math.abs(src.a)/aScale, Math.abs(src.chi)/cScale);
      const sourceDt = rate === 0 ? Infinity : o.sourceCap/rate;
      if (!Number.isFinite(A) || !Number.isFinite(D) || !Number.isFinite(rate)) {
        dt = NaN; limitingMechanism = "nonfinite"; return;
      }
      if (transport < dt) { dt = transport; limitingMechanism = A === 0 ? "diffusion" : "transport-diffusion"; }
      if (sourceDt < dt) { dt = sourceDt; limitingMechanism = "source"; }
    });
    return { dt, limitingMechanism };
  }

  /** Attempt an SSP-RK2 step. Failure leaves every accepted-state array and time unchanged. */
  step({ maxDt = this.limits.maxDt, fixedDt } = {}) {
    if (!this._initialized) throw new Error("Initialize a valid state before stepping");
    if (!Number.isFinite(maxDt) || maxDt <= 0 || (fixedDt !== undefined &&
        (!Number.isFinite(fixedDt) || fixedDt <= 0))) throw new RangeError("Invalid requested step");
    const g = this.grid, q0 = this._original, trial = this._trial, candidate = this._candidate;
    q0.a.set(this.a); q0.chi.set(this.chi);
    let last = this._prepare(q0,this.t,this.phi);
    let dt = 0, attempt = 0, limitingMechanism = "poisson";
    const failure = reason => ({ accepted: false, dt: 0, attemptedDt: dt, reason,
      attempts: attempt, limitingMechanism, poisson: last });
    if (!last.converged) return failure("poisson-original");
    const limit = this._chooseDt(q0,this.t);
    limitingMechanism = limit.limitingMechanism;
    // Leave room for stage evolution instead of repeatedly halving a step
    // whose trial limit differs from its initial limit only by roundoff.
    dt = Math.min(maxDt, fixedDt ?? limit.dt*this.limits.adaptiveHeadroom);
    if (!Number.isFinite(limit.dt)) return failure("nonfinite-limit");
    if (fixedDt !== undefined && dt > limit.dt*(1+ROUNDING_SLACK)) return failure("unsafe-fixed-step");
    try { this._rhs(q0,this.t,this._r0a,this._r0c); }
    catch { return failure("nonfinite-rhs"); }
    for (attempt = 1; attempt <= this.limits.maxRetries+1; attempt++) {
      if (dt < this.limits.minDt || this.t+dt === this.t) return failure("dt-underflow");
      forEachInterior(g,(_i,_j,k)=> {
        trial.a[k] = q0.a[k]+dt*this._r0a[k]; trial.chi[k] = q0.chi[k]+dt*this._r0c[k];
      });
      last = this._prepare(trial,this.t+dt,q0.phi);
      if (!last.converged) return failure("poisson-trial");
      const trialLimit = this._chooseDt(trial,this.t+dt);
      if (Number.isFinite(trialLimit.dt) && dt <= trialLimit.dt*(1+ROUNDING_SLACK)) {
        try { this._rhs(trial,this.t+dt,this._ra,this._rc); }
        catch { return failure("nonfinite-rhs"); }
        forEachInterior(g,(_i,_j,k)=> {
          candidate.a[k] = (q0.a[k]+trial.a[k]+dt*this._ra[k])/2;
          candidate.chi[k] = (q0.chi[k]+trial.chi[k]+dt*this._rc[k])/2;
        });
        last = this._prepare(candidate,this.t+dt,trial.phi);
        if (!last.converged) return failure("poisson-candidate");
        [this._accepted,this._candidate] = [candidate,this._accepted];
        this.t += dt; this.stepIndex++;
        return { accepted: true, dt, attemptedDt: dt, reason: "accepted", attempts: attempt,
          limitingMechanism, poisson: last };
      }
      if (fixedDt !== undefined) return failure("unsafe-fixed-step");
      if (!Number.isFinite(trialLimit.dt)) return failure("nonfinite-limit");
      dt = Math.min(dt*this.limits.retryFactor,trialLimit.dt*this.limits.retryFactor);
      limitingMechanism = "trial-retry";
    }
    return failure("retry-budget");
  }

  /** Velocity/flux views are valid immediately after initialization or accepted steps. */
  velocity() {
    if (!this._initialized) throw new Error("No prepared accepted state");
    const { ur,uz,Fr,Fz } = this._accepted;
    return { ur,uz,Fr,Fz,maxDiv:maxAbsDivergence(this.grid,Fr,Fz), time:this.t,stepIndex:this.stepIndex };
  }
}
