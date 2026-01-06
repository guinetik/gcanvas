/**
 * 3D Tetris Game
 *
 * A 3D falling block puzzle game using Cube3D.
 * Pieces fall into a 6x6x16 well with camera rotation.
 */

import {
    Game,
    Scene,
    Text,
    FPSCounter,
    Keys,
    Position,
    Button,
    Tweenetik,
    Easing,
} from "../../../src/index.js";
import { Camera3D } from "../../../src/util/camera3d.js";
import { CONFIG, SHAPES } from "./config.js";
import { getRandomPiece, resetPieceBag } from "./tetrominos.js";
import { Grid } from "./grid.js";
import { WellRenderer, BlockRenderer, NextPieceRenderer } from "./renderer.js";

/**
 * Game states
 */
const GameState = {
    READY: "ready",
    PLAYING: "playing",
    PAUSED: "paused",
    GAME_OVER: "gameover",
    LINE_CLEAR: "lineclear",
};

/**
 * Tetris3DGame - Main game class
 */
class Tetris3DGame extends Game {
    constructor(canvas) {
        super(canvas);
        this.backgroundColor = CONFIG.visual.backgroundColor;
        this.enableFluidSize();
    }

    init() {
        super.init();

        // Game state
        this.gameState = GameState.READY;
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;

        // Calculate dynamic sizes based on screen
        this._updateSizes();

        // Create camera with mouse controls
        this.camera = new Camera3D({
            perspective: this._getDynamicPerspective(),
            rotationX: CONFIG.camera.rotationX,
            rotationY: CONFIG.camera.rotationY,
            inertia: CONFIG.camera.inertia,
            friction: CONFIG.camera.friction,
        });
        this.camera.enableMouseControl(this.canvas);

        // Preview camera (fixed angle)
        this.previewCamera = new Camera3D({
            perspective: 400,
            rotationX: 0.4,
            rotationY: -0.5,
        });

        // Game grid
        this.grid = new Grid();

        // Renderers with dynamic sizes
        this.wellRenderer = new WellRenderer(this.camera, this.cubeSize, this.cubeGap);
        this.blockRenderer = new BlockRenderer(this.camera, this.cubeSize, this.cubeGap);
        this.nextPieceRenderer = new NextPieceRenderer(this.previewCamera, this.cubeSize);

        // Current and next piece
        this.currentPiece = null;
        this.nextPiece = null;
        this.nextPieceType = null;

        // Timing
        this.fallTimer = 0;
        this.lockTimer = 0;
        this.isLocking = false;

        // Input state
        this.moveRepeatTimer = 0;
        this.moveRepeatKey = null;
        this.softDropping = false;

        // Camera preset cycling
        this.cameraPresetIndex = 0;

        // Hint ghost (optimal position preview)
        this.hintPositions = null;
        this.hintRotations = 0;

        // Auto-play mode
        this.autoPlayEnabled = false;
        this.autoPlayTimer = 0;
        this.autoPlayDelay = 0.3; // Seconds between auto moves

        // Line clear animation
        this.lineClearTimer = 0;
        this.clearedLayers = [];

        // Setup input handlers
        this._setupInput();

        // Create UI
        this._createUI();
    }

    /**
     * Setup keyboard input handlers
     * @private
     */
    _setupInput() {
        // Movement - Arrow keys
        this.events.on(Keys.LEFT, () => this._handleMove(-1, 0));
        this.events.on(Keys.RIGHT, () => this._handleMove(1, 0));
        this.events.on(Keys.UP, () => this._handleMove(0, -1));
        this.events.on(Keys.DOWN, () => this._handleMove(0, 1));

        // Movement - WASD (sacred!)
        this.events.on(Keys.A, () => this._handleMove(-1, 0));  // Left
        this.events.on(Keys.D, () => this._handleMove(1, 0));   // Right
        this.events.on(Keys.W, () => this._handleMove(0, -1));  // Forward
        this.events.on(Keys.S, () => this._handleMove(0, 1));   // Back

        // Rotation - Q/E only
        this.events.on(Keys.Q, () => this._handleRotate(-1));   // CCW
        this.events.on(Keys.E, () => this._handleRotate(1));    // CW

        // Hard drop
        this.events.on(Keys.SPACE, () => this._handleHardDrop());

        // Start/restart on Enter
        this.events.on(Keys.ENTER, () => this._handleStart());

        // Pause on Escape
        this.events.on(Keys.ESC, () => this._handlePause());
    }

