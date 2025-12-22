/**
 * ZOrderedCollection - A component for managing child objects with z-ordering.
 * Can be composed into any class that needs child management capabilities.
 */
export class ZOrderedCollection {
  /**
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.sortByZIndex=true] - Whether to use z-index sorting instead of array order
   */
  constructor(options = {}) {
    this.children = [];
    this.sortByZIndex = options.sortByZIndex || true;
    this._zOrderDirty = false;
  }

  /**
   * Add a child object to the collection
   * @param {Object} child - Child object to add
   * @returns {Object} The added child
   */
  /**
   * Add a child object to the collection
   * @param {Object} child - Child object to add
   * @returns {Object} The added child
   */
  add(child) {
    if (this.children.includes(child)) {
      console.warn("Object is already in this collection");
      return child;
    }
    this.children.push(child);
    child.parent = this._owner || this;
    // Mark z-order as dirty if using z-index sorting
    if (this.sortByZIndex) {
      this._zOrderDirty = true;
      // Only set default zIndex if not already defined
      // This allows users to set zIndex before or after add()
      if (child.zIndex === undefined || child.zIndex === null) {
        child.zIndex = this.children.length - 1;
      }
    }
    return child;
  }

  /**
   * Remove a child from the collection
   * @param {Object} child - Child to remove
   * @returns {boolean} Whether removal was successful
   */
  remove(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      return true;
    }
    return false;
  }

  /**
   * Clear all children from the collection
   */
  clear() {
    this.children.forEach((child) => {
      child.parent = null;
    });
    this.children = [];
  }

  /**
   * Brings a child to the front (end of the array or highest z-index)
   * @param {Object} child - The child to bring to the front
   */
  bringToFront(child) {
    const index = this.children.indexOf(child);
    if (index === -1) {
      // If not in array, just add it
      this.add(child);
      return;
    }

    if (this.sortByZIndex) {
      // Check if already at the front
      let isAlreadyHighest = true;

      for (const obj of this.children) {
        if (obj === child) continue;

        if ((obj.zIndex || 0) >= (child.zIndex || 0)) {
          isAlreadyHighest = false;
          break;
        }
      }

      if (!isAlreadyHighest) {
        // Instead of incrementing, we'll use a new highest value
        // and then normalize all z-indices
        child.zIndex = Number.MAX_SAFE_INTEGER;
        this._zOrderDirty = true;

        // Normalize z-indices if they're getting too large
        this._normalizeZIndices();
      }
    } else {
      // Move to end without removing and re-adding
      // Only if not already at the end
      if (index !== this.children.length - 1) {
        this.children.splice(index, 1);
        this.children.push(child);
      }
    }
  }

  /**
   * Send a child to the back (start of the array or lowest z-index)
   * @param {Object} child - The child to send to the back
   */
  sendToBack(child) {
    const index = this.children.indexOf(child);
    if (index === -1) {
      // If not in array, add it at the beginning
      this.children.unshift(child);
      child.parent = this._owner || this;
      return;
    }

    if (this.sortByZIndex) {
      // Check if already at the back
      let isAlreadyLowest = true;

      for (const obj of this.children) {
        if (obj === child) continue;

        if ((obj.zIndex || 0) <= (child.zIndex || 0)) {
          isAlreadyLowest = false;
          break;
        }
      }

      if (!isAlreadyLowest) {
        // Give it the minimum value
        child.zIndex = Number.MIN_SAFE_INTEGER;
        this._zOrderDirty = true;

        // Normalize z-indices if needed
        this._normalizeZIndices();
      }
    } else {
      // Move to beginning without removing and re-adding
      // Only if not already at the beginning
      if (index !== 0) {
        this.children.splice(index, 1);
        this.children.unshift(child);
      }
    }
  }

  /**
   * Move a child one position forward in the z-order
   * @param {Object} child - The child to move forward
   */
  bringForward(child) {
    const index = this.children.indexOf(child);
    if (index === -1 || index === this.children.length - 1) return;

    if (this.sortByZIndex) {
      // Sort objects by z-index
      const sorted = [...this.children].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );
      const currentIndex = sorted.indexOf(child);

      if (currentIndex < sorted.length - 1) {
        const nextObj = sorted[currentIndex + 1];
        const nextZIndex = nextObj.zIndex || 0;
        const currentZIndex = child.zIndex || 0;

        // Place it halfway between current and next object
        // if there's space, otherwise swap the z-indices
        if (nextZIndex - currentZIndex > 1) {
          child.zIndex =
            currentZIndex + Math.floor((nextZIndex - currentZIndex) / 2);
        } else {
          // Swap z-indices
          child.zIndex = nextZIndex;
          nextObj.zIndex = currentZIndex;
        }

        this._zOrderDirty = true;

        // Check for normalization
        this._normalizeZIndices();
      }
    } else {
      // Swap with the next object
      const temp = this.children[index + 1];
      this.children[index + 1] = child;
      this.children[index] = temp;
    }
  }

  /**
   * Move a child one position backward in the z-order
   * @param {Object} child - The child to move backward
   */
  sendBackward(child) {
    const index = this.children.indexOf(child);
    if (index <= 0) return;

    if (this.sortByZIndex) {
      // Sort objects by z-index
      const sorted = [...this.children].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );
      const currentIndex = sorted.indexOf(child);

      if (currentIndex > 0) {
        const prevObj = sorted[currentIndex - 1];
        const prevZIndex = prevObj.zIndex || 0;
        const currentZIndex = child.zIndex || 0;

        // Place it halfway between current and previous object
        // if there's space, otherwise swap the z-indices
        if (currentZIndex - prevZIndex > 1) {
          child.zIndex =
            prevZIndex + Math.floor((currentZIndex - prevZIndex) / 2);
        } else {
          // Swap z-indices
          child.zIndex = prevZIndex;
          prevObj.zIndex = currentZIndex;
        }

        this._zOrderDirty = true;

        // Check for normalization
        this._normalizeZIndices();
      }
    } else {
      // Swap with the previous object
      const temp = this.children[index - 1];
      this.children[index - 1] = child;
      this.children[index] = temp;
    }
  }

  /**
   * Normalizes all z-indices to use smaller numbers
   * while preserving the same order
   * @private
   */
  _normalizeZIndices() {
    // Only normalize if we have objects with z-indices
    if (this.children.length <= 1) return;

    // Check if normalization is needed (z-indices exceeding 1000 or below -1000)
    const needsNormalization = this.children.some(
      (obj) => (obj.zIndex || 0) > 1000 || (obj.zIndex || 0) < -1000
    );

    if (needsNormalization) {
      // Sort by current z-index
      const sorted = [...this.children].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );

      // Reassign z-indices in increments of 10
      sorted.forEach((obj, i) => {
        obj.zIndex = i * 10;
      });

      //console.log("Z-indices normalized");
      this._zOrderDirty = true;
    }
  }

  /**
   * Sort the children by z-index if needed before rendering
   * @returns {Array} The sorted or original children array
   */
  getSortedChildren() {
    if (this.sortByZIndex && this._zOrderDirty) {
      this.children.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      this._zOrderDirty = false;
    }
    return this.children;
  }
}
