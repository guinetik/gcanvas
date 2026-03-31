/**
 * Planetarium — Configuration constants.
 *
 * @module planetarium/config
 */

export const CONFIG = {
  camera: {
    perspective: 800,
    rotationX: 0.55,
    rotationY: -0.4,
    minRotationX: -1.2,
    maxRotationX: 1.2,
    inertia: true,
    friction: 0.94,
    autoRotate: true,
    autoRotateSpeed: 0.1,
    autoRotateAxis: "y",
    velocityScale: 2.0,
  },

  zoom: {
    min: 0.2,
    max: 6.0,
    speed: 0.5,
    easing: 0.1,
    baseScreenSize: 900,
  },

  pan: {
    speed: 1.5,
    easing: 0.1,
  },

  time: {
    scale: 12.0,
  },

  display: {
    orbitPathSegments: 128,
    orbitPathColor: "rgba(255, 255, 255, 0.18)",
    orbitPathLineWidth: 1.0,
    moonOrbitPathColor: "rgba(255, 255, 255, 0.10)",
    moonOrbitPathLineWidth: 0.6,

    sunGlow: {
      layers: 3,
      baseAlpha: 0.08,
      baseSize: 1.6,
      color: [1.0, 0.75, 0.3],
    },

    starfield: {
      count: 400,
      minBrightness: 0.3,
      maxBrightness: 0.9,
      minSize: 0.5,
      maxSize: 1.8,
    },

    labels: {
      font: "11px monospace",
      color: "#999999",
      offsetY: 18,
    },
  },
};
