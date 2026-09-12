import { describe, it, expect } from 'vitest';
import { createGrid, allocField, applyAxisGhosts } from '../../src/math/ns-axisym/grid.js';
import { fillAnalyticGhosts } from '../../src/math/ns-axisym/boundaries.js';
import { applyL5, l5Row, solvePoisson, poissonResidual } from '../../src/math/ns-axisym/operators.js';
import { allocVelocity, cornerPsi, faceFluxes, cellVelocity, maxAbsDivergence } from '../../src/math/ns-axisym/velocity.js';
import { advect } from '../../src/math/ns-axisym/advect.js';

function fill(g, fn) {
  const f = allocField(g);
  for (let j = -g.G; j < g.nz + g.G; j++)
    for (let i = -g.G; i < g.nr + g.G; i++) f[g.idx(i,j)] = fn(g.rc(i),g.zc(j));
  return f;
}
function error(g, field, fn) {
  let e = 0;
  for (let j=0;j<g.nz;j++) for(let i=0;i<g.nr;i++)
    e=Math.max(e,Math.abs(field[g.idx(i,j)]-fn(g.rc(i),g.zc(j))));
  return e;
}
describe('axisymmetric spatial operators', () => {
  it('validates grid geometry and fills both axis ghost layers, including corners', () => {
    expect(()=>createGrid({nr:3,nz:8,R:1,Z:1})).toThrow();
    const g=createGrid({nr:8,nz:8,R:1,Z:1}), f=allocField(g).fill(7);
    fillAnalyticGhosts(g,f,2,(r,z,t)=>r*r+z+t);
    expect(g.rc(0)).toBe(g.dr/2);
    expect(f[g.idx(1,1)]).toBe(7);
    for(let j=-2;j<g.nz+2;j++) for(let k=0;k<2;k++)
      expect(f[g.idx(-1-k,j)]).toBe(f[g.idx(k,j)]);
  });
  it('applies L5 exactly to r²z and converges on r⁴ at the axis and elsewhere', () => {
    const errors=[];
    for(const n of [8,16,32]) {
      const g=createGrid({nr:n,nz:n,R:1,Z:1}), out=allocField(g);
      applyL5(g,fill(g,(r,z)=>r*r*z),out);
      expect(error(g,out,(_r,z)=>8*z)).toBeLessThan(1e-10);
      applyL5(g,fill(g,r=>r**4),out);
      errors.push(error(g,out,r=>24*r*r));
      expect(l5Row(g,0).d).toBe(4/g.dr**2+2/g.dz**2);
    }
    expect(errors[0]/errors[1]).toBeCloseTo(4,8);
    expect(errors[1]/errors[2]).toBeCloseTo(4,8);
  });
  it('solves an independent manufactured potential from an incorrect initial guess', () => {
    const g=createGrid({nr:16,nz:16,R:1,Z:1}), phi=allocField(g);
    const chi=fill(g,(_r,z)=>-8*z);
    fillAnalyticGhosts(g,phi,0,(r,z)=>r*r*z);
    const result=solvePoisson(g,phi,chi,{atol:1e-11,rtol:0});
    expect(result.converged).toBe(true);
    expect(error(g,phi,(r,z)=>r*r*z)).toBeLessThan(1e-10);
  });
  it('rejects nonfinite potential and budget exhaustion, and short-circuits a harmonic solution', () => {
    const g=createGrid({nr:8,nz:8,R:1,Z:1}), chi=allocField(g), phi=fill(g,(_r,z)=>z);
    expect(solvePoisson(g,phi,chi).sweeps).toBe(0);
    phi.fill(NaN);
    expect(poissonResidual(g,phi,chi)).toBe(Infinity);
    expect(solvePoisson(g,phi,chi).reason).toBe('nonfinite');
    phi.fill(0);chi.fill(1);
    expect(solvePoisson(g,phi,chi,{maxSweeps:1}).reason).toBe('budget');
  });
  it('recovers constant axial flow and Burgers strain with vanishing flux divergence', () => {
    const g=createGrid({nr:16,nz:16,R:1,Z:1});
    for(const [fn,ur,uz] of [[()=>1.25,()=>0,()=>2.5],[(_r,z)=>z/2,r=>-r/2,(_r,z)=>z]]) {
      const v=allocVelocity(g), phi=fill(g,fn);
      cornerPsi(g,phi,v.psi,(r,z)=>r*r*fn(r,z));faceFluxes(g,v.psi,v.Fr,v.Fz);cellVelocity(g,v.Fr,v.Fz,v.ur,v.uz);
      expect(error(g,v.ur,ur)).toBeLessThan(1e-12);
      expect(error(g,v.uz,uz)).toBeLessThan(1e-12);
      expect(maxAbsDivergence(g,v.Fr,v.Fz)).toBeLessThan(1e-12);
      const f=allocField(g).fill(3.7), out=allocField(g);
      advect(g,f,v.Fr,v.Fz,out);
      expect(error(g,out,()=>0)).toBe(0);
    }
  });
  it('has second-order boundary velocity on phi=r² with exact corner boundary data', () => {
    const errors=[];
    for(const n of [8,16,32]) {
      const g=createGrid({nr:n,nz:n,R:1,Z:1}), v=allocVelocity(g);
      cornerPsi(g,fill(g,r=>r*r),v.psi,r=>r**4);
      faceFluxes(g,v.psi,v.Fr,v.Fz);cellVelocity(g,v.Fr,v.Fz,v.ur,v.uz);
      errors.push(error(g,v.uz,r=>4*r*r));
    }
    expect(errors[0]/errors[1]).toBeCloseTo(4,8);
    expect(errors[1]/errors[2]).toBeCloseTo(4,8);
  });
  it('transports smooth axial profiles with either velocity sign at second order', () => {
    for(const U of [-1,1]) {
      const errors=[];
      for(const n of [16,32,64]) {
        const g=createGrid({nr:4,nz:n,R:1,Z:0.5}), v=allocVelocity(g), out=allocField(g);
        cornerPsi(g,fill(g,()=>U/2),v.psi);faceFluxes(g,v.psi,v.Fr,v.Fz);
        advect(g,fill(g,(_r,z)=>Math.exp(z)),v.Fr,v.Fz,out);
        errors.push(error(g,out,(_r,z)=>-U*Math.exp(z)));
      }
      expect(errors[0]/errors[1]).toBeGreaterThan(3.7);
      expect(errors[1]/errors[2]).toBeGreaterThan(3.7);
    }
  });
});
