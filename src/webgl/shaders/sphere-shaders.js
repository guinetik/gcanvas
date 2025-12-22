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

// Tidal disruption uniforms
uniform float uTidalStretch;     // 0 = sphere, 1+ = elongated toward BH
uniform float uStretchDirX;      // Direction to black hole (X component)
uniform float uStretchDirZ;      // Direction to black hole (Z component)
uniform float uStressLevel;      // 0-1, surface chaos from tidal forces

// =============================================================================
// TIDAL DISTORTION - True Spaghettification via Ellipsoid Deformation
// Uses ray-ellipsoid intersection for physically correct stretching
// =============================================================================

/**
 * Ray-Ellipsoid intersection
 * Ellipsoid defined by semi-axes (a, b, c) where:
 * - a = stretch along BH direction (in XZ plane)
 * - b = Y axis (slight compression)
 * - c = perpendicular to BH direction in XZ plane (compression)
 *
 * Technique: Transform ray into "unit sphere space" via inverse scaling
 */
float rayEllipsoidIntersect(vec3 rayOrigin, vec3 rayDir, vec3 center, vec3 semiAxes) {
    // Scale ray into unit sphere space
    vec3 scaledOrigin = (rayOrigin - center) / semiAxes;
    vec3 scaledDir = rayDir / semiAxes;

    // Standard ray-sphere intersection in scaled space
    float a = dot(scaledDir, scaledDir);
    float b = 2.0 * dot(scaledOrigin, scaledDir);
    float c = dot(scaledOrigin, scaledOrigin) - 1.0;
    float discriminant = b * b - 4.0 * a * c;

    if (discriminant < 0.0) {
        return -1.0;
    }

    return (-b - sqrt(discriminant)) / (2.0 * a);
}

/**
 * Calculate ellipsoid normal at hit point
 * Normal = gradient of ellipsoid equation = 2*(x/a², y/b², z/c²)
 */
vec3 ellipsoidNormal(vec3 hitPoint, vec3 center, vec3 semiAxes) {
    vec3 localPos = hitPoint - center;
    // Gradient of (x/a)² + (y/b)² + (z/c)² = 1
    vec3 grad = localPos / (semiAxes * semiAxes);
    return normalize(grad);
}

/**
 * Build tidal stretch axes from BH direction
 * Returns semi-axes (stretchAxis, Y, perpAxis) for ellipsoid
 */
