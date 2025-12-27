/**
 * GCanvas Game Module
 * Core game loop, pipeline, game objects, scenes, and UI components.
 * @module game
 */

import { Bounds, Point, EventCallback } from './common';
import { Logger } from './logger';
import { Transformable, TransformableOptions, Shape } from './shapes';
import { EventEmitter } from './io';

// ==========================================================================
// Game Class
// ==========================================================================

/**
 * Core game class providing game loop, pipeline, and input management.
 * Entry point for creating interactive canvas applications.
 *
 * @example
 * const canvas = document.getElementById('game');
 * const game = new Game(canvas);
 * game.init();
 * game.start();
 */
export class Game {
  /** The canvas element */
  canvas: HTMLCanvasElement;
  /** The 2D rendering context */
  ctx: CanvasRenderingContext2D;
  /** Event emitter for game events */
  events: EventEmitter;
  /** Pipeline for managing game objects */
  pipeline: Pipeline;
  /** Whether the game loop is running */
  running: boolean;
  /** Delta time since last frame (seconds) */
  dt: number;
  /** Target frames per second */
  targetFPS: number;
  /** Actual measured FPS */
  actualFps: number;
  /** Logger instance */
  logger: Logger;

  /**
   * Create a new Game instance.
   * @param canvas - The canvas element to render to
   */
  constructor(canvas: HTMLCanvasElement);

  /** Canvas width */
  get width(): number;
  /** Canvas height */
  get height(): number;
  /** Background color (set only) */
  set backgroundColor(color: string);
  /** Custom cursor (get/set) */
  get cursor(): Cursor;
  set cursor(cursor: Cursor);
  /** Whether bounds need recalculation */
  get boundsDirty(): boolean;
  set boundsDirty(dirty: boolean);

  /** Initialize the game (called automatically by constructor) */
  init(): void;
  /** Start the game loop */
  start(): void;
  /** Stop the game loop */
  stop(): void;
  /** Restart the game (stop and start) */
  restart(): void;
  /** Clear the canvas */
  clear(): void;
  /** Update game state (called each frame) */
  update(dt: number): void;
  /** Render the game (called each frame) */
  render(): void;

  // Input initialization
  /** Initialize mouse input */
  initMouse(): void;
  /** Initialize touch input */
  initTouch(): void;
  /** Initialize unified input (mouse + touch) */
  initInput(): void;
  /** Initialize keyboard input */
  initKeyboard(): void;
  /** Initialize all input systems */
  initIO(): void;
  /** Initialize motion/animation system */
  initMotion(): void;
  /** Initialize logging */
  initLogging(): void;

  /** Enable debug logging */
  enableLogging(): void;
  /** Disable debug logging */
  disableLogging(): void;

  /**
   * Enable fluid canvas sizing (resizes with container).
   * @param container - Container element (default: window)
   */
  enableFluidSize(container?: HTMLElement | Window): void;
  /** Disable fluid sizing */
  disableFluidSize(): void;

  /**
   * Enable/disable pausing when window loses focus.
   * @param enabled - Whether to pause on blur
   */
  enablePauseOnBlur(enabled: boolean): void;

  /**
   * Set target frame rate.
   * @param fps - Target FPS
   */
  setFPS(fps: number): void;

  /** Mark that bounds need recalculation */
  markBoundsDirty(): void;
  /** Reset to default cursor */
  resetCursor(): void;

  /** Override for custom resize handling */
  onResize?(): void;
}

// ==========================================================================
// Pipeline
// ==========================================================================

/**
 * Pipeline for managing GameObjects lifecycle.
 * Handles update and render cycles for all registered objects.
 */
export class Pipeline {
  /**
   * Create a new Pipeline.
   * @param game - The game instance
   */
  constructor(game: Game);

  /**
   * Add a game object to the pipeline.
   * @param object - GameObject to add
   */
  add(object: GameObject): void;

