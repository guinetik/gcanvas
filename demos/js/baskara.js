/**
 * Root Dance - Bhaskara Formula Visualization
 *
 * A generative art demo visualizing the quadratic formula (Bhaskara).
 * Two particles represent the roots x₁ and x₂ of ax² + bx + c = 0.
 * Watch them dance as coefficients animate, merge when Δ = 0,
 * and spiral into the complex plane when roots become imaginary.
 */
import { Game, Painter } from "../../src/index.js";
import { GameObject } from "../../src/game/objects/go.js";
import { Rectangle } from "../../src/shapes/rect.js";
import { TextShape } from "../../src/shapes/text.js";
import { Position } from "../../src/util/position.js";
import { Synth } from "../../src/sound/synth.js";

const CONFIG = {
  // Coefficient ranges for animation
  aRange: [0.5, 2],
  bRange: [-3, 3],
  cRange: [-2, 2],
  aSpeed: 0.3,
  bSpeed: 0.5,
  cSpeed: 0.4,

  // Particles
  trailLength: 60,
  particleRadius: 8,
  glowLayers: 4,
  glowExpansion: 4,

  // Coordinate mapping
  rootScale: 75,
  complexScale: 50,

  // Effects
  mergeThreshold: 0.3,
  mergeFlashDuration: 0.5,
  spiralSpeed: 2.0,

  // Mouse influence strength
  mouseInfluence: 1.5,
};

// Famous quadratic equations with assigned colors (HSL hues) and percussion
const EQUATIONS = [
  { name: "easeInOutQuad", a: 2, b: -4, c: 1, hue: 45, perc: "kick" },      // Orange - 2t²-4t+1=0
  { name: "Imaginary Unit", a: 1, b: 0, c: 1, hue: 280, perc: "sweep" },    // Purple - ±i (usually complex)
  { name: "Mandelbrot Origin", a: 1, b: 0, c: 0, hue: 160, perc: "hihat" }, // Teal - c=0 center
];

/**
 * FormulaPanelGO - A GameObject that displays all 3 equations with color-coded headers
 */
class FormulaPanelGO extends GameObject {
  constructor(game, options = {}) {
    const panelWidth = 260;
    const rowHeight = 48;
    const panelHeight = rowHeight * EQUATIONS.length + 16;

    super(game, {
      ...options,
      width: panelWidth,
      height: panelHeight,
      anchor: Position.BOTTOM_LEFT,
      anchorMargin: 20,
    });

    this.panelWidth = panelWidth;
    this.panelHeight = panelHeight;
    this.rowHeight = rowHeight;

    // Create shapes
    this.bgRect = new Rectangle({
      width: panelWidth,
      height: panelHeight,
      color: "rgba(0, 0, 0, 0.6)",
    });

    // Create text shapes for each equation
    this.equationRows = EQUATIONS.map((eq) => ({
      nameText: new TextShape(`${eq.name} [${eq.perc}]`, {
        font: "bold 11px monospace",
        color: `hsl(${eq.hue}, 80%, 65%)`,
        align: "left",
        baseline: "top",
      }),
      formulaText: new TextShape("0.00x² + 0.00x + 0.00 = 0", {
        font: "11px monospace",
        color: "#ccc",
        align: "left",
        baseline: "top",
      }),
      rootsText: new TextShape("x₁ = 0.00, x₂ = 0.00", {
        font: "10px monospace",
        color: "#888",
        align: "left",
        baseline: "top",
      }),
    }));
  }

  setEquationValues(index, a, b, c, discriminant, x1, x2, isComplex) {
    if (index < 0 || index >= this.equationRows.length) return;

    const row = this.equationRows[index];

    // Update formula text
    const aStr = a.toFixed(2);
    const bStr = b >= 0 ? `+ ${b.toFixed(2)}` : `- ${Math.abs(b).toFixed(2)}`;
    const cStr = c >= 0 ? `+ ${c.toFixed(2)}` : `- ${Math.abs(c).toFixed(2)}`;
    row.formulaText.text = `${aStr}x² ${bStr}x ${cStr} = 0`;

    // Update root values text
    if (isComplex) {
      const r = x1.real.toFixed(2);
      const i = x1.imag.toFixed(2);
      row.rootsText.text = `x = ${r} ± ${i}i`;
      row.rootsText.color = "#a78bfa"; // Purple for complex
    } else {
      row.rootsText.text = `x₁ = ${x1.toFixed(2)}, x₂ = ${x2.toFixed(2)}`;
      row.rootsText.color = "#888";
    }
  }

