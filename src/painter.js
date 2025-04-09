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
   * Draw a rounded rectangle
   * @param {number} x - X coordinate (top-left)
   * @param {number} y - Y coordinate (top-left)
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number|number[]} radii - Corner radius or array of radii for each corner
   * @param {string|CanvasGradient} [fillColor] - Fill color
   * @param {string|CanvasGradient} [strokeColor] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static roundRect(
    x,
    y,
    width,
    height,
    radii = 0,
    fillColor,
    strokeColor,
    lineWidth
  ) {
    // Handle radius either as a single value or array
    let radiusArray;
    if (typeof radii === "number") {
      radiusArray = [radii, radii, radii, radii]; // [topLeft, topRight, bottomRight, bottomLeft]
    } else if (Array.isArray(radii)) {
      // Ensure we have exactly 4 values
      radiusArray =
        radii.length === 4
          ? radii
          : [
              radii[0] || 0,
              radii[1] || radii[0] || 0,
              radii[2] || radii[0] || 0,
              radii[3] || radii[1] || radii[0] || 0,
            ];
    } else {
      radiusArray = [0, 0, 0, 0];
    }

    const [tlRadius, trRadius, brRadius, blRadius] = radiusArray;
    const right = x + width;
    const bottom = y + height;

    Painter.ctx.beginPath();

    // Start from the top-left corner and draw clockwise
    Painter.ctx.moveTo(x + tlRadius, y);

    // Top edge and top-right corner
    Painter.ctx.lineTo(right - trRadius, y);
    Painter.ctx.arc(right - trRadius, y + trRadius, trRadius, -Math.PI / 2, 0);

    // Right edge and bottom-right corner
    Painter.ctx.lineTo(right, bottom - brRadius);
    Painter.ctx.arc(
      right - brRadius,
      bottom - brRadius,
      brRadius,
      0,
      Math.PI / 2
    );

    // Bottom edge and bottom-left corner
    Painter.ctx.lineTo(x + blRadius, bottom);
    Painter.ctx.arc(
      x + blRadius,
      bottom - blRadius,
      blRadius,
      Math.PI / 2,
      Math.PI
    );

    // Left edge and top-left corner
    Painter.ctx.lineTo(x, y + tlRadius);
    Painter.ctx.arc(
      x + tlRadius,
      y + tlRadius,
      tlRadius,
      Math.PI,
      -Math.PI / 2
    );

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
   * Draw a filled rounded rectangle
   * @param {number} x - X coordinate (top-left)
   * @param {number} y - Y coordinate (top-left)
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number|number[]} radii - Corner radius or array of radii
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fillRoundRect(x, y, width, height, radii = 0, color) {
    if (color) Painter.ctx.fillStyle = color;
    Painter.roundRect(x, y, width, height, radii, color, null);
  }

  /**
   * Draw a stroked rounded rectangle
   * @param {number} x - X coordinate (top-left)
   * @param {number} y - Y coordinate (top-left)
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number|number[]} radii - Corner radius or array of radii
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static strokeRoundRect(x, y, width, height, radii = 0, color, lineWidth) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.roundRect(x, y, width, height, radii, null, color, lineWidth);
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
      if (type === "M") ctx.moveTo(...args);
      else if (type === "L") ctx.lineTo(...args);
      else if (type === "C") ctx.bezierCurveTo(...args);
      else if (type === "Q") ctx.quadraticCurveTo(...args);
      else if (type === "Z") ctx.closePath();
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
   * Set stroke options
   * @param {*} options The options for the stroke
   */
  static strokeOptions(options) {
    if (options.color) Painter.ctx.strokeStyle = options.color;
    if (options.lineWidth !== undefined)
      Painter.ctx.lineWidth = options.lineWidth;
    if (options.lineCap) Painter.ctx.lineCap = options.lineCap;
    if (options.lineJoin) Painter.ctx.lineJoin = options.lineJoin;
    if (options.strokeStyle) Painter.ctx.strokeStyle = options.strokeStyle;
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

  /**
   * Generate a random pleasing color in RGB format
   * @returns {Array<number>} RGB color array [r, g, b]
   */
  static randomColorRGB() {
    // Generate vibrant, pleasing colors by using HSL first
    // then converting to RGB
    // Random hue (0-360)
    const hue = Math.floor(Math.random() * 360);
    // High saturation for vibrant colors (70-100%)
    const saturation = 70 + Math.floor(Math.random() * 30);
    // Medium-high lightness for visibility (50-70%)
    const lightness = 50 + Math.floor(Math.random() * 20);
    // Convert HSL to RGB
    return Painter.hslToRgb(hue, saturation, lightness);
  }

  static randomColorHSL() {
    return `hsl(${Math.random() * 360}, 100%, 50%)`;
  }

  static randomColorHEX() {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return "#" + n.slice(0, 6);
  }

  static parseColorString(str) {
    str = str.trim().toLowerCase();

    // 1) Check if it's hsl(...) form
    if (str.startsWith("hsl")) {
      // e.g. "hsl(130, 100%, 50%)"
      // Remove "hsl(" and ")" => "130, 100%, 50%"
      const inner = str.replace(/hsla?\(|\)/g, "");
      const [hue, satPercent, lightPercent] = inner
        .split(",")
        .map((c) => c.trim());
      const h = parseFloat(hue);
      const s = parseFloat(satPercent) / 100;
      const l = parseFloat(lightPercent) / 100;
      return Painter.hslToRgb(h, s, l); // Convert HSL->RGB
    }

    // 2) Check if it's #RRGGBB
    if (str.startsWith("#")) {
      // e.g. "#ff00ff" => r=255,g=0,b=255
      return hexToRgb(str);
    }

    // 3) If it's rgb(...) form, parse that
    if (str.startsWith("rgb")) {
      // e.g. "rgb(255, 128, 50)"
      // Remove "rgb(" + ")"
      const inner = str.replace(/rgba?\(|\)/g, "");
      const [r, g, b] = inner.split(",").map((x) => parseInt(x.trim()));
      return [r, g, b];
    }

    // Fallback: assume black
    return [0, 0, 0];
  }

  /**
   * Convert [r,g,b] => "rgb(r, g, b)" string
   */
  static rgbArrayToCSS([r, g, b]) {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  /**
   * Convert HSL => [r,g,b] (0..255).
   * Formulas from standard color conversion references.
   */
  static hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hPrime = h / 60;
    const x = c * (1 - Math.abs((hPrime % 2) - 1));
    let [r, g, b] = [0, 0, 0];

    if (hPrime >= 0 && hPrime < 1) [r, g, b] = [c, x, 0];
    else if (hPrime >= 1 && hPrime < 2) [r, g, b] = [x, c, 0];
    else if (hPrime >= 2 && hPrime < 3) [r, g, b] = [0, c, x];
    else if (hPrime >= 3 && hPrime < 4) [r, g, b] = [0, x, c];
    else if (hPrime >= 4 && hPrime < 5) [r, g, b] = [x, 0, c];
    else if (hPrime >= 5 && hPrime < 6) [r, g, b] = [c, 0, x];

    const m = l - c / 2;
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  /**
   * Convert a hex color like "#ff00ff" => [255, 0, 255].
   */
  static hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
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

  /**
   * Create a conic gradient
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} startAngle - Start angle in radians
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static conicGradient(x, y, startAngle, colorStops) {
    // For browsers that support it
    if (typeof Painter.ctx.createConicGradient === "function") {
      const gradient = Painter.ctx.createConicGradient(startAngle, x, y);
      for (const stop of colorStops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      return gradient;
    }
    return null;
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
  static dropShadow(color, blur, offsetX = 0, offsetY = 0) {
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

  /**
   * Draw a dashed line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {Array<number>} dash - Dash pattern array [dash, gap, dash, gap, ...]
   * @param {string|CanvasGradient} [color] - Line color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static dashedLine(x1, y1, x2, y2, dash, color, lineWidth) {
    Painter.ctx.beginPath();
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;

    // Set the dash pattern
    Painter.ctx.setLineDash(dash);

    Painter.ctx.moveTo(x1, y1);
    Painter.ctx.lineTo(x2, y2);
    Painter.ctx.stroke();

    // Reset the dash pattern
    Painter.ctx.setLineDash([]);
  }

  /**
   * Draw a dotted line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {number} dotSize - Size of dots
   * @param {number} gap - Gap between dots
   * @param {string|CanvasGradient} [color] - Line color
   * @returns {void}
   */
  static dottedLine(x1, y1, x2, y2, dotSize = 2, gap = 5, color) {
    return Painter.dashedLine(x1, y1, x2, y2, [dotSize, gap], color, dotSize);
  }

  /**
   * Draw quadratic curve
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} cpx - Control point X
   * @param {number} cpy - Control point Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static quadraticCurve(x1, y1, cpx, cpy, x2, y2, color, lineWidth) {
    Painter.ctx.beginPath();
    Painter.ctx.moveTo(x1, y1);
    Painter.ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }

  /**
   * Create and draw a pattern
   * @param {HTMLImageElement|HTMLCanvasElement} image - Image to create pattern from
   * @param {string} repetition - 'repeat', 'repeat-x', 'repeat-y', or 'no-repeat'
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {void}
   */
  static fillPattern(image, repetition, x, y, width, height) {
    const pattern = Painter.ctx.createPattern(image, repetition);
    Painter.ctx.fillStyle = pattern;
    Painter.ctx.fillRect(x, y, width, height);
  }

  /**
   * Draw filled and stroked text with outline
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} fillColor - Fill color
   * @param {string} strokeColor - Stroke color
   * @param {number} strokeWidth - Stroke width
   * @param {string} [font] - Font specification
   * @returns {void}
   */
  static outlinedText(text, x, y, fillColor, strokeColor, strokeWidth, font) {
    if (font) Painter.ctx.font = font;

    // Draw the stroke first
    Painter.ctx.strokeStyle = strokeColor;
    Painter.ctx.lineWidth = strokeWidth;
    Painter.ctx.strokeText(text, x, y);

    // Then draw the fill
    Painter.ctx.fillStyle = fillColor;
    Painter.ctx.fillText(text, x, y);
  }

  /**
   * Draw text with a maximum width, wrapping to new lines as needed
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} maxWidth - Maximum width before wrapping
   * @param {number} lineHeight - Line height for wrapped text
   * @param {string} [color] - Text color
   * @param {string} [font] - Font specification
   * @returns {number} Total height of drawn text
   */
  static wrappedText(text, x, y, maxWidth, lineHeight, color, font) {
    if (color) Painter.ctx.fillStyle = color;
    if (font) Painter.ctx.font = font;

    const words = text.split(" ");
    let line = "";
    let testLine = "";
    let lineCount = 1;

    for (let i = 0; i < words.length; i++) {
      testLine = line + words[i] + " ";
      const metrics = Painter.ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        Painter.ctx.fillText(line, x, y);
        line = words[i] + " ";
        y += lineHeight;
        lineCount++;
      } else {
        line = testLine;
      }
    }

    Painter.ctx.fillText(line, x, y);
    return lineCount * lineHeight;
  }

  /**
   * Set line dash pattern
   * @param {Array<number>} segments - Array of line, gap lengths
   * @returns {void}
   */
  static setLineDash(segments) {
    Painter.ctx.setLineDash(segments);
  }

  /**
   * Reset line dash to solid line
   * @returns {void}
   */
  static resetLineDash() {
    Painter.ctx.setLineDash([]);
  }

  /**
   * Clip to a rectangular region
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {void}
   */
  static clipRect(x, y, width, height) {
    Painter.ctx.beginPath();
    Painter.ctx.rect(x, y, width, height);
    Painter.ctx.clip();
  }

  /**
   * Clip to a circular region
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @returns {void}
   */
  static clipCircle(x, y, radius) {
    Painter.ctx.beginPath();
    Painter.ctx.arc(x, y, radius, 0, Math.PI * 2);
    Painter.ctx.clip();
  }

  /**
   * Apply a blur filter to a region
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} blur - Blur amount (pixels)
   * @returns {void}
   */
  static blurRegion(x, y, width, height, blur) {
    // Save current filter
    const currentFilter = Painter.ctx.filter;

    // Apply blur filter
    Painter.ctx.filter = `blur(${blur}px)`;

    // Draw the region from the canvas back onto itself with the filter
    const imageData = Painter.ctx.getImageData(x, y, width, height);
    Painter.ctx.putImageData(imageData, x, y);

    // Restore previous filter
    Painter.ctx.filter = currentFilter;
  }

  /**
   * Draw text along a path (like an arc)
   * @param {string} text - Text to draw
   * @param {Array} path - Array of points {x, y} defining the path
   * @param {string} [color] - Text color
   * @param {string} [font] - Font specification
   * @param {boolean} [reverse=false] - Whether to draw text in reverse direction
   * @returns {void}
   */
  static textOnPath(text, path, color, font, reverse = false) {
    if (path.length < 2) return;

    if (color) Painter.ctx.fillStyle = color;
    if (font) Painter.ctx.font = font;

    // Get characters and their widths
    const chars = text.split("");
    const charWidths = chars.map((char) => Painter.ctx.measureText(char).width);

    if (reverse) {
      chars.reverse();
      charWidths.reverse();
      path.reverse();
    }

    // Calculate total length of the path
    let pathLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate total width of text
    const textWidth = charWidths.reduce((total, width) => total + width, 0);

    // Calculate starting offset to center text on path
    let offset = (pathLength - textWidth) / 2;
    if (offset < 0) offset = 0;

    // Draw each character
    let currentOffset = offset;
    for (let i = 0; i < chars.length; i++) {
      const charWidth = charWidths[i];

      // Find position and angle on path
      const { x, y, angle } = getPositionOnPath(path, currentOffset);

      // Draw the character
      Painter.ctx.save();
      Painter.ctx.translate(x, y);
      Painter.ctx.rotate(angle);
      Painter.ctx.fillText(chars[i], 0, 0);
      Painter.ctx.restore();

      currentOffset += charWidth;
    }
  }

  // Helper function for textOnPath
  static getPositionOnPath(path, offset) {
    let currentLength = 0;

    for (let i = 1; i < path.length; i++) {
      const p1 = path[i - 1];
      const p2 = path[i];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);

      if (currentLength + segmentLength >= offset) {
        // Calculate position between p1 and p2
        const t = (offset - currentLength) / segmentLength;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        const angle = Math.atan2(dy, dx);

        return { x, y, angle };
      }

      currentLength += segmentLength;
    }

    // If offset is beyond path length, return last point
    const lastPoint = path[path.length - 1];
    const secondLastPoint = path[path.length - 2];
    const angle = Math.atan2(
      lastPoint.y - secondLastPoint.y,
      lastPoint.x - secondLastPoint.x
    );

    return {
      x: lastPoint.x,
      y: lastPoint.y,
      angle,
    };
  }

  /**
   * Create an HTML5 Canvas Pattern
   * @param {HTMLImageElement|HTMLCanvasElement} image - Image source
   * @param {string} [repetition='repeat'] - Repetition style ('repeat', 'repeat-x', 'repeat-y', 'no-repeat')
   * @returns {CanvasPattern} The created pattern
   */
  static createPattern(image, repetition = "repeat") {
    return Painter.ctx.createPattern(image, repetition);
  }
}
