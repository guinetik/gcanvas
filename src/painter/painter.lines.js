import { Painter } from "./painter";

export class PainterLines {
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
      Painter.colors.fill(fill);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      Painter.colors.stroke();
    }
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
    Painter.colors.stroke(color, lineWidth);
  }

  /**
   * Start a new path
   * @returns {void}
   */
  static beginPath() {
    Painter.ctx.beginPath();
  }

  /**
   * Close the current path
   * @returns {void}
   */
  static closePath() {
    Painter.ctx.closePath();
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
    Painter.colors.stroke();

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
    return Painter.lines.dashedLine(
      x1,
      y1,
      x2,
      y2,
      [dotSize, gap],
      color,
      dotSize
    );
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
   * Set line width
   * @param {number} width - Line width
   * @returns {void}
   */
  static setLineWidth(width) {
    Painter.ctx.lineWidth = width;
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
    Painter.colors.stroke();
  }
}
