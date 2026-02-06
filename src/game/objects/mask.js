/**
 * Mask - Clipping mask for scenes and game objects
 *
 * Supports multiple shapes with animatable properties:
 * - circle: radius
 * - rectangle: width, height, cornerRadius
 * - ellipse: radiusX, radiusY
 * - path: custom path function
 *
 * @example
 * // Create a circular mask that grows
 * const mask = new Mask({
 *   shape: 'circle',
 *   x: game.width / 2,
 *   y: game.height / 2,
 *   radius: 0,
 * });
 *
 * // Animate the radius
 * mask.radius = 100;
 *
 * // Apply to context
 * mask.apply(ctx);
 * // ... render masked content ...
 * mask.remove(ctx);
 */
export class Mask {
  constructor(options = {}) {
    // Shape type
    this.shape = options.shape || 'circle';

    // Position (center point)
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;

    // Scale (multiplies dimensions)
    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;

    // Circle properties
    this.radius = options.radius ?? 100;

    // Rectangle properties
    this.width = options.width ?? 200;
    this.height = options.height ?? 200;
    this.cornerRadius = options.cornerRadius ?? 0;

    // Ellipse properties
    this.radiusX = options.radiusX ?? 100;
    this.radiusY = options.radiusY ?? 100;

    // Custom path function: (ctx, mask) => void
    this.pathFn = options.pathFn ?? null;

    // Invert the mask (show outside, hide inside)
    this.invert = options.invert ?? false;

    // Track if currently applied (for safety)
    this._applied = false;
  }

  /**
   * Apply the mask to a canvas context
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   */
  apply(ctx) {
    if (this._applied) {
      console.warn('Mask already applied. Call remove() first.');
      return;
    }

    ctx.save();
    ctx.beginPath();

    if (this.invert) {
      // For inverted mask, draw full canvas then cut out the shape
      // This requires knowing the canvas size, so we use a large rect
      ctx.rect(-10000, -10000, 20000, 20000);
      this._drawPath(ctx);
      // evenodd fill rule creates the "hole"
      ctx.clip('evenodd');
    } else {
      this._drawPath(ctx);
      ctx.clip();
    }

    this._applied = true;
  }

  /**
   * Remove the mask (restore context)
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   */
  remove(ctx) {
    if (!this._applied) {
      return;
    }
    ctx.restore();
    this._applied = false;
  }

  /**
   * Draw the mask path (internal)
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawPath(ctx) {
    const sx = this.scaleX;
    const sy = this.scaleY;

    switch (this.shape) {
      case 'circle':
        // Use average scale for circle
        const scale = (sx + sy) / 2;
        ctx.arc(this.x, this.y, this.radius * scale, 0, Math.PI * 2);
        break;

      case 'rectangle':
        const w = this.width * sx;
        const h = this.height * sy;
        const cr = this.cornerRadius * Math.min(sx, sy);

        if (cr > 0) {
          // Rounded rectangle
          this._roundedRect(ctx, this.x - w/2, this.y - h/2, w, h, cr);
        } else {
          // Simple rectangle
          ctx.rect(this.x - w/2, this.y - h/2, w, h);
        }
        break;

      case 'ellipse':
        ctx.ellipse(this.x, this.y, this.radiusX * sx, this.radiusY * sy, 0, 0, Math.PI * 2);
        break;

      case 'path':
        if (this.pathFn) {
          this.pathFn(ctx, this);
        }
        break;

      default:
        console.warn(`Unknown mask shape: ${this.shape}`);
    }
  }

  /**
   * Draw a rounded rectangle path
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {number} r - Corner radius
   */
  _roundedRect(ctx, x, y, w, h, r) {
    // Clamp corner radius to half of smallest dimension
    r = Math.min(r, w / 2, h / 2);

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

  /**
   * Set position
   * @param {number} x
   * @param {number} y
   * @returns {Mask} this for chaining
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Set uniform scale
   * @param {number} scale
   * @returns {Mask} this for chaining
   */
  setScale(scale) {
    this.scaleX = scale;
    this.scaleY = scale;
    return this;
  }

  /**
   * Set non-uniform scale
   * @param {number} sx
   * @param {number} sy
   * @returns {Mask} this for chaining
   */
  setScaleXY(sx, sy) {
    this.scaleX = sx;
    this.scaleY = sy;
    return this;
  }

  /**
   * Create a circle mask
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius
   * @returns {Mask}
   */
  static circle(x, y, radius) {
    return new Mask({ shape: 'circle', x, y, radius });
  }

  /**
   * Create a rectangle mask
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width
   * @param {number} height
   * @param {number} cornerRadius - Optional rounded corners
   * @returns {Mask}
   */
  static rectangle(x, y, width, height, cornerRadius = 0) {
    return new Mask({ shape: 'rectangle', x, y, width, height, cornerRadius });
  }

  /**
   * Create an ellipse mask
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radiusX
   * @param {number} radiusY
   * @returns {Mask}
   */
  static ellipse(x, y, radiusX, radiusY) {
    return new Mask({ shape: 'ellipse', x, y, radiusX, radiusY });
  }
}
