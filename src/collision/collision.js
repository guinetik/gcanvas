/**
 * Collision - Static collision detection utilities
 *
 * Provides various collision detection algorithms for 2D game development.
 * All methods work with bounds objects: { x, y, width, height }
 *
 * @example
 * // Basic rectangle collision
 * const playerBounds = player.getBounds();
 * const enemyBounds = enemy.getBounds();
 * if (Collision.rectRect(playerBounds, enemyBounds)) {
 *   console.log('Hit!');
 * }
 *
 * @example
 * // Point collision
 * if (Collision.pointRect(mouseX, mouseY, button.getBounds())) {
 *   button.highlight();
 * }
 */
export class Collision {
  /**
   * Test if two axis-aligned rectangles intersect (AABB collision)
   *
   * @param {Object} a - First rectangle { x, y, width, height }
   * @param {Object} b - Second rectangle { x, y, width, height }
   * @returns {boolean} True if rectangles overlap
   */
  static rectRect(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * Alias for rectRect - matches common naming convention
   * @param {Object} a - First rectangle
   * @param {Object} b - Second rectangle
   * @returns {boolean} True if rectangles overlap
   */
  static intersects(a, b) {
    return Collision.rectRect(a, b);
  }

  /**
   * Test if a point is inside a rectangle
   *
   * @param {number} px - Point X coordinate
   * @param {number} py - Point Y coordinate
   * @param {Object} rect - Rectangle { x, y, width, height }
   * @returns {boolean} True if point is inside rectangle
   */
  static pointRect(px, py, rect) {
    return (
      px >= rect.x &&
      px <= rect.x + rect.width &&
      py >= rect.y &&
      py <= rect.y + rect.height
    );
  }

  /**
   * Test if two circles intersect
   *
   * @param {Object} a - First circle { x, y, radius }
   * @param {Object} b - Second circle { x, y, radius }
   * @returns {boolean} True if circles overlap
   */
  static circleCircle(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const radii = a.radius + b.radius;
    return distSq <= radii * radii;
  }

  /**
   * Get circle-circle overlap info for collision response.
   * Returns separation vector and overlap amount.
   *
   * @param {Object} a - First circle { x, y, radius }
   * @param {Object} b - Second circle { x, y, radius }
   * @returns {Object|null} { overlap, nx, ny, dist } or null if no collision
   *   - overlap: penetration depth
   *   - nx, ny: normalized direction from b to a
   *   - dist: distance between centers
   */
  static getCircleOverlap(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;
    const minDist = a.radius + b.radius;

    if (distSq >= minDist * minDist || distSq < 0.0001) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const overlap = minDist - dist;
    const invDist = 1 / dist;

    return {
      overlap,
      nx: dx * invDist,  // Normal from b toward a
      ny: dy * invDist,
      dist,
    };
  }

  /**
   * Apply separation forces between overlapping circles.
   * Mutates the provided force arrays.
   *
   * @param {Array<Object>} particles - Array of { x, y, size } particles
   * @param {Array<Object>} forces - Array of { x, y } force accumulators
   * @param {Object} [options={}] - Options
   * @param {number} [options.strength=5000] - Repulsion force strength
   * @param {boolean} [options.useSizeAsRadius=true] - Use particle.size as diameter
   */
  static applyCircleSeparation(particles, forces, options = {}) {
    const strength = options.strength ?? 5000;
    const useSizeAsRadius = options.useSizeAsRadius ?? true;
    const n = particles.length;

    for (let i = 0; i < n; i++) {
      const pi = particles[i];
      const ri = useSizeAsRadius ? pi.size * 0.5 : (pi.radius ?? 10);

      for (let j = i + 1; j < n; j++) {
        const pj = particles[j];
        const rj = useSizeAsRadius ? pj.size * 0.5 : (pj.radius ?? 10);

        const overlap = Collision.getCircleOverlap(
          { x: pi.x, y: pi.y, radius: ri },
          { x: pj.x, y: pj.y, radius: rj }
        );

        if (overlap) {
          const force = strength * (overlap.overlap / (ri + rj));
          const fx = overlap.nx * force;
          const fy = overlap.ny * force;

          forces[i].x += fx;
          forces[i].y += fy;
          forces[j].x -= fx;
          forces[j].y -= fy;
        }
      }
    }
  }

  /**
   * Test if a point is inside a circle
   *
   * @param {number} px - Point X coordinate
   * @param {number} py - Point Y coordinate
   * @param {Object} circle - Circle { x, y, radius }
   * @returns {boolean} True if point is inside circle
   */
  static pointCircle(px, py, circle) {
    const dx = px - circle.x;
    const dy = py - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  /**
   * Test if a circle and rectangle intersect
   *
   * @param {Object} circle - Circle { x, y, radius }
   * @param {Object} rect - Rectangle { x, y, width, height }
   * @returns {boolean} True if circle and rectangle overlap
   */
  static circleRect(circle, rect) {
    // Find the closest point on the rectangle to the circle center
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    // Calculate distance from circle center to closest point
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  /**
   * Test if a line segment intersects a rectangle
   * Useful for things like lightning bolts, lasers, or raycast-style collision
   *
   * @param {number} x1 - Line start X
   * @param {number} y1 - Line start Y
   * @param {number} x2 - Line end X
   * @param {number} y2 - Line end Y
   * @param {Object} rect - Rectangle { x, y, width, height }
   * @param {number} [thickness=0] - Optional line thickness (expands rect check)
   * @returns {boolean} True if line intersects rectangle
   */
  static lineRect(x1, y1, x2, y2, rect, thickness = 0) {
    // Expand rect by half thickness if provided
    const rx = rect.x - thickness / 2;
    const ry = rect.y - thickness / 2;
    const rw = rect.width + thickness;
    const rh = rect.height + thickness;

    // Check if either endpoint is inside the rectangle
    if (Collision.pointRect(x1, y1, { x: rx, y: ry, width: rw, height: rh }) ||
        Collision.pointRect(x2, y2, { x: rx, y: ry, width: rw, height: rh })) {
      return true;
    }

    // Check line against all 4 edges of rectangle
    const left = Collision.lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh);
    const right = Collision.lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh);
    const top = Collision.lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry);
    const bottom = Collision.lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

    return left || right || top || bottom;
  }

