/**
 * GCanvas Shapes Module
 * Base classes and geometric primitives for 2D rendering.
 * @module shapes
 */

import { Bounds, Point } from './common';
import { Loggable, LoggableOptions } from './logger';

// ==========================================================================
// Base Classes - Spatial Hierarchy
// ==========================================================================

/** Options for Euclidian base class */
export interface EuclidianOptions extends LoggableOptions {
  /** X position */
  x?: number;
  /** Y position */
  y?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
  /** Enable debug visualization */
  debug?: boolean;
  /** Color for debug bounding box */
  debugColor?: string;
}

/**
 * Root class for all drawable objects with spatial properties.
 * Provides x, y, width, height positioning.
 * @abstract
 */
export class Euclidian extends Loggable {
  constructor(options?: EuclidianOptions);

  /** X position */
  get x(): number;
  set x(v: number);
  /** Y position */
  get y(): number;
  set y(v: number);
  /** Width */
  get width(): number;
  set width(v: number);
  /** Height */
  get height(): number;
  set height(v: number);
  /** Debug mode enabled */
  get debug(): boolean;
  set debug(v: boolean);
  /** Debug bounding box color */
  get debugColor(): string;
  set debugColor(v: string);

  /** @internal Validate a property value */
  protected validateProp(v: any, prop: string): void;
}

/** Options for Geometry2d */
export interface Geometry2dOptions extends EuclidianOptions {
  /** Minimum X constraint */
  minX?: number;
  /** Maximum X constraint */
  maxX?: number;
  /** Minimum Y constraint */
  minY?: number;
  /** Maximum Y constraint */
  maxY?: number;
  /** Enable crisp pixel rendering */
  crisp?: boolean;
}

/**
 * Spatial object with bounding box calculations and constraints.
 * Extends Euclidian with bounds calculation and movement constraints.
 * @abstract
 */
export class Geometry2d extends Euclidian {
  /** Enable crisp pixel rendering (rounds coordinates) */
  crisp: boolean;

  constructor(options?: Geometry2dOptions);

  /** Minimum X constraint */
  get minX(): number | undefined;
  set minX(v: number | undefined);
  /** Maximum X constraint */
  get maxX(): number | undefined;
  set maxX(v: number | undefined);
  /** Minimum Y constraint */
  get minY(): number | undefined;
  set minY(v: number | undefined);
  /** Maximum Y constraint */
  get maxY(): number | undefined;
  set maxY(v: number | undefined);
  /** Whether bounds need recalculation */
  get boundsDirty(): boolean;

  /** Update the object (called each frame) */
  update(dt?: number): void;
  /** Apply position constraints */
  applyConstraints(): void;
  /** Get the bounding box (cached) */
  getBounds(): Bounds;
  /** Calculate the bounding box (override in subclasses) */
  protected calculateBounds(): Bounds;
  /** Get position relative to parent */
  getLocalPosition(): Point;
  /** Mark bounds as needing recalculation */
  markBoundsDirty(): void;
  /** Set position by top-left corner */
  setTopLeft(x: number, y: number): this;
  /** Set position by center point */
  setCenter(x: number, y: number): this;
}

/**
 * Adds tracing/debugging support to geometry objects.
 * @abstract
 */
export class Traceable extends Geometry2d {
  constructor(options?: Geometry2dOptions);

  /** Draw debug visualization */
  drawDebug(): void;
  /** Get bounds for debug drawing */
  getDebugBounds(): Bounds;
  /** Log a trace message */
  trace(msg?: string): void;
}

// ==========================================================================
// Renderable - Visibility & Effects
// ==========================================================================

/** Options for Renderable */
export interface RenderableOptions extends Geometry2dOptions {
  /** Whether object is visible */
  visible?: boolean;
  /** Opacity (0-1) */
  opacity?: number;
  /** Whether object is active */
  active?: boolean;
  /** Canvas blend mode */
  blendMode?: GlobalCompositeOperation;
  /** Shadow color */
  shadowColor?: string;
  /** Shadow blur radius */
  shadowBlur?: number;
  /** Shadow X offset */
  shadowOffsetX?: number;
  /** Shadow Y offset */
  shadowOffsetY?: number;
  /** Z-index for rendering order */
  zIndex?: number;
}

