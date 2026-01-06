# Shape

> Fill color, stroke, and line styling for drawable primitives.

**Module:** [shapes](../README.md) | **Extends:** [Transformable](./transformable.md) | **Source:** `src/shapes/shape.js`

## Overview

Shape is the base class for all drawable geometric primitives. It's the first class in the hierarchy to express **canvas styling intent**:

- Fill & stroke colors
- Line width & join styles
- Line cap styles

Shape does not define geometry — that's up to subclasses like Circle, Rectangle, etc.

## Constructor

```js
new Shape(options)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `color` | `string \| null` | `null` | Fill color (CSS color) |
| `stroke` | `string \| null` | `null` | Stroke color (CSS color) |
| `lineWidth` | `number` | `1` | Stroke width in pixels |
| `lineJoin` | `string` | `"miter"` | Line join style |
| `lineCap` | `string` | `"butt"` | Line cap style |
| `miterLimit` | `number` | `10` | Maximum miter length |

Plus all options from [Transformable](./transformable.md).

## Properties

### Inherited

From Euclidian: `x`, `y`, `width`, `height`, `debug`, `debugColor`

From Geometry2d: `minX`, `maxX`, `minY`, `maxY`, `crisp`

From Renderable: `visible`, `opacity`, `active`, `zIndex`, `shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`

From Transformable: `rotation`, `scaleX`, `scaleY`

### Own Properties

| Property | Type | Description |
|----------|------|-------------|
| `color` | `string \| null` | Fill color (CSS color string) |
| `stroke` | `string \| null` | Stroke color (CSS color string) |
| `lineWidth` | `number` | Width of stroke in pixels |
| `lineJoin` | `"miter" \| "round" \| "bevel"` | Line join style |
| `lineCap` | `"butt" \| "round" \| "square"` | Line cap style |
| `miterLimit` | `number` | Maximum miter length before bevel |

## Fill and Stroke

```js
// Fill only
const filled = new Circle(50, {
  color: 'red'
});

// Stroke only
const outlined = new Circle(50, {
  stroke: 'blue',
  lineWidth: 2
});

// Both fill and stroke
const both = new Circle(50, {
  color: 'red',
  stroke: 'black',
  lineWidth: 2
});
```

## Color Formats

Any valid CSS color string:

```js
shape.color = 'red';                    // Named color
shape.color = '#ff0000';                // Hex
shape.color = '#f00';                   // Short hex
shape.color = 'rgb(255, 0, 0)';        // RGB
shape.color = 'rgba(255, 0, 0, 0.5)';  // RGBA
shape.color = 'hsl(0, 100%, 50%)';     // HSL
```

## Line Join Styles

Controls how lines meet at corners:

```js
shape.lineJoin = 'miter';  // Sharp corners (default)
shape.lineJoin = 'round';  // Rounded corners
shape.lineJoin = 'bevel';  // Beveled corners
```

```
  miter          round          bevel
    ╱              ╱              ╱
   ╱              ╱              ╱
──┼──          ──╲──          ──┘──
   ╲              ╲              ╲
    ╲              ╲              ╲
```

## Line Cap Styles

Controls how line endpoints look:

```js
shape.lineCap = 'butt';    // Flat end at endpoint (default)
shape.lineCap = 'round';   // Rounded end
shape.lineCap = 'square';  // Square end extending past endpoint
```

```
  butt           round          square
   │              │               │
───┤            ───●            ───┤
   │              │               │
```

## Miter Limit

When `lineJoin` is `"miter"`, very sharp angles can create very long miter points. `miterLimit` caps this:

```js
shape.lineJoin = 'miter';
shape.miterLimit = 10;  // Default, reasonable for most cases
shape.miterLimit = 2;   // Shorter miters, more beveling
```

## Subclassing

Shape is abstract. Subclasses implement `draw()`:

```js
import { Shape, Painter } from '@guinetik/gcanvas';

class CustomShape extends Shape {
  constructor(options = {}) {
    super(options);
    // Custom initialization
  }

  draw() {
    super.draw();  // Apply transforms

    // Use this.color, this.stroke, this.lineWidth, etc.
    if (this.color) {
      Painter.colors.fill(this.color);
      // Custom fill drawing
    }

    if (this.stroke) {
      Painter.colors.stroke(this.stroke, this.lineWidth);
      // Custom stroke drawing
    }
  }
}
```

## Concrete Shape Classes

These classes extend Shape:

| Class | Description |
|-------|-------------|
| `Circle` | Circle with radius |
| `Rectangle` | Centered rectangle |
| `Triangle` | Three-sided polygon |
| `Star` | Star with n points |
| `Polygon` | N-sided polygon |
| `Line` | Line segment |
| `Arc` | Curved arc |
| `Heart` | Heart shape |
| `Diamond` | Diamond/rhombus |
| ... | And many more |

## Example

```js
import { Rectangle, Painter } from '@guinetik/gcanvas';

const rect = new Rectangle({
  x: 200,
  y: 150,
  width: 100,
  height: 60,
  color: '#4ecdc4',
  stroke: '#2a9d8f',
  lineWidth: 3,
  lineJoin: 'round'
});

rect.draw();
```

## Complete Property Example

```js
const shape = new Circle(50, {
  // Position (Euclidian)
  x: 400,
  y: 300,

  // Constraints (Geometry2d)
  minX: 50,
  maxX: 750,

  // Visibility (Renderable)
  visible: true,
  opacity: 0.9,
  shadowColor: 'rgba(0,0,0,0.3)',
  shadowBlur: 10,
  shadowOffsetX: 5,
  shadowOffsetY: 5,

  // Transforms (Transformable)
  rotation: 0,
  scaleX: 1,
  scaleY: 1,

  // Styling (Shape)
  color: '#ff6b6b',
  stroke: '#c92a2a',
  lineWidth: 2,
  lineJoin: 'round',
  lineCap: 'round'
});
```

## Inheritance

```
Transformable
    └── Shape  <── You are here
            ├── Circle
            ├── Rectangle
            ├── Triangle
            ├── Star
            ├── Polygon
            └── ... (40+ shapes)
```

## Related

- [Transformable](./transformable.md) - Parent class
- [Shape Hierarchy](../hierarchy.md) - Full inheritance diagram
- [Shapes Module](../README.md) - All available shapes

## See Also

- [Rendering Pipeline](../../../concepts/rendering-pipeline.md)
- [Hello World](../../../getting-started/hello-world.md)
