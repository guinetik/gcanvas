import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";
/**
 * TextShape - A drawable text shape that supports rotation, scaling, and grouping.
 * Intended for use inside a Group.
 *
 * @extends Shape
 */
export class TextShape extends Shape {
  /**
   * Create a text shape
   *
   * @param {string} text - The text content
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.font="12px monospace"] - CSS font string
   * @param {string} [options.color="#000"] - Text color
   * @param {string} [options.align="center"] - Text alignment (left, center, right)
   * @param {string} [options.baseline="middle"] - Text baseline (top, middle, bottom)
   */
  constructor(text, options = {}) {
    super(options);
    this._text = text;
    this._font = options.font || "12px monospace";
    this._color = options.color || "yellow";
    this._align = options.align || "center";
    this._baseline = options.baseline || "middle";

    // Calculate initial bounds
    this._calculateBounds();
    this._calculateAlignmentOffsets();
  }

  /**
   * Draw the text using Painter
   *
   * Text is drawn at an offset based on both:
   * 1. The origin offset (for positioning)
   * 2. The alignment offset (for text alignment within bounds)
   */
  draw() {
    super.draw();
    this.logger.log("draw", this.font, this.color, this.opacity);
    Painter.text.setFont(this.font);
    Painter.text.setTextAlign(this.align);
    Painter.text.setTextBaseline(this.baseline);
    
    // Calculate origin offset (same pattern as other shapes)
    const originOffsetX = -this.width * this.originX;
    const originOffsetY = -this.height * this.originY;
    
    // Apply both origin offset and alignment offset
    // The alignment offset centers text within the bounding box
    // The origin offset positions the bounding box based on origin
    const drawX = originOffsetX + this.width / 2 - this._centerOffsetX;
    const drawY = originOffsetY + this.height / 2 - this._centerOffsetY;
    
    Painter.text.fillText(this.text, drawX, drawY, this.color);
  }

  _calculateAlignmentOffsets() {
    // Save current canvas context
    if (!Painter.text) return;
    // Measure text dimensions
    const metrics = Painter.text.measureTextDimensions(this.text, this.font);

    // Calculate horizontal center point offset
    // Goal: center the text bounding box at (0, 0) in local coordinates
    // We draw at (-_centerOffsetX), so:
    //   left:   draw at -width/2 so text spans [-width/2, +width/2]
    //   center: draw at 0 (already centered)
    //   right:  draw at +width/2 so text spans [-width/2, +width/2]
    switch (this._align) {
      case "left":
        this._centerOffsetX = metrics.width / 2;
        break;
      case "center":
        this._centerOffsetX = 0;
        break;
      case "right":
        this._centerOffsetX = -metrics.width / 2;
        break;
    }

    // Calculate vertical center point offset
    // Goal: center the text bounding box at (0, 0) in local coordinates
    // We draw at (-_centerOffsetY), so:
    //   top:    draw at -height/2 so text spans [-height/2, +height/2]
    //   middle: draw at 0 (already centered)
    //   bottom: draw at +height/2 so text spans [-height/2, +height/2]
    switch (this._baseline) {
      case "top":
        this._centerOffsetY = metrics.height / 2;
        break;
      case "middle":
        this._centerOffsetY = 0;
        break;
      case "bottom":
        this._centerOffsetY = -metrics.height / 2;
        break;
    }
  }

  getTextBounds() {
    if (Painter.text) {
      // Measure the text dimensions
      const metrics = Painter.text.measureTextDimensions(this.text, this.font);
      // Add padding
      const padding = 2;
      return {
        x: this._centerOffsetX - metrics.width / 2,
        y: this._centerOffsetY - metrics.height / 2,
        width: metrics.width + padding * 2,
        height: metrics.height + padding * 2,
      };
    }
    // Fallback
    return {
      x: this._centerOffsetX,
      y: this._centerOffsetY,
      width: this._width,
      height: this._height,
    };
  }

  /**
   * Overridden _calculateBounds to include alignment offsets
   * @private
   */
  _calculateBounds() {
    if (Painter.text) {
      // Measure the text dimensions
      const metrics = Painter.text.measureTextDimensions(this.text, this.font);

      // Set dimensions based on measurements
      this._width = metrics.width;
      this._height = metrics.height;

      // Calculate alignment offsets
      this._calculateAlignmentOffsets();
    } else {
      // Fallback if Painter not available
      this._width = this.text ? this.text.length * 8 : 0;
      this._height = 16;
    }
    this.trace(
      "TextShape.calculateBounds: " + this._width + "x" + this._height
    );
  }

