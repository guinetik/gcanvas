/**
 * StarField - Pre-rendered starfield with parallax scrolling
 *
 * Uses offscreen canvas for efficient rendering of 3000+ stars.
 * Tiles and scrolls based on camera rotation for parallax effect.
 */
import { GameObject, Painter } from "../../../src/index.js";

const STAR_CANVAS_SIZE = 2000;

export class StarField extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options
   * @param {Camera3D} options.camera - Camera for parallax scrolling
   * @param {number} [options.starCount=3000] - Number of stars to render
   */
  constructor(game, options = {}) {
    super(game, options);
    this.camera = options.camera;
    this.starCount = options.starCount ?? 3000;
    this.starCanvas = null;
    this.zIndex = -1000; // Render behind everything
  }

  /**
   * Generate the starfield on an offscreen canvas.
   * Called once during initialization.
   */
  generateStarfield() {
    this.starCanvas = document.createElement("canvas");
    this.starCanvas.width = STAR_CANVAS_SIZE;
    this.starCanvas.height = STAR_CANVAS_SIZE;
    const sCtx = this.starCanvas.getContext("2d");

    for (let i = 0; i < this.starCount; i++) {
      const x = Math.random() * STAR_CANVAS_SIZE;
      const y = Math.random() * STAR_CANVAS_SIZE;
      const brightness = Math.random();
      // Rare bright stars are larger
      const size =
        brightness < 0.95 ? Math.random() * 1.5 : 1.5 + Math.random() * 1.5;

      // Slight color variation (blue-white to yellow-white)
      const temp = Math.random();
      const r = 255;
      const g = 240 + Math.random() * 15;
      const b = temp < 0.3 ? 255 : 200 + Math.random() * 55;

      sCtx.fillStyle = `rgba(${r},${g},${b},${0.3 + brightness * 0.7})`;
      sCtx.fillRect(x, y, size, size);

      // Add glow to brighter stars
      if (brightness > 0.85) {
        sCtx.fillStyle = `rgba(255,255,255,${brightness * 0.15})`;
        sCtx.fillRect(x - 1, y - 1, size + 2, size + 2);
      }
    }
  }

  /**
   * Initialize the starfield.
   * Called when added to pipeline.
   */
  init() {
    this.generateStarfield();
  }

  draw() {
    if (!this.starCanvas) return;

    Painter.useCtx((ctx) => {
      // Parallax scrolling based on camera rotation
      const starX = (this.camera.rotationY * 50) % STAR_CANVAS_SIZE;

      // Draw tiled starfield
      ctx.drawImage(this.starCanvas, -starX, 0);
      ctx.drawImage(this.starCanvas, -starX + STAR_CANVAS_SIZE, 0);
    });
  }
}
