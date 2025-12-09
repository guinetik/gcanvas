import { Complex } from "./complex";

// Helper function to convert hex color to RGB array
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
        1, // Add alpha
      ]
    : [0, 0, 0, 1];
}

export function generatePenroseTilingPixels(width = 800, height = 800, options) {
  // Get parameters from options or use defaults
  const {
    divisions = 5,
    zoomType = "in",
    color1 = [255, 0, 0, 255], // Red for thin rhombi (0-255 range)
    color2 = [0, 0, 255, 255], // Blue for thick rhombi (0-255 range)
    color3 = [0, 0, 0, 255],   // Black for outlines (0-255 range)
    backgroundColor = [255, 255, 255, 255], // White background (0-255 range)
  } = options || {};

  // Create pixel data array (RGBA - 4 bytes per pixel)
  const pixels = new Uint8ClampedArray(width * height * 4);

  // Fill with background color initially
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = backgroundColor[0];     // R
    pixels[i + 1] = backgroundColor[1]; // G
    pixels[i + 2] = backgroundColor[2]; // B
    pixels[i + 3] = backgroundColor[3] || 255; // A (default to 255 if not provided)
  }

  // Set up scale
  const scale = zoomType === "in" ? 1 : 2;
  const maxDim = Math.max(width, height);
  const scaleX = maxDim / scale;
  const scaleY = maxDim / scale;
  const translateX = 0.5 * scale;
  const translateY = 0.5 * scale;

  // Golden ratio
  const phi = (Math.sqrt(5) + 1) / 2;

  // Base for the tiling pattern
  const base = 5;

  // Create initial triangles
  let triangles = [];
  for (let i = 0; i < base * 2; i++) {
    const v2 = Complex.fromPolar(1, ((2 * i - 1) * Math.PI) / (base * 2));
    const v3 = Complex.fromPolar(1, ((2 * i + 1) * Math.PI) / (base * 2));

    if (i % 2 === 0) {
      // Mirror every other triangle
      triangles.push(["thin", new Complex(0), v3, v2]);
    } else {
      triangles.push(["thin", new Complex(0), v2, v3]);
    }
  }

  // Subdivide triangles
  for (let i = 0; i < divisions; i++) {
    const newTriangles = [];

    for (const [shape, v1, v2, v3] of triangles) {
      if (shape === "thin") {
        // Divide thin rhombus
        const p1 = v1.add(v2.subtract(v1).scale(1 / phi));
        newTriangles.push(["thin", v3, p1, v2]);
        newTriangles.push(["thicc", p1, v3, v1]);
      } else {
        // Divide thicc rhombus
        const p2 = v2.add(v1.subtract(v2).scale(1 / phi));
        const p3 = v2.add(v3.subtract(v2).scale(1 / phi));
        newTriangles.push(["thicc", p3, v3, v1]);
        newTriangles.push(["thicc", p2, p3, v2]);
        newTriangles.push(["thin", p3, p2, v1]);
      }
    }

    triangles = newTriangles;
  }

  // Convert triangle coordinates to screen coordinates
  function worldToScreen(point) {
    const x = Math.floor(
      ((point.real * scaleX + translateX * scaleX) * width) / maxDim
    );
    const y = Math.floor(
      ((point.imag * scaleY + translateY * scaleY) * height) / maxDim
    );
    return { x, y };
  }

  // Draw triangles to pixel array using rasterization
  for (const [shape, v1, v2, v3] of triangles) {
    const p1 = worldToScreen(v1);
    const p2 = worldToScreen(v2);
    const p3 = worldToScreen(v3);

    // Get color based on shape
    const color = shape === "thin" ? color1 : color2;

    // Rasterize triangle
    fillTriangle(pixels, p1, p2, p3, color, width, height);
  }

  // Optional: Draw outlines (simplified)
  if (color3 && color3[3] > 0) {
    for (const [shape, v1, v2, v3] of triangles) {
      const p1 = worldToScreen(v1);
      const p2 = worldToScreen(v2);
      const p3 = worldToScreen(v3);

      // Draw outline with 1px width
      drawLine(pixels, p1, p2, color3, width, height);
      drawLine(pixels, p2, p3, color3, width, height);
      drawLine(pixels, p3, p1, color3, width, height);
    }
  }

  return pixels;
}

