import {describe,it,expect,vi,afterEach} from 'vitest';
import {NSAxisymGPUSolver} from '../../src/webgpu/ns-axisym-solver.js';
import {noSlipBoundary} from '../../src/math/ns-axisym.js';

const options=()=>({nr:8,nz:12,R:1,Z:0.5,nu:0.05,boundary:noSlipBoundary()});
afterEach(()=>vi.unstubAllGlobals());

describe('WebGPU host contract (not shader execution)',()=>{
  it('rejects unsafe limits and unsupported boundary policies before requesting a device',()=>{
    for(const change of [{nu:0},{boundary:{}},{source:1},{limits:{advSafety:1}},
      {limits:{diffSafety:1}},{limits:{retryFactor:0}},{poisson:{atol:0}},{poisson:{maxSweeps:0.5}}])
      expect(()=>new NSAxisymGPUSolver({...options(),...change})).toThrow();
  });
  it('reports absent WebGPU without pretending a CPU fallback is GPU validation',async()=>{
    vi.stubGlobal('navigator',{});
    const s=new NSAxisymGPUSolver(options());
    expect(await s.init()).toBe(false);expect(s.available).toBe(false);
    expect(s.lastError).toBe('WebGPU is unavailable');
    await expect(s.step()).rejects.toThrow('WebGPU is unavailable');
    expect(()=>s.diagnostics()).toThrow('No accepted state');s.destroy();
  });
  it('guards concurrent adapter initialization',async()=>{
    let resolve;const adapter=new Promise(r=>{resolve=r;});
    vi.stubGlobal('navigator',{gpu:{requestAdapter:()=>adapter}});
    const s=new NSAxisymGPUSolver(options()),initial=s.init();
    await expect(s.init()).rejects.toThrow('fresh solver');
    resolve(null);expect(await initial).toBe(false);expect(s.lastError).toBe('No WebGPU adapter');
    expect(s.busy).toBe(false);
  });
});
