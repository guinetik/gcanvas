/**
 * Schwarzschild Info Panel — Modal overlay showing metric tensor components.
 *
 * Uses GCanvas GameObjects throughout: Text for labels, VerticalLayout for
 * positioning, Rectangle for backdrop/panel.
 * Uses StateMachine for open/closed state management.
 * Emits "dismiss" via game.events when user clicks outside the panel.
 *
 * @module schwarzschild/info
 */

import {
  Text,
  Scene,
  Screen,
  VerticalLayout,
} from "/gcanvas.es.min.js";
import { Rectangle } from "/gcanvas.es.min.js";
import { Tensor } from "/gcanvas.es.min.js";
import { StateMachine } from "/gcanvas.es.min.js";

// ── Feature row definitions ──
const FEATURE_DEFS = [
  { key: "title",    label: "Schwarzschild Metric Tensor",                       tier: "title",    color: "#7af" },
  { key: "equation", label: "ds\u00B2 = g\u03BC\u03BD dx\u03BC dx\u03BD",       tier: "equation", color: "#aaa" },
  { key: "mass",     label: "Mass: M = 1.00",                                    tier: "metric",   color: "#888" },
  { key: "gtt",      label: "Time: g_tt = -(1 - rs/r) = -0.8000",               tier: "metric",   color: "#f88" },
  { key: "grr",      label: "Radial: g_rr = (1 - rs/r)\u207B\u00B9 = 1.2500",   tier: "metric",   color: "#8f8" },
  { key: "gthth",    label: "Polar: g_\u03B8\u03B8 = r\u00B2 = 100.00",         tier: "metric",   color: "#88f" },
  { key: "gphph",    label: "Azimuthal: g_\u03C6\u03C6 = r\u00B2sin\u00B2\u03B8 = 100.00", tier: "metric", color: "#f8f" },
  { key: "rs",       label: "Event Horizon: rs = 2M = 2.00",                     tier: "radii",    color: "#f55" },
  { key: "rph",      label: "Photon Sphere: r_ph = 1.5rs = 3.00",               tier: "radii",    color: "#fa5" },
  { key: "risco",    label: "ISCO: r_isco = 3rs = 6.00",                         tier: "radii",    color: "#5f8" },
  { key: "pos",      label: "Orbiter: r = 10.00, \u03C6 = 0.00",                tier: "radii",    color: "#aaa" },
];

// Tooltip descriptions
const DESCRIPTIONS = {
  title:    "The Schwarzschild metric describes spacetime geometry around a non-rotating, spherically symmetric mass. It was the first exact solution to Einstein's field equations (1916).",
  equation: "The line element ds\u00B2 measures spacetime intervals. It uses the metric tensor g\u03BC\u03BD to convert coordinate differences into proper distances/times.",
  mass:     "Mass of the black hole (in geometrized units where G = c = 1).\nClick the shuffle button to randomize between 1.0 and 4.0.",
  gtt:      "Time-time component: Controls how time flows.\nNegative sign indicates timelike direction.\nApproaches 0 at the event horizon (time freezes for distant observers).",
  grr:      "Radial-radial component: Controls radial distances.\nDiverges at rs (coordinate singularity).\nRadial distances stretch near the black hole.",
  gthth:    "Theta-theta component: Angular metric in the polar direction.\nSame as flat space \u2014 angles are unaffected by the mass.",
  gphph:    "Phi-phi component: Angular metric in azimuthal direction.\nAt equator (\u03B8=\u03C0/2), sin\u00B2\u03B8 = 1.\nSpherical symmetry preserved.",
  rs:       "Schwarzschild Radius (Event Horizon)\nThe point of no return \u2014 even light cannot escape.\nFor the Sun: rs \u2248 3 km. For Earth: rs \u2248 9 mm.",
  rph:      "Photon Sphere\nUnstable circular orbit for light.\nPhotons can orbit here, but any perturbation sends them spiraling in or out.",
  risco:    "Innermost Stable Circular Orbit (ISCO)\nThe closest stable orbit for massive particles.\nWithin this radius, orbits require constant thrust to maintain.",
  pos:      "Current position of the test particle in Schwarzschild coordinates.\nr = radial distance, \u03C6 = orbital angle.",
};

/**
 * SchwarzschildInfoPanel — A modal overlay for the metric tensor.
 *
 * Uses Text GameObjects inside a VerticalLayout, centered on screen.
 * StateMachine drives open/closed transitions.
 * Listens for inputup via game.events; emits "panel:dismiss" when
 * the user clicks outside the panel bounds.
 */
export class SchwarzschildInfoPanel extends Scene {
  constructor(game, options = {}) {
    super(game, { x: 0, y: 0, ...options });

    this.visible = false;
    this.interactive = false;

    // Map of key → { text: Text, desc: string }
    this.rows = {};

    this._buildContent();
    this._initStateMachine();
    this._initInputHandlers();
  }

