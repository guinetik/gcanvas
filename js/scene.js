import {
  Game,
  Scene,
  Button,
  FPSCounter,
  VerticalLayout,
  Rectangle,
  Group,
  applyDraggable,
  Painter,
  Tween,
  Easing,
  Random,
  GameObjectShapeWrapper,
  Position,
} from "/gcanvas.es.min.js";
// Demo Game with Scenes
export class DemoGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.MARGIN = 0;
    this.enableFluidSize();
    this.backgroundColor = "white";
  }

  getResponsiveConfig() {
    const isNarrow = this.width < 500;
    return {
      buttonWidth: isNarrow ? 120 : 150,
      layerCount: isNarrow ? 25 : 50,
    };
  }

  init() {
    super.init();
    const config = this.getResponsiveConfig();
    this.currentButtonWidth = config.buttonWidth;

    this.scene = new Scene(this, { debug: true, debugColor: "black" });
    this.ui = new Scene(this, {
      debug: true,
      anchor: Position.BOTTOM_LEFT,
      anchorRelative: this.scene,
    });
    this.pipeline.add(this.scene); // scene below
    this.pipeline.add(this.ui); // UI on top
    this.pipeline.add(
      new FPSCounter(this, { anchor: "bottom-right", color: "black" })
    );
    this.buttons = this.ui.add(
      new VerticalLayout(this, {
        debug: true,
        debugColor: "black",
        spacing: 10,
        padding: 10,
      })
    );
    this.buttons.width = config.buttonWidth;
    this.buttons.height = 200;
    // Small demo of Random functions
    let random = Random.symmetric;
    const options = [
      Random.symmetric,
      Random.centered,
      Random.gaussian,
      Random.radial,
    ];
    this.buttons.add(
      this.createButton("➕ Add Layer", () => this.addLayer(random))
    );
    this.buttons.add(this.createButton("❎ Clear", () => this.scene.clear()));
    this.buttons.add(
      this.createButton("🎲 Randomize", () => {
        this.scene.children.forEach((layer) => {
          layer.scaleX = layer.scaleY = layer.scaleTime = 0;
          layer.random = random;
          layer.randomize();
        });
      })
    );
    const rollBtn = this.createButton("🔄️" + random.name, () => {
      random = Random.pickOther(options, random);
      console.log(random.name);
      rollBtn.text = "🔄️" + random.name;
    });
    this.buttons.add(rollBtn);
    // Add random layers
    for (let i = 0; i < config.layerCount; i++) {
      this.addLayer(random, i);
    }
    this.positionScene();
  }

  createButton(text, onClick) {
    return new Button(this, {
      text: text,
      width: this.currentButtonWidth,
      textAlign: "left",
      onClick: onClick,
    });
  }

  #prevWidth = 0;
  #prevHeight = 0;

  positionScene() {
    this.scene.width = this.width - this.MARGIN * 2;
    this.scene.height = this.height - this.MARGIN * 2;
    this.scene.x = this.width / 2;
    this.scene.y = this.height / 2;
  }

  update(dt) {
    this.positionScene();
    //
    if (this.ui.width !== this.buttons.width + 10) {
      this.ui.width = this.buttons.width + 10;
    }
    if (this.ui.height !== this.buttons.height + 10) {
      this.ui.height = this.buttons.height + 10;
    }
    super.update(dt);
    if (this.#prevWidth !== this.width || this.#prevHeight !== this.height) {
      this.scene.markBoundsDirty();
    }
    this.#prevWidth = this.scene.width;
    this.#prevHeight = this.scene.height;
  }

  addLayer(random, i) {
    const layer = new LayerBox(this, this.scene, {}, random);
    this.scene.add(layer);
    setTimeout(layer.randomize.bind(layer), 50 * i);
    return layer;
  }

  onResize() {
    if (!this.buttons) return;

    const config = this.getResponsiveConfig();

    // Update button widths if changed
    if (this.currentButtonWidth !== config.buttonWidth) {
      this.currentButtonWidth = config.buttonWidth;
      this.buttons.transform.width(config.buttonWidth);

      // Update each button's width
      if (this.buttons.children) {
        this.buttons.children.forEach((btn) => {
          if (btn.transform) {
            btn.transform.width(config.buttonWidth);
          }
        });
      }
      this.buttons.markBoundsDirty();
    }

    this.positionScene();
  }
}
// LayerBox class
class LayerBox extends GameObjectShapeWrapper {
  constructor(game, scene, options, random = Random.symmetric) {
    const group = new Group();
    super(game, group, options);
    this.interactive = true;
    this.scene = scene;
    this.random = random;
    this.group = group;
  }

