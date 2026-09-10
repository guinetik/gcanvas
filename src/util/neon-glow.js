/** Cached, quarter-resolution glow shared by the attractor GPU backends. */
export class NeonGlow {
  draw(ctx, source, config, x, y) {
    if (!config.enabled || config.radius <= 0 || config.intensity <= 0) return;

    const width = Math.max(1, Math.ceil(source.width / 4));
    const height = Math.max(1, Math.ceil(source.height / 4));
    if (!this.source) {
      this.source = document.createElement("canvas");
      this.halo = document.createElement("canvas");
      this.sourceCtx = this.source.getContext("2d");
      this.haloCtx = this.halo.getContext("2d");
    }
    if (this.source.width !== width || this.source.height !== height) {
      this.source.width = this.halo.width = width;
      this.source.height = this.halo.height = height;
    }

    this.sourceCtx.clearRect(0, 0, width, height);
    this.sourceCtx.drawImage(source, 0, 0, width, height);
    const halo = this.haloCtx;
    halo.clearRect(0, 0, width, height);
    halo.save();
    halo.globalCompositeOperation = "lighter";
    // Tight bloom comes from the GPU; these two soft layers supply the atmosphere.
    const radius = config.radius * width / source.width;
    halo.filter = `blur(${radius}px)`;
    halo.drawImage(this.source, 0, 0);
    halo.globalAlpha = 0.45;
    halo.filter = `blur(${radius * 2.5}px)`;
    halo.drawImage(this.source, 0, 0);
    halo.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // Respect the caller's fade, including a completely transparent restart frame.
    ctx.globalAlpha *= config.intensity;
    ctx.drawImage(this.halo, x, y, source.width, source.height);
    ctx.restore();
  }

  destroy() {
    if (this.source) {
      this.source.width = this.source.height = 1;
      this.halo.width = this.halo.height = 1;
    }
    this.source = this.halo = this.sourceCtx = this.haloCtx = null;
  }
}