vec3 tidalSemiAxes(float stretch, vec2 stretchDir, float baseRadius) {
    // Stretch factor along BH direction (elongation toward/away from BH)
    float stretchFactor = 1.0 + stretch * 0.8;  // Up to 1.8x longer

    // Compression factor perpendicular (volume roughly conserved)
    float compressFactor = 1.0 / sqrt(stretchFactor);  // Compress to conserve volume

    // Y axis gets slight compression too
    float yFactor = 1.0 - stretch * 0.15;

    return vec3(
        baseRadius * stretchFactor,   // Stretch along BH radial
        baseRadius * yFactor,         // Slight Y compression
        baseRadius * compressFactor   // Compress perpendicular
    );
}

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
    vec2 center = vUv - 0.5;
    float distFromCenter = length(center) * 2.0;

    // Wider cutoff for stretched ellipsoid
    if (distFromCenter > 1.6) {
        gl_FragColor = vec4(0.0);
        return;
    }

    float circularMask = 1.0 - smoothstep(1.3, 1.6, distFromCenter);

    // Setup ray - camera looking at sphere from fixed position
    vec3 rayOrigin = vec3(0.0, 0.0, -2.5);
    vec3 rayDir = getRayDirection(vUv);

    float time = uTime;
    float selfRotation = time * uRotationSpeed;

    // === TIDAL ELLIPSOID SETUP ===
    // Direction toward black hole in XZ plane
    vec2 stretchDir2D = normalize(vec2(uStretchDirX, uStretchDirZ) + 0.0001);
    float stretch = uTidalStretch;

    // Build rotation matrix to align ellipsoid X-axis with stretch direction
    // This rotates the ellipsoid so its long axis points toward the BH
    float stretchAngle = atan(stretchDir2D.y, stretchDir2D.x);
    float cs = cos(stretchAngle);
    float sn = sin(stretchAngle);

    // Rotation matrix around Y axis (to align stretch in XZ plane)
    mat3 stretchRot = mat3(
        cs,  0.0, -sn,
        0.0, 1.0, 0.0,
        sn,  0.0,  cs
    );
    mat3 stretchRotInv = mat3(
        cs,  0.0,  sn,
        0.0, 1.0, 0.0,
        -sn, 0.0,  cs
    );

    // Transform ray into ellipsoid-aligned space
    vec3 rotatedRayDir = stretchRotInv * rayDir;
    vec3 rotatedRayOrigin = stretchRotInv * rayOrigin;

    // Calculate ellipsoid semi-axes based on stretch
    // Star body fills the visible area - minimal corona
    float baseRadius = 0.95;  // Nearly fills the entire quad
    vec3 semiAxes = tidalSemiAxes(stretch, stretchDir2D, baseRadius);

    // Corona is paper-thin
    vec3 coronaSemiAxes = tidalSemiAxes(stretch, stretchDir2D, 0.98);

    // Ray-ellipsoid intersection for CORONA
    float tCorona = rayEllipsoidIntersect(rotatedRayOrigin, rotatedRayDir, vec3(0.0), coronaSemiAxes);

    // Ray-ellipsoid intersection for SURFACE
    float t = rayEllipsoidIntersect(rotatedRayOrigin, rotatedRayDir, vec3(0.0), semiAxes);

    // === CORONA / OUTER GLOW ===
    // Only render corona in the thin rim outside the star body
    if (t < 0.0) {
        float dist = distFromCenter;
        float angle = atan(center.y, center.x);

        // Star edge is at ~1.9 in dist space (0.95 * 2)
        // Corona is barely visible - just a whisper at the edge
        float starEdge = 1.9;

        // Quick exit if too far from star edge
        float edgeFade = 1.0 - smoothstep(starEdge + 0.08, starEdge + 0.15, dist);
        if (edgeFade <= 0.0) {
            gl_FragColor = vec4(0.0);
            return;
        }

        // How far outside the star edge (0 at edge, small positive outside)
        float rimDist = max(0.0, dist - starEdge);
        float rimFactor = smoothstep(0.0, 0.1, rimDist);

        // Tight glow - exponential falloff from star edge
        float glow = exp(-rimDist * rimDist * 200.0) * 0.5;  // Much tighter falloff

        // Corona flames at the edge (subtle)
        float flames = coronaFlames(angle + selfRotation, rimFactor, time, uActivityLevel);
        flames *= 0.5;  // Reduce flame intensity

        // Turbulent corona edges
        float coronaTurb = noise3D(vec3(angle * 3.0 + selfRotation, dist * 2.0, time * 0.3));
        coronaTurb = coronaTurb * 0.5 + 0.5;

        // Corona intensity - very tight peak just outside star
        float coronaIntensity = smoothstep(0.0, 0.02, rimDist) * smoothstep(0.12, 0.03, rimDist);
        coronaIntensity *= (0.5 + coronaTurb * 0.3 + flames * 0.5);
        coronaIntensity *= 0.4 + uActivityLevel * 0.4;

        // Combined outer effect - reduced overall
        float totalGlow = glow * 0.6 + coronaIntensity * 0.4;
        totalGlow *= edgeFade;

        // Corona color - warmer/redder than surface
        vec3 coronaColor = uStarColor * vec3(1.3, 1.0, 0.7);
        vec3 glowColor = mix(uStarColor, coronaColor, coronaIntensity);

        float brightness = max(max(glowColor.r, glowColor.g), glowColor.b) * totalGlow;
        float alpha = smoothstep(0.01, 0.15, brightness) * totalGlow;

        if (alpha < 0.02) {
            gl_FragColor = vec4(0.0);
            return;
        }

        glowColor *= totalGlow;
        alpha *= circularMask;
        gl_FragColor = vec4(glowColor * alpha, alpha);
        return;
    }

    // === SURFACE RENDERING ===
    // Calculate hit point in rotated (ellipsoid-aligned) space
    vec3 rotatedHitPoint = rotatedRayOrigin + rotatedRayDir * t;

    // Calculate ellipsoid normal (gradient of implicit surface)
    vec3 rotatedNormalRaw = ellipsoidNormal(rotatedHitPoint, vec3(0.0), semiAxes);

    // Transform hit point and normal back to world space
    vec3 hitPoint = stretchRot * rotatedHitPoint;
    vec3 normal = normalize(stretchRot * rotatedNormalRaw);

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

    // === MULTI-LAYER EFFECTS (stress-enhanced) ===
    // Stress amplifies all turbulent effects - star is being torn apart!
    // Much more violent - up to 5x chaos at max stress
    float stressBoost = 1.0 + uStressLevel * 4.0;

    float turbIntensity = boilingTurbulence(rotatedNormal, time * stressBoost) * 0.6;
    turbIntensity *= stressBoost;

    float bubbles = hotBubbles(rotatedNormal, time * stressBoost);
    bubbles *= stressBoost * 1.5;  // More dramatic bubbles

    // Granulation becomes violent under stress - larger and faster
    float gran = noise3D(rotatedNormal * 15.0 + time * 0.5 * stressBoost);
    gran *= stressBoost * 1.2;

    // === TIDAL FRACTURING ===
    // Stress causes visible cracks/tears - starts earlier and more intense
    float fractures = 0.0;
    if (uStressLevel > 0.15) {  // Start fractures earlier (was 0.3)
        float fractureNoise = noise3D(rotatedNormal * 6.0 + time * 0.8);  // Larger cracks, faster animation
        float fractureThreshold = 1.0 - (uStressLevel - 0.15) * 1.2;
        fractures = smoothstep(fractureThreshold, fractureThreshold + 0.08, fractureNoise);
        fractures *= uStressLevel * 1.2;  // More intense (was 0.8)
    }

    // === PULSATION (amplified by stress) ===
    float pulse1 = cos(time * 0.5) * 0.5;
    float pulse2 = sin(time * 0.25) * 0.5;
    float pulseAmp = uActivityLevel * (1.0 + uStressLevel);
    float pulse = (pulse1 + pulse2) * 0.3 * pulseAmp;

    // === COMBINED INTENSITY ===
    float totalIntensity = plasma * 0.35 + turbIntensity * 0.25 + gran * 0.2;
    totalIntensity += bubbles * 0.4;
    totalIntensity += fractures * 0.5;  // Fractures glow hot
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
 * Black hole shader - subtle, physics-based with gravitational lensing
 *
 * Design philosophy:
 * - Dormant: Nearly invisible, just a dark void with subtle edge
 * - Main effect is gravitational lensing of background starfield
 * - Only shows glow effects when awakened/feeding
 * - The accretion disk handles most visual drama (separate component)
 */
