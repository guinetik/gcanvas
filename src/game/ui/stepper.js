/***************************************************************
 * Stepper.js
 *
 * A numeric stepper UI component with increment/decrement buttons.
 * Displays a value with [-] and [+] buttons on either side.
 * 
 * Theme: Terminal × Vercel aesthetic
 * - Dark transparent backgrounds
 * - Neon green accents (#0f0)
 * - Inverted colors on hover
 ***************************************************************/

import { Group, Rectangle, TextShape } from "../../shapes";
import { GameObject } from "../objects/go";
import { UI_THEME } from "./theme.js";

/**
 * Stepper - A numeric input component with increment/decrement buttons.
 *
 * The Stepper displays:
 *  - A decrement button [-]
 *  - A value display showing the current number
 *  - An increment button [+]
 *
 * Supports min/max bounds, custom step size, and onChange callbacks.
 *
 * Example usage:
 * ```js
 * const stepper = new Stepper(game, {
 *   x: 200,
 *   y: 100,
 *   value: 5,
 *   min: 0,
 *   max: 10,
 *   step: 1,
 *   onChange: (value) => console.log("New value:", value)
 * });
 * game.pipeline.add(stepper);
 * ```
 * 
 * @extends GameObject
 */
export class Stepper extends GameObject {
  /**
   * Create a Stepper instance.
   * @param {Game} game - The main game instance.
   * @param {object} [options={}] - Configuration for the Stepper.
   * @param {number} [options.x=0] - X-position of the Stepper (center).
   * @param {number} [options.y=0] - Y-position of the Stepper (center).
   * @param {number} [options.value=0] - Initial value.
   * @param {number} [options.min=-Infinity] - Minimum allowed value.
   * @param {number} [options.max=Infinity] - Maximum allowed value.
   * @param {number} [options.step=1] - Amount to increment/decrement per click.
   * @param {number} [options.buttonSize=32] - Size of the +/- buttons.
   * @param {number} [options.valueWidth=60] - Width of the value display area.
   * @param {number} [options.height=32] - Height of the stepper.
   * @param {number} [options.gap=4] - Gap between elements.
   * @param {string} [options.font="14px monospace"] - Font for text.
   * @param {Function} [options.onChange=null] - Callback when value changes.
   * @param {Function} [options.formatValue=null] - Custom formatter for display value.
   * @param {string} [options.label=""] - Optional label text above the stepper.
   */
  constructor(game, options = {}) {
    // UI elements like steppers default to center origin for layout compatibility
    options.origin = options.origin ?? "center";
    super(game, options);

    const {
      x = 0,
      y = 0,
      value = 0,
      min = -Infinity,
      max = Infinity,
      step = 1,
      buttonSize = 32,
      valueWidth = 60,
      height = 32,
      gap = 4,
      font = UI_THEME.fonts.medium,
      onChange = null,
      formatValue = null,
      label = "",
    } = options;

    // Position and sizing
    this.x = x;
    this.y = y;
    this.buttonSize = buttonSize;
    this.valueWidth = valueWidth;
    this.stepperHeight = height;
    this.gap = gap;
    this.font = font;

    // Value state
    this._value = this.clamp(value, min, max);
    this.min = min;
    this.max = max;
    this.step = step;

    // Callbacks
    this.onChange = onChange;
    this.formatValue = formatValue || ((v) => String(v));
    this.labelText = label;

    // Calculate total width
    this.width = buttonSize + gap + valueWidth + gap + buttonSize;
    this.height = label ? height + 20 : height;

    // Initialize components
    this.initComponents();
    this.initEvents();
  }

