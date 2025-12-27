/**
 * @module Game
 * @description Core game engine components for building canvas-based games and interactive applications.
 * 
 * This module provides the fundamental building blocks for creating games:
 * - {@link Game}: The main game loop handler and canvas manager
 * - {@link GameObject}: Base class for all entities in the game world
 * - {@link Pipeline}: Management system for game objects and their lifecycle
 * - UI components for user interaction
 * - Pre-built game objects for common use cases
 * 
 * @example
 * // Basic game setup
 * import { Game, GameObject } from './core';
 * 
 * // Create a custom game by extending the base Game class
 * class MyGame extends Game {
 *   init() {
 *     super.init();
 *     // Add your game initialization code here
 *     this.backgroundColor = '#333';
 *     
 *     // Create and add objects to the pipeline
 *     const player = new GameObject(this, {
 *       x: this.width / 2,
 *       y: this.height / 2,
 *       width: 50,
 *       height: 50
 *     });
 *     this.pipeline.add(player);
 *   }
 *   
 *   update(dt) {
 *     super.update(dt);
 *     // Add your custom game update logic here
 *   }
 * }
 * 
 * // Start the game
 * const canvas = document.getElementById('game-canvas');
 * const game = new MyGame(canvas);
 * game.init();
 * game.start();
 */

export { Game } from "./game.js";
export { Pipeline } from "./pipeline.js";
export * from "./objects";
export * from "./ui";
export * from "./systems";