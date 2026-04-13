/**
 * Artemis II — NASA JPL Horizons Trajectory Demo
 *
 * Real trajectory data for the Artemis II free-return mission.
 * Camera3D with drag-to-rotate and scroll/pinch zoom.
 * Timeline scrubbing, simulation speed, camera modes, HUD telemetry.
 */

import {
  Game,
  Camera3D,
  Painter,
  Screen,
  Gesture,
  FPSCounter,
  Sphere3D,
  VerticalLayout,
  ToggleButton,
} from "../../../src/index.js";
import { orbitPathPoints } from "../../../src/math/kepler.js";

import {
  getOrionPos,
  getMoonPos,
  getOrionVelocity,
  getPhase,
  buildTrajectoryCurve,
  getTrajProgress,
  dist3d,
  TLI_DAY,
  MISSION_DAYS,
  EARTH_RADIUS_KM,
  MOON_RADIUS_KM,
} from "./artemis2.data.js";

import { Artemis2HUD } from "./artemis2.hud.js";
import { Artemis2Controls } from "./artemis2.controls.js";
import { TweetTimeline, TweetFeed } from "./artemis2.tweets.js";

const TWO_PI = Math.PI * 2;

const CONFIG = {
  scale:          800,
  baseScreenSize:  900,
  minZoom:         0.25,
  maxZoom:         6.0,
  zoomSpeed:       0.3,
  zoomEasing:      0.12,

  camera: {
    perspective:      900,
    rotationX:        1.15,
    rotationY:        0,
    clampX:           false,
    inertia:          true,
    friction:         0.92,
    autoRotate:       false,
  },

  mouseControl: {
    horizontalAxis: 'rotationZ',
    verticalAxis:   'rotationX',
  },

  earth: {
    color:              '#1a6faf',
    glowColor:          'rgba(80,160,255,0.35)',
    glowRadius:         14,
    radius:             8,       // true scale: 6371 km / 800 scale ≈ 8
    atmosphereOffset:   0.6,
    atmosphereColor:    'rgba(100,180,255,0.4)',
    atmosphereWidth:    1,
    labelColor:         'rgba(68,153,255,0.7)',
  },

  moon: {
    color:       '#888',
    glowColor:   'rgba(200,200,200,0.18)',
    glowRadius:  16,
    radius:      8,
    labelColor:  'rgba(180,180,200,0.7)',
  },

  orion: {
    beaconRadius:   4,
    glowColor:      'rgba(255,136,68,0.6)',
    glowRadius:     20,
    coreColor:      '#ff8844',
    labelColor:     'rgba(255,136,68,0.8)',
    labelFont:      'bold 10px monospace',
  },

  trajectory: {
    ghostColor:     'rgba(255,136,68,0.15)',
    ghostWidth:     1,
    traveledColor:  'rgba(255,107,53,0.9)',
    traveledWidth:  2.5,
    step:           1,   // draw every point for smooth curves
  },

  moonOrbit: {
    color:     'rgba(255,255,255,0.2)',
    lineWidth: 1,
  },

  connection: {
    color:      'rgba(255,255,255,0.1)',
    lineWidth:  1,
    dashOn:     8,
    dashOff:    6,
  },

  starCount: { small: 300, medium: 400, large: 500 },

  camBtns: {
    width:    110,
    height:   30,
    gap:      6,
    marginRight: 14,
    marginTop:   40,
  },

  time: {
    defaultSpeed: 1000,
  },
};

