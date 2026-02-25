/**
 * Galaxy Playground — Configuration constants.
 *
 * Centralizes presets and parameter definitions for galaxy morphology.
 * Uses Hubble classification: Spiral (S), Barred Spiral (SB), Elliptical (E),
 * and Irregular (Irr) types with scientifically-inspired parameters.
 *
 * @module galaxy/galaxy.config
 */

// ─────────────────────────────────────────────────────────────────────────────
// GALAXY TYPE PRESETS (Hubble sequence)
// ─────────────────────────────────────────────────────────────────────────────

/** Galaxy morphology presets with default parameters. */
export const GALAXY_PRESETS = {
  spiral: {
    label: "Spiral (S)",
    type: "spiral",
    numArms: 2,
    starCount: 15000,
    galaxyRadius: 350,
    armWidth: 40,
    spiralTightness: 0.25,
    spiralStart: 30,
    fieldStarFraction: 0.15,
    bulgeRadius: 0,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0,
  },
  grandDesign: {
    label: "Grand Design (Sc)",
    type: "spiral",
    numArms: 2,
    starCount: 18000,
    galaxyRadius: 380,
    armWidth: 55,
    spiralTightness: 0.22,
    spiralStart: 25,
    fieldStarFraction: 0.12,
    bulgeRadius: 0,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0,
  },
  flocculent: {
    label: "Flocculent (Sd)",
    type: "spiral",
    numArms: 4,
    starCount: 16000,
    galaxyRadius: 360,
    armWidth: 65,
    spiralTightness: 0.3,
    spiralStart: 40,
    fieldStarFraction: 0.25,
    bulgeRadius: 0,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0.15,
  },
  barred: {
    label: "Barred Spiral (SB)",
    type: "barred",
    numArms: 2,
    starCount: 16000,
    galaxyRadius: 350,
    armWidth: 45,
    spiralTightness: 0.28,
    spiralStart: 50,
    fieldStarFraction: 0.1,
    bulgeRadius: 35,
    barLength: 120,
    barWidth: 25,
    ellipticity: 0,
    irregularity: 0,
  },
  elliptical: {
    label: "Elliptical (E)",
    type: "elliptical",
    numArms: 0,
    starCount: 12000,
    galaxyRadius: 320,
    armWidth: 0,
    spiralTightness: 0,
    spiralStart: 0,
    fieldStarFraction: 1,
    bulgeRadius: 0,
    barLength: 0,
    ellipticity: 0.6,
    axisRatio: 0.7,
    irregularity: 0,
  },
  irregular: {
    label: "Irregular (Irr)",
    type: "irregular",
    numArms: 0,
    starCount: 10000,
    galaxyRadius: 280,
    armWidth: 0,
    spiralTightness: 0,
    spiralStart: 0,
    fieldStarFraction: 1,
    bulgeRadius: 0,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0.8,
    clumpCount: 5,
  },
};

/** Per-type parameter definitions for dynamic sliders. */
export const GALAXY_PARAMS = {
  spiral: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 6, step: 1 },
    { key: "armWidth", label: "ARM WIDTH", default: 40, min: 15, max: 90, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.25, min: 0.1, max: 0.5, step: 0.02 },
    { key: "spiralStart", label: "INNER RADIUS", default: 30, min: 10, max: 80, step: 5 },
    { key: "fieldStarFraction", label: "FIELD STARS", default: 0.15, min: 0, max: 0.4, step: 0.05 },
  ],
  grandDesign: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 4, step: 1 },
    { key: "armWidth", label: "ARM WIDTH", default: 55, min: 30, max: 100, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.22, min: 0.1, max: 0.4, step: 0.02 },
    { key: "fieldStarFraction", label: "FIELD STARS", default: 0.12, min: 0, max: 0.3, step: 0.05 },
  ],
  flocculent: [
    { key: "numArms", label: "ARMS", default: 4, min: 2, max: 8, step: 1 },
    { key: "armWidth", label: "ARM WIDTH", default: 65, min: 40, max: 120, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.3, min: 0.15, max: 0.5, step: 0.02 },
    { key: "irregularity", label: "IRREGULARITY", default: 0.15, min: 0, max: 0.5, step: 0.05 },
  ],
  barred: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 4, step: 1 },
    { key: "barLength", label: "BAR LENGTH", default: 120, min: 40, max: 200, step: 10 },
    { key: "barWidth", label: "BAR WIDTH", default: 25, min: 10, max: 60, step: 5 },
    { key: "armWidth", label: "ARM WIDTH", default: 45, min: 20, max: 80, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.28, min: 0.15, max: 0.45, step: 0.02 },
  ],
  elliptical: [
    { key: "ellipticity", label: "ELLIPTICITY", default: 0.6, min: 0, max: 0.95, step: 0.05 },
    { key: "axisRatio", label: "AXIS RATIO b/a", default: 0.7, min: 0.2, max: 1, step: 0.05 },
  ],
  irregular: [
    { key: "irregularity", label: "IRREGULARITY", default: 0.8, min: 0.3, max: 1, step: 0.1 },
    { key: "clumpCount", label: "CLUMPS", default: 5, min: 2, max: 12, step: 1 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONFIG
// ─────────────────────────────────────────────────────────────────────────────

/** Main configuration for the Galaxy Playground demo. */
export const CONFIG = {
  rotation: {
    baseSpeed: 0.033,
    falloff: 0.35,
    referenceRadius: 20,
  },
  blackHole: {
    radius: 12,
    accretionDiskRadius: 70,   // was 50
    accretionHue: 30,
    jetLength: 120,
    jetWidth: 8,
    jetAlpha: 0.15,
  },
  visual: {
    armHue: 210,
    coreStarHue: 50,
    diskThickness: 8,
    // Layer distribution (fractions of total starCount)
    dustFraction: 0.65,
    brightFraction: 0.03,
    // starFraction is implicitly 1 - dustFraction - brightFraction
    // Color ranges per region
    coreHueRange: [40, 60],       // warm gold/amber
    armHueRange: [200, 240],      // blue-white young stars
    hiiHueRange: [320, 340],      // pink/magenta HII regions
    fieldHueRange: [10, 30],      // cool red-orange old stars
    dustHueRange: [240, 280],     // faint blue-violet nebular
    // HII region clustering
    hiiRegionChance: 0.15,        // chance per arm segment
    hiiClusterSize: 30,           // scatter radius for HII cluster
    // Nebular glow
    nebulaGlowSamples: 20,       // points per arm for glow pass
    nebulaGlowRadius: 60,        // radius of each glow sample
    nebulaGlowAlpha: 0.04,       // alpha per glow sample
  },
  camera: {
    perspective: 600,
    initialTiltX: 0.6,
    maxTilt: 1.4,
    sensitivity: 0.002,
    inertia: true,
    friction: 0.92,
  },
  zoom: {
    min: 0.3,
    max: 2.5,
    speed: 0.5,
    easing: 0.12,
  },
  panel: {
    width: 280,
    padding: 14,
    marginRight: 16,
    marginTop: 16,
    spacing: 10,
    mobilePadding: 12,
    mobileMaxHeight: 0.85,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  toggle: {
    margin: 12,
    width: 44,
    height: 44,
  },
};