/**
 * Render-capable object with visibility, opacity, blend mode, and shadow support.
 * @abstract
 */
export class Renderable extends Traceable {
  /** Z-index for rendering order */
  zIndex: number;

  constructor(options?: RenderableOptions);

  /** Whether object is visible */
  get visible(): boolean;
  set visible(v: boolean);
  /** Whether object is active (receives updates) */
  get active(): boolean;
  set active(v: boolean);
  /** Opacity (0-1) */
  get opacity(): number;
  set opacity(v: number);
  /** Canvas blend mode */
  get blendMode(): GlobalCompositeOperation;
  set blendMode(v: GlobalCompositeOperation);
  /** Shadow color */
  get shadowColor(): string | undefined;
  set shadowColor(v: string | undefined);
  /** Shadow blur radius */
  get shadowBlur(): number;
  set shadowBlur(v: number);
  /** Shadow X offset */
  get shadowOffsetX(): number;
  set shadowOffsetX(v: number);
  /** Shadow Y offset */
  get shadowOffsetY(): number;
  set shadowOffsetY(v: number);
  /** Current frame tick count */
  get tick(): number;

  /** Render the object (handles transforms and calls draw) */
  render(): void;
  /** Draw the object (override in subclasses) */
  draw(): void;
  /** Update the object */
  update(dt: number): void;
  /** Apply shadow settings to context */
  applyShadow(ctx: CanvasRenderingContext2D): void;
}

// ==========================================================================
// Transformable - Rotation & Scale
// ==========================================================================

/** Options for Transformable */
export interface TransformableOptions extends RenderableOptions {
  /** Rotation in degrees */
  rotation?: number;
  /** X scale factor */
  scaleX?: number;
  /** Y scale factor */
  scaleY?: number;
}

/**
 * Renderable object with canvas transformation support (rotation, scale).
 * @abstract
 */
export class Transformable extends Renderable {
  /** Fluent transform API */
  transform: Transform;
  /** Reference to parent container (if any) */
  parent: Transformable | null;

  constructor(options?: TransformableOptions);

  /** Rotation in degrees */
  get rotation(): number;
  set rotation(v: number);
  /** X scale factor */
  get scaleX(): number;
  set scaleX(v: number);
  /** Y scale factor */
  get scaleY(): number;
  set scaleY(v: number);

  /** Draw with transforms applied */
  draw(): void;
  /** Apply canvas transforms */
  applyTransforms(): void;
  /** Calculate bounds with transforms */
  calculateBounds(): Bounds;
}

// ==========================================================================
// Transform - Fluent API
// ==========================================================================

/** Transform properties for batch operations */
export interface TransformProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * Fluent API for modifying spatial and transform properties.
 * Allows chaining transform operations.
 *
 * @example
 * shape.transform
 *   .position(100, 100)
 *   .rotation(45)
 *   .scale(2);
 */
export class Transform {
  /** Enable strict mode warnings for direct property assignment */
  static strictMode: boolean;

  constructor(owner: Transformable);

  /** Get the owner of this transform */
  get owner(): Transformable;

  // Position methods
  /** Set X position */
  x(value: number): this;
  /** Set Y position */
  y(value: number): this;
  /** Set X and Y position */
  position(x: number, y: number): this;
  /** Translate by delta values */
  translateBy(dx: number, dy: number): this;

  // Dimension methods
  /** Set width */
  width(value: number): this;
  /** Set height */
  height(value: number): this;
  /** Set width and height */
  size(width: number, height: number): this;

  // Rotation methods
  /** Set rotation in degrees */
  rotation(degrees: number): this;
  /** Set rotation in radians */
  rotationRad(radians: number): this;
  /** Add to current rotation */
  rotateBy(degrees: number): this;

