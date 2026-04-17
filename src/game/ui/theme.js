/***************************************************************
 * theme.js
 *
 * Terminal × Vercel design system for GCanvas UI components.
 * 
 * Aesthetic principles:
 * - Dark translucent backgrounds (depth, layering)
 * - Neon green (#0f0) as primary accent
 * - Datatype (variable) + monospace fallbacks for typography
 * - Inverted colors on hover for clear feedback
 * - Minimal, clean lines inspired by terminal UIs
 ***************************************************************/

const CONFIG = {
  /** Must match the family loaded on the page (see `demos/demos.css` @import). */
  fontFamilyName: "Datatype",
};

/**
 * Default font stack for canvas `ctx.font` and CSS `font-family`.
 * Load the Datatype face in HTML/CSS before drawing text on canvas.
 *
 * @constant {string}
 */
export const FONT_FAMILY_STACK = `${CONFIG.fontFamilyName}, ui-monospace, monospace`;

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

    /** Accordion section header row (AccordionSection) — derived per theme */
    accordionRowBg: "rgba(0, 255, 0, 0.03)",
    accordionRowBgHover: "rgba(0, 255, 0, 0.08)",
    accordionRowBorder: "rgba(0, 255, 0, 0.2)",
  },
  
  /**
   * Typography (canvas + HTML; requires Datatype loaded — see demos.css)
   */
  fonts: {
    /** Same as {@link FONT_FAMILY_STACK} */
    family: FONT_FAMILY_STACK,
    primary: FONT_FAMILY_STACK,
    small: `11px ${FONT_FAMILY_STACK}`,
    medium: `14px ${FONT_FAMILY_STACK}`,
    large: `18px ${FONT_FAMILY_STACK}`,
    heading: `bold 24px ${FONT_FAMILY_STACK}`,
    /** Default for `Text` GameObject when the `font` option is omitted */
    gameObjectText: `16px ${FONT_FAMILY_STACK}`,
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

  /**
   * Pre-configured dropdown styles
   */
  dropdown: {
    trigger: {
      bg: "rgba(0, 0, 0, 0.85)",
      border: "rgba(0, 255, 0, 0.4)",
      text: "#0f0",
      placeholder: "rgba(0, 255, 0, 0.5)",
      arrow: "rgba(0, 255, 0, 0.7)",
      hoverBg: "rgba(0, 255, 0, 0.08)",
      hoverBorder: "#0f0",
    },
    panel: {
      bg: "rgba(0, 0, 0, 0.92)",
      border: "rgba(0, 255, 0, 0.5)",
    },
    item: {
      text: "rgba(0, 255, 0, 0.8)",
      hoverBg: "#0f0",
      hoverText: "#000",
      selectedText: "#0f0",
    },
    scrollbar: {
      track: "rgba(0, 255, 0, 0.1)",
      thumb: "rgba(0, 255, 0, 0.4)",
    },
    label: {
      text: "rgba(0, 255, 0, 0.7)",
    },
  },

  /**
   * Pre-configured slider styles
   */
  slider: {
    track: {
      bg: "rgba(0, 0, 0, 0.85)",
      border: "rgba(0, 255, 0, 0.4)",
      fill: "#0f0",
      fillGlow: "rgba(0, 255, 0, 0.3)",
    },
    thumb: {
      fill: "#0f0",
      stroke: "#0f0",
      glow: "rgba(0, 255, 0, 0.5)",
      pulseGlow: "rgba(0, 255, 0, 0.25)",
    },
    label: {
      text: "rgba(0, 255, 0, 0.7)",
      value: "#0f0",
      minMax: "rgba(0, 255, 0, 0.5)",
    },
  },
};

/**
 * Parse a 3 or 6 digit hex color to [r, g, b] (0-255).
 * Accepts "#0ff", "#00ffff", "0ff", "00ffff".
 */
