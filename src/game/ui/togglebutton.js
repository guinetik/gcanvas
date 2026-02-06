import { Button } from "./button.js";
import { UI_THEME } from "./theme.js";

/**
 * ToggleButton - A variant of Button with a persistent "toggled" (active) state.
 * 
 * Theme: Terminal × Vercel aesthetic
 * - When toggled ON: glowing green border with subtle green tint
 * - When toggled OFF: inherits default button styling
 *
 * Usage:
 *   const myToggle = new ToggleButton(game, {
 *     text: "Tool 1",
 *     startToggled: true,  // if you want it initially on
 *     onToggle: (isOn) => {
 *       this.logger.log("Tool 1 toggled?", isOn);
 *     },
 *     onClick: () => {
 *       this.logger.log("A normal click as well");
 *     }
 *   });
 */
export class ToggleButton extends Button {
  constructor(game, options = {}) {
    // We'll intercept the user's onClick, so we can handle toggling
    const userOnClick = options.onClick;
    

    super(game, {
      ...options,
      onClick: () => {
        // Flip the toggled state
        this.toggled = !this.toggled;

        // If there's an onToggle callback, call it
        if (typeof options.onToggle === "function") {
          options.onToggle(this.toggled);
        }

        // Also call the user's original onClick if provided
        if (typeof userOnClick === "function") {
          userOnClick();
        }

        // Update our visual style for toggled vs. not
        // Store current state before refresh
        const currentState = this.state;
        this.refreshToggleVisual();
        // Re-apply current state after refresh to ensure proper colors
        if (currentState) {
          this.setState(currentState);
        }
      },
    });
    // Terminal × Vercel theme for toggled state
    this.colorActiveBg = options.colorActiveBg || UI_THEME.button.active.bg;
    this.colorActiveStroke = options.colorActiveStroke || UI_THEME.button.active.stroke;
    this.colorActiveText = options.colorActiveText || UI_THEME.button.active.text;
    // Track toggled state. Default is false unless 'startToggled' is set
    this.toggled = !!options.startToggled;

    // Apply the initial style according to toggled or not
    this.refreshToggleVisual();
  }

  toggle(v) {
    // Toggle the button state and refresh visuals
    const currentState = this.state;
    this.toggled = v;
    this.refreshToggleVisual();
    // Re-apply current state after refresh to ensure proper colors
    if (currentState) {
      this.setState(currentState);
    }
  }

  /**
   * Decide how this ToggleButton looks when toggled vs. not toggled.
   */
  refreshToggleVisual() {
    if (this.toggled) {
      // Active/toggled styling - use correct property names
      this.bg.color = this.colorActiveBg;
      this.bg.stroke = this.colorActiveStroke;
      this.label.color = this.colorActiveText;
    } else {
      // Revert to normal styling - use correct property names
      this.bg.color = this.colors.default.bg;
      this.bg.stroke = this.colors.default.stroke;
      this.label.color = this.colors.default.text;
    }
  }

  /**
   * Override setState to properly handle toggled state.
   * When toggled, always use active colors. When not toggled, use normal button behavior.
   */
  setState(state) {
    // Always call parent first to handle cursor and callbacks
    super.setState(state);
    
    // If toggled, override colors with active colors (ignore hover/pressed colors)
    if (this.toggled) {
      this.bg.color = this.colorActiveBg;
      this.bg.stroke = this.colorActiveStroke;
      this.label.color = this.colorActiveText;
    }
    // If not toggled, parent's setState already set the correct colors
  }
}
