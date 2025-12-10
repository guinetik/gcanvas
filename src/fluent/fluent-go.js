/**
 * @module FluentGO
 * @description Builder class for GameObject operations in the fluent API
 *
 * Provides chainable methods for adding shapes, motions, and children to GameObjects.
 */

import { GameObject } from "../game/objects/go.js";
import { Group } from "../shapes/group.js";

// Import all shapes
import { Circle } from "../shapes/circle.js";
import { Rectangle } from "../shapes/rect.js";
import { RoundedRectangle } from "../shapes/roundrect.js";
import { Square } from "../shapes/square.js";
import { Triangle } from "../shapes/triangle.js";
import { Star } from "../shapes/star.js";
import { Diamond } from "../shapes/diamond.js";
import { Hexagon } from "../shapes/hexagon.js";
import { Heart } from "../shapes/heart.js";
import { Line } from "../shapes/line.js";
import { Arc } from "../shapes/arc.js";
import { Ring } from "../shapes/ring.js";
import { Polygon } from "../shapes/poly.js";
import { Arrow } from "../shapes/arrow.js";
import { Cross } from "../shapes/cross.js";
import { Pin } from "../shapes/pin.js";
import { Cloud } from "../shapes/clouds.js";
import { TextShape } from "../shapes/text.js";
import { ImageShape } from "../shapes/image.js";
import { SVGShape } from "../shapes/svg.js";

// Import motion system
import { Motion } from "../motion/motion.js";
import { Tweenetik } from "../motion/tweenetik.js";

/**
 * FluentGO - Builder class for GameObject operations
 */
export class FluentGO {
  /** @type {import('./fluent-scene.js').FluentScene|FluentGO} */
  #parent;
  /** @type {GameObject} */
  #go;
  /** @type {Object} */
  #refs;
  /** @type {Object} */
  #state;
  /** @type {Array} */
  #shapes = [];
  /** @type {Array} */
  #motions = [];

  /**
   * @param {import('./fluent-scene.js').FluentScene|FluentGO} parent - Parent context
   * @param {GameObject} go - Wrapped GameObject instance
   * @param {Object} refs - Shared refs object
   * @param {Object} state - Shared state object
   */
  constructor(parent, go, refs, state) {
    this.#parent = parent;
    this.#go = go;
    this.#refs = refs;
    this.#state = state;
  }

  // ─────────────────────────────────────────────────────────
  // SHAPE SHORTCUTS
  // ─────────────────────────────────────────────────────────