  // Scale methods
  /** Set X scale */
  scaleX(value: number): this;
  /** Set Y scale */
  scaleY(value: number): this;
  /** Set uniform scale (X and Y) */
  scale(value: number): this;
  /** Multiply current scale */
  scaleBy(factor: number): this;

  // Batch operations
  /** Set multiple properties at once */
  set(props: TransformProps): this;
  /** Reset scale and rotation to defaults */
  reset(): this;
  /** Reset all transform properties including position */
  resetAll(): this;

  // Utility methods
  /** Get current transform state as object */
  toObject(): Required<TransformProps>;
  /** Copy transform values from another source */
  copyFrom(source: Transform | TransformProps): this;

  /** @internal Handle direct property set warnings */
  static handleDirectSet(property: string, value: any): void;
}

// ==========================================================================
// Shape - Styled Geometry Base
// ==========================================================================

/** Options for Shape */
export interface ShapeOptions extends TransformableOptions {
  /** Fill color (null for no fill) */
  color?: string | null;
  /** Stroke color (null for no stroke) */
  stroke?: string | null;
  /** Stroke line width */
  lineWidth?: number;
  /** Line join style */
  lineJoin?: 'miter' | 'round' | 'bevel';
  /** Line cap style */
  lineCap?: 'butt' | 'round' | 'square';
  /** Miter limit for sharp corners */
  miterLimit?: number;
}

/**
 * Base class for drawable geometric primitives.
 * Adds fill, stroke, and line styling to Transformable.
 * @abstract
 */
export class Shape extends Transformable {
  constructor(options?: ShapeOptions);

  /** Fill color */
  get color(): string | null;
  set color(v: string | null);
  /** Stroke color */
  get stroke(): string | null;
  set stroke(v: string | null);
  /** Stroke line width */
  get lineWidth(): number;
  set lineWidth(v: number);
  /** Line join style */
  get lineJoin(): 'miter' | 'round' | 'bevel';
  set lineJoin(v: 'miter' | 'round' | 'bevel');
  /** Line cap style */
  get lineCap(): 'butt' | 'round' | 'square';
  set lineCap(v: 'butt' | 'round' | 'square');
  /** Miter limit */
  get miterLimit(): number;
  set miterLimit(v: number);
}

// ==========================================================================
// Group - Container
// ==========================================================================

/** Options for Group */
export interface GroupOptions extends TransformableOptions {
  /** Children inherit parent opacity */
  inheritOpacity?: boolean;
  /** Children inherit parent visibility */
  inheritVisible?: boolean;
  /** Children inherit parent scale */
  inheritScale?: boolean;
  /** Sort children by zIndex before rendering */
  sortByZIndex?: boolean;
}

/**
 * Container for composing multiple transformable objects.
 * Children are transformed relative to the group's position.
 */
export class Group extends Transformable {
  /** Whether dimensions were explicitly set */
  userDefinedDimensions: boolean;

  constructor(options?: GroupOptions);

  /** Get all children */
  get children(): Transformable[];

  /** Add a child object */
  add(object: Transformable): Transformable;
  /** Remove a child object */
  remove(object: Transformable): boolean;
  /** Remove all children */
  clear(): void;
  /** Move object to front (highest z-order) */
  bringToFront(object: Transformable): void;
  /** Move object to back (lowest z-order) */
  sendToBack(object: Transformable): void;
  /** Move object forward one z-level */
  bringForward(object: Transformable): void;
  /** Move object backward one z-level */
  sendBackward(object: Transformable): void;

  draw(): void;
  update(dt: number): void;
  calculateBounds(): Bounds;
  getDebugBounds(): Bounds;

  // Group-wide transform operations
  /** Execute callback for each child's transform */
  forEachTransform(callback: (transform: Transform, child: Transformable, index: number) => void): this;
  /** Translate all children by delta */
  translateChildren(dx: number, dy: number): this;
  /** Scale all children by factor */
  scaleChildren(factor: number): this;
  /** Rotate all children by degrees */
  rotateChildren(degrees: number): this;
  /** Reset all children's transforms */
  resetChildTransforms(): this;
}

