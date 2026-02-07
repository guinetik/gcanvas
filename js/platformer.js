import {
  Game,
  GameObject,
  Text,
  Rectangle,
  Circle,
  Keys,
  FPSCounter,
  PlatformerScene,
  Collision,
  Painter,
  Position,
  Group,
  Synth,
  Sprite,
  Camera2D,
} from "/gcanvas.es.min.js";

// ==================== Configuration ====================
const CONFIG = {
  // Theme - Terminal/Tron aesthetic
  theme: {
    background: "#000000",
    primary: "#00ff00",      // Terminal green
    secondary: "#0a0a0a",
    accent: "#00cc00",
    text: "#ffffff",
    textDim: "#666666",
    platform: "#1a1a1a",
    platformLine: "#00ff00",
    player: "#00ff00",
    enemy: "#ff3333",        // Red glitches
    orb: "#00ffff",          // Cyan data orbs
    goal: "#ffff00",         // Yellow end zone
  },

  // Physics - mathematically balanced for level design
  // Standing jump: ~57px high, ~97px far
  // Running jump: ~75px high, ~112px far
  gravity: 1400,
  jumpVelocity: -400,       // base jump
  jumpSpeedBonus: 0.35,     // extra jump power from horizontal speed
  maxSpeed: 170,            // max horizontal speed
  acceleration: 1000,       // how fast you speed up
  friction: 600,            // how fast you slow down on ground
  airFriction: 60,          // low friction in air - maintain momentum
  airControl: 1.0,          // full control in air
  jumpCooldown: 0.1,        // seconds between jumps
  pogoBoost: -500,          // bounce velocity when stomping enemies (~89px high)

  // Player
  playerScale: 1.0,

  // Camera
  cameraLerp: 0.08,
  cameraDeadzoneWidth: 120,
  cameraDeadzoneHeight: 60,

  // Sound
  soundEnabled: true,
  masterVolume: 0.3,
};

// ==================== Level Data ====================
// Level uses relative Y positions (0 = ground level, negative = above ground)
// These are converted to screen coordinates based on game height
// Note: All positions are CENTER-based. For platforms, we place the center,
// and for entities, we need to offset by half their height to stand ON platforms.
const LEVEL_DATA = {
  bounds: { minX: 0, maxX: 3000 },
  spawn: { x: 80, yOffset: 0 },

  // Platform design based on jump physics:
  // Standing jump: 57px high, 97px far | Running jump: 75px high, 112px far
  // Easy gap: <80px | Medium gap: 80-100px | Hard gap: 100-110px
  // Easy height: <45px | Medium height: 45-55px | Hard height: 55-70px
  platforms: [
    // === ZONE 1: Tutorial Area ===
    { type: 'ground', x: 200, yOffset: 0, width: 400, height: 32 },
    // Easy first jump (gap ~50px, same height)
    { type: 'floating', x: 480, yOffset: 0, width: 80, height: 16 },

    // === ZONE 2: First Challenge ===
    { type: 'ground', x: 650, yOffset: 0, width: 200, height: 32 },
    // Medium gap (~70px) with enemy
    { type: 'ground', x: 920, yOffset: 0, width: 200, height: 32 },

    // === ZONE 3: Vertical Climb ===
    // Stair stepping stones (gap ~60px, height +40px each)
    { type: 'floating', x: 1100, yOffset: -40, width: 80, height: 16 },
    { type: 'floating', x: 1220, yOffset: -40, width: 80, height: 16 },
    // Upper bonus path (harder - need running jump, +65px height)
    { type: 'floating', x: 1160, yOffset: -105, width: 70, height: 16 },

    // === ZONE 4: Platforming Gauntlet ===
    { type: 'ground', x: 1420, yOffset: 0, width: 180, height: 32 },
    // Chain jumps (gap ~70px each, slight height variation)
    { type: 'floating', x: 1600, yOffset: -30, width: 70, height: 16 },
    { type: 'floating', x: 1730, yOffset: -30, width: 70, height: 16 },

    // === ZONE 5: Enemy Gauntlet ===
    { type: 'ground', x: 1950, yOffset: 0, width: 300, height: 32 },

    // === ZONE 6: Final Stretch ===
    // Stepping stones (gap ~70px each)
    { type: 'floating', x: 2200, yOffset: -25, width: 80, height: 16 },
    { type: 'floating', x: 2330, yOffset: -25, width: 80, height: 16 },
    { type: 'floating', x: 2460, yOffset: -25, width: 80, height: 16 },

    // === ZONE 7: Victory Road ===
    { type: 'ground', x: 2680, yOffset: 0, width: 350, height: 32 },
  ],

  enemies: [
    // Zone 2 - first enemy encounter
    { x: 920, yOffset: 0, patrolStart: 840, patrolEnd: 1000 },
    // Zone 4 - ground patrol
    { x: 1420, yOffset: 0, patrolStart: 1350, patrolEnd: 1490 },
    // Zone 5 - enemy gauntlet (2 enemies!)
    { x: 1900, yOffset: 0, patrolStart: 1820, patrolEnd: 1980 },
    { x: 2020, yOffset: 0, patrolStart: 1940, patrolEnd: 2080 },
    // Zone 7 - final guard
    { x: 2680, yOffset: 0, patrolStart: 2530, patrolEnd: 2830 },
  ],

  orbs: [
    // Zone 1 - Easy pickups (above ground)
    { x: 100, yOffset: -40, value: 10 },
    { x: 200, yOffset: -40, value: 10 },
    { x: 300, yOffset: -40, value: 10 },
    { x: 480, yOffset: -35, value: 15 }, // On first platform

    // Zone 2
    { x: 650, yOffset: -40, value: 10 },
    { x: 780, yOffset: -50, value: 15 }, // In the gap (risky!)
    { x: 920, yOffset: -40, value: 10 },

    // Zone 3 - Stair rewards
    { x: 1100, yOffset: -75, value: 15 },
    { x: 1220, yOffset: -75, value: 15 },
    // Bonus path reward (on high platform)
    { x: 1160, yOffset: -140, value: 100 },

    // Zone 4 - Gauntlet rewards
    { x: 1420, yOffset: -40, value: 10 },
    { x: 1600, yOffset: -65, value: 20 },
    { x: 1730, yOffset: -65, value: 20 },

    // Zone 5 - Near enemies
    { x: 1850, yOffset: -40, value: 10 },
    { x: 1950, yOffset: -40, value: 10 },
    { x: 2050, yOffset: -40, value: 10 },

    // Zone 6 - Stepping stones
    { x: 2200, yOffset: -60, value: 15 },
    { x: 2330, yOffset: -60, value: 20 },
    { x: 2460, yOffset: -60, value: 25 },

    // Zone 7 - Victory orbs
    { x: 2600, yOffset: -40, value: 10 },
    { x: 2700, yOffset: -40, value: 10 },
    { x: 2800, yOffset: -40, value: 10 },
  ],

  endZone: { x: 2900, yOffset: -80, width: 80, height: 160 },
};

