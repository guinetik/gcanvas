/**
 * Artemis II Trajectory Demo
 *
 * Physics-accurate 3D visualization of the Artemis II free-return trajectory.
 * Precomputed RK4 n-body simulation (Earth + Moon + Orion capsule) over 10 days.
 *
 * Controls: drag to rotate · scroll/pinch to zoom · slider to scrub
 */

import {
  Game,
  Camera3D,
  Painter,
  Screen,
  Gesture,
  FPSCounter,
  StateMachine,
} from "../../src/index.js";
import { computeTrajectory, interpolateState } from "./artemis2.physics.js";
import { Artemis2HUD } from "./artemis2.hud.js";
import { Artemis2Controls } from "./artemis2.controls.js";

const CONFIG = {
  scale:          3000,
  baseScreenSize:  900,
  minZoom:         0.25,
  maxZoom:         4.0,
  zoomSpeed:       0.3,
  zoomEasing:      0.1,

  camera: {
    perspective: 900,
    rotationX:   0.5,
    rotationY:   0.2,
    clampX:      true,
    inertia:     true,
    friction:    0.92,
  },

  earth: {
    color:              '#1a6faf',
    glowColor:          'rgba(80,160,255,0.35)',
    glowRadius:         38,
    radius:             24,
    atmosphereOffset:   3,
    atmosphereColor:    'rgba(100,180,255,0.4)',
    atmosphereWidth:    2,
  },
  moon: {
    color:       '#888',
    glowColor:   'rgba(200,200,200,0.18)',
    glowRadius:  20,
    radius:      12,
  },
  orion: {
    color:       '#ffcc00',
    radius:      3.5,
    glowColor:   'rgba(255,220,80,0.9)',
    glowRadius:  10.5,
  },

  trail: {
    staticColor:   'rgba(80,160,255,0.12)',
    traveledColor: 'rgba(100,200,255,0.7)',
    traveledWidth: 1.5,
    staticStep:    10,
  },

  stars: { count: 400 }, // computed in init() if Screen.responsive requires Screen.init()
  controls: { bottomPad: 20 },

  // Must match CTRL_CONFIG.panelWidth and panelHeight in controls.js
  controlsPanelWidth:  520,
  controlsPanelHeight: 100,
};

class Artemis2Demo extends Game {
  constructor(canvas) {
    super(canvas);
    this.backgroundColor = '#000';
    this.enableFluidSize();
  }