// Helper function to fill a triangle
function fillTriangle(pixels, p1, p2, p3, color, width, height) {
  // Sort vertices by y-coordinate
  if (p1.y > p2.y) [p1, p2] = [p2, p1];
  if (p1.y > p3.y) [p1, p3] = [p3, p1];
  if (p2.y > p3.y) [p2, p3] = [p3, p2];
  
  // Get RGB values (now directly in 0-255 range)
  const r = color[0];
  const g = color[1];
  const b = color[2];
  const a = color[3] || 255; // Default alpha to 255 if not provided
  
  // Flat bottom triangle
  if (p2.y === p3.y) {
    fillFlatBottomTriangle(pixels, p1, p2, p3, r, g, b, a, width, height);
  }
  // Flat top triangle
  else if (p1.y === p2.y) {
    fillFlatTopTriangle(pixels, p1, p2, p3, r, g, b, a, width, height);
  }
  // General triangle - split into flat-bottom and flat-top triangles
  else {
    // Calculate the new vertex
    const p4 = {
      x: Math.floor(p1.x + ((p2.y - p1.y) / (p3.y - p1.y)) * (p3.x - p1.x)),
      y: p2.y
    };
    
    fillFlatBottomTriangle(pixels, p1, p2, p4, r, g, b, a, width, height);
    fillFlatTopTriangle(pixels, p2, p4, p3, r, g, b, a, width, height);
  }
}

// Helper to fill a flat-bottom triangle
function fillFlatBottomTriangle(pixels, p1, p2, p3, r, g, b, a, width, height) {
  const invSlope1 = (p2.x - p1.x) / (p2.y - p1.y || 1); // Avoid division by zero
  const invSlope2 = (p3.x - p1.x) / (p3.y - p1.y || 1);
  
  let curx1 = p1.x;
  let curx2 = p1.x;
  
  for (let scanlineY = p1.y; scanlineY <= p2.y; scanlineY++) {
    if (scanlineY >= 0 && scanlineY < height) {
      const startX = Math.max(0, Math.min(Math.floor(curx1), width - 1));
      const endX = Math.max(0, Math.min(Math.floor(curx2), width - 1));
      
      for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
        const index = (scanlineY * width + x) * 4;
        if (index >= 0 && index < pixels.length - 3) {
          pixels[index] = r;
          pixels[index + 1] = g;
          pixels[index + 2] = b;
          pixels[index + 3] = a;
        }
      }
    }
    
    curx1 += invSlope1;
    curx2 += invSlope2;
  }
}

// Helper to fill a flat-top triangle
function fillFlatTopTriangle(pixels, p1, p2, p3, r, g, b, a, width, height) {
  const invSlope1 = (p3.x - p1.x) / (p3.y - p1.y || 1);
  const invSlope2 = (p3.x - p2.x) / (p3.y - p2.y || 1);
  
  let curx1 = p3.x;
  let curx2 = p3.x;
  
  for (let scanlineY = p3.y; scanlineY > p1.y; scanlineY--) {
    if (scanlineY >= 0 && scanlineY < height) {
      curx1 -= invSlope1;
      curx2 -= invSlope2;
      
      const startX = Math.max(0, Math.min(Math.floor(curx1), width - 1));
      const endX = Math.max(0, Math.min(Math.floor(curx2), width - 1));
      
      for (let x = Math.min(startX, endX); x <= Math.max(startX, endX); x++) {
        const index = (scanlineY * width + x) * 4;
        if (index >= 0 && index < pixels.length - 3) {
          pixels[index] = r;
          pixels[index + 1] = g;
          pixels[index + 2] = b;
          pixels[index + 3] = a;
        }
      }
    }
  }
}

// Helper to draw a line using Bresenham's algorithm
function drawLine(pixels, p1, p2, color, width, height) {
  // Get RGB values (now directly in 0-255 range)
  const r = color[0];
  const g = color[1];
  const b = color[2];
  const a = color[3] || 255;
  
  let x0 = p1.x;
  let y0 = p1.y;
  let x1 = p2.x;
  let y1 = p2.y;
  
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  
  while (true) {
    if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
      const index = (y0 * width + x0) * 4;
      if (index >= 0 && index < pixels.length - 3) {
        // Simple alpha blending
        const alpha = a / 255;
        pixels[index] = Math.round(pixels[index] * (1 - alpha) + r * alpha);
        pixels[index + 1] = Math.round(pixels[index + 1] * (1 - alpha) + g * alpha);
        pixels[index + 2] = Math.round(pixels[index + 2] * (1 - alpha) + b * alpha);
        pixels[index + 3] = 255; // Full opacity for the line
      }
    }
    
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}
