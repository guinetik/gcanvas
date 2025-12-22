/**
 * IsometricGame Demo
 * 
 * Demonstrates the IsometricScene class for creating isometric tile-based games.
 * Features a bouncing ball that can be controlled with WASD and Space to jump.
 */
import {
  Game,
  GameObject,
  IsometricScene,
  Painter,
  Keys
} from "../../src/index";

/**
 * Configuration for the isometric demo
 */
const CONFIG = {
  gridSize: 10,
  tileWidth: 64,
  tileHeight: 32,
  elevationScale: 1.0,
  ball: {
    baseRadius: 8,
    color: "#3498db",
    strokeColor: "#2980b9",
    jumpPower: 4,
    gravity: 0.25,
    acceleration: 0.8,    // grid units per second squared
    maxVelocity: 0.12,    // max grid units per frame  
    friction: 0.90,
    bounceFactorWall: 0.5,
    bounceFactorGround: 0.2,
  },
  grid: {
    lineColor: "#ccc",
    originColor: "#FF0000",
    originRadius: 5,
  },
  // Platform layout: [x, y, width, depth, height, color]
  platforms: [
    // Starting platform (center) - big and low
    { x: -2, y: -2, w: 4, d: 4, h: 20, color: "#8B4513" },
    
    // Ramp going up-right (stepping stones)
    { x: 2, y: -2, w: 2, d: 2, h: 35, color: "#A0522D" },
    { x: 4, y: -2, w: 2, d: 2, h: 50, color: "#A0522D" },
    { x: 6, y: -2, w: 3, d: 3, h: 65, color: "#CD853F" },
    
    // High platform (top right)
    { x: 6, y: -6, w: 3, d: 3, h: 80, color: "#DEB887" },
    
    // Bridge/ramp going back
    { x: 4, y: -6, w: 2, d: 2, h: 65, color: "#A0522D" },
    { x: 2, y: -6, w: 2, d: 2, h: 50, color: "#A0522D" },
    { x: 0, y: -6, w: 2, d: 2, h: 35, color: "#8B4513" },
    
    // Side platform (green area)
    { x: -6, y: 0, w: 3, d: 3, h: 40, color: "#6B8E23" },
    { x: -6, y: 3, w: 2, d: 2, h: 25, color: "#556B2F" },
    
    // Lower platform (blue)
    { x: 3, y: 3, w: 3, d: 3, h: 30, color: "#4682B4" },
  ],
};

/**
 * An isometric 3D box/platform that the ball can stand on.
 */
