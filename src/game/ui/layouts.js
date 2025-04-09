import { Scene } from "../../game/";
import { Rectangle } from "../../shapes";

export class LayoutScene extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.spacing = options.spacing ?? 10;
    this.padding = options.padding ?? 0;
    this.autoSize = options.autoSize ?? true;
    this.align = options.align ?? "start"; // "start", "center", "end"
    this.debug = options.debug ?? false;
    this.width = 0;
    this.height = 0;
  }

  render() {
    if (this.debug) {
      const debugRect = new Rectangle(
        this.x + this.width / 2,
        Math.round(this.y + this.height / 2),
        this.width,
        this.height,
        {
          strokeColor: "#0f0",
          fillColor: "rgba(0,0,0,0.5)",
          lineWidth: 1,
        }
      );
      //console.log("Debug Rect", debugRect.x, debugRect.y, debugRect.width, debugRect.height);
      debugRect.draw();
    }
    super.render();
  }

  getBounds() {
    //console.log("getBounds", this.x, this.y, this.width, this.height);
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  update(dt) {
    // Call layout logic
    super.update?.(dt); // does layout-specific update
    for (let child of this.children) {
      if (child.update) child.update(dt);
    }
  }
}

export class HorizontalLayout extends LayoutScene {
  update(dt) {
    // Start at left padding
    let x = this.padding;
    // Calculate the tallest child
    let maxHeight = 0;
    for (let child of this.children) {
      maxHeight = Math.max(maxHeight, child.height ?? 0);
    }
    // Iterate and position each child
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      // Y center based on layout + child
      const middleY = this.y + (child.height ?? 0) / 2;
      // Position X in world coordinates
      child.x = this.x + x + (child.width ?? 0) / 2;
      //console.log("child.x", i, child.x, child.y);
      // Align vertically
      switch (this.align) {
        case "center":
          child.y =
            middleY + this.padding + (maxHeight - (child.height ?? 0)) / 2;
          break;
        case "end":
          child.y = middleY + this.padding + (maxHeight - (child.height ?? 0));
          break;
        case "start":
        default:
          child.y = middleY + this.padding;
      }
      // Advance X
      x += child.width ?? 0;
      if (i < this.children.length - 1) {
        x += this.spacing;
      }
    }
    // Auto-size the layout group
    if (this.autoSize) {
      this.width = x + this.padding;
      this.height = maxHeight + 2 * this.padding;
    }

    super.update(dt);
  }
}

export class VerticalLayout extends LayoutScene {
  update(dt) {
    // Set the initial y position equal to the padding
    let y = this.padding;
    // Calculate the maximum width of the children
    let maxWidth = 0;
    for (let child of this.children) {
      maxWidth = Math.max(maxWidth, child.width ?? 0);
    }
    // Iterate through each child and set its position
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      // Calculate the middle. This is important because Painter uses center coordinate system where 0 is the middle.
      const middleX = this.x + (child.width ?? 0) / 2;
      // Set the y position of the child based on the current y position and the height of the child
      child.y = this.y + y + (child.height ?? 0) / 2;
      // Set the x position of the child based on the alignment
      switch (this.align) {
        case "center":
          child.x =
            middleX + this.padding + (maxWidth - (child.width ?? 0)) / 2;
          break;
        case "end":
          child.x = middleX + this.padding + (maxWidth - (child.width ?? 0));
          break;
        case "start":
        default:
          child.x = middleX + this.padding;
      }
      // Update the y position for the next child
      y += child.height ?? 0;
      // Add spacing between children
      if (i < this.children.length - 1) {
        y += this.spacing;
      }
    }
    // If autoSize is enabled, update the layout's width and height
    if (this.autoSize) {
      this.height = y + this.padding;
      this.width  = maxWidth + 2 * this.padding;
    }
    // Call the parent class's update method
    super.update(dt);
  }
}
/**
 * TileLayout
 *
 * Assumes all children have the same width and height (a uniform tile size).
 * Lays them out in rows & columns, filling each row until it hits 'columns',
 * then continuing to the next row. The grid automatically adjusts its overall
 * width & height if autoSize is true.
 */
export class TileLayout extends LayoutScene {
  /**
   * @param {Game} game
   * @param {object} options
   * @param {number} [options.columns=4] - How many squares per row
   * @param {number} [options.spacing=10] - Spacing between squares
   * @param {number} [options.padding=0] - Extra padding on the outside
   * @param {boolean} [options.autoSize=true] - Whether to update this.width/height to match the content
   * @param {...any} rest - Additional LayoutGroup options
   */
  constructor(game, options = {}) {
    super(game, options);
    this.columns = options.columns ?? 4; // default 4 columns
  }

  update(dt) {
    // If no children, nothing to lay out.
    if (!this.children.length) {
      super.update(dt);
      return;
    }

    // For uniform squares, just read the first child's width & height
    // (assuming they're identical for all children).
    const tileSize = this.children[0].width || 0;

    // Starting position:
    let x = this.padding;
    let y = this.padding;
    let colIndex = 0;

    // Arrange each child in row-major order
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];

      // Center the child on (x + tileSize/2, y + tileSize/2)
      child.x = this.x + x + tileSize / 2;
      child.y = this.y + y + tileSize / 2;

      // Move to the next column
      colIndex++;
      if (colIndex < this.columns) {
        // Still in the same row
        x += tileSize + this.spacing;
      } else {
        // Wrap to the next row
        colIndex = 0;
        x = this.padding;
        y += tileSize + this.spacing;
      }
    }

    // If autoSize, compute width/height to snugly fit the grid
    if (this.autoSize) {
      // Number of total rows used
      const rowCount = Math.ceil(this.children.length / this.columns);

      // Total width = columns * tileSize + (columns - 1)*spacing + 2*padding
      this.width =
        this.columns * tileSize +
        (this.columns - 1) * this.spacing +
        this.padding * 2;

      // Total height = rowCount * tileSize + (rowCount - 1)*spacing + 2*padding
      this.height =
        rowCount * tileSize +
        (rowCount - 1) * this.spacing +
        this.padding * 2;
    }

    // Call our parent to handle child updates, debug rect, etc.
    super.update(dt);
  }
}

