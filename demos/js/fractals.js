/**
 * GCanvas Fractal Demo
 *
 * This demo showcases the creation of various fractals using the GCanvas engine.
 * It implements multiple fractal algorithms and provides interactive controls.
 */
import {
  Button,
  Easing,
  FPSCounter,
  Fractals,
  Game,
  HorizontalLayout,
  ImageGo,
  Painter,
  Position,
  Scene,
  TaskManager,
  Text,
} from "../../src/index";

export class FractalDemo extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
    // Settings for fractal rendering
    this.settings = {
      type: Fractals.types.MANDELBROT,
      iterations: 32,
      colorScheme: Fractals.colors.FUTURISTIC,
      hueShift: 0,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      animating: false,
      typeIndex: 0,
    };
    // Target values for smooth interpolation
    this.target = {
      zoom: 1,
      offsetX: 0,
      offsetY: 0
    };
    // Pan velocity for momentum
    this.panVelocity = { x: 0, y: 0 };
    this.panDamping = 0.92;
    // Easing speed (higher = faster convergence)
    this.easeSpeed = 8;
    this.baseIterations = 32;
    // Render throttling
    this.lastRenderTime = 0;
    this.minRenderInterval = 50; // ms between renders during interaction
    this.isInteracting = false;
  }

  init() {
    super.init();

    // Create scenes
    this.mainScene = new Scene(this, {
      anchor: Position.CENTER,
      debug: true
    });
    this.mainScene.width = this.width;
    this.mainScene.height = this.height;
    this.ui = new Scene(this, { debug: true, anchor: Position.CENTER });
    this.pipeline.add(this.mainScene);
    this.pipeline.add(this.ui);

    // Add fractal renderer - create it at full size initially
    this.fractal = new FractalRenderer(
      this,
      this.mainScene.width,
      this.mainScene.height,
      {
        debug: true,
        debugColor: "white",
        width: this.mainScene.width,
        height: this.mainScene.height,
      }
    );
    this.mainScene.add(this.fractal);
    // Add UI controls
    this.setupUI();
    // Add FPS counter
    this.ui.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
        color: "#0f0",
      })
    );
    // Set up interactive controls
    this.setupInteraction();
    this.onResize();
    // Initial render
    this.updateFractalSettings();
  }

  onResize() {
    if (this.mainScene) {
      // Full width/height for mobile-friendly display
      const newWidth = this.width;
      const newHeight = this.height;

      if (
        this.mainScene.width !== newWidth ||
        this.mainScene.height !== newHeight
      ) {
        this.mainScene.width = newWidth;
        this.mainScene.height = newHeight;
        this.ui.width = newWidth;
        this.ui.height = newHeight;
        // Resize fractal renderer with a small delay to prevent multiple resizes
        if (!this.resizeTimeout) {
          this.resizeTimeout = setTimeout(() => {
            // Use actual dimensions, capped for performance on large screens
            const renderWidth = Math.min(newWidth, 1200);
            const renderHeight = Math.min(newHeight, 900);
            this.fractal.resize(renderWidth, renderHeight);
            this.resizeTimeout = null;
          }, 100);
        }
      }
    }
  }

  update(dt) {
    super.update(dt);

    let needsRender = false;
    const wasAnimating = this.wasAnimating || false;

    // Apply pan momentum when not dragging
    if (!this.settings.isDragging && (Math.abs(this.panVelocity.x) > 0.0001 || Math.abs(this.panVelocity.y) > 0.0001)) {
      const scaleFactor = 0.005 / this.settings.zoom;
      this.target.offsetX -= this.panVelocity.x * scaleFactor;
      this.target.offsetY -= this.panVelocity.y * scaleFactor;
      this.panVelocity.x *= this.panDamping;
      this.panVelocity.y *= this.panDamping;
      needsRender = true;
    }

    // Smooth interpolation toward target values using Easing.lerp
    const lerpFactor = 1 - Math.exp(-this.easeSpeed * dt);
    const zoomDiff = Math.abs(this.settings.zoom - this.target.zoom);
    const offsetXDiff = Math.abs(this.settings.offsetX - this.target.offsetX);
    const offsetYDiff = Math.abs(this.settings.offsetY - this.target.offsetY);

    if (zoomDiff > 0.001 || offsetXDiff > 0.00001 || offsetYDiff > 0.00001) {
      this.settings.zoom = Easing.lerp(this.settings.zoom, this.target.zoom, lerpFactor);
      this.settings.offsetX = Easing.lerp(this.settings.offsetX, this.target.offsetX, lerpFactor);
      this.settings.offsetY = Easing.lerp(this.settings.offsetY, this.target.offsetY, lerpFactor);
      needsRender = true;
    }

    // Handle animation if enabled
    if (this.settings.animating) {
      this.settings.hueShift = (this.settings.hueShift + dt * 30) % 360;
      this.target.zoom = this.target.zoom * (1 + dt * 0.08);
      needsRender = true;
    }

    this.wasAnimating = needsRender;

    // Throttle renders during animation, but always render when settled
    if (needsRender) {
      const now = performance.now();
      if (now - this.lastRenderTime > this.minRenderInterval) {
        this.lastRenderTime = now;
        this.updateFractalSettings(true); // Preview mode
      }
    } else if (wasAnimating) {
      // Animation just settled - final full-quality render
      this.updateFractalSettings(false);
    }
  }

  updateFractalSettings(preview = false) {
    // Use lower iterations for preview during interaction
    const iterations = preview
      ? Math.max(16, Math.floor(this.baseIterations * 0.4))
      : this.baseIterations;

    // Update renderer settings - it will render asynchronously
    this.fractal.updateSettings({
      type: this.settings.type,
      iterations: iterations,
      colorScheme: this.settings.colorScheme,
      hueShift: this.settings.hueShift,
      zoom: this.settings.zoom,
      offsetX: this.settings.offsetX,
      offsetY: this.settings.offsetY,
    });
  }

  setupUI() {
    // Responsive sizing based on screen width
    const isMobile = this.width < 600;
    const btnHeight = isMobile ? 28 : 30;
    const btnSpacing = isMobile ? 4 : 10;
    const fontSize = isMobile ? "11px" : "13px";

    // Create UI layout
    const controlsLayout = new HorizontalLayout(this, {
      anchor: Position.BOTTOM_LEFT,
      spacing: btnSpacing,
      padding: isMobile ? 4 : 10,
      height: btnHeight + 10,
      width: this.width,
      debug: false,
    });

    // Fractal type selector
    const typeBtn = new Button(this, {
      text: isMobile ? this.settings.type.toUpperCase() : `Type: ${this.settings.type.toUpperCase()}`,
      width: isMobile ? 90 : 180,
      height: btnHeight,
      fontSize,
      onClick: () => this.cycleFractalType(),
    });

    // Iteration controller
    const iterBtn = new Button(this, {
      text: isMobile ? `${this.settings.iterations}` : `Iter: ${this.settings.iterations}`,
      width: isMobile ? 45 : 100,
      height: btnHeight,
      fontSize,
      onClick: () => this.cycleIterations(),
    });

    // Color mode selector
    const colorBtn = new Button(this, {
      text: isMobile ? "Color" : `Color: ${this.settings.colorScheme}`,
      width: isMobile ? 50 : 150,
      height: btnHeight,
      fontSize,
      onClick: () => this.cycleColorScheme(),
    });

    // Animate button
    const animateBtn = new Button(this, {
      text: isMobile ? "Anim" : "Animate",
      width: isMobile ? 45 : 80,
      height: btnHeight,
      fontSize,
      onClick: () => {
        this.settings.animating = !this.settings.animating;
        animateBtn.text = this.settings.animating ? "Stop" : (isMobile ? "Anim" : "Animate");
      },
    });

    // Zoom in button
    const zoomInBtn = new Button(this, {
      text: "+",
      width: isMobile ? 32 : 50,
      height: btnHeight,
      fontSize,
      onClick: () => this.zoomIn(),
    });

    // Zoom out button
    const zoomOutBtn = new Button(this, {
      text: "-",
      width: isMobile ? 32 : 50,
      height: btnHeight,
      fontSize,
      onClick: () => this.zoomOut(),
    });

    // Add all buttons to layout
    controlsLayout.add(typeBtn);
    controlsLayout.add(iterBtn);
    controlsLayout.add(colorBtn);
    controlsLayout.add(animateBtn);
    controlsLayout.add(zoomInBtn);
    controlsLayout.add(zoomOutBtn);

    // Store references to UI elements
    this.controls = {
      typeBtn,
      iterBtn,
      colorBtn,
      animateBtn,
      layout: controlsLayout,
      isMobile,
    };

    this.controls.typeBtn.type = 0;

    // Add layout to UI
    this.ui.add(controlsLayout);

    // Add title (hide on mobile)
    if (!isMobile) {
      const title = new Text(this, "GCanvas Fractal Explorer", {
        font: "bold 24px Arial",
        color: "#fff",
        align: "center",
        baseline: "middle",
        debugColor: "white",
        debug: true,
        width: 10,
        height: 10,
        anchor: Position.BOTTOM_RIGHT,
      });
      this.ui.add(title);
    }    
  }

  resetView() {
    // Set targets - smooth interpolation happens in update()
    this.target.zoom = 1;
    this.target.offsetX = 0;
    this.target.offsetY = 0;
    this.panVelocity.x = 0;
    this.panVelocity.y = 0;
  }

  setupInteraction() {
    // Throttle function to limit calls
    const throttle = (func, limit) => {
      let inThrottle;
      return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => (inThrottle = false), limit);
        }
      };
    };

    // Mouse down for panning
    this.canvas.addEventListener("mousedown", (e) => {
      this.settings.isDragging = true;
      this.settings.lastX = e.offsetX;
      this.settings.lastY = e.offsetY;
      this.panVelocity.x = 0;
      this.panVelocity.y = 0;
    });

    // Mouse move for panning - visual transform only (no re-render)
    this.canvas.addEventListener(
      "mousemove",
      throttle((e) => {
        if (this.settings.isDragging) {
          const dx = e.offsetX - this.settings.lastX;
          const dy = e.offsetY - this.settings.lastY;

          // Track velocity for momentum
          this.panVelocity.x = dx * 0.8 + this.panVelocity.x * 0.2;
          this.panVelocity.y = dy * 0.8 + this.panVelocity.y * 0.2;

          // Update offset values
          const scaleFactor = 0.005 / this.settings.zoom;
          const deltaX = dx * scaleFactor;
          const deltaY = dy * scaleFactor;
          this.settings.offsetX -= deltaX;
          this.settings.offsetY -= deltaY;
          this.target.offsetX -= deltaX;
          this.target.offsetY -= deltaY;

          this.settings.lastX = e.offsetX;
          this.settings.lastY = e.offsetY;

          // Throttled preview render during drag
          const now = performance.now();
          if (now - this.lastRenderTime > this.minRenderInterval) {
            this.lastRenderTime = now;
            this.updateFractalSettings(true);
          }
        }
      }, 16)
    );

    // Mouse up to end panning - full quality render
    this.canvas.addEventListener("mouseup", () => {
      this.settings.isDragging = false;
      // If no significant momentum, re-render immediately at full quality
      if (Math.abs(this.panVelocity.x) < 0.5 && Math.abs(this.panVelocity.y) < 0.5) {
        this.panVelocity.x = 0;
        this.panVelocity.y = 0;
        this.updateFractalSettings(false);
      }
    });

    // Mouse wheel for zooming - target-based smooth easing
    this.canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        // Calculate zoom factor
        const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;

        // Get mouse position in canvas
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        // Calculate normalized position (0-1)
        const normalizedX = mouseX / this.width;
        const normalizedY = mouseY / this.height;

        // Map to complex plane coordinates using TARGET values for accumulation
        const planeWidth = 3.5 / this.target.zoom;
        const planeHeight = 3.0 / this.target.zoom;
        const planeX = -2.5 / this.target.zoom + this.target.offsetX;
        const planeY = -1.5 / this.target.zoom + this.target.offsetY;

        // Find the point we're zooming in on
        const pointX = planeX + normalizedX * planeWidth;
        const pointY = planeY + normalizedY * planeHeight;

        // Calculate new target zoom and offset
        const newZoom = this.target.zoom * zoomFactor;
        const newPlaneWidth = 3.5 / newZoom;
        const newPlaneHeight = 3.0 / newZoom;
        const newPlaneX = pointX - normalizedX * newPlaneWidth;
        const newPlaneY = pointY - normalizedY * newPlaneHeight;

        // Update target values - smooth interpolation happens in update()
        this.target.zoom = newZoom;
        this.target.offsetX = newPlaneX + 2.5 / newZoom;
        this.target.offsetY = newPlaneY + 1.5 / newZoom;
      },
      { passive: false }
    );

    // Touch support for mobile
    let lastTouchX = 0;
    let lastTouchY = 0;
    let lastPinchDist = 0;

    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        this.settings.isDragging = true;
        this.panVelocity.x = 0;
        this.panVelocity.y = 0;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
        this.settings.isDragging = false;
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener("touchmove", throttle((e) => {
      if (e.touches.length === 1 && this.settings.isDragging) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;

        this.panVelocity.x = dx * 0.8 + this.panVelocity.x * 0.2;
        this.panVelocity.y = dy * 0.8 + this.panVelocity.y * 0.2;

        const scaleFactor = 0.005 / this.settings.zoom;
        const deltaX = dx * scaleFactor;
        const deltaY = dy * scaleFactor;
        this.settings.offsetX -= deltaX;
        this.settings.offsetY -= deltaY;
        this.target.offsetX -= deltaX;
        this.target.offsetY -= deltaY;

        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;

        // Throttled preview render during drag
        const now = performance.now();
        if (now - this.lastRenderTime > this.minRenderInterval) {
          this.lastRenderTime = now;
          this.updateFractalSettings(true);
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const pinchDist = Math.sqrt(dx * dx + dy * dy);

        if (lastPinchDist > 0) {
          const zoomFactor = pinchDist / lastPinchDist;
          // Direct zoom for responsive feel during pinch
          this.settings.zoom *= zoomFactor;
          this.target.zoom *= zoomFactor;
          // Throttled preview render during pinch
          const now = performance.now();
          if (now - this.lastRenderTime > this.minRenderInterval) {
            this.lastRenderTime = now;
            this.updateFractalSettings(true);
          }
        }

        lastPinchDist = pinchDist;
      }
      e.preventDefault();
    }, 16), { passive: false });

    this.canvas.addEventListener("touchend", () => {
      this.settings.isDragging = false;
      lastPinchDist = 0;
      // If no significant momentum, re-render immediately at full quality
      if (Math.abs(this.panVelocity.x) < 0.5 && Math.abs(this.panVelocity.y) < 0.5) {
        this.panVelocity.x = 0;
        this.panVelocity.y = 0;
        this.updateFractalSettings(false);
      }
    });
  }

  cycleFractalType() {
    const types = Object.values(Fractals.types);
    this.settings.typeIndex = (this.settings.typeIndex + 1) % types.length;
    this.settings.type = types[this.settings.typeIndex];
    this.controls.typeBtn.text = this.controls.isMobile
      ? this.settings.type.toUpperCase()
      : `Type: ${this.settings.type.toUpperCase()}`;
    // Tweaking default params for selected type
    if (this.settings.type === Fractals.types.KOCH) {
      this.settings.iterations = 3;
      this.settings.colorScheme = Fractals.colors.TOPOGRAPHIC;
    } else if (this.settings.type === Fractals.types.BARNSEY_FERN) {
      this.settings.colorScheme = Fractals.colors.ELECTRIC;
    } else if (this.settings.type === Fractals.types.LYAPUNOV) {
      this.settings.colorScheme = Fractals.colors.RAINBOW;
      this.settings.iterations = 8;
    } else if (
      this.settings.type === Fractals.types.MANDELBROT ||
      this.settings.type == Fractals.types.JULIA ||
      this.settings.type == Fractals.types.TRICORN ||
      this.settings.type == Fractals.types.PHOENIX
    ) {
      this.settings.iterations = 32;
      this.settings.colorScheme = Fractals.colors.FUTURISTIC;
    } else if (this.settings.type === Fractals.types.NEWTON) {
      this.settings.iterations = 32;
      this.settings.colorScheme = Fractals.colors.ELECTRIC;
    } else if (
      this.settings.type === Fractals.types.SIERPINSKI ||
      this.settings.type === Fractals.types.SCARPET
    ) {
      this.settings.colorScheme = Fractals.colors.ELECTRIC;
      this.settings.iterations = 4;
    }
    this.baseIterations = this.settings.iterations;
    this.controls.iterBtn.text = this.controls.isMobile
      ? `${this.settings.iterations}`
      : `Iter: ${this.settings.iterations}`;
    this.controls.colorBtn.text = this.controls.isMobile
      ? "Color"
      : `Color: ${this.settings.colorScheme}`;
    this.resetView();
  }

  cycleIterations() {
    let iterationPresets;
    if (
      this.settings.type === Fractals.types.SIERPINSKI ||
      this.settings.type === Fractals.types.SCARPET
    ) {
      iterationPresets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25];
    } else if (
      this.settings.type === Fractals.types.MANDELBROT ||
      this.settings.type === Fractals.types.TRICORN ||
      this.settings.type === Fractals.types.PHOENIX ||
      this.settings.type === Fractals.types.JULIA
    ) {
      iterationPresets = [3, 4, 5, 8, 32, 50, 100, 200, 500, 1000];
    } else if (this.settings.type === Fractals.types.KOCH) {
      iterationPresets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    } else {
      iterationPresets = [3, 4, 5, 8, 32, 50, 100];
    }

    const currentIndex = iterationPresets.indexOf(this.settings.iterations);
    const nextIndex = (currentIndex + 1) % iterationPresets.length;

    this.settings.iterations = iterationPresets[nextIndex];
    this.baseIterations = this.settings.iterations;
    this.controls.iterBtn.text = this.controls.isMobile
      ? `${this.settings.iterations}`
      : `Iter: ${this.settings.iterations}`;

    // Update with new iterations
    this.updateFractalSettings();
  }

  cycleColorScheme() {
    let schemes = Object.values(Fractals.colors);
    if (this.settings.type === Fractals.types.LYAPUNOV) {
      schemes = [
        Fractals.colors.RAINBOW,
        Fractals.colors.ELECTRIC,
        Fractals.colors.HISTORIC,
        Fractals.colors.GRAYSCALE,
        Fractals.colors.BINARY,
      ];
    } else if (
      this.settings.type === Fractals.types.SIERPINSKI ||
      this.settings.type === Fractals.types.SCARPET
    ) {
      schemes = [
        Fractals.colors.ELECTRIC,
        Fractals.colors.TOPOGRAPHIC,
        Fractals.colors.OCEAN,
        Fractals.colors.GRAYSCALE,
        Fractals.colors.BINARY,
      ];
    } else if (this.settings.type === Fractals.types.BARNSEY_FERN) {
      schemes = [
        Fractals.colors.ELECTRIC,
        Fractals.colors.RAINBOW,
        Fractals.colors.GRAYSCALE,
        Fractals.colors.BINARY,
      ];
    } else if (this.settings.type === Fractals.types.NEWTON) {
      schemes = [
        Fractals.colors.ELECTRIC,
        Fractals.colors.OCEAN,
        Fractals.colors.BINARY,
        Fractals.colors.FUTURISTIC,
        Fractals.colors.HISTORIC,
        Fractals.colors.RAINBOW,
        Fractals.colors.TOPOGRAPHIC,
      ];
    }
    const currentIndex = schemes.indexOf(this.settings.colorScheme);
    const nextIndex = (currentIndex + 1) % schemes.length;
    this.settings.colorScheme = schemes[nextIndex];
    this.controls.colorBtn.text = this.controls.isMobile
      ? "Color"
      : `Color: ${this.settings.colorScheme}`;

    // Update with new color scheme
    this.updateFractalSettings();
  }

  zoomIn() {
    this.target.zoom = this.target.zoom * 1.5;
  }

  zoomOut() {
    this.target.zoom = this.target.zoom / 1.5;
  }

  render() {
    super.render();
    //if(this.fractal.active) this.fractal.active = false;
  }
}
//
class FractalRenderer extends ImageGo {
  /**
   * Create a new fractal renderer with double buffering
   *
   * @param {Game} game - Game instance
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {Object} options - Additional options
   */
  constructor(game, width, height, options = {}) {
    // Create a blank ImageData for initial display
    const initialData = Painter.img.createImageData(width, height);

    // Initialize with the blank data
    super(game, initialData, options);

    this.width = width;
    this.height = height;

    // Store the current fractal data
    this.fractalData = null;

    // Flag to indicate rendering is in progress
    this.isRendering = false;

    // Default settings
    this.settings = {
      type: Fractals.types.MANDELBROT,
      iterations: 50,
      colorScheme: "rainbow",
      hueShift: 0,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    };

    // Settings that were used for the current display
    this.currentSettings = { ...this.settings };

    // Create a second ImageData as a working buffer
    this.workingBuffer = Painter.img.createImageData(width, height);

    // Request initial render
    this.pendingRender = true;
    // Initialize task manager
    this.taskManager = new TaskManager("./js/fractalworker.js");
  }

