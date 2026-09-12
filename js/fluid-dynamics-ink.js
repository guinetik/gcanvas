// Independent high-resolution passive dye, driven by the CPU MAC velocity grid.
// WebGL2 + half-float render targets; no synchronous readback in the animation loop.
const VERTEX = `#version 300 es
out vec2 uv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
in vec2 uv;
out vec4 color;
uniform sampler2D ink, velocity, forwardInk, reverseInk;
uniform vec2 grid, inkSize;
uniform float worldWidth, dt, fade, exposure;
uniform mat3 inkPalette;
uniform int mode, count;
uniform vec4 points[32], colors[32];
float face(vec2 p,int channel){
  vec2 hi=grid-(channel==0?vec2(0,1):vec2(1,0));
  p=clamp(p,vec2(0),hi);ivec2 a=ivec2(min(floor(p),hi-1.));vec2 f=p-vec2(a);
  float v00=texelFetch(velocity,a,0)[channel],v10=texelFetch(velocity,a+ivec2(1,0),0)[channel];
  float v01=texelFetch(velocity,a+ivec2(0,1),0)[channel],v11=texelFetch(velocity,a+ivec2(1,1),0)[channel];
  return mix(mix(v00,v10,f.x),mix(v01,v11,f.x),f.y);
}
vec2 flow(vec2 p){vec2 q=p*grid;return vec2(face(q-vec2(0,.5),0)/worldWidth,face(q-vec2(.5,0),1));}
vec2 departure(){return clamp(uv-dt*flow(uv-.5*dt*flow(uv)),.5/inkSize,1.-.5/inkSize);}
void main(){
  if(mode==0){color=texture(ink,uv);return;}
  if(mode==1){
    vec3 value=texture(ink,uv).rgb;
    for(int i=0;i<32;i++){if(i>=count)break;vec2 d=(uv-points[i].xy)*vec2(worldWidth,1.);
      float w=pow(max(0.,1.-dot(d,d)/(points[i].z*points[i].z)),3.);
      value+=colors[i].rgb*colors[i].a*w;
    }color=vec4(value,1.);return;
  }
  if(mode==2){color=texture(ink,departure());return;}
  if(mode==3){
    vec2 q=departure()*inkSize-.5;ivec2 a=ivec2(clamp(floor(q),vec2(0),inkSize-2.));
    vec3 v0=texelFetch(ink,a,0).rgb,v1=texelFetch(ink,a+ivec2(1,0),0).rgb;
    vec3 v2=texelFetch(ink,a+ivec2(0,1),0).rgb,v3=texelFetch(ink,a+ivec2(1,1),0).rgb;
    vec3 value=texture(forwardInk,uv).rgb+.5*(texture(ink,uv).rgb-texture(reverseInk,uv).rgb);
    color=vec4(clamp(value,min(min(v0,v1),min(v2,v3)),max(max(v0,v1),max(v2,v3)))*exp(-fade*dt),1.);return;
  }
  // Storage y=0 is the top of the physical domain; the display framebuffer is bottom-up.
  vec3 displayInk=inkPalette*texture(ink,vec2(uv.x,1.-uv.y)).rgb;
  color=vec4(vec3(1.)-exp(-displayInk*exposure)+vec3(3.,3.,9.)/255.,1.);
}`;

