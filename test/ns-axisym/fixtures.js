import { analyticBoundary } from "../../src/math/ns-axisym/boundaries.js";
import { noSlipBoundary } from "../../src/math/ns-axisym/walls.js";

export const zero={a:()=>0,chi:()=>0,phi:()=>0};

/** Clamped polynomial potential: both psi and its wall-normal derivative vanish.
 * Continuous derivatives below are independent of the production wall stencils.
 */
export function wallFixture(nu=0.05,R=1,Z=0.5) {
  function at(r,z,t) {
    const A=0.15*Math.exp(-0.1*t),B=0.02*Math.exp(-0.2*t);
    const F=1-r*r/R**2,G=1-z*z/Z**2,P=F*F,Q=G*G;
    const Pr=-4*r/R**2*F,H=-16/R**2+24*r*r/R**4,Hr=48*r/R**4;
    const Qz=-4*z/Z**2*G,Qzz=-4/Z**2+12*z*z/Z**4,Qzzz=24*z/Z**4;
    const a=A*F*G,phi=B*P*Q,chi=-B*(H*Q+P*Qzz);
    const ur=-r*B*P*Qz,uz=B*(2*P+r*Pr)*Q;
    const ar=-2*r/R**2*A*G,az=-2*z/Z**2*A*F;
    const cr=-B*(Hr*Q+Pr*Qzz),cz=-B*(H*Qz+P*Qzzz);
    const la=A*(-8/R**2*G-2/Z**2*F);
    const lc=-B*(192/R**4*Q+2*H*Qzz+P*24/Z**4);
    return {a,phi,chi,ur,uz,sourceA:-0.1*a+ur*ar+uz*az-2*a*B*P*Qz-nu*la,
      sourceChi:-0.2*chi+ur*cr+uz*cz-2*a*az-nu*lc};
  }
  const exact=Object.fromEntries(['a','chi','phi','ur','uz'].map(k=>[k,(r,z,t)=>at(r,z,t)[k]]));
  return {exact,boundary:noSlipBoundary(),source:(r,z,t)=>{
    const v=at(r,z,t);return {a:v.sourceA,chi:v.sourceChi};
  }};
}
/** Analytic derivatives evaluated independently of every production stencil. */
export function coupledFixture(nu=0.05) {
  const beta=0.4,gamma=0.3,kappa=0.3,lambda=0.4,mu=0.2;
  function at(r,z,t) {
    const A=0.2*Math.exp(0.3*t),B=0.1*Math.exp(-0.2*t);
    const P=1+beta*r*r,Q=1+gamma*z,H=1+kappa*r*r,J=1+lambda*z+mu*z*z,Jz=lambda+2*mu*z;
    const a=A*P*Q,phi=B*H*J,chi=-B*(8*kappa*J+2*mu*H);
    const ur=-r*B*H*Jz,uz=2*B*(1+2*kappa*r*r)*J;
    const ar=2*beta*r*A*Q,az=gamma*A*P;
    const cr=-4*B*mu*kappa*r,cz=-8*B*kappa*Jz;
    return {a,chi,phi,ur,uz,
      sourceA:0.3*a+ur*ar+uz*az-2*a*B*H*Jz-nu*8*beta*A*Q,
      sourceChi:-0.2*chi+ur*cr+uz*cz-2*a*az+nu*32*B*kappa*mu};
  }
  const exact=Object.fromEntries(["a","chi","phi","ur","uz"].map(key=>[key,(r,z,t)=>at(r,z,t)[key]]));
  return {exact,boundary:analyticBoundary(exact),source:(r,z,t)=> {
    const v=at(r,z,t);return {a:v.sourceA,chi:v.sourceChi};
  }};
}
