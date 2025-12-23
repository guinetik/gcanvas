import { GameObject } from "../objects/go.js";
import { Rectangle, TextShape, Group } from "../../shapes/index.js";
import { UI_THEME } from "./theme.js";

/**
 * Tooltip
 *
 * A GameObject that displays text near the cursor when shown.
 * Supports multiline text with automatic word wrapping.
 * 
 * Theme: Terminal × Vercel aesthetic
 * - Dark translucent background
 * - Subtle green border glow
 * - Neon green monospace text
 *
 * Usage:
 *   const tooltip = new Tooltip(game, { ... });
 *   game.pipeline.add(tooltip);
 *
 *   // On hover:
 *   tooltip.show("Hello world", e.x, e.y);
 *
 *   // On mouse out:
 *   tooltip.hide();
 */
export class Tooltip extends GameObject {
  /**
   * @param {Game} game - The main game instance.
   * @param {object} [options={}] - Configuration options.
   * @param {string} [options.font="12px monospace"] - Font for the text.
   * @param {string} [options.textColor="#fff"] - Text color.
   * @param {string} [options.bgColor="rgba(0,0,0,0.85)"] - Background color.
   * @param {string} [options.borderColor="rgba(255,255,255,0.3)"] - Border color.
   * @param {number} [options.padding=8] - Padding inside the tooltip.
   * @param {number} [options.offsetX=15] - X offset from cursor.
   * @param {number} [options.offsetY=15] - Y offset from cursor.
   * @param {number} [options.maxWidth=300] - Maximum width before wrapping.
   * @param {number} [options.lineHeight=1.4] - Line height multiplier.
   */
  constructor(game, options = {}) {
    super(game, { ...options, zIndex: 9999 }); // Always on top

    // Terminal × Vercel theme defaults
    this.font = options.font || UI_THEME.fonts.small;
    this.textColor = options.textColor || UI_THEME.tooltip.text;
    this.bgColor = options.bgColor || UI_THEME.tooltip.bg;
    this.borderColor = options.borderColor || UI_THEME.tooltip.border;
    this.padding = options.padding ?? 8;
    this.offsetX = options.offsetX ?? 15;
    this.offsetY = options.offsetY ?? 15;
    this.maxWidth = options.maxWidth ?? 300;
    this.lineHeightMultiplier = options.lineHeight ?? 1.4;

    // Current text and wrapped lines
    this._text = "";
    this._lines = [];
    this._visible = false;

    // Create background shape
    this.bg = new Rectangle({
      width: 100,
      height: 30,
      color: this.bgColor,
      stroke: this.borderColor,
      lineWidth: 1,
    });

    // Line shapes will be created dynamically
    this.lineShapes = [];

    this.group = new Group();
    this.group.add(this.bg);

    // Follow mouse
    this.game.events.on("inputmove", (e) => {
      if (this._visible) {
        this.updatePosition(e.x, e.y);
      }
    });
  }

  /**
   * Wrap text into multiple lines based on maxWidth.
   * @param {string} text - Text to wrap.
   * @returns {string[]} Array of lines.
   */
  wrapText(text) {
    const ctx = this.game.ctx;
    ctx.font = this.font;

    const lines = [];
    // Split by explicit newlines first
    const paragraphs = text.split("\n");

    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > this.maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      } else if (paragraph === "") {
        lines.push(""); // Preserve empty lines
      }
    }

    return lines;
  }

  /**
   * Show the tooltip with the given text at the specified position.
   * @param {string} text - Text to display (supports newlines and auto-wrapping).
   * @param {number} [mouseX] - X position (defaults to current mouse).
   * @param {number} [mouseY] - Y position (defaults to current mouse).
   */
  show(text, mouseX, mouseY) {
    this._text = text;
    this._visible = true;

    // Wrap text into lines
    this._lines = this.wrapText(text);

    // Create/update line shapes
    this.updateLineShapes();

    // Measure text to size background
    this.updateSize();

    if (mouseX !== undefined && mouseY !== undefined) {
      this.updatePosition(mouseX, mouseY);
    }
  }

  /**
   * Create or update TextShape objects for each line.
   */
  updateLineShapes() {
    // Remove old line shapes from group
    for (const shape of this.lineShapes) {
      this.group.remove(shape);
    }

    // Create new line shapes
    this.lineShapes = this._lines.map(
      (line) =>
        new TextShape(line, {
          font: this.font,
          color: this.textColor,
          align: "left",
          baseline: "top",
        })
    );

    // Add to group
    for (const shape of this.lineShapes) {
      this.group.add(shape);
    }
  }

  /**
   * Hide the tooltip.
   */
  hide() {
    this._visible = false;
  }

  /**
   * Update the tooltip position, keeping it on screen.
   * Positions tooltip so its top-left is at cursor + offset.
   * @param {number} mouseX - Mouse X position.
   * @param {number} mouseY - Mouse Y position.
   */
  updatePosition(mouseX, mouseY) {
    const width = this.bg.width;
    const height = this.bg.height;

    // Position so top-left corner is at cursor + offset
    // (since tooltip renders centered, add half width/height)
    let x = mouseX + this.offsetX + width / 2;
    let y = mouseY + this.offsetY + height / 2;

    // Keep tooltip on screen - adjust if going off right edge
    if (x + width / 2 > this.game.width) {
      x = mouseX - this.offsetX - width / 2;
    }

    // Adjust if going off bottom edge
    if (y + height / 2 > this.game.height) {
      y = mouseY - this.offsetY - height / 2;
    }

    // Adjust if going off left edge
    if (x - width / 2 < 0) {
      x = width / 2 + 5;
    }

    // Adjust if going off top edge
    if (y - height / 2 < 0) {
      y = height / 2 + 5;
    }

    this.x = x;
    this.y = y;
  }

  /**
   * Update the background size based on wrapped text lines.
   */
  updateSize() {
    const ctx = this.game.ctx;
    ctx.font = this.font;

    // Find widest line
    let maxLineWidth = 0;
    for (const line of this._lines) {
      const metrics = ctx.measureText(line);
      maxLineWidth = Math.max(maxLineWidth, metrics.width);
    }

    const textWidth = Math.min(maxLineWidth, this.maxWidth);
    const fontSize = parseInt(this.font);
    const lineHeight = fontSize * this.lineHeightMultiplier;
    const textHeight = lineHeight * this._lines.length;

    this.bg.width = textWidth + this.padding * 2;
    this.bg.height = textHeight + this.padding * 2;

    // Position each line inside bg
    const startX = -this.bg.width / 2 + this.padding;
    const startY = -this.bg.height / 2 + this.padding;

    for (let i = 0; i < this.lineShapes.length; i++) {
      this.lineShapes[i].x = startX;
      this.lineShapes[i].y = startY + i * lineHeight;
    }
  }

  /**
   * Render the tooltip if visible.
   */
  draw() {
    if (!this._visible) return;
    this.group.render();
  }
}