  /**
   * Add a Circle shape
   * @param {Object} [opts] - Circle options
   * @param {number} [opts.radius] - Circle radius
   * @param {string} [opts.fill] - Fill color
   * @param {string} [opts.stroke] - Stroke color
   * @returns {FluentGO}
   */
  circle(opts = {}) {
    return this.#addShape(Circle, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Rectangle shape
   * @param {Object} [opts] - Rectangle options
   * @param {number} [opts.width] - Rectangle width
   * @param {number} [opts.height] - Rectangle height
   * @param {string} [opts.fill] - Fill color
   * @returns {FluentGO}
   */
  rect(opts = {}) {
    return this.#addShape(Rectangle, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a RoundedRectangle shape
   * @param {Object} [opts] - RoundedRectangle options
   * @param {number} [opts.radius] - Corner radius
   * @returns {FluentGO}
   */
  roundRect(opts = {}) {
    return this.#addShape(RoundedRectangle, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Square shape
   * @param {Object} [opts] - Square options
   * @param {number} [opts.size] - Square size
   * @returns {FluentGO}
   */
  square(opts = {}) {
    return this.#addShape(Square, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Star shape
   * @param {Object} [opts] - Star options
   * @param {number} [opts.points] - Number of points
   * @param {number} [opts.radius] - Outer radius
   * @param {number} [opts.innerRadius] - Inner radius
   * @returns {FluentGO}
   */
  star(opts = {}) {
    return this.#addShape(Star, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Triangle shape
   * @param {Object} [opts] - Triangle options
   * @param {number} [opts.size] - Triangle size
   * @returns {FluentGO}
   */
  triangle(opts = {}) {
    return this.#addShape(Triangle, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Polygon shape
   * @param {Object} [opts] - Polygon options
   * @param {Array} [opts.points] - Polygon vertices
   * @returns {FluentGO}
   */
  poly(opts = {}) {
    return this.#addShape(Polygon, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Line shape
   * @param {Object} [opts] - Line options
   * @param {number} [opts.x2] - End X
   * @param {number} [opts.y2] - End Y
   * @returns {FluentGO}
   */
  line(opts = {}) {
    return this.#addShape(Line, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Hexagon shape
   * @param {Object} [opts] - Hexagon options
   * @param {number} [opts.radius] - Hexagon radius
   * @returns {FluentGO}
   */
  hexagon(opts = {}) {
    return this.#addShape(Hexagon, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Diamond shape
   * @param {Object} [opts] - Diamond options
   * @returns {FluentGO}
   */
  diamond(opts = {}) {
    return this.#addShape(Diamond, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Heart shape
   * @param {Object} [opts] - Heart options
   * @returns {FluentGO}
   */
  heart(opts = {}) {
    return this.#addShape(Heart, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add an Arc shape
   * @param {Object} [opts] - Arc options
   * @param {number} [opts.radius] - Arc radius
   * @param {number} [opts.startAngle] - Start angle
   * @param {number} [opts.endAngle] - End angle
   * @returns {FluentGO}
   */
  arc(opts = {}) {
    return this.#addShape(Arc, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Ring shape
   * @param {Object} [opts] - Ring options
   * @param {number} [opts.innerRadius] - Inner radius
   * @param {number} [opts.outerRadius] - Outer radius
   * @returns {FluentGO}
   */
  ring(opts = {}) {
    return this.#addShape(Ring, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add an Arrow shape
   * @param {Object} [opts] - Arrow options
   * @returns {FluentGO}
   */
  arrow(opts = {}) {
    return this.#addShape(Arrow, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Cross shape
   * @param {Object} [opts] - Cross options
   * @returns {FluentGO}
   */
  cross(opts = {}) {
    return this.#addShape(Cross, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Pin shape
   * @param {Object} [opts] - Pin options
   * @returns {FluentGO}
   */
  pin(opts = {}) {
    return this.#addShape(Pin, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a Cloud shape
   * @param {Object} [opts] - Cloud options
   * @returns {FluentGO}
   */
  cloud(opts = {}) {
    return this.#addShape(Cloud, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a TextShape
   * @param {string} content - Text content
   * @param {Object} [opts] - Text options
   * @param {string} [opts.font] - Font specification
   * @param {string} [opts.fill] - Text color
   * @returns {FluentGO}
   */
  text(content, opts = {}) {
    const normalized = this.#normalizeShapeOpts(opts);
    // TextShape uses 'color' not 'fillColor'
    if (normalized.fillColor) {
      normalized.color = normalized.fillColor;
      delete normalized.fillColor;
    }
    const shape = new TextShape(content, normalized);
    return this.#addShapeInstance(shape);
  }

  /**
   * Add an Image shape
   * @param {HTMLImageElement|ImageData|string} src - Image source
   * @param {Object} [opts] - Image options
   * @returns {FluentGO}
   */
  image(src, opts = {}) {
    const normalized = this.#normalizeShapeOpts(opts);

    if (typeof src === 'string') {
      // Load image from URL
      const img = new Image();
      img.src = src;
      const shape = new ImageShape(img, normalized);

      // Update when loaded
      img.onload = () => {
        shape._bitmap = img;
        shape._width = opts.width ?? img.width;
        shape._height = opts.height ?? img.height;
      };

      return this.#addShapeInstance(shape);
    } else {
      const shape = new ImageShape(src, normalized);
      return this.#addShapeInstance(shape);
    }
  }

  /**
   * Add an SVG shape
   * @param {string} path - SVG path data
   * @param {Object} [opts] - SVG options
   * @returns {FluentGO}
   */
  svg(path, opts = {}) {
    const normalized = this.#normalizeShapeOpts(opts);
    const shape = new SVGShape({ path, ...normalized });
    return this.#addShapeInstance(shape);
  }

  /**
   * Generic shape add by class
   * @param {Function} ShapeClass - Shape constructor
   * @param {Object} [opts] - Shape options
   * @returns {FluentGO}
   */
  add(ShapeClass, opts = {}) {
    return this.#addShape(ShapeClass, this.#normalizeShapeOpts(opts));
  }

  /**
   * Add a shape instance
   * @private
   */
  #addShape(ShapeClass, opts) {
    const shape = new ShapeClass(opts);
    return this.#addShapeInstance(shape);
  }

  /**
   * Add a shape instance to the GO
   * @private
   */
  #addShapeInstance(shape) {
    this.#shapes.push(shape);

    // If first shape, set as renderable; otherwise add to group
    if (this.#shapes.length === 1) {
      this.#go.setRenderable(shape);
    } else {
      // Convert to group if needed
      if (!(this.#go.renderable instanceof Group)) {
        const firstShape = this.#shapes[0];
        const group = new Group();
        group.add(firstShape);
        this.#go.setRenderable(group);
      }
      this.#go.renderable.add(shape);
    }

    return this;
  }

  /**
   * Normalize shape options (shorthand conversions)
   * @private
   */
  #normalizeShapeOpts(opts) {
    const normalized = { ...opts };

    // Shorthand: fill → fillColor (for Shape base class which uses 'color')
    if (opts.fill !== undefined) {
      normalized.color = opts.fill;
      normalized.fillColor = opts.fill;
      delete normalized.fill;
    }

    // Shorthand: stroke → strokeColor
    if (opts.stroke !== undefined) {
      normalized.strokeColor = opts.stroke;
      delete normalized.stroke;
    }

    return normalized;
  }

  // ─────────────────────────────────────────────────────────
  // MOTION SHORTCUTS
  // ─────────────────────────────────────────────────────────

  /**
   * Add oscillation motion
   * @param {Object} [opts] - Motion options
   * @param {string} [opts.prop='y'] - Property to animate
   * @param {number} [opts.min=-50] - Minimum offset
   * @param {number} [opts.max=50] - Maximum offset
   * @param {number} [opts.duration=2] - Duration in seconds
   * @returns {FluentGO}
   */
  oscillate(opts = {}) {
    return this.motion('oscillate', opts);
  }

  /**
   * Add pulse motion (scale animation)
   * @param {Object} [opts] - Motion options
   * @param {string} [opts.prop='scale'] - Property to animate
   * @param {number} [opts.min=0.8] - Minimum value
   * @param {number} [opts.max=1.2] - Maximum value
   * @param {number} [opts.duration=1] - Duration in seconds
   * @returns {FluentGO}
   */
  pulse(opts = {}) {
    return this.motion('pulse', opts);
  }

  /**
   * Add orbit motion
   * @param {Object} [opts] - Motion options
   * @param {number} [opts.centerX] - Orbit center X
   * @param {number} [opts.centerY] - Orbit center Y
   * @param {number} [opts.radiusX=100] - X radius
   * @param {number} [opts.radiusY=100] - Y radius
   * @param {number} [opts.duration=3] - Orbit period in seconds
   * @param {boolean} [opts.clockwise=true] - Direction
   * @returns {FluentGO}
   */
  orbit(opts = {}) {
    return this.motion('orbit', opts);
  }

  /**
   * Add float motion (random wandering)
   * @param {Object} [opts] - Motion options
   * @param {number} [opts.radius=20] - Float radius
   * @param {number} [opts.speed=0.5] - Float speed
   * @param {number} [opts.randomness=0.3] - Randomness factor
   * @param {number} [opts.duration=5] - Duration
   * @returns {FluentGO}
   */
  float(opts = {}) {
    return this.motion('float', opts);
  }

  /**
   * Add shake motion
   * @param {Object} [opts] - Motion options
   * @param {number} [opts.intensity=5] - Shake intensity
   * @param {number} [opts.frequency=20] - Shake frequency
   * @param {number} [opts.decay=0.9] - Decay factor
   * @param {number} [opts.duration=0.5] - Duration
   * @returns {FluentGO}
   */
  shake(opts = {}) {
    return this.motion('shake', opts);
  }

  /**
   * Add bounce motion
   * @param {Object} [opts] - Motion options
   * @param {number} [opts.height=100] - Bounce height
   * @param {number} [opts.bounces=3] - Number of bounces
   * @param {number} [opts.duration=2] - Duration
   * @returns {FluentGO}
   */
  bounce(opts = {}) {
    return this.motion('bounce', opts);
  }

  /**
   * Add spring motion
   * @param {Object} [opts] - Motion options
   * @returns {FluentGO}
   */
  spring(opts = {}) {
    return this.motion('spring', opts);
  }

  /**
   * Add spiral motion
   * @param {Object} [opts] - Motion options
   * @param {number} [opts.startRadius=50] - Starting radius
   * @param {number} [opts.endRadius=150] - Ending radius
   * @param {number} [opts.revolutions=3] - Number of revolutions
   * @param {number} [opts.duration=4] - Duration
   * @returns {FluentGO}
   */
  spiral(opts = {}) {
    return this.motion('spiral', opts);
  }

  /**
   * Add pendulum motion
   * @param {Object} [opts] - Motion options
   * @param {number} [opts.amplitude=45] - Swing amplitude in degrees
   * @param {number} [opts.duration=2] - Period
   * @returns {FluentGO}
   */
  pendulum(opts = {}) {
    return this.motion('pendulum', opts);
  }

  /**
   * Add waypoint/patrol motion
   * @param {Object} [opts] - Motion options
   * @param {Array} [opts.waypoints] - Array of {x, y} points
   * @param {number} [opts.speed=100] - Movement speed
   * @param {number} [opts.waitTime=0] - Wait time at each point
   * @returns {FluentGO}
   */
  waypoint(opts = {}) {
    return this.motion('waypoint', opts);
  }

  /**
   * Generic motion add
   * @param {string} type - Motion type name
   * @param {Object} [opts] - Motion options
   * @returns {FluentGO}
   */
  motion(type, opts = {}) {
    // Store motion config for processing in update loop
    this.#motions.push({ type, opts });

    // Initialize motion state on GO
    if (!this.#go._fluentMotions) {
      this.#go._fluentMotions = [];
      this.#go._motionTime = 0;

      // Store base position for relative motions
      this.#go._baseX = this.#go.x;
      this.#go._baseY = this.#go.y;

      // Inject motion processing into GO update
      const originalUpdate = this.#go.update?.bind(this.#go) || (() => {});
      const self = this;
      this.#go.update = function(dt) {
        originalUpdate(dt);
        this._motionTime += dt;
        self.#processMotions(dt);
      };
    }

    this.#go._fluentMotions.push({ type, opts, state: null });
    return this;
  }

  /**
   * Process all motions on this GO
   * @private
   */
  #processMotions(dt) {
    for (const motion of this.#go._fluentMotions) {
      const result = this.#applyMotion(motion, dt);
      motion.state = result?.state;
    }
  }

  /**
   * Apply a single motion
   * @private
   */
  #applyMotion(motion, dt) {
    const { type, opts, state } = motion;
    const t = this.#go._motionTime;
    const go = this.#go;

    switch (type) {
      case 'oscillate': {
        const { prop = 'y', min = -50, max = 50, duration = 2 } = opts;
        const result = Motion.oscillate(min, max, t, duration, true);

        // Store base value if not set
        const baseProp = `_base_${prop}`;
        if (go[baseProp] === undefined) {
          go[baseProp] = go[prop];
        }

        go[prop] = go[baseProp] + result.value;
        return result;
      }

      case 'pulse': {
        const { prop = 'scale', min = 0.8, max = 1.2, duration = 1 } = opts;
        const result = Motion.pulse(min, max, t, duration, true);

        if (prop === 'scale') {
          go.scaleX = result.value;
          go.scaleY = result.value;
        } else if (prop === 'opacity' && go.renderable) {
          go.renderable.opacity = result.value;
        } else {
          go[prop] = result.value;
        }
        return result;
      }

      case 'orbit': {
        const {
          centerX = go._baseX,
          centerY = go._baseY,
          radiusX = 100,
          radiusY = 100,
          duration = 3,
          clockwise = true
        } = opts;

        // Store orbit center on first call
        if (!go._orbitCenter) {
          go._orbitCenter = { x: centerX, y: centerY };
        }

        const result = Motion.orbit(
          go._orbitCenter.x, go._orbitCenter.y,
          radiusX, radiusY, 0, t, duration, true, clockwise
        );

        go.x = result.x;
        go.y = result.y;
        return result;
      }

      case 'float': {
        const { radius = 20, speed = 0.5, randomness = 0.3, duration = 5 } = opts;

        // Initialize float state
        if (!go._floatState) {
          go._floatState = {
            baseX: go._baseX,
            baseY: go._baseY
          };
        }

        const result = Motion.float(
          go._floatState, t, duration, speed, randomness, radius, true
        );

        go.x = result.x;
        go.y = result.y;
        return result;
      }

      case 'shake': {
        const {
          intensity = 5,
          frequency = 20,
          decay = 0.9,
          duration = 0.5
        } = opts;

        const result = Motion.shake(
          go._baseX, go._baseY,
          intensity, intensity, frequency, decay, t, duration, true
        );

        go.x = result.x;
        go.y = result.y;
        return result;
      }

      case 'bounce': {
        const { height = 100, bounces = 3, duration = 2 } = opts;
        const result = Motion.bounce(height, go._baseY, bounces, t, duration, true);

        go.y = result.y;
        return result;
      }

      case 'spiral': {
        const {
          startRadius = 50,
          endRadius = 150,
          revolutions = 3,
          duration = 4
        } = opts;

        if (!go._spiralCenter) {
          go._spiralCenter = { x: go._baseX, y: go._baseY };
        }

        const result = Motion.spiral(
          go._spiralCenter.x, go._spiralCenter.y,
          startRadius, endRadius, 0, revolutions, t, duration, true
        );

        go.x = result.x;
        go.y = result.y;
        return result;
      }

      case 'pendulum': {
        const { amplitude = 45, duration = 2, damped = false } = opts;
        const result = Motion.pendulum(0, amplitude, t, duration, true, damped);

        go.rotation = result.value * (Math.PI / 180);
        return result;
      }

      case 'waypoint': {
        const { waypoints = [], speed = 100, waitTime = 0 } = opts;

        if (waypoints.length === 0) return { state: null };

        const result = Motion.waypoint(
          go, t, waypoints, speed, waitTime, true, null, state
        );

        go.x = result.x ?? go.x;
        go.y = result.y ?? go.y;
        return result;
      }

      default:
        console.warn(`Unknown motion type: ${type}`);
        return { state: null };
    }
  }

  // ─────────────────────────────────────────────────────────
  // TWEEN SHORTCUTS
  // ─────────────────────────────────────────────────────────

  /**
   * Tween properties over time
   * @param {Object} props - Properties to tween { x: 100, y: 200 }
   * @param {Object} [opts] - Tween options
   * @param {number} [opts.duration=1] - Duration in seconds
   * @param {string|Function} [opts.easing='easeOutQuad'] - Easing function
   * @param {number} [opts.delay=0] - Delay before starting
   * @param {Function} [opts.onComplete] - Completion callback
   * @returns {FluentGO}
   */
  tween(props, opts = {}) {
    const { duration = 1, easing = 'easeOutQuad', delay = 0, onComplete } = opts;

    if (delay > 0) {
      setTimeout(() => {
        Tweenetik.to(this.#go, props, duration, easing, { onComplete });
      }, delay * 1000);
    } else {
      Tweenetik.to(this.#go, props, duration, easing, { onComplete });
    }

    return this;
  }

  // ─────────────────────────────────────────────────────────
  // CHILD GAMEOBJECTS
  // ─────────────────────────────────────────────────────────

  /**
   * Create a child GameObject
   * @param {Object} [opts] - Child GO options
   * @param {Function} [builderFn] - Optional builder callback
   * @returns {FluentGO}
   */
  child(opts = {}, builderFn) {
    const childGO = new GameObject(opts);

    // Set game reference
    if (this.#go.game) {
      childGO.game = this.#go.game;
    }

    this.#go.addChild(childGO);

    // Register in refs if named
    if (opts.name) {
      this.#refs[opts.name] = childGO;
    }

    const fluentChild = new FluentGO(this, childGO, this.#refs, this.#state);

    if (builderFn) {
      builderFn(fluentChild);
      return this; // Return parent GO context
    }

    return fluentChild;
  }

  // ─────────────────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────────────────

  /**
   * Register event handler on this GO
   * @param {string} event - Event name
   * @param {Function} handler - Handler function
   * @returns {FluentGO}
   */
  on(event, handler) {
    const ctx = {
      go: this.#go,
      shapes: this.#shapes,
      refs: this.#refs,
      state: this.#state
    };

    if (this.#go.events) {
      this.#go.events.on(event, (e) => handler(ctx, e));
    }

    return this;
  }

  /**
   * Custom update function for this GO
   * @param {Function} fn - Update function (dt, context)
   * @returns {FluentGO}
   */
  update(fn) {
    const originalUpdate = this.#go.update?.bind(this.#go) || (() => {});
    const shapes = this.#shapes;
    const refs = this.#refs;
    const state = this.#state;
    const go = this.#go;

    this.#go.update = (dt) => {
      originalUpdate(dt);
      fn(dt, { go, shapes, refs, state });
    };

    return this;
  }

  // ─────────────────────────────────────────────────────────
  // TRANSFORM SHORTCUTS
  // ─────────────────────────────────────────────────────────

  /**
   * Set position
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {FluentGO}
   */
  pos(x, y) {
    this.#go.x = x;
    this.#go.y = y;
    return this;
  }

  /**
   * Set scale
   * @param {number} sx - X scale
   * @param {number} [sy] - Y scale (defaults to sx)
   * @returns {FluentGO}
   */
  scale(sx, sy) {
    this.#go.scaleX = sx;
    this.#go.scaleY = sy ?? sx;
    return this;
  }

  /**
   * Set rotation
   * @param {number} degrees - Rotation in degrees
   * @returns {FluentGO}
   */
  rotate(degrees) {
    this.#go.rotation = degrees * (Math.PI / 180);
    return this;
  }

  /**
   * Set opacity
   * @param {number} value - Opacity (0-1)
   * @returns {FluentGO}
   */
  opacity(value) {
    this.#go.opacity = value;
    if (this.#go.renderable) {
      this.#go.renderable.opacity = value;
    }
    return this;
  }

  /**
   * Set z-index
   * @param {number} value - Z-index value
   * @returns {FluentGO}
   */
  zIndex(value) {
    this.#go.zIndex = value;
    return this;
  }

  // ─────────────────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────────────────

  /**
   * Navigate back to parent context
   * @returns {import('./fluent-scene.js').FluentScene|FluentGO}
   */
  end() {
    return this.#parent;
  }

  /**
   * Create sibling GO (shortcut to scene.go)
   * @param {Object} [opts] - GO options
   * @returns {FluentGO}
   */
  go(opts) {
    // Navigate up to scene and create new GO
    let parent = this.#parent;
    while (parent && !parent.sceneInstance) {
      parent = parent.end?.();
    }
    if (parent && parent.go) {
      return parent.go(opts);
    }
    throw new Error('Cannot find scene context');
  }

  /**
   * Switch to another scene
   * @param {string} name - Scene name
   * @param {Object} [opts] - Scene options
   * @returns {import('./fluent-scene.js').FluentScene}
   */
  scene(name, opts) {
    let parent = this.#parent;
    while (parent && !parent.sceneInstance) {
      parent = parent.end?.();
    }
    if (parent && parent.scene) {
      return parent.scene(name, opts);
    }
    throw new Error('Cannot find game context');
  }

  // ─────────────────────────────────────────────────────────
  // SHORTCUTS
  // ─────────────────────────────────────────────────────────

  /**
   * Start the game
   * @returns {import('./fluent-game.js').FluentGame}
   */
  start() {
    let parent = this.#parent;
    while (parent && parent.end) {
      const next = parent.end();
      if (next === parent) break;
      parent = next;
    }
    return parent.start();
  }

  // ─────────────────────────────────────────────────────────
  // ACCESSORS
  // ─────────────────────────────────────────────────────────

  /** @returns {GameObject} Underlying GameObject instance */
  get goInstance() { return this.#go; }

  /** @returns {Array} All shapes added to this GO */
  get shapes() { return this.#shapes; }

  /** @returns {Object} Named object references */
  get refs() { return this.#refs; }

  /** @returns {Object} Shared state */
  get state() { return this.#state; }
}
