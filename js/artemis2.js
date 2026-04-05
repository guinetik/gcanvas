/**
 * Artemis II Trajectory Demo
 *
 * Earth + Moon orbit with launch-window game mechanic.
 * Camera3D with drag-to-rotate and scroll/pinch zoom.
 *
 * TODO: re-enable simulation, HUD, and Orion ship layers
 */

import {
  Game,
  Camera3D,
  Painter,
  Screen,
  Gesture,
  FPSCounter,
  Sphere3D,
  AccordionGroup,
  Slider,
  Button,
  setTheme,
} from "/gcanvas.es.min.js";

import { createArtemisMission } from "./artemis2.mission.js";

// ─── Kept but unhooked ───
// import { Artemis2HUD } from "./artemis2.hud.js";
// import { Artemis2Controls } from "./artemis2.controls.js";
// Old FSM (StateMachine.fromSequence) is replaced by _gameState below.

const TWO_PI = Math.PI * 2;

const CONFIG = {
  scale:          800,       // orbit fills ~80% of canvas width at default zoom
  baseScreenSize:  900,
  minZoom:         0.25,
  maxZoom:         4.0,
  zoomSpeed:       0.3,
  zoomEasing:      0.1,

  camera: {
    perspective:      900,
    rotationX:        1.15,       // birds-eye: looking down from slightly above
    rotationY:        0,
    clampX:           false,      // unclamped — full freedom to tilt
    inertia:          true,
    friction:         0.92,
    autoRotate:       false,
    autoRotateSpeed:  0.04,
  },

  // Mouse X drag spins the orbital plane (Z axis), Y drag tilts (X axis)
  mouseControl: {
    horizontalAxis: 'rotationZ',
    verticalAxis:   'rotationX',
  },

  earth: {
    color:              '#1a6faf',
    glowColor:          'rgba(80,160,255,0.35)',
    glowRadius:         22,
    radius:             14,
    atmosphereOffset:   2,
    atmosphereColor:    'rgba(100,180,255,0.4)',
    atmosphereWidth:    1.5,
  },

  moon: {
    color:       '#888',
    glowColor:   'rgba(200,200,200,0.18)',
    glowRadius:  14,
    radius:      7,
    orbitRadius: 384400,
    period:      2360592,
  },

  orbit: {
    color:     'rgba(255,255,255,0.08)',
    lineWidth: 1,
    segments:  128,
  },

  starCount: { small: 300, medium: 400, large: 500 },

  panel: {
    width:        240,
    padding:      12,
    spacing:      8,
    headerHeight: 28,
    marginRight:  14,
    marginTop:    14,
  },

  time: {
    defaultScale: 10000,
    minScale:     1,
    maxScale:     200000,
  },

  // Launch window — moon must be within ±halfArc of targetAngle (radians).
  // targetAngle = 0 → moon at 3-o'clock (matches physics sim initial conditions).
  launch: {
    targetAngle: 0,
    halfArc:     Math.PI / 12,   // ±15° → 30° window
  },

  launchBtn: {
    width:    180,
    height:   48,
    bottomPad: 60,
  },
};

