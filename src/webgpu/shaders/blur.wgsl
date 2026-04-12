// Separable Gaussian blur — used for horizontal and vertical passes.
// Port of BLUR_FRAGMENT from src/webgl/shaders/attractor-shaders.js.

struct Uniforms {
    direction: vec2f,
    radius: f32,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let weights = array<f32, 5>(0.2270270, 0.1945946, 0.1216216, 0.0540541, 0.0162162);

    var color = textureSample(tex, texSampler, uv) * weights[0];

    for (var i = 1; i < 5; i++) {
        let offset = u.direction * f32(i) * u.radius;
        color += textureSample(tex, texSampler, uv + offset) * weights[i];
        color += textureSample(tex, texSampler, uv - offset) * weights[i];
    }

    return color;
}
