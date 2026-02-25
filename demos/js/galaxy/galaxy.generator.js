/**
 * Galaxy Playground — Star distribution generator.
 *
 * Generates star positions for different galaxy morphologies (Hubble sequence):
 * Spiral, Barred Spiral, Elliptical, and Irregular. Uses Keplerian rotation
 * from orbital.js for differential rotation.
 *
 * Stars are assigned to one of three visual layers:
 *   - **dust** — faint, small background particles (nebular blue-violet)
 *   - **star** — mid-brightness main-sequence stars
 *   - **bright** — luminous OB stars or giants
 *
 * Color varies by layer, radial distance (core gold → arm blue), and optional
 * HII region membership (pink/magenta emission nebulae).
 *
 * @module galaxy/galaxy.generator
 */

import { CONFIG } from "./galaxy.config.js";

const TAU = Math.PI * 2;

/**
 * Assigns a star to a layer (dust, star, bright) based on config fractions.
 * @param {number} roll - Random value 0-1
 * @returns {string} "dust" | "star" | "bright"
 */
function assignLayer(roll) {
    const dustF = CONFIG.visual.dustFraction;
    const brightF = CONFIG.visual.brightFraction;
    if (roll < dustF) return "dust";
    if (roll > 1 - brightF) return "bright";
    return "star";
}

/**
 * Returns size range and alpha range for a layer.
 */
function layerProperties(layer) {
    switch (layer) {
        case "dust":
            return {
                size: 0.3 + Math.random() * 1.0,
                brightness: 0.03 + Math.random() * 0.12,
                alpha: 0.05 + Math.random() * 0.15,
            };
        case "bright":
            return {
                size: 3 + Math.random() * 5,
                brightness: 0.7 + Math.random() * 0.3,
                alpha: 0.6 + Math.random() * 0.4,
            };
        default: // "star"
            return {
                size: 0.8 + Math.random() * 2.0,
                brightness: 0.3 + Math.random() * 0.5,
                alpha: 0.3 + Math.random() * 0.5,
            };
    }
}

/**
 * Picks a hue based on layer, position, and optional HII region flag.
 */
function pickHue(layer, distFactor, isHII) {
    const v = CONFIG.visual;
    if (isHII) {
        return v.hiiHueRange[0] + Math.random() * (v.hiiHueRange[1] - v.hiiHueRange[0]);
    }
    if (layer === "dust") {
        return v.dustHueRange[0] + Math.random() * (v.dustHueRange[1] - v.dustHueRange[0]);
    }
    // Blend from core hue to arm hue based on distance
    const coreHue = v.coreHueRange[0] + Math.random() * (v.coreHueRange[1] - v.coreHueRange[0]);
    const armHue = v.armHueRange[0] + Math.random() * (v.armHueRange[1] - v.armHueRange[0]);
    return coreHue + (armHue - coreHue) * Math.pow(distFactor, 0.6);
}

/**
 * Generates stars for a galaxy based on preset parameters.
 *
 * @param {Object} params - Galaxy parameters from preset
 * @param {number} [params.numArms] - Number of spiral arms
 * @param {number} [params.starCount] - Total star count
 * @param {number} [params.galaxyRadius] - Outer radius in units
 * @param {number} [params.armWidth] - Arm scatter width
 * @param {number} [params.spiralTightness] - Pitch angle (tightness)
 * @param {number} [params.spiralStart] - Inner radius of arms
 * @param {number} [params.fieldStarFraction] - Fraction of field stars
 * @param {number} [params.bulgeRadius] - Bulge radius
 * @param {number} [params.barLength] - Bar length (barred)
 * @param {number} [params.barWidth] - Bar width (barred)
 * @param {number} [params.ellipticity] - Ellipticity (elliptical)
 * @param {number} [params.axisRatio] - Axis ratio b/a (elliptical)
 * @param {number} [params.irregularity] - Irregularity factor (0–1)
 * @param {number} [params.clumpCount] - Number of clumps (irregular)
 * @returns {Object[]} Array of star objects { radius, angle, y, rotationSpeed, hue, brightness, size, alpha, layer, twinklePhase }
 */
export function generateGalaxy(params) {
  const type = params.type || "spiral";

  switch (type) {
    case "spiral":
    case "grandDesign":
    case "flocculent":
      return generateSpiral(params);
    case "barred":
      return generateBarredSpiral(params);
    case "elliptical":
      return generateElliptical(params);
    case "irregular":
      return generateIrregular(params);
    default:
      return generateSpiral(params);
  }
}

