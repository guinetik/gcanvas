import { Scene } from "../../game/";
import { Rectangle } from "../../shapes";

export class LayoutGroup extends Scene {
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
        this.y + this.height / 2,
        this.width,
        this.height,
        {
          strokeColor: "#0f0",
          fillColor: "rgba(0,0,0,0.1)",
          lineWidth: 1,
        }
      );
      debugRect.draw();
    }
    super.render();
  }

  update(dt) {
    // Call layout logic
    super.update?.(dt); // does layout-specific update
    for (let child of this.children) {
      if (child.update) child.update(dt);
    }
  }
}

export class HorizontalLayout extends LayoutGroup {
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
      this.width = x - this.spacing + this.padding * 2;
      this.height = maxHeight + 2 * this.padding;
    }

    super.update(dt);
  }
}

export class VerticalLayout extends LayoutGroup {
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
      this.height = y - this.spacing + this.padding * 2;
      this.width = maxWidth + 2 * this.padding;
    }
    // Call the parent class's update method
    super.update(dt);
  }
}
