import {it,expect} from 'vitest';
import {NSAxisymSolver,interactingRingsPreset,computeDiagnostics} from '../../src/math/ns-axisym.js';
import {advance} from './helpers.js';

it('initializes regular compact opposite swirl rings and evolves without forcing',()=>{
  const p=interactingRingsPreset({nu:0.05}),s=new NSAxisymSolver({nr:24,nz:48,R:1,Z:1,nu:p.nu,boundary:p.boundary});
  for(const [r,z] of [[0,0],[0,0.3],[1,0.3],[0.5,1],[0.5,-1],[0.5,0]])
    for(const sample of Object.values(p.initial))expect(Math.abs(sample(r,z))).toBe(0);
  expect(p.initial.a(0.5,0.3)).toBe(1);expect(p.initial.a(0.5,-0.3)).toBe(-1);
  expect(p.init(s).accepted).toBe(true);expect(s.source).toBe(null);
  const before=computeDiagnostics(s);
  advance(s,0.01);
  const after=computeDiagnostics(s);
  expect(after.energy).toBeLessThan(before.energy);
  expect(after.maxDiv).toBeLessThan(1e-12);
  expect(after.maxWallSlip).toBeGreaterThan(0);
  expect(s.chi.some(v=>Math.abs(v)>1e-6)).toBe(true);
},60000);

it('derives optional meridional vorticity from the specified smooth potential',()=>{
  const p=interactingRingsPreset({nu:0.05,meridionalStrength:0.002});
  // Independent centered differences of the potential, at a point inside a bump.
  const r=0.54,z=0.33,h=1e-5,f=p.initial.phi;
  const lap=(f(r+h,z)-2*f(r,z)+f(r-h,z))/h**2+3/r*(f(r+h,z)-f(r-h,z))/(2*h)+
    (f(r,z+h)-2*f(r,z)+f(r,z-h))/h**2;
  expect(p.initial.chi(r,z)).toBeCloseTo(-lap,6);
  const s=new NSAxisymSolver({nr:24,nz:48,R:1,Z:1,nu:p.nu,boundary:p.boundary});
  expect(p.init(s).accepted).toBe(true);
  expect(computeDiagnostics(s).maxU).toBeGreaterThan(0);
  advance(s,0.002);
  expect(computeDiagnostics(s).maxDiv).toBeLessThan(1e-12);
},60000);

it('rejects invalid ring geometry and forced or mismatched solvers',()=>{
  for(const options of [{radialWidth:0.5},{separation:0.3},{axialWidth:1},{nu:0},{swirlStrength:NaN}])
    expect(()=>interactingRingsPreset({nu:0.05,...options})).toThrow();
  const p=interactingRingsPreset({nu:0.05});
  const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:1,nu:0.05,boundary:p.boundary,source:()=>({a:0,chi:0})});
  expect(()=>p.init(s)).toThrow(/unforced/);
});
