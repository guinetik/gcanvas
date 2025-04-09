import {
  Game,
  Scene,
  HorizontalLayout,
  Rectangle,
  ShapeGOFactory,
  Button,
  FPSCounter,
} from "/gcanvas/gcanvas.es.min.js";

export class VisibilityDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    // 1) A horizontal layout of squares at screen center
    this.squaresLayout = new HorizontalLayout(game, {
      anchor: "center",
      spacing: 1,
      padding: 4,
      debug: true,
    });
    this.add(this.squaresLayout);
    // Create a few colored squares and add them to the layout
    const colors = ["#0f0", "#0f0", "#0f0"];
    for (let i = 0; i < colors.length; i++) {
      const rect = new Rectangle(0, 0, 100, 100, {
        fillColor: colors[i],
      });
      const squareGO = ShapeGOFactory.create(game, rect);
      this.squaresLayout.add(squareGO);
      console.log("SquareGO", squareGO.width, squareGO.height);
    }
    //this.scaleX = this.scaleY = 4;
    // 2) A UI scene that holds the buttons
    this.uiScene = new Scene(game, { x: 0, y: 0 });
    this.add(this.uiScene);
    // Create another HorizontalLayout anchored center-right for buttons
    const buttonLayout = new HorizontalLayout(game, {
      anchor: "bottom-center",
      spacing: 0,
      padding: 10,
    });
    buttonLayout.width = 200;
    this.uiScene.add(buttonLayout);
    // A button that toggles visibility of a random square
    let currentSquare = null;
    const pickOne = () => {
      if (currentSquare) {
        currentSquare.visible = !currentSquare.visible;
      }
      const index = Math.floor(
        Math.random() * this.squaresLayout.children.length
      );
      const square = this.squaresLayout.children[index];
      if (currentSquare == square) {
        currentSquare = null;
        return pickOne();
      }
      currentSquare = square;
      currentSquare.visible = !currentSquare.visible;
    };
    const toggleBtn = new Button(game, {
      text: "Toggle Random",
      width: 120,
      onClick: () => {
        pickOne();
      },
    });
    buttonLayout.add(toggleBtn);
  }

  update(dt) {
    super.update(dt);
  }
}

//
export class MyGame extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "black";
    this.enableFluidSize();
  }

  init() {
    super.init();
    this.pipeline.add(new VisibilityDemo(this));
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: "bottom-right",
      })
    );
  }
}
