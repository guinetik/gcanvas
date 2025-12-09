import { Geometry2d } from "./geometry.js";
import { Painter } from "../painter/painter.js";
import { Traceable } from "./traceable.js";

/**
 * Renderable
 * ----------
 *
 * A render-capable spatial object in the gcanvas engine.
 *
 * This class introduces the core rendering lifecycle — it knows when to draw,
 * how to draw, and how to **not draw** when conditions say so (invisible, opacity = 0).
 *
 * ### Architectural Role
 *
 * - Adds **rendering lifecycle control** (`render()`)
 * - Supports **canvas state management** (save/restore)
 * - Exposes **visual props** like opacity, visibility, and debug
 * - Optional **shadow styling** support
 *
 * `Renderable` should be extended by anything that draws visuals:
 * - Shapes (e.g., `Rectangle`, `Text`)
 * - Sprites
 * - UI elements
 *
 * @abstract
 * @extends Geometry2d
 */
export class Renderable extends Traceable {
  /**
   * @param {Object} [options={}]
   * @param {boolean} [options.visible=true] - Whether this object should be drawn
   * @param {number} [options.opacity=1] - Alpha transparency (0–1)
   * @param {boolean} [options.active=true] - Whether this object receives updates
   * @param {string} [options.blendMode="source-over"] - Optional blend mode
   * @param {string} [options.shadowColor] - Optional shadow color
   * @param {number} [options.shadowBlur=0] - Shadow blur radius
   * @param {number} [options.shadowOffsetX=0] - Shadow X offset
   * @param {number} [options.shadowOffsetY=0] - Shadow Y offset
   * @param {number} [options.zIndex=0] - Z-index for stacking order
   */
  constructor(options = {}) {
    super(options);
    this._visible = options.visible !== false;
    this._opacity = typeof options.opacity === "number" ? options.opacity : 1;
    this._active = options.active !== false;
    this.zIndex = options.zIndex ?? 0;

    this._shadowColor = options.shadowColor ?? undefined;
    this._shadowBlur = options.shadowBlur ?? 0;
    this._shadowOffsetX = options.shadowOffsetX ?? 0;
    this._shadowOffsetY = options.shadowOffsetY ?? 0;

    this._tick = 0;
    this.logger.log("Renderable", this.x, this.y, this.width, this.height);
  }

  /**
   * Main render method.
   * Handles visibility, translation, and calls draw() in the transformed context.
   */
  render() {
    if (!this._visible || this._opacity <= 0) return;

    Painter.save();
    Painter.effects.setBlendMode(this._blendMode);
    Painter.opacity.pushOpacity(this._opacity);

    if (this.crisp) {
      Painter.translateTo(Math.round(this.x), Math.round(this.y));
    } else {
      Painter.translateTo(this.x, this.y);
    }

    this.applyShadow(Painter.ctx);

    // Draw the object (subclasses apply transforms and draw debug in their draw() methods)
    if (this.constructor.name !== "Renderable") {
      this.draw();
    }

    Painter.opacity.popOpacity();
    Painter.restore();
  }

  draw() {
    this.drawDebug();
  }

  /**
   * Called once per frame if the object is active.
   * @param {number} dt - Time delta since last frame (seconds)
   */
  update(dt) {
    this.trace("Renderable.update");
    this._tick += dt;
    super.update(dt);
  }

  /**
   * Apply shadow styles to the current canvas context.
   * Only called if `shadowColor` is defined.
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  applyShadow(ctx) {
    if (!this._shadowColor) return;
    ctx.shadowColor = this._shadowColor;
    ctx.shadowBlur = this._shadowBlur;
    ctx.shadowOffsetX = this._shadowOffsetX;
    ctx.shadowOffsetY = this._shadowOffsetY;
  }

  /**
   * Gets whether the object is visible (drawn during render).
   * @type {boolean}
   */
  get visible() {
    return this._visible;
  }

  set visible(v) {
    this._visible = Boolean(v);
  }

  /**
   * Gets whether the object is active (updated during game loop).
   * @type {boolean}
   */
  get active() {
    return this._active;
  }

  set active(v) {
    this._active = Boolean(v);
  }

  /**
   * Gets the object's opacity (0–1).
   * @type {number}
   */
  get opacity() {
    return this._opacity;
  }

  set opacity(v) {
    this._opacity = Math.min(1, Math.max(0, typeof v === "number" ? v : 1));
  }

  /**
   * Gets the current shadow color (if any).
   * @type {string|undefined}
   */
  get shadowColor() {
    return this._shadowColor;
  }

  set shadowColor(v) {
    this._shadowColor = v;
  }

  /**
   * Gets the blur radius for the drop shadow.
   * @type {number}
   */
  get shadowBlur() {
    return this._shadowBlur;
  }

  set shadowBlur(v) {
    this._shadowBlur = v;
  }

  /**
   * Gets the horizontal offset of the drop shadow.
   * @type {number}
   */
  get shadowOffsetX() {
    return this._shadowOffsetX;
  }

  set shadowOffsetX(v) {
    this._shadowOffsetX = v;
  }

  /**
   * Gets the vertical offset of the drop shadow.
   * @type {number}
   */
  get shadowOffsetY() {
    return this._shadowOffsetY;
  }

  set shadowOffsetY(v) {
    this._shadowOffsetY = v;
  }

  /**
   * Total elapsed time this object has been alive (updated).
   * @type {number}
   * @readonly
   */
  get tick() {
    return this._tick;
  }
}
