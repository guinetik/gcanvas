import {describe,it,expect,vi} from 'vitest';
import {NSAxisymSolver,analyticBoundary,createGrid,allocField,forEachInterior} from '../../src/math/ns-axisym.js';
import {fillAnalyticGhosts} from '../../src/math/ns-axisym/boundaries.js';
import {applyL5,solvePoisson,l5Row} from '../../src/math/ns-axisym/operators.js';
import {allocVelocity,cornerPsi,faceFluxes,maxAbsDivergence} from '../../src/math/ns-axisym/velocity.js';
import {advect} from '../../src/math/ns-axisym/advect.js';
import {zero,coupledFixture} from './fixtures.js';
import {advance,norm,order} from './helpers.js';

function samples(g,fn){const f=allocField(g);forEachInterior(g,(i,j,k)=>f[k]=fn(g.rc(i),g.zc(j)));fillAnalyticGhosts(g,f,0,fn);return f;}
describe('additional reference acceptance checks',()=>{
  it('converges to a non-polynomial elliptic solution on the whole domain',()=>{
    const errors=[];
    for(const n of [8,16,32]){
      const g=createGrid({nr:n,nz:n,R:1,Z:0.5}),phi=allocField(g);
      const exact=(r,z)=>Math.exp(r*r+z);
      const chi=samples(g,(r,z)=>-(9+4*r*r)*exact(r,z));
      fillAnalyticGhosts(g,phi,0,exact);
      expect(solvePoisson(g,phi,chi,{atol:1e-10,rtol:0}).converged).toBe(true);
      errors.push(norm(g,phi,exact).l2);
    }
    expect(order(errors[0],errors[1])).toBeGreaterThan(1.8);
    expect(order(errors[1],errors[2])).toBeGreaterThan(1.8);
  });
  it('uses the eliminated axis diagonal in the very first color sweep',()=>{
    const g=createGrid({nr:8,nz:8,R:1,Z:0.5}),phi=allocField(g),chi=allocField(g);
    chi[g.idx(0,0)]=1;
    solvePoisson(g,phi,chi,{maxSweeps:1,atol:1e-14,rtol:0});
    expect(phi[g.idx(0,0)]).toBe(1/l5Row(g,0).d);
  });
  it('converges to the equivalent angular-momentum diffusion operator',()=>{
    const errors=[];
    for(const n of [8,16,32]){
      const g=createGrid({nr:n,nz:n,R:1,Z:0.5}),f=samples(g,(r,z)=>Math.exp(r*r+z));
      const gamma=samples(g,(r,z)=>r*r*Math.exp(r*r+z)),out=allocField(g);
      applyL5(g,f,out);let e=0;
      forEachInterior(g,(i,j,k)=>{
        const r=g.rc(i),h=g.dr,v=g.dz,W=g.W;
        const lGamma=(gamma[k+1]-2*gamma[k]+gamma[k-1])/(h*h)-
          (gamma[k+1]-gamma[k-1])/(2*r*h)+(gamma[k+W]-2*gamma[k]+gamma[k-W])/(v*v);
        e=Math.max(e,Math.abs(lGamma-r*r*out[k]));
      });errors.push(e);
    }
    expect(order(errors[0],errors[1])).toBeGreaterThan(1.7);
    expect(order(errors[1],errors[2])).toBeGreaterThan(1.7);
  });
  it('has divergence cancellation for arbitrary corner data and convergent radial transport',()=>{
    const errors=[];
    for(const n of [16,32,64]){
      const g=createGrid({nr:n,nz:8,R:1,Z:0.5}),v=allocVelocity(g),out=allocField(g);
      cornerPsi(g,samples(g,(_r,z)=>-z),v.psi);faceFluxes(g,v.psi,v.Fr,v.Fz);
      advect(g,samples(g,r=>r*r),v.Fr,v.Fz,out);
      errors.push(norm(g,out,r=>-r*r*2).l2); // ur=r, uz=-2z
      for(let k=0;k<v.psi.length;k++)v.psi[k]=Math.sin(k*1.2345);
      for(let j=0;j<=g.nz;j++)v.psi[j*(g.nr+1)]=0;
      faceFluxes(g,v.psi,v.Fr,v.Fz);
      expect(maxAbsDivergence(g,v.Fr,v.Fz)).toBeLessThan(1e-8);
    }
    expect(order(errors[0],errors[1])).toBeGreaterThan(1.8);
    expect(order(errors[1],errors[2])).toBeGreaterThan(1.8);
  });
  it('advects a bounded axial pulse without creating extrema at the configured CFL',()=>{
    const g=createGrid({nr:4,nz:64,R:1,Z:1}),v=allocVelocity(g);
    cornerPsi(g,samples(g,()=>0.5),v.psi);faceFluxes(g,v.psi,v.Fr,v.Fz);
    const original=samples(g,(_r,z)=>Math.abs(z)<0.2?1:0),trial=allocField(g),next=allocField(g),rhs=allocField(g);
    const dt=0.25*g.dz;
    for(let step=0;step<20;step++){
      advect(g,original,v.Fr,v.Fz,rhs);
      forEachInterior(g,(_i,_j,k)=>trial[k]=original[k]+dt*rhs[k]);
      fillAnalyticGhosts(g,trial,0,()=>0);
      advect(g,trial,v.Fr,v.Fz,rhs);
      forEachInterior(g,(_i,_j,k)=>next[k]=(original[k]+trial[k]+dt*rhs[k])/2);
      forEachInterior(g,(_i,_j,k)=>{expect(next[k]).toBeGreaterThanOrEqual(0);expect(next[k]).toBeLessThanOrEqual(1);});
      original.set(next);fillAnalyticGhosts(g,original,0,()=>0);
    }
  });
  it('copies initial arrays and rejects a fixed step when trial limits tighten',()=>{
    const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:0.5,nu:0.1,boundary:analyticBoundary(zero)});
    const input=allocField(s.grid);
    expect(s.initialize({a:input,chi:input,phiGuess:input}).accepted).toBe(true);
    input.fill(12);expect(s.a[s.grid.idx(0,0)]).toBe(0);
    const original=s._chooseDt.bind(s);let calls=0;
    vi.spyOn(s,'_chooseDt').mockImplementation((...args)=>++calls===2?{dt:1e-5}:original(...args));
    expect(s.step({fixedDt:0.001}).reason).toBe('unsafe-fixed-step');expect(s.t).toBe(0);
  });
  it('checks a combined rate that is stricter than either separate rate',()=>{
    const f={...zero,phi:()=>0.5};
    const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:0.5,nu:0.1,boundary:analyticBoundary(f),limits:{maxDt:1}});
    expect(s.initialize({...f,phiGuess:f.phi}).accepted).toBe(true);
    const g=s.grid,A=1/g.dz,D=0.1*l5Row(g,0).d;
    const limit=s._chooseDt(s._accepted,0).dt;
    expect(limit).toBeCloseTo(1/(A/0.25+D/0.5),14);
    expect(limit).toBeLessThan(Math.min(0.25/A,0.5/D));
  });
  it('keeps spatial error stable when dt and the Poisson tolerance are tightened',()=>{
    const fixture=coupledFixture(),errors=[];
    for(const [dt,atol]of [[0.0005,1e-11],[0.00025,1e-12]]){
      const s=new NSAxisymSolver({nr:16,nz:16,R:1,Z:0.5,nu:0.05,boundary:fixture.boundary,source:fixture.source,poisson:{atol,rtol:0}});
      expect(s.initialize({...fixture.exact,phiGuess:fixture.exact.phi}).accepted).toBe(true);
      advance(s,0.02,{maxDt:dt});errors.push(norm(s.grid,s.a,fixture.exact.a,s.t).l2);
    }
    console.info('NS_CALIBRATION '+JSON.stringify({errors,relativeChange:Math.abs(errors[1]/errors[0]-1)}));
    expect(Math.abs(errors[1]/errors[0]-1)).toBeLessThan(0.02);
  },30000);
});
