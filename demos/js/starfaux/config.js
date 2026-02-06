/**
 * StarFaux Configuration
 * All game constants centralized here - NO magic numbers in code
 */

export const CONFIG = {
  // Reference resolution for scaling (all sizes are relative to this)
  // On larger screens, everything scales proportionally
  referenceWidth: 1920,
  referenceHeight: 1080,

  // Rails camera system
  rails: {
    speed: 300,             // Forward movement units/sec
    perspective: 500,       // Camera3D perspective distance
    tiltX: 0,               // NO tilt - camera positioned above ground instead
    cameraY: -500,          // Camera is HIGH above the ground plane
    // Camera reaction to player movement (creates world-ship coupling)
    cameraReactX: 0.08,     // How much camera rotates Y based on player X (subtle banking)
    cameraReactY: 0.02,     // How much camera tilts based on player Y
    cameraLag: 5,           // Smoothing factor for camera follow
  },

  // Player ship
  player: {
    moveSpeed: 500,         // X/Y movement speed (fast for wide arena)
    bounds: {
      x: 600,               // Max horizontal offset - MUCH wider to explore terrain
      y: 180,               // Max vertical offset from center
    },
    size: 30,               // Ship size for collision
    fireRate: 0.12,         // Seconds between shots
    maxHealth: 3,           // Hit points
    bankAngle: 0.5,         // Max banking rotation when strafing (radians)
    bankSpeed: 8,           // Banking interpolation speed
    shipZ: 100,             // Ship Z position (in front of camera)
    crosshairZ: 400,        // Crosshair Z position (further ahead, where aiming)
    screenY: -80,           // Ship Y offset - NEGATIVE to spawn higher on screen
    invincibilityTime: 1.5, // Seconds of invincibility after taking damage
    blinkRate: 0.1,         // Blink interval during invincibility
    // Physics - inertia and damping
    acceleration: 1800,     // How fast ship accelerates toward target velocity
    damping: 0.92,          // Velocity decay when no input (0-1, lower = more drag)
    gravity: 200,           // Downward pull (easier to fall than climb)
    climbResistance: 0.6,   // Multiplier for upward movement (< 1 = harder to climb)
  },

  // Laser projectiles
  laser: {
    speed: 800,             // Forward velocity
    lifetime: 1.5,          // Seconds before despawn
    width: 6,               // Visual width
    height: 20,             // Visual length
    color: "#ff3333",       // RED laser - distinct from green terrain
    glowColor: "#ff8888",   // Red glow
    poolSize: 30,           // Pre-allocated laser pool
    collisionSize: 25,      // Collision radius (larger than visual for better hit detection)
  },

  // Enemy configuration
  enemy: {
    spawnDistance: 1500,    // How far ahead to spawn
    despawnDistance: -100,  // Behind camera threshold
    spawnInterval: 1.2,     // Base seconds between spawns
    spawnVariance: 0.5,     // Random variance on spawn timing
    types: {
      fighter: {
        size: 40,
        health: 1,
        score: 100,
        color: "#ff4444",
        speed: 50,          // Additional approach speed
      },
    },
  },

  // Terrain grid
  terrain: {
    gridSpacing: 120,       // Distance between grid lines
    lineCount: 25,          // Number of lines to draw
    color: "#00aa00",       // Grid line color
    lineWidth: 1,           // Line thickness
    yPosition: 0,           // Ground plane at Y=0 (camera is above at Y=-150)
    // Width is now calculated dynamically based on screen width
    // widthMultiplier: how many screen widths the terrain spans
    widthMultiplier: 6,     // Terrain width
    numCols: 100,           // Many points per line for smooth waveforms
    // Joy Division style - stacked horizontal waveforms with clear gaps
    nearPlaneZ: 20,         // Start terrain
    nearSpacing: 80,        // WIDER spacing between lines - more black gaps
    totalRows: 35,          // More rows to reach horizon
    // Terrain features (hills/obstacles)
    features: {
      spawnInterval: 800,   // Distance between terrain features
      maxHeight: 350,       // Maximum hill height - TALLER mountains
      width: 200,           // Feature width
      color: "#006600",     // Darker green for hills
      collisionHeight: 120, // Collide with medium+ terrain (120+ out of 350 max)
    },
  },

  // Visual settings
  colors: {
    background: "#000011",  // Dark blue-black space
    player: "#4488ff",      // Player ship blue
    playerAccent: "#88aaff",
    laser: "#00ff00",
    enemyLaser: "#ff4444",
    explosion: "#ffaa00",
    hud: "#00ff00",
  },

  // HUD
  hud: {
    font: "bold 20px monospace",
    margin: 20,
  },
};
