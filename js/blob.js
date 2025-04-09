import {
    Game,
    Scene,
    FPSCounter,
    Painter,
    ShapeGOFactory,
    BezierShape,
    Circle,
    Rectangle,
    Button,
    HorizontalLayout,
    Tween,
} from "/gcanvas/gcanvas.es.min.js";

/**
 * BezierBlob Game - A playful blob that follows the mouse with Tween animations
 */
class BezierBlobGame extends Game {
    constructor(canvas) {
        super(canvas);
        this.enableFluidSize();
        this.backgroundColor = "#111122";
    }

    init() {
        this.blobScene = new BlobScene(this);
        this.uiScene = new BlobUIScene(this, this.blobScene);

        this.pipeline.add(this.blobScene);
        this.pipeline.add(this.uiScene);
    }
}

/**
 * Main scene containing the blob and handling interactions
 */
class BlobScene extends Scene {
    constructor(game) {
        super(game);

        // Create a background that will receive mouse events
        this.bg = ShapeGOFactory.create(
            game,
            new Rectangle(0, 0, game.width, game.height, {
                fillColor: "rgba(0, 0, 0, 0)",
            })
        );
        this.add(this.bg);
        this.bg.enableInteractivity(this.bg.shape);

        // Mouse position tracking
        this.mouseX = game.width / 2;
        this.mouseY = game.height / 2;

        // Forward mouse events
        this.bg.on("inputmove", (e) => {
            this.mouseX = e.x;
            this.mouseY = e.y;
        });

        // Create the blob
        this.createBlob();

        // Setup physics properties
        this.blobPhysics = {
            // Target position (will follow mouse with delay)
            targetX: this.mouseX,
            targetY: this.mouseY,
            // Current position of blob center
            currentX: game.width / 2,
            currentY: game.height / 2,
            // Velocity
            vx: 0,
            vy: 0,
            // Physics constants
            springFactor: 0.08, // How strongly it's pulled toward target
            drag: 0.5, // Air resistance/friction
            wobbleAmount: 0.8, // How much the blob wobbles (0-1)
            wobbleSpeed: 8, // Speed of wobble oscillation

            // Animation state
            excitementLevel: 0, // Gets excited with fast mouse movements
            mood: 0, // 0 = normal, 1 = happy, -1 = scared

            // Color state
            baseColor: [64, 180, 255], // RGB base color
            excitedColor: [255, 100, 255], // RGB excited color
            currentColor: [64, 180, 255], // Current RGB color

            // Blob size
            baseRadius: 80, // Normal size
            currentRadius: 80, // Current size
            radiusScale: 0, // Scale
        };

        // Control points around the blob (in polar coordinates for easy animation)
        this.blobPoints = [];
        // Increased to 16 points for more segments and wobbliness
        const numPoints = 16;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            this.blobPoints.push({
                angle: angle,
                radius: this.blobPhysics.baseRadius, // Base radius
                radiusOffset: 0, // Will be animated
                phaseOffset: i * 0.7, // Different starting phase for each point
                wobbleFrequency: 1 + Math.random() * 0.5, // Slightly different frequencies for each point
            });
        }

        // Animation timing
        this.time = 0;

        // Tween animations
        this.animations = {
            pulseAnimation: {
                active: false,
                startTime: 0,
                duration: 1.5,
            },
            colorAnimation: {
                active: false,
                startTime: 0,
                duration: 1.0,
            },
            bounceAnimation: {
                active: false,
                startTime: 0,
                duration: 0.8,
            },
        };

        // Blob emotions/states
        this.blobState = {
            excited: false,
            scared: false,
            happy: false,
        };

        // Add click handler to toggle excitement
        this.bg.on("inputdown", () => {
            console.log("Clicked!");
            this.blobPhysics.radiusScale += 0.1;
            this.triggerAnimation("pulse");
            this.triggerAnimation("bounce");
        });

