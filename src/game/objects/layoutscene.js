import { Scene } from "..";
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
        // Break potential infinite loops by only changing when actually different
        if (Math.abs(this.width - layoutResult.width) > 0.1) {
          this.width = layoutResult.width;
        }
        if (Math.abs(this.height - layoutResult.height) > 0.1) {
          this.height = layoutResult.height;
        }
      }

      // 3. Apply positions to children - but only if we have positions
      if (layoutResult && layoutResult.positions) {
        this.applyPositionsToChildren(layoutResult.positions);
      }

      // 4. Clear dirty flags
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

// HorizontalLayout with clean implementation
export class HorizontalLayout extends LayoutScene {
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
    return {
      offsetX: -this.width / 2,
      offsetY: 0,
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
    return {
      offsetX: 0,
      offsetY: -this.height / 2,
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
    return {
      offsetX: -this.width / 2,
      offsetY: -this.height / 2,
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
    return {
      offsetX: -this.width/2,
      offsetY: -this.height/2
    };
  }
}
