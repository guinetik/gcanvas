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

    // Render caching - when enabled, renders to an offscreen canvas once
    // and blits the cached bitmap on subsequent frames for better performance.
    this._cacheRendering = options.cacheRendering ?? false;
    this._cacheCanvas = null;
    this._cacheDirty = true;
    this._cachePadding = options.cachePadding ?? 2; // Extra padding for anti-aliasing/strokes

    this._tick = 0;
    this.logger.log("Renderable", this.x, this.y, this.width, this.height);
  }

  /**
   * Main render method.
   * Handles visibility, translation, and calls draw() in the transformed context.
   * If cacheRendering is enabled, renders to an offscreen canvas once and blits it.
   */
  render() {
    if (!this._visible || this._opacity <= 0) return;

    Painter.save();
    Painter.effects.setBlendMode(this._blendMode);

    if (this.crisp) {
      Painter.translateTo(Math.round(this.x), Math.round(this.y));
    } else {
      Painter.translateTo(this.x, this.y);
    }

    this.applyShadow(Painter.ctx);

    // If caching IS NOT enabled or we're the base class, render normally
    if (!this._cacheRendering || this.constructor.name === "Renderable") {
      Painter.opacity.pushOpacity(this._opacity);
      this.draw();
      Painter.opacity.popOpacity();
    } else {
      // Caching logic - cache the IDENTITY shape (untransformed)
      const rawWidth = typeof this.width === "number" ? this.width : 0;
      const rawHeight = typeof this.height === "number" ? this.height : 0;
      const padding = this._cachePadding * 2;
      const cacheWidth = Math.ceil(rawWidth + padding) || 1;
      const cacheHeight = Math.ceil(rawHeight + padding) || 1;

      // Create or resize cache canvas if needed
      if (
        !this._cacheCanvas ||
        this._cacheCanvas.width !== cacheWidth ||
        this._cacheCanvas.height !== cacheHeight
      ) {
        this._cacheCanvas = document.createElement("canvas");
        this._cacheCanvas.width = cacheWidth;
        this._cacheCanvas.height = cacheHeight;
        this._cacheDirty = true;
      }

      // Re-render to cache if dirty
      if (this._cacheDirty) {
        this._renderToCache(cacheWidth, cacheHeight);
        this._cacheDirty = false;
      }

      // Blit cached canvas with current opacity AND transforms
      // This allows efficient rotation/scaling of the cached bitmap
      Painter.opacity.pushOpacity(this._opacity);

      // Extract transform properties if they exist
      const rotation = this.rotation ?? 0;
      const scaleX = this.scaleX ?? 1;
      const scaleY = this.scaleY ?? 1;

      Painter.img.draw(this._cacheCanvas, 0, 0, {
        width: cacheWidth,
        height: cacheHeight,
        rotation: rotation,
        scaleX: scaleX,
        scaleY: scaleY,
        anchor: "center",
      });

      Painter.opacity.popOpacity();
    }

    Painter.restore();
  }

  /**
   * Internal method to render the object to the offscreen cache canvas.
   * @param {number} width - Cache width
   * @param {number} height - Cache height
   * @protected
   */
  _renderToCache(width, height) {
    const cacheCtx = this._cacheCanvas.getContext("2d");
    cacheCtx.clearRect(0, 0, width, height);

    // Swap to cache context
    const mainCtx = Painter.ctx;
    Painter.ctx = cacheCtx;

    // Signal subclasses to skip transforms if they are transform-aware
    this._isCaching = true;

    cacheCtx.save();
    // Translate to center of cache so (0,0) draws correctly
    cacheCtx.translate(width / 2, height / 2);

    // Call draw() to render to the cache at full opacity and identity transform
    this.draw();

    cacheCtx.restore();

    this._isCaching = false;

    // Restore main context
    Painter.ctx = mainCtx;
  }

  /**
   * Mark the render cache as needing refresh.
   */
  invalidateCache() {
    this._cacheDirty = true;
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

  get width() {
    return super.width;
  }

  set width(v) {
    super.width = v;
    this.invalidateCache();
  }

  get height() {
    return super.height;
  }

  set height(v) {
    super.height = v;
    this.invalidateCache();
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
    this.invalidateCache();
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
    this.invalidateCache();
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
    this.invalidateCache();
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
    this.invalidateCache();
  }

  /**
   * Total elapsed time this object has been alive (updated).
   * @type {number}
   * @readonly
   */
  get tick() {
    return this._tick;
  }

  /**
   * Whether render caching is enabled for this object.
   * @type {boolean}
   */
  get cacheRendering() {
    return this._cacheRendering;
  }

  set cacheRendering(v) {
    this._cacheRendering = Boolean(v);
    if (v) this.invalidateCache();
  }
}
