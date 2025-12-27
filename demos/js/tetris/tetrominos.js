/**
 * Tetromino piece definitions and TetrisPiece class
 */

import { CONFIG, SHAPES, PIECE_TYPES } from "./config.js";

/**
 * TetrisPiece - Represents a falling tetromino in 3D space
 *
 * The piece exists on the XZ plane and falls along the Y axis.
 * Rotation happens around the Y axis (horizontal plane rotation).
 */
export class TetrisPiece {
    /**
     * Create a new tetromino piece
     * @param {string} type - Piece type (I, O, T, S, Z, L, J)
     */
    constructor(type) {
        this.type = type;
        this.color = SHAPES[type].color;

        // Deep copy the shape matrix so we can rotate it
        this.matrix = SHAPES[type].matrix.map((row) => [...row]);

        // Position in grid coordinates
        // Y = 0 is top of well, Y increases downward
        this.x = 0;
        this.y = 0;
        this.z = 0;

        // Center the piece horizontally in the well
        this._centerPiece();
    }

    /**
     * Center the piece at the top of the well
     * @private
     */
    _centerPiece() {
        const { width, depth } = CONFIG.grid;
        const pieceWidth = this.matrix[0].length; // X dimension
        const pieceDepth = this.matrix.length; // Z dimension

        this.x = Math.floor((width - pieceWidth) / 2);
        this.z = Math.floor((depth - pieceDepth) / 2);
        this.y = 0; // Start at top
    }

    /**
     * Get all world positions occupied by this piece
     * @returns {Array<{x: number, y: number, z: number}>}
     */
    getWorldPositions() {
        const positions = [];

        for (let z = 0; z < this.matrix.length; z++) {
            for (let x = 0; x < this.matrix[z].length; x++) {
                if (this.matrix[z][x]) {
                    positions.push({
                        x: this.x + x,
                        y: this.y,
                        z: this.z + z,
                    });
                }
            }
        }

        return positions;
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
     * Rotate the piece around the Y axis (horizontal plane)
     * @param {number} direction - 1 for clockwise, -1 for counter-clockwise
     */
    rotate(direction = 1) {
        // O piece doesn't rotate
        if (this.type === "O") return;

        const oldMatrix = this.matrix;
        const rows = oldMatrix.length;
        const cols = oldMatrix[0].length;

        // Create new rotated matrix
        if (direction === 1) {
            // Clockwise: transpose then reverse each row
            this.matrix = [];
            for (let x = 0; x < cols; x++) {
                const newRow = [];
                for (let z = rows - 1; z >= 0; z--) {
                    newRow.push(oldMatrix[z][x]);
                }
                this.matrix.push(newRow);
            }
        } else {
            // Counter-clockwise: transpose then reverse each column
            this.matrix = [];
            for (let x = cols - 1; x >= 0; x--) {
                const newRow = [];
                for (let z = 0; z < rows; z++) {
                    newRow.push(oldMatrix[z][x]);
                }
                this.matrix.push(newRow);
            }
        }
    }

    /**
     * Undo a rotation (for wall kick failure)
     * @param {number} direction - Original rotation direction to undo
     */
    undoRotate(direction = 1) {
        this.rotate(-direction);
    }

    /**
     * Get the width of the piece (X dimension)
     * @returns {number}
     */
    getWidth() {
        return this.matrix[0].length;
    }

    /**
     * Get the depth of the piece (Z dimension)
     * @returns {number}
     */
    getDepth() {
        return this.matrix.length;
    }

    /**
     * Clone this piece (for ghost piece calculation)
     * @returns {TetrisPiece}
     */
    clone() {
        const cloned = new TetrisPiece(this.type);
        cloned.matrix = this.matrix.map((row) => [...row]);
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
