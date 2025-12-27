/**
 * @module Sketch
 * @description Ultra-simple sketch mode for quick creative coding prototypes
 *
 * Provides a minimal API for rapid generative art and creative coding experiments,
 * ideal for Genuary-style sketches where brevity is key.
 *
 * @example
 * import { sketch } from 'gcanvas';
 *
 * sketch(800, 600, 'black')
 *   .circle(400, 300, 50, 'lime')
 *   .update((dt, ctx) => {
 *     ctx.shapes[0].x += Math.sin(ctx.time) * 2;
 *   })
 *   .start();
 */

import { gcanvas } from "./fluent-game.js";

/**
 * Ultra-simple sketch mode for quick prototypes
 * @param {number} [w=800] - Canvas width
 * @param {number} [h=600] - Canvas height
 * @param {string} [bg='black'] - Background color
 * @returns {SketchAPI}
 */
export function sketch(w = 800, h = 600, bg = 'black') {
  const shapes = [];
  let updateFn = null;
  let setupFn = null;
  let fluentGame = null;

  const api = {
    // ─────────────── SHAPES ───────────────

    /**
     * Add a circle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} r - Radius
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    circle: (x, y, r, fill = 'white') => {
      shapes.push({ type: 'circle', x, y, radius: r, fill });
      return api;
    },

    /**
     * Add a rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    rect: (x, y, w, h, fill = 'white') => {
      shapes.push({ type: 'rect', x, y, width: w, height: h, fill });
      return api;
    },

    /**
     * Add a square
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Size
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    square: (x, y, size, fill = 'white') => {
      shapes.push({ type: 'rect', x, y, width: size, height: size, fill });
      return api;
    },

    /**
     * Add a star
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} points - Number of points
     * @param {number} r - Outer radius
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    star: (x, y, points, r, fill = 'white') => {
      shapes.push({ type: 'star', x, y, points, radius: r, fill });
      return api;
    },

    /**
     * Add a triangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Size
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    triangle: (x, y, size, fill = 'white') => {
      shapes.push({ type: 'triangle', x, y, size, fill });
      return api;
    },

    /**
     * Add a hexagon
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} r - Radius
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    hexagon: (x, y, r, fill = 'white') => {
      shapes.push({ type: 'hexagon', x, y, radius: r, fill });
      return api;
    },

    /**
     * Add a line
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {string} [stroke='white'] - Stroke color
     * @param {number} [lineWidth=1] - Line width
     * @returns {SketchAPI}
     */
    line: (x1, y1, x2, y2, stroke = 'white', lineWidth = 1) => {
      shapes.push({ type: 'line', x: x1, y: y1, x2, y2, stroke, lineWidth });
      return api;
    },

    /**
     * Add a ring
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} innerRadius - Inner radius
     * @param {number} outerRadius - Outer radius
     * @param {string} [fill='white'] - Fill color
     * @returns {SketchAPI}
     */
    ring: (x, y, innerRadius, outerRadius, fill = 'white') => {
      shapes.push({ type: 'ring', x, y, innerRadius, outerRadius, fill });
      return api;
    },

    /**
     * Add text
     * @param {string} content - Text content
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} [opts] - Text options
     * @returns {SketchAPI}
     */
    text: (content, x, y, opts = {}) => {
      shapes.push({ type: 'text', content, x, y, ...opts });
      return api;
    },

    // ─────────────── BULK CREATION ───────────────

    /**
     * Create a grid of shapes
     * @param {number} cols - Number of columns
     * @param {number} rows - Number of rows
     * @param {number} spacing - Spacing between cells
     * @param {Function} shapeFn - Function(api, x, y, col, row) to create shapes
     * @returns {SketchAPI}
     */
    grid: (cols, rows, spacing, shapeFn) => {
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing + spacing / 2;
          const y = j * spacing + spacing / 2;
          shapeFn(api, x, y, i, j);
        }
      }
      return api;
    },

    /**
     * Repeat a shape creation function
     * @param {number} count - Number of repetitions
     * @param {Function} shapeFn - Function(api, index, total) to create shapes
     * @returns {SketchAPI}
     */
    repeat: (count, shapeFn) => {
      for (let i = 0; i < count; i++) {
        shapeFn(api, i, count);
      }
      return api;
    },

    /**
     * Create shapes in a circular pattern
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {number} radius - Circle radius
     * @param {number} count - Number of items
     * @param {Function} shapeFn - Function(api, x, y, angle, index)
     * @returns {SketchAPI}
     */
    radial: (cx, cy, radius, count, shapeFn) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        shapeFn(api, x, y, angle, i);
      }
      return api;
    },

    // ─────────────── LIFECYCLE ───────────────

    /**
     * Register a setup function (called once before start)
     * @param {Function} fn - Setup function(api)
     * @returns {SketchAPI}
     */
    setup: (fn) => {
      setupFn = fn;
      return api;
    },

    /**
     * Register an update function (called every frame)
     * @param {Function} fn - Update function(dt, context)
     * @returns {SketchAPI}
     */
    update: (fn) => {
      updateFn = fn;
      return api;
    },

    // ─────────────── START ───────────────

    /**
     * Start the sketch
     * @returns {import('./fluent-game.js').FluentGame}
     */
    start: () => {
      const ctx = gcanvas({ width: w, height: h, bg });

      // Run setup
      setupFn?.(api);

      // Create GOs for all shapes
      const goRefs = [];
      let sceneCtx = ctx.scene('default');

      shapes.forEach((s, i) => {
        const goCtx = sceneCtx.go({ x: s.x ?? 0, y: s.y ?? 0, name: `shape_${i}` });

        switch (s.type) {
          case 'circle':
            goCtx.circle({ radius: s.radius, fill: s.fill });
            break;
          case 'rect':
            goCtx.rect({ width: s.width, height: s.height, fill: s.fill });
            break;
          case 'star':
            goCtx.star({ points: s.points, radius: s.radius, fill: s.fill });
            break;
          case 'triangle':
            goCtx.triangle({ size: s.size, fill: s.fill });
            break;
          case 'hexagon':
            goCtx.hexagon({ radius: s.radius, fill: s.fill });
            break;
          case 'line':
            goCtx.line({
              x2: s.x2 - s.x,
              y2: s.y2 - s.y,
              stroke: s.stroke,
              lineWidth: s.lineWidth
            });
            break;
          case 'ring':
            goCtx.ring({
              innerRadius: s.innerRadius,
              outerRadius: s.outerRadius,
              fill: s.fill
            });
            break;
          case 'text':
            goCtx.text(s.content, {
              fill: s.fill ?? 'white',
              font: s.font ?? '16px monospace'
            });
            break;
        }

        goRefs.push(goCtx.goInstance);

        // Return to scene context for next shape
        sceneCtx = goCtx.end();
      });

      // Wire update
      if (updateFn) {
        let frameCount = 0;
        let totalTime = 0;

        ctx.on('update', (dt, gameCtx) => {
          frameCount++;
          totalTime += dt;

          updateFn(dt, {
            shapes: goRefs,
            time: totalTime,
            frame: frameCount,
            width: w,
            height: h,
            mouse: {
              x: gameCtx.game.mouse?.x ?? 0,
              y: gameCtx.game.mouse?.y ?? 0
            },
            refs: gameCtx.refs,
            game: gameCtx.game
          });
        });
      }

      fluentGame = ctx;
      return ctx.start();
    },

    // ─────────────── UTILITIES ───────────────

    /**
     * Get canvas width
     * @returns {number}
     */
    get width() { return w; },

    /**
     * Get canvas height
     * @returns {number}
     */
    get height() { return h; },

    /**
     * Get the underlying FluentGame (after start)
     * @returns {import('./fluent-game.js').FluentGame|null}
     */
    get game() { return fluentGame; }
  };

  return api;
}

