import { Painter } from "./painter";

export class PainterColors {
  /**
   * Fill the current path
   * @param {string|CanvasGradient} [color] - Fill color
   * @returns {void}
   */
  static fill(color) {
    Painter.logger.log("PainterColors.fill - before:", 
      Painter.ctx.fillStyle, "setting to:", color);
    
    // Store original
    const originalFill = Painter.ctx.fillStyle;
    
    // Set new color
    Painter.ctx.fillStyle = color;
    
    // Fill
    Painter.ctx.fill();
    
    // Log after
    Painter.logger.log("PainterColors.fill - after:", Painter.ctx.fillStyle);
    
    // Maybe the issue is the fill() call itself?
    // Try uncommenting this to restore the original fillStyle
    // Painter.ctx.fillStyle = originalFill;
  }
  /**
   * Set stroke options
   * @param {*} options The options for the stroke
   */
  static strokeOptions(options) {
    if (options.color) Painter.ctx.strokeStyle = options.color;
    if (options.lineWidth !== undefined)
      Painter.ctx.lineWidth = options.lineWidth;
    if (options.lineCap) Painter.ctx.lineCap = options.lineCap;
    if (options.lineJoin) Painter.ctx.lineJoin = options.lineJoin;
    if (options.strokeStyle) Painter.ctx.strokeStyle = options.strokeStyle;
  }
  /**
   * Stroke the current path
   * @param {string|CanvasGradient} [color] - Stroke color
   * @param {number} [lineWidth] - Line width
   * @returns {void}
   */
  static stroke(color, lineWidth) {
    if (color) Painter.ctx.strokeStyle = color;
    if (lineWidth !== undefined) Painter.ctx.lineWidth = lineWidth;
    Painter.ctx.stroke();
  }

  /**
   * Set fill color
   * @param {string|CanvasGradient} color - Fill color
   * @returns {void}
   */
  static setFillColor(color) {
    Painter.ctx.fillStyle = color;
  }

  /**
   * Set stroke color
   * @param {string|CanvasGradient} color - Stroke color
   * @returns {void}
   */
  static setStrokeColor(color) {
    Painter.ctx.strokeStyle = color;
  }

  /**
   * Generate a random pleasing color in RGB format
   * @returns {Array<number>} RGB color array [r, g, b]
   */
  static randomColorRGB() {
    // Generate vibrant, pleasing colors by using HSL first
    // then converting to RGB
    // Random hue (0-360)
    const hue = Math.floor(Math.random() * 360);
    // High saturation for vibrant colors (70-100%)
    const saturation = 70 + Math.floor(Math.random() * 30);
    // Medium-high lightness for visibility (50-70%)
    const lightness = 50 + Math.floor(Math.random() * 20);
    // Convert HSL to RGB
    return Painter.colors.hslToRgb(hue, saturation, lightness);
  }

  static randomColorRGBA(alpha = 255) {
    const [r, g, b] = this.randomColorRGB();
    return [r, g, b, alpha];
  }

  static randomColorHSL() {
    return `hsl(${Math.random() * 360}, 100%, 50%)`;
  }

  static randomColorHSL_RGBA(alpha = 255) {
    const h = Math.random() * 360;
    const s = 60 + Math.random() * 40; // 60–100%
    const l = 40 + Math.random() * 40; // 40–80%
    const [r, g, b] = Painter.colors.hslToRgb(h, s, l);
    return [r, g, b, alpha];
  }

  static randomColorHEX() {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return "#" + n.slice(0, 6);
  }

