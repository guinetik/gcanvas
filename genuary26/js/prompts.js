/**
 * Genuary 2026 Prompts
 * Official prompts from genuary.art
 */

export const PROMPTS = {
  1: 'One color, one shape',
  2: 'Twelve principles of animation',
  3: 'Fibonacci forever',
  4: 'Black on black',
  5: 'Write "Genuary". Avoid using a font.',
  6: 'Lights on/off. Make something that changes when you switch on or off the “digital” lights',
  7: 'Boolean algebra. Get inspired by Boolean algebra, in any way.',
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
 * Creative interpretations for each day
 * One-liner descriptions of our visualization approach
 */
export const INTERPRETATIONS = {
  1: 'Infinite green circles form a twisting wormhole through space',
  2: 'Follow-through and overlapping action: how motion ripples through a chain',
  3: 'Phyllotaxis: the Fibonacci spiral pattern you see in sunflowers and pinecones',
  4: 'Dark particles emerge from the void, revealed by your cursor',
  5: 'Pixel-art letters defined in code, rendered as 3D particles. Inspired by the title sequence from the TV show "Pluribus".',
  6: 'Make something that changes when you switch on or off the “digital” lights. A digital lava lamp: toggle the “lights” to fade the heat, glow, and motion in/out',
  7: 'A flowing logic gate circuit: parse an expression into an AST and animate signals propagating through the wires',
  8: 'Coming soon...',
  9: 'Coming soon...',
  10: 'Coming soon...',
  11: 'Coming soon...',
  12: 'Coming soon...',
  13: 'Coming soon...',
  14: 'Coming soon...',
  15: 'Coming soon...',
  16: 'Coming soon...',
  17: 'Coming soon...',
  18: 'Coming soon...',
  19: 'Coming soon...',
  20: 'Coming soon...',
  21: 'Coming soon...',
  22: 'Coming soon...',
  23: 'Coming soon...',
  24: 'Coming soon...',
  25: 'Coming soon...',
  26: 'Coming soon...',
  27: 'Coming soon...',
  28: 'Coming soon...',
  29: 'Coming soon...',
  30: 'Coming soon...',
  31: 'Coming soon...'
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
 * Get interpretation for a specific day
 * @param {number} day - Day number (1-31)
 * @returns {string} The interpretation text
 */
export function getInterpretation(day) {
  return INTERPRETATIONS[day] || 'Coming soon...';
}

/**
 * Total number of Genuary days to display
 * (Expand as implementations are added)
 */
export const TOTAL_DAYS = 7;