  /**
   * Clamp a value between min and max
   * @param {number} val - Value to clamp
   * @param {number} min - Minimum bound
   * @param {number} max - Maximum bound
   * @returns {number} Clamped value
   * @private
   */
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Initialize all visual components
   * @private
   */
  initComponents() {
    this.group = new Group({ origin: "center" });

    // Calculate positions (centered layout)
    const totalWidth = this.width;
    const halfWidth = totalWidth / 2;
    const btnHalf = this.buttonSize / 2;
    const valHalf = this.valueWidth / 2;

    // Positions from center
    const decrementX = -halfWidth + btnHalf;
    const valueX = 0;
    const incrementX = halfWidth - btnHalf;

    // Calculate vertical positioning
    // When label exists, layout is: [label] [gap] [controls]
    // Everything should fit within this.height bounds
    const labelHeight = 12; // Approximate height of label text
    const labelGap = 4;
    
    // Controls Y offset: positive when label exists (pushes controls down)
    const controlsY = this.labelText 
      ? (labelHeight + labelGap) / 2  // Controls shift down to make room for label
      : 0;
    
    // Label Y offset: negative (above center)
    const labelY = this.labelText 
      ? -(this.stepperHeight / 2 + labelGap)  // Label sits above controls
      : 0;

    // Create optional label
    if (this.labelText) {
      this.label = new TextShape(this.labelText, {
        font: UI_THEME.fonts.small,
        color: UI_THEME.colors.dimText,
        align: "center",
        baseline: "middle",
        origin: "center",
      });
      this.label.y = labelY;
      this.group.add(this.label);
    }

    // Create decrement button background
    this.decrementBg = new Rectangle({
      width: this.buttonSize,
      height: this.stepperHeight,
      color: UI_THEME.button.default.bg,
      stroke: UI_THEME.button.default.stroke,
      lineWidth: 1,
      origin: "center",
    });
    this.decrementBg.x = decrementX;
    this.decrementBg.y = controlsY;

    // Create decrement button text
    this.decrementText = new TextShape("−", {
      font: this.font,
      color: UI_THEME.button.default.text,
      align: "center",
      baseline: "middle",
      origin: "center",
    });
    this.decrementText.x = decrementX;
    this.decrementText.y = controlsY;

    // Create value display background
    this.valueBg = new Rectangle({
      width: this.valueWidth,
      height: this.stepperHeight,
      color: UI_THEME.colors.darkerBg,
      stroke: UI_THEME.colors.subtleBorder,
      lineWidth: 1,
      origin: "center",
    });
    this.valueBg.x = valueX;
    this.valueBg.y = controlsY;

    // Create value display text
    this.valueText = new TextShape(this.formatValue(this._value), {
      font: this.font,
      color: UI_THEME.colors.neonGreen,
      align: "center",
      baseline: "middle",
      origin: "center",
    });
    this.valueText.x = valueX;
    this.valueText.y = controlsY;

    // Create increment button background
    this.incrementBg = new Rectangle({
      width: this.buttonSize,
      height: this.stepperHeight,
      color: UI_THEME.button.default.bg,
      stroke: UI_THEME.button.default.stroke,
      lineWidth: 1,
      origin: "center",
    });
    this.incrementBg.x = incrementX;
    this.incrementBg.y = controlsY;

    // Create increment button text
    this.incrementText = new TextShape("+", {
      font: this.font,
      color: UI_THEME.button.default.text,
      align: "center",
      baseline: "middle",
      origin: "center",
    });
    this.incrementText.x = incrementX;
    this.incrementText.y = controlsY;

    // Add all to group (order matters for rendering)
    this.group.add(this.decrementBg);
    this.group.add(this.decrementText);
    this.group.add(this.valueBg);
    this.group.add(this.valueText);
    this.group.add(this.incrementBg);
    this.group.add(this.incrementText);

    // Store button bounds for hit testing
    this._decrementBounds = {
      x: decrementX - this.buttonSize / 2,
      y: controlsY - this.stepperHeight / 2,
      width: this.buttonSize,
      height: this.stepperHeight,
    };

    this._incrementBounds = {
      x: incrementX - this.buttonSize / 2,
      y: controlsY - this.stepperHeight / 2,
      width: this.buttonSize,
      height: this.stepperHeight,
    };

    // Track hover states
    this._decrementHover = false;
    this._incrementHover = false;
    this._decrementPressed = false;
    this._incrementPressed = false;
  }