        // Add FPS counter
        this.add(
            new FPSCounter(game, {
                anchor: "bottom-right",
            })
        );
    }

    /**
     * Create the blob using BezierShape
     */
    createBlob() {
        // Initial simple circle path
        const path = [
            ["M", 50, 0],
            ["C", 50, 27.6, 27.6, 50, 0, 50],
            ["C", -27.6, 50, -50, 27.6, -50, 0],
            ["C", -50, -27.6, -27.6, -50, 0, -50],
            ["C", 27.6, -50, 50, -27.6, 50, 0],
            ["Z"],
        ];

        // Create BezierShape for the blob
        const blobShape = new BezierShape(0, 0, path, {
            fillColor: "rgba(80, 200, 255, 0.8)",
            strokeColor: "rgba(255, 255, 255, 0.8)",
            lineWidth: 2,
        });

        // Create GameObject using the factory
        this.blob = ShapeGOFactory.create(this.game, blobShape);

        // Add the blob to the scene
        this.add(this.blob);

        // Create eyes for the blob
        const leftEye = ShapeGOFactory.create(
            this.game,
            new Circle(-20, -15, 10, {
                fillColor: "white",
                strokeColor: "rgba(0, 0, 0, 0.5)",
                lineWidth: 1,
            })
        );

        const rightEye = ShapeGOFactory.create(
            this.game,
            new Circle(20, -15, 10, {
                fillColor: "white",
                strokeColor: "rgba(0, 0, 0, 0.5)",
                lineWidth: 1,
            })
        );

        // Create pupils
        const leftPupil = ShapeGOFactory.create(
            this.game,
            new Circle(-20, -15, 4, {
                fillColor: "black",
            })
        );

        const rightPupil = ShapeGOFactory.create(
            this.game,
            new Circle(20, -15, 4, {
                fillColor: "black",
            })
        );

        // Create mouth (initially a small line)
        const mouthShape = new BezierShape(
            0,
            10,
            [
                ["M", -15, 0],
                ["Q", 0, 5, 15, 0],
            ], {
                strokeColor: "rgba(0, 0, 0, 0.7)",
                lineWidth: 3,
                fillColor: null,
            }
        );

        const mouth = ShapeGOFactory.create(this.game, mouthShape);

        // Add facial features to the scene
        this.add(leftEye);
        this.add(rightEye);
        this.add(leftPupil);
        this.add(rightPupil);
        this.add(mouth);

        // Store reference to facial features for animation
        this.leftEye = leftEye;
        this.rightEye = rightEye;
        this.leftPupil = leftPupil;
        this.rightPupil = rightPupil;
        this.mouth = mouth;
    }

    /**
     * Trigger a specific animation
     */
    triggerAnimation(animType) {
        const anim = this.animations[animType + "Animation"];
        if (!anim) return;

        anim.active = true;
        anim.startTime = this.time;

        // Handle specific animation setup
        if (animType === "color") {
            // Choose a random hue
            const hue = Math.floor(Math.random() * 360);
            this.targetHue = hue;
        }
    }

    /**
     * Set the blob's mood
     */
    setMood(mood) {
        // 1 = happy, 0 = neutral, -1 = scared
        this.blobPhysics.mood = mood;

        // Update mouth shape based on mood
        if (mood === 1) {
            // Happy mouth - big smile
            this.mouth.shape.path = [
                ["M", -25, 0],
                ["Q", 0, 15, 25, 0],
            ];
        } else if (mood === 0) {
            // Neutral mouth - slight curve
            this.mouth.shape.path = [
                ["M", -15, 0],
                ["Q", 0, 5, 15, 0],
            ];
        } else {
            // Scared/sad mouth - inverted curve
            this.mouth.shape.path = [
                ["M", -15, 5],
                ["Q", 0, -5, 15, 5],
            ];
        }
    }

    /**
     * Update the scene
     */
    update(dt) {
        // Update background size
        this.bg.width = this.game.width;
        this.bg.height = this.game.height;
        this.bg.x = this.game.width / 2;
        this.bg.y = this.game.height / 2;
        // Update time
        this.time += dt;
        // Process animations
        this.updateAnimations(dt);
        // Update blob physics - move toward mouse with spring physics
        const physics = this.blobPhysics;
        // Calculate spring force toward target (mouse position)
        const dx = this.mouseX - physics.currentX;
        const dy = this.mouseY - physics.currentY;
        // Apply spring force to velocity
        physics.vx += dx * physics.springFactor;
        physics.vy += dy * physics.springFactor;
        // Apply drag
        physics.vx *= physics.drag;
        physics.vy *= physics.drag;
        // Update position
        physics.currentX += physics.vx;
        physics.currentY += physics.vy;
        // Calculate speed for excitement level
        const speed = Math.sqrt(physics.vx * physics.vx + physics.vy * physics.vy);
        const direction = Math.atan2(physics.vy, physics.vx);
        this.speed = speed;
        // Update excitement level based on speed
        // Use tween for smooth transitions
        const targetExcitement = Math.min(speed / 2, 1);
        physics.excitementLevel = Tween.go(
            physics.excitementLevel,
            targetExcitement,
            dt * 2 // How fast it reacts to speed changes
        );
        // If we're excited for a while, trigger color change
        if (
            physics.excitementLevel > 0.7 &&
            !this.animations.colorAnimation.active &&
            Math.random() < 0.02
        ) {
            this.triggerAnimation("color");
        }
        // Update mood based on excitement
        if (physics.excitementLevel > 0.7 && this.blobPhysics.mood !== 1) {
            this.setMood(1); // Happy when excited
        } else if (physics.excitementLevel < 0.2 && this.blobPhysics.mood !== 0) {
            this.setMood(0); // Neutral when calm
        }
        // Update blob color based on excitement
        for (let i = 0; i < 3; i++) {
            physics.currentColor[i] = Tween.go(
                physics.baseColor[i],
                physics.excitedColor[i],
                physics.excitementLevel
            );
        }
        // Update blob shape - make it wobble and squish based on movement
        this.updateBlobShape(speed, direction);
        // Position the blob and its features
        this.positionBlobFeatures(dt);
        super.update(dt);
    }

    /**
     * Update active animations
     */
    updateAnimations(dt) {
        // Process all animations
        for (const [animName, anim] of Object.entries(this.animations)) {
            if (!anim.active) continue;
            // Calculate normalized time (0-1)
            const elapsed = this.time - anim.startTime;
            const t = Math.min(elapsed / anim.duration, 1);
            // Process specific animations
            if (animName === "pulseAnimation") {
                // Pulse size animation
                const easedT = Tween.easeOutElastic(t);
                const sizeFactor = 1 + 0.3 * easedT;
                this.blobPhysics.currentRadius =
                    this.blobPhysics.baseRadius * sizeFactor;
                // End animation when complete
                if (t >= 1) anim.active = false;
            } else if (animName === "colorAnimation") {
                // Color transition animation
                const easedT = Tween.easeInOutSine(t);
                // Interpolate between start and target colors
                if (anim.startColor && anim.targetColor) {
                    // Set base color to the interpolated value
                    for (let i = 0; i < 3; i++) {
                        this.blobPhysics.baseColor[i] = Tween.go(
                            anim.startColor[i],
                            anim.targetColor[i],
                            easedT
                        );
                    }
                    // Add a pulsing effect during the transition
                    const pulseFactor = Math.sin(t * Math.PI * 3) * 0.2 * (1 - t);
                    for (let i = 0; i < 3; i++) {
                        this.blobPhysics.currentColor[i] =
                            this.blobPhysics.baseColor[i] * (1 + pulseFactor);
                    }
                }
                // End animation when complete
                if (t >= 1) {
                    anim.active = false;
                    // Set the final base color
                    this.blobPhysics.baseColor = [...anim.targetColor];
                }
            } else if (animName === "bounceAnimation") {
                // Bounce animation
                const easedT = Tween.easeOutBounce(t);
                // Apply vertical offset to the blob
                this.blob.y += Tween.parabolicArc(0, -50, 0, easedT);
                // End animation when complete
                if (t >= 1) anim.active = false;
            }
        }
    }

    /**
     * Position the blob and all its features
     */
    positionBlobFeatures(dt) {
        const physics = this.blobPhysics;
        // Position the blob
        this.blob.x = physics.currentX;
        this.blob.y = physics.currentY;
        // Update eye positions and shapes
        const eyeOffsetY = -15;
        const eyeOffsetX = 20;
        const eyeYAdjust = Math.min(physics.excitementLevel * 5, 3); // Eyes move up when excited
        // Position eyes based on blob position
        this.leftEye.x = physics.currentX - eyeOffsetX;
        this.leftEye.y = physics.currentY + eyeOffsetY - eyeYAdjust;
        // Position pupils based on eye position
        this.rightEye.x = physics.currentX + eyeOffsetX;
        this.rightEye.y = physics.currentY + eyeOffsetY - eyeYAdjust;
        //
        // Eye tracking
        // First, calculate vectors from eye centers to mouse
        const leftEyeToDx = this.mouseX - this.leftEye.x;
        const leftEyeToDy = this.mouseY - this.leftEye.y;
        // Right eye vector
        const rightEyeToDx = this.mouseX - this.rightEye.x;
        const rightEyeToDy = this.mouseY - this.rightEye.y;
        // Eye dimensions
        const eyeRadius = 10; // The full white part of the eye
        const pupilRadius = 4; // The black part of the eye
        // Maximum distance the pupil center can move from eye center
        // This ensures the pupil always stays within the white part
        const maxPupilOffset = eyeRadius - pupilRadius - 1; // -1 for a small margin
        // Calculate pupil positions for each eye
        // -- Left Eye --
        // First, normalize direction vector
        const leftEyeDist = Math.sqrt(leftEyeToDx * leftEyeToDx + leftEyeToDy * leftEyeToDy);
        let leftPupilX = 0,
            leftPupilY = 0;
        if (leftEyeDist > 0) {
            // Normalize and scale by max offset
            const normalizedX = leftEyeToDx / leftEyeDist;
            const normalizedY = leftEyeToDy / leftEyeDist;
            // Scale the movement - eyes follow more strongly when looking directly at the cursor
            // and less when looking at extreme angles
            // Calculate a scaled magnitude (distance from eye center to pupil center)
            // Formula creates a sigmoid-like response curve
            const scaledMagnitude = maxPupilOffset * Math.tanh(leftEyeDist / 200);
            leftPupilX = normalizedX * scaledMagnitude;
            leftPupilY = normalizedY * scaledMagnitude;
        }
        //
        // -- Right Eye --
        // First, normalize direction vector
        const rightEyeDist = Math.sqrt(rightEyeToDx * rightEyeToDx + rightEyeToDy * rightEyeToDy);
        let rightPupilX = 0,
            rightPupilY = 0;
        if (rightEyeDist > 0) {
            // Normalize and scale by max offset
            const normalizedX = rightEyeToDx / rightEyeDist;
            const normalizedY = rightEyeToDy / rightEyeDist;
            // Calculate scaled magnitude with the same formula
            const scaledMagnitude = maxPupilOffset * Math.tanh(rightEyeDist / 200);
            rightPupilX = normalizedX * scaledMagnitude;
            rightPupilY = normalizedY * scaledMagnitude;
        }
        //
        // Apply smoothing with Tween - this creates a more natural lag in eye movement
        const eyeResponseSpeed = 80; // Higher = faster response
        // Tween the pupil positions to follow the calculated offsets
        this.leftPupil.x = Tween.go(this.leftPupil.x, this.leftEye.x + leftPupilX, dt * eyeResponseSpeed);
        this.leftPupil.y = Tween.go(this.leftPupil.y, this.leftEye.y + leftPupilY, dt * eyeResponseSpeed);
        this.rightPupil.x = Tween.go(this.rightPupil.x, this.rightEye.x + rightPupilX, dt * eyeResponseSpeed);
        this.rightPupil.y = Tween.go(this.rightPupil.y, this.rightEye.y + rightPupilY, dt * eyeResponseSpeed);
        // Position mouth
        this.mouth.x = physics.currentX;
        this.mouth.y = physics.currentY + 10;
    }

    /**
     * Update the blob's shape based on movement and time
     */
    updateBlobShape(speed, direction) {
        const physics = this.blobPhysics;
        const baseRadius = physics.currentRadius;
        // Calculate the new control points based on speed, direction and wobble
        let controlPoints = [];
        // Update radius offsets for wobble effect
        for (let i = 0; i < this.blobPoints.length; i++) {
            const point = this.blobPoints[i];
            // Use Tween functions for wobble animation
            // Mix sine and elastic easings for more organic movement
            const wobbleT =
                (this.time * physics.wobbleSpeed * point.wobbleFrequency +
                    point.phaseOffset) %
                2;
            const wobbleEasing =
                wobbleT < 1 ?
                Tween.easeInOutSine(wobbleT) :
                Tween.easeInOutSine(2 - wobbleT);
            // Apply excitement factor to wobble - more excited = more wobble
            const excitementFactor = 1 + physics.excitementLevel * speed * 0.2;
            // Calculate wobble amount
            point.radiusOffset =
                wobbleEasing * physics.wobbleAmount * 20 * excitementFactor;
            // Add excitement pulsation
            point.radiusOffset +=
                Tween.oscillate(-3, 3, this.time * 10 + i * 0.5, 1) *
                physics.excitementLevel;
            // Squash in the direction of movement if moving fast
            const squash = Math.min(speed * 0.1, 0.5);
            const angleDiff = Math.abs(normalizeAngle(point.angle - direction));
            // Points in the direction of movement get compressed, perpendicular points expand
            // This creates a more natural squash-and-stretch effect
            const movementEffect = Math.cos(angleDiff) * squash * 30;
            const stretchEffect = Math.sin(angleDiff) * squash * 15;
            // Calculate final radius including all effects
            const finalRadius =
                baseRadius + point.radiusOffset - movementEffect + stretchEffect;
            // Convert polar to cartesian coordinates
            const x = Math.cos(point.angle) * finalRadius;
            const y = Math.sin(point.angle) * finalRadius;
            controlPoints.push({
                x,
                y,
            });
        }
        // Generate the path commands for the BezierShape
        const path = this.generateBlobPath(controlPoints);
        // Update color based on excitement level
        const r = Math.round(physics.currentColor[0]);
        const g = Math.round(physics.currentColor[1]);
        const b = Math.round(physics.currentColor[2]);
        // Update the blob's color and path
        this.blob.shape.fillColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        this.blob.shape.path = path;
    }

    /**
     * Generate a smooth closed path through the control points using Bezier curves
     */
    generateBlobPath(points) {
        if (points.length < 3) return [];
        const path = [];
        const n = points.length;
        // Start at the first point
        path.push(["M", points[0].x, points[0].y]);
        // For each point, create a bezier curve to the next point
        for (let i = 0; i < n; i++) {
            const curr = points[i];
            const next = points[(i + 1) % n];
            const nextNext = points[(i + 2) % n];
            // Calculate control points for a smooth curve
            // Use the midpoint between current and next as the end point of the curve
            const midX = (next.x + curr.x) / 2;
            const midY = (next.y + curr.y) / 2;
            // Control point 1 - between current and next, biased toward current
            const cp1x = curr.x + (next.x - curr.x) * 0.5;
            const cp1y = curr.y + (next.y - curr.y) * 0.5;
            // Control point 2 - between next and next-next, biased toward next
            const cp2x = next.x + (midX - next.x) * 0.5;
            const cp2y = next.y + (midY - next.y) * 0.5;
            // Add the cubic Bezier curve command
            path.push(["C", cp1x, cp1y, cp2x, cp2y, midX, midY]);
        }
        // Close the path
        path.push(["Z"]);
        return path;
    }

    /**
     * Render additional effects
     */
    render() {
        super.render();
        // Excitement particles when very excited
        if (this.blobPhysics.excitementLevel > 0.7) {
            this.renderExcitementParticles();
        }
    }

    /**
     * Render particles around the blob when excited
     */
    renderExcitementParticles() {
        const {
            currentX,
            currentY
        } = this.blobPhysics;

        // Number of particles based on excitement
        const particleCount = Math.floor(this.blobPhysics.excitementLevel * 2 * this.speed);
        for (let i = 0; i < particleCount; i++) {
            // Random position around the blob
            const angle = Math.random() * Math.PI * 2;
            const dist = this.blobPhysics.currentRadius * (1 * this.speed / 20 + Math.random() * 0.5);
            const x = currentX + Math.cos(angle) * dist;
            const y = currentY + Math.sin(angle) * dist;
            // Size based on excitement
            const size = 2 + Math.random() * 5 * this.blobPhysics.excitementLevel;
            // Use the blob's current color
            const {
                currentColor
            } = this.blobPhysics;
            const alpha = 0.4 + Math.random() * 0.6;
            // Draw the particle
            Painter.fillCircle(
                x,
                y,
                size,
                `rgba(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]}, ${alpha})`
            );
        }
    }

    /**
     * Update the triggerAnimation method to handle color randomization
     */
    triggerAnimation(animType) {
        const anim = this.animations[animType + "Animation"];
        if (!anim) return;
        anim.active = true;
        anim.startTime = this.time;
        // Handle specific animation setup
        if (animType === "color") {
            // Generate a new target color
            anim.startColor = [...this.blobPhysics.baseColor]; // Copy current base color
            anim.targetColor = Painter.randomColorHSL(); // New random color
            // Store target color for when animation completes
            this.targetColor = anim.targetColor;
        }
    }
}

