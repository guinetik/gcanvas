/**
 * WebGL Module for gcanvas
 *
 * Provides optional WebGL rendering capabilities for enhanced visual effects.
 * This is an opt-in feature - shapes default to Canvas 2D rendering.
 */

export { WebGLRenderer } from "./webgl-renderer.js";
export { WebGLParticleRenderer } from "./webgl-particle-renderer.js";
export { WebGLLineRenderer } from "./webgl-line-renderer.js";
export { WebGLDeJongRenderer } from "./webgl-dejong-renderer.js";
export { WebGLCliffordRenderer } from "./webgl-clifford-renderer.js";
export { WebGLFBO } from "./webgl-fbo.js";
export { WebGLAttractorPipeline } from "./webgl-attractor-pipeline.js";
export { WebGLNebulaRenderer } from "./webgl-nebula-renderer.js";
export { WebGLBlackHoleRenderer } from "./webgl-blackhole-renderer.js";
export { SPHERE_SHADERS } from "./shaders/sphere-shaders.js";
export * from "./shaders/point-sprite-shaders.js";
export * from "./shaders/dejong-point-shaders.js";
export * from "./shaders/clifford-point-shaders.js";