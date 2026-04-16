// Attractor line vertex shader — instanced quad expansion for thick lines.
// Each instance is one line segment; 6 vertices per instance form a screen-space quad.

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
    halfWidth: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexInput {
    @location(0) quadVertex: vec2f,   // per-vertex: (side: -1/+1, end: 0/1)
    @location(1) segment: vec4f,      // per-instance: (x1, y1, x2, y2)
    @location(2) segMeta: vec4f,         // per-instance: (speedNorm, age, blink, segIdx)
    @location(3) depthPair: vec2f,    // per-instance: (depth1, depth2)
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) speedNorm: f32,
    @location(1) age: f32,
    @location(2) blink: f32,
    @location(3) segIdx: f32,
    @location(4) depth: f32,
    @location(5) side: f32,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    let side = input.quadVertex.x;  // -1 or +1
    let end  = input.quadVertex.y;  //  0 or  1

    // Select endpoint based on end flag
    let p1 = input.segment.xy;
    let p2 = input.segment.zw;
    var p = mix(p1, p2, vec2f(end));

    // Perpendicular offset for line thickness
    let dir = p2 - p1;
    let len = length(dir);
    let perp = select(vec2f(0.0, 1.0), vec2f(-dir.y, dir.x) / len, len > 0.0001);
    p += perp * side * u.halfWidth;

    var clipPos = (p / u.resolution) * 2.0 - 1.0;
    clipPos.y = -clipPos.y;

    var output: VertexOutput;
    output.position = vec4f(clipPos, 0.0, 1.0);
    output.speedNorm = input.segMeta.x;
    output.age = input.segMeta.y;
    output.blink = input.segMeta.z;
    output.segIdx = input.segMeta.w;
    output.depth = mix(input.depthPair.x, input.depthPair.y, end);
    output.side = side;
    return output;
}
