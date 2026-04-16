// Attractor line fragment shader — GPU color math, energy flow, sparks, depth fog, iridescence.
// Port of ATTRACTOR_LINE_FRAGMENT from src/webgl/shaders/attractor-shaders.js.

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

fn hsl2rgb(h_in: f32, s_in: f32, l_in: f32) -> vec3f {
    let h = (h_in % 360.0) / 360.0;
    let s = clamp(s_in, 0.0, 1.0);
    let l = clamp(l_in, 0.0, 1.0);

    let c = (1.0 - abs(2.0 * l - 1.0)) * s;
    let x = c * (1.0 - abs((h * 6.0) % 2.0 - 1.0));
    let m = l - c * 0.5;

    let hSeg = h * 6.0;
    var rgb: vec3f;
    if (hSeg < 1.0) { rgb = vec3f(c, x, 0.0); }
    else if (hSeg < 2.0) { rgb = vec3f(x, c, 0.0); }
    else if (hSeg < 3.0) { rgb = vec3f(0.0, c, x); }
    else if (hSeg < 4.0) { rgb = vec3f(0.0, x, c); }
    else if (hSeg < 5.0) { rgb = vec3f(x, 0.0, c); }
    else { rgb = vec3f(c, 0.0, x); }

    return rgb + m;
}

fn iridescence(idx: f32, time: f32, scale: f32, speed: f32) -> vec3f {
    let phase = idx * scale + time * speed;
    return vec3f(
        cos(phase) * 0.5 + 0.5,
        cos(phase + 2.094) * 0.5 + 0.5,
        cos(phase + 4.189) * 0.5 + 0.5,
    );
}

struct FragmentInput {
    @location(0) speedNorm: f32,
    @location(1) age: f32,
    @location(2) blink: f32,
    @location(3) segIdx: f32,
    @location(4) depth: f32,
    @location(5) side: f32,
};

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4f {
    let baseHue = u.maxHue - input.speedNorm * (u.maxHue - u.minHue);
    let hue = (baseHue + u.hueOffset) % 360.0;

    let sat = min(1.0, (u.saturation / 100.0) * (1.0 + input.blink * (u.saturationBoost - 1.0)));
    let lit = min(1.0, (u.lightness / 100.0) * (1.0 + input.blink * (u.intensityBoost - 1.0)));

    var color = hsl2rgb(hue, sat, lit);

    if (u.iridescenceEnabled > 0.5) {
        let iri = iridescence(input.segIdx, u.time, u.iridescenceScale, u.iridescenceSpeed);
        color = mix(color, color * iri * 2.0, u.iridescenceIntensity);
    }

    var depthFactor = 1.0;
    if (u.depthFogEnabled > 0.5) {
        depthFactor = clamp(mix(1.0, 1.0 - input.depth, u.depthFogEnergyFalloff), 0.0, 1.0);
    }

    let TAU = 6.2832;
    let energy1 = sin(input.segIdx * TAU * 2.0 - u.time * u.energySpeed * 1.0) * 0.5 + 0.5;
    let energy2 = sin(input.segIdx * TAU * 5.0 - u.time * u.energySpeed * 1.7) * 0.5 + 0.5;
    let energy3 = sin(input.segIdx * TAU * 11.0 - u.time * u.energySpeed * 2.3) * 0.5 + 0.5;
    let energy4 = sin(input.segIdx * TAU * 17.0 - u.time * u.energySpeed * 3.1) * 0.5 + 0.5;
    let energy = energy1 * 0.4 + energy2 * 0.25 + energy3 * 0.2 + energy4 * 0.15;
    color *= 1.0 + energy * u.energyIntensity * 3.5 * depthFactor;

    let sparkWave1 = sin(input.segIdx * 150.0 - u.time * 8.0);
    let sparkWave2 = cos(input.segIdx * 200.0 + u.time * 6.0);
    let spark = step(u.sparkThreshold, sparkWave1) + step(u.sparkThreshold + 0.005, sparkWave2) * 0.7;
    color += color * spark * u.energyIntensity * 4.0 * depthFactor;

    if (u.depthFogEnabled > 0.5) {
        let rim = clamp(1.0 - abs(input.depth - 0.4) * 2.0, 0.0, 1.0) * 0.3;
        color *= 1.0 + rim;
    }

    var alpha = (1.0 - input.age) * u.maxAlpha * (1.0 + input.blink * (u.alphaBoost - 1.0));
    alpha = clamp(alpha, 0.0, 1.0);

    // Edge antialiasing: fade alpha near the outer edges of the quad.
    let edgeAA = 1.0 - smoothstep(0.55, 1.0, abs(input.side));
    alpha *= edgeAA;

    if (u.depthFogEnabled > 0.5) {
        let fogFade = 1.0 - smoothstep(0.3, 1.0, input.depth * u.depthFogDensity);
        alpha *= fogFade;
    }

    return vec4f(color * alpha, alpha);
}
