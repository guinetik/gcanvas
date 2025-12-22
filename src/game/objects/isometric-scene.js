import { Scene } from "./scene.js";
import { Painter } from "../../painter/painter.js";

/**
 * IsometricScene - A Scene that projects children using isometric projection
 *
 * Bridges the GameObject/Scene system with isometric rendering, allowing GameObjects
 * to be positioned in 3D grid space (x, y, z) and automatically projected to 2D
 * isometric view using diamond projection.
 *
 * Children can have an optional `z` property for height above the ground plane.
 * The scene handles depth sorting automatically based on isometric depth (x + y).
 *
 * @example
 * const isoScene = new IsometricScene(this, {
 *   x: this.width / 2,
 *   y: this.height / 2,
 *   tileWidth: 64,
 *   tileHeight: 32,
 *   depthSort: true,
 * });
 *
 * const box = new IsometricBox(this, { x: 2, y: 3 });
 * box.z = 0; // ground level
 * isoScene.add(box);
 *
 * this.pipeline.add(isoScene);
 *
 * @extends Scene
 */
export class IsometricScene extends Scene {
  /**
   * @param {Game} game - Game instance
   * @param {Object} options - Configuration
   * @param {number} [options.tileWidth=64] - Width of a tile in the isometric grid (pixels)
   * @param {number} [options.tileHeight] - Height of a tile (defaults to tileWidth / 2)
   * @param {boolean} [options.depthSort=true] - Sort children by depth (back-to-front)
   * @param {boolean} [options.scaleByDepth=false] - Scale children by perspective distance
   * @param {number} [options.gridSize=10] - Size of the grid in tiles (used for scale calculations)
   * @param {number} [options.elevationScale=1] - Multiplier for z-axis visual offset
   */
  constructor(game, options = {}) {
    super(game, options);

    /** @type {number} Width of a tile in pixels */
    this.tileWidth = options.tileWidth ?? 64;

    /** @type {number} Height of a tile in pixels (typically tileWidth / 2 for standard isometric) */
    this.tileHeight = options.tileHeight ?? this.tileWidth / 2;

    /** @type {boolean} Whether to sort children by depth (back-to-front) */
    this.depthSort = options.depthSort ?? true;

    /** @type {boolean} Whether to scale children by perspective distance */
    this.scaleByDepth = options.scaleByDepth ?? false;

    /** @type {number} Size of the grid in tiles (for scale calculations) */
    this.gridSize = options.gridSize ?? 10;

    /** @type {number} Multiplier for z-axis visual offset */
    this.elevationScale = options.elevationScale ?? 1;
  }

  /**
   * Convert 3D grid coordinates (x, y, z) to 2D isometric screen position.
   *
   * Uses the standard "diamond" isometric projection:
   * - isoX = (x - y) * (tileWidth / 2)
   * - isoY = (x + y) * (tileHeight / 2) - z * elevationScale
   *
   * @param {number} x - Grid X coordinate
   * @param {number} y - Grid Y coordinate
   * @param {number} [z=0] - Height above ground plane
   * @returns {{x: number, y: number, depth: number}} Screen position and depth for sorting
   */
  toIsometric(x, y, z = 0) {
    const isoX = (x - y) * (this.tileWidth / 2);
    const isoY = (x + y) * (this.tileHeight / 2) - z * this.elevationScale;

    // Depth for sorting: objects with higher (x + y) are further "back"
    // z is used as a tie-breaker (higher z renders on top at same x,y)
    const depth = x + y - z * 0.01;

    return { x: isoX, y: isoY, depth };
  }

  /**
   * Convert screen coordinates back to grid coordinates.
   *
   * Useful for mouse picking and tile selection.
   * Note: This assumes z = 0 (ground plane).
   *
   * @param {number} screenX - Screen X relative to scene center
   * @param {number} screenY - Screen Y relative to scene center
   * @returns {{x: number, y: number}} Grid coordinates
   */
  fromIsometric(screenX, screenY) {
    // Inverse of the isometric transform (assuming z = 0)
    const halfTileW = this.tileWidth / 2;
    const halfTileH = this.tileHeight / 2;

    const x = (screenX / halfTileW + screenY / halfTileH) / 2;
    const y = (screenY / halfTileH - screenX / halfTileW) / 2;

    return { x, y };
  }

  /**
   * Get the tile coordinates at a given screen position (floored to integers).
   *
   * @param {number} screenX - Screen X relative to scene center
   * @param {number} screenY - Screen Y relative to scene center
   * @returns {{x: number, y: number}} Tile coordinates (integers)
   */
  getTileAt(screenX, screenY) {
    const grid = this.fromIsometric(screenX, screenY);
    return {
      x: Math.floor(grid.x),
      y: Math.floor(grid.y),
    };
  }

  /**
   * Calculate scale factor based on Y position (for perspective effect).
   *
   * Objects further "back" (higher y in grid) appear smaller.
   *
   * @param {number} y - Grid Y position
   * @returns {number} Scale factor (0.7 to 1.3 range)
   */
  getDepthScale(y) {
    const distanceFromCenter = Math.abs(y);
    const maxDistance = this.gridSize;
    // Range from 0.7 (far) to 1.3 (near)
    return 0.7 + (distanceFromCenter / maxDistance) * 0.6;
  }

  /**
   * Override Scene's render to provide isometric coordinate system.
   *
   * This method:
   * 1. Translates to the scene's position (center of projection)
   * 2. Depth-sorts children back-to-front by their grid position
   * 3. Renders each child (children use toIsometric() for their own projection)
   *
   * Note: Children are responsible for calling toIsometric() in their render()
   * method. This gives them full control over complex rendering (shadows, etc).
   */
  render() {
    if (!this.visible) return;

    Painter.save();

    // Translate to the IsometricScene's position (e.g., center of screen)
    // This defines the origin (0,0) of the isometric projection on the 2D canvas
    Painter.translateTo(this.x, this.y);

    // Build render list with depth info for sorting
    const renderList = [];

    for (const child of this._collection.getSortedChildren()) {
      if (!child.visible) continue;

      // Use custom isoDepth if available, otherwise calculate
      let depth;
      if (child.isoDepth !== undefined) {
        depth = child.isoDepth;
      } else {
        // For moving objects, use z as height
        const height = child.z ?? 0;
        // Higher (x + y) = closer to viewer = higher depth = render later
        // Higher z = on top = higher depth = render later
        depth = (child.x + child.y) + height * 0.05;
      }

      renderList.push({
        child,
        depth,
      });
    }

    // Depth sort: respect zIndex first, then isometric depth
    // Lower depth (back) renders first, higher depth (front) renders last
    if (this.depthSort) {
      renderList.sort((a, b) => {
        const za = a.child.zIndex ?? 0;
        const zb = b.child.zIndex ?? 0;
        if (za !== zb) return za - zb;
        return a.depth - b.depth; // back-to-front by position
      });
    }

    // Render each child - they handle their own projection via toIsometric()
    for (const item of renderList) {
      Painter.save();
      item.child.render();
      Painter.restore();
    }

    Painter.restore();
  }
}
