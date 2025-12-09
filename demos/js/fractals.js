/**
 * GCanvas Fractal Demo
 *
 * This demo showcases the creation of various fractals using the GCanvas engine.
 * It implements multiple fractal algorithms and provides interactive controls.
 */
import {
  Button,
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
      // Check for window resize
      const newWidth = this.width - 20;
      const newHeight = this.height - 20;

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
            this.fractal.resize(800, 600);
            this.resizeTimeout = null;
          }, 100);
        }
      }
    }
  }

  update(dt) {
    super.update(dt);
    // Handle animation if enabled
    if (this.settings.animating) {
      // Shift hue and slowly zoom/rotate for animation effect
      this.settings.hueShift = (this.settings.hueShift + dt * 30) % 360;
      // zooms up to a limit then returns to 1
      this.settings.zoom = this.settings.zoom * (1 + dt * 0.08);
      // Apply animated settings
      this.updateFractalSettings();
    }
  }

  updateFractalSettings() {
    // Update renderer settings - it will render asynchronously
    this.fractal.updateSettings({
      type: this.settings.type,
      iterations: this.settings.iterations,
      colorScheme: this.settings.colorScheme,
      hueShift: this.settings.hueShift,
      zoom: this.settings.zoom,
      offsetX: this.settings.offsetX,
      offsetY: this.settings.offsetY,
    });
  }

  setupUI() {
    // Create UI layout
    const controlsLayout = new HorizontalLayout(this, {
      anchor: Position.BOTTOM_LEFT,
      anchorRelative: this.ui,
      spacing: 10,
      padding: 10,
      height: 40,
      width: 120 * 4,
      debug: true,
      debugColor: "yellow",
    });
    controlsLayout.height = 40;
    controlsLayout.width = 120 * 4;

    // Fractal type selector
    const typeBtn = new Button(this, {
      text: `Type: ${this.settings.type.toUpperCase()}`,
      width: 180,
      height: 30,
      onClick: () => this.cycleFractalType(),
    });

    // Iteration controller
    const iterBtn = new Button(this, {
      text: `Iterations: ${this.settings.iterations}`,
      width: 120,
      height: 30,
      onClick: () => this.cycleIterations(),
    });

    // Color mode selector
    const colorBtn = new Button(this, {
      text: `Color: ${this.settings.colorScheme}`,
      width: 150,
      height: 30,
      onClick: () => this.cycleColorScheme(),
    });

    // Animate button
    const animateBtn = new Button(this, {
      text: "Animate",
      width: 80,
      height: 30,
      onClick: () => {
        this.settings.animating = !this.settings.animating;
        animateBtn.text = this.settings.animating ? "Stop" : "Animate";
      },
    });

    // Zoom in button
    const zoomInBtn = new Button(this, {
      text: "Zoom In",
      width: 80,
      height: 30,
      onClick: () => this.zoomIn(),
    });

    // Zoom out button
    const zoomOutBtn = new Button(this, {
      text: "Zoom Out",
      width: 80,
      height: 30,
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
    };

    this.controls.typeBtn.type = 0;

    // Add layout to UI
    this.ui.add(controlsLayout);

    // Add title
    const title = new Text(this, "GCanvas Fractal Explorer", {
      font: "bold 24px Arial",
      color: "#fff",
      align: "center",
      baseline: "middle",
      width: 10,
      anchor: Position.BOTTOM_RIGHT,
      anchorRelative: this.ui,
    });
    this.ui.add(title);
    this.ui.update(); //force update to the anchor
  }

  resetView() {
    this.settings.zoom = 1;
    this.settings.offsetX = 0;
    this.settings.offsetY = 0;

    // Re-render with reset view
    this.updateFractalSettings();
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
    });

    // Mouse move for panning - throttled to prevent too many updates
    this.canvas.addEventListener(
      "mousemove",
      throttle((e) => {
        if (this.settings.isDragging) {
          const dx = e.offsetX - this.settings.lastX;
          const dy = e.offsetY - this.settings.lastY;

          // Adjust pan amount based on zoom level
          const scaleFactor = 0.005 / this.settings.zoom;
          this.settings.offsetX -= dx * scaleFactor;
          this.settings.offsetY -= dy * scaleFactor;

          this.settings.lastX = e.offsetX;
          this.settings.lastY = e.offsetY;

          // Update with new offset
          this.updateFractalSettings();
        }
      }, 20)
    ); // Throttle to 20ms intervals

    // Mouse up to end panning
    this.canvas.addEventListener("mouseup", () => {
      this.settings.isDragging = false;
    });

    // Mouse wheel for zooming - throttled for better performance
    this.canvas.addEventListener(
      "wheel",
      throttle((e) => {
        e.preventDefault();

        // Calculate zoom factor
        const zoomFactor = e.deltaY < 0 ? 1.2 : 0.8;

        // Get mouse position in canvas
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        // Calculate normalized position (0-1)
        const normalizedX = mouseX / this.width;
        const normalizedY = mouseY / this.height;

        // Map to complex plane coordinates
        const planeWidth = 3.5 / this.settings.zoom;
        const planeHeight = 3.0 / this.settings.zoom;
        const planeX = -2.5 / this.settings.zoom + this.settings.offsetX;
        const planeY = -1.5 / this.settings.zoom + this.settings.offsetY;

        // Find the point we're zooming in on
        const targetX = planeX + normalizedX * planeWidth;
        const targetY = planeY + normalizedY * planeHeight;

        // Apply zoom
        this.settings.zoom *= zoomFactor;

        // Adjust offset to keep the mouse position fixed
        const newPlaneWidth = 3.5 / this.settings.zoom;
        const newPlaneHeight = 3.0 / this.settings.zoom;
        const newPlaneX = targetX - normalizedX * newPlaneWidth;
        const newPlaneY = targetY - normalizedY * newPlaneHeight;

        this.settings.offsetX = newPlaneX + 2.5 / this.settings.zoom;
        this.settings.offsetY = newPlaneY + 1.5 / this.settings.zoom;

        // Update with new zoom and offset
        this.updateFractalSettings();
      }, 50)
    ); // Throttle to 50ms intervals for wheel events
  }

  cycleFractalType() {
    const types = Object.values(Fractals.types);
    this.settings.typeIndex = (this.settings.typeIndex + 1) % types.length;
    this.settings.type = types[this.settings.typeIndex];
    this.controls.typeBtn.text = `Type: ${this.settings.type.toUpperCase()}`;
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
    this.controls.iterBtn.text = `Iterations: ${this.settings.iterations}`;
    this.controls.colorBtn.text = `Color: ${this.settings.colorScheme}`;
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
    this.controls.iterBtn.text = `Iterations: ${this.settings.iterations}`;

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
    this.controls.colorBtn.text = `Color: ${this.settings.colorScheme}`;

    // Update with new color scheme
    this.updateFractalSettings();
  }

  zoomIn() {
    this.settings.zoom *= 1.2;
    this.updateFractalSettings();
  }

  zoomOut() {
    this.settings.zoom /= 1.2;
    this.updateFractalSettings();
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