  static parseColorString(str) {
    str = str.trim().toLowerCase();

    // 1) Check if it's hsl(...) form
    if (str.startsWith("hsl")) {
      // e.g. "hsl(130, 100%, 50%)"
      // Remove "hsl(" and ")" => "130, 100%, 50%"
      const inner = str.replace(/hsla?\(|\)/g, "");
      const [hue, satPercent, lightPercent] = inner
        .split(",")
        .map((c) => c.trim());
      const h = parseFloat(hue);
      const s = parseFloat(satPercent) / 100;
      const l = parseFloat(lightPercent) / 100;
      return Painter.colors.hslToRgb(h, s, l); // Convert HSL->RGB
    }

    // 2) Check if it's #RRGGBB
    if (str.startsWith("#")) {
      // e.g. "#ff00ff" => r=255,g=0,b=255
      return hexToRgb(str);
    }

    // 3) If it's rgb(...) form, parse that
    if (str.startsWith("rgb")) {
      // e.g. "rgb(255, 128, 50)"
      // Remove "rgb(" + ")"
      const inner = str.replace(/rgba?\(|\)/g, "");
      const [r, g, b] = inner.split(",").map((x) => parseInt(x.trim()));
      return [r, g, b];
    }

    // Fallback: assume black
    return [0, 0, 0];
  }

  /**
   * Convert [r,g,b] => "rgb(r, g, b)" string
   */
  static rgbArrayToCSS([r, g, b]) {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  /**
   * Convert HSL => [r,g,b] (0..255).
   * Formulas from standard color conversion references.
   */
  static hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  static rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0,
      s = 0,
      l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r:
          h = 60 * (((g - b) / delta + 6) % 6);
          break;
        case g:
          h = 60 * ((b - r) / delta + 2);
          break;
        case b:
          h = 60 * ((r - g) / delta + 4);
          break;
      }
    }

    return [h % 360, s, l];
  }

  /**
   * Convert a hex color like "#ff00ff" => [255, 0, 255].
   */
  static hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  }
  // GRADIENT METHODS
  // =========================================================================

  /**
   * Create a linear gradient
   * @param {number} x0 - Start X
   * @param {number} y0 - Start Y
   * @param {number} x1 - End X
   * @param {number} y1 - End Y
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static linearGradient(x0, y0, x1, y1, colorStops) {
    const gradient = Painter.ctx.createLinearGradient(x0, y0, x1, y1);

    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    return gradient;
  }

  /**
   * Create a radial gradient
   * @param {number} x0 - Inner circle center X
   * @param {number} y0 - Inner circle center Y
   * @param {number} r0 - Inner circle radius
   * @param {number} x1 - Outer circle center X
   * @param {number} y1 - Outer circle center Y
   * @param {number} r1 - Outer circle radius
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static radialGradient(x0, y0, r0, x1, y1, r1, colorStops) {
    const gradient = Painter.ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);

    for (const stop of colorStops) {
      gradient.addColorStop(stop.offset, stop.color);
    }

    return gradient;
  }

  /**
   * Create a vertical gradient (convenience method)
   * @param {number} x - X position
   * @param {number} y - Top Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static verticalGradient(x, y, width, height, colorStops) {
    return Painter.colors.linearGradient(x, y, x, y + height, colorStops);
  }

  /**
   * Create a horizontal gradient (convenience method)
   * @param {number} x - Left X position
   * @param {number} y - Y position
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static horizontalGradient(x, y, width, height, colorStops) {
    return Painter.colors.linearGradient(x, y, x + width, y, colorStops);
  }

  /**
   * Create a conic gradient
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} startAngle - Start angle in radians
   * @param {Array<{offset: number, color: string}>} colorStops - Array of color stops
   * @returns {CanvasGradient} The created gradient
   */
  static conicGradient(x, y, startAngle, colorStops) {
    // For browsers that support it
    if (typeof Painter.ctx.createConicGradient === "function") {
      const gradient = Painter.ctx.createConicGradient(startAngle, x, y);
      for (const stop of colorStops) {
        gradient.addColorStop(stop.offset, stop.color);
      }
      return gradient;
    }
    return null;
  }

  /**
   * Create an RGBA color string
   * @param {number} r - Red (0-255)
   * @param {number} g - Green (0-255)
   * @param {number} b - Blue (0-255)
   * @param {number} [a=1] - Alpha (0-1)
   * @returns {string} RGBA color string
   */
  static rgba(r, g, b, a = 1) {
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
  }

  /**
   * Create an HSL color string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {string} HSL color string
   */
  static hsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  /**
   * Create an HSLA color string
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @param {number} a - Alpha (0-1)
   * @returns {string} HSLA color string
   */
  static hsla(h, s, l, a) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }
}
