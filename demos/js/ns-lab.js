import { Game, GameObject, Painter, NSAxisymGPUSolver, NSAxisymView } from '../../src/index.js';
import { DEFAULTS, deepMerge, makeExperiment } from './ns-lab-model.js';
import { LabInstruments, bindLabUI, syncLabUI } from './ns-lab-ui.js';
import { createStirSource } from './ns-lab-stir.js';

const CONFIG = { background: '#0a0a0a', axis: '#888888', text: '#d0d5db',
  layout: { margin: 44, top: 20, bottom: 45 }, font: '11px "Martian Mono", monospace',
  stir: { pointerMs: 80, queueLimit: 8 } };

/** The GCanvas pipeline composites a GPU field, then adds physical axes. */
class MeridionalField extends GameObject {
  constructor(game) { super(game, { origin: 'top-left', interactive: false }); }
  draw() {
    super.draw();
    const lab = this.game, c = CONFIG.layout;
    const scale = Math.max(1, Math.min((lab.width - 2 * c.margin) / (2 * lab.config.R), (lab.height - c.top - c.bottom) / (2 * lab.config.Z)));
    const width = 2 * lab.config.R * scale, height = 2 * lab.config.Z * scale;
    const x = (lab.width - width) / 2, y = (lab.height - height + c.top - c.bottom) / 2;
    lab.fieldBounds = { x, y, width, height };
    Painter.shapes.rect(0, 0, lab.width, lab.height, CONFIG.background);
    if (lab.view && lab.solver?.available && lab.solver.initialized) {
      try {
        lab.view.render(width, height, { ...lab.config.presentation, scale: lab.colorScale() });
        Painter.useCtx(ctx => lab.view.compositeOnto(ctx, x, y, width, height), { saveState: true });
      } catch (error) { lab.fail(error.message); }
    }
    Painter.useCtx(ctx => {
      ctx.strokeStyle = '#262626'; ctx.lineWidth = 1; ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([4, 6]); ctx.strokeStyle = CONFIG.axis; ctx.beginPath();
      ctx.moveTo(x + width / 2, y); ctx.lineTo(x + width / 2, y + height); ctx.stroke();
      ctx.setLineDash([]); ctx.textAlign = 'center';
      for (const [position, label] of [[0, `−${lab.config.R}`], [0.5, '0 · axis'], [1, `+${lab.config.R}`]])
        Painter.text.fillText(label, x + width * position, y + height + 20, CONFIG.text, CONFIG.font);
      Painter.text.fillText('signed radial position', x + width / 2, y + height + 38, CONFIG.text, '10px Datatype, monospace');
      ctx.textAlign = 'right';
      Painter.text.fillText(`+${lab.config.Z}`, x - 9, y + 4, CONFIG.text, CONFIG.font);
      Painter.text.fillText('z = 0', x - 9, y + height / 2 + 4, CONFIG.text, CONFIG.font);
      Painter.text.fillText(`−${lab.config.Z}`, x - 9, y + height, CONFIG.text, CONFIG.font);
      const pulses = [...(lab.stirSource?.activePulses(lab.solver?.t ?? 0) ?? []), ...lab.pendingStirs];
      for (const pulse of pulses) for (const side of [-1, 1]) {
        ctx.strokeStyle = pulse.sign < 0 ? '#79bfff' : '#f5ad69'; ctx.globalAlpha = 0.8 * (1 - (pulse.age ?? 0));
        ctx.beginPath(); ctx.ellipse(x + width / 2 + side * pulse.r * scale, y + height / 2 - pulse.z * scale,
          lab.config.physics.radialWidth * scale, lab.config.physics.axialWidth * scale, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }, { saveState: true });
  }
}

/** Interactive lab. Async batches never overlap, and only accepted steps advance time. */
export class NSLab extends Game {
  constructor(canvas, options = {}) {
    super(canvas);
    this.config = deepMerge(DEFAULTS, options);
    this.listeners = new AbortController(); this.generation = 0;
    this.history = []; this.paused = true; this.loading = true;
    this.nextProfile = 0; this.nextUI = 0; this.scales = {};
    this.pendingStirs = []; this.stirSign = 1; this.stirCount = 0; this.lastPointerStir = -Infinity;
    this.enableFluidSize(canvas.parentElement);
  }

  init() {
    super.init(); this.pipeline.add(new MeridionalField(this));
    this.instruments = new LabInstruments(document.getElementById('charts'), this);
    bindLabUI(this);
    this.canvas.style.touchAction = 'none';
    this.events.on('inputdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      this.stirDragging = true; this.queueStir(event.x, event.y, event.shiftKey ? -this.stirSign : this.stirSign);
    });
    this.events.on('inputmove', event => {
      if (this.stirDragging && performance.now() - this.lastPointerStir >= CONFIG.stir.pointerMs)
        this.queueStir(event.x, event.y, event.shiftKey ? -this.stirSign : this.stirSign);
    });
    this.events.on('inputup', () => { this.stirDragging = false; });
    for (const event of ['pointerup', 'pointercancel', 'blur']) window.addEventListener(event, () => { this.stirDragging = false; }, { signal: this.listeners.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.paused = true; syncLabUI(this); } }, { signal: this.listeners.signal });
    window.addEventListener('pagehide', () => this.dispose(), { signal: this.listeners.signal });
    this.ready = this.reset();
  }

