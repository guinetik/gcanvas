/**
 * Artemis II HUD
 *
 * Displays mission phase, elapsed time, distances, and velocity.
 * Positioned top-left. Built from Text GameObjects + panel drawn via Painter.
 */

import {
  Scene,
  Text,
  Painter,
  verticalLayout,
  applyLayout,
} from "/gcanvas.es.min.js";
import { formatElapsed } from "./artemis2.physics.js";

const HUD_CONFIG = {
  padding:     12,
  lineHeight:  22,
  panelWidth:  270,
  font:        "12px monospace",
  titleFont:   "bold 13px monospace",
  color:       "#c8e6ff",
  titleColor:  "#4ab4ff",
  dimColor:    "rgba(100,160,200,0.6)",
  panelBg:     "rgba(0,8,20,0.78)",
  panelBorder: "rgba(70,150,220,0.35)",
};

/** Format a distance number with thousands separator */
function fmtKm(km) {
  return `${Math.round(km).toLocaleString()} km`;
}

export class Artemis2HUD extends Scene {
  constructor(game) {
    super(game, { x: HUD_CONFIG.padding, y: HUD_CONFIG.padding });
    this._buildUI();
  }

  _buildUI() {
    const C = HUD_CONFIG;
    const make = (text, font, color) =>
      new Text(this.game, text, { font, color, align: "left", baseline: "top" });

    this._title    = make("ARTEMIS II",             C.titleFont, C.titleColor);
    this._divider  = make("─────────────────────",  C.font,      C.dimColor);
    this._phase    = make("PHASE     —",             C.font,      C.color);
    this._elapsed  = make("ELAPSED   T+00:00:00:00", C.font,      C.color);
    this._distE    = make("DIST/E    —",             C.font,      C.color);
    this._distM    = make("DIST/M    —",             C.font,      C.color);
    this._velocity = make("VELOCITY  —",             C.font,      C.color);

    const items = [
      this._title,
      this._divider,
      this._phase,
      this._elapsed,
      this._distE,
      this._distM,
      this._velocity,
    ];

    const layout = verticalLayout(items, { spacing: C.lineHeight, align: "left" });
    applyLayout(items, layout.positions);
    items.forEach((item) => this.add(item));

    // Panel height: number of items * line height + top/bottom padding
    this._panelHeight = (items.length - 1) * C.lineHeight + C.padding * 2;
  }

  /**
   * Push current simulation state into HUD text fields.
   * @param {{ phase: string, elapsed: number, distE: number, distM: number, velocity: number }} state
   *   elapsed is in seconds; velocity is in km/s — HUD displays it as m/s
   */
  setMissionState(state) {
    this._phase.text    = `PHASE     ${state.phase}`;
    this._elapsed.text  = `ELAPSED   ${formatElapsed(state.elapsed)}`;
    this._distE.text    = `DIST/E    ${fmtKm(state.distE)}`;
    this._distM.text    = `DIST/M    ${fmtKm(state.distM)}`;
    this._velocity.text = `VELOCITY  ${Math.round(state.velocity * 1000)} m/s`;
  }

  /** Override draw to render panel background first, then children */
  draw() {
    const C = HUD_CONFIG;
    Painter.useCtx((ctx) => {
      ctx.fillStyle   = C.panelBg;
      ctx.strokeStyle = C.panelBorder;
      ctx.lineWidth   = 1;
      ctx.roundRect(
        -C.padding / 2,
        -C.padding / 2,
        C.panelWidth,
        this._panelHeight,
        4
      );
      ctx.fill();
      ctx.stroke();
    }, { saveState: true });
    super.draw(); // renders all child Text GameObjects
  }
}
