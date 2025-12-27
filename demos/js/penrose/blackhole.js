import { CONFIG } from "./constants.js";
// ============================================================================
// PENROSE BLACK HOLE
// ============================================================================

export class PenroseBlackHole {
  constructor(u, v, mass) {
    this.u = u;
    this.v = v;
    this.mass = mass;

    // Event horizon radius in Penrose space (death zone)
    this.horizonRadius = CONFIG.blackHoleBaseSize + mass * 0.1;

    // Ergosphere radius - larger than horizon, where Kerr energy can be harvested
    // In real physics, ergosphere extends ~1.5-2x beyond horizon for rotating black holes
    this.ergosphereRadius = this.horizonRadius * 1.8;

    // Has the player passed this one?
    this.passed = false;

    // Visual pulse
    this.pulsePhase = Math.random() * Math.PI * 2;

    // Kerr energy harvesting
    this.harvestProgress = 0; // 0 to kerrHarvestTime
    this.harvested = false; // Already collected?
    this.isBeingHarvested = false; // Light cone touching right now?
  }

  update(dt) {
    this.pulsePhase += dt * 2;

    // Decay harvest progress if not being harvested
    if (!this.isBeingHarvested && this.harvestProgress > 0) {
      this.harvestProgress = Math.max(0, this.harvestProgress - dt * 0.5);
    }
    this.isBeingHarvested = false; // Reset each frame
  }

  /**
   * Get circle bounds for collision detection (event horizon)
   */
  getCircle() {
    return { x: this.u, y: this.v, radius: this.horizonRadius };
  }

  /**
   * Get ergosphere circle bounds
   */
  getErgosphereCircle() {
    return { x: this.u, y: this.v, radius: this.ergosphereRadius };
  }

  // Check if light cone touches the ergosphere (for Kerr harvesting)
  checkLightConeContact(shipU, shipV, coneLength) {
    // Light cone extends from ship at 45° angles
    // Check if ergosphere is within the cone and ahead of ship
    const du = this.u - shipU;
    const dv = this.v - shipV;

    // Must be ahead (in future)
    if (dv <= 0) return false;

    // Must be within cone length
    if (dv > coneLength) return false;

    // Light cone edges at this dv: u ranges from shipU - dv to shipU + dv
    // Check if ergosphere intersects this range
    const coneLeft = shipU - dv;
    const coneRight = shipU + dv;

    // Ergosphere touches cone if its area overlaps (larger than horizon!)
    const ergoLeft = this.u - this.ergosphereRadius;
    const ergoRight = this.u + this.ergosphereRadius;

    return ergoRight >= coneLeft && ergoLeft <= coneRight;
  }

  // Calculate frame dragging effect on ship
  // Returns the velocity change to apply (du per dt)
  getFrameDragForce(shipU, shipV) {
    const du = shipU - this.u;
    const dv = shipV - this.v;
    const dist = Math.sqrt(du * du + dv * dv);

    // No effect outside ergosphere
    if (dist > this.ergosphereRadius) return 0;

    // No effect if already dead (inside horizon)
    if (dist < this.horizonRadius) return 0;

    // Frame drag strength increases as you get closer to horizon
    // Normalize distance: 0 at horizon, 1 at ergosphere edge
    const normalizedDist =
      (dist - this.horizonRadius) /
      (this.ergosphereRadius - this.horizonRadius);

    // Drag force falls off with distance (stronger near horizon)
    const dragMagnitude =
      Math.pow(1 - normalizedDist, CONFIG.frameDragFalloff) *
      CONFIG.frameDragStrength;

    // Direction: perpendicular to radial direction (orbital motion)
    // In 2D Penrose space, we'll make it pull tangentially
    // Black holes rotate counter-clockwise, so drag is perpendicular to (du, dv)
    // Perpendicular in 2D: (-dv, du) or (dv, -du)
    // We want to pull into orbit, so use the direction that's tangent

    // Calculate tangent direction (perpendicular to radial)
    // Normalize the radial direction first
    const radialU = du / dist;
    const radialV = dv / dist;

    // Tangent is perpendicular - rotate 90 degrees (counter-clockwise orbit)
    const tangentU = -radialV;

    // Return the velocity change in u direction (we're mainly affecting horizontal motion)
    return tangentU * dragMagnitude;
  }
}
