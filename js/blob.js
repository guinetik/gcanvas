import {
  BezierShape,
  Button,
  Circle,
  Collision,
  Diamond,
  Easing,
  FPSCounter,
  Game,
  Heart,
  Hexagon,
  HorizontalLayout,
  Motion,
  Painter,
  Position,
  Rectangle,
  Scene,
  ShapeGOFactory,
  Star,
  StateMachine,
  Synth,
  TextShape,
  Tween,
  Tweenetik,
  VerticalLayout,
} from "/gcanvas.es.min.js";

// Game configuration
const CONFIG = {
  // Blob starting size
  startRadius: 40,
  maxRadius: 120,
  minRadius: 20,             // minimum size before death
  growthPerCollect: 3,

  // Hunger/starvation system
  hungerTime: 3.0,           // seconds without eating before hunger starts
  hungerTimeMin: 1.0,        // minimum hunger time at max difficulty
  shrinkRate: 5,             // pixels per second of shrinking when hungry
  shrinkRateMax: 15,         // max shrink rate at max difficulty
  shrinkScorePenalty: 2,     // score lost per pixel shrunk

  // Collectibles
  spawnInterval: 1.5,        // seconds between spawns
  minSpawnInterval: 0.4,     // minimum spawn interval at max difficulty
  collectibleLifespan: 4.0,  // seconds before collectible disappears
  minLifespan: 1.5,          // minimum lifespan at max difficulty
  maxCollectibles: 8,        // max on screen at once

  // Scoring
  basePoints: 10,
  multiplierDecay: 0.5,      // seconds before multiplier resets
  maxMultiplier: 8,

  // Difficulty scaling
  difficultyRampTime: 60,    // seconds to reach max difficulty
};

/**
 * BezierBlob Game - A playful blob that follows the mouse with Tween animations
 */
class BezierBlobGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    this.backgroundColor = "#111122";
    this.debug = false;
    this.hovering = false;
  }

  /**
   * Check if screen is narrow (mobile width)
   */
  isMobile() {
    return this.width < 600;
  }

  /**
   * Get responsive configuration based on screen size
   */
  getResponsiveConfig() {
    const isMobile = this.isMobile();
    return {
      buttonWidth: isMobile ? 80 : 100,
      buttonHeight: 32,
      spacing: isMobile ? 5 : 8,
      // Always horizontal at bottom left
      layoutType: "horizontal",
      anchor: Position.BOTTOM_LEFT,
      anchorOffsetX: 10,
      anchorOffsetY: -10,
    };
  }

  init() {
    super.init();

    // Initialize audio system
    Synth.init({ masterVolume: 0.3 });

    this.blobScene = new BlobScene(this);
    this.uiScene = new BlobUIScene(this, this.blobScene, {
      debug: this.debug,
      debugColor: "pink",
    });
    this.pipeline.add(this.blobScene);
    this.pipeline.add(this.uiScene);
  }

  onResize() {
    if (this.uiScene) {
      this.uiScene.onResize();
    }
  }
}

/**
 * Main scene containing the blob and handling interactions
 */
class BlobScene extends Scene {
  constructor(game) {
    super(game);

    // Create a background that will receive mouse events
    this.bg = ShapeGOFactory.create(
      game,
      new Rectangle({
        width: game.width,
        height: game.height,
        debug: this.debug,
        color: "rgba(0, 0, 0, 0)",
      })
    );
    this.add(this.bg);

    // Mouse position tracking
    this.mouseX = game.width / 2;
    this.mouseY = game.height / 2;
    this.interactive = true;
    // Forward mouse events
    this.game.events.on("inputmove", (e) => {
      this.mouseX = e.x;
      this.mouseY = e.y;
    });

    // Create the blob
    this.createBlob();

    // Setup physics properties
    this.blobPhysics = {
      // Target position (will follow mouse with delay)
      targetX: this.mouseX,
      targetY: this.mouseY,
      // Current position of blob center
      currentX: game.width / 2,
      currentY: game.height / 2,
      // Velocity
      vx: 0,
      vy: 0,
      // Physics constants
      springFactor: 0.08, // How strongly it's pulled toward target
      drag: 0.5, // Air resistance/friction
      wobbleAmount: 0.8, // How much the blob wobbles (0-1)
      wobbleSpeed: 8, // Speed of wobble oscillation
      // Animation state
      excitementLevel: 0, // Gets excited with fast mouse movements
      mood: 0, // 0 = normal, 1 = happy, -1 = scared, -2 = very sad
      // Color state
      baseColor: [64, 180, 255], // RGB base color (the "full" color when happy)
      currentColor: [64, 180, 255], // Current RGB color
      // Blob size
      baseRadius: 80, // Normal size
      currentRadius: 80, // Current size
      radiusScale: 0, // Scale
      // Tamagotchi life/energy system
      energy: 1.0, // 0 = dead/black, 1 = fully alive/vibrant
      energyDecayRate: 0.15, // How fast energy drains per second when idle (~7 sec to die)
      energyGainRate: 0.8, // How fast energy increases from movement
    };

    // State machine for blob lifecycle
    this.stateMachine = new StateMachine({
      initial: "ready",
      context: this,
      states: {
        ready: {
          enter: () => this.enterReadyState(),
          update: (dt) => this.updateReadyState(dt),
        },
        alive: {
          enter: () => this.enterAliveState(),
          update: (dt) => this.updateAliveState(dt),
        },
        falling: {
          enter: () => {
            this.fallVelocity = 0;
            this.fallSquish = 0;
            this.playDeathSound();
            this.stopWobbleSound();
          },
          update: (dt) => this.updateFallingState(dt),
        },
        dead: {
          enter: () => {
            this.setDeadFace();
          },
          update: (dt) => this.updateDeadState(dt),
        },
      },
    });

    this.bounceHeight = 0; // Will be set on each click
    this.originalRadius = this.blobPhysics.baseRadius;

    // Fall/death state
    this.fallVelocity = 0;
    this.fallSquish = 0;

    // === GAME STATE ===
    this.gameState = {
      score: 0,
      multiplier: 1,
      multiplierTimer: 0,
      gameTime: 0,
      spawnTimer: 0,
      collectiblesEaten: 0,
      currentLevel: 1,
      lastEatTime: 0,         // Time since last collectible eaten
      isHungry: false,        // Whether blob is currently hungry/starving
    };

    // Collectibles array
    this.collectibles = [];

    // Shape types for collectibles
    this.shapeTypes = [
      { shape: Star, size: 20, points: 10 },
      { shape: Heart, size: 18, points: 15 },
      { shape: Diamond, size: 16, points: 20 },
      { shape: Hexagon, size: 14, points: 25 },
    ];

    // Set initial blob size (smaller)
    this.blobPhysics.baseRadius = CONFIG.startRadius;
    this.blobPhysics.currentRadius = CONFIG.startRadius;
    this.blobPhysics.healthyRadius = CONFIG.startRadius; // Track healthy size before hunger effects

    // Control points around the blob (in polar coordinates for easy animation)
    this.blobPoints = [];
    // Increased to 16 points for more segments and wobbliness
    const numPoints = 16;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      this.blobPoints.push({
        angle: angle,
        radius: this.blobPhysics.baseRadius, // Base radius
        radiusOffset: 0, // Will be animated
        phaseOffset: i * 0.7, // Different starting phase for each point
        wobbleFrequency: 1 + Math.random() * 0.5, // Slightly different frequencies for each point
      });
    }

    // Animation timing
    this.time = 0;

    // Tween animations
    this.animations = {
      gradientShift: {
        name: "gradientShift",
        active: false,
        startColor: 0,
        targetColor: 0,
        duration: 2.5,
        elapsed: 0,
      },
      pulseAnimation: {
        active: false,
        startTime: 0,
        duration: 0.5,
        startRadius: this.blobPhysics.baseRadius,
        targetRadius: this.blobPhysics.baseRadius * 1.2,
      },
      colorAnimation: {
        active: false,
        startTime: 0,
        duration: 1.0,
      },
      bounceAnimation: {
        active: false,
        startTime: 0,
        duration: 0.8,
      },
    };

    // Blob emotions/states
    this.blobState = {
      excited: false,
      scared: false,
      happy: false,
    };
    this.bg.interactive = true;
    // Background receives input for mouse tracking but no growth on click
    // Growth only happens from collecting items