// ==================== Sound Effects ====================
class SFX {
  static initialized = false;

  static init() {
    if (this.initialized || !CONFIG.soundEnabled) return;
    Synth.init({ masterVolume: CONFIG.masterVolume });
    this.initialized = true;
  }

  static async resume() {
    if (!this.initialized) return;
    await Synth.resume();
  }

  static jump() {
    if (!this.initialized) return;
    Synth.osc.sweep(200, 500, 0.12, {
      type: "square",
      volume: 0.2,
    });
  }

  static collect() {
    if (!this.initialized) return;
    const now = Synth.now;
    Synth.osc.tone(880, 0.08, {
      type: "sine",
      volume: 0.15,
      attack: 0.01,
      release: 0.05,
      startTime: now,
    });
    Synth.osc.tone(1320, 0.1, {
      type: "sine",
      volume: 0.15,
      attack: 0.01,
      release: 0.08,
      startTime: now + 0.06,
    });
  }

  static stomp() {
    if (!this.initialized) return;
    Synth.osc.sweep(300, 100, 0.15, {
      type: "square",
      volume: 0.25,
    });
  }

  static death() {
    if (!this.initialized) return;
    const now = Synth.now;
    const notes = [400, 300, 200, 100];
    notes.forEach((freq, i) => {
      Synth.osc.tone(freq, 0.2, {
        type: "sawtooth",
        volume: 0.2,
        attack: 0.01,
        release: 0.15,
        startTime: now + i * 0.1,
      });
    });
  }

  static complete() {
    if (!this.initialized) return;
    const now = Synth.now;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      Synth.osc.tone(freq, 0.2, {
        type: "square",
        volume: 0.2,
        attack: 0.01,
        sustain: 0.7,
        release: 0.1,
        startTime: now + i * 0.12,
      });
    });
  }

  static start() {
    if (!this.initialized) return;
    Synth.osc.sweep(150, 500, 0.2, {
      type: "square",
      volume: 0.15,
    });
  }
}

// ==================== HackerShapeFactory ====================
class HackerShapeFactory {
  static createFrame(options = {}) {
    const color = options.color || CONFIG.theme.player;
    const scale = options.scale || 1;
    const pose = options.pose || 'stand';
    const px = 2 * scale;

    const group = new Group({});

    // Head (hood/helmet) - 8px wide
    const headPixels = [
      { x: 1, y: 0, w: 6, h: 1 },   // top of hood
      { x: 0, y: 1, w: 8, h: 1 },   // hood wider
      { x: 0, y: 2, w: 8, h: 1 },   // hood
      // Visor/face gap at y:3
      { x: 0, y: 3, w: 2, h: 1 },   // left hood
      { x: 6, y: 3, w: 2, h: 1 },   // right hood
      { x: 0, y: 4, w: 8, h: 1 },   // chin
    ];

    // Visor (eyes) - glowing accent
    const visorPixels = [
      { x: 2, y: 3, w: 4, h: 1, isVisor: true },
    ];

    // Body (coat/jacket)
    const bodyPixels = [
      { x: 1, y: 5, w: 6, h: 1 },   // shoulders
      { x: 0, y: 6, w: 8, h: 1 },   // torso
      { x: 0, y: 7, w: 8, h: 1 },   // torso
      { x: 0, y: 8, w: 8, h: 1 },   // waist
      { x: 0, y: 9, w: 8, h: 1 },   // coat bottom
    ];

    // Legs based on pose
    let legPixels = [];
    switch (pose) {
      case 'walk1':
        // Left leg forward, right back
        legPixels = [
          { x: 0, y: 10, w: 3, h: 1 },
          { x: 5, y: 10, w: 3, h: 1 },
          { x: -1, y: 11, w: 3, h: 1 },
          { x: 6, y: 11, w: 2, h: 1 },
          { x: -2, y: 12, w: 3, h: 1 },
          { x: 6, y: 12, w: 2, h: 1 },
        ];
        break;
      case 'walk2':
        // Right leg forward, left back
        legPixels = [
          { x: 0, y: 10, w: 3, h: 1 },
          { x: 5, y: 10, w: 3, h: 1 },
          { x: 0, y: 11, w: 2, h: 1 },
          { x: 6, y: 11, w: 3, h: 1 },
          { x: 0, y: 12, w: 2, h: 1 },
          { x: 7, y: 12, w: 3, h: 1 },
        ];
        break;
      case 'jump':
        // Legs tucked
        legPixels = [
          { x: 1, y: 10, w: 6, h: 1 },
          { x: 2, y: 11, w: 4, h: 1 },
          { x: 2, y: 12, w: 4, h: 1 },
        ];
        break;
      case 'stand':
      default:
        // Standing straight
        legPixels = [
          { x: 1, y: 10, w: 2, h: 1 },
          { x: 5, y: 10, w: 2, h: 1 },
          { x: 1, y: 11, w: 2, h: 1 },
          { x: 5, y: 11, w: 2, h: 1 },
          { x: 0, y: 12, w: 3, h: 1 },
          { x: 5, y: 12, w: 3, h: 1 },
        ];
        break;
    }

    // Centering offset
    const offsetX = 4 * px;
    const offsetY = 6 * px;

    // Draw all body parts
    const allPixels = [...headPixels, ...bodyPixels, ...legPixels];
    allPixels.forEach(p => {
      group.add(new Rectangle({
        x: p.x * px - offsetX + (p.w * px) / 2,
        y: p.y * px - offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: color,
        origin: "center",
      }));
    });

    // Draw visor (accent color)
    visorPixels.forEach(p => {
      group.add(new Rectangle({
        x: p.x * px - offsetX + (p.w * px) / 2,
        y: p.y * px - offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: CONFIG.theme.orb, // Cyan visor
        origin: "center",
      }));
    });

    return group;
  }

