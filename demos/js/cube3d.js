import {
    Game,
    Cube3D,
    FPSCounter,
    Button,
    Scene,
    Text,
    Position,
    verticalLayout,
    applyLayout,
} from "../../src/index.js";
import { Camera3D } from "../../src/util/camera3d.js";

/**
 * Configuration for the Rubik's Cube demo
 * Sizes are calculated dynamically based on screen size
 */
const CONFIG = {
    // Base sizes (will be scaled)
    baseCubeletSize: 0.06,  // fraction of min(width, height)
    baseGap: 0.004,         // fraction of min(width, height)

    camera: {
        perspective: 800,
        rotationX: 0.4,
        rotationY: -0.5,
        inertia: true,
        friction: 0.95,
        clampX: false, // Allow full rotation
    },

    selfRotation: {
        speed: 0.25, // radians per second (gentle rotation)
        pauseDuringAnimation: true, // pause global rotation during layer animation
    },

    // Standard Rubik's cube colors
    colors: {
        white: "#FFFFFF",
        yellow: "#FFD500",
        red: "#B71234",
        orange: "#FF5800",
        blue: "#0046AD",
        green: "#009B48",
        black: "#0A0A0A", // interior faces
    },

    // Terminal aesthetic - sticker mode with green grid
    sticker: {
        enabled: true,
        margin: 0.12,           // Sticker inset as fraction of face
        backgroundColor: "#0A0A0A", // Black plastic
        strokeColor: "#00FF41",  // Terminal green
        lineWidth: 1.5,
    },

    // Layer rotation animation
    layerAnimation: {
        duration: 0.3,  // seconds per layer rotation
        shuffleMoves: 20, // number of random moves in shuffle
        shuffleDelay: 0.05, // delay between shuffle moves (seconds)
    },
};

/**
 * CubeletData - Holds cubelet and its grid position + face colors
 */
class CubeletData {
    constructor(cubelet, gridX, gridY, gridZ, faceColors) {
        this.cubelet = cubelet;
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridZ = gridZ;
        // Store face colors separately for rotation tracking
        this.faceColors = { ...faceColors };
        // Extra rotation for layer animation
        this.layerRotationX = 0;
        this.layerRotationY = 0;
        this.layerRotationZ = 0;
    }
}

/**
 * Layer rotation move definition
 */
class LayerMove {
    constructor(axis, layer, direction) {
        this.axis = axis;       // 'x', 'y', or 'z'
        this.layer = layer;     // -1, 0, or 1
        this.direction = direction; // 1 (CW) or -1 (CCW)
    }
}

/**
 * RubiksCubeDemo - Showcases Cube3D with a 3x3x3 Rubik's cube
 * Features layer rotation and shuffle animation
 */
class RubiksCubeDemo extends Game {
    constructor(canvas) {
        super(canvas);
        this.backgroundColor = "#000000";
        this.enableFluidSize();
    }

    init() {
        super.init();

        // Create camera with mouse controls
        this.camera = new Camera3D({
            perspective: CONFIG.camera.perspective,
            rotationX: CONFIG.camera.rotationX,
            rotationY: CONFIG.camera.rotationY,
            inertia: CONFIG.camera.inertia,
            friction: CONFIG.camera.friction,
            clampX: CONFIG.camera.clampX,
        });
        this.camera.enableMouseControl(this.canvas);

        // Calculate initial sizes based on screen
        this._updateSizes();

        // Create 3x3x3 grid of cubelets
        this._createCubelets();

        // Global self-rotation angle (shared by all cubelets)
        this.globalRotationY = 0;

        // Layer animation state
        this.animatingLayer = null;  // Current LayerMove being animated
        this.animationProgress = 0;  // 0 to 1
        this.animationQueue = [];    // Queue of moves to perform
        this.moveHistory = [];       // Track all moves for solving
        this.isSolving = false;      // Don't track moves during solve

        // Create buttons
        this.shuffleButton = new Button(this, {
            text: "SHUFFLE",
            width: 100,
            height: 40,
            font: "bold 14px monospace",
            onClick: () => this._startShuffle(),
        });

        this.solveButton = new Button(this, {
            text: "SOLVE",
            width: 100,
            height: 40,
            font: "bold 14px monospace",
            onClick: () => this._startSolve(),
        });

        // Layout buttons vertically and add to anchored scene
        const buttons = [this.shuffleButton, this.solveButton];
        const layout = verticalLayout(buttons, { spacing: 10 });
        applyLayout(buttons, layout.positions);

        this.buttonPanel = new Scene(this, {
            anchor: "bottom-left",
            width: 100,
            height: 100,
            anchorOffsetY: -50,
        });
        buttons.forEach(btn => this.buttonPanel.add(btn));
        this.pipeline.add(this.buttonPanel);

        // Add FPS counter
        this.pipeline.add(
            new FPSCounter(this, {
                anchor: "bottom-right",
            })
        );

        // Camera rotation text
        this.cameraText = new Text(this, "", {
            font: "12px monospace",
            anchor: Position.BOTTOM_CENTER,
            color: "#00FF41",
        });
        this.pipeline.add(this.cameraText);
    }

