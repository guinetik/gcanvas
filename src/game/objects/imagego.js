import { ImageShape } from "../../shapes/image";
import { GameObjectShapeWrapper } from ".";

export class ImageGo extends GameObjectShapeWrapper {
  /**
   * Quickly drop a bitmap into the pipeline.
   *
   * @param {Game}   game         – the main Game instance
   * @param {ImageData|HTMLImageElement|HTMLCanvasElement|Uint8ClampedArray} bitmap
   * @param {object} [options]    – BitmapShape & GO options (x, y, scale, anchor, …)
   *
   * The constructor:
   * 1. creates / re‑uses a BitmapShape,
   * 2. hands it to GameObjectShapeWrapper,
   * 3. propagates any extra options (anchor, padding, debug …).
   */
  constructor(game, bitmap, options = {}) {
    // If the user passed an existing BitmapShape we keep it,
    // otherwise we fabricate one.
    const shape =
      bitmap instanceof ImageShape ? bitmap : new ImageShape(bitmap, options);
    // GameObjectShapeWrapper keeps transform + render in sync with the shape
    super(game, shape, options);
    //console.log("imagego", this);
  }

  reset() {
    this.shape.reset();
  }
}