    // Add FPS counter
    this.add(
      new FPSCounter(game, {
        anchor: "bottom-right",
      })
    );
  }

  /**
   * Create the blob using BezierShape
   */
  createBlob() {
    this.blobBounceDeform = 0;
    // Initial simple circle path
    const path = [
      ["M", 50, 0],
      ["C", 50, 27.6, 27.6, 50, 0, 50],
      ["C", -27.6, 50, -50, 27.6, -50, 0],
      ["C", -50, -27.6, -27.6, -50, 0, -50],
      ["C", 27.6, -50, 50, -27.6, 50, 0],
      ["Z"],
    ];

    // Create BezierShape for the blob
    const blobShape = new BezierShape(path, {
      color: "rgba(80, 200, 255, 0.8)",
      stroke: "rgba(255, 255, 255, 0.8)",
      debug: this.debug,
      width: 100,
      height: 100,
      debugColor: "rgba(255, 0, 0, 0.8)",
      lineWidth: 2,
    });

    // Create GameObject using the factory
    this.blob = ShapeGOFactory.create(this.game, blobShape);

    // Add the blob to the scene
    this.add(this.blob);

    // Create eyes for the blob
    const leftEye = ShapeGOFactory.create(
      this.game,
      new Circle(10, {
        x: -20,
        y: -15,
        color: "white",
        stroke: "rgba(0, 0, 0, 0.5)",
        lineWidth: 1,
      }),
      {
        debug: this.debug,
        debugColor: "white",
      }
    );

    const rightEye = ShapeGOFactory.create(
      this.game,
      new Circle(10, {
        x: 20,
        y: -15,
        color: "white",
        stroke: "rgba(0, 0, 0, 0.5)",
        lineWidth: 1,
      }),
      {
        debug: this.debug,
        debugColor: "white",
      }
    );

    // Create pupils
    const leftPupil = ShapeGOFactory.create(
      this.game,
      new Circle(4, {
        x: -20,
        y: -15,
        color: "black",
      }),
      {
        debug: this.debug,
        debugColor: "blue",
      }
    );

    const rightPupil = ShapeGOFactory.create(
      this.game,
      new Circle(4, {
        x: 20,
        y: -15,
        color: "black",
      }),
      {
        debug: this.debug,
        debugColor: "blue",
      }
    );

    // Create mouth (initially a small line)
    const mouthShape = new BezierShape(
      [
        ["M", -15, 0],
        ["Q", 0, 5, 15, 0],
      ],
      {
        x: 0,
        y: 10,
        width: 30,
        height: 10,
        stroke: "rgba(0, 0, 0, 0.7)",
        lineWidth: 3,
        color: null,
      }
    );

    const mouth = ShapeGOFactory.create(this.game, mouthShape, {
      debug: this.debug,
      debugColor: "red",
    });

    // Add facial features to the scene
    this.add(leftEye);
    this.add(rightEye);
    this.add(leftPupil);
    this.add(rightPupil);
    this.add(mouth);

    // Store reference to facial features for animation
    this.leftEye = leftEye;
    this.rightEye = rightEye;
    this.leftPupil = leftPupil;
    this.rightPupil = rightPupil;
    this.mouth = mouth;
  }

  /**
   * Trigger a specific animation
   */
  triggerAnimation(animType) {
    const anim = this.animations[animType + "Animation"];
    if (!anim) return;

    anim.active = true;
    anim.startTime = this.time;

    // Handle specific animation setup
    if (animType === "color") {
      // Choose a random hue
      const hue = Math.floor(Math.random() * 360);
      this.targetHue = hue;
    }
  }

  /**
   * Set the blob's mood and update facial features
   * 2 = ecstatic, 1 = happy, 0 = neutral, -1 = sad, -2 = very sad/dying
   */
  setMood(mood) {
    if (this.blobPhysics.mood === mood) return; // No change needed
    this.blobPhysics.mood = mood;

    // Update mouth shape based on mood
    if (mood >= 2) {
      // Ecstatic - huge open smile
      this.mouth.shape.path = [
        ["M", -30, -5],
        ["Q", 0, 25, 30, -5],
      ];
      this.mouth.shape.stroke = "rgba(0, 0, 0, 0.8)";
      this.mouth.shape.lineWidth = 4;
    } else if (mood === 1) {
      // Happy - big smile
      this.mouth.shape.path = [
        ["M", -25, 0],
        ["Q", 0, 15, 25, 0],
      ];
      this.mouth.shape.stroke = "rgba(0, 0, 0, 0.7)";
      this.mouth.shape.lineWidth = 3;
    } else if (mood === 0) {
      // Neutral - slight curve
      this.mouth.shape.path = [
        ["M", -15, 0],
        ["Q", 0, 5, 15, 0],
      ];
      this.mouth.shape.stroke = "rgba(0, 0, 0, 0.6)";
      this.mouth.shape.lineWidth = 3;
    } else if (mood === -1) {
      // Sad - slight frown
      this.mouth.shape.path = [
        ["M", -15, 5],
        ["Q", 0, -3, 15, 5],
      ];
      this.mouth.shape.stroke = "rgba(0, 0, 0, 0.5)";
      this.mouth.shape.lineWidth = 2;
    } else {
      // Very sad/dying - big frown, droopy
      this.mouth.shape.path = [
        ["M", -20, 8],
        ["Q", 0, -8, 20, 8],
      ];
      this.mouth.shape.stroke = "rgba(0, 0, 0, 0.4)";
      this.mouth.shape.lineWidth = 2;
    }

    // Update eye size based on mood (happy = bigger eyes, sad = smaller)
    const eyeScale = mood >= 1 ? 1.2 : mood === 0 ? 1.0 : mood === -1 ? 0.9 : 0.7;
    this.leftEye.scaleX = this.leftEye.scaleY = eyeScale;
    this.rightEye.scaleX = this.rightEye.scaleY = eyeScale;

    // Pupils also scale
    const pupilScale = mood >= 1 ? 1.1 : mood <= -1 ? 0.8 : 1.0;
    this.leftPupil.scaleX = this.leftPupil.scaleY = pupilScale;
    this.rightPupil.scaleX = this.rightPupil.scaleY = pupilScale;
  }

  /**
   * Update mood based on energy level and hunger
   */
  updateMoodFromEnergy() {
    const energy = this.blobPhysics.energy;
    const excitement = this.blobPhysics.excitementLevel;
    const isHungry = this.gameState.isHungry;

    let newMood;

    // Dying always takes priority
    if (energy <= 0.15) {
      newMood = -2; // Very sad/dying when almost no energy
    } else if (isHungry) {
      // Hunger makes blob sad - sadder the longer it's hungry
      const diff = this.getDifficulty();
      const hungerThreshold = CONFIG.hungerTime -
        (CONFIG.hungerTime - CONFIG.hungerTimeMin) * diff;
      const hungerDuration = this.gameState.lastEatTime - hungerThreshold;
      newMood = hungerDuration > 1.5 ? -2 : -1; // Very sad if hungry for long
    } else if (excitement > 0.7 && energy > 0.5) {
      newMood = 2; // Ecstatic when very excited and has energy
    } else if (energy > 0.7) {
      newMood = 1; // Happy when energy is high
    } else if (energy > 0.4) {
      newMood = 0; // Neutral
    } else {
      newMood = -1; // Sad when energy is low
    }

    this.setMood(newMood);
  }

  /**
   * Update the scene
   */
  update(dt) {
    // Update background size
    this.bg.width = this.game.width;
    this.bg.height = this.game.height;
    this.bg.x = this.game.width / 2;
    this.bg.y = this.game.height / 2;
    // Update time
    this.time += dt;
    // Process animations
    this.updateAnimations(dt);
    // Update Tweenetik animations (for flash effects, etc.)
    Tweenetik.updateAll(dt);
    // Update state machine
    this.stateMachine.update(dt);
    super.update(dt);
  }

  /**
   * Update when blob is alive - follows mouse, has energy system
   */
  updateAliveState(dt) {
    const physics = this.blobPhysics;

    // Update game time
    this.gameState.gameTime += dt;

    // Check for level up - Level N requires N scales (8 notes each)
    // Level 1: 8 notes, Level 2: 16 more, Level 3: 24 more, etc.
    // Total notes to complete level N = 8 * (1+2+...+N) = 4*N*(N+1)
    const popCount = this._popNoteIndex || 0;
    const newLevel = this.getLevelFromPops(popCount);
    if (newLevel > this.gameState.currentLevel) {
      this.gameState.currentLevel = newLevel;
      this.playStartSound(); // Play level-up melody
      this.showFloatingText(`LEVEL ${newLevel}!`, this.game.width / 2, this.game.height / 2 - 50);
    }

    // Calculate spring force toward target (mouse position)
    const dx = this.mouseX - physics.currentX;
    const dy = this.mouseY - physics.currentY;
    // Apply spring force to velocity
    physics.vx += dx * physics.springFactor;
    physics.vy += dy * physics.springFactor;
    // Apply drag
    physics.vx *= physics.drag;
    physics.vy *= physics.drag;
    // Update position
    if (!this.hovering) {
      physics.currentX += physics.vx;
      physics.currentY += physics.vy;
    } else {
      this.mouseX = this.game.width / 2;
      this.mouseY = this.game.height / 2;
      physics.currentX = this.game.width / 2;
      physics.currentY = this.game.height / 2;
    }

    // Calculate speed for excitement level
    const speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
    const direction = Math.atan2(physics.vy, physics.vx);
    this.speed = speed;

    // Update excitement level based on speed
    const targetExcitement = Math.min(speed / 2, 1);
    physics.excitementLevel = Tween.lerp(
      physics.excitementLevel,
      targetExcitement,
      dt * 2
    );

    // === TAMAGOTCHI ENERGY SYSTEM ===
    // Movement adds energy, idleness drains it
    if (physics.excitementLevel > 0.2) {
      const gainAmount = physics.excitementLevel * physics.energyGainRate * dt;
      physics.energy = Math.min(1.0, physics.energy + gainAmount);
    } else {
      physics.energy = Math.max(0, physics.energy - physics.energyDecayRate * dt);
    }

    // === COLLECTIBLE SYSTEM ===
    this.updateCollectibles(dt);
    this.checkCollisions();
    this.updateCollectionParticles(dt);
    this.updateFloatingTexts(dt);

    // === HUNGER/STARVATION SYSTEM ===
    this.updateHunger(dt);

    // Check for death - transition to falling state
    // Die from energy depletion OR shrinking too small
    if (physics.energy <= 0 || physics.baseRadius <= CONFIG.minRadius) {
      this.stateMachine.setState("falling");
      return;
    }

    // Low energy warning
    if (physics.energy < 0.2 && physics.energy > 0) {
      this.playLowEnergyWarning();
    }

    // Normal alive updates
    this.updateMoodFromEnergy();
    this.updateEnergyColor();
    this.updateBlobShape(speed, direction);
    this.positionBlobFeatures(dt);

    // Update wobble sound based on movement
    this.updateWobbleSound();
  }

  /**
   * Update when blob is falling to the ground
   */
  updateFallingState(dt) {
    const physics = this.blobPhysics;
    const groundY = this.game.height - 60;
    const gravity = 800;

    // Apply gravity
    this.fallVelocity += gravity * dt;
    physics.currentY += this.fallVelocity * dt;

    // Hit the ground
    if (physics.currentY >= groundY) {
      physics.currentY = groundY;
      // Small squish on impact
      this.fallSquish = 0.3;
      this.stateMachine.setState("dead");
    }

    // Update blob position
    this.blob.x = physics.currentX;
    this.blob.y = physics.currentY;

    // Position face during fall
    this.leftEye.x = physics.currentX - 20;
    this.leftEye.y = physics.currentY - 15;
    this.rightEye.x = physics.currentX + 20;
    this.rightEye.y = physics.currentY - 15;
    this.leftPupil.x = this.leftEye.x;
    this.leftPupil.y = this.leftEye.y;
    this.rightPupil.x = this.rightEye.x;
    this.rightPupil.y = this.rightEye.y;
    this.mouth.x = physics.currentX;
    this.mouth.y = physics.currentY + 10;

    // Darken during fall
    this.blob.shape.color = "rgba(30, 30, 30, 0.9)";
  }

  /**
   * Update when blob is dead on the ground
   */
  updateDeadState(dt) {
    const physics = this.blobPhysics;

    // Slowly settle squish and deflate
    this.fallSquish = Math.min(0.5, this.fallSquish + dt * 0.3);

    // Apply squish - flatten vertically, stretch horizontally
    const squishY = 1 - this.fallSquish;
    const squishX = 1 + this.fallSquish * 0.6;
    this.blob.scaleX = squishX;
    this.blob.scaleY = squishY;

    // Position blob
    this.blob.x = physics.currentX;
    this.blob.y = physics.currentY;

    // Position face on squished blob
    const faceY = physics.currentY - 15 * squishY;
    this.leftEye.x = physics.currentX - 20 * squishX;
    this.leftEye.y = faceY;
    this.leftEye.scaleX = squishX * 0.5;
    this.leftEye.scaleY = squishY * 0.5;

    this.rightEye.x = physics.currentX + 20 * squishX;
    this.rightEye.y = faceY;
    this.rightEye.scaleX = squishX * 0.5;
    this.rightEye.scaleY = squishY * 0.5;

    this.leftPupil.x = this.leftEye.x;
    this.leftPupil.y = this.leftEye.y;
    this.rightPupil.x = this.rightEye.x;
    this.rightPupil.y = this.rightEye.y;

    this.mouth.x = physics.currentX;
    this.mouth.y = physics.currentY + 5 * squishY;
    this.mouth.scaleX = squishX;
    this.mouth.scaleY = squishY * 0.5;

    // Dead color
    this.blob.shape.color = "rgba(20, 20, 20, 0.9)";
    this.leftEye.shape.color = "rgba(80, 80, 80, 0.5)";
    this.rightEye.shape.color = "rgba(80, 80, 80, 0.5)";
  }

  /**
   * Check if the blob is dead (falling or dead state)
   */
  isDead() {
    return this.stateMachine.isAny("falling", "dead");
  }

  /**
   * Check if in ready state (before game starts)
   */
  isReady() {
    return this.stateMachine.is("ready");
  }

  /**
   * Enter ready state - hide blob, show play button
   */
  enterReadyState() {
    // Hide the blob and facial features
    this.blob.visible = false;
    this.leftEye.visible = false;
    this.rightEye.visible = false;
    this.leftPupil.visible = false;
    this.rightPupil.visible = false;
    this.mouth.visible = false;

    // Create play button if not exists
    if (!this.playButton) {
      this.playButton = new Button(this.game, {
        text: "▶ PLAY",
        width: 140,
        height: 60,
        onClick: () => this.startGame(),
      });
      this.add(this.playButton);
    }
    this.playButton.visible = true;
    this.playButton.x = this.game.width / 2;
    this.playButton.y = this.game.height / 2;
  }

  /**
   * Update ready state - just position the button
   */
  updateReadyState(dt) {
    if (this.playButton) {
      this.playButton.x = this.game.width / 2;
      this.playButton.y = this.game.height / 2;
    }
  }

  /**
   * Start the game - transition from ready to alive
   */
  startGame() {
    // Hide play button
    if (this.playButton) {
      this.playButton.visible = false;
    }

    // Reset game state
    this.resetGameState();

    // Play start sound
    this.playStartSound();

    // Transition to alive
    this.stateMachine.setState("alive");
  }

  /**
   * Enter alive state - show blob and face
   */
  enterAliveState() {
    // Show the blob and facial features
    this.blob.visible = true;
    this.leftEye.visible = true;
    this.rightEye.visible = true;
    this.leftPupil.visible = true;
    this.rightPupil.visible = true;
    this.mouth.visible = true;

    // Reset blob to center
    const physics = this.blobPhysics;
    physics.currentX = this.game.width / 2;
    physics.currentY = this.game.height / 2;
    physics.vx = 0;
    physics.vy = 0;
    physics.energy = 1.0;

    // Reset mood
    this.setMood(1);

    // Initialize wobble sound
    this.initWobbleSound();
  }

  // === COLLECTIBLE SYSTEM ===

  /**
   * Get current difficulty factor (0-1) based on game time
   */
  getDifficulty() {
    return Math.min(1, this.gameState.gameTime / CONFIG.difficultyRampTime);
  }

  /**
   * Get current spawn interval based on difficulty
   */
  getSpawnInterval() {
    const diff = this.getDifficulty();
    return CONFIG.spawnInterval - (CONFIG.spawnInterval - CONFIG.minSpawnInterval) * diff;
  }

  /**
   * Get current collectible lifespan based on difficulty
   */
  getCollectibleLifespan() {
    const diff = this.getDifficulty();
    return CONFIG.collectibleLifespan - (CONFIG.collectibleLifespan - CONFIG.minLifespan) * diff;
  }

  /**
   * Spawn a new collectible at a random position
   */
  spawnCollectible() {
    if (this.collectibles.length >= CONFIG.maxCollectibles) return;

    // Random position with margin from edges
    const margin = 80;
    const x = margin + Math.random() * (this.game.width - margin * 2);
    const y = margin + Math.random() * (this.game.height - margin * 2);

    // Pick random shape type
    const typeIndex = Math.floor(Math.random() * this.shapeTypes.length);
    const type = this.shapeTypes[typeIndex];

    // Create shape with random color
    const hue = Math.random() * 360;
    const color = `hsl(${hue}, 80%, 60%)`;
    const glowColor = `hsla(${hue}, 100%, 70%, 0.5)`;

    let shape;
    if (type.shape === Star) {
      // Star(radius, spikes, inset, options) - use size/2 for radius to match other shapes
      shape = new Star(type.size / 2, 5, 0.5, { color, stroke: "white", lineWidth: 1 });
    } else if (type.shape === Heart) {
      shape = new Heart({ width: type.size, height: type.size, color, stroke: "white", lineWidth: 1 });
    } else if (type.shape === Diamond) {
      shape = new Diamond({ width: type.size, height: type.size * 1.3, color, stroke: "white", lineWidth: 1 });
    } else {
      shape = new Hexagon(type.size, { color, stroke: "white", lineWidth: 1 });
    }

    const collectible = {
      x,
      y,
      shape,
      type,
      lifespan: this.getCollectibleLifespan(),
      age: 0,
      scale: 0, // Start at 0, animate in
      glowColor,
      pulsePhase: Math.random() * Math.PI * 2,
      rotation: 0, // For spin effect
    };

    this.collectibles.push(collectible);

    // Use Tweenetik for bouncy pop-in effect
    Tweenetik.to(collectible, { scale: 1 }, 0.5, Easing.easeOutElastic);
    // Add a little spin as it pops in
    Tweenetik.to(collectible, { rotation: Math.PI * 2 }, 0.4, Easing.easeOutQuad);

    // Play pop sound
    this.playPopSound();
  }

  /**
   * Calculate level from total pop count
   * Level N requires N scales (8*N notes) to complete
   * Total notes to finish level N = 8*(1+2+...+N) = 4*N*(N+1)
   */
  getLevelFromPops(pops) {
    // Solve 4*N*(N+1) <= pops for N using quadratic formula
    // N^2 + N - pops/4 = 0 => N = (-1 + sqrt(1 + pops)) / 2
    const level = Math.floor((-1 + Math.sqrt(1 + pops)) / 2) + 1;
    return Math.max(1, level);
  }

  /**
   * Get how many notes into the current level we are (for scale position)
   */
  getNotesInCurrentLevel(pops) {
    const level = this.getLevelFromPops(pops);
    // Notes to start this level = 4*(level-1)*level
    const notesToStartLevel = 4 * (level - 1) * level;
    return pops - notesToStartLevel;
  }

  /**
   * Play pop sound when collectible spawns - ascending scales within each level
   */
  playPopSound() {
    if (!Synth.isInitialized) return;
    Synth.resume();

    // Musical scale frequencies (C major octave: do re mi fa sol la ti do)
    const scale = [262, 294, 330, 349, 392, 440, 494, 523];

    // Initialize or get current note index
    if (this._popNoteIndex === undefined) {
      this._popNoteIndex = 0;
    }

    // Get position within current level's scales
    const notesInLevel = this.getNotesInCurrentLevel(this._popNoteIndex);
    const noteInScale = notesInLevel % 8;
    const freq = scale[noteInScale];

    // Ascending pop with current scale note
    Synth.osc.tone(freq, 0.1, {
      type: "sine",
      volume: 0.1,
      attack: 0.01,
      decay: 0.03,
      sustain: 0.4,
      release: 0.06,
    });

    // Move to next note
    this._popNoteIndex++;
  }

  /**
   * Update all collectibles - age them, despawn expired ones
   */
  updateCollectibles(dt) {
    // Spawn timer
    this.gameState.spawnTimer += dt;
    if (this.gameState.spawnTimer >= this.getSpawnInterval()) {
      this.gameState.spawnTimer = 0;
      this.spawnCollectible();
    }

    // Update multiplier decay
    if (this.gameState.multiplier > 1) {
      this.gameState.multiplierTimer += dt;
      if (this.gameState.multiplierTimer >= CONFIG.multiplierDecay) {
        this.gameState.multiplier = 1;
      }
    }

    // Update each collectible
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.age += dt;

      // Pulse effect (scale handled by Tweenetik on spawn)
      c.pulsePhase += dt * 5;

      // Remove expired collectibles
      if (c.age >= c.lifespan) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  /**
   * Check collisions between blob and collectibles
   */
  checkCollisions() {
    const physics = this.blobPhysics;
    const blobCircle = {
      x: physics.currentX,
      y: physics.currentY,
      radius: physics.currentRadius * 0.8, // Slightly smaller hitbox
    };

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const collectibleCircle = {
        x: c.x,
        y: c.y,
        radius: c.type.size * 0.6,
      };

      if (Collision.circleCircle(blobCircle, collectibleCircle)) {
        this.collectItem(c, i);
      }
    }
  }

  /**
   * Handle collecting an item - scoring, growth, effects
   */
  collectItem(collectible, index) {
    // Remove from array
    this.collectibles.splice(index, 1);

    // Calculate speed bonus - faster pickup = more points
    // Max bonus at 0 age (just spawned), no bonus after 1 second
    const speedWindow = 1.0; // seconds to get bonus
    const maxSpeedBonus = 2.0; // up to 2x bonus for instant pickup
    const ageRatio = Math.min(collectible.age / speedWindow, 1);
    const speedBonus = 1 + (maxSpeedBonus - 1) * (1 - ageRatio);

    // Calculate score with multiplier and speed bonus
    const basePoints = collectible.type.points;
    const points = Math.round(basePoints * this.gameState.multiplier * speedBonus);
    this.gameState.score += points;
    this.gameState.collectiblesEaten++;

    // Play collect sound and visual effect
    this.playCollectSound(basePoints);
    this.playEatEffect();

    // Show speed bonus indicator if fast pickup
    if (speedBonus > 1.3) {
      this.showFloatingText(
        speedBonus > 1.8 ? "QUICK! x2" : "FAST!",
        collectible.x,
        collectible.y
      );
    }

    // Check if currently bouncing for multiplier chain
    const isBouncing = this.animations.bounceAnimation.active;
    if (isBouncing) {
      // Increase multiplier!
      this.gameState.multiplier = Math.min(CONFIG.maxMultiplier, this.gameState.multiplier + 1);
      this.gameState.multiplierTimer = 0;
      // Play combo sound
      this.playComboSound(this.gameState.multiplier);
    } else {
      // Start bounce animation
      this.triggerAnimation("bounce");
      this.gameState.multiplier = 1;
      this.gameState.multiplierTimer = 0;
    }

    // Reset hunger - we just ate!
    this.gameState.lastEatTime = 0;
    this.gameState.isHungry = false;

    // Grow the blob - restore to healthy radius plus growth
    const physics = this.blobPhysics;
    // Ensure healthyRadius is initialized
    if (physics.healthyRadius === undefined) {
      physics.healthyRadius = physics.baseRadius;
    }
    const newRadius = Math.min(CONFIG.maxRadius, physics.healthyRadius + CONFIG.growthPerCollect);
    physics.baseRadius = newRadius;
    physics.currentRadius = newRadius;
    physics.healthyRadius = newRadius; // Update healthy radius to new size

    // Also give energy boost
    physics.energy = Math.min(1, physics.energy + 0.15);

    // Spawn particles at collection point
    this.spawnCollectionParticles(collectible);
  }

  /**
   * Spawn particles when collecting an item
   */
  spawnCollectionParticles(collectible) {
    // Store particles to render
    if (!this.collectionParticles) this.collectionParticles = [];

    const particleCount = 5 + this.gameState.multiplier;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 100 + Math.random() * 150;
      this.collectionParticles.push({
        x: collectible.x,
        y: collectible.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        age: 0,
        size: 3 + Math.random() * 4,
        color: collectible.glowColor,
      });
    }
  }

  /**
   * Update hunger system - blob shrinks and darkens if not fed
   */
  updateHunger(dt) {
    const physics = this.blobPhysics;
    const diff = this.getDifficulty();

    // Update time since last eating
    this.gameState.lastEatTime += dt;

    // Calculate hunger threshold based on difficulty (gets harder at higher levels)
    const hungerThreshold = CONFIG.hungerTime -
      (CONFIG.hungerTime - CONFIG.hungerTimeMin) * diff;

    // Check if we're hungry
    const wasHungry = this.gameState.isHungry;
    this.gameState.isHungry = this.gameState.lastEatTime > hungerThreshold;

    // If just became hungry, show warning and capture healthy radius
    if (this.gameState.isHungry && !wasHungry) {
      this.showFloatingText("HUNGRY!", this.game.width / 2, this.game.height / 2);
      this.playHungryWarning();
      // Capture the current radius as the healthy radius when hunger starts
      if (physics.healthyRadius === undefined || physics.healthyRadius < physics.baseRadius) {
        physics.healthyRadius = physics.baseRadius;
      }
    }

    // If hungry, shrink and lose points
    if (this.gameState.isHungry) {
      // Calculate shrink rate based on difficulty
      const shrinkRate = CONFIG.shrinkRate +
        (CONFIG.shrinkRateMax - CONFIG.shrinkRate) * diff;

      // How long we've been hungry
      const hungerDuration = this.gameState.lastEatTime - hungerThreshold;

      // Shrink faster the longer we're hungry (up to 2x after 2 seconds)
      const hungerMultiplier = 1 + Math.min(hungerDuration / 2, 1);
      const shrinkAmount = shrinkRate * hungerMultiplier * dt;

      // Apply shrinking from healthy radius (but don't modify healthyRadius)
      const newRadius = Math.max(CONFIG.minRadius, physics.baseRadius - shrinkAmount);
      if (newRadius < physics.baseRadius) {
        // Calculate score penalty
        const radiusLost = physics.baseRadius - newRadius;
        const scorePenalty = Math.ceil(radiusLost * CONFIG.shrinkScorePenalty);
        this.gameState.score = Math.max(0, this.gameState.score - scorePenalty);

        // Apply size reduction (healthyRadius stays unchanged)
        physics.baseRadius = newRadius;
        physics.currentRadius = newRadius;
      }

      // Darken the blob color based on hunger duration
      // Interpolate from normal color toward dark/gray
      const darkenFactor = Math.min(hungerDuration / 3, 0.7); // Max 70% darkening
      const baseColor = [64, 180, 255]; // Normal blue
      const darkColor = [40, 40, 60];   // Dark gray-blue

      physics.currentColor = [
        Math.round(baseColor[0] + (darkColor[0] - baseColor[0]) * darkenFactor),
        Math.round(baseColor[1] + (darkColor[1] - baseColor[1]) * darkenFactor),
        Math.round(baseColor[2] + (darkColor[2] - baseColor[2]) * darkenFactor),
      ];
    } else {
      // Not hungry - restore normal color gradually
      const baseColor = physics.baseColor;
      physics.currentColor = [
        Math.round(Tween.lerp(physics.currentColor[0], baseColor[0], dt * 3)),
        Math.round(Tween.lerp(physics.currentColor[1], baseColor[1], dt * 3)),
        Math.round(Tween.lerp(physics.currentColor[2], baseColor[2], dt * 3)),
      ];
    }
  }

  /**
   * Update and render collection particles
   */
  updateCollectionParticles(dt) {
    if (!this.collectionParticles) return;

    for (let i = this.collectionParticles.length - 1; i >= 0; i--) {
      const p = this.collectionParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;

      if (p.age >= p.life) {
        this.collectionParticles.splice(i, 1);
      }
    }
  }

  /**
   * Render collectibles
   */
  renderCollectibles() {
    for (const c of this.collectibles) {
      // Calculate fade based on remaining life
      const fadeStart = 0.7; // Start fading at 70% of lifespan
      const lifeRatio = c.age / c.lifespan;
      const alpha = lifeRatio > fadeStart
        ? 1 - (lifeRatio - fadeStart) / (1 - fadeStart)
        : 1;

      // Pulse scale
      const pulse = 1 + Math.sin(c.pulsePhase) * 0.1;
      const finalScale = c.scale * pulse;

      Painter.save();
      Painter.ctx.translate(c.x, c.y);
      Painter.ctx.rotate(c.rotation || 0); // Apply spin rotation
      Painter.ctx.scale(finalScale, finalScale);
      Painter.ctx.globalAlpha = alpha;

      // Draw subtle glow
      Painter.ctx.shadowColor = c.glowColor;
      Painter.ctx.shadowBlur = 6;

      c.shape.render();

      Painter.restore();
    }
  }

  /**
   * Render collection particles
   */
  renderCollectionParticles() {
    if (!this.collectionParticles) return;

    for (const p of this.collectionParticles) {
      const alpha = 1 - p.age / p.life;
      const size = p.size * (1 - p.age / p.life * 0.5);
      Painter.shapes.fillCircle(p.x, p.y, size, p.color.replace('0.5)', `${alpha * 0.8})`));
    }
  }

  /**
   * Reset game state
   */
  resetGameState() {
    this.gameState = {
      score: 0,
      multiplier: 1,
      multiplierTimer: 0,
      gameTime: 0,
      spawnTimer: 0,
      collectiblesEaten: 0,
      currentLevel: 1,
      lastEatTime: 0,
      isHungry: false,
    };
    this.collectibles = [];
    this.collectionParticles = [];
    this.blobPhysics.baseRadius = CONFIG.startRadius;
    this.blobPhysics.currentRadius = CONFIG.startRadius;
    this.blobPhysics.healthyRadius = CONFIG.startRadius;
    // Reset color to normal
    this.blobPhysics.currentColor = [...this.blobPhysics.baseColor];
    // Reset pop sound scale
    this._popNoteIndex = 0;
  }

  /**
   * Set the dead face - X eyes
   */
  setDeadFace() {
    // X eyes would need custom shapes, for now just make them very small/closed
    this.leftEye.scaleX = this.leftEye.scaleY = 0.3;
    this.rightEye.scaleX = this.rightEye.scaleY = 0.3;
    this.leftPupil.visible = false;
    this.rightPupil.visible = false;

    // Flat line mouth
    this.mouth.shape.path = [
      ["M", -15, 0],
      ["L", 15, 0],
    ];
  }

  /**
   * Give the blob a new random color and revive it!
   * This is the "replay" button - brings the blob back to life
   */
  triggerBlobGradientShift() {
    const physics = this.blobPhysics;

    // REVIVE from death!
    if (this.isDead()) {
      this.reviveBlob();
    }

    // Reset energy to full
    physics.energy = 1.0;

    const current = this.getSafeColor(physics.baseColor);

    // Generate a random vibrant color
    // hslToRgb expects: h=0-360, s=0-100, l=0-100
    const randomHue = Math.random() * 360;
    const randomSat = 70 + Math.random() * 25;  // 70-95%
    const randomLight = 50 + Math.random() * 15; // 50-65%

    // Convert current RGB to HSL for smooth interpolation
    // rgbToHsl returns h=0-360, s=0-1, l=0-1, so convert s,l to 0-100
    const rawHsl = Painter.colors.rgbToHsl(...current);
    const startHsl = [rawHsl[0], rawHsl[1] * 100, rawHsl[2] * 100];
    const targetHsl = [randomHue, randomSat, randomLight];

    this.animations.gradientShift.startColor = startHsl;
    this.animations.gradientShift.targetColor = targetHsl;
    this.animations.gradientShift.startTime = this.time;
    this.animations.colorAnimation.active = false;
    this.animations.gradientShift.active = true;
    this.animations.gradientShift.elapsed = 0;
  }

  /**
   * Revive the blob from death - goes back to ready state
   */
  reviveBlob() {
    const physics = this.blobPhysics;

    // Reset physics
    physics.baseRadius = CONFIG.startRadius;
    physics.currentRadius = CONFIG.startRadius;
    physics.healthyRadius = CONFIG.startRadius;
    physics.currentX = this.game.width / 2;
    physics.currentY = this.game.height / 2;
    physics.vx = 0;
    physics.vy = 0;
    physics.energy = 1.0;

    // Reset scale
    this.blob.scaleX = 1;
    this.blob.scaleY = 1;
    this.fallSquish = 0;

    // Reset facial features
    this.leftEye.scaleX = this.leftEye.scaleY = 1;
    this.rightEye.scaleX = this.rightEye.scaleY = 1;
    this.leftPupil.scaleX = this.leftPupil.scaleY = 1;
    this.rightPupil.scaleX = this.rightPupil.scaleY = 1;
    this.leftPupil.visible = true;
    this.rightPupil.visible = true;
    this.mouth.scaleX = this.mouth.scaleY = 1;

    // Reset game state
    this.resetGameState();

    // Reset mood
    this.setMood(1);

    // Go back to ready state (shows play button)
    this.stateMachine.setState("ready");
  }

  /**
   * Validate that an RGB color array is valid
   */
  isValidRgb(rgb) {
    if (!Array.isArray(rgb) || rgb.length < 3) return false;
    // Allow floats, just check they're valid numbers in reasonable range
    return rgb.slice(0, 3).every(
      (v) => typeof v === "number" && !isNaN(v) && isFinite(v) && v >= -1 && v <= 256
    );
  }

  /**
   * Get a safe color, falling back to default if invalid
   * Also clamps values to valid 0-255 range
   */
  getSafeColor(color, fallback = [64, 180, 255]) {
    if (!this.isValidRgb(color)) return fallback;
    // Clamp and round values
    return [
      Math.round(Math.max(0, Math.min(255, color[0]))),
      Math.round(Math.max(0, Math.min(255, color[1]))),
      Math.round(Math.max(0, Math.min(255, color[2]))),
    ];
  }

  /**
   * Update active animations
   */
  updateAnimations(dt) {
    // Process all animations
    for (const [animName, anim] of Object.entries(this.animations)) {
      if (!anim.active) continue;
      // Calculate normalized time (0-1)
      const elapsed = this.time - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      // Process specific animations
      if (animName === "pulseAnimation") {
        const easedT = Easing.easeOutElastic(t);
        const start = anim.startRadius;
        const end = anim.targetRadius;
        this.blobPhysics.currentRadius = Tween.lerp(start, end, easedT);
        if (t >= 1) {
          anim.active = false;
          this.blobPhysics.baseRadius = this.blobPhysics.currentRadius;
          anim.targetRadius = this.blobPhysics.baseRadius * 1.1;
        }
      } else if (animName === "gradientShift") {
        // Change "if" to "else if" to fix the logic issue
        this.updateColorIdle(t, anim);
      } else if (animName === "bounceAnimation") {
        const eased = Easing.easeOutBounce(t);
        // max deformation (inward squish) - subtle bounce
        const bounceAmount = 15 + this.blobPhysics.currentRadius * 0.15;
        // Store this deform amount globally
        this.blobBounceDeform = bounceAmount * (1 - eased); // starts squished, eases to 0
        if (t >= 1) {
          this.blobBounceDeform = 0;
          anim.active = false;
        }
      }
    }
  }

  /**
   * Position the blob and all its features
   */
  positionBlobFeatures(dt) {
    const physics = this.blobPhysics;
    // Position the blob
    this.blob.x = physics.currentX;
    this.blob.y = physics.currentY;

    // Calculate scale factor based on blob size
    // Note: blob body scales via updateBlobShape(), not scaleX/Y
    // Scale features proportionally (100 = design baseline)
    const sizeScale = physics.currentRadius / 100;

    // Update eye positions and shapes - scale offsets by blob size
    const baseEyeOffsetY = -15;
    const baseEyeOffsetX = 20;
    const eyeOffsetY = baseEyeOffsetY * sizeScale;
    const eyeOffsetX = baseEyeOffsetX * sizeScale;
    const eyeYAdjust = Math.min(physics.excitementLevel * 5, 3) * sizeScale; // Eyes move up when excited

    // Scale the eyes and pupils
    this.leftEye.scaleX = this.leftEye.scaleY = sizeScale;
    this.rightEye.scaleX = this.rightEye.scaleY = sizeScale;
    this.leftPupil.scaleX = this.leftPupil.scaleY = sizeScale;
    this.rightPupil.scaleX = this.rightPupil.scaleY = sizeScale;
    this.mouth.scaleX = this.mouth.scaleY = sizeScale;

    // Position eyes based on blob position
    this.leftEye.x = physics.currentX - eyeOffsetX;
    this.leftEye.y = physics.currentY + eyeOffsetY - eyeYAdjust;
    // Position pupils based on eye position
    this.rightEye.x = physics.currentX + eyeOffsetX;
    this.rightEye.y = physics.currentY + eyeOffsetY - eyeYAdjust;
    //
    // Eye tracking
    // First, calculate vectors from eye centers to mouse
    const leftEyeToDx = this.mouseX - this.leftEye.x;
    const leftEyeToDy = this.mouseY - this.leftEye.y;
    // Right eye vector
    const rightEyeToDx = this.mouseX - this.rightEye.x;
    const rightEyeToDy = this.mouseY - this.rightEye.y;
    // Eye dimensions (scaled)
    const eyeRadius = 10 * sizeScale; // The full white part of the eye
    const pupilRadius = 4 * sizeScale; // The black part of the eye
    // Maximum distance the pupil center can move from eye center
    // This ensures the pupil always stays within the white part
    const maxPupilOffset = eyeRadius - pupilRadius - 1; // -1 for a small margin
    // Calculate pupil positions for each eye
    // -- Left Eye --
    // First, normalize direction vector
    const leftEyeDist = Math.sqrt(
      leftEyeToDx * leftEyeToDx + leftEyeToDy * leftEyeToDy
    );
    let leftPupilX = 0,
      leftPupilY = 0;
    if (leftEyeDist > 0) {
      // Normalize and scale by max offset
      const normalizedX = leftEyeToDx / leftEyeDist;
      const normalizedY = leftEyeToDy / leftEyeDist;
      // Scale the movement - eyes follow more strongly when looking directly at the cursor
      // and less when looking at extreme angles
      // Calculate a scaled magnitude (distance from eye center to pupil center)
      // Formula creates a sigmoid-like response curve
      const scaledMagnitude = maxPupilOffset * Math.tanh(leftEyeDist / 200);
      leftPupilX = normalizedX * scaledMagnitude;
      leftPupilY = normalizedY * scaledMagnitude;
    }
    //
    // -- Right Eye --
    // First, normalize direction vector
    const rightEyeDist = Math.sqrt(
      rightEyeToDx * rightEyeToDx + rightEyeToDy * rightEyeToDy
    );
    let rightPupilX = 0,
      rightPupilY = 0;
    if (rightEyeDist > 0) {
      // Normalize and scale by max offset
      const normalizedX = rightEyeToDx / rightEyeDist;
      const normalizedY = rightEyeToDy / rightEyeDist;
      // Calculate scaled magnitude with the same formula
      const scaledMagnitude = maxPupilOffset * Math.tanh(rightEyeDist / 200);
      rightPupilX = normalizedX * scaledMagnitude;
      rightPupilY = normalizedY * scaledMagnitude;
    }
    //
    // Apply smoothing with Tween - this creates a more natural lag in eye movement
    const eyeResponseSpeed = 80; // Higher = faster response
    // Tween the pupil positions to follow the calculated offsets
    this.leftPupil.x = Tween.lerp(
      this.leftPupil.x,
      this.leftEye.x + leftPupilX,
      dt * eyeResponseSpeed
    );
    this.leftPupil.y = Tween.lerp(
      this.leftPupil.y,
      this.leftEye.y + leftPupilY,
      dt * eyeResponseSpeed
    );
    this.rightPupil.x = Tween.lerp(
      this.rightPupil.x,
      this.rightEye.x + rightPupilX,
      dt * eyeResponseSpeed
    );
    this.rightPupil.y = Tween.lerp(
      this.rightPupil.y,
      this.rightEye.y + rightPupilY,
      dt * eyeResponseSpeed
    );
    // Position mouth (scale the offset)
    this.mouth.x = physics.currentX;
    this.mouth.y = physics.currentY + 10 * sizeScale;
  }

  /**
   * Update the blob's shape based on movement and time
   */
  updateBlobShape(speed, direction) {
    const physics = this.blobPhysics;
    const baseRadius = physics.currentRadius;
    // Calculate the new control points based on speed, direction and wobble
    let controlPoints = [];
    // Update radius offsets for wobble effect
    for (let i = 0; i < this.blobPoints.length; i++) {
      const point = this.blobPoints[i];
      // Use Tween functions for wobble animation
      // Mix sine and elastic easings for more organic movement
      const wobbleT =
        (this.time * physics.wobbleSpeed * point.wobbleFrequency +
          point.phaseOffset) %
        2;
      const wobbleEasing =
        wobbleT < 1
          ? Easing.easeInOutSine(wobbleT)
          : Easing.easeInOutSine(2 - wobbleT);
      // Apply excitement factor to wobble - more excited = more wobble
      const excitementFactor = 1 + physics.excitementLevel * speed * 0.2;
      const osc = Motion.oscillate(
        -3, // min
        3, // max
        this.time * 10 + i * 0.5, // elapsed time with index offset
        1, // duration of full cycle (seconds)
        true, // loop
        Easing.easeInOutSine // optional easing
      );

      // Apply everything to radiusOffset
      point.radiusOffset =
        wobbleEasing *
          physics.wobbleAmount *
          20 *
          (1 + physics.excitementLevel * speed * 0.2) +
        osc.value * physics.excitementLevel;

      // Squash in the direction of movement if moving fast
      const squash = Math.min(speed * 0.1, 0.5);
      const angleDiff = Math.abs(normalizeAngle(point.angle - direction));
      // Points in the direction of movement get compressed, perpendicular points expand
      // This creates a more natural squash-and-stretch effect
      const movementEffect = Math.cos(angleDiff) * squash * 30;
      const stretchEffect = Math.sin(angleDiff) * squash * 15;
      // Calculate final radius including all effects
      const finalRadius =
        baseRadius +
        point.radiusOffset +
        this.blobBounceDeform - // 👈 deformation affects all points equally
        movementEffect +
        stretchEffect;

      // Convert polar to cartesian coordinates
      const x = Math.cos(point.angle) * finalRadius;
      const y = Math.sin(point.angle) * finalRadius;
      controlPoints.push({
        x,
        y,
      });
    }
    // Generate the path commands for the BezierShape
    const path = this.generateBlobPath(controlPoints);
    this.blob.shape.path = path;
  }

  /**
   * Update color based on energy and excitement levels
   * - Energy (from movement) controls base brightness (0 = black, 1 = full color)
   * - Excitement boosts brightness toward white (but capped so not full white)
   * - Idle = energy drains = fades to black
   * - Flash effect blends toward white when eating
   */
  updateEnergyColor() {
    const energy = this.blobPhysics.energy;
    const excitement = this.blobPhysics.excitementLevel;
    const flashAmount = this._flashAmount || 0;

    // Get the base color (either from animation or physics)
    const baseColor = this.getSafeColor(
      this.blobVisualBaseColor ?? this.blobPhysics.baseColor
    );

    // Energy controls the base brightness (0 = black, 1 = full base color)
    // Excitement adds a boost toward white (max 40% boost to avoid full white)
    const maxExcitementBoost = 0.4;
    const excitementBoost = excitement * maxExcitementBoost;

    // Calculate final color:
    // 1. Scale base color by energy (fades to black when energy is low)
    // 2. Add excitement boost toward white (255)
    // 3. Apply flash effect (blend toward white)
    const finalColor = baseColor.map((channel) => {
      // Base brightness from energy
      const energyScaled = channel * energy;
      // Excitement pushes toward white (255)
      const toWhite = (255 - energyScaled) * excitementBoost;
      const baseResult = Math.min(255, energyScaled + toWhite);
      // Flash effect pushes toward white
      const flashed = baseResult + (255 - baseResult) * flashAmount;
      return Math.round(Math.min(255, flashed));
    });

    this.blobPhysics.currentColor = finalColor;

    const [r, g, b] = finalColor;
    this.blob.shape.color = `rgba(${r}, ${g}, ${b}, 0.8)`;

    // Also dim the eyes when energy is low
    const eyeAlpha = 0.3 + energy * 0.7;
    this.leftEye.shape.color = `rgba(255, 255, 255, ${eyeAlpha})`;
    this.rightEye.shape.color = `rgba(255, 255, 255, ${eyeAlpha})`;
  }

  updateColor() {
    // This is now handled by updateEnergyColor()
    // Keep for compatibility but delegate
    this.updateEnergyColor();
  }

  updateColorIdle(t, anim) {
    const easedT = Easing.easeInOutSine(t);

    // Interpolate in HSL
    const hsl = Tween.tweenGradient(anim.startColor, anim.targetColor, easedT);

    // Convert back to RGB and validate
    const rgb = Painter.colors.hslToRgb(...hsl);

    // Only update if we got a valid color - use getSafeColor to clamp values
    if (this.isValidRgb(rgb)) {
      this.blobVisualBaseColor = this.getSafeColor(rgb);
    }

    if (t >= 1) {
      anim.active = false;
      // Only update base color if we have a valid visual base color
      if (this.isValidRgb(this.blobVisualBaseColor)) {
        this.blobPhysics.baseColor = this.getSafeColor(this.blobVisualBaseColor);
      }
      this.blobVisualBaseColor = null;
    }
  }

  /**
   * Render additional effects
   */
  render() {
    // In ready state, just render the play button
    if (this.isReady()) {
      super.render();
      return;
    }

    // Render collectibles BEFORE the blob (so they appear behind)
    this.renderCollectibles();
    this.renderCollectionParticles();

    super.render();

    // Excitement particles when very excited
    if (this.blobPhysics.excitementLevel > 0.7) {
      this.renderExcitementParticles();
    }

    // Render score and multiplier HUD
    this.renderHUD();

    // Render floating bonus text indicators
    this.renderFloatingTexts();
  }

  /**
   * Render the score and multiplier display
   */
  renderHUD() {
    // Don't render HUD in ready state
    if (this.isReady()) return;

    const { score, multiplier } = this.gameState;
    const physics = this.blobPhysics;

    // Score display (top center)
    Painter.useCtx((ctx) => {
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      // Score with subtle glow
      ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "white";
      ctx.fillText(`SCORE: ${score}`, this.game.width / 2, 20);

      // Multiplier (if > 1)
      if (multiplier > 1) {
        ctx.font = "bold 18px monospace";
        ctx.fillStyle = `hsl(${60 + multiplier * 30}, 80%, 55%)`;
        ctx.shadowBlur = 0; // No glow on multiplier
        ctx.fillText(`x${multiplier} COMBO!`, this.game.width / 2, 50);
      }

      // Difficulty indicator (small, bottom)
      const diff = this.getDifficulty();
      ctx.font = "12px monospace";
      ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
      ctx.shadowBlur = 0;
      ctx.fillText(`Level: ${Math.floor(diff * 10) + 1}`, this.game.width / 2, this.game.height - 130);
    });
  }

  // === SOUND EFFECTS ===

  /**
   * Play collect sound - ascending chirp
   */
  playCollectSound(points) {
    if (!Synth.isInitialized) return;
    Synth.resume();

    // Base frequency scales with points value
    const baseFreq = 400 + points * 10;
    Synth.osc.sweep(baseFreq, baseFreq * 1.5, 0.1, {
      type: "sine",
      volume: 0.3,
    });
  }

  /**
   * Play combo sound - exciting ascending arpeggio
   */
  playComboSound(multiplier) {
    if (!Synth.isInitialized) return;
    Synth.resume();

    const baseFreq = 300 + multiplier * 50;
    // Quick ascending notes
    for (let i = 0; i < Math.min(multiplier, 4); i++) {
      Synth.osc.tone(baseFreq * (1 + i * 0.25), 0.08, {
        type: "square",
        volume: 0.15,
        attack: 0.01,
        decay: 0.02,
        sustain: 0.5,
        release: 0.05,
        startTime: Synth.now + i * 0.05,
      });
    }
  }

  /**
   * Play death sound - sad descending tone
   */
  playDeathSound() {
    if (!Synth.isInitialized) return;
    Synth.resume();

    // Descending sweep
    Synth.osc.sweep(400, 80, 0.8, {
      type: "sawtooth",
      volume: 0.2,
      exponential: true,
    });
  }

  /**
   * Play hungry warning - stomach growl sound
   */
  playHungryWarning() {
    if (!Synth.isInitialized) return;
    Synth.resume();

    // Low rumbling growl
    Synth.osc.sweep(80, 50, 0.3, {
      type: "sawtooth",
      volume: 0.15,
    });
    // Second growl
    Synth.osc.sweep(70, 40, 0.25, {
      type: "sawtooth",
      volume: 0.12,
      startTime: Synth.now + 0.35,
    });
  }

  /**
   * Play start sound - cheerful intro
   */
  playStartSound() {
    if (!Synth.isInitialized) return;
    Synth.resume();

    // Quick ascending chord
    const notes = [262, 330, 392, 523]; // C major chord + octave
    notes.forEach((freq, i) => {
      Synth.osc.tone(freq, 0.2, {
        type: "sine",
        volume: 0.2,
        attack: 0.01,
        decay: 0.05,
        sustain: 0.6,
        release: 0.15,
        startTime: Synth.now + i * 0.08,
      });
    });
  }

  /**
   * Play low energy warning beep
   */
  playLowEnergyWarning() {
    if (!Synth.isInitialized) return;
    if (this._lastWarningTime && Synth.now - this._lastWarningTime < 2) return;
    this._lastWarningTime = Synth.now;

    Synth.resume();
    // Two short warning beeps
    Synth.osc.tone(200, 0.1, { type: "square", volume: 0.1 });
    Synth.osc.tone(200, 0.1, { type: "square", volume: 0.1, startTime: Synth.now + 0.15 });
  }

  /**
   * Initialize the wobble sound - continuous oscillator that responds to movement
   */
  initWobbleSound() {
    if (!Synth.isInitialized || this._wobbleOsc) return;

    Synth.resume();

    // Create a continuous oscillator for the wobble
    this._wobbleOsc = Synth.osc.continuous({
      type: "sine",
      frequency: 80,
      volume: 0,
    });

    // Create a second oscillator for FM modulation effect
    this._wobbleLfo = Synth.osc.continuous({
      type: "sine",
      frequency: 4,
      volume: 0,
    });
  }

  /**
   * Update wobble sound based on blob movement
   */
  updateWobbleSound() {
    if (!this._wobbleOsc) return;

    const physics = this.blobPhysics;
    const speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
    const excitement = physics.excitementLevel;

    // Map speed to volume (0 when still, up to 0.08 when very fast)
    // Scaled down: need to move faster for audible sound
    const targetVolume = Math.min(0.08, speed * 0.008) * (physics.energy > 0 ? 1 : 0);

    // Map speed to frequency (low rumble when slow, higher when fast)
    // Scaled down: need to move faster for high notes
    const targetFreq = 50 + speed * 6 + excitement * 20;

    // Map excitement to LFO rate (faster wobble when more excited)
    const lfoRate = 2 + excitement * 5;

    // Smooth transitions
    this._wobbleOsc.setFrequency(targetFreq, 0.1);
    this._wobbleOsc.setVolume(targetVolume, 0.1);
    this._wobbleLfo.setFrequency(lfoRate, 0.1);
  }

  /**
   * Stop wobble sound
   */
  stopWobbleSound() {
    if (this._wobbleOsc) {
      this._wobbleOsc.setVolume(0, 0.2);
    }
  }

  /**
   * Show floating text that rises and fades (for bonuses, etc.)
   */
  showFloatingText(text, x, y) {
    if (!this._floatingTexts) {
      this._floatingTexts = [];
    }

    this._floatingTexts.push({
      text,
      x,
      y,
      startY: y,
      life: 1.0, // seconds
      age: 0,
    });
  }

  /**
   * Update floating texts
   */
  updateFloatingTexts(dt) {
    if (!this._floatingTexts) return;

    for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
      const ft = this._floatingTexts[i];
      ft.age += dt;
      ft.y = ft.startY - ft.age * 60; // Rise up

      if (ft.age >= ft.life) {
        this._floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Render floating texts
   */
  renderFloatingTexts() {
    if (!this._floatingTexts || this._floatingTexts.length === 0) return;

    Painter.useCtx((ctx) => {
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const ft of this._floatingTexts) {
        const alpha = 1 - ft.age / ft.life;
        const scale = 1 + ft.age * 0.5; // Grow slightly

        ctx.save();
        ctx.translate(ft.x, ft.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // Outline
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, 0, 0);

        // Fill with yellow/gold color
        ctx.fillStyle = "#FFD700";
        ctx.fillText(ft.text, 0, 0);

        ctx.restore();
      }
    });
  }

  /**
   * Play eating visual effect - mouth opens wide and blob flashes white
   */
  playEatEffect() {
    // Initialize flash amount if needed
    if (this._flashAmount === undefined) {
      this._flashAmount = 0;
    }

    // Flash white effect using Tweenetik
    this._flashAmount = 1; // Start at full white
    Tweenetik.to(this, { _flashAmount: 0 }, 0.3, Easing.easeOutQuad);

    // Mouth chomping animation - open wide then close
    // Save current mouth path
    const originalPath = this.mouth.shape.path;

    // Open mouth wide (big O shape)
    this.mouth.shape.path = [
      ["M", -20, -8],
      ["Q", -25, 8, 0, 12],
      ["Q", 25, 8, 20, -8],
      ["Q", 10, -12, 0, -10],
      ["Q", -10, -12, -20, -8],
    ];
    this.mouth.shape.color = "rgba(50, 20, 20, 0.8)";

    // Close mouth after short delay
    setTimeout(() => {
      if (!this.isDead()) {
        this.mouth.shape.color = null;
        // Restore based on current mood
        this.updateMoodFromEnergy();
      }
    }, 150);
  }

  /**
   * Render particles around the blob when excited
   */
  renderExcitementParticles() {
    const { currentX, currentY } = this.blobPhysics;

    // Number of particles based on excitement
    const particleCount = Math.floor(
      this.blobPhysics.excitementLevel * 2 * this.speed
    );
    for (let i = 0; i < particleCount; i++) {
      // Random position around the blob
      const angle = Math.random() * Math.PI * 2;
      const dist =
        this.blobPhysics.currentRadius *
        ((1 * this.speed) / 20 + Math.random() * 0.5);
      const x = currentX + Math.cos(angle) * dist;
      const y = currentY + Math.sin(angle) * dist;
      // Size based on excitement
      const size = 2 + Math.random() * 5 * this.blobPhysics.excitementLevel;
      // Use the blob's current color
      const { currentColor } = this.blobPhysics;
      const alpha = 0.4 + Math.random() * 0.6;
      // Draw the particle
      Painter.shapes.fillCircle(
        x,
        y,
        size,
        `rgba(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]}, ${alpha})`
      );
    }
  }

  /**
   * Generate a smooth closed path through the control points using Bezier curves
   */
  generateBlobPath(points) {
    if (points.length < 3) return [];
    const path = [];
    const n = points.length;
    // Start at the first point
    path.push(["M", points[0].x, points[0].y]);
    // For each point, create a bezier curve to the next point
    for (let i = 0; i < n; i++) {
      const curr = points[i];
      const next = points[(i + 1) % n];
      const nextNext = points[(i + 2) % n];
      // Calculate control points for a smooth curve
      // Use the midpoint between current and next as the end point of the curve
      const midX = (next.x + curr.x) / 2;
      const midY = (next.y + curr.y) / 2;
      // Control point 1 - between current and next, biased toward current
      const cp1x = curr.x + (next.x - curr.x) * 0.5;
      const cp1y = curr.y + (next.y - curr.y) * 0.5;
      // Control point 2 - between next and next-next, biased toward next
      const cp2x = next.x + (midX - next.x) * 0.5;
      const cp2y = next.y + (midY - next.y) * 0.5;
      // Add the cubic Bezier curve command
      path.push(["C", cp1x, cp1y, cp2x, cp2y, midX, midY]);
    }
    // Close the path
    path.push(["Z"]);
    return path;
  }

  triggerAnimation(animType) {
    const anim = this.animations[animType + "Animation"];
    if (!anim) return;

    anim.active = true;
    anim.elapsed = 0;
    anim.startTime = this.time;
  }

}

