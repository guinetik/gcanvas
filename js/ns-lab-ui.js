import { Game, GameObject, Painter } from "/gcanvas.es.min.js";
import { format, gaussianWidth } from './ns-lab-model.js';

const CONFIG = { blue: '#79bfff', gold: '#f5ad69', muted: '#c8cdd3', grid: '#243847',
  font: '10px "Martian Mono", monospace', chart: { left: 47, right: 8, top: 29, bottom: 22, gap: 9 },
  fields: { gamma: 'Γ = r uθ', omega: '|ω| · full vorticity vector', source: '∂z(a²) · swirl source for χ',
    streamlines: 'ψ contours · meridional streamlines', swirl: 'a = uθ/r' } };
const element = id => document.getElementById(id);
const text = (id, value) => { const node = element(id); if (node.textContent !== value) node.textContent = value; };

/** GCanvas chart object with physical-time coordinates and zero-safe log axes. */
class LabChart extends GameObject {
  constructor(game, kind) { super(game, { origin: 'top-left', interactive: false }); this.kind = kind; }

  draw() {
    super.draw();
    const lab = this.game.lab, c = CONFIG.chart, profile = this.kind === 'profile';
    const keys = this.kind === 'maxima' ? ['maxOmega', 'maxU'] : ['energy', 'enstrophy'];
    const title = this.kind === 'maxima' ? 'max |ω| / max |u|' : profile ? 'Cross-section uθ(r)' : 'Energy / enstrophy';
    const history = lab.history;
    let series = keys.map(key => history.map(row => [row.time, row[key]]));
    let start = history[0]?.time ?? 0, end = history.at(-1)?.time ?? 0;
    if (profile) {
      start = 0; end = lab.config.R; series = [[], []];
      if (lab.profile && lab.solver) for (let i = 0; i < lab.solver.grid.nr; i++) {
        const r = lab.solver.grid.rc(i), p = lab.profile;
        series[0].push([r, p.values[4 * i]]);
        if (lab.experiment.exact) series[1].push([r, r * lab.experiment.exact.a(r, p.sliceZ, p.time)]);
      }
    }
    const values = series.flat().map(p => p[1]).filter(Number.isFinite);
    const positive = values.filter(v => v > 0), floor = positive.length ? Math.min(...positive) * 0.3 : 1e-8;
    const transform = v => profile ? v : Math.log10(Math.max(v, floor));
    let low = profile ? Math.min(0, ...values) : Math.min(...values.map(transform), 0);
    let high = profile ? Math.max(0, ...values) : Math.max(...values.map(transform), 0);
    if (!values.length) { low = 0; high = 1; }
    if (high - low < 1e-8) high = low + 1;
    const padding = (high - low) * 0.08; low -= padding; high += padding;
    const width = this.width - c.left - c.right, height = this.height - c.top - c.bottom;
    const x = t => c.left + (t - start) / (end > start ? end - start : 1) * width;
    const y = v => c.top + (high - transform(v)) / (high - low) * height;
    Painter.text.fillText(title, 0, 11, '#d0e0ec', CONFIG.font);
    Painter.text.fillText(profile ? 'linear' : 'log · physical t', this.width - (profile ? 38 : 102), 11, CONFIG.muted, '9px system-ui');
    for (let i = 0; i <= 2; i++) {
      const value = low + (high - low) * i / 2, screenY = c.top + height * (1 - i / 2);
      Painter.lines.line(c.left, screenY, c.left + width, screenY, CONFIG.grid, 1);
      const label = profile ? value.toFixed(2) : `1e${value.toFixed(1)}`;
      Painter.text.fillText(label, 0, screenY + 3, CONFIG.muted, CONFIG.font);
    }
    series.forEach((points, index) => Painter.useCtx(ctx => {
      ctx.strokeStyle = index ? CONFIG.gold : CONFIG.blue; ctx.lineWidth = 1.5;
      if (profile && index) ctx.setLineDash([4, 4]);
      points.forEach(([t, v], i) => { if (i) ctx.lineTo(x(t), y(v)); else ctx.moveTo(x(t), y(v)); });
      ctx.stroke();
    }, { saveState: true }));
    Painter.text.fillText(profile ? '0' : format(start), c.left, this.height - 4, CONFIG.muted, CONFIG.font);
    Painter.text.fillText(profile ? `r = ${end}` : format(end), Math.max(c.left + 55, this.width - 68), this.height - 4, CONFIG.muted, CONFIG.font);
    if (!profile) {
      Painter.text.fillText(format(history.at(-1)?.[keys[0]]), c.left + 4, c.top + 11, CONFIG.blue, CONFIG.font);
      Painter.text.fillText(format(history.at(-1)?.[keys[1]]), c.left + width / 2, c.top + 11, CONFIG.gold, CONFIG.font);
      if (values.some(v => v === 0)) Painter.text.fillText('0 at floor', c.left + 4, c.top + height - 3, CONFIG.muted, '9px system-ui');
    }
  }
}