function parseHex(hex) {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/**
 * Create a complete UI theme from a single accent color.
 *
 * Returns an object with the same shape as UI_THEME, so it can be
 * used as a drop-in replacement. All shades (dim, glow, hover, etc.)
 * are derived from the accent color's RGB values.
 *
 * @param {string} accentHex - Hex color string, e.g. "#0ff" or "#ff6600"
 * @returns {Object} Full theme object matching UI_THEME structure
 *
 * @example
 * ```js
 * import { createTheme } from "gcanvas";
 * const cyanTheme = createTheme("#0ff");
 * // Use in a Game subclass constructor:
 * this.theme = cyanTheme;
 * ```
 */
export function createTheme(accentHex) {
  const [r, g, b] = parseHex(accentHex);
  const accent = `rgb(${r},${g},${b})`;
  const dim = `rgba(${r},${g},${b},0.7)`;
  const glow = `rgba(${r},${g},${b},0.5)`;
  const subtle = `rgba(${r},${g},${b},0.4)`;
  const active = `rgba(${r},${g},${b},0.15)`;
  const hover = `rgba(${r},${g},${b},0.08)`;
  const fillGlow = `rgba(${r},${g},${b},0.3)`;
  const pulseGlow = `rgba(${r},${g},${b},0.25)`;
  const scrollTrack = `rgba(${r},${g},${b},0.1)`;

  // Darker accent for pressed state
  const pr = Math.floor(r * 0.8);
  const pg = Math.floor(g * 0.8);
  const pb = Math.floor(b * 0.8);
  const pressed = `rgb(${pr},${pg},${pb})`;

  return {
    colors: {
      neonGreen: accent,
      terminalGreen: accent,
      cyanAccent: accent,
      darkBg: "rgba(0, 0, 0, 0.85)",
      darkerBg: "rgba(0, 0, 0, 0.92)",
      hoverBg: accent,
      pressedBg: pressed,
      activeBg: active,
      lightText: accent,
      darkText: "#000",
      dimText: dim,
      subtleBorder: subtle,
      activeBorder: accent,
      glowBorder: glow,
      accordionRowBg: `rgba(${r},${g},${b},0.03)`,
      accordionRowBgHover: `rgba(${r},${g},${b},0.08)`,
      accordionRowBorder: `rgba(${r},${g},${b},0.2)`,
    },
    fonts: { ...UI_THEME.fonts },
    spacing: { ...UI_THEME.spacing },
    button: {
      default: { bg: "rgba(0, 0, 0, 0.85)", stroke: subtle, text: accent },
      hover: { bg: accent, stroke: accent, text: "#000" },
      pressed: { bg: pressed, stroke: accent, text: "#000" },
      active: { bg: active, stroke: accent, text: accent },
    },
    tooltip: {
      bg: "rgba(0, 0, 0, 0.92)",
      border: glow,
      text: accent,
    },
    dropdown: {
      trigger: {
        bg: "rgba(0, 0, 0, 0.85)",
        border: subtle,
        text: accent,
        placeholder: glow,
        arrow: dim,
        hoverBg: hover,
        hoverBorder: accent,
      },
      panel: { bg: "rgba(0, 0, 0, 0.92)", border: glow },
      item: {
        text: dim,
        hoverBg: accent,
        hoverText: "#000",
        selectedText: accent,
      },
      scrollbar: { track: scrollTrack, thumb: subtle },
      label: { text: dim },
    },
    slider: {
      track: {
        bg: "rgba(0, 0, 0, 0.85)",
        border: subtle,
        fill: accent,
        fillGlow: fillGlow,
      },
      thumb: {
        fill: accent,
        stroke: accent,
        glow: glow,
        pulseGlow: pulseGlow,
      },
      label: { text: dim, value: accent, minMax: glow },
    },
  };
}

/**
 * Named theme registry. Ships with "default" and "monochrome".
 */
export const THEMES = {
  default: { ...structuredClone(UI_THEME) },
  monochrome: createTheme("#ffffff"),
};

// Override monochrome backgrounds for better contrast
Object.assign(THEMES.monochrome.colors, {
  darkBg: "rgba(30, 30, 30, 0.85)",
  darkerBg: "rgba(20, 20, 20, 0.92)",
  darkText: "#000",
  hoverBg: "#ffffff",
});

/**
 * Get the current active theme (same reference as UI_THEME).
 * @returns {Object}
 */
export function getTheme() {
  return UI_THEME;
}

/**
 * Switch the active theme. Mutates UI_THEME in place so existing references stay valid.
 * @param {string|Object} nameOrConfig - A registered theme name or a full theme object
 */
export function setTheme(nameOrConfig) {
  const source =
    typeof nameOrConfig === "string" ? THEMES[nameOrConfig] : nameOrConfig;
  if (!source) {
    console.warn(`Theme "${nameOrConfig}" not found`);
    return;
  }
  _deepAssign(UI_THEME, source);
}

/**
 * Register a custom theme under a name.
 * @param {string} name
 * @param {Object} themeConfig
 */
export function registerTheme(name, themeConfig) {
  THEMES[name] = themeConfig;
}

/** Deep assign source into target, recursing into plain objects. */
function _deepAssign(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      _deepAssign(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

export default UI_THEME;