    /**
     * Create UI elements
     * @private
     */
    _createUI() {
        // Score display
        this.scoreText = new Text(this, "SCORE: 0", {
            font: "bold 18px monospace",
            color: CONFIG.visual.wellColor,
            anchor: Position.TOP_LEFT,
            anchorMargin: 20,
        });
        this.pipeline.add(this.scoreText);

        // Level display
        this.levelText = new Text(this, "LEVEL: 1", {
            font: "16px monospace",
            color: CONFIG.visual.wellColor,
            anchor: Position.TOP_LEFT,
            anchorMargin: 20,
            anchorOffsetY: 30,
        });
        this.pipeline.add(this.levelText);

        // Lines display
        this.linesText = new Text(this, "LINES: 0", {
            font: "16px monospace",
            color: CONFIG.visual.wellColor,
            anchor: Position.TOP_LEFT,
            anchorMargin: 20,
            anchorOffsetY: 55,
        });
        this.pipeline.add(this.linesText);

        // Next piece label
        this.nextLabel = new Text(this, "NEXT:", {
            font: "bold 14px monospace",
            color: CONFIG.visual.wellColor,
            anchor: Position.TOP_RIGHT,
            anchorMargin: 20,
        });
        this.pipeline.add(this.nextLabel);

        // State message (center) - large and prominent
        this.stateMessage = new Text(this, "", {
            font: "bold 36px monospace",
            color: "#fff",
            anchor: Position.CENTER,
            anchorOffsetY: -20,
        });
        this.pipeline.add(this.stateMessage);

        // Sub-message
        this.subMessage = new Text(this, "", {
            font: "18px monospace",
            color: CONFIG.visual.wellColor,
            anchor: Position.CENTER,
            anchorOffsetY: 25,
        });
        this.pipeline.add(this.subMessage);

        // Score display on game over (hidden initially)
        this.gameOverScore = new Text(this, "", {
            font: "bold 24px monospace",
            color: "#FFD700",
            anchor: Position.CENTER,
            anchorOffsetY: 60,
        });
        this.pipeline.add(this.gameOverScore);

        // Controls help
        this.controlsText = new Text(
            this,
            "WASD/Arrows: Move | Q/E: Rotate | SPACE: Drop | ENTER: Start",
            {
                font: "12px monospace",
                color: "#666",
                anchor: Position.BOTTOM_CENTER,
                anchorMargin: 15,
            }
        );
        this.pipeline.add(this.controlsText);

        // Camera view cycle button
        const presets = CONFIG.camera.presets;
        this.cameraButton = new Button(this, {
            text: `View: ${presets[0].name}`,
            width: 120,
            height: 32,
            font: "12px monospace",
            anchor: Position.BOTTOM_LEFT,
            anchorMargin: 15,
            onClick: () => this._cycleCamera(),
        });
        this.pipeline.add(this.cameraButton);

        // Restart button (next to view button)
        this.restartButton = new Button(this, {
            text: "Restart",
            width: 90,
            height: 32,
            font: "12px monospace",
            anchor: Position.BOTTOM_LEFT,
            anchorMargin: 15,
            anchorOffsetX: 130,
            onClick: () => this._startGame(),
        });
        this.pipeline.add(this.restartButton);

        // Hint button - shows ghost of optimal position
        this.hintButton = new Button(this, {
            text: "Hint",
            width: 60,
            height: 32,
            font: "12px monospace",
            anchor: Position.BOTTOM_LEFT,
            anchorMargin: 15,
            anchorOffsetX: 230,
            onClick: () => this._showHint(),
        });
        this.pipeline.add(this.hintButton);

        // Auto-Play button - AI plays automatically
        this.autoPlayButton = new Button(this, {
            text: "Auto",
            width: 60,
            height: 32,
            font: "12px monospace",
            anchor: Position.BOTTOM_LEFT,
            anchorMargin: 15,
            anchorOffsetX: 300,
            onClick: () => this._toggleAutoPlay(),
        });
        this.pipeline.add(this.autoPlayButton);

        // FPS counter
        this.pipeline.add(
            new FPSCounter(this, {
                anchor: Position.BOTTOM_RIGHT,
            })
        );

        // Show start message
        this._showMessage("3D TETRIS", "Press ENTER to start");
    }

