/**
 * @module Animation
 * @description A comprehensive animation system for games and interactive applications.
 * Provides stateless animation functions, easing utilities, property tweening, and more.
 * <ul>
 *      <li>{@link Tween}</li>
 *      <li>{@link Motion}</li>
 *      <li>{@link Tweenetik}</li>
 *      <li>{@link Easing}</li>
 * <ul/>
 * @version 1.0.0
 * @author Guinetik
 * @example
 * // Basic tweening
 * import { Tweenetik, Easing } from './animation';
 * 
 * // Animate an object's properties
 * Tweenetik.to(player, { x: 100, y: 200 }, 1.5, Easing.easeOutBounce, {
 *   onComplete: () => console.log('Animation complete!')
 * });
 * 
 * @example
 * // Stateless animation
 * import { Motion } from './animation';
 * 
 * function update(dt) {
 *   // Update elapsed time
 *   elapsedTime += dt;
 *   
 *   // Get current position using bezier curve
 *   const result = Motion.bezier(
 *     [0, 0],      // Start point
 *     [50, -50],   // Control point 1
 *     [100, -50],  // Control point 2
 *     [150, 0],    // End point
 *     elapsedTime, // Current time
 *     2,           // Duration (seconds)
 *     true         // Loop
 *   );
 *   
 *   // Apply to an object
 *   player.x = result.x;
 *   player.y = result.y;
 * }
 */

/**
 * @see {@link Tween} For basic interpolation and animation helper functions
 */
export { Tween } from "./tween";

/**
 * @see {@link Easing} For timing functions that control animation progression
 */
export { Easing } from "./easing";

/**
 * @see {@link class:Motion} For stateless animation patterns like springs, bezier paths, and physics-based movements
 */
export { Motion } from "./motion";

/**
 * @see {@link class:Tweenetik} For property-based animation system (similar to Flash's Tweener)
 */
export { Tweenetik } from "./tweenetik";