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
    // UI elements like buttons default to center origin because:
    // 1. Layout systems (HorizontalLayout, VerticalLayout) position items at cell centers
    // 2. When added to a centered scene, buttons should appear centered
    // 3. Center origin is more intuitive for rotation/scaling
    // Users can override with origin: "top-left" for manual pixel-perfect positioning
    options.origin = options.origin ?? "center";
    
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
      colorDefaultBg,
      colorDefaultStroke,
      colorDefaultText,
      colorHoverBg,
      colorHoverStroke,
      colorHoverText,
      colorPressedBg,
      colorPressedStroke,
      colorPressedText,
    } = options;

    // Resolve theme: per-option overrides > game theme > default UI_THEME
    const _t = (game?.theme?.button) || UI_THEME.button;

    // Basic position and sizing
    this.x = x;
    this.y = y;
    // Ensure minimum touch target size (44x44px recommended for mobile)
    this.width = Math.max(width, 44);
    this.height = Math.max(height, 44);
    this.padding = padding;
    this.textAlign = textAlign;
    this.textBaseline = textBaseline;
    
    // Initialize the button components
    this.initColorScheme({
      colorDefaultBg: colorDefaultBg ?? _t.default.bg,
      colorDefaultStroke: colorDefaultStroke ?? _t.default.stroke,
      colorDefaultText: colorDefaultText ?? _t.default.text,
      colorHoverBg: colorHoverBg ?? _t.hover.bg,
      colorHoverStroke: colorHoverStroke ?? _t.hover.stroke,
      colorHoverText: colorHoverText ?? _t.hover.text,
      colorPressedBg: colorPressedBg ?? _t.pressed.bg,
      colorPressedStroke: colorPressedStroke ?? _t.pressed.stroke,
      colorPressedText: colorPressedText ?? _t.pressed.text,
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
      lineWidth: 2,
      origin: "center",
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
      baseline: this.textBaseline,
      origin: "center",
    });
    
    this.alignText();
  }

  /**
   * Update label position based on alignment and baseline settings
   * @private
   *
   * Note: TextShape now centers its bounding box at (x, y) regardless of textAlign.
   * For non-center alignments, we adjust the position by half the text dimensions
   * so that left-aligned text STARTS at the left edge, not centers there.
   */
  alignText() {
    if (!this.label) return;

    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    // Get text dimensions (available after TextShape._calculateBounds)
    const textHalfWidth = (this.label._width || 0) / 2;
    const textHalfHeight = (this.label._height || 0) / 2;

    // Horizontal alignment - position where text CENTER should be
    // TextShape centers its bounding box at (x, y), so we adjust accordingly
    switch (this.textAlign) {
      case "left":
        // Text should START at left edge + padding
        // So text CENTER should be at left edge + padding + half text width
        this.label.x = -halfWidth + this.padding + textHalfWidth;
        break;
      case "right":
        // Text should END at right edge - padding
        // So text CENTER should be at right edge - padding - half text width
        this.label.x = halfWidth - this.padding - textHalfWidth;
        break;
      case "center":
      default:
        this.label.x = 0; // Center aligned means x=0 in center-based coords
        break;
    }

    // Vertical alignment - position where text CENTER should be
    switch (this.textBaseline) {
      case "top":
        // Text should START at top edge + padding
        this.label.y = -halfHeight + this.padding + textHalfHeight;
        break;
      case "bottom":
        // Text should END at bottom edge - padding
        this.label.y = halfHeight - this.padding - textHalfHeight;
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
    this.group = new Group({ origin: "center" });
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
    
    // Track pointer state for proper hover handling
    this._pointerOver = false;
    this._isTouch = false;
    
    // Mouse hover events (desktop only)
    this.on("mouseover", (e) => {
      this._pointerOver = true;
      if (!this._isTouch) {
        this.setState("hover");
      }
    });
    
    this.on("mouseout", (e) => {
      this._pointerOver = false;
      if (!this._isTouch) {
        this.setState("default");
      }
    });
    
    // Touch/pointer down - prevent default for mobile-friendly behavior
    this.on("inputdown", (e) => {
      // Detect touch input
      if (e.touches || (e.nativeEvent && e.nativeEvent.type === 'touchstart')) {
        this._isTouch = true;
        // Prevent default touch behaviors (scrolling, zooming)
        if (e.nativeEvent) {
          e.nativeEvent.preventDefault();
        }
      }
      this._pointerOver = true;
      this.setState("pressed");
    });
    
    // Touch/pointer up
    this.on("inputup", (e) => {
      const wasPressed = this.state === "pressed";
      
      // Prevent default touch behaviors
      if (e.touches || (e.nativeEvent && e.nativeEvent.type === 'touchend')) {
        if (e.nativeEvent) {
          e.nativeEvent.preventDefault();
        }
        this._isTouch = true;
      }
      
      // Verify pointer is still over button using hit test
      const stillOver = this._hitTest && this._hitTest(e.x, e.y);
      
      // Fire onClick if user was in "pressed" state and pointer is still over
      if (wasPressed && stillOver && typeof onClick === "function") {
        onClick();
      }
      
      // Check if pointer is still over the button
      // On touch devices, don't set hover state (no hover on touch)
      if (stillOver && !this._isTouch) {
        this.setState("hover");
      } else {
        this.setState("default");
        // Reset touch flag after a delay to allow mouse hover to work
        if (this._isTouch) {
          setTimeout(() => {
            this._isTouch = false;
          }, 300);
        }
      }
    });
    
    // Touch move - update pointer position
    this.on("inputmove", (e) => {
      // Check if pointer is still over button
      if (this._hitTest && this._hitTest(e.x, e.y)) {
        this._pointerOver = true;
      } else {
        this._pointerOver = false;
        if (this.state === "hover" && !this._isTouch) {
          this.setState("default");
        }
      }
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
   * Get debug bounds in local space, accounting for origin.
   * @returns {{x: number, y: number, width: number, height: number}} Debug bounds
   */
  getDebugBounds() {
    const offsetX = -this.width * this.originX || 0;
    const offsetY = -this.height * this.originY || 0;
    return {
      x: offsetX,
      y: offsetY,
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