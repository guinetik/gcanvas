import { Complex } from "./complex";

/**
 * Fractals class
 *
 * Pure mathematical functions for generating fractal data structures.
 * These functions perform the calculations without any rendering concerns.
 */
export class Fractals {
  /**
   * Types of fractals
   */
  static types = {
    MANDELBROT: "mandelbrot",
    TRICORN: "tricorn",
    PHOENIX: "phoenix",
    JULIA: "julia",
    SIERPINSKI: "sierpinski",
    SCARPET: "sierpinskiCarpet",
    BARNSEY_FERN: "barnsleyFern",
    KOCH: "koch",
    PYTHAGORAS_TREE: "pythagorasTree",
    NEWTON: "newton",
    LYAPUNOV: "lyapunov",
  };

  static colors = {
    FUTURISTIC: "futuristic",
    RAINBOW: "rainbow",
    GRAYSCALE: "grayscale",
    TOPOGRAPHIC: "topographic",
    FIRE: "fire",
    OCEAN: "ocean",
    ELECTRIC: "electric",
    BINARY: "binary",
    HISTORIC: "historic",
  };

  /**
   * Apply a color scheme to raw fractal data
   *
   * @param {Uint8Array} fractalData - Raw fractal data
   * @param {ImageData} imageData - Image data to apply color scheme to
   * @param {string} colorScheme - Color scheme to apply
   * @param {number} iterations - Number of iterations
   * @param {number} hueShift - Hue shift
   * @param {function} hslToRgb - Function to convert HSL to RGB
   * @returns {Uint8Array} Array containing color values for each pixel
   */
  static applyColorScheme(
    fractalData,
    imageData,
    colorScheme,
    iterations,
    hueShift,
    hslToRgb
  ) {
    const data = imageData?.data || [];

    for (let i = 0; i < fractalData.length; i++) {
      const pixelValue = fractalData[i];
      const pixelIndex = i * 4; // RGBA = 4 bytes per pixel

      // Different coloring based on the scheme
      switch (colorScheme) {
        case "futuristic":
          {
            const normalizedValue = fractalData[i] / 10; // 0-1 range

            // Deep, almost black base
            const darkBase = {
              r: 0, // Minimal red
              g: 5, // Extremely low green
              b: 10, // Very dark blue-green
            };

            // Subtle, deep green highlight
            const deepGreenHighlight = {
              r: 0, // No red
              g: 30, // Low green
              b: 20, // Slight blue-green tint
            };

            // More selective highlighting with softer transition
            if (normalizedValue > 0.7) {
              // Higher threshold for highlights
              const t = (normalizedValue - 0.7) * 3.33; // Steeper, more selective falloff
              data[pixelIndex] = Math.floor(
                darkBase.r * (1 - t) + deepGreenHighlight.r * t
              );
              data[pixelIndex + 1] = Math.floor(
                darkBase.g * (1 - t) + deepGreenHighlight.g * t
              );
              data[pixelIndex + 2] = Math.floor(
                darkBase.b * (1 - t) + deepGreenHighlight.b * t
              );
            }
            // Maintain very dark base
            else {
              const t = normalizedValue * 1.43; // Adjusted to keep base extremely dark
              data[pixelIndex] = Math.floor(darkBase.r * t);
              data[pixelIndex + 1] = Math.floor(darkBase.g * t);
              data[pixelIndex + 2] = Math.floor(darkBase.b * t);
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        case "rainbow":
          {
            if (pixelValue === 0) {
              // Points inside the set (black)
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
              data[pixelIndex + 3] = 255;
            } else {
              // Map iteration count to hue
              const hue = (pixelValue * 10 + hueShift) % 360;
              const [r, g, b] = hslToRgb(hue, 0.8, 0.5);
              data[pixelIndex] = r;
              data[pixelIndex + 1] = g;
              data[pixelIndex + 2] = b;
              data[pixelIndex + 3] = 255;
            }
          }
          break;
        case "grayscale":
          {
            // Simple grayscale mapping
            const gray =
              pixelValue === 0 ? 0 : 255 - (pixelValue * 255) / iterations;
            data[pixelIndex] = gray;
            data[pixelIndex + 1] = gray;
            data[pixelIndex + 2] = gray;
            data[pixelIndex + 3] = 255;
          }
          break;
        case "binary":
          {
            // For Sierpinski fractals - binary coloring
            if (pixelValue !== 0) {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              data[pixelIndex] = 255;
              data[pixelIndex + 1] = 255;
              data[pixelIndex + 2] = 255;
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         * Fire Palette (Heatmap Style)
         */
        case "fire":
          {
            if (pixelValue == 0) {
              // Points inside the set (black)
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              // Fire-like gradient: black -> red -> orange -> yellow -> white
              const t = pixelValue / iterations;
              if (t < 0.3) {
                const v = t / 0.3;
                data[pixelIndex] = Math.floor(255 * v);
                data[pixelIndex + 1] = 0;
                data[pixelIndex + 2] = 0;
              } else if (t < 0.6) {
                const v = (t - 0.3) / 0.3;
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = Math.floor(165 * v);
                data[pixelIndex + 2] = 0;
              } else if (t < 0.9) {
                const v = (t - 0.6) / 0.3;
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = 165 + Math.floor(90 * v);
                data[pixelIndex + 2] = Math.floor(255 * v);
              } else {
                const v = (t - 0.9) / 0.1;
                data[pixelIndex] = 255;
                data[pixelIndex + 1] = 255;
                data[pixelIndex + 2] = 255;
              }
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         * Ocean Palette (Cool Blues/Greens)
         */
        case "ocean":
          {
            if (pixelValue === 0) {
              // Deep ocean color for set interior
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 20;
              data[pixelIndex + 2] = 50;
            } else {
              // Ocean gradient: dark blue -> cyan -> white
              const t = pixelValue / iterations;
              data[pixelIndex] = Math.floor(10 + 50 * t);
              data[pixelIndex + 1] = Math.floor(50 + 150 * t);
              data[pixelIndex + 2] = Math.floor(100 + 155 * t);
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         * Electric Palette (80's inspired neon colors)
         */
        case "electric":
          {
            if (pixelValue === 0) {
              // Black background
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else {
              // Vibrant neon colors
              const phase = (pixelValue + hueShift) % 3;
              const t = (pixelValue % 20) / 20;

              if (phase === 0) {
                data[pixelIndex] = Math.floor(
                  255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
                );
                data[pixelIndex + 1] = Math.floor(128 * t);
                data[pixelIndex + 2] = Math.floor(255 * t);
              } else if (phase === 1) {
                data[pixelIndex] = Math.floor(255 * t);
                data[pixelIndex + 1] = Math.floor(
                  255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
                );
                data[pixelIndex + 2] = Math.floor(128 * t);
              } else {
                data[pixelIndex] = Math.floor(128 * t);
                data[pixelIndex + 1] = Math.floor(255 * t);
                data[pixelIndex + 2] = Math.floor(
                  255 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2))
                );
              }
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        case "topographic":
          {
            if (pixelValue === 0) {
              // Deep ocean
              data[pixelIndex] = 5;
              data[pixelIndex + 1] = 15;
              data[pixelIndex + 2] = 30;
            } else {
              // Elevation-based colors
              const elevation = pixelValue / iterations;

              if (elevation < 0.1) {
                // Water
                const depth = elevation / 0.1;
                data[pixelIndex] = Math.floor(5 + 20 * depth);
                data[pixelIndex + 1] = Math.floor(15 + 40 * depth);
                data[pixelIndex + 2] = Math.floor(30 + 50 * depth);
              } else if (elevation < 0.3) {
                // Sand/beach
                const t = (elevation - 0.1) / 0.2;
                data[pixelIndex] = Math.floor(210 + 45 * t);
                data[pixelIndex + 1] = Math.floor(180 + 40 * t);
                data[pixelIndex + 2] = Math.floor(140 + 30 * t);
              } else if (elevation < 0.7) {
                // Vegetation
                const t = (elevation - 0.3) / 0.4;
                data[pixelIndex] = Math.floor(50 * (1 - t));
                data[pixelIndex + 1] = Math.floor(100 + 80 * t);
                data[pixelIndex + 2] = Math.floor(50 * (1 - t));
              } else {
                // Mountain/snow
                const t = (elevation - 0.7) / 0.3;
                data[pixelIndex] = Math.floor(150 + 105 * t);
                data[pixelIndex + 1] = Math.floor(150 + 105 * t);
                data[pixelIndex + 2] = Math.floor(150 + 105 * t);
              }
            }
            data[pixelIndex + 3] = 255;
          }
          break;
        /**
         *  Historical Palette (Classic Fractint Colors)
         */
        case "historic":
        default: {
          if (pixelValue === 0) {
            data[pixelIndex] = 0;
            data[pixelIndex + 1] = 0;
            data[pixelIndex + 2] = 0;
          } else {
            // Classic Fractint color cycling
            const cycle = 64; // Classic cycle length
            const pos = (pixelValue + hueShift) % cycle;

            if (pos < 16) {
              data[pixelIndex] = pos * 16;
              data[pixelIndex + 1] = 0;
              data[pixelIndex + 2] = 0;
            } else if (pos < 32) {
              data[pixelIndex] = 255;
              data[pixelIndex + 1] = (pos - 16) * 16;
              data[pixelIndex + 2] = 0;
            } else if (pos < 48) {
              data[pixelIndex] = 255 - (pos - 32) * 16;
              data[pixelIndex + 1] = 255;
              data[pixelIndex + 2] = 0;
            } else {
              data[pixelIndex] = 0;
              data[pixelIndex + 1] = 255 - (pos - 48) * 16;
              data[pixelIndex + 2] = (pos - 48) * 16;
            }
          }
          data[pixelIndex + 3] = 255;
        }
      }
    }

    return imageData != null ? imageData : data;
  }

  /**
   * Generates a Pythagoras tree fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for tree depth
   * @param {number} xMin - Minimum X coordinate in viewing plane
   * @param {number} xMax - Maximum X coordinate in viewing plane
   * @param {number} yMin - Minimum Y coordinate in viewing plane
   * @param {number} yMax - Maximum Y coordinate in viewing plane
   * @returns {Uint8Array} Array containing pixel values for the Pythagoras tree
   */
  static pythagorasTree(
    width,
    height,
    maxIterations = 10,
    xMin = -2,
    xMax = 2,
    yMin = -0.5,
    yMax = 3.5
  ) {
    // Create data array
    const data = new Uint8Array(width * height);

    // World to screen coordinate conversion
    const mapX = (x) => Math.floor(((x - xMin) * width) / (xMax - xMin));
    const mapY = (y) => Math.floor(((y - yMin) * height) / (yMax - yMin));

    // Basic line drawing
    const drawLine = (x0, y0, x1, y1) => {
      const sx = mapX(x0);
      const sy = mapY(y0);
      const ex = mapX(x1);
      const ey = mapY(y1);

      // Bresenham's algorithm
      let x = sx,
        y = sy;
      const dx = Math.abs(ex - sx),
        dy = Math.abs(ey - sy);
      const sx1 = sx < ex ? 1 : -1,
        sy1 = sy < ey ? 1 : -1;
      let err = dx - dy;

      while (true) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = 255;
        }

        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx1;
        }
        if (e2 < dx) {
          err += dx;
          y += sy1;
        }
      }
    };

    // Fill a square (used for the tree blocks)
    const drawSquare = (x1, y1, x2, y2, x3, y3, x4, y4) => {
      drawLine(x1, y1, x2, y2);
      drawLine(x2, y2, x3, y3);
      drawLine(x3, y3, x4, y4);
      drawLine(x4, y4, x1, y1);
    };

    // Recursively draw the Pythagoras tree
    const drawTree = (x1, y1, x2, y2, depth) => {
      if (depth <= 0) return;

      // Calculate the square coordinates
      const dx = x2 - x1;
      const dy = y2 - y1;

      // Find the perpendicular direction to form a square
      // Important change: we're now creating a square that goes UP
      // from the base line, not down
      const x3 = x2 + dy;
      const y3 = y2 - dx;
      const x4 = x1 + dy;
      const y4 = y1 - dx;

      // Draw the square
      drawSquare(x1, y1, x2, y2, x3, y3, x4, y4);

      // Angle for the branches - can be adjusted for different tree shapes
      const angle = Math.PI / 4; // 45 degrees

      // Calculate the position for the right branch (rotated by angle)
      const rightLen = Math.sqrt(dx * dx + dy * dy) * 0.7; // Smaller scale for branches
      const rightDx = rightLen * Math.cos(Math.atan2(dy, dx) - angle);
      const rightDy = rightLen * Math.sin(Math.atan2(dy, dx) - angle);

      // Calculate the position for the left branch (rotated by -angle)
      const leftLen = Math.sqrt(dx * dx + dy * dy) * 0.7;
      const leftDx = leftLen * Math.cos(Math.atan2(dy, dx) + angle);
      const leftDy = leftLen * Math.sin(Math.atan2(dy, dx) + angle);

      // Start positions for branches are the top of the current square
      const startRightX = x3;
      const startRightY = y3;
      const startLeftX = x4;
      const startLeftY = y4;

      // End positions for branches
      const endRightX = startRightX + rightDx;
      const endRightY = startRightY + rightDy;
      const endLeftX = startLeftX + leftDx;
      const endLeftY = startLeftY + leftDy;

      // Recursively draw the right and left branches
      drawTree(startRightX, startRightY, endRightX, endRightY, depth - 1);
      drawTree(startLeftX, startLeftY, endLeftX, endLeftY, depth - 1);
    };

    // Ensure iterations is in a reasonable range
    const iterations = Math.min(maxIterations, 12);

    // Draw the initial segment (trunk) of the tree
    const trunkWidth = 1.0;
    const trunkHeight = 0.5;

    // Position the trunk in the center bottom of the view
    const startX = -trunkWidth / 2;
    const startY = 0;
    const endX = trunkWidth / 2;
    const endY = 0;

    // Start the tree drawing
    drawTree(startX, startY, endX, endY, iterations);

    return data;
  }

  /**
   * Generates a Mandelbrot set with optimized performance
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {number} xMin - Minimum X coordinate in complex plane
   * @param {number} xMax - Maximum X coordinate in complex plane
   * @param {number} yMin - Minimum Y coordinate in complex plane
   * @param {number} yMax - Maximum Y coordinate in complex plane
   * @returns {Uint8Array} Array containing iteration values for each pixel
   */
  static mandelbrot(
    width,
    height,
    maxIterations = 100,
    xMin = -2.5,
    xMax = 1,
    yMin = -1.5,
    yMax = 1.5
  ) {
    // Create data array with preallocated size
    const data = new Uint8Array(width * height);
    // Precompute scaling factors for mapping pixels to complex plane
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;
    // Process by rows for better memory locality
    for (let y = 0; y < height; y++) {
      // Calculate row base index and y-coordinate once per row
      const rowOffset = y * width;
      const cImag = yMin + y * yScale;

      // Process each pixel in the row
      for (let x = 0; x < width; x++) {
        // Map to complex plane
        const cReal = xMin + x * xScale;

        // Initialize values for this pixel calculation
        let zReal = 0;
        let zImag = 0;

        // Keep squared values to avoid redundant calculations
        let zRealSq = 0;
        let zImagSq = 0;

        // Start iteration counter
        let i = 0;

        // Main iteration loop - optimized but equivalent to original
        do {
          // Calculate next z value using the current squared values
          const zRealTemp = zRealSq - zImagSq + cReal;
          zImag = 2 * zReal * zImag + cImag;
          zReal = zRealTemp;
          // Update squared values for next iteration
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;
          i++;
          // Check escape condition
        } while (zRealSq + zImagSq < 4 && i < maxIterations);
        // Store the iteration value (0-255 range)
        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }

    return data;
  }

  /**
   * Generates a Julia set
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {number} cReal - Real component of C parameter
   * @param {number} cImag - Imaginary component of C parameter
   * @param {number} zoom - Zoom level
   * @param {number} offsetX - X offset for panning
   * @param {number} offsetY - Y offset for panning
   * @returns {Uint8Array} Array containing iteration values for each pixel
   */
  static julia(
    width,
    height,
    maxIterations = 100,
    cReal = -0.7,
    cImag = 0.27,
    zoom = 1,
    offsetX = 0,
    offsetY = 0
  ) {
    const data = new Uint8Array(width * height);
    const scale = 2 / zoom;
    const xMin = -scale + offsetX;
    const xMax = scale + offsetX;
    const yMin = -scale + offsetY;
    const yMax = scale + offsetY;

    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const zImagInit = yMin + y * yScale;

      for (let x = 0; x < width; x++) {
        const zRealInit = xMin + x * xScale;

        let zReal = zRealInit;
        let zImag = zImagInit;

        let zRealSq = 0;
        let zImagSq = 0;

        let i = 0;

        do {
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;

          const tempZReal = zRealSq - zImagSq + cReal;
          zImag = 2 * zReal * zImag + cImag;
          zReal = tempZReal;

          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);

        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }

    return data;
  }

  /**
   * Generates a Tricorn fractal (Mandelbar set) with zoom/pan support
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations
   * @param {number} xMin - Minimum X coordinate in complex plane
   * @param {number} xMax - Maximum X coordinate in complex plane
   * @param {number} yMin - Minimum Y coordinate in complex plane
   * @param {number} yMax - Maximum Y coordinate in complex plane
   * @returns {Uint8Array} Iteration counts
   */
  static tricorn(
    width,
    height,
    maxIterations = 100,
    xMin = -2.5,
    xMax = 1.5,
    yMin = -1.5,
    yMax = 1.5
  ) {
    const data = new Uint8Array(width * height);
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const cImag = yMin + y * yScale;

      for (let x = 0; x < width; x++) {
        const cReal = xMin + x * xScale;

        let zReal = 0;
        let zImag = 0;
        let zRealSq = 0;
        let zImagSq = 0;

        let i = 0;

        do {
          // Tricorn uses the complex conjugate, so -2 instead of +2
          const tempZReal = zRealSq - zImagSq + cReal;
          zImag = -2 * zReal * zImag + cImag;
          zReal = tempZReal;

          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;

          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);

        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }

    return data;
  }

  /**
   * Generates a Phoenix fractal with zoom/pan support
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations
   * @param {number} p - Parameter p (controls feedback)
   * @param {number} q - Parameter q (controls feedback)
   * @param {number} xMin - Minimum X coordinate in complex plane
   * @param {number} xMax - Maximum X coordinate in complex plane
   * @param {number} yMin - Minimum Y coordinate in complex plane
   * @param {number} yMax - Maximum Y coordinate in complex plane
   * @returns {Uint8Array} Iteration counts
   */
  static phoenix(
    width,
    height,
    maxIterations = 100,
    p = 0.5,
    q = 0.5,
    xMin = -2,
    xMax = 2,
    yMin = -2,
    yMax = 2
  ) {
    const data = new Uint8Array(width * height);
    const xScale = (xMax - xMin) / width;
    const yScale = (yMax - yMin) / height;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      const cImag = yMin + y * yScale;

      for (let x = 0; x < width; x++) {
        const cReal = xMin + x * xScale;

        let zReal = 0;
        let zImag = 0;
        let prevZReal = 0;
        let prevZImag = 0;

        let zRealSq = 0;
        let zImagSq = 0;

        let i = 0;

        do {
          // Phoenix recurrence relation with feedback
          const tempZReal = zRealSq - zImagSq + cReal + p * prevZReal + q;
          const tempZImag = 2 * zReal * zImag + cImag + p * prevZImag;

          // Update previous values
          prevZReal = zReal;
          prevZImag = zImag;

          // Set new values
          zReal = tempZReal;
          zImag = tempZImag;

          // Update cached squares
          zRealSq = zReal * zReal;
          zImagSq = zImag * zImag;

          i++;
        } while (zRealSq + zImagSq < 4 && i < maxIterations);

        data[rowOffset + x] = i < maxIterations ? i % 256 : 0;
      }
    }

    return data;
  }

  /**
   * Generates a Newton fractal with optimized performance
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {number} tolerance - Convergence tolerance
   * @param {number} xMin - Minimum x-coordinate in complex plane
   * @param {number} xMax - Maximum x-coordinate in complex plane
   * @param {number} yMin - Minimum y-coordinate in complex plane
   * @param {number} yMax - Maximum y-coordinate in complex plane
   * @returns {Uint8Array} Array containing iteration and root information
   */
  static newton(
    width,
    height,
    maxIterations = 100,
    tolerance = 0.000001,
    xMin = -2,
    xMax = 2,
    yMin = -2,
    yMax = 2
  ) {
    const data = new Uint8Array(width * height);
    const toleranceSquared = tolerance * tolerance;

    // Precompute constants
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    // Precompute roots for z^3 - 1
    const rootCount = 3;
    const rootsReal = new Float64Array(rootCount);
    const rootsImag = new Float64Array(rootCount);

    for (let k = 0; k < rootCount; k++) {
      const angle = (2 * Math.PI * k) / rootCount;
      rootsReal[k] = Math.cos(angle);
      rootsImag[k] = Math.sin(angle);
    }

    // Precompute width factors to avoid division in inner loop
    const xFactor = xRange / width;
    const yFactor = yRange / height;

    // Process rows
    for (let y = 0; y < height; y++) {
      const baseY = y * width;
      const imag = yMin + y * yFactor;

      for (let x = 0; x < width; x++) {
        const real = xMin + x * xFactor;

        // Initial z value
        let zReal = real;
        let zImag = imag;

        let iteration = 0;
        let rootIndex = -1;

        while (iteration < maxIterations && rootIndex < 0) {
          // Calculate z^2 (reused in both f(z) and f'(z))
          const z2Real = zReal * zReal - zImag * zImag;
          const z2Imag = 2 * zReal * zImag;

          // f(z) = z^3 - 1
          const fzReal = z2Real * zReal - z2Imag * zImag - 1;
          const fzImag = z2Real * zImag + z2Imag * zReal;

          // f'(z) = 3z^2
          const dfzReal = 3 * z2Real;
          const dfzImag = 3 * z2Imag;

          // Check if derivative is too small
          const dfzMagSquared = dfzReal * dfzReal + dfzImag * dfzImag;
          if (dfzMagSquared < toleranceSquared) break;

          // Calculate f(z)/f'(z) directly
          const denomInv = 1 / dfzMagSquared;
          const divReal = (fzReal * dfzReal + fzImag * dfzImag) * denomInv;
          const divImag = (fzImag * dfzReal - fzReal * dfzImag) * denomInv;

          // z - f(z)/f'(z)
          const zNextReal = zReal - divReal;
          const zNextImag = zImag - divImag;

          // Check convergence to roots
          for (let i = 0; i < rootCount; i++) {
            const diffReal = zNextReal - rootsReal[i];
            const diffImag = zNextImag - rootsImag[i];
            const distSquared = diffReal * diffReal + diffImag * diffImag;

            if (distSquared < toleranceSquared) {
              rootIndex = i;
              break;
            }
          }
          // Update z for next iteration
          zReal = zNextReal;
          zImag = zNextImag;
          iteration++;
        }
        // color based on root index
        // Combine root index and iteration count for more varied colors
        if (rootIndex >= 0) {
          // For converging points, use both root and iteration information
          // This creates bands of colors based on iteration count
          // while keeping different roots in different color ranges
          const iterationFactor = 1 - Math.min(iteration / maxIterations, 1);
          const rootOffset = rootIndex * (255 / rootCount);
          // Mix the root index and iteration data
          // This spreads the color values more evenly through the spectrum
          data[baseY + x] = Math.floor(
            rootOffset + iterationFactor * (255 / rootCount)
          );
        } else {
          // Points that don't converge
          data[baseY + x] = 0;
        }
      }
    }

    return data;
  }

  /**
   * Binary mask (1 = filled, 0 = hole) for an equilateral Sierpiński triangle.
   * Modified to control visible triangle count with iterations parameter.
   *
   * @param {number} width       Canvas / bitmap width  (px)
   * @param {number} height      Canvas / bitmap height (px)
   * @param {number} iterations  Controls number of visible triangles (1-15)
   * @param {number} xMin        World-space left   (pan / zoom)
   * @param {number} xMax        World-space right
   * @param {number} yMin        World-space bottom
   * @param {number} yMax        World-space top
   * @returns {Uint8Array}       Row-major bitmap of 0/1 values
   */
  static sierpinski(
    width,
    height,
    iterations = 6,
    xMin = 0,
    xMax = 1,
    yMin = 0,
    yMax = 1
  ) {
    const data = new Uint8Array(width * height).fill(1);

    /* ----------------------------------------------------------------
     * 1.  Ensure the sampling window has the correct √3/2 aspect ratio
     *     (so the triangles stay equilateral) while preserving the
     *     caller-requested centre / zoom level.
     * ---------------------------------------------------------------- */
    const ideal = Math.sqrt(3) / 2; // height / width for equilateral
    const spanX = xMax - xMin;
    const spanY = yMax - yMin;
    const current = spanY / spanX;

    if (Math.abs(current - ideal) > 1e-9) {
      const midY = (yMin + yMax) / 2;
      const newSpanY = spanX * ideal;
      yMin = midY - newSpanY / 2;
      yMax = midY + newSpanY / 2;
    }
    /* ----------------------------------------------------------------
     * 2.  Calculate the actual iteration depth needed for bitwise approach
     * ---------------------------------------------------------------- */

    // Cap iterations to prevent excessive subdivision
    const effectiveIterations = Math.min(iterations, 32);

    // This controls the pattern complexity using bits
    const mask = (1 << effectiveIterations) - 1;

    /* ----------------------------------------------------------------
     * 3.  Pre-compute constants for the raster loop
     * ---------------------------------------------------------------- */
    const invW = (xMax - xMin) / width;
    const invH = (yMax - yMin) / height;
    const invTri = 2 / Math.sqrt(3); // == 1 / (√3/2)

    /* ----------------------------------------------------------------
     * 4.  Raster scan with controlled level of detail
     * ---------------------------------------------------------------- */
    for (let py = 0; py < height; ++py) {
      const yCoord = yMin + py * invH;
      const j = Math.floor(yCoord * invTri); // row on 60° lattice
      const shift = j * 0.5; // x-offset for this row

      for (let px = 0; px < width; ++px) {
        const xCoord = xMin + px * invW;
        const i = Math.floor(xCoord - shift); // column on lattice

        // Modified bitwise test - this is key to controlling triangle visibility
        // 1. Use the most significant bits for the pattern (i & j & mask)
        // 2. Adjust which bits we use based on iterations to control triangle size
        if ((i & j & mask) !== 0) {
          data[py * width + px] = 0; // carve hole
        }
      }
    }

    return data;
  }

  static sierpinskiCarpet(
    width,
    height,
    iterations = 5,
    xMin = 0,
    xMax = 1,
    yMin = 0,
    yMax = 1
  ) {
    const data = new Uint8Array(width * height).fill(1);

    /* 1 — Make the window square while preserving center point */
    const spanX = xMax - xMin;
    const spanY = yMax - yMin;
    const size = Math.max(spanX, spanY);
    const centerX = (xMin + xMax) / 2;
    const centerY = (yMin + yMax) / 2;

    // Recalculate boundaries to be square while keeping the center fixed
    xMin = centerX - size / 2;
    xMax = centerX + size / 2;
    yMin = centerY - size / 2;
    yMax = centerY + size / 2;

    /* 2 — Calculate scaling factors for the carpet grid */
    const pow3 = Math.pow(3, iterations);

    /* 3 — Helper: test if a coordinate is in a hole */
    const isHole = (ix, iy) => {
      let x = ix;
      let y = iy;

      while (x > 0 || y > 0) {
        if (x % 3 === 1 && y % 3 === 1) {
          return true;
        }
        x = Math.floor(x / 3);
        y = Math.floor(y / 3);
      }

      return false;
    };

    /* 4 — Process each pixel */
    for (let py = 0; py < height; ++py) {
      // Map from pixel to world coordinate
      const worldY = yMin + (py / height) * (yMax - yMin);

      // Map world coordinate to carpet grid space - preserve position
      const carpetY = worldY * pow3;

      // Floor to get grid index and wrap to ensure positive values
      const iy = ((Math.floor(carpetY) % pow3) + pow3) % pow3;

      for (let px = 0; px < width; ++px) {
        // Map from pixel to world coordinate
        const worldX = xMin + (px / width) * (xMax - xMin);

        // Map world coordinate to carpet grid space - preserve position
        const carpetX = worldX * pow3;

        // Floor and wrap
        const ix = ((Math.floor(carpetX) % pow3) + pow3) % pow3;

        // Apply the hole test
        if (isHole(ix, iy)) {
          data[py * width + px] = 0;
        }
      }
    }

    return data;
  }

  /**
   * Generates a Barnsley Fern fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} [iterations=100000] - Number of points to generate
   * @returns {Uint8Array} Density map (0-255)
   */
  static barnsleyFern(width, height, iterations = 100000) {
    const data = new Uint8Array(width * height).fill(0);
    let x = 0,
      y = 0;

    // Scale and position the fern
    const scale = Math.min(width, height) / 10;
    const offsetX = width / 2;
    const offsetY = height;

    for (let i = 0; i < iterations; i++) {
      const r = Math.random();
      let nx, ny;

      if (r < 0.01) {
        nx = 0;
        ny = 0.16 * y;
      } else if (r < 0.86) {
        nx = 0.85 * x + 0.04 * y;
        ny = -0.04 * x + 0.85 * y + 1.6;
      } else if (r < 0.93) {
        nx = 0.2 * x - 0.26 * y;
        ny = 0.23 * x + 0.22 * y + 1.6;
      } else {
        nx = -0.15 * x + 0.28 * y;
        ny = 0.26 * x + 0.24 * y + 0.44;
      }

      x = nx;
      y = ny;

      // Map to pixel coordinates
      const px = Math.floor(x * scale + offsetX);
      const py = Math.floor(height - y * scale);

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const index = py * width + px;
        if (data[index] < 255) data[index]++;
      }
    }

    return data;
  }

  /**
   * Generates a Lyapunov fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for calculations
   * @param {string} sequence - Sequence of A and B to use in calculation
   * @param {number} aMin - Minimum value for parameter A
   * @param {number} aMax - Maximum value for parameter A
   * @param {number} bMin - Minimum value for parameter B
   * @param {number} bMax - Maximum value for parameter B
   * @returns {Uint8Array} Array containing iteration values for each pixel
   */
  static lyapunov(
    width,
    height,
    maxIterations = 1000,
    sequence = "AB",
    aMin = 3.4, // Adjusted to center the main graph
    aMax = 4.0,
    bMin = 3.4, // Adjusted to center the main graph
    bMax = 4.0
  ) {
    console.time("lyapunov");
    // Validate sequence
    sequence = sequence.toUpperCase().replace(/[^AB]/g, "") || "AB";
    const seqLen = sequence.length;

    const data = new Float32Array(width * height);
    let min = Infinity;
    let max = -Infinity;

    // First pass: calculate exponents and find range
    for (let y = 0; y < height; y++) {
      const b = bMin + ((bMax - bMin) * y) / height;

      for (let x = 0; x < width; x++) {
        const a = aMin + ((aMax - aMin) * x) / width;
        let xVal = 0.5;

        // Warm-up iterations
        for (let i = 0; i < 100; i++) {
          const r = sequence[i % seqLen] === "A" ? a : b;
          xVal = r * xVal * (1 - xVal);
        }

        // Calculate Lyapunov exponent with iteration limit
        let sum = 0;
        let iteration = 0;
        while (iteration < maxIterations) {
          const r = sequence[iteration % seqLen] === "A" ? a : b;
          xVal = r * xVal * (1 - xVal);
          const derivative = Math.abs(r * (1 - 2 * xVal));
          sum += Math.log(Math.max(derivative, 1e-10));
          iteration++;

          // Optional early exit condition if needed
          if (Math.abs(sum / iteration) > 10) break;
        }

        const exponent = sum / iteration;
        data[y * width + x] = exponent;

        // Track min/max (excluding extreme outliers)
        if (exponent > -10 && exponent < 10) {
          if (exponent < min) min = exponent;
          if (exponent > max) max = exponent;
        }
      }
    }

    // Handle case where all values are the same
    if (min === max) {
      min -= 1;
      max += 1;
    }

    // Second pass: normalize to 0-255 range
    const range = max - min;
    const output = new Uint8Array(width * height);

    for (let i = 0; i < data.length; i++) {
      let value = data[i];

      // Clamp extreme values
      value = Math.max(-10, Math.min(10, value));

      // Normalize and map to 0-255
      let normalized = (value - min) / range;
      output[i] = Math.floor(normalized * 255);
    }
    console.timeEnd("lyapunov");
    return output;
  }

  /**
   * Generates a Koch snowflake fractal
   *
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {number} maxIterations - Maximum iterations for Koch snowflake detail
   * @param {number} xMin - Minimum X coordinate in viewing plane
   * @param {number} xMax - Maximum X coordinate in viewing plane
   * @param {number} yMin - Minimum Y coordinate in viewing plane
   * @param {number} yMax - Maximum Y coordinate in viewing plane
   * @returns {Uint8Array} Array containing pixel values for the Koch snowflake
   */
  static koch(
    width,
    height,
    maxIterations = 4,
    xMin = -2,
    xMax = 2,
    yMin = -2,
    yMax = 2
  ) {
    // Create data array
    const data = new Uint8Array(width * height);

    // World to screen coordinate conversion
    // The key change is here - as xMin/xMax/yMin/yMax get smaller in range,
    // the image gets magnified (proper zoom behavior)
    const mapX = (x) => Math.floor(((x - xMin) * width) / (xMax - xMin));
    const mapY = (y) => Math.floor(((y - yMin) * height) / (yMax - yMin));

    // Basic line drawing
    const drawLine = (x0, y0, x1, y1) => {
      const sx = mapX(x0);
      const sy = mapY(y0);
      const ex = mapX(x1);
      const ey = mapY(y1);

      // Bresenham's algorithm
      let x = sx,
        y = sy;
      const dx = Math.abs(ex - sx),
        dy = Math.abs(ey - sy);
      const sx1 = sx < ex ? 1 : -1,
        sy1 = sy < ey ? 1 : -1;
      let err = dx - dy;

      while (true) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          data[y * width + x] = 255;
        }

        if (x === ex && y === ey) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx1;
        }
        if (e2 < dx) {
          err += dx;
          y += sy1;
        }
      }
    };

    // Generate Koch curve recursively with iteration limit
    const kochSegment = (x1, y1, x2, y2, depth) => {
      if (depth <= 0) {
        drawLine(x1, y1, x2, y2);
        return;
      }

      // Calculate positions using vector math
      const dx = (x2 - x1) / 3;
      const dy = (y2 - y1) / 3;

      // Points along the original line (1/3 and 2/3)
      const x3 = x1 + dx;
      const y3 = y1 + dy;
      const x5 = x1 + 2 * dx;
      const y5 = y1 + 2 * dy;

      // Calculate the peak point (rotated by 60 degrees)
      const angle = Math.PI / 3; // 60 degrees
      const x4 = x3 + dx * Math.cos(angle) - dy * Math.sin(angle);
      const y4 = y3 + dx * Math.sin(angle) + dy * Math.cos(angle);

      // Recursive calls for the four segments
      kochSegment(x1, y1, x3, y3, depth - 1);
      kochSegment(x3, y3, x4, y4, depth - 1);
      kochSegment(x4, y4, x5, y5, depth - 1);
      kochSegment(x5, y5, x2, y2, depth - 1);
    };

    // Ensure iterations is in a reasonable range
    const iterations = Math.min(maxIterations, 10);

    // Define the Koch snowflake in fixed coordinates
    const size = 3; // Size of the base snowflake
    const h = (size * Math.sqrt(3)) / 2;

    // Triangle vertices in fixed coordinates
    const p1 = [0, -h / 2 + 0.5]; // Top
    const p2 = [-size / 2, h / 2 + 0.5]; // Bottom left
    const p3 = [size / 2, h / 2 + 0.5]; // Bottom right

    // Draw the three sides of the triangle with Koch segments
    kochSegment(p1[0], p1[1], p2[0], p2[1], iterations);
    kochSegment(p2[0], p2[1], p3[0], p3[1], iterations);
    kochSegment(p3[0], p3[1], p1[0], p1[1], iterations);

    return data;
  }
}
