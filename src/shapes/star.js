import { Shape } from "./shape.js";
import { Painter } from "../painter/painter.js";

/**
 * Star - A multi-pointed star shape.
 *
 * With the origin-based coordinate system (v3.0):
 * - Draws relative to bounding box at (0, 0)
 * - Star center is at (radius, radius)
 */
export class Star extends Shape {
  constructor(radius = 40, spikes = 5, inset = 0.5, options = {}) {
    super(options);
    this.radius = radius;
    this.spikes = spikes;
    this.inset = inset;
    this.width = radius * 2;
    this.height = radius * 2;
  }

  draw() {
    super.draw();
    const step = Math.PI / this.spikes;
    const rotationOffset = -Math.PI / 2;
    // Star center is at (radius, radius) from bounding box top-left
    const cx = this.radius;
    const cy = this.radius;

    // Render
    Painter.lines.beginPath();
    // Draw the star shape
    for (let i = 0; i < this.spikes * 2; i++) {
      const isOuter = i % 2 === 0;
      const r = isOuter ? this.radius : this.radius * this.inset;
      const angle = i * step + rotationOffset;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) {
        Painter.lines.moveTo(x, y);
      } else {
        Painter.lines.lineTo(x, y);
      }
    }
    // Close the path
    Painter.lines.closePath();
    // Fill
    if (this.color) {
      Painter.colors.fill(this.color);
    }
    // Stroke
    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
    }
  }

  /* draw() {
    // First apply transforms as usual
    super.draw();
    
    // Get the current transform matrix to preserve positioning
    const transform = Painter.ctx.getTransform();
    
    // Create a temporary off-screen canvas sized to fit the star
    const tempCanvas = document.createElement('canvas');
    const padding = Math.ceil(this.radius * 0.1) + 2; // Small padding
    tempCanvas.width = this.radius * 2 + padding * 2;
    tempCanvas.height = this.radius * 2 + padding * 2;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Center the drawing in the temp canvas
    tempCtx.translate(tempCanvas.width/2, tempCanvas.height/2);
    
    // Draw the star with clean state
    tempCtx.beginPath();
    const step = Math.PI / this.spikes;
    const rotationOffset = -Math.PI / 2;
    
    for (let i = 0; i < this.spikes * 2; i++) {
      const isOuter = i % 2 === 0;
      const r = isOuter ? this.radius : this.radius * this.inset;
      const angle = i * step + rotationOffset;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      if (i === 0) {
        tempCtx.moveTo(x, y);
      } else {
        tempCtx.lineTo(x, y);
      }
    }
    
    tempCtx.closePath();
    
    // Fill with explicit color
    tempCtx.fillStyle = this.color || 'white';
    tempCtx.fill();
    
    // Stroke if needed
    if (this.stroke) {
      tempCtx.strokeStyle = this.stroke;
      tempCtx.lineWidth = this.lineWidth;
      tempCtx.stroke();
    }
    
    // Now draw this to the main canvas at the correct position
    Painter.ctx.drawImage(
      tempCanvas, 
      -tempCanvas.width/2, 
      -tempCanvas.height/2
    );
  } */
}
