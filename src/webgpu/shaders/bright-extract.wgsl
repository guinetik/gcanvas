// Bloom bright extract — threshold pass.
// Port of BRIGHT_EXTRACT_FRAGMENT from src/webgl/shaders/attractor-shaders.js.

struct Uniforms {
    threshold: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let color = textureSample(tex, texSampler, uv);
    // Preserve bloom on saturated blue and red, too.
    let peak = max(color.r, max(color.g, color.b));
    let brightness = smoothstep(u.threshold, u.threshold + 0.15, peak);
    return color * brightness;
}
