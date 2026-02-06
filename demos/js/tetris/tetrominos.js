/**
 * Tetromino piece definitions and TetrisPiece class
 */

import { CONFIG, SHAPES, PIECE_TYPES } from "./config.js";

/**
 * TetrisPiece - Represents a falling tetromino in 3D space
 *
 * Uses a voxel-based representation for true 3D rotation.
 * Pieces can rotate around X, Y, and Z axes.
 */
export class TetrisPiece {
    /**
     * Create a new tetromino piece
     * @param {string} type - Piece type (I, O, T, S, Z, L, J)
     */
    constructor(type) {
        this.type = type;
        this.color = SHAPES[type].color;

        // Convert 2D matrix to 3D voxels (relative positions)
        this.voxels = this._matrixToVoxels(SHAPES[type].matrix);

        // Position in grid coordinates
        // Y = 0 is top of well, Y increases downward
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Center the piece horizontally in the well
        this._centerPiece();
    }

    /**
     * Convert 2D matrix to 3D voxel array
     * @param {number[][]} matrix - 2D shape matrix
     * @returns {Array<{x: number, y: number, z: number}>}
     * @private
     */
    _matrixToVoxels(matrix) {
        const voxels = [];
        for (let z = 0; z < matrix.length; z++) {
            for (let x = 0; x < matrix[z].length; x++) {
                if (matrix[z][x]) {
                    voxels.push({ x, y: 0, z }); // y=0 since pieces start flat
                }
            }
        }
        return voxels;
    }

    /**
     * Center the piece at the top of the well
     * @private
     */
    _centerPiece() {
        const { width, depth } = CONFIG.grid;
        const bounds = this.getBounds();

        this.x = Math.floor((width - bounds.width) / 2);
        this.z = Math.floor((depth - bounds.depth) / 2);
        this.y = 0; // Start at top
    }

    /**
     * Get bounding box dimensions of the piece
     * @returns {{width: number, height: number, depth: number}}
     */
    getBounds() {
        if (this.voxels.length === 0) {
            return { width: 0, height: 0, depth: 0 };
        }
        return {
            width: Math.max(...this.voxels.map((v) => v.x)) + 1,
            height: Math.max(...this.voxels.map((v) => v.y)) + 1,
            depth: Math.max(...this.voxels.map((v) => v.z)) + 1,
        };
    }

    /**
     * Get all world positions occupied by this piece
     * @returns {Array<{x: number, y: number, z: number}>}
     */
    getWorldPositions() {
        return this.voxels.map((v) => ({
            x: this.x + v.x,
            y: this.y + v.y,
            z: this.z + v.z,
        }));
    }

    /**
     * Move the piece by the given offset
     * @param {number} dx - X offset
     * @param {number} dy - Y offset (positive = down)
     * @param {number} dz - Z offset
     */
    move(dx, dy, dz) {
        this.x += dx;
        this.y += dy;
        this.z += dz;
    }

    /**
     * Rotate the piece around the specified axis
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {number} direction - 1 for clockwise, -1 for counter-clockwise
     */
    rotate(axis = "y", direction = 1) {
        // O piece doesn't rotate
        if (this.type === "O") return;

        this.voxels = this.voxels.map((v) => {
            switch (axis) {
                case "y": // Horizontal rotation (around Y axis)
                    return direction === 1
                        ? { x: -v.z, y: v.y, z: v.x }
                        : { x: v.z, y: v.y, z: -v.x };
                case "x": // Pitch rotation (around X axis)
                    return direction === 1
                        ? { x: v.x, y: -v.z, z: v.y }
                        : { x: v.x, y: v.z, z: -v.y };
                case "z": // Roll rotation (around Z axis)
                    return direction === 1
                        ? { x: -v.y, y: v.x, z: v.z }
                        : { x: v.y, y: -v.x, z: v.z };
                default:
                    return v;
            }
        });

        // Normalize to keep piece grounded (min coords = 0)
        this._normalizeVoxels();
    }

    /**
     * Normalize voxels so minimum x/y/z is 0
     * This keeps the piece properly bounded after rotation
     * @private
     */
    _normalizeVoxels() {
        if (this.voxels.length === 0) return;

        const minX = Math.min(...this.voxels.map((v) => v.x));
        const minY = Math.min(...this.voxels.map((v) => v.y));
        const minZ = Math.min(...this.voxels.map((v) => v.z));

        this.voxels = this.voxels.map((v) => ({
            x: v.x - minX,
            y: v.y - minY,
            z: v.z - minZ,
        }));
    }

    /**
     * Undo a rotation (for wall kick failure)
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {number} direction - Original rotation direction to undo
     */
    undoRotate(axis = "y", direction = 1) {
        this.rotate(axis, -direction);
    }

    /**
     * Get the width of the piece (X dimension)
     * @returns {number}
     */
    getWidth() {
        return this.getBounds().width;
    }

    /**
     * Get the depth of the piece (Z dimension)
     * @returns {number}
     */
    getDepth() {
        return this.getBounds().depth;
    }

    /**
     * Clone this piece (for ghost piece calculation)
     * @returns {TetrisPiece}
     */
    clone() {
        const cloned = new TetrisPiece(this.type);
        cloned.voxels = this.voxels.map((v) => ({ ...v }));
        cloned.x = this.x;
        cloned.y = this.y;
        cloned.z = this.z;
        return cloned;
    }
}

/**
 * Bag randomizer for fair piece distribution
 * Uses the "7-bag" system where each bag contains all 7 pieces
 */
class PieceBag {
    constructor() {
        this.bag = [];
        this._refillBag();
    }

    /**
     * Refill the bag with all piece types, shuffled
     * @private
     */
    _refillBag() {
        this.bag = [...PIECE_TYPES];
        // Fisher-Yates shuffle
        for (let i = this.bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
    }

    /**
     * Get the next piece type from the bag
     * @returns {string}
     */
    next() {
        if (this.bag.length === 0) {
            this._refillBag();
        }
        return this.bag.pop();
    }

    /**
     * Peek at the next piece without removing it
     * @returns {string}
     */
    peek() {
        if (this.bag.length === 0) {
            this._refillBag();
        }
        return this.bag[this.bag.length - 1];
    }
}

// Global piece bag instance
let pieceBag = null;

/**
 * Get a random piece using the bag randomizer
 * @returns {TetrisPiece}
 */
export function getRandomPiece() {
    if (!pieceBag) {
        pieceBag = new PieceBag();
    }
    return new TetrisPiece(pieceBag.next());
}

/**
 * Peek at the next piece type without consuming it
 * @returns {string}
 */
export function peekNextPieceType() {
    if (!pieceBag) {
        pieceBag = new PieceBag();
    }
    return pieceBag.peek();
}

/**
 * Reset the piece bag (for game restart)
 */
export function resetPieceBag() {
    pieceBag = new PieceBag();
}

/**
 * Create a specific piece type (for preview/testing)
 * @param {string} type - Piece type
 * @returns {TetrisPiece}
 */
export function createPiece(type) {
    return new TetrisPiece(type);
}
