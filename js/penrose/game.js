/**
 * Penrose Diagram Game
 *
 * A spacetime survival game played on a Penrose (conformal) diagram.
 * Navigate through spacetime, dodge black holes, and watch your light cone!
 *
 * Physics:
 * - Light always travels at 45deg in a Penrose diagram
 * - Your worldline must be timelike (steeper than 45deg)
 * - Cross an event horizon = all futures lead to singularity = death
 */

import { Collision, Game, Keys, Painter, StateMachine } from "/gcanvas.es.min.js";
import { PenroseArtifact } from "./artifact.js";
import { PenroseBlackHole } from "./blackhole.js";
import { CONFIG } from "./constants.js";
import { PenroseScene } from "./penrosescene.js";
import { PenroseShip } from "./ship.js";
import { PenroseSounds } from "./sounds.js";
import { VoidScene } from "./voidscene.js";
import { PenroseWormhole } from "./wormhole.js";
import { LoreDisplay, LorePrism, LORE_CONFIG } from "./lore.js";

// ============================================================================
// PENROSE GAME
// ============================================================================

class PenroseGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#000008";

    // State machine
    this.fsm = null;

    // Camera
    this.viewCenter = { u: 0, v: 0 };
    this.viewScale = 2.5;
    this.targetViewScale = CONFIG.baseViewScale;
    this.cameraRotation = 0;
    this.targetCameraRotation = 0;

    // Ship (Penrose coordinates)
    this.ship = new PenroseShip(this);

    // Black holes
    this.blackHoles = [];
    this.spawnTimer = 0;
    this.currentSpawnRate = CONFIG.blackHoleSpawnRate;

    // Score
    this.timeSurvived = 0;
    this.blackHolesDodged = 0;
    this.kerrHarvests = 0;
    this.score = 0;
    this.scoreMultiplier = 1;
    this.harvestingBlackHole = null;

    // Kerr energy
    this.kerrEnergy = 100;
    this.isBoosting = false;

    // Wormholes
    this.wormholes = [];
    this.wormholeSpawnTimer = 0;
    this.wormholeUsedTimer = 0;
    this.wormholesUsed = 0;

    // Artifacts
    this.artifacts = [];
    this.artifactSpawnTimer = 0;
    this.hasArtifact = false;
    this.artifactCollectedTimer = 0;

    // Lore prisms
    this.lorePrisms = [];
    this.loreSpawnTimer = 0;

    // Intro
    this.introProgress = 0;
    this.introPhase = 0;

    // Input tracking
    this.spaceWasPressed = false;
    this.spaceJustPressed = false;

    // Timers
    this.kerrCollectedTimer = 0;

    // Lore system
    this.lore = new LoreDisplay(this);

    // Scenes
    this.penroseScene = new PenroseScene(this);
    this.voidScene = new VoidScene(this);

    // Wire up scene callbacks
    this.voidScene.onEscape = () => this.escapeVoid();
    this.voidScene.onTimeout = () => {
      this.hasArtifact = false;
      this.fsm.setState("gameover");
    };

    // Initialize state machine
    this.fsm = new StateMachine({
      initial: "intro",
      context: this,
      states: {
        intro: {
          enter: this.onEnterIntro,
          update: this.updateIntro,
        },
        playing: {
          enter: this.onEnterPlaying,
          update: this.updatePlaying,
        },
        dying: {
          update: this.updateDying,
        },
        insideBlackHole: {
          enter: this.onEnterVoid,
          update: this.updateInsideBlackHole,
        },
        gameover: {},
      },
    });
  }

  get state() {
    return this.fsm?.state || "intro";
  }

  // ============================================================================
  // STATE CALLBACKS
  // ============================================================================

  onEnterIntro() {
    this.introProgress = 0;
    this.introPhase = 0;
  }

  onEnterPlaying() {
    this.penroseScene.regenerateStars();
  }

  onEnterVoid() {
    PenroseSounds.voidEnter();
    this.voidScene.reset();
  }

  // ============================================================================
  // GAME LIFECYCLE
  // ============================================================================

  reset() {
    this.ship.reset();
    this.blackHoles = [];
    this.spawnTimer = 0;
    this.currentSpawnRate = CONFIG.blackHoleSpawnRate;
    this.timeSurvived = 0;
    this.blackHolesDodged = 0;
    this.kerrHarvests = 0;
    this.score = 0;
    this.scoreMultiplier = 1;
    this.harvestingBlackHole = null;
    this.kerrCollectedTimer = 0;
    this.kerrEnergy = 100;
    this.isBoosting = false;
    this.wormholes = [];
    this.wormholeSpawnTimer = 0;
    this.wormholeUsedTimer = 0;
    this.artifacts = [];
    this.artifactSpawnTimer = 0;
    this.hasArtifact = false;
    this.artifactCollectedTimer = 0;
    this.lorePrisms = [];
    this.loreSpawnTimer = 0;
    this.viewCenter = { u: 0, v: CONFIG.shipStartV + CONFIG.cameraLookAhead };
    this.viewScale = CONFIG.baseViewScale;
    this.cameraRotation = 0;
    this.targetCameraRotation = 0;
    this.fsm.setState("playing");

    PenroseSounds.startEngine();
  }

  update(dt) {
    super.update(dt);

    // Space key detection
    const spaceIsPressed = Keys.isDown(Keys.SPACE);
    this.spaceJustPressed = spaceIsPressed && !this.spaceWasPressed;
    this.spaceWasPressed = spaceIsPressed;

    // State transitions via space
    if (this.spaceJustPressed) {
      PenroseSounds.init();

      if (this.fsm.is("intro") && this.introPhase === 0) {
        this.introPhase = 1;
        this.introProgress = 0;
      } else if (this.fsm.is("gameover")) {
        this.reset();
      }
    }

    // Update state machine
    this.fsm.update(dt);

    // Sync scene state
    this.syncSceneState();
  }

  /**
   * Sync game state to scene for rendering
   */
  syncSceneState() {
    const ps = this.penroseScene;
    ps.viewCenter = this.viewCenter;
    ps.viewScale = this.viewScale;
    ps.cameraRotation = this.cameraRotation;
    ps.ship = this.ship;
    ps.blackHoles = this.blackHoles;
    ps.wormholes = this.wormholes;
    ps.artifacts = this.artifacts;
    ps.lorePrisms = this.lorePrisms;
    ps.harvestingBlackHole = this.harvestingBlackHole;
    ps.kerrCollectedTimer = this.kerrCollectedTimer;
    ps.scoreMultiplier = this.scoreMultiplier;
    ps.timeSurvived = this.timeSurvived;
    ps.isIntro = this.fsm.is("intro");
    ps.introPhase = this.introPhase;
    ps.isBoosting = this.isBoosting;
  }

  // ============================================================================
  // STATE UPDATES
  // ============================================================================

  updateIntro(dt) {
    this.introProgress += dt;

    if (this.introPhase === 0) {
      this.viewScale = 2.5;
      this.viewCenter.u = 0;
      this.viewCenter.v = 0 + Math.sin(this.introProgress * 0.5) * 0.03;
    } else {
      const t = Math.min(this.introProgress / 2, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.viewScale = 2.5 - (2.5 - CONFIG.baseViewScale) * eased;
      const targetV = CONFIG.shipStartV + CONFIG.cameraLookAhead;
      this.viewCenter.v = 0 + (targetV - 0) * eased;

      if (t >= 1) {
        this.fsm.setState("playing");
      }
    }
  }

  updatePlaying(dt) {
    // Update ship
    this.ship.update(dt);

    // Boost check
    const boostPressed = Keys.isDown(Keys.SHIFT) || Keys.isDown("w") || Keys.isDown("W");
    this.isBoosting = boostPressed && this.kerrEnergy > 0;

    if (this.isBoosting) {
      if (!this._lastBoosting) PenroseSounds.boost();
      this.kerrEnergy = Math.max(0, this.kerrEnergy - CONFIG.boostDrainRate * dt);
      this.ship.boostMultiplier = CONFIG.boostSpeedMultiplier;

      const leftPressed = Keys.isDown("a") || Keys.isDown("A") || Keys.isDown(Keys.LEFT);
      const rightPressed = Keys.isDown("d") || Keys.isDown("D") || Keys.isDown(Keys.RIGHT);

      if (leftPressed) {
        this.ship.velocity -= CONFIG.shipSteering * CONFIG.boostSteeringMultiplier * dt;
      }
      if (rightPressed) {
        this.ship.velocity += CONFIG.shipSteering * CONFIG.boostSteeringMultiplier * dt;
      }
    } else {
      this.ship.boostMultiplier = 1;
    }
    this._lastBoosting = this.isBoosting;

    // Update engine sound
    PenroseSounds.updateEngine(this.ship.timeSpeed, this.isBoosting);

    // Frame dragging
    let totalFrameDrag = 0;
    for (const bh of this.blackHoles) {
      totalFrameDrag += bh.getFrameDragForce(this.ship.u, this.ship.v);
    }

    if (this.isBoosting) {
      totalFrameDrag *= 0.3;
    }

    if (totalFrameDrag !== 0) {
      this.ship.velocity += totalFrameDrag * dt * 60;
      this.ship.inErgosphere = true;
    } else {
      this.ship.inErgosphere = false;
    }

    // Camera follow
    this.viewCenter.u += (this.ship.u - this.viewCenter.u) * CONFIG.cameraLag;
    this.viewCenter.v += (this.ship.v + CONFIG.cameraLookAhead - this.viewCenter.v) * CONFIG.cameraLag;
    this.viewScale = CONFIG.baseViewScale + this.ship.timeSpeed * 0.5;

    // No camera rotation - world stays stable, ship moves in heading direction
    this.cameraRotation = 0;

    // Timers
    this.timeSurvived += dt;
    this.spawnTimer += dt;

    // Difficulty ramp
    const difficultyT = Math.min(this.timeSurvived / CONFIG.difficultyRampTime, 1);
    this.currentSpawnRate = CONFIG.blackHoleSpawnRate - (CONFIG.blackHoleSpawnRate - CONFIG.blackHoleMinSpawnRate) * difficultyT;

    // Spawn black holes
    if (this.spawnTimer >= this.currentSpawnRate) {
      this.spawnBlackHole();
      this.spawnTimer = 0;
    }

    // Score
    this.score += dt * 100 * this.scoreMultiplier;

    // Kerr timer
    if (this.kerrCollectedTimer > 0) {
      this.kerrCollectedTimer -= dt;
    }

    // Track harvesting
    this.harvestingBlackHole = null;

    // Update black holes and check collisions
    const shipCircle = this.ship.getCircle();

    for (const bh of this.blackHoles) {
      bh.update(dt);

      // Collision with event horizon
      if (Collision.circleCircle(shipCircle, bh.getCircle())) {
        this.ship.die(bh);
        PenroseSounds.death();
        this.fsm.setState("dying");
        return;
      }

      // Kerr harvesting
      if (!bh.harvested && bh.checkLightConeContact(this.ship.u, this.ship.v, CONFIG.coneLength)) {
        bh.isBeingHarvested = true;
        bh.harvestProgress += dt;
        this.harvestingBlackHole = bh;

        if (bh.harvestProgress >= CONFIG.kerrHarvestTime) {
          bh.harvested = true;
          this.kerrHarvests++;
          this.scoreMultiplier *= CONFIG.kerrScoreMultiplier;
          this.kerrCollectedTimer = 2.0;
          this.kerrEnergy = Math.min(100, this.kerrEnergy + CONFIG.kerrEnergyPerHarvest);
          PenroseSounds.kerrCollect();
        }
      }

      // Dodged tracking
      if (!bh.passed && this.ship.v > bh.v + bh.horizonRadius) {
        bh.passed = true;
        this.blackHolesDodged++;
      }
    }

    // Cleanup black holes
    this.blackHoles = this.blackHoles.filter((bh) => bh.v > this.ship.v - 1);

    // Wormhole spawning
    this.wormholeSpawnTimer += dt;
    if (this.timeSurvived > CONFIG.wormholeMinTime && this.wormholeSpawnTimer >= CONFIG.wormholeSpawnInterval) {
      this.wormholeSpawnTimer = 0;
      if (Math.random() < CONFIG.wormholeSpawnChance) {
        this.spawnWormhole();
      }
    }

    // Update wormholes
    for (const wh of this.wormholes) {
      wh.update(dt);

      if (wh.active && Collision.circleCircle(shipCircle, wh.getCircle())) {
        wh.used = true;
        PenroseSounds.wormholeEnter();
        this.wormholeUsedTimer = 2.5;
        this.wormholesUsed++;

        this.ship.u = 0;
        this.ship.v = CONFIG.shipStartV;
        this.ship.velocity = 0;
        this.ship.timeSpeed = CONFIG.shipTimeSpeed;
        this.ship.worldline = [];

        this.blackHoles = [];
        this.spawnTimer = 0;

        this.viewCenter = { u: 0, v: CONFIG.shipStartV + CONFIG.cameraLookAhead };
        this.cameraRotation = 0;
        this.targetCameraRotation = 0;

        this.penroseScene.regenerateStars();
      }
    }

    this.wormholes = this.wormholes.filter((wh) => !wh.used && wh.v > this.ship.v - 0.5);

    if (this.wormholeUsedTimer > 0) {
      this.wormholeUsedTimer -= dt;
    }

    // Artifact spawning
    if (this.wormholesUsed > 0 && !this.hasArtifact) {
      this.artifactSpawnTimer += dt;
      if (this.artifactSpawnTimer >= CONFIG.artifactSpawnInterval) {
        this.artifactSpawnTimer = 0;
        if (Math.random() < CONFIG.artifactSpawnChance) {
          this.spawnArtifact();
        }
      }
    }

    // Update artifacts
    for (const art of this.artifacts) {
      art.update(dt);

      if (art.active && Collision.circleCircle(shipCircle, art.getCircle())) {
        art.collected = true;
        this.hasArtifact = true;
        this.artifactCollectedTimer = 3.0;
        PenroseSounds.artifactCollect();
      }
    }

    this.artifacts = this.artifacts.filter((art) => !art.collected && art.v > this.ship.v - 0.5);

    if (this.artifactCollectedTimer > 0) {
      this.artifactCollectedTimer -= dt;
    }

    // Lore prism spawning
    this.loreSpawnTimer += dt;
    if (this.loreSpawnTimer >= LORE_CONFIG.spawnInterval) {
      this.loreSpawnTimer = 0;
      if (Math.random() < LORE_CONFIG.spawnChance) {
        this.spawnLorePrism();
      }
    }

    // Update lore prisms and check collision
    for (const prism of this.lorePrisms) {
      prism.update(dt);

      if (prism.active && Collision.circleCircle(shipCircle, prism.getCircle())) {
        prism.collected = true;
        // Rewards
        this.kerrEnergy = Math.min(100, this.kerrEnergy + LORE_CONFIG.kerrReward);
        this.score += LORE_CONFIG.scoreReward;
        // Show lore message
        this.lore.show(prism.lore);
        PenroseSounds.kerrCollect(); // Reuse the kerr sound
      }
    }

    this.lorePrisms = this.lorePrisms.filter((p) => !p.collected && p.v > this.ship.v - 0.5);

    // Win condition
    if (this.ship.v >= 0.95) {
      PenroseSounds.stopEngine();
      this.fsm.setState("gameover");
    }

    // Update lore display
    this.lore.update(dt);
  }

  updateDying(dt) {
    this.ship.update(dt);

    if (this.ship.deathFade >= 1) {
      if (this.hasArtifact) {
        this.fsm.setState("insideBlackHole");
      } else {
        this.fsm.setState("gameover");
      }
    }
  }

  updateInsideBlackHole(dt) {
    this.voidScene.update(dt);
  }

  escapeVoid() {
    PenroseSounds.voidEscape();
    this.hasArtifact = false;
    this.ship.alive = true;
    this.ship.u = 0;
    this.ship.v = CONFIG.shipStartV;
    this.ship.velocity = 0;
    this.ship.timeSpeed = CONFIG.shipTimeSpeed;
    this.ship.worldline = [];
    this.ship.deathFade = 0;
    this.ship.deathProgress = 0;

    this.blackHoles = [];
    this.spawnTimer = 0;

    this.viewCenter = { u: 0, v: CONFIG.shipStartV + CONFIG.cameraLookAhead };
    this.cameraRotation = 0;
    this.targetCameraRotation = 0;

    this.penroseScene.regenerateStars();
    this.fsm.setState("playing");
  }

  // ============================================================================
  // SPAWNING
  // ============================================================================

  spawnBlackHole() {
    const aheadV = this.ship.v + CONFIG.blackHoleSpawnAhead;
    const maxU = Math.max(0, 1 - Math.abs(aheadV)) - 0.1;
    if (maxU <= 0.1) return;

    const nearbyHoles = this.blackHoles.filter(
      (bh) => Math.abs(bh.v - aheadV) < CONFIG.blackHoleSpawnAhead * 1.5
    );

    const sortedU = nearbyHoles
      .map((bh) => ({ u: bh.u, r: bh.horizonRadius }))
      .sort((a, b) => a.u - b.u);

    let spawnU = null;
    const minGap = CONFIG.blackHoleMinGap;
    const spawnSpread = 0.25;
    const shipBias = this.ship.u + this.ship.velocity * 0.3;

    if (sortedU.length === 0) {
      const offset = (Math.random() - 0.5) * spawnSpread * 2;
      spawnU = shipBias + offset;
      spawnU = Math.max(-maxU, Math.min(maxU, spawnU));
    } else {
      const gaps = [];

      const firstHole = sortedU[0];
      if (firstHole.u - firstHole.r - -maxU > minGap) {
        gaps.push({ start: -maxU, end: firstHole.u - firstHole.r - minGap / 2 });
      }

      for (let i = 0; i < sortedU.length - 1; i++) {
        const left = sortedU[i];
        const right = sortedU[i + 1];
        const gapStart = left.u + left.r + minGap / 2;
        const gapEnd = right.u - right.r - minGap / 2;
        if (gapEnd - gapStart > minGap) {
          gaps.push({ start: gapStart, end: gapEnd });
        }
      }

      const lastHole = sortedU[sortedU.length - 1];
      if (maxU - (lastHole.u + lastHole.r) > minGap) {
        gaps.push({ start: lastHole.u + lastHole.r + minGap / 2, end: maxU });
      }

      if (gaps.length > 0) {
        const scoredGaps = gaps
          .map((gap) => {
            const gapCenter = (gap.start + gap.end) / 2;
            const distFromShip = Math.abs(gapCenter - shipBias);
            return { gap, gapCenter, score: 1 / (distFromShip + 0.1) };
          })
          .sort((a, b) => b.score - a.score);

        const pickIndex = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * scoredGaps.length);
        const chosen = scoredGaps[pickIndex];
        const gapHalfWidth = (chosen.gap.end - chosen.gap.start) / 2;

        if (gapHalfWidth > minGap) {
          spawnU = chosen.gapCenter + (Math.random() - 0.5) * gapHalfWidth * 0.5;
        }
      }
    }

    if (spawnU === null) return;

    const difficultyT = Math.min(this.timeSurvived / CONFIG.difficultyRampTime, 1);
    const mass = 0.3 + Math.random() * 0.4 * difficultyT;

    this.blackHoles.push(new PenroseBlackHole(spawnU, aheadV, mass));
  }

  spawnWormhole() {
    const aheadV = this.ship.v + CONFIG.blackHoleSpawnAhead * 3;
    const maxU = Math.max(0, 1 - Math.abs(aheadV)) - 0.1;
    if (maxU <= 0.1) return;

    const predictedU = this.ship.u + this.ship.velocity * 0.15;
    const spawnU = Math.max(-maxU, Math.min(maxU, predictedU));

    this.wormholes.push(new PenroseWormhole(spawnU, aheadV));
    PenroseSounds.wormholeSpawn();
  }

  spawnArtifact() {
    const aheadV = this.ship.v + CONFIG.blackHoleSpawnAhead * 2.5;
    const maxU = Math.max(0, 1 - Math.abs(aheadV)) - 0.1;
    if (maxU <= 0.1) return;

    const predictedU = this.ship.u + this.ship.velocity * 0.1;
    const spawnU = Math.max(-maxU, Math.min(maxU, predictedU));

    this.artifacts.push(new PenroseArtifact(spawnU, aheadV));
    PenroseSounds.artifactSpawn();
  }

  spawnLorePrism() {
    const aheadV = this.ship.v + CONFIG.blackHoleSpawnAhead * 1.5;
    const maxU = Math.max(0, 1 - Math.abs(aheadV)) - 0.1;
    if (maxU <= 0.1) return;

    // Spawn with some randomness
    const spawnU = (Math.random() - 0.5) * maxU * 1.5;

    // Select lore pool based on player progress
    let pool = "early";
    if (this.wormholesUsed > 0) {
      pool = Math.random() < 0.5 ? "post_wormhole" : "early";
    } else {
      // Weight toward wormhole hints
      pool = Math.random() < 0.6 ? "wormhole" : "early";
    }
    if (this.kerrHarvests > 0 && Math.random() < 0.3) {
      pool = "kerr";
    }

    this.lorePrisms.push(new LorePrism(spawnU, aheadV, pool));
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  render() {
    super.render();
    const ctx = Painter.ctx;

    if (this.fsm.is("insideBlackHole")) {
      this.voidScene.render();
      return;
    }

    // Render Penrose scene
    this.penroseScene.render();

    // UI overlay (not rotated)
    this.drawUI(ctx);
  }

  drawUI(ctx) {
    ctx.font = "16px monospace";
    ctx.textAlign = "left";

    if (this.fsm.is("intro")) {
      this.drawIntroUI(ctx);
    } else if (this.fsm.is("playing")) {
      this.drawPlayingUI(ctx);
    } else if (this.fsm.is("dying")) {
      this.drawDyingUI(ctx);
    } else if (this.fsm.is("gameover")) {
      this.drawGameOverUI(ctx);
    }
  }

  drawIntroUI(ctx) {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "24px monospace";
    ctx.fillText("PENROSE DIAGRAM", this.width / 2, 50);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#aaa";

    if (this.introPhase === 0) {
      const lines = [
        "Navigate through spacetime",
        "",
        "Your LIGHT CONE shows possible futures (45 degrees)",
        "Cross an EVENT HORIZON = all paths lead to SINGULARITY",
        "",
        "Controls: A/D or Arrow Keys to steer",
        "",
        "Press SPACE to begin",
      ];

      lines.forEach((line, i) => {
        ctx.fillText(line, this.width / 2, this.height / 2 + i * 24 - 80);
      });
    }
  }

  drawPlayingUI(ctx) {
    // Score
    ctx.textAlign = "left";
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "#0f0";
    ctx.fillText(`${Math.floor(this.score)}`, 20, this.height - 80);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#8f8";
    ctx.fillText(`x${this.scoreMultiplier} multiplier`, 20, this.height - 55);

    if (this.kerrHarvests > 0) {
      ctx.fillStyle = "#5ff";
      ctx.fillText(`KERR x${this.kerrHarvests}`, 20, this.height - 38);
    }

    // Artifact indicator
    if (this.hasArtifact) {
      const pulse = 0.7 + Math.sin(Date.now() / 200) * 0.3;
      ctx.fillStyle = `rgba(200, 100, 255, ${pulse})`;
      ctx.font = "bold 14px monospace";
      ctx.fillText("ARTIFACT", 20, this.height - 100);
      ctx.font = "10px monospace";
      ctx.fillStyle = "#a0a";
      ctx.fillText("Survive singularity!", 20, this.height - 85);
    }

    // Artifact collected message
    if (this.artifactCollectedTimer > 0) {
      const alpha = Math.min(1, this.artifactCollectedTimer / 0.5);
      const scale = 1 + (3 - this.artifactCollectedTimer) * 0.03;
      ctx.save();
      ctx.translate(this.width / 2, this.height / 2 - 60);
      ctx.scale(scale, scale);

      ctx.fillStyle = `rgba(100, 50, 150, ${alpha * 0.4})`;
      ctx.fillRect(-160, -30, 320, 80);

      this.drawOutlinedText(ctx, "ARTIFACT ACQUIRED!", 0, 0, `rgba(200, 150, 255, ${alpha})`, `rgba(20, 0, 40, ${alpha})`, "bold 22px monospace");
      this.drawOutlinedText(ctx, "You can now survive the singularity!", 0, 28, `rgba(150, 100, 200, ${alpha * 0.9})`, `rgba(20, 0, 40, ${alpha})`, "12px monospace");
      ctx.restore();
    }

    // Stats
    ctx.fillStyle = "#888";
    ctx.font = "12px monospace";
    ctx.fillText(`Time: ${this.timeSurvived.toFixed(1)}s | Dodged: ${this.blackHolesDodged}`, 20, this.height - 15);

    // Kerr energy bar
    const barWidth = 120;
    const barHeight = 16;
    const barX = this.width - barWidth - 20;
    const barY = this.height - 35;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

    const energyWidth = (this.kerrEnergy / 100) * barWidth;
    ctx.fillStyle = this.isBoosting ? "#ff0" : "#0ff";
    ctx.fillRect(barX, barY, energyWidth, barHeight);

    ctx.strokeStyle = this.isBoosting ? "#ff0" : "#088";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = this.kerrEnergy > 0 ? "#fff" : "#666";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("KERR ENERGY [W]", barX + barWidth / 2, barY - 6);

    if (this.isBoosting) {
      const boostPulse = 0.7 + Math.sin(Date.now() / 50) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 0, ${boostPulse})`;
      ctx.font = "bold 12px monospace";
      ctx.fillText("BOOSTING!", barX + barWidth / 2, barY + barHeight + 14);
    }

    // Wormhole message
    if (this.wormholeUsedTimer > 0) {
      const alpha = Math.min(1, this.wormholeUsedTimer / 0.5);
      const scale = 1 + (2.5 - this.wormholeUsedTimer) * 0.05;
      ctx.save();
      ctx.translate(this.width / 2, this.height / 2 - 80);
      ctx.scale(scale, scale);

      ctx.fillStyle = `rgba(100, 50, 200, ${alpha * 0.3})`;
      ctx.fillRect(-180, -25, 360, 70);

      this.drawOutlinedText(ctx, "WORMHOLE ACTIVATED!", 0, 0, `rgba(150, 200, 255, ${alpha})`, `rgba(0, 0, 50, ${alpha})`, "bold 24px monospace");
      this.drawOutlinedText(ctx, "Teleported to past infinity!", 0, 28, `rgba(200, 150, 255, ${alpha * 0.8})`, `rgba(0, 0, 50, ${alpha})`, "14px monospace");
      ctx.restore();
    }

    // Lore display - position at light cone tip
    if (this.ship && this.ship.alive) {
      const shipPos = this.penroseScene.penroseToScreen(this.ship.u, this.ship.v);
      const scale = Math.min(this.width, this.height) / this.viewScale;
      const coneLength = CONFIG.coneLength * scale;

      // Position at tip of light cone (follows heading direction)
      const tipX = shipPos.x + Math.sin(this.ship.heading) * (coneLength + 60);
      const tipY = shipPos.y - Math.cos(this.ship.heading) * (coneLength + 60);

      this.lore.render(ctx, tipX, tipY);
    } else {
      this.lore.render(ctx);
    }
  }

  drawDyingUI(ctx) {
    const textAlpha = Math.min(1, this.ship.deathProgress * 0.5);
    ctx.textAlign = "center";

    ctx.fillStyle = `rgba(255, 50, 50, ${textAlpha})`;
    ctx.font = "32px monospace";
    ctx.fillText("SINGULARITY", this.width / 2, this.height / 2 - 40);

    ctx.font = "16px monospace";
    ctx.fillStyle = `rgba(255, 136, 136, ${textAlpha})`;
    ctx.fillText("All futures lead here...", this.width / 2, this.height / 2);

    if (this.ship.deathFade > 0.3) {
      const scoreAlpha = (this.ship.deathFade - 0.3) / 0.7;
      ctx.font = "18px monospace";
      ctx.fillStyle = `rgba(100, 255, 100, ${scoreAlpha})`;
      ctx.fillText(`Time: ${this.timeSurvived.toFixed(1)}s`, this.width / 2, this.height / 2 + 50);
      ctx.fillText(`Escaped: ${this.blackHolesDodged}`, this.width / 2, this.height / 2 + 75);
    }
  }

  drawGameOverUI(ctx) {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "32px monospace";
    ctx.fillText("GAME OVER", this.width / 2, this.height / 2 - 100);

    ctx.font = "bold 36px monospace";
    ctx.fillStyle = "#0f0";
    ctx.fillText(`${Math.floor(this.score)}`, this.width / 2, this.height / 2 - 40);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#8f8";
    ctx.fillText("SCORE", this.width / 2, this.height / 2 - 60);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText(`Time: ${this.timeSurvived.toFixed(1)}s`, this.width / 2, this.height / 2 + 10);
    ctx.fillText(`Black Holes Dodged: ${this.blackHolesDodged}`, this.width / 2, this.height / 2 + 35);

    if (this.kerrHarvests > 0) {
      ctx.fillStyle = "#5ff";
      ctx.fillText(`Kerr Energy Harvested: ${this.kerrHarvests}`, this.width / 2, this.height / 2 + 60);
      ctx.fillStyle = "#fa0";
      ctx.fillText(`Score Multiplier: x${this.scoreMultiplier}`, this.width / 2, this.height / 2 + 85);
    }

    ctx.font = "14px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText("Press SPACE to try again", this.width / 2, this.height / 2 + 130);
  }

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

// ============================================================================
// INITIALIZE
// ============================================================================

const canvas = document.getElementById("game");
const game = new PenroseGame(canvas);
game.start();

// ============================================================================
// DEBUG HELPERS
// ============================================================================

window.game = game;

window.artifact = () => {
  if (!game.fsm.is("playing")) {
    console.log("Must be in playing state to spawn artifact");
    return;
  }
  game.spawnArtifact();
};

window.wormhole = () => {
  if (!game.fsm.is("playing")) {
    console.log("Must be in playing state to spawn wormhole");
    return;
  }
  game.spawnWormhole();
};

window.giveArtifact = () => {
  game.hasArtifact = true;
  game.wormholesUsed = 1;
  console.log("Artifact granted! You can now survive a singularity.");
};

window.die = () => {
  if (!game.fsm.is("playing")) {
    console.log("Must be in playing state");
    return;
  }
  if (game.blackHoles.length > 0) {
    game.ship.die(game.blackHoles[0]);
    game.fsm.setState("dying");
  } else {
    console.log("No black holes to die to");
  }
};

window.lore = () => {
  if (!game.fsm.is("playing")) {
    console.log("Must be in playing state to spawn lore prism");
    return;
  }
  game.spawnLorePrism();
};
