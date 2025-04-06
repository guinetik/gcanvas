/**
 * Painter - Static utility class for all canvas drawing operations
 * Provides a cleaner API for common canvas operations with additional utilities
 */
export class Painter {
  /**
   * Initialize the painter with a canvas context
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   */
  static init(ctx) {
    Painter.ctx = ctx;
  }

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  /**
   * Save the current canvas state
   * @returns {void}
   */
  static save() {
    Painter.ctx.save();
  }

  /**
   * Restore the previously saved canvas state
   * @returns {void}
   */
  static restore() {
    Painter.ctx.restore();
  }

  /**
   * Clear the entire canvas or a specific rectangle
   * @param {number} [x=0] - X coordinate
   * @param {number} [y=0] - Y coordinate
   * @param {number} [width=canvas.width] - Width
   * @param {number} [height=canvas.height] - Height
   * @returns {void}
   */
  static clear(
    x = 0,
    y = 0,
    width = Painter.ctx.canvas.width,
    height = Painter.ctx.canvas.height
  ) {
    Painter.ctx.clearRect(x, y, width, height);
  }

  // =========================================================================
  // TRANSFORMATIONS
  // =========================================================================

  /**
   * Translate the canvas
   * @param {number} x - X translation
   * @param {number} y - Y translation
   * @returns {void}
   */
  static translate(x, y) {
    Painter.ctx.translate(x, y);
  }

  /**
   * Rotate the canvas
   * @param {number} angle - Rotation angle in radians
   * @returns {void}
   */
  static rotate(angle) {
    Painter.ctx.rotate(angle);
  }

  /**
   * Scale the canvas
   * @param {number} x - X scale factor
   * @param {number} y - Y scale factor
   * @returns {void}
   */
  static scale(x, y) {
    Painter.ctx.scale(x, y);
  }

  // =========================================================================
  // BASIC SHAPES
  // =========================================================================

  /**
   * Draw a filled rectangle
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {string|CanvasGradient} [color] - Fill color (uses current fillStyle if not specified)
   * @returns {void}
   */
  static fillRect(x, y, width, height, color) {
    if (color) Painter.ctx.fillStyle = color;
    Painter.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw a stroked rectangle
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {string|CanvasGradient} [color] - Stroke color (uses current strokeStyle if not specified)
   * @param {number} [lineWidth] - Line width (uses current lineWidth if not specified)
   * @returns {void}
   */
  static strokeRect(x, y, width, height, color, lineWidth) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw a filled circle
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fillCircle(x, y, radius, color) {
    Painter.ctx.beginPath();
    Painter.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (color) Painter.ctx.fillStyle = color;
    Painter.ctx.fill();
  }

  /**
   * Draw a stroked circle
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static strokeCircle(x, y, radius, color, lineWidth) {
    Painter.ctx.beginPath();
    Painter.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }

  /**
   * Draw a filled ellipse
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radiusX - X radius
   * @param {number} radiusY - Y radius
   * @param {number} [rotation=0] - Rotation in radians
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fillEllipse(x, y, radiusX, radiusY, rotation = 0, color) {
    Painter.ctx.beginPath();
    Painter.ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (color) Painter.ctx.fillStyle = color;
    Painter.ctx.fill();
  }

  static path(commands, fill, stroke, lineWidth = 1) {
    const ctx = Painter.ctx;
    ctx.beginPath();
    for (const cmd of commands) {
      const [type, ...args] = cmd;
      if (type === 'M') ctx.moveTo(...args);
      else if (type === 'L') ctx.lineTo(...args);
      else if (type === 'C') ctx.bezierCurveTo(...args);
      else if (type === 'Q') ctx.quadraticCurveTo(...args);
      else if (type === 'Z') ctx.closePath();
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }
  

  /**
   * Draw a stroked ellipse
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radiusX - X radius
   * @param {number} radiusY - Y radius
   * @param {number} [rotation=0] - Rotation in radians
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static strokeEllipse(x, y, radiusX, radiusY, rotation = 0, color, lineWidth) {
    Painter.ctx.beginPath();
    Painter.ctx.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }

  /**
   * Draw a line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {string|CanvasGradient} [color] - Line color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static line(x1, y1, x2, y2, color, lineWidth) {
    Painter.ctx.beginPath();
    Painter.ctx.moveTo(x1, y1);
    Painter.ctx.lineTo(x2, y2);
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }

  /**
   * Start a new path
   * @returns {void}
   */
  static beginPath() {
    Painter.ctx.beginPath();
  }

  /**
   * Move to a point without drawing
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
   */
  static moveTo(x, y) {
    Painter.ctx.moveTo(x, y);
  }

  /**
   * Draw a line to a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
   */
  static lineTo(x, y) {
    Painter.ctx.lineTo(x, y);
  }

  /**
   * Add a bezier curve to the current path
   * @param {number} cp1x - Control point 1 X
   * @param {number} cp1y - Control point 1 Y
   * @param {number} cp2x - Control point 2 X
   * @param {number} cp2y - Control point 2 Y
   * @param {number} x - End X
   * @param {number} y - End Y
   * @returns {void}
   */
  static bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    Painter.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }

