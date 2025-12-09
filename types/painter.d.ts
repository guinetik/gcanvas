/**
 * GCanvas Painter Module
 * Static utility class for canvas drawing operations.
 * @module painter
 */

import { Point } from './common';
import { Logger } from './logger';

// ==========================================================================
// Main Painter Class
// ==========================================================================

/**
 * Static utility class centralizing all canvas drawing operations.
 * Must be initialized with a canvas context before use.
 *
 * @example
 * // Initialize Painter
 * Painter.init(canvas.getContext('2d'));
 *
 * // Draw shapes
 * Painter.shapes.rect(10, 10, 100, 50, 'red');
 * Painter.shapes.fillCircle(200, 100, 30, 'blue');
 */
export class Painter {
  /** The canvas 2D rendering context */
  static ctx: CanvasRenderingContext2D;
  /** Logger instance */
  static logger: Logger;

  /** Color utilities */
  static readonly colors: typeof PainterColors;
  /** Visual effects utilities */
  static readonly effects: typeof PainterEffects;
  /** Image drawing utilities */
  static readonly img: typeof PainterImages;
  /** Line drawing utilities */
  static readonly lines: typeof PainterLines;
  /** Opacity management utilities */
  static readonly opacity: typeof PainterOpacity;
  /** Shape drawing utilities */
  static readonly shapes: typeof PainterShapes;
  /** Text drawing utilities */
  static readonly text: typeof PainterText;

  /**
   * Initialize Painter with a canvas context.
   * @param ctx - The 2D rendering context
   */
  static init(ctx: CanvasRenderingContext2D): void;

  /** Save the current canvas state */
  static save(): void;
  /** Restore the previously saved canvas state */
  static restore(): void;

  /**
   * Translate to a position (resets previous translation).
   * @param x - X position
   * @param y - Y position
   */
  static translateTo(x: number, y: number): void;

  /** Reset translation to origin */
  static resetPosition(): void;

  /**
   * Execute a callback at a specific position.
   * Saves state, translates, executes callback, then restores.
   * @param x - X position
   * @param y - Y position
   * @param callback - Function to execute at position
   */
  static withPosition(x: number, y: number, callback: () => void): void;

  /**
   * Clear a rectangular area of the canvas.
   * @param x - X position (default: 0)
   * @param y - Y position (default: 0)
   * @param width - Width (default: canvas width)
   * @param height - Height (default: canvas height)
   */
  static clear(x?: number, y?: number, width?: number, height?: number): void;

  /**
   * Translate the canvas context.
   * @param x - X offset
   * @param y - Y offset
   */
  static translate(x: number, y: number): void;

  /**
   * Rotate the canvas context.
   * @param angle - Rotation angle in radians
   */
  static rotate(angle: number): void;

  /**
   * Scale the canvas context.
   * @param x - X scale factor
   * @param y - Y scale factor
   */
  static scale(x: number, y: number): void;
}

// ==========================================================================
// Painter Sub-Modules
// ==========================================================================

/**
 * Color manipulation utilities.
 */
export class PainterColors {
  /**
   * Convert hex color to RGB object.
   * @param hex - Hex color string (e.g., "#ff0000")
   * @returns RGB values or null if invalid
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null;

  /**
   * Convert RGB values to hex string.
   * @param r - Red (0-255)
   * @param g - Green (0-255)
   * @param b - Blue (0-255)
   * @returns Hex color string
   */
  static rgbToHex(r: number, g: number, b: number): string;

  /**
   * Lighten a color.
   * @param color - Color string
   * @param amount - Lighten amount (0-1)
   * @returns Lightened color
   */
  static lighten(color: string, amount: number): string;

  /**
   * Darken a color.
   * @param color - Color string
   * @param amount - Darken amount (0-1)
   * @returns Darkened color
   */
  static darken(color: string, amount: number): string;
}

/**
 * Visual effects utilities.
 */
export class PainterEffects {
  /**
   * Set the canvas blend mode.
   * @param mode - Composite operation mode
   */
  static setBlendMode(mode: GlobalCompositeOperation): void;

  /** Reset blend mode to default (source-over) */
  static resetBlendMode(): void;
}

