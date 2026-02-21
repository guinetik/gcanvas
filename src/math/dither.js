/**
 * Dither - Static class providing dithering algorithms.
 *
 * All dither methods accept a Float32Array source (0-1 range)
 * and return Uint8ClampedArray (RGBA), matching the Patterns class convention.
 */
export class Dither {
  /**
   * Returns the precomputed 8x8 Bayer threshold matrix.
   * @returns {number[][]} 8x8 matrix with values 0-63
   */
  static bayer8Matrix() {
    if (Dither._bayer8) return Dither._bayer8;
    const b2 = [
      [0, 2],
      [3, 1],
    ];
    const expand = (prev, size) => {
      const next = Array.from({ length: size * 2 }, () => new Array(size * 2));
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const v = prev[y][x] * 4;
          next[y][x] = v;
          next[y][x + size] = v + 2;
          next[y + size][x] = v + 3;
          next[y + size][x + size] = v + 1;
        }
      }
      return next;
    };
    let m = b2;
    m = expand(m, 2);
    m = expand(m, 4);
    Dither._bayer8 = m;
    return m;
  }

  /**
   * Generates a blue noise texture using void-and-cluster approximation.
   * @param {number} size - Width/height of the texture
   * @returns {Float32Array} size*size array of values 0-1
   */
  static generateBlueNoise(size) {
    const noise = new Float32Array(size * size);
    for (let i = 0; i < noise.length; i++) {
      noise[i] = Math.random();
    }
    const golden = 0.7548776662466927;
    for (let i = 0; i < noise.length; i++) {
      noise[i] = (noise[i] + golden * i) % 1.0;
    }
    return noise;
  }

  /**
   * Generates a procedural grayscale radial gradient source.
   * @param {number} width
   * @param {number} height
   * @param {number} [time=0] - Animation time parameter
   * @returns {Float32Array} width*height array of values 0-1
   */
  static generateSource(width, height, time = 0) {
    const data = new Float32Array(width * height);
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const angle = Math.atan2(dy, dx);
        const wave = Math.sin(angle * 3 + time * 0.02) * 0.15;
        const radial = Math.sin(dist * Math.PI * 2.5 - time * 0.015) * 0.3;
        let v = 1.0 - dist + wave + radial;
        v = Math.max(0, Math.min(1, v));
        data[y * width + x] = v;
      }
    }
    return data;
  }

  /**
   * Generates a procedural RGB color source.
   * @param {number} width
   * @param {number} height
   * @param {number} [time=0] - Animation time parameter
   * @returns {Float32Array} width*height*3 array of RGB values 0-1
   */
  static generateColorSource(width, height, time = 0) {
    const data = new Float32Array(width * height * 3);
    const cx = width / 2;
    const cy = height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const angle = Math.atan2(dy, dx);
        const idx = (y * width + x) * 3;

        const r = Math.sin(angle + time * 0.01) * 0.5 + 0.5;
        const g = Math.sin(dist * Math.PI * 2 - time * 0.015) * 0.5 + 0.5;
        const b = Math.cos(angle * 2 + dist * 3 + time * 0.008) * 0.5 + 0.5;

        data[idx] = r * (1 - dist * 0.5);
        data[idx + 1] = g * (1 - dist * 0.3);
        data[idx + 2] = b * (1 - dist * 0.4);
      }
    }
    return data;
  }

  /**
   * Ordered dithering using Bayer 8x8 threshold matrix.
   * @param {Float32Array} source - Grayscale values 0-1
   * @param {number} width
   * @param {number} height
   * @returns {Uint8ClampedArray} RGBA pixel data
   */
  static bayer(source, width, height) {
    const matrix = Dither.bayer8Matrix();
    const out = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = source[y * width + x];
        const threshold = matrix[y % 8][x % 8] / 64.0;
        const pixel = v > threshold ? 255 : 0;
        const idx = (y * width + x) * 4;
        out[idx] = pixel;
        out[idx + 1] = pixel;
        out[idx + 2] = pixel;
        out[idx + 3] = 255;
      }
    }
    return out;
  }

  /**
   * Blue noise threshold dithering.
   * @param {Float32Array} source - Grayscale values 0-1
   * @param {number} width
   * @param {number} height
   * @param {object} [opts]
   * @param {Float32Array} [opts.noiseTexture] - Pre-generated blue noise
   * @param {number} [opts.noiseSize=64] - Size of the noise texture
   * @returns {Uint8ClampedArray} RGBA pixel data
   */
  static blueNoise(source, width, height, opts = {}) {
    const noiseSize = opts.noiseSize || 64;
    const noise = opts.noiseTexture || Dither._getBlueNoise(noiseSize);
    const out = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = source[y * width + x];
        const noiseIdx = (y % noiseSize) * noiseSize + (x % noiseSize);
        const threshold = noise[noiseIdx];
        const pixel = v > threshold ? 255 : 0;
        const idx = (y * width + x) * 4;
        out[idx] = pixel;
        out[idx + 1] = pixel;
        out[idx + 2] = pixel;
        out[idx + 3] = 255;
      }
    }
    return out;
  }

  /**
   * Floyd-Steinberg error diffusion dithering.
   * @param {Float32Array} source - Grayscale values 0-1
   * @param {number} width
   * @param {number} height
   * @returns {Uint8ClampedArray} RGBA pixel data
   */
  static floydSteinberg(source, width, height) {
    const err = new Float32Array(source);
    const out = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const old = err[i];
        const newVal = old > 0.5 ? 1.0 : 0.0;
        const e = old - newVal;

        const pixel = newVal * 255;
        const idx = i * 4;
        out[idx] = pixel;
        out[idx + 1] = pixel;
        out[idx + 2] = pixel;
        out[idx + 3] = 255;

        if (x + 1 < width) err[i + 1] += (e * 7) / 16;
        if (y + 1 < height) {
          if (x - 1 >= 0) err[i + width - 1] += (e * 3) / 16;
          err[i + width] += (e * 5) / 16;
          if (x + 1 < width) err[i + width + 1] += (e * 1) / 16;
        }
      }
    }
    return out;
  }

  /**
   * Density-mapped stippling.
   * @param {Float32Array} source - Grayscale values 0-1
   * @param {number} width
   * @param {number} height
   * @param {object} [opts]
   * @param {number} [opts.numDotsRatio=0.08] - Ratio of dots to total pixels
   * @param {number} [opts.seed=42] - RNG seed
   * @returns {Uint8ClampedArray} RGBA pixel data
   */
  static stipple(source, width, height, opts = {}) {
    const { numDotsRatio = 0.08, seed = 42 } = opts;
    const out = new Uint8ClampedArray(width * height * 4);
    // Fill black with full alpha
    for (let i = 0; i < out.length; i += 4) {
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
      out[i + 3] = 255;
    }

    const numDots = Math.floor(width * height * numDotsRatio);
    const rng = (s) => {
      let state = s;
      return () => {
        state = (state * 16807 + 0) % 2147483647;
        return state / 2147483647;
      };
    };
    const rand = rng(seed);

    for (let d = 0; d < numDots; d++) {
      let px, py, brightness;
      let attempts = 0;
      do {
        px = Math.floor(rand() * width);
        py = Math.floor(rand() * height);
        brightness = source[py * width + px];
        attempts++;
      } while (rand() > brightness && attempts < 10);

      const radius = 0.5 + brightness * 1.5;
      const r = Math.ceil(radius);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const idx = (ny * width + nx) * 4;
              out[idx] = 255;
              out[idx + 1] = 255;
              out[idx + 2] = 255;
            }
          }
        }
      }
    }
    return out;
  }

  /**
   * Color quantization with Floyd-Steinberg error diffusion.
   * @param {Float32Array} colorSource - RGB values 0-1 (width*height*3)
   * @param {number} width
   * @param {number} height
   * @param {number[][]} [palette] - Array of [r,g,b] colors (0-255)
   * @returns {Uint8ClampedArray} RGBA pixel data
   */
  static colorQuantize(colorSource, width, height, palette) {
    const pal = palette || Dither.CGA_PALETTE;
    const out = new Uint8ClampedArray(width * height * 4);
    const errR = new Float32Array(width * height);
    const errG = new Float32Array(width * height);
    const errB = new Float32Array(width * height);

    for (let i = 0; i < width * height; i++) {
      errR[i] = colorSource[i * 3] * 255;
      errG[i] = colorSource[i * 3 + 1] * 255;
      errB[i] = colorSource[i * 3 + 2] * 255;
    }

    const findClosest = (r, g, b) => {
      let minDist = Infinity;
      let best = 0;
      for (let i = 0; i < pal.length; i++) {
        const dr = r - pal[i][0];
        const dg = g - pal[i][1];
        const db = b - pal[i][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          best = i;
        }
      }
      return pal[best];
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const r = errR[i];
        const g = errG[i];
        const b = errB[i];
        const [nr, ng, nb] = findClosest(r, g, b);

        const idx = i * 4;
        out[idx] = nr;
        out[idx + 1] = ng;
        out[idx + 2] = nb;
        out[idx + 3] = 255;

        const er = r - nr;
        const eg = g - ng;
        const eb = b - nb;

        if (x + 1 < width) {
          errR[i + 1] += (er * 7) / 16;
          errG[i + 1] += (eg * 7) / 16;
          errB[i + 1] += (eb * 7) / 16;
        }
        if (y + 1 < height) {
          if (x - 1 >= 0) {
            errR[i + width - 1] += (er * 3) / 16;
            errG[i + width - 1] += (eg * 3) / 16;
            errB[i + width - 1] += (eb * 3) / 16;
          }
          errR[i + width] += (er * 5) / 16;
          errG[i + width] += (eg * 5) / 16;
          errB[i + width] += (eb * 5) / 16;
          if (x + 1 < width) {
            errR[i + width + 1] += (er * 1) / 16;
            errG[i + width + 1] += (eg * 1) / 16;
            errB[i + width + 1] += (eb * 1) / 16;
          }
        }
      }
    }
    return out;
  }

  /** @private */
  static _getBlueNoise(size) {
    if (!Dither._blueNoiseCache || Dither._blueNoiseCacheSize !== size) {
      Dither._blueNoiseCache = Dither.generateBlueNoise(size);
      Dither._blueNoiseCacheSize = size;
    }
    return Dither._blueNoiseCache;
  }
}

/** Default 8-color CGA palette */
Dither.CGA_PALETTE = [
  [0, 0, 0],
  [0, 170, 170],
  [170, 0, 170],
  [170, 170, 170],
  [85, 85, 255],
  [255, 85, 85],
  [255, 85, 255],
  [255, 255, 85],
];
