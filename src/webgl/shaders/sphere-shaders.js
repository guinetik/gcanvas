/**
 * Sphere Shaders for WebGL Rendering
 *
 * These shaders render a sphere using ray-sphere intersection on a 2D quad.
 * This approach (sometimes called "impostor" or "billboard" spheres) is very
 * efficient as it only requires 2 triangles regardless of sphere detail.
 *
 * The fragment shader does the heavy lifting:
 * 1. Ray-sphere intersection to determine if we hit the sphere
 * 2. Normal calculation for lighting
 * 3. UV calculation for texture/procedural patterns
 * 4. Various procedural effects (noise, gradients, etc.)
 */

// =============================================================================
// VERTEX SHADER
// =============================================================================

/**
 * Standard vertex shader for sphere impostor rendering
 * Simply passes through position and UV coordinates
 */
export const SPHERE_VERTEX = `
precision highp float;

attribute vec2 aPosition;
attribute vec2 aUv;

varying vec2 vUv;

void main() {
    vUv = aUv;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// =============================================================================
// COMMON SHADER FUNCTIONS
// =============================================================================

/**
 * Common functions included in all fragment shaders
 * - Noise functions
 * - Ray-sphere intersection
 * - Lighting calculations
 */
export const SPHERE_COMMON = `
precision highp float;

varying vec2 vUv;

// Uniforms common to all sphere shaders
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uCameraRotation;  // rotationX, rotationY, rotationZ

// =============================================================================
// NOISE FUNCTIONS
// =============================================================================

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

// 3D Value noise
float noise3D(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);

    float n = dot(i, vec3(1.0, 57.0, 113.0));

    return mix(
        mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
        mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z
    );
}

// FBM (Fractional Brownian Motion)
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * noise3D(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

// =============================================================================
// RAY-SPHERE INTERSECTION
// =============================================================================

/**
 * Ray-sphere intersection
 * @param rayOrigin - Ray origin (camera position)
 * @param rayDir - Normalized ray direction
 * @param sphereCenter - Sphere center
 * @param sphereRadius - Sphere radius
 * @return t value for intersection, -1.0 if no hit
 */
float raySphereIntersect(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float sphereRadius) {
    vec3 oc = rayOrigin - sphereCenter;
    float a = dot(rayDir, rayDir);
    float b = 2.0 * dot(oc, rayDir);
    float c = dot(oc, oc) - sphereRadius * sphereRadius;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        return -1.0;
    }

    return (-b - sqrt(discriminant)) / (2.0 * a);
}

// =============================================================================
// CAMERA AND ROTATION
// =============================================================================

/**
 * Create rotation matrix from Euler angles
 */
mat3 rotationMatrix(vec3 rotation) {
    float cx = cos(rotation.x);
    float sx = sin(rotation.x);
    float cy = cos(rotation.y);
    float sy = sin(rotation.y);
    float cz = cos(rotation.z);
    float sz = sin(rotation.z);

    mat3 rx = mat3(
        1.0, 0.0, 0.0,
        0.0, cx, -sx,
        0.0, sx, cx
    );

    mat3 ry = mat3(
        cy, 0.0, sy,
        0.0, 1.0, 0.0,
        -sy, 0.0, cy
    );

    mat3 rz = mat3(
        cz, -sz, 0.0,
        sz, cz, 0.0,
        0.0, 0.0, 1.0
    );

    return rz * ry * rx;
}

/**
 * Calculate ray direction from UV coordinates
 * Uses a simple pinhole camera model
 */
vec3 getRayDirection(vec2 uv) {
    // Convert UV to normalized device coordinates (-1 to 1)
    vec2 ndc = uv * 2.0 - 1.0;
    // Field of view ~53 degrees (atan(0.5) * 2)
    return normalize(vec3(ndc * 0.5, 1.0));
}

// =============================================================================
// LIGHTING
// =============================================================================

/**
 * Simple diffuse + ambient lighting
 */
float lighting(vec3 normal, vec3 lightDir, float ambient) {
    float diffuse = max(0.0, dot(normal, lightDir));
    return ambient + (1.0 - ambient) * diffuse;
}

