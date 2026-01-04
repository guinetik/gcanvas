/**
 * Genuary 2026 Prompts
 * Official prompts from genuary.art
 */

export const PROMPTS = {
  1: 'One color, one shape',
  2: 'Twelve principles of animation',
  3: 'Droste effect',
  4: 'Black on black',
  5: 'Isometric',
  6: 'Symmetry',
  7: 'Simple shapes',
  8: 'Noise',
  9: 'Organic forms',
  10: 'Generative music',
  11: 'Impossible objects',
  12: 'Grid',
  13: 'Triangles',
  14: 'Negative space',
  15: 'Design a rug',
  16: 'Loops',
  17: 'What happens if you rotate it?',
  18: 'Typography',
  19: 'Op art',
  20: 'Generative architecture',
  21: 'Combine two prompts',
  22: 'Shadows',
  23: 'Moire patterns',
  24: 'Density',
  25: 'One line',
  26: 'Generative portraits',
  27: 'Fractals',
  28: 'Skeuomorphism',
  29: 'Tesselation',
  30: 'Abstract landscape',
  31: 'Remix a classic'
};

/**
 * Get prompt for a specific day
 * @param {number} day - Day number (1-31)
 * @returns {string} The prompt text
 */
export function getPrompt(day) {
  return PROMPTS[day] || 'Coming soon...';
}

/**
 * Total number of Genuary days to display
 * (Showing first 4 for now, expand as implementations are added)
 */
export const TOTAL_DAYS = 4;