  /**
   * Test if two line segments intersect
   *
   * @param {number} x1 - First line start X
   * @param {number} y1 - First line start Y
   * @param {number} x2 - First line end X
   * @param {number} y2 - First line end Y
   * @param {number} x3 - Second line start X
   * @param {number} y3 - Second line start Y
   * @param {number} x4 - Second line end X
   * @param {number} y4 - Second line end Y
   * @returns {boolean} True if lines intersect
   */
  static lineLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate direction vectors
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

    // Parallel lines
    if (denom === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    // Check if intersection is within both line segments
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  /**
   * Test if multiple line segments intersect a rectangle
   * Useful for complex shapes like lightning bolts
   *
   * @param {Array<Object>} segments - Array of { x1, y1, x2, y2 } segments
   * @param {Object} rect - Rectangle { x, y, width, height }
   * @param {number} [thickness=0] - Optional line thickness
   * @returns {boolean} True if any segment intersects rectangle
   */
  static segmentsRect(segments, rect, thickness = 0) {
    for (const seg of segments) {
      if (Collision.lineRect(seg.x1, seg.y1, seg.x2, seg.y2, rect, thickness)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the intersection depth between two rectangles (for collision response)
   * Returns null if no collision, otherwise returns overlap amounts
   *
   * @param {Object} a - First rectangle { x, y, width, height }
   * @param {Object} b - Second rectangle { x, y, width, height }
   * @returns {Object|null} { x, y } overlap depths, or null if no collision
   */
  static getOverlap(a, b) {
    if (!Collision.rectRect(a, b)) return null;

    // Calculate overlap on each axis
    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

    return { x: overlapX, y: overlapY };
  }

  /**
   * Get the minimum translation vector to separate two rectangles
   * Returns the smallest push needed to stop the collision
   *
   * @param {Object} a - Moving rectangle { x, y, width, height }
   * @param {Object} b - Static rectangle { x, y, width, height }
   * @returns {Object|null} { x, y } translation vector, or null if no collision
   */
  static getMTV(a, b) {
    const overlap = Collision.getOverlap(a, b);
    if (!overlap) return null;

    // Find center of each rectangle
    const aCenterX = a.x + a.width / 2;
    const aCenterY = a.y + a.height / 2;
    const bCenterX = b.x + b.width / 2;
    const bCenterY = b.y + b.height / 2;

    // Determine push direction
    const pushX = aCenterX < bCenterX ? -overlap.x : overlap.x;
    const pushY = aCenterY < bCenterY ? -overlap.y : overlap.y;

    // Return the smaller translation (minimum translation vector)
    if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
      return { x: pushX, y: 0 };
    } else {
      return { x: 0, y: pushY };
    }
  }

  /**
   * Check if a moving rectangle will collide with a static one (sweep test)
   * Useful for fast-moving objects like bullets
   *
   * @param {Object} rect - Moving rectangle { x, y, width, height }
   * @param {number} vx - Velocity X
   * @param {number} vy - Velocity Y
   * @param {Object} target - Target rectangle { x, y, width, height }
   * @returns {Object|null} { time, normalX, normalY } collision info, or null
   */
  static sweep(rect, vx, vy, target) {
    // Expand target by moving rect size (Minkowski sum)
    const expanded = {
      x: target.x - rect.width / 2,
      y: target.y - rect.height / 2,
      width: target.width + rect.width,
      height: target.height + rect.height,
    };

    // Ray-box intersection from center of moving rect
    const originX = rect.x + rect.width / 2;
    const originY = rect.y + rect.height / 2;

    // Calculate entry and exit times for each axis
    let tMinX, tMaxX, tMinY, tMaxY;

    if (vx !== 0) {
      tMinX = (expanded.x - originX) / vx;
      tMaxX = (expanded.x + expanded.width - originX) / vx;
      if (tMinX > tMaxX) [tMinX, tMaxX] = [tMaxX, tMinX];
    } else {
      tMinX = originX >= expanded.x && originX <= expanded.x + expanded.width ? -Infinity : Infinity;
      tMaxX = originX >= expanded.x && originX <= expanded.x + expanded.width ? Infinity : -Infinity;
    }

    if (vy !== 0) {
      tMinY = (expanded.y - originY) / vy;
      tMaxY = (expanded.y + expanded.height - originY) / vy;
      if (tMinY > tMaxY) [tMinY, tMaxY] = [tMaxY, tMinY];
    } else {
      tMinY = originY >= expanded.y && originY <= expanded.y + expanded.height ? -Infinity : Infinity;
      tMaxY = originY >= expanded.y && originY <= expanded.y + expanded.height ? Infinity : -Infinity;
    }

    // Find overlap of intervals
    const tEntry = Math.max(tMinX, tMinY);
    const tExit = Math.min(tMaxX, tMaxY);

    // No collision if exit before entry, or entry is after full movement
    if (tEntry > tExit || tEntry < 0 || tEntry > 1) {
      return null;
    }

    // Calculate collision normal
    let normalX = 0, normalY = 0;
    if (tMinX > tMinY) {
      normalX = vx > 0 ? -1 : 1;
    } else {
      normalY = vy > 0 ? -1 : 1;
    }

    return { time: tEntry, normalX, normalY };
  }
}