// ==========================================================================
// Concrete Shape Classes
// ==========================================================================

/**
 * Circle shape.
 */
export class Circle extends Shape {
  /**
   * @param radius - Circle radius
   * @param options - Shape options
   */
  constructor(radius: number, options?: ShapeOptions);

  /** Circle radius */
  get radius(): number;
  set radius(v: number);

  draw(): void;
  calculateBounds(): Bounds;
}

/**
 * Rectangle shape.
 */
export class Rectangle extends Shape {
  constructor(options?: ShapeOptions);

  draw(): void;
  /** @internal */
  protected drawRect(): void;
}

/** Options for RoundedRectangle */
export interface RoundedRectangleOptions extends ShapeOptions {
  /** Corner radius */
  cornerRadius?: number;
}

/**
 * Rectangle with rounded corners.
 */
export class RoundedRectangle extends Shape {
  constructor(options?: RoundedRectangleOptions);

  /** Corner radius */
  get cornerRadius(): number;
  set cornerRadius(v: number);
}

/**
 * Square shape (Rectangle with equal width/height).
 */
export class Square extends Rectangle {
  /**
   * @param size - Side length
   * @param options - Shape options
   */
  constructor(size: number, options?: ShapeOptions);
}

/** Options for Arc */
export interface ArcOptions extends ShapeOptions {
  /** Start angle in radians */
  startAngle?: number;
  /** End angle in radians */
  endAngle?: number;
  /** Draw counter-clockwise */
  counterClockwise?: boolean;
}

/**
 * Arc shape (partial circle).
 */
export class Arc extends Shape {
  /**
   * @param radius - Arc radius
   * @param options - Arc options
   */
  constructor(radius: number, options?: ArcOptions);

  /** Arc radius */
  get radius(): number;
  set radius(v: number);
}

/**
 * Line segment.
 */
export class Line extends Shape {
  /**
   * @param x1 - Start X
   * @param y1 - Start Y
   * @param x2 - End X
   * @param y2 - End Y
   * @param options - Shape options
   */
  constructor(x1: number, y1: number, x2: number, y2: number, options?: ShapeOptions);
}

/**
 * Triangle shape.
 */
export class Triangle extends Shape {
  constructor(options?: ShapeOptions);
}

/** Options for Star */
export interface StarOptions extends ShapeOptions {
  /** Number of points */
  points?: number;
  /** Inner radius */
  innerRadius?: number;
  /** Outer radius */
  outerRadius?: number;
}

/**
 * Star shape with configurable points.
 */
export class Star extends Shape {
  constructor(options?: StarOptions);
}

/**
 * Regular polygon with N sides.
 */
export class Polygon extends Shape {
  /**
   * @param sides - Number of sides
   * @param radius - Circumscribed circle radius
   * @param options - Shape options
   */
  constructor(sides: number, radius: number, options?: ShapeOptions);
}

/**
 * Regular hexagon (6-sided polygon).
 */
export class Hexagon extends Polygon {
  /**
   * @param radius - Circumscribed circle radius
   * @param options - Shape options
   */
  constructor(radius: number, options?: ShapeOptions);
}

/**
 * Diamond/rhombus shape.
 */
export class Diamond extends Shape {
  constructor(options?: ShapeOptions);
}

/**
 * Cross/plus shape.
 */
export class Cross extends Shape {
  constructor(options?: ShapeOptions);
}

/**
 * Heart shape.
 */
export class Heart extends Shape {
  constructor(options?: ShapeOptions);
}

/** Options for Ring */
export interface RingOptions extends ShapeOptions {
  /** Inner radius */
  innerRadius?: number;
  /** Outer radius */
  outerRadius?: number;
}

/**
 * Ring/donut shape.
 */
export class Ring extends Shape {
  constructor(options?: RingOptions);
}

/**
 * Cloud shape.
 */
export class Cloud extends Shape {
  constructor(options?: ShapeOptions);
}

/**
 * Pin/marker shape.
 */
export class Pin extends Shape {
  constructor(options?: ShapeOptions);
}

/**
 * Arrow shape.
 */
