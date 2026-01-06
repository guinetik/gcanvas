/**
 * Genuary 2026 Prompts
 * Official prompts from genuary.art
 */

export const PROMPTS = {
  1: 'One color, one shape',
  2: 'Twelve principles of animation',
  3: 'Fibonacci forever',
  4: 'Lowres',
  5: 'Write "Genuary" (no fonts)',
  6: 'Lights on/off',
  7: 'Boolean algebra',
  8: 'A City',
  9: 'Crazy automaton',
  10: 'Polar coordinates',
  11: 'Quine',
  12: 'Boxes only',
  13: 'Self portrait',
  14: 'Everything fits perfectly',
  15: 'Invisible object (shadows)',
  16: 'Order and disorder',
  17: 'Wallpaper group',
  18: 'Unexpected path',
  19: '16x16',
  20: 'One line',
  21: 'Bauhaus Poster',
  22: 'Pen plotter ready',
  23: 'Transparency',
  24: "Perfectionist's nightmare",
  25: 'Organic Geometry',
  26: 'Recursive Grids',
  27: 'Lifeform',
  28: 'No libraries, only HTML',
  29: 'Genetic evolution',
  30: "It's not a bug, it's a feature",
  31: 'GLSL day'
};

/**
 * Creative interpretations for each day
 * One-liner descriptions of our visualization approach
 */
export const INTERPRETATIONS = {
  1: 'Infinite green circles form a twisting wormhole through space',
  2: 'Follow-through and overlapping action: how motion ripples through a chain',
  3: 'Phyllotaxis: the Fibonacci spiral pattern you see in sunflowers and pinecones',
  4: 'Banksy-inspired street art wall: infinite scrolling pixelated patterns on a midnight sidewalk',
  5: 'Pixel-art letters defined in code, rendered as 3D particles. Inspired by the title sequence from the TV show "Pluribus".',
  6: 'A digital lava lamp: toggle the "lights" to fade the heat, glow, and motion in/out',
  7: 'A flowing logic gate circuit: parse an expression into an AST and animate signals propagating through the wires',
  8: 'Create a generative metropolis - buildings, streets, and urban sprawl',
  9: 'Cellular automata with crazy rules - go beyond Conway\'s Game of Life',
  10: 'Visualizations driven by polar coordinate systems (r, θ) instead of cartesian (x, y)',
  11: 'A Quine is code poetry: a program that outputs exactly its own source code',
  12: 'Compositions made entirely from rectangular boxes',
  13: 'Generative self-portrait: start with basic shapes, add features that look like you',
  14: 'Perfect tessellation where every piece fits exactly with no gaps',
  15: 'An invisible object revealed only by the shadows it casts',
  16: 'The tension and interplay between order and chaos',
  17: 'One of 17 ways to tile a plane with repeating patterns (or 35 if you count symmetries)',
  18: 'Draw a route that changes direction based on one simple rule',
  19: 'Create something within a 16×16 pixel constraint',
  20: 'An artwork made from a single continuous line',
  21: 'Poster design inspired by the German Bauhaus art school aesthetic',
  22: 'Vector art suitable for pen plotter output - clean lines, no fills',
  23: 'Explore layering, alpha, and the concept of see-through',
  24: 'Imperfection, asymmetry, and controlled chaos',
  25: 'Forms that look organic but are constructed from geometric shapes',
  26: 'Split the canvas into a grid and recurse on each cell again and again',
  27: 'A shape or structure that behaves as if alive or growing',
  28: 'No canvas, no libraries - only HTML elements like <div>. Can you do it?',
  29: 'Genetic algorithms: selection, crossover, and mutation',
  30: 'Embrace the glitch - make unexpected behavior into art',
  31: 'Pure shader art - create using only GLSL'
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
export const TOTAL_DAYS = 5;
