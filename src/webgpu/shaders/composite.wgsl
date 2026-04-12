// Bloom composite — merges scene + bloom textures.
// Port of COMPOSITE_FRAGMENT from src/webgl/shaders/attractor-shaders.js.

struct Uniforms {
    bloomStrength: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var sceneTex: texture_2d<f32>;
@group(0) @binding(3) var bloomTex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let scene = textureSample(sceneTex, texSampler, uv);
    let bloom = textureSample(bloomTex, texSampler, uv);

    let color = scene.rgb + bloom.rgb * u.bloomStrength;
    let alpha = clamp(scene.a + bloom.a * u.bloomStrength, 0.0, 1.0);
    return vec4f(color, alpha);
}
