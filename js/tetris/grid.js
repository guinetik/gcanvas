/**
 * Grid - 3D grid for tracking placed blocks
 *
 * Coordinate system:
 * - X: left to right (0 to width-1)
 * - Y: top to bottom (0 to height-1, 0 is top)
 * - Z: front to back (0 to depth-1)
 */

import { CONFIG } from "./config.js";

/**
 * Cell data structure
 * @typedef {Object} Cell
 * @property {boolean} filled - Whether the cell is occupied
 * @property {string|null} color - Color of the block, or null if empty
 */

export class Grid {
    constructor() {
        const { width, depth, height } = CONFIG.grid;
        this.width = width;
        this.depth = depth;
        this.height = height;

        // 3D array: cells[x][y][z]
        this.cells = [];

        this._init();
    }

    /**
     * Initialize empty grid
     * @private
     */
    _init() {
        this.cells = [];
        for (let x = 0; x < this.width; x++) {
            this.cells[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.cells[x][y] = [];
                for (let z = 0; z < this.depth; z++) {
                    this.cells[x][y][z] = { filled: false, color: null };
                }
            }
        }
    }

    /**
     * Clear the grid (for game restart)
     */
    clear() {
        this._init();
    }

    /**
     * Check if coordinates are within grid bounds
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    isInBounds(x, y, z) {
        return (
            x >= 0 &&
            x < this.width &&
            y >= 0 &&
            y < this.height &&
            z >= 0 &&
            z < this.depth
        );
    }

    /**
     * Check if a cell is occupied (or out of bounds)
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {boolean}
     */
    isOccupied(x, y, z) {
        // Out of bounds on sides/bottom counts as occupied
        if (x < 0 || x >= this.width || z < 0 || z >= this.depth) {
            return true;
        }
        // Above grid is not occupied (pieces spawn there)
        if (y < 0) {
            return false;
        }
        // Below grid counts as occupied (floor)
        if (y >= this.height) {
            return true;
        }
        return this.cells[x][y][z].filled;
    }

    /**
     * Check if a piece can be placed at given positions
     * @param {Array<{x: number, y: number, z: number}>} positions
     * @returns {boolean}
     */
    canPlace(positions) {
        for (const pos of positions) {
            if (this.isOccupied(pos.x, pos.y, pos.z)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Lock a piece into the grid
     * @param {Array<{x: number, y: number, z: number}>} positions
     * @param {string} color
     */
    placePiece(positions, color) {
        for (const pos of positions) {
            if (this.isInBounds(pos.x, pos.y, pos.z)) {
                this.cells[pos.x][pos.y][pos.z] = {
                    filled: true,
                    color: color,
                };
            }
        }
    }

    /**
     * Check for complete layers and clear them
     * @returns {{clearedCount: number, clearedLayers: number[]}}
     */
    checkAndClearLayers() {
        const clearedLayers = [];

        // Check each layer from bottom to top
        for (let y = this.height - 1; y >= 0; y--) {
            if (this._isLayerComplete(y)) {
                clearedLayers.push(y);
            }
        }

        // Clear the layers (from bottom to top to maintain indices)
        clearedLayers.sort((a, b) => b - a);
        for (const y of clearedLayers) {
            this._clearLayer(y);
        }

        return {
            clearedCount: clearedLayers.length,
            clearedLayers: clearedLayers,
        };
    }

    /**
     * Check if a horizontal layer is completely filled
     * @param {number} y - Layer Y coordinate
     * @returns {boolean}
     * @private
     */
    _isLayerComplete(y) {
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.depth; z++) {
                if (!this.cells[x][y][z].filled) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Clear a layer and drop everything above
     * @param {number} clearedY - Layer to clear
     * @private
     */
    _clearLayer(clearedY) {
        // Move all layers above down by one
        for (let y = clearedY; y > 0; y--) {
            for (let x = 0; x < this.width; x++) {
                for (let z = 0; z < this.depth; z++) {
                    this.cells[x][y][z] = { ...this.cells[x][y - 1][z] };
                }
            }
        }

        // Clear the top layer
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.depth; z++) {
                this.cells[x][0][z] = { filled: false, color: null };
            }
        }
    }

    /**
     * Get all filled cells for rendering
     * @returns {Array<{x: number, y: number, z: number, color: string}>}
     */
    getFilledCells() {
        const filled = [];

        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.depth; z++) {
                    const cell = this.cells[x][y][z];
                    if (cell.filled) {
                        filled.push({
                            x: x,
                            y: y,
                            z: z,
                            color: cell.color,
                        });
                    }
                }
            }
        }

        return filled;
    }

    /**
     * Get the highest filled Y coordinate in each column
     * Used for efficient ghost piece calculation
     * @returns {number[][]} 2D array [x][z] of highest filled Y (or height if empty)
     */
    getColumnHeights() {
        const heights = [];

        for (let x = 0; x < this.width; x++) {
            heights[x] = [];
            for (let z = 0; z < this.depth; z++) {
                heights[x][z] = this.height; // Default to bottom
                for (let y = 0; y < this.height; y++) {
                    if (this.cells[x][y][z].filled) {
                        heights[x][z] = y;
                        break;
                    }
                }
            }
        }

        return heights;
    }

    /**
     * Check if the game is over (blocks above playfield)
     * @returns {boolean}
     */
    isGameOver() {
        // Check if any blocks are in the top 2 rows
        for (let x = 0; x < this.width; x++) {
            for (let z = 0; z < this.depth; z++) {
                if (this.cells[x][0][z].filled || this.cells[x][1][z].filled) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Calculate where a piece would land (for ghost piece)
     * @param {TetrisPiece} piece
     * @returns {number} The Y coordinate where piece would land
     */
    calculateLandingY(piece) {
        let testY = piece.y;

        while (true) {
            testY++;
            // Use voxels to calculate positions at testY
            const positions = piece.voxels.map((v) => ({
                x: piece.x + v.x,
                y: testY + v.y,
                z: piece.z + v.z,
            }));

            if (!this.canPlace(positions)) {
                return testY - 1;
            }

            // Safety check to prevent infinite loop
            if (testY > this.height + 5) {
                return piece.y;
            }
        }
    }
}
