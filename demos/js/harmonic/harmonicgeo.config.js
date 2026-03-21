/**
 * Harmonic Geometries — Configuration.
 *
 * Fixed arm radii and speeds matching the original project's dramatic
 * scaling: large outer arms with tiny, blazing-fast inner arms that
 * create intricate detail. All arms share the same polygon shape.
 *
 * @module harmonic/harmonicgeo.config
 */

/** Fixed arm radii — decreasing dramatically for fine detail. */
export const ALL_RADII = [3.0, 1.2, 0.5, 0.2, 0.08, 0.03];

/** Fixed arm speeds — alternating sign, powers-of-4 growth. */
export const ALL_SPEEDS = [1, -7, 31, -127, 511, -2047];

/** Available polygon shapes. sides=0 means circle. */
export const SHAPES = [
  { label: "Circle",   sides: 0 },
  { label: "Triangle", sides: 3 },
  { label: "Square",   sides: 4 },
  { label: "Pentagon", sides: 5 },
  { label: "Hexagon",  sides: 6 },
];

/**
 * Trail color themes — each is a list of [r, g, b] stops
 * interpolated along the fade value (0 = tail, 1 = tip).
 */
export const THEMES = {
  terminal: [
    [0, 20, 0],
    [0, 80, 0],
    [0, 180, 20],
    [0, 255, 0],
    [160, 255, 160],
    [230, 255, 230],
  ],
  plasma: [
    [20, 0, 0],
    [160, 0, 0],
    [255, 80, 0],
    [255, 180, 0],
    [255, 240, 100],
    [255, 255, 255],
  ],
  ocean: [
    [0, 0, 20],
    [0, 20, 80],
    [0, 80, 160],
    [0, 180, 220],
    [100, 240, 255],
    [255, 255, 255],
  ],
  rainbow: [
    [255, 0, 0],
    [255, 127, 0],
    [255, 255, 0],
    [0, 255, 0],
    [0, 0, 255],
    [148, 0, 211],
  ],
  inferno: [
    [0, 0, 4],
    [40, 11, 84],
    [101, 21, 110],
    [212, 72, 66],
    [245, 125, 21],
    [252, 255, 164],
  ],
  ice: [
    [0, 0, 30],
    [20, 40, 100],
    [40, 100, 180],
    [80, 180, 220],
    [180, 240, 255],
    [255, 255, 255],
  ],
};

/** Main configuration. */
export const CONFIG = {
  maxPoints: 60000,
  defaultSpeed: 0.2,
  defaultNumCircles: 6,
  defaultSides: 0,
  defaultFade: 1.0,
  defaultRadius: 3.0,
  defaultTheme: "terminal",
  defaultSpread: 1.0,

  /** Scale factor: world units → pixels. */
  worldScale: 55,

  /** Arm visuals */
  arms: {
    strokeAlpha: 0.18,
    lineAlpha: 0.4,
    lineWidth: 1,
  },

  /** Pen dot at the tip */
  pen: {
    radius: 3,
    glowRadius: 12,
  },

  /** Trail rendering — two-pass: thick dim glow + thin bright core. */
  trail: {
    batchSize: 120,
    glowWidth: 6,
    glowAlphaScale: 0.3,
    coreWidth: 1.2,
    coreAlphaBase: 0.15,
    coreAlphaScale: 0.85,
  },

  colors: {
    background: "#050508",
    armStroke: "rgba(0, 255, 0, 0.18)",
    armLine: "rgba(0, 255, 0, 0.4)",
    penCore: [200, 255, 200],
    penGlow: [0, 255, 0],
  },

  panel: {
    width: 260,
    padding: 14,
    marginRight: 16,
    marginTop: 16,
    spacing: 10,
    mobilePadding: 12,
    mobileMaxHeight: 0.85,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },

  toggle: {
    margin: 12,
    width: 44,
    height: 44,
  },
};
