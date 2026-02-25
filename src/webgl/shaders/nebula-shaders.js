/**
 * Nebula shader sources for WebGLNebulaRenderer.
 *
 * Vertex shader: passthrough fullscreen quad.
 * Fragment shader: procedural nebula clouds rendered fullscreen.
 * Each pixel is inverse-projected through Camera3D's perspective to find
 * its galaxy-plane position, then noise is sampled there.
 *
 * Uses simplex 3D noise, FBM, spiral noise, and realistic emission line
 * colors (H-alpha, OIII, SII, H-beta).
 */

export const NEBULA_VERTEX = `
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUV;

void main() {
  vUV = aUV;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const NEBULA_FRAGMENT = `
precision mediump float;

varying vec2 vUV;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uCenter;          // galaxy center on screen (pixels, canvas coords with Y-down)
uniform float uPerspective;    // Camera3D perspective distance
uniform float uSinTilt;        // sin(camera.rotationX)
uniform float uCosTilt;        // cos(camera.rotationX)
uniform float uSinRotY;        // sin(camera.rotationY)
uniform float uCosRotY;        // cos(camera.rotationY)
uniform float uGalaxyRadius;   // world-space galaxy radius
uniform float uZoom;           // zoom factor
uniform float uSeed;
uniform float uNebulaIntensity;
uniform float uGalaxyRotation;
uniform float uAxisRatio;       // b/a axis ratio (1.0 = circular, <1 = elongated)
uniform sampler2D uDensityMap;

#define PI 3.14159265359
#define TAU 6.28318530718

// ─── Noise helpers ───────────────────────────────────────────────────────────

const float MOD_DIVISOR = 289.0;
const float NOISE_OUTPUT_SCALE_3D = 42.0;
const float FBM_LACUNARITY = 2.0;
const float FBM_PERSISTENCE = 0.5;
const float NUDGE = 3.0;

vec3 mod289_3(vec3 x) {
  return x - floor(x * (1.0 / MOD_DIVISOR)) * MOD_DIVISOR;
}

vec4 mod289_4(vec4 x) {
  return x - floor(x * (1.0 / MOD_DIVISOR)) * MOD_DIVISOR;
}

