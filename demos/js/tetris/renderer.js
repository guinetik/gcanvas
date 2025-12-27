/**
 * Renderer - Handles 3D rendering of well, pieces, and grid
 */

import { Cube3D, Tweenetik, Easing } from "../../../src/index.js";
import { CONFIG } from "./config.js";

/**
 * Convert grid coordinates to world 3D coordinates
 * Grid origin (0,0,0) is at front-top-left of well
 * World origin is at center of well
 *
 * @param {number} gridX
 * @param {number} gridY
 * @param {number} gridZ
 * @param {number} cubeSize - Dynamic cube size
 * @param {number} cubeGap - Dynamic gap size
 * @returns {{x: number, y: number, z: number}}
 */
export function gridToWorld(gridX, gridY, gridZ, cubeSize, cubeGap) {
    const { width, depth, height } = CONFIG.grid;
    const size = cubeSize + cubeGap;

    // Center the grid around origin
    const halfWidth = (width * size) / 2;
    const halfDepth = (depth * size) / 2;
    const halfHeight = (height * size) / 2;

    return {
        x: gridX * size - halfWidth + size / 2,
        y: gridY * size - halfHeight + size / 2,
        z: gridZ * size - halfDepth + size / 2,
    };
}

/**
 * WellRenderer - Renders the wireframe well boundary
 */
export class WellRenderer {
    constructor(camera, cubeSize, cubeGap) {
        this.camera = camera;
        this.cubeSize = cubeSize;
        this.cubeGap = cubeGap;

        this._updateDimensions();
    }

    /**
     * Update dimensions when size changes
     * @param {number} cubeSize
     * @param {number} cubeGap
     */
    updateSize(cubeSize, cubeGap) {
        this.cubeSize = cubeSize;
        this.cubeGap = cubeGap;
        this._updateDimensions();
    }

    /**
     * Recalculate dimensions
     * @private
     */
    _updateDimensions() {
        const { width, depth, height } = CONFIG.grid;
        const size = this.cubeSize + this.cubeGap;

        // Calculate well dimensions in world space
        this.wellWidth = width * size;
        this.wellDepth = depth * size;
        this.wellHeight = height * size;

        // Corner positions
        this.corners = this._calculateCorners();
    }

    /**
     * Calculate the 8 corners of the well
     * @private
     */
    _calculateCorners() {
        const hw = this.wellWidth / 2;
        const hd = this.wellDepth / 2;
        const hh = this.wellHeight / 2;

        return {
            // Top face corners
            topFrontLeft: { x: -hw, y: -hh, z: -hd },
            topFrontRight: { x: hw, y: -hh, z: -hd },
            topBackLeft: { x: -hw, y: -hh, z: hd },
            topBackRight: { x: hw, y: -hh, z: hd },
            // Bottom face corners
            bottomFrontLeft: { x: -hw, y: hh, z: -hd },
            bottomFrontRight: { x: hw, y: hh, z: -hd },
            bottomBackLeft: { x: -hw, y: hh, z: hd },
            bottomBackRight: { x: hw, y: hh, z: hd },
        };
    }

    /**
     * Draw a 3D line from p1 to p2
     * @private
     */
    _drawLine3D(ctx, centerX, centerY, p1, p2, color, lineWidth) {
        const proj1 = this.camera.project(p1.x, p1.y, p1.z);
        const proj2 = this.camera.project(p2.x, p2.y, p2.z);

        // Don't draw if either point is behind camera
        if (
            proj1.z < -this.camera.perspective + 50 ||
            proj2.z < -this.camera.perspective + 50
        ) {
            return;
        }

        ctx.beginPath();
        ctx.moveTo(centerX + proj1.x, centerY + proj1.y);
        ctx.lineTo(centerX + proj2.x, centerY + proj2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }

    /**
     * Render the well wireframe
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} centerX - Screen center X
     * @param {number} centerY - Screen center Y
     */
    render(ctx, centerX, centerY) {
        const c = this.corners;
        const color = CONFIG.visual.wellColor;
        const lineWidth = CONFIG.visual.wellLineWidth;

        // Draw all 12 edges of the wireframe box
        // Vertical edges (4)
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topFrontLeft,
            c.bottomFrontLeft,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topFrontRight,
            c.bottomFrontRight,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topBackLeft,
            c.bottomBackLeft,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topBackRight,
            c.bottomBackRight,
            color,
            lineWidth
        );

        // Top edges (4)
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topFrontLeft,
            c.topFrontRight,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topFrontRight,
            c.topBackRight,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topBackRight,
            c.topBackLeft,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.topBackLeft,
            c.topFrontLeft,
            color,
            lineWidth
        );