    /**
     * Calculate sizes based on current screen dimensions
     */
    _updateSizes() {
        const minDim = Math.min(this.width, this.height);
        this.cubeletSize = minDim * CONFIG.baseCubeletSize;
        this.gap = minDim * CONFIG.baseGap;
    }

    /**
     * Create or recreate the 3x3x3 grid of cubelets
     */
    _createCubelets() {
        this.cubelets = [];

        for (let gx = -1; gx <= 1; gx++) {
            for (let gy = -1; gy <= 1; gy++) {
                for (let gz = -1; gz <= 1; gz++) {
                    const faceColors = this._getFaceColors(gx, gy, gz);
                    const cubelet = this._createCubelet(gx, gy, gz, faceColors);
                    this.cubelets.push(new CubeletData(cubelet, gx, gy, gz, faceColors));
                }
            }
        }
    }

    /**
     * Get face colors based on grid position
     */
    _getFaceColors(gridX, gridY, gridZ) {
        return {
            front: gridZ === -1 ? CONFIG.colors.red : CONFIG.colors.black,
            back: gridZ === 1 ? CONFIG.colors.orange : CONFIG.colors.black,
            top: gridY === -1 ? CONFIG.colors.white : CONFIG.colors.black,
            bottom: gridY === 1 ? CONFIG.colors.yellow : CONFIG.colors.black,
            left: gridX === -1 ? CONFIG.colors.green : CONFIG.colors.black,
            right: gridX === 1 ? CONFIG.colors.blue : CONFIG.colors.black,
        };
    }

    /**
     * Handle window resize
     */
    onResize() {
        this._updateSizes();

        // Recreate cubelets with new sizes but preserve colors
        if (this.cubelets) {
            const currentRotation = this.globalRotationY;
            const savedColors = this.cubelets.map(d => ({
                gridX: d.gridX,
                gridY: d.gridY,
                gridZ: d.gridZ,
                faceColors: { ...d.faceColors }
            }));

            this.cubelets = [];
            for (const saved of savedColors) {
                const cubelet = this._createCubelet(
                    saved.gridX, saved.gridY, saved.gridZ, saved.faceColors
                );
                this.cubelets.push(new CubeletData(
                    cubelet, saved.gridX, saved.gridY, saved.gridZ, saved.faceColors
                ));
            }

            // Restore rotation
            for (const data of this.cubelets) {
                data.cubelet.selfRotationY = currentRotation;
            }
        }
    }

    /**
     * Create a single cubelet at the given grid position with specified colors
     */
    _createCubelet(gridX, gridY, gridZ, faceColors) {
        const offset = this.cubeletSize + this.gap;
        const x = gridX * offset;
        const y = gridY * offset;
        const z = gridZ * offset;

        return new Cube3D(this.cubeletSize, {
            x,
            y,
            z,
            camera: this.camera,
            faceColors,
            stickerMode: CONFIG.sticker.enabled,
            stickerMargin: CONFIG.sticker.margin,
            stickerBackgroundColor: CONFIG.sticker.backgroundColor,
            stroke: CONFIG.sticker.strokeColor,
            lineWidth: CONFIG.sticker.lineWidth,
        });
    }