export class Arrow extends Shape {
  constructor(options?: ShapeOptions);
}

/** Options for PieSlice */
export interface PieSliceOptions extends ShapeOptions {
  /** Start angle in radians */
  startAngle?: number;
  /** End angle in radians */
  endAngle?: number;
}

/**
 * Pie slice/wedge shape.
 */
export class PieSlice extends Shape {
  /**
   * @param radius - Slice radius
   * @param options - Pie slice options
   */
  constructor(radius: number, options?: PieSliceOptions);
}

/**
 * Bezier curve shape.
 */
export class BezierShape extends Shape {
  /**
   * @param points - Control points [P0, P1, P2, P3]
   * @param options - Shape options
   */
  constructor(points: Point[], options?: ShapeOptions);
}

/**
 * SVG path shape.
 */
export class SVGShape extends Shape {
  /**
   * Load an SVG file from a URL and create an SVGShape
   * @param url - URL to the SVG file
   * @param options - Shape options
   * @returns Promise that resolves to the SVGShape instance
   */
  static fromURL(url: string, options?: ShapeOptions): Promise<SVGShape>;

  /**
   * @param svgPath - SVG path string (d attribute)
   * @param options - Shape options
   */
  constructor(svgPath: string, options?: ShapeOptions);
}

/**
 * Stick figure shape.
 */
export class StickFigure extends Shape {
  constructor(options?: ShapeOptions);
}

/** Options for PatternRectangle */
export interface PatternRectangleOptions extends ShapeOptions {
  /** Canvas pattern or pattern name */
  pattern?: CanvasPattern | string;
}

/**
 * Rectangle filled with a pattern.
 */
export class PatternRectangle extends Rectangle {
  constructor(options?: PatternRectangleOptions);
}

/** Options for ImageShape */
export interface ImageShapeOptions extends ShapeOptions {
  /** Anchor point for positioning (e.g., "center", "top-left") */
  anchor?: string;
  /** Enable image smoothing (default: true) */
  smoothing?: boolean;
}

/** Type for bitmap sources that ImageShape accepts */
export type BitmapSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap | HTMLVideoElement | ImageData;

/**
 * Image shape for rendering arbitrary pixel buffers.
 * Supports HTMLImageElement, HTMLCanvasElement, ImageBitmap, HTMLVideoElement, and ImageData.
 *
 * @example
 * const data = Painter.img.getImageData(0, 0, 320, 200);
 * const shape = new ImageShape(data, { x: 100, y: 50, anchor: "center" });
 * scene.add(shape);
 */
export class ImageShape extends Shape {
  /**
   * Create an ImageShape.
   * @param bitmap - Image source (HTMLImageElement, HTMLCanvasElement, ImageBitmap, HTMLVideoElement, or ImageData)
   * @param options - Shape options including anchor and smoothing
   */
  constructor(bitmap: BitmapSource | null, options?: ImageShapeOptions);

  /** The internal bitmap */
  get bitmap(): BitmapSource | null;
  set bitmap(v: BitmapSource | null);

  /** Anchor position (e.g., "center", "top-left") */
  anchor: string;

  /** Whether image smoothing is enabled */
  smoothing: boolean;

  /**
   * Update the canvas buffer for ImageData sources.
   * @param bitmap - ImageData to buffer
   */
  buffer(bitmap: ImageData): void;

  /** Reset the image to an empty state */
  reset(): void;

  /**
   * Set the anchor point.
   * @param anchor - Anchor position string
   */
  setAnchor(anchor: string): void;
}

// ==========================================================================
// 2.5D / Isometric Shapes
// ==========================================================================

/** Options for Cube */
export interface CubeOptions extends ShapeOptions {
  /** Top face color */
  faceTopColor?: string;
  /** Left face color */
  faceLeftColor?: string;
  /** Right face color */
  faceRightColor?: string;
  /** X rotation for perspective */
  rotationX?: number;
  /** Y rotation for perspective */
  rotationY?: number;
}

/**
 * Isometric cube shape.
 */
