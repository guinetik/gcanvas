import {describe,it,expect} from "vitest";
import {NSAxisymSolver,analyticBoundary,computeDiagnostics} from "../../src/math/ns-axisym.js";
describe("physical diagnostics",()=>{
  it("integrates uniform axial flow using the full cylinder volume",()=>{
    const U=2.5,R=1.2,Z=0.7,fields={a:()=>0,chi:()=>0,phi:()=>U/2};
    const s=new NSAxisymSolver({nr:16,nz:16,R,Z,nu:0.1,boundary:analyticBoundary(fields)});
    expect(s.initialize({...fields,phiGuess:fields.phi}).accepted).toBe(true);
    const d=computeDiagnostics(s);
    expect(d.energy).toBeCloseTo(0.5*U*U*2*Math.PI*R*R*Z,10);
    expect(d.enstrophy).toBe(0);expect(d.maxOmega).toBe(0);
  });
  it("recovers solid-body vorticity and converges in rotational energy",()=>{
    const omega=1.5,R=1,Z=0.5,errors=[];
    for(const n of [8,16,32]){
      const f={a:()=>omega,chi:()=>0,phi:()=>0};
      const s=new NSAxisymSolver({nr:n,nz:8,R,Z,nu:0.1,boundary:analyticBoundary(f)});
      expect(s.initialize({...f,phiGuess:f.phi}).accepted).toBe(true);
      const d=computeDiagnostics(s);
      expect(d.maxOmega).toBeCloseTo(2*omega,12);
      expect(d.enstrophy).toBeCloseTo(4*Math.PI*omega*omega*R*R*Z,10);
      errors.push(Math.abs(d.energy-Math.PI*omega*omega*Z*R**4/2));
    }
    expect(errors[0]/errors[1]).toBeCloseTo(4,8);
    expect(errors[1]/errors[2]).toBeCloseTo(4,8);
  });
  it("includes radial and azimuthal vorticity in addition to axial swirl vorticity",()=>{
    const f={a:(_r,z)=>1+z,chi:()=>2,phi:r=>-r*r/4};
    const s=new NSAxisymSolver({nr:16,nz:16,R:1,Z:0.5,nu:0.1,boundary:analyticBoundary(f)});
    expect(s.initialize({...f,phiGuess:f.phi}).accepted).toBe(true);
    const g=s.grid,r=g.rc(g.nr-1),z=g.zc(g.nz-1);
    expect(computeDiagnostics(s).maxOmega).toBeCloseTo(Math.sqrt(r*r+4*r*r+4*(1+z)**2),10);
  });
});