  static createWalkFrames(options = {}) {
    return [
      this.createFrame({ ...options, pose: 'walk1' }),
      this.createFrame({ ...options, pose: 'stand' }),
      this.createFrame({ ...options, pose: 'walk2' }),
      this.createFrame({ ...options, pose: 'stand' }),
    ];
  }

  static createIdleFrame(options = {}) {
    return this.createFrame({ ...options, pose: 'stand' });
  }

  static createJumpFrame(options = {}) {
    return this.createFrame({ ...options, pose: 'jump' });
  }

  static createDeathFrame(options = {}) {
    const color = options.color || CONFIG.theme.player;
    const scale = options.scale || 1;
    const px = 2 * scale;

    const group = new Group({});

    // Fallen/collapsed pose - lying on side
    const pixels = [
      // Head tilted
      { x: 0, y: 2, w: 1, h: 6 },
      { x: 1, y: 1, w: 1, h: 8 },
      { x: 2, y: 1, w: 1, h: 8 },
      { x: 3, y: 2, w: 1, h: 6 },
      // Body sprawled
      { x: 4, y: 3, w: 1, h: 4 },
      { x: 5, y: 3, w: 1, h: 4 },
      { x: 6, y: 3, w: 1, h: 4 },
      { x: 7, y: 4, w: 1, h: 2 },
      // Legs
      { x: 8, y: 4, w: 2, h: 2 },
      { x: 10, y: 5, w: 2, h: 1 },
    ];

    // Visor (dim, dying)
    const visorPixels = [
      { x: 1, y: 4, w: 2, h: 1 },
    ];

    const offsetX = 6 * px;
    const offsetY = 3 * px;

    pixels.forEach(p => {
      group.add(new Rectangle({
        x: p.x * px - offsetX + (p.w * px) / 2,
        y: p.y * px - offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: color,
        origin: "center",
      }));
    });

    // Dim visor
    visorPixels.forEach(p => {
      group.add(new Rectangle({
        x: p.x * px - offsetX + (p.w * px) / 2,
        y: p.y * px - offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: CONFIG.theme.enemy, // Red when dying
        origin: "center",
      }));
    });

    return group;
  }
}

// ==================== Player ====================
class Player extends Sprite {
  constructor(game, options = {}) {
    super(game, {
      ...options,
      frameRate: 10,
      loop: true,
    });

    // Actual pixel art dimensions: 8 cols x 13 rows at 2px each = 16x26
    this.width = 16;
    this.height = 26;
    this.vx = 0;
    this.vy = 0;
    this._grounded = false;
    this.facingRight = true;
    this._isMoving = false;
    this.isDead = false;
    this.jumpCooldownTimer = 0;

    this.buildAnimations();
    this.stopAnimation('idle');
  }

  canJump() {
    return this._grounded && this.jumpCooldownTimer <= 0 && !this.isDead;
  }

  jump() {
    if (!this.canJump()) return false;
    // Base jump + bonus from horizontal speed (running jumps go higher!)
    const speedBonus = Math.abs(this.vx) * CONFIG.jumpSpeedBonus;
    this.vy = CONFIG.jumpVelocity - speedBonus;
    this._grounded = false;
    this.jumpCooldownTimer = CONFIG.jumpCooldown;
    return true;
  }

  // Pogo bounce when stomping enemies
  pogo() {
    this.vy = CONFIG.pogoBoost;
    this._grounded = false;
  }

  buildAnimations() {
    this._animations.clear();

    const frameOptions = {
      color: CONFIG.theme.player,
      scale: CONFIG.playerScale,
    };

    this.addAnimation('walk', HackerShapeFactory.createWalkFrames(frameOptions), {
      frameRate: 10,
    });
    this.addAnimation('idle', [HackerShapeFactory.createIdleFrame(frameOptions)], {
      loop: false,
    });
    this.addAnimation('jump', [HackerShapeFactory.createJumpFrame(frameOptions)], {
      loop: false,
    });
    this.addAnimation('death', [HackerShapeFactory.createDeathFrame(frameOptions)], {
      loop: false,
    });
  }

