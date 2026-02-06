/**
 * @module physics
 * @description Physics module for particle simulations.
 * 
 * Provides:
 * - Physics: Stateless physics calculations (collision, forces, kinematics)
 * - PhysicsUpdaters: Composable updaters for ParticleSystem
 * 
 * @example
 * import { Physics, PhysicsUpdaters } from '@guinetik/gcanvas';
 * 
 * // Use Physics directly for custom calculations
 * const collision = Physics.checkCollision(p1, p2);
 * 
 * // Use PhysicsUpdaters with ParticleSystem
 * const system = new ParticleSystem(game, {
 *   updaters: [
 *     Updaters.velocity,
 *     PhysicsUpdaters.particleCollisions(0.9),
 *     PhysicsUpdaters.bounds3D(bounds),
 *   ]
 * });
 */

export { Physics } from './physics.js';
export { PhysicsUpdaters } from './physics-updaters.js';
