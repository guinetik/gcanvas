/**
 * GCanvas - TypeScript Definitions
 * A minimalist 2D canvas rendering library with shapes, game engine, and animations.
 * @version 0.0.3-alpha
 */

declare module 'gcanvas' {
  // ==========================================================================
  // Common Types & Interfaces
  // ==========================================================================

  /** Bounding box representing position and dimensions */
  export interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  /** 2D point/position */
  export interface Point {
    x: number;
    y: number;
  }

  /** Easing function type */
  export type EasingFunction = (t: number) => number;

  /** Event callback type */
  export type EventCallback<T = any> = (payload?: T) => void;

  // ==========================================================================
  // Logger Module
  // ==========================================================================

  /** Logger class for debugging and console output */
  export class Logger {
    static DEBUG: number;
    static INFO: number;
    static WARN: number;
    static ERROR: number;

    constructor(name: string);

    log(...args: any[]): void;
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    groupCollapsed(label: string): void;
    groupEnd(): void;
    time(label: string): void;
    timeEnd(label: string): void;

    static getLogger(name: string): Logger;
    static setLevel(level: number): void;
    static setOutput(output: Console | object): void;
    static enable(): void;
    static disable(): void;
    static enableAll(): void;
    static disableAll(): void;
    static enableFor(name: string): void;
    static disableFor(name: string): void;
  }

  /** Base class with logging capabilities */
  export class Loggable {
    name: string;
    protected _logger: Logger;

    constructor(options?: { name?: string });

    get logger(): Logger;
    trace(msg?: string): void;
    protected getLogger(options?: { name?: string }): Logger;
  }

  /** Debug visualization component */
  export class DebugTab {
    static getInstance(): DebugTab;
  }

  // ==========================================================================
  // Shapes Module - Base Classes
  // ==========================================================================

  /** Options for Euclidian base class */
  export interface EuclidianOptions {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    debug?: boolean;
    debugColor?: string;
    name?: string;
  }

  /**
   * Root class for all drawable objects with spatial properties.
   * @abstract
   */
  export class Euclidian extends Loggable {
    constructor(options?: EuclidianOptions);

    get x(): number;
    set x(v: number);
    get y(): number;
    set y(v: number);
    get width(): number;
    set width(v: number);
    get height(): number;
    set height(v: number);
    get debug(): boolean;
    set debug(v: boolean);
    get debugColor(): string;
    set debugColor(v: string);

    protected validateProp(v: any, prop: string): void;
  }

  /** Options for Geometry2d */
  export interface Geometry2dOptions extends EuclidianOptions {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    crisp?: boolean;
  }

  /**
   * Spatial object with bounding box calculations and constraints.
   * @abstract
   */
  export class Geometry2d extends Euclidian {
    crisp: boolean;

    constructor(options?: Geometry2dOptions);

    get minX(): number | undefined;
    set minX(v: number | undefined);
    get maxX(): number | undefined;
    set maxX(v: number | undefined);
    get minY(): number | undefined;
    set minY(v: number | undefined);
    get maxY(): number | undefined;
    set maxY(v: number | undefined);
    get boundsDirty(): boolean;

    update(dt?: number): void;
    applyConstraints(): void;
    getBounds(): Bounds;
    protected calculateBounds(): Bounds;
    getLocalPosition(): Point;
    markBoundsDirty(): void;
    setTopLeft(x: number, y: number): this;
    setCenter(x: number, y: number): this;
  }

  /**
   * Adds tracing/debugging support to geometry objects.
   * @abstract
   */
  export class Traceable extends Geometry2d {
    constructor(options?: Geometry2dOptions);

    drawDebug(): void;
    getDebugBounds(): Bounds;
    trace(msg?: string): void;
  }

  /** Options for Renderable */
  export interface RenderableOptions extends Geometry2dOptions {
    visible?: boolean;
    opacity?: number;
    active?: boolean;
    blendMode?: GlobalCompositeOperation;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    zIndex?: number;
  }

