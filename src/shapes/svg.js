import { Painter } from "../painter/painter";
import { Shape } from "./shape";

/**
 * SVGShape - A specialized Shape class that can render SVG path data
 */
export class SVGShape extends Shape {
  /**
   * Load an SVG file from a URL and create an SVGShape
   * @param {string} url - URL to the SVG file
   * @param {object} options - Standard shape options plus SVG-specific options
   * @returns {Promise<SVGShape>} Promise that resolves to the SVGShape instance
   */
  static async fromURL(url, options = {}) {
    const response = await fetch(url);
    const svgText = await response.text();

    // Parse SVG to extract path data
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    // Get the first path element's d attribute
    const pathElement = doc.querySelector('path');
    if (!pathElement) {
      throw new Error('No path element found in SVG');
    }

    const pathData = pathElement.getAttribute('d');
    if (!pathData) {
      throw new Error('Path element has no d attribute');
    }

    return new SVGShape(pathData, options);
  }

  /**
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {string} svgPathData - SVG path data string (e.g. "M0,0 L10,10...")
   * @param {object} options - Standard shape options plus SVG-specific options
   * @param {number} [options.scale=1] - Scale factor for the SVG
   * @param {boolean} [options.centerPath=true] - Automatically center the path
   * @param {number} [options.animationProgress=1] - Animation progress (0-1)
   */
  constructor(svgPathData, options = {}) {
    super(options);
    // SVG specific options
    // Note: 'scale' is for pre-scaling the path data
    // scaleX/scaleY are inherited from Transformable for runtime transforms (e.g., flipping)
    this.scale = options.scale || 1;
    this.centerPath =
      options.centerPath !== undefined ? options.centerPath : true;
    this.animationProgress =
      options.animationProgress !== undefined ? options.animationProgress : 1;

    // Parse the SVG path data
    this.svgPathData = svgPathData;
    this.pathCommands = this.parseSVGPath(svgPathData);

    // If centering is enabled, center and scale the path
    if (this.centerPath) {
      this.pathCommands = this.centerAndScalePath(
        this.pathCommands,
        this.scale
      );
    } else {
      this.pathCommands = this.scalePath(this.pathCommands, this.scale);
    }

    // Drawing state tracking
    this.prevX = 0;
    this.prevY = 0;
    this.currentPoint = { x: 0, y: 0 };
  }

  /**
   * Parse an SVG path string into a command array for rendering
   * Parses commands in sequential order to maintain path integrity
   * @param {string} svgPath - SVG path data string
   * @returns {Array} Array of path commands
   */
  parseSVGPath(svgPath) {
    const commands = [];
    
    // Track current position for converting lines to curves
    let currentX = 0;
    let currentY = 0;
    let subpathStartX = 0;
    let subpathStartY = 0;
    
    // Single regex to match all commands in order
    // Matches: M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
    const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
    
    let match;
    while ((match = commandRegex.exec(svgPath)) !== null) {
      const command = match[1];
      const argsStr = match[2].trim();
      
      // Parse numbers from arguments
      const args = argsStr.length > 0 
        ? argsStr.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n))
        : [];
      