        // Bottom edges (4)
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.bottomFrontLeft,
            c.bottomFrontRight,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.bottomFrontRight,
            c.bottomBackRight,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.bottomBackRight,
            c.bottomBackLeft,
            color,
            lineWidth
        );
        this._drawLine3D(
            ctx,
            centerX,
            centerY,
            c.bottomBackLeft,
            c.bottomFrontLeft,
            color,
            lineWidth
        );

        // Draw floor grid
        this._drawFloorGrid(ctx, centerX, centerY);
    }

    /**
     * Draw grid lines on the floor of the well
     * @private
     */
    _drawFloorGrid(ctx, centerX, centerY) {
        const { width, depth } = CONFIG.grid;
        const size = CONFIG.visual.cubeSize + CONFIG.visual.cubeGap;
        const hw = this.wellWidth / 2;
        const hd = this.wellDepth / 2;
        const hh = this.wellHeight / 2;
        const floorY = hh;

        const gridColor = "rgba(0, 255, 65, 0.2)";
        const gridWidth = 0.5;

        // X direction lines
        for (let i = 0; i <= width; i++) {
            const x = -hw + i * size;
            this._drawLine3D(
                ctx,
                centerX,
                centerY,
                { x: x, y: floorY, z: -hd },
                { x: x, y: floorY, z: hd },
                gridColor,
                gridWidth
            );
        }

        // Z direction lines
        for (let i = 0; i <= depth; i++) {
            const z = -hd + i * size;
            this._drawLine3D(
                ctx,
                centerX,
                centerY,
                { x: -hw, y: floorY, z: z },
                { x: hw, y: floorY, z: z },
                gridColor,
                gridWidth
            );
        }
    }
}

/**
 * BlockRenderer - Renders cubes for pieces and grid blocks
 * Uses a pool of Cube3D instances for efficiency
 */
export class BlockRenderer {
    constructor(camera, cubeSize, cubeGap) {
        this.camera = camera;
        this.cubeSize = cubeSize;
        this.cubeGap = cubeGap;

        // Cube pools - we reuse cubes to avoid constant allocation
        this.pieceCubes = [];
        this.ghostCubes = [];
        this.gridCubes = [];
        this.hintCubes = [];

        // Track what we're rendering
        this.pieceData = null;
        this.ghostData = null;
        this.gridData = [];
        this.hintData = null;
    }

    /**
     * Update size when screen changes
     * @param {number} cubeSize
     * @param {number} cubeGap
     */
    updateSize(cubeSize, cubeGap) {
        this.cubeSize = cubeSize;
        this.cubeGap = cubeGap;
    }

    /**
     * Create a cube at the given grid position
     * @param {number} gridX
     * @param {number} gridY
     * @param {number} gridZ
     * @param {string} color
     * @param {number} opacity
     * @returns {Cube3D}
     * @private
     */
    _createCube(gridX, gridY, gridZ, color, opacity = 1.0) {
        const world = gridToWorld(gridX, gridY, gridZ, this.cubeSize, this.cubeGap);

        const cube = new Cube3D(this.cubeSize, {
            x: world.x,
            y: world.y,
            z: world.z,
            camera: this.camera,
            faceColors: {
                front: color,
                back: color,
                top: color,
                bottom: color,
                left: color,
                right: color,
            },
            stickerMode: CONFIG.visual.stickerMode,
            stickerMargin: CONFIG.visual.stickerMargin,
            stickerBackgroundColor: CONFIG.visual.stickerBackgroundColor,
            stroke: CONFIG.visual.wellColor,
            lineWidth: 0.5,
        });

        cube._opacity = opacity;

        return cube;
    }

    /**
     * Update cubes for the active piece
     * @param {TetrisPiece|null} piece
     */
    updatePiece(piece) {
        if (!piece) {
            this.pieceData = null;
            this.pieceCubes = [];
            return;
        }

        this.pieceData = {
            positions: piece.getWorldPositions(),
            color: piece.color,
        };

        // Rebuild cubes
        this.pieceCubes = this.pieceData.positions.map((pos) =>
            this._createCube(pos.x, pos.y, pos.z, this.pieceData.color, 1.0)
        );
    }

    /**
     * Update the ghost piece (landing preview)
     * @param {TetrisPiece|null} piece
     * @param {number} landingY
     */
    updateGhost(piece, landingY) {
        if (!piece || landingY === piece.y) {
            this.ghostData = null;
            this.ghostCubes = [];
            return;
        }

        // Calculate ghost positions
        const ghostPositions = [];
        for (let z = 0; z < piece.matrix.length; z++) {
            for (let x = 0; x < piece.matrix[z].length; x++) {
                if (piece.matrix[z][x]) {
                    ghostPositions.push({
                        x: piece.x + x,
                        y: landingY,
                        z: piece.z + z,
                    });
                }
            }
        }

        this.ghostData = {
            positions: ghostPositions,
            color: piece.color,
        };

        // Rebuild ghost cubes with transparency
        this.ghostCubes = this.ghostData.positions.map((pos) =>
            this._createCube(
                pos.x,
                pos.y,
                pos.z,
                this.ghostData.color,
                CONFIG.visual.ghostAlpha
            )
        );
    }

    /**
     * Update cubes for all locked grid blocks
     * @param {Array<{x: number, y: number, z: number, color: string}>} filledCells
     * @param {Array<{x: number, y: number, z: number}>} [newPositions] - Newly placed positions to animate
     */
    updateGrid(filledCells, newPositions = null) {
        this.gridData = filledCells;

        // Rebuild grid cubes
        this.gridCubes = filledCells.map((cell) =>
            this._createCube(cell.x, cell.y, cell.z, cell.color, 1.0)
        );

        // Animate newly placed cubes with bounce
        if (newPositions && newPositions.length > 0) {
            this._animateDropBounce(newPositions);
        }
    }