/**
 * UI Scene for the blob demo
 */
class BlobUIScene extends Scene {
    constructor(game, blobScene) {
        super(game);
        this.blobScene = blobScene;
        // Create UI layout
        this.layout = new HorizontalLayout(game, {
            x: 10,
            y: 10,
            spacing: 8,
            padding: 0,
        });
        // Add buttons
        this.layout.add(
            new Button(game, {
                text: "🎈 Pulse",
                width: 100,
                height: 32,
                onClick: () => {
                    this.blobScene.triggerAnimation("pulse");
                },
            })
        );
        // Add a button to change color
        this.layout.add(
            new Button(game, {
                text: "🎨 Color",
                width: 100,
                height: 32,
                onClick: () => {
                    this.blobScene.triggerAnimation("color");
                },
            })
        );
        // Add a button to change mood
        this.layout.add(
            new Button(game, {
                text: "⬆️ Bounce",
                width: 100,
                height: 32,
                onClick: () => {
                    console.log(" Bounce clicked");
                    this.blobScene.triggerAnimation("bounce");
                },
            })
        );
        // Add a button to reset the blob
        this.add(this.layout);
    }

    update(dt) {
        // Position the UI at the bottom of the screen
        this.layout.x = 10;
        this.layout.y = this.game.canvas.height - this.layout.height - 10;
        super.update(dt);
    }
}

/**
 * Normalize an angle to be between -PI and PI
 */
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

// Export the game
export {
    BezierBlobGame
};