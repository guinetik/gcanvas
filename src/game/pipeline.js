/**
 * Pipeline - Manages and updates/render game objects each frame.
 * Utilizes functional patterns for clarity and conciseness.
 */
export class Pipeline {
  /**
   * @param {Game} game - Reference to the owning game instance
   */
  constructor(game) {
    this.game = game;
    this.gameObjects = [];
  }

  /**
   * Adds a GameObject to the pipeline.
   * @param {GameObject} gameObject
   * @returns {GameObject} The added game object
   */
  add(gameObject) {
    this.gameObjects = [...this.gameObjects, gameObject];
    return gameObject;
  }

  /**
   * Removes a GameObject from the pipeline.
   * @param {GameObject} gameObject
   */
  remove(gameObject) {
    this.gameObjects = this.gameObjects.filter(obj => obj !== gameObject);
  }

  /**
   * Updates all active game objects.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    this.gameObjects
      .filter(obj => obj.active)
      .forEach(obj => obj.update(dt));
  }

  /**
   * Renders all active game objects.
   */
  render() {
    this.gameObjects
      .filter(obj => obj.active)
      .forEach(obj => obj.render());
  }

  /**
   * Clears the pipeline.
   */
  clear() {
    this.gameObjects = [];
  }
}