class IsometricBox extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {IsometricScene} isoScene - The parent isometric scene
   * @param {Object} options - Box configuration
   * @param {number} options.x - Grid X position
   * @param {number} options.y - Grid Y position
   * @param {number} options.w - Width in grid units
   * @param {number} options.d - Depth in grid units
   * @param {number} options.h - Height in pixels
   * @param {string} options.color - Base color
   */
  constructor(game, isoScene, options) {
    super(game);
    this.isoScene = isoScene;
    this.x = options.x;
    this.y = options.y;
    this.w = options.w;
    this.d = options.d;
    this.h = options.h;
    this.baseColor = options.color;
    
    // Calculate colors for shading
    this.topColor = options.color;
    this.leftColor = this.shadeColor(options.color, -30);
    this.rightColor = this.shadeColor(options.color, -50);
  }
  
  /**
   * Custom depth value for sorting - uses front corner for proper overlap
   */
  get isoDepth() {
    // Use the front-most corner (x+w, y+d) plus height
    // Height factor matches ball's z factor for consistent sorting
    return (this.x + this.w) + (this.y + this.d) + this.h * 0.5;
  }

  /**
   * Shade a hex color by a percentage
   * @param {string} color - Hex color
   * @param {number} percent - Percentage to lighten/darken
   * @returns {string} Shaded hex color
   */
  shadeColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  /**
   * Check if a point is inside this box's X/Y bounds
   * @param {number} px - Point X in grid
   * @param {number} py - Point Y in grid
   * @param {number} margin - Optional margin for collision (default 0.1)
   * @returns {boolean}
   */
  containsPoint(px, py, margin = 0.1) {
    return px >= this.x - margin && px < this.x + this.w + margin &&
           py >= this.y - margin && py < this.y + this.d + margin;
  }
  
  /**
   * Get the surface height for landing.
   * Always returns the platform height - collision detection handles whether to use it.
   * @returns {number} Platform height
   */
  getSurfaceHeight() {
    return this.h;
  }

  /**
   * Renders the isometric box with 3 visible faces
   */
  render() {
    const scene = this.isoScene;
    const h = this.h * CONFIG.elevationScale;
    
    // Get the 4 corners of the top face
    const topNW = scene.toIsometric(this.x, this.y, this.h);
    const topNE = scene.toIsometric(this.x + this.w, this.y, this.h);
    const topSE = scene.toIsometric(this.x + this.w, this.y + this.d, this.h);
    const topSW = scene.toIsometric(this.x, this.y + this.d, this.h);
    
    // Get the 2 bottom corners we need
    const botSE = scene.toIsometric(this.x + this.w, this.y + this.d, 0);
    const botSW = scene.toIsometric(this.x, this.y + this.d, 0);
    const botNE = scene.toIsometric(this.x + this.w, this.y, 0);

    // Draw left face (front-left)
    Painter.useCtx((ctx) => {
      ctx.beginPath();
      ctx.moveTo(topSW.x, topSW.y);
      ctx.lineTo(topSE.x, topSE.y);
      ctx.lineTo(botSE.x, botSE.y);
      ctx.lineTo(botSW.x, botSW.y);
      ctx.closePath();
      ctx.fillStyle = this.leftColor;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw right face (front-right)
    Painter.useCtx((ctx) => {
      ctx.beginPath();
      ctx.moveTo(topNE.x, topNE.y);
      ctx.lineTo(topSE.x, topSE.y);
      ctx.lineTo(botSE.x, botSE.y);
      ctx.lineTo(botNE.x, botNE.y);
      ctx.closePath();
      ctx.fillStyle = this.rightColor;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw top face
    Painter.useCtx((ctx) => {
      ctx.beginPath();
      ctx.moveTo(topNW.x, topNW.y);
      ctx.lineTo(topNE.x, topNE.y);
      ctx.lineTo(topSE.x, topSE.y);
      ctx.lineTo(topSW.x, topSW.y);
      ctx.closePath();
      ctx.fillStyle = this.topColor;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
}

/**
 * Renders the isometric grid lines and origin marker.
 * 
 * Uses the parent IsometricScene's toIsometric() method for projection.
 * Should be added with zIndex = -1 to render behind other objects.
 */
class IsometricGrid extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {IsometricScene} isoScene - The parent isometric scene for projection
   */
  constructor(game, isoScene) {
    super(game);
    this.isoScene = isoScene;
    this.zIndex = -1; // Render behind other objects
  }

  /**
   * Renders the grid lines and origin marker
   */
  render() {
    const gridSize = this.isoScene.gridSize;

    // Set up line style
    Painter.colors.setStrokeColor(CONFIG.grid.lineColor);
    Painter.lines.setLineWidth(1);

    // Draw vertical grid lines (along X axis)
    for (let x = -gridSize; x <= gridSize; x++) {
      const start = this.isoScene.toIsometric(x, -gridSize);
      const end = this.isoScene.toIsometric(x, gridSize);
      Painter.lines.line(start.x, start.y, end.x, end.y);
    }

    // Draw horizontal grid lines (along Y axis)
    for (let y = -gridSize; y <= gridSize; y++) {
      const start = this.isoScene.toIsometric(-gridSize, y);
      const end = this.isoScene.toIsometric(gridSize, y);
      Painter.lines.line(start.x, start.y, end.x, end.y);
    }

    // Draw the origin marker in red for reference
    const origin = this.isoScene.toIsometric(0, 0);
    Painter.shapes.fillCircle(origin.x, origin.y, CONFIG.grid.originRadius, CONFIG.grid.originColor);
  }
}

/**
 * A bouncing ball that can be controlled with WASD + Space.
 * 
 * Uses grid coordinates (x, y) for position and z for height above ground.
 * The IsometricScene projects the position automatically; this class handles
 * shadow rendering and visual effects relative to the projected position.
 */
class Ball extends GameObject {
  /**
   * @param {Game} game - Game instance
   * @param {IsometricScene} isoScene - The parent isometric scene for projection
   * @param {IsometricBox[]} platforms - Array of platforms to collide with
   */
  constructor(game, isoScene, platforms = []) {
    super(game);
    this.isoScene = isoScene;
    this.platforms = platforms;
    
    // Grid position (x, y) and height (z)
    this.x = 0;
    this.y = 0;
    this.z = 30; // Start above the starting platform
    
    // Visual properties
    this.baseRadius = CONFIG.ball.baseRadius;
    this.color = CONFIG.ball.color;
    this.strokeColor = CONFIG.ball.strokeColor;
    
    // Physics properties
    this.jumpPower = CONFIG.ball.jumpPower;
    this.gravity = CONFIG.ball.gravity;
    this.speed = CONFIG.ball.speed;
    this.friction = CONFIG.ball.friction;
    this.bounceFactorWall = CONFIG.ball.bounceFactorWall;
    this.bounceFactorGround = CONFIG.ball.bounceFactorGround;
    
    // Velocity
    this.velocityX = 0;
    this.velocityY = 0; // Vertical velocity (for jumping)
    this.velocityZ = 0; // Grid Y velocity (confusingly named in original)

    this.isJumping = false;
    this.groundHeight = 0; // Current ground level (0 or platform height)

    // Rotation for soccer ball effect (radians)
    this.rotationX = 0; // Rotation around X axis (from moving in Y)
    this.rotationY = 0; // Rotation around Y axis (from moving in X)
  }
  
  /**
   * Set the platforms array for collision detection
   * @param {IsometricBox[]} platforms
   */
  setPlatforms(platforms) {
    this.platforms = platforms;
  }
  
  /**
   * Custom depth value for sorting - ensures ball renders on top of platforms
   */
  get isoDepth() {
    // Find the platform we're over (if any) and use its front corner as base
    let baseDepth = this.x + this.y;
    
    for (const platform of this.platforms) {
      if (platform.containsPoint(this.x, this.y, 0)) {
        // Use the platform's front corner as our base depth
        const platformFront = (platform.x + platform.w) + (platform.y + platform.d);
        if (platformFront > baseDepth) {
          baseDepth = platformFront;
        }
      }
    }
    
    // Add height plus small offset to ensure we render on top of platforms
    return baseDepth + this.z * 0.5 + 1;
  }

  /**
   * Resets the ball to the starting platform
   */
  resetPosition() {
    // Start on the center platform
    this.x = 0;
    this.y = 0;
    this.z = 30; // Above the starting platform (which is at height 20)
    this.velocityX = 0;
    this.velocityZ = 0;
    this.velocityY = 0;
    this.isJumping = false;
    this.groundHeight = 0;
    this.rotationX = 0;
    this.rotationY = 0;
  }

  /**
   * Updates ball physics and handles input
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    // Use config values for physics
    const acceleration = CONFIG.ball.acceleration;
    const maxVelocity = CONFIG.ball.maxVelocity;
    
    // Frame-rate independent friction: friction^(dt*60) normalizes to 60 FPS feel
    const frictionFactor = Math.pow(this.friction, dt * 60);
    this.velocityX *= frictionFactor;
    this.velocityZ *= frictionFactor;

    // Handle movement input (WASD) - can move diagonally
    if (Keys.isDown(Keys.W)) {
      this.velocityZ -= acceleration * dt;
    }
    if (Keys.isDown(Keys.S)) {
      this.velocityZ += acceleration * dt;
    }
    if (Keys.isDown(Keys.A)) {
      this.velocityX -= acceleration * dt;
    }
    if (Keys.isDown(Keys.D)) {
      this.velocityX += acceleration * dt;
    }

    // Clamp velocity to prevent overshooting
    this.velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocityX));
    this.velocityZ = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocityZ));

    // Calculate desired new position
    let newX = this.x + this.velocityX;
    let newY = this.y + this.velocityZ;

    // --- HORIZONTAL COLLISION DETECTION ---
    // Simple approach: check if new position would be inside any platform we can't climb
    
    // Ball collision radius in grid units (generous to prevent visual clipping)
    const ballRadius = 0.62;
    const platformBounce = 1.2; // Bouncy! >1 means it bounces back harder

    // --- COLLISION RESOLUTION ---
    // For each platform, check collision and resolve with bounce
    
    for (const platform of this.platforms) {
      // Skip if we're high enough to be on this platform
      if (this.z >= platform.h) continue;
      
      // Platform bounds expanded by ball radius
      const pLeft = platform.x - ballRadius;
      const pRight = platform.x + platform.w + ballRadius;
      const pTop = platform.y - ballRadius;
      const pBottom = platform.y + platform.d + ballRadius;
      
      // Check if new position would be inside this platform
      const insideX = newX > pLeft && newX < pRight;
      const insideY = newY > pTop && newY < pBottom;
      
      if (insideX && insideY) {
        // Calculate overlap on each axis
        const overlapLeft = newX - pLeft;
        const overlapRight = pRight - newX;
        const overlapTop = newY - pTop;
        const overlapBottom = pBottom - newY;
        
        // Find minimum overlap (shortest way out)
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        
        // Push out and bounce in the direction of minimum overlap
        if (minOverlap === overlapLeft) {
          newX = pLeft;
          this.velocityX = -Math.abs(this.velocityX) * platformBounce;
        } else if (minOverlap === overlapRight) {
          newX = pRight;
          this.velocityX = Math.abs(this.velocityX) * platformBounce;
        } else if (minOverlap === overlapTop) {
          newY = pTop;
          this.velocityZ = -Math.abs(this.velocityZ) * platformBounce;
        } else if (minOverlap === overlapBottom) {
          newY = pBottom;
          this.velocityZ = Math.abs(this.velocityZ) * platformBounce;
        }
      }
    }

    // Apply the resolved position
    this.x = newX;
    this.y = newY;

    // Update ball rotation based on movement (rolling effect)
    // Physics: rotation = distance / radius
    // For a ball of visual radius ~0.5 grid units, rolling 1 unit = 2 full rotations
    const visualRadius = 0.5; // Grid units for rotation calculation
    const distanceX = this.velocityX; // Distance moved this frame
    const distanceY = this.velocityZ;
    
    // Rotation in radians = distance / radius
    this.rotationY += distanceX / visualRadius;  // Moving in X rotates around Y axis
    this.rotationX -= distanceY / visualRadius;  // Moving in Y rotates around X axis

    // Handle jump input
    if (Keys.isDown(Keys.SPACE) && !this.isJumping) {
      this.velocityY = this.jumpPower;
      this.isJumping = true;
    }

    // Apply gravity (frame-rate independent)
    this.velocityY -= this.gravity * dt * 60;
    this.z += this.velocityY;

    // --- VERTICAL COLLISION DETECTION ---
    // Find what platforms we're currently over and can land on
    this.groundHeight = 0;
    
    for (const platform of this.platforms) {
      // Check if we're within the platform's X/Y bounds
      if (platform.containsPoint(this.x, this.y, 0)) {
        // Get this platform's surface height
        const surfaceHeight = platform.getSurfaceHeight();
        if (surfaceHeight > this.groundHeight) {
          this.groundHeight = surfaceHeight;
        }
      }
    }

    // Ground/platform collision - bounce based on impact speed
    if (this.z < this.groundHeight) {
      this.z = this.groundHeight;
      
      // Calculate bounce factor based on impact velocity
      // Faster falls = bouncier landing
      const impactSpeed = Math.abs(this.velocityY);
      const minBounce = 0.3;
      const maxBounce = 0.8;
      const bounceFactor = Math.min(maxBounce, minBounce + impactSpeed * 0.05);
      
      this.velocityY *= -bounceFactor;
      
      // Only stop bouncing if really slow
      if (Math.abs(this.velocityY) < 0.3) {
        this.velocityY = 0;
        this.isJumping = false;
      }
    }
    
    // Fall through floor (no platform and below ground) - reset
    if (this.z < 0 && this.groundHeight === 0) {
      // Check if we're over any platform at all
      let overAnyPlatform = false;
      for (const platform of this.platforms) {
        if (platform.containsPoint(this.x, this.y, 0)) {
          overAnyPlatform = true;
          break;
        }
      }
      // If not over any platform, we fell off - reset
      if (!overAnyPlatform && this.z < -30) {
        this.resetPosition();
      }
    }

    // Boundary collisions with grid edges - bouncy walls!
    const gridSize = CONFIG.gridSize;
    const effectiveBoundary = gridSize - ballRadius;
    const gridBounce = 1.5; // Very bouncy grid walls!

    // X boundary - clamp and bounce
    if (this.x < -effectiveBoundary) {
      this.x = -effectiveBoundary;
      this.velocityX = Math.abs(this.velocityX) * gridBounce;
    } else if (this.x > effectiveBoundary) {
      this.x = effectiveBoundary;
      this.velocityX = -Math.abs(this.velocityX) * gridBounce;
    }

    // Y boundary - clamp and bounce
    if (this.y < -effectiveBoundary) {
      this.y = -effectiveBoundary;
      this.velocityZ = Math.abs(this.velocityZ) * gridBounce;
    } else if (this.y > effectiveBoundary) {
      this.y = effectiveBoundary;
      this.velocityZ = -Math.abs(this.velocityZ) * gridBounce;
    }
  }

  /**
   * Renders the ball as a gradient sphere with rotating stripe.
   */
  render() {
    const ctx = Painter.ctx;
    
    // Get projected position at ground height (for shadow)
    const shadowPos = this.isoScene.toIsometric(this.x, this.y, this.groundHeight);
    // Get projected position at ball height
    const ballPos = this.isoScene.toIsometric(this.x, this.y, this.z);

    // Calculate perspective scaling based on distance from center
    const distanceFromCenter = Math.abs(this.y);
    const maxDistance = this.isoScene.gridSize;
    const depthScale = 0.7 + (distanceFromCenter / maxDistance) * 0.6;

    // Height factor - higher objects appear slightly smaller
    const heightAboveGround = this.z - this.groundHeight;
    const heightFactor = Math.max(0.7, 1 - Math.abs(heightAboveGround) / 200);

    // Calculate final radius with perspective
    const radius = (this.baseRadius * this.isoScene.gridSize) / 4 * heightFactor * depthScale;

    // Shadow properties - shrinks and fades as ball rises above ground
    const shadowScale = Math.max(0.2, 1 - Math.abs(heightAboveGround) / 100);
    const shadowAlpha = Math.max(0.1, 0.3 - Math.abs(heightAboveGround) / 300);

    // Draw shadow at ground level
    Painter.shapes.fillEllipse(
      shadowPos.x,
      shadowPos.y + radius / 2,
      radius * shadowScale,
      (radius / 2) * shadowScale,
      0,
      `rgba(0, 0, 0, ${shadowAlpha})`
    );

    const cx = ballPos.x;
    const cy = ballPos.y;

    // Draw simple blue marble with light-aware gradient
    ctx.save();
    
    // Light direction based on ball rotation (simulates light from top-left)
    // As ball rotates, the lit side shifts
    const lightOffsetX = -0.3 + Math.sin(this.rotationY) * 0.15;
    const lightOffsetY = -0.3 + Math.sin(this.rotationX) * 0.15;
    
    // Main gradient - shifts with rotation for lighting effect
    const gradient = ctx.createRadialGradient(
      cx + lightOffsetX * radius, cy + lightOffsetY * radius, 0,
      cx, cy, radius
    );
    gradient.addColorStop(0, "#7ec8e3");    // Bright highlight
    gradient.addColorStop(0.25, "#4a9fd4"); // Light blue
    gradient.addColorStop(0.5, "#2d7ab8");  // Mid blue
    gradient.addColorStop(0.75, "#1a5a8c"); // Darker
    gradient.addColorStop(1, "#0d3a5c");    // Shadow edge
    
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Specular highlight (small, fixed position for glass look)
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.beginPath();
    ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Subtle outline
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 40, 80, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Main game class demonstrating IsometricScene usage.
 * 
 * Creates an isometric scene with a grid and controllable ball.
 * Use WASD to move, Space to jump.
 */
export class IsometricGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#ecf0f1";
  }

  /**
   * Initialize the game with isometric scene and objects
   */
  init() {
    super.init();

    // Create the isometric scene centered on the canvas
    this.isoScene = new IsometricScene(this, {
      x: this.width / 2,
      y: this.height / 2,
      tileWidth: CONFIG.tileWidth,
      tileHeight: CONFIG.tileHeight,
      gridSize: CONFIG.gridSize,
      elevationScale: CONFIG.elevationScale,
      depthSort: true,
    });

    // Create and add the grid (renders behind everything)
    const grid = new IsometricGrid(this, this.isoScene);
    this.isoScene.add(grid);

    // Create platforms from config
    this.platforms = [];
    for (const p of CONFIG.platforms) {
      const platform = new IsometricBox(this, this.isoScene, {
        x: p.x,
        y: p.y,
        w: p.w,
        d: p.d,
        h: p.h,
        color: p.color,
      });
      this.platforms.push(platform);
      this.isoScene.add(platform);
    }

    // Create and add the ball (with platform references for collision)
    this.ball = new Ball(this, this.isoScene, this.platforms);
    this.isoScene.add(this.ball);

    // Add the scene to the pipeline
    this.pipeline.add(this.isoScene);
  }

  /**
   * Handle window resize to keep scene centered
   */
  onResize() {
    if (this.isoScene) {
      this.isoScene.x = this.width / 2;
      this.isoScene.y = this.height / 2;
    }
  }
}

export default IsometricGame;