export class GPUInk {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
    this.available = false; this.targets = []; this.width = 0; this.height = 0;
    this.palette = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    this.pending = []; this.points = new Float32Array(128); this.colors = new Float32Array(128);
    this.listeners = new AbortController();
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.available = false; this.pending.length = 0; }, { signal: this.listeners.signal });
    // Recovery is explicit: the owner replaces this instance and seeds from its CPU fallback.
    this.canvas.addEventListener('webglcontextrestored', () => { this.restored = true; }, { signal: this.listeners.signal });
    if (!this.gl) return;
    try { this.init(); } catch (error) { this.error = error.message; this.release(); }
  }

  init() {
    const gl = this.gl;
    if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return;
    const compile = (type, source) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); }
      return shader;
    };
    const v = compile(gl.VERTEX_SHADER, VERTEX), f = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    this.program = gl.createProgram(); gl.attachShader(this.program, v); gl.attachShader(this.program, f); gl.linkProgram(this.program);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
    this.locations = Object.fromEntries(['ink', 'velocity', 'forwardInk', 'reverseInk', 'grid', 'inkSize', 'worldWidth', 'dt', 'fade', 'mode', 'count', 'points', 'colors', 'exposure', 'inkPalette'].map(key => [key, gl.getUniformLocation(this.program, key)]));
    this.velocity = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.velocity); this.textureParameters(gl.NEAREST);
    this.available = true;
  }

  textureParameters(filter) {
    const gl = this.gl;
    for (const name of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, name, filter);
    for (const name of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, name, gl.CLAMP_TO_EDGE);
  }

  target(width, height) {
    const gl = this.gl, texture = gl.createTexture(), framebuffer = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, texture); this.textureParameters(gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer); gl.deleteTexture(texture); throw new Error('Half-float ink target unavailable');
    }
    return { texture, framebuffer };
  }

  resize(width, height, model) {
    if (!this.available || width === this.width && height === this.height) return;
    const gl = this.gl, previous = this.targets;
    const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    width = Math.min(width, max); height = Math.min(height, max);
    const next = [];
    try { for (let i = 0; i < 4; i++) next.push(this.target(width, height)); }
    catch (e) { next.forEach(t => this.deleteTarget(t)); this.error = e.message; this.available = false; return; }
    this.targets = next; this.width = width; this.height = height;
    this.canvas.width = width; this.canvas.height = height;
    this.uploadVelocity(model);
    if (previous.length) {
      this.pass(0, this.targets[0], previous[0].texture);
      previous.forEach(t => this.deleteTarget(t));
    } else this.seedFrom(model);
  }

  seedFrom(model) {
    const gl = this.gl, data = new Float32Array(model.nx * model.ny * 4);
    for (let j = 0; j < model.ny; j++) for (let i = 0; i < model.nx; i++) {
      const p = (i + j * model.nx) * 4, k = i + j * model.stride;
      for (let c = 0; c < 3; c++) data[p + c] = model.dye[c][k]; data[p + 3] = 1;
    }
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); this.textureParameters(gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, model.nx, model.ny, 0, gl.RGBA, gl.FLOAT, data);
    this.pass(0, this.targets[0], texture); gl.deleteTexture(texture);
  }

  uploadVelocity(model) {
    const gl = this.gl;
    if (!this.velocityData || this.velocityData.length !== model.size * 4) this.velocityData = new Float32Array(model.size * 4);
    for (let k = 0; k < model.size; k++) { this.velocityData[k * 4] = model.u[k]; this.velocityData[k * 4 + 1] = model.v[k]; }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.velocity);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, model.nx + 1, model.ny + 1, 0, gl.RGBA, gl.FLOAT, this.velocityData);
    this.grid = [model.nx, model.ny]; this.worldWidth = model.width;
  }

  pass(mode, target, source = this.targets[0].texture, dt = 0, fade = 0) {
    const gl = this.gl, u = this.locations;
    gl.useProgram(this.program); gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null); gl.viewport(0, 0, this.width, this.height);
    [source, this.velocity, mode === 3 ? this.targets[2].texture : source, mode === 3 ? this.targets[3].texture : source].forEach((texture, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture);
    });
    gl.uniform1i(u.ink, 0); gl.uniform1i(u.velocity, 1); gl.uniform1i(u.forwardInk, 2); gl.uniform1i(u.reverseInk, 3);
    gl.uniform2f(u.grid, ...this.grid); gl.uniform2f(u.inkSize, this.width, this.height); gl.uniform1f(u.worldWidth, this.worldWidth);
    gl.uniform1f(u.dt, dt); gl.uniform1f(u.fade, fade); gl.uniform1f(u.exposure, 1.6); gl.uniform1i(u.mode, mode);
    if (mode === 4) gl.uniformMatrix3fv(u.inkPalette, false, this.palette);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  splat(x, y, radius, color, amount) {
    if (!this.available) return;
    this.pending.push({ x, y, radius, color, amount });
    if (this.pending.length === 32) this.flush();
  }

  flush() {
    if (!this.available || !this.pending.length || !this.targets.length) return;
    const gl = this.gl;
    this.pending.forEach((p, i) => {
      this.points.set([p.x / this.worldWidth, p.y, p.radius, 0], i * 4);
      this.colors.set([...p.color, p.amount], i * 4);
    });
    gl.useProgram(this.program);
    gl.uniform1i(this.locations.count, this.pending.length);
    gl.uniform4fv(this.locations.points, this.points); gl.uniform4fv(this.locations.colors, this.colors);
    this.pass(1, this.targets[1]); this.swap(); this.pending.length = 0;
  }

  swap() { [this.targets[0], this.targets[1]] = [this.targets[1], this.targets[0]]; }

  step(model, dt) {
    if (!this.available) return;
    this.uploadVelocity(model); this.flush();
    this.pass(2, this.targets[2], this.targets[0].texture, dt);
    this.pass(2, this.targets[3], this.targets[2].texture, -dt);
    this.pass(3, this.targets[1], this.targets[0].texture, dt, model.fade); this.swap();
  }

  draw(palette = this.palette) { this.palette = palette; if (this.available) { this.flush(); this.pass(4, null); } return this.canvas; }
  clear() {
    this.pending.length = 0;
    if (!this.available) return;
    const gl = this.gl; gl.clearColor(0, 0, 0, 0);
    for (const t of this.targets) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer); gl.clear(gl.COLOR_BUFFER_BIT); }
  }
  deleteTarget(t) { this.gl.deleteTexture(t.texture); this.gl.deleteFramebuffer(t.framebuffer); }
  release() {
    this.targets.forEach(t => this.deleteTarget(t)); this.targets = [];
    if (this.velocity) this.gl.deleteTexture(this.velocity);
    if (this.program) this.gl.deleteProgram(this.program);
    this.available = false;
  }
  destroy() { this.listeners.abort(); if (this.gl) this.release(); }
}