/**
 * Fresnel effect for rim lighting
 */
float fresnel(vec3 normal, vec3 viewDir, float power) {
    return pow(1.0 - abs(dot(normal, viewDir)), power);
}
`;

// =============================================================================
// STAR SHADER
// =============================================================================

/**
 * Star surface shader with plasma/fire effects, corona, and self-rotation
 * Features:
 * - Boiling plasma surface with spherical UV distortion
 * - Multi-layer corona with flame structures
 * - Hot bubbles that appear and pop
 * - Self-rotation around axis
 * - Temperature-based 4-tier color system
 * - Limb darkening and organic rim glow
 */
export const STAR_FRAGMENT = `
${SPHERE_COMMON}

uniform vec3 uStarColor;
uniform float uTemperature;      // Kelvin, affects color
uniform float uActivityLevel;    // 0-1, affects turbulence
uniform float uRotationSpeed;    // Self-rotation speed (radians/second)

// =============================================================================
// PLASMA NOISE with flowing distortion
// =============================================================================

float plasmaNoise(vec3 p, float time) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float totalAmp = 0.0;

    for (int i = 0; i < 5; i++) {
        vec3 offset = vec3(
            sin(time * 0.1 + float(i)) * 0.5,
            cos(time * 0.15 + float(i) * 0.7) * 0.5,
            time * 0.05
        );
        value += amplitude * noise3D((p + offset) * frequency);
        totalAmp += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    return value / totalAmp;
}

// =============================================================================
// HOT BUBBLES - bright spots that appear and pop
// =============================================================================

float hotBubbles(vec3 p, float time) {
    // Large slow bubbles
    vec3 p1 = p * 5.0 + vec3(0.0, time * 0.06, 0.0);
    float b1 = noise3D(p1);
    b1 = smoothstep(0.3, 0.6, b1);

    // Medium bubbles, faster
    vec3 p2 = p * 9.0 + vec3(time * 0.04, time * 0.08, 0.0);
    float b2 = noise3D(p2);
    b2 = smoothstep(0.35, 0.65, b2);

    // Small rapid bubbles
    vec3 p3 = p * 16.0 + vec3(time * 0.1, 0.0, time * 0.12);
    float b3 = noise3D(p3);
    b3 = smoothstep(0.4, 0.7, b3);

    float bubbles = b1 * 0.5 + b2 * 0.35 + b3 * 0.15;
    float pulse = sin(time * 2.0 + p.x * 10.0) * 0.3 + 0.7;

    return bubbles * pulse;
}

// =============================================================================
// BOILING TURBULENCE - fast chaotic movement
// =============================================================================

float boilingTurbulence(vec3 p, float time) {
    float turb = 0.0;
    float amp = 1.0;
    float freq = 4.0;

    for (int i = 0; i < 4; i++) {
        vec3 offset = vec3(
            sin(time * 0.3 + float(i) * 1.7) * 0.5,
            cos(time * 0.25 + float(i) * 2.3) * 0.5,
            time * 0.15 * (1.0 + float(i) * 0.3)
        );
        turb += amp * abs(noise3D(p * freq + offset));
        amp *= 0.5;
        freq *= 2.1;
    }
    return turb;
}

// =============================================================================
// CORONA FLAMES - structures around the edge
// =============================================================================

float coronaFlames(float angle, float rimFactor, float time, float activity) {
    // Multiple flame frequencies
    float flames = 0.0;

    // Large slow flames
    float f1 = sin(angle * 5.0 + time * 0.5) * 0.5 + 0.5;
    f1 *= noise3D(vec3(angle * 2.0, time * 0.3, 0.0));

    // Medium flames
    float f2 = sin(angle * 12.0 + time * 0.8) * 0.5 + 0.5;
    f2 *= noise3D(vec3(angle * 4.0, time * 0.5, 5.0));

    // Small rapid flames
    float f3 = sin(angle * 25.0 + time * 1.5) * 0.5 + 0.5;
    f3 *= noise3D(vec3(angle * 8.0, time * 0.8, 10.0));

    flames = f1 * 0.5 + f2 * 0.3 + f3 * 0.2;

    // Flames only visible at rim
    flames *= pow(rimFactor, 1.5);
    flames *= 0.5 + activity * 0.5;

    return flames;
}

