import { Shape } from "./shape.js";
import { Painter } from "../painter.js";

/**
 * StickFigure - A simple humanoid stick figure composed of circles and lines.
 * Good for demos, games, and jokes about bad posture.
 */
export class StickFigure extends Shape {
  /**
   * @param {number} x - X position (center of figure)
   * @param {number} y - Y position (center of figure)
   * @param {number} scale - Scale multiplier for size
   * @param {object} options - Style options
   * @param {string} [options.strokeColor="#000"] - Line color
   * @param {string} [options.headColor] - Fill color of the head
   * @param {string} [options.jointColor] - Fill color of joint circles
   * @param {number} [options.lineWidth=2] - Line width
   * @param {boolean} [options.showJoints=true] - Whether to draw joints
   */
  constructor(x, y, scale = 1, options = {}) {
    super(x, y, options);
    this.scale = scale;

    this.strokeColor = options.strokeColor || "#000";
    this.headColor = options.headColor || this.strokeColor;
    this.jointColor = options.jointColor || this.strokeColor;
    this.lineWidth = options.lineWidth || 2;
    this.showJoints = options.showJoints !== false; // default to true
  }

  draw() {
    super.draw();
    const s = this.scale;
    // Layout
    const headR = 10 * s;
    const headCenterY = -30 * s;
    const neckY = headCenterY + headR;
    const torsoTop = neckY;
    const torsoBottom = torsoTop + 40 * s;
    const armY = torsoTop + 10 * s;
    const shoulderX = 15 * s;
    const hipX = 10 * s;
    const legY = torsoBottom + 40 * s;
    const jointR = 3 * s;
    this.renderWithTransform(() => {
      // Head
      Painter.fillCircle(0, headCenterY, headR, this.headColor);
      Painter.strokeCircle(
        0,
        headCenterY,
        headR,
        this.strokeColor,
        this.lineWidth
      );
      // Torso
      Painter.line(
        0,
        torsoTop,
        0,
        torsoBottom,
        this.strokeColor,
        this.lineWidth
      );
      // Arms
      Painter.line(
        -shoulderX,
        armY,
        shoulderX,
        armY,
        this.strokeColor,
        this.lineWidth
      );
      // Legs
      Painter.line(
        0,
        torsoBottom,
        -hipX,
        legY,
        this.strokeColor,
        this.lineWidth
      );
      Painter.line(
        0,
        torsoBottom,
        hipX,
        legY,
        this.strokeColor,
        this.lineWidth
      );
      // Joints (optional)
      if (this.showJoints) {
        const joints = [
          [0, torsoTop],
          [-shoulderX, armY],
          [shoulderX, armY],
          [0, torsoBottom],
          [-hipX, legY],
          [hipX, legY],
        ];
        joints.forEach(([jx, jy]) =>
          Painter.fillCircle(jx, jy, jointR, this.jointColor)
        );
      }
    });
  }

  getBounds() {
    const h = 100 * this.scale;
    const w = 40 * this.scale;
    return {
      x: this.x,
      y: this.y,
      width: w,
      height: h,
    };
  }
}