/**
 * Image drawing utilities.
 */
export class PainterImages {
  /**
   * Draw an image to the canvas.
   * @param image - Image or canvas element
   * @param x - X position
   * @param y - Y position
   * @param width - Optional width (defaults to image width)
   * @param height - Optional height (defaults to image height)
   */
  static drawImage(
    image: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): void;
}

/**
 * Line drawing utilities.
 */
export class PainterLines {
  /**
   * Draw a solid line.
   * @param x1 - Start X
   * @param y1 - Start Y
   * @param x2 - End X
   * @param y2 - End Y
   * @param color - Line color
   * @param lineWidth - Line width (default: 1)
   */
  static line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth?: number
  ): void;

  /**
   * Draw a dashed line.
   * @param x1 - Start X
   * @param y1 - Start Y
   * @param x2 - End X
   * @param y2 - End Y
   * @param color - Line color
   * @param dashArray - Dash pattern (e.g., [5, 5])
   * @param lineWidth - Line width (default: 1)
   */
  static dashedLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    dashArray: number[],
    lineWidth?: number
  ): void;
}

/**
 * Opacity/transparency management utilities.
 */
export class PainterOpacity {
  /**
   * Push a new opacity value (multiplies with current).
   * @param opacity - Opacity value (0-1)
   */
  static pushOpacity(opacity: number): void;

  /** Pop the most recent opacity value */
  static popOpacity(): void;

  /** Save the current opacity state */
  static saveOpacityState(): void;

  /** Restore the previously saved opacity state */
  static restoreOpacityState(): void;
}

/**
 * Shape drawing utilities.
 */
export class PainterShapes {
  /**
   * Draw a filled rectangle.
   * @param x - X position
   * @param y - Y position
   * @param width - Width
   * @param height - Height
   * @param color - Fill color
   */
  static rect(x: number, y: number, width: number, height: number, color: string): void;

  /**
   * Draw a stroked rectangle.
   * @param x - X position
   * @param y - Y position
   * @param width - Width
   * @param height - Height
   * @param color - Stroke color
   * @param lineWidth - Line width (default: 1)
   */
  static outlineRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth?: number
  ): void;

  /**
   * Draw a filled rounded rectangle.
   * @param x - X position
   * @param y - Y position
   * @param width - Width
   * @param height - Height
   * @param radius - Corner radius
   * @param color - Fill color
   */
  static roundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    color: string
  ): void;

  /**
   * Draw a filled circle.
   * @param x - Center X
   * @param y - Center Y
   * @param radius - Radius
   * @param color - Fill color
   */
  static fillCircle(x: number, y: number, radius: number, color: string): void;

  /**
   * Draw a stroked circle.
   * @param x - Center X
   * @param y - Center Y
   * @param radius - Radius
   * @param color - Stroke color
   * @param lineWidth - Line width (default: 1)
   */
  static strokeCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
    lineWidth?: number
  ): void;

  /**
   * Draw an arc.
   * @param x - Center X
   * @param y - Center Y
   * @param radius - Radius
   * @param startAngle - Start angle in radians
   * @param endAngle - End angle in radians
   * @param color - Stroke color
   * @param lineWidth - Line width (default: 1)
   */
  static arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    color: string,
    lineWidth?: number
  ): void;

  /**
   * Draw a filled polygon.
   * @param points - Array of points
   * @param color - Fill color
   */
  static polygon(points: Point[], color: string): void;

  /**
   * Draw a stroked polygon.
   * @param points - Array of points
   * @param color - Stroke color
   * @param lineWidth - Line width (default: 1)
   */
  static outlinePolygon(points: Point[], color: string, lineWidth?: number): void;
}

/**
 * Text drawing utilities.
 */
export class PainterText {
  /**
   * Draw text.
   * @param text - Text string
   * @param x - X position
   * @param y - Y position
   * @param color - Text color
   * @param font - CSS font string (optional)
   */
  static text(text: string, x: number, y: number, color: string, font?: string): void;

  /**
   * Measure text dimensions.
   * @param text - Text string
   * @param font - CSS font string (optional)
   * @returns Text metrics
   */
  static measureText(text: string, font?: string): TextMetrics;
}