  /**
   * Update renderer size
   *
   * @param {number} width - New width
   * @param {number} height - New height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;

    // Create new working buffer with new dimensions
    this.workingBuffer = Painter.img.createImageData(width, height);

    // Reset main buffer
    this.reset();

    // Request a re-render with new dimensions
    this.pendingRender = true;
  }

  /**
   * Update fractal settings and queue a re-render
   *
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...settings };

    // Only request a render if settings actually changed
    if (JSON.stringify(oldSettings) !== JSON.stringify(this.settings)) {
      this.pendingRender = true;
    }
  }

  /**
   * Check if settings have changed from what's currently displayed
   */
  settingsChanged() {
    return (
      JSON.stringify(this.settings) !== JSON.stringify(this.currentSettings)
    );
  }

  async renderFractal() {
    this.isRendering = true;
    const renderSettings = { ...this.settings };
    try {
      // Step 1: Generate raw fractal data
      const fractalData = this.generateFractalData(renderSettings);
      //console.log("fractalData", fractalData);
      const result = await this.taskManager.runTask("generateFractal", {
        width: this.width,
        height: this.height,
        type: renderSettings.type,
        iterations: renderSettings.iterations,
        zoom: renderSettings.zoom,
        offsetX: renderSettings.offsetX,
        offsetY: renderSettings.offsetY,
        fractalFunction: fractalData.fractalFunction,
        args: fractalData.args,
        colorFunction: Fractals.applyColorScheme.toString(),
        colorArgs: [
          renderSettings.colorScheme,
          renderSettings.iterations,
          renderSettings.hueShift,
        ],
      });
      //console.log("worker result", result);
      // Apply the result to our image
      this.shape.bitmap = result.image;
      // Update current settings
      this.currentSettings = { ...renderSettings };
    } catch (error) {
      console.error("Error rendering fractal:", error);
    } finally {
      this.isRendering = false;
    }
  }

