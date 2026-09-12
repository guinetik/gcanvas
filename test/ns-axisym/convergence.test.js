import {describe,it,expect} from 'vitest';
import {NSAxisymSolver,burgersPreset,lambOseenPreset} from '../../src/math/ns-axisym.js';
import {advance,norm,order} from './helpers.js';
import {coupledFixture} from './fixtures.js';

const POISSON={atol:1e-11,rtol:0,maxSweeps:16000};
function pairOrders(rows,key){return rows.slice(1).map((row,i)=>order(rows[i][key].l2,row[key].l2));}

describe('axisymmetric convergence studies',()=>{
  it('converges to a steady Burgers vortex at a common physical time',()=>{
    const P={alpha:1,C:2,nu:0.1},tEnd=0.04,rows=[];
    const expected=(r)=>-P.C*Math.expm1(-P.alpha*r*r/(4*P.nu))/(2*Math.PI*r*r);
    for(const n of [16,32,64]){
      const preset=burgersPreset(P),s=new NSAxisymSolver({nr:n,nz:n,R:1,Z:0.5,nu:P.nu,boundary:preset.boundary,poisson:POISSON});
      expect(preset.init(s).accepted).toBe(true);
      const stats=advance(s,tEnd,{maxDt:0.0005}),v=s.velocity();
      rows.push({n,...stats,a:norm(s.grid,s.a,expected),chi:norm(s.grid,s.chi,()=>0),
        ur:norm(s.grid,v.ur,r=>-r/2),uz:norm(s.grid,v.uz,(_r,z)=>z)});
      expect(s.t).toBe(tEnd);
      for(let j=-2;j<n+2;j++)for(let k=0;k<2;k++)
        expect(s.a[s.grid.idx(-1-k,j)]).toBe(s.a[s.grid.idx(k,j)]);
    }
    console.info('NS_BURGERS '+JSON.stringify({rows,orders:pairOrders(rows,'a')}));
    for(const p of pairOrders(rows,'a'))expect(p).toBeGreaterThan(1.7);
    expect(rows[2].a.max).toBeLessThan(rows[1].a.max);
  },60000);

  it('converges to positive-age Lamb–Oseen and its Gaussian core width',()=>{
    const P={C:1,nu:0.05,t0:0.5},tEnd=0.04,rows=[];
    const expected=(r,_z,t)=>-P.C*Math.expm1(-r*r/(4*P.nu*(P.t0+t)))/(2*Math.PI*r*r);
    for(const n of [16,32,64]){
      const preset=lambOseenPreset(P),s=new NSAxisymSolver({nr:n,nz:n,R:1,Z:0.5,nu:P.nu,boundary:preset.boundary,poisson:POISSON});
      expect(preset.init(s).accepted).toBe(true);
      const stats=advance(s,tEnd,{maxDt:0.0005}),g=s.grid,j=n>>1;
      const samples=[];
      for(let i=0;i<n-1;i++){
        const k=g.idx(i,j),r=g.rc(i),w=2*s.a[k]+r*(s.a[k+1]-s.a[k-1])/(2*g.dr);
        samples.push({x:r*r,w});
      }
      const max=Math.max(...samples.map(p=>p.w)),use=samples.filter(p=>p.w>0.05*max);
      expect(use.length).toBeGreaterThanOrEqual(5);
      const mx=use.reduce((sum,p)=>sum+p.x,0)/use.length;
      const my=use.reduce((sum,p)=>sum+Math.log(p.w),0)/use.length;
      const den=use.reduce((sum,p)=>sum+(p.x-mx)**2,0);
      const slope=use.reduce((sum,p)=>sum+(p.x-mx)*(Math.log(p.w)-my),0)/den;
      expect(den).toBeGreaterThan(0);expect(slope).toBeLessThan(0);
      const width=Math.sqrt(-1/slope),exactWidth=Math.sqrt(4*P.nu*(P.t0+tEnd));
      rows.push({n,...stats,a:norm(g,s.a,expected,s.t),chi:norm(g,s.chi,()=>0),width,
        widthRelativeError:Math.abs(width/exactWidth-1)});
    }
    console.info('NS_LAMB_OSEEN '+JSON.stringify({rows,orders:pairOrders(rows,'a')}));
    for(const p of pairOrders(rows,'a'))expect(p).toBeGreaterThan(1.7);
    expect(rows[2].widthRelativeError).toBeLessThan(0.02);
    expect(rows[2].widthRelativeError).toBeLessThan(rows[1].widthRelativeError);
  },60000);

  it('converges in space for a manufactured solution with every coupling active',()=>{
    const nu=0.05,f=coupledFixture(nu),tEnd=0.02,rows=[];
    for(const n of [8,16,32]){
      const s=new NSAxisymSolver({nr:n,nz:n,R:1,Z:0.5,nu,boundary:f.boundary,source:f.source,poisson:POISSON});
      expect(s.initialize({...f.exact,phiGuess:f.exact.phi}).accepted).toBe(true);
      const stats=advance(s,tEnd,{maxDt:0.0005}),v=s.velocity();
      rows.push({n,...stats,...Object.fromEntries(['a','chi','phi'].map(key=>[key,norm(s.grid,s[key],f.exact[key],s.t)])),
        ur:norm(s.grid,v.ur,f.exact.ur,s.t),uz:norm(s.grid,v.uz,f.exact.uz,s.t)});
    }
    console.info('NS_COUPLED_SPACE '+JSON.stringify({rows,orders:Object.fromEntries(['a','chi','phi','ur','uz'].map(k=>[k,pairOrders(rows,k)]))}));
    for(const key of ['a','chi','phi','ur','uz'])for(const p of pairOrders(rows,key))expect(p).toBeGreaterThan(1.7);
  },60000);

  it('has second-order coupled time integration on a fixed spatial grid',()=>{
    const nu=0.05,f=coupledFixture(nu),tEnd=0.04,states=[];
    for(const dt of [0.004,0.002,0.001]){
      const s=new NSAxisymSolver({nr:8,nz:8,R:1,Z:0.5,nu,boundary:f.boundary,source:f.source,
        poisson:{...POISSON,atol:1e-13}});
      expect(s.initialize({...f.exact,phiGuess:f.exact.phi}).accepted).toBe(true);
      advance(s,tEnd,{fixedDt:dt,maxDt:dt});states.push(s);
    }
    const differences=states.slice(1).map((s,i)=>{
      const g=s.grid;
      return Object.fromEntries(['a','chi'].map(key=>[key,norm(g,states[i][key],(r,z)=>s[key][g.idx(Math.round(r/g.dr-0.5),Math.round((z+g.Z)/g.dz-0.5))]).l2]));
    });
    const orders=Object.fromEntries(['a','chi'].map(k=>[k,order(differences[0][k],differences[1][k])]));
    console.info('NS_COUPLED_TIME '+JSON.stringify({differences,orders}));
    for(const p of Object.values(orders)){expect(p).toBeGreaterThan(1.8);expect(p).toBeLessThan(2.3);}
  },60000);
});
