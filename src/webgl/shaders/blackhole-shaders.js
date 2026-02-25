/**
 * Black hole raymarching shader sources for WebGLBlackholeRenderer.
 *
 * Vertex shader: passthrough fullscreen quad.
 * Fragment shader: raytraced black hole with Newtonian gravitational lensing,
 * a procedural FBM-textured accretion disk, Doppler shifting, photon ring,
 * and gravitational glow. Outputs premultiplied alpha for compositing onto
 * the 2D canvas.
 *
 * Adapted from a Shadertoy black hole raytracer.
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
precision mediump float;

varying vec2 vUV;
uniform vec2 uResolution;
uniform float uTime;
uniform float uTiltX;
uniform float uRotY;

#define PI 3.1415927

#define CAMERA_DIST 2.0
#define CAMERA_ANGLE_V (PI * 0.48)
#define FOV_FACTOR 1.5

#define EVENT_HORIZON_RADIUS 0.1
#define GRAVITY_STRENGTH 0.005
#define CAPTURE_THRESHOLD 0.001

#define MAX_STEPS 150
#define STEP_SIZE 0.02
#define ADAPTIVE_NEAR 0.8
#define ADAPTIVE_FAR 1.5
#define ADAPTIVE_INNER 0.2
#define ADAPTIVE_OUTER 1.5

#define DISK_TORUS_MAJOR 1.0
#define DISK_TORUS_MINOR 1.2
#define DISK_FLATTEN 40.0
#define DISK_ROTATION_SPEED 0.6
#define DISK_INTENSITY 0.5
#define DISK_FALLOFF 100.0
#define DOPPLER_STRENGTH 0.7
#define FBM_OCTAVES 4

#define OUTER_DISK_COLOR vec3(0.5, 0.12, 0.02)
#define MID_DISK_COLOR vec3(1.0, 0.55, 0.12)
#define INNER_DISK_COLOR vec3(1.0, 0.85, 0.6)

#define GLOW_COLOR vec3(0.8, 0.5, 0.2)
#define GLOW_INTENSITY 0.00006

#define PHOTON_SPHERE_RADIUS 0.15
#define PHOTON_RING_WIDTH 0.02
#define PHOTON_RING_COLOR vec3(0.9, 0.7, 0.4)
#define PHOTON_RING_INTENSITY 0.0015

#define GAMMA vec3(0.45)

float sdfSphere(vec3 p, float radius) {
    return length(p) - radius;
}

float sdfTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmNoise(vec2 p) {
    float total = 0.0;
    float amplitude = 1.0;
    for (int i = 0; i < FBM_OCTAVES; i++) {
        total += amplitude * valueNoise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

void main() {
    vec2 fragCoord = vUV * uResolution;
    vec2 uv = fragCoord / uResolution.xy;
    vec2 screenPos = uv * 2.0 - 1.0;
    screenPos.x *= uResolution.x / uResolution.y;

    float cameraAngleH = PI * 0.5 + uRotY;
    float cameraAngleV = CAMERA_ANGLE_V + uTiltX * 0.3;

    vec3 cameraPos = vec3(
        CAMERA_DIST * cos(cameraAngleH) * sin(cameraAngleV),
        CAMERA_DIST * cos(cameraAngleV),
        CAMERA_DIST * sin(cameraAngleH) * sin(cameraAngleV)
    );

    vec3 forward = normalize(-cameraPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, -0.1), forward));
    vec3 up = normalize(cross(forward, right));

    vec3 rayDir = normalize(forward * FOV_FACTOR + right * screenPos.x + up * screenPos.y);

    vec3 rayPos = cameraPos;
    vec3 rayVel = rayDir;
    vec3 finalColor = vec3(0.0);
    float notCaptured = 1.0;

    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 toBH = -rayPos;
        float dist = length(toBH);
        float distSq = dist * dist;

        float adaptiveStep = STEP_SIZE * mix(ADAPTIVE_NEAR, ADAPTIVE_FAR,
                                              smoothstep(ADAPTIVE_INNER, ADAPTIVE_OUTER, dist));

        rayPos += rayVel * adaptiveStep * notCaptured;
        rayVel += normalize(toBH) * (GRAVITY_STRENGTH / distSq);

        float distToHorizon = dist - EVENT_HORIZON_RADIUS;
        notCaptured = smoothstep(0.0, 0.666, distToHorizon);

        if (notCaptured < CAPTURE_THRESHOLD) break;

        float diskRadius = length(toBH.xz);
        float diskAngle = atan(toBH.x, toBH.z);
        float rotAngle = diskAngle + uTime * DISK_ROTATION_SPEED;

        vec2 diskUV = vec2(diskRadius * 8.0, rotAngle * 5.0);
        float turbulence = fbmNoise(diskUV) * 0.5 + 0.5;
        turbulence *= fbmNoise(diskUV * 2.3 + 7.0) * 0.4 + 0.6;

        float doppler = 1.0 + cos(rotAngle) * DOPPLER_STRENGTH;

        float distFromBH = dist - EVENT_HORIZON_RADIUS;
        float t = clamp(pow(max(distFromBH, 0.0), 1.5), 0.0, 1.0);
        vec3 diskColor = mix(INNER_DISK_COLOR, MID_DISK_COLOR, smoothstep(0.0, 0.4, t));
        diskColor = mix(diskColor, OUTER_DISK_COLOR, smoothstep(0.3, 1.0, t));
        diskColor *= turbulence * doppler;
        diskColor *= DISK_INTENSITY / (0.001 + distFromBH * DISK_FALLOFF);

        vec3 flatPos = rayPos * vec3(1.0, DISK_FLATTEN, 1.0);
        float diskMask = smoothstep(0.0, 1.0, -sdfTorus(flatPos, vec2(DISK_TORUS_MAJOR, DISK_TORUS_MINOR)));

        finalColor += max(vec3(0.0), diskColor * diskMask * notCaptured);
        finalColor += GLOW_COLOR * (1.0 / distSq) * GLOW_INTENSITY * notCaptured;

        float ringDist = abs(dist - PHOTON_SPHERE_RADIUS);
        float ring = exp(-ringDist * ringDist / (PHOTON_RING_WIDTH * PHOTON_RING_WIDTH));
        finalColor += PHOTON_RING_COLOR * ring * PHOTON_RING_INTENSITY * notCaptured;
    }

    // Alpha: opaque for captured rays (black hole), proportional to light for disk/glow
    float alpha = min(1.0, length(finalColor) * 2.0 + (1.0 - notCaptured));
    finalColor = pow(max(finalColor, vec3(0.0)), GAMMA);
    gl_FragColor = vec4(finalColor * alpha, alpha);
}
`;
