/**
 * WebGL Module for gcanvas
 *
 * Provides optional WebGL rendering capabilities for enhanced visual effects.
 * This is an opt-in feature - shapes default to Canvas 2D rendering.
 */

export { WebGLRenderer } from "./webgl-renderer.js";
export { WebGLParticleRenderer } from "./webgl-particle-renderer.js";
export { SPHERE_SHADERS } from "./shaders/sphere-shaders.js";
export * from "./shaders/point-sprite-shaders.js";
