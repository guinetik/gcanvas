import { Collision } from "./collision.js";

/**
 * CollisionSystem - Manages collision groups and detection
 *
 * Provides an organized way to manage multiple groups of collidable objects
 * and efficiently check collisions between them.
 *
 * @example
 * const collisions = new CollisionSystem();
 *
 * // Register groups
 * collisions.createGroup('players');
 * collisions.createGroup('enemies');
 * collisions.createGroup('bullets');
 *
 * // Add objects to groups
 * collisions.add('players', player);
 * collisions.add('enemies', alien);
 * collisions.add('bullets', bullet);
 *
 * // Set up collision handlers
 * collisions.onCollision('bullets', 'enemies', (bullet, enemy) => {
 *   bullet.destroy();
 *   enemy.takeDamage();
 * });
 *
 * // Check collisions each frame
 * collisions.update();
 */
export class CollisionSystem {
  constructor() {
    /** @type {Map<string, Set<Object>>} */
    this.groups = new Map();

    /** @type {Array<Object>} Collision pair definitions */
    this.pairs = [];

    /** @type {boolean} Whether to use quadtree optimization */
    this.useQuadtree = false;
  }

  /**
   * Create a new collision group
   *
   * @param {string} name - Unique group name
   * @returns {CollisionSystem} this for chaining
   */
  createGroup(name) {
    if (!this.groups.has(name)) {
      this.groups.set(name, new Set());
    }
    return this;
  }

  /**
   * Add an object to a collision group
   * Object must have either getBounds() method or bounds property
   *
   * @param {string} groupName - Group to add to
   * @param {Object} obj - Object with getBounds() or bounds property
   * @returns {CollisionSystem} this for chaining
   */
  add(groupName, obj) {
    const group = this.groups.get(groupName);
    if (!group) {
      throw new Error(`Collision group '${groupName}' does not exist. Call createGroup('${groupName}') first.`);
    }
    group.add(obj);
    return this;
  }

  /**
   * Remove an object from a collision group
   *
   * @param {string} groupName - Group to remove from
   * @param {Object} obj - Object to remove
   * @returns {boolean} True if object was in the group
   */
  remove(groupName, obj) {
    const group = this.groups.get(groupName);
    if (!group) return false;
    return group.delete(obj);
  }

  /**
   * Remove an object from all groups
   *
   * @param {Object} obj - Object to remove
   */
  removeFromAll(obj) {
    for (const group of this.groups.values()) {
      group.delete(obj);
    }
  }

  /**
   * Clear all objects from a group
   *
   * @param {string} groupName - Group to clear
   */
  clearGroup(groupName) {
    const group = this.groups.get(groupName);
    if (group) {
      group.clear();
    }
  }

  /**
   * Clear all groups
   */
  clearAll() {
    for (const group of this.groups.values()) {
      group.clear();
    }
  }

  /**
   * Get all objects in a group
   *
   * @param {string} groupName - Group name
   * @returns {Array<Object>} Array of objects in the group
   */
  getGroup(groupName) {
    const group = this.groups.get(groupName);
    return group ? Array.from(group) : [];
  }

  /**
   * Register a collision callback between two groups
   *
   * @param {string} groupA - First group name
   * @param {string} groupB - Second group name
   * @param {Function} callback - Called with (objA, objB) on collision
   * @param {Object} [options={}] - Additional options
   * @param {boolean} [options.once=false] - If true, only trigger once per pair per frame
   * @returns {CollisionSystem} this for chaining
   */
  onCollision(groupA, groupB, callback, options = {}) {
    this.pairs.push({
      groupA,
      groupB,
      callback,
      once: options.once ?? false,
    });
    return this;
  }

  /**
   * Remove all collision callbacks for a pair of groups
   *
   * @param {string} groupA - First group name
   * @param {string} groupB - Second group name
   */
  offCollision(groupA, groupB) {
    this.pairs = this.pairs.filter(
      (pair) => !(pair.groupA === groupA && pair.groupB === groupB)
    );
  }

  /**
   * Check and handle all registered collision pairs
   * Call this each frame in your update loop
   */
  update() {
    for (const pair of this.pairs) {
      this._checkPair(pair);
    }
  }

