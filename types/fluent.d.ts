/// <reference lib="es2015" />

/**
 * GCanvas Fluent API Module
 * Declarative, chainable API for rapid game and creative coding development.
 * @module fluent
 */

import { Game, Scene, GameObject, GameObjectOptions, SceneOptions } from './game';
import { Shape } from './shapes';
import { Easing, Motion, Tweenetik } from './motion';
import { Keys, Mouse } from './io';

// ==========================================================================
// Main Entry Points
// ==========================================================================

/**
 * Main entry point for the fluent API.
 * Creates a FluentGame instance with automatic canvas setup.
 *
 * @param options - Game configuration
 * @returns FluentGame builder instance
 *
 * @example
 * gcanvas({ bg: 'black' })
 *   .scene('game')
 *     .go({ x: 400, y: 300, name: 'player' })
 *       .circle({ radius: 30, fill: 'lime' })
 *   .start();
 */
export function gcanvas(options?: FluentGameOptions): FluentGame;

/**
 * Ultra-simple sketch mode for quick creative coding prototypes.
 *
 * @param w - Canvas width (default: 800)
 * @param h - Canvas height (default: 600)
 * @param bg - Background color (default: 'black')
 * @returns SketchAPI builder instance
 *
 * @example
 * sketch(800, 600, 'black')
 *   .circle(400, 300, 50, 'lime')
 *   .update((dt, ctx) => {
 *     ctx.shapes[0].x += Math.sin(ctx.time) * 2;
 *   })
 *   .start();
 */
export function sketch(w?: number, h?: number, bg?: string): SketchAPI;

// ==========================================================================
// FluentGame Options
// ==========================================================================

/** Options for FluentGame constructor */
export interface FluentGameOptions {
  /** Canvas element to use (auto-creates if not provided) */
  canvas?: HTMLCanvasElement;
  /** Canvas width when auto-creating (default: 800) */
  width?: number;
  /** Canvas height when auto-creating (default: 600) */
  height?: number;
  /** Background color */
  bg?: string;
  /** Enable fluid/responsive sizing (default: true for auto-created canvas) */
  fluid?: boolean;
  /** Container for auto-created canvas (default: document.body) */
  container?: HTMLElement;
  /** Target FPS (default: 60) */
  fps?: number;
  /** Pixel ratio for HiDPI displays */
  pixelRatio?: number;
}

// ==========================================================================
// FluentGame Class
// ==========================================================================

/**
 * Root builder class for the fluent API.
 * Wraps the Game class with a declarative, chainable interface.
 */
export class FluentGame {
  constructor(options?: FluentGameOptions);

  // Scene Management
  /**
   * Create or switch to a scene.
   * @param name - Scene identifier
   * @param options - Scene options
   */
  scene(name: string, options?: FluentSceneOptions): FluentScene;
  /**
   * Create scene with custom Scene class.
   * @param name - Scene identifier
   * @param sceneClass - Custom Scene class
   * @param options - Scene options
   */
  scene(name: string, sceneClass: new (...args: any[]) => Scene, options?: FluentSceneOptions): FluentScene;
  /**
   * Create scene with custom Scene class (name derived from class).
   * @param sceneClass - Custom Scene class
   * @param options - Scene options
   */
  scene(sceneClass: new (...args: any[]) => Scene, options?: FluentSceneOptions): FluentScene;

  /**
   * Switch context to an existing scene (does not create).
   * @param name - Scene name
   */
  inScene(name: string): FluentScene;

  /**
   * Shortcut: create GameObject in current/default scene.
   * @param options - GameObject options
   */
  go(options?: GameObjectOptions): FluentGO;
  /**
   * Create GameObject with custom class.
   * @param goClass - Custom GameObject class
   * @param options - GameObject options
   */
  go(goClass: new (...args: any[]) => GameObject, options?: GameObjectOptions): FluentGO;

