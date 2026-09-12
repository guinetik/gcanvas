import { analyticBoundary } from "./boundaries.js";
import { noSlipBoundary } from "./walls.js";

const SERIES_THRESHOLD = 1e-4;
function positive(x,name) {
  if (!Number.isFinite(x) || x <= 0) throw new RangeError(name+" must be positive");
}
function regularSwirl(r,C,s) {
  const x = r*r/s;
  const ratio = x < SERIES_THRESHOLD ? 1-x/2+x*x/6-x*x*x/24 : -Math.expm1(-x)/x;
  return C/(2*Math.PI*s)*ratio;
}
function preset(exact,nu) {
  const boundary = analyticBoundary(exact);
  return { boundary, exact, nu, init(solver,time=0) {
    if (solver.nu !== nu || solver.boundary !== boundary) throw new Error("Preset/solver parameters differ");
    return solver.initialize({ a:exact.a,chi:exact.chi,phiGuess:exact.phi,time });
  } };
}

/** Burgers vortex maintained by analytic strain boundary data. */
export function burgersPreset({ alpha,C,nu }) {
  positive(alpha,"strain"); positive(nu,"viscosity");
  if (!Number.isFinite(C)) throw new RangeError("Invalid circulation");
  return preset({ a:r=>regularSwirl(r,C,4*nu/alpha), chi:()=>0,
    phi:(_r,z)=>alpha*z/2, ur:r=>-alpha*r/2, uz:(_r,z)=>alpha*z },nu);
}

/** Positive-age Lamb–Oseen vortex with stage-time analytic boundaries. */
export function lambOseenPreset({ C,nu,t0 }) {
  positive(nu,"viscosity"); positive(t0,"initial age");
  if (!Number.isFinite(C)) throw new RangeError("Invalid circulation");
  const scale = t => { positive(t+t0,"vortex age"); return 4*nu*(t+t0); };
  return preset({ a:(r,_z,t)=>regularSwirl(r,C,scale(t)), chi:()=>0, phi:()=>0,
    ur:()=>0,uz:()=>0,width:t=>Math.sqrt(scale(t)) },nu);
}

/** Compact C-infinity bump and its first two derivatives in physical units. */
function bump(x,width) {
  const q=x/width,d=1-q*q;
  if(d<=0)return {v:0,d1:0,d2:0};
  const v=Math.exp(1-1/d);
  if(v===0)return {v:0,d1:0,d2:0};
  const slope=-2*q/d**2;
  return {v,d1:v*slope/width,d2:v*(slope*slope-2/d**2-8*q*q/d**3)/width**2};
}

/** Opposite swirl annuli with optional compact meridional motion; unforced.
 * b(x)=exp(1-1/(1-x²)) for |x|<1, otherwise zero.
 * a=S br (bz+ - bz-), phi=M br (bz+ + bz-), chi=-L5 phi.
 * Widths are support half-widths, and separation is the center-to-center gap.
 */
export function interactingRingsPreset({nu,R=1,Z=1,ringRadius=0.5,
  radialWidth=0.2,axialWidth=0.2,separation=0.6,swirlStrength=1,meridionalStrength=0}={}) {
  for(const [key,value] of Object.entries({nu,R,Z,ringRadius,radialWidth,axialWidth,separation}))positive(value,key);
  if(!Number.isFinite(swirlStrength)||!Number.isFinite(meridionalStrength))throw new RangeError('Invalid ring strength');
  if(ringRadius-radialWidth<=0||ringRadius+radialWidth>=R||
    separation/2+axialWidth>=Z||separation<=2*axialWidth)throw new RangeError('Ring supports must be disjoint and inside the cylinder');
  const config=Object.freeze({nu,R,Z,ringRadius,radialWidth,axialWidth,separation,swirlStrength,meridionalStrength});
  function at(r,z) {
    const br=bump(r-ringRadius,radialWidth),up=bump(z-separation/2,axialWidth),down=bump(z+separation/2,axialWidth);
    const sum=up.v+down.v;
    return {a:swirlStrength*br.v*(up.v-down.v),phi:meridionalStrength*br.v*sum,
      chi:br.v===0?0:-meridionalStrength*((br.d2+3/r*br.d1)*sum+br.v*(up.d2+down.d2))};
  }
  const initial=Object.freeze(Object.fromEntries(['a','chi','phi'].map(k=>[k,(r,z)=>at(r,z)[k]])));
  const boundary=noSlipBoundary();
  return {config,initial,boundary,nu,init(solver,time=0) {
    if(solver.nu!==nu||solver.grid.R!==R||solver.grid.Z!==Z||solver.boundary!==boundary||solver.source!==null)
      throw new Error('Ring preset requires matching parameters and unforced evolution');
    return solver.initialize({...initial,phiGuess:initial.phi,time});
  }};
}