  /**
   * Render-capable object with visibility, opacity, and shadow support.
   * @abstract
   */
  export class Renderable extends Traceable {
    zIndex: number;

    constructor(options?: RenderableOptions);

    get visible(): boolean;
    set visible(v: boolean);
    get active(): boolean;
    set active(v: boolean);
    get opacity(): number;
    set opacity(v: number);
    get shadowColor(): string | undefined;
    set shadowColor(v: string | undefined);
    get shadowBlur(): number;
    set shadowBlur(v: number);
    get shadowOffsetX(): number;
    set shadowOffsetX(v: number);
    get shadowOffsetY(): number;
    set shadowOffsetY(v: number);
    get tick(): number;

    render(): void;
    draw(): void;
    update(dt: number): void;
    applyShadow(ctx: CanvasRenderingContext2D): void;
  }

  /** Options for Transformable */
  export interface TransformableOptions extends RenderableOptions {
    rotation?: number;
    scaleX?: number;
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

    get rotation(): number;
    set rotation(v: number);
    get scaleX(): number;
    set scaleX(v: number);
    get scaleY(): number;
    set scaleY(v: number);

    draw(): void;
    applyTransforms(): void;
    calculateBounds(): Bounds;
  }

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
   */
  export class Transform {
    static strictMode: boolean;

    constructor(owner: Transformable);

    get owner(): Transformable;

    // Position methods
    x(value: number): this;
    y(value: number): this;
    position(x: number, y: number): this;
    translateBy(dx: number, dy: number): this;

    // Dimension methods
    width(value: number): this;
    height(value: number): this;
    size(width: number, height: number): this;

    // Rotation methods
    rotation(degrees: number): this;
    rotationRad(radians: number): this;
    rotateBy(degrees: number): this;

    // Scale methods
    scaleX(value: number): this;
    scaleY(value: number): this;
    scale(value: number): this;
    scaleBy(factor: number): this;

    // Batch operations
    set(props: TransformProps): this;
    reset(): this;
    resetAll(): this;

    // Utility methods
    toObject(): TransformProps & { x: number; y: number; width: number; height: number; rotation: number; scaleX: number; scaleY: number };
    copyFrom(source: Transform | TransformProps): this;

    static handleDirectSet(property: string, value: any): void;
  }

  // ==========================================================================
  // Shapes Module - Shape Base & Concrete Shapes
  // ==========================================================================

  /** Options for Shape */
  export interface ShapeOptions extends TransformableOptions {
    color?: string | null;
    stroke?: string | null;
    lineWidth?: number;
    lineJoin?: 'miter' | 'round' | 'bevel';
    lineCap?: 'butt' | 'round' | 'square';
    miterLimit?: number;
  }

  /**
   * Base class for drawable geometric primitives.
   * @abstract
   */
  export class Shape extends Transformable {
    constructor(options?: ShapeOptions);

    get color(): string | null;
    set color(v: string | null);
    get stroke(): string | null;
    set stroke(v: string | null);
    get lineWidth(): number;
    set lineWidth(v: number);
    get lineJoin(): 'miter' | 'round' | 'bevel';
    set lineJoin(v: 'miter' | 'round' | 'bevel');
    get lineCap(): 'butt' | 'round' | 'square';
    set lineCap(v: 'butt' | 'round' | 'square');
    get miterLimit(): number;
    set miterLimit(v: number);
  }

  /** Options for Group */
  export interface GroupOptions extends TransformableOptions {
    inheritOpacity?: boolean;
    inheritVisible?: boolean;
    inheritScale?: boolean;
    sortByZIndex?: boolean;
  }

  /**
   * Container for composing multiple transformable objects.
   */
  export class Group extends Transformable {
    userDefinedDimensions: boolean;

    constructor(options?: GroupOptions);

    get children(): Transformable[];

    add(object: Transformable): Transformable;
    remove(object: Transformable): boolean;
    clear(): void;
    bringToFront(object: Transformable): void;
    sendToBack(object: Transformable): void;
    bringForward(object: Transformable): void;
    sendBackward(object: Transformable): void;

