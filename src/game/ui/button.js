/***************************************************************
 * Button.js
 *
 * A basic UI Button GameObject that combines a Rectangle shape
 * and a Text label using a Group. It supports hover and press
 * states, and fires an optional onClick callback when clicked.
 * 
 * Theme: Terminal × Vercel aesthetic
 * - Dark transparent backgrounds
 * - Neon green accents (#0f0)
 * - Inverted colors on hover
 ***************************************************************/

import { Group, Rectangle, TextShape, Shape } from "../../shapes";
import { GameObject } from "../objects/go";
import { UI_THEME } from "./theme.js";

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
 *   onClick: () => this.logger.log("Button pressed!")
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
   * @param {string} [options.colorDefaultBg="rgba(0,0,0,0.85)"] - Background color in default state.
   * @param {string} [options.colorDefaultStroke="rgba(0,255,0,0.4)"] - Stroke color in default state.
   * @param {string} [options.colorDefaultText="#0f0"] - Text color in default state.
   * @param {string} [options.colorHoverBg="#0f0"] - Background color in hover state (inverted).
   * @param {string} [options.colorHoverStroke="#0f0"] - Stroke color in hover state.
   * @param {string} [options.colorHoverText="#000"] - Text color in hover state (inverted).
   * @param {string} [options.colorPressedBg="#0c0"] - Background color in pressed state.
   * @param {string} [options.colorPressedStroke="#0f0"] - Stroke color in pressed state.
   * @param {string} [options.colorPressedText="#000"] - Text color in pressed state.
   * @param {...any} rest - Additional properties passed to the superclass.
   */
  constructor(game, options = {}) {
    // Pass options to the GameObject constructor
    super(game, options);
    
    // Extract button-specific config
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
      // Terminal × Vercel theme: dark bg, green accents, inverted hover
      colorDefaultBg = UI_THEME.button.default.bg,
      colorDefaultStroke = UI_THEME.button.default.stroke,
      colorDefaultText = UI_THEME.button.default.text,
      colorHoverBg = UI_THEME.button.hover.bg,
      colorHoverStroke = UI_THEME.button.hover.stroke,
      colorHoverText = UI_THEME.button.hover.text,
      colorPressedBg = UI_THEME.button.pressed.bg,
      colorPressedStroke = UI_THEME.button.pressed.stroke,
      colorPressedText = UI_THEME.button.pressed.text,
    } = options;

    // Basic position and sizing
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.padding = padding;
    this.textAlign = textAlign;
    this.textBaseline = textBaseline;
    
    // Initialize the button components
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
    
    // Initialize to default state
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
      font: font,
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

    // Horizontal alignment
    switch (this.textAlign) {
      case "left":
        this.label.x = -halfWidth + this.padding;
        break;
      case "right":
        this.label.x = halfWidth - this.padding;
        break;
      case "center":
      default:
        this.label.x = 0; // Center aligned means x=0 in center-based coords
        break;
    }

    // Vertical alignment
    switch (this.textBaseline) {
      case "top":
        this.label.y = -halfHeight + this.padding;
        break;
      case "bottom":
        this.label.y = halfHeight - this.padding;
        break;
      case "middle":
      default:
        this.label.y = 0; // Middle aligned means y=0 in center-based coords
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
      // Fire onClick if user was in "pressed" state
      if (this.state === "pressed" && typeof onClick === "function") {
        onClick();
      }
      // Return to hover state if the pointer is still over the button
      this.setState("hover");
    });
  }

  /**
   * Set the Button's state and update its visual appearance.
   * @param {string} state - "default", "hover", or "pressed".
   */
  setState(state) {
    if (this.state === state) return;
    this.state = state;
    
    // Adjust shape & label appearance based on the new state
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
        this.onRelease?.();
        break;
        
      case "hover":
        if (this.game.cursor) {
          this.game.cursor.deactivate();
        }
        this.bg.color = this.colors.hover.bg;
        this.bg.stroke = this.colors.hover.stroke;
        this.label.color = this.colors.hover.text;
        this.game.canvas.style.cursor = "pointer";
        this.onHover?.();
        break;
        
      case "pressed":
        if (this.game.cursor) {
          this.game.cursor.deactivate();
        }
        this.bg.color = this.colors.pressed.bg;
        this.bg.stroke = this.colors.pressed.stroke;
        this.label.color = this.colors.pressed.text;
        this.game.canvas.style.cursor = "pointer";
        this.onPressed?.();
        break;
    }
  }

  /**
   * Update method called each frame
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    super.update(dt);
    
    // Check if we need to reposition the label
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
    
    // Update background size
    this.bg.width = width;
    this.bg.height = height;
    
    // Reposition the label
    this._boundsDirty = true;
  }

  /**
   * Get the bounding box of this Button for hit testing.
   * Required for the event system to work properly.
   * @returns {{x: number, y: number, width: number, height: number}} Bounds object
   */
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Render the Button each frame by drawing the underlying Group.
   */
  draw() {
    super.draw();
    this.group.render();
  }
}