// ── Game states ──
const STATE = {
  WAITING:  'WAITING',   // moon not in position — watch the orbit
  WINDOW:   'WINDOW',    // launch window open — LAUNCH button visible
  LAUNCHED: 'LAUNCHED',  // player pressed LAUNCH (future: start mission)
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

    this._starCount = Screen.responsive(
      CONFIG.starCount.small,
      CONFIG.starCount.medium,
      CONFIG.starCount.large,
    );

    // Simulation clock
    this._clock = 0;
    this._timeScale = CONFIG.time.defaultScale;

    // Game state
    this._gameState = STATE.WAITING;
    this._mission = null;

    // Camera + zoom
    this.camera = new Camera3D(CONFIG.camera);
    this.camera.enableMouseControl(this.canvas, CONFIG.mouseControl);

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

    this.zoom = Math.min(
      CONFIG.maxZoom,
      Math.max(CONFIG.minZoom, Screen.minDimension() / CONFIG.baseScreenSize),
    );
    this.targetZoom = this.zoom;

    // Gesture (pinch/scroll zoom)
    this.gesture = new Gesture(this.canvas, {
      onZoom: (delta) => {
        this.targetZoom *= 1 + delta * CONFIG.zoomSpeed;
        this.targetZoom = Math.max(CONFIG.minZoom, Math.min(CONFIG.maxZoom, this.targetZoom));
      },
    });

    // Starfield
    this._stars = this._generateStars(this._starCount);

    // Orbit ring vertices
    this._orbitPoints = this._buildOrbitRing();

    // Control panel (top-right)
    this._buildPanel();

    // Launch button (bottom-center, hidden until window opens)
    this._buildLaunchButton();

    // FPS counter
    this.pipeline.add(new FPSCounter(this));

    // Resize
    if (this.events) {
      this.events.on('screenresize', () => {
        this._stars = this._generateStars(this._starCount);
        this._positionPanel();
        this._positionLaunchBtn();
      });
    }
  }

  // ── UI builders ──

  _buildPanel() {
    setTheme('monochrome');

    const C = CONFIG.panel;
    const panelWidth = Screen.responsive(200, 230, C.width);
    const sliderW = panelWidth - C.padding * 2;

    const panel = new AccordionGroup(this, {
      width: panelWidth,
      padding: C.padding,
      spacing: C.spacing,
      headerHeight: C.headerHeight,
    });
    panel.interactive = true;

    const simSection = panel.addSection('Simulation', { expanded: true });

    this._timeSlider = new Slider(this, {
      label: 'Time Scale',
      min: CONFIG.time.minScale,
      max: CONFIG.time.maxScale,
      value: CONFIG.time.defaultScale,
      step: 1,
      width: sliderW,
      formatValue: (v) => `×${v.toFixed(0)}`,
      onChange: (v) => { this._timeScale = v; },
    });
    simSection.addItem(this._timeSlider);

    panel.commitSection(simSection);
    panel.layoutAll();

    this._panel = panel;
    this.pipeline.add(panel);
    this._positionPanel();
  }

  _positionPanel() {
    const C = CONFIG.panel;
    this._panel.x = this.width - Screen.responsive(200, 230, C.width) - C.marginRight;
    this._panel.y = C.marginTop;
  }

  _buildLaunchButton() {
    const B = CONFIG.launchBtn;
    this._launchBtn = new Button(this, {
      width:  B.width,
      height: B.height,
      text:   '🚀 LAUNCH',
      font:   'bold 18px monospace',
      colorDefaultBg:     'rgba(0,40,80,0.9)',
      colorDefaultStroke:  'rgba(80,180,255,0.6)',
      colorDefaultText:    '#4ab4ff',
      colorHoverBg:        'rgba(80,180,255,0.9)',
      colorHoverStroke:    '#4ab4ff',
      colorHoverText:      '#000',
      colorPressedBg:      'rgba(60,140,220,0.9)',
      colorPressedStroke:  '#4ab4ff',
      colorPressedText:    '#000',
      onClick: () => this._onLaunch(),
    });
    this._launchBtn.visible = false;
    this._positionLaunchBtn();
    this.pipeline.add(this._launchBtn);
  }

  _positionLaunchBtn() {
    this._launchBtn.x = this.width / 2;
    this._launchBtn.y = this.height - CONFIG.launchBtn.bottomPad;
  }

  _onLaunch() {
    this._gameState = STATE.LAUNCHED;
    this._launchBtn.visible = false;

    // Build mission: spiral orbits → TLI → flyby → return → reentry
    this._mission = createArtemisMission(
      this._moonAngle(),
      CONFIG.moon.period,
      CONFIG.moon.orbitRadius,
    );
  }

  // ── Moon angle helper ──

  _moonAngle() {
    // Normalise to [0, 2π)
    return ((TWO_PI * this._clock) / CONFIG.moon.period) % TWO_PI;
  }

  _isInLaunchWindow() {
    const angle = this._moonAngle();
    const target = CONFIG.launch.targetAngle;
    // Signed shortest angular distance
    let diff = angle - target;
    diff = ((diff + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
    return Math.abs(diff) <= CONFIG.launch.halfArc;
  }

  // ── Update ──

  update(dt) {
    super.update(dt);

    // Advance clock
    this._clock += dt * this._timeScale;

    // State transitions
    if (this._gameState === STATE.WAITING || this._gameState === STATE.WINDOW) {
      const inWindow = this._isInLaunchWindow();
      if (inWindow && this._gameState === STATE.WAITING) {
        this._gameState = STATE.WINDOW;
        this._launchBtn.visible = true;
      } else if (!inWindow && this._gameState === STATE.WINDOW) {
        this._gameState = STATE.WAITING;
        this._launchBtn.visible = false;
      }
    }

    // Advance mission path
    if (this._mission) {
      this._mission.update(dt, this._timeScale);
    }

    // Ease zoom
    this.zoom += (this.targetZoom - this.zoom) * CONFIG.zoomEasing;

    this.camera.update(dt);
  }

  // ── Render ──

  render() {
    Painter.setContext(this.ctx);
    this.clear();

    this._drawStarfield();
    this._drawOrbitPath();
    this._drawLaunchWindowArc();
    if (this._mission) {
      this._mission.draw((x, y, z) => this._project(x, y, z));
    }
    this._drawBodies();

    // Pipeline (panel, launch button, FPS)
    this.pipeline.render();
  }

  // ── Projection ──

  _project(kmX, kmY, kmZ) {
    const proj = this.camera.project(
      kmX / CONFIG.scale,
      kmY / CONFIG.scale,
      kmZ / CONFIG.scale,
    );
    return {
      x:     this.width  / 2 + proj.x * this.zoom,
      y:     this.height / 2 + proj.y * this.zoom,
      z:     proj.z,
      scale: proj.scale * this.zoom,
    };
  }

  // ── Moon position ──

  _moonPosition() {
    const angle = this._moonAngle();
    return {
      x: CONFIG.moon.orbitRadius * Math.cos(angle),
      y: CONFIG.moon.orbitRadius * Math.sin(angle),
      z: 0,
    };
  }

  // ── Orbit ring ──

  _buildOrbitRing() {
    const N = CONFIG.orbit.segments;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const angle = (TWO_PI * i) / N;
      pts.push({
        x: CONFIG.moon.orbitRadius * Math.cos(angle),
        y: CONFIG.moon.orbitRadius * Math.sin(angle),
        z: 0,
      });
    }
    return pts;
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
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }, { saveState: true });
  }

  _drawOrbitPath() {
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = CONFIG.orbit.color;
      ctx.lineWidth = CONFIG.orbit.lineWidth;
      ctx.beginPath();
      for (let i = 0; i < this._orbitPoints.length; i++) {
        const pt = this._orbitPoints[i];
        const p = this._project(pt.x, pt.y, pt.z);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }, { saveState: true });
  }

  /** Highlight the launch window arc on the orbit ring */
  _drawLaunchWindowArc() {
    const L = CONFIG.launch;
    const R = CONFIG.moon.orbitRadius;
    const startAngle = L.targetAngle - L.halfArc;
    const endAngle   = L.targetAngle + L.halfArc;
    const steps = 24;

    const inWindow = this._gameState === STATE.WINDOW;
    const color = inWindow ? 'rgba(80,255,120,0.5)' : 'rgba(80,180,255,0.25)';

    Painter.useCtx((ctx) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = startAngle + (endAngle - startAngle) * (i / steps);
        const p = this._project(R * Math.cos(a), R * Math.sin(a), 0);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }, { saveState: true });
  }

  _drawBodies() {
    const earthP = this._project(0, 0, 0);
    const moon   = this._moonPosition();
    const moonP  = this._project(moon.x, moon.y, moon.z);

    const bodies = [
      { z: earthP.z, draw: () => this._drawEarth(earthP) },
      { z: moonP.z,  draw: () => this._drawMoon(moonP) },
    ].sort((a, b) => b.z - a.z);

    bodies.forEach(b => b.draw());
  }

  _drawEarth(p) {
    const E = CONFIG.earth;
    const screenR = E.radius * p.scale;
    const glowR   = E.glowRadius * p.scale;

    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, screenR * 0.5, p.x, p.y, glowR);
      g.addColorStop(0, E.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }, { saveState: true });

    this._earthSphere.radius = screenR;
    Painter.save();
    Painter.translateTo(p.x, p.y);
    this._earthSphere.draw();
    Painter.restore();

    Painter.shapes.strokeCircle(
      p.x, p.y,
      screenR + E.atmosphereOffset * p.scale,
      E.atmosphereColor,
      E.atmosphereWidth,
    );
  }

  _drawMoon(p) {
    const M = CONFIG.moon;
    const screenR = M.radius * p.scale;
    const glowR   = M.glowRadius * p.scale;

    Painter.useCtx((ctx) => {
      const g = ctx.createRadialGradient(p.x, p.y, screenR * 0.5, p.x, p.y, glowR);
      g.addColorStop(0, M.glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }, { saveState: true });

    this._moonSphere.radius = screenR;
    Painter.save();
    Painter.translateTo(p.x, p.y);
    this._moonSphere.draw();
    Painter.restore();
  }
}

window.addEventListener('load', () => {
  const canvas = document.getElementById('game');
  new Artemis2Demo(canvas).start();
});
