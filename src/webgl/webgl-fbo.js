/**
 * WebGLFBO - Reusable Framebuffer Object helper for WebGL 1.
 *
 * Wraps a GL framebuffer + RGBA texture for off-screen rendering.
 * Used by WebGLAttractorPipeline for scene capture and bloom passes.
 */
export class WebGLFBO {
  /**
   * @param {WebGLRenderingContext} gl
   * @param {number} width
   * @param {number} height
   * @param {GLenum} [filter=gl.LINEAR] - Texture min/mag filter
   */
  constructor(gl, width, height, filter) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.filter = filter !== undefined ? filter : gl.LINEAR;
    this.framebuffer = null;
    this.texture = null;
    this._create();
  }

  /** @private */
  _create() {
    const gl = this.gl;

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      this.width, this.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, this.texture, 0
    );

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Bind this FBO as the render target. */
  bind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
  }

  /** Unbind (return to default framebuffer). */
  unbind() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Resize the FBO — destroys and recreates at new dimensions.
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
    const gl = this.gl;
    if (this.framebuffer) {
      gl.deleteFramebuffer(this.framebuffer);
      this.framebuffer = null;
    }
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
  }
}
