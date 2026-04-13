/**
 * Artemis II HUD
 *
 * Top-left: mission title, status dot, phase, MET
 * Bottom-left: telemetry cards with Datatype font ligature charts
 *
 * Uses Datatype font ligatures for sparklines {l:v,v,...} and pies {p:v}.
 * All drawn via Painter — pure overlay, not a pipeline GameObject.
 */

import { Painter, Screen } from "/gcanvas.es.min.js";
import { formatElapsed } from "./artemis2.data.js";

const FONT = 'Datatype, ui-monospace, monospace';

// ── Ring buffer for sparkline history ──
class History {
  constructor(len) {
    this._buf = new Float64Array(len);
    this._len = len;
    this._idx = 0;
    this._count = 0;
  }
  push(v) {
    this._buf[this._idx] = v;
    this._idx = (this._idx + 1) % this._len;
    if (this._count < this._len) this._count++;
  }
  toArray() {
    const out = [];
    const start = this._count < this._len ? 0 : this._idx;
    for (let i = 0; i < this._count; i++) {
      out.push(this._buf[(start + i) % this._len]);
    }
    return out;
  }
}

/** Datatype pie ligature string */
function pieLigature(fraction) {
  return `{p:${Math.round(Math.max(0, Math.min(100, fraction * 100)))}}`;
}

/**
 * Artemis II HUD — pure Painter rendering.
 */