// =============================================================================
// SELF ROTATION - rotate normal around Y axis
// =============================================================================

vec3 rotateY(vec3 v, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

void main() {
    // === CIRCULAR MASK - prevents square canvas artifacts ===
    // UV goes 0-1, so center goes -0.5 to 0.5
    // Corner distance = sqrt(0.5² + 0.5²) = 0.707
    // We multiply by 2 so sphere surface is at dist=1.0
    vec2 center = vUv - 0.5;
    float distFromCenter = length(center) * 2.0;  // 0 at center, ~1.414 at corners

    // Hard circular cutoff - corners are at ~1.414, cut off at 1.35
    if (distFromCenter > 1.35) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // Circular fade for smooth edges (fade from 1.15 to 1.35)
    float circularMask = 1.0 - smoothstep(1.15, 1.35, distFromCenter);

    // Setup ray - camera looking at sphere from fixed position
    vec3 rayOrigin = vec3(0.0, 0.0, -2.5);
    vec3 rayDir = getRayDirection(vUv);

    float time = uTime;

    // Self-rotation angle
    float selfRotation = time * uRotationSpeed;

    // Ray-sphere intersection for CORONA (larger radius for glow)
    float coronaRadius = 0.65;  // Corona extends beyond surface
    float tCorona = raySphereIntersect(rayOrigin, rayDir, vec3(0.0), coronaRadius);

    // Ray-sphere intersection for SURFACE (sphere at origin with radius 0.5)
    float t = raySphereIntersect(rayOrigin, rayDir, vec3(0.0), 0.5);

    // === CORONA / OUTER GLOW ===
    if (t < 0.0) {
        float dist = distFromCenter;
        float angle = atan(center.y, center.x);

        // Fade glow toward edges (within circular mask bounds)
        float edgeFade = 1.0 - smoothstep(1.1, 1.3, dist);
        if (edgeFade <= 0.0) {
            gl_FragColor = vec4(0.0);
            return;
        }

        // Distance from sphere edge (0 at edge, increases outward)
        float rimFactor = smoothstep(1.0, 1.2, dist);

        // Base glow - tight falloff, only visible very close to sphere
        float glow = exp(-(dist - 1.0) * (dist - 1.0) * 20.0) * 0.4;
        glow *= smoothstep(1.4, 1.0, dist);  // Tight fade

        // Corona flames at the edge
        float flames = coronaFlames(angle + selfRotation, rimFactor, time, uActivityLevel);

        // Turbulent corona edges
        float coronaTurb = noise3D(vec3(angle * 3.0 + selfRotation, dist * 2.0, time * 0.3));
        coronaTurb = coronaTurb * 0.5 + 0.5;

        // Corona intensity peaks just outside the sphere
        float coronaIntensity = smoothstep(1.0, 1.05, dist) * smoothstep(1.5, 1.1, dist);
        coronaIntensity *= (0.6 + coronaTurb * 0.4 + flames * 0.8);
        coronaIntensity *= 0.5 + uActivityLevel * 0.5;

        // Combined outer effect
        float totalGlow = glow + coronaIntensity * 0.6;
        totalGlow *= edgeFade;  // Apply edge fade to prevent box

        // Corona color - warmer/redder than surface
        vec3 coronaColor = uStarColor * vec3(1.3, 1.0, 0.7);
        vec3 glowColor = mix(uStarColor, coronaColor, coronaIntensity);

        // For proper glow: use premultiplied alpha approach
        // Only show glow where it's actually bright enough to see
        float brightness = max(max(glowColor.r, glowColor.g), glowColor.b) * totalGlow;
        float alpha = smoothstep(0.01, 0.15, brightness) * totalGlow;

        // Threshold very low values to pure transparent
        if (alpha < 0.02) {
            gl_FragColor = vec4(0.0);
            return;
        }

        glowColor *= totalGlow;
        // Apply circular mask and output premultiplied alpha
        alpha *= circularMask;
        gl_FragColor = vec4(glowColor * alpha, alpha);
        return;
    }

    // === SURFACE RENDERING ===
    vec3 hitPoint = rayOrigin + rayDir * t;
    vec3 normal = normalize(hitPoint);

    // Apply inverse camera rotation to the normal (camera orbit)
    mat3 camRotMat = rotationMatrix(-uCameraRotation);
    vec3 rotatedNormal = camRotMat * normal;

    // Apply self-rotation to surface features
    rotatedNormal = rotateY(rotatedNormal, selfRotation);

    // === SPHERICAL DISTORTION for boiling effect ===
    vec2 sp = normal.xy;
    float r = dot(sp, sp);

    float brightness = 0.15 + (uTemperature / 10000.0) * 0.1;
    float distortStrength = 2.0 - brightness;

    vec2 warpedUV;
    if (r < 0.0001) {
        // At pole - use alternative coords
        float poleAngle = atan(rotatedNormal.y, rotatedNormal.x) + time * 0.15;
        float poleElev = acos(clamp(rotatedNormal.z, -1.0, 1.0));
        warpedUV = vec2(cos(poleAngle), sin(poleAngle)) * (poleElev / 3.14159) * distortStrength;
    } else {
        sp *= distortStrength;
        r = dot(sp, sp);
        float f = (1.0 - sqrt(abs(1.0 - r))) / (r + 0.001) + brightness * 0.5;
        warpedUV = sp * f + vec2(time * 0.05, 0.0);
    }

    // === PLASMA TEXTURE ===
    vec3 plasmaCoord = vec3(warpedUV * 3.0, time * 0.12);
    float plasma1 = plasmaNoise(plasmaCoord, time);
    float plasma2 = plasmaNoise(plasmaCoord * 1.3 + vec3(50.0), time * 1.2);
    float plasma = plasma1 * 0.6 + plasma2 * 0.4;
    plasma = plasma * 0.5 + 0.5;

    // === VIEW GEOMETRY ===
    float viewAngle = dot(normal, -rayDir);
    float edgeDist = 1.0 - viewAngle;
    float limbDarkening = pow(max(0.0, viewAngle), 0.4);

    // === MULTI-LAYER EFFECTS ===
    float turbIntensity = boilingTurbulence(rotatedNormal, time) * 0.5;
    float bubbles = hotBubbles(rotatedNormal, time);

    // Granulation (convection cells)
    float gran = noise3D(rotatedNormal * 20.0 + time * 0.3);

    // === PULSATION ===
    float pulse1 = cos(time * 0.5) * 0.5;
    float pulse2 = sin(time * 0.25) * 0.5;
    float pulse = (pulse1 + pulse2) * 0.3 * uActivityLevel;

    // === COMBINED INTENSITY ===
    float totalIntensity = plasma * 0.35 + turbIntensity * 0.25 + gran * 0.2;
    totalIntensity += bubbles * 0.4;
    totalIntensity *= 1.0 + pulse;

    // === 4-TIER COLOR SYSTEM ===
    vec3 baseColor = uStarColor;
    float maxComp = max(baseColor.r, max(baseColor.g, baseColor.b));
    if (maxComp > 0.01) baseColor = baseColor / maxComp * 0.85;

    // Temperature-based color blending
    float tempBlend = smoothstep(5000.0, 7500.0, uTemperature);

    vec3 hotColor = baseColor * vec3(1.6, 1.35, 1.2);
    vec3 coolColor = mix(baseColor * vec3(0.5, 0.3, 0.2), baseColor * vec3(0.7, 0.8, 0.95), tempBlend);
    vec3 warmColor = mix(baseColor * vec3(1.2, 1.0, 0.85), baseColor * vec3(1.0, 1.05, 1.2), tempBlend);
    vec3 blazingColor = mix(baseColor * vec3(2.0, 1.6, 1.3), baseColor * vec3(1.4, 1.5, 1.8), tempBlend);

    // Map intensity to color
    vec3 surfaceColor;
    if (totalIntensity < 0.35) {
        surfaceColor = mix(coolColor, warmColor, totalIntensity / 0.35);
    } else if (totalIntensity < 0.65) {
        surfaceColor = mix(warmColor, hotColor, (totalIntensity - 0.35) / 0.3);
    } else if (totalIntensity < 1.0) {
        surfaceColor = mix(hotColor, blazingColor, (totalIntensity - 0.65) / 0.35);
    } else {
        surfaceColor = blazingColor * (1.0 + (totalIntensity - 1.0) * 0.8);
    }

    // Bubble highlights
    float bubbleHighlight = pow(bubbles, 1.5) * turbIntensity;
    surfaceColor += blazingColor * bubbleHighlight * 0.6;

    // === LIMB DARKENING ===
    surfaceColor *= 0.75 + limbDarkening * 0.25;

    // === ORGANIC RIM GLOW ===
    float rimAngle = atan(normal.y, normal.x) + selfRotation;
    float rimNoise = noise3D(vec3(rimAngle * 3.0, edgeDist * 2.0, time * 0.2));
    rimNoise = rimNoise * 0.5 + 0.5;

    float rimIntensity = pow(edgeDist, 2.0) * (0.4 + rimNoise * 0.6);
    vec3 rimColor = baseColor * vec3(1.3, 0.95, 0.6);
    surfaceColor += rimColor * rimIntensity * 0.6 * uActivityLevel;

    // === EDGE GLOW (corona bleeding into surface) ===
    float edgeGlow = pow(edgeDist, 0.5) * 0.3 * uActivityLevel;
    surfaceColor += warmColor * edgeGlow;

    // === CENTER BOOST ===
    float centerBoost = pow(viewAngle, 1.5) * 0.2;
    surfaceColor += baseColor * centerBoost;

    // === SHIMMER ===
    float shimmer = sin(turbIntensity * 10.0 + time * 3.0) * 0.05 + 1.0;
    surfaceColor *= shimmer;

    surfaceColor = clamp(surfaceColor, 0.0, 2.5);

    gl_FragColor = vec4(surfaceColor, 1.0);
}
`;

// =============================================================================
// BLACK HOLE SHADER
// =============================================================================

/**
 * Black hole shader with gravitational lensing, photon sphere, and spacetime warping
 *
 * Physics simulated:
 * - Event horizon (Schwarzschild radius) - point of no return
 * - Photon sphere at 1.5x event horizon - where light orbits
 * - Gravitational lensing - light bending around the black hole
 * - Doppler beaming - approaching side brighter
 * - Relativistic aberration
 */
export const BLACK_HOLE_FRAGMENT = `
${SPHERE_COMMON}

uniform float uAwakeningLevel;  // 0 = dormant, 1 = fully active
uniform float uFeedingPulse;    // Temporary glow from feeding

// Schwarzschild metric light bending
// Returns deflection angle based on impact parameter
float gravitationalDeflection(float impactParam, float rsRadius) {
    // Simplified Einstein deflection: angle ≈ 4GM/(c²b) = 2rs/b
    // where rs = Schwarzschild radius, b = impact parameter
    if (impactParam < rsRadius * 1.5) return 3.14159; // Captured
    return 2.0 * rsRadius / impactParam;
}

// Distort UV based on gravitational lensing
vec2 lensDistort(vec2 uv, float strength, float rsRadius) {
    vec2 center = uv - 0.5;
    float dist = length(center);

    if (dist < 0.001) return uv;

    // Impact parameter (closest approach to BH center)
    float b = dist;

    // Light bending - stronger closer to BH
    float deflection = gravitationalDeflection(b, rsRadius);

    // Apply radial distortion (push outward = inversion of what we see)
    float distortFactor = 1.0 + strength * deflection * 0.3;

    return center * distortFactor + 0.5;
}

void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = length(center) * 2.0;
    float angle = atan(center.y, center.x);

    float time = uTime;
    float awakeFactor = uAwakeningLevel;
    float pulseFactor = uFeedingPulse;

    // === RADII ===
    float eventHorizon = 0.5;           // Visual radius of event horizon
    float photonSphere = 0.75;          // 1.5x event horizon
    float innerAccretion = 0.85;        // Inner edge of visible accretion
    float outerGlow = 1.4;              // Outer extent of effects

    // === CIRCULAR MASK ===
    if (dist > 1.5) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // === EVENT HORIZON - Pure black void ===
    if (dist < eventHorizon) {
        // Absolute darkness inside event horizon
        // Subtle edge gradient for depth
        float edgeDist = dist / eventHorizon;
        float edgeGlow = pow(edgeDist, 4.0) * 0.08 * awakeFactor;

        vec3 voidColor = vec3(edgeGlow * 0.3, edgeGlow * 0.15, edgeGlow * 0.05);
        gl_FragColor = vec4(voidColor, 1.0);
        return;
    }

    // === PHOTON SPHERE - Bright ring of trapped light ===
    // This is where photons orbit the black hole
    float photonRingWidth = 0.08;
    float photonDist = abs(dist - photonSphere);
    float photonRing = exp(-photonDist * photonDist / (photonRingWidth * photonRingWidth));

    // Photon ring flickers and rotates
    float photonFlicker = noise3D(vec3(angle * 3.0, time * 2.0, 0.0)) * 0.4 + 0.6;
    float photonRotation = noise3D(vec3(angle * 5.0 + time * 0.5, dist * 2.0, time * 0.3));
    photonRing *= photonFlicker * (0.8 + photonRotation * 0.2);

    // Doppler effect - approaching side brighter
    float doppler = 1.0 + 0.3 * cos(angle + time * 0.2);
    photonRing *= doppler;

    // Photon ring color - hot white-yellow with orange edges
    vec3 photonColor = mix(
        vec3(1.0, 0.95, 0.8),    // Core - bright white
        vec3(1.0, 0.6, 0.2),     // Edge - orange
        pow(photonDist / photonRingWidth, 2.0)
    );

    // === GRAVITATIONAL LENSING DISTORTION ===
    // Background "stars" or noise that gets warped
    float lensStrength = awakeFactor * 0.5;
    vec2 lensedUV = lensDistort(uv, lensStrength, eventHorizon * 0.5);

    // Warped background pattern (simulates lensed starlight)
    vec3 lensedCoord = vec3(lensedUV * 10.0, time * 0.1);
    float warpedStars = noise3D(lensedCoord);
    warpedStars = pow(warpedStars, 3.0) * 0.3; // Sparse bright points

    // Einstein ring - light from directly behind gets spread into a ring
    float einsteinRadius = photonSphere * 1.1;
    float einsteinWidth = 0.15;
    float einsteinRing = exp(-pow(dist - einsteinRadius, 2.0) / (einsteinWidth * einsteinWidth));
    einsteinRing *= 0.4 * awakeFactor;

    // === INNER ACCRETION GLOW ===
    // Hot gas just outside photon sphere
    float accretionGlow = 0.0;
    if (dist > photonSphere && dist < innerAccretion + 0.2) {
        float accretionDist = (dist - photonSphere) / (innerAccretion - photonSphere + 0.2);
        accretionGlow = (1.0 - accretionDist) * 0.5;

        // Turbulent accretion flow
        float turbulence = noise3D(vec3(angle * 4.0 + time, dist * 3.0, time * 0.5));
        accretionGlow *= (0.7 + turbulence * 0.3);
        accretionGlow *= doppler; // Doppler brightening
    }

    // === RELATIVISTIC JET HINTS ===
    // Faint glow along polar axis (perpendicular to disk)
    float polarAngle = abs(sin(angle));
    float jetHint = pow(polarAngle, 8.0) * 0.15 * awakeFactor;
    jetHint *= smoothstep(outerGlow, photonSphere, dist);

    // === HAWKING RADIATION (very subtle) ===
    // Quantum fluctuations at event horizon edge
    float hawking = 0.0;
    if (dist > eventHorizon * 0.95 && dist < eventHorizon * 1.1) {
        float hawkingNoise = noise3D(vec3(angle * 20.0, time * 5.0, dist * 10.0));
        hawking = hawkingNoise * 0.05 * (1.0 - abs(dist - eventHorizon) / (eventHorizon * 0.15));
    }

    // === FEEDING PULSE ===
    // Ripple effect when black hole consumes matter
    float pulseRipple = 0.0;
    if (pulseFactor > 0.01) {
        float ripplePhase = fract(time * 2.0) * 0.5;
        float rippleRadius = eventHorizon + ripplePhase;
        float ripple = exp(-pow(dist - rippleRadius, 2.0) * 50.0);
        pulseRipple = ripple * pulseFactor * 0.5;
    }

    // === COMBINE ALL EFFECTS ===
    vec3 color = vec3(0.0);

    // Photon sphere (dominant feature)
    color += photonColor * photonRing * (0.5 + awakeFactor * 0.5);

    // Einstein ring
    vec3 einsteinColor = vec3(0.8, 0.7, 0.5);
    color += einsteinColor * einsteinRing;

    // Inner accretion glow
    vec3 accretionColor = mix(
        vec3(1.0, 0.4, 0.1),     // Hot orange
        vec3(1.0, 0.8, 0.5),     // White-hot
        accretionGlow
    );
    color += accretionColor * accretionGlow * awakeFactor;

    // Warped background
    color += vec3(0.6, 0.7, 1.0) * warpedStars * awakeFactor;

    // Jet hints
    color += vec3(0.5, 0.6, 1.0) * jetHint;

    // Hawking radiation
    color += vec3(0.8, 0.9, 1.0) * hawking * awakeFactor;

    // Feeding pulse
    color += vec3(1.0, 0.6, 0.2) * pulseRipple;

    // === EDGE FADE ===
    float edgeFade = 1.0 - smoothstep(1.2, 1.5, dist);
    color *= edgeFade;

    // === ALPHA for compositing ===
    float alpha = max(max(color.r, color.g), color.b);
    alpha = smoothstep(0.01, 0.1, alpha);
    alpha *= edgeFade;

    // Ensure event horizon area is fully opaque black
    if (dist < eventHorizon * 1.05) {
        alpha = 1.0;
    }

    gl_FragColor = vec4(color, alpha);
}
`;

// =============================================================================
// ROCKY PLANET SHADER
// =============================================================================

/**
 * Rocky planet shader with terrain and atmosphere
 */
export const ROCKY_PLANET_FRAGMENT = `
${SPHERE_COMMON}

