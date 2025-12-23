/***************************************************************
 * theme.js
 *
 * Terminal × Vercel design system for GCanvas UI components.
 * 
 * Aesthetic principles:
 * - Dark translucent backgrounds (depth, layering)
 * - Neon green (#0f0) as primary accent
 * - Monospace typography throughout
 * - Inverted colors on hover for clear feedback
 * - Minimal, clean lines inspired by terminal UIs
 ***************************************************************/

/**
 * Core theme colors and values for UI components.
 * Import this for consistent styling across custom UI elements.
 * 
 * @example
 * ```js
 * import { UI_THEME } from "gcanvas";
 * 
 * const myButton = new Button(game, {
 *   colorDefaultBg: UI_THEME.colors.darkBg,
 *   colorDefaultStroke: UI_THEME.colors.neonGreen,
 *   colorDefaultText: UI_THEME.colors.neonGreen,
 * });
 * ```
 * 
 * @constant {Object}
 */
export const UI_THEME = {
  /**
   * Color palette
   */
  colors: {
    // Primary accent - terminal green
    neonGreen: "#0f0",
    terminalGreen: "#16F529",
    
    // Secondary accent - cyan
    cyanAccent: "#0ff",
    
    // Backgrounds
    darkBg: "rgba(0, 0, 0, 0.85)",
    darkerBg: "rgba(0, 0, 0, 0.92)",
    hoverBg: "#0f0",
    pressedBg: "#0c0",
    activeBg: "rgba(0, 255, 0, 0.15)",
    
    // Text
    lightText: "#0f0",
    darkText: "#000",
    dimText: "rgba(0, 255, 0, 0.7)",
    
    // Borders
    subtleBorder: "rgba(0, 255, 0, 0.4)",
    activeBorder: "#0f0",
    glowBorder: "rgba(0, 255, 0, 0.5)",
  },
  
  /**
   * Typography
   */
  fonts: {
    primary: "monospace",
    small: "11px monospace",
    medium: "14px monospace",
    large: "18px monospace",
    heading: "bold 24px monospace",
  },
  
  /**
   * Spacing values
   */
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  
  /**
   * Pre-configured button color schemes
   */
  button: {
    default: {
      bg: "rgba(0, 0, 0, 0.85)",
      stroke: "rgba(0, 255, 0, 0.4)",
      text: "#0f0",
    },
    hover: {
      bg: "#0f0",
      stroke: "#0f0",
      text: "#000",
    },
    pressed: {
      bg: "#0c0",
      stroke: "#0f0",
      text: "#000",
    },
    active: {
      bg: "rgba(0, 255, 0, 0.15)",
      stroke: "#0f0",
      text: "#0f0",
    },
  },
  
  /**
   * Pre-configured tooltip styles
   */
  tooltip: {
    bg: "rgba(0, 0, 0, 0.92)",
    border: "rgba(0, 255, 0, 0.5)",
    text: "#0f0",
  },
};

export default UI_THEME;

