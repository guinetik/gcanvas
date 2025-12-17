import { GameObject } from "../objects/go.js";
import { Rectangle, TextShape, Group } from "../../shapes/index.js";

/**
 * Tooltip
 *
 * A GameObject that displays text near the cursor when shown.
 * Useful for showing information on hover.
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
   */
  constructor(game, options = {}) {
    super(game, { ...options, zIndex: 9999 }); // Always on top

    this.font = options.font || "12px monospace";
    this.textColor = options.textColor || "#fff";
    this.bgColor = options.bgColor || "rgba(0,0,0,0.85)";
    this.borderColor = options.borderColor || "rgba(255,255,255,0.3)";
    this.padding = options.padding ?? 8;
    this.offsetX = options.offsetX ?? 15;
    this.offsetY = options.offsetY ?? 15;
    this.maxWidth = options.maxWidth ?? 300;

    // Current text
    this._text = "";
    this._visible = false;

    // Create shapes
    this.bg = new Rectangle({
      width: 100,
      height: 30,
      color: this.bgColor,
      stroke: this.borderColor,
      lineWidth: 1,
    });

    this.label = new TextShape("", {
      font: this.font,
      color: this.textColor,
      align: "left",
      baseline: "middle",
    });

    this.group = new Group();
    this.group.add(this.bg);
    this.group.add(this.label);

    // Follow mouse
    this.game.events.on("inputmove", (e) => {
      if (this._visible) {
        this.updatePosition(e.x, e.y);
      }
    });
  }

  /**
   * Show the tooltip with the given text at the specified position.
   * @param {string} text - Text to display.
   * @param {number} [mouseX] - X position (defaults to current mouse).
   * @param {number} [mouseY] - Y position (defaults to current mouse).
   */
  show(text, mouseX, mouseY) {
    this._text = text;
    this._visible = true;
    this.label.text = text;

    // Measure text to size background
    this.updateSize();

    if (mouseX !== undefined && mouseY !== undefined) {
      this.updatePosition(mouseX, mouseY);
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
   * Update the background size based on text.
   */
  updateSize() {
    // Use canvas measureText for accurate width
    const ctx = this.game.ctx;
    ctx.font = this.font;
    const metrics = ctx.measureText(this._text);
    const textWidth = Math.min(metrics.width, this.maxWidth);
    const textHeight = parseInt(this.font) * 1.4;

    this.bg.width = textWidth + this.padding * 2;
    this.bg.height = textHeight + this.padding * 2;

    // Position label inside bg (left-aligned, vertically centered)
    this.label.x = -this.bg.width / 2 + this.padding;
    this.label.y = 0; // Vertically centered (baseline: middle)
  }

  /**
   * Render the tooltip if visible.
   */
  draw() {
    if (!this._visible) return;
    this.group.render();
  }
}
