import { Scene } from "./scene.js";
import { Painter } from "../../painter/painter.js";

/**
 * Scene3D - A Scene that projects children through Camera3D
 *
 * Bridges the GameObject/Scene system with Camera3D, allowing GameObjects
 * to be positioned in 3D space and automatically projected through the camera.
 *
 * Children can have an optional `z` property (defaults to 0 if not present).
 *
 * @example
 * const scene3d = new Scene3D(this, {
 *   x: this.width / 2,
 *   y: this.height / 2,
 *   camera: this.camera,
 *   depthSort: true,
 * });
 *
 * const box = new MyBox(this, { x: -100, y: 0 });
 * box.z = -50; // Behind center plane
 * scene3d.add(box);
 *
 * this.pipeline.add(scene3d);
 *
 * @extends Scene
 */
export class Scene3D extends Scene {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options - Configuration
   * @param {Camera3D} options.camera - Required Camera3D for projection
   * @param {boolean} [options.depthSort=true] - Sort children by depth (back-to-front)
   * @param {boolean} [options.scaleByDepth=true] - Scale children by perspective
   */
  constructor(game, options = {}) {
    super(game, options);

    if (!options.camera) {
      throw new Error("Scene3D requires a camera option");
    }

    this.camera = options.camera;
    this.depthSort = options.depthSort ?? true;
    this.scaleByDepth = options.scaleByDepth ?? true;
  }

  /**
   * Override Scene's draw to project children through Camera3D
   */
  render() {
    // Do NOT call super.render() as it triggers the 2D Scene.draw() pass,
    // causing double rendering (one 2D, one 3D).

    if (!this.visible) return;

    Painter.save();
    // Translate to the Scene3D's position (e.g., center of screen)
    // This defines the "origin" (0,0) of the 3D projection on the 2D canvas.
    Painter.translateTo(this.x, this.y);

    // Build render list with projections
    const renderList = [];

    for (const child of this._collection.getSortedChildren()) {
      if (!child.visible) continue;

      const z = child.z ?? 0;
      const projected = this.camera.project(child.x, child.y, z);

      // Cull if behind camera
      if (projected.z < -this.camera.perspective + 10) continue;

      renderList.push({
        child,
        x: projected.x,
        y: projected.y,
        z: projected.z,
        scale: projected.scale,
      });
    }

    // Sort back-to-front if enabled
    if (this.depthSort) {
      renderList.sort((a, b) => b.z - a.z);
    }

    // Render each child at projected position
    for (const item of renderList) {
      Painter.save();

      // 1. Move to the projected screen position
      Painter.translateTo(item.x, item.y);

      // 2. Apply perspective scale
      if (this.scaleByDepth) {
        Painter.ctx.scale(item.scale, item.scale);
      }

      // 3. Neutralize the child's own translation logic
      // GameObject.render() will translate by (child.x, child.y).
      // By applying (-child.x, -child.y) first (in the scaled context),
      // we ensure the net visual position is exactly at (item.x, item.y).
      Painter.translateTo(-item.child.x, -item.child.y);

      item.child.render();
      Painter.restore();
    }

    Painter.restore();
  }
}
