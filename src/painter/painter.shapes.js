import { Painter } from "./painter";

export class PainterShapes {
  // =========================================================================
  // BASIC SHAPES
  // =========================================================================

  // Drawing functions that ensure opacity is applied
  static rect(x, y, width, height, color) {
    // Save current fillStyle
    const oldFillStyle = Painter.ctx.fillStyle;
    // Apply fill
    Painter.colors.fill(color);
    Painter.ctx.fillRect(x, y, width, height);
    // Restore fillStyle
    Painter.ctx.fillStyle = oldFillStyle;
  }

  static outlineRect(x, y, width, height, color, lineWidth = 1) {
    // Save current styles
    const oldStrokeStyle = Painter.ctx.strokeStyle;
    const oldLineWidth = Painter.ctx.lineWidth;
    // Apply stroke
    Painter.ctx.strokeStyle = color;
    Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.strokeRect(x, y, width, height);
    // Restore styles
    Painter.ctx.strokeStyle = oldStrokeStyle;
    Painter.ctx.lineWidth = oldLineWidth;
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

    Painter.lines.beginPath();

    // Start from the top-left corner and draw clockwise
    Painter.lines.moveTo(x + tlRadius, y);

    // Top edge and top-right corner
    Painter.lines.lineTo(right - trRadius, y);
    this.arc(right - trRadius, y + trRadius, trRadius, -Math.PI / 2, 0);

    // Right edge and bottom-right corner
    Painter.lines.lineTo(right, bottom - brRadius);
    this.arc(
      right - brRadius,
      bottom - brRadius,
      brRadius,
      0,
      Math.PI / 2
    );

    // Bottom edge and bottom-left corner
    Painter.lines.lineTo(x + blRadius, bottom);
    this.arc(
      x + blRadius,
      bottom - blRadius,
      blRadius,
      Math.PI / 2,
      Math.PI
    );

    // Left edge and top-left corner
    Painter.lines.lineTo(x, y + tlRadius);
    this.arc(
      x + tlRadius,
      y + tlRadius,
      tlRadius,
      Math.PI,
      -Math.PI / 2
    );

    Painter.lines.closePath();

    if (fillColor) {
      Painter.fillStyle = fillColor;
      Painter.colors.fill(fillColor);
    }

    if (strokeColor) {
      Painter.colors.stroke(strokeColor, lineWidth);
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
    this.roundRect(x, y, width, height, radii, color, null);
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
    this.roundRect(x, y, width, height, radii, null, color, lineWidth);
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
    Painter.logger.log("PainterShapes.fillCircle", x, y, radius, color);
    Painter.lines.beginPath();
    this.arc(x, y, radius, 0, Math.PI * 2);
    Painter.colors.fill(color);
  }

  static arc(x, y, radius, startAngle, endAngle, counterclockwise) {
    Painter.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
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
    Painter.lines.beginPath();
    this.arc(x, y, radius, 0, Math.PI * 2);
    Painter.colors.stroke(color, lineWidth);
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
    Painter.lines.beginPath();
    this.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (color) Painter.fillStyle = color;
    Painter.colors.fill(color);
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
    Painter.lines.beginPath();
    this.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (color) Painter.strokeStyle = color;
    if (lineWidth !== undefined) Painter.lineWidth = lineWidth;
    Painter.colors.stroke(color, lineWidth);
  }

  static ellipse(
    x,
    y,
    radiusX,
    radiusY,
    rotation,
    startAngle,
    endAngle,
    counterclockwise
  ) {
    Painter.ctx.ellipse(
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise
    );
  }

  /**
   * Draw a polygon
   * @param {Array<{x: number, y: number}>} points - Array of points
   * @param {string|CanvasGradient} [fillColor] - Fill color
   * @param {string|CanvasGradient} [strokeColor] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static polygon(points, fillColor, strokeColor, lineWidth, lineJoin) {
    if (points.length < 2) return;

    const ctx = Painter.ctx;
    
    // Build the path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();

    // Fill using Painter.colors (sets fillStyle and calls fill)
    if (fillColor) {
      Painter.colors.fill(fillColor);
    }

    // Stroke using Painter.colors
    if (strokeColor) {
      if (lineJoin) ctx.lineJoin = lineJoin;
      Painter.colors.stroke(strokeColor, lineWidth);
    }
  }
}