// ── Camera mode enum ──
const CAM = {
  OVERVIEW:      'overview',
  FOLLOW_ORION:  'follow-orion',
  FOCUS_EARTH:   'focus-earth',
  FOCUS_MOON:    'focus-moon',
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

    // Simulation state
    this._simDay  = 0;  // Start at launch so early tweets are visible
    this._playing = true;
    this._simSpeed = CONFIG.time.defaultSpeed;
    this._cameraMode = CAM.OVERVIEW;

    // Focus offset — screen-space offset to center on a body (lerped)
    this._focusKm = { x: 0, y: 0, z: 0 };       // current (lerped)
    this._focusTargetKm = { x: 0, y: 0, z: 0 };  // target

    // Camera + zoom
    this.camera = new Camera3D(CONFIG.camera);
    this.camera.enableMouseControl(this.canvas, {
      ...CONFIG.mouseControl,
      game: this,
      isOverPanel: (clientX, clientY) => this._isPointerOverUI(clientX, clientY),
    });

    this.zoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize),
    );
    this.targetZoom = this.zoom;

    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        if (this._uiPointerOverInteractive) return;
        this.targetZoom *= 1 + delta * CONFIG.zoomSpeed;
        this.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.targetZoom));
      },
    });

    // Sphere3D for bodies
    this._earthSphere = new Sphere3D(CONFIG.earth.radius, {
      camera:       this.camera,
      useShader:    true,
      shaderType:   'rockyPlanet',
      shaderUniforms: {
        uBaseColor:      [0.10, 0.40, 0.70],
        uHasAtmosphere:  1.0,
        uSeed:           3.0,
      },
    });

    this._moonSphere = new Sphere3D(CONFIG.moon.radius, {
      camera:       this.camera,
      useShader:    true,
      shaderType:   'rockyPlanet',
      shaderUniforms: {
        uBaseColor:      [0.52, 0.50, 0.48],
        uHasAtmosphere:  0.0,
        uSeed:           7.0,
      },
    });

    // Pre-build data
    // Generate a clean circular ring for the moon orbit display
    // Orbital plane normal: [-0.033, -0.474, 0.880], radius ≈ 385,000 km
    // Moon orbit ellipse from Keplerian elements (derived from NASA_MOON data)
    this._moonOrbitRing = orbitPathPoints({
      semiMajorAxis:             400600,
      eccentricity:              0.014283,
      inclination:               0.493995,
      longitudeOfAscendingNode: -0.070520,
      argumentOfPeriapsis:       2.869024,
    }, 120);
    this._trajCurve = buildTrajectoryCurve();

    // Starfield
    this._starCount = Screen.responsive(
      CONFIG.starCount.small,
      CONFIG.starCount.medium,
      CONFIG.starCount.large,
    );
    this._stars = this._generateStars(this._starCount);

    // Current positions in km (updated each frame)
    this._orionKm = getOrionPos(this._simDay);
    this._moonKm  = getMoonPos(this._simDay);

    // UI: HUD (drawn directly in render, not a pipeline object)
    this._hud = Artemis2HUD;

    // UI: Controls (bottom-center)
    this._controls = new Artemis2Controls(this, {
      onPlay:        () => { this._playing = true; },
      onPause:       () => { this._playing = false; },
      onSeek:        (day) => { this._simDay = day; },
      onSpeedChange: (mult) => { this._simSpeed = mult; },
    });
    this._controls.reposition(this.width, this.height);
    this._controls.startPlaying();
    this.pipeline.add(this._controls);

    // UI: Camera mode buttons (top-right)
    this._buildCameraButtons();

    // UI: Tweet feed (center-left)
    this._tweetTimeline = new TweetTimeline();
    this._tweetTimeline.load("./artemis/all_tweets.json");
    this._tweetFeed = new TweetFeed(this, this._tweetTimeline);
    this._tweetFeed.reposition(this.width, this.height);
    this.pipeline.add(this._tweetFeed);

    // FPS counter
    this.pipeline.add(new FPSCounter(this));

    // Resize
    if (this.events) {
      this.events.on('screenresize', () => {
        this._stars = this._generateStars(this._starCount);
        this._positionCameraButtons();
        this._controls.reposition(this.width, this.height);
        this._tweetFeed.reposition(this.width, this.height);
      });
    }
  }

  // ── Camera mode buttons (top-right, VerticalLayout) ──

  _buildCameraButtons() {
    const B = CONFIG.camBtns;

    this._camLayout = new VerticalLayout(this, {
      spacing: B.gap,
      padding: 0,
      align: 'center',
    });
    this._camLayout.interactive = true;

    const labels = [
      { text: 'Overview',      mode: CAM.OVERVIEW },
      { text: 'Follow Orion',  mode: CAM.FOLLOW_ORION },
      { text: 'Focus Earth',   mode: CAM.FOCUS_EARTH },
      { text: 'Focus Moon',    mode: CAM.FOCUS_MOON },
    ];

    this._camBtns = labels.map((def) => {
      const btn = new ToggleButton(this, {
        width:  B.width,
        height: B.height,
        text:   def.text,
        font:   '11px monospace',
        startToggled: def.mode === this._cameraMode,
        colorDefaultBg:      'rgba(10,12,20,0.6)',
        colorDefaultStroke:   'rgba(255,255,255,0.1)',
        colorDefaultText:     'rgba(255,255,255,0.45)',
        colorHoverBg:         'rgba(255,255,255,0.1)',
        colorHoverStroke:     'rgba(255,255,255,0.2)',
        colorHoverText:       '#fff',
        colorActiveBg:        'rgba(110,198,255,0.12)',
        colorActiveStroke:    'rgba(110,198,255,0.25)',
        colorActiveText:      '#6ec6ff',
        onToggle: () => this._setCameraMode(def.mode),
      });
      this._camLayout.add(btn);
      return { btn, mode: def.mode };
    });

    this.pipeline.add(this._camLayout);
    this._positionCameraButtons();
  }

  _positionCameraButtons() {
    const B = CONFIG.camBtns;
    const count = this._camBtns.length;
    const totalH = count * B.height + (count - 1) * B.gap;
    this._camLayout.x = this.width - B.width / 2 - B.marginRight;
    this._camLayout.y = B.marginTop + totalH / 2;
  }

  _highlightCameraButton() {
    for (const { btn, mode } of this._camBtns) {
      btn.toggle(mode === this._cameraMode);
    }
  }

  _setCameraMode(mode) {
    this._cameraMode = mode;
    this._highlightCameraButton();
    // No camera.follow() — we offset the projection center instead
    this.camera.unfollow();

    switch (mode) {
      case CAM.OVERVIEW:
        this.targetZoom = Math.min(
          CONFIG.maxZoom,
          Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize),
        );
        break;
      case CAM.FOLLOW_ORION:
        this.targetZoom = Screen.responsive(2.5, 3.5, 4.0);
        break;
      case CAM.FOCUS_EARTH:
        this.targetZoom = Screen.responsive(3.0, 4.0, 5.0);
        break;
      case CAM.FOCUS_MOON:
        this.targetZoom = Screen.responsive(3.0, 4.0, 5.0);
        break;
    }
  }

  // ── UI hit-testing (prevents camera drag over buttons/controls) ──

  _isPointerOverUI(clientX, clientY) {
    // Use pipeline's built-in interactive hit-testing
    const rect = this.canvas.getBoundingClientRect();
    const cx = (clientX - rect.left) * (this.canvas.width / rect.width);
    const cy = (clientY - rect.top) * (this.canvas.height / rect.height);
    return this.pipeline.hitTestInteractiveUI(cx, cy);
  }

  // ── Update ──

  update(dt) {
    super.update(dt);

    // Advance simulation
    if (this._playing) {
      this._simDay += (dt * this._simSpeed) / 86400;
      if (this._simDay >= MISSION_DAYS) {
        this._simDay = 0;
      }
    }

    // Query current positions
    this._orionKm = getOrionPos(this._simDay);
    this._moonKm  = getMoonPos(this._simDay);

    // Update HUD
    const ORIGIN = { x: 0, y: 0, z: 0 };
    this._hud.setMissionState({
      phase:      getPhase(this._simDay),
      elapsed:    this._simDay * 86400,
      missionDay: this._simDay,
      distE:      Math.max(0, dist3d(this._orionKm, ORIGIN) - EARTH_RADIUS_KM),
      distM:      Math.max(0, dist3d(this._orionKm, this._moonKm) - MOON_RADIUS_KM),
      velocity:   getOrionVelocity(this._simDay),
    });

    // Update controls
    this._controls.setCurrentTime(this._simDay);

    // Update tweet feed
    this._tweetFeed.sync(this._simDay);

    // Update focus target based on camera mode
    switch (this._cameraMode) {
      case CAM.OVERVIEW:
      case CAM.FOCUS_EARTH:
        this._focusTargetKm.x = 0;
        this._focusTargetKm.y = 0;
        this._focusTargetKm.z = 0;
        break;
      case CAM.FOLLOW_ORION:
        this._focusTargetKm.x = this._orionKm.x;
        this._focusTargetKm.y = this._orionKm.y;
        this._focusTargetKm.z = this._orionKm.z;
        break;
      case CAM.FOCUS_MOON:
        this._focusTargetKm.x = this._moonKm.x;
        this._focusTargetKm.y = this._moonKm.y;
        this._focusTargetKm.z = this._moonKm.z;
        break;
    }

    // Lerp focus offset
    const fLerp = 0.08;
    this._focusKm.x += (this._focusTargetKm.x - this._focusKm.x) * fLerp;
    this._focusKm.y += (this._focusTargetKm.y - this._focusKm.y) * fLerp;
    this._focusKm.z += (this._focusTargetKm.z - this._focusKm.z) * fLerp;

    // Ease zoom
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    this.camera.update(dt);
  }

  // ── Render ──

  render() {
    Painter.setContext(this.ctx);
    this.clear();

    this._drawStarfield();
    this._drawMoonOrbit();
    this._drawEarthMoonLine();

    // Z-sorted trajectory: behind Earth → Earth → in front of Earth
    const earthZ = this._project(0, 0, 0).z;
    this._drawTrajectoryGhost((z) => z >= earthZ);
    this._drawTrajectoryTraveled((z) => z >= earthZ);
    this._drawBodies();
    this._drawTrajectoryGhost((z) => z < earthZ);
    this._drawTrajectoryTraveled((z) => z < earthZ);

    // Pipeline (controls, camera buttons, FPS)
    this.pipeline.render();

    // HUD overlay (drawn last, on top of everything)
    this._hud.draw(this);
  }

  // ── Projection ──

  _project(kmX, kmY, kmZ) {
    // Subtract focus offset so the focused body projects to screen center
    const proj = this.camera.project(
      (kmX - this._focusKm.x) / CONFIG.scale,
      (kmY - this._focusKm.y) / CONFIG.scale,
      (kmZ - this._focusKm.z) / CONFIG.scale,
    );
    return {
      x:     this.width  / 2 + proj.x * this.zoom,
      y:     this.height / 2 + proj.y * this.zoom,
      z:     proj.z,
      scale: proj.scale * this.zoom,
    };
  }

  // ── Drawing helpers ──

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
        ctx.arc(s.x, s.y, s.r, 0, TWO_PI);
        ctx.fill();
      }
    }, { saveState: true });
  }

  _drawMoonOrbit() {
    const O = CONFIG.moonOrbit;
    const pts = this._moonOrbitRing;
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = O.color;
      ctx.lineWidth = O.lineWidth;
      ctx.beginPath();
      for (let i = 0; i <= pts.length; i++) {
        const pt = pts[i % pts.length];
        const p = this._project(pt.x, pt.y, pt.z);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }, { saveState: true });
  }

  _drawEarthMoonLine() {
    const C = CONFIG.connection;
    const earthP = this._project(0, 0, 0);
    const moonP  = this._project(this._moonKm.x, this._moonKm.y, this._moonKm.z);

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = C.color;
      ctx.lineWidth = C.lineWidth;
      ctx.setLineDash([C.dashOn, C.dashOff]);
      ctx.beginPath();
      ctx.moveTo(earthP.x, earthP.y);
      ctx.lineTo(moonP.x, moonP.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }, { saveState: true });
  }

  _drawTrajectoryGhost(zFilter) {
    const T = CONFIG.trajectory;
    const pts = this._trajCurve;
    if (pts.length < 2) return;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = T.ghostColor;
      ctx.lineWidth = T.ghostWidth;
      ctx.lineJoin = 'round';
      let drawing = false;
      for (let i = 0; i < pts.length; i += T.step) {
        const p = this._project(pts[i].x, pts[i].y, pts[i].z);
        if (zFilter(p.z)) {
          if (!drawing) { ctx.beginPath(); ctx.moveTo(p.x, p.y); drawing = true; }
          else ctx.lineTo(p.x, p.y);
        } else {
          if (drawing) { ctx.lineTo(p.x, p.y); ctx.stroke(); drawing = false; }
        }
      }
      if (drawing) ctx.stroke();
    }, { saveState: true });
  }

  _drawTrajectoryTraveled(zFilter) {
    const T = CONFIG.trajectory;
    const pts = this._trajCurve;
    const upTo = getTrajProgress(this._simDay, pts.length);
    if (upTo < 2) return;

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = T.traveledColor;
      ctx.lineWidth = T.traveledWidth;
      ctx.lineJoin = 'round';
      let drawing = false;
      for (let i = 0; i <= upTo; i += T.step) {
        const p = this._project(pts[i].x, pts[i].y, pts[i].z);
        if (zFilter(p.z)) {
          if (!drawing) { ctx.beginPath(); ctx.moveTo(p.x, p.y); drawing = true; }
          else ctx.lineTo(p.x, p.y);
        } else {
          if (drawing) { ctx.lineTo(p.x, p.y); ctx.stroke(); drawing = false; }
        }
      }
      if (drawing) ctx.stroke();
    }, { saveState: true });
  }

  _drawBodies() {
    const earthP = this._project(0, 0, 0);
    const moonP  = this._project(this._moonKm.x, this._moonKm.y, this._moonKm.z);
    const orionP = this._project(this._orionKm.x, this._orionKm.y, this._orionKm.z);

    const bodies = [
      { z: earthP.z, draw: () => this._drawEarth(earthP) },
      { z: moonP.z,  draw: () => this._drawMoon(moonP) },
      { z: orionP.z, draw: () => this._drawOrionBeacon(orionP) },
    ].sort((a, b) => b.z - a.z);

    bodies.forEach(b => b.draw());
  }

  _drawEarth(p) {
    const E = CONFIG.earth;
    const screenR = E.radius * p.scale;
    const glowR   = E.glowRadius * p.scale;

    // Glow
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, screenR * 0.5, p.x, p.y, glowR);
      g.addColorStop(0, E.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, TWO_PI);
      ctx.fill();
    }, { saveState: true });

    // Sphere
    this._earthSphere.radius = screenR;
    Painter.save();
    Painter.translateTo(p.x, p.y);
    this._earthSphere.draw();
    Painter.restore();

    // Atmosphere ring
    Painter.shapes.strokeCircle(
      p.x, p.y,
      screenR + E.atmosphereOffset * p.scale,
      E.atmosphereColor,
      E.atmosphereWidth,
    );

    // Label
    Painter.useCtx((ctx) => {
      ctx.font = '10px monospace';
      ctx.fillStyle = E.labelColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('EARTH', p.x, p.y + screenR + 8);
    }, { saveState: true });
  }

  _drawMoon(p) {
    const M = CONFIG.moon;
    const screenR = M.radius * p.scale;
    const glowR   = M.glowRadius * p.scale;

    // Glow
    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, screenR * 0.5, p.x, p.y, glowR);
      g.addColorStop(0, M.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, TWO_PI);
      ctx.fill();
    }, { saveState: true });

    // Sphere
    this._moonSphere.radius = screenR;
    Painter.save();
    Painter.translateTo(p.x, p.y);
    this._moonSphere.draw();
    Painter.restore();

    // Label
    Painter.useCtx((ctx) => {
      ctx.font = '10px monospace';
      ctx.fillStyle = M.labelColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('MOON', p.x, p.y + screenR + 6);
    }, { saveState: true });
  }

  _drawOrionBeacon(p) {
    const O = CONFIG.orion;
    const glowR = O.glowRadius * p.scale;
    const beaconR = O.beaconRadius * p.scale;
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);

    // Glow
    Painter.useCtx((ctx) => {
      ctx.globalAlpha = pulse;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
      g.addColorStop(0, O.glowColor);
      g.addColorStop(0.4, 'rgba(255,107,53,0.15)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, TWO_PI);
      ctx.fill();
    }, { saveState: true });

    // Core beacon
    Painter.useCtx((ctx) => {
      ctx.globalAlpha = pulse;
      ctx.fillStyle = O.coreColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2, beaconR), 0, TWO_PI);
      ctx.fill();
    }, { saveState: true });

    // Label
    Painter.useCtx((ctx) => {
      ctx.font = O.labelFont;
      ctx.fillStyle = O.labelColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('ORION', p.x, p.y + Math.max(2, beaconR) + 6);
    }, { saveState: true });
  }
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new Artemis2Demo(canvas).start();
});
