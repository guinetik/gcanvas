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

/** Galaxy morphology presets with default parameters (Hubble–de Vaucouleurs sequence). */
export const GALAXY_PRESETS = {
  // ── Elliptical ──────────────────────────────────────────────────────────────
  elliptical: {
    label: "Elliptical (E)",
    type: "elliptical",
    numArms: 0,
    starCount: 24000,
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
  // ── Lenticular ──────────────────────────────────────────────────────────────
  lenticular: {
    label: "Lenticular (S0)",
    type: "lenticular",
    numArms: 0,
    starCount: 28000,
    galaxyRadius: 300,
    armWidth: 0,
    spiralTightness: 0,
    spiralStart: 0,
    fieldStarFraction: 0,
    bulgeRadius: 80,
    bulgeFraction: 0.4,
    diskThickness: 4,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0,
  },
  // ── Unbarred Spirals (SA sequence) ──────────────────────────────────────────
  spiralSa: {
    label: "Tight Spiral (SAa)",
    type: "spiral",
    numArms: 2,
    starCount: 30000,
    galaxyRadius: 320,
    armWidth: 25,
    spiralTightness: 0.14,
    spiralStart: 50,
    fieldStarFraction: 0.08,
    bulgeRadius: 70,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0,
  },
  spiral: {
    label: "Spiral (SAb)",
    type: "spiral",
    numArms: 2,
    starCount: 30000,
    galaxyRadius: 350,
    armWidth: 40,
    spiralTightness: 0.25,
    spiralStart: 30,
    fieldStarFraction: 0.15,
    bulgeRadius: 35,
    barLength: 0,
    ellipticity: 0,
    irregularity: 0,
  },
  grandDesign: {
    label: "Grand Design (SAc)",
    type: "spiral",
    numArms: 2,
    starCount: 36000,
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
    label: "Flocculent (SAd)",
    type: "spiral",
    numArms: 4,
    starCount: 32000,
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
  // ── Barred Spirals (SB sequence) ────────────────────────────────────────────
  barredTight: {
    label: "Barred Tight (SBa)",
    type: "barred",
    numArms: 2,
    starCount: 30000,
    galaxyRadius: 320,
    armWidth: 30,
    spiralTightness: 0.16,
    spiralStart: 60,
    fieldStarFraction: 0.06,
    bulgeRadius: 50,
    barLength: 140,
    barWidth: 30,
    ellipticity: 0,
    irregularity: 0,
  },
  barred: {
    label: "Barred Spiral (SBb)",
    type: "barred",
    numArms: 2,
    starCount: 32000,
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
  barredOpen: {
    label: "Barred Open (SBc)",
    type: "barred",
    numArms: 2,
    starCount: 34000,
    galaxyRadius: 380,
    armWidth: 60,
    spiralTightness: 0.35,
    spiralStart: 40,
    fieldStarFraction: 0.18,
    bulgeRadius: 0,
    barLength: 90,
    barWidth: 20,
    ellipticity: 0,
    irregularity: 0,
  },
  // ── Irregular ───────────────────────────────────────────────────────────────
  irregular: {
    label: "Irregular (Irr)",
    type: "irregular",
    numArms: 0,
    starCount: 20000,
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
  elliptical: [
    { key: "ellipticity", label: "ELLIPTICITY", default: 0.6, min: 0, max: 0.95, step: 0.05 },
    { key: "axisRatio", label: "AXIS RATIO b/a", default: 0.7, min: 0.2, max: 1, step: 0.05 },
  ],
  lenticular: [
    { key: "bulgeRadius", label: "BULGE SIZE", default: 80, min: 30, max: 140, step: 10 },
    { key: "bulgeFraction", label: "BULGE FRACTION", default: 0.4, min: 0.15, max: 0.7, step: 0.05 },
    { key: "diskThickness", label: "DISK THICKNESS", default: 4, min: 1, max: 12, step: 1 },
  ],
  spiralSa: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 4, step: 1 },
    { key: "armWidth", label: "ARM WIDTH", default: 25, min: 10, max: 60, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.14, min: 0.08, max: 0.25, step: 0.02 },
    { key: "bulgeRadius", label: "BULGE SIZE", default: 70, min: 30, max: 120, step: 10 },
    { key: "fieldStarFraction", label: "FIELD STARS", default: 0.08, min: 0, max: 0.2, step: 0.02 },
  ],
  spiral: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 6, step: 1 },
    { key: "armWidth", label: "ARM WIDTH", default: 40, min: 15, max: 90, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.25, min: 0.1, max: 0.5, step: 0.02 },
    { key: "spiralStart", label: "INNER RADIUS", default: 30, min: 10, max: 80, step: 5 },
    { key: "bulgeRadius", label: "BULGE SIZE", default: 35, min: 0, max: 80, step: 5 },
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
  barredTight: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 4, step: 1 },
    { key: "barLength", label: "BAR LENGTH", default: 140, min: 60, max: 220, step: 10 },
    { key: "barWidth", label: "BAR WIDTH", default: 30, min: 15, max: 60, step: 5 },
    { key: "armWidth", label: "ARM WIDTH", default: 30, min: 15, max: 60, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.16, min: 0.08, max: 0.3, step: 0.02 },
    { key: "bulgeRadius", label: "BULGE SIZE", default: 50, min: 20, max: 90, step: 10 },
  ],
  barred: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 4, step: 1 },
    { key: "barLength", label: "BAR LENGTH", default: 120, min: 40, max: 200, step: 10 },
    { key: "barWidth", label: "BAR WIDTH", default: 25, min: 10, max: 60, step: 5 },
    { key: "armWidth", label: "ARM WIDTH", default: 45, min: 20, max: 80, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.28, min: 0.15, max: 0.45, step: 0.02 },
  ],
  barredOpen: [
    { key: "numArms", label: "ARMS", default: 2, min: 1, max: 4, step: 1 },
    { key: "barLength", label: "BAR LENGTH", default: 90, min: 30, max: 160, step: 10 },
    { key: "barWidth", label: "BAR WIDTH", default: 20, min: 8, max: 40, step: 4 },
    { key: "armWidth", label: "ARM WIDTH", default: 60, min: 30, max: 100, step: 5 },
    { key: "spiralTightness", label: "PITCH", default: 0.35, min: 0.2, max: 0.5, step: 0.02 },
    { key: "fieldStarFraction", label: "FIELD STARS", default: 0.18, min: 0, max: 0.35, step: 0.05 },
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
  nebula: {
    enabled: true,
    intensity: 0.4,
    seed: 0,
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