  die() {
    if (this.isDead) return;
    this.isDead = true;
    this.vx = 0;
    this.vy = 0;
    this.playAnimation('death');
  }

  update(dt) {
    super.update(dt);

    // Tick jump cooldown
    if (this.jumpCooldownTimer > 0) {
      this.jumpCooldownTimer -= dt;
    }

    // Don't update animation state machine if dead
    if (this.isDead) return;

    // Flip sprite based on direction
    this.scaleX = this.facingRight ? 1 : -1;

    // Animation state machine
    if (!this._grounded) {
      if (this.currentAnimationName !== 'jump') {
        this.playAnimation('jump');
      }
    } else if (this._isMoving) {
      if (this.currentAnimationName !== 'walk') {
        this.playAnimation('walk');
      }
    } else {
      if (this.currentAnimationName !== 'idle') {
        this.stopAnimation('idle');
      }
    }
  }

  getBounds() {
    const shrink = 2;
    return {
      x: this.x - this.width / 2 + shrink,
      y: this.y - this.height / 2 + shrink,
      width: this.width - shrink * 2,
      height: this.height - shrink * 2,
    };
  }
}

// ==================== Platform ====================
class Platform extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.width = options.width || 100;
    this.height = options.height || 16;
    this.type = options.type || 'floating';
  }

  draw() {
    super.draw();

    Painter.useCtx((ctx) => {
      const w = this.width;
      const h = this.height;

      // Main platform body
      ctx.fillStyle = CONFIG.theme.platform;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // Top glow line
      ctx.fillStyle = CONFIG.theme.platformLine;
      ctx.fillRect(-w / 2, -h / 2, w, 2);

      // Grid lines for Tron effect
      ctx.strokeStyle = CONFIG.theme.platformLine;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1;

      // Vertical grid
      const gridSpacing = 20;
      for (let x = -w / 2 + gridSpacing; x < w / 2; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, -h / 2 + 2);
        ctx.lineTo(x, h / 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    });
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }
}

// ==================== GlitchShapeFactory ====================
class GlitchShapeFactory {
  static createFrame(options = {}) {
    const color = options.color || CONFIG.theme.enemy;
    const scale = options.scale || 1;
    const pose = options.pose || 'walk1';
    const px = 2 * scale;

    const group = new Group({});

    // Glitchy corrupted creature body
    const bodyPixels = [
      // Head (glitchy/corrupted)
      { x: 2, y: 0, w: 4, h: 1 },
      { x: 1, y: 1, w: 6, h: 1 },
      { x: 0, y: 2, w: 8, h: 1 },
      { x: 0, y: 3, w: 8, h: 1 },
      // Body
      { x: 1, y: 4, w: 6, h: 1 },
      { x: 1, y: 5, w: 6, h: 1 },
      { x: 2, y: 6, w: 4, h: 1 },
    ];

    // Evil eyes
    const eyePixels = [
      { x: 2, y: 2, w: 1, h: 1, isEye: true },
      { x: 5, y: 2, w: 1, h: 1, isEye: true },
    ];

    // Legs based on pose
    let legPixels = [];
    if (pose === 'walk1') {
      legPixels = [
        { x: 1, y: 7, w: 2, h: 1 },
        { x: 5, y: 7, w: 2, h: 1 },
        { x: 0, y: 8, w: 2, h: 1 },
        { x: 6, y: 8, w: 2, h: 1 },
      ];
    } else {
      legPixels = [
        { x: 2, y: 7, w: 2, h: 1 },
        { x: 4, y: 7, w: 2, h: 1 },
        { x: 2, y: 8, w: 2, h: 1 },
        { x: 4, y: 8, w: 2, h: 1 },
      ];
    }

    const offsetX = 4 * px;
    const offsetY = 4 * px;

    [...bodyPixels, ...legPixels].forEach(p => {
      group.add(new Rectangle({
        x: p.x * px - offsetX + (p.w * px) / 2,
        y: p.y * px - offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: color,
        origin: "center",
      }));
    });

    // Eyes (white/glowing)
    eyePixels.forEach(p => {
      group.add(new Rectangle({
        x: p.x * px - offsetX + (p.w * px) / 2,
        y: p.y * px - offsetY + (p.h * px) / 2,
        width: p.w * px,
        height: p.h * px,
        color: "#ffffff",
        origin: "center",
      }));
    });

    return group;
  }

  static createWalkFrames(options = {}) {
    return [
      this.createFrame({ ...options, pose: 'walk1' }),
      this.createFrame({ ...options, pose: 'walk2' }),
    ];
  }
}

// ==================== GlitchEnemy ====================
class GlitchEnemy extends Sprite {
  constructor(game, options = {}) {
    super(game, {
      ...options,
      frameRate: 6,
      loop: true,
    });

    // Actual pixel art dimensions: 8 cols x 9 rows at 2px each = 16x18
    this.width = 16;
    this.height = 18;
    this.patrolStart = options.patrolStart || this.x - 50;
    this.patrolEnd = options.patrolEnd || this.x + 50;
    this.patrolSpeed = options.patrolSpeed || 60;
    this.direction = 1;
    this.isDead = false;

    this.buildAnimations();
    this.playAnimation('walk');
  }

  buildAnimations() {
    this._animations.clear();

    const frameOptions = {
      color: CONFIG.theme.enemy,
      scale: 1,
    };

    this.addAnimation('walk', GlitchShapeFactory.createWalkFrames(frameOptions), {
      frameRate: 6,
    });
  }

