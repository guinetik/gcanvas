import { Scene } from "..";
import { Painter } from "../../painter/painter";
import {
  horizontalLayout,
  verticalLayout,
  tileLayout,
  applyLayout,
  gridLayout,
} from "../../util/layout";

// LayoutScene base class
export class LayoutScene extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.spacing = options.spacing ?? 10;
    this.padding = options.padding ?? 0;
    this.autoSize = options.autoSize ?? true;
    this.align = options.align ?? "start";
    this.debug = options.debug ?? false;
    this._layoutDirty = true; // Initially dirty

    // Scroll configuration
    this.scrollable = options.scrollable ?? false;
    this.scrollFriction = options.scrollFriction ?? 0.92;
    this.scrollBounce = options.scrollBounce ?? 0.3;
    this.scrollThreshold = options.scrollThreshold ?? 0.5;
    this._viewportWidth = options.viewportWidth ?? null;
    this._viewportHeight = options.viewportHeight ?? null;

    // Scroll state
    this._scrollOffset = { x: 0, y: 0 };
    this._scrollVelocity = { x: 0, y: 0 };
    this._scrollDragging = false;
    this._scrollDragStart = { x: 0, y: 0 };
    this._scrollDragStartOffset = { x: 0, y: 0 };
    this._lastDragPosition = { x: 0, y: 0 };
    this._lastDragTime = 0;

    // Setup scroll interaction if enabled
    if (this.scrollable) {
      this._setupScrollInteraction();
    }

    // Track if we need to initialize scroll position on first layout
    this._scrollInitialized = false;
  }

  // Template method to be overridden by subclasses
  calculateLayout() {
    // Subclasses override this to return their layout result
    throw new Error("Subclasses must implement calculateLayout()");
  }

  update(dt) {
    // Check if layout needs update
    if (this._boundsDirty || this._layoutDirty) {
      // Store previous dimensions to detect changes
      const prevWidth = this.width;
      const prevHeight = this.height;

      // 1. Calculate the layout - delegated to subclasses
      const layoutResult = this.calculateLayout();

      // 2. Update dimensions if autoSize is enabled
      if (this.autoSize && layoutResult) {
        // Store full content size for scroll bounds calculation
        this._contentWidth = layoutResult.width;
        this._contentHeight = layoutResult.height;

        const axis = this.getScrollAxis();
        const viewportW = this._viewportWidth;
        const viewportH = this._viewportHeight;

        // Calculate visible size - cap to viewport when scrollable and content exceeds viewport
        let visibleWidth = layoutResult.width;
        let visibleHeight = layoutResult.height;

        if (this.scrollable && viewportW !== null && axis.horizontal) {
          visibleWidth = Math.min(layoutResult.width, viewportW);
        }
        if (this.scrollable && viewportH !== null && axis.vertical) {
          visibleHeight = Math.min(layoutResult.height, viewportH);
        }

        // Break potential infinite loops by only changing when actually different
        if (Math.abs(this.width - visibleWidth) > 0.1) {
          this.width = visibleWidth;
        }
        if (Math.abs(this.height - visibleHeight) > 0.1) {
          this.height = visibleHeight;
        }
      }

      // 3. Apply positions to children - but only if we have positions
      if (layoutResult && layoutResult.positions) {
        this.applyPositionsToChildren(layoutResult.positions);
      }

      // 4. Initialize scroll position to show start of content (with padding)
      if (this.scrollable && !this._scrollInitialized && this._needsScrolling()) {
        const bounds = this._getScrollBounds();
        const axis = this.getScrollAxis();
        // Start at max scroll to show beginning of content
        if (axis.horizontal) this._scrollOffset.x = bounds.maxX;
        if (axis.vertical) this._scrollOffset.y = bounds.maxY;
        this._scrollInitialized = true;
      }

      // 5. Clear dirty flags
      this._boundsDirty = false;
      this._layoutDirty = false;

      // If dimensions changed and this isn't coming from a bounds update,
      // we need to prevent markBoundsDirty from being called recursively
      if (
        (prevWidth !== this.width || prevHeight !== this.height) &&
        !this._updatingBoundsFromLayout
      ) {
        this._updatingBoundsFromLayout = true;
        // Call parent's markBoundsDirty, but NOT our override
        Scene.prototype.markBoundsDirty.call(this);
        this._updatingBoundsFromLayout = false;
      }
    }

    // Handle scroll momentum when not dragging
    if (this.scrollable && !this._scrollDragging) {
      this._updateScrollMomentum(dt);
    }

    // Call parent update
    super.update(dt);
  }

  markBoundsDirty() {
    if (this._updatingBoundsFromLayout) {
      // Just set the flag without propagating
      this._boundsDirty = true;
      return;
    }

    // Call parent implementation
    super.markBoundsDirty();

    // Set layout dirty flag
    this._layoutDirty = true;
  }

  // Shared method to apply positions using utility function
  applyPositionsToChildren(positions) {
    // Each subclass will override just the positioning options
    applyLayout(this.children, positions, this.getLayoutOffset());
  }

  // Subclasses override this to return their specific offset needs
  getLayoutOffset() {
    return { offsetX: 0, offsetY: 0 };
  }
  
  /**
   * Returns debug bounds that account for both origin AND layout offset.
   * This ensures the debug box surrounds the actual content position.
   */
  getDebugBounds() {
    const layoutOffset = this.getLayoutOffset();
    const contentW = this._contentWidth ?? this.width;
    const contentH = this._contentHeight ?? this.height;
    
    // Start with layout offset (where content is positioned)
    return {
      x: layoutOffset.offsetX,
      y: layoutOffset.offsetY,
      width: contentW,
      height: contentH,
    };
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

  // Scroll axis - subclasses override for different directions
  getScrollAxis() {
    return { horizontal: false, vertical: true }; // Default: vertical scroll
  }

  // Override bounds for scrollable layouts to use viewport for hit testing
  calculateBounds() {
    if (this.scrollable && (this._viewportWidth || this._viewportHeight)) {
      const w = this._viewportWidth ?? this.width;
      const h = this._viewportHeight ?? this.height;
      return {
        x: -w / 2,
        y: -h / 2,
        width: w,
        height: h,
      };
    }
    return super.calculateBounds();
  }

  // Get scroll bounds based on content size vs viewport
  _getScrollBounds() {
    // Use content size (full layout size before capping to viewport)
    const contentW = this._contentWidth ?? this.width;
    const contentH = this._contentHeight ?? this.height;
    const viewportW = this._viewportWidth ?? contentW;
    const viewportH = this._viewportHeight ?? contentH;

    // Content is centered, so scroll range is symmetric around 0
    // This allows scrolling to see both the start (with padding) and end of content
    const scrollRangeX = Math.max(0, contentW - viewportW);
    const scrollRangeY = Math.max(0, contentH - viewportH);

    return {
      minX: -scrollRangeX / 2,
      maxX: scrollRangeX / 2,
      minY: -scrollRangeY / 2,
      maxY: scrollRangeY / 2,
    };
  }

  // Clamp scroll position to bounds with elastic bounce-back
  _clampScrollBounds() {
    const bounds = this._getScrollBounds();
    const axis = this.getScrollAxis();

    if (axis.horizontal) {
      if (this._scrollOffset.x < bounds.minX) {
        this._scrollOffset.x +=
          (bounds.minX - this._scrollOffset.x) * this.scrollBounce;
        this._scrollVelocity.x = 0;
      } else if (this._scrollOffset.x > bounds.maxX) {
        this._scrollOffset.x +=
          (bounds.maxX - this._scrollOffset.x) * this.scrollBounce;
        this._scrollVelocity.x = 0;
      }
    }

    if (axis.vertical) {
      if (this._scrollOffset.y < bounds.minY) {
        this._scrollOffset.y +=
          (bounds.minY - this._scrollOffset.y) * this.scrollBounce;
        this._scrollVelocity.y = 0;
      } else if (this._scrollOffset.y > bounds.maxY) {
        this._scrollOffset.y +=
          (bounds.maxY - this._scrollOffset.y) * this.scrollBounce;
        this._scrollVelocity.y = 0;
      }
    }
  }

  // Update scroll momentum physics
  _updateScrollMomentum(dt) {
    const axis = this.getScrollAxis();

    if (axis.horizontal) {
      this._scrollVelocity.x *= this.scrollFriction;
      if (Math.abs(this._scrollVelocity.x) < this.scrollThreshold) {
        this._scrollVelocity.x = 0;
      }
      this._scrollOffset.x += this._scrollVelocity.x * dt * 60;
    }

    if (axis.vertical) {
      this._scrollVelocity.y *= this.scrollFriction;
      if (Math.abs(this._scrollVelocity.y) < this.scrollThreshold) {
        this._scrollVelocity.y = 0;
      }
      this._scrollOffset.y += this._scrollVelocity.y * dt * 60;
    }

    this._clampScrollBounds();
  }

  // Setup scroll interaction handlers
  _setupScrollInteraction() {
    this.interactive = true;

    this._scrollInputDownHandler = (e) => {
      // Manually check if the click is within our viewport bounds
      // since Pipeline dispatches to children first, not the Scene itself
      if (this._isPointInViewport(e.x, e.y)) {
        this._onScrollDragStart(e);
      }
    };
    this._scrollInputMoveHandler = (e) => this._onScrollDragMove(e);
    this._scrollInputUpHandler = (e) => this._onScrollDragEnd(e);

    // Listen on game events instead of this.on() because Pipeline
    // doesn't dispatch inputdown to Scene objects themselves
    this.game.events.on("inputdown", this._scrollInputDownHandler);
    this.game.events.on("inputmove", this._scrollInputMoveHandler);
    this.game.events.on("inputup", this._scrollInputUpHandler);
  }

  // Check if a point is within the layout's viewport bounds
  _isPointInViewport(screenX, screenY) {
    // Transform screen coordinates to layout's local space
    let localX = screenX - this.x;
    let localY = screenY - this.y;

    // Account for parent transforms if we have a parent
    let current = this.parent;
    while (current) {
      localX -= current.x || 0;
      localY -= current.y || 0;
      current = current.parent;
    }

    // Check against viewport bounds (centered at origin)
    const viewportW = this._viewportWidth ?? this.width;
    const viewportH = this._viewportHeight ?? this.height;
    const halfW = viewportW / 2;
    const halfH = viewportH / 2;

    return localX >= -halfW && localX <= halfW && localY >= -halfH && localY <= halfH;
  }

  _onScrollDragStart(e) {
    this._scrollDragging = true;
    this._scrollDragStart = { x: e.x, y: e.y };
    this._scrollDragStartOffset = { ...this._scrollOffset };
    this._lastDragPosition = { x: e.x, y: e.y };
    this._lastDragTime = performance.now();
    this._scrollVelocity = { x: 0, y: 0 };
  }

  _onScrollDragMove(e) {
    if (!this._scrollDragging) return;

    const axis = this.getScrollAxis();
    const now = performance.now();
    const dt = Math.max(1, now - this._lastDragTime) / 1000;

    if (axis.horizontal) {
      const deltaX = e.x - this._scrollDragStart.x;
      this._scrollOffset.x = this._scrollDragStartOffset.x + deltaX;
      this._scrollVelocity.x = (e.x - this._lastDragPosition.x) / (dt * 60);
    }

    if (axis.vertical) {
      const deltaY = e.y - this._scrollDragStart.y;
      this._scrollOffset.y = this._scrollDragStartOffset.y + deltaY;
      this._scrollVelocity.y = (e.y - this._lastDragPosition.y) / (dt * 60);
    }

    this._lastDragPosition = { x: e.x, y: e.y };
    this._lastDragTime = now;
  }

  _onScrollDragEnd() {
    this._scrollDragging = false;
  }

  // Check if content exceeds viewport (scrolling needed)
  _needsScrolling() {
    if (!this.scrollable) return false;

    // Use content size (full layout size before capping to viewport)
    const contentW = this._contentWidth ?? this.width;
    const contentH = this._contentHeight ?? this.height;
    const viewportW = this._viewportWidth ?? contentW;
    const viewportH = this._viewportHeight ?? contentH;
    const axis = this.getScrollAxis();

    // Only enable scrolling if content exceeds viewport in the scroll direction
    if (axis.horizontal && contentW > viewportW) return true;
    if (axis.vertical && contentH > viewportH) return true;

    return false;
  }

  // Draw with clipping for scrollable layouts
  draw() {
    if (this._needsScrolling()) {
      this._drawScrollable();
    } else {
      super.draw();
    }
  }

  _drawScrollable() {
    // Apply transforms (rotation, scale, etc.) from Transformable
    this.applyTransforms();

    // Draw debug bounds BEFORE clipping (shows actual content size)
    this.drawDebug();

    // Get viewport dimensions with padding inset
    const padding = this.padding ?? 0;
    const viewportW = (this._viewportWidth ?? this.width) - padding * 2;
    const viewportH = (this._viewportHeight ?? this.height) - padding * 2;

    // Save state, then clip to viewport and apply scroll offset
    Painter.save();

    // Clip to viewport with padding inset (centered at origin)
    Painter.ctx.beginPath();
    Painter.ctx.rect(-viewportW / 2, -viewportH / 2, viewportW, viewportH);
    Painter.ctx.clip();
    // Clear the path after clipping to prevent shapes from filling the clip rect
    Painter.ctx.beginPath();

    // Apply scroll offset
    Painter.ctx.translate(this._scrollOffset.x, this._scrollOffset.y);

    // Render children within clipped/scrolled region
    this._collection
      .getSortedChildren()
      .filter((obj) => obj.visible)
      .forEach((obj) => {
        Painter.save();
        obj.render();
        Painter.restore();
      });

    Painter.restore();
  }

  // Programmatic scroll API
  scrollTo(x, y) {
    const axis = this.getScrollAxis();
    if (axis.horizontal) this._scrollOffset.x = x;
    if (axis.vertical) this._scrollOffset.y = y;
    this._scrollVelocity = { x: 0, y: 0 };
  }

  scrollBy(deltaX, deltaY) {
    const axis = this.getScrollAxis();
    if (axis.horizontal) this._scrollOffset.x += deltaX;
    if (axis.vertical) this._scrollOffset.y += deltaY;
  }

  getScrollPosition() {
    return { ...this._scrollOffset };
  }

  resetScroll() {
    this._scrollOffset = { x: 0, y: 0 };
    this._scrollVelocity = { x: 0, y: 0 };
  }

  /**
   * Returns scroll offset for hit testing coordinate transformation.
   * @returns {{x: number, y: number}} Scroll offset to apply
   */
  getHitTestOffset() {
    if (!this.scrollable) {
      return { x: 0, y: 0 };
    }
    return {
      x: this._scrollOffset?.x || 0,
      y: this._scrollOffset?.y || 0,
    };
  }

  /**
   * Checks if a child is within the visible viewport and should be hittable.
   * @param {GameObject} child - The child to check
   * @returns {boolean} True if child is within viewport
   */
  isChildHittable(child) {
    // If not scrollable or doesn't need scrolling, all children are hittable
    if (!this.scrollable || !this._needsScrolling()) {
      return true;
    }

    const axis = this.getScrollAxis();
    const vpW = this._viewportWidth ?? this.width;
    const vpH = this._viewportHeight ?? this.height;
    const scrollX = this._scrollOffset?.x || 0;
    const scrollY = this._scrollOffset?.y || 0;

    // Child position with scroll applied (relative to viewport center)
    const childScrolledX = child.x + scrollX;
    const childScrolledY = child.y + scrollY;

    // Get child dimensions (use half for centered bounds check)
    const childHalfW = (child.width || 0) / 2;
    const childHalfH = (child.height || 0) / 2;

    // Check if child overlaps with viewport
    if (axis.horizontal) {
      // Child right edge must be past viewport left, child left edge must be before viewport right
      if (childScrolledX + childHalfW < -vpW / 2 || childScrolledX - childHalfW > vpW / 2) {
        return false;
      }
    }

    if (axis.vertical) {
      // Child bottom edge must be past viewport top, child top edge must be before viewport bottom
      if (childScrolledY + childHalfH < -vpH / 2 || childScrolledY - childHalfH > vpH / 2) {
        return false;
      }
    }

    return true;
  }
}

