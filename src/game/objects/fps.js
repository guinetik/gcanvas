import { Text } from "./text.js";

/**
 * FPSCounter - Live FPS display in-game.
 */
export class FPSCounter extends Text {
  constructor(game, options = {}) {
    super(game, "0 FPS", {
      x: options.x || 10,
      y: options.y || 10,
      font: options.font || "12px monospace",
      color: options.color || "#0f0",
      align: options.align || "left",
      baseline: options.baseline || "top",
      stroke: options.stroke || false,
      strokeColor: options.strokeColor || "#000",
      lineWidth: options.lineWidth || 1,
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
  }
}
