// Background shader — animated FBM noise with vignette.
// Port of BACKGROUND_FRAGMENT from src/webgl/shaders/attractor-shaders.js.

struct Uniforms {
    time: f32,
    fogDensity: f32,
    noiseScale: f32,
    animSpeed: f32,
    baseColor: vec3f,
    _pad: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

fn hash(p: vec2f) -> f32 {
    var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
    p3 += dot(p3, vec3f(p3.y, p3.z, p3.x) + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

fn noise(p: vec2f) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let a = hash(i);
    let b = hash(i + vec2f(1.0, 0.0));
    let c = hash(i + vec2f(0.0, 1.0));
    let d = hash(i + vec2f(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

fn fbm(p_in: vec2f) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var p = p_in;
    for (var i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
    let t = u.time * u.animSpeed;
    let n1 = fbm(uv * u.noiseScale + vec2f(t * 0.3, t * 0.1));
    let n2 = fbm(uv * u.noiseScale * 1.5 + vec2f(-t * 0.2, t * 0.25));
    let n = (n1 + n2) * 0.5;

    let center = uv - 0.5;
    let vignette = clamp(1.0 - dot(center, center) * 2.0, 0.0, 1.0);

    let color = u.baseColor * (0.5 + n * 0.5) * vignette;
    let alpha = u.fogDensity * vignette;

    return vec4f(color * alpha, alpha);
}