// HorizontalLayout with clean implementation
export class HorizontalLayout extends LayoutScene {
  // Override scroll axis for horizontal scrolling
  getScrollAxis() {
    return { horizontal: true, vertical: false };
  }

  // Override only the layout-specific methods
  calculateLayout() {
    return horizontalLayout(this.children, {
      spacing: this.spacing,
      padding: this.padding,
      align: this.align,
      centerItems: true,
    });
  }

  getLayoutOffset() {
    // Use content size (full size) not visible size (capped to viewport)
    const w = this._contentWidth ?? this.width;
    const h = this._contentHeight ?? this.height;
    return {
      offsetX: -w / 2,
      offsetY: -h / 2,
    };
  }

  /**
   * Override getDebugBounds to calculate from actual children positions.
   * Children with origin="center" are drawn centered at their positions.
   */
  getDebugBounds() {
    if (!this.children?.length) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      // Calculate child's actual bounds based on its origin
      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

// VerticalLayout with clean implementation
export class VerticalLayout extends LayoutScene {
  // Override only the layout-specific methods
  calculateLayout() {
    return verticalLayout(this.children, {
      spacing: this.spacing,
      padding: this.padding,
      align: this.align,
      centerItems: true,
    });
  }

  getLayoutOffset() {
    // Use content height (full size) not visible height (capped to viewport)
    const h = this._contentHeight ?? this.height;
    return {
      offsetX: 0,
      offsetY: -h / 2,
    };
  }

  /**
   * Override getDebugBounds to calculate from actual children positions.
   * Children with origin="center" are drawn centered at their positions.
   */
  getDebugBounds() {
    if (!this.children?.length) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      // Calculate child's actual bounds based on its origin
      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

// TileLayout with clean implementation
export class TileLayout extends LayoutScene {
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
      centerItems: true,
    });
  }

  getLayoutOffset() {
    // Use content size (full size) not visible size (capped to viewport)
    const w = this._contentWidth ?? this.width;
    const h = this._contentHeight ?? this.height;
    return {
      offsetX: -w / 2,
      offsetY: -h / 2,
    };
  }

  /**
   * Override getDebugBounds to calculate from actual children positions.
   * Children with origin="center" are drawn centered at their positions.
   */
  getDebugBounds() {
    if (!this.children?.length) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      // Calculate child's actual bounds based on its origin
      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}

export class GridLayout extends LayoutScene {
  constructor(game, options = {}) {
    super(game, options);
    this.columns = options.columns ?? 4;
    this.debug = options.debug ?? false;
  }
  
  calculateLayout() {
    //console.log("calculateLayout", this.columns, this.children.length);
    if (!this.children.length) {
      return null;
    }
    //console.log("calculateLayout", this.width, this.height, this.autoSize);
    return gridLayout(this.children, {
      columns    : this.columns,
      spacing    : this.spacing,
      padding    : this.padding,
      centerItems: this.centerItems,
      /* only pass these two when autoSize is *off* */
      width : this.autoSize ? undefined : this.width,
      height: this.autoSize ? undefined : this.height,
    });
  }

  getLayoutOffset() {
    // Use content size (full size) not visible size (capped to viewport)
    const w = this._contentWidth ?? this.width;
    const h = this._contentHeight ?? this.height;
    return {
      offsetX: -w / 2,
      offsetY: -h / 2,
    };
  }

  /**
   * Override getDebugBounds to calculate from actual children positions.
   * Children with origin="center" are drawn centered at their positions.
   */
  getDebugBounds() {
    if (!this.children?.length) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const childX = child.x;
      const childY = child.y;
      const childWidth = child.width || 0;
      const childHeight = child.height || 0;
      const childOriginX = child.originX ?? 0;
      const childOriginY = child.originY ?? 0;

      // Calculate child's actual bounds based on its origin
      const childLeft = childX - childWidth * childOriginX;
      const childRight = childX + childWidth * (1 - childOriginX);
      const childTop = childY - childHeight * childOriginY;
      const childBottom = childY + childHeight * (1 - childOriginY);

      minX = Math.min(minX, childLeft);
      maxX = Math.max(maxX, childRight);
      minY = Math.min(minY, childTop);
      maxY = Math.max(maxY, childBottom);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
}