/** A second GCanvas surface shares the lab's animation schedule, without input ownership. */
export class LabInstruments extends Game {
  constructor(canvas, lab) {
    super(canvas); this.lab = lab; this.enableFluidSize(canvas.parentElement);
    this.charts = ['maxima', 'budget', 'profile'].map(kind => new LabChart(this, kind));
    this.charts.forEach(chart => this.pipeline.add(chart));
  }
  render() {
    if (!this.canvas.getBoundingClientRect().width) return;
    this.charts.forEach((chart, i) => {
      chart.x = 0; chart.y = i * this.height / 3; chart.width = this.width;
      chart.height = this.height / 3 - CONFIG.chart.gap;
    });
    Painter.setContext(this.ctx); Painter.clear(); this.pipeline.render();
  }
  dispose() { this.disableFluidSize(); this.pipeline.clear(); }
}

/** Accessible DOM controls schedule experiments; numerical state lives in the solver. */
export function bindLabUI(lab) {
  const signal = lab.listeners.signal;
  const on = (id, event, handler) => element(id).addEventListener(event, handler, { signal });
  on('play', 'click', () => lab.togglePause());
  on('step', 'click', () => lab.singleStep());
  for (const id of ['reset', 'retry']) on(id, 'click', () => lab.reset());
  on('fast-preview', 'click', () => {
    lab.config.nr = 32; lab.config.stepsPerFrame = 4;
    element('grid').value = '32'; element('budget').value = '4'; lab.reset();
  });
  for (const [id, key, parse] of [['preset', 'preset', String], ['nu', 'nu', v => 10 ** Number(v)], ['grid', 'nr', Number]]) {
    on(id, 'change', event => { lab.config[key] = parse(event.target.value); lab.reset(); });
  }
  on('nu', 'input', event => text('nu-value', format(10 ** Number(event.target.value))));
  for (const [id, key] of [['drive-strength', 'strength'], ['drive-period', 'period']])
    on(id, 'change', event => { lab.config.drive[key] = Number(event.target.value); lab.reset(); });
  on('drive-strength', 'input', event => text('drive-strength-value', Number(event.target.value).toFixed(2)));
  on('stir-sign', 'change', event => { lab.stirSign = Number(event.target.value); });
  on('budget', 'change', event => { lab.config.stepsPerFrame = Number(event.target.value); });
  on('view', 'change', event => { lab.config.presentation.mode = event.target.value; syncLabUI(lab); });
  for (const id of ['vectors', 'plain']) on(id, 'change', event => { lab.config.presentation[id] = event.target.checked; });
  on('contrast', 'input', event => { lab.config.presentation.contrast = Number(event.target.value); syncLabUI(lab); });
  on('slice', 'input', event => {
    lab.config.presentation.sliceZ = Number(event.target.value); lab.nextProfile = 0;
    text('slice-value', lab.config.presentation.sliceZ.toFixed(2));
  });
  on('panel-toggle', 'click', () => {
    const open = document.body.classList.toggle('panel-open'); element('panel-toggle').setAttribute('aria-expanded', String(open));
    text('panel-toggle', open ? 'Close' : 'Instruments');
    element('panel-toggle').setAttribute('aria-label', open ? 'Close instruments' : 'Open instruments');
    if (open) document.querySelector('[role="tab"][aria-selected="true"]').focus();
  });
  const tabs = [...document.querySelectorAll('.instrument-tabs [role="tab"]')];
  const selectTab = tab => {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
      element(item.getAttribute('aria-controls')).hidden = !selected;
    }
  };
  for (const [index, tab] of tabs.entries()) {
    on(tab.id, 'click', () => selectTab(tab));
    on(tab.id, 'keydown', event => {
      const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
      if (target === null) return;
      event.preventDefault(); selectTab(tabs[target]); tabs[target].focus();
    });
  }
  const closeAbout = () => {
    element('about').hidden = true; element('about-toggle').setAttribute('aria-expanded', 'false'); element('about-toggle').focus();
  };
  on('about-toggle', 'click', () => {
    element('about').hidden = !element('about').hidden;
    element('about-toggle').setAttribute('aria-expanded', String(!element('about').hidden));
    if (!element('about').hidden) element('about-close').focus();
  });
  on('about-close', 'click', closeAbout);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!element('about').hidden) closeAbout();
      else if (document.body.classList.contains('panel-open')) { element('panel-toggle').click(); element('panel-toggle').focus(); }
      return;
    }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); lab.togglePause(); }
    if (event.code === 'KeyR') lab.reset();
    if (event.code === 'KeyV') { const select = element('view'); select.selectedIndex = (select.selectedIndex + 1) % select.options.length; select.dispatchEvent(new Event('change')); }
  }, { signal });
  // Validation assets live outside the published demo bundle.
  if (!location.pathname.startsWith('/demos/')) element('validation-link').hidden = true;
}