export class Cube extends Shape {
  /**
   * @param size - Cube size
   * @param options - Cube options
   */
  constructor(size: number, options?: CubeOptions);
}

/**
 * Isometric cylinder shape.
 */
export class Cylinder extends Shape {
  /**
   * @param radius - Cylinder radius
   * @param height - Cylinder height
   * @param options - Shape options
   */
  constructor(radius: number, height: number, options?: ShapeOptions);
}

/**
 * Isometric cone shape.
 */
export class Cone extends Shape {
  /**
   * @param radius - Base radius
   * @param height - Cone height
   * @param options - Shape options
   */
  constructor(radius: number, height: number, options?: ShapeOptions);
}

/**
 * Isometric prism shape.
 */
export class Prism extends Shape {
  constructor(options?: ShapeOptions);
}

/**
 * Isometric sphere shape.
 */
export class Sphere extends Shape {
  /**
   * @param radius - Sphere radius
   * @param options - Shape options
   */
  constructor(radius: number, options?: ShapeOptions);
}

/** Options for Sphere3D */
export interface Sphere3DOptions extends ShapeOptions {
  /** Sphere radius */
  radius?: number;
  /** Number of latitude segments */
  latSegments?: number;
  /** Number of longitude segments */
  lonSegments?: number;
  /** Base color */
  color?: string;
  /** Light direction [x, y, z] */
  lightDirection?: [number, number, number];
  /** Ambient light intensity (0-1) */
  ambientLight?: number;
  /** Whether to use glow effect */
  glow?: boolean;
  /** Glow color */
  glowColor?: string;
  /** Glow intensity */
  glowIntensity?: number;
  /** Whether to use wireframe */
  wireframe?: boolean;
  /** Wireframe color */
  wireframeColor?: string;
}

/**
 * 3D sphere with Camera3D projection support.
 * Renders a proper 3D sphere with lighting and optional effects.
 *
 * @example
 * const sphere = new Sphere3D({
 *   x: 0, y: 0, z: 0,
 *   radius: 100,
 *   color: '#ff6600',
 *   glow: true
 * });
 */
export class Sphere3D extends Shape {
  /** Sphere radius */
  radius: number;
  /** Z position in 3D space */
  z: number;
  /** Camera3D instance for projection */
  camera: any;

  constructor(options?: Sphere3DOptions);

  /**
   * Set the camera for 3D projection.
   * @param camera - Camera3D instance
   */
  setCamera(camera: any): Sphere3D;

  /**
   * Set position in 3D space.
   * @param x - X position
   * @param y - Y position
   * @param z - Z position
   */
  setPosition(x: number, y: number, z: number): Sphere3D;
}

// ==========================================================================
// Text Shapes
// ==========================================================================

/** Options for TextShape */
export interface TextShapeOptions extends ShapeOptions {
  /** CSS font string */
  font?: string;
  /** Text alignment */
  align?: CanvasTextAlign;
  /** Text baseline */
  baseline?: CanvasTextBaseline;
}

/**
 * Basic text shape.
 */
export class TextShape extends Shape {
  /** The text content */
  text: string;

  /**
   * @param text - Text to display
   * @param options - Text options
   */
  constructor(text: string, options?: TextShapeOptions);
}

/** Options for OutlinedText */
export interface OutlinedTextOptions extends TextShapeOptions {
  /** Outline color */
  outlineColor?: string;
  /** Outline width */
  outlineWidth?: number;
}

/**
 * Text with outline/stroke effect.
 */
export class OutlinedText extends TextShape {
  /**
   * @param text - Text to display
   * @param options - Outlined text options
   */
  constructor(text: string, options?: OutlinedTextOptions);
}

/**
 * Text with automatic word wrapping.
 */
export class WrappedText extends TextShape {
  /**
   * @param x - X position
   * @param y - Y position
   * @param text - Text to display
   * @param maxWidth - Maximum line width
   * @param lineHeight - Line height
   * @param options - Text options
   */
  constructor(x: number, y: number, text: string, maxWidth: number, lineHeight: number, options?: TextShapeOptions);
}
