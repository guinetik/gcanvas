/**
 * Black hole raymarching shader sources for WebGLBlackholeRenderer.
 *
 * Vertex shader: passthrough fullscreen quad.
 * Fragment shader: raytraced black hole with Newtonian gravitational lensing,
 * a procedural FBM-textured accretion disk, Doppler shifting, photon ring,
 * and gravitational glow. Outputs premultiplied alpha for compositing onto
 * the 2D canvas.
 */

export const BLACKHOLE_VERTEX = `
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUV;

void main() {
  vUV = aUV;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const BLACKHOLE_FRAGMENT = `
precision highp float;

varying vec2 vUV;
uniform vec2 uResolution;
uniform float uTime;
uniform float uTiltX;
uniform float uRotY;
uniform float uDiskOuterLimit;

#define PI 3.14159265359
#define MAX_STEPS 420
#define STEP_SIZE 0.02

// Black hole and disk profile.
#define BH_RADIUS 0.2
#define DISK_INNER 0.25
#define DISK_HALF_THICKNESS 0.013
#define GRAVITY_STRENGTH 0.12

// -----------------------------------------------------------------------------
// Noise
// -----------------------------------------------------------------------------
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
        total += noise(p) * amp;
        p *= 2.0;
        amp *= 0.5;
    }
    return total;
}

vec3 accretionColor(float dist, float diskOuter, float angle, vec3 rayDir) {
    float radial = clamp((dist - DISK_INNER) / max(diskOuter - DISK_INNER, 0.001), 0.0, 1.0);
    float orbitSpeed = 7.0 / (dist * dist + 0.04);
    vec2 flowUv = vec2(dist * 18.0, angle * 2.6 - uTime * orbitSpeed);
    float swirl = fbm(flowUv);
    float bands = 0.65 + 0.35 * sin(dist * 72.0 - uTime * 4.2 + swirl * 2.4);

    vec3 outerCol = vec3(0.95, 0.36, 0.10);
    vec3 innerCol = vec3(1.00, 0.90, 0.72);
    vec3 baseCol = mix(innerCol, outerCol, radial);

    vec3 tangent = normalize(vec3(-sin(angle), 0.0, cos(angle)));
    float approach = dot(tangent, -rayDir) * 0.5 + 0.5;
    float beaming = mix(0.55, 1.9, pow(approach, 2.2));
    vec3 shift = mix(vec3(1.0, 0.58, 0.30), vec3(0.72, 0.92, 1.15), approach);

    float edgeFalloff = 1.0 - smoothstep(0.78, 1.0, radial);
    float density = mix(0.45, 1.35, swirl) * bands * edgeFalloff;

    return baseCol * shift * beaming * density;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
void main() {
    vec2 uv = vUV * 2.0 - 1.0;
    uv.x *= uResolution.x / max(uResolution.y, 1.0);

    float diskOuter = clamp(uDiskOuterLimit, 0.285, 0.53);
    float camDist = 4.8;

    float cy = camDist * sin(uTiltX);
    float hDist = camDist * cos(uTiltX);
    float cx = hDist * sin(uRotY);
    float cz = hDist * cos(uRotY);
    vec3 ro = vec3(cx, cy, cz);

    vec3 ta = vec3(0.0);
    vec3 fwd = normalize(ta - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);

    vec3 rd = normalize(fwd * 2.3 + right * uv.x + up * uv.y);

    vec3 p = ro;
    vec3 v = rd;
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    float transmittance = 1.0;
    int diskHits = 0;
    bool hitHorizon = false;

    for (int i = 0; i < MAX_STEPS; i++) {
        float r = length(p);

        if (r < BH_RADIUS) {
            hitHorizon = true;
            break;
        }

        if (r > 10.0 || transmittance < 0.02 || diskHits > 3) break;

        vec3 accel = -p * (GRAVITY_STRENGTH / max(r * r * r, 0.02));
        v = normalize(v + accel * STEP_SIZE);
        vec3 nextP = p + v * STEP_SIZE;

        if (p.y * nextP.y <= 0.0 || abs(p.y) < DISK_HALF_THICKNESS || abs(nextP.y) < DISK_HALF_THICKNESS) {
            float denom = nextP.y - p.y;
            float t = abs(denom) > 0.00001 ? (-p.y / denom) : 0.5;
            t = clamp(t, 0.0, 1.0);
            vec3 hitPos = mix(p, nextP, t);
            float diskRadius = length(hitPos);

            if (diskRadius > DISK_INNER && diskRadius < diskOuter) {
                float angle = atan(hitPos.z, hitPos.x);
                vec3 diskCol = accretionColor(diskRadius, diskOuter, angle, v);
                float edgeMask = smoothstep(DISK_INNER, DISK_INNER + 0.015, diskRadius) *
                                 (1.0 - smoothstep(diskOuter - 0.03, diskOuter, diskRadius));

                col += diskCol * edgeMask * transmittance * 0.25;
                alpha += edgeMask * transmittance * 0.28;
                transmittance *= 0.72;
                diskHits++;
            }
        }

        p = nextP;
    }

    // Apparent lensing ring.
    float impact = length(cross(ro, rd));
    float photonCenter = BH_RADIUS * 2.45;
    float photonWidth = BH_RADIUS * 0.9;
    float photonRing = exp(-pow((impact - photonCenter) / max(photonWidth, 0.001), 2.0));
    photonRing *= 1.0 - float(hitHorizon);

    vec3 ringCol = mix(vec3(0.92, 0.66, 0.38), vec3(0.72, 0.8, 0.88), 0.35);
    col += ringCol * photonRing * 0.4;
    alpha += photonRing * 0.2;

    // Subtle gravitational halo: thinner and dimmer to avoid a washed cream ring.
    float screenR = length(uv);
    float halo = smoothstep(0.88, 0.56, screenR) * exp(-impact * 8.2);
    col += vec3(0.52, 0.4, 0.28) * halo * 0.05;
    alpha += halo * 0.03;

    // Shadow core.
    float shadowMask = smoothstep(BH_RADIUS * 2.0, BH_RADIUS * 0.95, impact);
    if (hitHorizon) {
        alpha = max(alpha, shadowMask);
    }
    col *= (1.0 - shadowMask);

    // Thick warm rim just outside the shadow for a stronger orange outline.
    float warmRim = smoothstep(BH_RADIUS * 1.0, BH_RADIUS * 1.3, impact) *
                    (1.0 - smoothstep(BH_RADIUS * 1.7, BH_RADIUS * 2.2, impact));
    col += vec3(1.0, 0.55, 0.2) * warmRim * 0.55;
    alpha += warmRim * 0.22;

    float edgeFade = smoothstep(1.2, 0.82, screenR);
    col *= edgeFade;
    alpha *= edgeFade;

    col = clamp(col, 0.0, 1.2);
    alpha = clamp(alpha, 0.0, 1.0);

    if (alpha < 0.001) {
        gl_FragColor = vec4(0.0);
    } else {
        gl_FragColor = vec4(col, alpha);
    }
}
`;
