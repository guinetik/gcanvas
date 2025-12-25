import {
    Game,
    Cube3D,
    FPSCounter,
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
    },

    selfRotation: {
        speed: 0.25, // radians per second (gentle rotation)
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
};

/**
 * CubeletData - Holds cubelet and its grid position
 */
class CubeletData {
    constructor(cubelet, gridX, gridY, gridZ) {
        this.cubelet = cubelet;
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridZ = gridZ;
    }
}

/**
 * RubiksCubeDemo - Showcases Cube3D with a 3x3x3 Rubik's cube
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
        });
        this.camera.enableMouseControl(this.canvas);

        // Calculate initial sizes based on screen
        this._updateSizes();

        // Create 3x3x3 grid of cubelets
        this._createCubelets();

        // Global self-rotation angle (shared by all cubelets)
        this.globalRotationY = 0;

        // Add FPS counter
        this.pipeline.add(
            new FPSCounter(this, {
                anchor: "bottom-right",
            })
        );
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
                    const cubelet = this._createCubelet(gx, gy, gz);
                    this.cubelets.push(new CubeletData(cubelet, gx, gy, gz));
                }
            }
        }
    }

    /**
     * Handle window resize
     */
    onResize() {
        this._updateSizes();

        // Recreate cubelets with new sizes
        if (this.cubelets) {
            const currentRotation = this.globalRotationY;
            this._createCubelets();
            // Restore rotation
            for (const data of this.cubelets) {
                data.cubelet.selfRotationY = currentRotation;
            }
        }
    }

    /**
     * Create a single cubelet at the given grid position
     * Face colors are determined by position on the cube surface
     */
    _createCubelet(gridX, gridY, gridZ) {
        // Calculate world position
        const offset = this.cubeletSize + this.gap;
        const x = gridX * offset;
        const y = gridY * offset;
        const z = gridZ * offset;

        // Determine face colors based on grid position
        // Outer faces get colors, inner faces are black
        const faceColors = {
            front: gridZ === -1 ? CONFIG.colors.red : CONFIG.colors.black,
            back: gridZ === 1 ? CONFIG.colors.orange : CONFIG.colors.black,
            top: gridY === -1 ? CONFIG.colors.white : CONFIG.colors.black,
            bottom: gridY === 1 ? CONFIG.colors.yellow : CONFIG.colors.black,
            left: gridX === -1 ? CONFIG.colors.green : CONFIG.colors.black,
            right: gridX === 1 ? CONFIG.colors.blue : CONFIG.colors.black,
        };

        return new Cube3D(this.cubeletSize, {
            x,
            y,
            z,
            camera: this.camera,
            faceColors,
            stroke: "#111", // subtle edge lines
            lineWidth: 0.5,
        });
    }

    update(dt) {
        super.update(dt);

        // Update camera (for inertia)
        this.camera.update(dt);

        // Update global rotation
        this.globalRotationY += CONFIG.selfRotation.speed * dt;

        // Apply same rotation to all cubelets
        for (const data of this.cubelets) {
            data.cubelet.selfRotationY = this.globalRotationY;
        }
    }

    render() {
        super.render();

        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Collect all cubelet centers for depth sorting
        const cubeletProjections = [];

        for (const data of this.cubelets) {
            const cubelet = data.cubelet;

            // Apply self-rotation to cubelet's base position to get world position
            const rotatedPos = this._applyRotation(
                cubelet.x,
                cubelet.y,
                cubelet.z,
                this.globalRotationY
            );

            // Project center for depth sorting
            const proj = this.camera.project(
                rotatedPos.x,
                rotatedPos.y,
                rotatedPos.z
            );

            cubeletProjections.push({
                data,
                proj,
                rotatedPos,
            });
        }

        // Sort by depth (back to front)
        cubeletProjections.sort((a, b) => b.proj.z - a.proj.z);

        // Render each cubelet
        for (const { data, proj } of cubeletProjections) {
            ctx.save();
            // Translate to screen center + projected position
            ctx.translate(centerX + proj.x, centerY + proj.y);
            // Scale by perspective
            ctx.scale(proj.scale, proj.scale);

            // Temporarily zero out cubelet position since we've already translated
            const originalX = data.cubelet.x;
            const originalY = data.cubelet.y;
            const originalZ = data.cubelet.z;
            data.cubelet.x = 0;
            data.cubelet.y = 0;
            data.cubelet.z = 0;

            // Render the cubelet
            data.cubelet.draw();

            // Restore position
            data.cubelet.x = originalX;
            data.cubelet.y = originalY;
            data.cubelet.z = originalZ;

            ctx.restore();
        }
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
