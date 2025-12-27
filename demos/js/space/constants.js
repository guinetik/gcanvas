// ==========================================================================
// Space Invaders - Game Constants
// ==========================================================================

// Fixed canvas dimensions (must match HTML canvas attributes)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Player constants
export const PLAYER_SPEED = 300;
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 20;

// Bullet constants
export const BULLET_SPEED = 400;
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 12;

// Alien constants
export const ALIEN_BASE_ROWS = 4;
export const ALIEN_COLS = 11;
export const MAX_ALIEN_ROWS = 8;
export const ALIEN_WIDTH = 30;
export const ALIEN_HEIGHT = 20;
export const ALIEN_SPACING_X = 40;
export const ALIEN_SPACING_Y = 35;
export const ALIEN_MOVE_SPEED = 30;
export const ALIEN_DROP_DISTANCE = 20;
export const ALIEN_SHOOT_CHANCE = 0.002;
export const ALIEN_BULLET_SPEED = 200;

// Power-up constants
export const POWERUP_SPAWN_CHANCE = 0.0008; // Per frame chance for 1-Up
export const STARPOWER_SPAWN_CHANCE = 0.001; // Star power (more common for fun)
export const POWERUP_FALL_SPEED = 150;
export const POWERUP_SIZE = 24;
export const STARPOWER_DURATION = 8; // Seconds of invincibility
export const STARPOWER_SPEED_MULTIPLIER = 2.5; // Move 2.5x faster during star power

// Missile constants
export const MISSILE_SPAWN_CHANCE = 0.0008; // Per frame chance
export const MISSILE_DURATION = 4; // Seconds for bezier animation (slower)
export const MISSILE_WIDTH = 50; // Long torpedo shape
export const MISSILE_HEIGHT = 14;

// Laser beam constants (unlocked after first boss)
export const LASER_SPAWN_CHANCE = 0.0012; // Per frame chance (still rarer than missiles but more frequent)

// Lightning constants (unlocked after second boss)
export const LIGHTNING_SPAWN_CHANCE = 0.0018; // Per frame chance (more frequent - dramatic effect)

// Boss constants - BASE values, scaled by boss type (0=easy, 1=medium, 2=hard)
export const BOSS_LEVELS = [3, 6, 9]; // Boss appears at end of these levels
export const BOSS_BASE_HEALTH = 30; // Base health (scales: 30, 50, 75)
export const BOSS_SCALE = 4; // Boss is 4x the size of normal alien
export const BOSS_BASE_POINTS = 1000; // Base bonus (scales: 1000, 2000, 3000)
export const BOSS_BASE_MISSILE_INTERVAL = 2.5; // Base seconds between missiles (scales down)
export const BOSS_BASE_MINION_INTERVAL = 3; // Base seconds between minion spawns (scales down)
export const BOSS_BASE_MAX_MINIONS = 3; // Base max minions (scales: 3, 5, 7)
export const BOSS_BASE_MOVE_SPEED = 35; // Base horizontal speed (scales up)

// Boss minion constants (smaller versions of the boss alien type)
export const MINION_SCALE = 0.8; // Slightly smaller than normal aliens
export const MINION_FLOAT_RADIUS = 40; // How much they float around
export const MINION_FLOAT_SPEED = 0.8;
export const MINION_BASE_SHOOT_CHANCE = 0.006; // Base per frame chance (scales up)
export const MINION_BASE_HEALTH = 2; // Base health (scales: 2, 3, 4)

// Shield constants (unlocked after level 9 boss)
export const SHIELD_MAX_ENERGY = 100; // Full bar
export const SHIELD_DRAIN_RATE = 50; // Energy per second when active (2 sec to drain)
export const SHIELD_RECHARGE_RATE = 10; // Energy per second when inactive (10 sec to full)
export const SHIELD_RECHARGE_DELAY = 1.5; // Seconds before recharge starts after deactivation

// Level 10 Gauntlet constants
export const GAUNTLET_BOSS_SCALE = 5; // Gauntlet bosses are 5x (vs normal 4x)
export const GAUNTLET_BOSS_HEALTH_MULTIPLIER = 1.5; // 50% more health
export const GAUNTLET_BOSS_COLORS = [
  // Boss 0 (Octopus) - was green, now PURPLE
  { primary: "#aa00ff", secondary: "#8800cc", dark: "#660099" },
  // Boss 1 (Squid) - was pink, now ORANGE/FIRE
  { primary: "#ff6600", secondary: "#cc4400", dark: "#993300" },
  // Boss 2 (Crab) - was cyan, now GOLD
  { primary: "#ffdd00", secondary: "#ccaa00", dark: "#997700" },
];