  update(dt) {
    if (this.pendingRender && !this.isRendering && this.active) {
      this.pendingRender = false;
      this.renderFractal();
    }
    super.update(dt);
  }

  generateFractalData(settings) {
    const { type, iterations, zoom, offsetX, offsetY } = settings;

    switch (type) {
      case "pythagorasTree":
        return {
          fractalFunction: Fractals.pythagorasTree.toString(),
          args: [
            iterations,
            -1.5 / zoom + offsetX,
            1 / zoom + offsetX,
            -1.5 / zoom + offsetY,
            1.5 / zoom + offsetY,
          ],
        };
      case "mandelbrot":
        return {
          fractalFunction: Fractals.mandelbrot.toString(),
          args: [
            iterations,
            -2.5 / zoom + offsetX,
            1 / zoom + offsetX,
            -1.5 / zoom + offsetY,
            1.5 / zoom + offsetY,
          ],
        };

      case "julia":
        return {
          fractalFunction: Fractals.julia.toString(),
          args: [
            iterations,
            -0.7, // cReal
            0.27, // cImag
            zoom,
            offsetX,
            offsetY,
          ],
        };

      case "newton":
        return {
          fractalFunction: Fractals.newton.toString(),
          args: [
            iterations,
            0.000001,
            (-1 / zoom) * 2 + offsetX,
            (1 / zoom) * 2 + offsetX,
            (-1 / zoom) * 2 + offsetY,
            (1 / zoom) * 2 + offsetY,
          ],
        };

      case "sierpinski":
        return {
          fractalFunction: Fractals.sierpinski.toString(),
          args: [
            Math.min(50, iterations),
            (-16 / zoom) * 2 + offsetX * 10,
            (16 / zoom) * 2 + offsetX * 10,
            (-16 / zoom) * 2 + offsetY * 10,
            (16 / zoom) * 2 + offsetY * 10,
          ],
        };

      case "sierpinskiCarpet":
        const f = 3 / zoom;
        return {
          fractalFunction: Fractals.sierpinskiCarpet.toString(),
          args: [
            Math.min(50, iterations),
            -f * 2 + offsetX + 2,
            f * 2 + offsetX + 2,
            -f * 2 + offsetY + 2,
            f * 2 + offsetY + 2,
          ],
        };

      case "barnsleyFern":
        return {
          fractalFunction: Fractals.barnsleyFern.toString(),
          args: [iterations * 1000],
        };

      case "lyapunov":
        return {
          fractalFunction: Fractals.lyapunov.toString(),
          args: [
            iterations,
            "ABAB",
            (-1 / zoom) * 2 + offsetX,
            (1 / zoom) * 2 + offsetX,
            (-1 / zoom) * 2 + offsetY,
            (1 / zoom) * 2 + offsetY,
            1,
            iterations,
          ],
        };

      case "tricorn":
        return {
          fractalFunction: Fractals.tricorn.toString(),
          args: [
            iterations,
            -2.5 / zoom + offsetX,
            1.5 / zoom + offsetX,
            -1.5 / zoom + offsetY,
            1.5 / zoom + offsetY,
          ],
        };

      case "phoenix":
        return {
          fractalFunction: Fractals.phoenix.toString(),
          args: [
            iterations,
            0.8,
            0.3,
            -2 / zoom + offsetX - 1,
            2 / zoom + offsetX,
            -2 / zoom + offsetY,
            2 / zoom + offsetY,
          ],
        };

      case "koch":
        return {
          fractalFunction: Fractals.koch.toString(),
          args: [
            iterations,
            (-1 / zoom) * 2 + offsetX,
            (1 / zoom) * 2 + offsetX,
            (-1 / zoom) * 2 + offsetY + 1,
            (1 / zoom) * 2 + offsetY + 1,
          ],
        };

      default:
        return {
          fractalFunction: Fractals.mandelbrot.toString(),
          args: [iterations],
        };
    }
  }
}
