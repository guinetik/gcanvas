# WebGL Module

GPU-accelerated rendering for high-performance particle systems and shader effects. Renders to an offscreen WebGL canvas that composites onto the main 2D canvas.

## Overview

GCanvas provides two WebGL renderers:

| Renderer | Purpose | Use Case |
|----------|---------|----------|
| `WebGLRenderer` | General-purpose shader rendering | Custom shader effects, procedural graphics |
| `WebGLParticleRenderer` | GPU-accelerated point sprites | 10,000+ particle systems |
| `WebGLDeJongRenderer` | Procedural attractor points (GPU iteration) | De Jong/iterative attractor demos |
| `WebGLCliffordRenderer` | Procedural attractor points (GPU iteration) | Clifford/iterative attractor demos |

Both work alongside the Canvas 2D pipeline by rendering to offscreen canvases and compositing the results.

## WebGLRenderer

Lightweight WebGL utility for custom shader effects.

### Quick Start

```javascript
import { WebGLRenderer } from '@guinetik/gcanvas';

const renderer = new WebGLRenderer(800, 600);

if (renderer.isAvailable()) {
  // Compile shaders
  renderer.useProgram('myEffect', vertexShader, fragmentShader);

  // Set uniforms
  renderer.setUniforms({
    uTime: performance.now() / 1000,
    uResolution: [800, 600]
  });

  // Render
  renderer.clear(0, 0, 0, 0);
  renderer.render();

  // Composite onto main canvas
  renderer.compositeOnto(ctx, 0, 0);
}
```

### API Reference

#### Constructor

```javascript
const renderer = new WebGLRenderer(width, height);
```

#### Methods

| Method | Description |
|--------|-------------|
| `isAvailable()` | Check if WebGL is available |
| `resize(width, height)` | Resize the renderer |
| `useProgram(name, vertexSrc, fragmentSrc)` | Compile/cache shader program |
| `setUniforms(uniforms)` | Set uniform values |
| `setColorUniform(name, hexColor)` | Set color uniform from hex string |
| `clear(r, g, b, a)` | Clear with color (0-1 range) |
| `render()` | Draw fullscreen quad |
| `compositeOnto(ctx, x, y, width?, height?)` | Draw onto 2D context |
| `getCanvas()` | Get the WebGL canvas element |
| `destroy()` | Free resources |

#### Uniform Types

```javascript
renderer.setUniforms({
  uFloat: 1.5,                    // float
  uVec2: [800, 600],              // vec2
  uVec3: [1.0, 0.5, 0.0],         // vec3
  uVec4: [1, 0, 0, 1],            // vec4
  uMatrix3: new Float32Array(9),   // mat3
  uMatrix4: new Float32Array(16),  // mat4
});

// Hex color to vec3
renderer.setColorUniform('uColor', '#FF8800');
```

### Example: Custom Shader Effect

```javascript
const vertexShader = `
  attribute vec2 aPosition;
  attribute vec2 aUv;
  varying vec2 vUv;

  void main() {
    vUv = aUv;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    float wave = sin(uv.x * 10.0 + uTime) * 0.5 + 0.5;
    gl_FragColor = vec4(uv.x, wave, uv.y, 1.0);
  }
`;

class ShaderDemo extends Game {
  init() {
    super.init();
    this.webgl = new WebGLRenderer(this.width, this.height);
    this.webgl.useProgram('wave', vertexShader, fragmentShader);
  }

  render() {
    if (this.webgl.isAvailable()) {
      this.webgl.setUniforms({
        uTime: performance.now() / 1000,
        uResolution: [this.width, this.height]
      });
      this.webgl.clear(0, 0, 0, 0);
      this.webgl.render();
      this.webgl.compositeOnto(this.ctx, 0, 0);
    }

    super.render();
  }
}
```

## WebGLParticleRenderer

GPU-accelerated particle rendering using point sprites. Handles 10,000+ particles at 60fps.

### Quick Start

```javascript
import { WebGLParticleRenderer } from '@guinetik/gcanvas';

const renderer = new WebGLParticleRenderer(10000, {
  width: 800,
  height: 600,
  shape: 'circle',      // 'circle', 'glow', 'square', 'softSquare'
  blendMode: 'alpha'    // 'alpha' or 'additive'
});

// In render loop
const projected = particles.map(p => ({
  x: p.x,
  y: p.y,
  size: p.size,
  color: { r: 255, g: 128, b: 0, a: p.opacity }
}));

renderer.clear();
const count = renderer.updateParticles(projected);
renderer.render(count);
renderer.compositeOnto(ctx, 0, 0);
```

### Constructor Options

```javascript
const renderer = new WebGLParticleRenderer(maxParticles, {
  width: 800,           // Canvas width
  height: 600,          // Canvas height
  shape: 'circle',      // Particle shape preset
  blendMode: 'alpha'    // Blend mode
});
```

#### Shape Presets

| Shape | Description |
|-------|-------------|
| `'circle'` | Hard-edged circle (default) |
| `'glow'` | Soft radial gradient glow |
| `'square'` | Hard-edged square |
| `'softSquare'` | Square with soft edges |

#### Blend Modes

| Mode | Effect |
|------|--------|
| `'alpha'` | Standard alpha blending (default) |
| `'additive'` | Additive (screen/lighter) for glow effects |