/**
 * UI Scene for the blob demo
 */
class BlobUIScene extends Scene {
  constructor(game, blobScene, options = {}) {
    super(game, options);
    this.blobScene = blobScene;
    this._lastMobileState = null;
    this.createLayout();
  }

  /**
   * Create the UI layout based on current screen size
   */
  createLayout() {
    // Remove existing layout if any
    if (this.layout) {
      this.remove(this.layout);
      this.layout = null;
    }

    const config = this.game.getResponsiveConfig();

    // Always use horizontal layout at bottom left
    this.layout = new HorizontalLayout(this.game, {
      spacing: config.spacing,
      padding: 0,
      debug: this.game.debug,
      debugColor: "purple",
      anchor: config.anchor,
      width:200,
      height:30,
      anchorOffsetX: config.anchorOffsetX,
      anchorOffsetY: config.anchorOffsetY,
    });

    // Add buttons
    this.resetBtn = new Button(this.game, {
      text: "Reset",
      width: config.buttonWidth,
      height: config.buttonHeight,
      onClick: () => this.resetBlob(),
    });
    this.layout.add(this.resetBtn);

    this.colorBtn = new Button(this.game, {
      text: "🎨 Recolor",
      width: config.buttonWidth,
      height: config.buttonHeight,
      onClick: () => this.blobScene.triggerBlobGradientShift(),
    });
    this.layout.add(this.colorBtn);

    this.add(this.layout);
  }

