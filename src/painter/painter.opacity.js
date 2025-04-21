import { Painter } from "./painter";

export class PainterOpacity {
  static _opacityStack = [1]; // Initialize with full opacity

  static pushOpacity(opacity) {
    // Compute compound opacity (multiply with current)
    const currentOpacity = this._opacityStack[this._opacityStack.length - 1];
    const newOpacity = currentOpacity * opacity;
    // Push to stack and apply
    this._opacityStack.push(newOpacity);
    Painter.logger.log("NEXT OPACITY WILL BE", newOpacity);
    Painter.effects.setAlpha(newOpacity);
  }

  static popOpacity() {
    if (this._opacityStack.length > 1) {
      this._opacityStack.pop();
      const newOpacity = this._opacityStack[this._opacityStack.length - 1];
      Painter.logger.log("NEXT OPACITY WILL BE", newOpacity);
      Painter.effects.setAlpha(newOpacity);
    }
  }

  static _clone() {
    // Create a deep copy of the opacity stack
    this._opacityStack = [...this._opacityStack];
  }
  

  static saveOpacityState() {
    this._opacityStateBackup = [...this._opacityStack];
  }
  
  static restoreOpacityState() {
    if (this._opacityStateBackup) {
      this._opacityStack = this._opacityStateBackup;
      delete this._opacityStateBackup;
    }
  }
}