    draw(): void;
    update(dt: number): void;
    calculateBounds(): Bounds;
    getDebugBounds(): Bounds;

    // Group-wide transform operations
    forEachTransform(callback: (transform: Transform, child: Transformable, index: number) => void): this;
    translateChildren(dx: number, dy: number): this;
    scaleChildren(factor: number): this;
    rotateChildren(degrees: number): this;
    resetChildTransforms(): this;
  }

  // Concrete Shape Classes

  /** Circle shape */
  export class Circle extends Shape {
    constructor(radius: number, options?: ShapeOptions);

    get radius(): number;
    set radius(v: number);

    draw(): void;
    calculateBounds(): Bounds;
  }

  /** Rectangle shape */
  export class Rectangle extends Shape {
    constructor(options?: ShapeOptions);

    draw(): void;
    protected drawRect(): void;
  }

  /** Rounded rectangle shape */
  export interface RoundedRectangleOptions extends ShapeOptions {
    cornerRadius?: number;
  }

  export class RoundedRectangle extends Shape {
    constructor(options?: RoundedRectangleOptions);

    get cornerRadius(): number;
    set cornerRadius(v: number);
  }

  /** Square shape */
  export class Square extends Rectangle {
    constructor(size: number, options?: ShapeOptions);
  }

  /** Arc shape options */
  export interface ArcOptions extends ShapeOptions {
    startAngle?: number;
    endAngle?: number;
    counterClockwise?: boolean;
  }

  /** Arc shape */
  export class Arc extends Shape {
    constructor(radius: number, options?: ArcOptions);

    get radius(): number;
    set radius(v: number);
  }

  /** Line shape */
  export class Line extends Shape {
    constructor(x1: number, y1: number, x2: number, y2: number, options?: ShapeOptions);
  }

  /** Triangle shape */
  export class Triangle extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Star shape options */
  export interface StarOptions extends ShapeOptions {
    points?: number;
    innerRadius?: number;
    outerRadius?: number;
  }

  /** Star shape */
  export class Star extends Shape {
    constructor(options?: StarOptions);
  }

  /** Polygon shape */
  export class Polygon extends Shape {
    constructor(sides: number, radius: number, options?: ShapeOptions);
  }

  /** Hexagon shape */
  export class Hexagon extends Polygon {
    constructor(radius: number, options?: ShapeOptions);
  }

  /** Diamond shape */
  export class Diamond extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Cross shape */
  export class Cross extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Heart shape */
  export class Heart extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Ring shape options */
  export interface RingOptions extends ShapeOptions {
    innerRadius?: number;
    outerRadius?: number;
  }

  /** Ring shape */
  export class Ring extends Shape {
    constructor(options?: RingOptions);
  }

  /** Cloud shape */
  export class Cloud extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Pin/marker shape */
  export class Pin extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Arrow shape */
  export class Arrow extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Pie slice shape options */
  export interface PieSliceOptions extends ShapeOptions {
    startAngle?: number;
    endAngle?: number;
  }

  /** Pie slice shape */
  export class PieSlice extends Shape {
    constructor(radius: number, options?: PieSliceOptions);
  }

  /** Bezier curve shape */
  export class BezierShape extends Shape {
    constructor(points: Point[], options?: ShapeOptions);
  }

  /** SVG shape */
  export class SVGShape extends Shape {
    constructor(svgPath: string, options?: ShapeOptions);
  }

  /** Stick figure shape */
  export class StickFigure extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Pattern rectangle options */
  export interface PatternRectangleOptions extends ShapeOptions {
    pattern?: CanvasPattern | string;
  }

  /** Pattern rectangle shape */
  export class PatternRectangle extends Rectangle {
    constructor(options?: PatternRectangleOptions);
  }

  /** Image shape options */
  export interface ImageShapeOptions extends ShapeOptions {
    src?: string;
    image?: HTMLImageElement;
  }