  update(dt) {
    if (this.isDead) return;

    super.update(dt);

    // Patrol movement
    this.x += this.direction * this.patrolSpeed * dt;

    // Reverse at patrol bounds
    if (this.x >= this.patrolEnd) {
      this.x = this.patrolEnd;
      this.direction = -1;
      this.scaleX = -1;
    } else if (this.x <= this.patrolStart) {
      this.x = this.patrolStart;
      this.direction = 1;
      this.scaleX = 1;
    }
  }

  die() {
    this.isDead = true;
    this.visible = false;
  }

  getBounds() {
    const shrink = 2;
    return {
      x: this.x - this.width / 2 + shrink,
      y: this.y - this.height / 2 + shrink,
      width: this.width - shrink * 2,
      height: this.height - shrink * 2,
    };
  }
}

// ==================== DataOrb ====================
class DataOrb extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.radius = 10;
    this.value = options.value || 10;
    this.collected = false;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(dt) {
    super.update(dt);
    this.pulsePhase += dt * 4;
  }

  draw() {
    if (this.collected) return;
    super.draw();

    const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;
    const r = this.radius * pulse;

    Painter.useCtx((ctx) => {
      // Glow effect
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
      gradient.addColorStop(0, CONFIG.theme.orb);
      gradient.addColorStop(0.5, CONFIG.theme.orb + "44");
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = CONFIG.theme.orb;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(-r * 0.2, -r * 0.2, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  collect() {
    if (this.collected) return false;
    this.collected = true;
    this.visible = false;
    return true;
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }
}

// ==================== EndZone ====================
class EndZone extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.width = options.width || 80;
    this.height = options.height || 160;
    this.animPhase = 0;
  }

  update(dt) {
    super.update(dt);
    this.animPhase += dt * 2;
  }

  draw() {
    super.draw();

    const w = this.width;
    const h = this.height;

    Painter.useCtx((ctx) => {
      // Portal glow
      const gradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gradient.addColorStop(0, CONFIG.theme.goal + "00");
      gradient.addColorStop(0.3, CONFIG.theme.goal + "44");
      gradient.addColorStop(0.5, CONFIG.theme.goal + "88");
      gradient.addColorStop(0.7, CONFIG.theme.goal + "44");
      gradient.addColorStop(1, CONFIG.theme.goal + "00");

      ctx.fillStyle = gradient;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      // Animated scan lines
      ctx.strokeStyle = CONFIG.theme.goal;
      ctx.lineWidth = 2;
      const numLines = 8;
      for (let i = 0; i < numLines; i++) {
        const lineY = ((i / numLines + this.animPhase * 0.1) % 1) * h - h / 2;
        ctx.globalAlpha = 0.3 + Math.sin(i + this.animPhase) * 0.2;
        ctx.beginPath();
        ctx.moveTo(-w / 2, lineY);
        ctx.lineTo(w / 2, lineY);
        ctx.stroke();
      }

      // Border
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = CONFIG.theme.goal;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2, -h / 2, w, h);

      // Arrow pointing up
      ctx.globalAlpha = 0.6 + Math.sin(this.animPhase * 3) * 0.4;
      ctx.fillStyle = CONFIG.theme.goal;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(15, 0);
      ctx.lineTo(5, 0);
      ctx.lineTo(5, 20);
      ctx.lineTo(-5, 20);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 1;
    });
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  isPlayerInside(playerBounds) {
    const zoneBounds = this.getBounds();
    const centerX = playerBounds.x + playerBounds.width / 2;
    return centerX > zoneBounds.x && centerX < zoneBounds.x + zoneBounds.width;
  }
}

// ==================== SkyLayer ====================
class SkyLayer extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    this.gridWidth = 4000;
    this.scrollOffset = 0;

    // Generate grid lines
    this.verticalLines = [];
    this.horizontalLines = [];

    const spacing = 60;
    for (let x = 0; x < this.gridWidth; x += spacing) {
      this.verticalLines.push({
        x,
        height: 150 + Math.random() * 100,
        opacity: 0.1 + Math.random() * 0.2,
      });
    }

    for (let y = 0; y < 300; y += spacing / 2) {
      this.horizontalLines.push({
        y: -250 + y,
        opacity: 0.05 + Math.random() * 0.1,
      });
    }
  }

  setScrollOffset(offset) {
    this.scrollOffset = offset % this.gridWidth;
  }

  draw() {
    super.draw();

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.theme.primary;
      ctx.lineWidth = 1;

      // Draw horizontal lines
      this.horizontalLines.forEach(line => {
        ctx.globalAlpha = line.opacity;
        ctx.beginPath();
        ctx.moveTo(-this.gridWidth, line.y);
        ctx.lineTo(this.gridWidth, line.y);
        ctx.stroke();
      });

      // Draw vertical lines
      this.verticalLines.forEach(line => {
        let x = line.x - this.scrollOffset;
        while (x < -this.gridWidth / 2) x += this.gridWidth;
        while (x > this.gridWidth / 2) x -= this.gridWidth;

        ctx.globalAlpha = line.opacity;
        ctx.beginPath();
        ctx.moveTo(x, -300);
        ctx.lineTo(x, -300 + line.height);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
    });
  }
}

// ==================== Level ====================
class Level extends PlatformerScene {
  constructor(game, options = {}) {
    super(game, {
      ...options,
      player: options.player,
      gravity: CONFIG.gravity,
      jumpVelocity: CONFIG.jumpVelocity,
      moveSpeed: CONFIG.moveSpeed,
      autoInput: false, // We'll handle input manually to respect game state
      autoGravity: false, // We'll handle gravity manually to respect game state
      groundY: null, // No default ground - use platforms
    });

    this.platforms = [];
    this.enemies = [];
    this.orbs = [];
    this.endZone = null;
    this.score = 0;
    this.totalOrbs = 0;
    this.collectedOrbs = 0;
  }