/**
 * Generates stars along logarithmic spiral arms.
 *
 * @param {Object} p - Parameters
 * @returns {Object[]} Array of star objects
 */
function generateSpiral(p) {
  const stars = [];
  const numArms = p.numArms || 2;
  const totalStars = p.starCount || 15000;
  const armStars = Math.floor(totalStars * (1 - (p.fieldStarFraction || 0.15)));
  const starsPerArm = Math.floor(armStars / numArms);
  const galaxyRadius = p.galaxyRadius || 350;
  const armWidth = p.armWidth || 40;
  const spiralTightness = p.spiralTightness || 0.25;
  const spiralStart = p.spiralStart || 30;
  const irregularity = p.irregularity || 0;
  const hiiChance = CONFIG.visual.hiiRegionChance;
  const numSegments = 10;

  const armPoints = [];

  for (let arm = 0; arm < numArms; arm++) {
    const armOffset = (arm / numArms) * TAU;
    const armSamples = [];

    // Pre-determine HII regions for this arm
    const hiiSegments = new Set();
    for (let seg = 0; seg < numSegments; seg++) {
      if (Math.random() < hiiChance) hiiSegments.add(seg);
    }

    for (let i = 0; i < starsPerArm; i++) {
      const t = i / starsPerArm;
      const theta = t * TAU * 2.5;
      const r = spiralStart * Math.exp(spiralTightness * theta);

      if (r > galaxyRadius) continue;

      const baseAngle = theta + armOffset;
      const scatter = (Math.random() - 0.5 + Math.random() - 0.5) * armWidth;
      const scatterAngle = baseAngle + Math.PI / 2;
      const alongScatter = (Math.random() - 0.5) * 20;
      const irr = irregularity * (Math.random() - 0.5) * 30;

      const x = Math.cos(baseAngle) * (r + alongScatter + irr) + Math.cos(scatterAngle) * scatter;
      const z = Math.sin(baseAngle) * (r + alongScatter + irr) + Math.sin(scatterAngle) * scatter;

      const thickness = CONFIG.visual.diskThickness * (1 - t * 0.7);
      const y = (Math.random() - 0.5) * thickness;

      const actualRadius = Math.sqrt(x * x + z * z);
      const actualAngle = Math.atan2(z, x);
      const distFactor = actualRadius / galaxyRadius;
      const rotationSpeed = computeRotationSpeed(actualRadius);

      const layer = assignLayer(Math.random());
      const segment = Math.floor(t * numSegments);
      const isHII = hiiSegments.has(segment) && Math.random() < 0.4;

      const props = layerProperties(layer);
      const hue = pickHue(layer, distFactor, isHII);

      stars.push({
        radius: actualRadius,
        angle: actualAngle,
        y,
        rotationSpeed,
        hue,
        brightness: props.brightness,
        size: props.size,
        alpha: props.alpha,
        layer,
        twinklePhase: Math.random() * TAU,
      });

      // Sample arm center points for nebular glow
      if (i % Math.max(1, Math.floor(starsPerArm / CONFIG.visual.nebulaGlowSamples)) === 0 && layer === "star") {
        armSamples.push({
          angle: baseAngle,
          r,
          isHII: hiiSegments.has(segment),
          hue: hiiSegments.has(segment)
            ? CONFIG.visual.hiiHueRange[0] + Math.random() * 20
            : CONFIG.visual.dustHueRange[0] + (arm * 30) % 40,
        });
      }
    }
    armPoints.push(armSamples);
  }

  // Field stars
  const fieldCount = Math.floor(totalStars * (p.fieldStarFraction || 0.15));
  for (let i = 0; i < fieldCount; i++) {
    stars.push(generateFieldStar(galaxyRadius));
  }

  stars._armPoints = armPoints;
  return stars;
}

/**
 * Generates stars for a barred spiral galaxy.
 *
 * @param {Object} p - Parameters
 * @returns {Object[]} Array of star objects
 */
