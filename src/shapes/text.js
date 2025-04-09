import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

/**
 * TextShape - A drawable text shape that supports rotation, scaling, and grouping.
 * Intended for use inside a Group.
 */
export class TextShape extends Shape {
  /**
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {object} options
   * @param {string} [options.font="12px monospace"]
   * @param {string} [options.color="#000"]
   * @param {string} [options.align="center"]
   * @param {string} [options.baseline="top"]
   */
  constructor(x, y, text, options = {}) {
    super(x, y, options);
    this.text = text;
    this.font = options.font || "12px monospace";
    this.color = options.color || "#000";
    this.align = options.align || "center";
    this.baseline = options.baseline || "top";
  }

  draw() {
    super.draw();
    this.renderWithTransform(() => {
      Painter.setFont(this.font);
      Painter.setTextAlign(this.align);
      Painter.setTextBaseline(this.baseline);
      Painter.fillText(this.text, 0, 0, this.color);
    });
  }

  getBounds() {
    this.width = Painter.measureText(this.text);
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: parseInt(this.font), // rough height guess from font size
    };
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
   * @param {string} [options.fillColor='#000000'] - Text fill color
   * @param {string} [options.strokeColor='#FFFFFF'] - Text stroke color
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
    this.fillColor = options.fillColor || '#000000';
    this.strokeColor = options.strokeColor || '#FFFFFF';
    this.lineWidth = options.lineWidth || 1;
    this.font = options.font || null;
    this.align = options.align || 'left';
    this.baseline = options.baseline || 'alphabetic';
    
    // Calculate text dimensions
    this.calculateDimensions();
  }

  /**
   * Calculate the dimensions of the text
   * @private
   */
  calculateDimensions() {
    if (!Painter.ctx) {
      console.warn('Painter context not initialized. Cannot calculate text dimensions.');
      this.width = 0;
      this.height = 0;
      return;
    }
    
    // Save current context settings
    const currentFont = Painter.ctx.font;
    
    // Apply font if provided
    if (this.font) Painter.ctx.font = this.font;
    
    // Measure the text
    const metrics = Painter.ctx.measureText(this.text);
    
    // Set dimensions
    this.width = metrics.width;
    
    // Approximate height from font size if available
    if (this.font) {
      const fontSize = parseInt(this.font);
      this.height = isNaN(fontSize) ? 20 : fontSize; // Default to 20 if parsing fails
    } else {
      // Try to get height from metrics (newer browsers) or estimate
      this.height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 20;
    }
    
    // Add a bit of padding for the stroke
    this.width += this.lineWidth * 2;
    this.height += this.lineWidth * 2;
    
    // Restore font
    Painter.ctx.font = currentFont;
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
      console.warn('Painter context not initialized. Cannot draw text.');
      return;
    }
    
    this.renderWithTransform(() => {
      // Calculate the starting position
      let xPos = 0;
      let yPos = 0;
      
      // Apply text settings
      if (this.font) Painter.ctx.font = this.font;
      Painter.ctx.textAlign = this.align;
      Painter.ctx.textBaseline = this.baseline;
      
      // Adjust for centered positioning
      if (this.centered) {
        // No adjustment needed as textAlign will handle this
        if (this.baseline === 'middle' || this.baseline === 'alphabetic') {
          yPos = 0;
        } else if (this.baseline === 'top') {
          yPos = this.height / 2;
        } else if (this.baseline === 'bottom') {
          yPos = -this.height / 2;
        }
      }
      
      // Draw the outlined text using Painter's outlinedText method
      Painter.outlinedText(
        this.text,
        xPos,
        yPos,
        this.fillColor,
        this.strokeColor,
        this.lineWidth,
        this.font
      );
    });
  }

  /**
   * Returns the bounding box
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    let x = this.x;
    let y = this.y;
    
    // Adjust for non-centered positioning
    if (!this.centered) {
      if (this.align === 'left') {
        x += this.width / 2;
      } else if (this.align === 'right') {
        x -= this.width / 2;
      }
      
      if (this.baseline === 'top') {
        y += this.height / 2;
      } else if (this.baseline === 'bottom') {
        y -= this.height / 2;
      }
    }
    
    return {
      x: x,
      y: y,
      width: this.width,
      height: this.height
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
   * @param {string} [options.fillColor='#000000'] - Text fill color 
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
    this.fillColor = options.fillColor || '#000000';
    this.font = options.font || null;
    this.align = options.align || 'left';
    this.baseline = options.baseline || 'top';
    
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
      console.warn('Painter context not initialized. Cannot calculate text dimensions.');
      this.width = this.maxWidth;
      this.height = this.lineHeight;
      this.lines = [this.text];
      return;
    }
    
    // Save current context settings
    const currentFont = Painter.ctx.font;
    const currentAlign = Painter.ctx.textAlign;
    const currentBaseline = Painter.ctx.textBaseline;
    
    // Apply text settings
    if (this.font) Painter.ctx.font = this.font;
    Painter.ctx.textAlign = 'left'; // Always left-align for measurement
    Painter.ctx.textBaseline = 'top';
    
    // Calculate wrapped lines and dimensions
    const words = this.text.split(' ');
    let line = '';
    let testLine = '';
    this.lines = [];
    this.width = 0;
    
    for (let i = 0; i < words.length; i++) {
      testLine = line + words[i] + ' ';
      const metrics = Painter.ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > this.maxWidth && i > 0) {
        this.lines.push(line);
        this.width = Math.max(this.width, Painter.ctx.measureText(line).width);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    
    // Add the last line
    this.lines.push(line);
    this.width = Math.max(this.width, Painter.ctx.measureText(line).width);
    this.height = this.lines.length * this.lineHeight;
    
    // Restore context settings
    Painter.ctx.font = currentFont;
    Painter.ctx.textAlign = currentAlign;
    Painter.ctx.textBaseline = currentBaseline;
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
      console.warn('Painter context not initialized. Cannot draw text.');
      return;
    }
    
    this.renderWithTransform(() => {
      // Calculate the starting position
      let xPos = 0;
      let yPos = 0;
      
      // Adjust for centered positioning
      if (this.centered) {
        xPos = -this.width / 2;
        yPos = -this.height / 2;
      }
      
      // Apply text settings
      if (this.font) Painter.ctx.font = this.font;
      Painter.ctx.textAlign = this.align;
      Painter.ctx.textBaseline = this.baseline;
      
      // Adjust x based on alignment
      let alignmentX = xPos;
      if (this.align === 'center') {
        alignmentX = 0;
      } else if (this.align === 'right') {
        alignmentX = xPos + this.width;
      }
      
      // Draw each line
      for (let i = 0; i < this.lines.length; i++) {
        const lineY = yPos + (i * this.lineHeight);
        
        if (this.outlineColor) {
          // Draw outlined text
          Painter.outlinedText(
            this.lines[i],
            alignmentX,
            lineY,
            this.fillColor,
            this.outlineColor,
            this.outlineWidth,
            this.font
          );
        } else {
          // Draw regular text
          Painter.fillText(
            this.lines[i],
            alignmentX,
            lineY,
            this.fillColor,
            this.font
          );
        }
      }
    });
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
        height: this.height
      };
    } else {
      return {
        x: this.x + (this.width / 2),
        y: this.y + (this.height / 2),
        width: this.width,
        height: this.height
      };
    }
  }
}