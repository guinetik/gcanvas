/**
 * Lorenz Racer 3D - F-Zero GX Style
 *
 * Race through a MASSIVE 3D Lorenz attractor in space. You're tiny, racing
 * through a giant glowing laser tube that follows the Lorenz butterfly shape.
 * Fall off the edge and you tumble into the void.
 *
 * Features:
 * - Full 3D Lorenz curve (not flattened)
 * - Frenet-Serret frames (TNB) for proper orientation
 * - Rotation Minimizing Frames to prevent twisting
 * - Glowing laser tube rendering with multi-pass bloom
 * - F-Zero style ship physics and camera
 */

import { Game, Gesture, Keys, Painter, Screen, Attractors } from "../../src/index.js";
import { Camera3D } from "../../src/util/camera3d.js";
import { WebGLLineRenderer } from "../../src/webgl/webgl-line-renderer.js";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Attractor settings
  attractor: {
    dt: 0.005,
    scale: 50, // Massive scale (was 12)
  },

  // Center offset - Lorenz attractor orbits around z≈27 (ρ-1)
  center: {
    x: 0,
    y: 0,
    z: 27,
  },

  // Particle settings (formation visuals)
  particles: {
    count: 360,
    trailLength: 240,
    spawnRange: 2,
  },

  // Visual settings
  visual: {
    minHue: 30,
    maxHue: 200,
    maxSpeed: 50,
    saturation: 85,
    lightness: 55,
    maxAlpha: 0.85,
    hueShiftSpeed: 15,
    // Tube glow settings
    tubeGlowPasses: 4,
    coreColor: [255, 255, 255],
    glowColor: [0, 255, 220],
    outerGlowColor: [0, 180, 255],
  },

  // Glitch/blink effect
  blink: {
    chance: 0.015,
    minDuration: 0.05,
    maxDuration: 0.25,
    intensityBoost: 1.4,
    saturationBoost: 1.15,
    alphaBoost: 1.25,
  },

  // Zoom settings
  zoom: {
    min: 0.08,
    max: 2.5,
    speed: 0.5,
    easing: 0.12,
    formationZoom: 0.18, // Zoomed out to see whole attractor
    raceZoom: 1.2, // Zoomed in for racing
  },

  // Camera settings (formation view)
  camera: {
    perspective: 1200, // Higher = feels bigger (was 800)
    rotationX: -0.4, // Slight downward angle to see butterfly shape
    rotationY: 0.3, // Angled to show both wings
    inertia: true,
    friction: 0.95,
    clampX: false,
  },

  // Race experience
  race: {
    formationSeconds: 10,
    cinematicSeconds: 2.5,

    // Track settings
    track: {
      burnInSteps: 2000,
      points: 36000, // More points for longer track
      resampleCount: 3600, // Higher resolution
      tubeRadius: 25, // Driveable half-width
      visualRadius: 40, // Glow extends beyond
      railSampleSpan: 2400, // How many points around ship to draw
      railStep: 3,
    },

    // Ship controls
    ship: {
      maxSpeed: 2400, // Much faster (was 520)
      accel: 1800, // (was 420)
      brake: 2400,
      drag: 0.0025,

      // Lateral
      steerAccel: 800, // (was 220)
      steerDamping: 5.0,

      // Boost
      boostAccel: 1200,
      boostEnergyPerSecond: 22,
      energyRegenPerSecond: 10,
      energyMax: 100,

      // Falling/gravity
      gravity: 150, // Pull toward centerline
      fallGravity: 800,
      fallResetSeconds: 1.8,
    },

    // Follow camera (in ship's local TNB frame)
    follow: {
      offset: { forward: -180, up: 60, right: 0 },
      lookAhead: 120, // World units ahead (was 55)
      lerp: 0.10,
    },

    // Cinematic targets
    cinematic: {
      zoomEase: 0.06, // Slower ease for dramatic zoom-in
    },
  },

  // Speed effects
  speedEffects: {
    speedLinesThreshold: 1200, // Speed at which lines appear
    speedLinesCount: 24,
    speedLinesLength: 150,
    boostFovMultiplier: 1.15,
    fovLerpSpeed: 0.08,
  },

  // Gate markers
  gates: {
    spacing: 400, // World units between gates
    ringSegments: 24,
    innerRadius: 20,
    outerRadius: 35,
    color: [0, 255, 180],
    alpha: 0.4,
  },

  // Controls
  controls: {
    resetKey: Keys.R,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MATH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(255 * f(0)), g: Math.round(255 * f(8)), b: Math.round(255 * f(4)) };
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function len3(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function norm3(v) {
  const l = len3(v) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

function sub3(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add3(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function mul3(v, s) {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerp3(a, b, t) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/**
 * Compute camera rotations to look from `from` to `to`.
 */
function computeLookAtRot(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const distXZ = Math.sqrt(dx * dx + dz * dz);
  return {
    rotationY: Math.atan2(dx, dz),
    rotationX: Math.atan2(-dy, distXZ),
  };
}

/**
 * Seeded RNG (mulberry32).
 */
function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getSeedFromUrl() {
  try {
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("seed");
    if (raw != null && raw.trim() !== "") {
      const n = Number(raw);
      if (Number.isFinite(n)) return (n | 0) >>> 0;
    }
  } catch {
    // ignore
  }
  return (Math.floor(Date.now() / 1000) ^ 0x9e3779b9) >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRACTOR PARTICLE (formation visuals)
// ─────────────────────────────────────────────────────────────────────────────

class AttractorParticle {
  constructor(stepFn, spawnRange) {
    this.stepFn = stepFn;
    this.position = {
      x: (Math.random() - 0.5) * spawnRange,
      y: (Math.random() - 0.5) * spawnRange,
      z: (Math.random() - 0.5) * spawnRange + CONFIG.center.z,
    };
    this.trail = [];
    this.speed = 0;
    this.blinkTime = 0;
    this.blinkIntensity = 0;
  }

  updateBlink(dt) {
    const { chance, minDuration, maxDuration } = CONFIG.blink;
    if (this.blinkTime > 0) {
      this.blinkTime -= dt;
      this.blinkIntensity = Math.max(
        0,
        this.blinkTime > 0
          ? Math.sin((this.blinkTime / ((minDuration + maxDuration) * 0.5)) * Math.PI)
          : 0
      );
    } else {
      if (Math.random() < chance) {
        this.blinkTime = minDuration + Math.random() * (maxDuration - minDuration);
        this.blinkIntensity = 1;
      } else {
        this.blinkIntensity = 0;
      }
    }
  }

  update(dt, scale) {
    const result = this.stepFn(this.position, dt);
    this.position = result.position;
    this.speed = result.speed;

    // Add to trail (scaled and centered) - NO rotation, full 3D
    const v = {
      x: (this.position.x - CONFIG.center.x) * scale,
      y: (this.position.y - CONFIG.center.y) * scale,
      z: (this.position.z - CONFIG.center.z) * scale,
    };
    this.trail.unshift({ ...v, speed: this.speed });

    if (this.trail.length > CONFIG.particles.trailLength) {
      this.trail.pop();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3D TRACK GENERATION WITH FRENET-SERRET FRAMES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate raw Lorenz points in full 3D.
 */
function generateLorenzPoints3D(stepFn, count) {
  const { burnInSteps } = CONFIG.race.track;
  const { dt, scale } = CONFIG.attractor;

  let p = { x: 0.1, y: 0, z: CONFIG.center.z + 0.1 };
  for (let i = 0; i < burnInSteps; i++) {
    p = stepFn(p, dt).position;
  }

  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    p = stepFn(p, dt).position;
    out[i] = {
      x: (p.x - CONFIG.center.x) * scale,
      y: (p.y - CONFIG.center.y) * scale,
      z: (p.z - CONFIG.center.z) * scale,
    };
  }
  return out;
}

/**
 * Resample a 3D curve to uniform arc-length.
 */
function resampleCurve3D(pts, count) {
  const n = pts.length;
  if (n < 2) return pts.slice();

  // Compute cumulative arc-length
  const cum = new Array(n);
  cum[0] = 0;
  let total = 0;
  for (let i = 1; i < n; i++) {
    total += len3(sub3(pts[i], pts[i - 1]));
    cum[i] = total;
  }
  if (total <= 1e-6) return pts.slice();

  const out = [];
  for (let i = 0; i < count; i++) {
    const d = (i / count) * total;
    // Binary search
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cum[mid] <= d) lo = mid;
      else hi = mid - 1;
    }
    const i0 = lo;
    const i1 = Math.min(i0 + 1, n - 1);
    const aS = cum[i0];
    const bS = cum[i1];
    const segLen = Math.max(1e-6, bS - aS);
    const t = clamp((d - aS) / segLen, 0, 1);
    out.push(lerp3(pts[i0], pts[i1], t));
  }
  return out;
}

/**
 * Compute Rotation Minimizing Frames (RMF) along a curve.
 * This prevents the twisting that occurs with naive Frenet frames.
 *
 * Based on: "Computation of Rotation Minimizing Frames" (Wang et al. 2008)
 */
function computeRMF(points) {
  const n = points.length;
  if (n < 2) return null;

  const tangents = new Array(n);
  const normals = new Array(n);
  const binormals = new Array(n);

  // Compute tangents (forward differences, with wrapping for closed curve)
  for (let i = 0; i < n; i++) {
    const next = points[(i + 1) % n];
    tangents[i] = norm3(sub3(next, points[i]));
  }

  // Initialize first frame using a stable reference vector
  const t0 = tangents[0];
  let refUp = { x: 0, y: 1, z: 0 };
  if (Math.abs(dot3(t0, refUp)) > 0.95) {
    refUp = { x: 1, y: 0, z: 0 };
  }

  // First normal and binormal
  binormals[0] = norm3(cross3(t0, refUp));
  normals[0] = norm3(cross3(binormals[0], t0));

  // Propagate frame using double reflection (RMF algorithm)
  for (let i = 0; i < n - 1; i++) {
    const t_i = tangents[i];
    const t_i1 = tangents[i + 1];
    const r_i = normals[i];

    // Reflection 1: reflect r_i across plane perpendicular to v1
    const v1 = sub3(points[(i + 1) % n], points[i]);
    const c1 = dot3(v1, v1);
    if (c1 < 1e-10) {
      // Degenerate case: just copy
      normals[i + 1] = normals[i];
      binormals[i + 1] = binormals[i];
      continue;
    }

    const rL = sub3(r_i, mul3(v1, (2 / c1) * dot3(v1, r_i)));
    const tL = sub3(t_i, mul3(v1, (2 / c1) * dot3(v1, t_i)));

    // Reflection 2: reflect across plane perpendicular to v2
    const v2 = sub3(t_i1, tL);
    const c2 = dot3(v2, v2);
    if (c2 < 1e-10) {
      normals[i + 1] = norm3(rL);
    } else {
      normals[i + 1] = norm3(sub3(rL, mul3(v2, (2 / c2) * dot3(v2, rL))));
    }

    binormals[i + 1] = norm3(cross3(t_i1, normals[i + 1]));
  }

  return { tangents, normals, binormals };
}

/**
 * Generate full 3D track with TNB frames.
 */
function generate3DTrack(stepFn) {
  const rawPoints = generateLorenzPoints3D(stepFn, CONFIG.race.track.points);
  const points = resampleCurve3D(rawPoints, CONFIG.race.track.resampleCount);

  const frames = computeRMF(points);
  if (!frames) return null;

  // Compute cumulative arc-length
  const n = points.length;
  const cumLen = new Array(n);
  cumLen[0] = 0;
  let totalLen = 0;
  for (let i = 1; i < n; i++) {
    totalLen += len3(sub3(points[i], points[i - 1]));
    cumLen[i] = totalLen;
  }
  // Add final segment (loop closure)
  totalLen += len3(sub3(points[0], points[n - 1]));

  return {
    points,
    tangents: frames.tangents,
    normals: frames.normals,
    binormals: frames.binormals,
    cumLen,
    totalLen,
  };
}

/**
 * Sample 3D track at arc-length distance `s`.
 * Returns position and TNB frame.
 */
function sampleTrack3D(track, s) {
  const n = track.points.length;
  const total = track.totalLen;
  const d = ((s % total) + total) % total;

  // Binary search for segment
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (track.cumLen[mid] <= d) lo = mid;
    else hi = mid - 1;
  }

  const i0 = lo;
  const i1 = (i0 + 1) % n;
  const aS = track.cumLen[i0];
  const bS = i0 === n - 1 ? total : track.cumLen[i0 + 1];
  const segLen = Math.max(1e-6, bS - aS);
  const t = clamp((d - aS) / segLen, 0, 1);

  // Interpolate position
  const pos = lerp3(track.points[i0], track.points[i1], t);

  // Interpolate and re-normalize frame vectors (slerp would be better but lerp is simpler)
  const tangent = norm3(lerp3(track.tangents[i0], track.tangents[i1], t));
  const normal = norm3(lerp3(track.normals[i0], track.normals[i1], t));
  const binormal = norm3(lerp3(track.binormals[i0], track.binormals[i1], t));

  return { pos, tangent, normal, binormal, idx: i0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEMO GAME
// ─────────────────────────────────────────────────────────────────────────────

class LorenzRacer extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = "#000";
    this.enableFluidSize();

    // Core simulation
    this.attractor = Attractors.lorenz;
    this.stepFn = this.attractor.createStepper();

    // Time/state
    this.time = 0;
    this.mode = "forming";
    this.modeTime = 0;

    // Zoom & FOV - start zoomed out to see whole attractor
    this.zoom = CONFIG.zoom.formationZoom;
    this.targetZoom = CONFIG.zoom.formationZoom;
    this.defaultZoom = CONFIG.zoom.formationZoom;
    this.fovMultiplier = 1.0;
    this.targetFovMultiplier = 1.0;

    // Camera
    this.camera = new Camera3D({
      perspective: CONFIG.camera.perspective,
      rotationX: CONFIG.camera.rotationX,
      rotationY: CONFIG.camera.rotationY,
      inertia: CONFIG.camera.inertia,
      friction: CONFIG.camera.friction,
      clampX: CONFIG.camera.clampX,
    });

    // Gesture handler
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        if (this.mode !== "forming") return;
        this.targetZoom *= 1 + delta * CONFIG.zoom.speed;
      },
      onPan: null,
    });

    // Track + ship
    this.track = null;
    this.ship = null;
    this.shipLookAt = { x: 0, y: 0, z: 0 };
    this.cameraRig = { x: 0, y: 0, z: 0 };
    this.seed = getSeedFromUrl();

    // Speed lines
    this.speedLines = [];

    // Visuals
    this.particles = [];
    this.segments = [];
    this.lineRenderer = null;
    this.useWebGL = false;

    // Falling reset timer
    this._fallResetTimer = 0;
  }

  init() {
    super.init();

    this.camera.enableMouseControl(this.canvas);

    // Generate 3D track
    this.track = generate3DTrack(this.stepFn);

    // Create formation particles
    this.particles.length = 0;
    for (let i = 0; i < CONFIG.particles.count; i++) {
      this.particles.push(new AttractorParticle(this.stepFn, CONFIG.particles.spawnRange));
    }

    // Initialize speed lines
    this.speedLines = [];
    for (let i = 0; i < CONFIG.speedEffects.speedLinesCount; i++) {
      this.speedLines.push({
        angle: (Math.PI * 2 * i) / CONFIG.speedEffects.speedLinesCount,
        offset: Math.random(),
        length: 0,
        alpha: 0,
      });
    }

    // WebGL line renderer
    const particleSegments = CONFIG.particles.count * CONFIG.particles.trailLength;
    const tubeSegments = CONFIG.race.track.railSampleSpan * CONFIG.visual.tubeGlowPasses * 2;
    const maxSegments = particleSegments + tubeSegments + 2048;
    this.lineRenderer = new WebGLLineRenderer(maxSegments, {
      width: this.width,
      height: this.height,
      blendMode: "additive",
    });
    this.useWebGL = this.lineRenderer.isAvailable();

    this.resetRaceState();
  }

  onResize() {
    if (this.lineRenderer?.isAvailable()) {
      this.lineRenderer.resize(this.width, this.height);
    }
    // Keep formation zoom as default for reset
    this.defaultZoom = CONFIG.zoom.formationZoom;
    if (this.mode === "forming") {
      this.targetZoom = clamp(this.targetZoom, CONFIG.zoom.min, CONFIG.zoom.max);
    }
  }

  resetRaceState() {
    const energyMax = CONFIG.race.ship.energyMax;
    this.ship = {
      s: this.track ? this.track.totalLen * 0.05 : 0,
      speed: 0,
      lateral: 0,
      lateralVel: 0,
      energy: energyMax,

      // World position
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,

      falling: false,
    };
  }

  beginCinematic() {
    if (!this.track || !this.ship) return;
    this.mode = "cinematic";
    this.modeTime = 0;

    this.camera.disableMouseControl();
    this.camera.stopInertia();

    // Get spawn position and frame
    const sample = sampleTrack3D(this.track, this.ship.s);
    const { tangent, normal, binormal } = sample;

    // Camera position behind and above ship in local frame
    const offset = CONFIG.race.follow.offset;
    const camPos = add3(
      sample.pos,
      add3(
        add3(mul3(tangent, offset.forward), mul3(normal, offset.up)),
        mul3(binormal, offset.right)
      )
    );

    const rot = computeLookAtRot(camPos, sample.pos);
    this.camera.moveTo(camPos.x, camPos.y, camPos.z, {
      rotationX: rot.rotationX,
      rotationY: rot.rotationY,
      lerp: 0.06,
    });

    // Zoom in from formation view to race view
    this.targetZoom = CONFIG.zoom.raceZoom;
  }

  beginRace() {
    if (!this.track || !this.ship) return;
    this.mode = "race";
    this.modeTime = 0;

    // Initialize ship position
    const spawn = sampleTrack3D(this.track, this.ship.s);
    this.ship.x = spawn.pos.x;
    this.ship.y = spawn.pos.y;
    this.ship.z = spawn.pos.z;

    this.shipLookAt.x = this.ship.x;
    this.shipLookAt.y = this.ship.y;
    this.shipLookAt.z = this.ship.z;

    this.cameraRig.x = this.camera.x;
    this.cameraRig.y = this.camera.y;
    this.cameraRig.z = this.camera.z;

    this.camera.follow(this.cameraRig, {
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      lookAtTarget: this.shipLookAt,
      lookAt: true,
      lerp: CONFIG.race.follow.lerp,
    });
  }

  updateCameraRig() {
    if (!this.track || !this.ship) return;

    const offset = CONFIG.race.follow.offset;
    let tangent, normal, binormal;

    if (this.ship.falling) {
      // During falling, use last known orientation but follow ship
      const v = { x: this.ship.vx, y: this.ship.vy, z: this.ship.vz };
      const l = len3(v);
      if (l > 1e-6) {
        tangent = norm3(v);
      } else {
        tangent = { x: 0, y: 0, z: 1 };
      }
      // Create frame from velocity direction
      let refUp = { x: 0, y: 1, z: 0 };
      if (Math.abs(dot3(tangent, refUp)) > 0.95) {
        refUp = { x: 1, y: 0, z: 0 };
      }
      binormal = norm3(cross3(tangent, refUp));
      normal = norm3(cross3(binormal, tangent));
    } else {
      const sample = sampleTrack3D(this.track, this.ship.s);
      tangent = sample.tangent;
      normal = sample.normal;
      binormal = sample.binormal;
    }

    // Camera in ship's local frame
    const desired = add3(
      { x: this.ship.x, y: this.ship.y, z: this.ship.z },
      add3(
        add3(mul3(tangent, offset.forward), mul3(normal, offset.up)),
        mul3(binormal, offset.right)
      )
    );

    this.cameraRig.x = desired.x;
    this.cameraRig.y = desired.y;
    this.cameraRig.z = desired.z;
  }

  update(dt) {
    super.update(dt);

    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.modeTime += dt;

    // Zoom easing
    this.targetZoom = clamp(this.targetZoom, CONFIG.zoom.min, CONFIG.zoom.max);
    const zoomEase =
      this.mode === "forming" ? CONFIG.zoom.easing : CONFIG.race.cinematic.zoomEase;
    this.zoom += (this.targetZoom - this.zoom) * zoomEase;

    // FOV multiplier for boost effect
    this.fovMultiplier += (this.targetFovMultiplier - this.fovMultiplier) * CONFIG.speedEffects.fovLerpSpeed;

    // Update camera
    if (this.mode === "race" && this.track && this.ship) {
      this.updateCameraRig();
    }
    this.camera.update(dt);

    // Formation particles
    for (const p of this.particles) {
      p.update(CONFIG.attractor.dt, CONFIG.attractor.scale);
      p.updateBlink(dt);
    }

    // Mode transitions
    if (this.mode === "forming" && this.modeTime >= CONFIG.race.formationSeconds) {
      this.beginCinematic();
    }
    if (this.mode === "cinematic" && this.modeTime >= CONFIG.race.cinematicSeconds) {
      this.beginRace();
    }

    // Reset control
    if (Keys.isDown(CONFIG.controls.resetKey)) {
      this._fallResetTimer = 0;
      this.mode = "forming";
      this.modeTime = 0;
      this.targetZoom = this.defaultZoom;
      this.targetFovMultiplier = 1.0;
      this.camera.unfollow(false);
      this.camera.setRotation(CONFIG.camera.rotationX, CONFIG.camera.rotationY);
      this.camera.setPosition(0, 0, 0);
      this.camera.enableMouseControl(this.canvas);
      this.resetRaceState();
      return;
    }

    if (this.mode !== "race" || !this.track || !this.ship) return;

    this.updateShip(dt);
    this.updateShipLookAt(dt);
    this.updateSpeedEffects(dt);
  }

  updateShip(dt) {
    const ship = this.ship;
    const cfg = CONFIG.race.ship;

    if (ship.falling) {
      // Falling physics - gravity in world Y direction
      ship.vy -= cfg.fallGravity * dt;
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      ship.z += ship.vz * dt;

      this._fallResetTimer += dt;
      if (this._fallResetTimer >= cfg.fallResetSeconds) {
        this._fallResetTimer = 0;
        ship.falling = false;
        ship.lateral = 0;
        ship.lateralVel = 0;
        ship.speed = cfg.maxSpeed * 0.3; // Respawn with some speed
        const spawn = sampleTrack3D(this.track, ship.s);
        ship.x = spawn.pos.x;
        ship.y = spawn.pos.y;
        ship.z = spawn.pos.z;
        ship.vx = ship.vy = ship.vz = 0;
      }
      return;
    }

    // Inputs
    const throttle = Keys.isDown(Keys.UP) || Keys.isDown(Keys.W) ? 1 : 0;
    const brake = Keys.isDown(Keys.DOWN) || Keys.isDown(Keys.S) ? 1 : 0;
    const steer =
      (Keys.isDown(Keys.LEFT) || Keys.isDown(Keys.A) ? -1 : 0) +
      (Keys.isDown(Keys.RIGHT) || Keys.isDown(Keys.D) ? 1 : 0);
    const boosting = Keys.isDown(Keys.SPACE);

    // Get track frame at current position
    const sample = sampleTrack3D(this.track, ship.s);
    const { tangent, normal, binormal } = sample;

    // Lateral steering (in binormal direction)
    ship.lateralVel += steer * cfg.steerAccel * dt;
    ship.lateralVel *= Math.exp(-cfg.steerDamping * dt);
    ship.lateral += ship.lateralVel * dt;

    // Gravity pulls toward centerline (in normal direction = toward center)
    if (Math.abs(ship.lateral) > 2) {
      ship.lateral -= Math.sign(ship.lateral) * cfg.gravity * dt;
    }

    // Forward speed
    let accel = throttle * cfg.accel - brake * cfg.brake;
    accel -= cfg.drag * ship.speed * ship.speed;
    ship.speed = clamp(ship.speed + accel * dt, 0, cfg.maxSpeed);

    // Boost
    if (boosting && ship.energy > 0.01) {
      ship.speed = clamp(ship.speed + cfg.boostAccel * dt, 0, cfg.maxSpeed * 1.25);
      ship.energy -= cfg.boostEnergyPerSecond * dt;
      this.targetFovMultiplier = CONFIG.speedEffects.boostFovMultiplier;
    } else {
      ship.energy += cfg.energyRegenPerSecond * dt;
      this.targetFovMultiplier = 1.0;
    }
    ship.energy = clamp(ship.energy, 0, cfg.energyMax);

    // Advance along curve
    ship.s += ship.speed * dt;

    // Check fall-off
    const tubeRadius = CONFIG.race.track.tubeRadius;
    if (Math.abs(ship.lateral) > tubeRadius) {
      ship.falling = true;
      this._fallResetTimer = 0;

      // World position with lateral offset
      const worldPos = add3(sample.pos, mul3(binormal, ship.lateral));
      ship.x = worldPos.x;
      ship.y = worldPos.y;
      ship.z = worldPos.z;

      // Initial velocity: along tangent + lateral kick
      const tanVel = mul3(tangent, ship.speed);
      const latVel = mul3(binormal, ship.lateralVel * 1.5);
      const v = add3(tanVel, latVel);
      ship.vx = v.x;
      ship.vy = v.y;
      ship.vz = v.z;
      return;
    }

    // Normal position on tube
    const pos = add3(sample.pos, mul3(binormal, ship.lateral));
    ship.x = pos.x;
    ship.y = pos.y;
    ship.z = pos.z;
  }

  updateShipLookAt(dt) {
    if (!this.track || !this.ship) return;

    const ship = this.ship;
    if (ship.falling) {
      this.shipLookAt.x = ship.x + ship.vx * 0.2;
      this.shipLookAt.y = ship.y + ship.vy * 0.2;
      this.shipLookAt.z = ship.z + ship.vz * 0.2;
      return;
    }

    // Look ahead along the 3D curve
    const ahead = sampleTrack3D(this.track, ship.s + CONFIG.race.follow.lookAhead);
    this.shipLookAt.x = ahead.pos.x;
    this.shipLookAt.y = ahead.pos.y;
    this.shipLookAt.z = ahead.pos.z;
  }

  updateSpeedEffects(dt) {
    const threshold = CONFIG.speedEffects.speedLinesThreshold;
    const maxLen = CONFIG.speedEffects.speedLinesLength;
    const ship = this.ship;

    const speedRatio = clamp((ship.speed - threshold) / (CONFIG.race.ship.maxSpeed - threshold), 0, 1);
    const boosting = Keys.isDown(Keys.SPACE) && ship.energy > 0.01 && !ship.falling;

    for (const line of this.speedLines) {
      // Animate offset
      line.offset = (line.offset + dt * 2 * (boosting ? 2 : 1)) % 1;

      // Fade based on speed
      const targetAlpha = speedRatio * (boosting ? 0.8 : 0.5);
      line.alpha = lerp(line.alpha, targetAlpha, 0.1);

      // Length based on speed
      const targetLength = speedRatio * maxLen * (boosting ? 1.5 : 1);
      line.length = lerp(line.length, targetLength, 0.15);
    }
  }

  collectSegments(cx, cy) {
    const { minHue, maxHue, maxSpeed, saturation, lightness, maxAlpha, hueShiftSpeed } =
      CONFIG.visual;
    const { intensityBoost, saturationBoost, alphaBoost } = CONFIG.blink;
    const hueOffset = (this.time * hueShiftSpeed) % 360;

    this.segments.length = 0;

    // Formation particles
    for (const particle of this.particles) {
      if (particle.trail.length < 2) continue;
      const blink = particle.blinkIntensity;

      for (let i = 1; i < particle.trail.length; i++) {
        const curr = particle.trail[i];
        const prev = particle.trail[i - 1];

        const p1 = this.camera.project(prev.x, prev.y, prev.z);
        const p2 = this.camera.project(curr.x, curr.y, curr.z);
        if (p1.scale <= 0 || p2.scale <= 0) continue;

        const age = i / particle.trail.length;
        const speedNorm = Math.min(curr.speed / maxSpeed, 1);
        const baseHue = maxHue - speedNorm * (maxHue - minHue);
        const hue = (baseHue + hueOffset) % 360;

        const sat = Math.min(100, saturation * (1 + blink * (saturationBoost - 1)));
        const lit = Math.min(100, lightness * (1 + blink * (intensityBoost - 1)));
        const rgb = hslToRgb(hue, sat, lit);
        const alpha = Math.min(1, (1 - age) * maxAlpha * (1 + blink * (alphaBoost - 1)));

        const effectiveZoom = this.zoom * this.fovMultiplier;
        this.segments.push({
          x1: cx + p1.x * effectiveZoom,
          y1: cy + p1.y * effectiveZoom,
          x2: cx + p2.x * effectiveZoom,
          y2: cy + p2.y * effectiveZoom,
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          a: alpha,
        });
      }
    }

    // Laser tube (only when racing)
    if (this.mode === "race" && this.track && this.ship && !this.ship.falling) {
      this.collectTubeSegments(cx, cy);
    }

    return this.segments.length;
  }

  collectTubeSegments(cx, cy) {
    const span = CONFIG.race.track.railSampleSpan;
    const step = CONFIG.race.track.railStep;
    const halfSpan = span * 0.5;
    const tubeR = CONFIG.race.track.visualRadius;
    const { glowColor, outerGlowColor, coreColor, tubeGlowPasses } = CONFIG.visual;
    const effectiveZoom = this.zoom * this.fovMultiplier;

    const startS = this.ship.s - halfSpan * 0.3;
    const endS = this.ship.s + halfSpan;

    // Multi-pass glow rendering
    const passes = [
      { width: tubeR * 2.0, color: outerGlowColor, alpha: 0.08 },
      { width: tubeR * 1.4, color: glowColor, alpha: 0.15 },
      { width: tubeR * 0.8, color: glowColor, alpha: 0.25 },
      { width: tubeR * 0.3, color: coreColor, alpha: 0.6 },
    ];

    for (let passIdx = 0; passIdx < Math.min(passes.length, tubeGlowPasses); passIdx++) {
      const pass = passes[passIdx];
      let prevCenter = null;
      let prevLeft = null;
      let prevRight = null;

      for (let s = startS; s <= endS; s += step) {
        const sample = sampleTrack3D(this.track, s);
        const { pos, binormal } = sample;

        // Distance fade
        const distFromShip = Math.abs(s - this.ship.s);
        const distFade = 1 - clamp(distFromShip / halfSpan, 0, 1);
        const alpha = pass.alpha * distFade * distFade;

        // Center and edge positions
        const center = pos;
        const leftP = add3(pos, mul3(binormal, pass.width * 0.5));
        const rightP = add3(pos, mul3(binormal, -pass.width * 0.5));

        const pc = this.camera.project(center.x, center.y, center.z);
        const pl = this.camera.project(leftP.x, leftP.y, leftP.z);
        const pr = this.camera.project(rightP.x, rightP.y, rightP.z);

        if (pc.scale <= 0) {
          prevCenter = prevLeft = prevRight = null;
          continue;
        }

        const sc = { x: cx + pc.x * effectiveZoom, y: cy + pc.y * effectiveZoom };
        const sl = { x: cx + pl.x * effectiveZoom, y: cy + pl.y * effectiveZoom };
        const sr = { x: cx + pr.x * effectiveZoom, y: cy + pr.y * effectiveZoom };

        if (prevCenter && alpha > 0.01) {
          // Center line
          this.segments.push({
            x1: prevCenter.x,
            y1: prevCenter.y,
            x2: sc.x,
            y2: sc.y,
            r: pass.color[0],
            g: pass.color[1],
            b: pass.color[2],
            a: alpha,
          });

          // Edge lines for wider passes
          if (passIdx < 2) {
            this.segments.push({
              x1: prevLeft.x,
              y1: prevLeft.y,
              x2: sl.x,
              y2: sl.y,
              r: pass.color[0],
              g: pass.color[1],
              b: pass.color[2],
              a: alpha * 0.7,
            });
            this.segments.push({
              x1: prevRight.x,
              y1: prevRight.y,
              x2: sr.x,
              y2: sr.y,
              r: pass.color[0],
              g: pass.color[1],
              b: pass.color[2],
              a: alpha * 0.7,
            });
          }
        }

        prevCenter = sc;
        prevLeft = sl;
        prevRight = sr;
      }
    }

    // Edge rails (visible boundaries)
    const railWidth = CONFIG.race.track.tubeRadius;
    const railColors = [
      { r: 0, g: 255, b: 180, a: 0.5 },
      { r: 255, g: 70, b: 200, a: 0.4 },
    ];

    let prevL = null;
    let prevR = null;

    for (let s = startS; s <= endS; s += step * 2) {
      const sample = sampleTrack3D(this.track, s);
      const leftP = add3(sample.pos, mul3(sample.binormal, railWidth));
      const rightP = add3(sample.pos, mul3(sample.binormal, -railWidth));

      const pl = this.camera.project(leftP.x, leftP.y, leftP.z);
      const pr = this.camera.project(rightP.x, rightP.y, rightP.z);

      if (pl.scale <= 0 || pr.scale <= 0) {
        prevL = prevR = null;
        continue;
      }

      const distFromShip = Math.abs(s - this.ship.s);
      const distFade = 1 - clamp(distFromShip / halfSpan, 0, 1);

      const sl = { x: cx + pl.x * effectiveZoom, y: cy + pl.y * effectiveZoom };
      const sr = { x: cx + pr.x * effectiveZoom, y: cy + pr.y * effectiveZoom };

      if (prevL) {
        this.segments.push({
          x1: prevL.x,
          y1: prevL.y,
          x2: sl.x,
          y2: sl.y,
          ...railColors[0],
          a: railColors[0].a * distFade,
        });
      }
      if (prevR) {
        this.segments.push({
          x1: prevR.x,
          y1: prevR.y,
          x2: sr.x,
          y2: sr.y,
          ...railColors[1],
          a: railColors[1].a * distFade,
        });
      }

      prevL = sl;
      prevR = sr;
    }
  }

  render() {
    super.render();

    const cx = this.width / 2;
    const cy = this.height / 2;

    if (this.useWebGL && this.lineRenderer?.isAvailable()) {
      const segmentCount = this.collectSegments(cx, cy);
      if (segmentCount > 0) {
        this.lineRenderer.clear();
        this.lineRenderer.updateLines(this.segments);
        this.lineRenderer.render(segmentCount);
        this.lineRenderer.compositeOnto(this.ctx, 0, 0);
      }
    }

    // Additional rendering
    if (this.mode === "race" && this.track && this.ship) {
      this.renderGates(cx, cy);
      this.renderSpeedLines(cx, cy);
      this.renderShip(cx, cy);
      this.renderHud();
    } else {
      this.renderFormationHud();
    }
  }

  renderGates(cx, cy) {
    if (!this.track || !this.ship || this.ship.falling) return;

    const spacing = CONFIG.gates.spacing;
    const { innerRadius, outerRadius, color, alpha, ringSegments } = CONFIG.gates;
    const effectiveZoom = this.zoom * this.fovMultiplier;

    // Find gates near the ship
    const shipS = this.ship.s;
    const viewDist = CONFIG.race.track.railSampleSpan * 0.5;

    const firstGate = Math.floor((shipS - viewDist * 0.2) / spacing) * spacing;
    const lastGate = Math.ceil((shipS + viewDist) / spacing) * spacing;

    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (let gateS = firstGate; gateS <= lastGate; gateS += spacing) {
        if (gateS < 0) continue;

        const sample = sampleTrack3D(this.track, gateS);
        const { pos, normal, binormal } = sample;

        // Distance fade
        const dist = Math.abs(gateS - shipS);
        const fade = 1 - clamp(dist / viewDist, 0, 1);
        if (fade < 0.05) continue;

        // Draw ring in the normal-binormal plane
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha * fade})`;
        ctx.lineWidth = 2;

        let firstPoint = true;
        for (let i = 0; i <= ringSegments; i++) {
          const angle = (Math.PI * 2 * i) / ringSegments;
          const r = lerp(innerRadius, outerRadius, 0.5 + 0.5 * Math.sin(angle * 4 + this.time * 2));

          const ringPt = add3(
            pos,
            add3(mul3(normal, Math.cos(angle) * r), mul3(binormal, Math.sin(angle) * r))
          );

          const p = this.camera.project(ringPt.x, ringPt.y, ringPt.z);
          if (p.scale <= 0) continue;

          const sx = cx + p.x * effectiveZoom;
          const sy = cy + p.y * effectiveZoom;

          if (firstPoint) {
            ctx.moveTo(sx, sy);
            firstPoint = false;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  renderSpeedLines(cx, cy) {
    const { speedLinesThreshold } = CONFIG.speedEffects;
    if (this.ship.speed < speedLinesThreshold * 0.5) return;

    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      const innerR = Math.min(this.width, this.height) * 0.35;
      const outerR = Math.min(this.width, this.height) * 0.55;

      for (const line of this.speedLines) {
        if (line.alpha < 0.02 || line.length < 5) continue;

        const angle = line.angle + line.offset * Math.PI * 0.1;
        const startR = innerR + line.offset * (outerR - innerR);
        const endR = startR + line.length;

        const x1 = cx + Math.cos(angle) * startR;
        const y1 = cy + Math.sin(angle) * startR;
        const x2 = cx + Math.cos(angle) * endR;
        const y2 = cy + Math.sin(angle) * endR;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(0,255,220,0)`);
        grad.addColorStop(0.5, `rgba(0,255,220,${line.alpha})`);
        grad.addColorStop(1, `rgba(255,255,255,${line.alpha * 0.5})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  renderShip(cx, cy) {
    const ship = this.ship;
    const effectiveZoom = this.zoom * this.fovMultiplier;

    const p = this.camera.project(ship.x, ship.y, ship.z);
    if (p.scale <= 0) return;
    const sx = cx + p.x * effectiveZoom;
    const sy = cy + p.y * effectiveZoom;

    // Orientation from look-ahead
    const lp = this.camera.project(this.shipLookAt.x, this.shipLookAt.y, this.shipLookAt.z);
    const lx = cx + lp.x * effectiveZoom;
    const ly = cy + lp.y * effectiveZoom;
    const ang = Math.atan2(ly - sy, lx - sx) + Math.PI / 2;

    const boosting = Keys.isDown(Keys.SPACE) && ship.energy > 0.01 && !ship.falling;

    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ang);

      const sc = clamp(p.scale * 0.8, 0.2, 1.5);
      ctx.scale(sc, sc);

      ctx.lineWidth = 2;
      ctx.strokeStyle = boosting ? "rgba(0,255,220,0.85)" : "rgba(100,100,100,0.6)";
      ctx.fillStyle = boosting ? "rgba(255,255,255,1)" : "#ffffff";

      // Ship body
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(10, 12);
      ctx.lineTo(0, 7);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Engine glow
      ctx.globalAlpha = ship.falling ? 0.3 : boosting ? 0.9 : 0.6;
      ctx.fillStyle = boosting ? "rgba(0,255,220,0.95)" : "rgba(0,255,154,0.7)";

      const flareLen = boosting ? 25 : 15;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(5, 8 + flareLen);
      ctx.lineTo(0, 8 + flareLen * 0.6);
      ctx.lineTo(-5, 8 + flareLen);
      ctx.closePath();
      ctx.fill();

      // Lateral thrusters when steering
      const steer =
        (Keys.isDown(Keys.LEFT) || Keys.isDown(Keys.A) ? -1 : 0) +
        (Keys.isDown(Keys.RIGHT) || Keys.isDown(Keys.D) ? 1 : 0);

      if (steer !== 0 && !ship.falling) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "rgba(255,180,0,0.8)";
        const thrustX = steer * -8;
        ctx.beginPath();
        ctx.moveTo(thrustX, 0);
        ctx.lineTo(thrustX + steer * 6, 5);
        ctx.lineTo(thrustX + steer * 6, -5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }

  renderHud() {
    const ship = this.ship;
    const speed = Math.round(ship.speed);
    const energyPct = ship.energy / CONFIG.race.ship.energyMax;
    const boosting = Keys.isDown(Keys.SPACE) && ship.energy > 0.01 && !ship.falling;

    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.font = "bold 16px monospace";
      ctx.textBaseline = "top";

      // Speed display
      ctx.fillStyle = boosting ? "#00ffdc" : "#0f0";
      ctx.fillText(`SPEED`, 14, 14);
      ctx.font = "bold 32px monospace";
      ctx.fillText(`${String(speed).padStart(4, " ")}`, 14, 32);

      // Energy bar
      ctx.font = "14px monospace";
      ctx.fillStyle = "#0f0";
      ctx.fillText(`ENERGY`, 14, 72);

      const barX = 14;
      const barY = 90;
      const barW = 180;
      const barH = 12;

      ctx.strokeStyle = "rgba(0,255,0,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);

      const energyColor = energyPct > 0.25 ? (boosting ? "#00ffdc" : "#00ff00") : "#ff3a3a";
      ctx.fillStyle = energyColor;
      ctx.fillRect(barX, barY, barW * clamp(energyPct, 0, 1), barH);

      // Status
      ctx.font = "12px monospace";
      if (ship.falling) {
        ctx.fillStyle = "#ff3aff";
        ctx.fillText("FALLING - RESPAWNING...", 14, 112);
      } else if (boosting) {
        ctx.fillStyle = "#00ffdc";
        ctx.fillText("BOOST ACTIVE", 14, 112);
      }

      // Controls hint (bottom)
      ctx.fillStyle = "rgba(0,255,0,0.4)";
      ctx.font = "11px monospace";
      ctx.fillText("WASD/Arrows: Steer | SPACE: Boost | R: Reset", 14, this.height - 20);

      ctx.restore();
    });
  }

  renderFormationHud() {
    const t = Math.max(0, CONFIG.race.formationSeconds - this.modeTime);
    const msg =
      this.mode === "forming"
        ? `FORMING LORENZ ATTRACTOR  (${t.toFixed(1)}s)`
        : this.mode === "cinematic"
          ? "ENTERING THE BUTTERFLY..."
          : "";

    if (!msg) return;

    Painter.useCtx((ctx) => {
      ctx.save();
      ctx.font = "16px monospace";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(0,255,180,0.7)";
      ctx.fillText(msg, 14, 14);

      if (this.mode === "forming") {
        ctx.fillStyle = "rgba(0,255,180,0.4)";
        ctx.font = "12px monospace";
        ctx.fillText("Scroll to zoom | Drag to rotate | R to restart", 14, 38);
      }

      ctx.restore();
    });
  }

  destroy() {
    this.gesture?.destroy();
    this.lineRenderer?.destroy();
    super.destroy?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  const demo = new LorenzRacer(canvas);
  demo.start();
});