    /**
     * Start shuffle animation
     */
    _startShuffle() {
        if (this.animatingLayer || this.animationQueue.length > 0) {
            return; // Already animating
        }

        this.isSolving = false; // Track moves during shuffle

        // Generate random moves
        const axes = ['x', 'y', 'z'];
        const layers = [-1, 0, 1];
        const directions = [1, -1];

        for (let i = 0; i < CONFIG.layerAnimation.shuffleMoves; i++) {
            const axis = axes[Math.floor(Math.random() * axes.length)];
            const layer = layers[Math.floor(Math.random() * layers.length)];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            this.animationQueue.push(new LayerMove(axis, layer, direction));
        }

        // Start first move
        this._startNextMove();
    }

    /**
     * Start solve animation - reverse all moves in history
     */
    _startSolve() {
        if (this.animatingLayer || this.animationQueue.length > 0) {
            return; // Already animating
        }

        if (this.moveHistory.length === 0) {
            return; // Already solved
        }

        this.isSolving = true; // Don't track moves during solve

        // Reverse all moves in history (LIFO order, opposite direction)
        for (let i = this.moveHistory.length - 1; i >= 0; i--) {
            const move = this.moveHistory[i];
            // Reverse the direction
            this.animationQueue.push(new LayerMove(move.axis, move.layer, -move.direction));
        }

        // Clear history since we're solving
        this.moveHistory = [];

        // Start first move
        this._startNextMove();
    }

    /**
     * Start the next move in the queue
     */
    _startNextMove() {
        if (this.animationQueue.length === 0) {
            this.animatingLayer = null;
            return;
        }

        this.animatingLayer = this.animationQueue.shift();
        this.animationProgress = 0;
    }

    /**
     * Get cubelets in a specific layer
     */
    _getCubeletsInLayer(axis, layer) {
        return this.cubelets.filter(data => {
            switch (axis) {
                case 'x': return data.gridX === layer;
                case 'y': return data.gridY === layer;
                case 'z': return data.gridZ === layer;
            }
            return false;
        });
    }

    /**
     * Apply layer rotation completion - update grid positions and face colors
     */
    _completeLayerRotation(move) {
        // Track this move for solving (only if not currently solving)
        if (!this.isSolving) {
            this.moveHistory.push(new LayerMove(move.axis, move.layer, move.direction));
        }

        const layerCubelets = this._getCubeletsInLayer(move.axis, move.layer);

        for (const data of layerCubelets) {
            // Reset layer rotation
            data.layerRotationX = 0;
            data.layerRotationY = 0;
            data.layerRotationZ = 0;

            // Update grid positions based on rotation
            const { gridX, gridY, gridZ } = data;
            let newX = gridX, newY = gridY, newZ = gridZ;

            // Rotate grid position 90 degrees around axis
            switch (move.axis) {
                case 'x':
                    // Rotate around X: Y and Z swap
                    newY = move.direction * gridZ;
                    newZ = -move.direction * gridY;
                    break;
                case 'y':
                    // Rotate around Y: X and Z swap
                    newX = -move.direction * gridZ;
                    newZ = move.direction * gridX;
                    break;
                case 'z':
                    // Rotate around Z: X and Y swap
                    newX = move.direction * gridY;
                    newY = -move.direction * gridX;
                    break;
            }

            data.gridX = newX;
            data.gridY = newY;
            data.gridZ = newZ;

            // Rotate face colors to match grid rotation direction
            // The face colors must cycle in the same direction as the grid positions
            const oldColors = { ...data.faceColors };
            switch (move.axis) {
                case 'x':
                    // X-axis: rotates Y and Z, keeping X faces (left/right) fixed
                    // Grid: top→back→bottom→front (dir=1) or reverse (dir=-1)
                    if (move.direction === 1) {
                        data.faceColors.back = oldColors.top;
                        data.faceColors.bottom = oldColors.back;
                        data.faceColors.front = oldColors.bottom;
                        data.faceColors.top = oldColors.front;
                    } else {
                        data.faceColors.front = oldColors.top;
                        data.faceColors.bottom = oldColors.front;
                        data.faceColors.back = oldColors.bottom;
                        data.faceColors.top = oldColors.back;
                    }
                    break;
                case 'y':
                    // Y-axis: rotates X and Z, keeping Y faces (top/bottom) fixed
                    // Grid: front→right→back→left (dir=1) or reverse (dir=-1)
                    if (move.direction === 1) {
                        data.faceColors.right = oldColors.front;
                        data.faceColors.back = oldColors.right;
                        data.faceColors.left = oldColors.back;
                        data.faceColors.front = oldColors.left;
                    } else {
                        data.faceColors.left = oldColors.front;
                        data.faceColors.back = oldColors.left;
                        data.faceColors.right = oldColors.back;
                        data.faceColors.front = oldColors.right;
                    }
                    break;
                case 'z':
                    // Z-axis: rotates X and Y, keeping Z faces (front/back) fixed
                    // Grid: left→bottom→right→top (dir=1) or reverse (dir=-1)
                    if (move.direction === 1) {
                        data.faceColors.bottom = oldColors.left;
                        data.faceColors.right = oldColors.bottom;
                        data.faceColors.top = oldColors.right;
                        data.faceColors.left = oldColors.top;
                    } else {
                        data.faceColors.top = oldColors.left;
                        data.faceColors.right = oldColors.top;
                        data.faceColors.bottom = oldColors.right;
                        data.faceColors.left = oldColors.bottom;
                    }
                    break;
            }

            // Update cubelet position and colors
            const offset = this.cubeletSize + this.gap;
            data.cubelet.x = data.gridX * offset;
            data.cubelet.y = data.gridY * offset;
            data.cubelet.z = data.gridZ * offset;
            data.cubelet.setFaceColors(data.faceColors);
        }
    }