  // Scene Visibility
  /** Show a scene by name */
  showScene(name: string): FluentGame;
  /** Hide a scene by name */
  hideScene(name: string): FluentGame;
  /** Transition between scenes */
  transition(from: string, to: string, options?: TransitionOptions): FluentGame;

  // State Management
  /** Set initial state */
  state(initialState: Record<string, any>): FluentGame;
  /** Get a state value */
  getState<T = any>(key: string): T;
  /** Set a state value */
  setState(key: string, value: any): FluentGame;

  // Events & Lifecycle
  /**
   * Register event handler.
   * @param event - Event name (update, keydown:escape, click, etc.)
   * @param handler - Handler function
   */
  on(event: string, handler: (ctx: FluentContext, e?: any) => void): FluentGame;
  on(event: 'update', handler: (dt: number, ctx: FluentContext) => void): FluentGame;

  // Plugins
  /** Use a plugin or scene builder function */
  use(plugin: (game: FluentGame) => void): FluentGame;

  // Lifecycle
  /** Start the game loop */
  start(): FluentGame;
  /** Stop the game loop */
  stop(): FluentGame;
  /** Restart the game */
  restart(): FluentGame;

  // Accessors
  /** Underlying Game instance */
  readonly game: Game;
  /** Named object references */
  readonly refs: Record<string, GameObject>;
  /** All scenes */
  readonly scenes: Map<string, Scene>;
  /** Canvas element */
  readonly canvas: HTMLCanvasElement;
  /** Canvas width */
  readonly width: number;
  /** Canvas height */
  readonly height: number;
}

// ==========================================================================
// FluentScene Class
// ==========================================================================

/** Options for fluent scene creation */
export interface FluentSceneOptions extends SceneOptions {
  /** Scene z-index (default: 0) */
  zIndex?: number;
  /** Whether scene is visible (default: true) */
  active?: boolean;
  /** Scene enter callback */
  onEnter?: (ctx: FluentContext) => void;
  /** Scene exit callback */
  onExit?: (ctx: FluentContext) => void;
}

/** Transition options */
export interface TransitionOptions {
  /** Fade duration in seconds */
  fade?: number;
  /** Completion callback */
  onComplete?: () => void;
}

/**
 * Scene builder for the fluent API.
 */
export class FluentScene {
  /**
   * Create a GameObject in this scene.
   * @param options - GameObject options
   */
  go(options?: GameObjectOptions): FluentGO;
  /**
   * Create GameObject with custom class.
   * @param goClass - Custom GameObject class
   * @param options - GameObject options
   */
  go(goClass: new (...args: any[]) => GameObject, options?: GameObjectOptions): FluentGO;

  /** Return to FluentGame context */
  end(): FluentGame;

  /** Access the underlying scene */
  readonly sceneInstance: Scene;
}

// ==========================================================================
// FluentGO Class
// ==========================================================================

/**
 * GameObject builder for the fluent API.
 * Provides chainable methods for adding shapes and behaviors.
 */
export class FluentGO {
  // Shape methods
  circle(options?: { radius?: number; fill?: string; stroke?: string }): FluentGO;
  rect(options?: { width?: number; height?: number; fill?: string; stroke?: string }): FluentGO;
  square(options?: { size?: number; fill?: string; stroke?: string }): FluentGO;
  star(options?: { points?: number; radius?: number; innerRadius?: number; fill?: string }): FluentGO;
  triangle(options?: { size?: number; fill?: string }): FluentGO;
  hexagon(options?: { radius?: number; fill?: string }): FluentGO;
  line(options?: { x2?: number; y2?: number; stroke?: string; lineWidth?: number }): FluentGO;
  ring(options?: { innerRadius?: number; outerRadius?: number; fill?: string }): FluentGO;
  text(content: string, options?: { fill?: string; font?: string }): FluentGO;