  buildLevel(levelData, groundY) {
    this.groundY = groundY;

    // Create platforms
    // yOffset: 0 means platform TOP is at groundY
    // Platform center = groundY + yOffset + height/2
    levelData.platforms.forEach(p => {
      const platform = new Platform(this.game, {
        x: p.x,
        y: groundY + p.yOffset + p.height / 2,
        width: p.width,
        height: p.height,
        type: p.type,
      });
      this.platforms.push(platform);
      this.add(platform);
    });

    // Create enemies
    // Enemy sprite feet are 10 pixels below center (based on pixel art)
    const enemyFeetOffset = 10;
    levelData.enemies.forEach(e => {
      const enemy = new GlitchEnemy(this.game, {
        x: e.x,
        y: groundY + e.yOffset - enemyFeetOffset,
        patrolStart: e.patrolStart,
        patrolEnd: e.patrolEnd,
      });
      this.enemies.push(enemy);
      this.add(enemy);
    });

    // Create orbs - these float, so yOffset is from ground level
    levelData.orbs.forEach(o => {
      const orb = new DataOrb(this.game, {
        x: o.x,
        y: groundY + o.yOffset,
        value: o.value,
      });
      this.orbs.push(orb);
      this.add(orb);
    });
    this.totalOrbs = this.orbs.length;

    // Create end zone - center-based
    const ez = levelData.endZone;
    this.endZone = new EndZone(this.game, {
      x: ez.x,
      y: groundY + ez.yOffset,
      width: ez.width,
      height: ez.height,
    });
    this.add(this.endZone);
  }

  // Override applyInput to handle horizontal movement with acceleration
  applyInput(player, dt) {
    const accel = CONFIG.acceleration;
    const maxSpeed = CONFIG.maxSpeed;
    const grounded = player._grounded;
    // Use different friction for ground vs air
    const friction = grounded ? CONFIG.friction : CONFIG.airFriction;
    const controlMult = grounded ? 1.0 : CONFIG.airControl;

    let inputDir = 0;
    // Keyboard input
    if (Keys.isDown(Keys.LEFT) || Keys.isDown(Keys.A)) {
      inputDir = -1;
    }
    if (Keys.isDown(Keys.RIGHT) || Keys.isDown(Keys.D)) {
      inputDir = 1;
    }
    // Touch input (from game instance)
    if (this.game.touchLeft) {
      inputDir = -1;
    }
    if (this.game.touchRight) {
      inputDir = 1;
    }

    if (inputDir !== 0) {
      // Accelerate in input direction
      player.vx += inputDir * accel * controlMult * dt;
      // Clamp to max speed
      if (player.vx > maxSpeed) player.vx = maxSpeed;
      if (player.vx < -maxSpeed) player.vx = -maxSpeed;
    } else {
      // Apply friction when no input (much less in air)
      if (player.vx > 0) {
        player.vx -= friction * dt;
        if (player.vx < 0) player.vx = 0;
      } else if (player.vx < 0) {
        player.vx += friction * dt;
        if (player.vx > 0) player.vx = 0;
      }
    }
    // Jump is handled by player.jump() via handleAction - NOT here
  }

  isPlayerGrounded() {
    if (!this.player) return false;

    const pb = this.player.getBounds();
    const feetY = pb.y + pb.height;
    const tolerance = 12; // Increased tolerance for better landing detection

    for (const platform of this.platforms) {
      const platB = platform.getBounds();

      // Check if player feet are at or slightly below platform top level
      if (feetY >= platB.y - tolerance && feetY <= platB.y + tolerance) {
        // Check horizontal overlap
        if (pb.x + pb.width > platB.x && pb.x < platB.x + platB.width) {
          return true;
        }
      }
    }
    return false;
  }

  handleGroundCollision(player) {
    let grounded = false;
    const pb = player.getBounds();

    for (const platform of this.platforms) {
      const platB = platform.getBounds();

      if (Collision.rectRect(pb, platB)) {
        const mtv = Collision.getMTV(pb, platB);

        if (mtv) {
          // Determine collision direction based on overlap
          const overlapX = Math.abs(mtv.x);
          const overlapY = Math.abs(mtv.y);

          if (overlapY <= overlapX || player.vy > 0) {
            // Vertical collision takes priority when falling
            if (mtv.y < 0 && player.vy >= 0) {
              // Landing from above
              player.y += mtv.y;
              player.vy = 0;
              grounded = true;
            } else if (mtv.y > 0 && player.vy < 0) {
              // Hit ceiling from below
              player.y += mtv.y;
              player.vy = 0;
            }
          } else {
            // Horizontal collision
            player.x += mtv.x;
            player.vx = 0;
          }
        }
      }
    }

    // Also check if standing on platform surface (for walking off edges)
    if (!grounded && player.vy >= 0) {
      const feetY = player.y + player.height / 2;
      for (const platform of this.platforms) {
        const platB = platform.getBounds();
        // Check if feet are just above or at platform and horizontally aligned
        if (feetY >= platB.y - 4 && feetY <= platB.y + 8) {
          if (pb.x + pb.width > platB.x && pb.x < platB.x + platB.width) {
            // Snap feet to platform surface
            player.y = platB.y - player.height / 2;
            player.vy = 0;
            grounded = true;
            break;
          }
        }
      }
    }

    player._grounded = grounded;
  }

