/**
 * WebGPURenderTarget — wraps a GPUTexture for off-screen rendering.
 * Equivalent to WebGLFBO for the WebGL pipeline.
 */
export class WebGPURenderTarget {
  /**
   * @param {GPUDevice} device
   * @param {number} width
   * @param {number} height
   * @param {GPUTextureFormat} format
   */
  constructor(device, width, height, format = "rgba8unorm") {
    this.device = device;
    this.width = width;
    this.height = height;
    this.format = format;
    this.texture = null;
    this.view = null;
    this._create();
  }

  /** @private */
  _create() {
    this.texture = this.device.createTexture({
      size: [this.width, this.height],
      format: this.format,
      usage:
        GPUTextureUsage.RENDER_ATTACHMENT |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this.view = this.texture.createView();
  }

  /**
   * Returns a color attachment descriptor for use in a render pass.
   * @param {GPULoadOp} loadOp - "clear" or "load"
   * @param {GPUColor} [clearValue] - Clear color (used when loadOp is "clear")
   * @returns {GPURenderPassColorAttachment}
   */
  colorAttachment(loadOp = "clear", clearValue = { r: 0, g: 0, b: 0, a: 0 }) {
    return {
      view: this.view,
      loadOp,
      storeOp: "store",
      clearValue,
    };
  }

  /**
   * Resize — destroys and recreates at new dimensions.
   * @param {number} w
   * @param {number} h
   */
  resize(w, h) {
    this.destroy();
    this.width = w;
    this.height = h;
    this._create();
  }

  /** Release GPU resources. */
  destroy() {
    if (this.texture) {
      this.texture.destroy();
      this.texture = null;
      this.view = null;
    }
  }
}