function generateBarredSpiral(p) {
  const stars = [];
  const numArms = p.numArms || 2;
  const galaxyRadius = p.galaxyRadius || 350;
  const barLength = p.barLength || 120;
  const barWidth = p.barWidth || 25;
  const armWidth = p.armWidth || 45;
  const spiralTightness = p.spiralTightness || 0.28;
  const spiralStart = p.spiralStart || 50;
  const totalStars = p.starCount || 16000;
  const hiiChance = CONFIG.visual.hiiRegionChance;
  const numSegments = 10;

  // Bar stars
  const barStars = Math.floor(totalStars * 0.25);
  for (let i = 0; i < barStars; i++) {
    const alongBar = (Math.random() - 0.5) * 2 * barLength;
    const acrossBar = (Math.random() - 0.5) * barWidth;
    const x = alongBar;
    const z = acrossBar;
    const actualRadius = Math.sqrt(x * x + z * z);
    if (actualRadius > galaxyRadius) continue;

    const actualAngle = Math.atan2(z, x);
    const layer = assignLayer(Math.random());
    const props = layerProperties(layer);
    const hue = pickHue(layer, 0.1, false); // near-core colors

    stars.push({
      radius: actualRadius,
      angle: actualAngle,
      y: (Math.random() - 0.5) * 6,
      rotationSpeed: computeRotationSpeed(actualRadius),
      hue,
      brightness: props.brightness,
      size: props.size,
      alpha: props.alpha,
      layer,
      twinklePhase: Math.random() * TAU,
    });
  }

  // Arm stars
  const armPoints = [];
  for (let arm = 0; arm < numArms; arm++) {
    const armOffset = (arm / numArms) * TAU;
    const starsPerArm = Math.floor((totalStars - barStars) * 0.9 / numArms);
    const armSamples = [];

    const hiiSegments = new Set();
    for (let seg = 0; seg < numSegments; seg++) {
      if (Math.random() < hiiChance) hiiSegments.add(seg);
    }

    for (let i = 0; i < starsPerArm; i++) {
      const t = i / starsPerArm;
      const theta = t * TAU * 2.5;
      const r = spiralStart * Math.exp(spiralTightness * theta);

      if (r > galaxyRadius || r < barLength * 0.5) continue;

      const baseAngle = theta + armOffset;
      const scatter = (Math.random() - 0.5 + Math.random() - 0.5) * armWidth;
      const scatterAngle = baseAngle + Math.PI / 2;
      const alongScatter = (Math.random() - 0.5) * 20;

      const x = Math.cos(baseAngle) * (r + alongScatter) + Math.cos(scatterAngle) * scatter;
      const z = Math.sin(baseAngle) * (r + alongScatter) + Math.sin(scatterAngle) * scatter;

      const actualRadius = Math.sqrt(x * x + z * z);
      const actualAngle = Math.atan2(z, x);
      const distFactor = actualRadius / galaxyRadius;

      const layer = assignLayer(Math.random());
      const segment = Math.floor(t * numSegments);
      const isHII = hiiSegments.has(segment) && Math.random() < 0.4;
      const props = layerProperties(layer);
      const hue = pickHue(layer, distFactor, isHII);

      stars.push({
        radius: actualRadius,
        angle: actualAngle,
        y: (Math.random() - 0.5) * 8 * (1 - t * 0.7),
        rotationSpeed: computeRotationSpeed(actualRadius),
        hue,
        brightness: props.brightness,
        size: props.size,
        alpha: props.alpha,
        layer,
        twinklePhase: Math.random() * TAU,
      });

      if (i % Math.max(1, Math.floor(starsPerArm / CONFIG.visual.nebulaGlowSamples)) === 0 && layer === "star") {
        armSamples.push({
          angle: baseAngle,
          r,
          isHII: hiiSegments.has(segment),
          hue: hiiSegments.has(segment)
            ? CONFIG.visual.hiiHueRange[0] + Math.random() * 20
            : CONFIG.visual.dustHueRange[0] + (arm * 30) % 40,
        });
      }
    }
    armPoints.push(armSamples);
  }

  // Field stars
  const fieldStars = Math.floor((totalStars - barStars) * 0.1);
  for (let i = 0; i < fieldStars; i++) {
    stars.push(generateFieldStar(galaxyRadius));
  }

  stars._armPoints = armPoints;
  return stars;
}

/**
 * Generates stars for an elliptical galaxy (Sersic-like distribution).
 *
 * @param {Object} p - Parameters
 * @returns {Object[]} Array of star objects
 */
