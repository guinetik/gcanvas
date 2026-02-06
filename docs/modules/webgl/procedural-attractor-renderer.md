## Procedural Attractor Rendering (WebGL)

GCanvas supports a **procedural point rendering path** for iterative 2D attractors like De Jong.

Instead of generating and streaming millions of points from the CPU each frame, this approach:

- Keeps a static **seed buffer** on the GPU (random points in \([-1, 1]\))
- Runs the attractor iteration **inside the vertex shader**
- Draws `GL_POINTS` using point-sprite fragment shaders (circle/glow/etc.)
- Composites the WebGL canvas onto the engine’s 2D canvas, so you can still do **fade trails** with `Game.clear()`

### WebGLDeJongRenderer

`WebGLDeJongRenderer` is a specialized renderer for the De Jong map:

\[
x_{n+1} = \sin(a y_n) - \cos(b x_n)\qquad
y_{n+1} = \sin(c x_n) - \cos(d y_n)
\]

### Quick start

```js
import { WebGLDeJongRenderer } from "@guinetik/gcanvas";

const r = new WebGLDeJongRenderer(1 << 18, {
  width: 800,
  height: 600,
  shape: "glow",
  blendMode: "additive",
  iterations: 100,
  pointSize: 1.0,
  pointScale: 0.5,
  color: { r: 1, g: 1, b: 1, a: 0.12 },
  params: { a: -2.0, b: -2.0, c: -1.2, d: 2.0 },
});

// render loop
r.setZoom(1.0);
r.setTransform(WebGLDeJongRenderer.rotationMat3(0.2));
r.clear(0, 0, 0, 0);
r.render(performance.now() / 1000);
r.compositeOnto(ctx, 0, 0);
```

### Parameters & animation

- **Parameters**: call `setParams({a,b,c,d})`
- **Iteration count**: call `setIterations(n)` (clamped to shader max)
- **Zoom**: call `setZoom(z)`
- **Rotation/transform**: call `setTransform(mat3)`

### Trails (fade accumulation)

Because `WebGLDeJongRenderer` composites onto your main 2D canvas, you can do trails by fading the canvas each frame:

```js
clear() {
  Painter.useCtx((ctx) => {
    ctx.fillStyle = "rgba(0,0,0,0.01)";
    ctx.fillRect(0, 0, this.width, this.height);
  });
}
```

### Performance notes

- `seedCount` is the primary cost driver (reference uses \(2^{18}\)).
- `iterations` multiplies work per point; raise carefully.
- `shape: "glow"` looks great but costs more than `"square"`.

### WebGLCliffordRenderer

`WebGLCliffordRenderer` applies the same procedural approach to the Clifford map:

\[
x_{n+1} = \sin(a y_n) + c\cos(a x_n)\qquad
y_{n+1} = \sin(b x_n) + d\cos(b y_n)
\]

Usage is the same pattern as `WebGLDeJongRenderer` (seed count, iterations, params, zoom, transform, and optional color ramp).