    /**
     * Show hint - display ghost of optimal position
     * @private
     */
    _showHint() {
        if (this.gameState !== GameState.PLAYING || !this.currentPiece) return;

        const bestMove = this._findBestMove();
        if (bestMove) {
            // Calculate hint positions (where the piece would go)
            const tempPiece = this.currentPiece.clone();

            // Apply rotations to temp piece
            for (let i = 0; i < bestMove.rotations; i++) {
                tempPiece.rotate(1);
            }
            tempPiece.x = bestMove.x;
            tempPiece.z = bestMove.z;

            // Get landing Y for the optimal position
            const landingY = this.grid.calculateLandingY(tempPiece);
            tempPiece.y = landingY;

            // Store hint positions for rendering
            this.hintPositions = tempPiece.getWorldPositions();
            this.hintRotations = bestMove.rotations;

            // Update renderers to show hint
            this._updateRenderers();
        }
    }

    /**
     * Clear the hint ghost
     * @private
     */
    _clearHint() {
        this.hintPositions = null;
        this.hintRotations = 0;
    }

    /**
     * Toggle auto-play mode
     * @private
     */
    _toggleAutoPlay() {
        this.autoPlayEnabled = !this.autoPlayEnabled;
        this.autoPlayTimer = 0;

        // Update button text
        this.autoPlayButton.text = this.autoPlayEnabled ? "Stop" : "Auto";

        // Start game if not playing
        if (this.autoPlayEnabled && this.gameState !== GameState.PLAYING) {
            this._startGame();
        }
    }

    /**
     * Execute auto-play move
     * @private
     */
    _autoPlayMove() {
        if (!this.currentPiece) return;

        const bestMove = this._findBestMove();
        if (bestMove) {
            // Apply rotations
            for (let i = 0; i < bestMove.rotations; i++) {
                this.currentPiece.rotate(1);
            }

            // Move to best position
            this.currentPiece.x = bestMove.x;
            this.currentPiece.z = bestMove.z;

            // Hard drop
            const landingY = this.grid.calculateLandingY(this.currentPiece);
            this.currentPiece.y = landingY;

            // Lock immediately
            this._lockPiece();
        }
    }

    /**
     * Find the best position for the current piece
     * @returns {{x: number, z: number, rotations: number, score: number}|null}
     * @private
     */
    _findBestMove() {
        if (!this.currentPiece) return null;

        const { width, depth } = CONFIG.grid;
        let bestMove = null;
        let bestScore = -Infinity;

        // Save original state
        const originalX = this.currentPiece.x;
        const originalZ = this.currentPiece.z;
        const originalMatrix = this.currentPiece.matrix.map(row => [...row]);

        // Try all 4 rotations
        for (let rot = 0; rot < 4; rot++) {
            if (rot > 0) {
                this.currentPiece.rotate(1);
            }

            const pieceWidth = this.currentPiece.matrix[0].length;
            const pieceDepth = this.currentPiece.matrix.length;

            // Try all positions
            for (let x = 0; x <= width - pieceWidth; x++) {
                for (let z = 0; z <= depth - pieceDepth; z++) {
                    this.currentPiece.x = x;
                    this.currentPiece.z = z;

                    // Check if position is valid
                    const positions = this.currentPiece.getWorldPositions();
                    if (!this.grid.canPlace(positions)) continue;

                    // Calculate landing Y and score
                    const landingY = this.grid.calculateLandingY(this.currentPiece);
                    const score = this._evaluatePosition(x, z, landingY, positions);

                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { x, z, rotations: rot, score };
                    }
                }
            }
        }

        // Restore original state
        this.currentPiece.x = originalX;
        this.currentPiece.z = originalZ;
        this.currentPiece.matrix = originalMatrix;

