import { NSAxisymGPUSolver } from '../../../src/webgpu/ns-axisym-solver.js';
import { NSAxisymSolver, burgersPreset, lambOseenPreset, noSlipBoundary, computeDiagnostics } from '../../../src/math/ns-axisym.js';
import { coupledFixture, wallFixture, zero } from '../fixtures.js';
import { poissonResidual } from '../../../src/math/ns-axisym/operators.js';
import { runGPUStudies } from './studies.js';

const CONFIG = {
  nr:16,nz:32,R:1,Z:0.5,steps:20,dt:0.0002,
  poisson:{atol:2e-4,rtol:1e-4,maxSweeps:12000,checkEvery:32},
  tolerances:{
    a:{atol:2e-6,rtol:2e-4,scale:0.1},chi:{atol:2e-5,rtol:2e-3,scale:0.1},
    phi:{atol:2e-6,rtol:2e-4,scale:0.01},ur:{atol:1e-5,rtol:2e-3,scale:0.1},uz:{atol:1e-5,rtol:2e-3,scale:0.1},
    energy:{atol:2e-7,rtol:2e-3,scale:0.001},enstrophy:{atol:2e-6,rtol:2e-3,scale:0.01},
    maxOmega:{atol:2e-5,rtol:2e-3,scale:0.1},maxU:{atol:1e-5,rtol:2e-3,scale:0.1},
    maxA:{atol:2e-6,rtol:2e-4,scale:0.1},maxWallSlip:{atol:2e-5,rtol:2e-3,scale:0.01},
  },
};

function compare(cpu,gpu,tolerance) {
  let maximum=0,ratio=0,index=0;
  for(let i=0;i<cpu.length;i++){
    const error=Math.abs(cpu[i]-gpu[i]),bound=tolerance.atol+tolerance.rtol*Math.max(Math.abs(cpu[i]),tolerance.scale);
    if(!Number.isFinite(error))return {passed:false,maximum:null,ratio:null,index:i};
    if(error>maximum){maximum=error;index=i;}ratio=Math.max(ratio,error/bound);
  }
  return {passed:ratio<=1,maximum,ratio,index};
}
function states(cpu,gpu) {
  const result={},g=cpu.grid,v=cpu.velocity(),d=computeDiagnostics(cpu);
  for(const key of ['a','chi','phi','ur','uz']){
    const c=key==='ur'||key==='uz'?v[key]:cpu[key],a=[],b=[];
    for(let j=0;j<g.nz;j++)for(let i=0;i<g.nr;i++){a.push(c[g.idx(i,j)]);b.push(gpu[key][g.idx(i,j)]);}
    result[key]=compare(a,b,CONFIG.tolerances[key]);
  }
  for(const key of Object.keys(d))if(CONFIG.tolerances[key])result[key]=compare([d[key]],[gpu.diagnostics[key]],CONFIG.tolerances[key]);
  result.divergence={passed:gpu.diagnostics.maxDiv<1e-5,maximum:gpu.diagnostics.maxDiv};
  const independent=poissonResidual(g,Float64Array.from(gpu.phi),Float64Array.from(gpu.chi),cpu.boundary.poissonBoundary);
  result.poisson={passed:gpu.poisson.residual<=gpu.poisson.target&&independent<=gpu.poisson.target+3e-6&&
    Math.abs(independent-gpu.poisson.residual)<3e-6,independentResidual:independent,gpu:gpu.poisson};
  result.time={passed:gpu.time===cpu.t&&gpu.stepIndex===cpu.stepIndex,cpu:cpu.t,gpu:gpu.time};
  let parity=true;
  for(let j=-2;j<g.nz+2;j++)for(let i=0;i<2;i++)for(const key of ['a','chi','phi'])
    parity&&=gpu[key][g.idx(-1-i,j)]===gpu[key][g.idx(i,j)];
  result.axisParity={passed:parity};
  return {passed:Object.values(result).every(v=>v.passed),fields:result};
}
async function parityCase(name,fixture,nu,progress) {
  progress(name);const options={nr:CONFIG.nr,nz:CONFIG.nz,R:CONFIG.R,Z:CONFIG.Z,nu,
    boundary:fixture.boundary,source:fixture.source??null,poisson:CONFIG.poisson};
  const cpu=new NSAxisymSolver(options),gpu=new NSAxisymGPUSolver(options),steps=[];
  try {
    if(!await gpu.init())return {name,passed:false,error:gpu.lastError};
    const data={...fixture.exact,phiGuess:fixture.exact.phi};
    const ci=cpu.initialize(data),gi=await gpu.initialize(data);
    if(!ci.accepted||!gi.accepted)return {name,passed:false,initialization:{cpu:ci,gpu:gi}};
    const initial=states(cpu,await gpu.readback());
    let maxResidual=gi.poisson.residual,maxStepMs=0,totalStepMs=0,dispatches=0;
    for(let i=0;i<CONFIG.steps;i++){
      const cs=cpu.step({fixedDt:CONFIG.dt}),gs=await gpu.step({fixedDt:CONFIG.dt});
      if(!cs.accepted||!gs.accepted)return {name,passed:false,step:i,cpu:cs,gpu:gs};
      const check=states(cpu,await gpu.readback());steps.push(check);
      maxResidual=Math.max(maxResidual,gs.poisson.residual);maxStepMs=Math.max(maxStepMs,gs.elapsedMs);totalStepMs+=gs.elapsedMs;dispatches+=gs.dispatches;
    }
    // A rejected step must preserve both fields and prepared velocity buffers.
    const before=await gpu.readback(),rejected=await gpu.step({fixedDt:1,maxDt:1}),after=await gpu.readback();
    const atomic=!rejected.accepted&&before.time===after.time&&before.stepIndex===after.stepIndex&&
      ['a','chi','phi','ur','uz'].every(k=>before[k].every((v,i)=>v===after[k][i]));
    return {name,passed:initial.passed&&steps.every(s=>s.passed)&&atomic,adapter:gpu.adapterInfo,
      initial,final:steps.at(-1),firstFailedStep:steps.findIndex(s=>!s.passed),atomicRejection:atomic,
      steps:steps.length,maxResidual,time:gpu.t,maxStepMs,meanStepMs:totalStepMs/steps.length,dispatches,
      memoryBytes:gpu.memoryBytes,readbackBytes:gpu.readbackBytes};
  } finally {gpu.destroy();}
}

/** Actual browser GPU acceptance, with structured results and no CPU fallback. */
export async function runValidation({progress=()=>{},performance:measurePerformance=false}={}) {
  const start=performance.now(),cases=[];
  cases.push(await parityCase('zero closed cylinder',{boundary:noSlipBoundary(),exact:zero},0.05,progress));
  const b=burgersPreset({alpha:1,C:2,nu:0.1});cases.push(await parityCase('Burgers',b,0.1,progress));
  const l=lambOseenPreset({C:1,nu:0.05,t0:0.5});cases.push(await parityCase('Lamb–Oseen',l,0.05,progress));
  cases.push(await parityCase('axis-sensitive coupled',coupledFixture(),0.05,progress));
  cases.push(await parityCase('coupled Thom walls',wallFixture(),0.05,progress));
  const studies=await runGPUStudies({progress,measurePerformance});
  return {passed:cases.every(c=>c.passed)&&studies.passed,userAgent:navigator.userAgent,configuration:CONFIG,cases,studies,
    elapsedMs:performance.now()-start};
}
