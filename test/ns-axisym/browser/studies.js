import { NSAxisymGPUSolver } from '../../../src/webgpu/ns-axisym-solver.js';
import { burgersPreset, noSlipBoundary, analyticBoundary } from '../../../src/math/ns-axisym.js';
import { wallFixture, zero } from '../fixtures.js';
import { norm,order } from '../helpers.js';
import { poissonResidual } from '../../../src/math/ns-axisym/operators.js';

const CONFIG={poisson:{atol:2e-4,rtol:1e-4,maxSweeps:2048,checkEvery:32},endpoint:0.01,maxSteps:20000};
const unchanged=(a,b)=>a.time===b.time&&a.stepIndex===b.stepIndex&&
  ['a','chi','phi','phiHigh','phiCorrection','ur','uz','psi','Fr','Fz','aCompensation','chiCompensation'].every(k=>a[k].every((v,i)=>v===b[k][i]));

async function failureChecks() {
  const checks=[];
  for(const mode of ['poisson-trial','nonfinite-source','poisson-candidate','concurrent-operation','nonfinite-gpu','nonfinite-potential-correction']){
    const s=new NSAxisymGPUSolver({nr:8,nz:12,R:1,Z:0.5,nu:0.05,boundary:noSlipBoundary(),
      poisson:{atol:1e-10,rtol:0,maxSweeps:0},source:mode==='poisson-trial'?()=>({chi:1}):
        mode==='nonfinite-source'?(_r,_z,t)=>({a:t>0?NaN:0}):null});
    try {
      if(!await s.init())throw new Error(s.lastError);
      const init=await s.initialize(zero);if(!init.accepted)throw new Error(JSON.stringify(init));
      const before=await s.readback();
      if(mode==='poisson-candidate'){
        const prepare=s._prepare.bind(s);let count=0;
        s._prepare=async(...args)=>++count===2?{poisson:{converged:false,reason:'injected-budget'}}:prepare(...args);
      }
      if(mode==='nonfinite-gpu'||mode==='nonfinite-potential-correction'){
        const prepare=s._prepare.bind(s);
        s._prepare=async(slot,time)=>{
          s.device.queue.writeBuffer(slot.front,s.grid.idx(3,3)*16+(mode==='nonfinite-potential-correction'?12:0),new Float32Array([NaN]));return prepare(slot,time);
        };
      }
      const pending=s.step({fixedDt:0.0001});
      let concurrent=false;
      if(mode==='concurrent-operation')concurrent=await s.readback().then(()=>false,e=>e.message.includes('in flight'));
      const result=await pending,after=await s.readback();
      const passed=mode==='concurrent-operation'?concurrent&&result.accepted:!result.accepted&&unchanged(before,after)&&
        (mode==='poisson-trial'||mode==='poisson-candidate'?result.reason===mode:true);
      checks.push({mode,passed,result});
    } finally{s.destroy();}
  }
  const impossible=new NSAxisymGPUSolver({nr:8,nz:12,R:1,Z:0.5,nu:0.05,boundary:noSlipBoundary(),poisson:{maxSweeps:0}});
  try {
    if(!await impossible.init())throw new Error(impossible.lastError);
    const result=await impossible.initialize({a:()=>0,chi:()=>1,phiGuess:()=>0});
    checks.push({mode:'poisson-initial',passed:!result.accepted&&!impossible.initialized,result});
  } finally {impossible.destroy();}
  const retryOptions={nr:8,nz:12,R:1,Z:0.5,nu:0.05,boundary:noSlipBoundary(),
    source:(_r,_z,t)=>({a:t>0.0001?1000:1})};
  const retry=new NSAxisymGPUSolver(retryOptions),fresh=new NSAxisymGPUSolver(retryOptions);
  try {
    if(!await retry.init()||!await fresh.init())throw new Error('Retry test device initialization failed');
    if(!(await retry.initialize(zero)).accepted||!(await fresh.initialize(zero)).accepted)throw new Error('Retry initialization failed');
    const result=await retry.step({maxDt:0.001}),reference=await fresh.step({fixedDt:result.dt});
    checks.push({mode:'adaptive-retry',passed:result.accepted&&result.attempts>1&&reference.accepted&&
      unchanged(await retry.readback(),await fresh.readback()),result});
    const oldTime=fresh.t;fresh.device.destroy();await fresh.device.lost;
    const stopped=await fresh.step().then(r=>!r.accepted,()=>true);
    checks.push({mode:'device-loss',passed:stopped&&!fresh.available&&fresh.t===oldTime});
  } finally {retry.destroy();fresh.destroy();}
  const rate=1e-4,exact={...zero,a:(_r,_z,t)=>1+rate*t};
  const small=new NSAxisymGPUSolver({nr:8,nz:12,R:1,Z:0.5,nu:1e-4,boundary:analyticBoundary(exact),source:()=>({a:rate})});
  try {
    if(!await small.init()||!(await small.initialize(exact)).accepted)throw new Error('Small increment initialization failed');
    for(let i=0;i<40;i++)if(!(await small.step({fixedDt:0.0001})).accepted)throw new Error('Small increment step failed');
    const actual=(await small.readback()).a[small.grid.idx(3,5)],expected=Math.fround(1+rate*small.t);
    checks.push({mode:'sub-ulp-accumulation',passed:actual===expected&&actual>1,actual,expected});
  } finally {small.destroy();}
  return {passed:checks.every(c=>c.passed),checks};
}