  resetBlob() {
    const physics = this.blobScene.blobPhysics;

    // Reset physics - use CONFIG for starting size
    physics.baseRadius = CONFIG.startRadius;
    physics.currentRadius = CONFIG.startRadius;
    physics.healthyRadius = CONFIG.startRadius;
    physics.energy = 1.0;
    physics.baseColor = [64, 180, 255];
    physics.vx = 0;
    physics.vy = 0;

    // Reset visual state
    this.blobScene.blobVisualBaseColor = null;
    this.blobScene.blob.scaleX = 1;
    this.blobScene.blob.scaleY = 1;
    this.blobScene.fallSquish = 0;

    // Reset position
    physics.currentX = this.game.width / 2;
    physics.currentY = this.game.height / 2;
    this.blobScene.mouseX = this.game.width / 2;
    this.blobScene.mouseY = this.game.height / 2;
    this.blobScene.blob.x = physics.currentX;
    this.blobScene.blob.y = physics.currentY;

    // Reset facial features (will be scaled by positionBlobFeatures)
    this.blobScene.leftPupil.visible = true;
    this.blobScene.rightPupil.visible = true;

    // Reset mood to happy
    this.blobScene.setMood(1);

    // Go back to ready state (shows play button)
    this.blobScene.stateMachine.setState("ready");
  }

  onResize() {
    const isMobile = this.game.isMobile();

    // Only recreate layout if mobile state changed
    if (this._lastMobileState !== isMobile) {
      this._lastMobileState = isMobile;
      this.createLayout();
    }
  }

  update(dt) {
    super.update(dt);

    // Hide UI buttons in ready state
    const isReady = this.blobScene.isReady();
    if (this.layout) {
      this.layout.visible = !isReady;
    }

    // Update button text based on blob state
    if (this.colorBtn && !isReady) {
      const isDead = this.blobScene.isDead();
      const newText = isDead ? "▶ Play Again" : "🎨 Recolor";
      if (this.colorBtn.text !== newText) {
        this.colorBtn.text = newText;
      }
    }
  }
}

/**
 * Normalize an angle to be between -PI and PI
 */
function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

// Export the game
export { BezierBlobGame };
