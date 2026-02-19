// Chua's Circuit Attractor — Shadertoy
// The first physical electronic circuit proven to exhibit chaos (1983).
// Leon Chua's piecewise-linear nonlinear resistor produces the iconic
// double-scroll attractor — two spiralling lobes joined by a saddle.
// Ported from gcanvas attractor-3d-demo / chua.js
//
// Shadertoy setup:
//   Buffer A: iChannel0 = Buffer A (self-feedback)
//   Image:    iChannel0 = Buffer A

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec3 col = texture(iChannel0, uv).rgb;
    col = 1.0 - exp(-col * 2.5);
    float vig = 1.0 - 0.3 * length(uv - 0.5);
    col *= vig;
    fragColor = vec4(col, 1.0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Buffer A — feeds into iChannel0 (self)
// ═══════════════════════════════════════════════════════════════════════════════

#define NUM_PARTICLES 20
#define STEPS 5.0
#define VIEW_SCALE 0.15
#define SPEED 1.5
#define INTENSITY 0.11
#define FADE 0.995
#define FOCUS 1.2
#define RESPAWN_CHANCE 0.005

// Chua parameters
#define ALPHA 15.6
#define GAMMA 25.58
#define M0 -2.0
#define M1 0.0

// Color settings — green-to-cyan palette
#define MIN_HUE 90.0     // Green (fast — scroll transitions)
#define MAX_HUE 180.0    // Cyan (slow — spiral arms)
#define MAX_SPEED 20.0
#define HUE_SHIFT_SPEED 10.0
#define SATURATION 0.90
#define LIGHTNESS 0.48

// Blink settings
#define BLINK_FREQ 7.0
#define BLINK_INTENSITY 1.5
#define BLINK_SAT_BOOST 1.2
#define BLINK_LIT_BOOST 1.3

// State layout: row 0 pixels
//   [0..NUM_PARTICLES-1] = particle positions
//   [NUM_PARTICLES]       = camera state (yaw, pitch)
#define CAM_PIXEL NUM_PARTICLES

// Piecewise-linear Chua diode characteristic
float chuaDiode(float x) {
    return M1 * x + 0.5 * (M0 - M1) * (abs(x + 1.0) - abs(x - 1.0));
}

vec3 integrate(vec3 cur, float dt) {
    float g = chuaDiode(cur.x);
    return cur + vec3(
        ALPHA * (cur.y - cur.x - g),
        cur.x - cur.y + cur.z,
        -GAMMA * cur.y
    ) * dt;
}

vec2 project(vec3 p, float cy, float sy, float cp, float sp) {
    vec3 r = vec3(p.x * cy - p.z * sy, p.y, p.x * sy + p.z * cy);
    return vec2(r.x, r.y * cp - r.z * sp);
}

float dfLine(vec2 a, vec2 b, vec2 p) {
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return distance(a + ab * t, p);
}

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

vec3 hsl2rgb(float h, float s, float l) {
    h = mod(h, 360.0) / 60.0;
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
    float m = l - c * 0.5;
    vec3 rgb;
    if      (h < 1.0) rgb = vec3(c, x, 0);
    else if (h < 2.0) rgb = vec3(x, c, 0);
    else if (h < 3.0) rgb = vec3(0, c, x);
    else if (h < 4.0) rgb = vec3(0, x, c);
    else if (h < 5.0) rgb = vec3(x, 0, c);
    else              rgb = vec3(c, 0, x);
    return rgb + m;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 res = iResolution.xy / iResolution.y;
    vec2 uv = fragCoord / iResolution.y;
    uv -= res / 2.0;

    int px = int(floor(fragCoord.x));
    int py = int(floor(fragCoord.y));

    // ── Camera state (persisted at pixel CAM_PIXEL,0) ──
    vec4 camState = texelFetch(iChannel0, ivec2(CAM_PIXEL, 0), 0);
    float yaw, pitch;
    if (iFrame == 0) {
        yaw = 0.5;
        pitch = -0.6;
    } else {
        yaw   = camState.r * 6.28318;
        pitch = (camState.g - 0.5) * 3.14159;
    }
    if (iMouse.z > 0.0) {
        yaw   = (iMouse.x / iResolution.x) * 6.28318;
        pitch = (iMouse.y / iResolution.y - 0.5) * 3.14159 * 0.6;
    }

    // Precompute camera trig
    float cy = cos(yaw),  sy = sin(yaw);
    float cp = cos(pitch), sp = sin(pitch);

    // ── Integrate all particles, find closest line segment ──
    float d = 1e6;
    float bestSpeed = 0.0;
    float dt = 0.01 * SPEED;

    for (int pid = 0; pid < NUM_PARTICLES; pid++) {
        vec3 pos = texelFetch(iChannel0, ivec2(pid, 0), 0).xyz;

        for (float i = 0.0; i < STEPS; i++) {
            vec3 next = integrate(pos, dt);

            vec2 a = project(pos,  cy, sy, cp, sp) * VIEW_SCALE;
            vec2 b = project(next, cy, sy, cp, sp) * VIEW_SCALE;

            float segD = dfLine(a, b, uv);
            if (segD < d) {
                d = segD;
                bestSpeed = length(next - pos) / dt;
            }

            pos = next;
        }
    }

    // ── Line intensity ──
    float c = (INTENSITY / SPEED) * smoothstep(FOCUS / iResolution.y, 0.0, d);
    c += (INTENSITY / 8.5) * exp(-1000.0 * d * d);

    // ── Blink ──
    float blinkSeed = floor(iTime * BLINK_FREQ);
    float blink = hash(blinkSeed) < 0.25
        ? sin(fract(iTime * BLINK_FREQ) * 3.14159) : 0.0;

    // ── Color: green (fast) → cyan (slow) ──
    float speedNorm = clamp(bestSpeed / MAX_SPEED, 0.0, 1.0);
    float hue = mod(MAX_HUE - speedNorm * (MAX_HUE - MIN_HUE) + iTime * HUE_SHIFT_SPEED, 360.0);
    float sat = min(1.0, SATURATION * (1.0 + blink * (BLINK_SAT_BOOST - 1.0)));
    float lit = min(1.0, LIGHTNESS * (1.0 + blink * (BLINK_LIT_BOOST - 1.0)));
    vec3 lineColor = hsl2rgb(hue, sat, lit);
    c *= 1.0 + blink * (BLINK_INTENSITY - 1.0);

    // ── State persistence (row 0) ──
    if (py == 0 && px < NUM_PARTICLES) {
        // Particle state pixels — integrate forward
        if (iFrame == 0) {
            // Seed half the particles into each scroll lobe (x ≈ ±1.5)
            float sign = (px < NUM_PARTICLES / 2) ? 1.0 : -1.0;
            float angle = float(px) * 6.28318 / float(NUM_PARTICLES);
            float r = 0.1;
            fragColor = vec4(sign * 1.5 + r * cos(angle), r * sin(angle), r * sin(angle * 0.7 + 1.0), 0);
        } else {
            vec3 pos = texelFetch(iChannel0, ivec2(px, 0), 0).xyz;
            for (float i = 0.0; i < STEPS; i++) {
                pos = integrate(pos, dt);
            }
            // Respawn into alternating lobes if escaped or by random chance
            float rng = hash(float(px) * 13.7 + iTime * 60.0);
            if (length(pos) > 12.0 || rng < RESPAWN_CHANCE) {
                float angle = hash(float(px) + iTime) * 6.28318;
                float sign = hash(float(px) * 7.3 + iTime * 31.0) < 0.5 ? 1.0 : -1.0;
                float r = 0.1;
                pos = vec3(sign * 1.5 + r * cos(angle), r * sin(angle), r * sin(angle * 0.7));
            }
            fragColor = vec4(pos, 0);
        }
    } else if (py == 0 && px == CAM_PIXEL) {
        // Camera state pixel — persist yaw & pitch as [0,1]
        fragColor = vec4(mod(yaw, 6.28318) / 6.28318, pitch / 3.14159 + 0.5, 0, 0);
    } else {
        // Visual pixels — accumulate with fade; fast clear while dragging
        float fade = iMouse.z > 0.0 ? 0.85 : FADE;
        vec3 prev = texelFetch(iChannel0, ivec2(fragCoord), 0).rgb;
        fragColor = vec4(lineColor * c + prev * fade, 0);
    }
}
