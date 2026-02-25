// signal/noise
// a valentine card
// A meditation on: attractors, cosmic distance, electronic pulse,
// the act of making the invisible visible, and connection across void

#define PI 3.14159265359
#define TAU 6.28318530718

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1, 0)), f.x),
        mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

vec3 attractor(vec3 p, float sigma, float rho, float beta) {
    return vec3(
        sigma * (p.y - p.x),
        p.x * (rho - p.z) - p.y,
        p.x * p.y - beta * p.z
    );
}

vec3 nebula1(float t) {
    vec3 a = vec3(0.12, 0.03, 0.20);
    vec3 b = vec3(0.15, 0.05, 0.18);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.10, 0.05);
    return a + b * cos(TAU * (c * t + d));
}

vec3 nebula2(float t) {
    vec3 a = vec3(0.16, 0.04, 0.22);
    vec3 b = vec3(0.18, 0.06, 0.20);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.50, 0.55, 0.45);
    return a + b * cos(TAU * (c * t + d));
}

vec3 emissionGlow(float t) {
    vec3 a = vec3(0.20, 0.06, 0.22);
    vec3 b = vec3(0.20, 0.06, 0.18);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.25, 0.35, 0.30);
    return a + b * cos(TAU * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    float time = iTime * 0.3;

    // cosmic dust
    vec2 q = vec2(fbm(uv * 2.0 + time * 0.08), fbm(uv * 2.0 + vec2(5.2, 1.3)));
    vec2 rr = vec2(fbm(uv * 2.0 + 4.0 * q + vec2(1.7, 9.2) + 0.12 * time),
                   fbm(uv * 2.0 + 4.0 * q + vec2(8.3, 2.8) + 0.1 * time));
    float f = fbm(uv * 2.0 + 4.0 * rr);

    // dust lanes
    float dust = fbm(uv * 3.5 + vec2(time * 0.05, -time * 0.03));
    float dustLanes = smoothstep(0.35, 0.55, dust) * 0.6;

    // attractor field
    vec3 ap = vec3(uv * 15.0, sin(time * 0.25) * 10.0 + 15.0);
    vec3 da = attractor(ap, 10.0, 28.0, 8.0 / 3.0);
    float attractorField = length(da.xy) * 0.003;
    attractorField = sin(attractorField * 6.0 + time * 0.8) * 0.5 + 0.5;

    // two signals
    vec2 focus1 = vec2(sin(time * 0.5) * 0.3, cos(time * 0.35) * 0.2);
    vec2 focus2 = vec2(cos(time * 0.4) * 0.25, sin(time * 0.55) * 0.3);
    float d1 = length(uv - focus1);
    float d2 = length(uv - focus2);

    float pulse1 = sin(d1 * 18.0 - time * 2.5) * exp(-d1 * 2.5);
    float pulse2 = sin(d2 * 18.0 - time * 2.5) * exp(-d2 * 2.5);

    float interference = pulse1 * pulse2 * 3.0;
    interference += sin((d1 + d2) * 12.0 - time * 1.5) * 0.12 *
                    smoothstep(1.0, 0.2, abs(d1 - d2));

    // connection filament
    vec2 dir = normalize(focus2 - focus1);
    vec2 toP = uv - focus1;
    float proj = dot(toP, dir);
    float projClamped = clamp(proj, 0.0, length(focus2 - focus1));
    vec2 closest = focus1 + dir * projClamped;
    float lineDist = length(uv - closest);
    float breath = sin(time * 0.4) * 0.5 + 0.5;
    float connectionLine = exp(-lineDist * lineDist * 600.0) *
                           (0.3 + 0.4 * breath) * 0.5;

    // compose
    vec3 col = nebula1(f * 0.7 + time * 0.015);

    vec3 darkDust = vec3(0.02, 0.015, 0.03);
    col = mix(col, darkDust, dustLanes * 0.7);

    vec3 attractorColor = nebula2(attractorField + time * 0.03);
    col = mix(col, attractorColor, attractorField * 0.35 * (0.6 + 0.4 * breath));

    float emissionMask = smoothstep(0.45, 0.7, f) * (1.0 - dustLanes);
    vec3 emission = emissionGlow(f * 0.5 + attractorField * 0.3);
    col = mix(col, emission * 1.5, emissionMask * 0.3);

    float coreGlow1 = exp(-d1 * d1 * 8.0) * 0.4;
    float coreGlow2 = exp(-d2 * d2 * 8.0) * 0.35;
    col += vec3(0.45, 0.12, 0.35) * coreGlow1 * (0.7 + 0.3 * breath);
    col += vec3(0.20, 0.12, 0.45) * coreGlow2 * (0.6 + 0.4 * breath);

    col += vec3(0.30, 0.15, 0.55) * max(pulse1, 0.0) * 0.25;
    col += vec3(0.50, 0.12, 0.40) * max(pulse2, 0.0) * 0.25;

    col += vec3(0.45, 0.15, 0.55) * max(interference, 0.0) * (0.3 + 0.3 * breath);

    col += vec3(0.55, 0.25, 0.70) * connectionLine;

    // stars with diffraction spikes
    float stars = 0.0;
    float spikes = 0.0;
    for (float i = 0.0; i < 4.0; i++) {
        vec2 starUV = uv * (40.0 + i * 50.0) + vec2(i * 17.3, i * 31.7);
        vec2 starId = floor(starUV);
        vec2 starF = fract(starUV) - 0.5;
        float h = hash(starId + i * 100.0);
        float starDist = length(starF);

        if (h > 0.96) {
            float angle = atan(starF.y, starF.x);
            spikes += pow(max(cos(angle * 2.0), 0.0), 20.0) * exp(-starDist * 8.0) * 0.3;
            spikes += pow(max(cos(angle * 2.0 + PI * 0.5), 0.0), 20.0) * exp(-starDist * 8.0) * 0.3;
        }

        float starBright = smoothstep(0.04 + h * 0.015, 0.0, starDist);
        starBright *= step(0.9, h);
        starBright *= max(0.0, 0.4 + 0.6 * sin(time * (0.8 + h * 2.0) + h * TAU));
        stars += starBright;
    }

    vec3 starColor = mix(vec3(0.80, 0.50, 1.0), vec3(1.0, 0.55, 0.90),
                         hash(floor(uv * 80.0)));
    col += (stars + spikes) * starColor * 0.5;

    // guide stars
    for (float i = 0.0; i < 3.0; i++) {
        vec2 gPos = vec2(sin(i * 2.39 + 0.5) * 0.6, cos(i * 3.17 + 0.8) * 0.4);
        float gDist = length(uv - gPos);
        float glow = exp(-gDist * gDist * 50.0) * 0.08;
        glow += exp(-gDist * gDist * 400.0) * 0.15;
        vec3 gCol = mix(vec3(0.70, 0.40, 1.0), vec3(1.0, 0.45, 0.85), i / 3.0);
        col += gCol * glow * (0.7 + 0.3 * sin(time * 0.5 + i));
    }

    // vignette
    float vig = 1.0 - dot(uv * 0.6, uv * 0.6);
    col *= smoothstep(-0.1, 0.6, vig);

    col += (hash(uv * iResolution.xy + fract(time)) - 0.5) * 0.015;
    col = pow(max(col, 0.0), vec3(0.95));
    col = clamp(col, 0.0, 1.0);

    fragColor = vec4(col, 1.0);
}