  init() {
    super.init();
    Screen.init(this);

    // Resolve responsive star count now that Screen is initialized
    this._starCount = Screen.responsive(300, 400, 500);

    // Precompute trajectory (~100ms)
    this._traj = computeTrajectory();

    // Playback state
    this._playing = false;
    this._speed = 100;
    this._simClock = 0;
    this._currentPhase = 'TRANS_LUNAR';
    this._state = null;

    this._phaseLabels = {
      TRANS_LUNAR: 'Trans-Lunar Injection',
      LUNAR_FLYBY: 'Lunar Flyby',
      FREE_RETURN: 'Free Return',
      REENTRY:     'Reentry',
    };

    // Camera + zoom
    this.camera = new Camera3D(CONFIG.camera);
    this.camera.enableMouseControl(this.canvas);
    this.zoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize)
    );
    this.targetZoom = this.zoom;

    // Gesture (pinch/scroll zoom)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoomSpeed;
        this.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.targetZoom));
      },
    });

    // Starfield (static)
    this._stars = this._generateStars(this._starCount);

    // Phase state machine
    this._phaseFSM = StateMachine.fromSequence([
      { name: 'TRANS_LUNAR' },
      { name: 'LUNAR_FLYBY' },
      { name: 'FREE_RETURN' },
      { name: 'REENTRY' },
    ], { context: this });

    // HUD
    this._hud = new Artemis2HUD(this);
    this.pipeline.add(this._hud);

    // Extract maxT for reuse
    this._maxT = this._traj.count * this._traj.dt;

    // Controls
    this._controls = new Artemis2Controls(this, {
      onPlay:        () => { this._playing = true; },
      onPause:       () => { this._playing = false; },
      onSeek:        (t) => {
        this._simClock = Math.max(0, Math.min(this._maxT, t));
      },
      onSpeedChange: (spd) => { this._speed = spd; },
    });
    this._positionControls();
    this.pipeline.add(this._controls);

    // FPS counter
    this.pipeline.add(new FPSCounter(this));

    // Resize handler
    if (this.events) {
      this.events.on('screenresize', () => {
        this._positionControls();
        this._stars = this._generateStars(this._starCount);
      });
    }
  }

  _positionControls() {
    this._controls.x = (this.width - CONFIG.controlsPanelWidth) / 2;
    this._controls.y = this.height - CONFIG.controlsPanelHeight - CONFIG.controls.bottomPad;
  }

  update(dt) {
    super.update(dt);

    if (this._playing) {
      this._simClock += dt * this._speed;
      if (this._simClock >= this._maxT) {
        this._simClock = this._maxT;
        this._playing = false;
      }
    }

    // Interpolate current frame
    this._state = interpolateState(this._traj.frames, this._simClock, this._traj.dt);

    // Update phase
    this._updatePhase();

    // Push to HUD and controls
    this._hud.setMissionState(this._hudState());
    this._controls.setCurrentTime(this._simClock, this._maxT);

    // Ease zoom
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    // Update camera
    this.camera.update(dt);
  }

  _updatePhase() {
    const ts = this._traj.phaseTimestamps;
    let phase;
    if      (this._simClock >= ts.REENTRY)    phase = 'REENTRY';
    else if (this._simClock >= ts.FREE_RETURN) phase = 'FREE_RETURN';
    else if (this._simClock >= ts.LUNAR_FLYBY) phase = 'LUNAR_FLYBY';
    else                                        phase = 'TRANS_LUNAR';

    if (phase !== this._currentPhase) {
      this._currentPhase = phase;
      this._phaseFSM.setState(phase);
    }
  }

  _hudState() {
    if (!this._state) {
      return { phase: '—', elapsed: 0, distE: 0, distM: 0, velocity: 0 };
    }
    const { orion, moon } = this._state;
    const distE    = Math.hypot(orion.x, orion.y, orion.z);
    const distM    = Math.hypot(orion.x - moon.x, orion.y - moon.y, orion.z - moon.z);
    const velocity = Math.hypot(orion.vx, orion.vy, orion.vz); // km/s
    return {
      phase:    this._phaseLabels[this._currentPhase] ?? '—',
      elapsed:  this._simClock,
      distE,
      distM,
      velocity,
    };
  }

  render() {
    super.render(); // MUST be first: clears canvas + renders pipeline (HUD, controls, FPS)

    this._drawStarfield();
    this._drawTrajectoryStatic();
    if (this._state) {
      this._drawTrajectoryTraveled();
      this._drawBodies();
    }
  }

  // Project physics coords (km) to screen (px) via Camera3D + zoom
  _project(kmX, kmY, kmZ) {
    const proj = this.camera.project(
      kmX / CONFIG.scale,
      kmY / CONFIG.scale,
      kmZ / CONFIG.scale
    );
    return {
      x: this.width  / 2 + proj.x * this.zoom,
      y: this.height / 2 + proj.y * this.zoom,
      z: proj.z,
    };
  }

  _generateStars(n) {
    const stars = [];
    const w = this.width  || 1920;
    const h = this.height || 1080;
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random() * 0.7 + 0.3,
      });
    }
    return stars;
  }

  _drawStarfield() {
    Painter.useCtx((ctx) => {
      for (const s of this._stars) {
        ctx.globalAlpha = s.a;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }, { saveState: true });
  }

  _drawTrajectoryStatic() {
    const { frames, count } = this._traj;
    const step = CONFIG.trail.staticStep;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.trail.staticColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let first = true;
      for (let i = 0; i < count; i += step) {
        const off = i * 9;
        const p = this._project(frames[off + 3], frames[off + 4], frames[off + 5]);
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }, { saveState: true });
  }

  _drawTrajectoryTraveled() {
    const { frames, dt } = this._traj;
    const currentFrame = dt > 0
      ? Math.min(Math.floor(this._simClock / dt), this._traj.count - 1)
      : 0;
    if (currentFrame < 1) return;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.trail.traveledColor;
      ctx.lineWidth = CONFIG.trail.traveledWidth;
      ctx.beginPath();
      for (let i = 0; i <= currentFrame; i++) {
        const off = i * 9;
        const p = this._project(frames[off + 3], frames[off + 4], frames[off + 5]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }, { saveState: true });
  }

  _drawBodies() {
    const earthP = this._project(0, 0, 0);
    const moonP  = this._project(this._state.moon.x,  this._state.moon.y,  this._state.moon.z);
    const orionP = this._project(this._state.orion.x, this._state.orion.y, this._state.orion.z);

    // Sort back-to-front by z (negative z = closer to viewer in Camera3D convention)
    const bodies = [
      { z: earthP.z, draw: () => this._drawEarth(earthP) },
      { z: moonP.z,  draw: () => this._drawMoon(moonP) },
      { z: orionP.z, draw: () => this._drawOrion(orionP) },
    ].sort((a, b) => b.z - a.z);

    bodies.forEach(b => b.draw());
  }

  _drawEarth(p) {
    const E = CONFIG.earth;
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, E.radius * 0.5, p.x, p.y, E.glowRadius);
      g.addColorStop(0, E.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, E.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }, { saveState: true });
    Painter.shapes.fillCircle(p.x, p.y, E.radius, E.color);
    Painter.shapes.strokeCircle(p.x, p.y, E.radius + E.atmosphereOffset, E.atmosphereColor, E.atmosphereWidth);
  }

  _drawMoon(p) {
    const M = CONFIG.moon;
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, M.radius * 0.5, p.x, p.y, M.glowRadius);
      g.addColorStop(0, M.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, M.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }, { saveState: true });
    Painter.shapes.fillCircle(p.x, p.y, M.radius, M.color);
  }

  _drawOrion(p) {
    const O = CONFIG.orion;
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, O.glowRadius);
      g.addColorStop(0, O.glowColor);
      g.addColorStop(1, 'rgba(255,200,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, O.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }, { saveState: true });
    Painter.shapes.fillCircle(p.x, p.y, O.radius, O.color);
  }
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new Artemis2Demo(canvas).start();
});