  init() {
    // Create a random rectangle
    const size = 100;
    const color = Painter.colors.randomColorHSL();
    // Create a rectangle and group
    this.rect = new Rectangle({
      width: size,
      height: size,
      color: color,
      stroke: "white",
      lineWidth: 2,
    });
    this.width = size;
    this.height = size;
    this.group.add(this.rect);
    //
    this.startScale = 0;
    this.targetScale = 1;
    this.scaleTime = 0;
    this.scaleDuration = 1; // seconds
    //
    this.on("mouseover", () => {
      if (!this.scene.dragging) {
        this.startScale = this.scaleX;
        this.targetScale = 1.3;
        this.scaleTime = 0;
      }
    });
    this.on("mouseout", () => {
      if (!this.dragging) {
        this.startScale = this.scaleX;
        this.scaleTime = 0;
        this.targetScale = 1;
      }
    });
    //
    this.applyDraggable();
  }

  applyDraggable() {
    applyDraggable(this, {
      onDragStart: () => {
        console.log("Drag start", this.constructor.name);
        this.scene.dragging = true;
        this.scene.bringToFront(this);
        this.targetScale = 1.5;
        this.scaleTime = 0;
        this.shadowBox();
      },
      onDragEnd: () => {
        console.log("Drag end", this.constructor.name);
        //this.scene.bringToFront(this);
        this.scaleTime = 0;
        this.targetScale = 1.0;
        this.clearShadowBox();
        this.scene.dragging = false;
      },
    });
  }

  shadowBox() {
    if (this.rect.shadorColor == null) {
      this.rect.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.rect.shadowBlur = 20;
      this.rect.shadowOffsetX = 10;
      this.rect.shadowOffsetY = 10;
    }
  }

  clearShadowBox() {
    this.rect.shadowColor = null;
  }

  randomize() {
    const param = {
      symmetric: 1,
      centered: 500,
      gaussian: Math.random() * this.parent.width,
      radial: this.parent.width / 3,
    };
    const { x, y } = this.random(
      -this.parent.width / 2,
      -this.parent.height / 2,
      this.parent.width,
      this.parent.height,
      param[this.random.name]
    );
    //  console.log(x, y);
    this.x = x;
    this.y = y;
    this.scaleX = this.scaleY = 0;
    this.scaleTime = 0;
    this.targetScale = 1;
  }

  update(dt) {
    // Smooth scale animation
    // Animate scale using bounce
    if (this.scaleTime < this.scaleDuration) {
      this.scaleTime += dt;
      const t = Math.min(this.scaleTime / this.scaleDuration, 1);
      const eased = Easing.easeOutElastic(t);
      const scale = Tween.lerp(this.startScale, this.targetScale, eased);
      this.scaleX = this.scaleY = scale;
      this.tweening = true;
    } else {
      this.tweening = false;
    }
    //if (this.dragging) {
    // Set the object's own half-dimensions
    const halfW = 50;
    const halfH = 50;

    // Calculate the bounds within the parent's coordinate space
    // This creates a "safe zone" that's 10px from the edge
    const parentHalfWidth = this.parent.width / 2;
    const parentHalfHeight = this.parent.height / 2;

    // Maximum boundaries (accounting for the object's size and parent position)
    const maxX = parentHalfWidth - halfW - 10;
    const maxY = parentHalfHeight - halfH - 10;

    // Minimum boundaries (accounting for the object's size and parent position)
    const minX = -parentHalfWidth + halfW + 10;
    const minY = -parentHalfHeight + halfH + 10;

    // Clamp to parent bounds
    this.x = Math.max(minX, Math.min(maxX, this.x));
    this.y = Math.max(minY, Math.min(maxY, this.y));
    //}
    super.update(dt);
  }
}
