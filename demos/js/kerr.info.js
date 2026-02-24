/**
 * Kerr Info Panel — Modal overlay showing Kerr metric tensor components.
 *
 * Uses GCanvas GameObjects throughout: Text for labels, VerticalLayout for
 * positioning, Rectangle for backdrop/panel.
 * Uses StateMachine for open/closed state management.
 * Emits "panel:dismiss" via game.events when user clicks outside the panel.
 *
 * Highlights the off-diagonal g_tφ frame dragging term — the key difference
 * from Schwarzschild.
 *
 * @module kerr/info
 */

import {
  Text,
  Scene,
  Screen,
  VerticalLayout,
} from "../../src/index.js";
import { Rectangle } from "../../src/shapes/rect.js";
import { Tensor } from "../../src/math/tensor.js";
import { StateMachine } from "../../src/state/state-machine.js";

// ── Feature row definitions ──
const FEATURE_DEFS = [
  { key: "title",    label: "Kerr Metric (Rotating Black Hole)",                          tier: "title",    color: "#f7a" },
  { key: "equation", label: "ds\u00B2 = g\u03BC\u03BD dx\u03BC dx\u03BD (Boyer-Lindquist)", tier: "equation", color: "#aaa" },
  { key: "mass",     label: "Mass: M = 1.00",                                              tier: "metric",   color: "#888" },
  { key: "spin",     label: "Spin: a = 0.70M (70%)",                                       tier: "spin",     color: "#fa8" },
  { key: "gtt",      label: "Time: g_tt = -(1 - 2Mr/\u03A3) = -0.8000",                   tier: "metric",   color: "#f88" },
  { key: "grr",      label: "Radial: g_rr = \u03A3/\u0394 = 1.2500",                      tier: "metric",   color: "#8f8" },
  { key: "gthth",    label: "Polar: g_\u03B8\u03B8 = \u03A3 = 100.00",                    tier: "metric",   color: "#88f" },
  { key: "gphph",    label: "Azimuthal: g_\u03C6\u03C6 = (r\u00B2+a\u00B2+...)sin\u00B2\u03B8 = 100.00", tier: "metric", color: "#f8f" },
  { key: "gtph",     label: "Frame Dragging: g_t\u03C6 = -2Mar sin\u00B2\u03B8/\u03A3 = -0.1800", tier: "framedrag", color: "#ff0" },
  { key: "rplus",    label: "Outer Horizon: r+ = 1.44",                                    tier: "radii",    color: "#f55" },
  { key: "rminus",   label: "Inner Horizon: r- = 0.56",                                    tier: "radii",    color: "#a55" },
  { key: "rergo",    label: "Ergosphere: r_ergo = 2.00",                                   tier: "radii",    color: "#f80" },
  { key: "riscoP",   label: "Prograde ISCO: r_isco = 2.32",                                tier: "radii",    color: "#5f8" },
  { key: "riscoR",   label: "Retrograde ISCO: r_isco = 8.71",                              tier: "radii",    color: "#58f" },
  { key: "pos",      label: "Orbiter: r = 10.00, \u03A9_drag = 0.0200",                    tier: "radii",    color: "#aaa" },
];

// Tooltip descriptions
const DESCRIPTIONS = {
  title:    "The Kerr metric describes spacetime around a rotating black hole.\n\nKerr is STATIONARY - it doesn't evolve over time. The animation shows geometric interpolation from flat to Kerr.\n\nVisual effects are EXAGGERATED to make curvature and frame dragging easier to see.",
  equation: "Boyer-Lindquist coordinates (t, r, \u03B8, \u03C6) generalize Schwarzschild coordinates for rotating spacetime.",
  mass:     "Mass of the black hole in geometrized units (G = c = 1).",
  spin:     "Spin parameter a = J/Mc (angular momentum per unit mass).\n\n0 = Schwarzschild (no rotation)\nM = Extremal Kerr (maximum spin)\n\nClick the shuffle button to randomize!",
  gtt:      "Time-time component. Modified by \u03A3 = r\u00B2 + a\u00B2cos\u00B2\u03B8.\nDepends on BOTH r and \u03B8 (not spherically symmetric!).",
  grr:      "Radial component. \u0394 = r\u00B2 - 2Mr + a\u00B2.\nDiverges at horizons where \u0394 = 0.",
  gthth:    "Theta component. \u03A3 = r\u00B2 + a\u00B2cos\u00B2\u03B8.\nNot just r\u00B2 \u2014 rotation breaks spherical symmetry.",
  gphph:    "Phi component. More complex than Schwarzschild.\nIncludes 2Ma\u00B2r sin\u00B2\u03B8/\u03A3 rotation term.",
  gtph:     "FRAME DRAGGING TERM\n\nThis off-diagonal component is THE key difference!\n\nIt couples time and rotation: even light must rotate with the black hole.\n\nInside the ergosphere, NOTHING can stay still.",
  rplus:    "Outer Event Horizon: r+ = M + \u221A(M\u00B2 - a\u00B2)\nSmaller than Schwarzschild 2M when spinning.\nApproaches M as a \u2192 M (extremal).",
  rminus:   "Inner (Cauchy) Horizon: r- = M - \u221A(M\u00B2 - a\u00B2)\nUnique to rotating black holes.\nHides a ring singularity, not a point.",
  rergo:    "Ergosphere boundary (at equator)\nBetween r+ and r_ergo: the ergosphere.\nObjects can escape, but CANNOT stay stationary!",
  riscoP:   "ISCO for prograde (co-rotating) orbits.\nCloser than Schwarzschild ISCO!\nFrame dragging helps co-rotating orbits.",
  riscoR:   "ISCO for retrograde (counter-rotating) orbits.\nFarther than Schwarzschild ISCO!\nFrame dragging opposes counter-rotation.",
  pos:      "Orbiter position and local frame-dragging rate.\n\u03A9_drag shows how fast spacetime rotates here.",
};