    /**
     * Animate a bounce effect on newly placed cubes
     * @param {Array<{x: number, y: number, z: number}>} positions
     * @private
     */
    _animateDropBounce(positions) {
        for (const pos of positions) {
            // Find the cube at this position
            const cube = this.gridCubes.find((c) => {
                const world = gridToWorld(pos.x, pos.y, pos.z, this.cubeSize, this.cubeGap);
                return (
                    Math.abs(c.x - world.x) < 0.1 &&
                    Math.abs(c.y - world.y) < 0.1 &&
                    Math.abs(c.z - world.z) < 0.1
                );
            });

            if (cube) {
                const finalY = cube.y;
                cube.y = finalY - this.cubeSize;
                Tweenetik.to(cube, { y: finalY }, 0.3, Easing.easeOutBounce);
            }
        }
    }

    /**
     * Update hint ghost cubes (optimal position preview)
     * @param {Array<{x: number, y: number, z: number}>|null} positions
     */
    updateHint(positions) {
        if (!positions || positions.length === 0) {
            this.hintData = null;
            this.hintCubes = [];
            return;
        }

        this.hintData = { positions };

        // Create hint cubes with distinct gold/yellow color
        const hintColor = "#FFD700";
        this.hintCubes = positions.map((pos) =>
            this._createCube(pos.x, pos.y, pos.z, hintColor, 0.4)
        );
    }

    /**
     * Collect all cubes and sort by depth for proper rendering
     * @returns {Cube3D[]}
     */
    getSortedCubes() {
        const allCubes = [...this.gridCubes, ...this.hintCubes, ...this.ghostCubes, ...this.pieceCubes];

        // Calculate depth for each cube
        const cubesWithDepth = allCubes.map((cube) => {
            const proj = this.camera.project(cube.x, cube.y, cube.z);
            return { cube, depth: proj.z };
        });

        // Sort back to front (larger z = further away)
        cubesWithDepth.sort((a, b) => b.depth - a.depth);

        return cubesWithDepth.map((item) => item.cube);
    }

    /**
     * Render all cubes
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} centerX
     * @param {number} centerY
     */
    render(ctx, centerX, centerY) {
        const sortedCubes = this.getSortedCubes();

        ctx.save();
        ctx.translate(centerX, centerY);

        for (const cube of sortedCubes) {
            if (cube._opacity < 1.0) {
                ctx.globalAlpha = cube._opacity;
            }
            cube.draw();
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
    }
}

/**
 * NextPieceRenderer - Renders the preview of the next piece
 */
export class NextPieceRenderer {
    constructor(camera, cubeSize) {
        // Create a separate camera for the preview
        this.previewCamera = camera;
        this.cubeSize = cubeSize;
        this.cubes = [];
        this.pieceType = null;
        this.currentColor = null;
        this.currentMatrix = null;
    }

    /**
     * Update size
     * @param {number} cubeSize
     */
    updateSize(cubeSize) {
        this.cubeSize = cubeSize;
        // Rebuild cubes with new size if we have piece data
        if (this.pieceType && this.currentMatrix) {
            this._rebuildCubes(this.currentColor, this.currentMatrix);
        }
    }

    /**
     * Rebuild cubes with current settings
     * @private
     */
    _rebuildCubes(color, matrix) {
        this.cubes = [];
        const size = this.cubeSize * 0.6;
        const rows = matrix.length;
        const cols = matrix[0].length;

        // Center the preview piece
        const offsetX = (cols * size) / 2;
        const offsetZ = (rows * size) / 2;

        for (let z = 0; z < rows; z++) {
            for (let x = 0; x < cols; x++) {
                if (matrix[z][x]) {
                    const cube = new Cube3D(size, {
                        x: x * size - offsetX + size / 2,
                        y: 0,
                        z: z * size - offsetZ + size / 2,
                        camera: this.previewCamera,
                        faceColors: {
                            front: color,
                            back: color,
                            top: color,
                            bottom: color,
                            left: color,
                            right: color,
                        },
                        stickerMode: true,
                        stickerMargin: CONFIG.visual.stickerMargin,
                        stickerBackgroundColor: CONFIG.visual.stickerBackgroundColor,
                        stroke: CONFIG.visual.wellColor,
                        lineWidth: 0.5,
                    });
                    this.cubes.push(cube);
                }
            }
        }
    }

    /**
     * Update the preview piece
     * @param {string} pieceType
     * @param {string} color
     * @param {number[][]} matrix
     */
    update(pieceType, color, matrix) {
        if (this.pieceType === pieceType) return;

        this.pieceType = pieceType;
        this.currentColor = color;
        this.currentMatrix = matrix;

        this._rebuildCubes(color, matrix);
    }

    /**
     * Render the preview
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     */
    render(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        for (const cube of this.cubes) {
            cube.draw();
        }

        ctx.restore();
    }
}
