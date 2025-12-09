import { Painter } from "./painter";
export class PainterText {

  static font() {
    return Painter.ctx.font;
  }

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
   * Improved text measurement that accounts for baseline adjustments
   * @param {string} text - Text to measure
   * @param {string} [font] - Font specification
   * @param {string} [align="start"] - Text alignment
   * @param {string} [baseline="alphabetic"] - Text baseline
   * @returns {{width: number, height: number, verticalAdjustment: number}} Text dimensions with adjustment
   */
  static measureTextDimensions(
    text,
    font,
    align = "start",
    baseline = "alphabetic"
  ) {
    if (font) Painter.ctx.font = font;
    const metrics = Painter.ctx.measureText(text);
    const width = metrics.width;
    const height =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    // Calculate vertical adjustment based on baseline
    let verticalAdjustment = 0;

    if (baseline === "middle") {
      // For middle baseline, text is visually slightly higher than the mathematical middle
      // This small correction factor improves visual alignment
      verticalAdjustment = -1.5; // Empirically determined adjustment
    }

    return {
      width: width,
      height: height,
      verticalAdjustment: verticalAdjustment,
    };
  }

  /**
   * Measure text width
   * @param {string} text - Text to measure
   * @returns {number} Text width
   */
  static measureTextWidth(text, font) {
    if (font) Painter.ctx.font = font;
    return Painter.ctx.measureText(text).width;
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
}