export const Artemis2HUD = {
  _state: null,
  _histories: null,
  _sampleTimer: 0,

  setMissionState(state) {
    this._state = state;

    if (!this._histories) {
      this._histories = {
        distE: new History(120),
        distM: new History(120),
        vel:   new History(120),
      };
    }

    this._sampleTimer++;
    if (this._sampleTimer % 4 === 0) {
      this._histories.distE.push(state.distE);
      this._histories.distM.push(state.distM);
      this._histories.vel.push(state.velocity);
    }
  },

  draw(game) {
    const s = this._state;
    if (!s) return;

    const m = Screen.responsive(0.75, 0.9, 1); // global scale

    // ── Title block (top-left) ──
    const tx = Screen.responsive(14, 20, 24);
    let ty = Screen.responsive(14, 20, 24);

    Painter.useCtx((ctx) => {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // "NASA · CSA"
      ctx.font = `600 ${11 * m}px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillText('NASA \u00B7 CSA', tx, ty);
      ty += 16 * m;

      // "ARTEMIS II"
      ctx.font = `800 ${28 * m}px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#6ec6ff';
      ctx.shadowBlur = 12;
      ctx.fillText('ARTEMIS II', tx, ty);
      ctx.shadowBlur = 0;
      ty += 34 * m;

      // Status dot + phase
      const dotR = 3.5 * m;
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.003);
      ctx.fillStyle = '#4cff91';
      ctx.globalAlpha = 0.4 + 0.6 * pulse;
      ctx.beginPath();
      ctx.arc(tx + dotR, ty + 5 * m, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.font = `600 ${11 * m}px ${FONT}`;
      ctx.fillStyle = '#4cff91';
      ctx.fillText(s.phase.toUpperCase(), tx + dotR * 2 + 8, ty);
      ty += 20 * m;

      // MET counter
      ctx.font = `700 ${18 * m}px ${FONT}`;
      ctx.fillStyle = '#6ec6ff';
      ctx.fillText(formatElapsed(s.elapsed), tx, ty);
    }, { saveState: true });

    // ── Telemetry cards (bottom-left, 2×2 grid) ──
    const cardW = Screen.responsive(135, 150, 165);
    const cardH = Screen.responsive(68, 76, 84);
    const gap = Screen.responsive(6, 8, 10);
    const padX = Screen.responsive(10, 12, 14);
    const padY = Screen.responsive(8, 9, 10);
    const baseX = Screen.responsive(10, 18, 24);
    const baseY = game.height - (2 * cardH + gap) - Screen.responsive(10, 18, 24);

    const labelSize = Screen.responsive(8, 9, 10);
    const valueSize = Screen.responsive(18, 20, 24);
    const unitSize  = Screen.responsive(8, 9, 10);
    const cards = [
      { label: 'EARTH DIST',
        value: Math.round(Math.abs(s.distE)).toLocaleString(), unit: 'km',
        spline: this._histories.distE, splineColor: '#4ab4ff', scaleZero: true },
      { label: 'MOON DIST',
        value: Math.round(Math.abs(s.distM)).toLocaleString(), unit: 'km',
        spline: this._histories.distM, splineColor: '#bbbbcc', scaleZero: true },
      { label: 'VELOCITY',
        value: s.velocity.toFixed(2), unit: 'km/s',
        spline: this._histories.vel, splineColor: '#ff8855' },
      { label: 'MISSION DAY',
        value: `Day ${Math.floor(s.missionDay) + 1}`, unit: 'of 10',
        pie: s.missionDay / 10, pieColor: '#4cff91' },
    ];

    cards.forEach((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = baseX + col * (cardW + gap);
      const cy = baseY + row * (cardH + gap);

      Painter.useCtx((ctx) => {
        // Card bg
        ctx.fillStyle = 'rgba(10,12,20,0.7)';
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 10);
        ctx.fill();
        ctx.stroke();

        // Spline behind text (full card, clipped to rounded rect)
        if (card.spline) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(cx, cy, cardW, cardH, 10);
          ctx.clip();
          this._drawSpline(ctx, cx, cy, cardW, cardH, card.spline, card.splineColor, card.scaleZero);
          ctx.restore();
        }

        // Label
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `700 ${labelSize}px ${FONT}`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(card.label, cx + padX, cy + padY);

        // Value
        ctx.textBaseline = 'bottom';
        const valueY = cy + cardH - padY;
        ctx.font = `700 ${valueSize}px ${FONT}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(card.value, cx + padX, valueY);

        // Unit
        const valW = ctx.measureText(card.value).width;
        ctx.font = `500 ${unitSize}px ${FONT}`;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillText(' ' + card.unit, cx + padX + valW, valueY);

        // Pie (right side, only for mission day)
        if (card.pie !== undefined) {
          const pieR = Screen.responsive(12, 14, 16);
          const pieX = cx + cardW - padX - pieR;
          const pieY = cy + cardH / 2;
          this._drawPie(ctx, pieX, pieY, pieR, card.pie, card.pieColor);
        }
      }, { saveState: true });
    });
  },

  _drawSpline(ctx, x, y, w, h, history, color, scaleZero) {
    const data = history.toArray();
    if (data.length < 4) return;

    // Scale: scaleZero uses 0..max for absolute shape, otherwise local min/max
    let lo = 0, hi = -Infinity;
    for (const v of data) { if (v > hi) hi = v; }
    if (!scaleZero) {
      lo = Infinity;
      for (const v of data) { if (v < lo) lo = v; }
    }
    const range = hi - lo || 1;

    // Line occupies bottom 60% of the card
    const lineH = h * 0.6;
    const lineTop = y + h - lineH;
    const n = data.length;
    const stepX = w / (n - 1);

    const pts = data.map((v, i) => ({
      x: x + i * stepX,
      y: lineTop + lineH - ((v - lo) / range) * lineH * 0.85 - lineH * 0.05,
    }));

    // Single smooth line, no fill
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length - 1; i++) {
      const cpx = (pts[i].x + pts[i + 1].x) / 2;
      const cpy = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, cpx, cpy);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  _drawPie(ctx, cx, cy, r, fraction, color) {
    const f = Math.max(0, Math.min(1, fraction));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + f * Math.PI * 2;

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Filled arc
    if (f > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color || 'rgba(110,198,255,0.6)';
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = color || '#6ec6ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color || '#6ec6ff';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  },
};
