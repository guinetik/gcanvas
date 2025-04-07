import { Text } from "../objects/text.js";

export class FPSCounter extends Text {
  constructor(game, options = {}) {
    super(game, "0 FPS", {
      x: 0,
      y: 0,
      font: options.font || "12px monospace",
      color: options.color || "#0f0",
      align: options.align,
      baseline: options.baseline,
      stroke: options.stroke || false,
      strokeColor: options.strokeColor || "#000",
      lineWidth: options.lineWidth || 1,
      anchor: options.anchor || "top-left",
    });

    this.fps = 0;
    this._frames = 0;
    this._accum = 0;
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

    super.update?.(dt); // in case anchor calls it
  }
}