    update(dt) {
        super.update(dt);

        // Update camera (for inertia)
        this.camera.update(dt);

        // Handle layer animation
        if (this.animatingLayer) {
            this.animationProgress += dt / CONFIG.layerAnimation.duration;

            if (this.animationProgress >= 1) {
                // Complete this move
                this._completeLayerRotation(this.animatingLayer);
                this._startNextMove();
            } else {
                // Animate layer rotation
                const angle = (Math.PI / 2) * this.animationProgress * this.animatingLayer.direction;
                const layerCubelets = this._getCubeletsInLayer(
                    this.animatingLayer.axis,
                    this.animatingLayer.layer
                );

                for (const data of layerCubelets) {
                    switch (this.animatingLayer.axis) {
                        case 'x':
                            data.layerRotationX = angle;
                            break;
                        case 'y':
                            data.layerRotationY = angle;
                            break;
                        case 'z':
                            data.layerRotationZ = angle;
                            break;
                    }
                }
            }
        }

        // Update global rotation (pause during animation if configured)
        if (!this.animatingLayer || !CONFIG.selfRotation.pauseDuringAnimation) {
            this.globalRotationY += CONFIG.selfRotation.speed * dt;
        }

        // Apply same base rotation to all cubelets
        for (const data of this.cubelets) {
            data.cubelet.selfRotationY = this.globalRotationY;
        }

        // Update camera rotation text
        this.cameraText.text = `Camera: X:${this.camera.rotationX.toFixed(2)} Y:${this.camera.rotationY.toFixed(2)}`;
    }

