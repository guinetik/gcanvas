import { Text } from "../objects/text.js";

/**
 * FPSCounter - Live FPS display in-game.
 */
export class FPSCounter extends Text {
  constructor(game, options = {}) {
    const anchor = options.anchor || null;
    const padding = options.padding ?? 10;

    // Compute dynamic position & alignment
    const { x, y, align, baseline } = FPSCounter.resolveAnchor(
      anchor,
      game,
      padding
    );

    super(game, "0 FPS", {
      x: options.x ?? x,
      y: options.y ?? y,
      font: options.font || "12px monospace",
      color: options.color || "#0f0",
      align: options.align || align,
      baseline: options.baseline || baseline,
      stroke: options.stroke || false,
      strokeColor: options.strokeColor || "#000",
      lineWidth: options.lineWidth || 1,
    });

    this.anchor = anchor;
    this.padding = padding;
    this.fps = 0;
    this._frames = 0;
    this._accum = 0;
  }

  static resolveAnchor(anchor, game, padding) {
    const w = game.width;
    const h = game.height;

    switch (anchor) {
      case "top-left":
        return { x: padding, y: padding, align: "left", baseline: "top" };
      case "top-right":
        return { x: w - padding, y: padding, align: "right", baseline: "top" };
      case "bottom-left":
        return {
          x: padding,
          y: h - padding,
          align: "left",
          baseline: "bottom",
        };
      case "bottom-right":
        return {
          x: w - padding,
          y: h - padding,
          align: "right",
          baseline: "bottom",
        };
      default:
        return { x: 10, y: 10, align: "left", baseline: "top" };
    }
  }

  update(dt) {
    this._frames++;
    this._accum += dt;

    if (this._accum >= 0.5) {
      this.fps = Math.round(this._frames / this._accum);
      this.text = `${this.fps} FPS`;
      this._frames = 0;
      this._accum = 0;
    }

    if (this.anchor) {
      const { x, y } = FPSCounter.resolveAnchor(this.anchor, this.game, this.padding);
      this.x = x;
      this.y = y;
      //console.log(this.x, this.y);
    }
    
  }
}
