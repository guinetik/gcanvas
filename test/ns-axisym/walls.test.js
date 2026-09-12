import {describe,it,expect} from 'vitest';
import {NSAxisymSolver,noSlipBoundary,wallSlip,computeDiagnostics,createGrid,allocField,forEachInterior} from '../../src/math/ns-axisym.js';
import {wallFixture} from './fixtures.js';
import {advance,norm,order} from './helpers.js';
import {zeroWallGhosts,thomGhosts} from '../../src/math/ns-axisym/walls.js';
import {applyL5,poissonResidual} from '../../src/math/ns-axisym/operators.js';

const POISSON={atol:1e-11,rtol:0,maxSweeps:16000};
function solver(n,forced=true,poisson=POISSON) {
  const f=wallFixture(),s=new NSAxisymSolver({nr:n,nz:n,R:1,Z:0.5,nu:0.05,
    boundary:f.boundary,source:forced?f.source:undefined,poisson});
  expect(s.initialize({...f.exact,phiGuess:f.exact.phi}).accepted).toBe(true);
  return {s,f};
}

describe('closed-cylinder Thom boundary validation',()=>{
  it('preserves exact rest with closed walls',()=>{
    const s=new NSAxisymSolver({nr:8,nz:12,R:1,Z:0.8,nu:0.1,boundary:noSlipBoundary()});
    expect(s.initialize({a:()=>0,chi:()=>0}).accepted).toBe(true);
    advance(s,0.02);
    const d=computeDiagnostics(s);
    for(const k of ['energy','enstrophy','maxU','maxOmega','maxWallSlip','maxDiv'])expect(d[k]).toBe(0);
  });

  it('refreshes Thom ghosts from each newly solved potential, including initialization',()=>{
    const f=wallFixture(),base=f.boundary,times=[];
    const boundary={...base,afterSolve(g,state,time) {
      base.afterSolve(g,state,time);times.push(time);
      const i=3,j=0,near=g.idx(i,j),next=g.idx(i,1),ghost=g.idx(i,-1);
      const inferred=(3*state.chi[ghost]-state.chi[next]+6*state.chi[near])/8;
      expect(inferred).toBeCloseTo(-8*state.phi[near]/g.dz**2,12);
    }};
    const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:0.5,nu:0.05,boundary,source:f.source,poisson:POISSON});
    expect(s.initialize({...f.exact,phiGuess:()=>0}).accepted).toBe(true);
    const result=s.step({fixedDt:0.0005});expect(result.accepted).toBe(true);
    expect(times).toEqual([0,0,0.0005,0.0005]);
    expect(computeDiagnostics(s).maxWallSlip).toBe(wallSlip(s.grid,s.phi).maximum);
  });

  it('measures slip independently and detects a non-clamped potential',()=>{
    const g=createGrid({nr:32,nz:32,R:1,Z:0.5}),p=allocField(g);
    forEachInterior(g,(i,j,k)=>{p[k]=(1-g.rc(i)**2)*(1-(g.zc(j)/g.Z)**2);});
    expect(wallSlip(g,p).radial).toBeGreaterThan(1.8);
    expect(wallSlip(g,p).caps).toBeGreaterThan(1);
  });

  it('converges for a coupled clamped manufactured solution with Thom walls',()=>{
    const rows=[];
    for(const n of [16,32,64]) {
      const {s,f}=solver(n),stats=advance(s,0.02,{maxDt:0.0005}),v=s.velocity(),g=s.grid;
      for(let j=0;j<n;j++){expect(v.Fr[j*(n+1)]).toBe(0);expect(v.Fr[j*(n+1)+n]).toBe(0);}
      for(let i=0;i<n;i++){expect(v.Fz[i]).toBe(0);expect(v.Fz[n*n+i]).toBe(0);}
      rows.push({n,...stats,...Object.fromEntries(['a','chi','phi'].map(k=>[k,norm(g,s[k],f.exact[k],s.t)])),
        ur:norm(g,v.ur,f.exact.ur,s.t),uz:norm(g,v.uz,f.exact.uz,s.t),slip:wallSlip(g,s.phi).maximum});
    }
    const orders=Object.fromEntries(['a','chi','phi','ur','uz','slip'].map(k=>[k,rows.slice(1).map((r,i)=>order(k==='slip'?rows[i][k]:rows[i][k].l2,k==='slip'?r[k]:r[k].l2))]));
    console.info('NS_THOM_SPACE '+JSON.stringify({rows,orders}));
    for(const key of ['a','phi','ur','uz','slip'])for(const p of orders[key])expect(p).toBeGreaterThan(1.7);
    for(const p of orders.chi)expect(p).toBeGreaterThan(1.5);
  },180000);

  it('refines the unforced energy-dissipation budget',()=>{
    const rows=[];
    for(const n of [8,16,32]) {
      const {s}=solver(n,false),initial=computeDiagnostics(s);
      let previous=initial,integral=0,steps=0,maxRise=0;
      while(s.t<0.02) {
        const result=s.step({maxDt:Math.min(0.0005,0.02-s.t)});
        expect(result.accepted,JSON.stringify(result)).toBe(true);
        const next=computeDiagnostics(s);
        integral+=s.nu*(previous.enstrophy+next.enstrophy)*result.dt;
        maxRise=Math.max(maxRise,next.energy-previous.energy);previous=next;
        expect(++steps).toBeLessThan(10000);
      }
      rows.push({n,steps,energy:previous.energy,initialEnergy:initial.energy,integral,
        relativeDefect:Math.abs(previous.energy-initial.energy+integral)/initial.energy,maxRise});
      expect(maxRise).toBe(0);
    }
    const orders=rows.slice(1).map((r,i)=>order(rows[i].relativeDefect,r.relativeDefect));
    console.info('NS_THOM_ENERGY '+JSON.stringify({rows,orders}));
    for(const p of orders)expect(p).toBeGreaterThan(1.5);
    expect(rows[2].relativeDefect).toBeLessThan(0.01);
  },60000);

  it('matches the eliminated elliptic rows to ghost stencils on a rectangular cylinder',()=>{
    const g=createGrid({nr:12,nz:20,R:1.3,Z:0.8}),phi=allocField(g),chi=allocField(g),lap=allocField(g);
    forEachInterior(g,(i,j,k)=>{phi[k]=Math.exp(g.rc(i)**2+g.zc(j));});
    zeroWallGhosts(g,phi);applyL5(g,phi,lap);
    forEachInterior(g,(_i,_j,k)=>{chi[k]=-lap[k];});
    expect(poissonResidual(g,phi,chi,'zero-wall')).toBeLessThan(1e-11);
    thomGhosts(g,{phi,chi});
    // Invert the quadratic ghost relation to independently recover its wall data.
    const wall=(near,next,ghost)=>(3*chi[ghost]-chi[next]+6*chi[near])/8;
    for(let j=0;j<g.nz;j++) {
      const k=g.idx(g.nr-1,j),expected=-2*g.rc(g.nr-1)**2*phi[k]/(g.R**2*(g.dr/2)**2);
      expect(wall(k,g.idx(g.nr-2,j),g.idx(g.nr,j))).toBeCloseTo(expected,10);
    }
    for(let i=0;i<g.nr;i++)for(const [j,next,ghost] of [[0,1,-1],[g.nz-1,g.nz-2,g.nz]]) {
      const expected=-2*phi[g.idx(i,j)]/(g.dz/2)**2;
      expect(wall(g.idx(i,j),g.idx(i,next),g.idx(i,ghost))).toBeCloseTo(expected,10);
    }
    expect(phi.every(Number.isFinite)&&chi.every(Number.isFinite)).toBe(true);
  });

  it('isolates spatial wall errors from time-step and Poisson tolerances',()=>{
    const states=[];
    for(const [dt,atol] of [[0.0005,1e-11],[0.00025,1e-11],[0.00025,1e-13]]) {
      const {s}=solver(16,true,{...POISSON,atol});advance(s,0.02,{maxDt:dt});states.push(s);
    }
    const g=states[0].grid,differences=[];
    for(let p=0;p<2;p++) {
      const difference=Object.fromEntries(['a','chi','phi'].map(key=>[key,norm(g,states[p][key],(r,z)=>
        states[p+1][key][g.idx(Math.round(r/g.dr-0.5),Math.round((z+g.Z)/g.dz-0.5))]).l2]));
      differences.push(difference);
      const exact=wallFixture().exact;
      for(const key of ['a','chi','phi'])expect(difference[key]).toBeLessThan(0.01*norm(g,states[p+1][key],exact[key],0.02).l2);
    }
    console.info('NS_THOM_CALIBRATION '+JSON.stringify(differences));
  },60000);
});
