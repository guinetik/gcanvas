/**
 * PenroseScene - The Penrose Diagram Map
 *
 * Renders the conformal spacetime diagram where the game takes place.
 * Handles coordinate transformation, diagram structure, and all
 * spacetime objects (black holes, wormholes, artifacts).
 *
 * @extends Scene
 */

import { Painter, Scene } from "../../../src/index.js";
import { CONFIG } from "./constants.js";

export class PenroseScene extends Scene {
  constructor(game) {
    super(game);

    // Camera state (controlled by game)
    this.viewCenter = { u: 0, v: 0 };
    this.viewScale = CONFIG.baseViewScale;
    this.cameraRotation = 0;

    // Background stars
    this.stars = [];
    this.initStars();

    // References set by game
    this.ship = null;
    this.blackHoles = [];
    this.wormholes = [];
    this.artifacts = [];
    this.lorePrisms = [];

    // Rendering state from game
    this.harvestingBlackHole = null;
    this.kerrCollectedTimer = 0;
    this.scoreMultiplier = 1;
    this.timeSurvived = 0;
    this.isIntro = false;
    this.introPhase = 0;
    this.isBoosting = false;
  }

  initStars() {
    for (let i = 0; i < CONFIG.starCount; i++) {
      this.stars.push({
        u: (Math.random() - 0.5) * 4,
        v: (Math.random() - 0.5) * 4,
        size: 0.5 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.5,
      });
    }
  }

  /**
   * Regenerate stars around current ship position
   */
  regenerateStars() {
    if (!this.ship) return;

    this.stars = [];
    for (let i = 0; i < CONFIG.starCount; i++) {
      this.stars.push({
        u: this.ship.u + (Math.random() - 0.5) * 2,
        v: this.ship.v + (Math.random() - 0.3) * 2,
        size: 0.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
      });
    }
  }

  // ============================================================================
  // COORDINATE CONVERSION
  // ============================================================================

  /**
   * Convert Penrose coordinates to screen coordinates
   */
  penroseToScreen(u, v) {
    const relU = u - this.viewCenter.u;
    const relV = v - this.viewCenter.v;
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;

    return {
      x: this.game.width / 2 + relU * scale,
      y: this.game.height / 2 - relV * scale,
    };
  }