  /**
   * Remove a game object from the pipeline.
   * @param object - GameObject to remove
   */
  remove(object: GameObject): void;

  /** Remove all objects from the pipeline */
  clear(): void;

  /**
   * Update all objects.
   * @param dt - Delta time
   */
  update(dt: number): void;

  /** Render all objects */
  render(): void;
}

// ==========================================================================
// GameObject
// ==========================================================================

/** Options for GameObject */
export interface GameObjectOptions extends TransformableOptions {
  /** Whether object responds to input events */
  interactive?: boolean;
  /** Screen anchor position (e.g., "top-left", "center") */
  anchor?: string | Point;
}

/**
 * Base class for interactive game entities.
 * Extends Transformable with events and hit testing.
 *
 * @example
 * const player = new GameObject(game, {
 *   x: 100, y: 100,
 *   width: 50, height: 50,
 *   interactive: true
 * });
 * player.on('click', () => console.log('Player clicked!'));
 */
export class GameObject extends Transformable {
  /** Reference to the game instance */
  game: Game;
  /** Event emitter for this object */
  events: EventEmitter;

  /**
   * Create a new GameObject.
   * @param game - The game instance
   * @param options - Configuration options
   */
  constructor(game: Game, options?: GameObjectOptions);

  /** Whether object responds to input */
  get interactive(): boolean;
  set interactive(value: boolean);
  /** Whether pointer is over this object */
  get hovered(): boolean;
  set hovered(value: boolean);

  /** Update the object (override in subclasses) */
  update(dt: number): void;

  /**
   * Subscribe to an event.
   * @param event - Event name
   * @param callback - Handler function
   */
  on<T = any>(event: string, callback: EventCallback<T>): void;

  /**
   * Unsubscribe from an event.
   * @param event - Event name
   * @param callback - Handler function
   */
  off<T = any>(event: string, callback: EventCallback<T>): void;

  /**
   * Emit an event.
   * @param event - Event name
   * @param args - Event arguments
   */
  emit<T = any>(event: string, ...args: any[]): void;

  /** @internal Test if point is inside object bounds */
  _hitTest(x: number, y: number): boolean;
  /** @internal Set hover state */
  _setHovered(state: boolean): void;
}

// ==========================================================================
// Scene
// ==========================================================================

/** Options for Scene */
export interface SceneOptions extends GameObjectOptions {
  /** Sort children by zIndex before rendering */
  sortByZIndex?: boolean;
}

/**
 * Hierarchical container for GameObjects with z-ordering.
 * Use scenes to group related objects and manage their lifecycle.
 *
 * @example
 * const uiScene = new Scene(game, { x: 0, y: 0 });
 * uiScene.add(new Button(game, { label: 'Start' }));
 * game.pipeline.add(uiScene);
 */
export class Scene extends GameObject {
  /**
   * Create a new Scene.
   * @param game - The game instance
   * @param options - Configuration options
   */
  constructor(game: Game, options?: SceneOptions);

  /** Get all child objects */
  get children(): GameObject[];

  /**
   * Add a child object.
   * @param object - GameObject to add
   * @returns The added object
   */
  add(object: GameObject): GameObject;

  /**
   * Remove a child object.
   * @param object - GameObject to remove
   * @returns Whether object was found and removed
   */
  remove(object: GameObject): boolean;

  /** Remove all children */
  clear(): void;

  /** Move object to front (highest z-order) */
  bringToFront(object: GameObject): void;

  /** Move object to back (lowest z-order) */
  sendToBack(object: GameObject): void;
}

// ==========================================================================
// Shape Wrappers
// ==========================================================================

/**
 * Wraps a Shape as a GameObject for use in the pipeline.
 * Allows using pure shapes in the game object system.
 */
export class GameObjectShapeWrapper extends GameObject {
  /** The wrapped shape */
  shape: Shape;

