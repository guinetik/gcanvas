import { forEachInterior } from "../../src/math/ns-axisym/grid.js";

/** Advance to a common endpoint, checking every step and bounding work. */
export function advance(s,tEnd,options={}) {
  let steps=0,retries=0,maxResidual=0,dtMin=Infinity,dtMax=0;
  while(s.t<tEnd) {
    if(++steps>100000) throw new Error("Step budget exceeded");
    const maxDt=Math.min(tEnd-s.t,options.maxDt??s.limits.maxDt);
    const result=s.step({...options,maxDt});
    if(!result.accepted) throw new Error(JSON.stringify(result));
    retries+=result.attempts-1;maxResidual=Math.max(maxResidual,result.poisson.residual);
    dtMin=Math.min(dtMin,result.dt);dtMax=Math.max(dtMax,result.dt);
  }
  return {steps,retries,maxResidual,dtMin,dtMax,time:s.t};
}

/** Independent pointwise and cylindrical-weighted L2 error, including boundary strips. */
export function norm(g,f,exact,time=0) {
  let sum=0,volume=0,max=0,axis=0,boundary=0;
  forEachInterior(g,(i,j,k)=>{
    const e=Math.abs(f[k]-exact(g.rc(i),g.zc(j),time)),v=g.rc(i)*g.dr*g.dz;
    sum+=v*e*e;volume+=v;max=Math.max(max,e);
    if(i===0) axis=Math.max(axis,e);
    if(i===g.nr-1||j===0||j===g.nz-1)boundary=Math.max(boundary,e);
  });
  return {l2:Math.sqrt(sum/volume),max,axis,boundary};
}
export const order=(a,b)=>Math.log(a/b)/Math.log(2);