  /** Image shape */
  export class ImageShape extends Shape {
    constructor(options?: ImageShapeOptions);

    get image(): HTMLImageElement | null;
    set image(v: HTMLImageElement | null);
  }

  // 3D-like Shapes

  /** Cube shape options */
  export interface CubeOptions extends ShapeOptions {
    faceTopColor?: string;
    faceLeftColor?: string;
    faceRightColor?: string;
    rotationX?: number;
    rotationY?: number;
  }

  /** Isometric cube shape */
  export class Cube extends Shape {
    constructor(size: number, options?: CubeOptions);
  }

  /** Cylinder shape */
  export class Cylinder extends Shape {
    constructor(radius: number, height: number, options?: ShapeOptions);
  }

  /** Cone shape */
  export class Cone extends Shape {
    constructor(radius: number, height: number, options?: ShapeOptions);
  }

  /** Prism shape */
  export class Prism extends Shape {
    constructor(options?: ShapeOptions);
  }

  /** Sphere shape */
  export class Sphere extends Shape {
    constructor(radius: number, options?: ShapeOptions);
  }

  // Text Shapes

  /** Text shape options */
  export interface TextShapeOptions extends ShapeOptions {
    font?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  }

  /** Basic text shape */
  export class TextShape extends Shape {
    text: string;

    constructor(text: string, options?: TextShapeOptions);
  }

  /** Outlined text shape options */
  export interface OutlinedTextOptions extends TextShapeOptions {
    outlineColor?: string;
    outlineWidth?: number;
  }

  /** Outlined text shape */
  export class OutlinedText extends TextShape {
    constructor(text: string, options?: OutlinedTextOptions);
  }

  /** Wrapped text shape */
  export class WrappedText extends TextShape {
    constructor(x: number, y: number, text: string, maxWidth: number, lineHeight: number, options?: TextShapeOptions);
  }

  // ==========================================================================
  // IO Module
  // ==========================================================================

  /**
   * Core event management system.
   */
  export class EventEmitter {
    listeners: Record<string, EventCallback[]>;

    constructor();

    on<T = any>(type: string, callback: EventCallback<T>): void;
    off<T = any>(type: string, callback: EventCallback<T>): void;
    emit<T = any>(type: string, payload?: T): void;
  }

  /**
   * Mouse input tracking (static class).
   */
  export class Mouse {
    static x: number;
    static y: number;
    static isDown: boolean;

    static init(game: Game): void;
  }

  /**
   * Keyboard input with key mapping (static class).
   */
  export class Keys {
    // Key constants
    static readonly LEFT: string;
    static readonly RIGHT: string;
    static readonly UP: string;
    static readonly DOWN: string;
    static readonly SPACE: string;
    static readonly ENTER: string;
    static readonly ESCAPE: string;
    static readonly SHIFT: string;
    static readonly CTRL: string;
    static readonly ALT: string;

    static init(game: Game): void;
    static isDown(key: string): boolean;
  }

  /**
   * Touch input handling (static class).
   */
  export class Touch {
    static x: number;
    static y: number;
    static isDown: boolean;

    static init(game: Game): void;
  }

  /**
   * Unified input system (mouse + touch normalization).
   */
  export class Input {
    static x: number;
    static y: number;
    static isDown: boolean;

    static init(game: Game): void;
  }

  // ==========================================================================
  // Game Module
  // ==========================================================================

  /**
   * Core game class providing game loop, pipeline, and input management.
   */
  export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    events: EventEmitter;
    pipeline: Pipeline;
    running: boolean;
    dt: number;
    targetFPS: number;
    actualFps: number;
    logger: Logger;

    constructor(canvas: HTMLCanvasElement);

    get width(): number;
    get height(): number;
    set backgroundColor(color: string);
    get cursor(): Cursor;
    set cursor(cursor: Cursor);
    get boundsDirty(): boolean;
    set boundsDirty(dirty: boolean);

    init(): void;
    start(): void;
    stop(): void;
    restart(): void;
    clear(): void;
    update(dt: number): void;
    render(): void;

