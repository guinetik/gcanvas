import { createGrid, allocField, forEachInterior } from '../math/ns-axisym/grid.js';
import COMMON from './shaders/ns/common.wgsl?raw';
import BOUNDARY from './shaders/ns/boundary.wgsl?raw';
import POISSON from './shaders/ns/poisson.wgsl?raw';
import VELOCITY from './shaders/ns/velocity.wgsl?raw';
import RHS from './shaders/ns/rhs.wgsl?raw';
import RK from './shaders/ns/rk-stage.wgsl?raw';
import DIAGNOSTICS from './shaders/ns/diagnostics.wgsl?raw';

const CONFIG = {
  limits: { advSafety: 0.25, diffSafety: 0.5, sourceCap: 0.1, scaleA: 1, scaleChi: 1,
    minDt: 1e-14, maxDt: 0.01, maxRetries: 8, retryFactor: 0.5, adaptiveHeadroom: 0.9 },
  poisson: { atol: 2e-4, rtol: 1e-4, maxSweeps: 12000, checkEvery: 32 },
  workgroup: 8, bytesPerCell: 16,
};
const SHADERS = [
  [BOUNDARY, ['analytic','radial','axial','axis']], [POISSON,['red','black']],
  [VELOCITY,['corners','faces','cells']], [RHS,['rhs']], [RK,['trial','final_stage']],
  [DIAGNOSTICS,['diagnostics','reduce_statistics']],
];

/** Float32 WebGPU port with a two-component potential. Every acceptance check is awaited.
 * Owns its device and buffers. Numerical arrays stay on the GPU until readback().
 * Rendering is a separate consumer of the accepted state, added with the lab UI.
 */
export class NSAxisymGPUSolver {
  constructor({nr,nz,R,Z,nu,boundary,source=null,limits={},poisson={}}) {
    this.grid=createGrid({nr,nz,R,Z});
    if(!Number.isFinite(nu)||nu<=0)throw new RangeError('Viscosity must be positive');
    if(!['analytic-extension','no-slip-thom'].includes(boundary?.kind)||typeof boundary.fill!=='function'||typeof boundary.psi!=='function')
      throw new TypeError('A supported explicit boundary policy is required');
    if(source!==null&&typeof source!=='function')throw new TypeError('Invalid test source');
    this.nu=nu;this.boundary=boundary;this.source=source;
    this.limits=Object.freeze({...CONFIG.limits,...limits});this.poisson=Object.freeze({...CONFIG.poisson,...poisson});
    for(const key of ['advSafety','diffSafety','sourceCap','scaleA','scaleChi','minDt','maxDt','adaptiveHeadroom'])
      if(!Number.isFinite(this.limits[key])||this.limits[key]<=0)throw new RangeError('Invalid limit: '+key);
    if(this.limits.advSafety>CONFIG.limits.advSafety||this.limits.diffSafety>CONFIG.limits.diffSafety||this.limits.adaptiveHeadroom>1||
      !Number.isInteger(this.limits.maxRetries)||this.limits.maxRetries<0||!Number.isFinite(this.limits.retryFactor)||
      this.limits.retryFactor<=0||this.limits.retryFactor>=1)throw new RangeError('Unsafe stability limits');
    if(!Number.isFinite(this.poisson.atol)||this.poisson.atol<=0||!Number.isFinite(this.poisson.rtol)||this.poisson.rtol<0||
      !Number.isInteger(this.poisson.maxSweeps)||this.poisson.maxSweeps<0||!Number.isInteger(this.poisson.checkEvery)||this.poisson.checkEvery<1)
      throw new RangeError('Invalid Poisson options');
    this.t=0;this.stepIndex=0;this.available=false;this.initialized=false;this.busy=false;
    this.lastError=null;this.buffers=[];this.errors=[];this.dispatches=0;this.readbackBytes=0;this.memoryBytes=0;
  }

