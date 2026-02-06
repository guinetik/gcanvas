/**
 * @module io
 * @description Input/Output handling system for user interactions and event management.
 * 
 * This module provides a comprehensive set of classes for handling user input across
 * different devices and input methods:
 * 
 * - {@link EventEmitter}: Core event management system for subscribing to and triggering events
 * - {@link Mouse}: Mouse input tracking and event normalization
 * - {@link Keys}: Keyboard input with logical key mapping and state tracking
 * - {@link Touch}: Touch input for mobile devices
 * - {@link Input}: Unified input system that normalizes mouse and touch events
 * - {@link Screen}: Screen/device detection and responsive utilities
 * 
 * The IO module serves as the intermediary between raw browser events and your game logic,
 * providing consistent, normalized events regardless of input source.
 * 
 * @example
 * // Basic usage in a game class
 * import { Game } from './core/game.js';
 * import { Keys, Mouse } from './core/io';
 * 
 * class MyGame extends Game {
 *   init() {
 *     super.init();
 *     
 *     // Listen for a specific key press
 *     this.events.on(Keys.SPACE, () => {
 *       this.player.jump();
 *     });
 *     
 *     // Check mouse position in update loop
 *     this.events.on("mousemove", () => {
 *       this.logger.log(`Mouse at ${Mouse.x}, ${Mouse.y}`);
 *     });
 *     
 *     // Listen for unified input events (works with both mouse and touch)
 *     this.events.on("inputdown", () => {
 *       this.player.shoot();
 *     });
 *   }
 *   
 *   update(dt) {
 *     super.update(dt);
 *     
 *     // Check if a key is currently held down
 *     if (Keys.isDown(Keys.RIGHT)) {
 *       this.player.moveRight(dt);
 *     }
 *   }
 * }
 * 
 * @example
 * // Creating your own custom event system
 * import { EventEmitter } from './core/io';
 * 
 * class WeaponSystem {
 *   constructor() {
 *     this.events = new EventEmitter();
 *     this.ammo = 10;
 *   }
 *   
 *   fire() {
 *     if (this.ammo > 0) {
 *       this.ammo--;
 *       this.events.emit('fired', { ammo: this.ammo });
 *       
 *       if (this.ammo === 0) {
 *         this.events.emit('empty');
 *       }
 *     }
 *   }
 * }
 * 
 * const weapon = new WeaponSystem();
 * weapon.events.on('fired', (data) => {
 *   this.logger.log(`Fired! Ammo remaining: ${data.ammo}`);
 * });
 * weapon.events.on('empty', () => {
 *   this.logger.log('Out of ammo! Reload!');
 * });
 */
export {EventEmitter} from "./events.js";
export {Input} from "./input.js";
export {Mouse} from "./mouse.js";
export {Keys} from "./keys.js";
export {Touch} from "./touch.js";
export {Screen} from "./screen.js";
export {Gesture} from "./gesture.js";