      switch (command) {
        case 'M': // Absolute moveto
          for (let i = 0; i < args.length; i += 2) {
            currentX = args[i];
            currentY = args[i + 1];
            if (i === 0) {
              subpathStartX = currentX;
              subpathStartY = currentY;
              commands.push(['M', currentX, currentY]);
            } else {
              // Subsequent coordinate pairs are implicit lineto
              commands.push(['L', currentX, currentY]);
            }
          }
          break;
          
        case 'm': // Relative moveto
          for (let i = 0; i < args.length; i += 2) {
            currentX += args[i];
            currentY += args[i + 1];
            if (i === 0) {
              subpathStartX = currentX;
              subpathStartY = currentY;
              commands.push(['M', currentX, currentY]);
            } else {
              commands.push(['L', currentX, currentY]);
            }
          }
          break;
          
        case 'L': // Absolute lineto
          for (let i = 0; i < args.length; i += 2) {
            const x = args[i];
            const y = args[i + 1];
            commands.push(['L', x, y]);
            currentX = x;
            currentY = y;
          }
          break;
          
        case 'l': // Relative lineto
          for (let i = 0; i < args.length; i += 2) {
            currentX += args[i];
            currentY += args[i + 1];
            commands.push(['L', currentX, currentY]);
          }
          break;
          
        case 'H': // Absolute horizontal lineto
          for (let i = 0; i < args.length; i++) {
            currentX = args[i];
            commands.push(['L', currentX, currentY]);
          }
          break;
          
        case 'h': // Relative horizontal lineto
          for (let i = 0; i < args.length; i++) {
            currentX += args[i];
            commands.push(['L', currentX, currentY]);
          }
          break;
          
        case 'V': // Absolute vertical lineto
          for (let i = 0; i < args.length; i++) {
            currentY = args[i];
            commands.push(['L', currentX, currentY]);
          }
          break;
          
        case 'v': // Relative vertical lineto
          for (let i = 0; i < args.length; i++) {
            currentY += args[i];
            commands.push(['L', currentX, currentY]);
          }
          break;
          
        case 'C': // Absolute cubic bezier
          for (let i = 0; i < args.length; i += 6) {
            commands.push(['C', args[i], args[i+1], args[i+2], args[i+3], args[i+4], args[i+5]]);
            currentX = args[i + 4];
            currentY = args[i + 5];
          }
          break;
          
        case 'c': // Relative cubic bezier
          for (let i = 0; i < args.length; i += 6) {
            commands.push(['C', 
              currentX + args[i], currentY + args[i+1],
              currentX + args[i+2], currentY + args[i+3],
              currentX + args[i+4], currentY + args[i+5]
            ]);
            currentX += args[i + 4];
            currentY += args[i + 5];
          }
          break;
          
        case 'S': // Absolute smooth cubic bezier
          for (let i = 0; i < args.length; i += 4) {
            // Reflect previous control point
            const lastCmd = commands[commands.length - 1];
            let cp1x = currentX, cp1y = currentY;
            if (lastCmd && lastCmd[0] === 'C') {
              cp1x = 2 * currentX - lastCmd[3];
              cp1y = 2 * currentY - lastCmd[4];
            }
            commands.push(['C', cp1x, cp1y, args[i], args[i+1], args[i+2], args[i+3]]);
            currentX = args[i + 2];
            currentY = args[i + 3];
          }
          break;
          
        case 's': // Relative smooth cubic bezier
          for (let i = 0; i < args.length; i += 4) {
            const lastCmd = commands[commands.length - 1];
            let cp1x = currentX, cp1y = currentY;
            if (lastCmd && lastCmd[0] === 'C') {
              cp1x = 2 * currentX - lastCmd[3];
              cp1y = 2 * currentY - lastCmd[4];
            }
            commands.push(['C', cp1x, cp1y, 
              currentX + args[i], currentY + args[i+1],
              currentX + args[i+2], currentY + args[i+3]
            ]);
            currentX += args[i + 2];
            currentY += args[i + 3];
          }
          break;
          
        case 'Q': // Absolute quadratic bezier - convert to cubic
          for (let i = 0; i < args.length; i += 4) {
            const qx = args[i], qy = args[i+1];
            const x = args[i+2], y = args[i+3];
            // Convert quadratic to cubic control points
            const cp1x = currentX + 2/3 * (qx - currentX);
            const cp1y = currentY + 2/3 * (qy - currentY);
            const cp2x = x + 2/3 * (qx - x);
            const cp2y = y + 2/3 * (qy - y);
            commands.push(['C', cp1x, cp1y, cp2x, cp2y, x, y]);
            currentX = x;
            currentY = y;
          }
          break;
          
        case 'q': // Relative quadratic bezier - convert to cubic
          for (let i = 0; i < args.length; i += 4) {
            const qx = currentX + args[i], qy = currentY + args[i+1];
            const x = currentX + args[i+2], y = currentY + args[i+3];
            const cp1x = currentX + 2/3 * (qx - currentX);
            const cp1y = currentY + 2/3 * (qy - currentY);
            const cp2x = x + 2/3 * (qx - x);
            const cp2y = y + 2/3 * (qy - y);
            commands.push(['C', cp1x, cp1y, cp2x, cp2y, x, y]);
            currentX = x;
            currentY = y;
          }
          break;
          
        case 'Z': // Close path
        case 'z':
          commands.push(['Z']);
          currentX = subpathStartX;
          currentY = subpathStartY;
          break;
          
        // T, t (smooth quadratic) and A, a (arc) could be added if needed
      }
    }
    
    return commands;
  }

  /**
   * Center and scale the path commands
   * @param {Array} path - Array of path commands
   * @param {number} scale - Scale factor
   * @returns {Array} Centered and scaled path commands
   */
  centerAndScalePath(path, scale) {
    // Find the bounds of the path
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const cmd of path) {
      if (cmd[0] === "M" || cmd[0] === "L") {
        minX = Math.min(minX, cmd[1]);
        minY = Math.min(minY, cmd[2]);
        maxX = Math.max(maxX, cmd[1]);
        maxY = Math.max(maxY, cmd[2]);
      } else if (cmd[0] === "C") {
        minX = Math.min(minX, cmd[1], cmd[3], cmd[5]);
        minY = Math.min(minY, cmd[2], cmd[4], cmd[6]);
        maxX = Math.max(maxX, cmd[1], cmd[3], cmd[5]);
        maxY = Math.max(maxY, cmd[2], cmd[4], cmd[6]);
      }
    }

    // Calculate center of the original path
    const pathCenterX = (minX + maxX) / 2;
    const pathCenterY = (minY + maxY) / 2;

    // Save the original dimensions for bounds calculation
    this.originalWidth = (maxX - minX) * scale;
    this.originalHeight = (maxY - minY) * scale;

    // Translate the center to the origin and scale
    return path.map((cmd) => {
      if (cmd[0] === "M" || cmd[0] === "L") {
        return [
          cmd[0],
          (cmd[1] - pathCenterX) * scale,
          (cmd[2] - pathCenterY) * scale,
        ];
      } else if (cmd[0] === "C") {
        return [
          "C",
          (cmd[1] - pathCenterX) * scale,
          (cmd[2] - pathCenterY) * scale,
          (cmd[3] - pathCenterX) * scale,
          (cmd[4] - pathCenterY) * scale,
          (cmd[5] - pathCenterX) * scale,
          (cmd[6] - pathCenterY) * scale,
        ];
      } else {
        return [...cmd]; // Z command
      }
    });
  }

  /**
   * Scale the path commands without centering
   * @param {Array} path - Array of path commands
   * @param {number} scale - Scale factor
   * @returns {Array} Scaled path commands
   */
  scalePath(path, scale) {
    // Find the bounds for dimension calculation
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    for (const cmd of path) {
      if (cmd[0] === "M" || cmd[0] === "L") {
        minX = Math.min(minX, cmd[1]);
        minY = Math.min(minY, cmd[2]);
        maxX = Math.max(maxX, cmd[1]);
        maxY = Math.max(maxY, cmd[2]);
      } else if (cmd[0] === "C") {
        minX = Math.min(minX, cmd[1], cmd[3], cmd[5]);
        minY = Math.min(minY, cmd[2], cmd[4], cmd[6]);
        maxX = Math.max(maxX, cmd[1], cmd[3], cmd[5]);
        maxY = Math.max(maxY, cmd[2], cmd[4], cmd[6]);
      }
    }

    // Save the original dimensions for bounds calculation
    this.originalWidth = (maxX - minX) * scale;
    this.originalHeight = (maxY - minY) * scale;

    // Scale without centering
    return path.map((cmd) => {
      if (cmd[0] === "M" || cmd[0] === "L") {
        return [cmd[0], cmd[1] * scale, cmd[2] * scale];
      } else if (cmd[0] === "C") {
        return [
          "C",
          cmd[1] * scale,
          cmd[2] * scale,
          cmd[3] * scale,
          cmd[4] * scale,
          cmd[5] * scale,
          cmd[6] * scale,
        ];
      } else {
        return [...cmd]; // Z command
      }
    });
  }

  /**
   * Calculate a point along a segment at time t
   * @param {Array} segment - Path segment command
   * @param {number} t - Time parameter (0-1)
   * @returns {Object} Point coordinates {x, y}
   */
  getPointOnSegment(segment, t) {
    if (segment[0] === "M") {
      // For move commands, just return the point
      return { x: segment[1], y: segment[2] };
    } else if (segment[0] === "L") {
      // For line commands, linear interpolation
      const x = this.prevX + (segment[1] - this.prevX) * t;
      const y = this.prevY + (segment[2] - this.prevY) * t;
      return { x, y };
    } else if (segment[0] === "C") {
      // For Cubic Bezier curves, calculate the point at t
      const startX = this.prevX;
      const startY = this.prevY;
      const cp1x = segment[1];
      const cp1y = segment[2];
      const cp2x = segment[3];
      const cp2y = segment[4];
      const endX = segment[5];
      const endY = segment[6];

      // Cubic Bezier formula
      const x =
        Math.pow(1 - t, 3) * startX +
        3 * Math.pow(1 - t, 2) * t * cp1x +
        3 * (1 - t) * Math.pow(t, 2) * cp2x +
        Math.pow(t, 3) * endX;

      const y =
        Math.pow(1 - t, 3) * startY +
        3 * Math.pow(1 - t, 2) * t * cp1y +
        3 * (1 - t) * Math.pow(t, 2) * cp2y +
        Math.pow(t, 3) * endY;

      return { x, y };
    }

    return { x: 0, y: 0 };
  }
  
  /**
   * @deprecated Use getPointOnSegment instead
   */
  getBezierPoint(segment, t) {
    return this.getPointOnSegment(segment, t);
  }

  /**
   * Get a subset of the path up to the current animation progress
   * @returns {Array} Array of path commands representing the partial path
   */
  getPartialPath() {
    const result = [];
    let totalSegments = this.pathCommands.length;
    let segmentIndex = Math.floor(this.animationProgress * totalSegments);
    let segmentProgress = (this.animationProgress * totalSegments) % 1;

    // Initialize previous point tracking
    let hasPrevPoint = false;
    this.prevX = 0;
    this.prevY = 0;

    // Add all completed segments
    for (let i = 0; i < segmentIndex; i++) {
      const cmd = this.pathCommands[i];
      result.push([...cmd]);

      // Track current position
      if (cmd[0] === "M" || cmd[0] === "L") {
        this.prevX = cmd[1];
        this.prevY = cmd[2];
        hasPrevPoint = true;
      } else if (cmd[0] === "C") {
        this.prevX = cmd[5];
        this.prevY = cmd[6];
        hasPrevPoint = true;
      }
    }

    // Add the current segment with partial progress
    if (segmentIndex < totalSegments) {
      const currentSegment = this.pathCommands[segmentIndex];

      if (currentSegment[0] === "M") {
        // For Move commands, add the full move
        result.push([...currentSegment]);
        this.prevX = currentSegment[1];
        this.prevY = currentSegment[2];
        this.currentPoint = { x: currentSegment[1], y: currentSegment[2] };
      } else if (currentSegment[0] === "L") {
        // For Line commands, interpolate position
        if (!hasPrevPoint) {
          this.findPreviousPoint(segmentIndex);
        }
        const point = this.getPointOnSegment(currentSegment, segmentProgress);
        result.push(['L', point.x, point.y]);
        this.currentPoint = point;
      } else if (currentSegment[0] === "C") {
        // For Curve commands, interpolate along bezier
        if (!hasPrevPoint) {
          this.findPreviousPoint(segmentIndex);
        }
        const point = this.getPointOnSegment(currentSegment, segmentProgress);
        
        // For partial bezier, we need to split the curve
        // Simplified: just draw to the current point
        result.push([
          "C",
          currentSegment[1],
          currentSegment[2],
          currentSegment[3],
          currentSegment[4],
          point.x,
          point.y,
        ]);
        this.currentPoint = point;
      } else if (currentSegment[0] === "Z") {
        // Close path - add if we've progressed past it
        if (segmentProgress > 0.5) {
          result.push(['Z']);
        }
        this.currentPoint = { x: this.prevX, y: this.prevY };
      }
    }

    return result;
  }
  
  /**
   * Find the previous point by looking back through commands
   * @param {number} fromIndex - Index to search backwards from
   */
  findPreviousPoint(fromIndex) {
    for (let i = fromIndex - 1; i >= 0; i--) {
      const cmd = this.pathCommands[i];
      if (cmd[0] === "M" || cmd[0] === "L") {
        this.prevX = cmd[1];
        this.prevY = cmd[2];
        return;
      } else if (cmd[0] === "C") {
        this.prevX = cmd[5];
        this.prevY = cmd[6];
        return;
      }
    }
    // Default to origin
    this.prevX = 0;
    this.prevY = 0;
  }

  /**
   * Draw the SVG path
   */
  draw() {
    super.draw();
    // Get the path to draw based on animation progress
    const pathToDraw = this.getPartialPath();
    //console.log(pathToDraw);
    // Use Painter to render the path
    Painter.lines.path(
      pathToDraw,
      this.color,
      this.stroke,
      this.lineWidth
    );
  }

  /**
   * Get the current position of the "pen" for animations
   * @returns {Object} Current point {x, y} in world coordinates
   */
  getCurrentPoint() {
    return {
      x: this.currentPoint.x,
      y: this.currentPoint.y,
    };
  }

  /**
   * Set the animation progress
   * @param {number} progress - Animation progress (0-1)
   */
  setAnimationProgress(progress) {
    this.animationProgress = Math.max(0, Math.min(1, progress));
  }

  /**
   * Get bounds of the shape for hit detection and layout
   * @returns {Object} Bounds {x, y, width, height}
   */
  calculateBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.originalWidth || 100,
      height: this.originalHeight || 100,
    };
  }
}
