/**
 * @module Fluent
 * @description Declarative fluent builder API for GCanvas
 *
 * This module provides a chainable, declarative API layer on top of GCanvas's
 * object-oriented architecture. It enables rapid creative coding while maintaining
 * full access to the underlying power.
 *
 * ## Entry Points
 *
 * - **gcanvas(options)** - Full fluent API for building games and interactive apps
 * - **sketch(w, h, bg)** - Ultra-simple mode for quick creative coding prototypes
 *
 * ## Quick Start
 *
 * @example
 * // Full fluent API
 * import { gcanvas } from 'gcanvas';
 *
 * gcanvas({ bg: 'black' })
 *   .scene('game')
 *     .go({ x: 400, y: 300, name: 'player' })
 *       .circle({ radius: 30, fill: 'lime' })
 *       .pulse({ min: 0.9, max: 1.1, duration: 1 })
 *   .scene('ui', { zIndex: 100 })
 *     .go({ x: 20, y: 20 })
 *       .text('SCORE: 0', { font: '24px monospace', fill: 'white' })
 *   .on('update', (dt, ctx) => {
 *     // Game logic
 *   })
 *   .start();
 *
 * @example
 * // Sketch mode for quick prototypes
 * import { sketch } from 'gcanvas';
 *
 * sketch(800, 600, '#1a1a1a')
 *   .grid(10, 10, 80, (s, x, y, i, j) => {
 *     s.circle(x, y, 20, `hsl(${(i + j) * 20}, 70%, 60%)`);
 *   })
 *   .update((dt, ctx) => {
 *     ctx.shapes.forEach((shape, i) => {
 *       shape.y += Math.sin(ctx.time * 2 + i * 0.1) * 0.5;
 *     });
 *   })
 *   .start();
 *
 * @example
 * // Class injection - use custom classes with fluent API
 * import { gcanvas } from 'gcanvas';
 * import { SpaceScene } from './scenes/space-scene';
 * import { Player, Alien, Boss } from './entities';
 *
 * gcanvas({ bg: 'black' })
 *   // Pass custom scene class
 *   .scene(SpaceScene)
 *   // Or with name: .scene('game', SpaceScene, { zIndex: 0 })
 *
 *   // Pass custom GameObject classes
 *   .go(Player, { x: 400, y: 500, name: 'player' })
 *   .go(Alien, { x: 100, y: 100, type: 0 })
 *   .go(Boss, { x: 400, y: 150, bossType: 2 })
 *
 *   .start();
 *
 * @example
 * // Composable scene modules
 * // scenes/player.js
 * export const playerScene = (g) => g
 *   .inScene('game')
 *     .go({ x: 400, y: 300, name: 'player' })
 *       .circle({ radius: 25, fill: '#00ff88' });
 *
 * // main.js
 * import { gcanvas } from 'gcanvas';
 * import { playerScene } from './scenes/player';
 *
 * gcanvas({ bg: 'black' })
 *   .scene('game')
 *   .use(playerScene)
 *   .start();
 */

// Main entry points
export { gcanvas, FluentGame } from "./fluent-game.js";
export { sketch } from "./sketch.js";

// Builder classes (for advanced usage/extension)
export { FluentScene } from "./fluent-scene.js";
export { FluentGO } from "./fluent-go.js";
export { FluentLayer } from "./fluent-layer.js";

// Re-export commonly used items for convenience
export { Motion } from "../motion/motion.js";
export { Easing } from "../motion/easing.js";
export { Tweenetik } from "../motion/tweenetik.js";
export { Keys } from "../io/keys.js";
export { Mouse } from "../io/mouse.js";
