/**
 * Penrose Artifact
 *
 * A mysterious alien artifact that allows survival inside a black hole.
 * Only appears after using a wormhole at least once.
 * Rendered as a rotating cube.
 */

import { Cube } from "/gcanvas.es.min.js";
import { CONFIG } from "./constants.js";

export class PenroseArtifact {
  constructor(u, v) {
    this.u = u;
    this.v = v;

    // Artifact size
    this.radius = CONFIG.artifactRadius;

    // Animation
    this.rotationPhase = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.hoverOffset = 0;

    // State
    this.collected = false;
    this.spawnTime = 0;

    // Create the cube shape (will be positioned during draw)
    this.cube = new Cube(CONFIG.artifactCubeSize, {
      faceTopColor: "#a0f",
      faceBottomColor: "#60a",
      faceLeftColor: "#80c",
      faceRightColor: "#70b",
      faceFrontColor: "#90d",
      faceBackColor: "#50a",
      strokeColor: "#f0f",
      lineWidth: 2,
    });
  }

  update(dt) {
    this.rotationPhase += dt * 2;
    this.pulsePhase += dt * 4;
    this.hoverOffset = Math.sin(this.pulsePhase) * 5;
    this.spawnTime += dt;

    // Rotate the cube
    this.cube.setRotation(
      this.rotationPhase * 0.7,
      this.rotationPhase,
      this.rotationPhase * 0.5
    );
  }

  /**
   * Get circle bounds for collision detection
   */
  getCircle() {
    return { x: this.u, y: this.v, radius: this.radius };
  }

  /**
   * Check if artifact is active (not collected)
   */
  get active() {
    return !this.collected;
  }
}