  /**
   * Check collisions between two specific groups (without callbacks)
   * Returns array of colliding pairs
   *
   * @param {string} groupA - First group name
   * @param {string} groupB - Second group name
   * @returns {Array<Array>} Array of [objA, objB] colliding pairs
   */
  check(groupA, groupB) {
    const setA = this.groups.get(groupA);
    const setB = this.groups.get(groupB);
    if (!setA || !setB) return [];

    const collisions = [];

    for (const objA of setA) {
      if (!this._isActive(objA)) continue;
      const boundsA = this._getBounds(objA);
      if (!boundsA) continue;

      for (const objB of setB) {
        if (objA === objB) continue;
        if (!this._isActive(objB)) continue;

        const boundsB = this._getBounds(objB);
        if (!boundsB) continue;

        if (Collision.rectRect(boundsA, boundsB)) {
          collisions.push([objA, objB]);
        }
      }
    }

    return collisions;
  }

  /**
   * Check if an object collides with any object in a group
   *
   * @param {Object} obj - Object to test
   * @param {string} groupName - Group to test against
   * @returns {Object|null} First colliding object, or null
   */
  checkAgainstGroup(obj, groupName) {
    const group = this.groups.get(groupName);
    if (!group) return null;

    const boundsA = this._getBounds(obj);
    if (!boundsA) return null;

    for (const other of group) {
      if (obj === other) continue;
      if (!this._isActive(other)) continue;

      const boundsB = this._getBounds(other);
      if (!boundsB) continue;

      if (Collision.rectRect(boundsA, boundsB)) {
        return other;
      }
    }

    return null;
  }

  /**
   * Check if an object collides with any object in a group
   * Returns all colliding objects
   *
   * @param {Object} obj - Object to test
   * @param {string} groupName - Group to test against
   * @returns {Array<Object>} All colliding objects
   */
  checkAllAgainstGroup(obj, groupName) {
    const group = this.groups.get(groupName);
    if (!group) return [];

    const boundsA = this._getBounds(obj);
    if (!boundsA) return [];

    const collisions = [];

    for (const other of group) {
      if (obj === other) continue;
      if (!this._isActive(other)) continue;

      const boundsB = this._getBounds(other);
      if (!boundsB) continue;

      if (Collision.rectRect(boundsA, boundsB)) {
        collisions.push(other);
      }
    }

    return collisions;
  }

  /**
   * @private
   */
  _checkPair(pair) {
    const setA = this.groups.get(pair.groupA);
    const setB = this.groups.get(pair.groupB);
    if (!setA || !setB) return;

    for (const objA of setA) {
      if (!this._isActive(objA)) continue;
      const boundsA = this._getBounds(objA);
      if (!boundsA) continue;

      for (const objB of setB) {
        if (objA === objB) continue;
        if (!this._isActive(objB)) continue;

        const boundsB = this._getBounds(objB);
        if (!boundsB) continue;

        if (Collision.rectRect(boundsA, boundsB)) {
          pair.callback(objA, objB);

          // If 'once' option, skip remaining checks for this objA
          if (pair.once) break;
        }
      }
    }
  }

  /**
   * Get bounds from an object (supports getBounds() method or bounds property)
   * @private
   */
  _getBounds(obj) {
    if (typeof obj.getBounds === "function") {
      return obj.getBounds();
    }
    if (obj.bounds) {
      return obj.bounds;
    }
    // Fallback: try to construct bounds from x, y, width, height
    if (obj.x !== undefined && obj.y !== undefined) {
      return {
        x: obj.x - (obj.width || 0) / 2,
        y: obj.y - (obj.height || 0) / 2,
        width: obj.width || 0,
        height: obj.height || 0,
      };
    }
    return null;
  }

  /**
   * Check if an object is still active (for filtering dead objects)
   * @private
   */
  _isActive(obj) {
    // Support common patterns for "active" objects
    if (obj.active === false) return false;
    if (obj.destroyed === true) return false;
    if (obj.alive === false) return false;
    return true;
  }
}
