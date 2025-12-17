import {
  Circle,
  Easing,
  FPSCounter,
  Game,
  GameObject,
  Painter,
  TextShape,
  TileLayout,
  Rectangle,
  Tweenetik,
  ToggleButton,
  Tooltip,
} from "/gcanvas.es.min.js";

// Formulas for each easing function
const EASING_FORMULAS = {
  linear: "f(t) = t",
  smoothstep: "f(t) = t² × (3 - 2t)",
  smootherstep: "f(t) = t³ × (t × (6t - 15) + 10)",
  easeInQuad: "f(t) = t²",
  easeOutQuad: "f(t) = t × (2 - t)",
  easeInOutQuad: "f(t) = t < 0.5 ? 2t² : -1 + (4 - 2t) × t",
  easeInCubic: "f(t) = t³",
  easeOutCubic: "f(t) = (t - 1)³ + 1",
  easeInOutCubic: "f(t) = t < 0.5 ? 4t³ : (t-1)(2t-2)² + 1",
  easeInQuart: "f(t) = t⁴",
  easeOutQuart: "f(t) = 1 - (t - 1)⁴",
  easeInOutQuart: "f(t) = t < 0.5 ? 8t⁴ : 1 - 8(t-1)⁴",
  easeInSine: "f(t) = 1 - cos(t × π/2)",
  easeOutSine: "f(t) = sin(t × π/2)",
  easeInOutSine: "f(t) = -(cos(πt) - 1) / 2",
  easeInExpo: "f(t) = 2^(10(t - 1))",
  easeOutExpo: "f(t) = 1 - 2^(-10t)",
  easeInOutExpo: "f(t) = ½×2^(20t-10) or 1 - ½×2^(-20t+10)",
  easeInCirc: "f(t) = 1 - √(1 - t²)",
  easeOutCirc: "f(t) = √(1 - (t-1)²)",
  easeInOutCirc: "t<½ ? ½(1-√(1-4t²)) : ½(√(-(2t-3)(2t-1))+1)",
  easeInElastic: "f(t) = -2^(10(t-1)) × sin(2π(t-1-s)/p)",
  easeOutElastic: "f(t) = 2^(-10t) × sin(2π(t-s)/p) + 1",
  easeInOutElastic: "t<½ ? easeIn : easeOut (mirrored)",
  easeInBack: "f(t) = t²((s+1)t - s)  where s≈1.7",
  easeOutBack: "f(t) = (t-1)²((s+1)(t-1) + s) + 1",
  easeInOutBack: "t<½ ? easeIn(2t)/2 : easeOut(2t-1)/2 + ½",
  easeInBounce: "f(t) = 1 - easeOutBounce(1-t)",
  easeOutBounce: "4 parabolas: 7.5625(t-c)² + k",
  easeInOutBounce: "t<½ ? easeIn(2t)/2 : easeOut(2t-1)/2 + ½",
};

/**
 * EasingBox: A tile showing an easing curve graph with animated circle
 */
class EasingBox extends GameObject {
  constructor(game, label, easingFn, formula, tooltip, options = {}) {
    super(game, options);
    this.label = label;
    this.easingFn = easingFn;
    this.formula = formula;
    this.tooltip = tooltip;
    this.animTime = 0;
    this.duration = 1;
    this.pauseDuration = 0.3;
    this.isPlaying = false;
    this.inPausePhase = true; // Start with ball hidden
    this.interactive = true;

    // Background box
    this.bg = new Rectangle({
      width: 100,
      height: 100,
      color: "rgba(0, 0, 0, 0.1)",
      stroke: "rgba(255, 255, 255, 0.3)",
      lineWidth: 1,
    });

    // Label
    this.labelText = new TextShape(this.label, {
      x: 0,
      y: 44,
      font: "11px monospace",
      color: "white",
    });

    // Glow circle
    this.glowCircle = new Circle(8, {
      color: "rgba(0, 255, 0, 0.3)",
    });

    // Animated circle
    this.animCircle = new Circle(4, {
      color: "#0f0",
    });

    // Cache scale values
    this.graphScale = 1;
    this.graphOffset = 0;
    this.scaleCalculated = false;

    // Flag for "play all" mode (controlled by toggle button)
    this.playAll = false;

    // Setup hover/touch events to play animation
    this.on("mouseover", (e) => {
      this.isHovered = true;
      if (!this.playAll) {
        this.isPlaying = true;
        this.animTime = 0; // restart from beginning
      }
      // Scale up effect like shapes.js
      Tweenetik.to(
        this,
        { scaleX: 1.15, scaleY: 1.15 },
        0.6,
        Easing.easeOutElastic
      );
      // Show tooltip with formula
      if (this.tooltip && this.formula) {
        this.tooltip.show(this.formula, e.x, e.y);
      }
      // Change cursor to pointer
      this.game.canvas.style.cursor = "pointer";
    });
    this.on("mouseout", () => {
      this.isHovered = false;
      if (!this.playAll) {
        this.isPlaying = false;
      }
      // Scale back down
      Tweenetik.to(
        this,
        { scaleX: 1, scaleY: 1 },
        0.6,
        Easing.easeOutElastic
      );
      // Hide tooltip
      if (this.tooltip) {
        this.tooltip.hide();
      }
      // Reset cursor
      this.game.canvas.style.cursor = "default";
    });
    // For touch devices - play on touch, stop when touch ends
    this.on("inputdown", () => {
      if (!this.playAll) {
        this.isPlaying = true;
        this.animTime = 0;
      }
    });
  }