vec4 permute_4(vec4 x) {
  return mod289_4(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289_3(i);
  vec4 p = permute_4(permute_4(permute_4(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;

  return NOISE_OUTPUT_SCALE_3D * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm3D(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = FBM_PERSISTENCE;
  float frequency = 1.0;
  vec3 shift = vec3(100.0);

  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise3D(p * frequency);
    p += shift;
    frequency *= FBM_LACUNARITY;
    amplitude *= FBM_PERSISTENCE;
  }

  return value;
}

float spiralNoise(vec3 p, float seed) {
  float normalizer = 1.0 / sqrt(1.0 + NUDGE * NUDGE);
  float n = 1.5 - seed * 0.5;
  float iter = 2.0;

  for (int i = 0; i < 5; i++) {
    n += -abs(sin(p.y * iter) + cos(p.x * iter)) / iter;
    p.xy += vec2(p.y, -p.x) * NUDGE;
    p.xy *= normalizer;
    p.xz += vec2(p.z, -p.x) * NUDGE;
    p.xz *= normalizer;
    iter *= 1.5 + seed * 0.2;
  }

  return n;
}

float nebulaDensity(vec3 p, float seed) {
  float k = 1.5 + seed * 0.5;
  float spiral = spiralNoise(p * 0.5, seed);
  float detail = fbm3D(p * 2.0, 4) * 0.35;
  float fine = fbm3D(p * 6.0, 2) * 0.15;
  return k * (0.5 + spiral * 0.5 + detail + fine);
}

// ─── Emission line colors ────────────────────────────────────────────────────

vec3 nebulaEmissionColor(float hue, float variation) {
  vec3 hAlpha = vec3(0.9, 0.3, 0.35);
  vec3 oiii   = vec3(0.2, 0.7, 0.65);
  vec3 sii    = vec3(0.8, 0.25, 0.2);
  vec3 hBeta  = vec3(0.3, 0.5, 0.8);

  vec3 color;
  if (hue < 0.25) {
    color = mix(hAlpha, oiii, hue / 0.25);
  } else if (hue < 0.5) {
    color = mix(oiii, hBeta, (hue - 0.25) / 0.25);
  } else if (hue < 0.75) {
    color = mix(hBeta, sii, (hue - 0.5) / 0.25);
  } else {
    color = mix(sii, hAlpha, (hue - 0.75) / 0.25);
  }

  color += (variation - 0.5) * 0.15;
  return color;
}

// ─── Main ────────────────────────────────────────────────────────────────────

void main() {
  // Pixel position in canvas coords (Y-down to match Canvas 2D)
  // WebGL UV has Y=0 at bottom, so flip to match canvas Y-down
  vec2 pixel = vec2(vUV.x, 1.0 - vUV.y) * uResolution;

  // Screen offset from galaxy center (in canvas coords)
  // Camera3D returns screenX, screenY which are added to (cx, cy)
  // So: pixel = center + projectedXY * zoom
  // Invert: projectedXY = (pixel - center) / zoom
  vec2 projected = (pixel - uCenter) / uZoom;

  // Inverse Camera3D projection:
  // Camera3D forward (for galaxy-plane point (wx, 0, wz)):
  //   Step 1 - Y rotation: x1 = wx*cosY - wz*sinY,  z1 = wx*sinY + wz*cosY
  //   Step 2 - X rotation: y1 = -z1*sinX,  z2 = z1*cosX
  //   Step 3 - Perspective: scale = P/(P+z2),  sX = x1*scale,  sY = y1*scale
  //
  // Inverse Step 3+2: from (sX, sY) recover (x1, z1)
  //   sY = -z1*sinX * P / (P + z1*cosX)
  //   => z1 = -sY*P / (sinX*P + sY*cosX)
  //   scale = P / (P + z1*cosX)
  //   x1 = sX / scale
  //
  // Inverse Step 1: from (x1, z1) recover (wx, wz)
  //   wx =  x1*cosY + z1*sinY
  //   wz = -x1*sinY + z1*cosY

  float sY = projected.y;
  float sX = projected.x;

  float denom = uSinTilt * uPerspective + sY * uCosTilt;

  // Avoid division by zero (near edge-on with sinTilt ≈ 0)
  if (abs(denom) < 0.001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Recover post-Y-rotation coords (x1, z1)
  float z1 = -sY * uPerspective / denom;
  float scale = uPerspective / (uPerspective + z1 * uCosTilt);
  float x1 = sX / scale;

  // Undo Y rotation to get world-space galaxy-plane coords
  float worldX =  x1 * uCosRotY + z1 * uSinRotY;
  float worldZ = -x1 * uSinRotY + z1 * uCosRotY;

  // Apply axis ratio (elliptical galaxies are elongated along X)
  float galaxyZ = worldZ / uAxisRatio;

  // Galaxy-plane radius (using stretched coords for elliptical shape)
  float r = length(vec2(worldX, galaxyZ));
  float rNorm = r / uGalaxyRadius;

  // Early out
  if (rNorm > 1.5) {
    gl_FragColor = vec4(0.0);
    return;
  }

  // Radial fade
  float radialMask = smoothstep(0.05, 0.15, rNorm) * (1.0 - smoothstep(0.85, 1.15, rNorm));

  // Angle in galaxy plane (using stretched coords)
  float angle = atan(galaxyZ, worldX) - uGalaxyRotation;

  // 3D noise sample position
  vec3 samplePos = vec3(
    cos(angle) * rNorm * 3.0,
    sin(angle) * rNorm * 3.0,
    uSeed * 10.0 + uTime * 0.008
  );

  // Star density from CPU-generated texture
  // Use original (un-stretched) world coords to match actual star positions
  float rawR = length(vec2(worldX, worldZ));
  float rawRNorm = rawR / uGalaxyRadius;
  float rawAngle = atan(worldZ, worldX) - uGalaxyRotation;
  vec2 restPos = vec2(cos(rawAngle), sin(rawAngle)) * rawRNorm;
  vec2 densityUV = restPos / 1.3 * 0.5 + 0.5;
  float starDensity = pow(texture2D(uDensityMap, densityUV).r, 0.35);

  // Nebula density modulated by star density
  float density = nebulaDensity(samplePos, fract(uSeed));
  density = max(density, 0.0) * radialMask * starDensity;
  density = smoothstep(0.15, 0.9, density);

  // Emission line color
  float colorNoise = fbm3D(samplePos * 1.2 + uSeed * 50.0, 2) * 0.5 + 0.5;
  float hue = fract(uSeed + colorNoise * 0.35 + rNorm * 0.1);
  vec3 color = nebulaEmissionColor(hue, colorNoise);

  // Brightness variation
  float brightness = 0.5 + 0.5 * fbm3D(samplePos * 2.0 + uSeed * 30.0, 2);
  color *= max(brightness, 0.0);

  // Final alpha
  float alpha = clamp(density * uNebulaIntensity, 0.0, 1.0);

  // Premultiplied alpha
  gl_FragColor = vec4(color * alpha, alpha);
}
`;