async function study(name,n,nz,poisson=CONFIG.poisson,endpoint=CONFIG.endpoint,{maxDt=0.0005,coldStart=false}={}) {
  const preset=name==='Burgers'?burgersPreset({alpha:1,C:2,nu:0.1}):wallFixture();
  const nu=name==='Burgers'?0.1:0.05;
  const s=new NSAxisymGPUSolver({nr:n,nz,R:1,Z:0.5,nu,boundary:preset.boundary,source:preset.source??null,poisson});
  const start=performance.now();
  try {
    if(!await s.init())return {name,n,nz,accepted:false,error:s.lastError};
    const initial=await s.initialize({...preset.exact,phiGuess:coldStart?()=>0:preset.exact.phi});
    if(!initial.accepted)return {name,n,nz,accepted:false,initial,memoryBytes:s.memoryBytes,elapsedMs:performance.now()-start};
    let steps=0,totalMs=0,maxMs=0,dtMin=Infinity,dtMax=0,maxResidual=initial.poisson.residual;
    while(s.t<endpoint){
      if(++steps>CONFIG.maxSteps)throw new Error('Study step budget exceeded');
      const result=await s.step({maxDt:Math.min(maxDt,endpoint-s.t)});
      if(!result.accepted)return {name,n,nz,accepted:false,initial,step:result,steps,elapsedMs:performance.now()-start};
      totalMs+=result.elapsedMs;maxMs=Math.max(maxMs,result.elapsedMs);dtMin=Math.min(dtMin,result.dt);dtMax=Math.max(dtMax,result.dt);
      maxResidual=Math.max(maxResidual,result.poisson.residual);
    }
    const fields=await s.readback();
    const independentResidual=poissonResidual(s.grid,fields.phi,Float64Array.from(fields.chi),s.boundary.poissonBoundary);
    const highOnlyResidual=poissonResidual(s.grid,Float64Array.from(fields.phiHigh),Float64Array.from(fields.chi),s.boundary.poissonBoundary);
    const residualCheck={passed:independentResidual<=fields.poisson.target+3e-6&&
      Math.abs(independentResidual-fields.poisson.residual)<3e-6,independentResidual,highOnlyResidual,gpu:fields.poisson};
    return {name,n,nz,accepted:true,time:s.t,steps,initial,coldStart,poisson,maxResidual,dtMin,dtMax,residualCheck,
      meanStepMs:totalMs/steps,maxStepMs:maxMs,elapsedMs:performance.now()-start,memoryBytes:s.memoryBytes,
      readbackBytes:s.readbackBytes,dispatches:s.dispatches,
      errors:Object.fromEntries(['a','chi','phi','ur','uz'].map(k=>[k,norm(s.grid,fields[k],preset.exact[k],s.t)])),
      diagnostics:fields.diagnostics};
  } finally{s.destroy();}
}

/** Browser-only failure tests plus opt-in numerical refinement and lab-size timings. */
export async function runGPUStudies({progress,measurePerformance}) {
  progress('GPU failure and atomicity checks');const failures=await failureChecks();
  if(!measurePerformance)return {passed:failures.passed,failures,refinement:'not requested',labSize:'not requested'};
  const refinement=[];
  for(const name of ['Burgers','Thom']){
    const rows=[];
    for(const n of [16,32,64]){progress(`${name}: ${n} x ${2*n}`);rows.push(await study(name,n,2*n));}
    const accepted=rows.every(r=>r.accepted&&r.residualCheck.passed);
    const orders=accepted?rows.slice(1).map((r,i)=>order(rows[i].errors.a.l2,r.errors.a.l2)):[];
    refinement.push({name,passed:accepted&&orders.every(p=>p>1.5),rows,orders});
  }
  progress('Poisson tolerance calibration');
  const calibration=await study('Thom',64,128,{...CONFIG.poisson,atol:5e-5,rtol:1e-5});
  const coldStart=await study('Thom',32,64,{...CONFIG.poisson,maxSweeps:12000},0.00002,{coldStart:true});
  progress('Lab-size 256 x 512 checks');
  // A short endpoint samples cost without presenting this as long-time validation.
  const labSize={burgers:await study('Burgers',256,512,{...CONFIG.poisson,maxSweeps:512},0.00001),thom:[]};
  for(const maxSweeps of [512,2048])labSize.thom.push(await study('Thom',256,512,{...CONFIG.poisson,maxSweeps},0.00002,{maxDt:1e-6}));
  const precisionRegression=calibration.accepted&&calibration.residualCheck.passed&&coldStart.accepted&&coldStart.residualCheck.passed&&
    labSize.thom.every(r=>r.accepted&&r.residualCheck.passed&&r.steps>=20&&r.residualCheck.highOnlyResidual>r.residualCheck.gpu.target);
  return {passed:failures.passed&&refinement.every(r=>r.passed)&&precisionRegression,failures,refinement,calibration,coldStart,labSize,precisionRegression,
    liveDefaultValidated:false};
}