  checkEnemyCollisions() {
    if (!this.player || this.game.gameState !== 'playing') return;

    const pb = this.player.getBounds();

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const eb = enemy.getBounds();

      if (Collision.rectRect(pb, eb)) {
        const playerBottom = pb.y + pb.height;
        const enemyTop = eb.y;

        // Check if stomping (player falling and above enemy)
        if (this.player.vy > 0 && playerBottom < enemyTop + 20) {
          // Stomp! Pogo bounce off enemy
          enemy.die();
          this.player.pogo(); // Big bounce!
          this.score += 100;
          SFX.stomp();
          this.game.shakeCamera(5, 0.15);
        } else {
          // Death
          this.game.handleDeath();
        }
        return;
      }
    }
  }

  checkOrbCollisions() {
    if (!this.player || this.game.gameState !== 'playing') return;

    const pb = this.player.getBounds();

    for (const orb of this.orbs) {
      if (orb.collected) continue;

      const ob = orb.getBounds();

      if (Collision.rectRect(pb, ob)) {
        if (orb.collect()) {
          this.score += orb.value;
          this.collectedOrbs++;
          SFX.collect();
        }
      }
    }
  }

  checkEndZone() {
    if (!this.player || !this.endZone || this.game.gameState !== 'playing') return;

    if (this.endZone.isPlayerInside(this.player.getBounds())) {
      this.game.handleComplete();
    }
  }

  checkFallDeath() {
    if (!this.player || this.game.gameState !== 'playing') return;

    if (this.player.y > this.game.height + 100) {
      this.game.handleDeath();
    }
  }

  update(dt) {
    // Only apply physics when playing
    if (this.game.gameState === 'playing' && this.player) {
      // Apply gravity
      this.applyGravity(this.player, dt);

      // Apply input
      this.applyInput(this.player, dt);

      // Apply velocity
      this.applyVelocity(this.player, dt);

      // Handle platform collisions
      this.handleGroundCollision(this.player);

      // Update player movement state for animation
      this.player._isMoving = Math.abs(this.player.vx) > 10;
      if (this.player.vx > 0) this.player.facingRight = true;
      else if (this.player.vx < 0) this.player.facingRight = false;
    }

    // Update camera
    this.updateCamera(dt);

    // Update all children (orbs, enemies, etc.)
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (child.active !== false && child.update) {
        child.update(dt);
      }
    }

    // Re-resolve ground collision after all updates
    // This ensures player can't fall through platforms even if something moved them
    if (this.game.gameState === 'playing' && this.player) {
      this.handleGroundCollision(this.player);
    }

    // Collision checks (only when playing)
    if (this.game.gameState === 'playing') {
      this.checkEnemyCollisions();
      this.checkOrbCollisions();
      this.checkEndZone();
      this.checkFallDeath();
    }
  }
}