  /**
   * Create a wrapper for a shape.
   * @param game - The game instance
   * @param shape - Shape to wrap
   * @param options - Additional options
   */
  constructor(game: Game, shape: Shape, options?: GameObjectOptions);
}

/**
 * Factory for quickly creating GameObject wrappers for shapes.
 */
export class ShapeGOFactory {
  /**
   * Wrap a shape as a GameObject.
   * @param game - The game instance
   * @param shape - Shape to wrap
   * @param options - Additional options
   */
  static wrap(game: Game, shape: Shape, options?: GameObjectOptions): GameObjectShapeWrapper;
}

// ==========================================================================
// Text GameObject
// ==========================================================================

/** Options for Text GameObject */
export interface TextGameObjectOptions extends GameObjectOptions {
  /** CSS font string */
  font?: string;
  /** Text alignment */
  align?: CanvasTextAlign;
  /** Text baseline */
  baseline?: CanvasTextBaseline;
  /** Text color */
  color?: string;
}

/**
 * Text rendering as a GameObject.
 */
export class Text extends GameObject {
  /** The text content */
  text: string;

  /**
   * Create a Text object.
   * @param game - The game instance
   * @param text - Text to display
   * @param options - Text options
   */
  constructor(game: Game, text: string, options?: TextGameObjectOptions);
}

// ==========================================================================
// Image GameObject
// ==========================================================================

/**
 * Image rendering as a GameObject.
 */
export class ImageGo extends GameObject {
  /**
   * Create an Image object.
   * @param game - The game instance
   * @param src - Image source URL or HTMLImageElement
   * @param options - GameObject options
   */
  constructor(game: Game, src: string | HTMLImageElement, options?: GameObjectOptions);
}

// ==========================================================================
// Layout Scenes
// ==========================================================================

/**
 * Base layout container with automatic child positioning.
 */
export class LayoutScene extends Scene {
  constructor(game: Game, options?: SceneOptions);
}

/**
 * Horizontal layout - children arranged left to right.
 */
export class HorizontalLayout extends LayoutScene {
  constructor(game: Game, options?: SceneOptions);
}

/**
 * Vertical layout - children arranged top to bottom.
 */
export class VerticalLayout extends LayoutScene {
  constructor(game: Game, options?: SceneOptions);
}

/**
 * Tile layout - children arranged in a grid.
 */
export class TileLayout extends LayoutScene {
  constructor(game: Game, options?: SceneOptions);
}

/**
 * Flexible grid layout with configurable rows and columns.
 */
export class GridLayout extends LayoutScene {
  constructor(game: Game, options?: SceneOptions);
}

// ==========================================================================
// UI Components
// ==========================================================================

/** Options for Button */
export interface ButtonOptions extends GameObjectOptions {
  /** Button text */
  label?: string;
  /** CSS font string */
  font?: string;
  /** Padding around text */
  padding?: number;
  /** Background color (normal state) */
  backgroundColor?: string;
  /** Background color (hover state) */
  hoverColor?: string;
  /** Background color (pressed state) */
  pressedColor?: string;
  /** Text color */
  textColor?: string;
}

/**
 * Interactive button component.
 *
 * @example
 * const btn = new Button(game, {
 *   x: 100, y: 100,
 *   label: 'Click Me',
 *   backgroundColor: '#3498db'
 * });
 * btn.on('click', () => console.log('Button clicked!'));
 */
export class Button extends GameObject {
  /** Button label text */
  label: string;

  constructor(game: Game, options?: ButtonOptions);
}

/**
 * Toggle button component (on/off state).
 */
export class ToggleButton extends Button {
  /** Current toggle state */
  toggled: boolean;

  constructor(game: Game, options?: ButtonOptions);
}

/** Options for Cursor */
export interface CursorOptions extends GameObjectOptions {
  /** Cursor image */
  image?: HTMLImageElement | string;
  /** Hotspot offset from cursor position */
  hotspot?: Point;
}

