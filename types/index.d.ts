/**
 * GCanvas - TypeScript Definitions
 * A minimalist 2D canvas rendering library with shapes, game engine, and animations.
 *
 * @version 1.0.1
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
  BitmapSource,

  // 2.5D shapes
  Cube,
  CubeOptions,
  Cylinder,
  Cone,
  Prism,
  Sphere,
  Sphere3D,
  Sphere3DOptions,

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
  FPSCounter,
  Tooltip,
  TooltipOptions,
  Stepper,
  StepperOptions,
  UI_THEME,

  // 3D and Isometric scenes
  Scene3D,
  Scene3DOptions,
  IsometricScene,
  IsometricSceneOptions,

  // Fluid simulation
  FluidSystem,
  FluidSystemOptions
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
  PositionTarget,

  // Standalone motion functions (V1 API)
  bezierV1,
  bounceV1,
  floatV1,
  followPath,
  orbitV1,
  oscillateV1,
  parabolicV1,
  patrolV1,
  pendulumV1,
  pulseV1,
  hopV1,
  shakeV1,
  spiralV1,
  springV1,
  swingV1,
  waypointV1
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
  generatePenroseTilingPixels,

  // Tensor for GR calculations
  Tensor,
  TensorOptions,

  // Physics modules (General Relativity)
  gravitationalLensingAngle,
  timeDilationFactor,
  gravitationalRedshift,

  // Orbital Mechanics
  OrbitalState,
  OrbitalElements,
  orbitalVelocity,
  orbitalPeriod,
  elementsToState,
  propagateOrbit,

  // Quantum Mechanics
  gaussianWavePacket,
  probabilityDensity,
  particleInBox,
  harmonicOscillator,

  // Heat Transfer
  heatTransfer,
  buoyancyForce,
  temperatureDecay,

  // Fluid Dynamics
  viscosityDrag,
  surfaceTension,
  reynoldsNumber,
  pressureGradient
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
  gridLayout,

  // Camera3D
  Camera3D,
  Camera3DOptions,
  ProjectedPoint,
  MouseControlOptions,
  FollowOptions,
  MoveToOptions,

  // IsometricCamera
  IsometricCamera,
  IsometricCameraOptions
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

// ==========================================================================
// Collision Module
// ==========================================================================

export {
  // Main classes
  Collision,
  CollisionSystem,

  // Types
  CollisionCircle,
  LineSegment,
  SweepResult,
  OverlapResult,
  MTVResult,
  Collidable,
  CollisionPairOptions,
  CollisionCallback
} from './collision';

// ==========================================================================
// State Module
// ==========================================================================

export {
  // Main class
  StateMachine,

  // Types
  StateTransition,
  StateEvents,
  StateConfig,
  States,
  StateMachineOptions,
  PhaseConfig,
  SequenceOptions
} from './state';

// ==========================================================================
// Fluent API Module
// ==========================================================================

export {
  // Entry points
  gcanvas,
  sketch,

  // Builder classes
  FluentGame,
  FluentGameOptions,
  FluentScene,
  FluentSceneOptions,
  FluentGO,
  FluentLayer,

  // Sketch API
  SketchAPI,
  SketchContext,

  // Context
  FluentContext,
  TransitionOptions
} from './fluent';

// ==========================================================================
// Particle System Module
// ==========================================================================

export {
  // Core classes
  Particle,
  ParticleEmitter,
  ParticleSystem,

  // Types
  ParticleColor,
  ParticleShape,
  ParticleEmitterOptions,
  ParticleSystemOptions,
  ParticleUpdater,

  // Updaters namespace
  Updaters
} from './particle';

// ==========================================================================
// Physics Module
// ==========================================================================

export {
  Physics,
  PhysicsUpdaters,
  CollisionResult,
  ForceResult,
  VelocityResult,
  ElasticCollisionResult,
  Bounds3D,
  Sphere as PhysicsSphere,
  Position3D,
  PhysicsParticle
} from './physics';

// ==========================================================================
// WebGL Module (Optional)
// ==========================================================================

export {
  WebGLRenderer,
  WebGLRendererOptions,
  SPHERE_SHADERS
} from './webgl';
