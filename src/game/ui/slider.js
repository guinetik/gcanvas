/***************************************************************
 * Slider.js
 *
 * A draggable slider UI component with smooth value animation.
 * Displays a track with filled-portion glow, a thumb with radial
 * pulse, label + value text, and min/max labels.
 *
 * Theme: Terminal × Vercel aesthetic
 * - Dark transparent backgrounds
 * - Neon green accents (#0f0)
 * - Radial glow on thumb
 ***************************************************************/

import { Painter } from "../../painter";
import { GameObject } from "../objects/go";
import { UI_THEME } from "./theme.js";

const SLIDER_DEFAULTS = {
  label: "",
  min: 0,
  max: 1,
  value: 0.5,
  step: 0,
  width: 240,
  height: 48,
  trackHeight: 6,
  thumbRadius: 8,
  friction: 0.15,
  formatValue: null,
  onChange: null,
  accentColor: null,
};

/**
 * Slider - A draggable slider with smooth value animation.
 *
 * Displays:
 *  - Label (top-left) + formatted value (top-right)
 *  - Track with filled-portion gradient glow
 *  - Thumb circle with radial glow + pulse animation
 *  - Min/max labels below track
 *
 * Supports step quantization, friction-based display smoothing,
 * and an onChange callback.
 *
 * @example
 * ```js
 * const slider = new Slider(game, {
 *   x: 200,
 *   y: 100,
 *   label: "Speed",
 *   min: 0,
 *   max: 100,
 *   value: 50,
 *   step: 1,
 *   onChange: (v) => console.log("Value:", v)
 * });
 * game.pipeline.add(slider);
 * ```
 *
 * @extends GameObject
 */
export class Slider extends GameObject {
  constructor(game, options = {}) {
    options.origin = options.origin ?? "center";
    super(game, options);

    const opts = { ...SLIDER_DEFAULTS, ...options };

    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.sliderWidth = opts.width;
    this.sliderHeight = opts.height;
    this.trackHeight = opts.trackHeight;
    this.thumbRadius = opts.thumbRadius;
    this.labelText = opts.label;
    this.min = opts.min;
    this.max = opts.max;
    this.step = opts.step;
    this.friction = opts.friction;
    this.onChange = opts.onChange;
    this.formatValue = opts.formatValue || ((v) => v.toFixed(2));

    // Colors - allow override via accentColor
    const theme = (this.game?.theme?.slider) || UI_THEME.slider;
    this._theme = this.game?.theme || UI_THEME;
    this._colors = {
      trackBg: theme.track.bg,
      trackBorder: theme.track.border,
      trackFill: opts.accentColor || theme.track.fill,
      trackFillGlow: theme.track.fillGlow,
      thumbFill: opts.accentColor || theme.thumb.fill,
      thumbStroke: opts.accentColor || theme.thumb.stroke,
      thumbGlow: theme.thumb.glow,
      thumbPulseGlow: theme.thumb.pulseGlow,
      labelText: theme.label.text,
      valueText: theme.label.value,
      minMaxText: theme.label.minMax,
    };

    // Value state
    this._value = this._clamp(opts.value);
    this._displayValue = this._value;

    // Interaction state
    this._dragging = false;
    this._hoverTrack = false;
    this._pulsePhase = 0;

    // Layout constants (relative to center origin)
    this.width = this.sliderWidth;
    this.height = this.sliderHeight;

    // Vertical layout zones from center
    const labelRowH = 14;
    const minMaxRowH = 12;
    const trackZoneH = this.sliderHeight - labelRowH - minMaxRowH;

    this._labelY = -this.sliderHeight / 2 + labelRowH / 2;
    this._trackY = -this.sliderHeight / 2 + labelRowH + trackZoneH / 2;
    this._minMaxY = this.sliderHeight / 2 - minMaxRowH / 2;

    this._trackLeft = -this.sliderWidth / 2 + this.thumbRadius;
    this._trackRight = this.sliderWidth / 2 - this.thumbRadius;
    this._trackLen = this._trackRight - this._trackLeft;

    this._initEvents();
  }

