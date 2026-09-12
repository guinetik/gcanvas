import { checkField, forEachInterior } from "./grid.js";
import { wallSlip } from "./walls.js";

/** Full vector diagnostics with physical cylindrical volumes, on the accepted state. */
export function computeDiagnostics(solver) {
  const g = solver.grid, {ur,uz,maxDiv,time,stepIndex} = solver.velocity();
  const a = solver.a, chi = solver.chi;
  checkField(g,a,true); checkField(g,chi,true);
  let energy=0,enstrophy=0,maxOmega=0,maxU=0,maxA=0;
  forEachInterior(g,(i,_j,k)=> {
    const r = g.rc(i), volume=2*Math.PI*r*g.dr*g.dz;
    const u2=ur[k]**2+uz[k]**2+(r*a[k])**2;
    const wr=-r*(a[k+g.W]-a[k-g.W])/(2*g.dz);
    const wt=r*chi[k], wz=2*a[k]+r*(a[k+1]-a[k-1])/(2*g.dr);
    const w2=wr*wr+wt*wt+wz*wz;
    energy+=u2*volume/2; enstrophy+=w2*volume/2;
    maxOmega=Math.max(maxOmega,Math.sqrt(w2)); maxU=Math.max(maxU,Math.sqrt(u2));maxA=Math.max(maxA,Math.abs(a[k]));
  });
  const result={energy,enstrophy,maxOmega,maxU,maxA,maxDiv,time,stepIndex};
  if(solver.boundary.kind==='no-slip-thom')result.maxWallSlip=wallSlip(g,solver.phi).maximum;
  if (!Object.values(result).every(Number.isFinite)) throw new RangeError("Nonfinite diagnostics");
  return result;
}
