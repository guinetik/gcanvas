import {
  Game,
  Scene,
  HorizontalLayout,
  Rectangle,
  ShapeGOFactory,
  Button,
  FPSCounter,
  Square,
  Position,
} from "../../src/index";

export class VisibilityDemo extends Scene {
  constructor(game, options = {}) {
    super(game, options);
    this.MARGIN = 20;
    // 1) A horizontal layout of squares at screen center
    this.squaresLayout = new HorizontalLayout(game, {
      spacing: 1,
      padding: 4,
    });
    this.add(this.squaresLayout);
    // Create a few colored squares and add them to the layout
    const colors = ["#0f0", "#0f0", "#0f0"];
    for (let i = 0; i < colors.length; i++) {
      const rect = new Square(100, {
        color: colors[i],
      });
      const squareGO = ShapeGOFactory.create(game, rect);
      this.squaresLayout.add(squareGO);
    }
    // 2) A UI scene that holds the buttons
    this.uiScene = new Scene(game, {
      name: "UI Scene",
      width: 120,
      height: 40,
      anchor: Position.BOTTOM_CENTER,
      anchorMargin: 20,
    });
    this.uiScene.width = 150;
    this.uiScene.height = 50;
    this.add(this.uiScene);
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
    this.uiScene.add(toggleBtn);
  }

  update(dt) {
    // Update scene dimensions based on margin
    this.width = this.game.width - this.MARGIN * 2;
    this.height = this.game.height - this.MARGIN * 2;
    // Center the scene in the game
    this.x = this.game.width / 2;
    this.y = this.game.height / 2;
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
    this.scene = new VisibilityDemo(this, {
      width: this.width,
      height: this.height,
    });
    this.pipeline.add(this.scene);
    this.pipeline.add(
      new FPSCounter(this, {
        anchor: Position.BOTTOM_RIGHT,
      })
    );
  }
}