  /**
   * Close the current path
   * @returns {void}
   */
  static closePath() {
    Painter.ctx.closePath();
  }

  /**
   * Fill the current path
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fill(color) {
    if (color) Painter.ctx.fillStyle = color;
    Painter.ctx.fill();
  }

  /**
   * Stroke the current path
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static stroke(color, lineWidth) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }

  /**
   * Draw a polygon
   * @param {Array<{x: number, y: number}>} points - Array of points
   * @param {string|CanvasGradient} [fillColor] - Fill color
   * @param {string|CanvasGradient} [strokeColor] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static polygon(points, fillColor, strokeColor, lineWidth) {
    if (points.length < 2) return;

    Painter.ctx.beginPath();
    Painter.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      Painter.ctx.lineTo(points[i].x, points[i].y);
    }

    Painter.ctx.closePath();

    if (fillColor) {
      Painter.ctx.fillStyle = fillColor;
      Painter.ctx.fill();
    }

    if (strokeColor) {
      Painter.ctx.strokeStyle = strokeColor;
      if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
      Painter.ctx.stroke();
    }
  }

  /**
   * Draw a heart shape
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {string|CanvasGradient} [color="#FF0055"] - Heart color
   * @returns {void}
   */
  static heart(x, y, width, height, color = "#FF0055") {
    const halfWidth = width / 2;

    Painter.ctx.save();
    Painter.ctx.translate(x, y);

    Painter.ctx.beginPath();
    Painter.ctx.moveTo(0, height * 0.3);

    // Left curve
    Painter.ctx.bezierCurveTo(
      -halfWidth * 0.5,
      -height * 0.3,
      -halfWidth,
      -height * 0.6,
      0,
      -height
    );

    // Right curve
    Painter.ctx.bezierCurveTo(
      halfWidth,
      -height * 0.6,
      halfWidth * 0.5,
      -height * 0.3,
      0,
      height * 0.3
    );

    Painter.ctx.closePath();

    Painter.ctx.fillStyle = color;
    Painter.ctx.fill();

    Painter.ctx.restore();
  }

  // =========================================================================
  // TEXT METHODS
  // =========================================================================

  /**
   * Set font for text drawing
   * @param {string} font - Font specification (e.g. "24px 'Courier New', monospace")
   * @returns {void}
   */
  static setFont(font) {
    Painter.ctx.font = font;
  }

  /**
   * Set text alignment
   * @param {CanvasTextAlign} align - Text alignment ('left', 'right', 'center', 'start', 'end')
   * @returns {void}
   */
  static setTextAlign(align) {
    Painter.ctx.textAlign = align;
  }

  /**
   * Set text baseline
   * @param {CanvasTextBaseline} baseline - Text baseline ('top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom')
   * @returns {void}
   */
  static setTextBaseline(baseline) {
    Painter.ctx.textBaseline = baseline;
  }

  /**
   * Draw filled text
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string|CanvasGradient} [color] - Text color
   * @param {string} [font] - Font specification
   * @returns {void}
   */
  static fillText(text, x, y, color, font) {
    if (color) Painter.ctx.fillStyle = color;
    if (font) Painter.ctx.font = font;
    Painter.ctx.fillText(text, x, y);
  }

