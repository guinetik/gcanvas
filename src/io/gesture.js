/**
 * @module io/gesture
 * @description High-level gesture recognition for zoom, pan, and tap across mouse and touch.
 * 
 * Provides unified gesture handling that works seamlessly on both desktop and mobile:
 * - Mouse wheel → zoom
 * - Pinch (two fingers) → zoom
 * - Mouse drag → pan
 * - Single finger drag → pan
 * - Quick tap/click → tap event
 * 
 * @example
 * // Basic usage
 * import { Gesture } from '@guinetik/gcanvas';
 * 
 * const gesture = new Gesture(canvas, {
 *   onZoom: (delta, center) => {
 *     this.zoom *= delta > 0 ? 1.1 : 0.9;
 *   },
 *   onPan: (dx, dy) => {
 *     this.offsetX += dx;
 *     this.offsetY += dy;
 *   },
 *   onTap: (x, y) => {
 *     this.handleClick(x, y);
 *   }
 * });
 * 
 * // Cleanup when done
 * gesture.destroy();
 */

/**
 * Gesture class for handling zoom, pan, and tap gestures
 */
export class Gesture {
  /**
   * Create a new Gesture handler
   * @param {HTMLCanvasElement} canvas - The canvas element to attach gestures to
   * @param {Object} options - Configuration options
   * @param {Function} [options.onZoom] - Callback for zoom: (delta, centerX, centerY) => void
   *                                       delta > 0 = zoom in, delta < 0 = zoom out
   * @param {Function} [options.onPan] - Callback for pan: (dx, dy) => void
   * @param {Function} [options.onTap] - Callback for tap/click: (x, y) => void
   * @param {Function} [options.onDragStart] - Callback when drag starts: (x, y) => void
   * @param {Function} [options.onDragEnd] - Callback when drag ends: () => void
   * @param {number} [options.wheelZoomFactor=0.1] - Zoom sensitivity for mouse wheel
   * @param {number} [options.pinchZoomFactor=1] - Zoom sensitivity for pinch
   * @param {number} [options.panScale=1] - Scale factor for pan deltas
   * @param {number} [options.tapThreshold=10] - Max movement (px) to still count as tap
   * @param {number} [options.tapTimeout=300] - Max duration (ms) for tap
   * @param {boolean} [options.preventDefault=true] - Prevent default browser behavior
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    
    // Callbacks
    this.onZoom = options.onZoom || null;
    this.onPan = options.onPan || null;
    this.onTap = options.onTap || null;
    this.onDragStart = options.onDragStart || null;
    this.onDragEnd = options.onDragEnd || null;
    
    // Config
    this.wheelZoomFactor = options.wheelZoomFactor ?? 0.1;
    this.pinchZoomFactor = options.pinchZoomFactor ?? 1;
    this.panScale = options.panScale ?? 1;
    this.tapThreshold = options.tapThreshold ?? 10;
    this.tapTimeout = options.tapTimeout ?? 300;
    this.preventDefault = options.preventDefault ?? true;
    
    // State
    this._isDragging = false;
    this._hasMoved = false;
    this._startTime = 0;
    this._startX = 0;
    this._startY = 0;
    this._lastX = 0;
    this._lastY = 0;
    
    // Touch state
    this._touches = new Map();
    this._lastPinchDist = 0;
    this._lastPinchCenterX = 0;
    this._lastPinchCenterY = 0;
    
    // Bind handlers
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseLeave = this._onMouseLeave.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onTouchMove = this._onTouchMove.bind(this);
    this._onTouchEnd = this._onTouchEnd.bind(this);
    this._onTouchCancel = this._onTouchCancel.bind(this);
    
    // Attach listeners
    this._attachListeners();
  }
  
  /**
   * Check if currently dragging
   * @returns {boolean}
   */
  get isDragging() {
    return this._isDragging;
  }
  
