var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _Grad, _grad3, _p, _perm, _gradP, _F2, _G2, _F3, _G3, _Noise_static, fade_fn, lerp_fn, __colors, __effects, __img, __lines, __opacity, __shapes, __text, _Painter_static, checkInitialized_fn, _prevWidth, _prevHeight;
class ZOrderedCollection {
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
  add(child) {
    if (this.children.includes(child)) {
      console.warn("Object is already in this collection");
      return child;
    }
    this.children.push(child);
    child.parent = this._owner || this;
    if (this.sortByZIndex) {
      this._zOrderDirty = true;
      child.zIndex = this.children.length - 1;
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
      this.add(child);
      return;
    }
    if (this.sortByZIndex) {
      let isAlreadyHighest = true;
      for (const obj of this.children) {
        if (obj === child) continue;
        if ((obj.zIndex || 0) >= (child.zIndex || 0)) {
          isAlreadyHighest = false;
          break;
        }
      }
      if (!isAlreadyHighest) {
        child.zIndex = Number.MAX_SAFE_INTEGER;
        this._zOrderDirty = true;
        this._normalizeZIndices();
      }
    } else {
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
      this.children.unshift(child);
      child.parent = this._owner || this;
      return;
    }
    if (this.sortByZIndex) {
      let isAlreadyLowest = true;
      for (const obj of this.children) {
        if (obj === child) continue;
        if ((obj.zIndex || 0) <= (child.zIndex || 0)) {
          isAlreadyLowest = false;
          break;
        }
      }
      if (!isAlreadyLowest) {
        child.zIndex = Number.MIN_SAFE_INTEGER;
        this._zOrderDirty = true;
        this._normalizeZIndices();
      }
    } else {
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
      const sorted = [...this.children].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );
      const currentIndex = sorted.indexOf(child);
      if (currentIndex < sorted.length - 1) {
        const nextObj = sorted[currentIndex + 1];
        const nextZIndex = nextObj.zIndex || 0;
        const currentZIndex = child.zIndex || 0;
        if (nextZIndex - currentZIndex > 1) {
          child.zIndex = currentZIndex + Math.floor((nextZIndex - currentZIndex) / 2);
        } else {
          child.zIndex = nextZIndex;
          nextObj.zIndex = currentZIndex;
        }
        this._zOrderDirty = true;
        this._normalizeZIndices();
      }
    } else {
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
      const sorted = [...this.children].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );
      const currentIndex = sorted.indexOf(child);
      if (currentIndex > 0) {
        const prevObj = sorted[currentIndex - 1];
        const prevZIndex = prevObj.zIndex || 0;
        const currentZIndex = child.zIndex || 0;
        if (currentZIndex - prevZIndex > 1) {
          child.zIndex = prevZIndex + Math.floor((currentZIndex - prevZIndex) / 2);
        } else {
          child.zIndex = prevZIndex;
          prevObj.zIndex = currentZIndex;
        }
        this._zOrderDirty = true;
        this._normalizeZIndices();
      }
    } else {
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
    if (this.children.length <= 1) return;
    const needsNormalization = this.children.some(
      (obj) => (obj.zIndex || 0) > 1e3 || (obj.zIndex || 0) < -1e3
    );
    if (needsNormalization) {
      const sorted = [...this.children].sort(
        (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
      );
      sorted.forEach((obj, i) => {
        obj.zIndex = i * 10;
      });
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
const _Position = class _Position {
  /**
   * Calculates position based on anchor point
   * 
   * @param {string} anchor - Anchor position constant
   * @param {Object} object - Object being positioned (with width and height)
   * @param {Object} container - Container to position relative to (with x, y, width, height)
   * @param {number} margin - Margin from the container edges
   * @param {number} offsetX - Additional X offset
   * @param {number} offsetY - Additional Y offset
   * @returns {Object} Position and alignment information
   */
  static calculate(anchor, object, container, margin = 10, offsetX = 0, offsetY = 0) {
    const objectWidth = object.width || 0;
    const objectHeight = object.height || 0;
    const containerWidth = container.width || 0;
    const containerHeight = container.height || 0;
    const containerX = container.x || 0;
    const containerY = container.y || 0;
    let x, y, align, baseline;
    switch (anchor) {
      // Top row
      case _Position.TOP_LEFT:
        x = containerX - containerWidth / 2 + margin + objectWidth / 2;
        y = containerY - containerHeight / 2 + margin + objectHeight / 2;
        align = "left";
        baseline = "top";
        break;
      case _Position.TOP_CENTER:
        x = containerX;
        y = containerY - containerHeight / 2 + margin + objectHeight / 2;
        align = "center";
        baseline = "top";
        break;
      case _Position.TOP_RIGHT:
        x = containerX + containerWidth / 2 - margin - objectWidth / 2;
        y = containerY - containerHeight / 2 + margin + objectHeight / 2;
        align = "right";
        baseline = "top";
        break;
      // Middle row
      case _Position.CENTER_LEFT:
        x = containerX - containerWidth / 2 + margin + objectWidth / 2;
        y = containerY;
        align = "left";
        baseline = "middle";
        break;
      case _Position.CENTER:
        x = containerX;
        y = containerY;
        align = "center";
        baseline = "middle";
        break;
      case _Position.CENTER_RIGHT:
        x = containerX + containerWidth / 2 - margin - objectWidth / 2;
        y = containerY;
        align = "right";
        baseline = "middle";
        break;
      // Bottom row
      case _Position.BOTTOM_LEFT:
        x = containerX - containerWidth / 2 + margin + objectWidth / 2;
        y = containerY + containerHeight / 2 - margin - objectHeight / 2;
        align = "left";
        baseline = "bottom";
        break;
      case _Position.BOTTOM_CENTER:
        x = containerX;
        y = containerY + containerHeight / 2 - margin - objectHeight / 2;
        align = "center";
        baseline = "bottom";
        break;
      case _Position.BOTTOM_RIGHT:
        x = containerX + containerWidth / 2 - margin - objectWidth / 2;
        y = containerY + containerHeight / 2 - margin - objectHeight / 2;
        align = "right";
        baseline = "bottom";
        break;
      default:
        x = containerX - containerWidth / 2 + margin + objectWidth / 2;
        y = containerY - containerHeight / 2 + margin + objectHeight / 2;
        align = "left";
        baseline = "top";
    }
    x += offsetX;
    y += offsetY;
    return { x, y, align, baseline };
  }
  /**
   * Calculates absolute position relative to the game canvas
   * 
   * @param {string} anchor - Anchor position constant
   * @param {Object} object - Object being positioned
   * @param {Object} game - Game object with canvas dimensions
   * @param {number} margin - Margin from the edges
   * @param {number} offsetX - Additional X offset
   * @param {number} offsetY - Additional Y offset
   * @returns {Object} Position and alignment information
   */
  static calculateAbsolute(anchor, object, game, margin = 10, offsetX = 0, offsetY = 0) {
    const container = {
      width: game.width,
      height: game.height,
      x: game.width / 2,
      y: game.height / 2
    };
    return _Position.calculate(anchor, object, container, margin, offsetX, offsetY);
  }
};
/**
 * Anchor position constants
 */
__publicField(_Position, "TOP_LEFT", "top-left");
__publicField(_Position, "TOP_CENTER", "top-center");
__publicField(_Position, "TOP_RIGHT", "top-right");
__publicField(_Position, "CENTER_LEFT", "center-left");
__publicField(_Position, "CENTER", "center");
__publicField(_Position, "CENTER_RIGHT", "center-right");
__publicField(_Position, "BOTTOM_LEFT", "bottom-left");
__publicField(_Position, "BOTTOM_CENTER", "bottom-center");
__publicField(_Position, "BOTTOM_RIGHT", "bottom-right");
let Position = _Position;
function applyLayout(items, positions, options = {}) {
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const transform = options.transform;
  items.forEach((item, index) => {
    if (index < positions.length) {
      const pos = positions[index];
      if (transform) {
        const transformed = transform(pos);
        item.x = transformed.x + offsetX;
        item.y = transformed.y + offsetY;
      } else {
        item.x = pos.x + offsetX;
        item.y = pos.y + offsetY;
      }
    }
  });
  return items;
}
function horizontalLayout(items, options = {}) {
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const align = options.align ?? "start";
  const centerItems = options.centerItems ?? true;
  let x = padding;
  let maxHeight = 0;
  const positions = [];
  for (const item of items) {
    maxHeight = Math.max(maxHeight, item.height ?? 0);
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const width = item.width ?? 0;
    const height = item.height ?? 0;
    const itemX = centerItems ? x + width / 2 : x;
    let itemY;
    switch (align) {
      case "center":
        itemY = (maxHeight - height) / 2;
        break;
      case "end":
        itemY = maxHeight - height;
        break;
      case "start":
      default:
        itemY = 0;
    }
    positions.push({ x: itemX, y: itemY });
    x += width;
    if (i < items.length - 1) {
      x += spacing;
    }
  }
  const totalWidth = x + padding;
  const totalHeight = maxHeight + padding * 2;
  return {
    positions,
    width: totalWidth,
    height: totalHeight
  };
}
function verticalLayout(items, options = {}) {
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const align = options.align ?? "start";
  const centerItems = options.centerItems ?? true;
  let y = padding;
  let maxWidth = 0;
  const positions = [];
  for (const item of items) {
    maxWidth = Math.max(maxWidth, item.width ?? 0);
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const width = item.width ?? 0;
    const height = item.height ?? 0;
    const itemY = centerItems ? y + height / 2 : y;
    let itemX;
    switch (align) {
      case "center":
        itemX = (maxWidth - width) / 2;
        break;
      case "end":
        itemX = maxWidth - width;
        break;
      case "start":
      default:
        itemX = 0;
    }
    positions.push({ x: itemX, y: itemY });
    y += height;
    if (i < items.length - 1) {
      y += spacing;
    }
  }
  const totalWidth = maxWidth + padding * 2;
  const totalHeight = y + padding;
  return {
    positions,
    width: totalWidth,
    height: totalHeight
  };
}
function tileLayout(items, options = {}) {
  if (items.length === 0) {
    return { positions: [], width: 0, height: 0 };
  }
  const columns = options.columns ?? 4;
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const centerItems = options.centerItems ?? true;
  const tileWidth = items[0].width ?? 0;
  const tileHeight = items[0].height ?? 0;
  const rowCount = Math.ceil(items.length / columns);
  const positions = [];
  const totalWidth = columns * tileWidth + (columns - 1) * spacing + padding * 2;
  const totalHeight = rowCount * tileHeight + (rowCount - 1) * spacing + padding * 2;
  let x = padding;
  let y = padding;
  let colIndex = 0;
  for (let i = 0; i < items.length; i++) {
    const itemX = centerItems ? x + tileWidth / 2 : x;
    const itemY = centerItems ? y + tileHeight / 2 : y;
    positions.push({ x: itemX, y: itemY });
    colIndex++;
    if (colIndex < columns) {
      x += tileWidth + spacing;
    } else {
      colIndex = 0;
      x = padding;
      y += tileHeight + spacing;
    }
  }
  return {
    positions,
    width: totalWidth,
    height: totalHeight
  };
}
function gridLayout(items, options = {}) {
  if (items.length === 0) {
    return { positions: [], width: 0, height: 0 };
  }
  const columns = options.columns ?? 4;
  const spacing = options.spacing ?? 10;
  const padding = options.padding ?? 0;
  const centerItems = options.centerItems ?? true;
  const colWidths = new Array(columns).fill(0);
  const rowHeights = [];
  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const itemWidth = item.width ?? 0;
    const itemHeight = item.height ?? 0;
    colWidths[col] = Math.max(colWidths[col], itemWidth);
    if (rowHeights[row] === void 0) {
      rowHeights[row] = itemHeight;
    } else {
      rowHeights[row] = Math.max(rowHeights[row], itemHeight);
    }
  });
  const positions = [];
  let x = padding;
  let y = padding;
  let colIndex = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemWidth = item.width ?? 0;
    const itemHeight = item.height ?? 0;
    const rowHeight = rowHeights[Math.floor(i / columns)];
    const posX = centerItems ? x + itemWidth / 2 : x;
    const posY = centerItems ? y + itemHeight / 2 : y;
    positions.push({ x: posX, y: posY });
    colIndex++;
    if (colIndex < columns) {
      x += colWidths[colIndex - 1] + spacing;
    } else {
      colIndex = 0;
      x = padding;
      y += rowHeight + spacing;
    }
  }
  const totalWidth = padding * 2 + colWidths.reduce((sum, width) => sum + width, 0) + spacing * (columns - 1);
  const totalHeight = padding * 2 + rowHeights.reduce((sum, height) => sum + height, 0) + spacing * (rowHeights.length - 1);
  return {
    positions,
    width: totalWidth,
    height: totalHeight,
    cols: columns,
    rows: rowHeights.length
  };
}
class TaskManager {
  constructor(workerUrl) {
    this.worker = new Worker(workerUrl);
    this.nextTaskId = 1;
    this.pendingTasks = /* @__PURE__ */ new Map();
    this.worker.onmessage = this.handleMessage.bind(this);
  }
  handleMessage(e) {
    const { taskId, status, result, error } = e.data;
    if (this.pendingTasks.has(taskId)) {
      const { resolve, reject } = this.pendingTasks.get(taskId);
      if (status === "complete") {
        resolve(result);
      } else if (status === "error") {
        reject(new Error(error));
      }
      this.pendingTasks.delete(taskId);
    }
  }
  runTask(taskName, params) {
    return new Promise((resolve, reject) => {
      const taskId = this.nextTaskId++;
      this.pendingTasks.set(taskId, { resolve, reject });
      this.worker.postMessage({
        taskId,
        taskName,
        params
      });
    });
  }
  terminate() {
    this.worker.terminate();
  }
}
class Random {
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
  static symmetric(x, y, width, height, spread = 1, coordSystem = "topleft") {
    const cx = coordSystem === "centered" ? x : x + width / 2;
    const cy = coordSystem === "centered" ? y : y + height / 2;
    return {
      x: cx + (Math.random() - 0.5) * width * spread,
      y: cy + (Math.random() - 0.5) * height * spread
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
  static pointInBox(x, y, width, height, coordSystem = "topleft") {
    if (coordSystem === "centered") {
      return {
        x: x + (Math.random() - 0.5) * width,
        y: y + (Math.random() - 0.5) * height
      };
    } else {
      return {
        x: x + Math.random() * width,
        y: y + Math.random() * height
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
  static centered(x, y, width, height, variance = 50, coordSystem = "topleft") {
    const cx = coordSystem === "centered" ? x : x + width / 2;
    const cy = coordSystem === "centered" ? y : y + height / 2;
    return {
      x: cx + (Math.random() - 0.5) * 2 * variance,
      y: cy + (Math.random() - 0.5) * 2 * variance
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
  static gaussian(x, y, width, height, stdDev = 40, coordSystem = "topleft") {
    const cx = coordSystem === "centered" ? x : x + width / 2;
    const cy = coordSystem === "centered" ? y : y + height / 2;
    return {
      x: cx + Random._gaussian(0, stdDev),
      y: cy + Random._gaussian(0, stdDev)
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
  static radial(x, y, width, height, radius = 100, coordSystem = "topleft") {
    const cx = coordSystem === "centered" ? x : x + width / 2;
    const cy = coordSystem === "centered" ? y : y + height / 2;
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r
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
    if (filtered.length === 0) return void 0;
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
    return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
class Complex {
  constructor(real, imag = 0) {
    this.real = real;
    this.imag = imag;
  }
  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
  add(other) {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }
  subtract(other) {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }
  multiply(other) {
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real
    );
  }
  divide(scalar) {
    return new Complex(this.real / scalar, this.imag / scalar);
  }
  scale(scalar) {
    return new Complex(this.real * scalar, this.imag * scalar);
  }
  abs() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }
}
class Fractals {
  /**
   * Apply a color scheme to raw fractal data
   *
   * @param {Uint8Array} fractalData - Raw fractal data
   * @param {ImageData} imageData - Image data to apply color scheme to
   * @param {string} colorScheme - Color scheme to apply
   * @param {number} iterations - Number of iterations
   * @param {number} hueShift - Hue shift
   * @param {function} hslToRgb - Function to convert HSL to RGB
   * @returns {Uint8Array} Array containing color values for each pixel
   */
  static applyColorScheme(fractalData, imageData, colorScheme, iterations, hueShift, hslToRgb) {
    const data = (imageData == null ? void 0 : imageData.data) || [];
    for (let i = 0; i < fractalData.length; i++) {
      const pixelValue = fractalData[i];
      const pixelIndex = i * 4;
      switch (colorScheme) {
        case "futuristic":
          {
            const normalizedValue = fractalData[i] / 10;
            const darkBase = {
              r: 0,
              // Minimal red
              g: 5,
              // Extremely low green
              b: 10
              // Very dark blue-green
            };
            const deepGreenHighlight = {
              r: 0,
              // No red
              g: 30,
              // Low green
              b: 20
              // Slight blue-green tint
            };
            if (normalizedValue > 0.7) {
              const t = (normalizedValue - 0.7) * 3.33;
              data[pixelIndex] = Math.floor(
                darkBase.r * (1 - t) + deepGreenHighlight.r * t
              );
              data[pixelIndex + 1] = Math.floor(
                darkBase.g * (1 - t) + deepGreenHighlight.g * t
              );
              data[pixelIndex + 2] = Math.floor(
                darkBase.b * (1 - t) + deepGreenHighlight.b * t
              );
            } else {
              const t = normalizedValue * 1.43;
              data[pixelIndex] = Math.floor(darkBase.r * t);
              data[pixelIndex + 1] = Math.floor(darkBase.g * t);
              data[pixelIndex + 2] = Math.floor(darkBase.b * t);
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        case "rainbow":
          {
            if (pixelValue === 0) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
              data[pixelIndex + 3] = 255;
            } else {
              const hue = (pixelValue * 10 + hueShift) % 360;
              const [r, g, b] = hslToRgb(hue, 0.8, 0.5);
              data[pixelIndex] = r;
              data[pixelIndex + 1] = g;
              data[pixelIndex + 2] = b;
              data[pixelIndex + 3] = 255;
            }
          }
          break;
        case "grayscale":
          {
            const gray = pixelValue === 0 ? 0 : 255 - pixelValue * 255 / iterations;
            data[pixelIndex] = gray;
            data[pixelIndex + 1] = gray;
            data[pixelIndex + 2] = gray;
            data[pixelIndex + 3] = 255;
          }
          break;
        case "binary":
          {
            if (pixelValue !== 0) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              data[pixelIndex] = 255;
              data[pixelIndex + 1] = 255;
              data[pixelIndex + 2] = 255;
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         * Fire Palette (Heatmap Style)
         */
        case "fire":
          {
            if (pixelValue == 0) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              const t = pixelValue / iterations;
              if (t < 0.3) {
                const v = t / 0.3;
                data[pixelIndex] = Math.floor(255 * v);
                data[pixelIndex + 1] = 0;
                data[pixelIndex + 2] = 0;
              } else if (t < 0.6) {
                const v = (t - 0.3) / 0.3;
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = Math.floor(165 * v);
                data[pixelIndex + 2] = 0;
              } else if (t < 0.9) {
                const v = (t - 0.6) / 0.3;
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = 165 + Math.floor(90 * v);
                data[pixelIndex + 2] = Math.floor(255 * v);
              } else {
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = 255;
                data[pixelIndex + 2] = 255;
              }
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         * Ocean Palette (Cool Blues/Greens)
         */
        case "ocean":
          {
            if (pixelValue === 0) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 20;
              data[pixelIndex + 2] = 50;
            } else {
              const t = pixelValue / iterations;
              data[pixelIndex] = Math.floor(10 + 50 * t);
              data[pixelIndex + 1] = Math.floor(50 + 150 * t);
              data[pixelIndex + 2] = Math.floor(100 + 155 * t);
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         * Electric Palette (80's inspired neon colors)
         */
        case "electric":
          {
            if (pixelValue === 0) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              const phase = (pixelValue + hueShift) % 3;
              const t = pixelValue % 20 / 20;
              if (phase === 0) {
                data[pixelIndex] = Math.floor(
                  255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
                );
                data[pixelIndex + 1] = Math.floor(128 * t);
                data[pixelIndex + 2] = Math.floor(255 * t);
              } else if (phase === 1) {
                data[pixelIndex] = Math.floor(255 * t);
                data[pixelIndex + 1] = Math.floor(
                  255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
                );
                data[pixelIndex + 2] = Math.floor(128 * t);
              } else {
                data[pixelIndex] = Math.floor(128 * t);
                data[pixelIndex + 1] = Math.floor(255 * t);
                data[pixelIndex + 2] = Math.floor(
                  255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
                );
              }
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        case "topographic":
          {
            if (pixelValue === 0) {
              data[pixelIndex] = 5;
              data[pixelIndex + 1] = 15;
              data[pixelIndex + 2] = 30;
            } else {
              const elevation = pixelValue / iterations;
              if (elevation < 0.1) {
                const depth = elevation / 0.1;
                data[pixelIndex] = Math.floor(5 + 20 * depth);
                data[pixelIndex + 1] = Math.floor(15 + 40 * depth);
                data[pixelIndex + 2] = Math.floor(30 + 50 * depth);
              } else if (elevation < 0.3) {
                const t = (elevation - 0.1) / 0.2;
                data[pixelIndex] = Math.floor(210 + 45 * t);
                data[pixelIndex + 1] = Math.floor(180 + 40 * t);
                data[pixelIndex + 2] = Math.floor(140 + 30 * t);
              } else if (elevation < 0.7) {
                const t = (elevation - 0.3) / 0.4;
                data[pixelIndex] = Math.floor(50 * (1 - t));
                data[pixelIndex + 1] = Math.floor(100 + 80 * t);
                data[pixelIndex + 2] = Math.floor(50 * (1 - t));
              } else {
                const t = (elevation - 0.7) / 0.3;
                data[pixelIndex] = Math.floor(150 + 105 * t);
                data[pixelIndex + 1] = Math.floor(150 + 105 * t);
                data[pixelIndex + 2] = Math.floor(150 + 105 * t);
              }
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         *  Historical Palette (Classic Fractint Colors)
         */
        case "historic":
        default: {
          if (pixelValue === 0) {
            data[pixelIndex] = 0;
            data[pixelIndex + 1] = 0;
            data[pixelIndex + 2] = 0;
          } else {
            const cycle = 64;
            const pos = (pixelValue + hueShift) % cycle;
            if (pos < 16) {
              data[pixelIndex] = pos * 16;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else if (pos < 32) {
              data[pixelIndex] = 255;
              data[pixelIndex + 1] = (pos - 16) * 16;
              data[pixelIndex + 2] = 0;
            } else if (pos < 48) {
              data[pixelIndex] = 255 - (pos - 32) * 16;
              data[pixelIndex + 1] = 255;
              data[pixelIndex + 2] = 0;
            } else {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 255 - (pos - 48) * 16;
              data[pixelIndex + 2] = (pos - 48) * 16;
            }
          }
          data[pixelIndex + 3] = 255;
        }
      }
    }
    return imageData != null ? imageData : data;
  }
  /**
   * Generates a Pythagoras tree fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for tree depth
   * @param {number} xMin - Minimum X coordinate in viewing plane
   * @param {number} xMax - Maximum X coordinate in viewing plane
   * @param {number} yMin - Minimum Y coordinate in viewing plane
   * @param {number} yMax - Maximum Y coordinate in viewing plane
   * @returns {Uint8Array} Array containing pixel values for the Pythagoras tree
   */
  static pythagorasTree(width, height, maxIterations = 10, xMin = -2, xMax = 2, yMin = -0.5, yMax = 3.5) {
    const data = new Uint8Array(width * height);
    const mapX = (x) => Math.floor((x - xMin) * width / (xMax - xMin));
    const mapY = (y) => Math.floor((y - yMin) * height / (yMax - yMin));
    const drawLine2 = (x0, y0, x1, y1) => {
      const sx = mapX(x0);
      const sy = mapY(y0);
      const ex = mapX(x1);
      const ey = mapY(y1);
      let x = sx, y = sy;
      const dx = Math.abs(ex - sx), dy = Math.abs(ey - sy);
      const sx1 = sx < ex ? 1 : -1, sy1 = sy < ey ? 1 : -1;
      let err = dx - dy;
      while (true) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = 255;
        }
        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx1;
        }
        if (e2 < dx) {
          err += dx;
          y += sy1;
        }
      }
    };
    const drawSquare = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      drawLine2(x1, y1, x2, y2);
      drawLine2(x2, y2, x3, y3);
      drawLine2(x3, y3, x4, y4);
      drawLine2(x4, y4, x1, y1);
    };
    const drawTree = (x1, y1, x2, y2, depth) => {
      if (depth <= 0) return;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const x3 = x2 + dy;
      const y3 = y2 - dx;
      const x4 = x1 + dy;
      const y4 = y1 - dx;
      drawSquare(x1, y1, x2, y2, x3, y3, x4, y4);
      const angle = Math.PI / 4;
      const rightLen = Math.sqrt(dx * dx + dy * dy) * 0.7;
      const rightDx = rightLen * Math.cos(Math.atan2(dy, dx) - angle);
      const rightDy = rightLen * Math.sin(Math.atan2(dy, dx) - angle);
      const leftLen = Math.sqrt(dx * dx + dy * dy) * 0.7;
      const leftDx = leftLen * Math.cos(Math.atan2(dy, dx) + angle);
      const leftDy = leftLen * Math.sin(Math.atan2(dy, dx) + angle);
      const startRightX = x3;
      const startRightY = y3;
      const startLeftX = x4;
      const startLeftY = y4;
      const endRightX = startRightX + rightDx;
      const endRightY = startRightY + rightDy;
      const endLeftX = startLeftX + leftDx;
      const endLeftY = startLeftY + leftDy;
      drawTree(startRightX, startRightY, endRightX, endRightY, depth - 1);
      drawTree(startLeftX, startLeftY, endLeftX, endLeftY, depth - 1);
    };
    const iterations = Math.min(maxIterations, 12);
    const trunkWidth = 1;
    const startX = -1 / 2;
    const startY = 0;
    const endX = trunkWidth / 2;
    const endY = 0;
    drawTree(startX, startY, endX, endY, iterations);
    return data;
  }
  /**
   * Generates a Mandelbrot set with optimized performance
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {number} xMin - Minimum X coordinate in complex plane
   * @param {number} xMax - Maximum X coordinate in complex plane
   * @param {number} yMin - Minimum Y coordinate in complex plane
   * @param {number} yMax - Maximum Y coordinate in complex plane
   * @returns {Uint8Array} Array containing iteration values for each pixel
   */
  static mandelbrot(width, height, maxIterations = 100, xMin = -2.5, xMax = 1, yMin = -1.5, yMax = 1.5) {
    const data = new Uint8Array(width * height);
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const cImag = yMin + y * yScale;
      for (let x = 0; x < width; x++) {
        const cReal = xMin + x * xScale;
        let zReal = 0;
        let zImag = 0;
        let zRealSq = 0;
        let zImagSq = 0;
        let i = 0;
        do {
          const zRealTemp = zRealSq - zImagSq + cReal;
          zImag = 2 * zReal * zImag + cImag;
          zReal = zRealTemp;
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;
          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);
        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }
    return data;
  }
  /**
   * Generates a Julia set
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {number} cReal - Real component of C parameter
   * @param {number} cImag - Imaginary component of C parameter
   * @param {number} zoom - Zoom level
   * @param {number} offsetX - X offset for panning
   * @param {number} offsetY - Y offset for panning
   * @returns {Uint8Array} Array containing iteration values for each pixel
   */
  static julia(width, height, maxIterations = 100, cReal = -0.7, cImag = 0.27, zoom = 1, offsetX = 0, offsetY = 0) {
    const data = new Uint8Array(width * height);
    const scale = 2 / zoom;
    const xMin = -scale + offsetX;
    const xMax = scale + offsetX;
    const yMin = -scale + offsetY;
    const yMax = scale + offsetY;
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const zImagInit = yMin + y * yScale;
      for (let x = 0; x < width; x++) {
        const zRealInit = xMin + x * xScale;
        let zReal = zRealInit;
        let zImag = zImagInit;
        let zRealSq = 0;
        let zImagSq = 0;
        let i = 0;
        do {
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;
          const tempZReal = zRealSq - zImagSq + cReal;
          zImag = 2 * zReal * zImag + cImag;
          zReal = tempZReal;
          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);
        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }
    return data;
  }
  /**
   * Generates a Tricorn fractal (Mandelbar set) with zoom/pan support
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations
   * @param {number} xMin - Minimum X coordinate in complex plane
   * @param {number} xMax - Maximum X coordinate in complex plane
   * @param {number} yMin - Minimum Y coordinate in complex plane
   * @param {number} yMax - Maximum Y coordinate in complex plane
   * @returns {Uint8Array} Iteration counts
   */
  static tricorn(width, height, maxIterations = 100, xMin = -2.5, xMax = 1.5, yMin = -1.5, yMax = 1.5) {
    const data = new Uint8Array(width * height);
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const cImag = yMin + y * yScale;
      for (let x = 0; x < width; x++) {
        const cReal = xMin + x * xScale;
        let zReal = 0;
        let zImag = 0;
        let zRealSq = 0;
        let zImagSq = 0;
        let i = 0;
        do {
          const tempZReal = zRealSq - zImagSq + cReal;
          zImag = -2 * zReal * zImag + cImag;
          zReal = tempZReal;
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;
          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);
        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }
    return data;
  }
  /**
   * Generates a Phoenix fractal with zoom/pan support
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations
   * @param {number} p - Parameter p (controls feedback)
   * @param {number} q - Parameter q (controls feedback)
   * @param {number} xMin - Minimum X coordinate in complex plane
   * @param {number} xMax - Maximum X coordinate in complex plane
   * @param {number} yMin - Minimum Y coordinate in complex plane
   * @param {number} yMax - Maximum Y coordinate in complex plane
   * @returns {Uint8Array} Iteration counts
   */
  static phoenix(width, height, maxIterations = 100, p = 0.5, q = 0.5, xMin = -2, xMax = 2, yMin = -2, yMax = 2) {
    const data = new Uint8Array(width * height);
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const cImag = yMin + y * yScale;
      for (let x = 0; x < width; x++) {
        const cReal = xMin + x * xScale;
        let zReal = 0;
        let zImag = 0;
        let prevZReal = 0;
        let prevZImag = 0;
        let zRealSq = 0;
        let zImagSq = 0;
        let i = 0;
        do {
          const tempZReal = zRealSq - zImagSq + cReal + p * prevZReal + q;
          const tempZImag = 2 * zReal * zImag + cImag + p * prevZImag;
          prevZReal = zReal;
          prevZImag = zImag;
          zReal = tempZReal;
          zImag = tempZImag;
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;
          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);
        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }
    return data;
  }
  /**
   * Generates a Newton fractal with optimized performance
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {number} tolerance - Convergence tolerance
   * @param {number} xMin - Minimum x-coordinate in complex plane
   * @param {number} xMax - Maximum x-coordinate in complex plane
   * @param {number} yMin - Minimum y-coordinate in complex plane
   * @param {number} yMax - Maximum y-coordinate in complex plane
   * @returns {Uint8Array} Array containing iteration and root information
   */
  static newton(width, height, maxIterations = 100, tolerance = 1e-6, xMin = -2, xMax = 2, yMin = -2, yMax = 2) {
    const data = new Uint8Array(width * height);
    const toleranceSquared = tolerance * tolerance;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const rootCount = 3;
    const rootsReal = new Float64Array(rootCount);
    const rootsImag = new Float64Array(rootCount);
    for (let k = 0; k < rootCount; k++) {
      const angle = 2 * Math.PI * k / rootCount;
      rootsReal[k] = Math.cos(angle);
      rootsImag[k] = Math.sin(angle);
    }
    const xFactor = xRange / width;
    const yFactor = yRange / height;
    for (let y = 0; y < height; y++) {
      const baseY = y * width;
      const imag = yMin + y * yFactor;
      for (let x = 0; x < width; x++) {
        const real = xMin + x * xFactor;
        let zReal = real;
        let zImag = imag;
        let iteration = 0;
        let rootIndex = -1;
        while (iteration < maxIterations && rootIndex < 0) {
          const z2Real = zReal * zReal - zImag * zImag;
          const z2Imag = 2 * zReal * zImag;
          const fzReal = z2Real * zReal - z2Imag * zImag - 1;
          const fzImag = z2Real * zImag + z2Imag * zReal;
          const dfzReal = 3 * z2Real;
          const dfzImag = 3 * z2Imag;
          const dfzMagSquared = dfzReal * dfzReal + dfzImag * dfzImag;
          if (dfzMagSquared < toleranceSquared) break;
          const denomInv = 1 / dfzMagSquared;
          const divReal = (fzReal * dfzReal + fzImag * dfzImag) * denomInv;
          const divImag = (fzImag * dfzReal - fzReal * dfzImag) * denomInv;
          const zNextReal = zReal - divReal;
          const zNextImag = zImag - divImag;
          for (let i = 0; i < rootCount; i++) {
            const diffReal = zNextReal - rootsReal[i];
            const diffImag = zNextImag - rootsImag[i];
            const distSquared = diffReal * diffReal + diffImag * diffImag;
            if (distSquared < toleranceSquared) {
              rootIndex = i;
              break;
            }
          }
          zReal = zNextReal;
          zImag = zNextImag;
          iteration++;
        }
        if (rootIndex >= 0) {
          const iterationFactor = 1 - Math.min(iteration / maxIterations, 1);
          const rootOffset = rootIndex * (255 / rootCount);
          data[baseY + x] = Math.floor(
            rootOffset + iterationFactor * (255 / rootCount)
          );
        } else {
          data[baseY + x] = 0;
        }
      }
    }
    return data;
  }
  /**
   * Binary mask (1 = filled, 0 = hole) for an equilateral Sierpiński triangle.
   * Modified to control visible triangle count with iterations parameter.
   *
   * @param {number} width       Canvas / bitmap width  (px)
   * @param {number} height      Canvas / bitmap height (px)
   * @param {number} iterations  Controls number of visible triangles (1-15)
   * @param {number} xMin        World-space left   (pan / zoom)
   * @param {number} xMax        World-space right
   * @param {number} yMin        World-space bottom
   * @param {number} yMax        World-space top
   * @returns {Uint8Array}       Row-major bitmap of 0/1 values
   */
  static sierpinski(width, height, iterations = 6, xMin = 0, xMax = 1, yMin = 0, yMax = 1) {
    const data = new Uint8Array(width * height).fill(1);
    const ideal = Math.sqrt(3) / 2;
    const spanX = xMax - xMin;
    const spanY = yMax - yMin;
    const current = spanY / spanX;
    if (Math.abs(current - ideal) > 1e-9) {
      const midY = (yMin + yMax) / 2;
      const newSpanY = spanX * ideal;
      yMin = midY - newSpanY / 2;
      yMax = midY + newSpanY / 2;
    }
    const effectiveIterations = Math.min(iterations, 32);
    const mask = (1 << effectiveIterations) - 1;
    const invW = (xMax - xMin) / width;
    const invH = (yMax - yMin) / height;
    const invTri = 2 / Math.sqrt(3);
    for (let py = 0; py < height; ++py) {
      const yCoord = yMin + py * invH;
      const j = Math.floor(yCoord * invTri);
      const shift = j * 0.5;
      for (let px = 0; px < width; ++px) {
        const xCoord = xMin + px * invW;
        const i = Math.floor(xCoord - shift);
        if ((i & j & mask) !== 0) {
          data[py * width + px] = 0;
        }
      }
    }
    return data;
  }
  static sierpinskiCarpet(width, height, iterations = 5, xMin = 0, xMax = 1, yMin = 0, yMax = 1) {
    const data = new Uint8Array(width * height).fill(1);
    const spanX = xMax - xMin;
    const spanY = yMax - yMin;
    const size = Math.max(spanX, spanY);
    const centerX = (xMin + xMax) / 2;
    const centerY = (yMin + yMax) / 2;
    xMin = centerX - size / 2;
    xMax = centerX + size / 2;
    yMin = centerY - size / 2;
    yMax = centerY + size / 2;
    const pow3 = Math.pow(3, iterations);
    const isHole = (ix, iy) => {
      let x = ix;
      let y = iy;
      while (x > 0 || y > 0) {
        if (x % 3 === 1 && y % 3 === 1) {
          return true;
        }
        x = Math.floor(x / 3);
        y = Math.floor(y / 3);
      }
      return false;
    };
    for (let py = 0; py < height; ++py) {
      const worldY = yMin + py / height * (yMax - yMin);
      const carpetY = worldY * pow3;
      const iy = (Math.floor(carpetY) % pow3 + pow3) % pow3;
      for (let px = 0; px < width; ++px) {
        const worldX = xMin + px / width * (xMax - xMin);
        const carpetX = worldX * pow3;
        const ix = (Math.floor(carpetX) % pow3 + pow3) % pow3;
        if (isHole(ix, iy)) {
          data[py * width + px] = 0;
        }
      }
    }
    return data;
  }
  /**
   * Generates a Barnsley Fern fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} [iterations=100000] - Number of points to generate
   * @returns {Uint8Array} Density map (0-255)
   */
  static barnsleyFern(width, height, iterations = 1e5) {
    const data = new Uint8Array(width * height).fill(0);
    let x = 0, y = 0;
    const scale = Math.min(width, height) / 10;
    const offsetX = width / 2;
    for (let i = 0; i < iterations; i++) {
      const r = Math.random();
      let nx, ny;
      if (r < 0.01) {
        nx = 0;
        ny = 0.16 * y;
      } else if (r < 0.86) {
        nx = 0.85 * x + 0.04 * y;
        ny = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 0.93) {
        nx = 0.2 * x - 0.26 * y;
        ny = 0.23 * x + 0.22 * y + 1.6;
      } else {
        nx = -0.15 * x + 0.28 * y;
        ny = 0.26 * x + 0.24 * y + 0.44;
      }
      x = nx;
      y = ny;
      const px = Math.floor(x * scale + offsetX);
      const py = Math.floor(height - y * scale);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const index = py * width + px;
        if (data[index] < 255) data[index]++;
      }
    }
    return data;
  }
  /**
   * Generates a Lyapunov fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {string} sequence - Sequence of A and B to use in calculation
   * @param {number} aMin - Minimum value for parameter A
   * @param {number} aMax - Maximum value for parameter A
   * @param {number} bMin - Minimum value for parameter B
   * @param {number} bMax - Maximum value for parameter B
   * @returns {Uint8Array} Array containing iteration values for each pixel
   */
  static lyapunov(width, height, maxIterations = 1e3, sequence = "AB", aMin = 3.4, aMax = 4, bMin = 3.4, bMax = 4) {
    console.time("lyapunov");
    sequence = sequence.toUpperCase().replace(/[^AB]/g, "") || "AB";
    const seqLen = sequence.length;
    const data = new Float32Array(width * height);
    let min = Infinity;
    let max = -Infinity;
    for (let y = 0; y < height; y++) {
      const b = bMin + (bMax - bMin) * y / height;
      for (let x = 0; x < width; x++) {
        const a = aMin + (aMax - aMin) * x / width;
        let xVal = 0.5;
        for (let i = 0; i < 100; i++) {
          const r = sequence[i % seqLen] === "A" ? a : b;
          xVal = r * xVal * (1 - xVal);
        }
        let sum = 0;
        let iteration = 0;
        while (iteration < maxIterations) {
          const r = sequence[iteration % seqLen] === "A" ? a : b;
          xVal = r * xVal * (1 - xVal);
          const derivative = Math.abs(r * (1 - 2 * xVal));
          sum += Math.log(Math.max(derivative, 1e-10));
          iteration++;
          if (Math.abs(sum / iteration) > 10) break;
        }
        const exponent = sum / iteration;
        data[y * width + x] = exponent;
        if (exponent > -10 && exponent < 10) {
          if (exponent < min) min = exponent;
          if (exponent > max) max = exponent;
        }
      }
    }
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const range = max - min;
    const output = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i++) {
      let value = data[i];
      value = Math.max(-10, Math.min(10, value));
      let normalized = (value - min) / range;
      output[i] = Math.floor(normalized * 255);
    }
    console.timeEnd("lyapunov");
    return output;
  }
  /**
   * Generates a Koch snowflake fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for Koch snowflake detail
   * @param {number} xMin - Minimum X coordinate in viewing plane
   * @param {number} xMax - Maximum X coordinate in viewing plane
   * @param {number} yMin - Minimum Y coordinate in viewing plane
   * @param {number} yMax - Maximum Y coordinate in viewing plane
   * @returns {Uint8Array} Array containing pixel values for the Koch snowflake
   */
  static koch(width, height, maxIterations = 4, xMin = -2, xMax = 2, yMin = -2, yMax = 2) {
    const data = new Uint8Array(width * height);
    const mapX = (x) => Math.floor((x - xMin) * width / (xMax - xMin));
    const mapY = (y) => Math.floor((y - yMin) * height / (yMax - yMin));
    const drawLine2 = (x0, y0, x1, y1) => {
      const sx = mapX(x0);
      const sy = mapY(y0);
      const ex = mapX(x1);
      const ey = mapY(y1);
      let x = sx, y = sy;
      const dx = Math.abs(ex - sx), dy = Math.abs(ey - sy);
      const sx1 = sx < ex ? 1 : -1, sy1 = sy < ey ? 1 : -1;
      let err = dx - dy;
      while (true) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = 255;
        }
        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx1;
        }
        if (e2 < dx) {
          err += dx;
          y += sy1;
        }
      }
    };
    const kochSegment = (x1, y1, x2, y2, depth) => {
      if (depth <= 0) {
        drawLine2(x1, y1, x2, y2);
        return;
      }
      const dx = (x2 - x1) / 3;
      const dy = (y2 - y1) / 3;
      const x3 = x1 + dx;
      const y3 = y1 + dy;
      const x5 = x1 + 2 * dx;
      const y5 = y1 + 2 * dy;
      const angle = Math.PI / 3;
      const x4 = x3 + dx * Math.cos(angle) - dy * Math.sin(angle);
      const y4 = y3 + dx * Math.sin(angle) + dy * Math.cos(angle);
      kochSegment(x1, y1, x3, y3, depth - 1);
      kochSegment(x3, y3, x4, y4, depth - 1);
      kochSegment(x4, y4, x5, y5, depth - 1);
      kochSegment(x5, y5, x2, y2, depth - 1);
    };
    const iterations = Math.min(maxIterations, 10);
    const size = 3;
    const h = size * Math.sqrt(3) / 2;
    const p1 = [0, -h / 2 + 0.5];
    const p2 = [-3 / 2, h / 2 + 0.5];
    const p3 = [size / 2, h / 2 + 0.5];
    kochSegment(p1[0], p1[1], p2[0], p2[1], iterations);
    kochSegment(p2[0], p2[1], p3[0], p3[1], iterations);
    kochSegment(p3[0], p3[1], p1[0], p1[1], iterations);
    return data;
  }
}
/**
 * Types of fractals
 */
__publicField(Fractals, "types", {
  MANDELBROT: "mandelbrot",
  TRICORN: "tricorn",
  PHOENIX: "phoenix",
  JULIA: "julia",
  SIERPINSKI: "sierpinski",
  SCARPET: "sierpinskiCarpet",
  BARNSEY_FERN: "barnsleyFern",
  KOCH: "koch",
  PYTHAGORAS_TREE: "pythagorasTree",
  NEWTON: "newton",
  LYAPUNOV: "lyapunov"
});
__publicField(Fractals, "colors", {
  FUTURISTIC: "futuristic",
  RAINBOW: "rainbow",
  GRAYSCALE: "grayscale",
  TOPOGRAPHIC: "topographic",
  FIRE: "fire",
  OCEAN: "ocean",
  ELECTRIC: "electric",
  BINARY: "binary",
  HISTORIC: "historic"
});
const _Noise = class _Noise {
  /**
   * Seed the noise function
   * @param {number} seed - A seed value between 0 and 65535
   */
  static seed(seed) {
    if (seed > 0 && seed < 1) {
      seed *= 65536;
    }
    seed = Math.floor(seed);
    if (seed < 256) {
      seed |= seed << 8;
    }
    for (let i = 0; i < 256; i++) {
      let v;
      if (i & 1) {
        v = __privateGet(this, _p)[i] ^ seed & 255;
      } else {
        v = __privateGet(this, _p)[i] ^ seed >> 8 & 255;
      }
      __privateGet(this, _perm)[i] = __privateGet(this, _perm)[i + 256] = v;
      __privateGet(this, _gradP)[i] = __privateGet(this, _gradP)[i + 256] = __privateGet(this, _grad3)[v % 12];
    }
  }
  /**
   * 2D simplex noise
   * @param {number} xin - X coordinate
   * @param {number} yin - Y coordinate
   * @returns {number} Noise value in range [-1, 1]
   */
  static simplex2(xin, yin) {
    let n0, n1, n2;
    const s = (xin + yin) * __privateGet(this, _F2);
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * __privateGet(this, _G2);
    const x0 = xin - i + t;
    const y0 = yin - j + t;
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    const x1 = x0 - i1 + __privateGet(this, _G2);
    const y1 = y0 - j1 + __privateGet(this, _G2);
    const x2 = x0 - 1 + 2 * __privateGet(this, _G2);
    const y2 = y0 - 1 + 2 * __privateGet(this, _G2);
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = __privateGet(this, _gradP)[ii + __privateGet(this, _perm)[jj]];
    const gi1 = __privateGet(this, _gradP)[ii + i1 + __privateGet(this, _perm)[jj + j1]];
    const gi2 = __privateGet(this, _gradP)[ii + 1 + __privateGet(this, _perm)[jj + 1]];
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot2(x0, y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot2(x1, y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot2(x2, y2);
    }
    return 70 * (n0 + n1 + n2);
  }
  /**
   * 3D simplex noise
   * @param {number} xin - X coordinate
   * @param {number} yin - Y coordinate
   * @param {number} zin - Z coordinate
   * @returns {number} Noise value in range [-1, 1]
   */
  static simplex3(xin, yin, zin) {
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * __privateGet(this, _F3);
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * __privateGet(this, _G3);
    const x0 = xin - i + t;
    const y0 = yin - j + t;
    const z0 = zin - k + t;
    let i1, j1, k1;
    let i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }
    const x1 = x0 - i1 + __privateGet(this, _G3);
    const y1 = y0 - j1 + __privateGet(this, _G3);
    const z1 = z0 - k1 + __privateGet(this, _G3);
    const x2 = x0 - i2 + 2 * __privateGet(this, _G3);
    const y2 = y0 - j2 + 2 * __privateGet(this, _G3);
    const z2 = z0 - k2 + 2 * __privateGet(this, _G3);
    const x3 = x0 - 1 + 3 * __privateGet(this, _G3);
    const y3 = y0 - 1 + 3 * __privateGet(this, _G3);
    const z3 = z0 - 1 + 3 * __privateGet(this, _G3);
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = __privateGet(this, _gradP)[ii + __privateGet(this, _perm)[jj + __privateGet(this, _perm)[kk]]];
    const gi1 = __privateGet(this, _gradP)[ii + i1 + __privateGet(this, _perm)[jj + j1 + __privateGet(this, _perm)[kk + k1]]];
    const gi2 = __privateGet(this, _gradP)[ii + i2 + __privateGet(this, _perm)[jj + j2 + __privateGet(this, _perm)[kk + k2]]];
    const gi3 = __privateGet(this, _gradP)[ii + 1 + __privateGet(this, _perm)[jj + 1 + __privateGet(this, _perm)[kk + 1]]];
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * gi0.dot3(x0, y0, z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) {
      n3 = 0;
    } else {
      t3 *= t3;
      n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  }
  /**
   * 2D Perlin Noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Noise value in range [-1, 1]
   */
  static perlin2(x, y) {
    const X = Math.floor(x), Y = Math.floor(y);
    x = x - X;
    y = y - Y;
    const XX = X & 255, YY = Y & 255;
    const n00 = __privateGet(this, _gradP)[XX + __privateGet(this, _perm)[YY]].dot2(x, y);
    const n01 = __privateGet(this, _gradP)[XX + __privateGet(this, _perm)[YY + 1]].dot2(x, y - 1);
    const n10 = __privateGet(this, _gradP)[XX + 1 + __privateGet(this, _perm)[YY]].dot2(x - 1, y);
    const n11 = __privateGet(this, _gradP)[XX + 1 + __privateGet(this, _perm)[YY + 1]].dot2(x - 1, y - 1);
    const u = __privateMethod(this, _Noise_static, fade_fn).call(this, x);
    return __privateMethod(this, _Noise_static, lerp_fn).call(this, __privateMethod(this, _Noise_static, lerp_fn).call(this, n00, n10, u), __privateMethod(this, _Noise_static, lerp_fn).call(this, n01, n11, u), __privateMethod(this, _Noise_static, fade_fn).call(this, y));
  }
  /**
   * 3D Perlin Noise
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Noise value in range [-1, 1]
   */
  static perlin3(x, y, z) {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x = x - X;
    y = y - Y;
    z = z - Z;
    const XX = X & 255, YY = Y & 255, ZZ = Z & 255;
    const n000 = __privateGet(this, _gradP)[XX + __privateGet(this, _perm)[YY + __privateGet(this, _perm)[ZZ]]].dot3(
      x,
      y,
      z
    );
    const n001 = __privateGet(this, _gradP)[XX + __privateGet(this, _perm)[YY + __privateGet(this, _perm)[ZZ + 1]]].dot3(
      x,
      y,
      z - 1
    );
    const n010 = __privateGet(this, _gradP)[XX + __privateGet(this, _perm)[YY + 1 + __privateGet(this, _perm)[ZZ]]].dot3(
      x,
      y - 1,
      z
    );
    const n011 = __privateGet(this, _gradP)[XX + __privateGet(this, _perm)[YY + 1 + __privateGet(this, _perm)[ZZ + 1]]].dot3(
      x,
      y - 1,
      z - 1
    );
    const n100 = __privateGet(this, _gradP)[XX + 1 + __privateGet(this, _perm)[YY + __privateGet(this, _perm)[ZZ]]].dot3(
      x - 1,
      y,
      z
    );
    const n101 = __privateGet(this, _gradP)[XX + 1 + __privateGet(this, _perm)[YY + __privateGet(this, _perm)[ZZ + 1]]].dot3(
      x - 1,
      y,
      z - 1
    );
    const n110 = __privateGet(this, _gradP)[XX + 1 + __privateGet(this, _perm)[YY + 1 + __privateGet(this, _perm)[ZZ]]].dot3(
      x - 1,
      y - 1,
      z
    );
    const n111 = __privateGet(this, _gradP)[XX + 1 + __privateGet(this, _perm)[YY + 1 + __privateGet(this, _perm)[ZZ + 1]]].dot3(x - 1, y - 1, z - 1);
    const u = __privateMethod(this, _Noise_static, fade_fn).call(this, x);
    const v = __privateMethod(this, _Noise_static, fade_fn).call(this, y);
    const w = __privateMethod(this, _Noise_static, fade_fn).call(this, z);
    return __privateMethod(this, _Noise_static, lerp_fn).call(this, __privateMethod(this, _Noise_static, lerp_fn).call(this, __privateMethod(this, _Noise_static, lerp_fn).call(this, n000, n100, u), __privateMethod(this, _Noise_static, lerp_fn).call(this, n001, n101, u), w), __privateMethod(this, _Noise_static, lerp_fn).call(this, __privateMethod(this, _Noise_static, lerp_fn).call(this, n010, n110, u), __privateMethod(this, _Noise_static, lerp_fn).call(this, n011, n111, u), w), v);
  }
};
_Grad = new WeakMap();
_grad3 = new WeakMap();
_p = new WeakMap();
_perm = new WeakMap();
_gradP = new WeakMap();
_F2 = new WeakMap();
_G2 = new WeakMap();
_F3 = new WeakMap();
_G3 = new WeakMap();
_Noise_static = new WeakSet();
fade_fn = function(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
};
lerp_fn = function(a, b, t) {
  return (1 - t) * a + t * b;
};
__privateAdd(_Noise, _Noise_static);
// Internal helper class for gradient calculations
__privateAdd(_Noise, _Grad, class {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  dot2(x, y) {
    return this.x * x + this.y * y;
  }
  dot3(x, y, z) {
    return this.x * x + this.y * y + this.z * z;
  }
});
// Pre-computed gradients
__privateAdd(_Noise, _grad3, [
  new (__privateGet(_Noise, _Grad))(1, 1, 0),
  new (__privateGet(_Noise, _Grad))(-1, 1, 0),
  new (__privateGet(_Noise, _Grad))(1, -1, 0),
  new (__privateGet(_Noise, _Grad))(-1, -1, 0),
  new (__privateGet(_Noise, _Grad))(1, 0, 1),
  new (__privateGet(_Noise, _Grad))(-1, 0, 1),
  new (__privateGet(_Noise, _Grad))(1, 0, -1),
  new (__privateGet(_Noise, _Grad))(-1, 0, -1),
  new (__privateGet(_Noise, _Grad))(0, 1, 1),
  new (__privateGet(_Noise, _Grad))(0, -1, 1),
  new (__privateGet(_Noise, _Grad))(0, 1, -1),
  new (__privateGet(_Noise, _Grad))(0, -1, -1)
]);
// Permutation table
__privateAdd(_Noise, _p, [
  151,
  160,
  137,
  91,
  90,
  15,
  131,
  13,
  201,
  95,
  96,
  53,
  194,
  233,
  7,
  225,
  140,
  36,
  103,
  30,
  69,
  142,
  8,
  99,
  37,
  240,
  21,
  10,
  23,
  190,
  6,
  148,
  247,
  120,
  234,
  75,
  0,
  26,
  197,
  62,
  94,
  252,
  219,
  203,
  117,
  35,
  11,
  32,
  57,
  177,
  33,
  88,
  237,
  149,
  56,
  87,
  174,
  20,
  125,
  136,
  171,
  168,
  68,
  175,
  74,
  165,
  71,
  134,
  139,
  48,
  27,
  166,
  77,
  146,
  158,
  231,
  83,
  111,
  229,
  122,
  60,
  211,
  133,
  230,
  220,
  105,
  92,
  41,
  55,
  46,
  245,
  40,
  244,
  102,
  143,
  54,
  65,
  25,
  63,
  161,
  1,
  216,
  80,
  73,
  209,
  76,
  132,
  187,
  208,
  89,
  18,
  169,
  200,
  196,
  135,
  130,
  116,
  188,
  159,
  86,
  164,
  100,
  109,
  198,
  173,
  186,
  3,
  64,
  52,
  217,
  226,
  250,
  124,
  123,
  5,
  202,
  38,
  147,
  118,
  126,
  255,
  82,
  85,
  212,
  207,
  206,
  59,
  227,
  47,
  16,
  58,
  17,
  182,
  189,
  28,
  42,
  223,
  183,
  170,
  213,
  119,
  248,
  152,
  2,
  44,
  154,
  163,
  70,
  221,
  153,
  101,
  155,
  167,
  43,
  172,
  9,
  129,
  22,
  39,
  253,
  19,
  98,
  108,
  110,
  79,
  113,
  224,
  232,
  178,
  185,
  112,
  104,
  218,
  246,
  97,
  228,
  251,
  34,
  242,
  193,
  238,
  210,
  144,
  12,
  191,
  179,
  162,
  241,
  81,
  51,
  145,
  235,
  249,
  14,
  239,
  107,
  49,
  192,
  214,
  31,
  181,
  199,
  106,
  157,
  184,
  84,
  204,
  176,
  115,
  121,
  50,
  45,
  127,
  4,
  150,
  254,
  138,
  236,
  205,
  93,
  222,
  114,
  67,
  29,
  24,
  72,
  243,
  141,
  128,
  195,
  78,
  66,
  215,
  61,
  156,
  180
]);
// To remove the need for index wrapping, double the permutation table length
__privateAdd(_Noise, _perm, new Array(512));
__privateAdd(_Noise, _gradP, new Array(512));
// Skewing and unskewing factors
__privateAdd(_Noise, _F2, 0.5 * (Math.sqrt(3) - 1));
__privateAdd(_Noise, _G2, (3 - Math.sqrt(3)) / 6);
__privateAdd(_Noise, _F3, 1 / 3);
__privateAdd(_Noise, _G3, 1 / 6);
_Noise.seed(0);
let Noise = _Noise;
function generatePenroseTilingPixels(width = 800, height = 800, options) {
  const {
    divisions = 5,
    zoomType = "in",
    color1 = [255, 0, 0, 255],
    // Red for thin rhombi (0-255 range)
    color2 = [0, 0, 255, 255],
    // Blue for thick rhombi (0-255 range)
    color3 = [0, 0, 0, 255],
    // Black for outlines (0-255 range)
    backgroundColor = [255, 255, 255, 255]
    // White background (0-255 range)
  } = options || {};
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = backgroundColor[0];
    pixels[i + 1] = backgroundColor[1];
    pixels[i + 2] = backgroundColor[2];
    pixels[i + 3] = backgroundColor[3] || 255;
  }
  const scale = zoomType === "in" ? 1 : 2;
  const maxDim = Math.max(width, height);
  const scaleX = maxDim / scale;
  const scaleY = maxDim / scale;
  const translateX = 0.5 * scale;
  const translateY = 0.5 * scale;
  const phi = (Math.sqrt(5) + 1) / 2;
  const base = 5;
  let triangles = [];
  for (let i = 0; i < base * 2; i++) {
    const v2 = Complex.fromPolar(1, (2 * i - 1) * Math.PI / (base * 2));
    const v3 = Complex.fromPolar(1, (2 * i + 1) * Math.PI / (base * 2));
    if (i % 2 === 0) {
      triangles.push(["thin", new Complex(0), v3, v2]);
    } else {
      triangles.push(["thin", new Complex(0), v2, v3]);
    }
  }
  for (let i = 0; i < divisions; i++) {
    const newTriangles = [];
    for (const [shape, v1, v2, v3] of triangles) {
      if (shape === "thin") {
        const p1 = v1.add(v2.subtract(v1).scale(1 / phi));
        newTriangles.push(["thin", v3, p1, v2]);
        newTriangles.push(["thicc", p1, v3, v1]);
      } else {
        const p2 = v2.add(v1.subtract(v2).scale(1 / phi));
        const p3 = v2.add(v3.subtract(v2).scale(1 / phi));
        newTriangles.push(["thicc", p3, v3, v1]);
        newTriangles.push(["thicc", p2, p3, v2]);
        newTriangles.push(["thin", p3, p2, v1]);
      }
    }
    triangles = newTriangles;
  }
  function worldToScreen(point) {
    const x = Math.floor(
      (point.real * scaleX + translateX * scaleX) * width / maxDim
    );
    const y = Math.floor(
      (point.imag * scaleY + translateY * scaleY) * height / maxDim
    );
    return { x, y };
  }
  for (const [shape, v1, v2, v3] of triangles) {
    const p1 = worldToScreen(v1);
    const p2 = worldToScreen(v2);
    const p3 = worldToScreen(v3);
    const color = shape === "thin" ? color1 : color2;
    fillTriangle(pixels, p1, p2, p3, color, width, height);
  }
  if (color3 && color3[3] > 0) {
    for (const [shape, v1, v2, v3] of triangles) {
      const p1 = worldToScreen(v1);
      const p2 = worldToScreen(v2);
      const p3 = worldToScreen(v3);
      drawLine(pixels, p1, p2, color3, width, height);
      drawLine(pixels, p2, p3, color3, width, height);
      drawLine(pixels, p3, p1, color3, width, height);
    }
  }
  return pixels;
}
function fillTriangle(pixels, p1, p2, p3, color, width, height) {
  if (p1.y > p2.y) [p1, p2] = [p2, p1];
  if (p1.y > p3.y) [p1, p3] = [p3, p1];
  if (p2.y > p3.y) [p2, p3] = [p3, p2];
  const r = color[0];
  const g = color[1];
  const b = color[2];
  const a = color[3] || 255;
  if (p2.y === p3.y) {
    fillFlatBottomTriangle(pixels, p1, p2, p3, r, g, b, a, width, height);
  } else if (p1.y === p2.y) {
    fillFlatTopTriangle(pixels, p1, p2, p3, r, g, b, a, width, height);
  } else {
    const p4 = {
      x: Math.floor(p1.x + (p2.y - p1.y) / (p3.y - p1.y) * (p3.x - p1.x)),
      y: p2.y
    };
    fillFlatBottomTriangle(pixels, p1, p2, p4, r, g, b, a, width, height);
    fillFlatTopTriangle(pixels, p2, p4, p3, r, g, b, a, width, height);
  }
}
function fillFlatBottomTriangle(pixels, p1, p2, p3, r, g, b, a, width, height) {
  const invSlope1 = (p2.x - p1.x) / (p2.y - p1.y || 1);
  const invSlope2 = (p3.x - p1.x) / (p3.y - p1.y || 1);
  let curx1 = p1.x;
  let curx2 = p1.x;
  for (let scanlineY = p1.y; scanlineY <= p2.y; scanlineY++) {
    if (scanlineY >= 0 && scanlineY < height) {
      const startX = Math.max(0, Math.min(Math.floor(curx1), width - 1));
      const endX = Math.max(0, Math.min(Math.floor(curx2), width - 1));
      for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
        const index = (scanlineY * width + x) * 4;
        if (index >= 0 && index < pixels.length - 3) {
          pixels[index] = r;
          pixels[index + 1] = g;
          pixels[index + 2] = b;
          pixels[index + 3] = a;
        }
      }
    }
    curx1 += invSlope1;
    curx2 += invSlope2;
  }
}
function fillFlatTopTriangle(pixels, p1, p2, p3, r, g, b, a, width, height) {
  const invSlope1 = (p3.x - p1.x) / (p3.y - p1.y || 1);
  const invSlope2 = (p3.x - p2.x) / (p3.y - p2.y || 1);
  let curx1 = p3.x;
  let curx2 = p3.x;
  for (let scanlineY = p3.y; scanlineY > p1.y; scanlineY--) {
    if (scanlineY >= 0 && scanlineY < height) {
      curx1 -= invSlope1;
      curx2 -= invSlope2;
      const startX = Math.max(0, Math.min(Math.floor(curx1), width - 1));
      const endX = Math.max(0, Math.min(Math.floor(curx2), width - 1));
      for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
        const index = (scanlineY * width + x) * 4;
        if (index >= 0 && index < pixels.length - 3) {
          pixels[index] = r;
          pixels[index + 1] = g;
          pixels[index + 2] = b;
          pixels[index + 3] = a;
        }
      }
    }
  }
}
function drawLine(pixels, p1, p2, color, width, height) {
  const r = color[0];
  const g = color[1];
  const b = color[2];
  const a = color[3] || 255;
  let x0 = p1.x;
  let y0 = p1.y;
  let x1 = p2.x;
  let y1 = p2.y;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
      const index = (y0 * width + x0) * 4;
      if (index >= 0 && index < pixels.length - 3) {
        const alpha = a / 255;
        pixels[index] = Math.round(pixels[index] * (1 - alpha) + r * alpha);
        pixels[index + 1] = Math.round(pixels[index + 1] * (1 - alpha) + g * alpha);
        pixels[index + 2] = Math.round(pixels[index + 2] * (1 - alpha) + b * alpha);
        pixels[index + 3] = 255;
      }
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}
class Patterns {
  static void(width, height, options = {}) {
    const {
      background = [255, 255, 255, 255],
      // white
      foreground = [0, 0, 200, 255]
      // blue
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    return data;
  }
  /**
   * Generates an RGBA grid pattern with transparency support.
   * @param {number} width
   * @param {number} height
   * @param {{
   *   spacing?: number,
   *   background?: [r, g, b, a],
   *   foreground?: [r, g, b, a]
   * }} options
   * @returns {Uint8ClampedArray}
   */
  static solidGrid(width, height, options = {}) {
    const {
      spacing = 8,
      background = [0, 0, 0, 0],
      // transparent
      foreground = [128, 128, 128, 255]
      // solid gray
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const yLine = y % spacing === 0;
      for (let x = 0; x < width; x++) {
        const xLine = x % spacing === 0;
        const isLine = xLine || yLine;
        const offset = (y * width + x) * 4;
        const color = isLine ? foreground : background;
        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = color[3];
      }
    }
    return data;
  }
  /**
   * Checkerboard pattern
   */
  static checkerboard(width, height, options = {}) {
    const {
      cellSize = 8,
      color1 = [0, 0, 0, 255],
      color2 = [255, 255, 255, 255]
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const yCell = Math.floor(y / cellSize);
      for (let x = 0; x < width; x++) {
        const xCell = Math.floor(x / cellSize);
        const useColor1 = (xCell + yCell) % 2 === 0;
        const color = useColor1 ? color1 : color2;
        const offset = (y * width + x) * 4;
        data.set(color, offset);
      }
    }
    return data;
  }
  /**
   * Diagonal stripe pattern
   */
  static stripes(width, height, options = {}) {
    const {
      spacing = 4,
      thickness = 1,
      background = [0, 0, 0, 0],
      foreground = [255, 255, 0, 255]
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const diag = (x + y) % spacing;
        const isStripe = diag < thickness;
        const offset = (y * width + x) * 4;
        data.set(isStripe ? foreground : background, offset);
      }
    }
    return data;
  }
  static honeycomb(width, height, options = {}) {
    const {
      radius = 10,
      // Radius of the hexagon
      lineWidth = 1,
      // Border thickness
      foreground = [255, 255, 255, 255],
      background = [0, 0, 0, 255]
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const isInsideHexagon = (px, py, cx, cy, r) => {
      const dx = Math.abs(px - cx);
      const dy = Math.abs(py - cy);
      const hexHeight2 = r * Math.sqrt(3) / 2;
      if (dy > hexHeight2) return false;
      if (dx > r) return false;
      return r * hexHeight2 * 2 >= r * dy * 2 + hexHeight2 * dx;
    };
    const innerRadius = radius - lineWidth;
    const hexHeight = radius * Math.sqrt(3);
    const minX = Math.max(0, Math.floor(centerX - radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius + 1));
    const minY = Math.max(0, Math.floor(centerY - hexHeight / 2 - 1));
    const maxY = Math.min(height - 1, Math.ceil(centerY + hexHeight / 2 + 1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const isOuterHex = isInsideHexagon(x, y, centerX, centerY, radius);
        const isInnerHex = innerRadius > 0 ? isInsideHexagon(x, y, centerX, centerY, innerRadius) : false;
        if (isOuterHex && !isInnerHex) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0];
          data[offset + 1] = foreground[1];
          data[offset + 2] = foreground[2];
          data[offset + 3] = foreground[3];
        }
      }
    }
    return data;
  }
  static harlequin(width, height, options = {}) {
    const {
      size = 20,
      // Size of each diamond (distance from center to point)
      spacing = 0,
      // Gap between diamonds
      background = [255, 255, 255, 255],
      // White
      foreground = [0, 0, 0, 255]
      // Black
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    const diamondWidth = size * 2;
    const diamondHeight = size * 2;
    const gridWidth = diamondWidth + spacing;
    const gridHeight = diamondHeight + spacing;
    const isInsideDiamond = (px, py, cx, cy) => {
      const dx = Math.abs(px - cx) / (diamondWidth / 2);
      const dy = Math.abs(py - cy) / (diamondHeight / 2);
      return dx + dy <= 1;
    };
    for (let row = -1; row < height / gridHeight + 1; row++) {
      for (let col = -1; col < width / gridWidth + 1; col++) {
        const centerX = col * gridWidth + gridWidth / 2;
        const centerY = row * gridHeight + gridHeight / 2;
        const shouldDraw = (row + col) % 2 === 0;
        if (!shouldDraw) continue;
        const minX = Math.max(0, Math.floor(centerX - diamondWidth / 2));
        const maxX = Math.min(width - 1, Math.ceil(centerX + diamondWidth / 2));
        const minY = Math.max(0, Math.floor(centerY - diamondHeight / 2));
        const maxY = Math.min(
          height - 1,
          Math.ceil(centerY + diamondHeight / 2)
        );
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (isInsideDiamond(x, y, centerX, centerY)) {
              const offset = (y * width + x) * 4;
              data[offset] = foreground[0];
              data[offset + 1] = foreground[1];
              data[offset + 2] = foreground[2];
              data[offset + 3] = foreground[3];
            }
          }
        }
      }
    }
    return data;
  }
  static circles(width, height, options = {}) {
    const {
      radius = 10,
      // Radius of each circle
      lineWidth = 2,
      // Width of the circle border
      spacing = 5,
      // Space between circles
      background = [0, 0, 0, 255],
      // Black background
      foreground = [255, 255, 255, 255]
      // White foreground for circles
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    const gridSize = radius * 2 + spacing;
    const isInsideCircle = (px, py, cx, cy, r) => {
      const dx = px - cx;
      const dy = py - cy;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= r * r;
    };
    for (let row = 0; row < Math.ceil(height / gridSize) + 1; row++) {
      for (let col = 0; col < Math.ceil(width / gridSize) + 1; col++) {
        const centerX = col * gridSize + radius;
        const centerY = row * gridSize + radius;
        if (centerX < -radius || centerX > width + radius || centerY < -radius || centerY > height + radius) {
          continue;
        }
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
        const minY = Math.max(0, Math.floor(centerY - radius));
        const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
        const innerRadius = radius - lineWidth;
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const isOuterCircle = isInsideCircle(
              x,
              y,
              centerX,
              centerY,
              radius
            );
            const isInnerCircle = isInsideCircle(
              x,
              y,
              centerX,
              centerY,
              innerRadius
            );
            if (isOuterCircle && !isInnerCircle) {
              const offset = (y * width + x) * 4;
              data[offset] = foreground[0];
              data[offset + 1] = foreground[1];
              data[offset + 2] = foreground[2];
              data[offset + 3] = foreground[3];
            }
          }
        }
      }
    }
    return data;
  }
  static diamonds(width, height, options = {}) {
    const {
      size = 16,
      // Size of the pattern cell
      squareSize = 6,
      // Size of the inner square
      background = [255, 255, 255, 255],
      // White background
      foreground = [0, 0, 0, 255],
      // Black foreground for diamonds
      innerColor = [255, 255, 255, 255]
      // White color for inner squares
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    const gridSize = size;
    const isInsideDiamond = (px, py, cx, cy, s) => {
      const dx = Math.abs(px - cx);
      const dy = Math.abs(py - cy);
      return dx + dy <= s / 2;
    };
    const isInsideSquare = (px, py, cx, cy, s) => {
      return Math.abs(px - cx) <= s / 2 && Math.abs(py - cy) <= s / 2;
    };
    for (let row = -1; row < height / gridSize + 1; row++) {
      for (let col = -1; col < width / gridSize + 1; col++) {
        const centerX = col * gridSize + gridSize / 2;
        const centerY = row * gridSize + gridSize / 2;
        if (centerX < -gridSize || centerX > width + gridSize || centerY < -gridSize || centerY > height + gridSize) {
          continue;
        }
        const minX = Math.max(0, Math.floor(centerX - gridSize / 2));
        const maxX = Math.min(width - 1, Math.ceil(centerX + gridSize / 2));
        const minY = Math.max(0, Math.floor(centerY - gridSize / 2));
        const maxY = Math.min(height - 1, Math.ceil(centerY + gridSize / 2));
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const isDiamond = isInsideDiamond(x, y, centerX, centerY, gridSize);
            const isSquare = isInsideSquare(x, y, centerX, centerY, squareSize);
            if (isDiamond) {
              const offset = (y * width + x) * 4;
              if (isSquare) {
                data[offset] = innerColor[0];
                data[offset + 1] = innerColor[1];
                data[offset + 2] = innerColor[2];
                data[offset + 3] = innerColor[3];
              } else {
                data[offset] = foreground[0];
                data[offset + 1] = foreground[1];
                data[offset + 2] = foreground[2];
                data[offset + 3] = foreground[3];
              }
            }
          }
        }
      }
    }
    return data;
  }
  static cubes(width, height, options = {}) {
    const {
      size = 10,
      // Size of each square
      spacing = 2,
      // Space between squares
      background = [0, 0, 0, 255],
      // Black background
      foreground = [255, 100, 0, 255]
      // Orange foreground for squares
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    const gridSize = size + spacing;
    for (let row = 0; row < Math.ceil(height / gridSize) + 1; row++) {
      for (let col = 0; col < Math.ceil(width / gridSize) + 1; col++) {
        const x = col * gridSize;
        const y = row * gridSize;
        if (x >= width || y >= height) {
          continue;
        }
        for (let py = y; py < Math.min(y + size, height); py++) {
          for (let px = x; px < Math.min(x + size, width); px++) {
            const offset = (py * width + px) * 4;
            data[offset] = foreground[0];
            data[offset + 1] = foreground[1];
            data[offset + 2] = foreground[2];
            data[offset + 3] = foreground[3];
          }
        }
      }
    }
    return data;
  }
  static cross(width, height, options = {}) {
    const {
      size = 8,
      // Size of each cross (total width/height)
      thickness = 2,
      // Thickness of the cross lines
      spacing = 16,
      // Space between crosses (center to center)
      background = [255, 255, 255, 255],
      // White background
      foreground = [80, 80, 80, 255]
      // Dark gray foreground for crosses
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    for (let row = 0; row < Math.ceil(height / spacing) + 1; row++) {
      for (let col = 0; col < Math.ceil(width / spacing) + 1; col++) {
        const centerX = col * spacing;
        const centerY = row * spacing;
        if (centerX < -size || centerX > width + size || centerY < -size || centerY > height + size) {
          continue;
        }
        const hStartX = centerX - size / 2;
        const hEndX = centerX + size / 2;
        const hStartY = centerY - thickness / 2;
        const hEndY = centerY + thickness / 2;
        for (let y = Math.max(0, Math.floor(hStartY)); y < Math.min(height, Math.ceil(hEndY)); y++) {
          for (let x = Math.max(0, Math.floor(hStartX)); x < Math.min(width, Math.ceil(hEndX)); x++) {
            const offset = (y * width + x) * 4;
            data[offset] = foreground[0];
            data[offset + 1] = foreground[1];
            data[offset + 2] = foreground[2];
            data[offset + 3] = foreground[3];
          }
        }
        const vStartX = centerX - thickness / 2;
        const vEndX = centerX + thickness / 2;
        const vStartY = centerY - size / 2;
        const vEndY = centerY + size / 2;
        for (let y = Math.max(0, Math.floor(vStartY)); y < Math.min(height, Math.ceil(vEndY)); y++) {
          for (let x = Math.max(0, Math.floor(vStartX)); x < Math.min(width, Math.ceil(vEndX)); x++) {
            const offset = (y * width + x) * 4;
            data[offset] = foreground[0];
            data[offset + 1] = foreground[1];
            data[offset + 2] = foreground[2];
            data[offset + 3] = foreground[3];
          }
        }
      }
    }
    return data;
  }
  static mesh(width, height, options = {}) {
    const {
      spacing = 20,
      // Distance between parallel lines
      lineWidth = 2,
      // Thickness of the lines
      background = [255, 255, 255, 0],
      // Transparent background
      foreground = [0, 0, 0, 255]
      // Black lines
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d1 = (x + y) % spacing;
        const isLine1 = d1 < lineWidth || d1 > spacing - lineWidth;
        const d2 = (x - y + height) % spacing;
        const isLine2 = d2 < lineWidth || d2 > spacing - lineWidth;
        if (isLine1 || isLine2) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0];
          data[offset + 1] = foreground[1];
          data[offset + 2] = foreground[2];
          data[offset + 3] = foreground[3];
        }
      }
    }
    return data;
  }
  static isometric(width, height, options = {}) {
    const {
      cellSize = 20,
      // Controls the size of the diamonds
      lineWidth = 1,
      // Thickness of the lines
      background = [0, 0, 0, 0],
      // Transparent background
      foreground = [0, 255, 0, 255]
      // Green lines
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    const tileWidth = cellSize;
    const tileHeight = cellSize / 2;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const relX = x % tileWidth;
        const relY = y % tileHeight;
        const leftEdge = relY - relX / 2;
        const rightEdge = relY + relX / 2 - tileHeight;
        const nearLeftEdge = Math.abs(leftEdge) < lineWidth / 2;
        const nearRightEdge = Math.abs(rightEdge) < lineWidth / 2;
        if (nearLeftEdge || nearRightEdge) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0];
          data[offset + 1] = foreground[1];
          data[offset + 2] = foreground[2];
          data[offset + 3] = foreground[3];
        }
      }
    }
    return data;
  }
  static weave(width, height, options = {}) {
    const {
      tileSize = 40,
      lineWidth = 2,
      background = [255, 255, 255, 255],
      // white
      foreground = [0, 0, 0, 255]
      // black
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileX = x % tileSize;
        const tileY = y % tileSize;
        const axisH = Math.abs((tileY + tileSize / 2) % tileSize - tileSize / 2) < lineWidth / 2;
        const axis60 = Math.abs(
          (tileX + tileY * 2 + tileSize * 1.5) % tileSize - tileSize / 2
        ) < lineWidth / 2;
        const axis120 = Math.abs(
          (tileX - tileY * 2 + tileSize * 1.5) % tileSize - tileSize / 2
        ) < lineWidth / 2;
        const isLine = axisH || axis60 || axis120;
        if (isLine) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0];
          data[offset + 1] = foreground[1];
          data[offset + 2] = foreground[2];
          data[offset + 3] = foreground[3];
        }
      }
    }
    return data;
  }
  /**
   * Generates a Perlin noise pattern using the Noise class
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   background?: [r, g, b, a],
   *   foreground?: [r, g, b, a],
   *   scale?: number,
   *   octaves?: number,
   *   persistence?: number,
   *   lacunarity?: number,
   *   seed?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static perlinNoise(width, height, options = {}) {
    const {
      background = [0, 0, 0, 0],
      foreground = [255, 255, 255, 255],
      scale = 0.1,
      octaves = 4,
      persistence = 0.5,
      lacunarity = 2,
      seed = Math.random() * 65536
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    Noise.seed(seed);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let amplitude = 1;
        let frequency = 1;
        let noiseHeight = 0;
        let maxValue = 0;
        for (let i = 0; i < octaves; i++) {
          const sampleX = x * scale * frequency;
          const sampleY = y * scale * frequency;
          const noiseValue = Noise.perlin2(sampleX, sampleY);
          noiseHeight += noiseValue * amplitude;
          maxValue += amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }
        noiseHeight /= maxValue;
        const normalizedValue = (noiseHeight + 1) * 0.5;
        const color = [
          Math.floor(
            background[0] + normalizedValue * (foreground[0] - background[0])
          ),
          Math.floor(
            background[1] + normalizedValue * (foreground[1] - background[1])
          ),
          Math.floor(
            background[2] + normalizedValue * (foreground[2] - background[2])
          ),
          Math.floor(
            background[3] + normalizedValue * (foreground[3] - background[3])
          )
        ];
        const offset = (y * width + x) * 4;
        data.set(color, offset);
      }
    }
    return data;
  }
  /**
   * Creates a circular gradient pattern
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   innerColor?: [r, g, b, a],
   *   outerColor?: [r, g, b, a],
   *   centerX?: number,
   *   centerY?: number,
   *   radius?: number,
   *   fadeExponent?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static circularGradient(width, height, options = {}) {
    const {
      innerColor = [255, 255, 255, 255],
      outerColor = [0, 0, 0, 255],
      centerX = width / 2,
      centerY = height / 2,
      radius = Math.min(width, height) / 2,
      fadeExponent = 1
      // Controls how quickly the gradient fades (1 = linear)
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let factor = Math.min(distance / radius, 1);
        factor = Math.pow(factor, fadeExponent);
        const color = [
          Math.floor(innerColor[0] + factor * (outerColor[0] - innerColor[0])),
          Math.floor(innerColor[1] + factor * (outerColor[1] - innerColor[1])),
          Math.floor(innerColor[2] + factor * (outerColor[2] - innerColor[2])),
          Math.floor(innerColor[3] + factor * (outerColor[3] - innerColor[3]))
        ];
        data.set(color, offset);
      }
    }
    return data;
  }
  /**
   * Creates a noise-based displacement pattern (distorted grid)
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   gridSpacing?: number,
   *   gridColor?: [r, g, b, a],
   *   background?: [r, g, b, a],
   *   displacementScale?: number,
   *   noiseScale?: number,
   *   gridThickness?: number,
   *   seed?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static noiseDisplacement(width, height, options = {}) {
    const {
      gridSpacing = 16,
      gridColor = [255, 255, 255, 255],
      background = [0, 0, 0, 0],
      displacementScale = 8,
      noiseScale = 0.05,
      gridThickness = 1,
      seed = Math.random() * 65536
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    Noise.seed(seed);
    for (let i = 0; i < data.length; i += 4) {
      data.set(background, i);
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const noiseX = Noise.perlin2(x * noiseScale, y * noiseScale);
        const noiseY = Noise.perlin2(
          (x + 31.416) * noiseScale,
          (y + 27.182) * noiseScale
        );
        const displacedX = x + noiseX * displacementScale;
        const displacedY = y + noiseY * displacementScale;
        const isGridX = displacedX % gridSpacing < gridThickness || displacedX % gridSpacing > gridSpacing - gridThickness;
        const isGridY = displacedY % gridSpacing < gridThickness || displacedY % gridSpacing > gridSpacing - gridThickness;
        if (isGridX || isGridY) {
          const offset = (y * width + x) * 4;
          data.set(gridColor, offset);
        }
      }
    }
    return data;
  }
  /**
   * Creates a dot pattern with either regular spacing or noise-based distribution
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   dotSize?: number,
   *   spacing?: number,
   *   dotColor?: [r, g, b, a],
   *   background?: [r, g, b, a],
   *   useNoise?: boolean,
   *   noiseScale?: number,
   *   noiseDensity?: number,
   *   seed?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static dotPattern(width, height, options = {}) {
    const {
      dotSize = 3,
      spacing = 12,
      dotColor = [0, 0, 0, 255],
      background = [255, 255, 255, 255],
      useNoise = false,
      noiseScale = 0.1,
      noiseDensity = 0.4,
      // Threshold for placing dots when using noise (0-1)
      seed = Math.random() * 65536
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    if (useNoise) {
      Noise.seed(seed);
    }
    for (let i = 0; i < data.length; i += 4) {
      data.set(background, i);
    }
    if (useNoise) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const noiseValue = Noise.perlin2(x * noiseScale, y * noiseScale);
          const normNoise = (noiseValue + 1) * 0.5;
          if (normNoise > noiseDensity) {
            for (let dy = -dotSize; dy <= dotSize; dy++) {
              for (let dx = -dotSize; dx <= dotSize; dx++) {
                const px = x + dx;
                const py = y + dy;
                if (px >= 0 && px < width && py >= 0 && py < height) {
                  const dist = dx * dx + dy * dy;
                  if (dist <= dotSize * dotSize) {
                    const offset = (py * width + px) * 4;
                    data.set(dotColor, offset);
                  }
                }
              }
            }
          }
        }
      }
    } else {
      for (let y = Math.floor(spacing / 2); y < height; y += spacing) {
        for (let x = Math.floor(spacing / 2); x < width; x += spacing) {
          for (let dy = -dotSize; dy <= dotSize; dy++) {
            for (let dx = -dotSize; dx <= dotSize; dx++) {
              const px = x + dx;
              const py = y + dy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const dist = dx * dx + dy * dy;
                if (dist <= dotSize * dotSize) {
                  const offset = (py * width + px) * 4;
                  data.set(dotColor, offset);
                }
              }
            }
          }
        }
      }
    }
    return data;
  }
  /**
   * Generates a Voronoi cell pattern that tiles seamlessly
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   cellCount?: number,
   *   cellColors?: [r, g, b, a][],
   *   edgeColor?: [r, g, b, a],
   *   edgeThickness?: number,
   *   seed?: number,
   *   jitter?: number,
   *   baseColor?: [r, g, b, a],
   *   colorVariation?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static voronoi(width, height, options = {}) {
    const {
      cellCount = 20,
      cellColors = null,
      // Will generate random colors if null
      edgeColor = [0, 0, 0, 255],
      edgeThickness = 1.5,
      seed = Math.random() * 1e3,
      jitter = 0.5,
      // How much to randomize cell positions (0-1)
      baseColor = null,
      // Base color for theming, if null will use random colors
      colorVariation = 0.3
      // How much variation to add to the base color (0-1)
    } = options;
    const data = new Uint8ClampedArray(width * height * 4);
    Noise.seed(seed);
    const cellPoints = [];
    const colors = [];
    const random = () => {
      let x = Math.sin(seed * 0.167 + cellPoints.length * 0.423) * 1e4;
      return x - Math.floor(x);
    };
    const gridSize = Math.sqrt(cellCount);
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    const generateColorFromBase = (index) => {
      if (baseColor) {
        const [r, g, b, a] = baseColor;
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;
        let h, s;
        if (max === min) {
          h = s = 0;
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === r / 255) {
            h = (g / 255 - b / 255) / d + (g / 255 < b / 255 ? 6 : 0);
          } else if (max === g / 255) {
            h = (b / 255 - r / 255) / d + 2;
          } else {
            h = (r / 255 - g / 255) / d + 4;
          }
          h /= 6;
        }
        const hueVariation = Noise.perlin2(index * 0.15, 0) * colorVariation * 0.3;
        const satVariation = Noise.perlin2(0, index * 0.15) * colorVariation;
        const lightVariation = Noise.perlin2(index * 0.15, index * 0.15) * colorVariation * 0.5;
        h = (h + hueVariation) % 1;
        s = Math.min(1, Math.max(0, s * (1 + satVariation)));
        const newL = Math.min(0.9, Math.max(0.1, l * (1 + lightVariation)));
        let r1, g1, b1;
        if (s === 0) {
          r1 = g1 = b1 = newL;
        } else {
          const hue2rgb = (p2, q2, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p2 + (q2 - p2) * 6 * t;
            if (t < 1 / 2) return q2;
            if (t < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - t) * 6;
            return p2;
          };
          const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
          const p = 2 * newL - q;
          r1 = hue2rgb(p, q, h + 1 / 3);
          g1 = hue2rgb(p, q, h);
          b1 = hue2rgb(p, q, h - 1 / 3);
        }
        const noiseAmount = 0.05;
        const noise = () => (random() * 2 - 1) * noiseAmount;
        return [
          Math.min(255, Math.max(0, Math.floor(r1 * 255 * (1 + noise())))),
          Math.min(255, Math.max(0, Math.floor(g1 * 255 * (1 + noise())))),
          Math.min(255, Math.max(0, Math.floor(b1 * 255 * (1 + noise())))),
          a
        ];
      } else {
        const hue = index * 0.618033988749895 % 1;
        let r, g, b;
        const h = hue * 6;
        const i = Math.floor(h);
        const f = h - i;
        const p = 0.5;
        const q = 0.5 * (1 - f);
        const t = 0.5 * (1 - (1 - f));
        switch (i % 6) {
          case 0:
            r = 0.5;
            g = t;
            b = p;
            break;
          case 1:
            r = q;
            g = 0.5;
            b = p;
            break;
          case 2:
            r = p;
            g = 0.5;
            b = t;
            break;
          case 3:
            r = p;
            g = q;
            b = 0.5;
            break;
          case 4:
            r = t;
            g = p;
            b = 0.5;
            break;
          case 5:
            r = 0.5;
            g = p;
            b = q;
            break;
        }
        return [
          Math.floor(r * 255 + 50 + random() * 100),
          Math.floor(g * 255 + 50 + random() * 100),
          Math.floor(b * 255 + 50 + random() * 100),
          255
        ];
      }
    };
    for (let gridY = 0; gridY < gridSize; gridY++) {
      for (let gridX = 0; gridX < gridSize; gridX++) {
        if (cellPoints.length >= cellCount) break;
        const baseX = gridX * cellWidth + cellWidth / 2;
        const baseY = gridY * cellHeight + cellHeight / 2;
        const jitterX = (random() * 2 - 1) * jitter * cellWidth;
        const jitterY = (random() * 2 - 1) * jitter * cellHeight;
        cellPoints.push({
          x: Math.floor(baseX + jitterX),
          y: Math.floor(baseY + jitterY)
        });
        if (cellColors && cellPoints.length - 1 < cellColors.length) {
          colors.push(cellColors[cellPoints.length - 1]);
        } else {
          colors.push(generateColorFromBase(cellPoints.length - 1));
        }
      }
    }
    const tiledDistance = (x1, y1, x2, y2) => {
      let dx = Math.abs(x1 - x2);
      let dy = Math.abs(y1 - y2);
      dx = Math.min(dx, width - dx);
      dy = Math.min(dy, height - dy);
      const euclidean = Math.sqrt(dx * dx + dy * dy);
      const manhattan = dx + dy;
      return euclidean * 0.8 + manhattan * 0.2;
    };
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        let closestDist = Infinity;
        let secondClosestDist = Infinity;
        let closestIndex = 0;
        for (let i = 0; i < cellPoints.length; i++) {
          const dist = tiledDistance(x, y, cellPoints[i].x, cellPoints[i].y);
          if (dist < closestDist) {
            secondClosestDist = closestDist;
            closestDist = dist;
            closestIndex = i;
          } else if (dist < secondClosestDist) {
            secondClosestDist = dist;
          }
        }
        for (let i = 0; i < cellPoints.length; i++) {
          for (let wrapX = -1; wrapX <= 1; wrapX++) {
            for (let wrapY = -1; wrapY <= 1; wrapY++) {
              if (wrapX === 0 && wrapY === 0) continue;
              const wrappedX = cellPoints[i].x + wrapX * width;
              const wrappedY = cellPoints[i].y + wrapY * height;
              const dist = Math.sqrt(
                Math.pow(x - wrappedX, 2) + Math.pow(y - wrappedY, 2)
              );
              if (dist < closestDist) {
                secondClosestDist = closestDist;
                closestDist = dist;
                closestIndex = i;
              } else if (dist < secondClosestDist) {
                secondClosestDist = dist;
              }
            }
          }
        }
        const edgeDist = secondClosestDist - closestDist;
        const isEdge = edgeDist < edgeThickness;
        if (isEdge) {
          data.set(edgeColor, offset);
        } else {
          data.set(colors[closestIndex], offset);
        }
      }
    }
    return data;
  }
  static penrose(width, height, options = {}) {
    return generatePenroseTilingPixels(width, height, options);
  }
}
const _Logger = class _Logger {
  static disableAll() {
    _Logger.enabledClasses = /* @__PURE__ */ new Set();
    _Logger.globalLevel = 0;
  }
  static disable() {
    _Logger.enabled = false;
  }
  static enable() {
    _Logger.enabled = true;
  }
  static setLevel(level) {
    _Logger.globalLevel = level;
  }
  static enableFor(className) {
    _Logger.enabledClasses.add(className);
  }
  static disableFor(className) {
    _Logger.enabledClasses.delete(className);
  }
  static setOutput(outputInstance) {
    _Logger.output = outputInstance;
  }
  constructor(className) {
    this.className = className;
  }
  static getLogger(className) {
    if (!_Logger.loggerz[className]) {
      _Logger.loggerz[className] = new _Logger(className);
    }
    return _Logger.loggerz[className];
  }
  _log(level, method, ...args) {
    if (_Logger.enabled && (_Logger.globalLevel >= level || _Logger.enabledClasses.has(this.className))) {
      _Logger.output[method](`[${this.className}]`, ...args);
    }
  }
  log(...args) {
    this._log(_Logger.INFO, "log", ...args);
  }
  warn(...args) {
    this._log(_Logger.WARN, "warn", ...args);
  }
  error(...args) {
    this._log(_Logger.ERROR, "error", ...args);
  }
  debug(...args) {
    this._log(_Logger.DEBUG, "log", ...args);
  }
  table(...args) {
    this._log(_Logger.INFO, "table", ...args);
  }
  groupCollapsed(label) {
    if (_Logger.enabled) {
      _Logger.output.groupCollapsed(`[${this.className}] ${label}`);
    }
  }
  groupEnd() {
    if (_Logger.enabled) {
      _Logger.output.groupEnd();
    }
  }
  time(label) {
    if (_Logger.enabled) {
      _Logger.output.time(`[${this.className}] ${label}`);
    }
  }
  timeEnd(label) {
    if (_Logger.enabled) {
      _Logger.output.timeEnd(`[${this.className}] ${label}`);
    }
  }
  clear() {
    _Logger.output.clear();
  }
};
__publicField(_Logger, "ERROR", 1);
__publicField(_Logger, "WARN", 2);
__publicField(_Logger, "INFO", 3);
__publicField(_Logger, "DEBUG", 4);
__publicField(_Logger, "globalLevel", _Logger.ERROR);
__publicField(_Logger, "enabledClasses", /* @__PURE__ */ new Set());
__publicField(_Logger, "output", console);
__publicField(_Logger, "enabled", true);
__publicField(_Logger, "loggerz", []);
let Logger = _Logger;
class Loggable {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name;
    this._logger = this.getLogger(options);
  }
  get logger() {
    if (this._logger == null) {
      return this.getLogger();
    }
    return this._logger;
  }
  /**
   * Logs the object's render state (debug only).
   * @param {string} [msg]
   */
  trace(msg = "render") {
    this.logger.log(
      this.name == null ? this.constructor.name : this.name,
      msg,
      "x",
      this.x,
      "y",
      this.y,
      "w",
      this.width,
      "h",
      this.height,
      "opacity",
      this._opacity,
      "visible",
      this._visible,
      "active",
      this._active,
      "debug",
      this.debug
    );
  }
  getLogger(options) {
    return Logger.getLogger(options.name || this.constructor.name);
  }
}
const _DebugTab = class _DebugTab {
  static getInstance() {
    if (!_DebugTab.instance) _DebugTab.instance = new _DebugTab();
    return _DebugTab.instance;
  }
  constructor() {
    this.createTab();
  }
  createTab() {
    this.tab = document.createElement("div");
    Object.assign(this.tab.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      height: "30px",
      backgroundColor: "#333",
      color: "#fff",
      padding: "5px",
      cursor: "pointer",
      fontFamily: "monospace",
      zIndex: "10000",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    });
    this.tab.innerText = "Console";
    const buttonContainer = document.createElement("div");
    const createButton = (text, action) => {
      const btn = document.createElement("button");
      btn.innerText = text;
      Object.assign(btn.style, {
        marginLeft: "5px",
        padding: "2px 5px",
        fontFamily: "monospace",
        cursor: "pointer"
      });
      btn.onclick = action;
      return btn;
    };
    this.paused = false;
    this.scrollLock = true;
    buttonContainer.appendChild(
      createButton("Clear", () => this.consoleArea.value = "")
    );
    buttonContainer.appendChild(
      createButton("Pause", () => this.paused = !this.paused)
    );
    buttonContainer.appendChild(
      createButton("Scroll Lock", () => this.scrollLock = !this.scrollLock)
    );
    this.tab.appendChild(buttonContainer);
    document.body.appendChild(this.tab);
    this.consoleArea = document.createElement("textarea");
    Object.assign(this.consoleArea.style, {
      position: "fixed",
      bottom: "30px",
      left: "0",
      right: "0",
      height: "200px",
      display: "none",
      backgroundColor: "#111",
      color: "#0f0",
      fontFamily: "monospace",
      zIndex: "9999",
      padding: "10px",
      resize: "none"
    });
    this.consoleArea.readOnly = true;
    document.body.appendChild(this.consoleArea);
    this.tab.onclick = (e) => {
      if (e.target === this.tab) {
        this.consoleArea.style.display = this.consoleArea.style.display === "none" ? "block" : "none";
      }
    };
  }
  appendMessage(level, message, ...args) {
    if (this.paused) return;
    const fullMessage = `[${level.toUpperCase()}] ${message} ${args.join(
      " "
    )}
`;
    this.consoleArea.value += fullMessage;
    if (this.scrollLock) {
      this.consoleArea.scrollTop = this.consoleArea.scrollHeight;
    }
  }
  log(message, ...args) {
    this.appendMessage("log", message, ...args);
  }
  warn(message, ...args) {
    this.appendMessage("warn", message, ...args);
  }
  error(message, ...args) {
    this.appendMessage("error", message, ...args);
  }
  table(data) {
    const formatted = JSON.stringify(data, null, 2);
    this.appendMessage("table", formatted);
  }
  groupCollapsed(label) {
    this.appendMessage("group", `Group Start: ${label}`);
  }
  groupEnd() {
    this.appendMessage("group", "Group End");
  }
  time(label) {
    this[`time_${label}`] = performance.now();
  }
  timeEnd(label) {
    const endTime = performance.now();
    const startTime = this[`time_${label}`];
    const duration = (endTime - startTime).toFixed(2);
    this.appendMessage("time", `${label}: ${duration} ms`);
  }
};
__publicField(_DebugTab, "instance");
let DebugTab = _DebugTab;
const _PainterEffects = class _PainterEffects {
  /**
   * Set shadow properties
   * @param {string} color - Shadow color
   * @param {number} blur - Shadow blur
   * @param {number} [offsetX=0] - Shadow X offset
   * @param {number} [offsetY=0] - Shadow Y offset
   * @returns {void}
   */
  static dropShadow(color, blur, offsetX = 0, offsetY = 0) {
    Painter.ctx.shadowColor = color;
    Painter.ctx.shadowBlur = blur;
    Painter.ctx.shadowOffsetX = offsetX;
    Painter.ctx.shadowOffsetY = offsetY;
  }
  /**
   * Clear shadow
   * @returns {void}
   */
  static clearShadow() {
    Painter.ctx.shadowColor = "rgba(0, 0, 0, 0)";
    Painter.ctx.shadowBlur = 0;
    Painter.ctx.shadowOffsetX = 0;
    Painter.ctx.shadowOffsetY = 0;
  }
  /**
   * Set global alpha
   * @param {number} alpha - Alpha value (0-1)
   * @returns {void}
   */
  static setAlpha(alpha) {
    Painter.ctx.globalAlpha = alpha;
  }
  /**
   * Set global composite operation
   * @param {GlobalCompositeOperation} operation - Composite operation
   * @returns {void}
   */
  static setBlendMode(operation) {
    Painter.ctx.globalCompositeOperation = operation;
  }
  /**
   * Clip to a rectangular region
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {void}
   */
  static clipRect(x, y, width, height) {
    Painter.ctx.beginPath();
    Painter.ctx.rect(x, y, width, height);
    Painter.ctx.clip();
  }
  /**
   * Clip to a circular region
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @returns {void}
   */
  static clipCircle(x, y, radius) {
    Painter.ctx.beginPath();
    Painter.shapes.arc(x, y, radius, 0, Math.PI * 2);
    Painter.ctx.clip();
  }
  /**
   * Apply a blur filter to a region
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} blur - Blur amount (pixels)
   * @returns {void}
   */
  static blurRegion(x, y, width, height, blur) {
    const currentFilter = Painter.ctx.filter;
    Painter.ctx.filter = `blur(${blur}px)`;
    const imageData = Painter.ctx.getImageData(x, y, width, height);
    Painter.ctx.putImageData(imageData, x, y);
    Painter.ctx.filter = currentFilter;
  }
  /**
   * Create a glow effect that can be animated
   * @param {string} color - Base color for the glow
   * @param {number} blur - Initial blur amount
   * @param {Object} [options] - Animation options
   * @param {number} [options.pulseSpeed=0] - Speed of pulsing (0 for static)
   * @param {number} [options.pulseMin=blur*0.5] - Minimum blur during pulsing
   * @param {number} [options.pulseMax=blur*1.5] - Maximum blur during pulsing
   * @param {number} [options.colorShift=0] - Hue shift speed (0 for static)
   * @returns {Object} - Control object for the effect
   */
  static createGlow(color, blur, options = {}) {
    const id = "glow-" + Math.random().toString(36).substr(2, 9);
    const defaultOptions = {
      pulseSpeed: 0,
      pulseMin: blur * 0.5,
      pulseMax: blur * 1.5,
      colorShift: 0
    };
    const effectOptions = { ...defaultOptions, ...options };
    const effectState = {
      id,
      type: "glow",
      active: true,
      time: 0,
      color,
      blur,
      options: effectOptions,
      // Method to update effect parameters
      update(params) {
        Object.assign(this, params);
        return this;
      },
      // Method to stop the effect
      stop() {
        this.active = false;
        _PainterEffects._activeEffects.delete(this.id);
        return this;
      },
      // Method to apply the effect for the current frame
      apply() {
        if (!this.active) return;
        let currentBlur = this.blur;
        let currentColor = this.color;
        if (this.options.pulseSpeed > 0) {
          const pulseFactor = Math.sin(this.time * this.options.pulseSpeed) * 0.5 + 0.5;
          currentBlur = this.options.pulseMin + pulseFactor * (this.options.pulseMax - this.options.pulseMin);
        }
        if (this.options.colorShift > 0) {
          currentColor = currentColor.replace(
            "hue",
            this.time * this.options.colorShift % 360
          );
        }
        Painter.ctx.shadowColor = currentColor;
        Painter.ctx.shadowBlur = currentBlur;
        Painter.ctx.shadowOffsetX = 0;
        Painter.ctx.shadowOffsetY = 0;
        this.time += 1 / 60;
        return this;
      }
    };
    _PainterEffects._activeEffects.set(id, effectState);
    _PainterEffects._startAnimationLoop();
    return effectState;
  }
  /**
   * Start the animation loop if not already running
   * @private
   */
  static _startAnimationLoop() {
    if (_PainterEffects._animationId !== null) return;
    const animate = () => {
      _PainterEffects._activeEffects.forEach((effect) => {
        if (effect.active) effect.apply();
      });
      if (_PainterEffects._activeEffects.size === 0) {
        cancelAnimationFrame(_PainterEffects._animationId);
        _PainterEffects._animationId = null;
        return;
      }
      _PainterEffects._animationId = requestAnimationFrame(animate);
    };
    _PainterEffects._animationId = requestAnimationFrame(animate);
  }
  /**
   * Clear all active effects
   */
  static clearAllEffects() {
    _PainterEffects._activeEffects.forEach((effect) => effect.stop());
    _PainterEffects._activeEffects.clear();
    Painter.ctx.shadowColor = "rgba(0, 0, 0, 0)";
    Painter.ctx.shadowBlur = 0;
    Painter.ctx.shadowOffsetX = 0;
    Painter.ctx.shadowOffsetY = 0;
    Painter.ctx.filter = "none";
    Painter.ctx.globalAlpha = 1;
    Painter.ctx.globalCompositeOperation = "source-over";
  }
};
// Static properties to track current effect state
__publicField(_PainterEffects, "_activeEffects", /* @__PURE__ */ new Map());
__publicField(_PainterEffects, "_animationId", null);
let PainterEffects = _PainterEffects;
class PainterImages {
  /* ─────────────────────────────── DRAWING ────────────────────────────── */
  /**
   * Draw an image or canvas onto the current context.
   * @param {CanvasImageSource} source  <img>, <canvas>, <video>, etc.
   * @param {number}   x, y             Destination position (after transforms)
   * @param {object}  [opts]            Declarative options
   *   @prop {number}   width,height    Destination size (defaults → intrinsic)
   *   @prop {object}   crop            { sx, sy, sw, sh } source rectangle
   *   @prop {string}   anchor          top‑left | center | bottom‑right …
   *   @prop {number}   rotation        Radians, about anchor point
   *   @prop {number}   scaleX,scaleY   Independent or uniform scaling
   *   @prop {boolean}  flipX,flipY     Mirror horizontally / vertically
   *   @prop {number}   alpha           Multiplicative opacity (1 = opaque)
   *   @prop {boolean}  smoothing       ImageSmoothingEnabled toggle
   */
  static draw(source, x = 0, y = 0, {
    width,
    height,
    crop = null,
    anchor = "top‑left",
    rotation = 0,
    scaleX = 1,
    scaleY = 1,
    flipX = false,
    flipY = false,
    alpha = 1,
    smoothing = true
  } = {}) {
    const ctx = Painter.ctx;
    if (!ctx || !source) return;
    const iw = width ?? (crop ? crop.sw : source.width ?? source.videoWidth);
    const ih = height ?? (crop ? crop.sh : source.height ?? source.videoHeight);
    const ax = { left: 0, center: 0.5, right: 1 }[anchor.split("-").pop()] ?? 0;
    const ay = { top: 0, center: 0.5, bottom: 1 }[anchor.split("-")[0]] ?? 0;
    const ox = -iw * ax;
    const oy = -ih * ay;
    ctx.save();
    ctx.imageSmoothingEnabled = smoothing;
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    if (flipX || flipY) ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.scale(scaleX, scaleY);
    if (crop) {
      const { sx, sy, sw, sh } = crop;
      ctx.drawImage(source, sx, sy, sw, sh, ox, oy, iw, ih);
    } else {
      ctx.drawImage(source, ox, oy, iw, ih);
    }
    ctx.restore();
  }
  /** Quick alias for draw that only needs `{width,height}` overrides. */
  static blit(source, x, y, w, h) {
    this.draw(source, x, y, { width: w, height: h });
  }
  /* ───────────────────────────── PATTERNS ─────────────────────────────── */
  /** `ctx.createPattern` shortcut. */
  static createPattern(image, repetition = "repeat") {
    return Painter.ctx.createPattern(image, repetition);
  }
  /**
   * Fill a rectangle with a pattern in one line.
   */
  static fillPattern(image, x, y, width, height) {
    const ctx = Painter.ctx;
    ctx.save();
    ctx.fillStyle = image;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
  /* ─────────────────────────── IMAGE DATA API ─────────────────────────── */
  static createImageData(width, height) {
    return Painter.ctx.createImageData(width, height);
  }
  static cloneImageData(imageData) {
    return new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }
  static getImageData(x, y, width, height) {
    return Painter.ctx.getImageData(x, y, width, height);
  }
  static putImageData(imageData, x, y, dirtyX = 0, dirtyY = 0, dirtyWidth = imageData.width, dirtyHeight = imageData.height) {
    Painter.ctx.putImageData(
      imageData,
      x,
      y,
      dirtyX,
      dirtyY,
      dirtyWidth,
      dirtyHeight
    );
  }
  /**
   * Map‑style pixel transform: pass a callback that returns [r,g,b,a].
   * Very handy for simple filters without manual loop boilerplate.
   */
  static mapPixels(imageData, fn) {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const idx = i >> 2;
      const res = fn(d[i], d[i + 1], d[i + 2], d[i + 3], idx);
      if (res) [d[i], d[i + 1], d[i + 2], d[i + 3]] = res;
    }
    return imageData;
  }
  /** Set one pixel in an ImageData object. */
  static setPixel(imageData, x, y, r, g, b, a = 255) {
    const i = (y * imageData.width + x) * 4;
    const d = imageData.data;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = a;
  }
  /* ───────────────────────────── BITMAP HELPERS ───────────────────────── */
  /** Convert the **current canvas** to an ImageBitmap (cheap GPU upload). */
  static async toBitmap({ type = "image/png", quality = 0.92 } = {}) {
    const canvas = Painter.ctx.canvas;
    const blob = await canvas.convertToBlob({ type, quality });
    return createImageBitmap(blob);
  }
  /** Create an ImageBitmap from any CanvasImageSource. */
  static async createBitmap(image) {
    return createImageBitmap(image);
  }
  /* ───────────── ImageData ← raw pixels convenience ───────────── */
  /**
   * Converts a flat RGBA array into an ImageData object.
   * @param {Uint8ClampedArray} rgbaArray
   * @param {number} width
   * @param {number} height
   * @returns {ImageData}
   */
  static toImageData(rgbaArray, width, height) {
    if (rgbaArray.length !== width * height * 4) {
      throw new Error("Invalid RGBA array size for given dimensions");
    }
    return new ImageData(rgbaArray, width, height);
  }
  /**
   * Asynchronously creates an ImageBitmap from raw RGBA data.
   * Can be used directly with createPattern or drawImage.
   * @param {Uint8ClampedArray} rgbaArray
   * @param {number} width
   * @param {number} height
   * @returns {Promise<ImageBitmap>}
   */
  static async createImageBitmapFromPixels(rgbaArray, width, height) {
    const imgData = this.toImageData(rgbaArray, width, height);
    return await createImageBitmap(imgData);
  }
  /**
   * Creates a pattern from ImageData via a temporary canvas.
   * @param {ImageData} imageData
   * @param {"repeat"|"repeat-x"|"repeat-y"|"no-repeat"} repeat
   * @returns {CanvasPattern}
   */
  static createPatternFromImageData(imageData, repeat = "repeat") {
    const canvas = document.createElement("canvas");
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);
    return ctx.createPattern(canvas, repeat);
  }
  /**
   * Shortcut to go directly from pixel array to CanvasPattern
   * @param {Uint8ClampedArray} rgbaArray
   * @param {number} width
   * @param {number} height
   * @param {string} repeat
   * @returns {CanvasPattern}
   */
  static createPatternFromPixels(rgbaArray, width, height, repeat = "repeat") {
    const imgData = this.toImageData(rgbaArray, width, height);
    return this.createPatternFromImageData(imgData, repeat);
  }
}
class PainterLines {
  static path(commands, fill, stroke, lineWidth = 1) {
    const ctx = Painter.ctx;
    ctx.beginPath();
    for (const cmd of commands) {
      const [type, ...args] = cmd;
      if (type === "M") ctx.moveTo(...args);
      else if (type === "L") ctx.lineTo(...args);
      else if (type === "C") ctx.bezierCurveTo(...args);
      else if (type === "Q") ctx.quadraticCurveTo(...args);
      else if (type === "Z") ctx.closePath();
    }
    if (fill) {
      ctx.fillStyle = fill;
      Painter.colors.fill(fill);
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      Painter.colors.stroke();
    }
  }
  /**
   * Draw a line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {string|CanvasGradient} [color] - Line color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static line(x1, y1, x2, y2, color, lineWidth) {
    Painter.ctx.beginPath();
    Painter.ctx.moveTo(x1, y1);
    Painter.ctx.lineTo(x2, y2);
    Painter.colors.stroke(color, lineWidth);
  }
  /**
   * Start a new path
   * @returns {void}
   */
  static beginPath() {
    Painter.ctx.beginPath();
  }
  /**
   * Close the current path
   * @returns {void}
   */
  static closePath() {
    Painter.ctx.closePath();
  }
  /**
   * Move to a point without drawing
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
   */
  static moveTo(x, y) {
    Painter.ctx.moveTo(x, y);
  }
  /**
   * Draw a line to a point
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {void}
   */
  static lineTo(x, y) {
    Painter.ctx.lineTo(x, y);
  }
  /**
   * Add a bezier curve to the current path
   * @param {number} cp1x - Control point 1 X
   * @param {number} cp1y - Control point 1 Y
   * @param {number} cp2x - Control point 2 X
   * @param {number} cp2y - Control point 2 Y
   * @param {number} x - End X
   * @param {number} y - End Y
   * @returns {void}
   */
  static bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    Painter.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }
  /**
   * Draw a dashed line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {Array<number>} dash - Dash pattern array [dash, gap, dash, gap, ...]
   * @param {string|CanvasGradient} [color] - Line color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static dashedLine(x1, y1, x2, y2, dash, color, lineWidth) {
    Painter.ctx.beginPath();
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== void 0) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.setLineDash(dash);
    Painter.ctx.moveTo(x1, y1);
    Painter.ctx.lineTo(x2, y2);
    Painter.colors.stroke();
    Painter.ctx.setLineDash([]);
  }
  /**
   * Draw a dotted line
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {number} dotSize - Size of dots
   * @param {number} gap - Gap between dots
   * @param {string|CanvasGradient} [color] - Line color
   * @returns {void}
   */
  static dottedLine(x1, y1, x2, y2, dotSize = 2, gap = 5, color) {
    return Painter.lines.dashedLine(
      x1,
      y1,
      x2,
      y2,
      [dotSize, gap],
      color,
      dotSize
    );
  }
  /**
   * Set line dash pattern
   * @param {Array<number>} segments - Array of line, gap lengths
   * @returns {void}
   */
  static setLineDash(segments) {
    Painter.ctx.setLineDash(segments);
  }
  /**
   * Reset line dash to solid line
   * @returns {void}
   */
  static resetLineDash() {
    Painter.ctx.setLineDash([]);
  }
  /**
   * Set line width
   * @param {number} width - Line width
   * @returns {void}
   */
  static setLineWidth(width) {
    Painter.ctx.lineWidth = width;
  }
  /**
   * Draw quadratic curve
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} cpx - Control point X
   * @param {number} cpy - Control point Y
   * @param {number} x2 - End X
   * @param {number} y2 - End Y
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static quadraticCurve(x1, y1, cpx, cpy, x2, y2, color, lineWidth) {
    Painter.ctx.beginPath();
    Painter.ctx.moveTo(x1, y1);
    Painter.ctx.quadraticCurveTo(cpx, cpy, x2, y2);
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== void 0) Painter.ctx.lineWidth = lineWidth;
    Painter.colors.stroke();
  }
}
class PainterOpacity {
  // Initialize with full opacity
  static pushOpacity(opacity) {
    const currentOpacity = this._opacityStack[this._opacityStack.length - 1];
    const newOpacity = currentOpacity * opacity;
    this._opacityStack.push(newOpacity);
    Painter.logger.log("NEXT OPACITY WILL BE", newOpacity);
    Painter.effects.setAlpha(newOpacity);
  }
  static popOpacity() {
    if (this._opacityStack.length > 1) {
      this._opacityStack.pop();
      const newOpacity = this._opacityStack[this._opacityStack.length - 1];
      Painter.logger.log("NEXT OPACITY WILL BE", newOpacity);
      Painter.effects.setAlpha(newOpacity);
    }
  }
  static _clone() {
    this._opacityStack = [...this._opacityStack];
  }
  static saveOpacityState() {
    this._opacityStateBackup = [...this._opacityStack];
  }
  static restoreOpacityState() {
    if (this._opacityStateBackup) {
      this._opacityStack = this._opacityStateBackup;
      delete this._opacityStateBackup;
    }
  }
}
__publicField(PainterOpacity, "_opacityStack", [1]);
class PainterShapes {
  // =========================================================================
  // BASIC SHAPES
  // =========================================================================
  // Drawing functions that ensure opacity is applied
  static rect(x, y, width, height, color) {
    const oldFillStyle = Painter.ctx.fillStyle;
    Painter.colors.fill(color);
    Painter.ctx.fillRect(x, y, width, height);
    Painter.ctx.fillStyle = oldFillStyle;
  }
  static outlineRect(x, y, width, height, color, lineWidth = 1) {
    const oldStrokeStyle = Painter.ctx.strokeStyle;
    const oldLineWidth = Painter.ctx.lineWidth;
    Painter.ctx.strokeStyle = color;
    Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.strokeRect(x, y, width, height);
    Painter.ctx.strokeStyle = oldStrokeStyle;
    Painter.ctx.lineWidth = oldLineWidth;
  }
  /**
   * Draw a rounded rectangle
   * @param {number} x - X coordinate (top-left)
   * @param {number} y - Y coordinate (top-left)
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number|number[]} radii - Corner radius or array of radii for each corner
   * @param {string|CanvasGradient} [fillColor] - Fill color
   * @param {string|CanvasGradient} [strokeColor] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static roundRect(x, y, width, height, radii = 0, fillColor, strokeColor, lineWidth) {
    let radiusArray;
    if (typeof radii === "number") {
      radiusArray = [radii, radii, radii, radii];
    } else if (Array.isArray(radii)) {
      radiusArray = radii.length === 4 ? radii : [
        radii[0] || 0,
        radii[1] || radii[0] || 0,
        radii[2] || radii[0] || 0,
        radii[3] || radii[1] || radii[0] || 0
      ];
    } else {
      radiusArray = [0, 0, 0, 0];
    }
    const [tlRadius, trRadius, brRadius, blRadius] = radiusArray;
    const right = x + width;
    const bottom = y + height;
    Painter.lines.beginPath();
    Painter.lines.moveTo(x + tlRadius, y);
    Painter.lines.lineTo(right - trRadius, y);
    this.arc(right - trRadius, y + trRadius, trRadius, -Math.PI / 2, 0);
    Painter.lines.lineTo(right, bottom - brRadius);
    this.arc(
      right - brRadius,
      bottom - brRadius,
      brRadius,
      0,
      Math.PI / 2
    );
    Painter.lines.lineTo(x + blRadius, bottom);
    this.arc(
      x + blRadius,
      bottom - blRadius,
      blRadius,
      Math.PI / 2,
      Math.PI
    );
    Painter.lines.lineTo(x, y + tlRadius);
    this.arc(
      x + tlRadius,
      y + tlRadius,
      tlRadius,
      Math.PI,
      -Math.PI / 2
    );
    Painter.lines.closePath();
    if (fillColor) {
      Painter.fillStyle = fillColor;
      Painter.colors.fill(fillColor);
    }
    if (strokeColor) {
      Painter.colors.stroke(strokeColor, lineWidth);
    }
  }
  /**
   * Draw a filled rounded rectangle
   * @param {number} x - X coordinate (top-left)
   * @param {number} y - Y coordinate (top-left)
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number|number[]} radii - Corner radius or array of radii
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fillRoundRect(x, y, width, height, radii = 0, color) {
    this.roundRect(x, y, width, height, radii, color, null);
  }
  /**
   * Draw a stroked rounded rectangle
   * @param {number} x - X coordinate (top-left)
   * @param {number} y - Y coordinate (top-left)
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number|number[]} radii - Corner radius or array of radii
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static strokeRoundRect(x, y, width, height, radii = 0, color, lineWidth) {
    this.roundRect(x, y, width, height, radii, null, color, lineWidth);
  }
  /**
   * Draw a filled circle
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fillCircle(x, y, radius, color) {
    Painter.logger.log("PainterShapes.fillCircle", x, y, radius, color);
    Painter.lines.beginPath();
    this.arc(x, y, radius, 0, Math.PI * 2);
    Painter.colors.fill(color);
  }
  static arc(x, y, radius, startAngle, endAngle, counterclockwise) {
    Painter.ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  }
  /**
   * Draw a stroked circle
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static strokeCircle(x, y, radius, color, lineWidth) {
    Painter.lines.beginPath();
    this.arc(x, y, radius, 0, Math.PI * 2);
    Painter.colors.stroke(color, lineWidth);
  }
  /**
   * Draw a filled ellipse
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radiusX - X radius
   * @param {number} radiusY - Y radius
   * @param {number} [rotation=0] - Rotation in radians
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fillEllipse(x, y, radiusX, radiusY, rotation = 0, color) {
    Painter.lines.beginPath();
    this.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (color) Painter.fillStyle = color;
    Painter.colors.fill(color);
  }
  /**
   * Draw a stroked ellipse
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radiusX - X radius
   * @param {number} radiusY - Y radius
   * @param {number} [rotation=0] - Rotation in radians
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static strokeEllipse(x, y, radiusX, radiusY, rotation = 0, color, lineWidth) {
    Painter.lines.beginPath();
    this.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    if (color) Painter.strokeStyle = color;
    if (lineWidth !== void 0) Painter.lineWidth = lineWidth;
    Painter.colors.stroke(color, lineWidth);
  }
  static ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise) {
    Painter.ctx.ellipse(
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise
    );
  }
  /**
   * Draw a polygon
   * @param {Array<{x: number, y: number}>} points - Array of points
   * @param {string|CanvasGradient} [fillColor] - Fill color
   * @param {string|CanvasGradient} [strokeColor] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static polygon(points, fillColor, strokeColor, lineWidth) {
    if (points.length < 2) return;
    Painter.lines.beginPath();
    Painter.lines.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      Painter.lines.lineTo(points[i].x, points[i].y);
    }
    Painter.lines.closePath();
    if (fillColor) {
      Painter.colors.fill(fillColor);
    }
    if (strokeColor) {
      Painter.colors.stroke(strokeColor, lineWidth);
    }
  }
}
class PainterText {
  static font() {
    return Painter.ctx.font;
  }
  /**
   * Set font for text drawing
   * @param {string} font - Font specification (e.g. "24px 'Courier New', monospace")
   * @returns {void}
   */
  static setFont(font) {
    Painter.ctx.font = font;
  }
  /**
   * Set text alignment
   * @param {CanvasTextAlign} align - Text alignment ('left', 'right', 'center', 'start', 'end')
   * @returns {void}
   */
  static setTextAlign(align) {
    Painter.ctx.textAlign = align;
  }
  /**
   * Set text baseline
   * @param {CanvasTextBaseline} baseline - Text baseline ('top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom')
   * @returns {void}
   */
  static setTextBaseline(baseline) {
    Painter.ctx.textBaseline = baseline;
  }
  /**
   * Draw filled text
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string|CanvasGradient} [color] - Text color
   * @param {string} [font] - Font specification
   * @returns {void}
   */
  static fillText(text, x, y, color, font) {
    if (color) Painter.ctx.fillStyle = color;
    if (font) Painter.ctx.font = font;
    Painter.ctx.fillText(text, x, y);
  }
  /**
   * Draw stroked text
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string|CanvasGradient} [color] - Text color
   * @param {number} [lineWidth] - Line width
   * @param {string} [font] - Font specification
   * @returns {void}
   */
  static strokeText(text, x, y, color, lineWidth, font) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== void 0) Painter.ctx.lineWidth = lineWidth;
    if (font) Painter.ctx.font = font;
    Painter.ctx.strokeText(text, x, y);
  }
  /**
   * Improved text measurement that accounts for baseline adjustments
   * @param {string} text - Text to measure
   * @param {string} [font] - Font specification
   * @param {string} [align="start"] - Text alignment
   * @param {string} [baseline="alphabetic"] - Text baseline
   * @returns {{width: number, height: number, verticalAdjustment: number}} Text dimensions with adjustment
   */
  static measureTextDimensions(text, font, align = "start", baseline = "alphabetic") {
    if (font) Painter.ctx.font = font;
    const metrics = Painter.ctx.measureText(text);
    const width = metrics.width;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    let verticalAdjustment = 0;
    if (baseline === "middle") {
      verticalAdjustment = -1.5;
    }
    return {
      width,
      height,
      verticalAdjustment
    };
  }
  /**
   * Measure text width
   * @param {string} text - Text to measure
   * @returns {number} Text width
   */
  static measureTextWidth(text, font) {
    if (font) Painter.ctx.font = font;
    return Painter.ctx.measureText(text).width;
  }
  /**
   * Draw filled and stroked text with outline
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} fillColor - Fill color
   * @param {string} strokeColor - Stroke color
   * @param {number} strokeWidth - Stroke width
   * @param {string} [font] - Font specification
   * @returns {void}
   */
  static outlinedText(text, x, y, fillColor, strokeColor, strokeWidth, font) {
    if (font) Painter.ctx.font = font;
    Painter.ctx.strokeStyle = strokeColor;
    Painter.ctx.lineWidth = strokeWidth;
    Painter.ctx.strokeText(text, x, y);
    Painter.ctx.fillStyle = fillColor;
    Painter.ctx.fillText(text, x, y);
  }
  /**
   * Draw text with a maximum width, wrapping to new lines as needed
   * @param {string} text - Text to draw
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} maxWidth - Maximum width before wrapping
   * @param {number} lineHeight - Line height for wrapped text
   * @param {string} [color] - Text color
   * @param {string} [font] - Font specification
   * @returns {number} Total height of drawn text
   */
  static wrappedText(text, x, y, maxWidth, lineHeight, color, font) {
    if (color) Painter.ctx.fillStyle = color;
    if (font) Painter.ctx.font = font;
    const words = text.split(" ");
    let line = "";
    let testLine = "";
    let lineCount = 1;
    for (let i = 0; i < words.length; i++) {
      testLine = line + words[i] + " ";
      const metrics = Painter.ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && i > 0) {
        Painter.ctx.fillText(line, x, y);
        line = words[i] + " ";
        y += lineHeight;
        lineCount++;
      } else {
        line = testLine;
      }
    }
    Painter.ctx.fillText(line, x, y);
    return lineCount * lineHeight;
  }
  /**
   * Draw text along a path (like an arc)
   * @param {string} text - Text to draw
   * @param {Array} path - Array of points {x, y} defining the path
   * @param {string} [color] - Text color
   * @param {string} [font] - Font specification
   * @param {boolean} [reverse=false] - Whether to draw text in reverse direction
   * @returns {void}
   */
  static textOnPath(text, path, color, font, reverse = false) {
    if (path.length < 2) return;
    if (color) Painter.ctx.fillStyle = color;
    if (font) Painter.ctx.font = font;
    const chars = text.split("");
    const charWidths = chars.map((char) => Painter.ctx.measureText(char).width);
    if (reverse) {
      chars.reverse();
      charWidths.reverse();
      path.reverse();
    }
    let pathLength = 0;
    for (let i = 1; i < path.length; i++) {
      const dx = path[i].x - path[i - 1].x;
      const dy = path[i].y - path[i - 1].y;
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }
    const textWidth = charWidths.reduce((total, width) => total + width, 0);
    let offset = (pathLength - textWidth) / 2;
    if (offset < 0) offset = 0;
    let currentOffset = offset;
    for (let i = 0; i < chars.length; i++) {
      const charWidth = charWidths[i];
      const { x, y, angle } = getPositionOnPath(path, currentOffset);
      Painter.ctx.save();
      Painter.ctx.translate(x, y);
      Painter.ctx.rotate(angle);
      Painter.ctx.fillText(chars[i], 0, 0);
      Painter.ctx.restore();
      currentOffset += charWidth;
    }
  }
  // Helper function for textOnPath
  static getPositionOnPath(path, offset) {
    let currentLength = 0;
    for (let i = 1; i < path.length; i++) {
      const p1 = path[i - 1];
      const p2 = path[i];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segmentLength = Math.sqrt(dx * dx + dy * dy);
      if (currentLength + segmentLength >= offset) {
        const t = (offset - currentLength) / segmentLength;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;
        const angle2 = Math.atan2(dy, dx);
        return { x, y, angle: angle2 };
      }
      currentLength += segmentLength;
    }
    const lastPoint = path[path.length - 1];
    const secondLastPoint = path[path.length - 2];
    const angle = Math.atan2(
      lastPoint.y - secondLastPoint.y,
      lastPoint.x - secondLastPoint.x
    );
    return {
      x: lastPoint.x,
      y: lastPoint.y,
      angle
    };
  }
}
const _Painter = class _Painter {
  /**
   * @type {PainterColors}
   */
  static get colors() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "colors", __privateGet(this, __colors));
    return __privateGet(this, __colors);
  }
  /**
   * @type {PainterEffects}
   */
  static get effects() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "effects", __privateGet(this, __effects));
    return __privateGet(this, __effects);
  }
  /**
   * @type {PainterImages}
   */
  static get img() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "img", __privateGet(this, __img));
    return __privateGet(this, __img);
  }
  /**
   * @type {PainterLines}
   */
  static get lines() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "lines", __privateGet(this, __lines));
    return __privateGet(this, __lines);
  }
  /**
   * @type {PainterOpacity}
   */
  static get opacity() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "opacity", __privateGet(this, __opacity));
    return __privateGet(this, __opacity);
  }
  /**
   * @type {PainterShapes}
   */
  static get shapes() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "shapes", __privateGet(this, __shapes));
    return __privateGet(this, __shapes);
  }
  /**
   * @type {PainterText}
   */
  static get text() {
    __privateMethod(this, _Painter_static, checkInitialized_fn).call(this, "text", __privateGet(this, __text));
    return __privateGet(this, __text);
  }
  static set ctx(ctx) {
    this._ctx = ctx;
  }
  /**
   * @type {CanvasRenderingContext2D}
   */
  static get ctx() {
    if (!this._ctx) {
      throw new Error("Cannot access Painter.ctx before initialization!");
    }
    return this._ctx;
  }
  /**
   * Initialize the painter with a canvas context
   * @param {CanvasRenderingContext2D} ctx - The canvas context
   */
  static init(ctx) {
    this._ctx = ctx;
    this.saveStack = [];
    __privateSet(this, __colors, PainterColors);
    __privateSet(this, __effects, PainterEffects);
    __privateSet(this, __img, PainterImages);
    __privateSet(this, __lines, PainterLines);
    __privateSet(this, __opacity, PainterOpacity);
    __privateSet(this, __shapes, PainterShapes);
    __privateSet(this, __text, PainterText);
    _Painter.logger = Logger.getLogger("Painter");
    _Painter.saveStack = [];
  }
  static save() {
    const stackLine = new Error().stack.split("\n")[2] || "";
    const methodMatch = stackLine.match(/at\s+(\w+)\.(\w+)/);
    const callerInfo = methodMatch ? `${methodMatch[1]}.${methodMatch[2]}` : "unknown";
    this.saveStack.push(callerInfo);
    this.logger.log(`Painter.save() by: ${callerInfo}`);
    this.ctx.save();
    _Painter.opacity.saveOpacityState();
  }
  static restore() {
    if (this.saveStack.length === 0) {
      console.error("PAINTER ERROR: restore() without matching save()!");
      return;
    }
    const caller = this.saveStack.pop();
    this.logger.log(`Painter.restore() balancing save from: ${caller}`);
    this.ctx.restore();
    this.ctx.fillStyle = null;
    this.ctx.strokeStyle = null;
    _Painter.opacity.restoreOpacityState();
  }
  static translateTo(x, y) {
    if (isNaN(x) || x === void 0) {
      x = 0;
    }
    if (isNaN(y) || y === void 0) {
      y = 0;
    }
    this.logger.log("moveTo", x, y);
    this.ctx.translate(x, y);
  }
  static resetPosition() {
    this.logger.log("resetPosition");
    const transform = this.ctx.getTransform();
    this.ctx.setTransform(
      transform.a,
      transform.b,
      transform.c,
      transform.d,
      0,
      0
    );
  }
  static withPosition(x, y, callback) {
    this.logger.log("withPosition", x, y);
    this.save();
    this.translateTo(x, y);
    callback();
    this.restore();
  }
  /**
   * Clear the entire canvas or a specific rectangle
   * @param {number} [x=0] - X coordinate
   * @param {number} [y=0] - Y coordinate
   * @param {number} [width=canvas.width] - Width
   * @param {number} [height=canvas.height] - Height
   * @returns {void}
   */
  static clear(x = 0, y = 0, width = _Painter.ctx.canvas.width, height = _Painter.ctx.canvas.height) {
    _Painter.ctx.clearRect(x, y, width, height);
  }
  /**
   * Translate the canvas
   * @param {number} x - X translation
   * @param {number} y - Y translation
   * @returns {void}
   */
  static translate(x, y) {
    _Painter.ctx.translate(x, y);
  }
  /**
   * Rotate the canvas
   * @param {number} angle - Rotation angle in radians
   * @returns {void}
   */
  static rotate(angle) {
    _Painter.logger.log("Painter.rotate", angle);
    _Painter.ctx.rotate(angle);
  }
  /**
   * Scale the canvas
   * @param {number} x - X scale factor
   * @param {number} y - Y scale factor
   * @returns {void}
   */
  static scale(x, y) {
    _Painter.logger.log("Painter.scale", x, y);
    _Painter.ctx.scale(x, y);
  }
};
__colors = new WeakMap();
__effects = new WeakMap();
__img = new WeakMap();
__lines = new WeakMap();
__opacity = new WeakMap();
__shapes = new WeakMap();
__text = new WeakMap();
_Painter_static = new WeakSet();
checkInitialized_fn = function(propName, value) {
  if (!value) {
    throw new Error(`Painter.${propName} is not initialized. Call Painter.init(ctx) first.`);
  }
};
__privateAdd(_Painter, _Painter_static);
__privateAdd(_Painter, __colors, null);
__privateAdd(_Painter, __effects, null);
__privateAdd(_Painter, __img, null);
__privateAdd(_Painter, __lines, null);
__privateAdd(_Painter, __opacity, null);
__privateAdd(_Painter, __shapes, null);
__privateAdd(_Painter, __text, null);
/**
 * @type {Logger}
 */
__publicField(_Painter, "logger");
let Painter = _Painter;
class PainterColors {
  /**
   * Fill the current path
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fill(color) {
    Painter.logger.log(
      "PainterColors.fill - before:",
      Painter.ctx.fillStyle,
      "setting to:",
      color
    );
    Painter.ctx.fillStyle;
    Painter.ctx.fillStyle = color;
    Painter.ctx.fill();
    Painter.logger.log("PainterColors.fill - after:", Painter.ctx.fillStyle);
  }
  /**
   * Set stroke options
   * @param {*} options The options for the stroke
   */
  static strokeOptions(options) {
    if (options.color) Painter.ctx.strokeStyle = options.color;
    if (options.lineWidth !== void 0)
      Painter.ctx.lineWidth = options.lineWidth;
    if (options.lineCap) Painter.ctx.lineCap = options.lineCap;
    if (options.lineJoin) Painter.ctx.lineJoin = options.lineJoin;
    if (options.strokeStyle) Painter.ctx.strokeStyle = options.strokeStyle;
  }
  /**
   * Stroke the current path
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static stroke(color, lineWidth) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== void 0) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }
  /**
   * Set fill color
   * @param {string|CanvasGradient} color - Fill color
   * @returns {void}
   */
  static setFillColor(color) {
    Painter.ctx.fillStyle = color;
  }
  /**
   * Set stroke color
   * @param {string|CanvasGradient} color - Stroke color
   * @returns {void}
   */
  static setStrokeColor(color) {
    Painter.ctx.strokeStyle = color;
  }
  /**
   * Generate a random pleasing color in RGB format
   * @returns {Array<number>} RGB color array [r, g, b]
   */
  static randomColorRGB() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 50 + Math.floor(Math.random() * 20);
    return Painter.colors.hslToRgb(hue, saturation, lightness);
  }
  static randomColorRGBA(alpha = 255) {
    const [r, g, b] = this.randomColorRGB();
    return [r, g, b, alpha];
  }
  static randomColorHSL() {
    return `hsl(${Math.random() * 360}, 100%, 50%)`;
  }
  static randomColorHSL_RGBA(alpha = 255) {
    const h = Math.random() * 360;
    const s = 60 + Math.random() * 40;
    const l = 40 + Math.random() * 40;
    const [r, g, b] = Painter.colors.hslToRgb(h, s, l);
    return [r, g, b, alpha];
  }
  static randomColorHEX() {
    let n = (Math.random() * 1048575 * 1e6).toString(16);
    return "#" + n.slice(0, 6);
  }
  static parseColorString(str) {
    str = str.trim().toLowerCase();
    if (str.startsWith("hsl")) {
      const inner = str.replace(/hsla?\(|\)/g, "");
      const [hue, satPercent, lightPercent] = inner.split(",").map((c) => c.trim());
      const h = parseFloat(hue);
      const s = parseFloat(satPercent) / 100;
      const l = parseFloat(lightPercent) / 100;
      return Painter.colors.hslToRgb(h, s, l);
    }
    if (str.startsWith("#")) {
      return hexToRgb(str);
    }
    if (str.startsWith("rgb")) {
      const inner = str.replace(/rgba?\(|\)/g, "");
      const [r, g, b] = inner.split(",").map((x) => parseInt(x.trim()));
      return [r, g, b];
    }
    return [0, 0, 0];
  }
  /**
   * Convert [r,g,b] => "rgb(r, g, b)" string
   */
  static rgbArrayToCSS([r, g, b]) {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }
  /**
   * Convert HSL => [r,g,b] (0..255).
   * Formulas from standard color conversion references.
   */
  static hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  static rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0, s = 0, l = (max + min) / 2;
    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r:
          h = 60 * (((g - b) / delta + 6) % 6);
          break;
        case g:
          h = 60 * ((b - r) / delta + 2);
          break;
        case b:
          h = 60 * ((r - g) / delta + 4);
          break;
      }
    }
    return [h % 360, s, l];
  }
  /**
   * Convert a hex color like "#ff00ff" => [255, 0, 255].
   */
  static hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  }
  // GRADIENT METHODS
  // =========================================================================
  /**
   * Create a linear gradient
   * @param {number} x0 - Start X
   * @param {number} y0 - Start Y
   * @param {number} x1 - End X
   * @param {number} y1 - End Y
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static linearGradient(x0, y0, x1, y1, colorStops) {
    const gradient = Painter.ctx.createLinearGradient(x0, y0, x1, y1);
    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    return gradient;
  }
  /**
   * Create a radial gradient
   * @param {number} x0 - Inner circle center X
   * @param {number} y0 - Inner circle center Y
   * @param {number} r0 - Inner circle radius
   * @param {number} x1 - Outer circle center X
   * @param {number} y1 - Outer circle center Y
   * @param {number} r1 - Outer circle radius
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static radialGradient(x0, y0, r0, x1, y1, r1, colorStops) {
    const gradient = Painter.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }
    return gradient;
  }
  /**
   * Create a vertical gradient (convenience method)
   * @param {number} x - X position
   * @param {number} y - Top Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static verticalGradient(x, y, width, height, colorStops) {
    return Painter.colors.linearGradient(x, y, x, y + height, colorStops);
  }
  /**
   * Create a horizontal gradient (convenience method)
   * @param {number} x - Left X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static horizontalGradient(x, y, width, height, colorStops) {
    return Painter.colors.linearGradient(x, y, x + width, y, colorStops);
  }
  /**
   * Create a conic gradient
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} startAngle - Start angle in radians
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static conicGradient(x, y, startAngle, colorStops) {
    if (typeof Painter.ctx.createConicGradient === "function") {
      const gradient = Painter.ctx.createConicGradient(startAngle, x, y);
      for (const stop of colorStops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      return gradient;
    }
    return null;
  }
  /**
   * Create an RGBA color string
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @param {number} [a=1] - Alpha (0-1)
   * @returns {string} RGBA color string
   */
  static rgba(r, g, b, a = 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  }
  /**
   * Create an HSL color string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} HSL color string
   */
  static hsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  /**
   * Create an HSLA color string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @param {number} a - Alpha (0-1)
   * @returns {string} HSLA color string
   */
  static hsla(h, s, l, a) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }
}
class Euclidian extends Loggable {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.x=0] - X position (center-based)
   * @param {number} [options.y=0] - Y position (center-based)
   * @param {number} [options.width=0] - Width in pixels
   * @param {number} [options.height=0] - Height in pixels
   * @param {boolean} [options.debug=false] - Enables visual debug overlay
   * @param {string} [options.debugColor="#0f0"] - Outline color for debug box
   */
  constructor(options = {}) {
    super(options);
    this._x = typeof options.x === "number" ? options.x : 0;
    this._y = typeof options.y === "number" ? options.y : 0;
    this._width = typeof options.width === "number" ? options.width : 0;
    this._height = typeof options.height === "number" ? options.height : 0;
    this.logger.log("Euclidian", this._x, this._y, this._width, this._height);
  }
  /** @type {number} X center position in canvas space */
  get x() {
    return this._x;
  }
  set x(v) {
    this.validateProp(v, "x");
    this._x = v;
  }
  /** @type {number} Y center position in canvas space */
  get y() {
    return this._y;
  }
  set y(v) {
    this.validateProp(v, "y");
    this._y = v;
  }
  /** @type {number} Width of the object (must be ≥ 0) */
  get width() {
    return this._width;
  }
  set width(v) {
    this.validateProp(v, "width");
    this._width = Math.max(0, v);
  }
  /** @type {number} Height of the object (must be ≥ 0) */
  get height() {
    return this._height;
  }
  set height(v) {
    this.validateProp(v, "height");
    this._height = Math.max(0, v);
  }
  /** @type {boolean} Whether to draw the debug box outline */
  get debug() {
    return this._debug;
  }
  set debug(v) {
    this.validateProp(v, "debug");
    this._debug = Boolean(v);
  }
  /** @type {string} Color of the debug box (e.g. "#0f0" or "red") */
  get debugColor() {
    return this._debugColor;
  }
  set debugColor(v) {
    this.validateProp(v, "debugColor");
    this._debugColor = v;
  }
  validateProp(v, prop) {
    if (v === void 0 || v === null) {
      throw new Error("Invalid property value: " + prop + " " + v);
    }
  }
}
class Geometry2d extends Euclidian {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.minX] - Minimum X constraint (optional)
   * @param {number} [options.maxX] - Maximum X constraint (optional)
   * @param {number} [options.minY] - Minimum Y constraint (optional)
   * @param {number} [options.maxY] - Maximum Y constraint (optional)
   * @param {boolean} [options.crisp=true] - Whether to round to whole pixels
   */
  constructor(options = {}) {
    super(options);
    this._minX = options.minX;
    this._maxX = options.maxX;
    this._minY = options.minY;
    this._maxY = options.maxY;
    this._boundsDirty = true;
    this._cachedBounds = null;
    this.crisp = options.crisp ?? true;
    this.logger.log("Geometry2d", this.x, this.y, this.width, this.height);
  }
  update() {
    this.trace("Geometry2d.update");
    this.applyConstraints();
    this.getBounds();
  }
  /**
   * Gets the minimum allowed X value.
   * @type {number|undefined}
   */
  get minX() {
    return this._minX;
  }
  set minX(v) {
    this._minX = v;
  }
  /**
   * Gets the maximum allowed X value.
   * @type {number|undefined}
   */
  get maxX() {
    return this._maxX;
  }
  set maxX(v) {
    this._maxX = v;
  }
  /**
   * Gets the minimum allowed Y value.
   * @type {number|undefined}
   */
  get minY() {
    return this._minY;
  }
  set minY(v) {
    this._minY = v;
  }
  /**
   * Gets the maximum allowed Y value.
   * @type {number|undefined}
   */
  get maxY() {
    return this._maxY;
  }
  set maxY(v) {
    this._maxY = v;
  }
  /**
   * Whether the bounding box is dirty and needs recalculation.
   * @type {boolean}
   * @readonly
   */
  get boundsDirty() {
    return this._boundsDirty;
  }
  /**
   * Applies positional constraints and optionally rounds to whole pixels.
   */
  applyConstraints() {
    if (this._minX !== void 0) this.x = Math.max(this.x, this._minX);
    if (this._maxX !== void 0) this.x = Math.min(this.x, this._maxX);
    if (this._minY !== void 0) this.y = Math.max(this.y, this._minY);
    if (this._maxY !== void 0) this.y = Math.min(this.y, this._maxY);
    if (this.crisp) {
      this.x = Math.round(this.x);
      this.y = Math.round(this.y);
      this.width = Math.round(this.width);
      this.height = Math.round(this.height);
    }
  }
  /**
   * Returns the object's bounding box.
   * Uses memoization to avoid unnecessary recomputation.
   *
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    if (this._boundsDirty || !this._cachedBounds) {
      this._cachedBounds = this.calculateBounds();
      this._boundsDirty = false;
    }
    return this._cachedBounds;
  }
  /**
   * Called by `getBounds()` when bounds are dirty.
   * Can be overridden to support more complex bounds (e.g. transformed shapes).
   *
   * @protected
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  calculateBounds() {
    return {
      width: this.width,
      height: this.height,
      x: this.x,
      y: this.y
    };
  }
  /**
   * Returns the object's top-left corner, taking into account group containment.
   * Useful for layouting or aligning objects to pixel grids.
   *
   * @returns {{x: number, y: number}}
   */
  getLocalPosition() {
    let parentX = 0;
    let parentY = 0;
    if (this.parent) {
      parentX = this.parent.x;
      parentY = this.parent.y;
    }
    return {
      x: this.x - parentX - this.width / 2,
      y: this.y - parentY - this.height / 2
    };
  }
  /**
   * Marks bounds as dirty.
   * Called automatically by internal setters, but exposed for custom logic.
   *
   * @protected
   */
  markBoundsDirty() {
    this._boundsDirty = true;
  }
  validateProp(v, prop) {
    super.validateProp(v, prop);
    const originalProp = this[prop];
    if (v !== originalProp) {
      this.markBoundsDirty();
    }
  }
  setTopLeft(x, y) {
    this.x = x + this.width / 2;
    this.y = y + this.height / 2;
    return this;
  }
  setCenter(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}
class Traceable extends Geometry2d {
  constructor(options = {}) {
    super(options);
    this._debug = Boolean(options.debug);
    this._debugColor = typeof options.debugColor === "string" ? options.debugColor : "#0f0";
    this.logger.log("Traceable", this.x, this.y, this.width, this.height);
  }
  async drawDebug() {
    if (!this._debug) return;
    const debugBounds = this.getDebugBounds();
    this.logger.log(
      this.constructor.name,
      "drawDebug",
      debugBounds.x,
      debugBounds.y,
      debugBounds.width,
      debugBounds.height
    );
    Painter.save();
    Painter.scale(this.scaleX, this.scaleY);
    Painter.rotate(this.rotation);
    Painter.shapes.outlineRect(
      debugBounds.x,
      debugBounds.y,
      debugBounds.width,
      debugBounds.height,
      this._debugColor,
      2
    );
    Painter.restore();
  }
  getDebugBounds() {
    return {
      width: this.width,
      height: this.height,
      x: this.x - this.width / 2,
      y: this.y - this.height / 2
    };
  }
  /**
   * Logs the object's render state (debug only).
   * @param {string} [msg]
   */
  trace(msg = "render") {
    this.logger.log(
      this.name == null ? this.constructor.name : this.name,
      msg,
      "x",
      this.x,
      "y",
      this.y,
      "w",
      this.width,
      "h",
      this.height,
      "opacity",
      this._opacity,
      "visible",
      this._visible,
      "active",
      this._active,
      "debug",
      this.debug
    );
  }
}
class Renderable extends Traceable {
  /**
   * @param {Object} [options={}]
   * @param {boolean} [options.visible=true] - Whether this object should be drawn
   * @param {number} [options.opacity=1] - Alpha transparency (0–1)
   * @param {boolean} [options.active=true] - Whether this object receives updates
   * @param {string} [options.blendMode="source-over"] - Optional blend mode
   * @param {string} [options.shadowColor] - Optional shadow color
   * @param {number} [options.shadowBlur=0] - Shadow blur radius
   * @param {number} [options.shadowOffsetX=0] - Shadow X offset
   * @param {number} [options.shadowOffsetY=0] - Shadow Y offset
   * @param {number} [options.zIndex=0] - Z-index for stacking order
   */
  constructor(options = {}) {
    super(options);
    this._visible = options.visible !== false;
    this._opacity = typeof options.opacity === "number" ? options.opacity : 1;
    this._active = options.active !== false;
    this.zIndex = options.zIndex ?? 0;
    this._shadowColor = options.shadowColor ?? void 0;
    this._shadowBlur = options.shadowBlur ?? 0;
    this._shadowOffsetX = options.shadowOffsetX ?? 0;
    this._shadowOffsetY = options.shadowOffsetY ?? 0;
    this._tick = 0;
    this.logger.log("Renderable", this.x, this.y, this.width, this.height);
  }
  // Modify this in Renderable class
  render() {
    var _a;
    if (!this._visible || this._opacity <= 0) return;
    const isAnchoredScene = ((_a = this._anchor) == null ? void 0 : _a.position) != null;
    if (this._debug && !isAnchoredScene) {
      this.drawDebug();
    }
    Painter.save();
    Painter.effects.setBlendMode(this._blendMode);
    Painter.opacity.pushOpacity(this._opacity);
    if (this.crisp) {
      Painter.translateTo(Math.round(this.x), Math.round(this.y));
    } else {
      Painter.translateTo(this.x, this.y);
    }
    this.applyShadow(Painter.ctx);
    if (this.constructor.name !== "Renderable") {
      this.draw();
    }
    Painter.opacity.popOpacity();
    Painter.restore();
    if (this._debug && isAnchoredScene) {
      this.drawDebug();
    }
  }
  draw() {
    this.drawDebug();
  }
  /**
   * Called once per frame if the object is active.
   * @param {number} dt - Time delta since last frame (seconds)
   */
  update(dt) {
    this.trace("Renderable.update");
    this._tick += dt;
    super.update(dt);
  }
  /**
   * Apply shadow styles to the current canvas context.
   * Only called if `shadowColor` is defined.
   *
   * @param {CanvasRenderingContext2D} ctx
   */
  applyShadow(ctx) {
    if (!this._shadowColor) return;
    ctx.shadowColor = this._shadowColor;
    ctx.shadowBlur = this._shadowBlur;
    ctx.shadowOffsetX = this._shadowOffsetX;
    ctx.shadowOffsetY = this._shadowOffsetY;
  }
  /**
   * Gets whether the object is visible (drawn during render).
   * @type {boolean}
   */
  get visible() {
    return this._visible;
  }
  set visible(v) {
    this._visible = Boolean(v);
  }
  /**
   * Gets whether the object is active (updated during game loop).
   * @type {boolean}
   */
  get active() {
    return this._active;
  }
  set active(v) {
    this._active = Boolean(v);
  }
  /**
   * Gets the object's opacity (0–1).
   * @type {number}
   */
  get opacity() {
    return this._opacity;
  }
  set opacity(v) {
    this._opacity = Math.min(1, Math.max(0, typeof v === "number" ? v : 1));
  }
  /**
   * Gets the current shadow color (if any).
   * @type {string|undefined}
   */
  get shadowColor() {
    return this._shadowColor;
  }
  set shadowColor(v) {
    this._shadowColor = v;
  }
  /**
   * Gets the blur radius for the drop shadow.
   * @type {number}
   */
  get shadowBlur() {
    return this._shadowBlur;
  }
  set shadowBlur(v) {
    this._shadowBlur = v;
  }
  /**
   * Gets the horizontal offset of the drop shadow.
   * @type {number}
   */
  get shadowOffsetX() {
    return this._shadowOffsetX;
  }
  set shadowOffsetX(v) {
    this._shadowOffsetX = v;
  }
  /**
   * Gets the vertical offset of the drop shadow.
   * @type {number}
   */
  get shadowOffsetY() {
    return this._shadowOffsetY;
  }
  set shadowOffsetY(v) {
    this._shadowOffsetY = v;
  }
  /**
   * Total elapsed time this object has been alive (updated).
   * @type {number}
   * @readonly
   */
  get tick() {
    return this._tick;
  }
}
class Transformable extends Renderable {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.rotation=0] - Rotation in radians (clockwise)
   * @param {number} [options.scaleX=1] - Horizontal scale factor
   * @param {number} [options.scaleY=1] - Vertical scale factor
   */
  constructor(options = {}) {
    super(options);
    this._rotation = options.rotation * Math.PI / 180;
    this._scaleX = options.scaleX ?? 1;
    this._scaleY = options.scaleY ?? 1;
    this.logger.log("Transformable", this.x, this.y, this.width, this.height);
  }
  /**
   * The main rendering method.
   * Applies transforms before calling `draw()`.
   */
  draw() {
    this.applyTransforms();
  }
  /**
   * Applies canvas transform context.
   * Order: rotate → scale
   */
  applyTransforms() {
    Painter.rotate(this._rotation);
    Painter.scale(this._scaleX, this._scaleY);
  }
  /**
   * Gets the object's rotation in radians.
   * @type {number}
   */
  get rotation() {
    return this._rotation;
  }
  set rotation(v) {
    this._rotation = v * Math.PI / 180;
    this.markBoundsDirty();
  }
  /**
   * Gets horizontal scale factor.
   * @type {number}
   */
  get scaleX() {
    return this._scaleX;
  }
  set scaleX(v) {
    this._scaleX = v;
    this.markBoundsDirty();
  }
  /**
   * Gets vertical scale factor.
   * @type {number}
   */
  get scaleY() {
    return this._scaleY;
  }
  set scaleY(v) {
    this._scaleY = v;
    this.markBoundsDirty();
  }
  /**
   * Calculates the bounding box *after* applying rotation and scale.
   * Used by Geometry2d → getBounds().
   *
   * @override
   * @protected
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  calculateBounds() {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const corners = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: halfW, y: halfH },
      { x: -halfW, y: halfH }
    ];
    const cos = Math.cos(this._rotation);
    const sin = Math.sin(this._rotation);
    const transformed = corners.map(({ x, y }) => {
      x *= this._scaleX;
      y *= this._scaleY;
      const rx = x * cos - y * sin;
      const ry = x * sin + y * cos;
      return { x: rx + this.x, y: ry + this.y };
    });
    const xs = transformed.map((p) => p.x);
    const ys = transformed.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}
class Shape extends Transformable {
  /**
   * @param {number} x - X center of the shape
   * @param {number} y - Y center of the shape
   * @param {Object} [options={}] - Styling and layout options
   * @param {string|null} [options.color=null] - Fill color (CSS color string)
   * @param {string|null} [options.stroke=null] - Stroke color (CSS color string)
   * @param {number} [options.lineWidth=1] - Line width in pixels
   * @param {string} [options.lineJoin="miter"] - "miter", "round", or "bevel"
   * @param {string} [options.lineCap="butt"] - "butt", "round", or "square"
   * @param {number} [options.miterLimit=10] - Maximum miter length
   */
  constructor(options = {}) {
    super(options);
    this._color = options.color ?? null;
    this._stroke = options.stroke ?? null;
    this._lineWidth = options.lineWidth ?? 1;
    this._lineJoin = options.lineJoin ?? "miter";
    this._lineCap = options.lineCap ?? "butt";
    this._miterLimit = options.miterLimit ?? 10;
    this.logger.log("Shape", this.x, this.y, this.width, this.height);
  }
  /** @type {string|null} Fill style for canvas fill operations */
  get color() {
    return this._color;
  }
  set color(v) {
    this._color = v;
  }
  /** @type {string|null} Stroke style for canvas stroke operations */
  get stroke() {
    return this._stroke;
  }
  set stroke(v) {
    this._stroke = v;
  }
  /** @type {number} Width of the stroke in pixels */
  get lineWidth() {
    return this._lineWidth;
  }
  set lineWidth(v) {
    this._lineWidth = Math.max(0, v);
  }
  /** @type {"miter"|"round"|"bevel"} Style of line joins */
  get lineJoin() {
    return this._lineJoin;
  }
  set lineJoin(v) {
    this._lineJoin = v;
  }
  /** @type {"butt"|"round"|"square"} Style of line caps */
  get lineCap() {
    return this._lineCap;
  }
  set lineCap(v) {
    this._lineCap = v;
  }
  /** @type {number} Maximum miter length before switching to bevel */
  get miterLimit() {
    return this._miterLimit;
  }
  set miterLimit(v) {
    this._miterLimit = v;
  }
}
class Group extends Transformable {
  /**
   * Creates a new Group instance
   * 
   * @param {Object} [options={}] - Additional rendering options
   * @param {boolean} [options.inheritOpacity=true] - Whether opacity should cascade to children 
   * @param {boolean} [options.inheritVisible=true] - Whether visibility should cascade to children
   * @param {boolean} [options.inheritScale=false] - Whether scale should cascade to children
   */
  constructor(options = {}) {
    super(options);
    this._collection = new ZOrderedCollection({
      sortByZIndex: options.sortByZIndex || true
    });
    this._collection._owner = this;
    this._childrenVersion = 0;
    this._cachedBounds = null;
    options.width = Math.max(0, options.width || 0);
    options.height = Math.max(0, options.height || 0);
    this.userDefinedWidth = options.width;
    this.userDefinedHeight = options.height;
    this.userDefinedDimensions = options.width !== void 0 && options.height !== void 0 && (options.width > 0 || options.height > 0);
  }
  /**
   * Add object to group with type checking
   * @param {Transformable} object - Object to add
   * @returns {Transformable} The added object
   */
  add(object) {
    if (object == null || object == void 0) {
      throw new Error("Object is null or undefined");
    }
    if (!(object instanceof Transformable)) {
      throw new TypeError("Group can only add Transformable instances");
    }
    object.parent = this;
    this._collection.add(object);
    this._childrenVersion++;
    this.markBoundsDirty();
    return object;
  }
  /**
   * Remove object from group
   * @param {Transformable} object - Object to remove
   * @returns {boolean} Whether object was removed
   */
  remove(object) {
    const result = this._collection.remove(object);
    if (result) {
      object.parent = null;
      this._childrenVersion++;
      this.markBoundsDirty();
    }
    return result;
  }
  /**
   * Clear all objects from group
   */
  clear() {
    this._collection.clear();
    this._childrenVersion++;
    this.markBoundsDirty();
  }
  // Z-ordering methods
  bringToFront(object) {
    return this._collection.bringToFront(object);
  }
  sendToBack(object) {
    return this._collection.sendToBack(object);
  }
  bringForward(object) {
    return this._collection.bringForward(object);
  }
  sendBackward(object) {
    return this._collection.sendBackward(object);
  }
  /**
   * Render group and all children with transformations
   */
  draw() {
    super.draw();
    this.logger.log("Group.draw chilren:", this.children.length);
    const sortedChildren = this._collection.getSortedChildren();
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      if (child.visible) {
        Painter.save();
        child.render();
        Painter.restore();
      }
    }
  }
  /**
   * Update all children with active update methods
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.logger.groupCollapsed("Group.update");
    const sortedChildren = this._collection.getSortedChildren();
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      if (child.active && typeof child.update === "function") {
        child.update(dt);
      }
    }
    super.update(dt);
    this.logger.groupEnd();
  }
  /**
   * Get group's children array
   * @returns {Array} Children array
   */
  get children() {
    var _a;
    return ((_a = this._collection) == null ? void 0 : _a.children) || [];
  }
  /**
   * Override width getter
   * @returns {number} Width
   */
  get width() {
    if (this.userDefinedDimensions) {
      return this._width;
    }
    return this.getBounds().width;
  }
  /**
   * Override width setter
   * @param {number} v - New width
   */
  set width(v) {
    const max = Math.max(0, v);
    this._width = max;
    this.userDefinedWidth = max;
    this.userDefinedDimensions = (this.userDefinedWidth > 0 || this.userDefinedHeight > 0) && this.userDefinedWidth !== void 0 && this.userDefinedHeight !== void 0;
    this.markBoundsDirty();
  }
  /**
   * Override height getter
   * @returns {number} Height
   */
  get height() {
    if (this.userDefinedDimensions) {
      return this._height;
    }
    return this.getBounds().height;
  }
  /**
   * Override height setter
   * @param {number} v - New height
   */
  set height(v) {
    const max = Math.max(0, v);
    this._height = max;
    this.userDefinedHeight = max;
    this.userDefinedDimensions = (this.userDefinedWidth > 0 || this.userDefinedHeight > 0) && this.userDefinedWidth !== void 0 && this.userDefinedHeight !== void 0;
    this.markBoundsDirty();
  }
  /**
   * Override calculateBounds to compute from children
   * @returns {Object} Bounds object
   */
  calculateBounds() {
    var _a;
    if (this.userDefinedDimensions) {
      return {
        x: this.x,
        y: this.y,
        width: this._width,
        height: this._height
      };
    }
    if (!((_a = this.children) == null ? void 0 : _a.length)) {
      return {
        x: this.x,
        y: this.y,
        width: 0,
        height: 0
      };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width;
      const childHeight = child.height;
      const childLeft = childX - childWidth / 2;
      const childRight = childX + childWidth / 2;
      const childTop = childY - childHeight / 2;
      const childBottom = childY + childHeight / 2;
      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }
    const width = maxX - minX;
    const height = maxY - minY;
    return {
      x: this.x,
      y: this.y,
      width,
      height
    };
  }
  getDebugBounds() {
    var _a;
    const bounds = this.calculateBounds();
    let minX = Infinity;
    let minY = Infinity;
    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width;
      const childHeight = child.height;
      const childLeft = childX - childWidth / 2;
      const childTop = childY - childHeight / 2;
      minX = Math.min(minX, childLeft);
      minY = Math.min(minY, childTop);
    }
    if (!((_a = this.children) == null ? void 0 : _a.length)) {
      minX = this.x - bounds.width / 2;
      minY = this.y - bounds.height / 2;
    }
    return {
      width: bounds.width,
      height: bounds.height,
      x: minX,
      y: minY
    };
  }
}
class Arc extends Shape {
  /**
   *
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} startAngle - In radians
   * @param {number} endAngle - In radians
   * @param {object} options - Style options
   */
  constructor(radius, startAngle, endAngle, options = {}) {
    super(options);
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }
  draw() {
    super.draw();
    Painter.lines.beginPath();
    Painter.shapes.arc(0, 0, this.radius, this.startAngle, this.endAngle, false);
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
  getBounds() {
    const r = this.radius;
    return {
      x: this.x,
      y: this.y,
      width: r * 2,
      height: r * 2
    };
  }
}
class Circle extends Shape {
  constructor(radius, options = {}) {
    super(options);
    this._radius = radius;
    this.width = radius * 2;
    this.height = radius * 2;
  }
  /**
   * Renders the circle using the Painter API.
   */
  draw() {
    super.draw();
    if (this.color) {
      Painter.shapes.fillCircle(0, 0, this._radius, this.color);
    }
    if (this.stroke) {
      Painter.shapes.strokeCircle(
        0,
        0,
        this._radius,
        this.stroke,
        this.lineWidth
      );
    }
  }
  calculateBounds() {
    const size = this._radius * 2;
    this.trace("Circle.calculateBounds:" + size);
    return { x: this.x, y: this.y, width: size, height: size };
  }
  get radius() {
    return this._radius;
  }
  set radius(v) {
    this.validateProp(v, "radius");
    if (v != this._radius) {
      this._radius = v;
      this.width = v * 2;
      this.height = v * 2;
      this._boundsDirty = true;
      this.calculateBounds();
    }
  }
}
class Cloud extends Shape {
  constructor(x, y, size = 40, options = {}) {
    super(x, y, options);
    this.size = size;
  }
  draw() {
    super.draw();
    const r = this.size;
    const path = [
      ["M", -r, 0],
      ["C", -r, -r, 0, -r, 0, 0],
      ["C", 0, -r * 1.2, r * 1.2, -r, r, 0],
      ["C", r * 1.5, r * 0.5, r * 0.5, r * 1.2, 0, r],
      ["C", -r * 0.8, r * 1.3, -r * 1.2, r * 0.3, -r, 0],
      ["Z"]
    ];
    Painter.lines.path(path, this.fillColor, this.strokeColor, this.lineWidth);
  }
  getBounds() {
    const s = this.size * 2;
    return {
      x: this.x,
      y: this.y,
      width: s,
      height: s
    };
  }
}
class BezierShape extends Shape {
  /**
   *
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {Array} path - An array of path commands [['M', x, y], ['C', ...], ['Z']]
   * @param {object} options - color, stroke, etc
   */
  constructor(path = [], options = {}) {
    super(options);
    this.path = path;
  }
  draw() {
    super.draw();
    Painter.lines.path(
      this.path,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
  getBounds() {
    const s = 50;
    return {
      x: this.x,
      y: this.y,
      width: s * 2,
      height: s * 2
    };
  }
}
class Rectangle extends Shape {
  constructor(options = {}) {
    super(options);
  }
  /**
   * Renders the rectangle using Painter.
   */
  draw() {
    super.draw();
    this.drawRect();
  }
  drawRect() {
    const x = -this.width / 2;
    const y = -this.height / 2;
    if (this.color) {
      Painter.shapes.rect(x, y, this.width, this.height, this.color);
    }
    if (this.stroke) {
      Painter.shapes.outlineRect(x, y, this.width, this.height, this.stroke, this.lineWidth);
    }
  }
}
class RoundedRectangle extends Shape {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width - Rectangle width
   * @param {number} height - Rectangle height
   * @param {number|number[]} radii - Corner radius or array of radii for each corner
   * @param {Object} [options] - Shape rendering options
   */
  constructor(radii = 0, options = {}) {
    super(options);
    if (typeof radii === "number") {
      this.radii = [radii, radii, radii, radii];
    } else if (Array.isArray(radii)) {
      this.radii = radii.length === 4 ? radii : [
        radii[0] || 0,
        radii[1] || radii[0] || 0,
        radii[2] || radii[0] || 0,
        radii[3] || radii[1] || radii[0] || 0
      ];
    } else {
      this.radii = [0, 0, 0, 0];
    }
  }
  /**
   * Renders the rounded rectangle using Painter's roundRect method.
   */
  draw() {
    super.draw();
    const x = -this.width / 2;
    const y = -this.height / 2;
    if (this.color && this.stroke) {
      Painter.shapes.roundRect(
        x,
        y,
        this.width,
        this.height,
        this.radii,
        this.color,
        this.stroke,
        this.lineWidth
      );
    } else if (this.color) {
      Painter.shapes.fillRoundRect(
        x,
        y,
        this.width,
        this.height,
        this.radii,
        this.color
      );
    } else if (this.stroke) {
      Painter.shapes.strokeRoundRect(
        x,
        y,
        this.width,
        this.height,
        this.radii,
        this.stroke,
        this.lineWidth
      );
    }
  }
  /**
   * Returns the bounding box for the rounded rectangle
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}
class PatternRectangle extends Shape {
  /**
   * @param {CanvasImageSource|null} image - Optional pattern source
   * @param {string} [repetition='repeat'] - Pattern repetition mode
   * @param {Object} [options] - Shape rendering options
   */
  constructor(image = null, repetition = "repeat", options = {}) {
    super(options);
    this.image = image;
    this.repetition = repetition;
    this.pattern = null;
    if (image) this._tryCreatePattern(image);
  }
  _tryCreatePattern(image) {
    const isAsyncImage = image instanceof HTMLImageElement || typeof image.complete === "boolean";
    if (isAsyncImage) {
      if (image.complete) {
        this._createPattern();
      } else {
        image.addEventListener("load", () => this._createPattern(), {
          once: true
        });
      }
    } else {
      this._createPattern();
    }
  }
  _createPattern() {
    this.pattern = Painter.img.createPattern(this.image, this.repetition);
  }
  setImage(image, repetition) {
    this.image = image;
    if (repetition) this.repetition = repetition;
    this.pattern = null;
    this._tryCreatePattern(image);
  }
  draw() {
    super.draw();
    if (!this.pattern && this.image) {
      this._tryCreatePattern(this.image);
    }
    const x = -this.width / 2;
    const y = -this.height / 2;
    if (this.pattern) {
      Painter.img.fillPattern(
        this.pattern,
        x,
        y,
        this.width,
        this.height
      );
    } else if (this.strokeColor) {
      Painter.shapes.outlineRect(
        x,
        y,
        this.width,
        this.height,
        this.strokeColor,
        this.lineWidth
      );
    }
  }
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
}
class Square extends Rectangle {
  /**
   * @param {number} size - Side length of the square
   * @param {Object} [options] - Shape rendering options
   */
  constructor(size, options = {}) {
    super(options);
    this.width = size;
    this.height = size;
  }
}
class Cube extends Shape {
  /**
   * Create a cube
   * @param {number} x - X position (center of the cube)
   * @param {number} y - Y position (center of the cube)
   * @param {number} size - Size of the cube (edge length)
   * @param {object} options - Customization options
   * @param {string} [options.faceTopColor] - Color of the top face
   * @param {string} [options.faceBottomColor] - Color of the bottom face
   * @param {string} [options.faceLeftColor] - Color of the left face
   * @param {string} [options.faceRightColor] - Color of the right face
   * @param {string} [options.faceFrontColor] - Color of the front face
   * @param {string} [options.faceBackColor] - Color of the back face
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.strokeColor] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(size = 50, options = {}) {
    super(options);
    this.size = size;
    this.faceTopColor = options.faceTopColor || "#eee";
    this.faceBottomColor = options.faceBottomColor || "#ccc";
    this.faceLeftColor = options.faceLeftColor || "#aaa";
    this.faceRightColor = options.faceRightColor || "#888";
    this.faceFrontColor = options.faceFrontColor || "#666";
    this.faceBackColor = options.faceBackColor || "#444";
    this.strokeColor = options.strokeColor || null;
    this.lineWidth = options.lineWidth || 1;
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;
    this.visibleFaces = options.visibleFaces || [
      "top",
      "left",
      "right",
      "front",
      "back",
      "bottom"
    ];
  }
  /**
   * Set rotation angles
   * @param {number} x - Rotation around X axis in radians
   * @param {number} y - Rotation around Y axis in radians
   * @param {number} z - Rotation around Z axis in radians
   */
  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this;
  }
  /**
   * Rotate the cube incrementally
   * @param {number} x - Increment for X rotation in radians
   * @param {number} y - Increment for Y rotation in radians
   * @param {number} z - Increment for Z rotation in radians
   */
  rotate(x, y, z) {
    this.rotationX += x;
    this.rotationY += y;
    this.rotationZ += z;
    return this;
  }
  /**
   * Internal draw logic
   */
  draw() {
    super.draw();
    const s = this.size;
    const hs = s / 2;
    const rotate3D = (x, y, z) => {
      let y1 = y;
      let z1 = z;
      y = y1 * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
      z = y1 * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);
      let x1 = x;
      z1 = z;
      x = x1 * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
      z = -x1 * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
      x1 = x;
      y1 = y;
      x = x1 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
      y = x1 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);
      return { x, y, z };
    };
    const iso = (x, y, z) => {
      const rotated = rotate3D(x, y, z);
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return { x: isoX, y: isoY };
    };
    const p = {
      p0: iso(-hs, -hs, -hs),
      // bottom front left
      p1: iso(hs, -hs, -hs),
      // bottom front right
      p2: iso(hs, hs, -hs),
      // bottom back right
      p3: iso(-hs, hs, -hs),
      // bottom back left
      p4: iso(-hs, -hs, hs),
      // top front left
      p5: iso(hs, -hs, hs),
      // top front right
      p6: iso(hs, hs, hs),
      // top back right
      p7: iso(-hs, hs, hs)
      // top back left
    };
    const faces = {
      top: {
        points: [p.p4, p.p5, p.p6, p.p7],
        color: this.faceTopColor,
        normal: [0, 0, 1]
      },
      bottom: {
        points: [p.p0, p.p1, p.p2, p.p3],
        color: this.faceBottomColor,
        normal: [0, 0, -1]
      },
      left: {
        points: [p.p0, p.p4, p.p7, p.p3],
        color: this.faceLeftColor,
        normal: [-1, 0, 0]
      },
      right: {
        points: [p.p1, p.p5, p.p6, p.p2],
        color: this.faceRightColor,
        normal: [1, 0, 0]
      },
      front: {
        points: [p.p0, p.p1, p.p5, p.p4],
        color: this.faceFrontColor,
        normal: [0, -1, 0]
      },
      back: {
        points: [p.p3, p.p2, p.p6, p.p7],
        color: this.faceBackColor,
        normal: [0, 1, 0]
      }
    };
    const visibleFacesWithDepth = this.visibleFaces.map((key) => {
      const face = faces[key];
      if (!face) return null;
      const center = face.points.reduce(
        (acc, pt) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
        { x: 0, y: 0 }
      );
      center.x /= face.points.length;
      center.y /= face.points.length;
      const depth = center.x * center.x + center.y * center.y;
      return { key, face, depth };
    }).filter((item) => item !== null).sort((a, b) => b.depth - a.depth);
    visibleFacesWithDepth.forEach(({ key, face }) => {
      if (face == null ? void 0 : face.color) {
        Painter.shapes.polygon(
          face.points,
          face.color,
          this.strokeColor,
          this.lineWidth
        );
      }
    });
  }
  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    const projectionFactor = 1.5;
    const adjustedSize = this.size * projectionFactor;
    return {
      x: this.x - adjustedSize / 2,
      y: this.y - adjustedSize / 2,
      width: adjustedSize,
      height: adjustedSize
    };
  }
}
class Cone extends Shape {
  /**
   * Create a cone
   * @param {number} radius - Radius of the cone base
   * @param {number} height - Height of the cone
   * @param {object} options - Customization options
   * @param {string} [options.bottomColor] - Color of the bottom face
   * @param {string} [options.sideColor] - Color of the side face(s)
   * @param {number} [options.segments] - Number of segments to approximate the curved surface
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.stroke] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(radius = 50, height = 100, options = {}) {
    super(options);
    this.radius = radius;
    this.height = height || options.height || 100;
    this.segments = options.segments || 24;
    this.bottomColor = options.bottomColor || "#eee";
    this.sideColor = options.sideColor || "#aaa";
    this.stroke = options.stroke || null;
    this.lineWidth = options.lineWidth || 1;
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;
    this.visibleFaces = options.visibleFaces || ["bottom", "side"];
  }
  /**
   * Set rotation angles
   * @param {number} x - Rotation around X axis in radians
   * @param {number} y - Rotation around Y axis in radians
   * @param {number} z - Rotation around Z axis in radians
   */
  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this;
  }
  /**
   * Rotate the cone incrementally
   * @param {number} x - Increment for X rotation in radians
   * @param {number} y - Increment for Y rotation in radians
   * @param {number} z - Increment for Z rotation in radians
   */
  rotate(x, y, z) {
    this.rotationX += x;
    this.rotationY += y;
    this.rotationZ += z;
    return this;
  }
  /**
   * Internal draw logic
   */
  draw() {
    super.draw();
    const r = this.radius;
    const h = this.height;
    const hh = h / 2;
    const rotate3D = (x, y, z) => {
      let y1 = y;
      let z1 = z;
      y = y1 * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
      z = y1 * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);
      let x1 = x;
      z1 = z;
      x = x1 * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
      z = -x1 * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
      x1 = x;
      y1 = y;
      x = x1 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
      y = x1 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);
      return { x, y, z };
    };
    const iso = (x, y, z) => {
      const rotated = rotate3D(x, y, z);
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return { x: isoX, y: isoY, z: rotated.z };
    };
    const apex = iso(0, 0, hh);
    const basePoints = [];
    const angleStep = Math.PI * 2 / this.segments;
    for (let i = 0; i < this.segments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      basePoints.push(iso(x, y, -hh));
    }
    const sideFaces = [];
    for (let i = 0; i < this.segments; i++) {
      const nextIdx = (i + 1) % this.segments;
      sideFaces.push({
        points: [apex, basePoints[i], basePoints[nextIdx]],
        // Calculate depth as average Z-value of the three points
        z: (apex.z + basePoints[i].z + basePoints[nextIdx].z) / 3
      });
    }
    const facesWithDepth = [];
    if (this.visibleFaces.includes("bottom")) {
      facesWithDepth.push({
        type: "bottom",
        points: [...basePoints].reverse(),
        // Reverse for correct winding
        z: -hh
        // Z-value of the base
      });
    }
    if (this.visibleFaces.includes("side")) {
      facesWithDepth.push(
        ...sideFaces.map((face) => ({
          type: "side",
          points: face.points,
          z: face.z
        }))
      );
    }
    facesWithDepth.sort((a, b) => b.z - a.z);
    for (const face of facesWithDepth) {
      const color = face.type === "bottom" ? this.bottomColor : this.sideColor;
      Painter.shapes.polygon(face.points, color, this.stroke, this.lineWidth);
    }
  }
  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    const projectionFactor = 1.5;
    const maxDimension = Math.max(this.radius * 2, this.height);
    const adjustedSize = maxDimension * projectionFactor;
    return {
      x: this.x - adjustedSize / 2,
      y: this.y - adjustedSize / 2,
      width: adjustedSize,
      height: adjustedSize
    };
  }
}
class Prism extends Shape {
  /**
   * Create a triangular prism
   * @param {number} x - X position (center of the prism)
   * @param {number} y - Y position (center of the prism)
   * @param {number} width - Width of the prism
   * @param {number} height - Height of the triangular face
   * @param {number} depth - Depth/length of the prism
   * @param {object} options - Customization options
   * @param {string} [options.faceTopColor] - Color of the top face
   * @param {string} [options.faceBottomColor] - Color of the bottom face
   * @param {string} [options.faceLeftColor] - Color of the left face
   * @param {string} [options.faceRightColor] - Color of the right face
   * @param {string} [options.faceFrontColor] - Color of the front face
   * @param {string} [options.faceBackColor] - Color of the back face
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.stroke] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(depth = 100, options = {}) {
    super(options);
    this.depth = depth;
    this.faceTopColor = options.faceTopColor || "#eee";
    this.faceBottomColor = options.faceBottomColor || "#ccc";
    this.faceLeftColor = options.faceLeftColor || "#aaa";
    this.faceRightColor = options.faceRightColor || "#888";
    this.faceFrontColor = options.faceFrontColor || "#666";
    this.faceBackColor = options.faceBackColor || "#444";
    this.stroke = options.stroke || null;
    this.lineWidth = options.lineWidth || 1;
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;
    this.visibleFaces = options.visibleFaces || [
      "top",
      "left",
      "right",
      "front",
      "back",
      "bottom"
    ];
  }
  /**
   * Set rotation angles
   * @param {number} x - Rotation around X axis in radians
   * @param {number} y - Rotation around Y axis in radians
   * @param {number} z - Rotation around Z axis in radians
   */
  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this;
  }
  /**
   * Rotate the prism incrementally
   * @param {number} x - Increment for X rotation in radians
   * @param {number} y - Increment for Y rotation in radians
   * @param {number} z - Increment for Z rotation in radians
   */
  rotate(x, y, z) {
    this.rotationX += x;
    this.rotationY += y;
    this.rotationZ += z;
    return this;
  }
  /**
   * Internal draw logic
   */
  draw() {
    super.draw();
    const w = this.width / 2;
    const h = this.height / 2;
    const d = this.depth / 2;
    const rotate3D = (x, y, z) => {
      let y1 = y;
      let z1 = z;
      y = y1 * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
      z = y1 * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);
      let x1 = x;
      z1 = z;
      x = x1 * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
      z = -x1 * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
      x1 = x;
      y1 = y;
      x = x1 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
      y = x1 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);
      return { x, y, z };
    };
    const iso = (x, y, z) => {
      const rotated = rotate3D(x, y, z);
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return { x: isoX, y: isoY, z: rotated.z };
    };
    const p = {
      // Front triangular face
      p0: iso(-w, -d, -h),
      // Front bottom left
      p1: iso(w, -d, -h),
      // Front bottom right
      p2: iso(0, -d, h),
      // Front top center
      // Back triangular face
      p3: iso(-w, d, -h),
      // Back bottom left
      p4: iso(w, d, -h),
      // Back bottom right
      p5: iso(0, d, h)
      // Back top center
    };
    const faces = {
      // Triangular front and back faces
      front: { points: [p.p0, p.p1, p.p2], color: this.faceFrontColor },
      back: { points: [p.p3, p.p4, p.p5], color: this.faceBackColor },
      // Rectangular side faces
      bottom: { points: [p.p0, p.p1, p.p4, p.p3], color: this.faceBottomColor },
      right: { points: [p.p1, p.p2, p.p5, p.p4], color: this.faceRightColor },
      left: { points: [p.p0, p.p2, p.p5, p.p3], color: this.faceLeftColor }
    };
    const visibleFacesWithDepth = this.visibleFaces.filter((key) => faces[key]).map((key) => {
      const face = faces[key];
      const centerX = face.points.reduce((sum, pt) => sum + pt.x, 0) / face.points.length;
      const centerY = face.points.reduce((sum, pt) => sum + pt.y, 0) / face.points.length;
      const centerZ = face.points.reduce((sum, pt) => sum + (pt.z || 0), 0) / face.points.length;
      const depth = centerX * centerX + centerY * centerY + centerZ * centerZ;
      return { key, face, depth };
    }).sort((a, b) => b.depth - a.depth);
    visibleFacesWithDepth.forEach(({ key, face }) => {
      if (face == null ? void 0 : face.color) {
        Painter.shapes.polygon(
          face.points,
          face.color,
          this.stroke,
          this.lineWidth
        );
      }
    });
  }
  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    const projectionFactor = 1.5;
    const maxDimension = Math.max(this.width, this.height, this.depth);
    const adjustedSize = maxDimension * projectionFactor;
    return {
      x: this.x - adjustedSize / 2,
      y: this.y - adjustedSize / 2,
      width: adjustedSize,
      height: adjustedSize
    };
  }
}
class Cylinder extends Shape {
  /**
   * Create a cylinder
   * @param {number} radius - Radius of the cylinder
   * @param {number} height - Height of the cylinder
   * @param {object} options - Customization options
   * @param {string} [options.topColor] - Color of the top face
   * @param {string} [options.bottomColor] - Color of the bottom face
   * @param {string} [options.sideColor] - Color of the side face
   * @param {number} [options.segments] - Number of segments to approximate the curved surface
   * @param {Array<string>} [options.visibleFaces] - Array of face keys to render
   * @param {string} [options.stroke] - Optional stroke around each face
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(radius = 40, options = {}) {
    super(options);
    this.radius = radius;
    this.height = options.height || 80;
    this.segments = options.segments || 24;
    this.topColor = options.topColor || "#FF00FF";
    this.bottomColor = options.bottomColor || "#FF0FFF";
    this.sideColor = options.sideColor || "#00FF00";
    this.stroke = options.stroke || "#000000";
    this.lineWidth = options.lineWidth || 1;
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;
    this.visibleFaces = options.visibleFaces || ["top", "bottom", "side"];
  }
  /**
   * Set rotation angles
   * @param {number} x - Rotation around X axis in radians
   * @param {number} y - Rotation around Y axis in radians
   * @param {number} z - Rotation around Z axis in radians
   */
  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this;
  }
  /**
   * Rotate the cylinder incrementally
   * @param {number} x - Increment for X rotation in radians
   * @param {number} y - Increment for Y rotation in radians
   * @param {number} z - Increment for Z rotation in radians
   */
  rotate(x, y, z) {
    this.rotationX += x;
    this.rotationY += y;
    this.rotationZ += z;
    return this;
  }
  /**
   * Internal draw logic
   */
  draw() {
    super.draw();
    const r = this.radius;
    const h = this.height / 2;
    const rotate3D = (x, y, z) => {
      let y1 = y;
      let z1 = z;
      y = y1 * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
      z = y1 * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);
      let x1 = x;
      z1 = z;
      x = x1 * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
      z = -x1 * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
      x1 = x;
      y1 = y;
      x = x1 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
      y = x1 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);
      return { x, y, z };
    };
    const iso = (x, y, z) => {
      const rotated = rotate3D(x, y, z);
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return { x: isoX, y: isoY, z: rotated.z };
    };
    const topPoints = [];
    const bottomPoints = [];
    const angleStep = Math.PI * 2 / this.segments;
    for (let i = 0; i < this.segments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      topPoints.push(iso(x, y, h));
      bottomPoints.push(iso(x, y, -h));
    }
    const sideFaces = [];
    for (let i = 0; i < this.segments; i++) {
      const nextIdx = (i + 1) % this.segments;
      sideFaces.push({
        points: [
          bottomPoints[i],
          bottomPoints[nextIdx],
          topPoints[nextIdx],
          topPoints[i]
        ],
        // Each segment gets its own depth for proper sorting
        z: (topPoints[i].z + topPoints[nextIdx].z + bottomPoints[i].z + bottomPoints[nextIdx].z) / 4
      });
    }
    const facesWithDepth = [];
    if (this.visibleFaces.includes("top")) {
      facesWithDepth.push({
        type: "top",
        points: topPoints,
        z: h
        // Average Z of top face
      });
    }
    if (this.visibleFaces.includes("bottom")) {
      facesWithDepth.push({
        type: "bottom",
        points: [...bottomPoints].reverse(),
        // Reverse for correct winding
        z: -h
        // Average Z of bottom face
      });
    }
    if (this.visibleFaces.includes("side")) {
      facesWithDepth.push(
        ...sideFaces.map((face) => ({
          type: "side",
          points: face.points,
          z: face.z
        }))
      );
    }
    facesWithDepth.sort((a, b) => b.z - a.z);
    for (const face of facesWithDepth) {
      let color;
      switch (face.type) {
        case "top":
          color = this.topColor;
          break;
        case "bottom":
          color = this.bottomColor;
          break;
        case "side":
          color = this.sideColor;
          break;
      }
      Painter.shapes.polygon(
        face.points,
        color,
        this.stroke,
        this.lineWidth
      );
    }
  }
  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    const projectionFactor = 1.5;
    const maxDimension = Math.max(this.radius * 2, this.height);
    const adjustedSize = maxDimension * projectionFactor;
    return {
      x: this.x - adjustedSize / 2,
      y: this.y - adjustedSize / 2,
      width: adjustedSize,
      height: adjustedSize
    };
  }
}
class Diamond extends Shape {
  /**
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {number} width - Total width of the diamond
   * @param {number} height - Total height of the diamond
   * @param {Object} [options] - Shape rendering options
   */
  constructor(options = {}) {
    super(options);
  }
  /**
   * Renders the diamond using four corner points.
   */
  draw() {
    super.draw();
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const points = [
      { x: 0, y: -halfH },
      // Top
      { x: halfW, y: 0 },
      // Right
      { x: 0, y: halfH },
      // Bottom
      { x: -halfW, y: 0 }
      // Left
    ];
    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}
class Line extends Shape {
  /**
   * Creates a line shape centered around (x, y)
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} length - Length of the line
   * @param {Object} options - Style options
   */
  constructor(length = 40, options = {}) {
    super(options);
    this.length = length;
  }
  draw() {
    super.draw();
    const half = this.length / 2;
    Painter.lines.line(
      -half,
      -half,
      half,
      half,
      this.stroke,
      this.lineWidth
    );
  }
}
class Triangle extends Shape {
  constructor(size = 50, options = {}) {
    super(options);
    this.size = size;
  }
  draw() {
    super.draw();
    const half = this.size / 2;
    const points = [
      { x: 0, y: -half },
      { x: half, y: half },
      { x: -half, y: half }
    ];
    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}
class Star extends Shape {
  constructor(radius = 40, spikes = 5, inset = 0.5, options = {}) {
    super(options);
    this.radius = radius;
    this.spikes = spikes;
    this.inset = inset;
  }
  draw() {
    super.draw();
    const step = Math.PI / this.spikes;
    const rotationOffset = -Math.PI / 2;
    Painter.lines.beginPath();
    for (let i = 0; i < this.spikes * 2; i++) {
      const isOuter = i % 2 === 0;
      const r = isOuter ? this.radius : this.radius * this.inset;
      const angle = i * step + rotationOffset;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        Painter.lines.moveTo(x, y);
      } else {
        Painter.lines.lineTo(x, y);
      }
    }
    Painter.lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
  /* draw() {
    // First apply transforms as usual
    super.draw();
    
    // Get the current transform matrix to preserve positioning
    const transform = Painter.ctx.getTransform();
    
    // Create a temporary off-screen canvas sized to fit the star
    const tempCanvas = document.createElement('canvas');
    const padding = Math.ceil(this.radius * 0.1) + 2; // Small padding
    tempCanvas.width = this.radius * 2 + padding * 2;
    tempCanvas.height = this.radius * 2 + padding * 2;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Center the drawing in the temp canvas
    tempCtx.translate(tempCanvas.width/2, tempCanvas.height/2);
    
    // Draw the star with clean state
    tempCtx.beginPath();
    const step = Math.PI / this.spikes;
    const rotationOffset = -Math.PI / 2;
    
    for (let i = 0; i < this.spikes * 2; i++) {
      const isOuter = i % 2 === 0;
      const r = isOuter ? this.radius : this.radius * this.inset;
      const angle = i * step + rotationOffset;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      if (i === 0) {
        tempCtx.moveTo(x, y);
      } else {
        tempCtx.lineTo(x, y);
      }
    }
    
    tempCtx.closePath();
    
    // Fill with explicit color
    tempCtx.fillStyle = this.color || 'white';
    tempCtx.fill();
    
    // Stroke if needed
    if (this.stroke) {
      tempCtx.strokeStyle = this.stroke;
      tempCtx.lineWidth = this.lineWidth;
      tempCtx.stroke();
    }
    
    // Now draw this to the main canvas at the correct position
    Painter.ctx.drawImage(
      tempCanvas, 
      -tempCanvas.width/2, 
      -tempCanvas.height/2
    );
  } */
}
class Sphere extends Shape {
  /**
   * Create a sphere
   * @param {number} x - X position (center of the sphere)
   * @param {number} y - Y position (center of the sphere)
   * @param {number} radius - Radius of the sphere
   * @param {object} options - Customization options
   * @param {string} [options.color] - Main color of the sphere
   * @param {string} [options.highlightColor] - Optional highlight color for lighting effect
   * @param {number} [options.hSegments] - Number of horizontal segments
   * @param {number} [options.vSegments] - Number of vertical segments
   * @param {boolean} [options.wireframe] - Whether to render as wireframe
   * @param {string} [options.stroke] - Color of wireframe or outline
   * @param {number} [options.lineWidth] - Stroke width
   * @param {number} [options.rotationX] - Rotation around X axis in radians
   * @param {number} [options.rotationY] - Rotation around Y axis in radians
   * @param {number} [options.rotationZ] - Rotation around Z axis in radians
   */
  constructor(radius = 50, options = {}) {
    super(options);
    this.radius = radius;
    this.hSegments = options.hSegments || 16;
    this.vSegments = options.vSegments || 12;
    this.color = options.color || "#6495ED";
    this.highlightColor = options.highlightColor || "#FFFFFF";
    this.wireframe = options.wireframe || false;
    this.stroke = options.stroke || "#333333";
    this.lineWidth = options.lineWidth || 1;
    this.rotationX = options.rotationX || 0;
    this.rotationY = options.rotationY || 0;
    this.rotationZ = options.rotationZ || 0;
  }
  /**
   * Set rotation angles
   * @param {number} x - Rotation around X axis in radians
   * @param {number} y - Rotation around Y axis in radians
   * @param {number} z - Rotation around Z axis in radians
   */
  setRotation(x, y, z) {
    this.rotationX = x;
    this.rotationY = y;
    this.rotationZ = z;
    return this;
  }
  /**
   * Rotate the sphere incrementally
   * @param {number} x - Increment for X rotation in radians
   * @param {number} y - Increment for Y rotation in radians
   * @param {number} z - Increment for Z rotation in radians
   */
  rotate(x, y, z) {
    this.rotationX += x;
    this.rotationY += y;
    this.rotationZ += z;
    return this;
  }
  /**
   * Calculate color based on surface normal direction for lighting effect
   * @param {number} x - Normal x component
   * @param {number} y - Normal y component
   * @param {number} z - Normal z component
   * @returns {string} - Color in hex or rgba format
   */
  calculateSurfaceColor(x, y, z) {
    const lightDir = {
      x: 1 / Math.sqrt(3),
      y: 1 / Math.sqrt(3),
      z: 1 / Math.sqrt(3)
    };
    let intensity = x * lightDir.x + y * lightDir.y + z * lightDir.z;
    intensity = Math.max(0.3, intensity);
    if (this.highlightColor) {
      const baseColor2 = this.hexToRgb(this.color);
      const highlightColor = this.hexToRgb(this.highlightColor);
      const r2 = Math.round(
        baseColor2.r * (1 - intensity) + highlightColor.r * intensity
      );
      const g2 = Math.round(
        baseColor2.g * (1 - intensity) + highlightColor.g * intensity
      );
      const b2 = Math.round(
        baseColor2.b * (1 - intensity) + highlightColor.b * intensity
      );
      return `rgb(${r2}, ${g2}, ${b2})`;
    }
    const baseColor = this.hexToRgb(this.color);
    const r = Math.min(255, Math.round(baseColor.r * intensity));
    const g = Math.min(255, Math.round(baseColor.g * intensity));
    const b = Math.min(255, Math.round(baseColor.b * intensity));
    return `rgb(${r}, ${g}, ${b})`;
  }
  /**
   * Helper to convert hex color to RGB
   * @param {string} hex - Color in hex format
   * @returns {object} - RGB components
   */
  hexToRgb(hex) {
    const defaultColor = { r: 100, g: 100, b: 255 };
    if (!hex || typeof hex !== "string") return defaultColor;
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(
      shorthandRegex,
      (m, r, g, b) => r + r + g + g + b + b
    );
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : defaultColor;
  }
  /**
   * Internal draw logic
   */
  draw() {
    super.draw();
    const r = this.radius;
    const rotate3D = (x, y, z) => {
      let y1 = y;
      let z1 = z;
      y = y1 * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX);
      z = y1 * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX);
      let x1 = x;
      z1 = z;
      x = x1 * Math.cos(this.rotationY) + z1 * Math.sin(this.rotationY);
      z = -x1 * Math.sin(this.rotationY) + z1 * Math.cos(this.rotationY);
      x1 = x;
      y1 = y;
      x = x1 * Math.cos(this.rotationZ) - y1 * Math.sin(this.rotationZ);
      y = x1 * Math.sin(this.rotationZ) + y1 * Math.cos(this.rotationZ);
      return { x, y, z };
    };
    const iso = (x, y, z) => {
      const rotated = rotate3D(x, y, z);
      const isoX = (rotated.x - rotated.y) * Math.cos(Math.PI / 6);
      const isoY = (rotated.x + rotated.y) * Math.sin(Math.PI / 6) - rotated.z;
      return {
        x: isoX,
        y: isoY,
        z: rotated.z,
        nx: rotated.x / r,
        // Normalized x for normal vector
        ny: rotated.y / r,
        // Normalized y for normal vector
        nz: rotated.z / r
        // Normalized z for normal vector
      };
    };
    const spherePoints = [];
    for (let vi = 0; vi <= this.vSegments; vi++) {
      const row = [];
      const v = vi / this.vSegments;
      const phi = Math.PI * v - Math.PI / 2;
      for (let hi = 0; hi <= this.hSegments; hi++) {
        const u = hi / this.hSegments;
        const theta = 2 * Math.PI * u;
        const x = r * Math.cos(phi) * Math.cos(theta);
        const y = r * Math.cos(phi) * Math.sin(theta);
        const z = r * Math.sin(phi);
        row.push(iso(x, y, z));
      }
      spherePoints.push(row);
    }
    const faces = [];
    for (let vi = 0; vi < this.vSegments; vi++) {
      for (let hi = 0; hi < this.hSegments; hi++) {
        const p00 = spherePoints[vi][hi];
        const p10 = spherePoints[vi][hi + 1];
        const p01 = spherePoints[vi + 1][hi];
        const p11 = spherePoints[vi + 1][hi + 1];
        const avgZ = (p00.z + p10.z + p01.z + p11.z) / 4;
        const avgNx = (p00.nx + p10.nx + p01.nx + p11.nx) / 4;
        const avgNy = (p00.ny + p10.ny + p01.ny + p11.ny) / 4;
        const avgNz = (p00.nz + p10.nz + p01.nz + p11.nz) / 4;
        faces.push({
          points: [p00, p10, p11, p01],
          z: avgZ,
          color: this.calculateSurfaceColor(avgNx, avgNy, avgNz)
        });
      }
    }
    faces.sort((a, b) => b.z - a.z);
    if (this.wireframe) {
      for (const face of faces) {
        const pts = face.points;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          Painter.lines.line(
            pts[i].x,
            pts[i].y,
            pts[j].x,
            pts[j].y,
            this.stroke,
            this.lineWidth
          );
        }
      }
    }
    for (const face of faces) {
      Painter.shapes.polygon(
        face.points,
        face.color,
        this.stroke,
        this.lineWidth
      );
    }
  }
  /**
   * Compute bounding box for interactivity and layout
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    const projectionFactor = 1.5;
    const diameter = this.radius * 2 * projectionFactor;
    return {
      x: this.x - diameter / 2,
      y: this.y - diameter / 2,
      width: diameter,
      height: diameter
    };
  }
}
class SVGShape extends Shape {
  /**
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {string} svgPathData - SVG path data string (e.g. "M0,0 L10,10...")
   * @param {object} options - Standard shape options plus SVG-specific options
   * @param {number} [options.scale=1] - Scale factor for the SVG
   * @param {boolean} [options.centerPath=true] - Automatically center the path
   * @param {number} [options.animationProgress=1] - Animation progress (0-1)
   */
  constructor(svgPathData, options = {}) {
    console.log("SVGShape", options.x);
    super(options);
    this.scale = options.scale || 1;
    this.centerPath = options.centerPath !== void 0 ? options.centerPath : true;
    this.animationProgress = options.animationProgress !== void 0 ? options.animationProgress : 1;
    this.svgPathData = svgPathData;
    this.pathCommands = this.parseSVGPath(svgPathData);
    if (this.centerPath) {
      this.pathCommands = this.centerAndScalePath(
        this.pathCommands,
        this.scale
      );
    } else {
      this.pathCommands = this.scalePath(this.pathCommands, this.scale);
    }
    this.prevX = 0;
    this.prevY = 0;
    this.currentPoint = { x: 0, y: 0 };
  }
  /**
   * Parse an SVG path string into a command array for rendering
   * @param {string} svgPath - SVG path data string
   * @returns {Array} Array of path commands
   */
  parseSVGPath(svgPath) {
    const moveRegex = /M\s*([-\d.]+)[,\s]*([-\d.]+)/g;
    const lineRegex = /L\s*([-\d.]+)[,\s]*([-\d.]+)/g;
    const curveRegex = /C\s*([-\d.]+)[,\s]*([-\d.]+)\s*([-\d.]+)[,\s]*([-\d.]+)\s*([-\d.]+)[,\s]*([-\d.]+)/g;
    const zRegex = /Z/g;
    const commands = [];
    let match;
    while ((match = moveRegex.exec(svgPath)) !== null) {
      commands.push(["M", parseFloat(match[1]), parseFloat(match[2])]);
    }
    while ((match = lineRegex.exec(svgPath)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      let prevX = 0;
      let prevY = 0;
      for (let i = commands.length - 1; i >= 0; i--) {
        const cmd = commands[i];
        if (cmd[0] === "M") {
          prevX = cmd[1];
          prevY = cmd[2];
          break;
        } else if (cmd[0] === "C") {
          prevX = cmd[5];
          prevY = cmd[6];
          break;
        }
      }
      const cp1x = prevX + (x - prevX) / 3;
      const cp1y = prevY + (y - prevY) / 3;
      const cp2x = prevX + 2 * (x - prevX) / 3;
      const cp2y = prevY + 2 * (y - prevY) / 3;
      commands.push(["C", cp1x, cp1y, cp2x, cp2y, x, y]);
    }
    while ((match = curveRegex.exec(svgPath)) !== null) {
      commands.push([
        "C",
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
        parseFloat(match[4]),
        parseFloat(match[5]),
        parseFloat(match[6])
      ]);
    }
    if (zRegex.test(svgPath)) {
      commands.push(["Z"]);
    }
    return commands;
  }
  /**
   * Center and scale the path commands
   * @param {Array} path - Array of path commands
   * @param {number} scale - Scale factor
   * @returns {Array} Centered and scaled path commands
   */
  centerAndScalePath(path, scale) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const cmd of path) {
      if (cmd[0] === "M") {
        minX = Math.min(minX, cmd[1]);
        minY = Math.min(minY, cmd[2]);
        maxX = Math.max(maxX, cmd[1]);
        maxY = Math.max(maxY, cmd[2]);
      } else if (cmd[0] === "C") {
        minX = Math.min(minX, cmd[1], cmd[3], cmd[5]);
        minY = Math.min(minY, cmd[2], cmd[4], cmd[6]);
        maxX = Math.max(maxX, cmd[1], cmd[3], cmd[5]);
        maxY = Math.max(maxY, cmd[2], cmd[4], cmd[6]);
      }
    }
    const pathCenterX = (minX + maxX) / 2;
    const pathCenterY = (minY + maxY) / 2;
    this.originalWidth = (maxX - minX) * scale;
    this.originalHeight = (maxY - minY) * scale;
    return path.map((cmd) => {
      if (cmd[0] === "M") {
        return [
          "M",
          (cmd[1] - pathCenterX) * scale,
          (cmd[2] - pathCenterY) * scale
        ];
      } else if (cmd[0] === "C") {
        return [
          "C",
          (cmd[1] - pathCenterX) * scale,
          (cmd[2] - pathCenterY) * scale,
          (cmd[3] - pathCenterX) * scale,
          (cmd[4] - pathCenterY) * scale,
          (cmd[5] - pathCenterX) * scale,
          (cmd[6] - pathCenterY) * scale
        ];
      } else {
        return [...cmd];
      }
    });
  }
  /**
   * Scale the path commands without centering
   * @param {Array} path - Array of path commands
   * @param {number} scale - Scale factor
   * @returns {Array} Scaled path commands
   */
  scalePath(path, scale) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const cmd of path) {
      if (cmd[0] === "M") {
        minX = Math.min(minX, cmd[1]);
        minY = Math.min(minY, cmd[2]);
        maxX = Math.max(maxX, cmd[1]);
        maxY = Math.max(maxY, cmd[2]);
      } else if (cmd[0] === "C") {
        minX = Math.min(minX, cmd[1], cmd[3], cmd[5]);
        minY = Math.min(minY, cmd[2], cmd[4], cmd[6]);
        maxX = Math.max(maxX, cmd[1], cmd[3], cmd[5]);
        maxY = Math.max(maxY, cmd[2], cmd[4], cmd[6]);
      }
    }
    this.originalWidth = (maxX - minX) * scale;
    this.originalHeight = (maxY - minY) * scale;
    return path.map((cmd) => {
      if (cmd[0] === "M") {
        return ["M", cmd[1] * scale, cmd[2] * scale];
      } else if (cmd[0] === "C") {
        return [
          "C",
          cmd[1] * scale,
          cmd[2] * scale,
          cmd[3] * scale,
          cmd[4] * scale,
          cmd[5] * scale,
          cmd[6] * scale
        ];
      } else {
        return [...cmd];
      }
    });
  }
  /**
   * Calculate a point along a bezier curve at time t
   * @param {Array} segment - Path segment command
   * @param {number} t - Time parameter (0-1)
   * @returns {Object} Point coordinates {x, y}
   */
  getBezierPoint(segment, t) {
    if (segment[0] === "M") {
      return { x: segment[1], y: segment[2] };
    } else if (segment[0] === "C") {
      const startX = this.prevX;
      const startY = this.prevY;
      const cp1x = segment[1];
      const cp1y = segment[2];
      const cp2x = segment[3];
      const cp2y = segment[4];
      const endX = segment[5];
      const endY = segment[6];
      const x = Math.pow(1 - t, 3) * startX + 3 * Math.pow(1 - t, 2) * t * cp1x + 3 * (1 - t) * Math.pow(t, 2) * cp2x + Math.pow(t, 3) * endX;
      const y = Math.pow(1 - t, 3) * startY + 3 * Math.pow(1 - t, 2) * t * cp1y + 3 * (1 - t) * Math.pow(t, 2) * cp2y + Math.pow(t, 3) * endY;
      return { x, y };
    }
    return { x: 0, y: 0 };
  }
  /**
   * Get a subset of the path up to the current animation progress
   * @returns {Array} Array of path commands representing the partial path
   */
  getPartialPath() {
    const result = [];
    let totalSegments = this.pathCommands.length;
    let segmentIndex = Math.floor(this.animationProgress * totalSegments);
    let segmentProgress = this.animationProgress * totalSegments % 1;
    let hasPrevPoint = false;
    this.prevX = 0;
    this.prevY = 0;
    for (let i = 0; i < segmentIndex; i++) {
      const cmd = this.pathCommands[i];
      result.push([...cmd]);
      if (cmd[0] === "M") {
        this.prevX = cmd[1];
        this.prevY = cmd[2];
        hasPrevPoint = true;
      } else if (cmd[0] === "C") {
        this.prevX = cmd[5];
        this.prevY = cmd[6];
        hasPrevPoint = true;
      }
    }
    if (segmentIndex < totalSegments) {
      const currentSegment = this.pathCommands[segmentIndex];
      if (currentSegment[0] === "M") {
        result.push([...currentSegment]);
        this.prevX = currentSegment[1];
        this.prevY = currentSegment[2];
        this.currentPoint = { x: currentSegment[1], y: currentSegment[2] };
        hasPrevPoint = true;
      } else if (currentSegment[0] === "C") {
        if (!hasPrevPoint) {
          for (let i = segmentIndex - 1; i >= 0; i--) {
            if (this.pathCommands[i][0] === "M") {
              this.prevX = this.pathCommands[i][1];
              this.prevY = this.pathCommands[i][2];
              hasPrevPoint = true;
              break;
            }
          }
          if (!hasPrevPoint) {
            this.prevX = 0;
            this.prevY = 0;
          }
        }
        const point = this.getBezierPoint(currentSegment, segmentProgress);
        result.push([
          "C",
          currentSegment[1],
          currentSegment[2],
          currentSegment[3],
          currentSegment[4],
          point.x,
          point.y
        ]);
        this.currentPoint = point;
      }
    }
    return result;
  }
  /**
   * Draw the SVG path
   */
  draw() {
    super.draw();
    const pathToDraw = this.getPartialPath();
    Painter.lines.path(
      pathToDraw,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
  /**
   * Get the current position of the "pen" for animations
   * @returns {Object} Current point {x, y} in world coordinates
   */
  getCurrentPoint() {
    return {
      x: this.currentPoint.x,
      y: this.currentPoint.y
    };
  }
  /**
   * Set the animation progress
   * @param {number} progress - Animation progress (0-1)
   */
  setAnimationProgress(progress) {
    this.animationProgress = Math.max(0, Math.min(1, progress));
  }
  /**
   * Get bounds of the shape for hit detection and layout
   * @returns {Object} Bounds {x, y, width, height}
   */
  calculateBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.originalWidth || 100,
      height: this.originalHeight || 100
    };
  }
}
class StickFigure extends Shape {
  /**
   * @param {number} x - X position (center of figure)
   * @param {number} y - Y position (center of figure)
   * @param {number} scale - Scale multiplier for size
   * @param {object} options - Style options
   * @param {string} [options.stroke="#000"] - Line color
   * @param {string} [options.headColor] - Fill color of the head
   * @param {string} [options.jointColor] - Fill color of joint circles
   * @param {number} [options.lineWidth=2] - Line width
   * @param {boolean} [options.showJoints=true] - Whether to draw joints
   */
  constructor(scale = 1, options = {}) {
    super(options);
    this.scale = scale;
    this.stroke = options.stroke || "#000";
    this.headColor = options.headColor || this.stroke;
    this.jointColor = options.jointColor || this.stroke;
    this.lineWidth = options.lineWidth || 2;
    this.showJoints = options.showJoints !== false;
  }
  draw() {
    super.draw();
    const s = this.scale;
    const headR = 10 * s;
    const headCenterY = -30 * s;
    const neckY = headCenterY + headR;
    const torsoTop = neckY;
    const torsoBottom = torsoTop + 40 * s;
    const armY = torsoTop + 10 * s;
    const shoulderX = 15 * s;
    const hipX = 10 * s;
    const legY = torsoBottom + 40 * s;
    const jointR = 3 * s;
    Painter.shapes.fillCircle(0, headCenterY, headR, this.headColor);
    Painter.shapes.strokeCircle(
      0,
      headCenterY,
      headR,
      this.stroke,
      this.lineWidth
    );
    Painter.lines.line(
      0,
      torsoTop,
      0,
      torsoBottom,
      this.stroke,
      this.lineWidth
    );
    Painter.lines.line(
      -shoulderX,
      armY,
      shoulderX,
      armY,
      this.stroke,
      this.lineWidth
    );
    Painter.lines.line(
      0,
      torsoBottom,
      -hipX,
      legY,
      this.stroke,
      this.lineWidth
    );
    Painter.lines.line(
      0,
      torsoBottom,
      hipX,
      legY,
      this.stroke,
      this.lineWidth
    );
    if (this.showJoints) {
      const joints = [
        [0, torsoTop],
        [-shoulderX, armY],
        [shoulderX, armY],
        [0, torsoBottom],
        [-hipX, legY],
        [hipX, legY]
      ];
      joints.forEach(
        ([jx, jy]) => Painter.shapes.fillCircle(jx, jy, jointR, this.jointColor)
      );
    }
  }
  getBounds() {
    const h = 100 * this.scale;
    const w = 40 * this.scale;
    return {
      x: this.x,
      y: this.y,
      width: w,
      height: h
    };
  }
}
class Ring extends Shape {
  constructor(outerRadius, innerRadius, options = {}) {
    super(options);
    this.outerRadius = outerRadius;
    this.innerRadius = innerRadius;
  }
  draw() {
    super.draw();
    Painter.lines.beginPath();
    Painter.shapes.arc(0, 0, this.outerRadius, 0, Math.PI * 2);
    Painter.shapes.arc(0, 0, this.innerRadius, 0, Math.PI * 2, true);
    Painter.lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}
class Polygon extends Shape {
  constructor(sides = 6, radius = 40, options = {}) {
    super(options);
    this.sides = sides;
    this.radius = radius;
  }
  draw() {
    super.draw();
    const points = [];
    const step = 2 * Math.PI / this.sides;
    for (let i = 0; i < this.sides; i++) {
      const angle = i * step;
      points.push({
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      });
    }
    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}
class Arrow extends Shape {
  constructor(length, options = {}) {
    super(options);
    this.length = length;
  }
  draw() {
    super.draw();
    const halfW = this.width / 2;
    const headLength = this.length * 0.4;
    const shaftLength = this.length - headLength;
    Painter.lines.beginPath();
    Painter.lines.moveTo(-shaftLength / 2, -halfW);
    Painter.lines.lineTo(shaftLength / 2, -halfW);
    Painter.lines.lineTo(shaftLength / 2, -this.width);
    Painter.lines.lineTo(this.length / 2, 0);
    Painter.lines.lineTo(shaftLength / 2, this.width);
    Painter.lines.lineTo(shaftLength / 2, halfW);
    Painter.lines.lineTo(-shaftLength / 2, halfW);
    Painter.lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}
class Pin extends Shape {
  constructor(radius = 20, options = {}) {
    super(options);
    this.radius = radius;
  }
  draw() {
    super.draw();
    const r = this.radius;
    const h = r * 2.5;
    const baseY = 0;
    Painter.lines.beginPath();
    Painter.shapes.arc(0, baseY, r, Math.PI, 0);
    Painter.lines.lineTo(r, baseY);
    Painter.lines.lineTo(0, h);
    Painter.lines.lineTo(-r, baseY);
    Painter.lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
  getBounds() {
    return {
      x: this.x,
      y: this.y + this.radius * 0.98,
      // shift center lower
      width: this.radius * 2,
      height: this.radius * 2.5
    };
  }
}
class PieSlice extends Shape {
  constructor(radius, startAngle, endAngle, options = {}) {
    super(options);
    this.radius = radius;
    this.startAngle = startAngle;
    this.endAngle = endAngle;
  }
  draw() {
    super.draw();
    Painter.lines.beginPath();
    Painter.lines.moveTo(0, 0);
    Painter.shapes.arc(0, 0, this.radius, this.startAngle, this.endAngle);
    Painter.lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}
class Hexagon extends Shape {
  constructor(radius, options = {}) {
    super(options);
    this.radius = radius;
  }
  draw() {
    super.draw();
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = Math.PI / 3 * i;
      return {
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius
      };
    });
    Painter.shapes.polygon(
      points,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }
}
class Heart extends Shape {
  constructor(options = {}) {
    super(options);
  }
  draw() {
    super.draw();
    const w = this.width;
    const h = this.height;
    const topCurveHeight = h * 0.3;
    const lines = Painter.lines;
    lines.beginPath();
    lines.moveTo(0, topCurveHeight);
    lines.bezierCurveTo(0, 0, -w / 2, 0, -w / 2, topCurveHeight);
    lines.bezierCurveTo(-w / 2, h * 0.8, 0, h, 0, h);
    lines.bezierCurveTo(0, h, w / 2, h * 0.8, w / 2, topCurveHeight);
    lines.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveHeight);
    lines.closePath();
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
  getBounds() {
    return {
      x: this.x,
      y: this.y + this.height / 2,
      width: this.width,
      height: this.height
    };
  }
}
class Cross extends Shape {
  /**
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} size - Full size of the cross (width/height of bounding square)
   * @param {number} thickness - Width of the cross arms
   * @param {Object} [options] - Fill/stroke/transform options
   * @param {boolean} [options.diagonal=false] - Whether to draw a rotated X instead of a + shape
   */
  constructor(size, thickness, options = {}) {
    super(options);
    this.size = size;
    this.thickness = thickness;
    this.diagonal = options.diagonal || false;
  }
  draw() {
    super.draw();
    const s = this.size / 2;
    const t = this.thickness / 2;
    if (this.diagonal) {
      Painter.lines.beginPath();
      Painter.lines.moveTo(-s, -s + t);
      Painter.lines.lineTo(-s + t, -s);
      Painter.lines.lineTo(0, -t);
      Painter.lines.lineTo(s - t, -s);
      Painter.lines.lineTo(s, -s + t);
      Painter.lines.lineTo(t, 0);
      Painter.lines.lineTo(s, s - t);
      Painter.lines.lineTo(s - t, s);
      Painter.lines.lineTo(0, t);
      Painter.lines.lineTo(-s + t, s);
      Painter.lines.lineTo(-s, s - t);
      Painter.lines.lineTo(-t, 0);
      Painter.lines.closePath();
    } else {
      Painter.lines.beginPath();
      Painter.lines.moveTo(-t, -s);
      Painter.lines.lineTo(t, -s);
      Painter.lines.lineTo(t, -t);
      Painter.lines.lineTo(s, -t);
      Painter.lines.lineTo(s, t);
      Painter.lines.lineTo(t, t);
      Painter.lines.lineTo(t, s);
      Painter.lines.lineTo(-t, s);
      Painter.lines.lineTo(-t, t);
      Painter.lines.lineTo(-s, t);
      Painter.lines.lineTo(-s, -t);
      Painter.lines.lineTo(-t, -t);
      Painter.lines.closePath();
    }
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }
}
class TextShape extends Shape {
  /**
   * Create a text shape
   *
   * @param {string} text - The text content
   * @param {Object} [options={}] - Configuration options
   * @param {string} [options.font="12px monospace"] - CSS font string
   * @param {string} [options.color="#000"] - Text color
   * @param {string} [options.align="center"] - Text alignment (left, center, right)
   * @param {string} [options.baseline="middle"] - Text baseline (top, middle, bottom)
   */
  constructor(text, options = {}) {
    super(options);
    this._text = text;
    this._font = options.font || "12px monospace";
    this._color = options.color || "yellow";
    this._align = options.align || "center";
    this._baseline = options.baseline || "middle";
    this._calculateBounds();
    this._calculateAlignmentOffsets();
  }
  /**
   * Draw the text using Painter
   */
  draw() {
    super.draw();
    this.logger.log("draw", this.font, this.color, this.opacity);
    Painter.text.setFont(this.font);
    Painter.text.setTextAlign(this.align);
    Painter.text.setTextBaseline(this.baseline);
    Painter.text.fillText(this.text, 0, 0, this.color);
  }
  _calculateAlignmentOffsets() {
    if (!Painter.text) return;
    const metrics = Painter.text.measureTextDimensions(this.text, this.font);
    switch (this._align) {
      case "left":
        this._centerOffsetX = metrics.width / 2;
        break;
      case "center":
        this._centerOffsetX = 0;
        break;
      case "right":
        this._centerOffsetX = -metrics.width / 2 - 5;
        break;
    }
    switch (this._baseline) {
      case "top":
        this._centerOffsetY = metrics.height / 4;
        break;
      case "middle":
        this._centerOffsetY = -2;
        break;
      case "bottom":
        this._centerOffsetY = -metrics.height;
        break;
    }
  }
  getTextBounds() {
    if (Painter.text) {
      const metrics = Painter.text.measureTextDimensions(this.text, this.font);
      const padding = 2;
      return {
        x: this._centerOffsetX - metrics.width / 2,
        y: this._centerOffsetY - metrics.height / 2,
        width: metrics.width + padding * 2,
        height: metrics.height + padding * 2
      };
    }
    return {
      x: this._centerOffsetX,
      y: this._centerOffsetY,
      width: this._width,
      height: this._height
    };
  }
  /**
   * Overridden _calculateBounds to include alignment offsets
   * @private
   */
  _calculateBounds() {
    if (Painter.text) {
      const metrics = Painter.text.measureTextDimensions(this.text, this.font);
      this._width = metrics.width;
      this._height = metrics.height;
      this._calculateAlignmentOffsets();
    } else {
      this._width = this.text ? this.text.length * 8 : 0;
      this._height = 16;
    }
    this.trace(
      "TextShape.calculateBounds: " + this._width + "x" + this._height
    );
  }
  /**
   * Debug bounds should match text bounds
   * @returns {Object} Debug bounds with width and height
   */
  getDebugBounds() {
    const textBounds = this.getTextBounds();
    return {
      x: textBounds.x,
      y: textBounds.y,
      width: textBounds.width,
      height: textBounds.height
    };
  }
  /**
   * Check if a property has changed and update bounds if needed
   * @param {*} value - New value
   * @param {*} oldValue - Previous value
   * @private
   */
  checkDirty(value, oldValue) {
    if (value !== oldValue) {
      this._boundsDirty = true;
      this._calculateBounds();
    }
  }
  // Getters and setters
  get text() {
    return this._text;
  }
  set text(value) {
    this.checkDirty(value, this._text);
    this._text = value;
  }
  get font() {
    return this._font;
  }
  set font(value) {
    this.checkDirty(value, this._font);
    this._font = value;
  }
  get color() {
    return this._color;
  }
  set color(value) {
    this._color = value;
  }
  get align() {
    return this._align;
  }
  set align(value) {
    this.checkDirty(value, this._align);
    this._align = value;
  }
  get baseline() {
    return this._baseline;
  }
  set baseline(value) {
    this.checkDirty(value, this._baseline);
    this._baseline = value;
  }
}
class OutlinedText extends Shape {
  /**
   * @param {number} x - X coordinate (or center X if centered)
   * @param {number} y - Y coordinate (or center Y if centered)
   * @param {string} text - Text content
   * @param {Object} [options] - Shape rendering options
   * @param {boolean} [options.centered=false] - Whether the text is positioned from its center
   * @param {string} [options.color='#000000'] - Text fill color
   * @param {string} [options.stroke='#FFFFFF'] - Text stroke color
   * @param {number} [options.lineWidth=1] - Width of the text outline
   * @param {string} [options.font] - Font specification
   * @param {string} [options.align='left'] - Text alignment ('left', 'center', 'right')
   * @param {string} [options.baseline='alphabetic'] - Text baseline
   */
  constructor(x, y, text, options = {}) {
    super(x, y, options);
    this.text = text;
    this.centered = options.centered || false;
    this.color = options.color || "#000000";
    this.stroke = options.stroke || "#FFFFFF";
    this.lineWidth = options.lineWidth || 1;
    this.font = options.font || null;
    this.align = options.align || "left";
    this.baseline = options.baseline || "alphabetic";
    this.calculateDimensions();
  }
  /**
   * Calculate the dimensions of the text
   * @private
   */
  calculateDimensions() {
    if (!Painter.ctx) {
      console.warn(
        "Painter context not initialized. Cannot calculate text dimensions."
      );
      this.width = 0;
      this.height = 0;
      return;
    }
    const currentFont = Painter.text.font();
    if (this.font) Painter.text.setFont(this.font);
    const metrics = Painter.text.measureText(this.text);
    this.width = metrics.width;
    if (this.font) {
      const fontSize = parseInt(this.font);
      this.height = isNaN(fontSize) ? 20 : fontSize;
    } else {
      this.height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || 20;
    }
    this.width += this.lineWidth * 2;
    this.height += this.lineWidth * 2;
    Painter.text.setFont(currentFont);
  }
  /**
   * Update the text content
   * @param {string} text - New text content
   */
  setText(text) {
    this.text = text;
    this.calculateDimensions();
  }
  /**
   * Renders the outlined text
   */
  draw() {
    super.draw();
    if (!Painter.ctx) {
      console.warn("Painter context not initialized. Cannot draw text.");
      return;
    }
    let xPos = 0;
    let yPos = 0;
    if (this.font) Painter.text.setFont(this.font);
    Painter.text.setTextAlign(this.align);
    Painter.text.setTextBaseline(this.baseline);
    if (this.centered) {
      if (this.baseline === "middle" || this.baseline === "alphabetic") {
        yPos = 0;
      } else if (this.baseline === "top") {
        yPos = this.height / 2;
      } else if (this.baseline === "bottom") {
        yPos = -this.height / 2;
      }
    }
    Painter.outlinedText(
      this.text,
      xPos,
      yPos,
      this.color,
      this.stroke,
      this.lineWidth,
      this.font
    );
  }
  getBounds() {
    if (!Painter.ctx) {
      return super.getBounds();
    }
    const prevFont = Painter.text.font();
    Painter.text.setFont(this.font);
    const metrics = Painter.text.measureText(this.text);
    const width = metrics.width;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || parseInt(this.font) || 20;
    Painter.text.setFont(prevFont);
    this.width = width;
    this.height = height;
    return {
      x: this.x,
      y: this.y,
      width,
      height
    };
  }
}
class WrappedText extends Shape {
  /**
   * @param {number} x - Left X coordinate (or center if centered=true)
   * @param {number} y - Top Y coordinate (or center if centered=true)
   * @param {string} text - Text content
   * @param {number} maxWidth - Maximum width before wrapping
   * @param {number} [lineHeight=20] - Line height for wrapped text
   * @param {Object} [options] - Shape rendering options
   * @param {boolean} [options.centered=false] - Whether the text is positioned from its center
   * @param {string} [options.color='#000000'] - Text fill color
   * @param {string} [options.font] - Font specification
   * @param {string} [options.align='left'] - Text alignment ('left', 'center', 'right')
   * @param {string} [options.baseline='top'] - Text baseline
   */
  constructor(x, y, text, maxWidth, lineHeight = 20, options = {}) {
    super(x, y, options);
    this.text = text;
    this.maxWidth = maxWidth;
    this.lineHeight = lineHeight;
    this.centered = options.centered || false;
    this.color = options.color || "#000000";
    this.font = options.font || null;
    this.align = options.align || "left";
    this.baseline = options.baseline || "top";
    this.outlineColor = options.outlineColor || null;
    this.outlineWidth = options.outlineWidth || 1;
    this.calculateDimensions();
  }
  /**
   * Calculate the dimensions of the wrapped text
   * @private
   */
  calculateDimensions() {
    if (!Painter.ctx) {
      console.warn(
        "Painter context not initialized. Cannot calculate text dimensions."
      );
      this.width = this.maxWidth;
      this.height = this.lineHeight;
      this.lines = [this.text];
      return;
    }
    const currentFont = Painter.text.font();
    const currentAlign = Painter.text.textAlign();
    const currentBaseline = Painter.text.textBaseline();
    if (this.font) Painter.text.setFont(this.font);
    Painter.text.setTextAlign("left");
    Painter.text.setTextBaseline("top");
    const words = this.text.split(" ");
    let line = "";
    let testLine = "";
    this.lines = [];
    this.width = 0;
    for (let i = 0; i < words.length; i++) {
      testLine = line + words[i] + " ";
      const metrics = Painter.text.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > this.maxWidth && i > 0) {
        this.lines.push(line);
        this.width = Math.max(this.width, Painter.text.measureText(line).width);
        line = words[i] + " ";
      } else {
        line = testLine;
      }
    }
    this.lines.push(line);
    this.width = Math.max(this.width, Painter.text.measureText(line).width);
    this.height = this.lines.length * this.lineHeight;
    Painter.text.setFont(currentFont);
    Painter.text.setTextAlign(currentAlign);
    Painter.text.setTextBaseline(currentBaseline);
  }
  /**
   * Update the text content
   * @param {string} text - New text content
   */
  setText(text) {
    this.text = text;
    this.calculateDimensions();
  }
  /**
   * Renders the wrapped text
   */
  draw() {
    super.draw();
    if (!Painter.ctx) {
      console.warn("Painter context not initialized. Cannot draw text.");
      return;
    }
    let xPos = 0;
    let yPos = 0;
    if (this.centered) {
      xPos = -this.width / 2;
      yPos = -this.height / 2;
    }
    if (this.font) Painter.text.setFont(this.font);
    Painter.text.setTextAlign(this.align);
    Painter.text.setTextBaseline(this.baseline);
    let alignmentX = xPos;
    if (this.align === "center") {
      alignmentX = 0;
    } else if (this.align === "right") {
      alignmentX = xPos + this.width;
    }
    for (let i = 0; i < this.lines.length; i++) {
      const lineY = yPos + i * this.lineHeight;
      if (this.outlineColor) {
        Painter.outlinedText(
          this.lines[i],
          alignmentX,
          lineY,
          this.color,
          this.outlineColor,
          this.outlineWidth,
          this.font
        );
      } else {
        Painter.text.fillText(
          this.lines[i],
          alignmentX,
          lineY,
          this.color,
          this.font
        );
      }
    }
  }
  /**
   * Returns the bounding box
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getBounds() {
    if (this.centered) {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
      };
    } else {
      return {
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        width: this.width,
        height: this.height
      };
    }
  }
}
class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
  }
  off(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback);
  }
  emit(type, payload) {
    if (!this.listeners[type]) return;
    this.listeners[type].forEach((cb) => cb(payload));
  }
}
const _Input = class _Input {
  static init(game) {
    _Input.game = game;
    _Input.x = 0;
    _Input.y = 0;
    _Input.down = false;
    game.events.on("mousedown", _Input._onDown);
    game.events.on("mouseup", _Input._onUp);
    game.events.on("mousemove", _Input._onMove);
    game.events.on("touchstart", _Input._onTouchStart);
    game.events.on("touchend", _Input._onTouchEnd);
    game.events.on("touchmove", _Input._onTouchMove);
  }
  static _setPosition(x, y) {
    _Input.x = x;
    _Input.y = y;
  }
};
__publicField(_Input, "_onDown", (e) => {
  _Input.down = true;
  _Input._setPosition(e.offsetX, e.offsetY);
  _Input.game.events.emit("inputdown", e);
});
__publicField(_Input, "_onUp", (e) => {
  _Input.down = false;
  _Input._setPosition(e.offsetX, e.offsetY);
  _Input.game.events.emit("inputup", e);
});
__publicField(_Input, "_onMove", (e) => {
  _Input._setPosition(e.offsetX, e.offsetY);
  _Input.game.events.emit("inputmove", e);
});
__publicField(_Input, "_onTouchStart", (e) => {
  const touch = e.touches[0];
  const rect = _Input.game.canvas.getBoundingClientRect();
  _Input.down = true;
  _Input._setPosition(touch.clientX - rect.left, touch.clientY - rect.top);
  _Input.game.events.emit("inputdown", e);
});
__publicField(_Input, "_onTouchEnd", (e) => {
  _Input.down = false;
  _Input.game.events.emit("inputup", e);
});
__publicField(_Input, "_onTouchMove", (e) => {
  const touch = e.touches[0];
  const rect = _Input.game.canvas.getBoundingClientRect();
  _Input._setPosition(touch.clientX - rect.left, touch.clientY - rect.top);
  _Input.game.events.emit("inputmove", e);
});
let Input = _Input;
const _Mouse = class _Mouse {
  static init(game) {
    _Mouse.game = game;
    _Mouse.canvas = game.canvas;
    _Mouse.x = 0;
    _Mouse.y = 0;
    _Mouse.leftDown = false;
    _Mouse.middleDown = false;
    _Mouse.rightDown = false;
    _Mouse.canvas.addEventListener("mousemove", _Mouse._onMove);
    _Mouse.canvas.addEventListener("mousedown", _Mouse._onDown);
    _Mouse.canvas.addEventListener("mouseup", _Mouse._onUp);
    _Mouse.canvas.addEventListener("click", _Mouse._onClick);
    _Mouse.canvas.addEventListener("wheel", _Mouse._onWheel);
  }
  static _updatePosition(e) {
    const rect = _Mouse.canvas.getBoundingClientRect();
    _Mouse.x = e.clientX - rect.left;
    _Mouse.y = e.clientY - rect.top;
  }
};
__publicField(_Mouse, "_onMove", (e) => {
  _Mouse._updatePosition(e);
  _Mouse.game.events.emit("mousemove", e);
});
__publicField(_Mouse, "_onDown", (e) => {
  _Mouse._updatePosition(e);
  if (e.button === 0) _Mouse.leftDown = true;
  if (e.button === 1) _Mouse.middleDown = true;
  if (e.button === 2) _Mouse.rightDown = true;
  _Mouse.game.events.emit("mousedown", e);
});
__publicField(_Mouse, "_onUp", (e) => {
  _Mouse._updatePosition(e);
  if (e.button === 0) _Mouse.leftDown = false;
  if (e.button === 1) _Mouse.middleDown = false;
  if (e.button === 2) _Mouse.rightDown = false;
  _Mouse.game.events.emit("mouseup", e);
});
__publicField(_Mouse, "_onClick", (e) => {
  _Mouse._updatePosition(e);
  _Mouse.game.events.emit("click", e);
});
__publicField(_Mouse, "_onWheel", (e) => {
  _Mouse._updatePosition(e);
  _Mouse.game.events.emit("wheel", e);
});
let Mouse = _Mouse;
const _Keys = class _Keys {
  /**
   * Initialize keyboard event handling. This attaches global listeners on the
   * window so that whenever a key is pressed or released, we can map it to
   * one of our Keys.* constants and emit the corresponding events on the game's
   * EventEmitter.
   *
   * @param {Game} game - Your main Game instance, which has a central event emitter.
   */
  static init(game) {
    _Keys.game = game;
    window.addEventListener("keydown", _Keys._onKeyDown);
    window.addEventListener("keyup", _Keys._onKeyUp);
  }
  /**
   * Returns true if the specified logical key (e.g. Keys.W) is currently held down.
   *
   * @param {string} logicalKey - One of the Keys.* constants.
   * @returns {boolean} - True if that key is in the "down" set, false otherwise.
   */
  static isDown(logicalKey) {
    return _Keys._down.has(logicalKey);
  }
  /**
   * Internal method called whenever a key is pressed. We look up which
   * logical key constant it corresponds to, add it to our _down set,
   * and emit an event on the game (e.g. game.events.emit(Keys.W, e)).
   *
   * @param {KeyboardEvent} e - The raw DOM event.
   * @private
   */
  static _onKeyDown(e) {
    const mappedKey = _Keys._codeMap[e.code];
    if (mappedKey) {
      if (!_Keys._down.has(mappedKey)) {
        _Keys._down.add(mappedKey);
        _Keys.game.events.emit(mappedKey, e);
      }
    }
    _Keys.game.events.emit(e.type, e);
  }
  /**
   * Internal method called whenever a key is released. If it was one of our
   * mapped keys, remove it from the _down set and emit an "_up" event.
   *
   * @param {KeyboardEvent} e - The raw DOM event.
   * @private
   */
  static _onKeyUp(e) {
    const mappedKey = _Keys._codeMap[e.code];
    if (mappedKey) {
      if (_Keys._down.has(mappedKey)) {
        _Keys._down.delete(mappedKey);
        _Keys.game.events.emit(mappedKey + "_up", e);
      }
    }
    _Keys.game.events.emit(e.type, e);
  }
};
// Named constants for common game keys you might use:
__publicField(_Keys, "W", "W");
__publicField(_Keys, "A", "A");
__publicField(_Keys, "S", "S");
__publicField(_Keys, "D", "D");
__publicField(_Keys, "UP", "UP");
__publicField(_Keys, "DOWN", "DOWN");
__publicField(_Keys, "LEFT", "LEFT");
__publicField(_Keys, "RIGHT", "RIGHT");
__publicField(_Keys, "SPACE", "SPACE");
__publicField(_Keys, "SHIFT", "SHIFT");
__publicField(_Keys, "ENTER", "ENTER");
__publicField(_Keys, "ESC", "ESC");
/**
 * Mapping from DOM event.code to one of the above Keys.* constants.
 * Customize this list as needed for your game.
 */
__publicField(_Keys, "_codeMap", {
  // WASD
  KeyW: _Keys.W,
  KeyA: _Keys.A,
  KeyS: _Keys.S,
  KeyD: _Keys.D,
  // Arrows
  ArrowUp: _Keys.UP,
  ArrowDown: _Keys.DOWN,
  ArrowLeft: _Keys.LEFT,
  ArrowRight: _Keys.RIGHT,
  // Space, Shift, Enter, Esc
  Space: _Keys.SPACE,
  ShiftLeft: _Keys.SHIFT,
  ShiftRight: _Keys.SHIFT,
  Enter: _Keys.ENTER,
  NumpadEnter: _Keys.ENTER,
  Escape: _Keys.ESC
});
/**
 * A Set of logical key names (Keys.W, Keys.SPACE, etc.) that are currently held down.
 * @type {Set<string>}
 * @private
 */
__publicField(_Keys, "_down", /* @__PURE__ */ new Set());
/**
 * A reference to the main game instance. We store it so we can emit events
 * via game.events whenever a key is pressed or released.
 * @type {Game}
 * @private
 */
__publicField(_Keys, "game", null);
let Keys = _Keys;
const _Touch = class _Touch {
  static init(game) {
    _Touch.game = game;
    _Touch.canvas = game.canvas;
    _Touch.x = 0;
    _Touch.y = 0;
    _Touch.active = false;
    _Touch.canvas.addEventListener("touchstart", _Touch._onStart);
    _Touch.canvas.addEventListener("touchend", _Touch._onEnd);
    _Touch.canvas.addEventListener("touchmove", _Touch._onMove);
  }
  static _updatePosition(touch) {
    const rect = _Touch.canvas.getBoundingClientRect();
    _Touch.x = touch.clientX - rect.left;
    _Touch.y = touch.clientY - rect.top;
  }
};
__publicField(_Touch, "_onStart", (e) => {
  if (e.touches.length > 0) {
    _Touch.active = true;
    _Touch._updatePosition(e.touches[0]);
    _Touch.game.events.emit("touchstart", e);
  }
});
__publicField(_Touch, "_onEnd", (e) => {
  _Touch.active = false;
  _Touch.game.events.emit("touchend", e);
});
__publicField(_Touch, "_onMove", (e) => {
  if (e.touches.length > 0) {
    _Touch._updatePosition(e.touches[0]);
    _Touch.game.events.emit("touchmove", e);
  }
});
let Touch = _Touch;
function applyAnchor(go, options = {}) {
  var _a;
  if (!go || !(go instanceof GameObject)) {
    console.warn("applyAnchor can only be applied to GameObject instances");
    return go;
  }
  go._anchor = {
    position: options.anchor ?? null,
    margin: options.anchorMargin ?? 10,
    offsetX: options.anchorOffsetX ?? 0,
    offsetY: options.anchorOffsetY ?? 0,
    relative: options.anchorRelative ?? false,
    setTextAlign: options.anchorSetTextAlign !== false,
    lastUpdate: 0
    // Track when we last updated positioning
  };
  const originalUpdate = (_a = go.update) == null ? void 0 : _a.bind(go);
  go.update = function(dt) {
    const relativeObj = go._anchor.relative === true && go.parent ? go.parent : go._anchor.relative;
    if (go._anchor.position && (go.boundsDirty || relativeObj && relativeObj.boundsDirty || go.parent && go.parent.boundsDirty)) {
      let position;
      if (relativeObj) {
        const containerObj = {
          x: relativeObj.x,
          y: relativeObj.y,
          width: relativeObj.width,
          height: relativeObj.height
        };
        position = Position.calculate(
          go._anchor.position,
          go,
          containerObj,
          go._anchor.margin,
          go._anchor.offsetX,
          go._anchor.offsetY
        );
      } else {
        position = Position.calculateAbsolute(
          go._anchor.position,
          go,
          go.game,
          go._anchor.margin,
          go._anchor.offsetX,
          go._anchor.offsetY
        );
      }
      if (go.parent && !isPipelineRoot(go)) {
        if (relativeObj === go.parent) {
          go.x = position.x - relativeObj.x;
          go.y = position.y - relativeObj.y;
        } else {
          go.x = position.x - go.parent.x;
          go.y = position.y - go.parent.y;
        }
      } else {
        go.x = position.x;
        go.y = position.y;
      }
      if (go._anchor.setTextAlign) {
        if ("align" in go) go.align = position.align;
        if ("baseline" in go) go.baseline = position.baseline;
      }
      go._anchor.lastUpdate = go.game ? go.game.lastTime : Date.now();
    }
    if (originalUpdate) originalUpdate(dt);
  };
  function isPipelineRoot(gameObject) {
    return gameObject.game && gameObject.game.pipeline && gameObject.game.pipeline.gameObjects && gameObject.game.pipeline.gameObjects.includes(gameObject);
  }
  return go;
}
class GameObject extends Transformable {
  /**
   * @param {Game} game - Game instance reference
   * @param {Object} [options={}] - Configuration and styling
   */
  constructor(game, options = {}) {
    super(options);
    this.game = game;
    this.parent = null;
    this.events = new EventEmitter();
    this._interactive = options.interactive ?? false;
    this._hovered = false;
    if (options.anchor) {
      applyAnchor(this, options);
    }
  }
  update(dt) {
    this.logger.groupCollapsed(
      "GameObject.update: " + (this.name == void 0 ? this.constructor.name : this.name)
    );
    super.update(dt);
    this.logger.groupEnd();
  }
  /**
   * Enable or disable hit-testing for this GameObject.
   * When enabled, _hitTest() will run during interaction checks.
   * @type {boolean}
   */
  get interactive() {
    return this._interactive;
  }
  set interactive(value) {
    const newValue = Boolean(value);
    if (this._interactive !== newValue) {
      this._interactive = newValue;
      if (newValue === true) {
        this._enableEvents();
      } else {
        this._disableEvents();
        if (this._hovered) {
          this._hovered = false;
          this.events.emit("mouseout");
        }
      }
    }
  }
  /**
   * Enable event handling for this GameObject.
   * @private
   */
  _enableEvents() {
    this.logger.log(`${this.constructor.name} is now interactive`);
  }
  /**
   * Disable event handling for this GameObject.
   * @private
   */
  _disableEvents() {
    this.logger.log(`${this.constructor.name} is no longer interactive`);
  }
  /**
   * True if the pointer is currently hovering over the object.
   * @type {boolean}
   * @readonly
   */
  get hovered() {
    return this._hovered;
  }
  set hovered(value) {
    this._hovered = Boolean(value);
  }
  /** Internal use by input system */
  _setHovered(state) {
    this._hovered = Boolean(state);
  }
  /**
   * Test whether a given point lies inside the object's bounds,
   * taking into account the full transformation hierarchy (position, rotation, scale).
   *
   * @param {number} x - X screen coordinate
   * @param {number} y - Y screen coordinate
   * @returns {boolean} True if the point is inside this object's bounds
   */
  _hitTest(x, y) {
    var _a;
    if (!this._interactive) return false;
    const bounds = (_a = this.getBounds) == null ? void 0 : _a.call(this);
    if (!bounds) return false;
    let localX = x;
    let localY = y;
    const transformChain = [];
    let current = this;
    while (current) {
      transformChain.unshift(current);
      current = current.parent;
    }
    for (const obj of transformChain) {
      localX -= obj.x || 0;
      localY -= obj.y || 0;
      if (obj.rotation) {
        const cos = Math.cos(-obj.rotation);
        const sin = Math.sin(-obj.rotation);
        const tempX = localX;
        localX = tempX * cos - localY * sin;
        localY = tempX * sin + localY * cos;
      }
      if (obj.scaleX !== void 0 && obj.scaleX !== 0) {
        localX /= obj.scaleX;
      }
      if (obj.scaleY !== void 0 && obj.scaleY !== 0) {
        localY /= obj.scaleY;
      }
    }
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH;
  }
  /**
   * Attach an event handler.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.events.on(event, callback);
  }
  /**
   * Remove an event handler.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.events.off(event, callback);
  }
  /**
   * Dispatch an event manually.
   * @param {string} event - Event name
   * @param {...any} args - Event arguments
   */
  emit(event, ...args) {
    this.events.emit(event, ...args);
  }
}
function applyDraggable(go, options = {}) {
  const game = go.game;
  go.dragging = false;
  go.dragOffset = { x: 0, y: 0 };
  if (go._dragInputMoveHandler) {
    game.events.off("inputmove", go._dragInputMoveHandler);
  }
  if (go._dragInputUpHandler) {
    game.events.off("inputup", go._dragInputUpHandler);
  }
  if (typeof go.enableInteractivity === "function") {
    go.enableInteractivity(go);
  } else {
    go.interactive = true;
  }
  go._dragInputDownHandler = (e) => {
    go.dragging = true;
    go.dragOffset.x = go.x - e.x;
    go.dragOffset.y = go.y - e.y;
    if (options.onDragStart) options.onDragStart();
  };
  go._dragInputMoveHandler = (e) => {
    if (go.dragging) {
      go.x = e.x + go.dragOffset.x;
      go.y = e.y + go.dragOffset.y;
    }
  };
  go._dragInputUpHandler = (e) => {
    if (!go.dragging) return;
    go.dragging = false;
    if (options.onDragEnd) options.onDragEnd();
  };
  go.on("inputdown", go._dragInputDownHandler);
  game.events.on("inputmove", go._dragInputMoveHandler);
  game.events.on("inputup", go._dragInputUpHandler);
  return () => {
    go.off("inputdown", go._dragInputDownHandler);
    game.events.off("inputmove", go._dragInputMoveHandler);
    game.events.off("inputup", go._dragInputUpHandler);
    delete go._dragInputDownHandler;
    delete go._dragInputMoveHandler;
    delete go._dragInputUpHandler;
    delete go.dragging;
    delete go.dragOffset;
  };
}
class ShapeGOFactory {
  /**
   * Creates a GameObject wrapper around a Shape
   * 
   * @param {Game} game - Game instance
   * @param {Shape} shape - Shape to wrap
   * @param {Object} opts - Additional options
   * @returns {GameObjectShapeWrapper} - The created wrapper
   */
  static create(game, shape, opts = {}) {
    const combinedOpts = {
      // Default position & size from shape
      x: (shape == null ? void 0 : shape.x) ?? 0,
      y: (shape == null ? void 0 : shape.y) ?? 0,
      width: (shape == null ? void 0 : shape.width) ?? 0,
      height: (shape == null ? void 0 : shape.height) ?? 0,
      rotation: (shape == null ? void 0 : shape.rotation) ?? 0,
      scaleX: (shape == null ? void 0 : shape.scaleX) ?? 1,
      scaleY: (shape == null ? void 0 : shape.scaleY) ?? 1,
      opacity: (shape == null ? void 0 : shape.opacity) ?? 1,
      visible: (shape == null ? void 0 : shape.visible) ?? true,
      active: true,
      debug: (shape == null ? void 0 : shape.debug) ?? false,
      // Shape-specific properties
      color: (shape == null ? void 0 : shape.color) ?? null,
      stroke: (shape == null ? void 0 : shape.stroke) ?? null,
      lineWidth: (shape == null ? void 0 : shape.lineWidth) ?? 1,
      lineJoin: (shape == null ? void 0 : shape.lineJoin) ?? "miter",
      lineCap: (shape == null ? void 0 : shape.lineCap) ?? "butt",
      miterLimit: (shape == null ? void 0 : shape.miterLimit) ?? 10,
      // Override with any user-provided options
      ...opts,
      // Default name from shape class
      name: opts.name ?? (shape == null ? void 0 : shape.constructor.name) ?? "ShapeWrapper"
    };
    return new GameObjectShapeWrapper(game, shape, combinedOpts);
  }
}
class GameObjectShapeWrapper extends GameObject {
  /**
   * Creates a GameObject wrapper around a Shape instance
   * 
   * @param {Game} game - The game instance
   * @param {Shape} shape - The shape to wrap
   * @param {Object} options - Configuration options
   */
  constructor(game, shape, options = {}) {
    super(game, options);
    if (!shape || shape == null || shape == void 0) {
      throw new Error("GameObjectShapeWrapper requires a shape");
    }
    this.shape = shape;
    if (options.color !== void 0) shape.color = options.color;
    if (options.stroke !== void 0) shape.stroke = options.stroke;
    if (options.lineWidth !== void 0) shape.lineWidth = options.lineWidth;
    if (options.lineJoin !== void 0) shape.lineJoin = options.lineJoin;
    if (options.lineCap !== void 0) shape.lineCap = options.lineCap;
    if (options.miterLimit !== void 0) shape.miterLimit = options.miterLimit;
    this.syncPropertiesToShape();
    this.logger.log(`Created GameObject(${this.constructor.name}):`, {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      color: this.color,
      stroke: this.stroke
    });
  }
  /**
   * Synchronizes common properties from wrapper to shape
   */
  syncPropertiesToShape() {
    if (!this.shape) return;
    const propsToSync = [
      "width",
      "height",
      "rotation",
      "scaleX",
      "scaleY",
      "visible",
      "debug",
      "debugColor"
    ];
    for (const prop of propsToSync) {
      if (prop in this && prop in this.shape) {
        if (this[prop] !== this.shape[prop]) {
          this.shape[prop] = this[prop];
        }
      }
    }
  }
  // Shape-specific property getters and setters
  /**
   * Fill color for the shape
   * @type {string|null}
   */
  get color() {
    return this.shape ? this.shape.color : null;
  }
  set color(value) {
    if (this.shape) {
      this.shape.color = value;
    }
  }
  /**
   * Stroke color for the shape
   * @type {string|null}
   */
  get stroke() {
    return this.shape ? this.shape.stroke : null;
  }
  set stroke(value) {
    if (this.shape) {
      this.shape.stroke = value;
    }
  }
  /**
   * Line width for the shape's stroke
   * @type {number}
   */
  get lineWidth() {
    return this.shape ? this.shape.lineWidth : 1;
  }
  set lineWidth(value) {
    if (this.shape) {
      this.shape.lineWidth = value;
    }
  }
  /**
   * Line join style ("miter", "round", "bevel")
   * @type {string}
   */
  get lineJoin() {
    return this.shape ? this.shape.lineJoin : "miter";
  }
  set lineJoin(value) {
    if (this.shape) {
      this.shape.lineJoin = value;
    }
  }
  /**
   * Line cap style ("butt", "round", "square")
   * @type {string}
   */
  get lineCap() {
    return this.shape ? this.shape.lineCap : "butt";
  }
  set lineCap(value) {
    if (this.shape) {
      this.shape.lineCap = value;
    }
  }
  /**
   * Miter limit for line joins
   * @type {number}
   */
  get miterLimit() {
    return this.shape ? this.shape.miterLimit : 10;
  }
  set miterLimit(value) {
    if (this.shape) {
      this.shape.miterLimit = value;
    }
  }
  /**
   * Update method called each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    var _a;
    if (!this.active) return;
    (_a = this.onUpdate) == null ? void 0 : _a.call(this, dt);
    if (this._boundsDirty || this.tweening) {
      this.syncPropertiesToShape();
      this._boundsDirty = false;
    }
    super.update(dt);
  }
  /**
   * Draw method to render the shape
   */
  draw() {
    super.draw();
    this.shape.render();
  }
}
class Scene extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this._collection = new ZOrderedCollection({
      sortByZIndex: options.sortByZIndex || true
    });
    this._collection._owner = this;
    this._width = options.width ?? 0;
    this._height = options.height ?? 0;
    this.forceWidth = null;
    this.forceHeight = null;
    this._naturalWidth = null;
    this._naturalHeight = null;
    this.userDefinedDimensions = false;
    if (options.width != void 0 && options.height != void 0) {
      this.userDefinedWidth = options.width;
      this.userDefinedHeight = options.height;
      this.userDefinedDimensions = true;
    }
  }
  // Update method - update children and recalculate natural dimensions
  update(dt) {
    this.logger.groupCollapsed(
      "Scene.update: " + (this.name == void 0 ? this.constructor.name : this.name)
    );
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child.active && child.update) {
        child.update(dt);
      }
    }
    super.update(dt);
    this.logger.groupEnd();
  }
  // Add a GameObject to the scene and invalidate dimensions
  add(go) {
    if (go == null || go == void 0) {
      throw new Error("GameObject is null or undefined");
    }
    if (go.parent != null) {
      console.warn(
        "This GameObject already has a parent. Consider removing it first."
      );
    }
    go.parent = this;
    this._collection.add(go);
    this.markBoundsDirty();
    if (go.init) {
      go.init();
    }
    return go;
  }
  markBoundsDirty() {
    super.markBoundsDirty();
    this.children.forEach((child) => {
      child.markBoundsDirty();
    });
  }
  /**
   * Removes a GameObject from the Scene
   *
   * ### Removal Strategy
   *
   * #### Why Use Filter?
   * - Creates a new array (immutable approach)
   * - Ensures no direct mutation of the children array
   *
   * #### Parent Reference Clearing
   * - Breaks the parent-child relationship
   * - Allows the object to be re-parented elsewhere
   *
   * @param {GameObject} go - Game object to remove
   */
  remove(go) {
    const result = this._collection.remove(go);
    if (result) {
      go.parent = null;
      this.markBoundsDirty();
    }
    return result;
  }
  draw() {
    super.draw();
    this.logger.log("Scene.draw chilren:");
    this._collection.getSortedChildren().filter((obj) => obj.visible).map(function(obj) {
      Painter.save();
      obj.render();
      Painter.restore();
      return obj;
    });
  }
  getDebugBounds() {
    return {
      width: this.width,
      height: this.height,
      x: this.x - this.width / 2,
      y: this.y - this.height / 2
    };
  }
  bringToFront(go) {
    return this._collection.bringToFront(go);
  }
  sendToBack(go) {
    return this._collection.sendToBack(go);
  }
  bringForward(go) {
    return this._collection.bringForward(go);
  }
  sendBackward(go) {
    return this._collection.sendBackward(go);
  }
  clear() {
    this._collection.children.forEach((go) => this.remove(go));
    return this._collection.clear();
  }
  // Getter to access children
  get children() {
    return this._collection.children;
  }
}
class LayoutScene extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.spacing = options.spacing ?? 10;
    this.padding = options.padding ?? 0;
    this.autoSize = options.autoSize ?? true;
    this.align = options.align ?? "start";
    this.debug = options.debug ?? false;
    this._layoutDirty = true;
  }
  // Template method to be overridden by subclasses
  calculateLayout() {
    throw new Error("Subclasses must implement calculateLayout()");
  }
  update(dt) {
    if (this._boundsDirty || this._layoutDirty) {
      const prevWidth = this.width;
      const prevHeight = this.height;
      const layoutResult = this.calculateLayout();
      if (this.autoSize && layoutResult) {
        if (Math.abs(this.width - layoutResult.width) > 0.1) {
          this.width = layoutResult.width;
        }
        if (Math.abs(this.height - layoutResult.height) > 0.1) {
          this.height = layoutResult.height;
        }
      }
      if (layoutResult && layoutResult.positions) {
        this.applyPositionsToChildren(layoutResult.positions);
      }
      this._boundsDirty = false;
      this._layoutDirty = false;
      if ((prevWidth !== this.width || prevHeight !== this.height) && !this._updatingBoundsFromLayout) {
        this._updatingBoundsFromLayout = true;
        Scene.prototype.markBoundsDirty.call(this);
        this._updatingBoundsFromLayout = false;
      }
    }
    super.update(dt);
  }
  markBoundsDirty() {
    if (this._updatingBoundsFromLayout) {
      this._boundsDirty = true;
      return;
    }
    super.markBoundsDirty();
    this._layoutDirty = true;
  }
  // Shared method to apply positions using utility function
  applyPositionsToChildren(positions) {
    applyLayout(this.children, positions, this.getLayoutOffset());
  }
  // Subclasses override this to return their specific offset needs
  getLayoutOffset() {
    return { offsetX: 0, offsetY: 0 };
  }
  // Override to mark layout dirty when children change
  add(go) {
    const result = super.add(go);
    this._layoutDirty = true;
    return result;
  }
  remove(go) {
    const result = super.remove(go);
    this._layoutDirty = true;
    return result;
  }
}
class HorizontalLayout extends LayoutScene {
  // Override only the layout-specific methods
  calculateLayout() {
    return horizontalLayout(this.children, {
      spacing: this.spacing,
      padding: this.padding,
      align: this.align,
      centerItems: true
    });
  }
  getLayoutOffset() {
    return {
      offsetX: -this.width / 2,
      offsetY: 0
    };
  }
}
class VerticalLayout extends LayoutScene {
  // Override only the layout-specific methods
  calculateLayout() {
    return verticalLayout(this.children, {
      spacing: this.spacing,
      padding: this.padding,
      align: this.align,
      centerItems: true
    });
  }
  getLayoutOffset() {
    return {
      offsetX: 0,
      offsetY: -this.height / 2
    };
  }
}
class TileLayout extends LayoutScene {
  constructor(game, options = {}) {
    super(game, options);
    this.columns = options.columns ?? 4;
  }
  calculateLayout() {
    if (!this.children.length) {
      return null;
    }
    return tileLayout(this.children, {
      columns: this.columns,
      spacing: this.spacing,
      padding: this.padding,
      centerItems: true
    });
  }
  getLayoutOffset() {
    return {
      offsetX: -this.width / 2,
      offsetY: -this.height / 2
    };
  }
}
class GridLayout extends LayoutScene {
  constructor(game, options = {}) {
    super(game, options);
    this.columns = options.columns ?? 4;
    this.debug = options.debug ?? false;
  }
  calculateLayout() {
    if (!this.children.length) {
      return null;
    }
    return gridLayout(this.children, {
      columns: this.columns,
      spacing: this.spacing,
      padding: this.padding,
      centerItems: this.centerItems,
      /* only pass these two when autoSize is *off* */
      width: this.autoSize ? void 0 : this.width,
      height: this.autoSize ? void 0 : this.height
    });
  }
  getLayoutOffset() {
    return {
      offsetX: -this.width / 2,
      offsetY: -this.height / 2
    };
  }
}
class Text extends GameObjectShapeWrapper {
  /**
   * Create a Text component
   * @param {Game} game - The main game instance
   * @param {string} text - The text content to display
   * @param {object} [options={}] - Configuration options
   * @param {number} [options.x=0] - X-position
   * @param {number} [options.y=0] - Y-position
   * @param {string} [options.font="16px monospace"] - CSS-style font string
   * @param {string} [options.color="#fff"] - Text color
   * @param {string} [options.align="left"] - Text alignment
   * @param {string} [options.baseline="top"] - Text baseline
   * @param {boolean} [options.stroke=false] - Whether to stroke the text
   * @param {string} [options.strokeColor="#000"] - Stroke color
   * @param {number} [options.lineWidth=1] - Stroke width
   * @param {boolean} [options.interactive=false] - Whether the text should be interactive
   * @param {string} [options.anchor] - Optional anchor position (e.g., "top-left", "center")
   * @param {number} [options.padding] - Padding when using anchors
   */
  constructor(game, text, options = {}) {
    const textShape = new TextShape(text, {
      font: options.font || "16px monospace",
      color: options.color || "yellow",
      align: options.align || "left",
      baseline: options.baseline || "top",
      strokeColor: options.strokeColor || "#000",
      lineWidth: options.lineWidth || 1,
      debugColor: options.debugColor || "yellow"
    });
    super(game, textShape, options);
    this._textOptions = {
      font: options.font || "16px monospace",
      color: options.color || "yellow",
      align: options.align || "left",
      baseline: options.baseline || "top"
    };
  }
  /**
   * Get the text content
   * @returns {string} Current text
   */
  get text() {
    return this.shape.text;
  }
  /**
   * Set the text content
   * @param {string} value - New text to display
   */
  set text(value) {
    this.shape.text = value;
    this.markBoundsDirty();
  }
  /**
   * Get the font style
   * @returns {string} Current font
   */
  get font() {
    return this.shape.font;
  }
  /**
   * Set the font style
   * @param {string} value - New font style
   */
  set font(value) {
    this.shape.font = value;
    this._textOptions.font = value;
    this.markBoundsDirty();
  }
  /**
   * Get the text color
   * @returns {string} Current color
   */
  get color() {
    return this.shape.color;
  }
  /**
   * Set the text color
   * @param {string} value - New color
   */
  set color(value) {
    this.shape.color = value;
    this._textOptions.color = value;
  }
  /**
   * Get text alignment
   * @returns {string} Current alignment
   */
  get align() {
    return this.shape.align;
  }
  /**
   * Set text alignment
   * @param {string} value - New alignment
   */
  set align(value) {
    this.shape.align = value;
    this._textOptions.align = value;
    this.markBoundsDirty();
  }
  /**
   * Get text baseline
   * @returns {string} Current baseline
   */
  get baseline() {
    return this.shape.baseline;
  }
  /**
   * Set text baseline
   * @param {string} value - New baseline
   */
  set baseline(value) {
    this.shape.baseline = value;
    this._textOptions.baseline = value;
    this.markBoundsDirty();
  }
  /**
   * Calculate the width based on the text content
   * @returns {number} Approximate width of the text
   */
  measureWidth() {
    if (!Painter.ctx) return 0;
    const width = Painter.text.measureTextWidth(this.text, this.font);
    return width;
  }
  /**
   * Calculate the height based on the font size
   * @returns {number} Approximate height of the text
   */
  measureHeight() {
    if (!this.font) return 16;
    const fontSize = parseInt(this.font);
    return isNaN(fontSize) ? 16 : fontSize;
  }
  /**
   * Gets the text bounds accounting for alignment and baseline
   * @returns {Object} Bounds object with { x, y, width, height }
   */
  getBounds() {
    const bounds = super.getBounds();
    if (this.shape.getTextBounds) {
      const textBounds = this.shape.getTextBounds();
      return {
        x: this.x,
        y: this.y,
        width: textBounds.width,
        height: textBounds.height
      };
    }
    return bounds;
  }
  /**
   * Updates the GameObject and the wrapped TextShape
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);
    if (this.shape) {
      this.width = this.shape.width || this.measureWidth();
      this.height = this.shape.height || this.measureHeight();
    }
  }
}
class ImageShape extends Shape {
  /**
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Video|ImageData} bitmap  Anything the 2‑D API understands
   * @param {object} [options]                    Usual Shape options + anchor, etc.
   */
  constructor(bitmap, options = {}) {
    if (!bitmap && !options.width && !options.height) {
      throw new Error(
        "ImageShape must be initialized with either a bitmap or width and height"
      );
    }
    super(options);
    this._bitmap = bitmap ?? Painter.img.createImageData(options.width, options.height);
    this._width = options.width ?? (bitmap == null ? void 0 : bitmap.width) ?? 0;
    this._height = options.height ?? (bitmap == null ? void 0 : bitmap.height) ?? 0;
    this.anchor = options.anchor ?? "center";
    this._anchorX = 0.5;
    this._anchorY = 0.5;
    this._updateAnchorOffsets();
    this.smoothing = options.smoothing !== false;
    if (bitmap instanceof ImageData) {
      this.buffer(bitmap);
    }
  }
  /**
   * Calculate anchor point offsets based on anchor string
   * @private
   */
  _updateAnchorOffsets() {
    var _a;
    const anchor = ((_a = this.anchor) == null ? void 0 : _a.toLowerCase()) ?? "center";
    if (anchor.includes("left")) this._anchorX = 0;
    else if (anchor.includes("right")) this._anchorX = 1;
    else this._anchorX = 0.5;
    if (anchor.includes("top")) this._anchorY = 0;
    else if (anchor.includes("bottom")) this._anchorY = 1;
    else this._anchorY = 0.5;
  }
  /**
   * Access the internal bitmap
   * @returns {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Video|ImageData} Current bitmap
   */
  get bitmap() {
    return this._bitmap;
  }
  /**
   * Change the internal bitmap
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|Video|ImageData} bmp New bitmap
   */
  set bitmap(bmp) {
    if (!bmp) return;
    this._bitmap = bmp;
    if (!this._width && bmp.width) this._width = bmp.width;
    if (!this._height && bmp.height) this._height = bmp.height;
    if (bmp instanceof ImageData) {
      this.buffer(bmp);
    }
  }
  /**
   * Create or update the canvas buffer for ImageData
   * @param {ImageData} bitmap ImageData to put in the buffer
   */
  buffer(bitmap) {
    if (!bitmap) return;
    if (!this._buffer) {
      this._buffer = document.createElement("canvas");
    }
    if (this._buffer.width !== bitmap.width || this._buffer.height !== bitmap.height) {
      this._buffer.width = bitmap.width;
      this._buffer.height = bitmap.height;
    }
    const ctx = this._buffer.getContext("2d");
    ctx.putImageData(bitmap, 0, 0);
  }
  /**
   * Reset the image to an empty state
   */
  reset() {
    this._buffer = null;
    this._bitmap = Painter.img.createImageData(this.width, this.height);
  }
  /**
   * Set the anchor point
   * @param {string} anchor Anchor position (e.g. "center", "top-left")
   */
  setAnchor(anchor) {
    this.anchor = anchor;
    this._updateAnchorOffsets();
  }
  /* ------------------------------------------------------------------ draw */
  /**
   * Draw the image to the canvas
   */
  draw() {
    if (!this.visible) return;
    if (!this._bitmap && !this._buffer) return;
    super.draw();
    let source = this._bitmap instanceof ImageData ? this._buffer : this._bitmap;
    if (!source || this._bitmap instanceof ImageData && !this._buffer) {
      if (this._bitmap instanceof ImageData) {
        this.buffer(this._bitmap);
        source = this._buffer;
      }
      if (!source) return;
    }
    Painter.img.draw(source, 0, 0, {
      width: this.width,
      height: this.height,
      anchor: this.anchor,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      alpha: this.opacity,
      smoothing: this.smoothing,
      flipX: this.scaleX < 0,
      flipY: this.scaleY < 0
    });
  }
  /* ---------------------------------------------------- bounds & geometry */
  /** Re‑compute bounding box (called by base class when something changes). */
  calculateBounds() {
    return {
      x: -this._anchorX * this.width,
      y: -this._anchorY * this.height,
      width: this.width,
      height: this.height
    };
  }
}
class ImageGo extends GameObjectShapeWrapper {
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
    const shape = bitmap instanceof ImageShape ? bitmap : new ImageShape(bitmap, options);
    super(game, shape, options);
  }
  reset() {
    this.shape.reset();
  }
}
class Tween {
  /**
   * Linear interpolation between two scalar values.
   * Also known as Lerp.
   * @param {number} start
   * @param {number} end
   * @param {number} t - Normalized interpolation factor (0 to 1)
   * @returns {number} Interpolated scalar
   */
  static lerp(start, end, t) {
    return start + (end - start) * t;
  }
  /**
   * Smoothly interpolates between two angles (in radians),
   * always taking the shortest path around the circle.
   *
   * Prevents snapping when angles wrap across -π to π boundaries.
   *
   * @param {number} a - Starting angle in radians
   * @param {number} b - Target angle in radians
   * @param {number} t - Interpolation factor (0 to 1)
   * @returns {number} Interpolated angle in radians
   */
  static lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }
  /**
   * Interpolate between two colors in RGB space
   * @param {Array<number>} color1 - Start color [r, g, b] (0-255)
   * @param {Array<number>} color2 - End color [r, g, b] (0-255)
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Array<number>} Interpolated color [r, g, b]
   */
  static tweenColor(color1, color2, t) {
    return color1.map((c, i) => Tween.lerp(c, color2[i], t));
  }
  /**
   * Interpolate between two HSL colors
   * @param {Array<number>} color1 - Start color [h, s, l]
   * @param {Array<number>} color2 - End color [h, s, l]
   * @param {number} t - Interpolation factor (0-1)
   * @returns {Array<number>} Interpolated color [h, s, l]
   */
  static tweenGradient(color1, color2, t) {
    let h1 = color1[0];
    let h2 = color2[0];
    if (Math.abs(h2 - h1) > 180) {
      if (h1 < h2) h1 += 360;
      else h2 += 360;
    }
    const h = Tween.lerp(h1, h2, t) % 360;
    const s = Tween.lerp(color1[1], color2[1], t);
    const l = Tween.lerp(color1[2], color2[2], t);
    return [h, s, l];
  }
}
class Easing {
  // =========================================================================
  // EASING FUNCTIONS
  // =========================================================================
  /**
   * Quadratic ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInQuad(t) {
    return t * t;
  }
  /**
   * Quadratic ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutQuad(t) {
    return t * (2 - t);
  }
  /**
   * Quadratic ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  /**
   * Cubic ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInCubic(t) {
    return t * t * t;
  }
  /**
   * Cubic ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutCubic(t) {
    return --t * t * t + 1;
  }
  /**
   * Cubic ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
  /**
   * Quartic ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInQuart(t) {
    return t * t * t * t;
  }
  /**
   * Quartic ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutQuart(t) {
    return 1 - --t * t * t * t;
  }
  /**
   * Quartic ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;
  }
  /**
   * Sine ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInSine(t) {
    return 1 - Math.cos(t * Math.PI / 2);
  }
  /**
   * Sine ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutSine(t) {
    return Math.sin(t * Math.PI / 2);
  }
  /**
   * Sine ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }
  /**
   * Exponential ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInExpo(t) {
    return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
  }
  /**
   * Exponential ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  /**
   * Exponential ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutExpo(t) {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) {
      return 0.5 * Math.pow(2, 20 * t - 10);
    } else {
      return 0.5 * (2 - Math.pow(2, -20 * t + 10));
    }
  }
  /**
   * Circular ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInCirc(t) {
    return 1 - Math.sqrt(1 - t * t);
  }
  /**
   * Circular ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutCirc(t) {
    return Math.sqrt(1 - --t * t);
  }
  /**
   * Circular ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutCirc(t) {
    return t < 0.5 ? 0.5 * (1 - Math.sqrt(1 - 4 * t * t)) : 0.5 * (Math.sqrt(-(2 * t - 3) * (2 * t - 1)) + 1);
  }
  /**
   * Elastic ease-in
   * @param {number} t - Input (0-1)
   * @param {number} [amplitude=1] - Amplitude
   * @param {number} [period=0.3] - Period
   * @returns {number} Eased value
   */
  static easeInElastic(t, amplitude = 1, period = 0.3) {
    if (t === 0 || t === 1) return t;
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
    return -(amplitude * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / period));
  }
  /**
   * Elastic ease-out
   * @param {number} t - Input (0-1)
   * @param {number} [amplitude=1] - Amplitude
   * @param {number} [period=0.3] - Period
   * @returns {number} Eased value
   */
  static easeOutElastic(t, amplitude = 1, period = 0.3) {
    if (t === 0 || t === 1) return t;
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
    return amplitude * Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / period) + 1;
  }
  /**
   * Elastic ease-in-out
   * @param {number} t - Input (0-1)
   * @param {number} [amplitude=1] - Amplitude
   * @param {number} [period=0.3] - Period
   * @returns {number} Eased value
   */
  static easeInOutElastic(t, amplitude = 1, period = 0.3) {
    if (t === 0 || t === 1) return t;
    const s = period / (2 * Math.PI) * Math.asin(1 / amplitude);
    if (t < 0.5) {
      return -0.5 * (amplitude * Math.pow(2, 10 * (2 * t - 1)) * Math.sin((2 * t - 1 - s) * (2 * Math.PI) / period));
    } else {
      return amplitude * Math.pow(2, -10 * (2 * t - 1)) * Math.sin((2 * t - 1 - s) * (2 * Math.PI) / period) * 0.5 + 1;
    }
  }
  /**
   * Back ease-in
   * @param {number} t - Input (0-1)
   * @param {number} [overshoot=1.70158] - Overshoot amount
   * @returns {number} Eased value
   */
  static easeInBack(t, overshoot = 1.70158) {
    return t * t * ((overshoot + 1) * t - overshoot);
  }
  /**
   * Back ease-out
   * @param {number} t - Input (0-1)
   * @param {number} [overshoot=1.70158] - Overshoot amount
   * @returns {number} Eased value
   */
  static easeOutBack(t, overshoot = 1.70158) {
    return --t * t * ((overshoot + 1) * t + overshoot) + 1;
  }
  /**
   * Back ease-in-out
   * @param {number} t - Input (0-1)
   * @param {number} [overshoot=1.70158] - Overshoot amount
   * @returns {number} Eased value
   */
  static easeInOutBack(t, overshoot = 1.70158) {
    const s = overshoot * 1.525;
    if (t < 0.5) {
      return 0.5 * (2 * t) * (2 * t) * ((s + 1) * 2 * t - s);
    } else {
      return 0.5 * ((2 * t - 2) * (2 * t - 2) * ((s + 1) * (2 * t - 2) + s) + 2);
    }
  }
  /**
   * Bounce ease-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeOutBounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
  /**
   * Bounce ease-in
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInBounce(t) {
    return 1 - Easing.easeOutBounce(1 - t);
  }
  /**
   * Bounce ease-in-out
   * @param {number} t - Input (0-1)
   * @returns {number} Eased value
   */
  static easeInOutBounce(t) {
    return t < 0.5 ? Easing.easeInBounce(t * 2) * 0.5 : Easing.easeOutBounce(t * 2 - 1) * 0.5 + 0.5;
  }
}
function bounceV1(maxHeight, groundY, bounceCount, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  const segmentSize = 1 / (bounceCount + 1);
  const segment = Math.min(Math.floor(easedT / segmentSize), bounceCount);
  const segmentT = easedT % segmentSize / segmentSize;
  const bounceHeight = maxHeight * Math.pow(0.6, segment);
  const normalized = Math.sin(segmentT * Math.PI);
  const y = groundY - normalized * (groundY - bounceHeight);
  return Motion.animationResult(
    { y, segment, bounceHeight },
    t,
    loop,
    completed,
    newState
  );
}
function floatV1(target, elapsedTime, duration, speed, randomness, radius, loop = true, easingFn = null, callbacks = {}, state = null) {
  if (duration <= 0) {
    return Motion.animationResult(
      { x: target.x, y: target.y, moving: false },
      1,
      false,
      true
    );
  }
  if (!state) {
    state = {
      initialX: target.x,
      initialY: target.y,
      started: false,
      completed: false,
      loopCount: 0
    };
  }
  const centerX = state.initialX;
  const centerY = state.initialY;
  const {
    t,
    easedT,
    completed,
    state: timeState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  state = {
    ...state,
    ...timeState
  };
  const scaledTime = elapsedTime * speed;
  const clampedRandomness = Math.max(0, Math.min(1, randomness));
  const baseFreqX = 0.7;
  const baseFreqY = 0.9;
  const secondFreqX = 2.3;
  const secondFreqY = 1.9;
  const dx = Math.sin(scaledTime * baseFreqX) + clampedRandomness * 0.4 * Math.sin(scaledTime * secondFreqX + 0.5);
  const dy = Math.cos(scaledTime * baseFreqY) + clampedRandomness * 0.4 * Math.cos(scaledTime * secondFreqY + 0.7);
  const x = centerX + dx * radius;
  const y = centerY + dy * radius;
  const dxdt = baseFreqX * Math.cos(scaledTime * baseFreqX) + clampedRandomness * 0.4 * secondFreqX * Math.cos(scaledTime * secondFreqX + 0.5);
  const dydt = -0.9 * Math.sin(scaledTime * baseFreqY) + clampedRandomness * 0.4 * -1.9 * Math.sin(scaledTime * secondFreqY + 0.7);
  const velocity = Math.sqrt(dxdt * dxdt + dydt * dydt);
  const isMoving = velocity > 0.8;
  const distanceFromCenter = Math.sqrt(
    (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY)
  );
  return Motion.animationResult(
    {
      x,
      y,
      centerX,
      centerY,
      offsetX: x - centerX,
      offsetY: y - centerY,
      distance: distanceFromCenter,
      moving: isMoving,
      velocity
    },
    t,
    loop,
    completed,
    state
  );
}
function followPath(points, closed = false, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
  if (!points || points.length < 2) {
    return this._createResult({ x: 0, y: 0 }, 0, loop, false);
  }
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  if (!state || !state.pathData) {
    const pathData = {
      segmentLengths: [],
      totalLength: 0,
      points: [...points]
    };
    for (let i = 0; i < points.length - 1; i++) {
      const p12 = points[i];
      const p22 = points[i + 1];
      const dx = p22[0] - p12[0];
      const dy = p22[1] - p12[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      pathData.segmentLengths.push(length);
      pathData.totalLength += length;
    }
    if (closed) {
      const p12 = points[points.length - 1];
      const p22 = points[0];
      const dx = p22[0] - p12[0];
      const dy = p22[1] - p12[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      pathData.segmentLengths.push(length);
      pathData.totalLength += length;
    }
    newState.pathData = pathData;
  }
  const { segmentLengths, totalLength, points: pathPoints } = newState.pathData;
  const targetDistance = easedT * totalLength;
  let distanceTraveled = 0;
  let segmentIndex = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    if (distanceTraveled + segmentLengths[i] >= targetDistance) {
      segmentIndex = i;
      break;
    }
    distanceTraveled += segmentLengths[i];
  }
  const segmentProgress = (targetDistance - distanceTraveled) / segmentLengths[segmentIndex];
  const p1 = pathPoints[segmentIndex];
  const p2 = segmentIndex < pathPoints.length - 1 ? pathPoints[segmentIndex + 1] : pathPoints[0];
  const x = Tween.lerp(p1[0], p2[0], segmentProgress);
  const y = Tween.lerp(p1[1], p2[1], segmentProgress);
  const angle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
  return Motion.animationResult(
    {
      x,
      y,
      angle,
      segmentIndex,
      segmentProgress,
      pathProgress: easedT
    },
    t,
    loop,
    completed,
    newState
  );
}
function orbitV1(centerX, centerY, radiusX, radiusY, startAngle, elapsedTime, duration, loop = true, clockwise = true, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  const direction = clockwise ? 1 : -1;
  const angle = startAngle + direction * easedT * Math.PI * 2;
  const x = centerX + radiusX * Math.cos(angle);
  const y = centerY + radiusY * Math.sin(angle);
  return Motion.animationResult({ x, y, angle }, t, loop, completed, newState);
}
function oscillateV1(min, max, elapsedTime, duration, loop = true, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  const amplitude = (max - min) / 2;
  const center = min + amplitude;
  const value = center + amplitude * Math.sin(easedT * Math.PI * 2);
  return Motion.animationResult({ value }, t, loop, completed, newState);
}
function parabolicV1(start, peak, end, elapsedTime, duration, loop = false, yoyo = false, easingFn = null, callbacks = {}, state = null) {
  if (!state) {
    state = {
      started: false,
      loopCount: 0,
      direction: 1,
      // 1 = forward, -1 = backward (for yoyo)
      lastDirection: 1,
      completed: false
    };
  }
  let t = duration > 0 ? elapsedTime / duration : 1;
  let completed = false;
  let activeCallbacks = { ...callbacks };
  if (yoyo || loop) {
    if (loop) {
      if (yoyo) {
        const fullCycle = duration * 2;
        const cycleTime = elapsedTime % fullCycle;
        const cycleCount = Math.floor(elapsedTime / fullCycle);
        const newDirection = cycleTime < duration ? 1 : -1;
        t = newDirection === 1 ? cycleTime / duration : 2 - cycleTime / duration;
        if (newDirection !== state.direction) {
          state.direction = newDirection;
          if (state.direction === 1 && activeCallbacks.onLoop) {
            activeCallbacks.onLoop(cycleCount);
          }
        }
        if (cycleCount > state.loopCount) {
          state.loopCount = cycleCount;
        }
      } else {
        t = t % 1;
        const newLoopCount = Math.floor(elapsedTime / duration);
        if (newLoopCount > state.loopCount && activeCallbacks.onLoop) {
          activeCallbacks.onLoop(newLoopCount);
          state.loopCount = newLoopCount;
        }
      }
    } else if (yoyo && !loop) {
      if (t <= 1) {
        state.direction = 1;
      } else if (t <= 2) {
        t = 2 - t;
        state.direction = -1;
      } else {
        t = 0;
        completed = true;
        state.direction = 1;
      }
    }
  } else {
    if (t >= 1) {
      t = 1;
      completed = true;
    }
  }
  if (!state.started && activeCallbacks.onStart) {
    activeCallbacks.onStart();
    state.started = true;
  }
  if (completed && !state.completed && activeCallbacks.onComplete) {
    activeCallbacks.onComplete();
    state.completed = true;
  }
  const easedT = easingFn ? easingFn(t) : t;
  const a = start + end - 2 * peak;
  const b = 2 * (peak - start);
  const c = start;
  const value = a * easedT * easedT + b * easedT + c;
  const newState = {
    ...state,
    lastDirection: state.direction,
    completed: completed || state.completed
  };
  return Motion.animationResult(
    {
      value,
      direction: state.direction
      // Include current direction (1 = forward, -1 = backward)
    },
    t,
    loop || yoyo && !completed,
    completed,
    newState
  );
}
function patrolV1(initialX, initialY, elapsedTime, moveTime, waitTime, radius, loop = true, state = null) {
  if (!state) {
    state = {
      currentX: initialX,
      currentY: initialY,
      targetX: initialX,
      targetY: initialY,
      isWaiting: true,
      waitStartTime: 0,
      moveStartTime: 0,
      moveCount: 0,
      direction: "idle"
    };
  }
  const rand = () => Math.random();
  let isWaiting = state.isWaiting;
  let x = state.currentX;
  let y = state.currentY;
  let direction = state.direction;
  if (isWaiting) {
    if (elapsedTime - state.waitStartTime >= waitTime) {
      isWaiting = false;
      state.moveStartTime = elapsedTime;
      const directions = ["up", "down", "left", "right"];
      direction = directions[Math.floor(rand() * 4)];
      let newTargetX = state.currentX;
      let newTargetY = state.currentY;
      const moveDistance = radius * (0.2 + rand() * 0.6);
      switch (direction) {
        case "up":
          newTargetY = state.currentY - moveDistance;
          break;
        case "down":
          newTargetY = state.currentY + moveDistance;
          break;
        case "left":
          newTargetX = state.currentX - moveDistance;
          break;
        case "right":
          newTargetX = state.currentX + moveDistance;
          break;
      }
      const newDistSq = Math.pow(newTargetX - initialX, 2) + Math.pow(newTargetY - initialY, 2);
      if (newDistSq > radius * radius) {
        if (direction === "up" || direction === "down") {
          newTargetY = initialY;
          direction = state.currentY > initialY ? "up" : "down";
        } else {
          newTargetX = initialX;
          direction = state.currentX > initialX ? "left" : "right";
        }
      }
      state.targetX = newTargetX;
      state.targetY = newTargetY;
      state.direction = direction;
      state.moveCount++;
    }
  } else {
    const moveProgress = (elapsedTime - state.moveStartTime) / moveTime;
    if (moveProgress >= 1) {
      isWaiting = true;
      state.waitStartTime = elapsedTime;
      state.currentX = state.targetX;
      state.currentY = state.targetY;
      direction = "idle";
    } else {
      x = state.currentX + (state.targetX - state.currentX) * moveProgress;
      y = state.currentY + (state.targetY - state.currentY) * moveProgress;
    }
  }
  state.isWaiting = isWaiting;
  state.direction = direction;
  if (!isWaiting) {
    state.currentX = x;
    state.currentY = y;
  }
  const cycleTime = moveTime + waitTime;
  const t = elapsedTime % cycleTime / cycleTime;
  const distanceFromCenter = Math.sqrt(
    Math.pow(x - initialX, 2) + Math.pow(y - initialY, 2)
  );
  return Motion.animationResult(
    {
      x,
      y,
      moving: !isWaiting,
      direction,
      distanceFromCenter
    },
    t,
    loop,
    false,
    state
  );
}
function pendulumV1(originAngle, amplitude, elapsedTime, duration, loop = true, damped = false, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, null, callbacks, state);
  const decay = damped && !loop ? Math.exp(-4 * t) : 1;
  let angle = originAngle + amplitude * Math.cos(easedT * 2 * Math.PI) * decay;
  if (easingFn) {
    const normalized = (angle - originAngle) / (amplitude * decay);
    angle = originAngle + easingFn((normalized + 1) / 2) * amplitude * decay * 2 - amplitude * decay;
  }
  return Motion.animationResult({ angle }, t, loop, completed, newState);
}
function pulseV1(min, max, elapsedTime, duration, loop = true, yoyo = false, easingFn = null, callbacks = {}) {
  let t = elapsedTime / duration;
  let phase = "forward";
  if (loop) {
    const loopCount = Math.floor(t);
    t = t % 1;
    if (loopCount > 0 && callbacks.onLoop) {
      callbacks.onLoop(loopCount);
    }
  } else {
    if (t > 1) t = 1;
  }
  if (t > 0 && elapsedTime <= duration && callbacks.onStart) {
    callbacks.onStart();
  }
  let value;
  if (yoyo) {
    if (t < 0.5) {
      const adjustedT = t * 2;
      const easedT = easingFn ? easingFn(adjustedT) : adjustedT;
      value = min + (max - min) * easedT;
      phase = "forward";
    } else {
      const adjustedT = (t - 0.5) * 2;
      const easedT = easingFn ? easingFn(adjustedT) : adjustedT;
      value = max - (max - min) * easedT;
      phase = "return";
      if (t >= 0.5 && t < 0.51 && callbacks.onYoyoTurn) {
        callbacks.onYoyoTurn();
      }
    }
  } else {
    const easedT = easingFn ? easingFn(t) : t;
    const adjusted = easedT < 0.5 ? easedT * 2 : 2 - easedT * 2;
    value = min + (max - min) * adjusted;
  }
  const isDone = !loop && t >= 1;
  if (isDone && callbacks.onComplete) {
    callbacks.onComplete();
  }
  return Motion.animationResult({ value, phase }, t, loop, isDone);
}
function hopV1(baseY, hopHeight, elapsedTime, duration, loop = true, yoyo = true, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state, yoyo);
  let arc = 0;
  if (!loop && !yoyo) {
    arc = completed ? 1 : Math.sin(Math.min(t, 1) * Math.PI * 0.5);
  } else if (yoyo) {
    arc = Math.sin(easedT * Math.PI);
  } else {
    arc = Math.sin(Math.min(t, 1) * Math.PI * 0.5);
  }
  const y = baseY - hopHeight * arc;
  return Motion.animationResult({ y }, t, loop, completed, newState);
}
function shakeV1(centerX, centerY, maxOffsetX, maxOffsetY, frequency, decay, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  const intensity = Math.pow(1 - easedT, decay);
  const angleX = easedT * Math.PI * 2 * frequency;
  const angleY = easedT * Math.PI * 2 * frequency * 1.3;
  const xOffset = intensity * maxOffsetX * (Math.sin(angleX) * 0.6 + Math.sin(angleX * 2.5) * 0.3 + Math.sin(angleX * 5.6) * 0.1);
  const yOffset = intensity * maxOffsetY * (Math.cos(angleY) * 0.6 + Math.cos(angleY * 2.7) * 0.3 + Math.cos(angleY * 6.3) * 0.1);
  let x = centerX + xOffset;
  let y = centerY + yOffset;
  if (easedT > 0.9) {
    const returnT = (easedT - 0.9) / 0.1;
    x = centerX + xOffset * (1 - returnT);
    y = centerY + yOffset * (1 - returnT);
  }
  return Motion.animationResult(
    { x, y, intensity },
    t,
    loop,
    completed,
    newState
  );
}
function spiralV1(centerX, centerY, startRadius, endRadius, startAngle, revolutions, elapsedTime, duration, loop = false, yoyo = false, easingFn = null, callbacks = {}, state = null) {
  if (!state) {
    state = {
      started: false,
      loopCount: 0,
      direction: 1,
      // 1 = forward, -1 = backward (for yoyo)
      lastDirection: 1
    };
  }
  let t = duration > 0 ? elapsedTime / duration : 1;
  let completed = false;
  let activeCallbacks = { ...callbacks };
  if (yoyo || loop) {
    if (loop) {
      if (yoyo) {
        const fullCycle = duration * 2;
        const cycleTime = elapsedTime % fullCycle;
        const cycleCount = Math.floor(elapsedTime / fullCycle);
        const newDirection = cycleTime < duration ? 1 : -1;
        t = newDirection === 1 ? cycleTime / duration : 2 - cycleTime / duration;
        if (newDirection !== state.direction) {
          state.direction = newDirection;
          if (state.direction === 1 && activeCallbacks.onLoop) {
            activeCallbacks.onLoop(cycleCount);
          }
        }
        if (cycleCount > state.loopCount) {
          state.loopCount = cycleCount;
        }
      } else {
        t = t % 1;
        const newLoopCount = Math.floor(elapsedTime / duration);
        if (newLoopCount > state.loopCount && activeCallbacks.onLoop) {
          activeCallbacks.onLoop(newLoopCount);
          state.loopCount = newLoopCount;
        }
      }
    } else if (yoyo && !loop) {
      if (t <= 1) {
        state.direction = 1;
      } else if (t <= 2) {
        t = 2 - t;
        state.direction = -1;
      } else {
        t = 0;
        completed = true;
        state.direction = 1;
      }
    }
  } else {
    if (t >= 1) {
      t = 1;
      completed = true;
    }
  }
  if (!state.started && activeCallbacks.onStart) {
    activeCallbacks.onStart();
    state.started = true;
  }
  if (completed && !state.completed && activeCallbacks.onComplete) {
    activeCallbacks.onComplete();
    state.completed = true;
  }
  const easedT = easingFn ? easingFn(t) : t;
  const radius = Tween.lerp(startRadius, endRadius, easedT);
  const angle = startAngle + easedT * revolutions * Math.PI * 2;
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);
  const newState = {
    ...state,
    lastDirection: state.direction
  };
  return Motion.animationResult(
    {
      x,
      y,
      radius,
      angle,
      direction: state.direction
      // Include current direction (1 = forward, -1 = backward)
    },
    t,
    loop || yoyo && !completed,
    completed,
    newState
  );
}
function springV1(initial, target, elapsedTime, duration, loop = false, yoyo = false, springParams = {}, callbacks = {}) {
  if (duration <= 0) {
    return this.animationResult(
      { value: target, velocity: 0, done: true, phase: "complete" },
      1,
      false,
      true
    );
  }
  let t = elapsedTime / duration;
  let yoyoPhase = "forward";
  let loopCount = 0;
  if (loop) {
    loopCount = Math.floor(t);
    t = t % 1;
    if (loopCount > 0 && callbacks.onLoop) {
      callbacks.onLoop(loopCount);
    }
  } else {
    if (t > 1) t = 1;
  }
  if (t > 0 && elapsedTime <= duration && callbacks.onStart) {
    callbacks.onStart();
  }
  let currentTarget, currentInitial, adjustedT;
  if (yoyo) {
    if (t >= 0.5) {
      currentTarget = initial;
      currentInitial = target;
      adjustedT = (t - 0.5) * 2;
      yoyoPhase = "return";
      if (t >= 0.5 && t < 0.51 && callbacks.onYoyoTurn) {
        callbacks.onYoyoTurn();
      }
    } else {
      currentTarget = target;
      currentInitial = initial;
      adjustedT = t * 2;
      yoyoPhase = "forward";
    }
  } else {
    currentTarget = target;
    currentInitial = initial;
    adjustedT = t;
  }
  const stiffness = springParams.stiffness !== void 0 ? springParams.stiffness : 0.3;
  const damping = springParams.damping !== void 0 ? springParams.damping : 0.6;
  const amplitude = Math.max(0.1, 1 / (damping * 1.5));
  const period = Math.max(0.1, 0.8 / (stiffness * 1.5 + 0.5));
  let easedT;
  if (adjustedT < 0.99) {
    easedT = Easing.easeOutElastic(adjustedT, amplitude, period);
  } else {
    const blendFactor = (adjustedT - 0.99) / 0.01;
    const elasticT = Easing.easeOutElastic(0.99, amplitude, period);
    easedT = elasticT * (1 - blendFactor) + 1 * blendFactor;
  }
  const position = Tween.lerp(currentInitial, currentTarget, easedT);
  const dt = 0.01;
  const nextT = Math.min(adjustedT + dt, 1);
  let nextEasedT;
  if (nextT < 0.99) {
    nextEasedT = Easing.easeOutElastic(nextT, amplitude, period);
  } else {
    const blendFactor = (nextT - 0.99) / 0.01;
    const elasticT = Easing.easeOutElastic(0.99, amplitude, period);
    nextEasedT = elasticT * (1 - blendFactor) + 1 * blendFactor;
  }
  const nextPosition = Tween.lerp(currentInitial, currentTarget, nextEasedT);
  const velocity = (nextPosition - position) / dt * duration;
  const isDone = !loop && t >= 1;
  if (isDone && callbacks.onComplete) {
    callbacks.onComplete();
  }
  return Motion.animationResult(
    {
      value: position,
      velocity,
      delta: yoyoPhase === "forward" ? target - position : initial - position,
      done: isDone,
      phase: yoyoPhase
    },
    t,
    loop,
    isDone
  );
}
function swingV1(centerX, centerY, maxAngle, elapsedTime, duration, loop = true, yoyo = true, easingFn = null, callbacks = {}, state = null) {
  const {
    t,
    easedT,
    completed,
    state: newState
  } = Motion._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
  const phase = yoyo ? Math.sin(easedT * Math.PI * 2) : Math.sin(easedT * Math.PI);
  const angle = phase * maxAngle;
  return Motion.animationResult({ angle }, t, loop, completed, newState);
}
function waypointV1(target, elapsedTime, waypoints, speed, waitTime, loop = true, callbacks = {}, state = null) {
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
    console.warn("Patrol animation requires at least 2 waypoints");
    return Motion._createResult(
      { x: 0, y: 0, moving: false, direction: "idle", waypoint: 0 },
      0,
      false,
      true
    );
  }
  if (!state) {
    state = {
      currentWaypoint: 0,
      nextWaypoint: 1,
      isWaiting: true,
      waitStartTime: 0,
      lastWaypointTime: 0,
      lastWaypointReached: -1,
      completed: false
    };
  }
  let totalPathLength = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const nextIndex = (i + 1) % waypoints.length;
    if (!loop && i === waypoints.length - 1) break;
    const dx = waypoints[nextIndex][0] - waypoints[i][0];
    const dy = waypoints[nextIndex][1] - waypoints[i][1];
    totalPathLength += Math.abs(dx) + Math.abs(dy);
  }
  const moveTime = totalPathLength / speed;
  const totalWaitTime = waitTime * waypoints.length;
  const cycleTime = moveTime + totalWaitTime;
  let normalizedTime = elapsedTime;
  if (loop) {
    normalizedTime = elapsedTime % cycleTime;
  } else {
    normalizedTime = Math.min(elapsedTime, cycleTime);
  }
  const t = normalizedTime / cycleTime;
  let timeRemaining = normalizedTime;
  let currentWaypoint = 0;
  let nextWaypoint = 1;
  let isWaiting = true;
  let waitProgress = 0;
  let segmentProgress = 0;
  let completed = false;
  if (timeRemaining < waitTime) {
    waitProgress = timeRemaining / waitTime;
    currentWaypoint = 0;
    nextWaypoint = 1;
    isWaiting = true;
  } else {
    timeRemaining -= waitTime;
    for (let i = 0; i < waypoints.length; i++) {
      if (!loop && i === waypoints.length - 1) {
        currentWaypoint = i;
        nextWaypoint = i;
        isWaiting = true;
        waitProgress = 1;
        completed = true;
        break;
      }
      const nextIndex = (i + 1) % waypoints.length;
      const dx = waypoints[nextIndex][0] - waypoints[i][0];
      const dy = waypoints[nextIndex][1] - waypoints[i][1];
      const segmentLength = Math.abs(dx) + Math.abs(dy);
      const segmentTime = segmentLength / speed;
      if (timeRemaining < segmentTime) {
        currentWaypoint = i;
        nextWaypoint = nextIndex;
        isWaiting = false;
        segmentProgress = timeRemaining / segmentTime;
        break;
      }
      timeRemaining -= segmentTime;
      if (timeRemaining < waitTime) {
        currentWaypoint = nextIndex;
        nextWaypoint = (nextIndex + 1) % waypoints.length;
        isWaiting = true;
        waitProgress = timeRemaining / waitTime;
        if (state.lastWaypointReached !== currentWaypoint) {
          if (callbacks.onWaypointReached) {
            callbacks.onWaypointReached(currentWaypoint);
          }
          if (callbacks.onWaitStart) {
            callbacks.onWaitStart(currentWaypoint);
          }
          state.lastWaypointReached = currentWaypoint;
        }
        break;
      }
      timeRemaining -= waitTime;
    }
  }
  let x, y, direction;
  if (isWaiting || completed) {
    x = waypoints[currentWaypoint][0];
    y = waypoints[currentWaypoint][1];
    direction = "idle";
    if (!state.isWaiting && isWaiting && callbacks.onWaitEnd) {
      callbacks.onWaitEnd(currentWaypoint);
    }
  } else {
    const current = waypoints[currentWaypoint];
    const next = waypoints[nextWaypoint];
    const dx = next[0] - current[0];
    const dy = next[1] - current[1];
    const totalDistance = Math.abs(dx) + Math.abs(dy);
    const horizontalRatio = Math.abs(dx) / totalDistance;
    if (segmentProgress <= horizontalRatio && dx !== 0) {
      const horizontalProgress = segmentProgress / horizontalRatio;
      x = current[0] + dx * horizontalProgress;
      y = current[1];
      direction = dx > 0 ? "right" : "left";
    } else {
      const verticalProgress = (segmentProgress - horizontalRatio) / (1 - horizontalRatio);
      x = next[0];
      y = current[1] + dy * verticalProgress;
      direction = dy > 0 ? "down" : "up";
    }
  }
  state.currentWaypoint = currentWaypoint;
  state.nextWaypoint = nextWaypoint;
  state.isWaiting = isWaiting;
  if (!state.completed && completed && callbacks.onPatrolComplete) {
    callbacks.onPatrolComplete();
    state.completed = true;
  }
  return Motion.animationResult(
    {
      x,
      y,
      moving: !isWaiting,
      waiting: isWaiting,
      waitProgress: isWaiting ? waitProgress : 0,
      direction,
      waypoint: currentWaypoint,
      nextWaypoint
    },
    t,
    loop,
    completed,
    state
  );
}
class Motion {
  /**
   * Base animation result constructor
   * Creates a standardized result object for all animations
   *
   * @param {Object} values - The calculated animation values
   * @param {number} t - Current normalized time (0-1)
   * @param {boolean} loop - Whether the animation is looping
   * @param {boolean} completed - Whether a non-looping animation has completed
   * @param {Object} state - Internal state object for continuity between calls
   * @returns {Object} Standardized animation result
   */
  static animationResult(values, t, loop, completed = false, state = null) {
    return {
      ...values,
      // Animation-specific values (x, y, value, etc.)
      t,
      // Normalized time (0-1)
      progress: t,
      // Alias for normalized time
      loop,
      // Whether animation is looping
      completed,
      // Whether animation has completed (non-looping only)
      state
      // Internal state for the next call
    };
  }
  /**
   * Processes time and calculates normalized t value
   * Handles looping, duration, and triggers callbacks
   *
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one animation cycle in seconds
   * @param {boolean} loop - Whether animation should loop
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onStart] - Called when animation starts
   * @param {Function} [callbacks.onComplete] - Called when animation completes
   * @param {Function} [callbacks.onLoop] - Called when animation loops
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} { t, completed, state }
   */
  static _step(elapsedTime, duration, loop, callbacks = {}, state = { started: false, loopCount: 0 }) {
    let t = duration > 0 ? elapsedTime / duration : 1;
    let completed = false;
    state = state || { started: false, loopCount: 0 };
    if (!state.started && callbacks.onStart) {
      callbacks.onStart();
      state.started = true;
    }
    if (loop) {
      t = t % 1;
      const newLoopCount = Math.floor(elapsedTime / duration);
      if (newLoopCount > state.loopCount && callbacks.onLoop) {
        callbacks.onLoop(newLoopCount);
        state.loopCount = newLoopCount;
      }
    } else {
      if (t >= 1) {
        t = 1;
        completed = true;
        if (!state.completed && callbacks.onComplete) {
          callbacks.onComplete();
          state.completed = true;
        }
      }
    }
    return { t, completed, state };
  }
  /**
   * Updates animation time and applies easing
   *
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} loop - Whether animation should loop
   * @param {Function} [easingFn=null] - Easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} { t, easedT, completed, state }
   */
  static _frame(elapsedTime, duration, loop, easingFn = null, callbacks = {}, state = null) {
    const {
      t,
      completed,
      state: newState
    } = this._step(elapsedTime, duration, loop, callbacks, state);
    const easedT = easingFn ? easingFn(t) : t;
    return { t, easedT, completed, state: newState };
  }
  /**
   * Oscillate between min and max value using sine
   *
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full oscillation in seconds
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with value and metadata
   */
  static oscillate(min, max, elapsedTime, duration, loop = true, easingFn = null, callbacks = {}, state = null) {
    return oscillateV1(
      min,
      max,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Parabolic arc interpolation
   *
   * @param {number} start - Start value
   * @param {number} peak - Peak value
   * @param {number} end - End value
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop (restart from beginning)
   * @param {boolean} [yoyo=false] - Whether animation should reverse direction at the end
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with value and metadata
   */
  static parabolic(start, peak, end, elapsedTime, duration, loop = false, yoyo = false, easingFn = null, callbacks = {}, state = null) {
    return parabolicV1(
      start,
      peak,
      end,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Patrol animation - creates movement around an area with natural pausing
   * Perfect for characters patrolling or objects drifting within bounds
   *
   * @param {Object} target - Object with x,y properties defining the center point
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full float cycle in seconds
   * @param {number} speed - Movement speed multiplier (0.1-2.0 recommended)
   * @param {number} randomness - How random/unpredictable the float path is (0-1)
   * @param {number} radius - Radius of float area (object will move within -radius to +radius)
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks and initial position
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static float(target, elapsedTime, duration, speed, randomness, radius, loop = true, easingFn = null, callbacks = {}, state = null) {
    return floatV1(
      target,
      elapsedTime,
      duration,
      speed,
      randomness,
      radius,
      loop,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Spring animation that uses elastic easing functions for a bouncy spring effect
   * Stateless implementation that doesn't require previous frame state
   *
   * @param {number} initial - Initial value (starting position)
   * @param {number} target - Target value (ending position)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one complete cycle in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {boolean} [yoyo=false] - Whether animation should return to initial value
   * @param {Object} [springParams] - Spring parameters
   * @param {number} [springParams.stiffness=0.3] - Spring stiffness (0-1)
   * @param {number} [springParams.damping=0.6] - Damping factor (0-1)
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onStart] - Called when animation starts
   * @param {Function} [callbacks.onComplete] - Called when animation completes
   * @param {Function} [callbacks.onLoop] - Called when animation loops
   * @param {Function} [callbacks.onYoyoTurn] - Called when yoyo animation changes direction
   * @returns {Object} Animation result with value, velocity and metadata
   */
  static spring(initial, target, elapsedTime, duration, loop = false, yoyo = false, springParams = {}, callbacks = {}) {
    return springV1(
      initial,
      target,
      elapsedTime,
      duration,
      loop,
      yoyo,
      springParams,
      callbacks
    );
  }
  static swing(centerX, centerY, maxAngle, elapsedTime, duration, loop = true, yoyo = true, easingFn = null, callbacks = {}, state = null) {
    return swingV1(
      centerX,
      centerY,
      maxAngle,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }
  static pendulum(originAngle, amplitude, elapsedTime, duration, loop = true, damped = false, easingFn = null, callbacks = {}, state = null) {
    return pendulumV1(
      originAngle,
      amplitude,
      elapsedTime,
      duration,
      loop,
      damped,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Pulse between min and max value and back
   *
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full pulse in seconds
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {boolean} [yoyo=false] - Whether to use separate easing for return journey
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @returns {Object} Animation result with value and metadata
   */
  static pulse(min, max, elapsedTime, duration, loop = true, yoyo = false, easingFn = null, callbacks = {}) {
    return pulseV1(
      min,
      max,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks = {}
    );
  }
  /**
   * Spiral motion animation
   *
   * @param {number} centerX - X coordinate of spiral center
   * @param {number} centerY - Y coordinate of spiral center
   * @param {number} startRadius - Starting radius of the spiral
   * @param {number} endRadius - Ending radius of the spiral
   * @param {number} startAngle - Starting angle in radians
   * @param {number} revolutions - Number of complete revolutions
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop (restart from beginning)
   * @param {boolean} [yoyo=false] - Whether animation should reverse direction at the end
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static spiral(centerX, centerY, startRadius, endRadius, startAngle, revolutions, elapsedTime, duration, loop = false, yoyo = false, easingFn = null, callbacks = {}, state = null) {
    return spiralV1(
      centerX,
      centerY,
      startRadius,
      endRadius,
      startAngle,
      revolutions,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Orbit motion animation (circular or elliptical)
   *
   * @param {number} centerX - X coordinate of orbit center
   * @param {number} centerY - Y coordinate of orbit center
   * @param {number} radiusX - X radius of the orbit (horizontal)
   * @param {number} radiusY - Y radius of the orbit (vertical)
   * @param {number} startAngle - Starting angle in radians
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of one full orbit in seconds
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {boolean} [clockwise=true] - Direction of orbit
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static orbit(centerX, centerY, radiusX, radiusY, startAngle, elapsedTime, duration, loop = true, clockwise = true, easingFn = null, callbacks = {}, state = null) {
    return orbitV1(
      centerX,
      centerY,
      radiusX,
      radiusY,
      startAngle,
      elapsedTime,
      duration,
      loop,
      clockwise,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Bezier curve motion animation with yoyo support
   *
   * @param {Array<number>} p0 - Start point [x, y]
   * @param {Array<number>} p1 - Control point 1 [x, y]
   * @param {Array<number>} p2 - Control point 2 [x, y]
   * @param {Array<number>} p3 - End point [x, y]
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {boolean} [yoyo=false] - Whether animation should return to start
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static bezier(p0, p1, p2, p3, elapsedTime, duration, loop = false, yoyo = false, easingFn = null, callbacks = {}, state = null) {
    return bezierV1(
      p0,
      p1,
      p2,
      p3,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Bounce animation - object drops and bounces with diminishing height
   *
   * @param {number} maxHeight - Maximum height (negative y value)
   * @param {number} groundY - Ground position (positive y value)
   * @param {number} bounceCount - Number of bounces to perform
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with y position and metadata
   */
  static bounce(maxHeight, groundY, bounceCount, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
    return bounceV1(
      maxHeight,
      groundY,
      bounceCount,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Shake animation with decreasing intensity
   *
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} maxOffsetX - Maximum X offset
   * @param {number} maxOffsetY - Maximum Y offset
   * @param {number} frequency - Frequency of shakes
   * @param {number} decay - How quickly the shake decreases (0-1)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks
   * @returns {Object} Animation result with x, y coordinates and metadata
   */
  static shake(centerX, centerY, maxOffsetX, maxOffsetY, frequency, decay, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
    return shakeV1(
      centerX,
      centerY,
      maxOffsetX,
      maxOffsetY,
      frequency,
      decay,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }
  static follow(points, closed = false, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
    return followPath(
      points,
      closed,
      elapsedTime,
      duration,
      loop,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * Waypoint is a patrol animation that follows a path of waypoints with proper waiting periods
   * Moves characters along cardinal directions (horizontal and vertical movement)
   *
   * @param {Object} target - Object with x,y properties (not used for position calculation)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {Array<Array<number>>} waypoints - Array of waypoints [[x1,y1], [x2,y2], ...]
   * @param {number} speed - Movement speed in units per second
   * @param {number} waitTime - Time to wait at each waypoint in seconds
   * @param {boolean} [loop=true] - Whether patrol should loop back to start
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Function} [callbacks.onWaypointReached] - Called when reaching a waypoint
   * @param {Function} [callbacks.onWaitStart] - Called when starting to wait at a waypoint
   * @param {Function} [callbacks.onWaitEnd] - Called when done waiting at a waypoint
   * @param {Function} [callbacks.onPatrolComplete] - Called when patrol is complete (non-looping only)
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result with position and patrol metadata
   */
  static waypoint(target, elapsedTime, waypoints, speed, waitTime, loop = true, callbacks = {}, state = null) {
    return waypointV1(
      target,
      elapsedTime,
      waypoints,
      speed,
      waitTime,
      loop,
      callbacks,
      state
    );
  }
  /**
   * Simple patrol animation that moves randomly within a radius
   * Character moves along cardinal directions with waiting periods
   *
   * @param {number} initialX - Initial X position (center point)
   * @param {number} initialY - Initial Y position (center point)
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} moveTime - Time to spend moving between points
   * @param {number} waitTime - Time to wait at each point
   * @param {number} radius - Maximum distance from center point
   * @param {boolean} [loop=true] - Whether animation should loop
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result with position and direction
   */
  static patrol(initialX, initialY, elapsedTime, moveTime, waitTime, radius, loop = true, state = null) {
    return patrolV1(
      initialX,
      initialY,
      elapsedTime,
      moveTime,
      waitTime,
      radius,
      loop,
      state
    );
  }
  /**
   * Hop animation - makes the object jump up and down rhythmically
   *
   * @param {number} baseY - The ground/base Y position
   * @param {number} hopHeight - Maximum height (negative Y offset)
   * @param {number} elapsedTime - Elapsed time in seconds
   * @param {number} duration - Duration of one hop (up and down)
   * @param {boolean} [loop=true] - Whether the hop repeats
   * @param {Function} [easingFn=null] - Optional easing for jump arc
   * @param {Object} [callbacks={}] - Optional callback functions
   * @param {Object} [state=null] - Internal state
   * @returns {Object} Animation result with y position
   */
  static hop(baseY, hopHeight, elapsedTime, duration, loop = true, yoyo = true, easingFn = null, callbacks = {}, state = null) {
    return hopV1(
      baseY,
      hopHeight,
      elapsedTime,
      duration,
      loop,
      yoyo,
      easingFn,
      callbacks,
      state
    );
  }
  /**
   * !!!!
   * ANIMATION GROUPING
   * VERY MUCH EXPERIMENTAL AT THIS POINT
   * !!!!
   */
  /**
   * Group multiple animations together
   *
   * @param {Array<Function>} animations - Array of animation function references
   * @param {Array<Array>} animationArgs - Array of argument arrays for each animation
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {number} duration - Duration of animation in seconds
   * @param {boolean} [loop=false] - Whether animation should loop
   * @param {Function} [easingFn=null] - Optional easing function to apply to all animations
   * @param {Object} [callbacks] - Optional callback functions
   * @param {Object} [state] - Internal state tracking for callbacks and animations
   * @returns {Object} Combined animation result with results from all animations
   */
  static group(animations, animationArgs, elapsedTime, duration, loop = false, easingFn = null, callbacks = {}, state = null) {
    if (!state) {
      state = {
        started: false,
        loopCount: 0,
        animationStates: Array(animations.length).fill(null)
      };
    }
    const {
      t,
      easedT,
      completed,
      state: newState
    } = this._frame(elapsedTime, duration, loop, easingFn, callbacks, state);
    const results = {};
    for (let i = 0; i < animations.length; i++) {
      const animFn = animations[i];
      const args = [...animationArgs[i]];
      if (animFn === this.parabolic || animFn === this.oscillate || animFn === this.pulse) {
        args[3] = elapsedTime;
        args[4] = duration;
        args[5] = loop;
        if (args[6] === void 0) args[6] = easingFn;
      } else if (animFn === this.spring) {
        args[2] = elapsedTime;
        args[3] = duration;
        args[4] = loop;
      } else if (animFn === this.spiral || animFn === this.bezier) {
        args[6] = elapsedTime;
        args[7] = duration;
        args[8] = loop;
        if (args[9] === void 0) args[9] = easingFn;
      } else if (animFn === this.orbit) {
        args[5] = elapsedTime;
        args[6] = duration;
        args[7] = loop;
        if (args[9] === void 0) args[9] = easingFn;
      } else if (animFn === this.bounce || animFn === this.shake) {
        args[6] = elapsedTime;
        args[7] = duration;
        args[8] = loop;
        if (args[9] === void 0) args[9] = easingFn;
      } else if (animFn === this.followPath) {
        args[2] = elapsedTime;
        args[3] = duration;
        args[4] = loop;
        if (args[5] === void 0) args[5] = easingFn;
      }
      args.push(callbacks);
      args.push(newState.animationStates[i]);
      const result = animFn.apply(this, args);
      newState.animationStates[i] = result.state;
      const key = `anim${i}`;
      results[key] = result;
    }
    return this.animationResult(results, t, loop, completed, newState);
  }
  /**
   * Sequence multiple animations one after another
   *
   * @param {Array<Function>} animations - Array of animation function references
   * @param {Array<Array>} animationArgs - Array of argument arrays for each animation
   * @param {Array<number>} durations - Array of durations for each animation
   * @param {number} elapsedTime - Total elapsed time in seconds
   * @param {boolean} [loop=false] - Whether the entire sequence should loop
   * @param {Array<Function>} [easingFns=null] - Optional array of easing functions for each animation
   * @param {Object} [callbacks] - Optional callback functions for the entire sequence
   * @param {Object} [animCallbacks] - Optional array of callback objects for individual animations
   * @param {Object} [state] - Internal state tracking
   * @returns {Object} Animation result from current active animation with sequence metadata
   */
  static sequence(animations, animationArgs, durations, elapsedTime, loop = false, easingFns = null, callbacks = {}, animCallbacks = null, state = null) {
    if (!state) {
      state = {
        started: false,
        loopCount: 0,
        animationStates: Array(animations.length).fill(null),
        currentAnim: 0,
        animStartTimes: [0],
        totalDuration: 0
      };
      let timeAccumulator = 0;
      for (let i = 0; i < durations.length; i++) {
        timeAccumulator += durations[i];
        if (i < durations.length - 1) {
          state.animStartTimes.push(timeAccumulator);
        }
      }
      state.totalDuration = timeAccumulator;
    }
    let localElapsedTime = elapsedTime;
    if (loop && state.totalDuration > 0) {
      localElapsedTime = elapsedTime % state.totalDuration;
      const newLoopCount = Math.floor(elapsedTime / state.totalDuration);
      if (newLoopCount > state.loopCount && callbacks.onLoop) {
        callbacks.onLoop(newLoopCount);
        state.loopCount = newLoopCount;
      }
    }
    if (!state.started && callbacks.onStart) {
      callbacks.onStart();
      state.started = true;
    }
    let currentAnim = 0;
    for (let i = animations.length - 1; i >= 0; i--) {
      if (localElapsedTime >= state.animStartTimes[i]) {
        currentAnim = i;
        break;
      }
    }
    state.currentAnim = currentAnim;
    const animStartTime = state.animStartTimes[currentAnim];
    const animElapsedTime = localElapsedTime - animStartTime;
    const animDuration = durations[currentAnim];
    const animFn = animations[currentAnim];
    const args = [...animationArgs[currentAnim]];
    if (animFn === this.parabolic || animFn === this.oscillate || animFn === this.pulse) {
      args[3] = animElapsedTime;
      args[4] = animDuration;
      args[5] = false;
      if (easingFns && easingFns[currentAnim]) args[6] = easingFns[currentAnim];
    } else if (animFn === this.spring) {
      args[2] = animElapsedTime;
      args[3] = animDuration;
      args[4] = false;
    } else if (animFn === this.spiral || animFn === this.bezier) {
      args[6] = animElapsedTime;
      args[7] = animDuration;
      args[8] = false;
      if (easingFns && easingFns[currentAnim]) args[9] = easingFns[currentAnim];
    } else if (animFn === this.orbit) {
      args[5] = animElapsedTime;
      args[6] = animDuration;
      args[7] = false;
      if (easingFns && easingFns[currentAnim]) args[9] = easingFns[currentAnim];
    } else if (animFn === this.bounce || animFn === this.shake) {
      args[6] = animElapsedTime;
      args[7] = animDuration;
      args[8] = false;
      if (easingFns && easingFns[currentAnim]) args[9] = easingFns[currentAnim];
    } else if (animFn === this.followPath) {
      args[2] = animElapsedTime;
      args[3] = animDuration;
      args[4] = false;
      if (easingFns && easingFns[currentAnim]) args[5] = easingFns[currentAnim];
    }
    const currentAnimCallbacks = animCallbacks && animCallbacks[currentAnim] ? animCallbacks[currentAnim] : {};
    const result = animFn.apply(this, [
      ...args,
      currentAnimCallbacks,
      state.animationStates[currentAnim]
    ]);
    state.animationStates[currentAnim] = result.state;
    const completed = !loop && localElapsedTime >= state.totalDuration;
    if (completed && !state.completed && callbacks.onComplete) {
      callbacks.onComplete();
      state.completed = true;
    }
    return this.animationResult(
      {
        ...result,
        currentAnim,
        totalAnimations: animations.length,
        sequenceProgress: Math.min(localElapsedTime / state.totalDuration, 1)
      },
      localElapsedTime / state.totalDuration,
      // t normalized to entire sequence
      loop,
      completed,
      state
    );
  }
}
function bezierV1(p0, p1, p2, p3, elapsedTime, duration, loop = false, yoyo = false, easingFn = null, callbacks = {}, state = null) {
  if (duration <= 0) {
    return Motion.animationResult(
      { x: p3[0], y: p3[1], phase: "complete" },
      1,
      false,
      true
    );
  }
  let t = elapsedTime / duration;
  let yoyoPhase = "forward";
  let loopCount = 0;
  if (loop) {
    loopCount = Math.floor(t);
    t = t % 1;
    if (loopCount > 0 && callbacks.onLoop) {
      callbacks.onLoop(loopCount);
    }
  } else {
    if (t > 1) t = 1;
  }
  if (t > 0 && elapsedTime <= duration && callbacks.onStart) {
    callbacks.onStart();
  }
  const easedT = easingFn ? easingFn(t) : t;
  let adjustedT = easedT;
  if (yoyo) {
    if (t >= 0.5) {
      adjustedT = 1 - (t - 0.5) * 2;
      yoyoPhase = "return";
      if (t >= 0.5 && t < 0.51 && callbacks.onYoyoTurn) {
        callbacks.onYoyoTurn();
      }
    } else {
      adjustedT = t * 2;
      yoyoPhase = "forward";
    }
    adjustedT = easingFn ? easingFn(adjustedT) : adjustedT;
  }
  const cx = 3 * (p1[0] - p0[0]);
  const bx = 3 * (p2[0] - p1[0]) - cx;
  const ax = p3[0] - p0[0] - cx - bx;
  const cy = 3 * (p1[1] - p0[1]);
  const by = 3 * (p2[1] - p1[1]) - cy;
  const ay = p3[1] - p0[1] - cy - by;
  const x = ax * Math.pow(adjustedT, 3) + bx * Math.pow(adjustedT, 2) + cx * adjustedT + p0[0];
  const y = ay * Math.pow(adjustedT, 3) + by * Math.pow(adjustedT, 2) + cy * adjustedT + p0[1];
  const isDone = !loop && t >= 1;
  if (isDone && callbacks.onComplete) {
    callbacks.onComplete();
  }
  return Motion.animationResult(
    { x, y, phase: yoyoPhase },
    t,
    loop,
    isDone,
    state
  );
}
class Tweenetik {
  /**
   * @param {Object} target - The object whose properties will be tweened.
   * @param {Object} toProps - An object containing the property values we want to end up at (e.g. { x: 100, y: 200 }).
   * @param {number} duration - How long (in seconds) the tween should take.
   * @param {Function} easingFn - One of the easing functions from the Tween class (e.g. Easing.easeOutBounce).
   * @param {Object} [options]
   * @param {number} [options.delay=0] - Delay in seconds before starting.
   * @param {Function} [options.onStart] - Callback invoked once when the tween actually begins.
   * @param {Function} [options.onComplete] - Callback invoked once when the tween finishes.
   * @param {Function} [options.onUpdate] - Callback invoked every frame (after the object’s properties are updated).
   */
  constructor(target, toProps, duration, easingFn, options = {}) {
    this.target = target;
    this.toProps = { ...toProps };
    this.duration = duration;
    this.easingFn = easingFn || Easing.easeOutQuad;
    this.delay = options.delay || 0;
    this.onStart = options.onStart || null;
    this.onComplete = options.onComplete || null;
    this.onUpdate = options.onUpdate || null;
    this._elapsed = 0;
    this._started = false;
    this._finished = false;
    this._startProps = {};
    for (const prop in this.toProps) {
      if (prop in this.target) {
        this._startProps[prop] = this.target[prop];
      }
    }
  }
  /**
   * Creates and registers a new Tweenetik instance in the global list.
   * @param {Object} target
   * @param {Object} toProps
   * @param {number} duration
   * @param {Function} easingFn
   * @param {Object} [options]
   */
  static to(target, toProps, duration, easingFn, options) {
    const tween = new Tweenetik(target, toProps, duration, easingFn, options);
    Tweenetik._active.push(tween);
    return tween;
  }
  /**
   * Updates this tween by the given delta time (in seconds).
   * @param {number} dt
   */
  update(dt) {
    if (this._finished) return;
    this._elapsed += dt;
    if (this._elapsed < this.delay) {
      return;
    }
    const timeSinceDelay = this._elapsed - this.delay;
    const t = Math.min(timeSinceDelay / this.duration, 1);
    if (!this._started && t > 0) {
      this._started = true;
      if (this.onStart) {
        this.onStart();
      }
    }
    const eased = this.easingFn(t);
    for (const prop in this._startProps) {
      const startVal = this._startProps[prop];
      const endVal = this.toProps[prop];
      this.target[prop] = Tween.lerp(startVal, endVal, eased);
    }
    if (this.onUpdate) {
      this.onUpdate();
    }
    if (t >= 1) {
      this._finished = true;
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }
  /**
   * Update all active tweens by dt. Call this once each frame in your main loop.
   * @param {number} dt
   */
  static updateAll(dt) {
    for (const tween of Tweenetik._active) {
      tween.update(dt);
    }
    Tweenetik._active = Tweenetik._active.filter((t) => !t._finished);
  }
}
class Pipeline extends Loggable {
  /**
   * Create a new Pipeline.
   * @param {Game} game - A reference to the main Game instance.
   */
  constructor(game) {
    super();
    this.game = game;
    this._collection = new ZOrderedCollection();
    this._collection._owner = this;
    const types = ["inputdown", "inputup", "inputmove", "click"];
    types.forEach((type) => {
      this.game.events.on(type, (e) => {
        this.dispatchInputEvent(type, e);
      });
    });
  }
  /**
   * Internal helper to check if a single GameObject is hovered, and emit
   * mouseover/mouseout as needed.
   * @param {GameObject} obj - The object to hover-test.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _hoverObject(obj, e) {
    if (!obj.interactive || !obj._hitTest) return;
    const hit = obj._hitTest(e.x, e.y);
    if (hit && !obj._hovered) {
      obj._hovered = true;
      obj.events.emit("mouseover", e);
    } else if (!hit && obj._hovered) {
      obj._hovered = false;
      obj.events.emit("mouseout", e);
    }
  }
  /**
   * Recursively checks all children of a Scene for hover state.
   * @param {Scene} scene - The scene whose children will be hover-tested.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _hoverScene(scene, e) {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child instanceof Scene) {
        this._hoverScene(child, e);
      } else {
        this._hoverObject(child, e);
      }
    }
  }
  /**
   * Dispatch a pointer event (inputdown, inputup, inputmove) to the first
   * GameObject that is hit, or to Scenes that can recursively handle children.
   * Also triggers _dispatchHover if needed.
   * @param {string} type - Event type (e.g., "inputdown", "inputup", "inputmove").
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   */
  dispatchInputEvent(type, e) {
    var _a;
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      if (obj instanceof Scene) {
        if (this._dispatchToScene(obj, type, e)) {
          break;
        }
      } else if (obj.interactive && ((_a = obj._hitTest) == null ? void 0 : _a.call(obj, e.x, e.y))) {
        obj.events.emit(type, e);
        break;
      }
    }
    if (type === "inputmove") {
      this._dispatchHover(e);
    }
  }
  /**
   * After handling inputmove at the top level, this updates hover states
   * for all interactive objects, including children in Scenes.
   * @param {object} e - Event data containing pointer coordinates (e.x, e.y).
   * @private
   */
  _dispatchHover(e) {
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      if (obj instanceof Scene) {
        this._hoverScene(obj, e);
      } else {
        this._hoverObject(obj, e);
      }
    }
  }
  /**
   * Recursively dispatch an event to a Scene and possibly its nested child Scenes.
   * @param {Scene} scene - The scene to dispatch the event to.
   * @param {string} type - The type of pointer event ("inputdown", "inputup", etc).
   * @param {object} e - Event data with pointer coordinates.
   * @returns {boolean} True if the event was handled by a child, false otherwise.
   * @private
   */
  _dispatchToScene(scene, type, e) {
    var _a;
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const child = scene.children[i];
      if (child instanceof Scene) {
        const hit = this._dispatchToScene(child, type, e);
        if (hit) {
          return true;
        }
      } else if (child.interactive && ((_a = child._hitTest) == null ? void 0 : _a.call(child, e.x, e.y))) {
        child.events.emit(type, e);
        return true;
      }
    }
    return false;
  }
  /**
   * Add a GameObject to the pipeline so it will be updated and rendered each frame.
   * @param {GameObject} gameObject - The game object to add.
   * @returns {GameObject} Returns the same object for convenience.
   */
  add(gameObject) {
    gameObject.parent = this.game;
    const go = this._collection.add(gameObject);
    if (go.init) {
      go.init();
    }
    return go;
  }
  /**
   * Remove a GameObject from the pipeline.
   * @param {GameObject} gameObject - The object to remove.
   */
  remove(gameObject) {
    if (gameObject === void 0 || gameObject === null) {
      this.logger.warn("Cannot remove undefined or null object", gameObject);
      return;
    }
    this._collection.remove(gameObject);
  }
  bringToFront(gameObject) {
    return this._collection.bringToFront(gameObject);
  }
  sendToBack(gameObject) {
    return this._collection.sendToBack(gameObject);
  }
  bringForward(gameObject) {
    return this._collection.bringForward(gameObject);
  }
  sendBackward(gameObject) {
    return this._collection.sendBackward(gameObject);
  }
  clear() {
    return this._collection.clear();
  }
  // Getter to access children
  get gameObjects() {
    return this._collection.children;
  }
  update(dt) {
    this.logger.groupCollapsed("Pipeline.update");
    this._collection.children.filter((obj) => obj.active).forEach((obj) => obj.update(dt));
    Tweenetik.updateAll(dt);
    this.logger.groupEnd();
  }
  render() {
    const renderObj = (obj) => obj.render();
    const filterVisible = (obj) => obj.visible;
    const filterActive = (obj) => obj.active;
    this.logger.groupCollapsed("Pipeline.render");
    this._collection.getSortedChildren().filter(filterVisible).filter(filterActive).forEach(renderObj);
    this.logger.groupEnd();
  }
}
class Cursor extends GameObject {
  /**
   * @param {Game} game - The main game instance.
   * @param {Shape} normalShape - The shape to display when not pressed.
   * @param {Shape} [pressedShape] - Optional shape to display when pressed.
   */
  constructor(game, normalShape, pressedShape = null, options = {}) {
    super(game, options);
    this.normalShape = normalShape;
    this.pressedShape = pressedShape || normalShape;
    this.active = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDown = false;
    this.game.events.on("inputmove", (e) => {
      this.x = e.x;
      this.y = e.y;
    });
    this.game.events.on("inputdown", () => {
      this.isDown = true;
    });
    this.game.events.on("inputup", () => {
      this.isDown = false;
    });
    this.game.events.on("mouseover", () => {
      this.visible = false;
    });
    this.game.events.on("mouseout", () => {
      this.visible = true;
    });
  }
  activate() {
    this.active = true;
    this.game.canvas.style.cursor = "none";
  }
  deactivate() {
    this.active = false;
    this.game.canvas.style.cursor = "default";
  }
  /**
   * Renders whichever shape is appropriate based on mouse pressed state.
   */
  draw() {
    super.draw();
    if (!this.active) return;
    const shape = this.isDown && this.pressedShape ? this.pressedShape : this.normalShape;
    if (!shape) return;
    shape.render();
  }
}
class Game {
  /**
   * Instantiate a new Game.
   * @param {HTMLCanvasElement} canvas - The canvas element to render onto.
   */
  constructor(canvas) {
    __privateAdd(this, _prevWidth, 0);
    __privateAdd(this, _prevHeight, 0);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.events = new EventEmitter();
    this._cursor = null;
    this.lastTime = 0;
    this.dt = 0;
    this.running = false;
    this._frame = 0;
    this.pipeline = new Pipeline(this);
    Painter.init(this.ctx);
    this.targetFPS = 60;
    this._frameInterval = 1e3 / this.targetFPS;
    this._accumulator = 0;
    this._pauseOnBlur = false;
    this._isPaused = false;
    this._init = false;
    this.initLogging();
  }
  setFPS(fps) {
    this.targetFPS = fps;
    this._frameInterval = 1e3 / fps;
  }
  /**
   * Hook to set up initial game state, add objects, etc.
   * Called in restart() and can be called manually if desired.
   * Override in subclasses to initialize custom logic or objects.
   */
  init() {
    this.initIO();
    this.initMotion();
    this._init = true;
    this.logger.log("[Game] Initialized");
  }
  /**
   * Initialize Mouse events.
   * This is called automatically in the constructor.
   * Override to add custom mouse event handlers, or disable them.
   */
  initMouse() {
    Mouse.init(this);
  }
  /**
   * Initialize Touch events.
   * This is called automatically in the constructor.
   * Override to add custom touch event handlers, or disable them.
   */
  initTouch() {
    Touch.init(this);
  }
  /**
   * Initialize Input Events.
   * An Input event is a combined event for mouse and touch that streamlines hover and click interactions.
   * This is called automatically in the constructor.
   * Override to add custom input event handlers, or disable them.
   */
  initInput() {
    Input.init(this);
  }
  /**
   * Initialize Keyboard events.
   * This is called automatically in the constructor.
   * Override to add custom keyboard event handlers, or disable them.
   */
  initKeyboard() {
    Keys.init(this);
  }
  /**
   * Initialize I/O Events.
   * This is a convenience method to set up all input systems at once.
   * This is called automatically in the constructor.
   * Override to add custom event handlers, or disable them.
   */
  initIO() {
    this.initMouse();
    this.initTouch();
    this.initInput();
    this.initKeyboard();
  }
  initMotion() {
    Tweenetik._active = [];
  }
  initLogging() {
    this.logger = new Logger("Game");
    Logger.setOutput(console);
    Logger.disableAll();
    Logger.disable();
    Logger.setLevel(Logger.INFO);
    this.logger.groupCollapsed("Initializing Game...");
  }
  enableLogging() {
    Logger.enable();
  }
  disableLogging() {
    Logger.disableAll();
    Logger.disable();
  }
  markBoundsDirty() {
    this._boundsDirty = true;
  }
  get boundsDirty() {
    return this._boundsDirty;
  }
  set boundsDirty(dirty) {
    this._boundsDirty = dirty;
  }
  /**
   * Enables automatic resizing of the canvas to either the window or a given container.
   * @param {HTMLElement} [container=window] - Element to observe for resizing. Defaults to window.
   */
  enableFluidSize(container = window) {
    if (container === window) {
      const resizeCanvas = () => {
        var _a;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (__privateGet(this, _prevWidth) !== this.canvas.width || __privateGet(this, _prevHeight) !== this.canvas.height) {
          this.markBoundsDirty();
          (_a = this.onResize) == null ? void 0 : _a.call(this);
        }
        __privateSet(this, _prevWidth, this.canvas.width);
        __privateSet(this, _prevHeight, this.canvas.height);
      };
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      this._fluidResizeCleanup = () => {
        window.removeEventListener("resize", resizeCanvas);
      };
    } else {
      if (!("ResizeObserver" in window)) {
        console.warn("ResizeObserver not supported in this browser.");
        return;
      }
      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
      };
      const observer = new ResizeObserver(() => {
        resizeCanvas();
      });
      observer.observe(container);
      resizeCanvas();
      this._fluidResizeCleanup = () => observer.disconnect();
    }
  }
  /**
   * Disables fluid resizing of the canvas.
   * If previously set, removes the event listener or observer.
   */
  disableFluidSize() {
    if (this._fluidResizeCleanup) {
      this._fluidResizeCleanup();
      this._fluidResizeCleanup = null;
    }
  }
  /**
   * Starts the main game loop using requestAnimationFrame.
   * The loop() method is bound so it can be used as a callback.
   */
  start() {
    this.logger.groupCollapsed("[Game] Starting...");
    this.init();
    if (!this._init) {
      throw new Error(
        "Game not initialized. Did you call init()? Remember to call super.init() in your subclass."
      );
    }
    this.running = true;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.logger.log("[Game] Started");
    this.logger.groupEnd();
  }
  /**
   * Stops the main game loop.
   */
  stop() {
    this.running = false;
    this.logger.log("[Game] Stopped");
  }
  /**
   * Clears the pipeline, calls init() again, and restarts the game loop.
   * Useful for resetting the game state.
   */
  restart() {
    this.pipeline.clear();
    this.init();
    this.start();
    this.logger.log("[Game] Restarted");
  }
  /**
   * The main game loop. Called automatically by requestAnimationFrame.
   * @param {DOMHighResTimeStamp} timestamp - The current time at which requestAnimationFrame fired.
   *   Used to measure elapsed time between frames.
   * @private
   */
  loop(timestamp) {
    if (!this.running) return;
    const elapsed = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this._accumulator += elapsed;
    this.actualFps = 1e3 / elapsed;
    if (this._accumulator >= this._frameInterval) {
      const dt = this._frameInterval / 1e3;
      this.dt = dt;
      this._frame++;
      this.logger.groupCollapsed(`Frame #${this._frame}`);
      this.logger.time("render time");
      this.update(dt);
      this.render();
      this.logger.timeEnd("render time");
      this.logger.groupEnd();
      this._accumulator -= this._frameInterval;
    }
    if (this.boundsDirty) {
      this.boundsDirty = false;
    }
    requestAnimationFrame(this.loop);
  }
  /**
   * Updates the game logic and propagates to the pipeline.
   * @param {number} dt - Delta time in seconds since the last frame.
   *   This is used to make movement or animations frame-rate independent.
   */
  update(dt) {
    this.pipeline.update(dt);
  }
  /**
   * Renders the game by first clearing the canvas, then asking
   * the pipeline to render all GameObjects.
   */
  render() {
    if (this.running) {
      this.clear();
    }
    this.pipeline.render();
  }
  /**
   * Clears the entire canvas. Called each frame before rendering.
   * Override to customize clear behavior (e.g. keep background images).
   */
  clear() {
    Painter.clear();
  }
  /**
   * Returns the current width of the canvas.
   * @type {number}
   */
  get width() {
    return this.canvas.width;
  }
  /**
   * Returns the current height of the canvas.
   * @type {number}
   */
  get height() {
    return this.canvas.height;
  }
  /**
   * Sets the canvas background color via CSS.
   * @param {string} color - Any valid CSS color string.
   */
  set backgroundColor(color) {
    this.canvas.style.backgroundColor = color;
  }
  /**
   * Sets the cursor for the game.
   * @param {Cursor} cursor - The cursor to set.
   */
  set cursor(cursor) {
    if (this._cursor) {
      this._cursor.destroy();
      this.pipeline.remove(this._cursor);
    }
    this._cursor = cursor;
    this._cursor.activate();
    this.pipeline.add(cursor);
  }
  /**
   * Returns the current cursor.
   * @returns {Cursor}
   */
  get cursor() {
    return this._cursor;
  }
  /**
   * Deactivates the current cursor and removes it from the pipeline.
   */
  resetCursor() {
    if (this._cursor) {
      this._cursor.destroy();
      this.pipeline.remove(this._cursor);
      this._cursor = null;
    }
  }
  /**
   * Enable/disable pausing the game when the tab loses focus
   * @param {boolean} enabled - Whether to pause on blur
   */
  enablePauseOnBlur(enabled) {
    this._pauseOnBlur = enabled;
    if (enabled) {
      window.addEventListener(
        "visibilitychange",
        this._handleVisibilityChange.bind(this),
        false
      );
    } else {
      window.removeEventListener(
        "visibilitychange",
        this._handleVisibilityChange.bind(this),
        false
      );
    }
  }
  _handleVisibilityChange() {
    this.logger.log("Visibility change detected");
    if (document.hidden) {
      if (this._pauseOnBlur && this.running) {
        this._isPaused = true;
        this.stop();
        this.logger.log("Paused due to tab visibility change");
      }
    } else {
      if (this._isPaused) {
        this._isPaused = false;
        this.start();
        this.logger.log("Resumed after tab visibility change");
      }
    }
  }
}
_prevWidth = new WeakMap();
_prevHeight = new WeakMap();
class Button extends GameObject {
  /**
   * Create a Button instance.
   * @param {Game} game - The main game instance.
   * @param {object} [options={}] - Configuration for the Button.
   * @param {number} [options.x=0] - X-position of the Button (center).
   * @param {number} [options.y=0] - Y-position of the Button (center).
   * @param {number} [options.width=120] - Width of the Button.
   * @param {number} [options.height=40] - Height of the Button.
   * @param {string} [options.text="Button"] - Label text for the Button.
   * @param {string} [options.font="14px monospace"] - Font for the text.
   * @param {string} [options.textColor="#000"] - Text color for the Button.
   * @param {string} [options.textAlign="center"] - Alignment of the text.
   * @param {string} [options.textBaseline="middle"] - Baseline of the text.
   * @param {Rectangle|Shape} [options.shape=null] - Custom shape for the Button background. Defaults to a Rectangle.
   * @param {TextShape} [options.label=null] - Custom text shape. Defaults to a center-aligned TextShape.
   * @param {Function} [options.onClick=null] - Callback to invoke upon button click.
   * @param {Function} [options.onHover=null] - Callback to invoke upon button hover.
   * @param {Function} [options.onPressed=null] - Callback to invoke upon button pressed.
   * @param {Function} [options.onRelease=null] - Callback to invoke upon button release.
   * @param {string} [options.anchor] - Optional anchor for positioning (e.g. "top-left").
   * @param {number} [options.padding] - Extra padding if using anchor.
   * @param {string} [options.colorDefaultBg="#eee"] - Background color in default state.
   * @param {string} [options.colorDefaultStroke="#999"] - Stroke color in default state.
   * @param {string} [options.colorDefaultText="#333"] - Text color in default state.
   * @param {string} [options.colorHoverBg="#222"] - Background color in hover state.
   * @param {string} [options.colorHoverStroke="#16F529"] - Stroke color in hover state.
   * @param {string} [options.colorHoverText="#16F529"] - Text color in hover state.
   * @param {string} [options.colorPressedBg="#111"] - Background color in pressed state.
   * @param {string} [options.colorPressedStroke="#00aaff"] - Stroke color in pressed state.
   * @param {string} [options.colorPressedText="#00aaff"] - Text color in pressed state.
   * @param {...any} rest - Additional properties passed to the superclass.
   */
  constructor(game, options = {}) {
    super(game, options);
    const {
      x = 0,
      y = 0,
      width = 120,
      height = 40,
      text = "Button",
      font = "14px monospace",
      textColor = "#000",
      textAlign = "center",
      textBaseline = "middle",
      shape = null,
      label = null,
      onClick = null,
      onHover = null,
      onPressed = null,
      onRelease = null,
      padding = 10,
      colorDefaultBg = "#eee",
      colorDefaultStroke = "#999",
      colorDefaultText = "#333",
      colorHoverBg = "#222",
      colorHoverStroke = "#16F529",
      colorHoverText = "#16F529",
      colorPressedBg = "#111",
      colorPressedStroke = "#00aaff",
      colorPressedText = "#00aaff"
    } = options;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.textAlign = textAlign;
    this.textBaseline = textBaseline;
    this.initColorScheme({
      colorDefaultBg,
      colorDefaultStroke,
      colorDefaultText,
      colorHoverBg,
      colorHoverStroke,
      colorHoverText,
      colorPressedBg,
      colorPressedStroke,
      colorPressedText
    });
    this.initBackground(shape);
    this.initLabel(text, font, textColor, label);
    this.initGroup();
    this.initEvents(onClick, onHover, onPressed, onRelease);
    this.setState("default");
  }
  /**
   * Initialize the color scheme for different button states
   * @param {object} colors - Configuration for button colors in different states
   * @private
   */
  initColorScheme(colors) {
    this.colors = {
      default: {
        bg: colors.colorDefaultBg,
        stroke: colors.colorDefaultStroke,
        text: colors.colorDefaultText
      },
      hover: {
        bg: colors.colorHoverBg,
        stroke: colors.colorHoverStroke,
        text: colors.colorHoverText
      },
      pressed: {
        bg: colors.colorPressedBg,
        stroke: colors.colorPressedStroke,
        text: colors.colorPressedText
      }
    };
  }
  /**
   * Initialize the background shape of the button
   * @param {Shape|null} shape - Custom shape or null to use default Rectangle
   * @private
   */
  initBackground(shape) {
    this.bg = shape ?? new Rectangle({
      width: this.width,
      height: this.height,
      color: this.colors.default.bg,
      stroke: this.colors.default.stroke,
      lineWidth: 2
    });
  }
  /**
   * Initialize the text label of the button
   * @param {string} text - Button text
   * @param {string} font - Text font
   * @param {string} textColor - Text color
   * @param {TextShape|null} label - Custom label or null to create a new one
   * @private
   */
  initLabel(text, font, textColor, label) {
    this.label = label ?? new TextShape(text, {
      font,
      color: textColor,
      align: this.textAlign,
      baseline: this.textBaseline
    });
    this.alignText();
  }
  /**
   * Update label position based on alignment and baseline settings
   * @private
   */
  alignText() {
    if (!this.label) return;
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    switch (this.textAlign) {
      case "left":
        this.label.x = -halfWidth + this.padding;
        break;
      case "right":
        this.label.x = halfWidth - this.padding;
        break;
      case "center":
      default:
        this.label.x = 0;
        break;
    }
    switch (this.textBaseline) {
      case "top":
        this.label.y = -halfHeight + this.padding;
        break;
      case "bottom":
        this.label.y = halfHeight - this.padding;
        break;
      case "middle":
      default:
        this.label.y = 0;
        break;
    }
  }
  /**
   * Initialize the group that will contain both background and label
   * @private
   */
  initGroup() {
    this.group = new Group();
    this.group.add(this.bg);
    this.group.add(this.label);
  }
  /**
   * Set up event handlers for mouse/touch interactions
   * @param {Function|null} onClick - Callback to execute when button is clicked
   * @private
   */
  initEvents(onClick, onHover, onPressed, onRelease) {
    this.interactive = true;
    this.onHover = onHover;
    this.onPressed = onPressed;
    this.onRelease = onRelease;
    this.on("mouseover", this.setState.bind(this, "hover"));
    this.on("mouseout", this.setState.bind(this, "default"));
    this.on("inputdown", this.setState.bind(this, "pressed"));
    this.on("inputup", () => {
      if (this.state === "pressed" && typeof onClick === "function") {
        onClick();
      }
      this.setState("hover");
    });
  }
  /**
   * Set the Button's state and update its visual appearance.
   * @param {string} state - "default", "hover", or "pressed".
   */
  setState(state) {
    var _a, _b, _c;
    if (this.state === state) return;
    this.state = state;
    switch (state) {
      case "default":
        if (this.game.cursor) {
          setTimeout(() => {
            this.game.cursor.activate();
          }, 0);
        }
        this.bg.color = this.colors.default.bg;
        this.bg.stroke = this.colors.default.stroke;
        this.label.color = this.colors.default.text;
        this.game.canvas.style.cursor = "default";
        (_a = this.onRelease) == null ? void 0 : _a.call(this);
        break;
      case "hover":
        if (this.game.cursor) {
          this.game.cursor.deactivate();
        }
        this.bg.color = this.colors.hover.bg;
        this.bg.stroke = this.colors.hover.stroke;
        this.label.color = this.colors.hover.text;
        this.game.canvas.style.cursor = "pointer";
        (_b = this.onHover) == null ? void 0 : _b.call(this);
        break;
      case "pressed":
        if (this.game.cursor) {
          this.game.cursor.deactivate();
        }
        this.bg.color = this.colors.pressed.bg;
        this.bg.stroke = this.colors.pressed.stroke;
        this.label.color = this.colors.pressed.text;
        this.game.canvas.style.cursor = "pointer";
        (_c = this.onPressed) == null ? void 0 : _c.call(this);
        break;
    }
  }
  /**
   * Update method called each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);
    if (this._boundsDirty) {
      this.alignText();
    }
  }
  /**
   * Get the text of the Button.
   * @returns {string} The text of the Button.
   */
  get text() {
    return this.label.text;
  }
  /**
   * Set the text of the Button.
   * @param {string} text - The new text for the Button.
   */
  set text(text) {
    this.label.text = text;
    this._boundsDirty = true;
  }
  /**
   * Change text alignment
   * @param {string} align - New text alignment: "left", "center", or "right"
   */
  setTextAlign(align) {
    this.textAlign = align;
    this.label.align = align;
    this._boundsDirty = true;
  }
  /**
   * Change text baseline
   * @param {string} baseline - New text baseline: "top", "middle", or "bottom"
   */
  setTextBaseline(baseline) {
    this.textBaseline = baseline;
    this.label.baseline = baseline;
    this._boundsDirty = true;
  }
  /**
   * Set the font for the button label
   * @param {string} font - CSS font string (e.g., "14px Arial")
   */
  setFont(font) {
    this.label.font = font;
    this._boundsDirty = true;
  }
  /**
   * Resize the button and update child elements
   * @param {number} width - New button width
   * @param {number} height - New button height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.bg.width = width;
    this.bg.height = height;
    this._boundsDirty = true;
  }
  /**
   * Render the Button each frame by drawing the underlying Group.
   */
  draw() {
    super.draw();
    this.group.render();
  }
}
class ToggleButton extends Button {
  constructor(game, options = {}) {
    const userOnClick = options.onClick;
    super(game, {
      ...options,
      onClick: () => {
        this.toggled = !this.toggled;
        if (typeof options.onToggle === "function") {
          options.onToggle(this.toggled);
        }
        if (typeof userOnClick === "function") {
          userOnClick();
        }
        this.refreshToggleVisual();
      }
    });
    this.colorActiveBg = options.colorActiveBg || "#444";
    this.colorActiveStroke = options.colorActiveStroke || "#0f0";
    this.colorActiveText = options.colorActiveText || "#0f0";
    this.toggled = !!options.startToggled;
    this.refreshToggleVisual();
  }
  toggle(v) {
    this.toggled = v;
    this.refreshToggleVisual();
  }
  /**
   * Decide how this ToggleButton looks when toggled vs. not toggled.
   */
  refreshToggleVisual() {
    if (this.toggled) {
      this.bg.fillColor = this.colorActiveBg;
      this.bg.strokeColor = this.colorActiveStroke;
      this.label.color = this.colorActiveText;
    } else {
      this.bg.fillColor = this.colors.default.bg;
      this.bg.strokeColor = this.colors.default.stroke;
      this.label.color = this.colors.default.text;
    }
  }
  /**
   * If we want ephemeral states (hover, pressed) to remain visible briefly,
   * we can let parent setState run, then immediately re-apply toggled style
   * so we don't lose the "toggled" color. This is optional.
   */
  setState(state) {
    super.setState(state);
    if (this.toggled) {
      this.bg.fillColor = this.colorActiveBg;
      this.bg.strokeColor = this.colorActiveStroke;
      this.label.color = this.colorActiveText;
    }
  }
}
class FPSCounter extends Text {
  /**
   * Create an FPS counter
   * @param {Game} game - The main game instance
   * @param {Object} [options={}] - Configuration options
   */
  constructor(game, options = {}) {
    super(game, "0 FPS", {
      x: 0,
      y: 0,
      font: "12px monospace",
      color: "#0f0",
      // Default to green
      align: "center",
      baseline: "middle",
      debug: false,
      ...options
      // This will override defaults with user provided values
    });
    this.fps = 0;
    this._frames = 0;
    this._accum = 0;
  }
  /**
   * Update the FPS counter
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    const fps = this.game.actualFps;
    if (!fps) return;
    this._frames++;
    this._accum += dt;
    if (this._accum >= 0.5) {
      this.fps = Math.round(fps);
      this.text = `${this.fps} FPS`;
      this._accum = 0;
      this._frames = 0;
    }
    super.update(dt);
  }
  /**
   * Override getBounds to return correct bounding box
   * @returns {Object} Bounding box with x, y, width, and height
   */
  getBounds() {
    if (this.shape && this.shape.getTextBounds) {
      const bounds = this.shape.getTextBounds();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
    }
    return super.getBounds();
  }
  getDebugBounds() {
    if (this.shape && this.shape.getDebugBounds) {
      const bounds = this.shape.getDebugBounds();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      };
    }
    return super.getDebugBounds();
  }
}
export {
  Arc,
  Arrow,
  BezierShape,
  Button,
  Circle,
  Cloud,
  Complex,
  Cone,
  Cross,
  Cube,
  Cursor,
  Cylinder,
  DebugTab,
  Diamond,
  Easing,
  Euclidian,
  EventEmitter,
  FPSCounter,
  Fractals,
  Game,
  GameObject,
  GameObjectShapeWrapper,
  Geometry2d,
  GridLayout,
  Group,
  Heart,
  Hexagon,
  HorizontalLayout,
  ImageGo,
  Input,
  Keys,
  LayoutScene,
  Line,
  Loggable,
  Logger,
  Motion,
  Mouse,
  Noise,
  OutlinedText,
  Painter,
  PainterColors,
  PainterEffects,
  PainterImages,
  PainterLines,
  PainterOpacity,
  PainterShapes,
  PainterText,
  PatternRectangle,
  Patterns,
  PieSlice,
  Pin,
  Pipeline,
  Polygon,
  Position,
  Prism,
  Random,
  Rectangle,
  Renderable,
  Ring,
  RoundedRectangle,
  SVGShape,
  Scene,
  Shape,
  ShapeGOFactory,
  Sphere,
  Square,
  Star,
  StickFigure,
  TaskManager,
  Text,
  TextShape,
  TileLayout,
  ToggleButton,
  Touch,
  Traceable,
  Transformable,
  Triangle,
  Tween,
  Tweenetik,
  VerticalLayout,
  WrappedText,
  ZOrderedCollection,
  applyAnchor,
  applyDraggable,
  applyLayout,
  bezierV1,
  bounceV1,
  floatV1,
  followPath,
  gridLayout,
  hopV1,
  horizontalLayout,
  orbitV1,
  oscillateV1,
  parabolicV1,
  patrolV1,
  pendulumV1,
  pulseV1,
  shakeV1,
  spiralV1,
  springV1,
  swingV1,
  tileLayout,
  verticalLayout,
  waypointV1
};
