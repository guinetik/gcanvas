// Finite-duration visual/forcing regression, not a convergence certificate.
export async function runDrivenChecks() {
  const lab = window.nsLab, checks = [], snapshots = [], start = performance.now();
  const check = (name, passed, detail = {}) => {
    const row = { name, passed, ...detail }; checks.push(row); console.info('NS_LAB_CHECK', name, passed);
    if (!passed) throw new Error(name + ': ' + JSON.stringify(detail));
  };
  try {
    await lab.ready; lab.paused = true; lab.stop(); await lab.operation; await lab.profileTask;
    check('driven-initialization', !lab.fault && lab.config.preset === 'driven' && typeof lab.solver.source === 'function');
    let fullReads = 0;
    const read = lab.solver.readback.bind(lab.solver);
    lab.solver.readback = (...args) => { fullReads++; return read(...args); };
    const pixels = () => {
      lab.view.render(256, 256, { mode: 'gamma', scale: lab.colorScale(), vectors: false });
      return lab.view.imageContext.getImageData(0, 0, 256, 256).data.slice();
    };
    let previous;
    const period = lab.config.drive.period;
    for (let phase = 0; phase <= 10; phase++) {
      const target = phase * period / 4;
      while (lab.solver.t < target && !lab.fault) await lab.advance(16, true);
      check('accepted-phase-' + phase, !lab.fault && Number.isFinite(lab.latest.energy), { time: lab.solver.t, step: lab.solver.stepIndex });
      const current = pixels(); let difference = 0, signal = 0;
      if (previous) for (let i = 0; i < current.length; i += 4) for (let c = 0; c < 3; c++) {
        difference += Math.abs(current[i + c] - previous[i + c]); signal += previous[i + c];
      }
      const sample = { time: lab.solver.t, step: lab.solver.stepIndex, energy: lab.latest.energy,
        maxU: lab.latest.maxU, imageChange: previous ? difference / Math.max(1, signal) : null };
      snapshots.push(sample); previous = current;
      if (phase >= 5) check('sustained-visible-change-' + phase, sample.imageChange > 0.05 && sample.maxU > 0.08, sample);
    }
    check('no-full-state-reads', fullReads === 0);
    const time = lab.solver.t, step = lab.solver.stepIndex;
    const a = pixels(); await new Promise(resolve => setTimeout(resolve, 200)); const b = pixels();
    check('paused-drive-stays-still', lab.solver.t === time && lab.solver.stepIndex === step && a.every((v, i) => v === b[i]));
    const control = document.getElementById('drive-strength'); control.value = '0'; control.dispatchEvent(new Event('change'));
    while (lab.loading) await new Promise(resolve => setTimeout(resolve, 25));
    check('zero-drive-resets', !lab.fault && lab.solver.t === 0 && lab.config.drive.strength === 0 && lab.solver.source(0.5, 0.35, 0).a === 0);
    const energy = lab.latest.energy;
    await lab.advance(64, true);
    check('zero-drive-decays', !lab.fault && lab.latest.energy < energy, { before: energy, after: lab.latest.energy });
    return { passed: true, checks, snapshots, elapsedMs: performance.now() - start };
  } catch (error) { return { passed: false, error: error.message, checks, snapshots, elapsedMs: performance.now() - start }; }
}