  colorScale() { return Math.max(1e-12, (this.scales[this.config.presentation.mode] ?? 1) / 10 ** this.config.presentation.contrast); }

  queueStir(x, y, sign = this.stirSign) {
    if (![x, y, sign].every(Number.isFinite)) return false;
    if (this.loading || this.fault || this.config.preset !== 'driven' || !this.stirSource || !this.fieldBounds) return false;
    const b = this.fieldBounds, c = this.config, p = c.physics;
    if (x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) return false;
    const r = Math.max(p.radialWidth, Math.min(c.R - p.radialWidth, Math.abs((x - b.x) / b.width * 2 - 1) * c.R));
    const z = Math.max(-c.Z + p.axialWidth, Math.min(c.Z - p.axialWidth, (1 - (y - b.y) / b.height * 2) * c.Z));
    if (this.pendingStirs.length >= CONFIG.stir.queueLimit) this.pendingStirs.shift();
    this.pendingStirs.push({ r, z, sign }); this.lastPointerStir = performance.now(); syncLabUI(this);
    return true;
  }

  async reset() {
    if (this.disposed) return;
    const token = ++this.generation;
    this.loading = true; this.paused = true; this.fault = null; syncLabUI(this);
    this.pendingStirs = []; this.stirDragging = false; this.stirSource = null; this.stirCount = 0;
    await Promise.allSettled([this.operation, this.profileTask]);
    if (token !== this.generation) return;
    this.view?.destroy(); this.solver?.destroy(); this.view = null; this.solver = null;
    this.history = []; this.profile = null; this.latest = null; this.poisson = null; this.lastStep = null; this.lastLimit = null;
    this.stepRate = null; this.simRate = null; this.playbackSample = null;
    const config = deepMerge(this.config), experiment = makeExperiment(config);
    const solver = new NSAxisymGPUSolver({ nr: config.nr, nz: 2 * config.nr, R: config.R, Z: config.Z,
      nu: config.nu, boundary: experiment.boundary, source: experiment.source ?? null });
    let view, stirSource;
    try {
      if (!await solver.init()) throw new Error(solver.lastError);
      if (token !== this.generation) { solver.destroy(); return; }
      const initial = await experiment.init(solver);
      if (!initial.accepted) throw new Error(`Initial solve: ${initial.reason}; residual ${initial.poisson?.residual}, target ${initial.poisson?.target}`);
      if (config.preset === 'driven') {
        stirSource = createStirSource(experiment.source, { R: config.R, Z: config.Z,
          radialWidth: config.physics.radialWidth, axialWidth: config.physics.axialWidth });
        solver.source = stirSource;
      }
      this.canvas.style.cursor = config.preset === 'driven' ? 'crosshair' : 'default';
      view = new NSAxisymView(solver); await view.init();
      if (token !== this.generation) { view.destroy(); solver.destroy(); return; }
      this.solver = solver; this.view = view; this.stirSource = stirSource; this.experiment = experiment; this.poisson = initial.poisson;
      this.latest = solver.diagnostics(); this.history.push(this.latest);
      const d = this.latest;
      this.scales = { gamma: Math.max(1e-8, 0.35 * config.R ** 2 * d.maxA), omega: Math.max(1e-8, d.maxOmega),
        source: Math.max(1e-8, d.maxA ** 2 / config.physics.axialWidth),
        streamlines: Math.max(1e-8, !experiment.exact
          ? Math.abs(config.physics.meridionalStrength) * config.physics.ringRadius ** 2
          : config.physics.alpha * config.Z * config.R ** 2 / 2), swirl: Math.max(1e-8, d.maxA) };
      this.config.presentation.sliceZ = !experiment.exact ? config.physics.separation / 2 : 0;
      document.getElementById('slice').value = this.config.presentation.sliceZ;
      document.getElementById('slice-value').textContent = this.config.presentation.sliceZ.toFixed(2);
      this.nextProfile = 0;
      this.paused = matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).get('paused') === '1';
      this.playbackSample = { wall: performance.now(), time: solver.t, step: solver.stepIndex };
    } catch (error) {
      view?.destroy(); solver.destroy();
      if (token === this.generation) { this.solver = null; this.view = null; this.fail(error.message); }
    } finally { if (token === this.generation) { this.loading = false; syncLabUI(this); } }
  }

  fail(message) { this.fault = message; this.paused = true; syncLabUI(this); }
  togglePause() {
    if (!this.loading && !this.fault && this.solver?.initialized) {
      this.paused = !this.paused;
      this.playbackSample = { wall: performance.now(), time: this.solver.t, step: this.solver.stepIndex };
      this.stepRate = null; this.simRate = null; syncLabUI(this);
    }
  }
  singleStep() {
    if (this.loading || this.fault || this.operation || !this.solver?.initialized) return;
    this.paused = true; this.scheduleSteps(1, true);
  }

  scheduleSteps(count, single = false) {
    this.operation = this.advance(count, single).catch(error => this.fail(error.message)).finally(() => { this.operation = null; syncLabUI(this); });
  }

  async advance(count, single) {
    const solver = this.solver;
    for (let i = 0; i < count; i++) {
      if (this.loading || this.disposed || (!single && this.paused)) break;
      const mechanism = solver.diagnostics().limitingMechanism;
      // Publish gestures only between steps: a mid-stage DOM event must not
      // change the force history sampled by an in-flight RK step or its retry.
      for (const pulse of this.pendingStirs.splice(0))
        if (this.stirSource?.addPulse(pulse.r, pulse.z, solver.t, pulse.sign)) this.stirCount++;
      const result = await solver.step();
      if (this.loading || this.disposed) break;
      if (!result.accepted) {
        this.fail(`${result.reason}${result.message ? ': ' + result.message : ''}${result.poisson ? ` · residual ${result.poisson.residual} / target ${result.poisson.target}` : ''}. Reset to start a fresh run.`);
        break;
      }
      this.lastStep = result; this.lastLimit = result.attempts > 1 ? `${mechanism} (retry)` : mechanism; this.poisson = result.poisson;
      const sample = this.playbackSample, now = performance.now();
      if (!this.paused && sample && now - sample.wall >= 500) {
        const elapsed = (now - sample.wall) / 1000;
        this.stepRate = (solver.stepIndex - sample.step) / elapsed;
        this.simRate = (solver.t - sample.time) / elapsed;
        this.playbackSample = { wall: now, time: solver.t, step: solver.stepIndex };
      }
      this.latest = solver.diagnostics(); this.history.push(this.latest);
      if (this.history.length > this.config.sampling.history) this.history.shift();
    }
  }

  update(dt) {
    super.update(dt);
    if (!this.loading && this.solver?.initialized && !this.solver.available && !this.fault) this.fail(this.solver.lastError ?? 'GPU device unavailable');
    if (!this.loading && !this.paused && !this.fault && !this.operation && !document.hidden) this.scheduleSteps(this.config.stepsPerFrame);
    const now = performance.now();
    if (this.view && !this.loading && !this.fault && !this.profileTask && now >= this.nextProfile) {
      const view = this.view, generation = this.generation;
      this.nextProfile = now + this.config.sampling.profileMs;
      this.profileTask = view.readProfile(this.config.presentation.sliceZ).then(profile => {
        if (generation === this.generation && profile) this.profile = profile;
      }).catch(error => { if (generation === this.generation && !this.disposed) this.fail(error.message); })
        .finally(() => { this.profileTask = null; });
    }
    if (now >= this.nextUI) { syncLabUI(this); this.nextUI = now + this.config.sampling.uiMs; }
  }

  render() { super.render(); this.instruments?.render(); }

  async dispose() {
    this.disposed = true; ++this.generation; this.paused = true; this.stop(); this.listeners.abort();
    this.disableFluidSize(); this.instruments?.dispose();
    await Promise.allSettled([this.operation, this.profileTask]); this.view?.destroy(); this.solver?.destroy();
  }
}

const lab = new NSLab(document.getElementById('game'));
if (new URLSearchParams(location.search).has('debug')) window.nsLab = lab;
lab.start();