  draw() {
    super.draw();

    // Draw background
    this.bgRect.render();

    // Draw each equation row
    const left = -this.panelWidth / 2 + 12;
    const startTop = -this.panelHeight / 2 + 10;

    this.equationRows.forEach((row, i) => {
      const rowTop = startTop + i * this.rowHeight;

      Painter.save();
      Painter.translate(left, rowTop);
      row.nameText.render();
      Painter.restore();

      Painter.save();
      Painter.translate(left, rowTop + 14);
      row.formulaText.render();
      Painter.restore();

      Painter.save();
      Painter.translate(left, rowTop + 28);
      row.rootsText.render();
      Painter.restore();
    });
  }
}

export class BaskaraDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#0a0a12";
    this.enableFluidSize();
    this.time = 0;

    // Mouse influence
    this.mouseActive = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInactiveTime = 0;
    this.resumeDelay = 1.5; // seconds before animation resumes
    this.setupMouseTracking();

    // Initialize state for each equation
    this.equations = EQUATIONS.map((eq, i) => ({
      // Base equation info
      name: eq.name,
      baseA: eq.a,
      baseB: eq.b,
      baseC: eq.c,
      hue: eq.hue,

      // Current animated coefficients
      a: eq.a,
      b: eq.b,
      c: eq.c,
      discriminant: 0,

      // Root values
      x1: 0,
      x2: 0,
      isComplex: false,

      // Root screen positions
      root1: { x: 0, y: 0 },
      root2: { x: 0, y: 0 },

      // Trails
      trail1: [],
      trail2: [],

      // Merge effect
      merging: false,
      mergeTime: 0,

      // Phase offsets for unique animation per equation
      phaseOffset: i * 1.2,

      // Track previous root values for percussion triggers
      prevX1: 0,
      prevX2: 0,
    }));

    // Percussion timing - steady beat system
    this.bpm = 120;
    this.beatInterval = 60 / this.bpm; // seconds per beat
    this.lastBeatTime = 0;
    this.beatCount = 0;
  }

  init() {
    super.init();
    this.createFormulaPanel();
    this.initSound();
  }

  initSound() {
    this.soundEnabled = false;

    // Initialize on first click (proper user gesture)
    const initAudio = () => {
      if (!Synth.isInitialized) {
        Synth.init({ masterVolume: 0.3 });
      }
      Synth.resume();
      this.soundEnabled = true;
      this.canvas.removeEventListener("click", initAudio);
    };
    this.canvas.addEventListener("click", initAudio);
  }

  playComplexSound(eq) {
    if (!this.soundEnabled) return;

    // Musical scale (pentatonic) - maps nicely to any value
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

    // Use real part to pick base note, imaginary magnitude for octave shift
    const realPart = eq.isComplex ? eq.x1.real : 0;
    const imagMag = eq.isComplex ? Math.abs(eq.x1.imag) : 0;

    // Map real part to scale index
    const noteIndex = Math.abs(Math.floor((realPart + 3) * 1.2)) % pentatonic.length;
    const baseFreq = pentatonic[noteIndex];

    // Imaginary magnitude shifts octave (higher = further from real axis)
    const octaveShift = 1 + imagMag * 0.5;
    const freq = baseFreq * octaveShift;

    Synth.osc.sweep(freq, freq * 1.3, 0.35, {
      type: "sine",
      volume: 0.12,
    });
  }

  playRealSound(eq) {
    if (!this.soundEnabled) return;

    // Musical scale for return sound
    const pentatonic = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00];

    // Use root spread to pick note
    const spread = Math.abs(eq.x1 - eq.x2);
    const noteIndex = Math.floor(spread * 1.5) % pentatonic.length;
    const baseFreq = pentatonic[noteIndex];

    Synth.osc.sweep(baseFreq * 1.5, baseFreq, 0.3, {
      type: "triangle",
      volume: 0.1,
    });
  }

  // Percussion sounds for real root movement
  playKick() {
    if (!this.soundEnabled) return;
    const ctx = Synth.ctx;
    const now = ctx.currentTime;

    // Kick = low sine with pitch drop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(Synth.master);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playHihat() {
    if (!this.soundEnabled) return;
    const ctx = Synth.ctx;
    const now = ctx.currentTime;

    // Hihat = filtered noise burst
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(Synth.master);
    noise.start(now);
  }

  playTick(pitch = 1) {
    if (!this.soundEnabled) return;
    const ctx = Synth.ctx;
    const now = ctx.currentTime;

    // Tick = short high sine blip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 800 * pitch;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(Synth.master);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  checkPercussion(eq, t) {
    // Update previous values for any position-based logic
    eq.prevX1 = eq.x1;
    eq.prevX2 = eq.x2;
  }

  // Called once per frame to handle steady beat
  updateBeat(t) {
    if (!this.soundEnabled) return;

    // Check if it's time for a new beat
    if (t - this.lastBeatTime >= this.beatInterval) {
      this.lastBeatTime = t;
      this.beatCount++;

      const beatInBar = this.beatCount % 4;

      // Each equation plays its percussion on different beats when real
      this.equations.forEach((eq, i) => {
        if (eq.isComplex) return; // Skip complex roots

        // Stagger beats: eq0 on beat 0, eq1 on beat 1, eq2 on beat 2
        const eqBeat = i % 4;

        if (beatInBar === eqBeat || (beatInBar === (eqBeat + 2) % 4)) {
          // Play this equation's assigned percussion
          const pitch = 0.7 + Math.abs(eq.x1) * 0.15; // Pitch tied to root position

          switch (EQUATIONS[i].perc) {
            case "kick":
              this.playKick();
              break;
            case "hihat":
              this.playHihat();
              break;
            case "sweep":
              // Short tick for sweep equations when real
              this.playTick(pitch);
              break;
            default:
              this.playTick(pitch);
          }
        }
      });
    }
  }

  createFormulaPanel() {
    this.formulaPanel = new FormulaPanelGO(this, { name: "formulaPanel" });
    this.pipeline.add(this.formulaPanel);
  }

  setupMouseTracking() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      // Normalize to -1 to 1 range from canvas center
      this.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      this.mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      this.mouseActive = true;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.mouseActive = false;
      this.mouseInactiveTime = this.time;
    });

    this.canvas.addEventListener("mousemove", () => {
      this.mouseInactiveTime = this.time; // Reset timer on any movement
    });
  }

  update(dt) {
    super.update(dt);
    this.time += dt;

    const t = this.time;

    // Steady beat - always playing when roots are real
    this.updateBeat(t);

    const lerpSpeed = 3;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Check if we should resume autonomous animation
    const timeSinceInactive = t - this.mouseInactiveTime;
    const shouldAnimate = !this.mouseActive && timeSinceInactive > this.resumeDelay;

    // Update each equation - roots at their true mathematical positions
    this.equations.forEach((eq, index) => {
      // Phase offset gives each equation unique timing
      const phase = t + eq.phaseOffset;

      if (this.mouseActive) {
        // Mouse X influences b, Mouse Y influences c
        eq.b = eq.baseB + this.mouseX * 4;
        eq.c = eq.baseC + this.mouseY * 3;
      } else if (shouldAnimate) {
        // Animate coefficients around base values - roots follow the math
        const animB = eq.baseB + Math.sin(phase * 0.4) * 2.5;
        const animC = eq.baseC + Math.sin(phase * 0.25 + index) * 2;
        const blendSpeed = 2 * dt;
        eq.b += (animB - eq.b) * blendSpeed;
        eq.c += (animC - eq.c) * blendSpeed;
      }
      // else: hold at current values during delay

      eq.a = eq.baseA;

      // Calculate discriminant
      eq.discriminant = eq.b * eq.b - 4 * eq.a * eq.c;

      // Check merge state
      const wasMerging = eq.merging;
      eq.merging = Math.abs(eq.discriminant) < CONFIG.mergeThreshold;
      if (eq.merging && !wasMerging) {
        eq.mergeTime = this.time;
      }

      // Calculate roots
      const twoA = 2 * eq.a;
      const negB = -eq.b;

      const wasComplex = eq.isComplex;

      if (eq.discriminant >= 0) {
        // Real roots - on the X axis (Y = 0)
        const sqrtD = Math.sqrt(eq.discriminant);
        eq.x1 = (negB + sqrtD) / twoA;
        eq.x2 = (negB - sqrtD) / twoA;

        eq.root1.x = centerX + eq.x1 * CONFIG.rootScale;
        eq.root1.y = centerY;  // Y = 0 (on real axis)
        eq.root2.x = centerX + eq.x2 * CONFIG.rootScale;
        eq.root2.y = centerY;  // Y = 0 (on real axis)

        eq.isComplex = false;

        // Sound: returned to real axis
        if (wasComplex) {
          this.playRealSound(eq);
        }

        // Percussion: trigger when roots cross integer gridlines
        this.checkPercussion(eq, t);
      } else {
        // Complex roots - positioned in complex plane (Y ≠ 0)
        const realPart = negB / twoA;
        const imagPart = Math.sqrt(-eq.discriminant) / twoA;

        // Root positions ARE their complex values: x + yi
        eq.root1.x = centerX + realPart * CONFIG.rootScale;
        eq.root1.y = centerY - imagPart * CONFIG.complexScale;  // -imagPart because Y grows downward
        eq.root2.x = centerX + realPart * CONFIG.rootScale;
        eq.root2.y = centerY + imagPart * CONFIG.complexScale;  // conjugate (opposite imaginary)

        eq.x1 = { real: realPart, imag: imagPart };
        eq.x2 = { real: realPart, imag: -imagPart };
        eq.isComplex = true;

        // Sound: entered complex plane
        if (!wasComplex) {
          this.playComplexSound(eq);
        }
      }

      // Update trails
      eq.trail1.unshift({ x: eq.root1.x, y: eq.root1.y });
      eq.trail2.unshift({ x: eq.root2.x, y: eq.root2.y });

      if (eq.trail1.length > CONFIG.trailLength) {
        eq.trail1.pop();
        eq.trail2.pop();
      }

      // Update formula panel for this equation
      if (this.formulaPanel) {
        this.formulaPanel.setEquationValues(
          index, eq.a, eq.b, eq.c,
          eq.discriminant, eq.x1, eq.x2, eq.isComplex
        );
      }
    });
  }

  render() {
    super.render();
    Painter.useCtx((ctx) => {
      // Draw coordinate axes
      this.drawAxes(ctx);

      // Draw all equations
      this.equations.forEach((eq) => {
        // Draw subtle parabola curve first (behind everything)
        this.drawParabola(ctx, eq);

        // Draw trails
        this.drawTrails(ctx, eq);

        // Draw particles with glow
        this.drawParticles(ctx, eq);

        // Draw merge effect
        if (eq.merging) {
          this.drawMergeEffect(ctx, eq);
        }
      });
    });
  }

  drawParabola(ctx, eq) {
    // Only show parabola when roots are real (crosses the axis)
    if (eq.isComplex) return;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const scale = CONFIG.rootScale;

    // Draw parabola y = ax² + bx + c
    ctx.strokeStyle = `hsla(${eq.hue}, 60%, 50%, 0.2)`;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const xRange = 5; // How far left/right to draw
    const steps = 100;

    for (let i = 0; i <= steps; i++) {
      const x = -xRange + (i / steps) * xRange * 2;
      const y = eq.a * x * x + eq.b * x + eq.c;

      const screenX = centerX + x * scale;
      const screenY = centerY - y * scale; // Flip Y for screen coords

      if (i === 0) {
        ctx.moveTo(screenX, screenY);
      } else {
        ctx.lineTo(screenX, screenY);
      }
    }

    ctx.stroke();
  }

  drawAxes(ctx) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;

    // X-axis (real)
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(this.canvas.width, centerY);
    ctx.stroke();

    // Y-axis (imaginary)
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, this.canvas.height);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Re", this.canvas.width - 30, centerY - 10);
    ctx.fillText("Im", centerX + 10, 20);
  }

  drawTrails(ctx, eq) {
    const hue = eq.hue;

    for (let i = 0; i < eq.trail1.length - 1; i++) {
      const alpha = (1 - i / eq.trail1.length) * 0.5;
      const width = (1 - i / eq.trail1.length) * 3 + 1;

      ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = "round";

      // Trail 1
      ctx.beginPath();
      ctx.moveTo(eq.trail1[i].x, eq.trail1[i].y);
      ctx.lineTo(eq.trail1[i + 1].x, eq.trail1[i + 1].y);
      ctx.stroke();

      // Trail 2
      ctx.beginPath();
      ctx.moveTo(eq.trail2[i].x, eq.trail2[i].y);
      ctx.lineTo(eq.trail2[i + 1].x, eq.trail2[i + 1].y);
      ctx.stroke();
    }
  }

  drawParticles(ctx, eq) {
    const hue = eq.hue;
    const radius = CONFIG.particleRadius;

    // Draw glow layers (outer to inner)
    for (let layer = CONFIG.glowLayers; layer >= 0; layer--) {
      const layerRadius = radius + layer * CONFIG.glowExpansion;
      const alpha = 0.12 * (1 - layer / CONFIG.glowLayers);

      ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${alpha})`;

      ctx.beginPath();
      ctx.arc(eq.root1.x, eq.root1.y, layerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(eq.root2.x, eq.root2.y, layerRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw core
    ctx.fillStyle = `hsl(${hue}, 100%, 75%)`;
    ctx.beginPath();
    ctx.arc(eq.root1.x, eq.root1.y, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(eq.root2.x, eq.root2.y, radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = `hsl(${hue}, 50%, 95%)`;
    ctx.beginPath();
    ctx.arc(eq.root1.x, eq.root1.y, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(eq.root2.x, eq.root2.y, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Labels above particles with equation color
    const labelOffset = radius + 18;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    // x₁ label
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = `hsl(${hue}, 80%, 75%)`;
    ctx.fillText("x₁", eq.root1.x, eq.root1.y - labelOffset);

    // x₁ value
    ctx.font = "9px monospace";
    ctx.fillStyle = "#777";
    if (eq.isComplex) {
      const sign = eq.x1.imag >= 0 ? "+" : "";
      ctx.fillText(`${eq.x1.real.toFixed(1)}${sign}${eq.x1.imag.toFixed(1)}i`, eq.root1.x, eq.root1.y - labelOffset + 12);
    } else {
      ctx.fillText(eq.x1.toFixed(2), eq.root1.x, eq.root1.y - labelOffset + 12);
    }

    // x₂ label
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = `hsl(${hue}, 80%, 75%)`;
    ctx.fillText("x₂", eq.root2.x, eq.root2.y - labelOffset);

    // x₂ value
    ctx.font = "9px monospace";
    ctx.fillStyle = "#777";
    if (eq.isComplex) {
      const sign = eq.x2.imag >= 0 ? "+" : "";
      ctx.fillText(`${eq.x2.real.toFixed(1)}${sign}${eq.x2.imag.toFixed(1)}i`, eq.root2.x, eq.root2.y - labelOffset + 12);
    } else {
      ctx.fillText(eq.x2.toFixed(2), eq.root2.x, eq.root2.y - labelOffset + 12);
    }
  }

  drawMergeEffect(ctx, eq) {
    const elapsed = this.time - eq.mergeTime;
    const progress = Math.min(elapsed / CONFIG.mergeFlashDuration, 1);

    const midX = (eq.root1.x + eq.root2.x) / 2;
    const midY = (eq.root1.y + eq.root2.y) / 2;

    const ringRadius = 15 + progress * 40;
    const alpha = (1 - progress) * 0.5;

    ctx.strokeStyle = `hsla(${eq.hue}, 100%, 70%, ${alpha})`;
    ctx.lineWidth = 2 * (1 - progress) + 1;
    ctx.beginPath();
    ctx.arc(midX, midY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    const innerAlpha = (1 - progress) * 0.3;
    const innerGradient = ctx.createRadialGradient(midX, midY, 0, midX, midY, ringRadius);
    innerGradient.addColorStop(0, `hsla(${eq.hue}, 100%, 80%, ${innerAlpha})`);
    innerGradient.addColorStop(1, `hsla(${eq.hue}, 100%, 80%, 0)`);
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(midX, midY, ringRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Export as MyGame for backwards compatibility with HTML
export function MyGame(canvas) {
  const demo = new BaskaraDemo(canvas);
  return {
    start: () => demo.start()
  };
}
