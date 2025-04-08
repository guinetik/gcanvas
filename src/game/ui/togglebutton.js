import { Button } from "./button.js";

/**
 * ToggleButton - A variant of Button with a persistent "toggled" (active) state.
 *
 * Usage:
 *   const myToggle = new ToggleButton(game, {
 *     text: "Tool 1",
 *     startToggled: true,  // if you want it initially on
 *     onToggle: (isOn) => {
 *       console.log("Tool 1 toggled?", isOn);
 *     },
 *     onClick: () => {
 *       console.log("A normal click as well");
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
        this.refreshToggleVisual();
      },
    });

    // Track toggled state. Default is false unless 'startToggled' is set
    this.toggled = !!options.startToggled;

    // Apply the initial style according to toggled or not
    this.refreshToggleVisual();
  }

  toggle(v) {
    // Toggle the button state and refresh visuals
    this.toggled = v;
    this.refreshToggleVisual();
  }

  /**
   * Decide how this ToggleButton looks when toggled vs. not toggled.
   */
  refreshToggleVisual() {
    if (this.toggled) {
      // E.g. "active" styling
      this.bg.fillColor = "#444";
      this.bg.strokeColor = "#0f0";
      this.label.color = "#0f0";
    } else {
      // Revert to normal styling
      this.bg.fillColor = "#eee";
      this.bg.strokeColor = "#ccc";
      this.label.color = "#333";
    }
  }

  /**
   * If we want ephemeral states (hover, pressed) to remain visible briefly,
   * we can let parent setState run, then immediately re-apply toggled style
   * so we don't lose the "toggled" color. This is optional.
   */
  setState(state) {
    super.setState(state);

    // If we're toggled on, ensure it stays in the toggled visuals
    // after the parent sets hover/pressed colors.
    if (this.toggled) {
      this.bg.fillColor = "#444";
      this.bg.strokeColor = "#0f0";
      this.label.color = "#0f0";
    }
  }
}