  // Motion methods (apply behaviors)
  pulse(options?: { min?: number; max?: number; duration?: number }): FluentGO;
  orbit(options?: { radius?: number; speed?: number; centerX?: number; centerY?: number }): FluentGO;
  oscillate(options?: { axis?: 'x' | 'y'; amplitude?: number; frequency?: number }): FluentGO;
  bounce(options?: { height?: number; duration?: number }): FluentGO;
  shake(options?: { intensity?: number; duration?: number }): FluentGO;
  float(options?: { amplitude?: number; frequency?: number }): FluentGO;
  spin(options?: { speed?: number }): FluentGO;

  /** Return to FluentScene context */
  end(): FluentScene;

  /** Access the underlying GameObject */
  readonly goInstance: GameObject;
}

// ==========================================================================
// FluentLayer Class
// ==========================================================================

/**
 * Layer builder for organizing GameObjects at different z-levels.
 */
export class FluentLayer {
  /** Add a GameObject to this layer */
  go(options?: GameObjectOptions): FluentGO;
  /** Return to parent context */
  end(): FluentScene;
}

// ==========================================================================
// Sketch API
// ==========================================================================

/** Context passed to sketch update function */
export interface SketchContext {
  /** All created GameObjects */
  shapes: GameObject[];
  /** Elapsed time in seconds */
  time: number;
  /** Current frame number */
  frame: number;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Mouse position */
  mouse: { x: number; y: number };
  /** Named object references */
  refs: Record<string, GameObject>;
  /** Underlying Game instance */
  game: Game;
}

/**
 * Ultra-simple sketch API for quick prototypes.
 */
export interface SketchAPI {
  // Shapes
  circle(x: number, y: number, r: number, fill?: string): SketchAPI;
  rect(x: number, y: number, w: number, h: number, fill?: string): SketchAPI;
  square(x: number, y: number, size: number, fill?: string): SketchAPI;
  star(x: number, y: number, points: number, r: number, fill?: string): SketchAPI;
  triangle(x: number, y: number, size: number, fill?: string): SketchAPI;
  hexagon(x: number, y: number, r: number, fill?: string): SketchAPI;
  line(x1: number, y1: number, x2: number, y2: number, stroke?: string, lineWidth?: number): SketchAPI;
  ring(x: number, y: number, innerRadius: number, outerRadius: number, fill?: string): SketchAPI;
  text(content: string, x: number, y: number, opts?: { fill?: string; font?: string }): SketchAPI;

  // Bulk creation
  grid(cols: number, rows: number, spacing: number, shapeFn: (api: SketchAPI, x: number, y: number, col: number, row: number) => void): SketchAPI;
  repeat(count: number, shapeFn: (api: SketchAPI, index: number, total: number) => void): SketchAPI;
  radial(cx: number, cy: number, radius: number, count: number, shapeFn: (api: SketchAPI, x: number, y: number, angle: number, index: number) => void): SketchAPI;

  // Lifecycle
  setup(fn: (api: SketchAPI) => void): SketchAPI;
  update(fn: (dt: number, ctx: SketchContext) => void): SketchAPI;
  start(): FluentGame;

  // Accessors
  readonly width: number;
  readonly height: number;
  readonly game: FluentGame | null;
}

// ==========================================================================
// Fluent Context
// ==========================================================================

/** Context object passed to event handlers */
export interface FluentContext {
  /** Named object references */
  refs: Record<string, GameObject>;
  /** Game state */
  state: Record<string, any>;
  /** All scenes by name */
  scenes: Record<string, Scene>;
  /** Underlying Game instance */
  game: Game;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Show a scene */
  showScene: (name: string) => void;
  /** Hide a scene */
  hideScene: (name: string) => void;
  /** Transition between scenes */
  transition: (from: string, to: string, opts?: TransitionOptions) => void;
}

// ==========================================================================
// Re-exports for convenience
// ==========================================================================

export { Motion, Easing, Tweenetik, Keys, Mouse };