  /**
   * Draw stroked text
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string|CanvasGradient} [color] - Text color
   * @param {number} [lineWidth] - Line width
   * @param {string} [font] - Font specification
   * @returns {void}
   */
  static strokeText(text, x, y, color, lineWidth, font) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    if (font) Painter.ctx.font = font;
    Painter.ctx.strokeText(text, x, y);
  }

  /**
   * Measure text width
   * @param {string} text - Text to measure
   * @returns {number} Text width
   */
  static measureText(text) {
    return Painter.ctx.measureText(text).width;
  }

  // =========================================================================
  // COLOR METHODS
  // =========================================================================

  /**
   * Set fill color
   * @param {string|CanvasGradient} color - Fill color
   * @returns {void}
   */
  static setFillColor(color) {
    Painter.ctx.fillStyle = color;
  }

  /**
   * Set stroke color
   * @param {string|CanvasGradient} color - Stroke color
   * @returns {void}
   */
  static setStrokeColor(color) {
    Painter.ctx.strokeStyle = color;
  }

  /**
   * Set line width
   * @param {number} width - Line width
   * @returns {void}
   */
  static setLineWidth(width) {
    Painter.ctx.lineWidth = width;
  }

  /**
   * Create an RGBA color string
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @param {number} [a=1] - Alpha (0-1)
   * @returns {string} RGBA color string
   */
  static rgba(r, g, b, a = 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  }

  /**
   * Create an HSL color string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} HSL color string
   */
  static hsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  /**
   * Create an HSLA color string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @param {number} a - Alpha (0-1)
   * @returns {string} HSLA color string
   */
  static hsla(h, s, l, a) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }

  // =========================================================================
  // GRADIENT METHODS
  // =========================================================================

  /**
   * Create a linear gradient
   * @param {number} x0 - Start X
   * @param {number} y0 - Start Y
   * @param {number} x1 - End X
   * @param {number} y1 - End Y
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static linearGradient(x0, y0, x1, y1, colorStops) {
    const gradient = Painter.ctx.createLinearGradient(x0, y0, x1, y1);

    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    return gradient;
  }

  /**
   * Create a radial gradient
   * @param {number} x0 - Inner circle center X
   * @param {number} y0 - Inner circle center Y
   * @param {number} r0 - Inner circle radius
   * @param {number} x1 - Outer circle center X
   * @param {number} y1 - Outer circle center Y
   * @param {number} r1 - Outer circle radius
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static radialGradient(x0, y0, r0, x1, y1, r1, colorStops) {
    const gradient = Painter.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);

    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    return gradient;
  }

  /**
   * Create a vertical gradient (convenience method)
   * @param {number} x - X position
   * @param {number} y - Top Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static verticalGradient(x, y, width, height, colorStops) {
    return Painter.linearGradient(x, y, x, y + height, colorStops);
  }

  /**
   * Create a horizontal gradient (convenience method)
   * @param {number} x - Left X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static horizontalGradient(x, y, width, height, colorStops) {
    return Painter.linearGradient(x, y, x + width, y, colorStops);
  }

  // =========================================================================
  // EFFECTS METHODS
  // =========================================================================

  /**
   * Set shadow properties
   * @param {string} color - Shadow color
   * @param {number} blur - Shadow blur
   * @param {number} [offsetX=0] - Shadow X offset
   * @param {number} [offsetY=0] - Shadow Y offset
   * @returns {void}
   */
  static setShadow(color, blur, offsetX = 0, offsetY = 0) {
    Painter.ctx.shadowColor = color;
    Painter.ctx.shadowBlur = blur;
    Painter.ctx.shadowOffsetX = offsetX;
    Painter.ctx.shadowOffsetY = offsetY;
  }

  /**
   * Clear shadow
   * @returns {void}
   */
  static clearShadow() {
    Painter.ctx.shadowColor = "rgba(0, 0, 0, 0)";
    Painter.ctx.shadowBlur = 0;
    Painter.ctx.shadowOffsetX = 0;
    Painter.ctx.shadowOffsetY = 0;
  }

  /**
   * Set global alpha
   * @param {number} alpha - Alpha value (0-1)
   * @returns {void}
   */
  static setAlpha(alpha) {
    Painter.ctx.globalAlpha = alpha;
  }

  /**
   * Set global composite operation
   * @param {GlobalCompositeOperation} operation - Composite operation
   * @returns {void}
   */
  static setBlendMode(operation) {
    Painter.ctx.globalCompositeOperation = operation;
  }
}
