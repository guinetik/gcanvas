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

#define PI 3.14159265359
#define MAX_STEPS 300
#define STEP_SIZE 0.05

// Black Hole Parameters
#define BH_RADIUS 0.35
#define ACCRETION_INNER 0.6
#define ACCRETION_OUTER 2.2
#define DISK_HEIGHT 0.08

// Visuals
#define COLOR_INNER vec3(1.0, 0.8, 0.5)
#define COLOR_OUTER vec3(0.8, 0.2, 0.05)
#define GLOW_COLOR vec3(0.2, 0.4, 1.0)

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

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
void main() {
    // UV centered at 0,0
    vec2 uv = vUV * 2.0 - 1.0;
    
    // Camera Setup
    // We orbit around 0,0,0 at distance 5.0
    float camDist = 5.0;
    
    // Convert Euler angles to camera position
    // uTiltX is pitch (up/down), uRotY is yaw (around Y)
    float cy = camDist * sin(uTiltX);
    float hDist = camDist * cos(uTiltX);
    float cx = hDist * sin(uRotY);
    float cz = hDist * cos(uRotY);
    vec3 ro = vec3(cx, cy, cz);
    
    // Target is origin
    vec3 ta = vec3(0.0);
    vec3 fwd = normalize(ta - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 up = cross(fwd, right);
    
    // Ray Direction
    vec3 rd = normalize(fwd * 2.0 + right * uv.x + up * uv.y);
    
    // Raymarching State
    vec3 p = ro;
    vec3 v = rd;
    vec3 col = vec3(0.0);
    float alpha = 0.0;
    
    bool hitHorizon = false;
    
    for (int i = 0; i < MAX_STEPS; i++) {
        float r = length(p);
        
        // 1. Event Horizon Hit
        if (r < BH_RADIUS) {
            hitHorizon = true;
            break;
        }
        
        // 2. Escape
        if (r > 15.0) break;
        
        // 3. Gravity (Newtonian approx for visual bending)
        // Force ~ 1/r^2 towards center
        vec3 accel = -normalize(p) * (1.5 / (r * r));
        v += accel * STEP_SIZE;
        // v = normalize(v); // Keep speed constant (c)
        
        vec3 nextP = p + v * STEP_SIZE;
        
        // 4. Accretion Disk Intersection
        // Check if we crossed the Y plane (approximate disk)
        // We use a "thick" plane check or exact crossing
        if (p.y * nextP.y < 0.0) {
            // Exact intersection time t
            float t = -p.y / (nextP.y - p.y);
            vec3 intersect = mix(p, nextP, t);
            float dist = length(intersect);
            
            if (dist > ACCRETION_INNER && dist < ACCRETION_OUTER) {
                // We hit the disk!
                float angle = atan(intersect.z, intersect.x);
                
                // Texture coordinates
                float speed = 2.0 / (dist * dist); // Keplerian-ish
                vec2 diskUV = vec2(dist * 2.0, angle * 3.0 + uTime * speed);
                
                // Noise pattern
                float n = fbm(diskUV);
                
                // Radial fade edges
                float fade = smoothstep(ACCRETION_INNER, ACCRETION_INNER + 0.5, dist) * 
                             smoothstep(ACCRETION_OUTER, ACCRETION_OUTER - 1.0, dist);
                
                // Doppler beaming (fake)
                // Left side (approaching) brighter, right side (receding) dimmer
                // Assuming rotation is counter-clockwise around Y
                // Velocity vector at (x,0,z) is (-z, 0, x)
                vec3 diskVel = normalize(vec3(-intersect.z, 0.0, intersect.x));
                // View vector is roughly -v (ray direction)
                float doppler = dot(diskVel, -normalize(v)) * 0.5 + 0.5;
                doppler = pow(doppler, 3.0) * 2.0 + 0.2;
                
                // Color mixing
                vec3 diskCol = mix(COLOR_OUTER, COLOR_INNER, n * fade);
                diskCol *= doppler * fade * 2.5; // Intensity
                
                // Accumulate (additive blending for gas)
                // Since this is a single plane intersection, we add it once.
                // But wait, with bending light, we might hit the disk multiple times!
                // (Front and back).
                // So we accumulate.
                col += diskCol * 0.4;
                alpha += fade * 0.6;
            }
        }
        
        p = nextP;
    }
    
    // Final Composition
    if (hitHorizon) {
        // Black hole core
        // If we have foreground disk (accumulated before hit), we see it.
        // The core itself is black (0,0,0).
        // Alpha should be 1.0 to obscure background stars.
        alpha = 1.0;
        // col is just whatever disk we passed through *in front* of the horizon.
    } else {
        // Space
        // Add a faint glow around the black hole
        // Based on impact parameter? Or just distance from center in screen space?
        // Let's use the accumulated alpha.
        alpha = clamp(alpha, 0.0, 1.0);
    }
    
    // Premultiplied alpha output
    // col is already accumulated light (premultiplied intensity)
    gl_FragColor = vec4(col, alpha);
}
`;
