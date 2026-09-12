import SHADER from './shaders/ns/view.wgsl?raw';

const CONFIG = { pixelRatio: 2, profileBytes: 16, workgroup: 64, minScale: 1e-12 };
export const NS_VIEW_MODES = Object.freeze(['gamma', 'omega', 'source', 'streamlines', 'swirl']);

/** GPU presentation of accepted axisymmetric fields, independent of step acceptance.
 * Owns a WebGPU canvas and small profile buffers; shares the solver's device.
 * Full numerical fields are never copied to the CPU for rendering.
 */
export class NSAxisymView {
  constructor(solver) {
    this.solver = solver;
    this.canvas = document.createElement('canvas');
    this.gpuCanvas = document.createElement('canvas');
    this.imageContext = this.canvas.getContext('2d', { alpha: false });
    this.renderPasses = 0;
    this.device = solver.device;
    this.profileBusy = false;
    this.profileReadbackBytes = 0;
    this.destroyed = false;
  }

  async init() {
    const device = this.device;
    if (!device || !this.solver.available) throw new Error('Initialize the solver before its view');
    this.context = this.gpuCanvas.getContext('webgpu');
    if (!this.context) throw new Error('A WebGPU canvas is unavailable');
    const format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({ device, format, alphaMode: 'opaque' });
    const module = device.createShaderModule({ label: 'Axisymmetric field view', code: SHADER });
    const info = await module.getCompilationInfo();
    const errors = info.messages.filter(message => message.type === 'error');
    if (errors.length) throw new Error(errors.map(message => message.message).join('\n'));
    this.layout = device.createBindGroupLayout({ entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ...[1, 2].map(binding => ({ binding, visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' } })),
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ] });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [this.layout] });
    this.pipeline = await device.createRenderPipelineAsync({ layout,
      vertex: { module, entryPoint: 'fullscreen' }, fragment: { module, entryPoint: 'field', targets: [{ format }] },
      primitive: { topology: 'triangle-list' } });
    this.extract = await device.createComputePipelineAsync({ layout, compute: { module, entryPoint: 'cross_section' } });
    this.uniform = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const size = this.solver.grid.nr * CONFIG.profileBytes;
    this.profile = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    this.staging = device.createBuffer({ size, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  }

  _bind({ mode = 'gamma', scale = 1, vectors = false, plain = false, sliceZ = 0 } = {}) {
    if (this.destroyed) throw new Error('View has been destroyed');
    const snapshot = this.solver.presentationState(), g = snapshot.grid;
    const index = NS_VIEW_MODES.indexOf(mode);
    if (index < 0 || !Number.isFinite(scale) || scale <= 0 || !Number.isFinite(sliceZ)) throw new RangeError('Invalid view parameters');
    const data = new ArrayBuffer(64);
    new Uint32Array(data).set([g.nr, g.nz, g.W, index]);
    new Float32Array(data).set([g.dr, g.dz, g.R, g.Z, Math.max(scale, CONFIG.minScale), +vectors, +plain, sliceZ], 4);
    new Float32Array(data).set([this.canvas.width, this.canvas.height, 0, 0], 12);
    this.device.queue.writeBuffer(this.uniform, 0, data);
    const buffers = [this.uniform, snapshot.state, snapshot.velocity, this.profile];
    return { snapshot, group: this.device.createBindGroup({ layout: this.layout,
      entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })) }) };
  }

  /** Render synchronously from the current accepted buffers into the owned canvas. */
  render(width, height, options = {}) {
    if (this.destroyed || !this.solver.available) throw new Error('View or solver is unavailable');
    const ratio = Math.min(globalThis.devicePixelRatio || 1, CONFIG.pixelRatio);
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    const key = [this.solver.stepIndex, this.solver.t, w, h, options.mode, options.scale, options.vectors, options.plain].join('|');
    if (key === this.renderKey) return;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = this.gpuCanvas.width = w; this.canvas.height = this.gpuCanvas.height = h;
    }
    const { snapshot, group } = this._bind(options);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({ colorAttachments: [{ view: this.context.getCurrentTexture().createView(),
      loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }] });
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, group); pass.draw(3); pass.end();
    this.device.queue.submit([encoder.finish()]);
    // Retain the rendered image between accepted steps. Copying a WebGPU
    // canvas into the game every animation frame needlessly competes with
    // compute; the numerical fields themselves never leave GPU storage.
    this.imageContext.drawImage(this.gpuCanvas, 0, 0);
    this.renderKey = key; this.renderPasses++;
    this.renderedStep = snapshot.stepIndex;
  }

  compositeOnto(ctx, x = 0, y = 0, width = this.canvas.width, height = this.canvas.height) {
    ctx.drawImage(this.canvas, x, y, width, height);
  }

  /** Only one radial profile (16*nr bytes), timestamped at GPU submission. */
  async readProfile(sliceZ = 0) {
    if (this.profileBusy) return null;
    this.profileBusy = true;
    try {
      const { snapshot, group } = this._bind({ sliceZ });
      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginComputePass(); pass.setPipeline(this.extract); pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(Math.ceil(snapshot.grid.nr / CONFIG.workgroup)); pass.end();
      const size = snapshot.grid.nr * CONFIG.profileBytes;
      encoder.copyBufferToBuffer(this.profile, 0, this.staging, 0, size);
      this.device.queue.submit([encoder.finish()]); await this.staging.mapAsync(GPUMapMode.READ);
      const values = new Float32Array(this.staging.getMappedRange()).slice(); this.staging.unmap();
      this.profileReadbackBytes += size;
      if (!values.every(Number.isFinite)) throw new Error('Nonfinite cross-section');
      return { values, time: snapshot.time, stepIndex: snapshot.stepIndex, sliceZ };
    } finally { this.profileBusy = false; }
  }

  destroy() {
    this.destroyed = true; this.context?.unconfigure();
    this.uniform?.destroy(); this.profile?.destroy(); this.staging?.destroy();
  }
}