  /**
   * Convert screen coordinates to Penrose coordinates
   */
  screenToPenrose(x, y) {
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;
    return {
      u: this.viewCenter.u + (x - this.game.width / 2) / scale,
      v: this.viewCenter.v - (y - this.game.height / 2) / scale,
    };
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  render() {
    const ctx = Painter.ctx;

    // Apply camera rotation during gameplay
    const shouldRotate = !this.isIntro && Math.abs(this.cameraRotation) > 0.001;
    if (shouldRotate) {
      ctx.save();
      ctx.translate(this.game.width / 2, this.game.height / 2);
      ctx.rotate(this.cameraRotation);
      ctx.translate(-this.game.width / 2, -this.game.height / 2);
    }

    // Draw layers
    this.drawStars(ctx);
    this.drawDiagram(ctx);
    this.drawNullGrid(ctx);

    for (const bh of this.blackHoles) {
      this.drawBlackHole(ctx, bh);
    }

    for (const wh of this.wormholes) {
      this.drawWormhole(ctx, wh);
    }

    for (const art of this.artifacts) {
      this.drawArtifact(ctx, art);
    }

    for (const prism of this.lorePrisms) {
      this.drawLorePrism(ctx, prism);
    }

    if (!this.isIntro || this.introPhase === 1) {
      this.drawLightCone(ctx);
    }

    this.drawWorldline(ctx);
    this.drawShip(ctx);

    if (shouldRotate) {
      ctx.restore();
    }

    // Children (if any)
    super.render();
  }

  // ============================================================================
  // DRAW METHODS
  // ============================================================================

  drawStars(ctx) {
    ctx.fillStyle = "#fff";
    for (const star of this.stars) {
      const pos = this.penroseToScreen(star.u, star.v);
      ctx.globalAlpha = star.alpha * 0.5;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawDiagram(ctx) {
    // Diamond corners
    const corners = [
      { u: 0, v: 1 },   // i+ (top)
      { u: 1, v: 0 },   // i0 right
      { u: 0, v: -1 },  // i- (bottom)
      { u: -1, v: 0 },  // i0 left
    ];

    // Draw diamond outline
    ctx.strokeStyle = "rgba(100, 100, 150, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < corners.length; i++) {
      const pos = this.penroseToScreen(corners[i].u, corners[i].v);
      if (i === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Draw labels in intro
    if (this.isIntro) {
      this.drawDiagramLabels(ctx);
    }
  }

  drawDiagramLabels(ctx) {
    ctx.textAlign = "center";

    // i+ (Future Infinity)
    const topPos = this.penroseToScreen(0, 0.85);
    ctx.fillStyle = "#8ff";
    ctx.font = "bold 14px monospace";
    ctx.fillText("i+", topPos.x, topPos.y);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#8aa";
    ctx.fillText("Future Infinity", topPos.x, topPos.y + 14);
    ctx.fillText("(where time ends)", topPos.x, topPos.y + 26);

    // i- (Past Infinity)
    const bottomPos = this.penroseToScreen(0, -0.85);
    ctx.fillStyle = "#f8f";
    ctx.font = "bold 14px monospace";
    ctx.fillText("i-", bottomPos.x, bottomPos.y);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#a8a";
    ctx.fillText("Past Infinity", bottomPos.x, bottomPos.y + 14);
    ctx.fillText("(where time began)", bottomPos.x, bottomPos.y + 26);

    // i0 right (Spatial Infinity)
    const rightPos = this.penroseToScreen(0.85, 0);
    ctx.fillStyle = "#8f8";
    ctx.font = "bold 14px monospace";
    ctx.fillText("i0", rightPos.x + 15, rightPos.y);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#8a8";
    ctx.textAlign = "left";
    ctx.fillText("Spatial", rightPos.x + 5, rightPos.y + 14);
    ctx.fillText("Infinity", rightPos.x + 5, rightPos.y + 26);

    // i0 left
    const leftPos = this.penroseToScreen(-0.85, 0);
    ctx.fillStyle = "#8f8";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText("i0", leftPos.x - 15, leftPos.y);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#8a8";
    ctx.fillText("Spatial", leftPos.x - 5, leftPos.y + 14);
    ctx.fillText("Infinity", leftPos.x - 5, leftPos.y + 26);

    // Null infinity labels
    ctx.textAlign = "center";
    ctx.font = "bold 12px monospace";

    ctx.fillStyle = "#ff8";
    const jPlusRight = this.penroseToScreen(0.55, 0.45);
    ctx.fillText("J+", jPlusRight.x, jPlusRight.y);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#aa8";
    ctx.fillText("light escapes", jPlusRight.x, jPlusRight.y + 11);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#ff8";
    const jPlusLeft = this.penroseToScreen(-0.55, 0.45);
    ctx.fillText("J+", jPlusLeft.x, jPlusLeft.y);

    ctx.fillStyle = "#fa8";
    const jMinusRight = this.penroseToScreen(0.55, -0.45);
    ctx.fillText("J-", jMinusRight.x, jMinusRight.y);
    ctx.font = "9px monospace";
    ctx.fillStyle = "#a88";
    ctx.fillText("light arrives", jMinusRight.x, jMinusRight.y + 11);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#fa8";
    const jMinusLeft = this.penroseToScreen(-0.55, -0.45);
    ctx.fillText("J-", jMinusLeft.x, jMinusLeft.y);
  }

  drawNullGrid(ctx) {
    const spacing = CONFIG.gridSpacing;
    ctx.strokeStyle = "rgba(100, 120, 160, 0.3)";
    ctx.lineWidth = 1;

    // Lines where u + v = c
    for (let c = -1; c <= 1; c += spacing) {
      const pts = this.getLineInDiamond(c, true);
      if (pts) {
        const p1 = this.penroseToScreen(pts.u1, pts.v1);
        const p2 = this.penroseToScreen(pts.u2, pts.v2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    // Lines where u - v = c
    for (let c = -1; c <= 1; c += spacing) {
      const pts = this.getLineInDiamond(c, false);
      if (pts) {
        const p1 = this.penroseToScreen(pts.u1, pts.v1);
        const p2 = this.penroseToScreen(pts.u2, pts.v2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }

  /**
   * Get endpoints of a 45deg line inside the diamond |u|+|v|<=1
   */
  getLineInDiamond(c, isPlusLine) {
    if (Math.abs(c) > 1) return null;

    let u1, v1, u2, v2;

    if (isPlusLine) {
      // u + v = c
      u1 = (1 + c) / 2;
      v1 = (c - 1) / 2;
      u2 = (c - 1) / 2;
      v2 = (1 + c) / 2;
    } else {
      // u - v = c
      u1 = (c - 1) / 2;
      v1 = -1 - u1;
      u2 = (1 + c) / 2;
      v2 = (1 - c) / 2;
    }

    return { u1, v1, u2, v2 };
  }

  drawBlackHole(ctx, bh) {
    const pos = this.penroseToScreen(bh.u, bh.v);
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;
    const screenRadius = bh.horizonRadius * scale;
    const ergoRadius = bh.ergosphereRadius * scale;

    const pulse = 0.8 + Math.sin(bh.pulsePhase) * 0.2;
    const rotationAngle = this.timeSurvived * 2 + bh.pulsePhase;

    // Ergosphere (harvesting zone)
    if (!bh.harvested) {
      const ergoGradient = ctx.createRadialGradient(
        pos.x, pos.y, screenRadius,
        pos.x, pos.y, ergoRadius
      );
      const ergoAlpha = bh.isBeingHarvested ? 0.4 : 0.15;
      ergoGradient.addColorStop(0, `rgba(0, 255, 200, ${ergoAlpha})`);
      ergoGradient.addColorStop(1, "rgba(0, 255, 200, 0)");

      ctx.fillStyle = ergoGradient;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ergoRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rotating ergosphere boundary
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(rotationAngle);
      ctx.strokeStyle = bh.isBeingHarvested
        ? `rgba(50, 255, 150, ${0.8 * pulse})`
        : "rgba(0, 200, 150, 0.3)";
      ctx.lineWidth = bh.isBeingHarvested ? 2 : 1;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, ergoRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Rotating accretion swirl
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotationAngle);

    for (let i = 0; i < 3; i++) {
      const armAngle = (i * Math.PI * 2) / 3;
      ctx.strokeStyle = `rgba(255, 100, 50, ${0.3 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let r = screenRadius * 0.6; r < screenRadius * 1.1; r += 2) {
        const angle = armAngle + (r - screenRadius * 0.6) * 0.15;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (r === screenRadius * 0.6) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.restore();

    // Outer glow
    const gradient = ctx.createRadialGradient(
      pos.x, pos.y, screenRadius * 0.3,
      pos.x, pos.y, screenRadius * 1.2
    );
    gradient.addColorStop(0, "rgba(255, 50, 0, 0.8)");
    gradient.addColorStop(0.5, `rgba(255, 100, 50, ${0.4 * pulse})`);
    gradient.addColorStop(1, "rgba(255, 50, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, screenRadius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon boundary
    ctx.strokeStyle = `rgba(255, 150, 100, ${0.8 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, screenRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Singularity center
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-rotationAngle * 1.5);

    const singularityGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, screenRadius * 0.5);
    singularityGradient.addColorStop(0, "#000");
    singularityGradient.addColorStop(0.7, "#000");
    singularityGradient.addColorStop(1, "rgba(128, 0, 128, 0.5)");

    ctx.fillStyle = singularityGradient;
    ctx.beginPath();
    ctx.arc(0, 0, screenRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(200, 50, 200, ${0.5 * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, screenRadius * 0.35, 0, Math.PI * 1.5);
    ctx.stroke();

    ctx.restore();
  }

  drawWormhole(ctx, wh) {
    const pos = this.penroseToScreen(wh.u, wh.v);
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;
    const screenRadius = wh.radius * scale;

    const fadeIn = Math.min(1, wh.spawnTime / 0.5);
    const pulse = 0.7 + Math.sin(wh.pulsePhase) * 0.3;

    ctx.save();
    ctx.globalAlpha = fadeIn;
    ctx.translate(pos.x, pos.y);

    // Outer swirling rings
    for (let ring = 3; ring >= 0; ring--) {
      const ringRadius = screenRadius * (1 + ring * 0.3);
      const ringRotation = wh.rotationPhase * (ring % 2 === 0 ? 1 : -1) * (1 + ring * 0.2);

      ctx.save();
      ctx.rotate(ringRotation);

      const gradient = ctx.createRadialGradient(0, 0, ringRadius * 0.3, 0, 0, ringRadius);

      if (ring === 0) {
        gradient.addColorStop(0, `rgba(100, 255, 255, ${0.9 * pulse})`);
        gradient.addColorStop(0.5, `rgba(50, 200, 255, ${0.6 * pulse})`);
        gradient.addColorStop(1, "rgba(100, 50, 255, 0)");
      } else {
        const alpha = (0.3 / ring) * pulse;
        gradient.addColorStop(0, `rgba(150, 100, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(100, 150, 255, ${alpha * 0.5})`);
        gradient.addColorStop(1, "rgba(50, 50, 200, 0)");
      }

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.fill();

      // Spiral arms
      if (ring > 0) {
        ctx.strokeStyle = `rgba(150, 100, 255, ${0.4 * pulse / ring})`;
        ctx.lineWidth = 2;
        for (let arm = 0; arm < 4; arm++) {
          const armAngle = (arm * Math.PI * 2) / 4;
          ctx.beginPath();
          for (let r = ringRadius * 0.4; r < ringRadius; r += 3) {
            const angle = armAngle + (r - ringRadius * 0.4) * 0.08;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (r === ringRadius * 0.4) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Center portal
    const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, screenRadius * 0.5);
    centerGradient.addColorStop(0, "#000");
    centerGradient.addColorStop(0.6, "#001");
    centerGradient.addColorStop(0.9, `rgba(100, 200, 255, ${0.8 * pulse})`);
    centerGradient.addColorStop(1, "rgba(150, 100, 255, 0)");

    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, screenRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(150, 200, 255, ${0.9 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, screenRadius * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow particles
    for (let i = 0; i < 6; i++) {
      const particleAngle = wh.rotationPhase * 2 + (i * Math.PI * 2) / 6;
      const particleR = screenRadius * 0.3 * (0.5 + Math.sin(wh.pulsePhase + i) * 0.5);
      const px = Math.cos(particleAngle) * particleR;
      const py = Math.sin(particleAngle) * particleR;

      ctx.fillStyle = `rgba(200, 255, 255, ${0.8 * pulse})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Label
    if (fadeIn >= 1) {
      this.drawOutlinedText(
        ctx,
        "WORMHOLE",
        pos.x,
        pos.y - screenRadius - 15,
        `rgba(150, 200, 255, ${0.8 * pulse})`,
        "#000",
        "bold 12px monospace"
      );
    }
  }

  drawArtifact(ctx, art) {
    const pos = this.penroseToScreen(art.u, art.v);
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;
    const screenRadius = art.radius * scale;

    const fadeIn = Math.min(1, art.spawnTime / 0.5);
    const pulse = 0.7 + Math.sin(art.pulsePhase) * 0.3;

    ctx.save();
    ctx.globalAlpha = fadeIn;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      pos.x, pos.y, screenRadius * 0.3,
      pos.x, pos.y, screenRadius * 2
    );
    gradient.addColorStop(0, `rgba(200, 100, 255, ${0.6 * pulse})`);
    gradient.addColorStop(0.5, `rgba(150, 50, 200, ${0.3 * pulse})`);
    gradient.addColorStop(1, "rgba(100, 0, 150, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, screenRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw the cube
    ctx.save();
    ctx.translate(pos.x, pos.y + art.hoverOffset);
    art.cube.x = 0;
    art.cube.y = 0;
    art.cube.draw();
    ctx.restore();

    // Sparkles
    for (let i = 0; i < 6; i++) {
      const angle = art.rotationPhase + (i * Math.PI * 2) / 6;
      const sparkleR = screenRadius * 1.2;
      const sx = pos.x + Math.cos(angle) * sparkleR;
      const sy = pos.y + Math.sin(angle) * sparkleR + art.hoverOffset;

      ctx.fillStyle = `rgba(255, 200, 255, ${0.8 * pulse})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawLorePrism(ctx, prism) {
    const pos = this.penroseToScreen(prism.u, prism.v);
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;
    const screenRadius = prism.radius * scale;

    const fadeIn = Math.min(1, prism.spawnTime / 0.5);
    const pulse = 0.7 + Math.sin(prism.pulsePhase) * 0.3;

    ctx.save();
    ctx.globalAlpha = fadeIn;

    // Outer glow - cyan/blue to match prism colors
    const gradient = ctx.createRadialGradient(
      pos.x, pos.y, screenRadius * 0.2,
      pos.x, pos.y, screenRadius * 2.5
    );
    gradient.addColorStop(0, `rgba(100, 220, 255, ${0.5 * pulse})`);
    gradient.addColorStop(0.4, `rgba(50, 180, 220, ${0.3 * pulse})`);
    gradient.addColorStop(1, "rgba(30, 100, 150, 0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, screenRadius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw the prism shape
    ctx.save();
    ctx.translate(pos.x, pos.y + prism.hoverOffset);
    prism.prism.x = 0;
    prism.prism.y = 0;
    prism.prism.draw();
    ctx.restore();

    // Sparkle particles orbiting
    for (let i = 0; i < 4; i++) {
      const angle = prism.rotationPhase * 1.5 + (i * Math.PI * 2) / 4;
      const sparkleR = screenRadius * 1.4;
      const sx = pos.x + Math.cos(angle) * sparkleR;
      const sy = pos.y + Math.sin(angle) * sparkleR + prism.hoverOffset;

      ctx.fillStyle = `rgba(150, 230, 255, ${0.8 * pulse})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawLightCone(ctx) {
    if (!this.ship) return;
    if (!this.ship.alive && this.ship.deathFade > 0.5) return;

    const shipPos = this.penroseToScreen(this.ship.u, this.ship.v);
    const scale = Math.min(this.game.width, this.game.height) / this.viewScale;
    const coneLength = CONFIG.coneLength * scale;

    const isHarvesting = this.harvestingBlackHole !== null;
    const harvestProgress = isHarvesting
      ? this.harvestingBlackHole.harvestProgress / CONFIG.kerrHarvestTime
      : 0;

    // Cone colors
    let fillColor, strokeColor;
    if (isHarvesting) {
      strokeColor = "rgba(50, 255, 100, 0.9)";
      fillColor = "rgba(50, 255, 100, 0.1)";
    } else {
      strokeColor = "rgba(255, 220, 100, 0.5)";
      fillColor = "rgba(255, 220, 100, 0.15)";
    }

    // Light cone points in ship's heading direction
    const coneRotation = this.ship.heading;

    ctx.save();
    ctx.translate(shipPos.x, shipPos.y);
    ctx.rotate(coneRotation);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isHarvesting ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(coneLength, -coneLength);
    ctx.lineTo(-coneLength, -coneLength);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.restore();

    // Harvest progress fill
    if (isHarvesting && harvestProgress > 0) {
      const fillHeight = coneLength * harvestProgress;
      const fillWidth = fillHeight;

      ctx.save();
      ctx.translate(shipPos.x, shipPos.y);
      ctx.rotate(coneRotation);

      ctx.fillStyle = "rgba(50, 255, 100, 0.4)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(fillWidth, -fillHeight);
      ctx.lineTo(-fillWidth, -fillHeight);
      ctx.closePath();
      ctx.fill();

      const pulse = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      ctx.strokeStyle = `rgba(100, 255, 150, ${pulse})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.restore();

      // Progress text
      const tipX = shipPos.x + Math.sin(coneRotation) * (coneLength + 15);
      const tipY = shipPos.y - Math.cos(coneRotation) * (coneLength + 15);
      this.drawOutlinedText(
        ctx,
        `${(harvestProgress * 100).toFixed(0)}%`,
        tipX,
        tipY,
        "#5f5",
        "#000",
        "bold 16px monospace"
      );

      // Collecting message
      const textPulse = 0.7 + Math.sin(Date.now() / 200) * 0.3;
      this.drawOutlinedText(
        ctx,
        "COLLECTING KERR ENERGY",
        shipPos.x,
        shipPos.y + 50,
        `rgba(80, 255, 120, ${textPulse})`,
        "#000",
        "bold 14px monospace"
      );
    }

    // Kerr collected message
    if (this.kerrCollectedTimer > 0 && this.ship.alive) {
      const alpha = Math.min(1, this.kerrCollectedTimer);
      const textScale = 1 + (2 - this.kerrCollectedTimer) * 0.1;
      ctx.save();
      ctx.translate(shipPos.x, shipPos.y + 50);
      ctx.scale(textScale, textScale);
      this.drawOutlinedText(
        ctx,
        "KERR ENERGY COLLECTED!",
        0,
        0,
        `rgba(100, 255, 255, ${alpha})`,
        `rgba(0, 0, 0, ${alpha})`,
        "bold 16px monospace"
      );
      this.drawOutlinedText(
        ctx,
        `x${this.scoreMultiplier} MULTIPLIER!`,
        0,
        20,
        `rgba(255, 200, 50, ${alpha})`,
        `rgba(0, 0, 0, ${alpha})`,
        "bold 14px monospace"
      );
      ctx.restore();
    }

    // Frame drag indicator
    if (this.ship.inErgosphere && !isHarvesting && this.ship.alive) {
      const tipX = shipPos.x + Math.sin(coneRotation) * (coneLength + 15);
      const tipY = shipPos.y - Math.cos(coneRotation) * (coneLength + 15);
      this.drawOutlinedText(ctx, "FRAME DRAG", tipX, tipY, "#5ff", "#000", "bold 14px monospace");
    }

    // Spatial infinity indicator
    if (this.ship.hitSpatialInfinity && this.ship.alive) {
      this.drawOutlinedText(
        ctx,
        "SPATIAL INFINITY",
        shipPos.x,
        shipPos.y + 70,
        "#f88",
        "#000",
        "bold 12px monospace"
      );
    }

    // Dying cone
    if (!this.ship.alive && this.ship.deathBlackHole) {
      const bh = this.ship.deathBlackHole;
      const bhPos = this.penroseToScreen(bh.u, bh.v);
      const t = Math.min(this.ship.deathProgress, 1);

      ctx.fillStyle = `rgba(255, 50, 50, ${0.3 * t})`;
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.8 * t})`;

      ctx.beginPath();
      ctx.moveTo(shipPos.x, shipPos.y);
      ctx.lineTo(bhPos.x, bhPos.y);
      ctx.lineTo(shipPos.x + (bhPos.x - shipPos.x) * 0.3, shipPos.y - coneLength * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  drawWorldline(ctx) {
    if (!this.ship || this.ship.worldline.length < 2) return;

    ctx.strokeStyle = "#0f0";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < this.ship.worldline.length; i++) {
      const pt = this.ship.worldline[i];
      const pos = this.penroseToScreen(pt.u, pt.v);
      const alpha = i / this.ship.worldline.length;
      ctx.strokeStyle = `rgba(0, 255, 0, ${alpha * 0.8})`;

      if (i === 0) {
        ctx.moveTo(pos.x, pos.y);
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }

    ctx.stroke();
  }

  drawShip(ctx) {
    if (!this.ship) return;
    if (this.isIntro && this.introPhase === 0) return;
    if (!this.ship.alive && this.ship.deathFade >= 1) return;

    const pos = this.penroseToScreen(this.ship.u, this.ship.v);

    this.ship.shipGroup.x = pos.x;
    this.ship.shipGroup.y = pos.y;

    // Ship tilts to show heading direction
    const tiltDegrees = this.ship.heading * (180 / Math.PI) * 0.5; // Subtle tilt
    this.ship.shipGroup.rotation = tiltDegrees;

    if (!this.ship.alive) {
      ctx.save();
      const redshiftAmount = Math.min(this.ship.deathProgress * 2, 1);
      const hueShift = -120 * redshiftAmount;
      const saturate = 1 + redshiftAmount * 0.5;
      const brightness = 1 - redshiftAmount * 0.3;

      ctx.filter = `hue-rotate(${hueShift}deg) saturate(${saturate}) brightness(${brightness})`;
      this.ship.shipGroup.opacity = 1 - this.ship.deathFade;
      this.ship.shipGroup.render();
      ctx.restore();
    } else if (this.isBoosting) {
      ctx.save();
      const pulse = 0.8 + Math.sin(Date.now() / 50) * 0.2;
      ctx.filter = `hue-rotate(60deg) saturate(1.8) brightness(${1.4 + pulse * 0.3})`;
      this.ship.shipGroup.opacity = 1;
      this.ship.shipGroup.render();
      ctx.restore();
    } else if (this.ship.inErgosphere) {
      ctx.save();
      const pulse = 0.8 + Math.sin(Date.now() / 100) * 0.2;
      ctx.filter = `hue-rotate(160deg) saturate(${1.2 * pulse}) brightness(1.1)`;
      this.ship.shipGroup.opacity = 1;
      this.ship.shipGroup.render();
      ctx.restore();
    } else {
      this.ship.shipGroup.opacity = 1;
      this.ship.shipGroup.render();
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  drawOutlinedText(ctx, text, x, y, fillColor, strokeColor, font) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
