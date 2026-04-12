// Attractor line vertex shader — transforms screen-space positions to clip space.
// Port of ATTRACTOR_LINE_VERTEX from src/webgl/shaders/attractor-shaders.js.

struct Uniforms {
    resolution: vec2f,
    time: f32,
    minHue: f32,
    maxHue: f32,
    saturation: f32,
    lightness: f32,
    maxAlpha: f32,
    hueOffset: f32,
    intensityBoost: f32,
    saturationBoost: f32,
    alphaBoost: f32,
    energyIntensity: f32,
    energySpeed: f32,
    sparkThreshold: f32,
    depthFogEnabled: f32,
    depthFogDensity: f32,
    depthFogEnergyFalloff: f32,
    iridescenceEnabled: f32,
    iridescenceIntensity: f32,
    iridescenceSpeed: f32,
    iridescenceScale: f32,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) position: vec2f,
    @location(1) speedNorm: f32,
    @location(2) age: f32,
    @location(3) blink: f32,
    @location(4) segIdx: f32,
    @location(5) depth: f32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) speedNorm: f32,
    @location(1) age: f32,
    @location(2) blink: f32,
    @location(3) segIdx: f32,
    @location(4) depth: f32,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var clipPos = (input.position / u.resolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;

    var output: VertexOutput;
    output.position = vec4f(clipPos, 0.0, 1.0);
    output.speedNorm = input.speedNorm;
    output.age = input.age;
    output.blink = input.blink;
    output.segIdx = input.segIdx;
    output.depth = input.depth;
    return output;
}