### API Reference

#### Methods

| Method | Description |
|--------|-------------|
| `isAvailable()` | Check if WebGL is available |
| `resize(width, height)` | Resize renderer |
| `setShape(shape)` | Change particle shape (recompiles shader) |
| `setBlendMode(mode)` | Change blend mode |
| `updateParticles(particles)` | Upload particle data to GPU, returns count |
| `clear(r?, g?, b?, a?)` | Clear canvas |
| `render(count)` | Draw particles |
| `compositeOnto(ctx, x, y, width?, height?)` | Draw onto 2D context |
| `destroy()` | Free resources |

#### Particle Data Format

```javascript
const particles = [{
  x: 100,           // Screen X position
  y: 200,           // Screen Y position
  size: 10,         // Point size in pixels
  color: {
    r: 255,         // Red (0-255)
    g: 128,         // Green (0-255)
    b: 0,           // Blue (0-255)
    a: 1.0          // Alpha (0-1)
  }
}];
```

### Integration with ParticleSystem

```javascript
class GPUParticleDemo extends Game {
  init() {
    super.init();

    // CPU-side particle state and physics
    this.particles = new ParticleSystem(this, {
      maxParticles: 10000,
      updaters: [Updaters.velocity, Updaters.lifetime, Updaters.opacity]
    });

    // GPU renderer
    this.gpuRenderer = new WebGLParticleRenderer(10000, {
      width: this.width,
      height: this.height,
      shape: 'glow',
      blendMode: 'additive'
    });

    // Emitter
    this.emitter = new ParticleEmitter({
      rate: 500,
      lifetime: { min: 2, max: 4 },
      size: { min: 5, max: 15 },
      color: () => ({ r: 255, g: Math.random() * 255 | 0, b: 0 })
    });

    this.particles.addEmitter(this.emitter);
  }

  render() {
    Painter.clear(this.backgroundColor);

    if (this.gpuRenderer.isAvailable()) {
      // Project particles to screen coordinates
      const projected = [];
      for (const p of this.particles.particles) {
        if (!p.alive) continue;
        projected.push({
          x: p.x,
          y: p.y,
          size: p.size,
          color: {
            r: p.color?.r ?? 255,
            g: p.color?.g ?? 255,
            b: p.color?.b ?? 255,
            a: p.opacity ?? 1
          }
        });
      }

      this.gpuRenderer.clear();
      const count = this.gpuRenderer.updateParticles(projected);
      this.gpuRenderer.render(count);
      this.gpuRenderer.compositeOnto(this.ctx, 0, 0);
    } else {
      // Fallback to Canvas 2D rendering
      this.particles.render();
    }
  }
}
```

### 3D Particle Projection

For 3D particle systems with Camera3D:

```javascript
render() {
  const projected = [];

  for (const p of this.particles.particles) {
    if (!p.alive) continue;

    // Project 3D to 2D
    const screen = this.camera.project(p.x, p.y, p.z);

    projected.push({
      x: screen.x + this.width / 2,   // Center on screen
      y: screen.y + this.height / 2,
      size: p.size * screen.scale,     // Apply perspective scaling
      color: {
        r: p.color.r,
        g: p.color.g,
        b: p.color.b,
        a: p.opacity * Math.max(0.2, screen.scale) // Fade distant particles
      }
    });
  }

  // Sort by depth (painter's algorithm)
  projected.sort((a, b) => b.z - a.z);

  this.gpuRenderer.clear();
  const count = this.gpuRenderer.updateParticles(projected);
  this.gpuRenderer.render(count);
  this.gpuRenderer.compositeOnto(this.ctx, 0, 0);
}
```

## Performance Tips

1. **Pre-allocate buffers**: WebGLParticleRenderer pre-allocates typed arrays for zero-allocation rendering
2. **Batch updates**: Call `updateParticles()` once per frame with all particles
3. **Use additive blending**: Better visual results for glow effects, slightly faster
4. **Limit max particles**: GPU can handle more, but CPU-side updates are still O(n)
5. **Use squared distance**: For sorting/culling, avoid sqrt when possible

## Fallback Detection

Both renderers check for WebGL availability:

```javascript
if (renderer.isAvailable()) {
  // Use WebGL
} else {
  // Fallback to Canvas 2D
  console.warn('WebGL not available, using Canvas 2D fallback');
}
```

## Browser Support

WebGL is supported in all modern browsers. The renderers use WebGL 1.0 for maximum compatibility.

## WebGLDeJongRenderer (Procedural Attractor Renderer)

`WebGLDeJongRenderer` is a specialized procedural renderer that performs the **De Jong iterative map in the vertex shader**, similar to the reference project (`D:/Developer/studies/DeJong-Attractor`).

- **Benefits**: avoids CPU→GPU streaming of point positions; only updates uniforms each frame.
- **Rendering model**: draws `GL_POINTS` from a static random seed buffer; you control parameters via uniforms.

See: `procedural-attractor-renderer.md` for usage details.

## See Also

- [Particle Module](../particle/README.md) - CPU-side particle systems
- [Physics Module](../physics/README.md) - Particle physics
- [Camera3D](../util/camera3d.md) - 3D projection for particles
