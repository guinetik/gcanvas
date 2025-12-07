import {
  Game,
  GameObject,
  ShapeGOFactory,
  Rectangle,
  HorizontalLayout,
  Circle,
  TextShape,
  Scene,
  Motion,
  Easing,
} from "/gcanvas.es.min.js";
/**
 * SceneLayoutDemo
 *
 * This creates a HorizontalLayout (which is a subclass of Scene),
 * then populates it with "shape-based game objects," using
 * ShapeGOFactory to wrap each Shape. All children are laid out side-by-side.
 * Finally, we animate the entire layout's rotation and scale so you can see
 * everything move as a single unit.
 */
export class SceneLayoutDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    // Add a few shapes as “children” of the layout, using ShapeGOFactory
    // so that each shape is wrapped into a minimal GameObject.
    const shapes = [];

    // A small rectangle
    const rect = ShapeGOFactory.create(
      game,
      new Rectangle(0, 0, 60, 60, {
        fillColor: "#f00",
        strokeColor: "#000",
        lineWidth: 2
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
        lineWidth: 2
      }),
      
    );
    circle.width = 60;
    circle.height = 60;
    shapes.push(circle);
    ///
    /**
     * A simple scene to add the shapes to
     * {debugColor:"#FF00FF"}
     */
    this.simpleScene = new Scene(this.game, {debugColor:"#FF00FF"});
    this.simpleScene.animTime = 0;
    shapes.forEach((shapeGO, i) => {
      this.simpleScene.add(shapeGO);
      shapeGO.x = i * 80;
    });
    this.add(this.simpleScene);
    /**
     * A HorizontalLayout is essentially a Scene that positions its children
     * in a row. It inherits from Scene -> GameObject -> Transformable,
     * so it has x, y, rotation, scaleX, scaleY, etc.
     
    this.layout = new HorizontalLayout(game, {
      x: 0,
      y: 0,
      spacing: 20, // Extra spacing between items
      padding: 20, // Extra space inside the layout container
      align: "center", // Center them vertically within the row
      autoSize: true,
      debug: true,
      anchor: "center", // middle of the screeeen
    });

    

    // Add them to the layout (which is effectively a Scene)
    shapes.forEach((shapeGO) => {
      this.layout.add(shapeGO);
    });

    // The HorizontalLayout’s “x,y,rotation,scaleX,scaleY” can be manipulated:
    this.layout.rotation = 0;
    this.layout.scaleX = 1;
    this.layout.scaleY = 1;
    this.elapsed = 0;
    //this.add(this.layout);
    */
  }

  /**
   * In update(dt), we:
   * - Let the layout handle the children’s positioning
   * - Animate the entire layout with rotation and scale
   */
  update(dt) {
    this.x = this.game.width/2;
    this.y = this.game.height/2;
    super.update(dt);
    this.simpleScene.animTime += dt;
    // Use Motion.oscillate for rotation (oscillates between min and max values)
    const rotationResult = Motion.oscillate(
      0,
      -90,
      this.simpleScene.animTime,
      60,
      true
    );
    this.simpleScene.rotation = rotationResult.value;
    //console.log("rotation", rotationResult);
    // Use Motion.pulse for scaling (pulses between min and max)
    const scaleResult = Motion.pulse(
      0.8, // Min scale
      1.2, // Max scale
      this.simpleScene.animTime, // Current time
      Math.PI / 2, // Duration of one pulse cycle
      true, // Loop animation
      false, // No yoyo
      Easing.easeInOutQuad // Smoother easing
    );
    this.simpleScene.scaleX = scaleResult.value;
    this.simpleScene.scaleY = scaleResult.value;
    //
    //console.log(this.simpleScene.width, this.simpleScene.height);
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
