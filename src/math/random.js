/**
 * 🎲 Random - A utility class for game-friendly pseudorandom operations.
 *
 * Provides a variety of methods for positioning, noise, variance, and procedural randomness.
 * Designed to simplify natural placement, movement, and behaviors across the GCanvas engine.
 */
export class Random {
  /**
   * @typedef {'centered'|'topleft'} CoordinateSystem
   */

  /**
   * Random point centered in the area with symmetric spread.
   * Spawns across the whole area, not just positive quadrant.
   * @param {number} x - X coordinate (center or top-left depending on coordSystem)
   * @param {number} y - Y coordinate (center or top-left depending on coordSystem)
   * @param {number} width - Area width
   * @param {number} height - Area height
   * @param {number} spread - Controls how far from center (default: 1 = full area)
   * @param {CoordinateSystem} coordSystem - 'centered' if x,y are the center point, 'topleft' if they're the top left corner
   * @returns {{x: number, y: number}}
   */
  static symmetric(x, y, width, height, spread = 1, coordSystem = 'topleft') {
    const cx = coordSystem === 'centered' ? x : x + width / 2;
    const cy = coordSystem === 'centered' ? y : y + height / 2;
    
    return {
      x: cx + (Math.random() - 0.5) * width * spread,
      y: cy + (Math.random() - 0.5) * height * spread,
    };
  }

  /**
   * Uniformly random point within a given area
   * @param {number} x - X coordinate (center or top-left depending on coordSystem)
   * @param {number} y - Y coordinate (center or top-left depending on coordSystem)
   * @param {number} width - Width of the area
   * @param {number} height - Height of the area
   * @param {CoordinateSystem} coordSystem - 'centered' if x,y are the center point, 'topleft' if they're the top left corner
   * @returns {{x: number, y: number}}
   */
  static pointInBox(x, y, width, height, coordSystem = 'topleft') {
    if (coordSystem === 'centered') {
      return {
        x: x + (Math.random() - 0.5) * width,
        y: y + (Math.random() - 0.5) * height,
      };
    } else {
      return {
        x: x + Math.random() * width,
        y: y + Math.random() * height,
      };
    }
  }

  /**
   * Random point centered around specified point, with uniform variance
   * @param {number} x - X coordinate (center or top-left depending on coordSystem)
   * @param {number} y - Y coordinate (center or top-left depending on coordSystem)
   * @param {number} width - Width of the area
   * @param {number} height - Height of the area
   * @param {number} variance - Max deviation from center
   * @param {CoordinateSystem} coordSystem - 'centered' if x,y are the center point, 'topleft' if they're the top left corner
   * @returns {{x: number, y: number}}
   */
  static centered(x, y, width, height, variance = 50, coordSystem = 'topleft') {
    const cx = coordSystem === 'centered' ? x : x + width / 2;
    const cy = coordSystem === 'centered' ? y : y + height / 2;
    
    return {
      x: cx + (Math.random() - 0.5) * 2 * variance,
      y: cy + (Math.random() - 0.5) * 2 * variance,
    };
  }

  /**
   * Gaussian (bell-curve) distributed point around center
   * @param {number} x - X coordinate (center or top-left depending on coordSystem)
   * @param {number} y - Y coordinate (center or top-left depending on coordSystem)
   * @param {number} width - Width of the area
   * @param {number} height - Height of the area
   * @param {number} stdDev - Standard deviation (spread)
   * @param {CoordinateSystem} coordSystem - 'centered' if x,y are the center point, 'topleft' if they're the top left corner
   * @returns {{x: number, y: number}}
   */
  static gaussian(x, y, width, height, stdDev = 40, coordSystem = 'topleft') {
    const cx = coordSystem === 'centered' ? x : x + width / 2;
    const cy = coordSystem === 'centered' ? y : y + height / 2;
    
    return {
      x: cx + Random._gaussian(0, stdDev),
      y: cy + Random._gaussian(0, stdDev),
    };
  }

  /**
   * Polar random point around center, within radius
   * @param {number} x - X coordinate (center or top-left depending on coordSystem)
   * @param {number} y - Y coordinate (center or top-left depending on coordSystem)
   * @param {number} width - Width of area
   * @param {number} height - Height of area
   * @param {number} radius - Maximum radial distance
   * @param {CoordinateSystem} coordSystem - 'centered' if x,y are the center point, 'topleft' if they're the top left corner
   * @returns {{x: number, y: number}}
   */
  static radial(x, y, width, height, radius = 100, coordSystem = 'topleft') {
    const cx = coordSystem === 'centered' ? x : x + width / 2;
    const cy = coordSystem === 'centered' ? y : y + height / 2;
    
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  }

  /**
   * Choose a random item from an array
   * @template T
   * @param {T[]} array
   * @returns {T}
   */
  static pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Picks a random item from the array that is NOT equal to the excluded item.
   * Returns `undefined` if no valid alternative exists.
   * @template T
   * @param {T[]} array - Source array
   * @param {T} exclude - Value to exclude from selection
   * @returns {T|undefined}
   */
  static pickOther(array, exclude) {
    const filtered = array.filter((item) => item !== exclude);
    if (filtered.length === 0) return undefined;
    return Random.pick(filtered);
  }

  /**
   * Random float between min and max
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static float(min, max) {
    return min + Math.random() * (max - min);
  }

  /**
   * Random integer between min and max (inclusive)
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  static int(min, max) {
    return Math.floor(Random.float(min, max + 1));
  }

  /**
   * Chance roll: returns true with given probability (0 to 1)
   * @param {number} probability
   * @returns {boolean}
   */
  static chance(probability = 0.5) {
    return Math.random() < probability;
  }

  /**
   * Flip a coin (true or false, 50/50)
   * @returns {boolean}
   */
  static coin() {
    return Math.random() < 0.5;
  }

  /**
   * Internal Gaussian random generator (Box-Muller transform)
   * @param {number} mean
   * @param {number} stdDev
   * @returns {number}
   * @private
   */
  static _gaussian(mean = 0, stdDev = 1) {
    let u = 1 - Math.random();
    let v = 1 - Math.random();
    return (
      mean +
      stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    );
  }
}