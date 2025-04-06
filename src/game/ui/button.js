import { Group, Rectangle, TextShape } from "../../shapes";
import { GameObject } from "../go";

export class Button extends GameObject {
  constructor(game, options = {}) {
    // destructure locally
    const {
      x = 0,
      y = 0,
      width = 120,
      height = 40,
      text = "Button",
      shape = null,
      label = null,
      onClick = null,
      anchor,
      padding,
      ...rest
    } = options;

    // pass anchor config to GameObject
    super(game, { anchor, padding, ...rest });
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.state = "default"; // default, hover, pressed

    // Create shape if not provided
    this.shape =
      shape ??
      new Rectangle(0, 0, width, height, {
        fillColor: "#eee",
        strokeColor: "#ccc",
        lineWidth: 2,
      });

    // Create label if not provided
    this.label =
      label ??
      new TextShape(0, 0, text, {
        font: "16px monospace",
        color: "#333",
        align: "center",
        baseline: "middle",
      });

    // Center group
    this.group = new Group(x, y);
    this.group.add(this.shape);
    this.group.add(this.label);

    this.enableInteractivity(this.group);

    this.on("mouseover", () => this.setState("hover"));
    this.on("mouseout", () => this.setState("default"));
    this.on("inputdown", () => this.setState("pressed"));
    this.on("inputup", () => {
      if (this.state === "pressed" && typeof onClick === "function") {
        onClick();
      }
      this.setState("hover"); // return to hover
    });

    this.setState("default");
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;

    if (!this.shape?.options) return;

    // Update appearance based on state
    switch (state) {
      case "default":
        this.shape.options.fillColor = "#eee";
        this.shape.options.strokeColor = "#ccc";
        this.label.options.color = "#333";
        break;
      case "hover":
        this.shape.options.fillColor = "#ddd";
        this.shape.options.strokeColor = "#bbb";
        this.label.options.color = "#111";
        break;
      case "pressed":
        this.shape.options.fillColor = "#bbb";
        this.shape.options.strokeColor = "#999";
        this.label.options.color = "#000";
        break;
    }
  }

  update(dt) {
    this.group.x = this.x;
    this.group.y = this.y;
  }

  render() {
    this.group.draw();
  }
}