  /**
   * Initialize event handlers
   * @private
   */
  initEvents() {
    this.interactive = true;
    this._isMouseOver = false;

    // Use mouseover/mouseout to know when we're over the stepper
    this.on("mouseover", () => {
      this._isMouseOver = true;
    });
    
    this.on("mouseout", () => {
      this._isMouseOver = false;
      this.handleMouseOut();
    });

    // Use global inputmove for continuous position tracking (like Tooltip)
    this.game.events.on("inputmove", (e) => {
      if (this._isMouseOver) {
        this.handleMouseMove(e);
      }
    });

    this.on("inputdown", (e) => this.handleInputDown(e));
    this.on("inputup", () => this.handleInputUp());
  }

  /**
   * Convert screen coordinates to local space, accounting for parent hierarchy.
   * Uses the same transform chain logic as GameObject._hitTest.
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {{x: number, y: number}} Local coordinates
   * @private
   */
  screenToLocal(screenX, screenY) {
    let localX = screenX;
    let localY = screenY;

    // Build transform chain (from root to this object)
    const transformChain = [];
    let current = this;
    while (current) {
      transformChain.unshift(current);
      current = current.parent;
    }

    // Apply inverse transforms in sequence (from root to object)
    for (const obj of transformChain) {
      // Translation: subtract object position
      localX -= obj.x || 0;
      localY -= obj.y || 0;

      // Rotation: apply inverse rotation if needed
      if (obj.rotation) {
        const cos = Math.cos(-obj.rotation);
        const sin = Math.sin(-obj.rotation);
        const tempX = localX;
        localX = tempX * cos - localY * sin;
        localY = tempX * sin + localY * cos;
      }

      // Scale: apply inverse scale if needed
      if (obj.scaleX !== undefined && obj.scaleX !== 0) {
        localX /= obj.scaleX;
      }
      if (obj.scaleY !== undefined && obj.scaleY !== 0) {
        localY /= obj.scaleY;
      }
    }

    return { x: localX, y: localY };
  }

  /**
   * Check if a local point is within button bounds
   * @param {number} localX - Local X coordinate
   * @param {number} localY - Local Y coordinate
   * @param {object} bounds - Button bounds object
   * @returns {boolean} True if point is within bounds
   * @private
   */
  isPointInBounds(localX, localY, bounds) {
    return (
      localX >= bounds.x &&
      localX <= bounds.x + bounds.width &&
      localY >= bounds.y &&
      localY <= bounds.y + bounds.height
    );
  }

  /**
   * Handle mouse move for hover states
   * @param {object} e - Event object with x, y coordinates
   * @private
   */
  handleMouseMove(e) {
    // Convert screen coordinates to local space (accounts for parent hierarchy)
    const local = this.screenToLocal(e.x, e.y);

    const wasDecHover = this._decrementHover;
    const wasIncHover = this._incrementHover;

    this._decrementHover = this.isPointInBounds(local.x, local.y, this._decrementBounds);
    this._incrementHover = this.isPointInBounds(local.x, local.y, this._incrementBounds);

    // Update visuals if hover state changed
    if (wasDecHover !== this._decrementHover || wasIncHover !== this._incrementHover) {
      this.updateButtonStates();
    }

    // Update cursor
    if (this._decrementHover || this._incrementHover) {
      this.game.canvas.style.cursor = "pointer";
    } else {
      this.game.canvas.style.cursor = "default";
    }
  }

  /**
   * Handle mouse out
   * @private
   */
  handleMouseOut() {
    this._decrementHover = false;
    this._incrementHover = false;
    this._decrementPressed = false;
    this._incrementPressed = false;
    this.updateButtonStates();
    this.game.canvas.style.cursor = "default";
  }

