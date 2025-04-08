/***************************************************************
 * Button.js
 *
 * A basic UI Button GameObject that combines a Rectangle shape
 * and a Text label using a Group. It supports hover and press
 * states, and fires an optional onClick callback when clicked.
 ***************************************************************/

import { Group, Rectangle, TextShape, Shape } from "../../shapes";
import { GameObject } from "../go";

/**
 * Button - A clickable UI element as a GameObject.
 *
 * The Button uses:
 *  - A background Rectangle (or a custom shape if supplied).
 *  - A TextShape (label).
 *  - A Group to position both.
 *
 * The button responds to pointer events and has states:
 * "default", "hover", and "pressed". An optional onClick callback
 * is fired when the user completes a press on the button.
 *
 * Example usage:
 * ```js
 * const btn = new Button(game, {
 *   x: 200,
 *   y: 100,
 *   width: 150,
 *   height: 50,
 *   text: "Click Me",
 *   onClick: () => console.log("Button pressed!")
 * });
 * game.pipeline.add(btn);
 * ```
 */
export class Button extends GameObject {
  /**
   * Create a Button instance.
   * @param {Game} game - The main game instance.
   * @param {object} [options={}] - Configuration for the Button.
   * @param {number} [options.x=0] - X-position of the Button (center).
   * @param {number} [options.y=0] - Y-position of the Button (center).
   * @param {number} [options.width=120] - Width of the Button.
   * @param {number} [options.height=40] - Height of the Button.
   * @param {string} [options.text="Button"] - Label text for the Button.
   * @param {Rectangle|Shape} [options.shape=null] - Custom shape for the Button background. Defaults to a Rectangle.
   * @param {TextShape} [options.label=null] - Custom text shape. Defaults to a center-aligned TextShape.
   * @param {Function} [options.onClick=null] - Callback to invoke upon button click.
   * @param {string} [options.anchor] - Optional anchor for positioning (e.g. "top-left").
   * @param {number} [options.padding] - Extra padding if using anchor.
   * @param {...any} rest - Additional properties passed to the superclass.
   */
  constructor(game, options = {}) {
    // Extract button-specific config
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

    // Pass anchor/padding to the GameObject constructor
    super(game, { anchor, padding, ...rest });

    // Basic position and sizing
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    /**
     * Current interaction state of the Button: "default", "hover", or "pressed".
     * @type {string}
     */
    this.state = "default";

    /**
     * The shape serving as the Button's background.
     * @type {Shape}
     */
    this.bg =
      shape ??
      new Rectangle(0, 0, width, height, {
        fillColor: "#eee",
        strokeColor: "#ccc",
        lineWidth: 2,
      });

    /**
     * The text shape used as the Button’s label.
     * @type {TextShape}
     */
    this.label =
      label ??
      new TextShape(0, 0, text, {
        font: "16px monospace",
        color: "#333",
        align: "center",
        baseline: "middle",
      });

    /**
     * Internal container grouping shape + label.
     * @type {Group}
     */
    this.group = new Group(x, y);
    this.group.add(this.bg);
    this.group.add(this.label);
    // Enable pointer interactivity using the group for hit-testing.
    this.enableInteractivity(this.group);
    // Event handlers for pointer interaction
    this.on("mouseover", this.setState.bind(this, "hover"));
    this.on("mouseout", this.setState.bind(this, "default"));
    this.on("inputdown", this.setState.bind(this, "pressed"));
    this.on("inputup", () => {
      // Fire onClick if user was in "pressed" state
      if (this.state === "pressed" && typeof onClick === "function") {
        onClick();
      }
      // Return to hover state if the pointer is still over the button
      this.setState("hover");
    });

    // Initialize to default state
    this.setState("default");
  }

  /**
   * Set the Button's state and update its visual appearance.
   * @param {string} state - "default", "hover", or "pressed".
   */
  setState(state) {
    //console.log("setState", state);
    if (this.state === state) return;
    this.state = state;
    // Adjust shape & label appearance based on the new state
    switch (state) {
      case "default":
        //console.log("default");
        if (this.game.cursor) {
          setTimeout(() => {
            this.game.cursor.activate();
          }, 0);
        }
        this.bg.fillColor = "#eee"; // dark matte
        this.bg.strokeColor = "#ccc"; // subtle outer stroke
        this.label.color = "#333"; // light text
        this.game.canvas.style.cursor = "default";
        break;
      case "hover":
        //console.log("hover");
        //console.log(this.group.children.includes(this.bg));
        if (this.game.cursor) {
          this.game.cursor.deactivate();
        }
        this.bg.fillColor = "#222"; // slightly lifted
        this.bg.strokeColor = "#16F529";
        this.label.color = "#16F529";
        this.game.canvas.style.cursor = "pointer";
        break;
      case "pressed":
        //console.log("pressed");
        if (this.game.cursor) {
          this.game.cursor.deactivate();
        }
        this.bg.fillColor = "#111"; // pressed in
        this.bg.strokeColor = "#00aaff"; // deeper accent
        this.label.color = "#00aaff"; // same as stroke
        this.game.canvas.style.cursor = "pointer";
        break;
    }
  }

  /**
   * Update the Button each frame. Sync the group's coordinates
   * with this GameObject's x and y.
   * @param {number} dt - Delta time in seconds.
   */
  update(dt) {
    this.group.x = this.x;
    this.group.y = this.y;
  }

  /**
   * Render the Button each frame by drawing the underlying Group.
   */
  render() {
    this.group.draw();
  }
}
