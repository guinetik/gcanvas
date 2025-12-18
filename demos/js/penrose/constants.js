// ============================================================================
// CONFIGURATION
// ============================================================================

export const CONFIG = {
  // Ship physics
  shipTimeSpeed: 0.02, // Base rate of time progression (slower for longer games)
  shipAcceleration: 1.003, // How much faster time gets (slower ramp)
  shipMaxVelocity: 1.2, // Max spatial velocity (higher = more lateral movement)
  shipSteering: 4.0, // Steering responsiveness (much higher for real navigation)
  shipDrag: 0.96, // Velocity damping (less drag = more responsive)
  shipStartV: -0.99, // Starting position in time (at i- past infinity corner)

  // Black holes
  blackHoleSpawnRate: 3.5, // Seconds between spawns (slower!)
  blackHoleMinSpawnRate: 1.5, // Fastest spawn rate (not too crazy)
  blackHoleBaseSize: 0.05, // Base horizon radius (smaller)
  blackHoleMaxSize: 0.1, // Max horizon radius
  blackHoleSpawnAhead: 0.25, // How far ahead (in v) to spawn
  blackHoleMinGap: 0.22, // Minimum gap between black holes (so player can pass)

  // Camera
  cameraLag: 0.1, // Camera smoothing
  cameraLookAhead: 0.08, // Look ahead of ship
  baseViewScale: 0.35, // Base zoom level (smaller = more zoomed in!)

  // Visual
  worldlineMaxLength: 350, // Trail length
  gridSpacing: 0.1, // Null geodesic grid spacing
  coneLength: 0.08, // Light cone visual length
  starCount: 200, // More stars!

  // Death
  deathAttractionSpeed: 0.3, // How fast ship is pulled to singularity
  deathFadeDuration: 2.0, // How long the fade out takes

  // Difficulty
  difficultyRampTime: 120, // Seconds to reach max difficulty (longer game)

  // Kerr Energy mechanic
  kerrHarvestTime: 3.0, // Seconds to harvest Kerr energy from a black hole
  kerrScoreMultiplier: 2, // Each Kerr harvest doubles score

  // Frame dragging (ergosphere physics)
  frameDragStrength: 0.8, // How strongly ergosphere pulls you into orbit
  frameDragFalloff: 2.0, // How quickly drag falls off with distance

  // Boost mechanic (uses Kerr energy)
  boostSteeringMultiplier: 3.0, // How much stronger steering is when boosting
  boostSpeedMultiplier: 2.5, // How much faster time moves when boosting
  boostDrainRate: 35, // Kerr energy drained per second while boosting
  kerrEnergyPerHarvest: 100, // Energy gained per Kerr harvest

  // Wormhole (rare teleporter back to start)
  wormholeSpawnChance: 0.25, // 25% chance per spawn cycle
  wormholeSpawnInterval: 12.0, // Check for spawn every 12 seconds
  wormholeRadius: 0.08, // Collision radius (bigger for easier hit)
  wormholeMinTime: 10, // Don't spawn before 10 seconds

  // Alien Artifact (survive singularity!)
  artifactSpawnChance: 0.3, // 30% chance per spawn cycle
  artifactSpawnInterval: 15.0, // Check for spawn every 15 seconds
  artifactRadius: 0.07, // Collision radius
  artifactCubeSize: 20, // Size of the cube visual

  // Inside Black Hole (void dimension)
  voidShipSpeed: 400, // Much faster ship in the void
  voidShipSteering: 6, // Steering in void
  voidParticleRadius: 12, // Size of collectible particles
  voidParticlesToCollect: 10, // Particles needed to escape
  voidParticleSpawnRate: 0.8, // Seconds between particle spawns
  voidDuration: 20, // Max time in void before forced exit
};