  // ─── Value Management ───────────────────────────────────────

  get value() {
    return this._value;
  }

  set value(v) {
    const clamped = this._clamp(v);
    if (clamped !== this._value) {
      this._value = clamped;
      if (typeof this.onChange === "function") {
        this.onChange(this._value);
      }
    }
  }

  _clamp(v) {
    let val = Math.max(this.min, Math.min(this.max, v));
    if (this.step > 0) {
      val = Math.round((val - this.min) / this.step) * this.step + this.min;
      val = Math.max(this.min, Math.min(this.max, val));
    }
    return val;
  }

  _normalizedValue(v) {
    if (this.max === this.min) return 0;
    return (v - this.min) / (this.max - this.min);
  }

  _valueFromX(localX) {
    const t = Math.max(0, Math.min(1, (localX - this._trackLeft) / this._trackLen));
    return this.min + t * (this.max - this.min);
  }

  // ─── Events ─────────────────────────────────────────────────

  _initEvents() {
    this.interactive = true;
    this._isMouseOver = false;

    this.on("mouseover", () => {
      this._isMouseOver = true;
      this._hoverTrack = true;
      this.game.canvas.style.cursor = "pointer";
    });

    this.on("mouseout", () => {
      this._isMouseOver = false;
      if (!this._dragging) {
        this._hoverTrack = false;
        this.game.canvas.style.cursor = "default";
      }
    });

    this.on("inputdown", (e) => {
      this._dragging = true;
      const local = this.screenToLocal(e.x, e.y);
      this.value = this._valueFromX(local.x);
      this.game.canvas.style.cursor = "grabbing";
    });

    // Global move/up for drag continuity outside bounds
    this.game.events.on("inputmove", (e) => {
      if (this._dragging && this.isInteractiveInHierarchy()) {
        const local = this.screenToLocal(e.x, e.y);
        this.value = this._valueFromX(local.x);
      }
    });

    this.game.events.on("inputup", () => {
      if (this._dragging) {
        this._dragging = false;
        if (!this._isMouseOver) {
          this._hoverTrack = false;
          this.game.canvas.style.cursor = "default";
        } else {
          this.game.canvas.style.cursor = "pointer";
        }
      }
    });
  }

  screenToLocal(screenX, screenY) {
    let localX = screenX;
    let localY = screenY;

    const transformChain = [];
    let current = this;
    while (current) {
      transformChain.unshift(current);
      current = current.parent;
    }

    for (const obj of transformChain) {
      localX -= obj.x || 0;
      localY -= obj.y || 0;

      if (obj.rotation) {
        const cos = Math.cos(-obj.rotation);
        const sin = Math.sin(-obj.rotation);
        const tempX = localX;
        localX = tempX * cos - localY * sin;
        localY = tempX * sin + localY * cos;
      }

      if (obj.scaleX !== undefined && obj.scaleX !== 0) {
        localX /= obj.scaleX;
      }
      if (obj.scaleY !== undefined && obj.scaleY !== 0) {
        localY /= obj.scaleY;
      }
    }

    return { x: localX, y: localY };
  }