function generateElliptical(p) {
  const stars = [];
  const galaxyRadius = p.galaxyRadius || 320;
  const axisRatio = p.axisRatio || 0.7;

  const n = p.starCount || 12000;
  for (let i = 0; i < n; i++) {
    const u = Math.random();
    const v = Math.random();
    const r = Math.pow(u, 0.4) * galaxyRadius;
    const theta = v * TAU;

    const x = r * Math.cos(theta);
    const z = r * Math.sin(theta) * axisRatio;

    const actualRadius = Math.sqrt(x * x + z * z);
    const actualAngle = Math.atan2(z, x);
    const distFactor = actualRadius / galaxyRadius;

    const layer = assignLayer(Math.random());
    const props = layerProperties(layer);
    const hue = pickHue(layer, distFactor, false);

    stars.push({
      radius: actualRadius,
      angle: actualAngle,
      y: (Math.random() - 0.5) * 20 * (1 - distFactor * 0.5),
      rotationSpeed: computeRotationSpeed(actualRadius) * 0.3,
      hue,
      brightness: props.brightness,
      size: props.size,
      alpha: props.alpha,
      layer,
      twinklePhase: Math.random() * TAU,
    });
  }

  stars._armPoints = [];
  return stars;
}

/**
 * Generates stars for an irregular galaxy (clumpy distribution).
 *
 * @param {Object} p - Parameters
 * @returns {Object[]} Array of star objects
 */
function generateIrregular(p) {
  const stars = [];
  const galaxyRadius = p.galaxyRadius || 280;
  const irregularity = p.irregularity || 0.8;
  const clumpCount = p.clumpCount || 5;

  const clumps = [];
  for (let c = 0; c < clumpCount; c++) {
    const angle = (c / clumpCount) * TAU + Math.random() * 0.5;
    const r = (0.2 + Math.random() * 0.6) * galaxyRadius;
    clumps.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      sigma: 30 + Math.random() * 80,
      weight: 0.5 + Math.random(),
      isHII: Math.random() < CONFIG.visual.hiiRegionChance,
    });
  }

  const n = p.starCount || 10000;

  for (let i = 0; i < n; i++) {
    let x, z, isHII = false;
    if (Math.random() < 1 - irregularity) {
      const idx = Math.floor(Math.random() * clumpCount);
      const c = clumps[idx];
      const gaussian = () => (Math.random() - 0.5 + Math.random() - 0.5) * 2;
      x = c.x + gaussian() * c.sigma;
      z = c.z + gaussian() * c.sigma;
      isHII = c.isHII && Math.random() < 0.4;
    } else {
      const angle = Math.random() * TAU;
      const r = Math.sqrt(Math.random()) * galaxyRadius;
      x = Math.cos(angle) * r + (Math.random() - 0.5) * 60;
      z = Math.sin(angle) * r + (Math.random() - 0.5) * 60;
    }

    const actualRadius = Math.sqrt(x * x + z * z);
    if (actualRadius > galaxyRadius * 1.1) continue;

    const actualAngle = Math.atan2(z, x);
    const distFactor = actualRadius / galaxyRadius;

    const layer = assignLayer(Math.random());
    const props = layerProperties(layer);
    const hue = pickHue(layer, distFactor, isHII);

    stars.push({
      radius: actualRadius,
      angle: actualAngle,
      y: (Math.random() - 0.5) * 25,
      rotationSpeed: computeRotationSpeed(actualRadius) * (0.5 + Math.random() * 0.5),
      hue,
      brightness: props.brightness,
      size: props.size,
      alpha: props.alpha,
      layer,
      twinklePhase: Math.random() * TAU,
    });
  }

  stars._armPoints = [];
  return stars;
}

/**
 * Generates a single field star (not in arms).
 *
 * @param {number} galaxyRadius - Maximum radius
 * @returns {Object} Star object
 */
function generateFieldStar(galaxyRadius) {
  const angle = Math.random() * TAU;
  const radius = Math.sqrt(Math.random()) * galaxyRadius;
  const y = (Math.random() - 0.5) * 15;
  const layer = assignLayer(Math.random());
  const distFactor = radius / galaxyRadius;
  const props = layerProperties(layer);

  return {
    radius,
    angle,
    y,
    rotationSpeed: computeRotationSpeed(radius),
    hue: CONFIG.visual.fieldHueRange[0] + Math.random() * (CONFIG.visual.fieldHueRange[1] - CONFIG.visual.fieldHueRange[0]),
    brightness: props.brightness,
    size: props.size,
    alpha: props.alpha,
    layer,
    twinklePhase: Math.random() * TAU,
  };
}

/**
 * Computes Keplerian rotation speed at given radius.
 *
 * @param {number} r - Orbital radius
 * @returns {number} Angular velocity
 */
function computeRotationSpeed(r) {
  const { baseSpeed, falloff, referenceRadius } = CONFIG.rotation;
  return baseSpeed / Math.pow(Math.max(r, referenceRadius) / referenceRadius, falloff);
}