// ==================== PlatformerGame ====================
class PlatformerGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = CONFIG.theme.background;
    this.enableFluidSize();
  }

  init() {
    super.init();
    SFX.init();
    this.setupGame();
    this.setupInput();
  }

  setupGame() {
    this.score = 0;
    this.gameState = 'start'; // 'start', 'playing', 'dead', 'complete'

    // Calculate ground Y - vertically centered, slightly below center
    this.groundY = this.height * 0.7;

    // Create player - spawn position relative to ground
    // Player sprite feet are 13 pixels below center (based on pixel art)
    const playerFeetOffset = 13;
    this.player = new Player(this, {
      x: LEVEL_DATA.spawn.x,
      y: this.groundY + LEVEL_DATA.spawn.yOffset - playerFeetOffset,
    });

    // Create camera with bounds relative to ground
    this.camera = new Camera2D({
      target: this.player,
      viewportWidth: this.width,
      viewportHeight: this.height,
      lerp: CONFIG.cameraLerp,
      deadzone: {
        width: CONFIG.cameraDeadzoneWidth,
        height: CONFIG.cameraDeadzoneHeight,
      },
      bounds: {
        minX: LEVEL_DATA.bounds.minX,
        maxX: LEVEL_DATA.bounds.maxX,
        minY: 0,
        maxY: this.height,
      },
    });

    // Create level
    this.level = new Level(this, {
      player: this.player,
      camera: this.camera,
      viewportWidth: this.width,
      viewportHeight: this.height,
      x: 0,
      y: 0,
    });

    // Add sky layer (slow parallax) - centered vertically
    this.sky = new SkyLayer(this, {
      x: this.width / 2,
      y: this.height / 2,
    });
    this.level.addLayer(this.sky, { speed: 0.2 });

    // Build level content with groundY
    this.level.buildLevel(LEVEL_DATA, this.groundY);

    // Add player to level (moves with camera)
    this.level.add(this.player);

    this.pipeline.add(this.level);

    // Create UI
    this.createUI();

    // FPS counter
    this.pipeline.add(
      new FPSCounter(this, {
        color: CONFIG.theme.textDim,
        anchor: Position.BOTTOM_RIGHT,
      })
    );
  }

  createUI() {
    // Score display
    this.scoreText = new Text(this, "SCORE: 0", {
      font: "bold 20px 'Courier New', monospace",
      color: CONFIG.theme.primary,
      anchor: Position.TOP_LEFT,
      anchorOffsetX: 20,
      anchorOffsetY: 20,
    });
    this.pipeline.add(this.scoreText);

    // Orb counter
    this.orbText = new Text(this, "DATA: 0/0", {
      font: "16px 'Courier New', monospace",
      color: CONFIG.theme.orb,
      anchor: Position.TOP_LEFT,
      anchorOffsetX: 20,
      anchorOffsetY: 50,
    });
    this.pipeline.add(this.orbText);

    // Start message
    this.startText = new Text(this, "[ PRESS SPACE TO START ]", {
      font: "18px 'Courier New', monospace",
      color: CONFIG.theme.primary,
      anchor: Position.CENTER,
    });
    this.pipeline.add(this.startText);

    this.subtitleText = new Text(this, "collect data orbs and reach the portal", {
      font: "14px 'Courier New', monospace",
      color: CONFIG.theme.textDim,
      anchor: Position.CENTER,
      anchorOffsetY: 30,
    });
    this.pipeline.add(this.subtitleText);

    // Game over text
    this.gameOverText = new Text(this, "SYSTEM CRASH", {
      font: "bold 36px 'Courier New', monospace",
      color: CONFIG.theme.enemy,
      anchor: Position.CENTER,
      anchorOffsetY: -30,
      visible: false,
    });
    this.pipeline.add(this.gameOverText);

    this.restartText = new Text(this, "[ PRESS SPACE TO RESTART ]", {
      font: "16px 'Courier New', monospace",
      color: CONFIG.theme.textDim,
      anchor: Position.CENTER,
      anchorOffsetY: 60,
      visible: false,
    });
    this.pipeline.add(this.restartText);

    // Complete text
    this.completeText = new Text(this, "UPLOAD COMPLETE", {
      font: "bold 36px 'Courier New', monospace",
      color: CONFIG.theme.goal,
      anchor: Position.CENTER,
      anchorOffsetY: -20,
      visible: false,
    });
    this.pipeline.add(this.completeText);

    this.finalScoreText = new Text(this, "", {
      font: "20px 'Courier New', monospace",
      color: CONFIG.theme.text,
      anchor: Position.CENTER,
      anchorOffsetY: 20,
      visible: false,
    });
    this.pipeline.add(this.finalScoreText);
  }

  setupInput() {
    this.events.on(Keys.SPACE, () => this.handleAction());
    this.events.on(Keys.UP, () => this.handleAction());
    this.events.on(Keys.W, () => this.handleAction());

    // Mobile touch support
    this.touchLeft = false;
    this.touchRight = false;

    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handleTouchStart(e);
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.handleTouchMove(e);
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e) => {
      this.touchLeft = false;
      this.touchRight = false;
    });

    // Click to start/restart/jump
    this.canvas.addEventListener("click", () => this.handleAction());
  }

  handleTouchStart(e) {
    // Tap to jump
    this.handleAction();
    
    // Also track position for movement
    this.handleTouchMove(e);
  }

  handleTouchMove(e) {
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const screenThird = this.width / 3;
    
    // Left third = move left, Right third = move right, Middle = no movement
    this.touchLeft = touchX < screenThird;
    this.touchRight = touchX > screenThird * 2;
  }

  async handleAction() {
    await SFX.resume();

    if (this.gameState === 'start') {
      this.startGame();
    } else if (this.gameState === 'dead' || this.gameState === 'complete') {
      this.restartGame();
    } else if (this.gameState === 'playing') {
      // Use player's jump method with cooldown
      if (this.player && this.player.jump()) {
        SFX.jump();
      }
    }
  }

  startGame() {
    this.gameState = 'playing';
    this.startText.visible = false;
    this.subtitleText.visible = false;
    SFX.start();
  }

  handleDeath() {
    if (this.gameState !== 'playing') return;

    this.gameState = 'dead';

    // Trigger player death animation
    if (this.player) {
      this.player.die();
    }

    SFX.death();
    this.shakeCamera(10, 0.3);

    // Show game over UI after a short delay for death animation
    setTimeout(() => {
      // Only show if still in dead state (user might have restarted)
      if (this.gameState === 'dead') {
        this.gameOverText.visible = true;
        this.restartText.visible = true;
      }
    }, 500);
  }

  handleComplete() {
    if (this.gameState !== 'playing') return;

    this.gameState = 'complete';
    this.completeText.visible = true;
    this.finalScoreText.visible = true;
    this.finalScoreText.text = `FINAL SCORE: ${this.level.score}`;
    this.restartText.visible = true;
    SFX.complete();
  }

  restartGame() {
    this.pipeline.clear();
    this.setupGame();

    // Auto-start
    this.gameState = 'playing';
    this.startText.visible = false;
    this.subtitleText.visible = false;
  }

  shakeCamera(intensity, duration) {
    if (this.level && this.level.camera) {
      this.level.shakeCamera(intensity, duration);
    }
  }

  update(dt) {
    // Blinking start text
    if (this.gameState === 'start' && this.startText) {
      const blink = Math.sin(Date.now() / 500) > 0;
      this.startText.opacity = blink ? 1 : 0.5;
    }

    // Update UI
    if (this.level) {
      this.scoreText.text = `SCORE: ${this.level.score}`;
      this.orbText.text = `DATA: ${this.level.collectedOrbs}/${this.level.totalOrbs}`;

      // Update sky parallax
      if (this.sky && this.camera) {
        const offset = this.camera.getOffset();
        this.sky.setScrollOffset(offset.x);
      }
    }

    // Pause updates when not playing
    if (this.gameState !== 'playing') {
      // Still update camera and rendering but not game logic
      if (this.camera) {
        this.camera.update(dt);
      }
    }

    super.update(dt);
  }

  onResize() {
    if (this.camera) {
      this.camera.viewportWidth = this.width;
      this.camera.viewportHeight = this.height;
      this.camera.bounds.maxY = this.height;
    }
    if (this.level) {
      this.level.setViewport(this.width, this.height);
    }
    if (this.sky) {
      this.sky.x = this.width / 2;
      this.sky.y = this.height / 2;
    }
  }
}

// ==================== Initialize ====================
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const game = new PlatformerGame(canvas);
  game.start();
});