/**
 * @typedef {Object} SketchContext
 * @property {Array<GameObject>} shapes - All created GameObjects
 * @property {number} time - Elapsed time in seconds
 * @property {number} frame - Current frame number
 * @property {number} width - Canvas width
 * @property {number} height - Canvas height
 * @property {{x: number, y: number}} mouse - Mouse position
 * @property {Object} refs - Named object references
 * @property {import('../game/game.js').Game} game - The underlying Game instance
 */

/**
 * @typedef {Object} SketchAPI
 * @property {function(number, number, number, string=): SketchAPI} circle - Add a circle
 * @property {function(number, number, number, number, string=): SketchAPI} rect - Add a rectangle
 * @property {function(number, number, number, string=): SketchAPI} square - Add a square
 * @property {function(number, number, number, number, string=): SketchAPI} star - Add a star
 * @property {function(number, number, number, string=): SketchAPI} triangle - Add a triangle
 * @property {function(number, number, number, string=): SketchAPI} hexagon - Add a hexagon
 * @property {function(number, number, number, number, string=, number=): SketchAPI} line - Add a line
 * @property {function(number, number, number, number, string=): SketchAPI} ring - Add a ring
 * @property {function(string, number, number, Object=): SketchAPI} text - Add text
 * @property {function(number, number, number, Function): SketchAPI} grid - Create a grid of shapes
 * @property {function(number, Function): SketchAPI} repeat - Repeat shape creation
 * @property {function(number, number, number, number, Function): SketchAPI} radial - Create radial pattern
 * @property {function(Function): SketchAPI} setup - Register setup function
 * @property {function(Function): SketchAPI} update - Register update function
 * @property {function(): import('./fluent-game.js').FluentGame} start - Start the sketch
 */