uniform vec3 uBaseColor;
uniform float uHasAtmosphere;  // 0-1
uniform float uSeed;

void main() {
    // Setup ray - camera looking at sphere from fixed position
    vec3 rayOrigin = vec3(0.0, 0.0, -2.5);
    vec3 rayDir = getRayDirection(vUv);

    // Ray-sphere intersection (sphere at origin with radius 0.5)
    float t = raySphereIntersect(rayOrigin, rayDir, vec3(0.0), 0.5);

    if (t < 0.0) {
        // Atmosphere halo
        if (uHasAtmosphere > 0.0) {
            vec2 center = vUv - 0.5;
            float dist = length(center) * 2.0;
            float atmo = smoothstep(0.6, 0.5, dist) * smoothstep(0.45, 0.52, dist);
            atmo *= uHasAtmosphere * 0.4;
            vec3 atmoColor = vec3(0.5, 0.7, 1.0) * atmo;
            // Premultiplied alpha
            gl_FragColor = vec4(atmoColor * atmo, atmo);
        } else {
            gl_FragColor = vec4(0.0);
        }
        return;
    }

    // Calculate hit point and normal
    vec3 hitPoint = rayOrigin + rayDir * t;
    vec3 normal = normalize(hitPoint);

    // Apply inverse camera rotation for surface features
    mat3 rotMat = rotationMatrix(-uCameraRotation);
    vec3 rotatedNormal = rotMat * normal;

    // Seeded noise for consistent terrain
    vec3 noiseCoord = rotatedNormal * 4.0 + uSeed * 100.0;
    float terrain = fbm(noiseCoord, 5);

    // Height-based coloring
    vec3 lowColor = uBaseColor * 0.6;    // Valleys/lowlands
    vec3 highColor = uBaseColor * 1.2;   // Mountains/highlands
    vec3 surfaceColor = mix(lowColor, highColor, terrain);

    // Add some variation
    float variation = noise3D(rotatedNormal * 10.0 + uSeed * 50.0);
    surfaceColor *= 0.9 + variation * 0.2;

    // Lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float light = lighting(normal, lightDir, 0.3);
    surfaceColor *= light;

    // Atmosphere scattering at edges
    if (uHasAtmosphere > 0.0) {
        float rim = fresnel(normal, -rayDir, 3.0);
        vec3 atmoColor = vec3(0.5, 0.7, 1.0);
        surfaceColor = mix(surfaceColor, atmoColor, rim * uHasAtmosphere * 0.4);
    }

    gl_FragColor = vec4(surfaceColor, 1.0);
}
`;

// =============================================================================
// GAS GIANT SHADER
// =============================================================================

/**
 * Gas giant shader with banded atmosphere and storms
 */
export const GAS_GIANT_FRAGMENT = `
${SPHERE_COMMON}

