/**
 * Planetarium — Solar system data.
 *
 * Real orbital elements from NASA/JPL with aesthetic linear spacing.
 * Distances use ZDog-style linear spacing for visual clarity.
 * Sizes are small — planets are dots, gas giants slightly larger.
 * Periods use real ratios.
 *
 * @module planetarium/data
 */

const DEG = Math.PI / 180;

// ─────────────────────────────────────────────────────────────────────────────
// SUN
// ─────────────────────────────────────────────────────────────────────────────

export const SUN = {
  name: "Sun",
  display: {
    radius: 0.025,
    shaderType: "star",
    shaderUniforms: {
      uStarColor: [1.0, 0.85, 0.4],
      uTemperature: 5778,
      uActivityLevel: 0.4,
      uRotationSpeed: 0.3,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PLANETS
// ─────────────────────────────────────────────────────────────────────────────

// Aesthetic linear distances (pixels) — inspired by ZDog layout.
// Inner planets well-spaced, gas giants progressively farther.
// Real orbital elements (eccentricity, inclination, etc.) preserved.

export const PLANETS = [
  {
    name: "Mercury",
    orbit: {
      semiMajorAxis: 60,
      eccentricity: 0.2056,
      inclination: 7.005 * DEG,
      longitudeOfAscendingNode: 48.331 * DEG,
      argumentOfPeriapsis: 29.124 * DEG,
      period: 87.97,
    },
    display: {
      radius: 0.004,
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.55, 0.52, 0.50],
        uHasAtmosphere: 0.0,
        uSeed: 1.0,
      },
    },
    moons: [],
  },
  {
    name: "Venus",
    orbit: {
      semiMajorAxis: 85,
      eccentricity: 0.0068,
      inclination: 3.395 * DEG,
      longitudeOfAscendingNode: 76.680 * DEG,
      argumentOfPeriapsis: 54.884 * DEG,
      period: 224.7,
    },
    display: {
      radius: 0.006,
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.85, 0.65, 0.30],
        uHasAtmosphere: 1.0,
        uSeed: 2.0,
      },
    },
    moons: [],
  },
  {
    name: "Earth",
    orbit: {
      semiMajorAxis: 115,
      eccentricity: 0.0167,
      inclination: 0.0,
      longitudeOfAscendingNode: 0.0,
      argumentOfPeriapsis: 102.937 * DEG,
      period: 365.25,
    },
    display: {
      radius: 0.007,
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.2, 0.4, 0.8],
        uHasAtmosphere: 1.0,
        uSeed: 3.0,
      },
    },
    moons: [
      {
        name: "Moon",
        orbit: {
          semiMajorAxis: 14,
          eccentricity: 0.0549,
          inclination: 5.145 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 27.32,
        },
        display: {
          radius: 0.003,
          shaderType: "rockyPlanet",
          shaderUniforms: {
            uBaseColor: [0.7, 0.7, 0.7],
            uHasAtmosphere: 0.0,
            uSeed: 10.0,
          },
        },
      },
    ],
  },
  {
    name: "Mars",
    orbit: {
      semiMajorAxis: 145,
      eccentricity: 0.0934,
      inclination: 1.850 * DEG,
      longitudeOfAscendingNode: 49.558 * DEG,
      argumentOfPeriapsis: 286.502 * DEG,
      period: 686.97,
    },
    display: {
      radius: 0.005,
      shaderType: "rockyPlanet",
      shaderUniforms: {
        uBaseColor: [0.75, 0.35, 0.15],
        uHasAtmosphere: 0.0,
        uSeed: 4.0,
      },
    },
    moons: [],
  },
  {
    name: "Jupiter",
    orbit: {
      semiMajorAxis: 210,
      eccentricity: 0.0489,
      inclination: 1.303 * DEG,
      longitudeOfAscendingNode: 100.464 * DEG,
      argumentOfPeriapsis: 273.867 * DEG,
      period: 4332.59,
    },
    display: {
      radius: 0.015,
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.85, 0.65, 0.45],
        uSeed: 42.0,
        uStormIntensity: 0.7,
        uRotationSpeed: 1.2,
      },
    },
    moons: [
      {
        name: "Io",
        orbit: {
          semiMajorAxis: 18,
          eccentricity: 0.0041,
          inclination: 0.036 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 1.769,
        },
        display: {
          radius: 0.003,
          shaderType: "rockyPlanet",
          shaderUniforms: {
            uBaseColor: [0.9, 0.85, 0.35],
            uHasAtmosphere: 0.0,
            uSeed: 11.0,
          },
        },
      },
    ],
  },
  {
    name: "Saturn",
    orbit: {
      semiMajorAxis: 290,
      eccentricity: 0.0565,
      inclination: 2.485 * DEG,
      longitudeOfAscendingNode: 113.665 * DEG,
      argumentOfPeriapsis: 339.392 * DEG,
      period: 10759.22,
    },
    display: {
      radius: 0.012,
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.85, 0.75, 0.50],
        uSeed: 99.0,
        uStormIntensity: 0.3,
        uRotationSpeed: 1.0,
      },
      ring: {
        innerRadius: 1.15,
        outerRadius: 1.6,
        color: "rgba(220, 195, 140, 0.5)",
        tilt: 26.73 * DEG,
      },
    },
    moons: [
      {
        name: "Titan",
        orbit: {
          semiMajorAxis: 22,
          eccentricity: 0.0288,
          inclination: 0.33 * DEG,
          longitudeOfAscendingNode: 0,
          argumentOfPeriapsis: 0,
          period: 15.945,
        },
        display: {
          radius: 0.004,
          shaderType: "rockyPlanet",
          shaderUniforms: {
            uBaseColor: [0.85, 0.70, 0.40],
            uHasAtmosphere: 1.0,
            uSeed: 12.0,
          },
        },
      },
    ],
  },
  {
    name: "Uranus",
    orbit: {
      semiMajorAxis: 370,
      eccentricity: 0.0457,
      inclination: 0.773 * DEG,
      longitudeOfAscendingNode: 74.006 * DEG,
      argumentOfPeriapsis: 96.998 * DEG,
      period: 30688.5,
    },
    display: {
      radius: 0.010,
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.55, 0.75, 0.85],
        uSeed: 77.0,
        uStormIntensity: 0.1,
        uRotationSpeed: 0.6,
      },
    },
    moons: [],
  },
  {
    name: "Neptune",
    orbit: {
      semiMajorAxis: 440,
      eccentricity: 0.0113,
      inclination: 1.770 * DEG,
      longitudeOfAscendingNode: 131.784 * DEG,
      argumentOfPeriapsis: 276.336 * DEG,
      period: 60182.0,
    },
    display: {
      radius: 0.009,
      shaderType: "gasGiant",
      shaderUniforms: {
        uBaseColor: [0.25, 0.35, 0.75],
        uSeed: 55.0,
        uStormIntensity: 0.5,
        uRotationSpeed: 0.8,
      },
    },
    moons: [],
  },
];
