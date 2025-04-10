/**
 * @module GameObjects
 * @description Specialized GameObjects providing common functionality for game development.
 * 
 * This module exports a collection of pre-built GameObject classes that provide
 * specific functionality commonly needed in games:
 * - {@link Scene}: A container for organizing hierarchies of GameObjects
 * - {@link Text}: A GameObject for rendering text with various styling options
 * 
 * All classes in this module extend the core {@link GameObject} class and inherit
 * its properties and lifecycle methods while adding specialized behaviors.
 * 
 * @example
 * // Using Scene to organize a group of related objects
 * import { Game } from '../core/game.js';
 * import { Scene, Text } from '../core/objects';
 * 
 * class MyGame extends Game {
 *   init() {
 *     // Create a UI layer as a Scene
 *     const uiLayer = new Scene(this, {
 *       x: 0,
 *       y: 0
 *     });
 *     
 *     // Add text elements to the scene
 *     const scoreText = new Text(this, "Score: 0", {
 *       x: 20,
 *       y: 20,
 *       font: "24px Arial",
 *       color: "#ffffff"
 *     });
 *     
 *     uiLayer.add(scoreText);
 *     
 *     // Add the entire scene to the pipeline
 *     this.pipeline.add(uiLayer);
 *   }
 * }
 * 
 * @see {@link GameObject} The base class for all objects in this module
 */

export {Scene} from "./scene.js";
export {Text} from "./text.js";