/**
 * KerrInfoPanel — A modal overlay for the Kerr metric tensor.
 *
 * Uses Text GameObjects inside a VerticalLayout, centered on screen.
 * StateMachine drives open/closed transitions.
 * Listens for inputup via game.events; emits "panel:dismiss" when
 * the user clicks outside the panel bounds.
 */
export class KerrInfoPanel extends Scene {
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
      title:     `bold ${Screen.responsive(15, 19, 22)}px monospace`,
      equation:  `${Screen.responsive(13, 16, 18)}px monospace`,
      metric:    `${Screen.responsive(12, 14, 16)}px monospace`,
      spin:      `bold ${Screen.responsive(13, 15, 17)}px monospace`,
      framedrag: `bold ${Screen.responsive(13, 15, 17)}px monospace`,
      radii:     `${Screen.responsive(11, 13, 15)}px monospace`,
    };

    const spacing = Screen.responsive(6, 10, 12);
    this._panelPadding = Screen.responsive(14, 24, 32);

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
      width: 100,
      height: 100,
      color: "rgba(10, 10, 20, 0.65)",
      stroke: "rgba(255, 120, 170, 0.3)",
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

      // Click inside the panel — ignore
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

  setMetricValues(r, theta, M, a) {
    const metric = Tensor.kerr(r, theta, M, a);
    const spinPercent = ((a / M) * 100).toFixed(0);

    this.rows.gtt.text.text   = `Time: g_tt = -(1 - 2Mr/\u03A3) = ${metric.get(0, 0).toFixed(4)}`;
    this.rows.grr.text.text   = `Radial: g_rr = \u03A3/\u0394 = ${metric.get(1, 1).toFixed(4)}`;
    this.rows.gthth.text.text = `Polar: g_\u03B8\u03B8 = \u03A3 = ${metric.get(2, 2).toFixed(2)}`;
    this.rows.gphph.text.text = `Azimuthal: g_\u03C6\u03C6 = (r\u00B2+a\u00B2+...)sin\u00B2\u03B8 = ${metric.get(3, 3).toFixed(2)}`;
    this.rows.gtph.text.text  = `Frame Dragging: g_t\u03C6 = -2Mar sin\u00B2\u03B8/\u03A3 = ${metric.get(0, 3).toFixed(4)}`;

    this.rows.mass.text.text  = `Mass: M = ${M.toFixed(2)}`;
    this.rows.spin.text.text  = `Spin: a = ${a.toFixed(2)}M (${spinPercent}%)`;

    const rPlus = Tensor.kerrHorizonRadius(M, a, false);
    const rMinus = Tensor.kerrHorizonRadius(M, a, true);
    const rErgo = Tensor.kerrErgosphereRadius(M, a, Math.PI / 2);
    const iscoP = Tensor.kerrISCO(M, a, true);
    const iscoR = Tensor.kerrISCO(M, a, false);

    this.rows.rplus.text.text  = `Outer Horizon: r+ = ${rPlus.toFixed(2)}`;
    this.rows.rminus.text.text = `Inner Horizon: r- = ${rMinus.toFixed(2)}`;
    this.rows.rergo.text.text  = `Ergosphere: r_ergo = ${rErgo.toFixed(2)}`;
    this.rows.riscoP.text.text = `Prograde ISCO: r_isco = ${iscoP.toFixed(2)}`;
    this.rows.riscoR.text.text = `Retrograde ISCO: r_isco = ${iscoR.toFixed(2)}`;
  }

  setOrbiterPosition(r, phi, M, a) {
    const omega = Tensor.kerrFrameDraggingOmega(r, Math.PI / 2, M, a);
    this.rows.pos.text.text = `Orbiter: r = ${r.toFixed(2)}, \u03A9_drag = ${omega.toFixed(4)}`;
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
    return Screen.responsive(this.game.width - 40, 500, 600);
  }

  _getContentHeight() {
    const layoutH = this._layout.height || 400;
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
