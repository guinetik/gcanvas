/**
 * @module Shapes
 * @description Comprehensive collection of drawable shapes and visual elements for canvas rendering.
 *
 * This module provides a rich library of shape primitives that can be used to create
 * complex visual elements in canvas-based games and applications. All shapes are built on
 * a consistent foundation that includes:
 *
 * - Common positioning and sizing (x, y, width, height)
 * - Transformation capabilities (rotation, scaling)
 * - Styling options (fill, stroke, opacity)
 * - Shadow effects
 * - Consistent bounding box calculations for hit detection
 *
 * The hierarchy is as follows:
 * - {@link Transformable}: Base class providing transformation properties
 *   - {@link Shape}: Abstract base class adding drawing capabilities
 *     - Numerous concrete shape implementations like {@link Rectangle}, {@link Circle}, {@link Cube}, etc.
 *
 * Each shape can be used standalone with the Painter system or wrapped in a
 * GameObject to participate in the game's update/render pipeline.
 *
 * @example
 * // Creating and styling a simple rectangle
 * import { Rectangle } from './core/shapes';
 * import { Painter } from './core/painter';
 *
 * // Initialize painter with canvas context
 * Painter.init(ctx);
 *
 * // Create and draw a rectangle
 * const rect = new Rectangle(100, 100, 200, 150, {
 *   color: '#3498db',
 *   stroke: '#2980b9',
 *   lineWidth: 2,
 *   rotation: Math.PI / 6,  // 30 degrees in radians
 *   opacity: 0.8
 * });
 * rect.draw();
 *
 * @example
 * // Creating a 3D-looking isometric cube
 * import { Cube } from './core/shapes';
 *
 * const cube = new Cube(200, 200, 80, {
 *   faceTopColor: '#e74c3c',
 *   faceLeftColor: '#c0392b',
 *   faceRightColor: '#a93226',
 *   rotationX: Math.PI / 8,
 *   rotationY: Math.PI / 6
 * });
 * cube.draw();
 *
 * @example
 * // Adding text with wrapping capabilities
 * import { WrappedText } from './core/shapes';
 *
 * const text = new WrappedText(50, 50,
 *   "This is a longer text that will automatically wrap to fit within the specified width.",
 *   300, 24, {
 *     color: '#333',
 *     font: '18px Arial',
 *     align: 'center',
 *     outlineColor: '#fff',
 *     outlineWidth: 2
 *   }
 * );
 * text.draw();
 *
 * @see {@link GameObject} For wrapping shapes in game objects to add to the pipeline
 * @see {@link ShapeGOFactory} For a utility to quickly create GameObject wrappers for shapes
 */
//Shape Abstracts
export { Euclidian } from "./euclidian.js";
export { Geometry2d } from "./geometry.js";
export { Traceable } from "./traceable.js";
export { Renderable } from "./renderable.js";
export { Transformable } from "./transformable.js";
export { Transform } from "./transform.js";
export { Shape } from "./shape.js";
export { Group } from "./group.js";
// Shape Primitives
export { Arc } from "./arc.js";
export { Circle } from "./circle.js";
export { Cloud } from "./clouds.js";
export { BezierShape } from "./bezier.js";
export { Rectangle } from "./rect.js";
export { RoundedRectangle } from "./roundrect.js";
export { PatternRectangle } from "./pattern";
export { Square } from "./square.js";
export { Cube } from "./cube.js";
export { Cone } from "./cone.js";
export { Prism } from "./prism.js";
export { Cylinder } from "./cylinder.js";
export { Diamond } from "./diamond.js";
export { Line } from "./line.js";
export { Triangle } from "./triangle.js";
export { Star } from "./star.js";
export { Sphere } from "./sphere.js";
export { SVGShape } from "./svg.js";
export { StickFigure } from "./figure.js";
export { Ring } from "./ring.js";
export { Polygon } from "./poly.js";
export { Arrow } from "./arrow.js";
export { Pin } from "./pin.js";
export { PieSlice } from "./slice.js";
export { Hexagon } from "./hexagon.js";
export { Heart } from "./heart.js";
export { Cross } from "./cross.js";
export * from "./text.js";
