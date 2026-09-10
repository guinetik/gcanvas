/** Art direction for the shared attractor renderer; independent of fluid physics. */
export const PALETTES = {
  copper: { label: "Copper Tide", minHue: 26, maxHue: 210, saturation: 76, lightness: 55, banded: true },
  ice: { label: "Ion Ice", minHue: 180, maxHue: 235, saturation: 92, lightness: 56 },
  orchid: { label: "Electric Orchid", minHue: 325, maxHue: 235, saturation: 88, lightness: 56 },
  aurora: { label: "Aurora", minHue: 165, maxHue: 95, saturation: 84, lightness: 54 },
  solar: { label: "Solar Flare", minHue: 395, maxHue: 350, saturation: 94, lightness: 55 },
  pearl: { label: "Moonstone", minHue: 205, maxHue: 245, saturation: 14, lightness: 72 },
};

export const LOOKS = {
  filament: {
    label: "Filament",
    bloom: { strength: 0.3, threshold: 0.3, radius: 0.5 },
    glow: { intensity: 0, radius: 18 },
    energy: { intensity: 0, speed: 0, sparkThreshold: 1.1 },
    iridescence: { enabled: false, intensity: 0, speed: 0.2, scale: 2.5 },
  },
  neon: {
    label: "Neon",
    bloom: { strength: 0.55, threshold: 0.22, radius: 0.8 },
    glow: { intensity: 0.7, radius: 28 },
    energy: { intensity: 0.12, speed: 0.65, sparkThreshold: 1.1 },
    iridescence: { enabled: false, intensity: 0, speed: 0.2, scale: 2.5 },
  },
  nebula: {
    label: "Nebula",
    bloom: { strength: 0.85, threshold: 0.18, radius: 1.2 },
    glow: { intensity: 0.95, radius: 52 },
    energy: { intensity: 0.18, speed: 0.45, sparkThreshold: 1.1 },
    iridescence: { enabled: true, intensity: 0.2, speed: 0.2, scale: 2.5 },
  },
};
