/**
 * GCanvas - TypeScript Definitions
 * A minimalist 2D canvas rendering library with shapes, game engine, and animations.
 *
 * @version 0.0.3-alpha
 * @see https://github.com/guinetik/gcanvas
 * @license ISC
 */

// ==========================================================================
// Common Types (re-exported for direct import)
// ==========================================================================

export {
  // Basic types
  Point,
  Bounds,
  EasingFunction,
  EventCallback,

  // Motion types
  MotionCallbacks,
  MotionState,
  MotionResult,
  MotionPositionResult,
  MotionValueResult,
  SpringResult,
  WaypointResult,

  // Layout types
  LayoutOptions,
  LayoutResult,

  // Penrose types
  RGBAColor,
  PenroseTilingOptions
} from './common';

// ==========================================================================
// Logger Module
// ==========================================================================

export {
  Logger,
  Loggable,
  LoggableOptions,
  DebugTab
} from './logger';

// ==========================================================================
// Shapes Module
// ==========================================================================

export {
  // Base classes
  Euclidian,
  EuclidianOptions,
  Geometry2d,
  Geometry2dOptions,
  Traceable,
  Renderable,
  RenderableOptions,
  Transformable,
  TransformableOptions,
  Transform,
  TransformProps,
  Shape,
  ShapeOptions,
  Group,
  GroupOptions,

  // Basic shapes
  Circle,
  Rectangle,
  RoundedRectangle,
  RoundedRectangleOptions,
  Square,
  Arc,
  ArcOptions,
  Line,
  Triangle,
  Star,
  StarOptions,
  Polygon,
  Hexagon,
  Diamond,
  Cross,
  Heart,
  Ring,
  RingOptions,
  Cloud,
  Pin,
  Arrow,
  PieSlice,
  PieSliceOptions,
  BezierShape,
  SVGShape,
  StickFigure,
  PatternRectangle,
  PatternRectangleOptions,
  ImageShape,
  ImageShapeOptions,

  // 2.5D shapes
  Cube,
  CubeOptions,
  Cylinder,
  Cone,
  Prism,
  Sphere,

  // Text shapes
  TextShape,
  TextShapeOptions,
  OutlinedText,
  OutlinedTextOptions,
  WrappedText
} from './shapes';

// ==========================================================================
// Painter Module
// ==========================================================================

export {
  Painter,
  PainterColors,
  PainterEffects,
  PainterImages,
  PainterLines,
  PainterOpacity,
  PainterShapes,
  PainterText
} from './painter';

// ==========================================================================
// IO Module
// ==========================================================================

export {
  EventEmitter,
  Mouse,
  Keys,
  Touch,
  Input
} from './io';

// ==========================================================================
// Game Module
// ==========================================================================

export {
  Game,
  Pipeline,
  GameObject,
  GameObjectOptions,
  Scene,
  SceneOptions,
  GameObjectShapeWrapper,
  ShapeGOFactory,
  Text,
  TextGameObjectOptions,
  ImageGo,

  // Layout scenes
  LayoutScene,
  HorizontalLayout,
  VerticalLayout,
  TileLayout,
  GridLayout,

  // UI components
  Button,
  ButtonOptions,
  ToggleButton,
  Cursor,
  CursorOptions,
  FPSCounter
} from './game';

// ==========================================================================
// Motion Module
// ==========================================================================

export {
  Easing,
  Tween,
  Tweenetik,
  TweenetikOptions,
  Motion,
  SpringParams,
  PositionTarget
} from './motion';

// ==========================================================================
// Math Module
// ==========================================================================

export {
  Random,
  Complex,
  Fractals,
  Patterns,
  Noise,
  generatePenroseTilingPixels
} from './math';

// ==========================================================================
// Util Module
// ==========================================================================

export {
  ZOrderedCollection,
  ZOrderedCollectionOptions,
  Position,
  TaskManager,

  // Layout types
  LayoutItem,
  ApplyLayoutOptions,
  LinearLayoutOptions,
  TileLayoutOptions,
  GridLayoutOptions,

  // Layout functions
  applyLayout,
  horizontalLayout,
  verticalLayout,
  tileLayout,
  gridLayout
} from './util';

// ==========================================================================
// Mixins Module
// ==========================================================================

export {
  applyDraggable,
  DraggableOptions,
  applyAnchor,
  AnchorOptions
} from './mixins';

// ==========================================================================
// Sound Module
// ==========================================================================

export {
  // Main classes
  Synth,
  Sound,

  // Sub-modules
  SynthOscillators,
  SynthEffects,
  SynthEnvelope,
  SynthNoise,
  SynthMusical,
  SynthAnalyzer,

  // Types
  SynthOptions,
  ToneOptions,
  ContinuousOscillatorController,
  DelayEffect,
  TremoloEffect,
  DroneController,
  EnvelopeOptions,
  EnvelopePresets,
  ScaleName,
  ChordType
} from './sound';
