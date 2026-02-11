#define PARTICLES 8
#define STEPS 90.0
#define VIEW_SCALE 0.045
#define SPEED 0.8
#define INTENSITY 0.15
#define FADE 0.993
#define FOCUS 1.0

// 3D view rotation defaults (radians)
#define DEFAULT_ROT_X 1.0    // tilt forward to see z-spike
#define DEFAULT_ROT_Y 0.2    // slight side rotation
#define MOUSE_SENSITIVITY 3.0

// Attractor 3D center
vec3 center3d = vec3(0.0, -3.0, 5.0);

// Color settings — yellow-orange to purple palette
#define MIN_HUE 40.0
#define MAX_HUE 280.0
#define MAX_SPEED 20.0
#define HUE_SHIFT_SPEED 10.0
#define SATURATION 0.85
#define LIGHTNESS 0.55

// Blink settings
#define BLINK_FREQ 8.0
#define BLINK_INTENSITY 1.8
#define BLINK_SAT_BOOST 1.3
#define BLINK_LIT_BOOST 1.4

// Rössler parameters
#define PA 0.2
#define PB 0.2
#define PC 5.7

float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

vec3 integrateV(vec3 cur, float dt, float pv) {
    float a = PA * (1.0 + pv);
    float b = PB * (1.0 + pv);
    float c = PC * (1.0 + pv);
    return cur + vec3(
        -cur.y - cur.z,
        cur.x + a * cur.y,
        b + cur.z * (cur.x - c)
    ) * dt;
}

mat3 rotX(float a) {
    float c = cos(a), s = sin(a);
    return mat3(1,0,0, 0,c,-s, 0,s,c);
}

mat3 rotY(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c,0,s, 0,1,0, -s,0,c);
}

vec2 project(vec3 p, mat3 viewRot) {
    return (viewRot * (p - center3d)).xy * VIEW_SCALE;
}

float dfLine(vec2 a, vec2 b, vec2 p) {
    vec2 ab = b - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    return distance(a + ab * t, p);
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

    // Persistent rotation: accumulate drag offsets in state pixel (PARTICLES, 0)
    vec4 rotState = texelFetch(iChannel0, ivec2(PARTICLES, 0), 0);
    float offsetRx = rotState.x;
    float offsetRy = rotState.y;
    vec2 lastMouse = rotState.zw;

    bool pressed = iMouse.z > 0.0;
    bool wasTracking = lastMouse.x >= 0.0;

    // Accumulate rotation delta while dragging
    if (pressed && wasTracking) {
        vec2 delta = iMouse.xy - lastMouse;
        offsetRx -= delta.y / iResolution.y * MOUSE_SENSITIVITY;
        offsetRy -= delta.x / iResolution.x * MOUSE_SENSITIVITY;
    }

    float rx = DEFAULT_ROT_X + offsetRx;
    float ry = DEFAULT_ROT_Y + offsetRy;
    mat3 viewRot = rotY(ry) * rotX(rx);

    // Detect actual mouse movement for instant fade
    bool rotating = pressed && wasTracking && length(iMouse.xy - lastMouse) > 1.0;

    float d = 1e6;
    float bestSpeed = 0.0;
    float bestAlpha = 1.0;
    vec3 finalPos[8];

    for (int p = 0; p < PARTICLES; p++) {
        vec3 last = texelFetch(iChannel0, ivec2(p, 0), 0).xyz;
        vec3 next;

        // ±5% parameter variation per particle for orbit separation
        float pv = (hash(float(p) * 7.13) - 0.5) * 0.10;

        // Per-particle intensity: each oscillates at its own frequency/phase
        float pFreq = 0.3 + hash(float(p) * 3.71) * 0.7;
        float pPhase = hash(float(p) * 11.3) * 6.2832;
        float pAlpha = 0.3 + 0.7 * max(0.0, sin(iTime * pFreq + pPhase));

        for (float i = 0.0; i < STEPS; i++) {
            next = integrateV(last, 0.016 * SPEED, pv);

            float segD = dfLine(project(last, viewRot), project(next, viewRot), uv);
            if (segD < d) {
                d = segD;
                bestAlpha = pAlpha;
                bestSpeed = length(vec3(
                    -next.y - next.z,
                    next.x + PA * next.y,
                    PB + next.z * (next.x - PC)
                ));
            }

            last = next;
        }
        finalPos[p] = next;
    }

    float c = bestAlpha * (INTENSITY / SPEED) * smoothstep(FOCUS / iResolution.y, 0.0, d);
    c += bestAlpha * (INTENSITY / 8.5) * exp(-1000.0 * d * d);

    // Blink
    float blinkSeed = floor(iTime * BLINK_FREQ);
    float blink = hash(blinkSeed) < 0.3
        ? sin(fract(iTime * BLINK_FREQ) * 3.14159) : 0.0;

    // Velocity-based color with hue shift + blink
    float speedNorm = clamp(bestSpeed / MAX_SPEED, 0.0, 1.0);
    float hue = mod(MAX_HUE - speedNorm * (MAX_HUE - MIN_HUE) + iTime * HUE_SHIFT_SPEED, 360.0);
    float sat = min(1.0, SATURATION * (1.0 + blink * (BLINK_SAT_BOOST - 1.0)));
    float lit = min(1.0, LIGHTNESS * (1.0 + blink * (BLINK_LIT_BOOST - 1.0)));
    vec3 lineColor = hsl2rgb(hue, sat, lit);
    c *= 1.0 + blink * (BLINK_INTENSITY - 1.0);

    // State pixels store particle positions
    int px = int(floor(fragCoord.x));
    int py = int(floor(fragCoord.y));
    if (py == 0 && px == PARTICLES) {
        // Store rotation offsets + mouse position for next frame
        // lastMouse = -1 sentinel means "not tracking" (mouse released)
        vec2 storeMouse = pressed ? iMouse.xy : vec2(-1.0);
        fragColor = vec4(offsetRx, offsetRy, storeMouse);
    } else if (py == 0 && px < PARTICLES) {
        // Staggered respawn: one particle resets every RESPAWN_STAGGER frames
        // so particles are always at different phases of the orbit
        int respawnInterval = 180;  // full cycle in frames
        int stagger = respawnInterval / PARTICLES;  // 45 frames between respawns
        float phase = mod(float(iFrame - px * stagger), float(respawnInterval));
        bool shouldRespawn = iFrame == 0 || (iFrame > 0 && phase < 1.0);

        if (shouldRespawn) {
            // Random start position near the attractor
            float seed = float(iFrame) + float(px) * 37.0;
            vec3 pos = vec3(
                (hash(seed) - 0.5) * 10.0,
                (hash(seed * 1.31) - 0.5) * 10.0,
                hash(seed * 2.17) * 0.2
            );
            fragColor = vec4(pos, 0);
        } else {
            fragColor = vec4(finalPos[px], 0);
        }
    } else {
        vec3 prev = texelFetch(iChannel0, ivec2(fragCoord), 0).rgb;
        float fade = rotating ? 0.0 : FADE;
        vec3 newCol = lineColor * c + prev * fade;
        fragColor = vec4(min(newCol, 1.5), 0);  // cap prevents white blowout
    }
}