/**
 * Custom cursor component.
 * Hides the system cursor and renders a custom one.
 */
export class Cursor extends GameObject {
  constructor(game: Game, options?: CursorOptions);

  /** Activate this cursor (hide system cursor) */
  activate(): void;
  /** Destroy and restore system cursor */
  destroy(): void;
}

/**
 * FPS counter display component.
 * Shows real-time frame rate.
 */
export class FPSCounter extends GameObject {
  constructor(game: Game, options?: GameObjectOptions);
}

// ==========================================================================
// Advanced UI Components
// ==========================================================================

/** Options for Tooltip */
export interface TooltipOptions extends GameObjectOptions {
  /** Tooltip text */
  text?: string;
  /** Background color */
  backgroundColor?: string;
  /** Text color */
  textColor?: string;
  /** CSS font string */
  font?: string;
  /** Padding around text */
  padding?: number;
  /** Corner radius */
  cornerRadius?: number;
  /** Show delay in milliseconds */
  delay?: number;
}

/**
 * Tooltip component that shows on hover.
 */
export class Tooltip extends GameObject {
  /** Tooltip text */
  text: string;
  /** Whether tooltip is visible */
  isVisible: boolean;

  constructor(game: Game, options?: TooltipOptions);

  /**
   * Show tooltip at position.
   * @param x - X position
   * @param y - Y position
   */
  show(x: number, y: number): void;

  /** Hide tooltip */
  hide(): void;
}

/** Options for Stepper */
export interface StepperOptions extends GameObjectOptions {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Current value */
  value?: number;
  /** Step increment */
  step?: number;
  /** Label text */
  label?: string;
  /** CSS font string */
  font?: string;
  /** Width of the stepper */
  width?: number;
  /** Height of the stepper */
  height?: number;
}

/**
 * Numeric stepper component with +/- buttons.
 *
 * @example
 * const stepper = new Stepper(game, {
 *   x: 100, y: 100,
 *   min: 0, max: 100,
 *   value: 50,
 *   step: 5,
 *   label: 'Speed'
 * });
 * stepper.on('change', (value) => console.log('New value:', value));
 */
export class Stepper extends GameObject {
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;

  constructor(game: Game, options?: StepperOptions);

  /** Increment value by step */
  increment(): void;
  /** Decrement value by step */
  decrement(): void;
  /** Set value directly */
  setValue(value: number): void;
}

/**
 * UI theme constants for consistent styling.
 * Terminal × Vercel aesthetic.
 */
export namespace UI_THEME {
  /** Primary accent color (terminal green) */
  const PRIMARY: string;
  /** Background color (dark) */
  const BACKGROUND: string;
  /** Surface color (slightly lighter) */
  const SURFACE: string;
  /** Text color */
  const TEXT: string;
  /** Muted text color */
  const TEXT_MUTED: string;
  /** Border color */
  const BORDER: string;
  /** Success color */
  const SUCCESS: string;
  /** Warning color */
  const WARNING: string;
  /** Error color */
  const ERROR: string;
  /** Font family */
  const FONT: string;
  /** Default corner radius */
  const RADIUS: number;
}

// ==========================================================================
// Scene3D
// ==========================================================================

/** Options for Scene3D */
export interface Scene3DOptions extends SceneOptions {
  /** Camera3D instance for projection */
  camera?: any; // Camera3D from util
  /** Enable depth sorting */
  depthSort?: boolean;
}

/**
 * 3D scene with Camera3D projection support.
 * Children with x, y, z positions are projected through the camera.
 *
 * @example
 * const camera = new Camera3D({ rotationX: 0.3, perspective: 800 });
 * const scene3d = new Scene3D(game, { camera });
 * scene3d.add(myObject);
 */
export class Scene3D extends Scene {
  /** Camera3D instance */
  camera: any;
  /** Whether to depth sort children */
  depthSort: boolean;

