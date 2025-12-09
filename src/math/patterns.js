import { Noise } from "./noise.js";
import { generatePenroseTilingPixels } from "./penrose.js";

export class Patterns {
  static void(width, height, options = {}) {
    const {
      background = [255, 255, 255, 255], // white
      foreground = [0, 0, 200, 255], // blue
    } = options;

    // Create data array with background color
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }

    return data;
  }

  /**
   * Generates an RGBA grid pattern with transparency support.
   * @param {number} width
   * @param {number} height
   * @param {{
   *   spacing?: number,
   *   background?: [r, g, b, a],
   *   foreground?: [r, g, b, a]
   * }} options
   * @returns {Uint8ClampedArray}
   */
  static solidGrid(width, height, options = {}) {
    const {
      spacing = 8,
      background = [0, 0, 0, 0], // transparent
      foreground = [128, 128, 128, 255], // solid gray
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      const yLine = y % spacing === 0;

      for (let x = 0; x < width; x++) {
        const xLine = x % spacing === 0;
        const isLine = xLine || yLine;
        const offset = (y * width + x) * 4;

        const color = isLine ? foreground : background;
        data[offset] = color[0]; // R
        data[offset + 1] = color[1]; // G
        data[offset + 2] = color[2]; // B
        data[offset + 3] = color[3]; // A
      }
    }

    return data;
  }

  /**
   * Checkerboard pattern
   */
  static checkerboard(width, height, options = {}) {
    const {
      cellSize = 8,
      color1 = [0, 0, 0, 255],
      color2 = [255, 255, 255, 255],
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      const yCell = Math.floor(y / cellSize);
      for (let x = 0; x < width; x++) {
        const xCell = Math.floor(x / cellSize);
        const useColor1 = (xCell + yCell) % 2 === 0;
        const color = useColor1 ? color1 : color2;
        const offset = (y * width + x) * 4;
        data.set(color, offset);
      }
    }

    return data;
  }

  /**
   * Diagonal stripe pattern
   */
  static stripes(width, height, options = {}) {
    const {
      spacing = 4,
      thickness = 1,
      background = [0, 0, 0, 0],
      foreground = [255, 255, 0, 255],
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const diag = (x + y) % spacing;
        const isStripe = diag < thickness;
        const offset = (y * width + x) * 4;
        data.set(isStripe ? foreground : background, offset);
      }
    }

    return data;
  }

  static honeycomb(width, height, options = {}) {
    const {
      radius = 10, // Radius of the hexagon
      lineWidth = 1, // Border thickness
      foreground = [255, 255, 255, 255],
      background = [0, 0, 0, 255],
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Center of the canvas
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // Function to check if a point is inside a hexagon
    const isInsideHexagon = (px, py, cx, cy, r) => {
      // For flat-topped hexagon
      const dx = Math.abs(px - cx);
      const dy = Math.abs(py - cy);

      // Height of the hexagon from center to top
      const hexHeight = (r * Math.sqrt(3)) / 2;

      // Outside vertical bounds
      if (dy > hexHeight) return false;

      // Outside horizontal bounds
      if (dx > r) return false;

      // Check diagonal edges
      return r * hexHeight * 2 >= r * dy * 2 + hexHeight * dx;
    };

    // Calculate inner hexagon radius for border
    const innerRadius = radius - lineWidth;

    // Define the bounds for checking pixels
    const hexHeight = radius * Math.sqrt(3);
    const minX = Math.max(0, Math.floor(centerX - radius - 1));
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius + 1));
    const minY = Math.max(0, Math.floor(centerY - hexHeight / 2 - 1));
    const maxY = Math.min(height - 1, Math.ceil(centerY + hexHeight / 2 + 1));

    // Check each pixel in the bounding box
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if the point is inside the outer hexagon but outside the inner hexagon
        const isOuterHex = isInsideHexagon(x, y, centerX, centerY, radius);
        const isInnerHex =
          innerRadius > 0
            ? isInsideHexagon(x, y, centerX, centerY, innerRadius)
            : false;

        if (isOuterHex && !isInnerHex) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0]; // R
          data[offset + 1] = foreground[1]; // G
          data[offset + 2] = foreground[2]; // B
          data[offset + 3] = foreground[3]; // A
        }
      }
    }

    return data;
  }

  static harlequin(width, height, options = {}) {
    const {
      size = 20, // Size of each diamond (distance from center to point)
      spacing = 0, // Gap between diamonds
      background = [255, 255, 255, 255], // White
      foreground = [0, 0, 0, 255], // Black
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Calculate diamond dimensions and spacing
    const diamondWidth = size * 2;
    const diamondHeight = size * 2;

    // Calculate grid spacing with added spacing parameter
    const gridWidth = diamondWidth + spacing;
    const gridHeight = diamondHeight + spacing;

    // Function to check if a point is inside a diamond
    const isInsideDiamond = (px, py, cx, cy) => {
      // Calculate distance from point to center, scaled by diamond dimensions
      const dx = Math.abs(px - cx) / (diamondWidth / 2);
      const dy = Math.abs(py - cy) / (diamondHeight / 2);

      // Inside diamond if the sum of normalized distances is <= 1
      return dx + dy <= 1;
    };

    // Draw diamonds in a grid pattern
    for (let row = -1; row < height / gridHeight + 1; row++) {
      for (let col = -1; col < width / gridWidth + 1; col++) {
        // Calculate center of this diamond
        const centerX = col * gridWidth + gridWidth / 2;
        const centerY = row * gridHeight + gridHeight / 2;

        // Only draw every other diamond (checkerboard pattern)
        const shouldDraw = (row + col) % 2 === 0;
        if (!shouldDraw) continue;

        // Define the bounds for checking pixels
        const minX = Math.max(0, Math.floor(centerX - diamondWidth / 2));
        const maxX = Math.min(width - 1, Math.ceil(centerX + diamondWidth / 2));
        const minY = Math.max(0, Math.floor(centerY - diamondHeight / 2));
        const maxY = Math.min(
          height - 1,
          Math.ceil(centerY + diamondHeight / 2)
        );

        // Check each pixel in the bounding box
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            if (isInsideDiamond(x, y, centerX, centerY)) {
              const offset = (y * width + x) * 4;

              // Apply foreground color
              data[offset] = foreground[0]; // R
              data[offset + 1] = foreground[1]; // G
              data[offset + 2] = foreground[2]; // B
              data[offset + 3] = foreground[3]; // A
            }
          }
        }
      }
    }

    return data;
  }

  static circles(width, height, options = {}) {
    const {
      radius = 10, // Radius of each circle
      lineWidth = 2, // Width of the circle border
      spacing = 5, // Space between circles
      background = [0, 0, 0, 255], // Black background
      foreground = [255, 255, 255, 255], // White foreground for circles
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Calculate the distance between circle centers
    const gridSize = radius * 2 + spacing;

    // Function to check if a point is inside a circle
    const isInsideCircle = (px, py, cx, cy, r) => {
      const dx = px - cx;
      const dy = py - cy;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= r * r;
    };

    // Draw circles in a grid pattern
    for (let row = 0; row < Math.ceil(height / gridSize) + 1; row++) {
      for (let col = 0; col < Math.ceil(width / gridSize) + 1; col++) {
        // Calculate center of this circle
        const centerX = col * gridSize + radius;
        const centerY = row * gridSize + radius;

        // Skip if circle center is outside the canvas (with some margin)
        if (
          centerX < -radius ||
          centerX > width + radius ||
          centerY < -radius ||
          centerY > height + radius
        ) {
          continue;
        }

        // Define the bounds for checking pixels
        const minX = Math.max(0, Math.floor(centerX - radius));
        const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
        const minY = Math.max(0, Math.floor(centerY - radius));
        const maxY = Math.min(height - 1, Math.ceil(centerY + radius));

        // Inner radius for hollow circles
        const innerRadius = radius - lineWidth;

        // Check each pixel in the bounding box
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            // Check if point is inside outer circle but outside inner circle
            const isOuterCircle = isInsideCircle(
              x,
              y,
              centerX,
              centerY,
              radius
            );
            const isInnerCircle = isInsideCircle(
              x,
              y,
              centerX,
              centerY,
              innerRadius
            );

            if (isOuterCircle && !isInnerCircle) {
              const offset = (y * width + x) * 4;

              // Apply foreground color for the circle outline
              data[offset] = foreground[0]; // R
              data[offset + 1] = foreground[1]; // G
              data[offset + 2] = foreground[2]; // B
              data[offset + 3] = foreground[3]; // A
            }
          }
        }
      }
    }

    return data;
  }

  static diamonds(width, height, options = {}) {
    const {
      size = 16, // Size of the pattern cell
      squareSize = 6, // Size of the inner square
      background = [255, 255, 255, 255], // White background
      foreground = [0, 0, 0, 255], // Black foreground for diamonds
      innerColor = [255, 255, 255, 255], // White color for inner squares
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Calculate the grid size
    const gridSize = size;

    // Function to check if a point is inside a diamond
    const isInsideDiamond = (px, py, cx, cy, s) => {
      // Calculate distance from point to center, using manhattan distance for diamond shape
      const dx = Math.abs(px - cx);
      const dy = Math.abs(py - cy);

      // Inside diamond if the sum of normalized distances is <= half the size
      return dx + dy <= s / 2;
    };

    // Function to check if a point is inside a square
    const isInsideSquare = (px, py, cx, cy, s) => {
      return Math.abs(px - cx) <= s / 2 && Math.abs(py - cy) <= s / 2;
    };

    // Draw the pattern
    for (let row = -1; row < height / gridSize + 1; row++) {
      for (let col = -1; col < width / gridSize + 1; col++) {
        // Center of this cell
        const centerX = col * gridSize + gridSize / 2;
        const centerY = row * gridSize + gridSize / 2;

        // Skip if cell center is far outside the canvas
        if (
          centerX < -gridSize ||
          centerX > width + gridSize ||
          centerY < -gridSize ||
          centerY > height + gridSize
        ) {
          continue;
        }

        // Define the bounds for checking pixels
        const minX = Math.max(0, Math.floor(centerX - gridSize / 2));
        const maxX = Math.min(width - 1, Math.ceil(centerX + gridSize / 2));
        const minY = Math.max(0, Math.floor(centerY - gridSize / 2));
        const maxY = Math.min(height - 1, Math.ceil(centerY + gridSize / 2));

        // Check each pixel in the bounding box
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const isDiamond = isInsideDiamond(x, y, centerX, centerY, gridSize);
            const isSquare = isInsideSquare(x, y, centerX, centerY, squareSize);

            if (isDiamond) {
              const offset = (y * width + x) * 4;

              if (isSquare) {
                // Inner square color
                data[offset] = innerColor[0]; // R
                data[offset + 1] = innerColor[1]; // G
                data[offset + 2] = innerColor[2]; // B
                data[offset + 3] = innerColor[3]; // A
              } else {
                // Diamond color
                data[offset] = foreground[0]; // R
                data[offset + 1] = foreground[1]; // G
                data[offset + 2] = foreground[2]; // B
                data[offset + 3] = foreground[3]; // A
              }
            }
          }
        }
      }
    }

    return data;
  }

  static cubes(width, height, options = {}) {
    const {
      size = 10, // Size of each square
      spacing = 2, // Space between squares
      background = [0, 0, 0, 255], // Black background
      foreground = [255, 100, 0, 255], // Orange foreground for squares
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Calculate grid dimensions
    const gridSize = size + spacing;

    // Draw squares in a grid pattern
    for (let row = 0; row < Math.ceil(height / gridSize) + 1; row++) {
      for (let col = 0; col < Math.ceil(width / gridSize) + 1; col++) {
        // Base position for this square
        const x = col * gridSize;
        const y = row * gridSize;

        // Skip if square is entirely outside the canvas
        if (x >= width || y >= height) {
          continue;
        }

        // Draw a simple square
        for (let py = y; py < Math.min(y + size, height); py++) {
          for (let px = x; px < Math.min(x + size, width); px++) {
            const offset = (py * width + px) * 4;

            // Apply foreground color for the square
            data[offset] = foreground[0]; // R
            data[offset + 1] = foreground[1]; // G
            data[offset + 2] = foreground[2]; // B
            data[offset + 3] = foreground[3]; // A
          }
        }
      }
    }

    return data;
  }

  static cross(width, height, options = {}) {
    const {
      size = 8, // Size of each cross (total width/height)
      thickness = 2, // Thickness of the cross lines
      spacing = 16, // Space between crosses (center to center)
      background = [255, 255, 255, 255], // White background
      foreground = [80, 80, 80, 255], // Dark gray foreground for crosses
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Draw crosses in a grid pattern
    for (let row = 0; row < Math.ceil(height / spacing) + 1; row++) {
      for (let col = 0; col < Math.ceil(width / spacing) + 1; col++) {
        // Center of this cross
        const centerX = col * spacing;
        const centerY = row * spacing;

        // Skip if cross center is far outside the canvas
        if (
          centerX < -size ||
          centerX > width + size ||
          centerY < -size ||
          centerY > height + size
        ) {
          continue;
        }

        // Draw the horizontal line of the cross
        const hStartX = centerX - size / 2;
        const hEndX = centerX + size / 2;
        const hStartY = centerY - thickness / 2;
        const hEndY = centerY + thickness / 2;

        for (
          let y = Math.max(0, Math.floor(hStartY));
          y < Math.min(height, Math.ceil(hEndY));
          y++
        ) {
          for (
            let x = Math.max(0, Math.floor(hStartX));
            x < Math.min(width, Math.ceil(hEndX));
            x++
          ) {
            const offset = (y * width + x) * 4;
            data[offset] = foreground[0]; // R
            data[offset + 1] = foreground[1]; // G
            data[offset + 2] = foreground[2]; // B
            data[offset + 3] = foreground[3]; // A
          }
        }

        // Draw the vertical line of the cross
        const vStartX = centerX - thickness / 2;
        const vEndX = centerX + thickness / 2;
        const vStartY = centerY - size / 2;
        const vEndY = centerY + size / 2;

        for (
          let y = Math.max(0, Math.floor(vStartY));
          y < Math.min(height, Math.ceil(vEndY));
          y++
        ) {
          for (
            let x = Math.max(0, Math.floor(vStartX));
            x < Math.min(width, Math.ceil(vEndX));
            x++
          ) {
            const offset = (y * width + x) * 4;
            data[offset] = foreground[0]; // R
            data[offset + 1] = foreground[1]; // G
            data[offset + 2] = foreground[2]; // B
            data[offset + 3] = foreground[3]; // A
          }
        }
      }
    }

    return data;
  }

  static mesh(width, height, options = {}) {
    const {
      spacing = 20, // Distance between parallel lines
      lineWidth = 2, // Thickness of the lines
      background = [255, 255, 255, 0], // Transparent background
      foreground = [0, 0, 0, 255], // Black lines
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Create the isometric grid pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Calculate if we're on a line for the first set of diagonals (/)
        const d1 = (x + y) % spacing;
        const isLine1 = d1 < lineWidth || d1 > spacing - lineWidth;

        // Calculate if we're on a line for the second set of diagonals (\)
        const d2 = (x - y + height) % spacing;
        const isLine2 = d2 < lineWidth || d2 > spacing - lineWidth;

        // If it's on a line, set foreground color
        if (isLine1 || isLine2) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0]; // R
          data[offset + 1] = foreground[1]; // G
          data[offset + 2] = foreground[2]; // B
          data[offset + 3] = foreground[3]; // A
        }
      }
    }

    return data;
  }

  static isometric(width, height, options = {}) {
    const {
      cellSize = 20, // Controls the size of the diamonds
      lineWidth = 1, // Thickness of the lines
      background = [0, 0, 0, 0], // Transparent background
      foreground = [0, 255, 0, 255], // Green lines
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0];
      data[i + 1] = background[1];
      data[i + 2] = background[2];
      data[i + 3] = background[3];
    }

    // Isometric dimensions (2:1 ratio)
    const tileWidth = cellSize;
    const tileHeight = cellSize / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Position within the repeating tile
        const relX = x % tileWidth;
        const relY = y % tileHeight;

        // Distance from left and right edges of the diamond
        const leftEdge = relY - relX / 2;
        const rightEdge = relY + relX / 2 - tileHeight;

        // Check if pixel is near any of the diamond edges
        const nearLeftEdge = Math.abs(leftEdge) < lineWidth / 2;
        const nearRightEdge = Math.abs(rightEdge) < lineWidth / 2;

        // Draw the pixel if it's on an edge
        if (nearLeftEdge || nearRightEdge) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0];
          data[offset + 1] = foreground[1];
          data[offset + 2] = foreground[2];
          data[offset + 3] = foreground[3];
        }
      }
    }

    return data;
  }

  static weave(width, height, options = {}) {
    const {
      tileSize = 40,
      lineWidth = 2,
      background = [255, 255, 255, 255], // white
      foreground = [0, 0, 0, 255], // black
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with background color first
    for (let i = 0; i < data.length; i += 4) {
      data[i] = background[0]; // R
      data[i + 1] = background[1]; // G
      data[i + 2] = background[2]; // B
      data[i + 3] = background[3]; // A
    }

    // Create the pattern by calculating pixel positions directly
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Find position in the repeating pattern
        const tileX = x % tileSize;
        const tileY = y % tileSize;

        // Calculate the three axes for our isometric pattern
        // Each axis determines if we're on a line in that direction
        const axisH =
          Math.abs(((tileY + tileSize / 2) % tileSize) - tileSize / 2) <
          lineWidth / 2;
        const axis60 =
          Math.abs(
            ((tileX + tileY * 2 + tileSize * 1.5) % tileSize) - tileSize / 2
          ) <
          lineWidth / 2;
        const axis120 =
          Math.abs(
            ((tileX - tileY * 2 + tileSize * 1.5) % tileSize) - tileSize / 2
          ) <
          lineWidth / 2;

        // Determine if this pixel should be part of a line
        const isLine = axisH || axis60 || axis120;

        // If it's on a line, set foreground color
        if (isLine) {
          const offset = (y * width + x) * 4;
          data[offset] = foreground[0]; // R
          data[offset + 1] = foreground[1]; // G
          data[offset + 2] = foreground[2]; // B
          data[offset + 3] = foreground[3]; // A
        }
      }
    }

    return data;
  }

  /**
   * Generates a Perlin noise pattern using the Noise class
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   background?: [r, g, b, a],
   *   foreground?: [r, g, b, a],
   *   scale?: number,
   *   octaves?: number,
   *   persistence?: number,
   *   lacunarity?: number,
   *   seed?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static perlinNoise(width, height, options = {}) {
    const {
      background = [0, 0, 0, 0],
      foreground = [255, 255, 255, 255],
      scale = 0.1,
      octaves = 4,
      persistence = 0.5,
      lacunarity = 2.0,
      seed = Math.random() * 65536,
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Set the seed for the noise generator
    Noise.seed(seed);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let amplitude = 1;
        let frequency = 1;
        let noiseHeight = 0;
        let maxValue = 0;

        // Apply multiple octaves of noise
        for (let i = 0; i < octaves; i++) {
          const sampleX = x * scale * frequency;
          const sampleY = y * scale * frequency;

          // Get noise value in range [-1, 1]
          const noiseValue = Noise.perlin2(sampleX, sampleY);

          // Add weighted noise to total
          noiseHeight += noiseValue * amplitude;

          // Keep track of maximum possible values
          maxValue += amplitude;

          // Prepare for next octave
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        // Normalize noise value to [0, 1] range
        noiseHeight /= maxValue;

        // Convert to [0, 1] range from [-1, 1]
        const normalizedValue = (noiseHeight + 1) * 0.5;

        // Get color based on noise value by interpolating between background and foreground
        const color = [
          Math.floor(
            background[0] + normalizedValue * (foreground[0] - background[0])
          ),
          Math.floor(
            background[1] + normalizedValue * (foreground[1] - background[1])
          ),
          Math.floor(
            background[2] + normalizedValue * (foreground[2] - background[2])
          ),
          Math.floor(
            background[3] + normalizedValue * (foreground[3] - background[3])
          ),
        ];

        // Set pixel color
        const offset = (y * width + x) * 4;
        data.set(color, offset);
      }
    }

    return data;
  }

  /**
   * Creates a circular gradient pattern
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   innerColor?: [r, g, b, a],
   *   outerColor?: [r, g, b, a],
   *   centerX?: number,
   *   centerY?: number,
   *   radius?: number,
   *   fadeExponent?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static circularGradient(width, height, options = {}) {
    const {
      innerColor = [255, 255, 255, 255],
      outerColor = [0, 0, 0, 255],
      centerX = width / 2,
      centerY = height / 2,
      radius = Math.min(width, height) / 2,
      fadeExponent = 1, // Controls how quickly the gradient fades (1 = linear)
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;

        // Calculate distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate gradient factor (0 to 1)
        let factor = Math.min(distance / radius, 1.0);

        // Apply fade exponent for non-linear gradients
        factor = Math.pow(factor, fadeExponent);

        // Interpolate between inner and outer colors
        const color = [
          Math.floor(innerColor[0] + factor * (outerColor[0] - innerColor[0])),
          Math.floor(innerColor[1] + factor * (outerColor[1] - innerColor[1])),
          Math.floor(innerColor[2] + factor * (outerColor[2] - innerColor[2])),
          Math.floor(innerColor[3] + factor * (outerColor[3] - innerColor[3])),
        ];

        data.set(color, offset);
      }
    }

    return data;
  }

  /**
   * Creates a noise-based displacement pattern (distorted grid)
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   gridSpacing?: number,
   *   gridColor?: [r, g, b, a],
   *   background?: [r, g, b, a],
   *   displacementScale?: number,
   *   noiseScale?: number,
   *   gridThickness?: number,
   *   seed?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static noiseDisplacement(width, height, options = {}) {
    const {
      gridSpacing = 16,
      gridColor = [255, 255, 255, 255],
      background = [0, 0, 0, 0],
      displacementScale = 8,
      noiseScale = 0.05,
      gridThickness = 1,
      seed = Math.random() * 65536,
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Set the seed for the noise generator
    Noise.seed(seed);

    // Fill background first
    for (let i = 0; i < data.length; i += 4) {
      data.set(background, i);
    }

    // Apply distorted grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Get noise values for displacement
        const noiseX = Noise.perlin2(x * noiseScale, y * noiseScale);
        const noiseY = Noise.perlin2(
          (x + 31.416) * noiseScale,
          (y + 27.182) * noiseScale
        );

        // Apply displacement
        const displacedX = x + noiseX * displacementScale;
        const displacedY = y + noiseY * displacementScale;

        // Check if this point is on a grid line
        const isGridX =
          displacedX % gridSpacing < gridThickness ||
          displacedX % gridSpacing > gridSpacing - gridThickness;
        const isGridY =
          displacedY % gridSpacing < gridThickness ||
          displacedY % gridSpacing > gridSpacing - gridThickness;

        // If on a grid line, draw it
        if (isGridX || isGridY) {
          const offset = (y * width + x) * 4;
          data.set(gridColor, offset);
        }
      }
    }

    return data;
  }

  /**
   * Creates a dot pattern with either regular spacing or noise-based distribution
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   dotSize?: number,
   *   spacing?: number,
   *   dotColor?: [r, g, b, a],
   *   background?: [r, g, b, a],
   *   useNoise?: boolean,
   *   noiseScale?: number,
   *   noiseDensity?: number,
   *   seed?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static dotPattern(width, height, options = {}) {
    const {
      dotSize = 3,
      spacing = 12,
      dotColor = [0, 0, 0, 255],
      background = [255, 255, 255, 255],
      useNoise = false,
      noiseScale = 0.1,
      noiseDensity = 0.4, // Threshold for placing dots when using noise (0-1)
      seed = Math.random() * 65536,
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Set the seed for the noise generator if using noise
    if (useNoise) {
      Noise.seed(seed);
    }

    // Fill with background color
    for (let i = 0; i < data.length; i += 4) {
      data.set(background, i);
    }

    if (useNoise) {
      // Generate noise-based dot pattern
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Get noise value in range [-1, 1]
          const noiseValue = Noise.perlin2(x * noiseScale, y * noiseScale);

          // Convert to [0, 1] range
          const normNoise = (noiseValue + 1) * 0.5;

          // Place dot if noise value exceeds threshold
          if (normNoise > noiseDensity) {
            // Draw dot
            for (let dy = -dotSize; dy <= dotSize; dy++) {
              for (let dx = -dotSize; dx <= dotSize; dx++) {
                const px = x + dx;
                const py = y + dy;

                // Check if within bounds and within circle
                if (px >= 0 && px < width && py >= 0 && py < height) {
                  const dist = dx * dx + dy * dy;
                  if (dist <= dotSize * dotSize) {
                    const offset = (py * width + px) * 4;
                    data.set(dotColor, offset);
                  }
                }
              }
            }
          }
        }
      }
    } else {
      // Generate regular grid dot pattern
      for (let y = Math.floor(spacing / 2); y < height; y += spacing) {
        for (let x = Math.floor(spacing / 2); x < width; x += spacing) {
          // Draw dot
          for (let dy = -dotSize; dy <= dotSize; dy++) {
            for (let dx = -dotSize; dx <= dotSize; dx++) {
              const px = x + dx;
              const py = y + dy;

              // Check if within bounds and within circle
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const dist = dx * dx + dy * dy;
                if (dist <= dotSize * dotSize) {
                  const offset = (py * width + px) * 4;
                  data.set(dotColor, offset);
                }
              }
            }
          }
        }
      }
    }

    return data;
  }

  /**
   * Generates a Voronoi cell pattern that tiles seamlessly
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {{
   *   cellCount?: number,
   *   cellColors?: [r, g, b, a][],
   *   edgeColor?: [r, g, b, a],
   *   edgeThickness?: number,
   *   seed?: number,
   *   jitter?: number,
   *   baseColor?: [r, g, b, a],
   *   colorVariation?: number
   * }} options - Configuration options
   * @returns {Uint8ClampedArray} - RGBA pixel data
   */
  static voronoi(width, height, options = {}) {
    const {
      cellCount = 20,
      cellColors = null, // Will generate random colors if null
      edgeColor = [0, 0, 0, 255],
      edgeThickness = 1.5,
      seed = Math.random() * 1000,
      jitter = 0.5, // How much to randomize cell positions (0-1)
      baseColor = null, // Base color for theming, if null will use random colors
      colorVariation = 0.3, // How much variation to add to the base color (0-1)
    } = options;

    const data = new Uint8ClampedArray(width * height * 4);

    // Use Perlin noise for better randomness
    Noise.seed(seed);

    // Generate cell centers in a more structured grid for better Voronoi appearance
    const cellPoints = [];
    const colors = [];

    // Use a simple seeded random number generator
    const random = () => {
      let x = Math.sin(seed * 0.167 + cellPoints.length * 0.423) * 10000;
      return x - Math.floor(x);
    };

    // Calculate grid dimensions based on cell count
    const gridSize = Math.sqrt(cellCount);
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;

    // Helper function to generate a color based on the base color
    const generateColorFromBase = (index) => {
      if (baseColor) {
        // Extract RGBA from base color
        const [r, g, b, a] = baseColor;

        // Convert RGB to HSL for better color variation
        // This lets us vary hue and saturation while keeping colors in the same family
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;

        let h, s;

        if (max === min) {
          h = s = 0; // achromatic
        } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

          if (max === r / 255) {
            h = (g / 255 - b / 255) / d + (g / 255 < b / 255 ? 6 : 0);
          } else if (max === g / 255) {
            h = (b / 255 - r / 255) / d + 2;
          } else {
            h = (r / 255 - g / 255) / d + 4;
          }
          h /= 6;
        }

        // Add variation to HSL values
        // Perlin noise creates smoother variations
        const hueVariation =
          Noise.perlin2(index * 0.15, 0) * colorVariation * 0.3;
        const satVariation = Noise.perlin2(0, index * 0.15) * colorVariation;
        const lightVariation =
          Noise.perlin2(index * 0.15, index * 0.15) * colorVariation * 0.5;

        // Apply variations
        h = (h + hueVariation) % 1.0; // Keep hue in [0,1] range
        s = Math.min(1, Math.max(0, s * (1 + satVariation))); // Keep saturation in [0,1]
        const newL = Math.min(0.9, Math.max(0.1, l * (1 + lightVariation))); // Keep lightness in reasonable range

        // Convert back to RGB
        let r1, g1, b1;

        if (s === 0) {
          r1 = g1 = b1 = newL; // achromatic
        } else {
          const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          };

          const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
          const p = 2 * newL - q;

          r1 = hue2rgb(p, q, h + 1 / 3);
          g1 = hue2rgb(p, q, h);
          b1 = hue2rgb(p, q, h - 1 / 3);
        }

        // Add slight random noise for texture
        const noiseAmount = 0.05;
        const noise = () => (random() * 2 - 1) * noiseAmount;

        // Return final color
        return [
          Math.min(255, Math.max(0, Math.floor(r1 * 255 * (1 + noise())))),
          Math.min(255, Math.max(0, Math.floor(g1 * 255 * (1 + noise())))),
          Math.min(255, Math.max(0, Math.floor(b1 * 255 * (1 + noise())))),
          a,
        ];
      } else {
        // Generate colors with better distribution using golden ratio
        const hue = (index * 0.618033988749895) % 1; // Golden ratio distribution

        // Convert HSV to RGB for better color distribution
        let r, g, b;
        const h = hue * 6;
        const i = Math.floor(h);
        const f = h - i;
        const p = 0.5;
        const q = 0.5 * (1 - f);
        const t = 0.5 * (1 - (1 - f));

        switch (i % 6) {
          case 0:
            r = 0.5;
            g = t;
            b = p;
            break;
          case 1:
            r = q;
            g = 0.5;
            b = p;
            break;
          case 2:
            r = p;
            g = 0.5;
            b = t;
            break;
          case 3:
            r = p;
            g = q;
            b = 0.5;
            break;
          case 4:
            r = t;
            g = p;
            b = 0.5;
            break;
          case 5:
            r = 0.5;
            g = p;
            b = q;
            break;
        }

        return [
          Math.floor(r * 255 + 50 + random() * 100),
          Math.floor(g * 255 + 50 + random() * 100),
          Math.floor(b * 255 + 50 + random() * 100),
          255,
        ];
      }
    };

    // Generate cell points in a grid with jitter
    for (let gridY = 0; gridY < gridSize; gridY++) {
      for (let gridX = 0; gridX < gridSize; gridX++) {
        if (cellPoints.length >= cellCount) break;

        // Base position in grid
        const baseX = gridX * cellWidth + cellWidth / 2;
        const baseY = gridY * cellHeight + cellHeight / 2;

        // Add jitter
        const jitterX = (random() * 2 - 1) * jitter * cellWidth;
        const jitterY = (random() * 2 - 1) * jitter * cellHeight;

        cellPoints.push({
          x: Math.floor(baseX + jitterX),
          y: Math.floor(baseY + jitterY),
        });

        // Generate color for this cell
        if (cellColors && cellPoints.length - 1 < cellColors.length) {
          colors.push(cellColors[cellPoints.length - 1]);
        } else {
          colors.push(generateColorFromBase(cellPoints.length - 1));
        }
      }
    }

    // Tiled distance calculation for seamless wrapping
    const tiledDistance = (x1, y1, x2, y2) => {
      // Calculate direct distance
      let dx = Math.abs(x1 - x2);
      let dy = Math.abs(y1 - y2);

      // Consider wrapping around for tiling
      dx = Math.min(dx, width - dx);
      dy = Math.min(dy, height - dy);

      // Use a mix of Euclidean and Manhattan distance for interesting patterns
      const euclidean = Math.sqrt(dx * dx + dy * dy);
      const manhattan = dx + dy;

      return euclidean * 0.8 + manhattan * 0.2;
    };

    // Generate the pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;

        // Find two closest cell centers
        let closestDist = Infinity;
        let secondClosestDist = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < cellPoints.length; i++) {
          const dist = tiledDistance(x, y, cellPoints[i].x, cellPoints[i].y);

          if (dist < closestDist) {
            secondClosestDist = closestDist;
            closestDist = dist;
            closestIndex = i;
          } else if (dist < secondClosestDist) {
            secondClosestDist = dist;
          }
        }

        // Multiple wrappings for better tiling at edges
        // Check distances to virtual cells across the boundaries
        for (let i = 0; i < cellPoints.length; i++) {
          // Check cell wrapping in all 8 directions
          for (let wrapX = -1; wrapX <= 1; wrapX++) {
            for (let wrapY = -1; wrapY <= 1; wrapY++) {
              if (wrapX === 0 && wrapY === 0) continue; // Skip the original cell

              const wrappedX = cellPoints[i].x + wrapX * width;
              const wrappedY = cellPoints[i].y + wrapY * height;

              const dist = Math.sqrt(
                Math.pow(x - wrappedX, 2) + Math.pow(y - wrappedY, 2)
              );

              if (dist < closestDist) {
                secondClosestDist = closestDist;
                closestDist = dist;
                closestIndex = i;
              } else if (dist < secondClosestDist) {
                secondClosestDist = dist;
              }
            }
          }
        }

        // More precise edge detection
        const edgeDist = secondClosestDist - closestDist;
        const isEdge = edgeDist < edgeThickness;

        // Set pixel color
        if (isEdge) {
          data.set(edgeColor, offset);
        } else {
          data.set(colors[closestIndex], offset);
        }
      }
    }

    return data;
  }

  static penrose(width, height, options = {}) {
    return generatePenroseTilingPixels(width, height, options);
  }
}
