import {
  Game,
  GameObject,
  ShapeGOFactory,
  Rectangle,
  HorizontalLayout,
  Circle,
  TextShape,
} from "/gcanvas/gcanvas.es.min.js";
/**
 * SceneLayoutDemo
 *
 * This creates a HorizontalLayout (which is a subclass of Scene),
 * then populates it with "shape-based game objects," using
 * ShapeGOFactory to wrap each Shape. All children are laid out side-by-side.
 * Finally, we animate the entire layout's rotation and scale so you can see
 * everything move as a single unit.
 */
export class SceneLayoutDemo extends GameObject {
  constructor(game, options = {}) {
    super(game, options);
    /**
     * A HorizontalLayout is essentially a Scene that positions its children
     * in a row. It inherits from Scene -> GameObject -> Transformable,
     * so it has x, y, rotation, scaleX, scaleY, etc.
     */
    this.layout = new HorizontalLayout(game, {
      x: game.width / 2, // We'll start it roughly in the center
      y: game.height / 2,
      spacing: 20, // Extra spacing between items
      padding: 20, // Extra space inside the layout container
      align: "center", // Center them vertically within the row
      autoSize: true,
      debug: true,
    });

    // Add a few shapes as “children” of the layout, using ShapeGOFactory
    // so that each shape is wrapped into a minimal GameObject.
    const shapes = [];

    // A small rectangle
    const rect = ShapeGOFactory.create(
      game,
      new Rectangle(0, 0, 60, 60, {
        fillColor: "#f00",
        strokeColor: "#000",
        lineWidth: 2,
      })
    );
    rect.width = 60;
    rect.height = 60;
    shapes.push(rect);

    // A circle
    const circle = ShapeGOFactory.create(
      game,
      new Circle(0, 0, 30, {
        fillColor: "#3f3",
        strokeColor: "#000",
        lineWidth: 2,
      })
    );
    circle.width = 60;
    circle.height= 60;
    shapes.push(circle);

    // Add them to the layout (which is effectively a Scene)
    shapes.forEach((shapeGO) => {
      this.layout.add(shapeGO);
    });

    // The HorizontalLayout’s “x,y,rotation,scaleX,scaleY” can be manipulated:
    this.layout.rotation = 0;
    this.layout.scaleX = 1;
    this.layout.scaleY = 1;

    this.elapsed = 0;
  }

  /**
   * In update(dt), we:
   * - Let the layout handle the children’s positioning
   * - Animate the entire layout with rotation and scale
   */
  update(dt) {
    this.layout.x = (game.width - this.layout.width) / 2; // We'll start it roughly in the center
    this.layout.y = (game.height - this.layout.height) / 2;
    // Scenes (and Layouts) automatically update their children,
    // including position computations. So we just do big transforms:
    this.elapsed += dt;
    // Spin around
    this.layout.rotation = Math.sin(this.elapsed) * 0.6; // ~ +/- 0.6 rad
    // Pulse scale from ~0.8 to ~1.2
    const pulse = 0.2 * Math.sin(this.elapsed * 2);
    this.layout.scaleX = 1 + pulse;
    this.layout.scaleY = 1 + pulse;
    // Let the layout do its normal updates
    this.layout.update(dt);
    super.update(dt);
  }

  /**
   * Scenes (and Layouts) handle rendering their children. Just call layout.render().
   */
  render() {
    this.layout.render();
  }
}
//
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.pipeline.add(new SceneLayoutDemo(this));
  }
}
