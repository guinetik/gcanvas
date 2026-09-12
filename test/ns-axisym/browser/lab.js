const CONFIG = { timeout: 120000, pauseMs: 150, pixelTolerance: 3 };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate) {
  const start = performance.now();
  while (!predicate()) { if (performance.now() - start > CONFIG.timeout) throw new Error('Lab wait timed out'); await delay(25); }
}

/** Actual-browser integration checks for the GCanvas lab and accepted-state renderer. */
export async function runLabChecks() {
  const started = performance.now(), checks = [], errors = [];
  const check = (name, passed, detail = {}) => {
    checks.push({ name, passed, ...detail }); console.info('NS_LAB_CHECK', name, passed);
    if (!passed) throw new Error(name + ': ' + JSON.stringify(detail));
  };
  await until(() => window.nsLab);
  const lab = window.nsLab;
  const listen = () => lab.solver.device.addEventListener('uncapturederror', event => errors.push(event.error.message));
  async function reset(preset) {
    lab.config.preset = preset; document.getElementById('preset').value = preset;
    await lab.reset(); if (lab.fault) throw new Error(lab.fault); listen();
    await until(() => lab.profile); await lab.profileTask;
  }
  try {
    await lab.ready;
    check('default-driven-preset', lab.config.preset === 'driven' && typeof lab.solver?.source === 'function' && !document.getElementById('drive-controls').hidden);
    lab.config.drive.strength = 0;
    await reset('driven');
    await lab.advance(192, true);
    const baseline = await lab.view.readProfile(0);
    await reset('driven'); lab.render();
    const canvasRect = lab.canvas.getBoundingClientRect(), bounds = lab.fieldBounds;
    const clientX = canvasRect.left + (bounds.x + bounds.width * 0.75) * canvasRect.width / lab.width;
    const clientY = canvasRect.top + (bounds.y + bounds.height * 0.5) * canvasRect.height / lab.height;
    lab.canvas.dispatchEvent(new MouseEvent('mousedown', { clientX, clientY, button: 0, bubbles: true }));
    lab.canvas.dispatchEvent(new MouseEvent('mouseup', { clientX, clientY, button: 0, bubbles: true }));
    check('mouse-stir-queued', lab.pendingStirs.length === 1 && Math.abs(lab.pendingStirs[0].r - 0.5) < 0.01);
    await delay(100); check('paused-stir-preserves-time', lab.solver.t === 0 && lab.stirCount === 0);
    await lab.advance(192, true);
    const stirred = await lab.view.readProfile(0);
    let manualChange = 0;
    for (let i = 0; i < lab.solver.grid.nr; i++) manualChange = Math.max(manualChange, stirred.values[4 * i] - baseline.values[4 * i]);
    check('stir-changes-computed-flow', !lab.fault && lab.stirCount === 1 && manualChange > 0.1, { maxSwirlVelocityChange: manualChange });
    await reset('driven');
    check('reset-clears-stirs', lab.stirCount === 0 && lab.pendingStirs.length === 0 && lab.stirSource.activePulses(0).length === 0);
    lab.render();
    lab.queueStir(lab.fieldBounds.x + lab.fieldBounds.width * 0.25, lab.fieldBounds.y + lab.fieldBounds.height * 0.5, -1);
    check('mirrored-negative-stir', Math.abs(lab.pendingStirs[0].r - 0.5) < 0.01 && lab.pendingStirs[0].sign === -1);
    lab.config.drive.strength = 3; document.getElementById('drive-strength').value = '3';
    await reset('rings');
    check('decay-has-no-drive', lab.solver.source === null && document.getElementById('drive-controls').hidden);
    check('initial-ring-solve', !lab.fault && !!lab.solver?.initialized, { fault: lab.fault, poisson: lab.poisson });
    listen();
    const adapter = lab.solver.adapterInfo;
    check('real-gpu', adapter.isFallbackAdapter === false, { adapter });
    const solver = lab.solver;
    let fullReads = 0; const originalRead = solver.readback.bind(solver);
    solver.readback = (...args) => { fullReads++; return originalRead(...args); };
    const initialTime = solver.t;
    await delay(CONFIG.pauseMs); check('paused-clock', solver.t === initialTime);
    function pixels() {
      lab.render(); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d'); ctx.drawImage(lab.view.canvas, 0, 0, 256, 256);
      return ctx.getImageData(0, 0, 256, 256).data;
    }
    const vectors = document.getElementById('vectors');
    vectors.checked = false; vectors.dispatchEvent(new Event('change')); const withoutArrows = pixels();
    vectors.checked = true; vectors.dispatchEvent(new Event('change')); const withArrows = pixels();
    let arrowPixels = 0;
    for (let k = 0; k < withArrows.length; k += 4)
      if (Math.abs(withArrows[k] - withoutArrows[k]) + Math.abs(withArrows[k + 1] - withoutArrows[k + 1]) > 20) arrowPixels++;
    check('visible-direction-arrows', arrowPixels > 100, { arrowPixels });
    vectors.checked = false; vectors.dispatchEvent(new Event('change')); const beforeEvolution = pixels();
    const renderPasses = lab.view.renderPasses;
    await delay(300); lab.render();
    check('unchanged-field-reuses-image', lab.view.renderPasses === renderPasses && pixels().some(value => value > 100));
    document.getElementById('step').click(); await until(() => solver.stepIndex === 1 || lab.fault); await lab.operation;
    check('single-step', !lab.fault && solver.stepIndex === 1 && lab.paused && lab.history.length === 2);
    const wallStart = performance.now();
    document.getElementById('play').click(); await until(() => solver.t >= 0.1 || lab.fault);
    if (!lab.paused) document.getElementById('play').click(); await lab.operation;
    const evolved = pixels(); let colorChange = 0, originalSignal = 0;
    for (let k = 0; k < evolved.length; k += 4) for (let c = 0; c < 3; c++) {
      colorChange += Math.abs(evolved[k + c] - beforeEvolution[k + c]); originalSignal += beforeEvolution[k + c];
    }
    check('ring-evolution', !lab.fault && solver.t >= 0.1 && colorChange / originalSignal > 0.05,
      { steps: solver.stepIndex, time: solver.t, wallSeconds: (performance.now() - wallStart) / 1000, relativeImageChange: colorChange / originalSignal, energy: lab.latest.energy });
    const pausedTime = solver.t; await delay(CONFIG.pauseMs); check('pause-stable', solver.t === pausedTime);
    for (const mode of ['gamma', 'omega', 'source', 'streamlines', 'swirl']) {
      document.getElementById('view').value = mode; document.getElementById('view').dispatchEvent(new Event('change'));
      lab.render(); await solver.device.queue.onSubmittedWorkDone();
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d'); ctx.drawImage(lab.view.canvas, 0, 0, 256, 256);
      const pixels = ctx.getImageData(0, 0, 256, 256).data;
      let symmetry = 0, maximum = 0, minimum = 255;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 128; x++) for (let c = 0; c < 3; c++) {
        const value = pixels[4 * (y * 256 + x) + c];
        symmetry = Math.max(symmetry, Math.abs(value - pixels[4 * (y * 256 + 255 - x) + c]));
        maximum = Math.max(maximum, value); minimum = Math.min(minimum, value);
      }
      check('render-' + mode, symmetry <= CONFIG.pixelTolerance && maximum - minimum > 20,
        { symmetry, dynamicRange: maximum - minimum });
    }
    check('render-preserves-state', solver.t === pausedTime && fullReads === 0,
      { fullFieldReadbacks: fullReads, profileReadbackBytes: lab.view.profileReadbackBytes });
    // The profile must agree with interpolation of an independent debug copy.
    await lab.profileTask;
    const slice = 0.27, profile = await lab.view.readProfile(slice), fields = await originalRead(), g = solver.grid;
    const jf = (slice + g.Z) / g.dz - 0.5, j = Math.floor(jf), t = jf - j;
    let profileError = 0;
    for (let i = 0; i < g.nr; i++) {
      const expected = g.rc(i) * (fields.a[g.idx(i, j)] * (1 - t) + fields.a[g.idx(i, j + 1)] * t);
      profileError = Math.max(profileError, Math.abs(expected - profile.values[4 * i]));
    }
    check('profile-values-and-time', profileError < 2e-6 && profile.time === solver.t, { profileError });
    const step = solver.step.bind(solver);
    solver.step = async () => ({ accepted: false, reason: 'injected-unconverged', poisson: { residual: 1, target: 0.001 } });
    lab.singleStep(); await lab.operation;
    check('failed-step-pauses', lab.paused && lab.fault?.includes('injected-unconverged') && solver.t === pausedTime && solver.available);
    solver.step = step;
    for (const preset of ['burgers', 'oseen']) {
      await reset(preset);
      document.getElementById('step').click(); await lab.operation;
      check('preset-' + preset, !lab.fault && lab.solver.stepIndex === 1 && lab.history.length === 2 && lab.solver.boundary.kind === 'analytic-extension');
    }
    const oldSolver = lab.solver;
    const viscosity = document.getElementById('nu'); viscosity.value = '-3'; viscosity.dispatchEvent(new Event('change'));
    await until(() => !lab.loading);
    check('viscosity-reset', !lab.fault && lab.solver !== oldSolver && oldSolver.destroyed && lab.solver.nu === 0.001 && lab.solver.t === 0 && lab.history.length === 1);
    check('under-resolution-visible', document.getElementById('resolution-note').textContent.includes('UNDER-RESOLVED'));
    const resolution = document.getElementById('grid'); resolution.value = '64'; resolution.dispatchEvent(new Event('change'));
    await until(() => !lab.loading);
    check('grid-reset', !lab.fault && lab.solver.grid.nr === 64 && lab.solver.grid.nz === 128 && lab.history.length === 1);
    document.getElementById('fast-preview').click(); await until(() => !lab.loading);
    check('fast-preview-reset', !lab.fault && lab.solver.grid.nr === 32 && lab.config.stepsPerFrame === 4 && lab.solver.t === 0);
    // Reset while a step is pending must discard the old run's UI samples.
    lab.singleStep(); const resetting = lab.reset(); await resetting;
    check('reset-during-step', !lab.fault && lab.solver.t === 0 && lab.history.length === 1 && !lab.operation);
    lab.config.nu = 0.01; lab.config.nr = 32; viscosity.value = '-2'; resolution.value = '32';
    const gpu = navigator.gpu;
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });
    try {
      await lab.reset(); check('unsupported-webgpu-card', !!lab.fault && !document.getElementById('unavailable').hidden && document.getElementById('play').disabled);
    } finally { Object.defineProperty(navigator, 'gpu', { configurable: true, value: gpu }); }
    await reset('rings');
    lab.solver.device.destroy(); await lab.solver.device.lost; await delay(100);
    check('device-loss-pauses', lab.paused && !!lab.fault);
    await reset('driven');
    document.getElementById('view').value = 'gamma'; document.getElementById('view').dispatchEvent(new Event('change'));
    vectors.checked = true; vectors.dispatchEvent(new Event('change'));
    for (let i = 0; i < 12; i++) { lab.singleStep(); await lab.operation; }
    lab.render(); await delay(100);
    check('no-gpu-validation-errors', errors.length === 0, { errors });
    const fits = () => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight;
    check('desktop-no-overflow', fits());
    const rect = document.getElementById('game').getBoundingClientRect();
    check('field-fits-viewport', rect.height > 150 && rect.top >= 0 && rect.bottom <= innerHeight);
    for (const name of ['numerics', 'charts', 'experiment']) {
      const tab = document.getElementById(name + '-tab'); tab.click(); await delay(50);
      check('instrument-tab-' + name, !document.getElementById(name + '-pane').hidden && tab.getAttribute('aria-selected') === 'true' && fits());
    }
    document.getElementById('experiment-tab').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    check('keyboard-tabs', document.getElementById('numerics-tab').getAttribute('aria-selected') === 'true');
    document.getElementById('experiment-tab').click();
    document.getElementById('about-toggle').click();
    check('notes-no-page-scroll', !document.getElementById('about').hidden && fits());
    document.getElementById('about-close').click();
    check('notes-close', document.getElementById('about').hidden);
    return { passed: true, checks, elapsedMs: performance.now() - started };
  } catch (error) { return { passed: false, checks, error: error.message, gpuErrors: errors, elapsedMs: performance.now() - started }; }
}