export function syncLabUI(lab) {
  const { config: c, solver: s } = lab, p = c.presentation, d = lab.latest;
  const driven = c.preset === 'driven', ring = driven || c.preset === 'rings';
  const state = lab.loading ? 'initializing' : lab.fault ? 'failed' : lab.paused ? 'paused' : 'running';
  text('run-state', state.toUpperCase()); element('run-state').dataset.state = state;
  text('play', lab.paused ? 'Play' : 'Pause');
  element('play').disabled = lab.loading || !!lab.fault || !s?.initialized;
  element('step').disabled = lab.loading || !!lab.fault || !s?.initialized || !!lab.operation;
  for (const id of ['reset', 'preset', 'grid', 'nu', 'drive-strength', 'drive-period']) element(id).disabled = lab.loading;
  element('drive-controls').hidden = !driven; element('drive-note').hidden = !driven;
  element('stir-control').hidden = !driven; element('stir-note').hidden = !driven;
  text('stir-note', lab.pendingStirs.length && lab.paused ? 'Stir queued · press Play or Step to apply.'
    : `Tap or drag to stir. Shift reverses swirl.${lab.stirCount ? ` Pulses applied: ${lab.stirCount}.` : ''}`);
  text('drive-strength-value', c.drive.strength.toFixed(2));
  text('drive-note', c.drive.strength === 0 ? 'Automatic drive is off; gestures can still stir. Changes restart the experiment.'
    : `External swirl drive · period ${c.drive.period.toFixed(1)} in simulation time. Changes restart the experiment.`);
  text('nu-value', format(c.nu)); text('resolution-label', `${c.nr} × ${c.nr * 2}`);
  element('fast-preview').hidden = c.nr === 32; element('fast-preview').disabled = lab.loading;
  text('flow-guide', driven
    ? 'Two moving regions keep adding spin. Each ring appears on both sides of the center line. Watch the colored patches change shape; arrows turn in place to show the current.'
    : ring
    ? 'Two spinning rings, each visible on both sides of the center line. Watch their patches spread and fade. The spin goes around the cylinder, out of the screen.'
    : c.preset === 'burgers' ? 'This is a steady-flow check: its colored profile should remain nearly unchanged even though fluid moves through it. Arrows show the in-plane flow direction.'
      : 'Viscosity slowly widens this vortex. Watch the radial profile broaden and its peak weaken. The spin is around the axis; there is no in-plane motion in this preset.');
  const pace = lab.simRate > 0 ? `${format(lab.simRate)} simulation time / real second. +0.1 takes about ${Math.ceil(0.1 / lab.simRate)} s.` : 'Measuring simulated-time progress…';
  text('playback-note', lab.loading ? 'Preparing a fresh experiment…' : lab.paused ? 'Paused. Step advances one safe numerical timestep.'
    : `${pace}${c.nr > 64 ? ' A fine grid needs much smaller timesteps; try fast preview for visible evolution.' : ''}`);
  text('boundary-label', ring ? 'Closed cylinder · no-slip walls · Thom closure' : 'Analytic boundaries · boundary energy exchange');
  text('preset-note', driven ? 'External azimuthal forcing sustains motion; this run is not expected to dissipate to rest.'
    : ring ? 'Opposite swirl rings, unforced. Core evolution is exploratory.' : c.preset === 'burgers'
    ? 'Steady Burgers solution; computed swirl is compared with its exact profile.' : 'Positive-age Lamb–Oseen vortex; viscosity spreads the core.');
  const failure = lab.fault;
  text('status-detail', lab.loading ? 'Preparing the initial field…' : failure ? failure : 'Accepted state · Poisson target met');
  element('status-detail').dataset.failed = String(!!failure);
  element('unavailable').hidden = !failure || !!s?.initialized;
  text('unavailable-title', /WebGPU|adapter/i.test(failure ?? '') ? 'WebGPU is needed for this lab' : 'The experiment could not start');
  text('unavailable-reason', failure ?? '');
  if (d) {
    text('clock', `t = ${d.time.toFixed(5)}`); text('chart-time', `t = ${format(d.time)}`);
    text('accepted-step', `step ${d.stepIndex}`); text('dt', format(lab.lastStep?.dt));
    text('limit', lab.lastLimit ?? '—'); text('poisson', `${format(lab.poisson?.residual)} / ${format(lab.poisson?.target)}`);
    text('sweeps', String(lab.poisson?.sweeps ?? '—')); text('divergence', format(d.maxDiv));
    text('slip', ring ? format(d.maxWallSlip) : 'analytic boundary'); text('steps-rate', lab.stepRate?.toFixed(1) ?? '—');
  }
  if (s?.initialized) {
    const fit = ring ? null : gaussianWidth(lab.profile, s.grid);
    const expected = ring ? c.physics.radialWidth : Math.sqrt(4 * c.nu * (c.preset === 'burgers' ? 1 / c.physics.alpha : c.physics.t0 + (lab.profile?.time ?? s.t)));
    const cells = (fit?.width ?? expected) / s.grid.dr;
    text('core', `${cells.toFixed(1)} ${ring ? '(initial support)' : fit ? '(fit)' : '(analytic)'}`);
    text('resolution-note', cells < c.sampling.minCoreCells ? 'UNDER-RESOLVED: fewer than 6 radial cells across this width.' : ring
      ? 'Initial support half-width shown; evolving multi-ring core width unavailable.' : `Gaussian width √(4ν${c.preset === 'burgers' ? '/α' : '(t+t₀)'}) = ${expected.toFixed(3)}. ${fit ? `Fit residual ${format(fit.residual)}.` : 'Measured fit unavailable.'}`);
  }
  const scale = lab.colorScale(); text('legend-low', p.mode === 'omega' ? '0' : `−${format(scale)}`); text('legend-high', `+${format(scale)}`);
  text('legend-note', `${CONFIG.fields[p.mode]} · range fixed at reset`);
  document.querySelector('.colorbar').style.background = p.mode === 'omega'
    ? 'linear-gradient(90deg,#091625,#ff9a4f)' : 'linear-gradient(90deg,#3b89fb,#091625 50%,#ff9a4f)';
  if (lab.profile) text('profile-note', `uθ at z = ${lab.profile.sliceZ.toFixed(2)}, t = ${format(lab.profile.time)}. Blue: computed${ring ? '.' : '; dashed orange: exact.'}`);
}
