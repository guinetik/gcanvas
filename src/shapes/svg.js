import { Painter } from "../painter";
import { Shape } from "./shape";

/**
 * SVGPath - A specialized Shape class that can render SVG path data
 */
export class SVGPath extends Shape {
  /**
   * @param {number} x - Center X position
   * @param {number} y - Center Y position
   * @param {string} svgPathData - SVG path data string (e.g. "M0,0 L10,10...")
   * @param {object} options - Standard shape options plus SVG-specific options
   * @param {number} [options.scale=1] - Scale factor for the SVG
   * @param {boolean} [options.centerPath=true] - Automatically center the path
   * @param {number} [options.animationProgress=1] - Animation progress (0-1)
   */
  constructor(x, y, svgPathData, options = {}) {
    super(x, y, options);

    // SVG specific options
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
   * @param {string} svgPath - SVG path data string
   * @returns {Array} Array of path commands
   */
  parseSVGPath(svgPath) {
    // Regular expressions to match SVG path commands
    const moveRegex = /M\s*([-\d.]+)[,\s]*([-\d.]+)/g;
    const lineRegex = /L\s*([-\d.]+)[,\s]*([-\d.]+)/g;
    const curveRegex =
      /C\s*([-\d.]+)[,\s]*([-\d.]+)\s*([-\d.]+)[,\s]*([-\d.]+)\s*([-\d.]+)[,\s]*([-\d.]+)/g;
    const zRegex = /Z/g;

    // Arrays to store the parsed commands
    const commands = [];

    // Match and process Move commands (M)
    let match;
    while ((match = moveRegex.exec(svgPath)) !== null) {
      commands.push(["M", parseFloat(match[1]), parseFloat(match[2])]);
    }

    // Match and process Line commands (L)
    while ((match = lineRegex.exec(svgPath)) !== null) {
      // Convert line to bezier curve for animation
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);

      // Find the previous point to calculate the control points
      let prevX = 0;
      let prevY = 0;
      for (let i = commands.length - 1; i >= 0; i--) {
        const cmd = commands[i];
        if (cmd[0] === "M") {
          prevX = cmd[1];
          prevY = cmd[2];
          break;
        } else if (cmd[0] === "C") {
          prevX = cmd[5];
          prevY = cmd[6];
          break;
        }
      }

      // Calculate control points for an approximated curve
      // For a line, we can use control points that are 1/3 and 2/3 along the line
      const cp1x = prevX + (x - prevX) / 3;
      const cp1y = prevY + (y - prevY) / 3;
      const cp2x = prevX + (2 * (x - prevX)) / 3;
      const cp2y = prevY + (2 * (y - prevY)) / 3;

      commands.push(["C", cp1x, cp1y, cp2x, cp2y, x, y]);
    }

    // Match and process Curve commands (C)
    while ((match = curveRegex.exec(svgPath)) !== null) {
      commands.push([
        "C",
        parseFloat(match[1]),
        parseFloat(match[2]),
        parseFloat(match[3]),
        parseFloat(match[4]),
        parseFloat(match[5]),
        parseFloat(match[6]),
      ]);
    }

    // Match and process Close commands (Z)
    if (zRegex.test(svgPath)) {
      commands.push(["Z"]);
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
      if (cmd[0] === "M") {
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
      if (cmd[0] === "M") {
        return [
          "M",
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
      if (cmd[0] === "M") {
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
      if (cmd[0] === "M") {
        return ["M", cmd[1] * scale, cmd[2] * scale];
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
   * Calculate a point along a bezier curve at time t
   * @param {Array} segment - Path segment command
   * @param {number} t - Time parameter (0-1)
   * @returns {Object} Point coordinates {x, y}
   */
  getBezierPoint(segment, t) {
    if (segment[0] === "M") {
      // For move commands, just return the point
      return { x: segment[1], y: segment[2] };
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
   * Get a subset of the path up to the current animation progress
   * @returns {Array} Array of path commands representing the partial path
   */
  getPartialPath() {
    const result = [];
    let totalSegments = this.pathCommands.length;
    let segmentIndex = Math.floor(this.animationProgress * totalSegments);
    let segmentProgress = (this.animationProgress * totalSegments) % 1;
    
    // Initialize with a null previous point to indicate no previous point exists
    let hasPrevPoint = false;
    this.prevX = 0;
    this.prevY = 0;
    
    // Add all completed segments
    for (let i = 0; i < segmentIndex; i++) {
      const cmd = this.pathCommands[i];
      
      // Add to result
      result.push([...cmd]);
      
      // Track points for bezier calculations
      if (cmd[0] === "M") {
        // For Move commands, just update position
        this.prevX = cmd[1];
        this.prevY = cmd[2];
        hasPrevPoint = true; // Now we have a previous point
      } else if (cmd[0] === "C") {
        // For Bezier commands, update to end point
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
        hasPrevPoint = true;
      } else if (currentSegment[0] === "C") {
        if (!hasPrevPoint) {
          // If there's no previous point but we're trying to draw a curve,
          // we need to find the closest previous Move command
          for (let i = segmentIndex - 1; i >= 0; i--) {
            if (this.pathCommands[i][0] === "M") {
              this.prevX = this.pathCommands[i][1];
              this.prevY = this.pathCommands[i][2];
              hasPrevPoint = true;
              break;
            }
          }
          
          // If still no previous point, use (0,0)
          if (!hasPrevPoint) {
            this.prevX = 0;
            this.prevY = 0;
          }
        }
        
        // Calculate the partial curve point
        const point = this.getBezierPoint(currentSegment, segmentProgress);
        
        // Add partial curve to result
        result.push([
          "C",
          currentSegment[1],
          currentSegment[2],
          currentSegment[3],
          currentSegment[4],
          point.x,
          point.y
        ]);
        
        this.currentPoint = point;
      }
    }
    
    return result;
  }

  /**
   * Draw the SVG path
   */
  draw() {
    super.draw();

    this.renderWithTransform(() => {
      // Get the path to draw based on animation progress
      const pathToDraw = this.getPartialPath();

      // Use Painter to render the path
      Painter.path(
        pathToDraw,
        this.fillColor,
        this.strokeColor,
        this.lineWidth
      );
    });
  }

  /**
   * Get the current position of the "pen" for animations
   * @returns {Object} Current point {x, y} in world coordinates
   */
  getCurrentPoint() {
    return {
      x: this.x + this.currentPoint.x,
      y: this.y + this.currentPoint.y,
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
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.originalWidth || 100,
      height: this.originalHeight || 100,
    };
  }
}