  /** Request a device and compile actual WGSL; false leaves lastError populated. */
  async init() {
    if(this.device||this.destroyed||this.busy)throw new Error('Create a fresh solver to initialize a device');
    this.busy=true;
    try {
      if(!globalThis.navigator?.gpu)throw new Error('WebGPU is unavailable');
      const adapter=await navigator.gpu.requestAdapter();
      if(!adapter)throw new Error('No WebGPU adapter');
      const info=adapter.info;
      this.adapterInfo={vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,
        isFallbackAdapter:info.isFallbackAdapter??null};
      this.device=await adapter.requestDevice();
      this.device.lost.then(info=>{if(!this.destroyed){this.available=false;this.lastError='Device lost: '+info.message;}});
      const n=this.grid.W*this.grid.H;this.bytes=n*CONFIG.bytesPerCell;
      if(this.bytes>this.device.limits.maxStorageBufferBindingSize)throw new Error('Grid exceeds storage binding limits');
      this.groups=[Math.ceil(this.grid.W/CONFIG.workgroup),Math.ceil(this.grid.H/CONFIG.workgroup)];
      const entries=[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform'}}];
      for(let binding=1;binding<=8;binding++)entries.push({binding,visibility:GPUShaderStage.COMPUTE,
        buffer:{type:[1,3,6,7].includes(binding)?'read-only-storage':'storage'}});
      this.layout=this.device.createBindGroupLayout({entries});
      const layout=this.device.createPipelineLayout({bindGroupLayouts:[this.layout]});this.pipelines={};
      for(const [code,names] of SHADERS) {
        const module=this.device.createShaderModule({code:COMMON+'\n'+code});
        const compilation=await module.getCompilationInfo();
        const errors=compilation.messages.filter(m=>m.type==='error');
        if(errors.length)throw new Error(errors.map(m=>`${names[0]}:${m.lineNum}: ${m.message}`).join('\n'));
        for(const entryPoint of names)this.pipelines[entryPoint]=await this.device.createComputePipelineAsync({layout,compute:{module,entryPoint}});
      }
      this.uniform=this._buffer(64,GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST);
      this.external=this._storage();this.externalSources=this._storage();this.rhs0=this._storage();this.rhs1=this._storage();
      this.accepted=this._slot();this.trial=this._slot();this.candidate=this._slot();
      this.statsBytes=this.groups[0]*this.groups[1]*64;
      this.stats=this._buffer(this.statsBytes,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC);
      this.reducedStats=this._buffer(64,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC);
      this.statsRead=this._buffer(64,GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST);
      this.uniformData=new ArrayBuffer(64);this._uniform(0);this.available=true;
      return true;
    } catch(error) {this.lastError=error.message;this.destroy();return false;}
    finally {this.busy=false;}
  }

  _buffer(size,usage) {
    const b=this.device.createBuffer({size,usage});this.buffers.push(b);this.memoryBytes+=size;return b;
  }
  _storage(){return this._buffer(this.bytes,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST);}
  _slot(){return {front:this._storage(),back:this._storage(),flux:this._storage(),velocity:this._storage(),compensation:this._storage()};}
  _uniform(dt) {
    const g=this.grid,f=new Float32Array(this.uniformData),u=new Uint32Array(this.uniformData);
    u.set([g.nr,g.nz,g.W,g.H]);f.set([g.dr,g.dz,g.R,g.Z,this.nu,dt,this.limits.advSafety,this.limits.diffSafety],4);
    u[12]=this.boundary.kind==='no-slip-thom'?1:0;
    if(![...f.slice(4,9),f[10],f[11]].every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(f[9])||(dt>0&&f[9]===0))
      throw new RangeError('Parameters are not representable in f32');
    this.device.queue.writeBuffer(this.uniform,0,this.uniformData);
  }
  _dispatch(encoder,name,slot,{input=slot.front,output=slot.back,original=input,source=this.externalSources,
    exterior=this.external,flux=slot.flux,statistics=this.stats,groups=this.groups}={}) {
    const buffers=[this.uniform,input,output,original,flux,slot.velocity,exterior,source,statistics];
    const bindGroup=this.device.createBindGroup({layout:this.layout,entries:buffers.map((buffer,binding)=>({binding,resource:{buffer}}))});
    const pass=encoder.beginComputePass();pass.setPipeline(this.pipelines[name]);pass.setBindGroup(0,bindGroup);
    pass.dispatchWorkgroups(...groups);pass.end();this.dispatches++;
  }
  _submit(encode) {
    this.device.pushErrorScope('validation');
    try {const encoder=this.device.createCommandEncoder();encode(encoder);this.device.queue.submit([encoder.finish()]);}
    finally {this.errors.push(this.device.popErrorScope());}
  }
  _swap(slot){[slot.front,slot.back]=[slot.back,slot.front];}
  _boundary(slot) {
    const names=this.boundary.kind==='no-slip-thom'?['radial','axial','axis']:['analytic'];
    this._submit(encoder=>{for(const name of names){this._dispatch(encoder,name,slot);this._swap(slot);}});
  }
  _upload(time) {
    const g=this.grid;
    const sourceValues=this.source||this.boundary.kind==='analytic-extension'?new Float32Array(g.W*g.H*4):null;
    if(this.boundary.kind==='analytic-extension'){
      const fields={a:allocField(g),chi:allocField(g),phi:allocField(g)},values=new Float32Array(g.W*g.H*4);
      this.boundary.fill(g,fields,time);
      for(let k=0;k<g.W*g.H;k++){
        values[4*k]=fields.a[k];values[4*k+1]=fields.chi[k];values[4*k+2]=fields.phi[k];
        values[4*k+3]=fields.phi[k]-values[4*k+2];
      }
      for(let j=0;j<=g.nz;j++)for(let i=0;i<=g.nr;i++)
        if(i===0||i===g.nr||j===0||j===g.nz)sourceValues[4*g.idx(i,j)+3]=this.boundary.psi(g.rn(i),g.zn(j),time);
      if(!values.every(Number.isFinite))throw new Error('Nonfinite boundary data');
      this.device.queue.writeBuffer(this.external,0,values);
    }
    if(this.source){
      forEachInterior(g,(i,j,k)=>{const v=this.source(g.rc(i),g.zc(j),time);sourceValues[4*k]=v?.a??0;sourceValues[4*k+1]=v?.chi??0;});
    }
    if(sourceValues){
      if(!sourceValues.every(Number.isFinite))throw new Error('Nonfinite source or corner data');
      this.device.queue.writeBuffer(this.externalSources,0,sourceValues);
    }
  }

  async _metrics(slot) {
    this._submit(encoder=>{
      this._dispatch(encoder,'diagnostics',slot);
      this._dispatch(encoder,'reduce_statistics',slot,{input:this.stats,output:this.reducedStats,statistics:slot.back,groups:[1,1]});
      encoder.copyBufferToBuffer(this.reducedStats,0,this.statsRead,0,64);
    });
    await this.statsRead.mapAsync(GPUMapMode.READ);
    const s=new Float32Array(this.statsRead.getMappedRange()).slice();
    this.statsRead.unmap();this.readbackBytes+=64;
    const errors=await Promise.all(this.errors.splice(0));
    const error=errors.find(Boolean);if(error)throw new Error(error.message);
    if(!this.available)throw new Error(this.lastError??'Device unavailable');
    if(!s.every(Number.isFinite)||s[13]>0)throw new Error('Nonfinite GPU state');
    const o=this.limits,rate=Math.max(s[10],s[11]/Math.max(o.scaleA,s[4]),s[12]/Math.max(o.scaleChi,s[5]));
    const candidates={maximum:o.maxDt,'transport + diffusion':1/s[9],source:rate===0?Infinity:o.sourceCap/rate};
    const dt=Math.min(...Object.values(candidates));
    const limitingMechanism=Object.keys(candidates).find(key=>candidates[key]===dt);
    const diagnostic={energy:s[0],enstrophy:s[1],maxOmega:s[2],maxU:s[3],maxA:s[4],maxDiv:s[6],limitingMechanism};
    if(this.boundary.kind==='no-slip-thom')diagnostic.maxWallSlip=s[7];
    return {diagnostic,dt,residual:s[8],target:this.poisson.atol+this.poisson.rtol*s[5]};
  }
  async _prepare(slot,time) {
    this._upload(time);this._boundary(slot);
    let m=await this._metrics(slot),sweeps=0;
    while(m.residual>m.target&&sweeps<this.poisson.maxSweeps){
      const count=Math.min(this.poisson.checkEvery,this.poisson.maxSweeps-sweeps);
      this._submit(encoder=>{for(let k=0;k<count;k++)for(const name of ['red','black']){this._dispatch(encoder,name,slot);this._swap(slot);}});
      sweeps+=count;m=await this._metrics(slot);
    }
    const poisson={converged:m.residual<=m.target,reason:m.residual<=m.target?'converged':'budget',sweeps,residual:m.residual,target:m.target};
    if(!poisson.converged)return {poisson};
    this._boundary(slot);
    this._submit(encoder=>{for(const name of ['corners','faces','cells'])this._dispatch(encoder,name,slot);});
    m=await this._metrics(slot);
    // Refreshed ghosts do not change the eliminated elliptic rows.
    poisson.residual=m.residual;poisson.converged=m.residual<=m.target;
    return {poisson,...m};
  }
  _enter() {
    if(!this.available)throw new Error(this.lastError??'Initialize WebGPU first');
    if(this.busy)throw new Error('A solver operation is already in flight');this.busy=true;
  }

  /** Initialize device fields from the same samplers/ghosted arrays as the CPU. */
  async initialize({a,chi,phiGuess=()=>0,time=0}) {
    this._enter();
    try {
      if(!Number.isFinite(time))throw new RangeError('Invalid initial time');
      const g=this.grid,values=new Float32Array(g.W*g.H*4);
      for(const [c,input] of [a,chi,phiGuess].entries()){
        if(typeof input!=='function'&&(!(input instanceof Float64Array)&&!(input instanceof Float32Array)||input.length!==g.W*g.H))throw new TypeError('Invalid initial field');
        forEachInterior(g,(i,j,k)=>{
          const value=typeof input==='function'?input(g.rc(i),g.zc(j),time):input[k];
          values[4*k+c]=value;if(c===2)values[4*k+3]=value-values[4*k+2];
        });
      }
      if(!values.every(Number.isFinite))throw new Error('Initial data exceeds f32 range');
      this._uniform(0);this.device.queue.writeBuffer(this.candidate.front,0,values);
      this._submit(encoder=>encoder.clearBuffer(this.candidate.compensation));
      const prepared=await this._prepare(this.candidate,time);
      if(!prepared.poisson.converged)return {accepted:false,reason:'poisson-initial',poisson:prepared.poisson};
      [this.accepted,this.candidate]=[this.candidate,this.accepted];this.prepared=prepared;
      this.t=time;this.stepIndex=0;this.initialized=true;return {accepted:true,poisson:prepared.poisson};
    } catch(error){return {accepted:false,reason:'invalid-state',message:error.message};}
    finally {this.busy=false;}
  }

  /** Awaited SSP-RK2 with independent trial/candidate storage and guarded publication. */
  async step({maxDt=this.limits.maxDt,fixedDt}={}) {
    this._enter();let dt=0,attempts=0,last=this.prepared?.poisson;
    const before=this.dispatches,start=performance.now();
    const failure=(reason,message)=>({accepted:false,reason,message,dt:0,attemptedDt:dt,attempts,poisson:last});
    try {
      if(!this.initialized)throw new Error('Initialize fields before stepping');
      if(!Number.isFinite(maxDt)||maxDt<=0||(fixedDt!==undefined&&(!Number.isFinite(fixedDt)||fixedDt<=0)))throw new RangeError('Invalid step');
      const limit=this.prepared.dt,o=this.limits;
      dt=Math.min(maxDt,fixedDt??limit*o.adaptiveHeadroom);
      if(fixedDt!==undefined&&dt>limit*(1+32*Number.EPSILON))return failure('unsafe-fixed-step');
      this._upload(this.t);
      this._submit(encoder=>this._dispatch(encoder,'rhs',this.accepted,{output:this.rhs0}));
      for(attempts=1;attempts<=o.maxRetries+1;attempts++){
        if(dt<o.minDt||this.t+dt===this.t)return failure('dt-underflow');
        this._uniform(dt);
        this._submit(encoder=>this._dispatch(encoder,'trial',this.trial,{input:this.accepted.front,output:this.trial.front,source:this.rhs0,
          flux:this.accepted.compensation,statistics:this.trial.compensation}));
        let prepared=await this._prepare(this.trial,this.t+dt);last=prepared.poisson;
        if(!last.converged)return failure('poisson-trial');
        if(dt>prepared.dt*(1+32*Number.EPSILON)){
          if(fixedDt!==undefined)return failure('unsafe-fixed-step');
          dt=Math.min(dt*o.retryFactor,prepared.dt*o.retryFactor);continue;
        }
        this._submit(encoder=>{
          this._dispatch(encoder,'rhs',this.trial,{output:this.rhs1});
          this._dispatch(encoder,'final_stage',this.candidate,{input:this.trial.front,output:this.candidate.front,original:this.accepted.front,
            source:this.rhs1,exterior:this.rhs0,flux:this.accepted.compensation,statistics:this.candidate.compensation});
        });
        prepared=await this._prepare(this.candidate,this.t+dt);last=prepared.poisson;
        if(!last.converged)return failure('poisson-candidate');
        [this.accepted,this.candidate]=[this.candidate,this.accepted];this.prepared=prepared;
        this.t+=dt;this.stepIndex++;
        return {accepted:true,reason:'accepted',dt,attemptedDt:dt,attempts,poisson:last,
          dispatches:this.dispatches-before,elapsedMs:performance.now()-start};
      }
      return failure('retry-budget');
    } catch(error){return failure('invalid-state',error.message);}
    finally {this.busy=false;}
  }

  /** Small accepted-state diagnostics; includes the physical sample time. */
  diagnostics() {
    if(!this.initialized)throw new Error('No accepted state');
    return {...this.prepared.diagnostic,time:this.t,stepIndex:this.stepIndex};
  }

  /** Borrow accepted buffers for immediate, read-only GPU presentation.
   * Submit commands synchronously: these handles may be recycled after a step.
   * The consumer must not write, destroy, or retain them for later submission.
   */
  presentationState() {
    if(!this.available||!this.initialized)throw new Error(this.lastError??'No accepted GPU state');
    return {state:this.accepted.front,velocity:this.accepted.velocity,grid:this.grid,time:this.t,stepIndex:this.stepIndex};
  }

  /** Debug copy: phi is the Float64 sum of two stored f32 components; other
   * fields and the explicit phiHigh/phiCorrection arrays remain Float32.
   * This host reconstruction is never used to authorize a step.
   */
  async readback() {
    this._enter();let staging;
    try {
      if(!this.initialized)throw new Error('No accepted state');
      staging=this.device.createBuffer({size:this.bytes*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const encoder=this.device.createCommandEncoder();
      [this.accepted.front,this.accepted.velocity,this.accepted.flux,this.accepted.compensation].forEach((b,i)=>encoder.copyBufferToBuffer(b,0,staging,i*this.bytes,this.bytes));
      this.device.queue.submit([encoder.finish()]);await staging.mapAsync(GPUMapMode.READ);
      const packed=new Float32Array(staging.getMappedRange()),n=this.grid.W*this.grid.H,result={};
      for(const [key,offset,component] of [['a',0,0],['chi',0,1],['phiHigh',0,2],['phiCorrection',0,3],['ur',n*4,0],['uz',n*4,1],['psi',n*8,0],['Fr',n*8,1],['Fz',n*8,2],
        ['aCompensation',n*12,0],['chiCompensation',n*12,1]])
        result[key]=Float32Array.from({length:n},(_,i)=>packed[offset+4*i+component]);
      result.phi=Float64Array.from({length:n},(_,i)=>result.phiHigh[i]+result.phiCorrection[i]);
      staging.unmap();this.readbackBytes+=this.bytes*4;
      return {...result,potentialRepresentation:'f32-pair',diagnostics:this.diagnostics(),poisson:{...this.prepared.poisson},time:this.t,stepIndex:this.stepIndex};
    } finally {staging?.destroy();this.busy=false;}
  }

  /** Dispose only this solver's owned GPU resources. */
  destroy() {
    this.available=false;this.destroyed=true;
    for(const b of this.buffers)b.destroy();this.buffers=[];this.device?.destroy();
  }
}