  _buildContent() {
    const fonts = {
      title:    `bold ${Screen.responsive(16, 20, 24)}px monospace`,
      equation: `${Screen.responsive(14, 17, 20)}px monospace`,
      metric:   `${Screen.responsive(13, 15, 17)}px monospace`,
      radii:    `${Screen.responsive(12, 14, 16)}px monospace`,
    };

    const spacing = Screen.responsive(8, 12, 14);
    this._panelPadding = Screen.responsive(16, 28, 36);

    // ── Backdrop (full-screen dark overlay) ──
    this._backdrop = new Rectangle({
      width: this.game.width,
      height: this.game.height,
      color: "rgba(0, 0, 0, 0.5)",
      origin: "top-left",
    });

    // ── Content layout ──
    this._layout = new VerticalLayout(this.game, {
      spacing,
      padding: 0,
      align: "start",
    });

    for (const def of FEATURE_DEFS) {
      const font = fonts[def.tier];

      const textGo = new Text(this.game, def.label, {
        font,
        debug: false,
        debugColor: "red",
        color: def.color,
        align: "left",
        baseline: "top",
      });

      this.rows[def.key] = {
        text: textGo,
        desc: DESCRIPTIONS[def.key],
      };

      this._layout.add(textGo);
    }

    // Trigger initial layout
    this._layout.update(0);

    // ── Panel background (sized to layout) ──
    this._panelBg = new Rectangle({
      width: 100,  // will be updated in render
      height: 100,
      color: "rgba(10, 10, 20, 0.65)",
      stroke: "rgba(100, 170, 255, 0.3)",
      lineWidth: 1,
      origin: "top-left",
      radius: 10,
    });
  }

  // ── State Machine ──

  _initStateMachine() {
    this._fsm = new StateMachine({
      initial: "closed",
      context: this,
      states: {
        closed: {
          enter() {
            this.visible = false;
            this.interactive = false;
          },
        },
        open: {
          enter() {
            this.visible = true;
            this.interactive = true;
            this._justOpened = true;
          },
        },
      },
    });
  }

  // ── Input ──

  _initInputHandlers() {
    this._onInputUp = (e) => {
      if (!this._fsm.is("open")) return;

      // Skip the inputup that opened us (same event cycle)
      if (this._justOpened) {
        this._justOpened = false;
        return;
      }

      // Click inside the panel — ignore (let tooltip handling work)
      if (this._isInsidePanel(e.x, e.y)) return;

      // Click outside — dismiss
      this._fsm.setState("closed");
      this.game.events.emit("panel:dismiss");
    };

    this.game.events.on("inputup", this._onInputUp);
  }

  /**
   * Check if screen coordinates fall inside the panel bounds.
   */
  _isInsidePanel(screenX, screenY) {
    const pw = this._getContentWidth();
    const ph = this._getContentHeight();
    const px = (this.game.width - pw) / 2;
    const py = (this.game.height - ph) / 2;
    return screenX >= px && screenX <= px + pw &&
           screenY >= py && screenY <= py + ph;
  }

  // ── Public API ──

  show() {
    this._fsm.setState("open");
  }

  hide() {
    this._fsm.setState("closed");
  }

  toggle() {
    if (this._fsm.is("open")) this.hide();
    else this.show();
    return this._fsm.is("open");
  }

  setMetricValues(r, rs, mass, theta = Math.PI / 2) {
    const metric = Tensor.schwarzschild(r, rs, theta);

    this.rows.gtt.text.text   = `Time: g_tt = -(1 - rs/r) = ${metric.get(0, 0).toFixed(4)}`;
    this.rows.grr.text.text   = `Radial: g_rr = (1 - rs/r)\u207B\u00B9 = ${metric.get(1, 1).toFixed(4)}`;
    this.rows.gthth.text.text = `Polar: g_\u03B8\u03B8 = r\u00B2 = ${metric.get(2, 2).toFixed(2)}`;
    this.rows.gphph.text.text = `Azimuthal: g_\u03C6\u03C6 = r\u00B2sin\u00B2\u03B8 = ${metric.get(3, 3).toFixed(2)}`;

    this.rows.mass.text.text  = `Mass: M = ${mass.toFixed(2)}`;
    this.rows.rs.text.text    = `Event Horizon: rs = 2M = ${rs.toFixed(2)}`;
    this.rows.rph.text.text   = `Photon Sphere: r_ph = 1.5rs = ${Tensor.photonSphereRadius(rs).toFixed(2)}`;
    this.rows.risco.text.text = `ISCO: r_isco = 3rs = ${Tensor.iscoRadius(rs).toFixed(2)}`;
  }

  setOrbiterPosition(r, phi) {
    this.rows.pos.text.text = `Orbiter: r = ${r.toFixed(2)}, \u03C6 = ${(phi % (2 * Math.PI)).toFixed(2)}`;
  }

  /**
   * Get the description for a row at the given screen coordinates.
   */
  getFeatureAt(screenX, screenY) {
    if (!this._fsm.is("open")) return null;

    if (!this._isInsidePanel(screenX, screenY)) return null;

    // Convert screen Y to layout-local coordinates
    const layoutLocalY = screenY - this._layout.y;

    for (const row of Object.values(this.rows)) {
      const label = row.text;
      const labelH = label.measureHeight() || 16;
      if (layoutLocalY >= label.y && layoutLocalY <= label.y + labelH) {
        return row;
      }
    }

    return null;
  }

  // ── Sizing ──

  _getContentWidth() {
    return Screen.responsive(this.game.width - 40, 480, 560);
  }

  _getContentHeight() {
    const layoutH = this._layout.height || 300;
    return layoutH + this._panelPadding * 2;
  }

  // ── Rendering ──
  // Override render() to bypass Scene transforms — draws in screen space.

  render() {
    if (!this.visible) return;

    const w = this.game.width;
    const h = this.game.height;
    const pw = this._getContentWidth();
    const ph = this._getContentHeight();
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    const pad = this._panelPadding;
    const layoutH = this._layout.height || 0;

    // ── Backdrop ──
    this._backdrop.width = w;
    this._backdrop.height = h;
    this._backdrop.render();

    // ── Panel background ──
    this._panelBg.x = px;
    this._panelBg.y = py;
    this._panelBg.width = pw;
    this._panelBg.height = ph;
    this._panelBg.render();

    // ── Content (VerticalLayout) ──
    this._layout.x = px + pad;
    this._layout.y = py + pad + layoutH / 2;
    this._layout.update(0);
    this._layout.render();
  }
}