  /**
   * Set play all mode - when true, animation plays continuously
   */
  setPlayAll(playAll) {
    this.playAll = playAll;
    if (playAll) {
      this.isPlaying = true;
      this.animTime = 0;
    } else {
      // Only keep playing if currently hovered
      this.isPlaying = this.isHovered || false;
    }
  }

  update(dt) {
    super.update(dt);

    // Calculate graph dimensions
    const size = 100;
    const padding = 10;
    const labelSpace = 14;
    const graphSize = size - padding * 2 - labelSpace;
    const startX = -size / 2 + padding;
    const startY = size / 2 - padding - labelSpace;

    // Only animate when playing
    if (this.isPlaying) {
      this.animTime += dt;

      const totalCycle = this.duration + this.pauseDuration;
      if (this.animTime > totalCycle) {
        this.animTime = 0;
      }

      // Check if we're in the pause phase (animation finished, waiting to restart)
      this.inPausePhase = this.animTime > this.duration;

      if (!this.inPausePhase) {
        const t = this.animTime / this.duration;
        const easedT = this.easingFn(t);
        const scaledEasedT = easedT * this.graphScale + this.graphOffset;

        const circleX = startX + t * graphSize;
        const circleY = startY - scaledEasedT * graphSize;

        // Update circle positions
        this.glowCircle.x = circleX;
        this.glowCircle.y = circleY;
        this.animCircle.x = circleX;
        this.animCircle.y = circleY;
      }
    } else {
      this.inPausePhase = true; // Hide when not playing
    }
  }

  draw() {
    super.draw();

    // Calculate scale values once on first draw
    if (!this.scaleCalculated) {
      let minVal = 0;
      let maxVal = 1;
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const val = this.easingFn(t);
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      const range = maxVal - minVal;
      this.graphScale = range > 1 ? 1 / range : 1;
      this.graphOffset = minVal < 0 ? -minVal * this.graphScale : 0;
      this.scaleCalculated = true;
    }

    // 1. Draw background first
    this.bg.render();

    const size = 100;
    const padding = 10;
    const labelSpace = 14;
    const graphSize = size - padding * 2 - labelSpace;
    const startX = -size / 2 + padding;
    const startY = size / 2 - padding - labelSpace;

    // 2. Draw axes and curve using Painter.useCtx for automatic cleanup
    Painter.useCtx((ctx) => {
      // Draw axes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.moveTo(startX, startY - graphSize);
      ctx.lineTo(startX, startY);
      ctx.lineTo(startX + graphSize, startY);
      ctx.stroke();

      // Draw the easing curve
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i <= graphSize; i++) {
        const t = i / graphSize;
        const easedT = this.easingFn(t);
        const scaledEasedT = easedT * this.graphScale + this.graphOffset;
        const x = startX + i;
        const y = startY - scaledEasedT * graphSize;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    });

    // 3. Draw label
    this.labelText.render();

    // 4. Draw circles on top (hidden during pause phase)
    if (!this.inPausePhase) {
      this.glowCircle.render();
      this.animCircle.render();
    }
  }
}

/**
 * EasingDemo: A TileLayout grid displaying all easing function curves
 */
