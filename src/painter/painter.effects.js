import { Painter } from "./painter";

export class PainterEffects {
  /**
   * Set shadow properties
   * @param {string} color - Shadow color
   * @param {number} blur - Shadow blur
   * @param {number} [offsetX=0] - Shadow X offset
   * @param {number} [offsetY=0] - Shadow Y offset
   * @returns {void}
   */
  static dropShadow(color, blur, offsetX = 0, offsetY = 0) {
    Painter.ctx.shadowColor = color;
    Painter.ctx.shadowBlur = blur;
    Painter.ctx.shadowOffsetX = offsetX;
    Painter.ctx.shadowOffsetY = offsetY;
  }

  /**
   * Clear shadow
   * @returns {void}
   */
  static clearShadow() {
    Painter.ctx.shadowColor = "rgba(0, 0, 0, 0)";
    Painter.ctx.shadowBlur = 0;
    Painter.ctx.shadowOffsetX = 0;
    Painter.ctx.shadowOffsetY = 0;
  }

  /**
   * Set global alpha
   * @param {number} alpha - Alpha value (0-1)
   * @returns {void}
   */
  static setAlpha(alpha) {
    Painter.ctx.globalAlpha = alpha;
  }

  /**
   * Set global composite operation
   * @param {GlobalCompositeOperation} operation - Composite operation
   * @returns {void}
   */
  static setBlendMode(operation) {
    Painter.ctx.globalCompositeOperation = operation;
  }

  /**
   * Clip to a rectangular region
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @returns {void}
   */
  static clipRect(x, y, width, height) {
    Painter.ctx.beginPath();
    Painter.ctx.rect(x, y, width, height);
    Painter.ctx.clip();
  }

  /**
   * Clip to a circular region
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} radius - Circle radius
   * @returns {void}
   */
  static clipCircle(x, y, radius) {
    Painter.ctx.beginPath();
    Painter.shapes.arc(x, y, radius, 0, Math.PI * 2);
    Painter.ctx.clip();
  }

  /**
   * Apply a blur filter to a region
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Width
   * @param {number} height - Height
   * @param {number} blur - Blur amount (pixels)
   * @returns {void}
   */
  static blurRegion(x, y, width, height, blur) {
    // Save current filter
    const currentFilter = Painter.ctx.filter;

    // Apply blur filter
    Painter.ctx.filter = `blur(${blur}px)`;

    // Draw the region from the canvas back onto itself with the filter
    const imageData = Painter.ctx.getImageData(x, y, width, height);
    Painter.ctx.putImageData(imageData, x, y);

    // Restore previous filter
    Painter.ctx.filter = currentFilter;
  }


   // Static properties to track current effect state
   static _activeEffects = new Map();
   static _animationId = null;
   
   /**
    * Create a glow effect that can be animated
    * @param {string} color - Base color for the glow
    * @param {number} blur - Initial blur amount
    * @param {Object} [options] - Animation options
    * @param {number} [options.pulseSpeed=0] - Speed of pulsing (0 for static)
    * @param {number} [options.pulseMin=blur*0.5] - Minimum blur during pulsing
    * @param {number} [options.pulseMax=blur*1.5] - Maximum blur during pulsing
    * @param {number} [options.colorShift=0] - Hue shift speed (0 for static)
    * @returns {Object} - Control object for the effect
    */
   static createGlow(color, blur, options = {}) {
     const id = 'glow-' + Math.random().toString(36).substr(2, 9);
     const defaultOptions = {
       pulseSpeed: 0,
       pulseMin: blur * 0.5,
       pulseMax: blur * 1.5,
       colorShift: 0
     };
     
     const effectOptions = {...defaultOptions, ...options};
     
     // Create effect state
     const effectState = {
       id,
       type: 'glow',
       active: true,
       time: 0,
       color,
       blur,
       options: effectOptions,
       
       // Method to update effect parameters
       update(params) {
         Object.assign(this, params);
         return this;
       },
       
       // Method to stop the effect
       stop() {
         this.active = false;
         PainterEffects._activeEffects.delete(this.id);
         return this;
       },
       
       // Method to apply the effect for the current frame
       apply() {
         if (!this.active) return;
         
         let currentBlur = this.blur;
         let currentColor = this.color;
         
         // Apply animation if enabled
         if (this.options.pulseSpeed > 0) {
           const pulseFactor = Math.sin(this.time * this.options.pulseSpeed) * 0.5 + 0.5;
           currentBlur = this.options.pulseMin + 
                         pulseFactor * (this.options.pulseMax - this.options.pulseMin);
         }
         
         if (this.options.colorShift > 0) {
           // Apply color shift - would need color parsing and HSL conversion
           // This is a simplified placeholder
           currentColor = currentColor.replace('hue', 
                                            (this.time * this.options.colorShift) % 360);
         }
         
         // Apply the actual glow effect
         Painter.ctx.shadowColor = currentColor;
         Painter.ctx.shadowBlur = currentBlur;
         Painter.ctx.shadowOffsetX = 0;
         Painter.ctx.shadowOffsetY = 0;
         
         this.time += 1/60; // Assuming 60fps
         return this;
       }
     };
     
     // Store and start tracking the effect
     PainterEffects._activeEffects.set(id, effectState);
     PainterEffects._startAnimationLoop();
     
     return effectState;
   }
   
   /**
    * Start the animation loop if not already running
    * @private
    */
   static _startAnimationLoop() {
     if (PainterEffects._animationId !== null) return;
     
     const animate = () => {
       // Apply all active effects
       PainterEffects._activeEffects.forEach(effect => {
         if (effect.active) effect.apply();
       });
       
       // Stop the loop if no active effects
       if (PainterEffects._activeEffects.size === 0) {
         cancelAnimationFrame(PainterEffects._animationId);
         PainterEffects._animationId = null;
         return;
       }
       
       PainterEffects._animationId = requestAnimationFrame(animate);
     };
     
     PainterEffects._animationId = requestAnimationFrame(animate);
   }
   
   /**
    * Clear all active effects
    */
   static clearAllEffects() {
     PainterEffects._activeEffects.forEach(effect => effect.stop());
     PainterEffects._activeEffects.clear();
     
     // Reset canvas context properties
     Painter.ctx.shadowColor = "rgba(0, 0, 0, 0)";
     Painter.ctx.shadowBlur = 0;
     Painter.ctx.shadowOffsetX = 0;
     Painter.ctx.shadowOffsetY = 0;
     Painter.ctx.filter = "none";
     Painter.ctx.globalAlpha = 1;
     Painter.ctx.globalCompositeOperation = "source-over";
   }
}