  constructor(game: Game, options?: Scene3DOptions);

  /**
   * Project a 3D point through the camera.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  project(x: number, y: number, z: number): { x: number; y: number; z: number; scale: number };
}

// ==========================================================================
// IsometricScene
// ==========================================================================

/** Options for IsometricScene */
export interface IsometricSceneOptions extends SceneOptions {
  /** Isometric camera instance */
  camera?: any; // IsometricCamera from util
  /** Tile width */
  tileWidth?: number;
  /** Tile height */
  tileHeight?: number;
  /** Grid columns */
  cols?: number;
  /** Grid rows */
  rows?: number;
}

/**
 * Isometric scene with 2.5D grid projection.
 * Converts grid coordinates to isometric screen positions.
 *
 * @example
 * const isoScene = new IsometricScene(game, {
 *   tileWidth: 64,
 *   tileHeight: 32,
 *   cols: 10,
 *   rows: 10
 * });
 */
export class IsometricScene extends Scene {
  /** Tile width */
  tileWidth: number;
  /** Tile height */
  tileHeight: number;
  /** Grid columns */
  cols: number;
  /** Grid rows */
  rows: number;
  /** Isometric camera */
  camera: any;

  constructor(game: Game, options?: IsometricSceneOptions);

  /**
   * Convert grid coordinates to screen position.
   * @param gridX - Grid X coordinate
   * @param gridY - Grid Y coordinate
   * @param height - Optional height offset
   */
  gridToScreen(gridX: number, gridY: number, height?: number): { x: number; y: number };

  /**
   * Convert screen position to grid coordinates.
   * @param screenX - Screen X coordinate
   * @param screenY - Screen Y coordinate
   */
  screenToGrid(screenX: number, screenY: number): { x: number; y: number };
}

// ==========================================================================
// FluidSystem
// ==========================================================================

/** Options for FluidSystem */
export interface FluidSystemOptions extends GameObjectOptions {
  /** Maximum number of particles */
  maxParticles?: number;
  /** Particle radius */
  particleRadius?: number;
  /** Gravity strength */
  gravity?: number;
  /** Fluid viscosity */
  viscosity?: number;
  /** Pressure multiplier */
  pressure?: number;
  /** Surface tension */
  surfaceTension?: number;
  /** Boundary bounds */
  bounds?: { x: number; y: number; width: number; height: number };
  /** Particle color */
  color?: string | ((particle: any) => string);
  /** Canvas blend mode */
  blendMode?: GlobalCompositeOperation;
}

/**
 * Fluid simulation system using SPH (Smoothed Particle Hydrodynamics).
 *
 * @example
 * const fluid = new FluidSystem(game, {
 *   maxParticles: 500,
 *   gravity: 200,
 *   viscosity: 0.1,
 *   bounds: { x: 0, y: 0, width: 800, height: 600 }
 * });
 * game.pipeline.add(fluid);
 */
export class FluidSystem extends GameObject {
  /** All fluid particles */
  particles: any[];
  /** Maximum particles */
  maxParticles: number;
  /** Particle radius */
  particleRadius: number;
  /** Gravity strength */
  gravity: number;
  /** Fluid viscosity */
  viscosity: number;
  /** Pressure multiplier */
  pressure: number;

  /** Current particle count */
  readonly particleCount: number;

  constructor(game: Game, options?: FluidSystemOptions);

  /**
   * Spawn particles at position.
   * @param x - X position
   * @param y - Y position
   * @param count - Number of particles
   * @param spread - Position spread
   */
  spawn(x: number, y: number, count: number, spread?: number): void;

  /**
   * Apply force to particles in radius.
   * @param x - Force center X
   * @param y - Force center Y
   * @param radius - Effect radius
   * @param force - Force strength
   */
  applyForce(x: number, y: number, radius: number, force: number): void;

  /** Clear all particles */
  clear(): void;
}