  /**
   * Handle input down (click/tap)
   * @param {object} e - Event object
   * @private
   */
  handleInputDown(e) {
    // Convert screen coordinates to local space (accounts for parent hierarchy)
    const local = this.screenToLocal(e.x, e.y);

    if (this.isPointInBounds(local.x, local.y, this._decrementBounds)) {
      this._decrementPressed = true;
      this.decrement();
    } else if (this.isPointInBounds(local.x, local.y, this._incrementBounds)) {
      this._incrementPressed = true;
      this.increment();
    }

    this.updateButtonStates();
  }

  /**
   * Handle input up
   * @private
   */
  handleInputUp() {
    this._decrementPressed = false;
    this._incrementPressed = false;
    this.updateButtonStates();
  }

  /**
   * Update button visual states based on hover/pressed
   * @private
   */
  updateButtonStates() {
    // Decrement button
    if (this._decrementPressed) {
      this.decrementBg.color = UI_THEME.button.pressed.bg;
      this.decrementBg.stroke = UI_THEME.button.pressed.stroke;
      this.decrementText.color = UI_THEME.button.pressed.text;
    } else if (this._decrementHover) {
      this.decrementBg.color = UI_THEME.button.hover.bg;
      this.decrementBg.stroke = UI_THEME.button.hover.stroke;
      this.decrementText.color = UI_THEME.button.hover.text;
    } else {
      this.decrementBg.color = UI_THEME.button.default.bg;
      this.decrementBg.stroke = UI_THEME.button.default.stroke;
      this.decrementText.color = UI_THEME.button.default.text;
    }

    // Check if at min - dim the decrement button
    if (this._value <= this.min) {
      this.decrementBg.stroke = UI_THEME.colors.subtleBorder;
      this.decrementText.color = UI_THEME.colors.dimText;
    }

    // Increment button
    if (this._incrementPressed) {
      this.incrementBg.color = UI_THEME.button.pressed.bg;
      this.incrementBg.stroke = UI_THEME.button.pressed.stroke;
      this.incrementText.color = UI_THEME.button.pressed.text;
    } else if (this._incrementHover) {
      this.incrementBg.color = UI_THEME.button.hover.bg;
      this.incrementBg.stroke = UI_THEME.button.hover.stroke;
      this.incrementText.color = UI_THEME.button.hover.text;
    } else {
      this.incrementBg.color = UI_THEME.button.default.bg;
      this.incrementBg.stroke = UI_THEME.button.default.stroke;
      this.incrementText.color = UI_THEME.button.default.text;
    }

    // Check if at max - dim the increment button
    if (this._value >= this.max) {
      this.incrementBg.stroke = UI_THEME.colors.subtleBorder;
      this.incrementText.color = UI_THEME.colors.dimText;
    }
  }

  /**
   * Increment the value by step amount
   */
  increment() {
    this.value = this._value + this.step;
  }

  /**
   * Decrement the value by step amount
   */
  decrement() {
    this.value = this._value - this.step;
  }

  /**
   * Get the current value
   * @returns {number} Current value
   */
  get value() {
    return this._value;
  }

  /**
   * Set the value (clamped to min/max)
   * @param {number} newValue - New value to set
   */
  set value(newValue) {
    const clamped = this.clamp(newValue, this.min, this.max);
    
    if (clamped !== this._value) {
      this._value = clamped;
      this.valueText.text = this.formatValue(this._value);
      this.updateButtonStates();

      if (typeof this.onChange === "function") {
        this.onChange(this._value);
      }
    }
  }

  /**
   * Set new min/max bounds
   * @param {number} min - New minimum
   * @param {number} max - New maximum
   */
  setBounds(min, max) {
    this.min = min;
    this.max = max;
    // Re-clamp current value
    this.value = this._value;
  }

  /**
   * Get the bounding box of this Stepper for hit testing.
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
   * Render the Stepper
   */
  draw() {
    super.draw();
    this.group.render();
  }
}

