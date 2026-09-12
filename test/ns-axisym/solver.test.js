import { describe,it,expect,vi } from "vitest";
import { NSAxisymSolver,analyticBoundary,computeDiagnostics } from "../../src/math/ns-axisym.js";
import { zero,coupledFixture } from "./fixtures.js";

function solver(extra={}) {
  const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:0.5,nu:0.05,boundary:analyticBoundary(zero),...extra});
  expect(s.initialize({...zero,phiGuess:zero.phi}).accepted).toBe(true);
  return s;
}
function snapshot(s) {
  const v=s.velocity();
  return [s.t,s.stepIndex,...[s.a,s.chi,s.phi,v.ur,v.uz,v.Fr,v.Fz].map(a=>Array.from(a))];
}
describe("atomic RK2 and validity controls",()=>{
  it("prepares zero-flow diagnostics before stepping and preserves exact zeros",()=>{
    const s=solver();
    expect(computeDiagnostics(s).energy).toBe(0);
    expect(s.step().accepted).toBe(true);
    const d=computeDiagnostics(s);
    for(const key of ["energy","enstrophy","maxOmega","maxU","maxA","maxDiv"])expect(d[key]).toBe(0);
  });
  it.each([1,2,3])("does not publish state on preparation failure %i",failureAt=>{
    const f=coupledFixture(),s=solver({boundary:f.boundary,source:f.source});
    expect(s.initialize({...f.exact,phiGuess:f.exact.phi}).accepted).toBe(true);
    const before=snapshot(s),original=s._prepare.bind(s);let calls=0;
    vi.spyOn(s,"_prepare").mockImplementation((...args)=>++calls===failureAt?
      {converged:false,reason:"budget",residual:1,sweeps:1,target:1e-10}:original(...args));
    const result=s.step({maxDt:0.001});
    expect(result.accepted).toBe(false);expect(result.dt).toBe(0);
    expect(snapshot(s)).toEqual(before);
  });
  it("rejects unsafe fixed dt and never clamps a stability step upward",()=>{
    const s=solver(),before=snapshot(s);
    expect(s.step({fixedDt:1,maxDt:1}).reason).toBe("unsafe-fixed-step");
    expect(snapshot(s)).toEqual(before);
    const stiff=solver({nu:1e20});
    expect(stiff.step().reason).toBe("dt-underflow");
  });
  it("uses stage times and stage states, and retries from the original state",()=>{
    const f=coupledFixture(),opts={boundary:f.boundary,source:f.source};
    const s=solver(opts),reference=solver(opts);
    for(const x of [s,reference])expect(x.initialize({...f.exact,phiGuess:f.exact.phi}).accepted).toBe(true);
    const base=s._chooseDt.bind(s);let calls=0;
    vi.spyOn(s,"_chooseDt").mockImplementation((state,t)=>{
      const limit=base(state,t);
      return ++calls===2?{dt:0.0005,limitingMechanism:"injected-trial-limit"}:limit;
    });
    const prepared=s._prepare.bind(s),times=[];
    vi.spyOn(s,"_prepare").mockImplementation((state,t,guess)=>{times.push(t);return prepared(state,t,guess);});
    const result=s.step({maxDt:0.001});
    expect(result.accepted).toBe(true);expect(result.attempts).toBe(2);
    expect(reference.step({fixedDt:result.dt}).accepted).toBe(true);
    expect(Array.from(s.a)).toEqual(Array.from(reference.a));
    expect(Array.from(s.chi)).toEqual(Array.from(reference.chi));
    expect(times).toEqual([0,0.001,result.dt,result.dt]);
  });
  it("rejects nonfinite boundary data without corrupting the accepted state",()=>{
    let bad=false;
    const base=analyticBoundary(zero),boundary={...base,fill(g,state,t){base.fill(g,state,t);if(bad)state.a[g.idx(g.nr,0)]=NaN;}};
    const s=solver({boundary}),before=snapshot(s);bad=true;
    expect(s.step().accepted).toBe(false);expect(snapshot(s)).toEqual(before);
  });
  it("checks the chi-producing source when initial strain and chi are zero",()=>{
    const field={a:(_r,z)=>1+z,chi:()=>0,phi:()=>0};
    const s=solver({nu:1e-8,boundary:analyticBoundary(field),limits:{sourceCap:1e-5,maxDt:1}});
    expect(s.initialize({...field,phiGuess:field.phi}).accepted).toBe(true);
    const result=s.step({maxDt:0.01});
    expect(result.accepted).toBe(true);expect(result.limitingMechanism).toBe("source");
    expect(result.dt).toBeLessThan(1e-4);
    expect(Math.max(...s.chi)).toBeGreaterThan(0);
  });
  it("rejects uninitialized use and inconsistent options",()=>{
    expect(()=>new NSAxisymSolver({nr:8,nz:8,R:1,Z:1,nu:0,boundary:analyticBoundary(zero)})).toThrow();
    const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:1,nu:0.1,boundary:analyticBoundary(zero)});
    expect(()=>s.step()).toThrow();expect(()=>s.velocity()).toThrow();
  });
});
