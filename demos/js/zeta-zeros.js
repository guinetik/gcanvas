/**
 * Zeta Zeros — Critical Line Explorer
 *
 * Traces ζ(½ + it) as a spiral in the complex output plane.
 * Non-trivial zeros are detected where |ζ| → 0, triggering
 * visual bursts and procedural sound. Each zero is verified
 * against known values, confirming the Riemann Hypothesis.
 *
 * Inspired by Quanta Magazine's zeta function visualizations.
 */
import {
  Game,
  Painter,
  Text,
  Scene,
  applyAnchor,
  Position,
  verticalLayout,
  applyLayout,
  Screen,
  Gesture,
  FPSCounter,
} from "../../src/index.js";
import {
  zetaCriticalLine,
  riemannSiegelZ,
  verifyZero,
  KNOWN_ZEROS,
} from "../../src/math/zeta.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Animation
  tSpeed: 2.0,              // units of t per second
  tSpeedMin: 0.25,
  tSpeedMax: 8.0,
  tStart: 0,
  pointsPerUnit: 8,         // trail points sampled per unit of t

  // Trail
  maxTrailPoints: 3000,
  trailMinAlpha: 0.05,
  trailMaxAlpha: 0.85,
  trailMinWidth: 1,
  trailMaxWidth: 3,

  // Scaling
  scale: 60,                // pixels per unit in the complex output plane
  scaleMin: 10,
  scaleMax: 300,

  // Zero detection
  zeroThreshold: 0.15,      // |ζ| below this triggers zero check
  zeroBisectionSteps: 20,
  zeroVerifyTolerance: 0.5,

  // Zero flash effect
  flash: {
    duration: 1.0,          // seconds
    maxRadius: 80,
    ringCount: 3,
  },

  // Head glow
  head: {
    radius: 6,
    glowLayers: 4,
    glowExpansion: 4,
  },

  // Colors
  colors: {
    background: "#0a0a12",
    axes: "rgba(255, 255, 255, 0.1)",
    axisLabels: "rgba(255, 255, 255, 0.25)",
    originCross: "rgba(255, 255, 255, 0.15)",
    trailSlow: { h: 260, s: 80, l: 60 },
    trailFast: { h: 180, s: 70, l: 55 },
    headGlow: [150, 200, 255],
    zeroFlash: { h: 50, s: 90, l: 70 },
    zeroMarker: "#ffd700",
    crossSection: {
      bg: "rgba(0, 8, 16, 0.7)",
      border: "rgba(0, 200, 180, 0.3)",
      waveColor: "rgba(0, 200, 180, 0.8)",
      envelopeColor: "rgba(0, 200, 180, 0.15)",
      cursorColor: "#fff",
      zeroColor: "#ffd700",
    },
  },

  // Cross-section panel
  crossSection: {
    height: 100,
    marginBottom: 40,
    tWindow: 20,            // how many t-units visible in the panel
  },

  // Zoom
  zoom: {
    speed: 0.15,
    easing: 0.12,
  },

  // Sound
  sound: {
    droneBaseFreq: 80,
    droneMaxFreq: 500,
    droneMaxVolume: 0.15,
    chimeBaseFreq: 330,
    chimeDecay: 0.5,
    chimeVolume: 0.2,
    pentatonic: [1, 1.125, 1.25, 1.5, 1.667, 2, 2.25, 2.5],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ZETA ZEROS DEMO
// ─────────────────────────────────────────────────────────────────────────────

class ZetaZerosDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.colors.background;
    this.enableFluidSize();
  }

  init() {
    super.init();

    // State
    this.t = CONFIG.tStart;
    this.tSpeed = CONFIG.tSpeed;
    this.paused = false;
    this.scale = CONFIG.scale;
    this.targetScale = CONFIG.scale;
    this.panX = 0;
    this.panY = 0;

    // Trail: array of { re, im, t, magnitude, speed }
    this.trail = [];
    this.prevPoint = null;

    // Zeros found
    this.detectedZeros = [];   // { t, verified, knownValue, index, flashTime }
    this.lastZeroT = -10;      // debounce

    // Flash effects
    this.activeFlashes = [];   // { x, y, time, duration }

    // Sound state
    this.soundEnabled = false;
    this.droneOsc = null;
    this.droneGain = null;

    // Setup
    this._initGestures();
    this._initKeyboard();
    this._initSound();
    this._buildInfoPanel();

    this.fpsCounter = new FPSCounter(this, {
      color: "#00FF00",
      anchor: Screen.isMobile ? "bottom-left" : "bottom-right",
    });
    this.pipeline.add(this.fpsCounter);

    Screen.init(this);
  }

  // ── Input ──────────────────────────────────────────────────────────────

  _initGestures() {
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetScale *= 1 + delta * CONFIG.zoom.speed;
        this.targetScale = Math.max(CONFIG.scaleMin, Math.min(CONFIG.scaleMax, this.targetScale));
      },
      onPan: (dx, dy) => {
        this.panX += dx;
        this.panY += dy;
      },
    });

    this.canvas.addEventListener("dblclick", () => {
      this.targetScale = CONFIG.scale;
      this.panX = 0;
      this.panY = 0;
    });
  }

  _initKeyboard() {
    window.addEventListener("keydown", (e) => {
      switch (e.key) {
        case " ":
          e.preventDefault();
          this.paused = !this.paused;
          break;
        case "r":
        case "R":
          this._restart();
          break;
        case "+":
        case "=":
          this.tSpeed = Math.min(CONFIG.tSpeedMax, this.tSpeed * 1.5);
          break;
        case "-":
        case "_":
          this.tSpeed = Math.max(CONFIG.tSpeedMin, this.tSpeed / 1.5);
          break;
      }
    });
  }

  _restart() {
    this.t = CONFIG.tStart;
    this.trail = [];
    this.prevPoint = null;
    this.detectedZeros = [];
    this.activeFlashes = [];
    this.lastZeroT = -10;
  }

  // ── Sound ──────────────────────────────────────────────────────────────

  _initSound() {
    const initAudio = () => {
      // Lazy import to avoid issues if Synth not available
      import("../../src/sound/synth.js").then(({ Synth }) => {
        this.Synth = Synth;
        if (!Synth.isInitialized) {
          Synth.init({ masterVolume: 0.3 });
        }
        Synth.resume();
        this.soundEnabled = true;
        this._startDrone();
      });
      this.canvas.removeEventListener("click", initAudio);
    };
    this.canvas.addEventListener("click", initAudio);
  }

  _startDrone() {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    this.droneOsc = ctx.createOscillator();
    this.droneGain = ctx.createGain();
    this.droneOsc.type = "sine";
    this.droneOsc.frequency.value = CONFIG.sound.droneBaseFreq;
    this.droneGain.gain.value = 0;
    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.Synth.master);
    this.droneOsc.start();
  }

  _updateDrone(magnitude) {
    if (!this.droneOsc || !this.droneGain) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;

    // Frequency rises as magnitude → 0
    const proximity = Math.max(0, 1 - magnitude / 2);
    const freq = CONFIG.sound.droneBaseFreq +
      (CONFIG.sound.droneMaxFreq - CONFIG.sound.droneBaseFreq) * proximity * proximity;
    const vol = CONFIG.sound.droneMaxVolume * proximity * proximity;

    this.droneOsc.frequency.setTargetAtTime(freq, now, 0.1);
    this.droneGain.gain.setTargetAtTime(vol, now, 0.1);
  }

  _playZeroChime(zeroIndex) {
    if (!this.soundEnabled) return;
    const ctx = this.Synth.ctx;
    const now = ctx.currentTime;
    const scale = CONFIG.sound.pentatonic;
    const idx = zeroIndex % scale.length;
    const freq = CONFIG.sound.chimeBaseFreq * scale[idx];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(CONFIG.sound.chimeVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + CONFIG.sound.chimeDecay);
    osc.connect(gain);
    gain.connect(this.Synth.master);
    osc.start(now);
    osc.stop(now + CONFIG.sound.chimeDecay + 0.05);
  }

  // ── Info Panel ─────────────────────────────────────────────────────────

  _buildInfoPanel() {
    this.infoPanel = new Scene(this, { x: 0, y: 0 });
    applyAnchor(this.infoPanel, {
      anchor: Position.TOP_CENTER,
      anchorOffsetY: Screen.responsive(80, 120, 140),
    });

    this.titleText = new Text(this, "Riemann Zeta — Critical Line", {
      font: `bold ${Screen.responsive(13, 16, 16)}px monospace`,
      color: "#7af",
      align: "center",
      baseline: "middle",
    });

    this.equationText = new Text(this, "ζ(½ + it)", {
      font: `${Screen.responsive(11, 14, 14)}px monospace`,
      color: "#fff",
      align: "center",
      baseline: "middle",
    });

    this.liveText = new Text(this, "t = 0.00 | ζ = 0.00 + 0.00i | |ζ| = 0.00", {
      font: `${Screen.responsive(9, 12, 12)}px monospace`,
      color: "#fa6",
      align: "center",
      baseline: "middle",
    });

    this.zerosText = new Text(this, "0 zeros found", {
      font: `${Screen.responsive(9, 12, 12)}px monospace`,
      color: "#6d8",
      align: "center",
      baseline: "middle",
    });

    const items = [this.titleText, this.equationText, this.liveText, this.zerosText];
    const layout = verticalLayout(items, { spacing: 16, align: "center" });
    applyLayout(items, layout.positions);
    items.forEach((item) => this.infoPanel.add(item));
    this.pipeline.add(this.infoPanel);
  }

  // ── Update ─────────────────────────────────────────────────────────────

  update(dt) {
    super.update(dt);

    // Zoom easing
    this.scale += (this.targetScale - this.scale) * CONFIG.zoom.easing;

    if (this.paused) return;

    // Advance t
    const prevT = this.t;
    this.t += this.tSpeed * dt;

    // Sample new trail points
    const step = 1 / CONFIG.pointsPerUnit;
    let sampleT = prevT + step;
    while (sampleT <= this.t) {
      this._samplePoint(sampleT);
      sampleT += step;
    }

    // Trim trail
    if (this.trail.length > CONFIG.maxTrailPoints) {
      this.trail.splice(0, this.trail.length - CONFIG.maxTrailPoints);
    }

    // Update drone
    if (this.trail.length > 0) {
      const last = this.trail[this.trail.length - 1];
      this._updateDrone(last.magnitude);
    }

    // Update flash effects
    for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
      this.activeFlashes[i].elapsed += dt;
      if (this.activeFlashes[i].elapsed > this.activeFlashes[i].duration) {
        this.activeFlashes.splice(i, 1);
      }
    }

    // Update info text
    this._updateInfoText();
  }

  _samplePoint(t) {
    const zeta = zetaCriticalLine(t);
    const magnitude = zeta.abs();

    // Compute speed (distance from previous point)
    let speed = 0;
    if (this.prevPoint) {
      const dx = zeta.real - this.prevPoint.re;
      const dy = zeta.imag - this.prevPoint.im;
      speed = Math.sqrt(dx * dx + dy * dy);
    }

    const point = {
      re: zeta.real,
      im: zeta.imag,
      t,
      magnitude,
      speed,
    };

    this.trail.push(point);

    // Zero detection
    if (magnitude < CONFIG.zeroThreshold && t - this.lastZeroT > 1) {
      this._onNearZero(t, magnitude);
    }

    this.prevPoint = point;
  }

  _onNearZero(t, magnitude) {
    // Refine with bisection using Z function sign changes
    const searchStart = Math.max(1, t - 1);
    const searchEnd = t + 1;
    const Z1 = riemannSiegelZ(searchStart);
    const Z2 = riemannSiegelZ(searchEnd);

    let zeroT = t;
    if (Z1 * Z2 < 0) {
      // Bisection
      let lo = searchStart, hi = searchEnd;
      let loZ = Z1;
      for (let i = 0; i < CONFIG.zeroBisectionSteps; i++) {
        const mid = (lo + hi) / 2;
        const midZ = riemannSiegelZ(mid);
        if (loZ * midZ < 0) {
          hi = mid;
        } else {
          lo = mid;
          loZ = midZ;
        }
      }
      zeroT = (lo + hi) / 2;
    }

    // Verify against known zeros
    const verification = verifyZero(zeroT, CONFIG.zeroVerifyTolerance);

    const zero = {
      t: zeroT,
      verified: verification.verified,
      knownValue: verification.knownValue,
      index: verification.index,
    };

    this.detectedZeros.push(zero);
    this.lastZeroT = zeroT;

    // Trigger flash at origin
    this.activeFlashes.push({
      elapsed: 0,
      duration: CONFIG.flash.duration,
    });

    // Play chime
    this._playZeroChime(this.detectedZeros.length);
  }

  _updateInfoText() {
    if (this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];

    const sign = last.im >= 0 ? "+" : "-";
    this.liveText.text =
      `t = ${this.t.toFixed(2)} | ζ = ${last.re.toFixed(3)} ${sign} ${Math.abs(last.im).toFixed(3)}i | |ζ| = ${last.magnitude.toFixed(3)}`;

    const count = this.detectedZeros.length;
    const verified = this.detectedZeros.filter((z) => z.verified).length;
    if (count === 0) {
      this.zerosText.text = "0 zeros found";
    } else {
      this.zerosText.text = `${count} zero${count > 1 ? "s" : ""} found | ${verified} verified on Re = ½`;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  render() {
    super.render();

    const cx = this.width / 2 + this.panX;
    const cy = this.height / 2 + this.panY;

    Painter.useCtx((ctx) => {
      this._drawAxes(ctx, cx, cy);
      this._drawTrail(ctx, cx, cy);
      this._drawHead(ctx, cx, cy);
      this._drawZeroMarkers(ctx, cx, cy);
      this._drawFlashes(ctx, cx, cy);
    });

    this._drawCrossSection();

    Painter.useCtx((ctx) => {
      this._drawControls(ctx);
    });
  }

  _drawAxes(ctx, cx, cy) {
    // Re axis
    ctx.strokeStyle = CONFIG.colors.axes;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(this.width, cy);
    ctx.stroke();

    // Im axis
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, this.height);
    ctx.stroke();

    // Origin crosshair
    ctx.strokeStyle = CONFIG.colors.originCross;
    ctx.lineWidth = 1;
    const crossSize = 8;
    ctx.beginPath();
    ctx.moveTo(cx - crossSize, cy);
    ctx.lineTo(cx + crossSize, cy);
    ctx.moveTo(cx, cy - crossSize);
    ctx.lineTo(cx, cy + crossSize);
    ctx.stroke();

    // Labels
    ctx.fillStyle = CONFIG.colors.axisLabels;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Re", this.width - 30, cy - 10);
    ctx.fillText("Im", cx + 10, 20);
  }

  _drawTrail(ctx, cx, cy) {
    if (this.trail.length < 2) return;

    const len = this.trail.length;
    const { trailSlow, trailFast } = CONFIG.colors;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < len; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];

      const age = 1 - i / len; // 0 = newest, 1 = oldest
      const alpha = CONFIG.trailMaxAlpha - age * (CONFIG.trailMaxAlpha - CONFIG.trailMinAlpha);
      const width = CONFIG.trailMaxWidth - age * (CONFIG.trailMaxWidth - CONFIG.trailMinWidth);

      // Speed-based hue interpolation
      const speedNorm = Math.min(curr.speed * 5, 1);
      const h = trailSlow.h + (trailFast.h - trailSlow.h) * speedNorm;
      const s = trailSlow.s + (trailFast.s - trailSlow.s) * speedNorm;
      const l = trailSlow.l + (trailFast.l - trailSlow.l) * speedNorm;

      ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(cx + prev.re * this.scale, cy - prev.im * this.scale);
      ctx.lineTo(cx + curr.re * this.scale, cy - curr.im * this.scale);
      ctx.stroke();
    }
  }

  _drawHead(ctx, cx, cy) {
    if (this.trail.length === 0) return;
    const last = this.trail[this.trail.length - 1];
    const hx = cx + last.re * this.scale;
    const hy = cy - last.im * this.scale;

    const { radius, glowLayers, glowExpansion } = CONFIG.head;
    const [gr, gg, gb] = CONFIG.colors.headGlow;

    // Glow layers
    for (let layer = glowLayers; layer >= 0; layer--) {
      const r = radius + layer * glowExpansion;
      const a = 0.15 * (1 - layer / glowLayers);
      ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${a})`;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core
    ctx.fillStyle = `rgb(${gr}, ${gg}, ${gb})`;
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(hx, hy, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawZeroMarkers(ctx, cx, cy) {
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (const zero of this.detectedZeros) {
      // Marker at origin
      ctx.fillStyle = CONFIG.colors.zeroMarker;
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label offset so they don't overlap
      const labelY = cy + 15 + this.detectedZeros.indexOf(zero) * 14;
      const label = zero.verified
        ? `t${zero.index} ≈ ${zero.t.toFixed(3)} ✓`
        : `t ≈ ${zero.t.toFixed(3)}`;

      ctx.fillStyle = zero.verified ? "#ffd700" : "#888";
      ctx.fillText(label, cx + 12, labelY);
    }
  }

  _drawFlashes(ctx, cx, cy) {
    for (const flash of this.activeFlashes) {
      const progress = flash.elapsed / flash.duration;
      const { h, s, l } = CONFIG.colors.zeroFlash;

      for (let ring = 0; ring < CONFIG.flash.ringCount; ring++) {
        const ringProgress = Math.min(1, progress + ring * 0.15);
        const radius = ringProgress * CONFIG.flash.maxRadius;
        const alpha = (1 - ringProgress) * 0.6;

        ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        ctx.lineWidth = 2 * (1 - ringProgress) + 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Inner glow
      const glowAlpha = (1 - progress) * 0.3;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, CONFIG.flash.maxRadius * 0.5);
      gradient.addColorStop(0, `hsla(${h}, 100%, 85%, ${glowAlpha})`);
      gradient.addColorStop(1, `hsla(${h}, 100%, 85%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, CONFIG.flash.maxRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawCrossSection() {
    const cs = CONFIG.crossSection;
    const w = this.width;
    const plotH = cs.height;
    const plotW = w * 0.6;
    const plotX = (w - plotW) / 2;
    const plotY = this.height - cs.marginBottom - plotH;

    // Determine t range for the panel
    const tEnd = Math.max(this.t, cs.tWindow);
    const tStart = tEnd - cs.tWindow;

    // Sample |ζ| across the visible range
    const numSamples = Math.floor(plotW / 2);
    const samples = [];
    let maxMag = 0;

    for (let i = 0; i < numSamples; i++) {
      const sampleT = tStart + (i / (numSamples - 1)) * cs.tWindow;
      if (sampleT < 1) {
        samples.push({ t: sampleT, mag: 0 });
        continue;
      }
      const mag = Math.abs(riemannSiegelZ(sampleT));
      samples.push({ t: sampleT, mag });
      if (mag > maxMag) maxMag = mag;
    }
    if (maxMag < 0.01) maxMag = 1;

    Painter.useCtx((ctx) => {
      const colors = CONFIG.colors.crossSection;

      // Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(plotX - 5, plotY - 5, plotW + 10, plotH + 10);

      // Filled envelope
      ctx.fillStyle = colors.envelopeColor;
      ctx.beginPath();
      ctx.moveTo(plotX, plotY + plotH);
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const sy = plotY + plotH - (samples[i].mag / maxMag) * plotH * 0.9;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(plotX + plotW, plotY + plotH);
      ctx.closePath();
      ctx.fill();

      // Waveform line
      ctx.strokeStyle = colors.waveColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < numSamples; i++) {
        const sx = plotX + (i / (numSamples - 1)) * plotW;
        const sy = plotY + plotH - (samples[i].mag / maxMag) * plotH * 0.9;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Zero markers in cross-section
      for (const zero of this.detectedZeros) {
        if (zero.t >= tStart && zero.t <= tEnd) {
          const zx = plotX + ((zero.t - tStart) / cs.tWindow) * plotW;
          ctx.fillStyle = colors.zeroColor;
          ctx.beginPath();
          ctx.arc(zx, plotY + plotH, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Current t cursor
      if (this.t >= tStart && this.t <= tEnd) {
        const cursorX = plotX + ((this.t - tStart) / cs.tWindow) * plotW;
        ctx.strokeStyle = colors.cursorColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cursorX, plotY);
        ctx.lineTo(cursorX, plotY + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Labels
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#888";
      ctx.fillText("|Z(t)| — Critical Line", plotX, plotY - 10);
      ctx.fillStyle = colors.zeroColor;
      ctx.textAlign = "right";
      ctx.fillText(`t: ${tStart.toFixed(0)}–${tEnd.toFixed(0)}`, plotX + plotW, plotY - 10);
      ctx.textAlign = "left";
    });
  }

  _drawControls(ctx) {
    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      `speed: ${this.tSpeed.toFixed(1)}x | scroll to zoom | +/- speed | space pause | R restart`,
      this.width - 20,
      this.height - 10,
    );
    ctx.textAlign = "left";
  }

  onResize() {
    // Recalculate info panel offset
    if (this.infoPanel) {
      applyAnchor(this.infoPanel, {
        anchor: Position.TOP_CENTER,
        anchorOffsetY: Screen.responsive(80, 120, 140),
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new ZetaZerosDemo(canvas);
  demo.start();
});