  /**
   * Attach all event listeners
   * @private
   */
  _attachListeners() {
    const canvas = this.canvas;
    const passive = !this.preventDefault;
    
    // Mouse
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('mouseleave', this._onMouseLeave);
    canvas.addEventListener('wheel', this._onWheel, { passive });
    
    // Touch
    canvas.addEventListener('touchstart', this._onTouchStart, { passive });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive });
    canvas.addEventListener('touchcancel', this._onTouchCancel);
  }
  
  /**
   * Remove all event listeners
   */
  destroy() {
    const canvas = this.canvas;
    
    canvas.removeEventListener('mousedown', this._onMouseDown);
    canvas.removeEventListener('mousemove', this._onMouseMove);
    canvas.removeEventListener('mouseup', this._onMouseUp);
    canvas.removeEventListener('mouseleave', this._onMouseLeave);
    canvas.removeEventListener('wheel', this._onWheel);
    
    canvas.removeEventListener('touchstart', this._onTouchStart);
    canvas.removeEventListener('touchmove', this._onTouchMove);
    canvas.removeEventListener('touchend', this._onTouchEnd);
    canvas.removeEventListener('touchcancel', this._onTouchCancel);
    
    this._touches.clear();
  }
  
  /**
   * Get canvas-relative coordinates from a mouse event
   * @private
   */
  _getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  /**
   * Get canvas-relative coordinates from a touch
   * @private
   */
  _getTouchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // MOUSE HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  _onMouseDown(e) {
    const pos = this._getMousePos(e);
    this._isDragging = true;
    this._hasMoved = false;
    this._startTime = Date.now();
    this._startX = pos.x;
    this._startY = pos.y;
    this._lastX = pos.x;
    this._lastY = pos.y;
    
    if (this.onDragStart) {
      this.onDragStart(pos.x, pos.y);
    }
  }
  
  _onMouseMove(e) {
    if (!this._isDragging) return;
    
    const pos = this._getMousePos(e);
    const dx = pos.x - this._lastX;
    const dy = pos.y - this._lastY;
    
    // Check if moved enough to count as drag
    const totalDx = Math.abs(pos.x - this._startX);
    const totalDy = Math.abs(pos.y - this._startY);
    if (totalDx > this.tapThreshold || totalDy > this.tapThreshold) {
      this._hasMoved = true;
    }
    
    if (this.onPan && this._hasMoved) {
      this.onPan(dx * this.panScale, dy * this.panScale);
    }
    
    this._lastX = pos.x;
    this._lastY = pos.y;
  }
  
  _onMouseUp(e) {
    if (!this._isDragging) return;
    
    const now = Date.now();
    const duration = now - this._startTime;
    
    // Check for tap (quick, no movement)
    if (!this._hasMoved && duration < this.tapTimeout && this.onTap) {
      const pos = this._getMousePos(e);
      this.onTap(pos.x, pos.y);
    }
    
    this._isDragging = false;
    
    if (this.onDragEnd) {
      this.onDragEnd();
    }
  }
  
  _onMouseLeave() {
    if (this._isDragging) {
      this._isDragging = false;
      if (this.onDragEnd) {
        this.onDragEnd();
      }
    }
  }
  
  _onWheel(e) {
    if (this.preventDefault) {
      e.preventDefault();
    }
    
    if (this.onZoom) {
      const pos = this._getMousePos(e);
      const delta = e.deltaY > 0 ? -this.wheelZoomFactor : this.wheelZoomFactor;
      this.onZoom(delta, pos.x, pos.y);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // TOUCH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  
  _onTouchStart(e) {
    if (this.preventDefault) {
      e.preventDefault();
    }
    
    this._startTime = Date.now();
    this._hasMoved = false;
    
    // Track all touches
    for (const touch of e.changedTouches) {
      const pos = this._getTouchPos(touch);
      this._touches.set(touch.identifier, { x: pos.x, y: pos.y });
    }
    
    // Two fingers - initialize pinch
    if (this._touches.size === 2) {
      const [t1, t2] = Array.from(this._touches.values());
      this._lastPinchDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      this._lastPinchCenterX = (t1.x + t2.x) / 2;
      this._lastPinchCenterY = (t1.y + t2.y) / 2;
      // Stop single-finger drag when pinching
      this._isDragging = false;
    }
    
    // Single finger - start drag
    if (this._touches.size === 1) {
      const touch = e.touches[0];
      const pos = this._getTouchPos(touch);
      this._isDragging = true;
      this._startX = pos.x;
      this._startY = pos.y;
      this._lastX = pos.x;
      this._lastY = pos.y;
      
      if (this.onDragStart) {
        this.onDragStart(pos.x, pos.y);
      }
    }
  }
  
  _onTouchMove(e) {
    if (this.preventDefault) {
      e.preventDefault();
    }
    
    // Update touch positions
    for (const touch of e.changedTouches) {
      if (this._touches.has(touch.identifier)) {
        const pos = this._getTouchPos(touch);
        this._touches.set(touch.identifier, { x: pos.x, y: pos.y });
      }
    }
    
    // Two-finger pinch zoom + pan
    if (this._touches.size === 2) {
      const [t1, t2] = Array.from(this._touches.values());
      const pinchDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const pinchCenterX = (t1.x + t2.x) / 2;
      const pinchCenterY = (t1.y + t2.y) / 2;
      
      if (this._lastPinchDist > 0) {
        // Zoom based on pinch distance change
        if (this.onZoom) {
          const pinchRatio = pinchDist / this._lastPinchDist;
          const delta = (pinchRatio - 1) * this.pinchZoomFactor;
          this.onZoom(delta, pinchCenterX, pinchCenterY);
        }
        
        // Pan based on pinch center movement
        if (this.onPan) {
          const dx = pinchCenterX - this._lastPinchCenterX;
          const dy = pinchCenterY - this._lastPinchCenterY;
          this.onPan(dx * this.panScale, dy * this.panScale);
        }
        
        this._hasMoved = true;
      }
      
      this._lastPinchDist = pinchDist;
      this._lastPinchCenterX = pinchCenterX;
      this._lastPinchCenterY = pinchCenterY;
    }
    // Single finger drag (pan)
    else if (this._touches.size === 1 && this._isDragging) {
      const touch = e.touches[0];
      const pos = this._getTouchPos(touch);
      
      const dx = pos.x - this._lastX;
      const dy = pos.y - this._lastY;
      
      // Check if moved enough
      const totalDx = Math.abs(pos.x - this._startX);
      const totalDy = Math.abs(pos.y - this._startY);
      if (totalDx > this.tapThreshold || totalDy > this.tapThreshold) {
        this._hasMoved = true;
      }
      
      if (this.onPan && this._hasMoved) {
        this.onPan(dx * this.panScale, dy * this.panScale);
      }
      
      this._lastX = pos.x;
      this._lastY = pos.y;
    }
  }
  
  _onTouchEnd(e) {
    if (this.preventDefault) {
      e.preventDefault();
    }
    
    // Remove ended touches
    for (const touch of e.changedTouches) {
      this._touches.delete(touch.identifier);
    }
    
    // Reset pinch if no longer two fingers
    if (this._touches.size < 2) {
      this._lastPinchDist = 0;
    }
    
    // All touches released
    if (this._touches.size === 0) {
      // Check for tap
      const now = Date.now();
      const duration = now - this._startTime;
      
      if (!this._hasMoved && duration < this.tapTimeout && this.onTap) {
        this.onTap(this._startX, this._startY);
      }
      
      this._isDragging = false;
      
      if (this.onDragEnd) {
        this.onDragEnd();
      }
    }
  }
  
  _onTouchCancel() {
    this._touches.clear();
    this._lastPinchDist = 0;
    this._isDragging = false;
    
    if (this.onDragEnd) {
      this.onDragEnd();
    }
  }
}