  /**
   * Debug bounds should match text bounds, accounting for origin offset.
   * @returns {Object} Debug bounds with width and height
   */
  getDebugBounds() {
    // Calculate origin offset (same pattern as other shapes)
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    
    return {
      x: offsetX,
      y: offsetY,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Check if a property has changed and update bounds if needed
   * @param {*} value - New value
   * @param {*} oldValue - Previous value
   * @private
   */
  checkDirty(value, oldValue) {
    if (value !== oldValue) {
      this._boundsDirty = true;
      this._calculateBounds();
    }
  }

  // Getters and setters

  get text() {
    return this._text;
  }

  set text(value) {
    this.checkDirty(value, this._text);
    this._text = value;
  }

  get font() {
    return this._font;
  }

  set font(value) {
    this.checkDirty(value, this._font);
    this._font = value;
  }

  get color() {
    return this._color;
  }

  set color(value) {
    this._color = value;
  }

  get align() {
    return this._align;
  }

  set align(value) {
    this.checkDirty(value, this._align);
    this._align = value;
  }

  get baseline() {
    return this._baseline;
  }

  set baseline(value) {
    this.checkDirty(value, this._baseline);
    this._baseline = value;
  }
}

/**
 * OutlinedText - A text shape with a stroke outline.
 *
 * Draws text with both fill and stroke for an outlined effect.
 */
export class OutlinedText extends Shape {
  /**
   * @param {number} x - X coordinate (or center X if centered)
   * @param {number} y - Y coordinate (or center Y if centered)
   * @param {string} text - Text content
   * @param {Object} [options] - Shape rendering options
   * @param {boolean} [options.centered=false] - Whether the text is positioned from its center
   * @param {string} [options.color='#000000'] - Text fill color
   * @param {string} [options.stroke='#FFFFFF'] - Text stroke color
   * @param {number} [options.lineWidth=1] - Width of the text outline
   * @param {string} [options.font] - Font specification
   * @param {string} [options.align='left'] - Text alignment ('left', 'center', 'right')
   * @param {string} [options.baseline='alphabetic'] - Text baseline
   */
  constructor(x, y, text, options = {}) {
    super(x, y, options);
    this.text = text;
    // Text-specific options
    this.centered = options.centered || false;
    this.color = options.color || "#000000";
    this.stroke = options.stroke || "#FFFFFF";
    this.lineWidth = options.lineWidth || 1;
    this.font = options.font || null;
    this.align = options.align || "left";
    this.baseline = options.baseline || "alphabetic";
    // Calculate text dimensions
    this.calculateDimensions();
  }

  /**
   * Calculate the dimensions of the text
   * @private
   */
  calculateDimensions() {
    if (!Painter.ctx) {
      console.warn(
        "Painter context not initialized. Cannot calculate text dimensions."
      );
      this.width = 0;
      this.height = 0;
      return;
    }

    // Save current context settings
    const currentFont = Painter.text.font();

    // Apply font if provided
    if (this.font) Painter.text.setFont(this.font);

    // Measure the text
    const metrics = Painter.text.measureText(this.text);

    // Set dimensions
    this.width = metrics.width;

    // Approximate height from font size if available
    if (this.font) {
      const fontSize = parseInt(this.font);
      this.height = isNaN(fontSize) ? 20 : fontSize; // Default to 20 if parsing fails
    } else {
      // Try to get height from metrics (newer browsers) or estimate
      this.height =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
        20;
    }

    // Add a bit of padding for the stroke
    this.width += this.lineWidth * 2;
    this.height += this.lineWidth * 2;

    // Restore font
    Painter.text.setFont(currentFont);
  }

  /**
   * Update the text content
   * @param {string} text - New text content
   */
  setText(text) {
    this.text = text;
    this.calculateDimensions();
  }

  /**
   * Renders the outlined text
   */
  draw() {
    super.draw();

    // Handle case where Painter context isn't initialized yet
    if (!Painter.ctx) {
      console.warn("Painter context not initialized. Cannot draw text.");
      return;
    }

    // Calculate the starting position
    let xPos = 0;
    let yPos = 0;

    // Apply text settings
    if (this.font) Painter.text.setFont(this.font);
    Painter.text.setTextAlign(this.align);
    Painter.text.setTextBaseline(this.baseline);

    // Adjust for centered positioning
    if (this.centered) {
      // No adjustment needed as textAlign will handle this
      if (this.baseline === "middle" || this.baseline === "alphabetic") {
        yPos = 0;
      } else if (this.baseline === "top") {
        yPos = this.height / 2;
      } else if (this.baseline === "bottom") {
        yPos = -this.height / 2;
      }
    }

    // Draw the outlined text using Painter's outlinedText method
    Painter.outlinedText(
      this.text,
      xPos,
      yPos,
      this.color,
      this.stroke,
      this.lineWidth,
      this.font
    );
  }

  getBounds() {
    // Use the canvas context directly for precision
    if (!Painter.ctx) {
      return super.getBounds(); // fallback
    }

    // Save current font and apply the text style
    const prevFont = Painter.text.font();
    Painter.text.setFont(this.font);

    const metrics = Painter.text.measureText(this.text);
    const width = metrics.width;
    const height =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
      parseInt(this.font) ||
      20;

    Painter.text.setFont(prevFont);

    this.width = width;
    this.height = height;

    return {
      x: this.x,
      y: this.y,
      width,
      height,
    };
  }
}

/**
 * WrappedText - A text shape that automatically wraps to fit within a specified width.
 *
 * Draws text that wraps to new lines when it exceeds a maximum width.
 */
export class WrappedText extends Shape {
  /**
   * @param {number} x - Left X coordinate (or center if centered=true)
   * @param {number} y - Top Y coordinate (or center if centered=true)
   * @param {string} text - Text content
   * @param {number} maxWidth - Maximum width before wrapping
   * @param {number} [lineHeight=20] - Line height for wrapped text
   * @param {Object} [options] - Shape rendering options
   * @param {boolean} [options.centered=false] - Whether the text is positioned from its center
   * @param {string} [options.color='#000000'] - Text fill color
   * @param {string} [options.font] - Font specification
   * @param {string} [options.align='left'] - Text alignment ('left', 'center', 'right')
   * @param {string} [options.baseline='top'] - Text baseline
   */
  constructor(x, y, text, maxWidth, lineHeight = 20, options = {}) {
    super(x, y, options);

    this.text = text;
    this.maxWidth = maxWidth;
    this.lineHeight = lineHeight;

    // Text-specific options
    this.centered = options.centered || false;
    this.color = options.color || "#000000";
    this.font = options.font || null;
    this.align = options.align || "left";
    this.baseline = options.baseline || "top";

    // For outlined text
    this.outlineColor = options.outlineColor || null;
    this.outlineWidth = options.outlineWidth || 1;

    // Calculate wrapped text dimensions
    this.calculateDimensions();
  }

  /**
   * Calculate the dimensions of the wrapped text
   * @private
   */
  calculateDimensions() {
    if (!Painter.ctx) {
      console.warn(
        "Painter context not initialized. Cannot calculate text dimensions."
      );
      this.width = this.maxWidth;
      this.height = this.lineHeight;
      this.lines = [this.text];
      return;
    }

    // Save current context settings
    const currentFont = Painter.text.font();
    const currentAlign = Painter.text.textAlign();
    const currentBaseline = Painter.text.textBaseline();

    // Apply text settings
    if (this.font) Painter.text.setFont(this.font);
    Painter.text.setTextAlign("left"); // Always left-align for measurement
    Painter.text.setTextBaseline("top");

    // Calculate wrapped lines and dimensions
    const words = this.text.split(" ");
    let line = "";
    let testLine = "";
    this.lines = [];
    this.width = 0;

    for (let i = 0; i < words.length; i++) {
      testLine = line + words[i] + " ";
      const metrics = Painter.text.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > this.maxWidth && i > 0) {
        this.lines.push(line);
        this.width = Math.max(this.width, Painter.text.measureText(line).width);
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }

    // Add the last line
    this.lines.push(line);
    this.width = Math.max(this.width, Painter.text.measureText(line).width);
    this.height = this.lines.length * this.lineHeight;

    // Restore context settings
    Painter.text.setFont(currentFont);
    Painter.text.setTextAlign(currentAlign);
    Painter.text.setTextBaseline(currentBaseline);
  }

  /**
   * Update the text content
   * @param {string} text - New text content
   */
  setText(text) {
    this.text = text;
    this.calculateDimensions();
  }

  /**
   * Renders the wrapped text
   */
  draw() {
    super.draw();

    // Handle case where Painter context isn't initialized yet
    if (!Painter.ctx) {
      console.warn("Painter context not initialized. Cannot draw text.");
      return;
    }

    // Calculate the starting position
    let xPos = 0;
    let yPos = 0;

    // Adjust for centered positioning
    if (this.centered) {
      xPos = -this.width / 2;
      yPos = -this.height / 2;
    }

    // Apply text settings
    if (this.font) Painter.text.setFont(this.font);
    Painter.text.setTextAlign(this.align);
    Painter.text.setTextBaseline(this.baseline);

    // Adjust x based on alignment
    let alignmentX = xPos;
    if (this.align === "center") {
      alignmentX = 0;
    } else if (this.align === "right") {
      alignmentX = xPos + this.width;
    }

    // Draw each line
    for (let i = 0; i < this.lines.length; i++) {
      const lineY = yPos + i * this.lineHeight;

      if (this.outlineColor) {
        // Draw outlined text
        Painter.outlinedText(
          this.lines[i],
          alignmentX,
          lineY,
          this.color,
          this.outlineColor,
          this.outlineWidth,
          this.font
        );
      } else {
        // Draw regular text
        Painter.text.fillText(
          this.lines[i],
          alignmentX,
          lineY,
          this.color,
          this.font
        );
      }
    }
  }

  /**
   * Returns the bounding box
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    if (this.centered) {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
      };
    } else {
      return {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        width: this.width,
        height: this.height,
      };
    }
  }
}
