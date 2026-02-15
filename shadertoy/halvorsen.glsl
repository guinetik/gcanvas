// Halvorsen Attractor — Shadertoy
// A symmetric chaotic attractor with three-fold rotational symmetry.
// Ported from gcanvas attractor-3d-demo / halvorsen.js
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
#define STEPS 10.0
#define VIEW_SCALE 0.05
#define SPEED 0.55
#define INTENSITY 0.1
#define FADE 0.998
#define FOCUS 1.2
#define RESPAWN_CHANCE 0.008  // per-particle per-frame chance to reset to origin

// Halvorsen parameter
#define A 1.89

// Color settings — pink-to-blue palette
#define MIN_HUE 320.0    // Pink (fast)
#define MAX_HUE 220.0    // Blue (slow)
#define MAX_SPEED 40.0
#define HUE_SHIFT_SPEED 15.0
#define SATURATION 0.80
#define LIGHTNESS 0.55

// Blink settings
#define BLINK_FREQ 7.0
#define BLINK_INTENSITY 1.5
#define BLINK_SAT_BOOST 1.2
#define BLINK_LIT_BOOST 1.3

// State layout: row 0 pixels
//   [0..NUM_PARTICLES-1] = particle positions
//   [NUM_PARTICLES]       = camera state (yaw, pitch)
#define CAM_PIXEL NUM_PARTICLES

vec3 integrate(vec3 cur, float dt) {
    return cur + vec3(
        -A * cur.x - 4.0 * cur.y - 4.0 * cur.z - cur.y * cur.y,
        -A * cur.y - 4.0 * cur.z - 4.0 * cur.x - cur.z * cur.z,
        -A * cur.z - 4.0 * cur.x - 4.0 * cur.y - cur.x * cur.x
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
        yaw = 0.615;
        pitch = 0.495;
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
    float dt = 0.008 * SPEED;

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

    // ── Color: pink (fast) → blue (slow) ──
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
            // Spread particles around the origin
            float angle = float(px) * 6.28318 / float(NUM_PARTICLES);
            float r = 0.5;
            fragColor = vec4(r * cos(angle), r * sin(angle), r * sin(angle * 0.7 + 1.0), 0);
        } else {
            vec3 pos = texelFetch(iChannel0, ivec2(px, 0), 0).xyz;
            for (float i = 0.0; i < STEPS; i++) {
                pos = integrate(pos, dt);
            }
            // Respawn to origin if escaped or by random chance
            float rng = hash(float(px) * 13.7 + iTime * 60.0);
            if (length(pos) > 20.0 || rng < RESPAWN_CHANCE) {
                float angle = hash(float(px) + iTime) * 6.28318;
                float r = 0.5;
                pos = vec3(r * cos(angle), r * sin(angle), r * sin(angle * 0.7 + 1.0));
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
