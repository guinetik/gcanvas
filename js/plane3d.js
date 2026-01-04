import {
    Game,
    Plane3D,
    FPSCounter,
} from "/gcanvas.es.min.js";
import { Camera3D } from "/gcanvas.es.min.js";

/**
 * Configuration for the Plane3D showcase demo
 * Sizes are calculated dynamically based on screen size
 */
const CONFIG = {
    // Base sizes (will be scaled)
    basePlaneWidth: 0.12,   // fraction of min(width, height)
    basePlaneHeight: 0.09,  // fraction of min(width, height)
    baseSpacing: 0.18,      // fraction of width

    camera: {
        perspective: 800,
        rotationX: 0.3,
        rotationY: -0.4,
        inertia: true,
        friction: 0.95,
    },

    selfRotation: {
        speed: 0.8, // radians per second
    },

    solidPlane: {
        color: "#4A90D9",
    },

    gradientPlane: {
        color1: [1.0, 0.2, 0.4],
        color2: [0.2, 0.4, 1.0],
        angle: Math.PI / 4,
    },

    gridPlane: {
        lineColor: [0.2, 0.9, 0.4],
        backgroundColor: [0.1, 0.1, 0.15],
        gridSize: 8.0,
        lineWidth: 0.06,
    },
};

/**
 * PlaneData - Holds plane and its world position
 */
class PlaneData {
    constructor(plane, worldX, worldY, worldZ, label) {
        this.plane = plane;
        this.worldX = worldX;
        this.worldY = worldY;
        this.worldZ = worldZ;
        this.label = label;
    }
}

/**
 * Plane3DDemo - Showcases different Plane3D rendering modes
 */
class Plane3DDemo extends Game {
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

        // Plane 1: Solid Color (Canvas 2D rendering)
        const solidPlane = new Plane3D(
            this.planeWidth,
            this.planeHeight,
            {
                color: CONFIG.solidPlane.color,
                camera: this.camera,
            }
        );
        this.solidData = new PlaneData(
            solidPlane,
            -this.spacing,
            0,
            0,
            "Solid Color"
        );

        // Plane 2: Gradient (WebGL shader)
        const gradientPlane = new Plane3D(
            this.planeWidth,
            this.planeHeight,
            {
                camera: this.camera,
                useShader: true,
                shaderType: "gradient",
                shaderUniforms: {
                    uColor1: CONFIG.gradientPlane.color1,
                    uColor2: CONFIG.gradientPlane.color2,
                    uAngle: CONFIG.gradientPlane.angle,
                },
            }
        );
        this.gradientData = new PlaneData(gradientPlane, 0, 0, 0, "Gradient");

        // Plane 3: Grid (WebGL shader)
        const gridPlane = new Plane3D(
            this.planeWidth,
            this.planeHeight,
            {
                camera: this.camera,
                useShader: true,
                shaderType: "grid",
                shaderUniforms: {
                    uLineColor: CONFIG.gridPlane.lineColor,
                    uBackgroundColor: CONFIG.gridPlane.backgroundColor,
                    uGridSize: CONFIG.gridPlane.gridSize,
                    uLineWidth: CONFIG.gridPlane.lineWidth,
                },
            }
        );
        this.gridData = new PlaneData(gridPlane, this.spacing, 0, 0, "Grid");

        // Store all plane data for rendering
        this.planeDataList = [this.solidData, this.gradientData, this.gridData];

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
        this.planeWidth = minDim * CONFIG.basePlaneWidth;
        this.planeHeight = minDim * CONFIG.basePlaneHeight;
        this.spacing = this.width * CONFIG.baseSpacing;
    }

    /**
     * Handle window resize
     */
    onResize() {
        this._updateSizes();

        // Update plane dimensions
        if (this.planeDataList) {
            for (const data of this.planeDataList) {
                data.plane.planeWidth = this.planeWidth;
                data.plane.planeHeight = this.planeHeight;
                data.plane._generateGeometry();
            }

            // Update world positions
            this.solidData.worldX = -this.spacing;
            this.gradientData.worldX = 0;
            this.gridData.worldX = this.spacing;
        }
    }

    update(dt) {
        super.update(dt);

        // Update camera (for inertia)
        this.camera.update(dt);

        // Update self-rotation for all planes
        for (const data of this.planeDataList) {
            data.plane.selfRotationY += CONFIG.selfRotation.speed * dt;
        }
    }

    render() {
        super.render();

        const ctx = this.ctx;
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        // Project and sort by depth (back to front)
        const projected = this.planeDataList.map((data) => {
            const proj = this.camera.project(
                data.worldX,
                data.worldY,
                data.worldZ
            );
            return { data, proj };
        });
        projected.sort((a, b) => b.proj.z - a.proj.z);

        // Render each plane at its projected position
        for (const { data, proj } of projected) {
            ctx.save();
            // Translate to screen center + projected position
            ctx.translate(centerX + proj.x, centerY + proj.y);
            // Scale by perspective
            ctx.scale(proj.scale, proj.scale);
            // Render plane at origin
            data.plane.draw();
            ctx.restore();
        }

        // Render labels (always on top)
        this.renderLabels(projected, centerX, centerY);
    }

    /**
     * Render plane labels at projected positions
     */
    renderLabels(projected, centerX, centerY) {
        const ctx = this.ctx;

        for (const { data, proj } of projected) {
            // Calculate label position below the plane
            const screenX = centerX + proj.x;
            const screenY =
                centerY +
                proj.y +
                (this.planeHeight / 2) * proj.scale +
                25;

            ctx.font = "14px monospace";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(data.label, screenX, screenY);
        }
    }
}

// Start the demo
window.addEventListener("load", () => {
    const canvas = document.getElementById("game");
    const demo = new Plane3DDemo(canvas);
    demo.start();
});