    initMouse(): void;
    initTouch(): void;
    initInput(): void;
    initKeyboard(): void;
    initIO(): void;
    initMotion(): void;
    initLogging(): void;

    enableLogging(): void;
    disableLogging(): void;
    enableFluidSize(container?: HTMLElement | Window): void;
    disableFluidSize(): void;
    enablePauseOnBlur(enabled: boolean): void;
    setFPS(fps: number): void;
    markBoundsDirty(): void;
    resetCursor(): void;

    /** Override for resize handling */
    onResize?(): void;
  }

  /**
   * Pipeline for managing GameObjects lifecycle (update/render).
   */
  export class Pipeline {
    constructor(game: Game);

    add(object: GameObject): void;
    remove(object: GameObject): void;
    clear(): void;
    update(dt: number): void;
    render(): void;
  }

  /** Options for GameObject */
  export interface GameObjectOptions extends TransformableOptions {
    interactive?: boolean;
    anchor?: string | Point;
  }

  /**
   * Base class for interactive game entities.
   */
  export class GameObject extends Transformable {
    game: Game;
    events: EventEmitter;

    constructor(game: Game, options?: GameObjectOptions);

    get interactive(): boolean;
    set interactive(value: boolean);
    get hovered(): boolean;
    set hovered(value: boolean);

    update(dt: number): void;

    on<T = any>(event: string, callback: EventCallback<T>): void;
    off<T = any>(event: string, callback: EventCallback<T>): void;
    emit<T = any>(event: string, ...args: any[]): void;

    /** @internal */
    _hitTest(x: number, y: number): boolean;
    /** @internal */
    _setHovered(state: boolean): void;
  }

  /** Options for Scene */
  export interface SceneOptions extends GameObjectOptions {
    sortByZIndex?: boolean;
  }

  /**
   * Hierarchical container for GameObjects with z-ordering.
   */
  export class Scene extends GameObject {
    constructor(game: Game, options?: SceneOptions);

    get children(): GameObject[];

    add(object: GameObject): GameObject;
    remove(object: GameObject): boolean;
    clear(): void;
    bringToFront(object: GameObject): void;
    sendToBack(object: GameObject): void;
  }

  /**
   * Wraps a Shape as a GameObject for use in the pipeline.
   */
  export class GameObjectShapeWrapper extends GameObject {
    shape: Shape;

    constructor(game: Game, shape: Shape, options?: GameObjectOptions);
  }

  /**
   * Factory for quickly creating GameObject wrappers for shapes.
   */
  export class ShapeGOFactory {
    static wrap(game: Game, shape: Shape, options?: GameObjectOptions): GameObjectShapeWrapper;
  }

  /** Text GameObject options */
  export interface TextGameObjectOptions extends GameObjectOptions {
    font?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  }

  /**
   * Text rendering as a GameObject.
   */
  export class Text extends GameObject {
    text: string;

    constructor(game: Game, text: string, options?: TextGameObjectOptions);
  }

  /**
   * Image rendering as a GameObject.
   */
  export class ImageGo extends GameObject {
    constructor(game: Game, src: string | HTMLImageElement, options?: GameObjectOptions);
  }

  // Layout Scenes

  /**
   * Base layout container with automatic child positioning.
   */
  export class LayoutScene extends Scene {
    constructor(game: Game, options?: SceneOptions);
  }

  export class HorizontalLayout extends LayoutScene {
    constructor(game: Game, options?: SceneOptions);
  }

  export class VerticalLayout extends LayoutScene {
    constructor(game: Game, options?: SceneOptions);
  }

  export class TileLayout extends LayoutScene {
    constructor(game: Game, options?: SceneOptions);
  }

  export class GridLayout extends LayoutScene {
    constructor(game: Game, options?: SceneOptions);
  }

  // UI Components

  /** Button options */
  export interface ButtonOptions extends GameObjectOptions {
    label?: string;
    font?: string;
    padding?: number;
    backgroundColor?: string;
    hoverColor?: string;
    pressedColor?: string;
    textColor?: string;
  }

  /**
   * Interactive button component.
   */
  export class Button extends GameObject {
    label: string;

    constructor(game: Game, options?: ButtonOptions);
  }

  /**
   * Toggle button component.
   */
  export class ToggleButton extends Button {
    toggled: boolean;

    constructor(game: Game, options?: ButtonOptions);
  }

  /** Cursor options */
  export interface CursorOptions extends GameObjectOptions {
    image?: HTMLImageElement | string;
    hotspot?: Point;
  }

  /**
   * Custom cursor component.
   */
  export class Cursor extends GameObject {
    constructor(game: Game, options?: CursorOptions);

    activate(): void;
    destroy(): void;
  }

  /**
   * FPS counter display.
   */
  export class FPSCounter extends GameObject {
    constructor(game: Game, options?: GameObjectOptions);
  }

  // ==========================================================================
  // Painter Module
  // ==========================================================================

  /**
   * Static utility class for canvas drawing operations.
   */
  export class Painter {
    static ctx: CanvasRenderingContext2D;
    static logger: Logger;

    static readonly colors: PainterColors;
    static readonly effects: PainterEffects;
    static readonly img: PainterImages;
    static readonly lines: PainterLines;
    static readonly opacity: PainterOpacity;
    static readonly shapes: PainterShapes;
    static readonly text: PainterText;

    static init(ctx: CanvasRenderingContext2D): void;
    static save(): void;
    static restore(): void;
    static translateTo(x: number, y: number): void;
    static resetPosition(): void;
    static withPosition(x: number, y: number, callback: () => void): void;
    static clear(x?: number, y?: number, width?: number, height?: number): void;
    static translate(x: number, y: number): void;
    static rotate(angle: number): void;
    static scale(x: number, y: number): void;
  }

  /** Color utilities for Painter */
  export class PainterColors {
    static hexToRgb(hex: string): { r: number; g: number; b: number } | null;
    static rgbToHex(r: number, g: number, b: number): string;
    static lighten(color: string, amount: number): string;
    static darken(color: string, amount: number): string;
  }

  /** Effects utilities for Painter */
  export class PainterEffects {
    static setBlendMode(mode: GlobalCompositeOperation): void;
    static resetBlendMode(): void;
  }

  /** Image utilities for Painter */
  export class PainterImages {
    static drawImage(image: HTMLImageElement | HTMLCanvasElement, x: number, y: number, width?: number, height?: number): void;
  }

  /** Line utilities for Painter */
  export class PainterLines {
    static line(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth?: number): void;
    static dashedLine(x1: number, y1: number, x2: number, y2: number, color: string, dashArray: number[], lineWidth?: number): void;
  }

  /** Opacity utilities for Painter */
  export class PainterOpacity {
    static pushOpacity(opacity: number): void;
    static popOpacity(): void;
    static saveOpacityState(): void;
    static restoreOpacityState(): void;
  }

  /** Shape drawing utilities for Painter */
  export class PainterShapes {
    static rect(x: number, y: number, width: number, height: number, color: string): void;
    static outlineRect(x: number, y: number, width: number, height: number, color: string, lineWidth?: number): void;
    static roundedRect(x: number, y: number, width: number, height: number, radius: number, color: string): void;
    static fillCircle(x: number, y: number, radius: number, color: string): void;
    static strokeCircle(x: number, y: number, radius: number, color: string, lineWidth?: number): void;
    static arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, color: string, lineWidth?: number): void;
    static polygon(points: Point[], color: string): void;
    static outlinePolygon(points: Point[], color: string, lineWidth?: number): void;
  }

  /** Text utilities for Painter */
  export class PainterText {
    static text(text: string, x: number, y: number, color: string, font?: string): void;
    static measureText(text: string, font?: string): TextMetrics;
  }

  // ==========================================================================
  // Motion Module
  // ==========================================================================

  /**
   * Easing functions for animations.
   */
  export class Easing {
    // Quadratic
    static easeInQuad(t: number): number;
    static easeOutQuad(t: number): number;
    static easeInOutQuad(t: number): number;

    // Cubic
    static easeInCubic(t: number): number;
    static easeOutCubic(t: number): number;
    static easeInOutCubic(t: number): number;

    // Quartic
    static easeInQuart(t: number): number;
    static easeOutQuart(t: number): number;
    static easeInOutQuart(t: number): number;

    // Sine
    static easeInSine(t: number): number;
    static easeOutSine(t: number): number;
    static easeInOutSine(t: number): number;

    // Exponential
    static easeInExpo(t: number): number;
    static easeOutExpo(t: number): number;
    static easeInOutExpo(t: number): number;

    // Circular
    static easeInCirc(t: number): number;
    static easeOutCirc(t: number): number;
    static easeInOutCirc(t: number): number;

    // Elastic
    static easeInElastic(t: number, amplitude?: number, period?: number): number;
    static easeOutElastic(t: number, amplitude?: number, period?: number): number;
    static easeInOutElastic(t: number, amplitude?: number, period?: number): number;

    // Back
    static easeInBack(t: number, overshoot?: number): number;
    static easeOutBack(t: number, overshoot?: number): number;
    static easeInOutBack(t: number, overshoot?: number): number;

    // Bounce
    static easeInBounce(t: number): number;
    static easeOutBounce(t: number): number;
    static easeInOutBounce(t: number): number;
  }

  /**
   * Stateless interpolation utilities.
   */
  export class Tween {
    static lerp(start: number, end: number, t: number): number;
    static lerpAngle(start: number, end: number, t: number): number;
    static lerpColor(startColor: string, endColor: string, t: number): string;
  }

  /**
   * Stateless animation patterns.
   */
  export class Motion {
    static bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number, duration: number, loop?: boolean): Point;
    static spring(current: number, target: number, velocity: number, stiffness: number, damping: number, dt: number): { value: number; velocity: number };
    static orbit(centerX: number, centerY: number, radius: number, speed: number, time: number): Point;
  }

  /** Tweenetik options */
  export interface TweenetikOptions {
    delay?: number;
    onStart?: () => void;
    onComplete?: () => void;
    onUpdate?: () => void;
  }

  /**
   * Self-managed property animation system.
   */
  export class Tweenetik {
    target: object;
    duration: number;

    constructor(target: object, toProps: Record<string, number>, duration: number, easingFn?: EasingFunction, options?: TweenetikOptions);

    update(dt: number): void;

    static to(target: object, toProps: Record<string, number>, duration: number, easingFn?: EasingFunction, options?: TweenetikOptions): Tweenetik;
    static updateAll(dt: number): void;
  }

  // Motion functions (stateless)
  export function bezierV1(p0: Point, p1: Point, p2: Point, p3: Point, t: number, duration: number, loop?: boolean): Point;
  export function bounceV1(x: number, y: number, height: number, time: number, duration: number): Point;
  export function floatV1(x: number, y: number, amplitude: number, frequency: number, time: number): Point;
  export function followPath(points: Point[], time: number, duration: number, loop?: boolean): Point;
  export function orbitV1(centerX: number, centerY: number, radius: number, speed: number, time: number): Point;
  export function oscillateV1(start: number, end: number, frequency: number, time: number): number;
  export function parabolicV1(x: number, y: number, targetX: number, targetY: number, height: number, time: number, duration: number): Point;
  export function patrolV1(points: Point[], time: number, speed: number): Point;
  export function pendulumV1(x: number, y: number, length: number, angle: number, time: number): Point;
  export function pulseV1(min: number, max: number, frequency: number, time: number): number;
  export function hopV1(x: number, y: number, height: number, time: number, duration: number): Point;
  export function shakeV1(x: number, y: number, intensity: number, time: number): Point;
  export function spiralV1(centerX: number, centerY: number, startRadius: number, endRadius: number, time: number, duration: number): Point;
  export function springV1(current: number, target: number, velocity: number, stiffness: number, damping: number, dt: number): { value: number; velocity: number };
  export function swingV1(x: number, y: number, amplitude: number, frequency: number, time: number): Point;
  export function waypointV1(points: Point[], time: number, speed: number): Point;

  // ==========================================================================
  // Math Module
  // ==========================================================================

  /**
   * Random number generation utilities.
   */
  export class Random {
    static float(min: number, max: number): number;
    static int(min: number, max: number): number;
    static bool(probability?: number): boolean;
    static pick<T>(array: T[]): T;
    static shuffle<T>(array: T[]): T[];
    static color(): string;
    static angle(): number;
  }

  /**
   * Complex number operations.
   */
  export class Complex {
    real: number;
    imag: number;

    constructor(real: number, imag: number);

    add(other: Complex): Complex;
    subtract(other: Complex): Complex;
    multiply(other: Complex): Complex;
    magnitude(): number;
    conjugate(): Complex;
  }

  /**
   * Fractal generation utilities.
   */
  export class Fractals {
    static mandelbrot(x: number, y: number, maxIterations: number): number;
    static julia(x: number, y: number, cx: number, cy: number, maxIterations: number): number;
  }

  /**
   * Pattern generation utilities.
   */
  export class Patterns {
    static checkerboard(x: number, y: number, size: number): boolean;
    static stripes(x: number, y: number, size: number, angle?: number): boolean;
  }

  /**
   * Noise generation (Perlin-like).
   */
  export class Noise {
    constructor(seed?: number);

    noise2D(x: number, y: number): number;
    noise3D(x: number, y: number, z: number): number;
  }

  // ==========================================================================
  // Util Module
  // ==========================================================================

  /**
   * Z-ordered collection for managing child objects.
   */
  export class ZOrderedCollection {
    children: Transformable[];

    constructor(options?: { sortByZIndex?: boolean });

    add(object: Transformable): void;
    remove(object: Transformable): boolean;
    clear(): void;
    getSortedChildren(): Transformable[];
    bringToFront(object: Transformable): void;
    sendToBack(object: Transformable): void;
    bringForward(object: Transformable): void;
    sendBackward(object: Transformable): void;
  }

  /**
   * Position/anchor utilities with layout constants.
   */
  export class Position {
    static readonly TOP_LEFT: string;
    static readonly TOP_CENTER: string;
    static readonly TOP_RIGHT: string;
    static readonly CENTER_LEFT: string;
    static readonly CENTER: string;
    static readonly CENTER_RIGHT: string;
    static readonly BOTTOM_LEFT: string;
    static readonly BOTTOM_CENTER: string;
    static readonly BOTTOM_RIGHT: string;

    static parse(position: string, containerWidth: number, containerHeight: number, objectWidth?: number, objectHeight?: number): Point;
  }

  /**
   * Task manager utility.
   */
  export class TaskManager {
    add(task: () => void, delay?: number): void;
    update(dt: number): void;
    clear(): void;
  }

  // Layout functions
  export function applyLayout(objects: Transformable[], options: object): void;
  export function horizontalLayout(objects: Transformable[], options?: { spacing?: number; x?: number; y?: number }): void;
  export function verticalLayout(objects: Transformable[], options?: { spacing?: number; x?: number; y?: number }): void;
  export function tileLayout(objects: Transformable[], options?: { columns?: number; spacing?: number; x?: number; y?: number }): void;
  export function gridLayout(objects: Transformable[], options?: { columns?: number; rows?: number; cellWidth?: number; cellHeight?: number; x?: number; y?: number }): void;

  // ==========================================================================
  // Mixins Module
  // ==========================================================================

  /**
   * Applies draggable behavior to a GameObject.
   */
  export function applyDraggable(target: GameObject, options?: { bounds?: Bounds }): void;

  /**
   * Applies anchor positioning to a GameObject.
   */
  export function applyAnchor(target: GameObject, options?: { anchor?: string | Point }): void;
}