    render() {
        super.render();

        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const hs = this.cubeletSize / 2;

        // Collect ALL faces from ALL cubelets for global depth sorting
        const allFaces = [];

        // Face definitions: local corners relative to cubelet center
        const faceDefinitions = {
            front:  { corners: [[-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1]], normal: [0,0,-1] },
            back:   { corners: [[1,-1,1], [-1,-1,1], [-1,1,1], [1,1,1]], normal: [0,0,1] },
            top:    { corners: [[-1,-1,1], [1,-1,1], [1,-1,-1], [-1,-1,-1]], normal: [0,-1,0] },
            bottom: { corners: [[-1,1,-1], [1,1,-1], [1,1,1], [-1,1,1]], normal: [0,1,0] },
            left:   { corners: [[-1,-1,1], [-1,-1,-1], [-1,1,-1], [-1,1,1]], normal: [-1,0,0] },
            right:  { corners: [[1,-1,-1], [1,-1,1], [1,1,1], [1,1,-1]], normal: [1,0,0] },
        };

        for (const data of this.cubelets) {
            const cubelet = data.cubelet;

            // Layer rotations (in cube's local space)
            const layerX = data.layerRotationX;
            const layerY = data.layerRotationY;
            const layerZ = data.layerRotationZ;
            // Global rotation (applied after layer rotation)
            const globalY = this.globalRotationY;

            // Process each face
            for (const [faceName, faceDef] of Object.entries(faceDefinitions)) {
                const color = data.faceColors[faceName];

                // Transform corners: LAYER rotation first, then GLOBAL rotation
                const worldCorners = faceDef.corners.map(([lx, ly, lz]) => {
                    // Scale to cubelet size
                    let x = lx * hs;
                    let y = ly * hs;
                    let z = lz * hs;

                    // Also transform cubelet position
                    let px = cubelet.x, py = cubelet.y, pz = cubelet.z;

                    // 1. Apply LAYER rotation first (in cube's local space)
                    // X-axis layer rotation
                    if (layerX !== 0) {
                        const cosX = Math.cos(layerX), sinX = Math.sin(layerX);
                        // Rotate face vertex
                        let y1 = y * cosX - z * sinX;
                        let z1 = y * sinX + z * cosX;
                        y = y1; z = z1;
                        // Rotate position
                        let py1 = py * cosX - pz * sinX;
                        let pz1 = py * sinX + pz * cosX;
                        py = py1; pz = pz1;
                    }

                    // Y-axis layer rotation
                    if (layerY !== 0) {
                        const cosLY = Math.cos(layerY), sinLY = Math.sin(layerY);
                        let x1 = x * cosLY - z * sinLY;
                        let z1 = x * sinLY + z * cosLY;
                        x = x1; z = z1;
                        let px1 = px * cosLY - pz * sinLY;
                        let pz1 = px * sinLY + pz * cosLY;
                        px = px1; pz = pz1;
                    }

                    // Z-axis layer rotation
                    if (layerZ !== 0) {
                        const cosZ = Math.cos(layerZ), sinZ = Math.sin(layerZ);
                        let x1 = x * cosZ - y * sinZ;
                        let y1 = x * sinZ + y * cosZ;
                        x = x1; y = y1;
                        let px1 = px * cosZ - py * sinZ;
                        let py1 = px * sinZ + py * cosZ;
                        px = px1; py = py1;
                    }

                    // 2. Apply GLOBAL rotation (whole cube spin)
                    const cosGY = Math.cos(globalY), sinGY = Math.sin(globalY);
                    let xg = x * cosGY - z * sinGY;
                    let zg = x * sinGY + z * cosGY;
                    x = xg; z = zg;
                    let pxg = px * cosGY - pz * sinGY;
                    let pzg = px * sinGY + pz * cosGY;
                    px = pxg; pz = pzg;

                    return { x: x + px, y: y + py, z: z + pz };
                });

                // Transform normal: same order - layer first, then global
                let [nx, ny, nz] = faceDef.normal;

                // Layer rotations
                if (layerX !== 0) {
                    const cosX = Math.cos(layerX), sinX = Math.sin(layerX);
                    let ny1 = ny * cosX - nz * sinX;
                    let nz1 = ny * sinX + nz * cosX;
                    ny = ny1; nz = nz1;
                }
                if (layerY !== 0) {
                    const cosLY = Math.cos(layerY), sinLY = Math.sin(layerY);
                    let nx1 = nx * cosLY - nz * sinLY;
                    let nz1 = nx * sinLY + nz * cosLY;
                    nx = nx1; nz = nz1;
                }
                if (layerZ !== 0) {
                    const cosZ = Math.cos(layerZ), sinZ = Math.sin(layerZ);
                    let nx1 = nx * cosZ - ny * sinZ;
                    let ny1 = nx * sinZ + ny * cosZ;
                    nx = nx1; ny = ny1;
                }

                // Global Y rotation
                const cosGY = Math.cos(globalY), sinGY = Math.sin(globalY);
                let nxg = nx * cosGY - nz * sinGY;
                let nzg = nx * sinGY + nz * cosGY;
                nx = nxg; nz = nzg;

                // Apply camera rotation to normal for backface culling
                let vnx = nx, vny = ny, vnz = nz;
                const camCosY = Math.cos(this.camera.rotationY);
                const camSinY = Math.sin(this.camera.rotationY);
                let vnx1 = vnx * camCosY - vnz * camSinY;
                let vnz1 = vnx * camSinY + vnz * camCosY;
                vnx = vnx1; vnz = vnz1;

                const camCosX = Math.cos(this.camera.rotationX);
                const camSinX = Math.sin(this.camera.rotationX);
                let vny1 = vny * camCosX - vnz * camSinX;
                let vnz2 = vny * camSinX + vnz * camCosX;
                vny = vny1; vnz = vnz2;

                // Backface culling
                if (vnz > 0.01) continue;

                // Project corners
                const projectedCorners = worldCorners.map(c => this.camera.project(c.x, c.y, c.z));

                // Calculate average depth for sorting
                const avgDepth = projectedCorners.reduce((sum, p) => sum + p.z, 0) / 4;

                // Calculate lighting
                const intensity = this._calculateLighting(vnx, vny, vnz);

                allFaces.push({
                    corners: projectedCorners,
                    color,
                    depth: avgDepth,
                    intensity,
                    isSticker: cubelet.stickerMode,
                    stickerMargin: cubelet.stickerMargin,
                    stickerBg: cubelet.stickerBackgroundColor,
                    stroke: cubelet.stroke,
                    lineWidth: cubelet.lineWidth,
                });
            }
        }

        // Sort all faces by depth (back to front)
        allFaces.sort((a, b) => b.depth - a.depth);

        // Render all faces
        for (const face of allFaces) {
            const corners = face.corners;

            ctx.beginPath();
            ctx.moveTo(centerX + corners[0].x, centerY + corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                ctx.lineTo(centerX + corners[i].x, centerY + corners[i].y);
            }
            ctx.closePath();

            if (face.isSticker) {
                // Sticker mode: black background + colored sticker
                const bgColor = this._applyLightingToColor(face.stickerBg, face.intensity);
                ctx.fillStyle = bgColor;
                ctx.fill();

                if (face.stroke) {
                    ctx.strokeStyle = face.stroke;
                    ctx.lineWidth = face.lineWidth;
                    ctx.stroke();
                }

                // Draw inset sticker
                const stickerCorners = this._getInsetCorners(corners, face.stickerMargin, centerX, centerY);
                ctx.beginPath();
                ctx.moveTo(stickerCorners[0].x, stickerCorners[0].y);
                for (let i = 1; i < stickerCorners.length; i++) {
                    ctx.lineTo(stickerCorners[i].x, stickerCorners[i].y);
                }
                ctx.closePath();
                ctx.fillStyle = this._applyLightingToColor(face.color, face.intensity);
                ctx.fill();
            } else {
                ctx.fillStyle = this._applyLightingToColor(face.color, face.intensity);
                ctx.fill();

                if (face.stroke) {
                    ctx.strokeStyle = face.stroke;
                    ctx.lineWidth = face.lineWidth;
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * Calculate inset corners for sticker rendering
     */
    _getInsetCorners(corners, margin, centerX, centerY) {
        // Calculate center of the face
        let cx = 0, cy = 0;
        for (const c of corners) {
            cx += centerX + c.x;
            cy += centerY + c.y;
        }
        cx /= corners.length;
        cy /= corners.length;

        // Inset each corner towards center
        const insetFactor = 1 - margin * 2;
        return corners.map(c => ({
            x: cx + (centerX + c.x - cx) * insetFactor,
            y: cy + (centerY + c.y - cy) * insetFactor,
        }));
    }

    /**
     * Calculate lighting intensity
     */
    _calculateLighting(nx, ny, nz) {
        const lightX = 0.5, lightY = -0.7, lightZ = -0.5;
        const len = Math.sqrt(lightX*lightX + lightY*lightY + lightZ*lightZ);
        const lx = lightX/len, ly = lightY/len, lz = lightZ/len;
        let intensity = -(nx*lx + ny*ly + nz*lz);
        return Math.max(0, intensity) * 0.6 + 0.4;
    }

    /**
     * Apply lighting to a hex color
     */
    _applyLightingToColor(color, intensity) {
        if (!color || !color.startsWith('#')) return color;
        const hex = color.replace('#', '');
        const r = Math.round(parseInt(hex.substring(0,2), 16) * intensity);
        const g = Math.round(parseInt(hex.substring(2,4), 16) * intensity);
        const b = Math.round(parseInt(hex.substring(4,6), 16) * intensity);
        return `rgb(${r},${g},${b})`;
    }

    /**
     * Apply Y-axis rotation to a point
     */
    _applyRotation(x, y, z, angle) {
        const cosY = Math.cos(angle);
        const sinY = Math.sin(angle);
        return {
            x: x * cosY - z * sinY,
            y: y,
            z: x * sinY + z * cosY,
        };
    }
}

// Start the demo
window.addEventListener("load", () => {
    const canvas = document.getElementById("game");
    const demo = new RubiksCubeDemo(canvas);
    demo.start();
});
