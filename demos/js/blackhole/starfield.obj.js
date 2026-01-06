/**
 * StarField - 3D volumetric starfield
 * 
 * Features:
 * - Prerendered sprites for high performance (5000+ stars).
 * - Scientific spectral color distribution (O, B, A, F, G, K, M).
 * - Authentic twinkle animation.
 * - Spherical distribution for consistent background density.
 */
import { GameObject, Painter } from "../../../src/index.js";

// Spectral types: Color and "Aesthetic" rarity (skewed slightly from reality for better visuals)
const SPECTRAL_TYPES = [
  { type: 'O', color: '#9bb0ff', weight: 0.01, baseSize: 5.0 }, // Blue (Hot/Big)
  { type: 'B', color: '#aabfff', weight: 0.05, baseSize: 4.0 },
  { type: 'A', color: '#cad7ff', weight: 0.15, baseSize: 3.5 },
  { type: 'F', color: '#f8f7ff', weight: 0.20, baseSize: 3.0 },
  { type: 'G', color: '#fff4ea', weight: 0.20, baseSize: 2.8 }, // Sun-like
  { type: 'K', color: '#ffd2a1', weight: 0.25, baseSize: 2.5 },
  { type: 'M', color: '#ffcc6f', weight: 0.14, baseSize: 2.2 } // Red (Cool/Small)
];

const CONFIG = {
  starCount: 5000,
  minDist: 4000,
  maxDist: 10000,
  // Global size multiplier (applied to spectral baseSize)
  scaleMultiplier: 2.0
};

export class StarField extends GameObject {
  /**
   * @param {Game} game
   * @param {Object} options
   * @param {Camera3D} options.camera
   * @param {number} [options.starCount] - Number of stars
   * @param {number} [options.distanceScale=1.0] - Scale factor for star distances (lower = closer stars)
   */
  constructor(game, options = {}) {
    super(game, options);
    this.camera = options.camera;
    this.zIndex = -1000;

    this.starCount = options.starCount || CONFIG.starCount;
    this.distanceScale = options.distanceScale ?? 1.0;
    this.stars = [];

    // Cache for pre-rendered star sprites
    // Map<Color, HTMLCanvasElement>
    this.sprites = new Map();
  }

  init() {
    this.preRenderSprites();
    this.generateStarfield();
  }

  /**
   * Pre-render star sprites for each spectral type.
   * Drawing images is much faster than running context state changes and arc() commands per star.
   */
  preRenderSprites() {
    for (const type of SPECTRAL_TYPES) {
      const size = 32; // Texture size (enough for glow)
      const center = size / 2;
      const radius = size / 4; // Actual core radius

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Soft glow
      const grad = ctx.createRadialGradient(center, center, 0, center, center, size / 2);
      grad.addColorStop(0, type.color);
      grad.addColorStop(0.2, type.color); // Solid core
      grad.addColorStop(0.5, this.adjustAlpha(type.color, 0.3)); // Glow
      grad.addColorStop(1, this.adjustAlpha(type.color, 0)); // Fade out

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center, center, size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Store sprite associated with this spectral type index
      this.sprites.set(type.type, canvas);
    }
  }

  // Helper to add alpha to hex color
  adjustAlpha(hex, alpha) {
    // rudimentary hex to rgba conversion
    // Assuming hex is #RRGGBB
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  generateStarfield() {
    this.stars = [];

    // Create cumulative weights for random selection
    const totalWeight = SPECTRAL_TYPES.reduce((sum, t) => sum + t.weight, 0);

    // Apply distance scale for different camera perspectives
    const minDist = CONFIG.minDist * this.distanceScale;
    const maxDist = CONFIG.maxDist * this.distanceScale;

    for (let i = 0; i < this.starCount; i++) {
      // distribute stars in a spherical shell
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = minDist + Math.random() * (maxDist - minDist);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      // Pick spectral type
      const rand = Math.random() * totalWeight;
      let accum = 0;
      let selectedType = SPECTRAL_TYPES[SPECTRAL_TYPES.length - 1]; // Default
      for (const t of SPECTRAL_TYPES) {
        accum += t.weight;
        if (rand < accum) {
          selectedType = t;
          break;
        }
      }

      // Twinkle properties
      const twinkleSpeed = 0.5 + Math.random() * 2.0;    // How fast it pulses
      const twinklePhase = Math.random() * Math.PI * 2;  // Offset so they don't pulse in sync

      this.stars.push({
        x, y, z,
        type: selectedType,
        twinkleSpeed,
        twinklePhase,
        // Random slight variations in size even within same class
        baseScale: (0.8 + Math.random() * 0.4) * CONFIG.scaleMultiplier
      });
    }
  }

  render() {
    super.render();
    if (!this.camera) return;

    const cx = this.game.width / 2;
    const cy = this.game.height / 2;
    const time = performance.now() / 1000;

    Painter.useCtx((ctx) => {
      // Use efficient composition
      // 'lighter' gives a nice additive look for stars overlapping, or 'source-over' for standard
      ctx.globalCompositeOperation = 'source-over';

      for (const star of this.stars) {
        // Project
        const p = this.camera.project(star.x, star.y, star.z);

        // Cull (behind camera)
        if (p.z < -this.camera.perspective + 50) continue;

        // Viewport cull (loose bounds)
        const x = cx + p.x;
        const y = cy + p.y;
        if (x < -30 || x > this.game.width + 30 || y < -30 || y > this.game.height + 30) continue;

        // Calculate Twinkle
        // Sine wave mapped to [0.3, 1.0] range mainly, occasionally dipping lower
        const val = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = 0.6 + 0.4 * val; // Min brightness 0.2

        // Don't draw invisible stars
        if (alpha < 0.1) continue;

        // Visual Size
        // p.scale is usually around 0.1-0.2 for distant stars
        // star.baseScale is ~2.0
        // Resulting size ~ 0.2 * 2.0 * 32 (sprite size) which is huge. 
        // We want the *drawn size* to be small, but the sprite is high quality.
        // Let's say we want a star to be 6px on screen.
        // 6px / 32px (sprite) = 0.18 draw scale

        const finalSize = star.type.baseSize * star.baseScale * p.scale;

        const sprite = this.sprites.get(star.type.type);
        if (!sprite) continue;

        // Center the sprite
        // Determine draw dimension. 
        // We used 32px sprite.
        // We want final visual size to be `finalSize`.

        // Optimization: if tiny, skip drawImage and justfillRect?
        // With 5000 stars, drawImage is fast enough if not scaling huge images.

        ctx.globalAlpha = alpha;

        // Draw centered
        ctx.drawImage(
          sprite,
          x - finalSize * 2,
          y - finalSize * 2,
          finalSize * 4, // Make sprite larger than "size" to account for glow
          finalSize * 4
        );
      }

      // Reset
      ctx.globalAlpha = 1.0;
    });
  }
}

