void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec3 col = texture(iChannel0, uv).rgb;
    col = 1.0 - exp(-col * 2.5);
    float vig = 1.0 - 0.3 * length(uv - 0.5);
    col *= vig;
    fragColor = vec4(col, 1.0);
}

// Buffer A feeds into iChannel0

#define STEPS 96.0
#define VIEW_SCALE 0.025
#define SPEED 0.55
#define INTENSITY 0.18
#define FADE 0.985
#define FOCUS 2.0
#define MODE xz
#define CENTER vec2(0.0, 27.0)  // attractor center in xz space

// Color settings
#define MIN_HUE 30.0
#define MAX_HUE 200.0
#define MAX_SPEED 50.0
#define HUE_SHIFT_SPEED 15.0
#define SATURATION 0.85
#define LIGHTNESS 0.55

// Blink settings
#define BLINK_FREQ 8.0
#define BLINK_INTENSITY 1.8
#define BLINK_SAT_BOOST 1.3
#define BLINK_LIT_BOOST 1.4

// Lorenz parameters
float sigma = 10.0;
float rho   = 28.0;
float beta  = 8.0 / 3.0;

vec3 start = vec3(0.1, 0.001, 0.0);

vec3 integrate(vec3 cur, float dt) {
    return cur + vec3(
        sigma * (cur.y - cur.x),
        cur.x * (rho - cur.z) - cur.y,
        cur.x * cur.y - beta * cur.z
    ) * dt;
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

    float d = 1e6;
    float bestSpeed = 0.0;

    vec3 last = texelFetch(iChannel0, ivec2(0, 0), 0).xyz;
    vec3 next;

    for (float i = 0.0; i < STEPS; i++) {
        next = integrate(last, 0.016 * SPEED);

        float segD = dfLine((last.MODE - CENTER) * VIEW_SCALE, (next.MODE - CENTER) * VIEW_SCALE, uv);
        if (segD < d) {
            d = segD;
            bestSpeed = length(vec3(
                sigma * (next.y - next.x),
                next.x * (rho - next.z) - next.y,
                next.x * next.y - beta * next.z
            ));
        }

        last = next;
    }

    float c = (INTENSITY / SPEED) * smoothstep(FOCUS / iResolution.y, 0.0, d);
    c += (INTENSITY / 8.5) * exp(-1000.0 * d * d);

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

    if (floor(fragCoord) == vec2(0, 0)) {
        fragColor = (iFrame == 0) ? vec4(start, 0) : vec4(next, 0);
    } else {
        vec3 prev = texelFetch(iChannel0, ivec2(fragCoord), 0).rgb;
        fragColor = vec4(lineColor * c + prev * FADE, 0);
    }
}