export const BLACK_HOLE_FRAGMENT = `
${SPHERE_COMMON}

uniform float uAwakeningLevel;  // 0 = dormant, 1 = fully active
uniform float uFeedingPulse;    // Temporary glow from feeding
uniform float uRotation;        // Black hole spin angle (Kerr rotation)

void main() {
    vec2 uv = vUv;
    vec2 center = uv - 0.5;
    float dist = length(center) * 2.0;  // 0 at center, 1 at edge
    float angle = atan(center.y, center.x);

    float time = uTime;
    float awakeFactor = uAwakeningLevel;
    float pulseFactor = uFeedingPulse;

    // Spin angle for rotating effects (frame dragging)
    // Using uTime since custom uniforms don't update properly
    float spinAngle = angle + uTime * 4.0;  // Faster spin

    // === RADII (normalized to quad size) ===
    float eventHorizon = 0.42;          // Slightly larger core
    float photonSphere = 0.54;          // Tighten ring closer to horizon
    float shadowEdge = 0.5;             // Shadow boundary

    // === CIRCULAR MASK ===
    if (dist > 1.5) {
        gl_FragColor = vec4(0.0);
        return;
    }

    // === NO INTERNAL STARFIELD ===
    // The real starfield is rendered separately in the scene
    // This shader just renders the dark void + subtle edge effects
    // True gravitational lensing would require render-to-texture of background

    // === EVENT HORIZON - Gradient from pure black to very dark edge ===
    // Edge color ~#110b06 = RGB(17,11,6) = vec3(0.067, 0.043, 0.024)
    if (dist < shadowEdge) {
        // Use shadowEdge (0.52) as outer boundary for smooth transition to ring
        float edgeT = dist / shadowEdge;  // 0 at center, 1 at shadow edge

        // Very steep curve - stays pure black until very close to edge
        float glowFactor = pow(edgeT, 8.0);

        // Very dark brownish-black - NO yellow, matches #110b06
        vec3 edgeColor = vec3(0.067, 0.043, 0.024) * glowFactor;

        gl_FragColor = vec4(edgeColor, 1.0);
        return;
    }

    // === PHOTON SPHERE - Subtle ring with gentler spin asymmetry ===
    float photonRingWidth = 0.035;
    float photonDist = abs(dist - photonSphere);
    float photonRing = exp(-photonDist * photonDist / (photonRingWidth * photonRingWidth));

    // Softer Doppler asymmetry to avoid pointy highlights
    float doppler = 0.78 + 0.22 * cos(spinAngle);  // narrower asymmetry
    photonRing *= 0.18 + doppler * 0.38;           // 18%..56% brightness

    // Soft tip highlight to indicate spin without a spike
    float tipAlign = max(0.0, cos(spinAngle));
    float tipRadial = smoothstep(photonRingWidth * 1.2, 0.0, photonDist);
    float hotSpotGlow = tipAlign * tipAlign * tipRadial * 0.25;

    // Scale with awakening - more visible when feeding
    photonRing *= 0.15 + awakeFactor * 0.35;

    // === FEEDING PULSE - Subtle ripple when consuming ===
    float pulseRipple = 0.0;
    if (pulseFactor > 0.01) {
        float ripplePhase = fract(time * 1.5) * 0.3;
        float rippleRadius = shadowEdge + ripplePhase;
        float ripple = exp(-pow(dist - rippleRadius, 2.0) * 80.0);
        pulseRipple = ripple * pulseFactor * 0.15;  // Subtle
    }

    // === EDGE GLOW - keep subtle; avoid wide smear
    float edgeGlow = 0.0;
    if (dist > shadowEdge && dist < photonSphere + 0.08) {
        float edgeFactor = smoothstep(shadowEdge, photonSphere, dist);
        edgeFactor *= smoothstep(photonSphere + 0.08, photonSphere, dist);
        edgeGlow = edgeFactor * pulseFactor * 0.06;
    }

    // === COMBINE EFFECTS ===
    vec3 color = vec3(0.0);

    // Photon sphere ring (warm orange-yellow)
    vec3 photonColor = vec3(1.0, 0.8, 0.45);
    color += photonColor * photonRing;

    // Soft tip highlight (spin indicator)
    vec3 hotSpotColor = vec3(1.0, 0.9, 0.65);
    color += hotSpotColor * hotSpotGlow;

    // Edge glow when feeding
    vec3 glowColor = vec3(1.0, 0.5, 0.2);
    color += glowColor * edgeGlow;

    // Feeding pulse ripple
    vec3 pulseColor = vec3(1.0, 0.6, 0.3);
    color += pulseColor * pulseRipple;

    // === OUTER FADE ===
    float outerFade = 1.0 - smoothstep(0.9, 1.25, dist);
    color *= outerFade;

    // === ALPHA ===
    // Event horizon and photon sphere are fully opaque to occlude background
    float alpha;
    if (dist < photonSphere) {
        alpha = 1.0;
        color = (dist < shadowEdge) ? vec3(0.0) : color; // keep core solid black
    } else {
        // Alpha based on visible content
        float contentBrightness = max(max(color.r, color.g), color.b);
        alpha = smoothstep(0.01, 0.06, contentBrightness);
        alpha = max(alpha, smoothstep(photonSphere + 0.12, shadowEdge, dist) * 0.25);
        alpha *= outerFade;
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