        return bestMove;
    }

    /**
     * Evaluate how good a position is
     * @private
     */
    _evaluatePosition(x, z, landingY, positions) {
        let score = 0;

        // Simulate placing the piece
        const tempPositions = positions.map(p => ({ ...p, y: landingY }));

        // Check how many lines would be cleared
        const linesCleared = this._simulateLineClears(tempPositions);
        score += linesCleared * 1000; // High priority for line clears

        // Prefer lower positions (higher Y = lower in well)
        score += landingY * 10;

        // Prefer center positions slightly
        const centerX = CONFIG.grid.width / 2;
        const centerZ = CONFIG.grid.depth / 2;
        const distFromCenter = Math.abs(x - centerX) + Math.abs(z - centerZ);
        score -= distFromCenter * 2;

        // Penalize creating holes
        const holes = this._countHolesCreated(tempPositions);
        score -= holes * 50;

        return score;
    }

    /**
     * Simulate how many lines would be cleared
     * @private
     */
    _simulateLineClears(positions) {
        const { width, depth, height } = CONFIG.grid;
        let linesCleared = 0;

        // Get all Y levels affected
        const yLevels = [...new Set(positions.map(p => p.y))];

        for (const y of yLevels) {
            if (y < 0 || y >= height) continue;

            // Count filled cells at this level (existing + new)
            let filledCount = 0;
            for (let gx = 0; gx < width; gx++) {
                for (let gz = 0; gz < depth; gz++) {
                    const isNewPiece = positions.some(p => p.x === gx && p.y === y && p.z === gz);
                    const isExisting = this.grid.isOccupied(gx, y, gz);
                    if (isNewPiece || isExisting) {
                        filledCount++;
                    }
                }
            }

            if (filledCount === width * depth) {
                linesCleared++;
            }
        }

        return linesCleared;
    }

    /**
     * Count holes that would be created
     * @private
     */
    _countHolesCreated(positions) {
        let holes = 0;
        const { width, depth, height } = CONFIG.grid;

        for (const pos of positions) {
            // Check cell below each piece position
            const belowY = pos.y + 1;
            if (belowY < height) {
                if (!this.grid.isOccupied(pos.x, belowY, pos.z)) {
                    // Check if there's something above that would trap this
                    let hasBlockAbove = false;
                    for (let y = pos.y - 1; y >= 0; y--) {
                        if (this.grid.isOccupied(pos.x, y, pos.z) ||
                            positions.some(p => p.x === pos.x && p.y === y && p.z === pos.z)) {
                            hasBlockAbove = true;
                            break;
                        }
                    }
                    if (!hasBlockAbove) holes++;
                }
            }
        }

        return holes;
    }

    /**
     * Cycle through camera presets
     * @private
     */
    _cycleCamera() {
        const presets = CONFIG.camera.presets;
        this.cameraPresetIndex = (this.cameraPresetIndex + 1) % presets.length;
        const preset = presets[this.cameraPresetIndex];

        // Apply preset rotation
        this.camera.rotationX = preset.rotationX;
        this.camera.rotationY = preset.rotationY;

        // Reset velocity to stop any inertia
        this.camera.velocityX = 0;
        this.camera.velocityY = 0;

        // Update button text
        this.cameraButton.text = `View: ${preset.name}`;
    }

    /**
     * Calculate dynamic sizes based on screen dimensions
     * @private
     */
    _updateSizes() {
        const minDim = Math.min(this.width, this.height);
        this.cubeSize = minDim * CONFIG.visual.cubeSizeFraction;
        this.cubeGap = minDim * CONFIG.visual.cubeGapFraction;
    }

    /**
     * Calculate dynamic perspective based on screen size
     * @private
     */
    _getDynamicPerspective() {
        return Math.min(this.width, this.height) * 1.2;
    }

    /**
     * Handle window resize
     */
    onResize() {
        // Recalculate sizes
        this._updateSizes();

        // Update camera perspective
        if (this.camera) {
            this.camera.perspective = this._getDynamicPerspective();
        }

        // Update renderers with new sizes
        if (this.wellRenderer) {
            this.wellRenderer.updateSize(this.cubeSize, this.cubeGap);
        }
        if (this.blockRenderer) {
            this.blockRenderer.updateSize(this.cubeSize, this.cubeGap);
            // Rebuild cubes with new sizes
            this._updateRenderers();
        }
        if (this.nextPieceRenderer) {
            this.nextPieceRenderer.updateSize(this.cubeSize);
        }
    }

    /**
     * Show a centered message
     * @private
     */
    _showMessage(main, sub = "", score = "") {
        this.stateMessage.text = main;
        this.subMessage.text = sub;
        this.gameOverScore.text = score;
    }

    /**
     * Clear the centered message
     * @private
     */
    _clearMessage() {
        this.stateMessage.text = "";
        this.subMessage.text = "";
        this.gameOverScore.text = "";
    }

    /**
     * Handle start/restart
     * @private
     */
    _handleStart() {
        if (this.gameState === GameState.READY || this.gameState === GameState.GAME_OVER) {
            this._startGame();
        } else if (this.gameState === GameState.PAUSED) {
            this._resumeGame();
        }
    }

    /**
     * Handle pause toggle
     * @private
     */
    _handlePause() {
        if (this.gameState === GameState.PLAYING) {
            this._pauseGame();
        } else if (this.gameState === GameState.PAUSED) {
            this._resumeGame();
        }
    }

    /**
     * Start a new game
     * @private
     */
    _startGame() {
        this.gameState = GameState.PLAYING;
        this.score = 0;
        this.level = 1;
        this.linesCleared = 0;

        // Reset grid and piece bag
        this.grid.clear();
        resetPieceBag();
        this.nextPiece = null;

        // Clear hint
        this._clearHint();

        // Spawn first piece
        this._spawnPiece();

        // Clear message
        this._clearMessage();

        // Update UI
        this._updateUI();
    }

    /**
     * Pause the game
     * @private
     */
    _pauseGame() {
        this.gameState = GameState.PAUSED;
        this._showMessage("PAUSED", "Press ESC or ENTER to resume");
    }

    /**
     * Resume the game
     * @private
     */
    _resumeGame() {
        this.gameState = GameState.PLAYING;
        this._clearMessage();
    }

    /**
     * End the game
     * @private
     */
    _gameOver() {
        this.gameState = GameState.GAME_OVER;

        // Stop auto-play
        if (this.autoPlayEnabled) {
            this.autoPlayEnabled = false;
            this.autoPlayButton.text = "Auto";
        }

        this._showMessage(
            "GAME OVER",
            "Press ENTER or click Restart",
            `SCORE: ${this.score}  |  LEVEL: ${this.level}  |  LINES: ${this.linesCleared}`
        );
    }

    /**
     * Spawn a new piece
     * @private
     */
    _spawnPiece() {
        // Use queued next piece, or get first piece
        if (this.nextPiece) {
            this.currentPiece = this.nextPiece;
        } else {
            this.currentPiece = getRandomPiece();
        }

        // Get the NEXT piece from the bag (consumes it properly)
        this.nextPiece = getRandomPiece();
        this.nextPieceType = this.nextPiece.type;

        // Update preview
        const nextShape = SHAPES[this.nextPieceType];
        this.nextPieceRenderer.update(
            this.nextPieceType,
            nextShape.color,
            nextShape.matrix
        );

        // Reset timers
        this.fallTimer = 0;
        this.lockTimer = 0;
        this.isLocking = false;

        // Check if spawn position is blocked (game over)
        const positions = this.currentPiece.getWorldPositions();
        if (!this.grid.canPlace(positions)) {
            this._gameOver();
        }

        // Update renderers
        this._updateRenderers();
    }

    /**
     * Handle movement input
     * @param {number} dx - X direction
     * @param {number} dz - Z direction
     * @private
     */
    _handleMove(dx, dz) {
        if (this.gameState !== GameState.PLAYING || !this.currentPiece) return;

        this._clearHint(); // Clear hint when player moves
        this._tryMove(dx, 0, dz);
    }

    /**
     * Try to move the current piece
     * @param {number} dx
     * @param {number} dy
     * @param {number} dz
     * @returns {boolean} Success
     * @private
     */
    _tryMove(dx, dy, dz) {
        if (!this.currentPiece) return false;

        // Calculate new positions
        const piece = this.currentPiece;
        const newPositions = [];

        for (let z = 0; z < piece.matrix.length; z++) {
            for (let x = 0; x < piece.matrix[z].length; x++) {
                if (piece.matrix[z][x]) {
                    newPositions.push({
                        x: piece.x + x + dx,
                        y: piece.y + dy,
                        z: piece.z + z + dz,
                    });
                }
            }
        }

        // Check collision
        if (this.grid.canPlace(newPositions)) {
            piece.move(dx, dy, dz);
            this._updateRenderers();

            // Reset lock timer if we moved while locking
            if (this.isLocking && (dx !== 0 || dz !== 0)) {
                this.lockTimer = 0;
            }

            return true;
        }

        return false;
    }

    /**
     * Handle rotation input
     * @param {number} direction - 1 for CW, -1 for CCW
     * @private
     */
    _handleRotate(direction) {
        if (this.gameState !== GameState.PLAYING || !this.currentPiece) return;

        this._clearHint(); // Clear hint when player rotates
        this._tryRotate(direction);
    }

    /**
     * Try to rotate the current piece with wall kicks
     * @param {number} direction
     * @returns {boolean} Success
     * @private
     */
    _tryRotate(direction) {
        if (!this.currentPiece) return false;

        const piece = this.currentPiece;

        // Try rotation
        piece.rotate(direction);

        // Check if rotation is valid
        const positions = piece.getWorldPositions();
        if (this.grid.canPlace(positions)) {
            this._updateRenderers();

            // Reset lock timer
            if (this.isLocking) {
                this.lockTimer = 0;
            }

            return true;
        }

        // Try wall kicks
        const kicks = [
            { x: 1, z: 0 },
            { x: -1, z: 0 },
            { x: 0, z: 1 },
            { x: 0, z: -1 },
            { x: 2, z: 0 },
            { x: -2, z: 0 },
        ];

        for (const kick of kicks) {
            piece.x += kick.x;
            piece.z += kick.z;

            const kickPositions = piece.getWorldPositions();
            if (this.grid.canPlace(kickPositions)) {
                this._updateRenderers();

                if (this.isLocking) {
                    this.lockTimer = 0;
                }

                return true;
            }

            // Undo kick
            piece.x -= kick.x;
            piece.z -= kick.z;
        }

        // Rotation failed, undo
        piece.undoRotate(direction);
        return false;
    }

    /**
     * Handle hard drop
     * @private
     */
    _handleHardDrop() {
        if (this.gameState !== GameState.PLAYING || !this.currentPiece) return;

        const piece = this.currentPiece;
        const startY = piece.y;
        const landingY = this.grid.calculateLandingY(piece);

        // Move to landing position
        piece.y = landingY;

        // Add hard drop score
        const dropDistance = landingY - startY;
        this.score += dropDistance * CONFIG.scoring.hardDrop;

        // Lock immediately
        this._lockPiece();
    }

    /**
     * Lock the current piece into the grid
     * @private
     */
    _lockPiece() {
        if (!this.currentPiece) return;

        const positions = this.currentPiece.getWorldPositions();

        // Check for game over (piece locked above playfield)
        const abovePlayfield = positions.some((pos) => pos.y < 0);
        if (abovePlayfield) {
            this._gameOver();
            return;
        }

        // Place piece in grid
        this.grid.placePiece(positions, this.currentPiece.color);

        // Store positions for bounce animation
        const lockedPositions = [...positions];

        // Check for line clears
        const { clearedCount, clearedLayers } = this.grid.checkAndClearLayers();

        if (clearedCount > 0) {
            // Add score
            this._addLineScore(clearedCount);

            // Update lines and level
            this.linesCleared += clearedCount;
            const newLevel = Math.floor(this.linesCleared / CONFIG.leveling.linesPerLevel) + 1;
            if (newLevel > this.level && newLevel <= CONFIG.leveling.maxLevel) {
                this.level = newLevel;
            }
        }

        // Clear current piece
        this.currentPiece = null;
        this.isLocking = false;

        // Update UI
        this._updateUI();

        // Update renderers with bounce animation on locked positions
        this._updateRenderersWithBounce(lockedPositions);

        // Spawn next piece
        this._spawnPiece();
    }

    /**
     * Add score for cleared lines
     * @param {number} count
     * @private
     */
    _addLineScore(count) {
        const scoring = CONFIG.scoring;
        let points = 0;

        switch (count) {
            case 1:
                points = scoring.single;
                break;
            case 2:
                points = scoring.double;
                break;
            case 3:
                points = scoring.triple;
                break;
            case 4:
            default:
                points = scoring.tetris;
                break;
        }

        // Level multiplier
        points *= this.level;

        this.score += points;
    }

    /**
     * Update UI text elements
     * @private
     */
    _updateUI() {
        this.scoreText.text = `SCORE: ${this.score}`;
        this.levelText.text = `LEVEL: ${this.level}`;
        this.linesText.text = `LINES: ${this.linesCleared}`;
    }

    /**
     * Update block renderers
     * @private
     */
    _updateRenderers() {
        // Update piece cubes
        this.blockRenderer.updatePiece(this.currentPiece);

        // Update ghost piece
        if (this.currentPiece) {
            const landingY = this.grid.calculateLandingY(this.currentPiece);
            this.blockRenderer.updateGhost(this.currentPiece, landingY);
        } else {
            this.blockRenderer.updateGhost(null, 0);
        }

        // Update hint ghost
        this.blockRenderer.updateHint(this.hintPositions);

        // Update grid cubes
        this.blockRenderer.updateGrid(this.grid.getFilledCells());
    }

    /**
     * Update renderers with bounce animation for newly locked positions
     * @param {Array<{x: number, y: number, z: number}>} lockedPositions
     * @private
     */
    _updateRenderersWithBounce(lockedPositions) {
        // Update piece cubes
        this.blockRenderer.updatePiece(this.currentPiece);

        // Update ghost piece
        this.blockRenderer.updateGhost(null, 0);

        // Update grid cubes with bounce on new positions
        this.blockRenderer.updateGrid(this.grid.getFilledCells(), lockedPositions);
    }

    /**
     * Calculate current fall speed
     * @returns {number} Seconds per row
     * @private
     */
    _getFallSpeed() {
        let speed = CONFIG.timing.fallSpeed;

        // Apply level speed increase
        for (let i = 1; i < this.level; i++) {
            speed *= CONFIG.leveling.speedMultiplier;
        }

        // Apply soft drop multiplier
        if (this.softDropping) {
            speed /= CONFIG.timing.softDropMultiplier;
        }

        return speed;
    }

    update(dt) {
        super.update(dt);

        // Update camera
        this.camera.update(dt);

        // Don't update game logic if not playing
        if (this.gameState !== GameState.PLAYING) return;

        if (!this.currentPiece) return;

        // Handle auto-play mode
        if (this.autoPlayEnabled) {
            this.autoPlayTimer += dt;
            if (this.autoPlayTimer >= this.autoPlayDelay) {
                this.autoPlayTimer = 0;
                this._autoPlayMove();
                return; // Skip normal falling logic when auto-playing
            }
        }

        // Handle falling
        this.fallTimer += dt;
        const fallSpeed = this._getFallSpeed();

        if (this.fallTimer >= fallSpeed) {
            this.fallTimer = 0;

            // Try to move down
            const moved = this._tryMove(0, 1, 0);

            if (!moved) {
                // Piece hit something, start lock timer
                if (!this.isLocking) {
                    this.isLocking = true;
                    this.lockTimer = 0;
                }
            } else {
                // Piece moved, add soft drop score
                if (this.softDropping) {
                    this.score += CONFIG.scoring.softDrop;
                }

                // Reset locking if we're moving
                if (this.isLocking) {
                    // Check if there's still ground below
                    const checkPositions = [];
                    for (let z = 0; z < this.currentPiece.matrix.length; z++) {
                        for (let x = 0; x < this.currentPiece.matrix[z].length; x++) {
                            if (this.currentPiece.matrix[z][x]) {
                                checkPositions.push({
                                    x: this.currentPiece.x + x,
                                    y: this.currentPiece.y + 1,
                                    z: this.currentPiece.z + z,
                                });
                            }
                        }
                    }

                    if (this.grid.canPlace(checkPositions)) {
                        this.isLocking = false;
                        this.lockTimer = 0;
                    }
                }
            }
        }

        // Handle lock delay
        if (this.isLocking) {
            this.lockTimer += dt;

            if (this.lockTimer >= CONFIG.timing.lockDelay) {
                this._lockPiece();
            }
        }
    }

    render() {
        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Clear canvas manually
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, this.width, this.height);

        // Render 3D content first
        this.wellRenderer.render(ctx, centerX, centerY);
        this.blockRenderer.render(ctx, centerX, centerY);

        // Render next piece preview
        const previewX = this.width - 70;
        const previewY = 80;
        this.nextPieceRenderer.render(ctx, previewX, previewY);

        // Draw overlay for game over / paused / ready states
        if (this.gameState !== GameState.PLAYING) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(0, 0, this.width, this.height);
        }

        // Render UI pipeline last (text on top of overlay)
        this.pipeline.render();
    }
}

// Start the game
window.addEventListener("load", () => {
    const canvas = document.getElementById("game");
    const game = new Tetris3DGame(canvas);
    game.start();
});