uniform vec3 uBaseColor;
uniform float uSeed;
uniform float uStormIntensity;  // 0-1

void main() {
    // Setup ray - camera looking at sphere from fixed position
    vec3 rayOrigin = vec3(0.0, 0.0, -2.5);
    vec3 rayDir = getRayDirection(vUv);

    // Ray-sphere intersection (sphere at origin with radius 0.5)
    float t = raySphereIntersect(rayOrigin, rayDir, vec3(0.0), 0.5);

    if (t < 0.0) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // Calculate hit point and normal
    vec3 hitPoint = rayOrigin + rayDir * t;
    vec3 normal = normalize(hitPoint);

    // Apply inverse camera rotation for surface features
    mat3 rotMat = rotationMatrix(-uCameraRotation);
    vec3 rotatedNormal = rotMat * normal;

    // Convert to spherical coordinates for banding (use rotated normal)
    float latitude = asin(rotatedNormal.y);  // -PI/2 to PI/2
    float longitude = atan(rotatedNormal.z, rotatedNormal.x);  // -PI to PI

    // Animated rotation
    float time = uTime * 0.1;

    // Create bands based on latitude
    float bands = sin(latitude * 15.0 + time) * 0.5 + 0.5;
    bands += sin(latitude * 25.0 - time * 0.5) * 0.25;
    bands += sin(latitude * 40.0 + time * 0.3) * 0.125;

    // Turbulent distortion of bands
    vec3 noiseCoord = vec3(longitude + time * 0.2, latitude * 3.0, uSeed);
    float turb = fbm(noiseCoord * 5.0, 4) * 0.3;
    bands += turb;

    // Color variation based on bands
    vec3 lightBand = uBaseColor * 1.3;
    vec3 darkBand = uBaseColor * 0.7;
    vec3 surfaceColor = mix(darkBand, lightBand, bands);

    // Add storm features
    if (uStormIntensity > 0.0) {
        // Great red spot style storm
        float stormLat = 0.3;  // Storm latitude
        float stormLon = time * 0.5;  // Storm drifts
        vec2 stormCenter = vec2(stormLon, stormLat);
        vec2 pos = vec2(longitude, latitude);
        float stormDist = length(pos - stormCenter);
        float storm = smoothstep(0.5, 0.2, stormDist);
        storm *= uStormIntensity;

        // Storm color and swirl
        vec3 stormColor = vec3(0.8, 0.3, 0.2);
        float swirl = sin(stormDist * 20.0 - time * 3.0) * 0.5 + 0.5;
        surfaceColor = mix(surfaceColor, stormColor * swirl, storm);
    }

    // Lighting with some subsurface scattering effect
    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.3));
    float light = lighting(normal, lightDir, 0.4);
    surfaceColor *= light;

    // Limb darkening
    float viewAngle = dot(normal, -rayDir);
    surfaceColor *= 0.7 + max(0.0, viewAngle) * 0.3;

    gl_FragColor = vec4(surfaceColor, 1.0);
}
`;

// =============================================================================
// SHADER LIBRARY EXPORT
// =============================================================================

export const SPHERE_SHADERS = {
    vertex: SPHERE_VERTEX,
    common: SPHERE_COMMON,
    star: STAR_FRAGMENT,
    blackHole: BLACK_HOLE_FRAGMENT,
    rockyPlanet: ROCKY_PLANET_FRAGMENT,
    gasGiant: GAS_GIANT_FRAGMENT,
};

export default SPHERE_SHADERS;
