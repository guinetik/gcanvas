/**
 * 3D Tetris Configuration
 * All game constants and settings
 */

export const CONFIG = {
    // Grid dimensions
    grid: {
        width: 6,   // X axis
        depth: 6,   // Z axis
        height: 16, // Y axis (pieces fall down Y)
    },

    // Timing (in seconds)
    timing: {
        fallSpeed: 1.0,          // Seconds per row at level 1
        lockDelay: 0.5,          // Seconds before piece locks after landing
        softDropMultiplier: 15,  // Speed multiplier when holding down
        moveRepeatDelay: 0.15,   // Delay before key repeat starts
        moveRepeatRate: 0.05,    // Rate of key repeat
    },

    // Camera settings
    camera: {
        perspective: 800,
        rotationX: 0.4,
        rotationY: -0.5,
        inertia: true,
        friction: 0.95,
        // Preset camera views for cycling
        presets: [
            { name: "Default", rotationX: 0.4, rotationY: -0.5 },
            { name: "Front", rotationX: 0.3, rotationY: 0 },
            { name: "Side", rotationX: 0.3, rotationY: -Math.PI / 2 },
            { name: "Top", rotationX: 1.2, rotationY: 0 },
            { name: "Isometric", rotationX: 0.6, rotationY: -0.78 },
        ],
    },

    // Visual settings (cubeSize is calculated dynamically based on screen)
    visual: {
        // These are fractions of min(width, height) for responsive scaling
        cubeSizeFraction: 0.055,   // Cube size as fraction of screen (bigger = fills more screen)
        cubeGapFraction: 0.003,    // Gap between cubes
        wellColor: "#00FF41",      // Terminal green
        wellLineWidth: 2,
        ghostAlpha: 0.25,
        backgroundColor: "#000000",

        // Sticker mode for cubes
        stickerMode: true,
        stickerMargin: 0.1,
        stickerBackgroundColor: "#0A0A0A",
    },

    // Piece colors (classic Tetris colors)
    pieceColors: {
        I: "#00FFFF",  // Cyan
        O: "#FFFF00",  // Yellow
        T: "#AA00FF",  // Purple
        S: "#00FF00",  // Green
        Z: "#FF0000",  // Red
        L: "#FFA500",  // Orange
        J: "#0066FF",  // Blue
    },

    // Scoring
    scoring: {
        single: 100,
        double: 300,
        triple: 500,
        tetris: 800,     // 4 lines at once
        softDrop: 1,     // Per cell
        hardDrop: 2,     // Per cell
    },

    // Leveling
    leveling: {
        linesPerLevel: 10,
        speedMultiplier: 0.85,  // Multiply fall time by this each level
        maxLevel: 15,
    },

    // Sound (placeholder for future)
    sound: {
        enabled: false,
        masterVolume: 0.5,
    },
};

/**
 * Tetromino shape definitions
 * Each shape is a 2D array representing the XZ plane
 * Pieces fall along the Y axis
 */
export const SHAPES = {
    I: {
        // Long bar - 4x1
        matrix: [
            [1, 1, 1, 1],
        ],
        color: CONFIG.pieceColors.I,
    },
    O: {
        // Square - 2x2
        matrix: [
            [1, 1],
            [1, 1],
        ],
        color: CONFIG.pieceColors.O,
    },
    T: {
        // T-shape - 3x2
        matrix: [
            [1, 1, 1],
            [0, 1, 0],
        ],
        color: CONFIG.pieceColors.T,
    },
    S: {
        // S-shape - 3x2
        matrix: [
            [0, 1, 1],
            [1, 1, 0],
        ],
        color: CONFIG.pieceColors.S,
    },
    Z: {
        // Z-shape - 3x2
        matrix: [
            [1, 1, 0],
            [0, 1, 1],
        ],
        color: CONFIG.pieceColors.Z,
    },
    L: {
        // L-shape - 2x3
        matrix: [
            [1, 0],
            [1, 0],
            [1, 1],
        ],
        color: CONFIG.pieceColors.L,
    },
    J: {
        // J-shape - 2x3
        matrix: [
            [0, 1],
            [0, 1],
            [1, 1],
        ],
        color: CONFIG.pieceColors.J,
    },
};

// List of all piece types for random selection
export const PIECE_TYPES = Object.keys(SHAPES);