  // ─── Bounds ─────────────────────────────────────────────────

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.sliderWidth,
      height: this.sliderHeight,
    };
  }

  // ─── Update ─────────────────────────────────────────────────

  update(dt) {
    super.update(dt);

    // Lerp display value toward actual value (friction-based smoothing)
    const diff = this._value - this._displayValue;
    if (Math.abs(diff) > 0.0001) {
      this._displayValue += diff * this.friction;
    } else {
      this._displayValue = this._value;
    }

    // Pulse animation on thumb
    this._pulsePhase += dt * 3;
  }

  // ─── Render ─────────────────────────────────────────────────

  draw() {
    super.draw();
    const ctx = Painter.ctx;
    const t = this._normalizedValue(this._displayValue);

    this._drawLabels(ctx, t);
    this._drawTrack(ctx, t);
    this._drawThumb(ctx, t);
    this._drawMinMaxLabels(ctx);
  }

  _drawLabels(ctx, t) {
    const y = this._labelY;
    const halfW = this.sliderWidth / 2;

    // Label (top-left)
    if (this.labelText) {
      ctx.font = this._theme.fonts.small;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = this._colors.labelText;
      ctx.fillText(this.labelText, -halfW, y);
    }

    // Value (top-right)
    ctx.font = this._theme.fonts.small;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this._colors.valueText;
    ctx.fillText(this.formatValue(this._displayValue), halfW, y);
  }

  _drawTrack(ctx, t) {
    const y = this._trackY;
    const halfH = this.trackHeight / 2;
    const left = this._trackLeft;
    const right = this._trackRight;
    const radius = halfH;

    // Track background
    ctx.beginPath();
    this._roundRect(ctx, left - radius, y - halfH, this._trackLen + radius * 2, this.trackHeight, radius);
    ctx.fillStyle = this._colors.trackBg;
    ctx.fill();
    ctx.strokeStyle = this._colors.trackBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Filled portion with glow
    const fillEnd = left + t * this._trackLen;
    if (t > 0.001) {
      // Glow behind filled portion
      ctx.save();
      ctx.shadowColor = this._colors.trackFill;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      this._roundRect(ctx, left - radius, y - halfH, (fillEnd - left) + radius, this.trackHeight, radius);
      ctx.fillStyle = this._colors.trackFillGlow;
      ctx.fill();
      ctx.restore();

      // Filled track
      ctx.beginPath();
      this._roundRect(ctx, left - radius, y - halfH, (fillEnd - left) + radius, this.trackHeight, radius);
      ctx.fillStyle = this._colors.trackFill;
      ctx.fill();
    }
  }

  _drawThumb(ctx, t) {
    const thumbX = this._trackLeft + t * this._trackLen;
    const thumbY = this._trackY;
    const r = this.thumbRadius;

    // Pulse glow (animated)
    const pulseScale = 1 + 0.3 * Math.sin(this._pulsePhase);
    const pulseAlpha = this._dragging ? 0.5 : (this._hoverTrack ? 0.35 : 0.2);
    const pulseR = r * (1.8 + 0.4 * pulseScale);

    ctx.beginPath();
    ctx.arc(thumbX, thumbY, pulseR, 0, Math.PI * 2);
    const pulseGrad = ctx.createRadialGradient(thumbX, thumbY, 0, thumbX, thumbY, pulseR);
    pulseGrad.addColorStop(0, this._colors.thumbPulseGlow);
    pulseGrad.addColorStop(1, "transparent");
    ctx.fillStyle = pulseGrad;
    ctx.globalAlpha = pulseAlpha;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Thumb shadow/glow
    ctx.save();
    ctx.shadowColor = this._colors.thumbGlow;
    ctx.shadowBlur = this._dragging ? 16 : 10;

    // Thumb circle
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, r, 0, Math.PI * 2);
    ctx.fillStyle = this._colors.thumbFill;
    ctx.fill();
    ctx.restore();

    // Thumb stroke
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, r, 0, Math.PI * 2);
    ctx.strokeStyle = this._colors.thumbStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  _drawMinMaxLabels(ctx) {
    const y = this._minMaxY;
    const halfW = this.sliderWidth / 2;

    ctx.font = this._theme.fonts.small;
    ctx.textBaseline = "middle";
    ctx.fillStyle = this._colors.minMaxText;

    ctx.textAlign = "left";
    ctx.fillText(this.formatValue(this.min), -halfW, y);

    ctx.textAlign = "right";
    ctx.fillText(this.formatValue(this.max), halfW, y);
  }

  _roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