class EasingDemo extends TileLayout {
  constructor(game, tooltip, options = {}) {
    super(game, options);
    this.tooltip = tooltip;

    // All easing functions organized by type (In, Out, InOut for each)
    this.easingDefinitions = [
      // Basics
      { label: "linear", fn: Easing.linear },
      { label: "smoothstep", fn: Easing.smoothstep },
      { label: "smootherstep", fn: Easing.smootherstep },

      // Quadratic
      { label: "easeInQuad", fn: Easing.easeInQuad },
      { label: "easeOutQuad", fn: Easing.easeOutQuad },
      { label: "easeInOutQuad", fn: Easing.easeInOutQuad },

      // Cubic
      { label: "easeInCubic", fn: Easing.easeInCubic },
      { label: "easeOutCubic", fn: Easing.easeOutCubic },
      { label: "easeInOutCubic", fn: Easing.easeInOutCubic },

      // Quartic
      { label: "easeInQuart", fn: Easing.easeInQuart },
      { label: "easeOutQuart", fn: Easing.easeOutQuart },
      { label: "easeInOutQuart", fn: Easing.easeInOutQuart },

      // Sine
      { label: "easeInSine", fn: Easing.easeInSine },
      { label: "easeOutSine", fn: Easing.easeOutSine },
      { label: "easeInOutSine", fn: Easing.easeInOutSine },

      // Exponential
      { label: "easeInExpo", fn: Easing.easeInExpo },
      { label: "easeOutExpo", fn: Easing.easeOutExpo },
      { label: "easeInOutExpo", fn: Easing.easeInOutExpo },

      // Circular
      { label: "easeInCirc", fn: Easing.easeInCirc },
      { label: "easeOutCirc", fn: Easing.easeOutCirc },
      { label: "easeInOutCirc", fn: Easing.easeInOutCirc },

      // Elastic
      { label: "easeInElastic", fn: (t) => Easing.easeInElastic(t) },
      { label: "easeOutElastic", fn: (t) => Easing.easeOutElastic(t) },
      { label: "easeInOutElastic", fn: (t) => Easing.easeInOutElastic(t) },

      // Back
      { label: "easeInBack", fn: (t) => Easing.easeInBack(t) },
      { label: "easeOutBack", fn: (t) => Easing.easeOutBack(t) },
      { label: "easeInOutBack", fn: (t) => Easing.easeInOutBack(t) },

      // Bounce
      { label: "easeInBounce", fn: Easing.easeInBounce },
      { label: "easeOutBounce", fn: Easing.easeOutBounce },
      { label: "easeInOutBounce", fn: Easing.easeInOutBounce },
    ];
  }

  init() {
    this.boxes = this.easingDefinitions.map((def) => {
      const formula = EASING_FORMULAS[def.label] || "";
      const box = new EasingBox(
        this.game,
        def.label,
        def.fn,
        formula,
        this.tooltip,
        { width: 100, height: 100 }
      );
      box.transform.size(100, 100);
      this.add(box);
      return box;
    });
  }

}

/**
 * MyGame: Main game class
 */
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
  }

  init() {
    super.init();

    // Create tooltip for showing formulas
    this.tooltip = new Tooltip(this, {
      font: "14px monospace",
      textColor: "#0f0",
      bgColor: "rgba(0, 0, 0, 0.9)",
      borderColor: "rgba(0, 255, 0, 0.5)",
      padding: 12,
    });

    // Toggle button to play all animations
    this.toggleBtn = new ToggleButton(this, {
      text: "Play All",
      width: 100,
      height: 32,
      anchor: "bottom-left",
      startToggled: false,
      onToggle: (isOn) => {
        this.setPlayAll(isOn);
      },
    });
    this.pipeline.add(this.toggleBtn);

    this.easingDemo = new EasingDemo(this, this.tooltip, {
      debug: false,
      anchor: "center",
      spacing: 20,
      columns: 6,
      padding: 30,
      align: "center",
    });
    this.pipeline.add(this.easingDemo);

    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );

    // Add tooltip last so it renders on top
    this.pipeline.add(this.tooltip);
  }

  /**
   * Toggle all animations on/off
   */
  setPlayAll(playAll) {
    if (this.easingDemo && this.easingDemo.boxes) {
      this.easingDemo.boxes.forEach((box) => {
        box.setPlayAll(playAll);
      });
    }
  }

  onResize() {
    // Trigger layout recalculation on resize
    if (this.easingDemo) {
      this.easingDemo.markBoundsDirty();
    }
  }
}
