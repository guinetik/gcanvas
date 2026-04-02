/**
 * Artemis II Controls Panel
 *
 * Bottom-center panel: play/pause, speed selector, time slider, mission clock.
 *
 * Callbacks: onPlay, onPause, onSeek(t), onSpeedChange(multiplier)
 * External API: setCurrentTime(t, duration)
 */

import {
  Scene,
  Text,
  Button,
  Painter,
} from "../../src/index.js";

const CTRL_CONFIG = {
  panelWidth:    520,
  panelHeight:   100,
  padding:       16,
  bg:            'rgba(0,8,20,0.78)',
  border:        'rgba(70,150,220,0.35)',
  trackColor:    'rgba(70,150,220,0.3)',
  trackHeight:   4,
  thumbColor:    '#4ab4ff',
  thumbRadius:   8,
  sliderY:       62,   // y of slider track center within panel (local coords)
  clockFont:     '11px monospace',
  clockColor:    'rgba(100,180,220,0.8)',
  speeds:        [1, 10, 100, 1000],
  btnWidth:      58,
  btnHeight:     30,
  btnGap:        6,
  btnY:          22,
};

export class Artemis2Controls extends Scene {
  constructor(game, callbacks = {}) {
    super(game, { x: 0, y: 0 }); // positioned by main demo

    this._cb = callbacks;
    this._playing = false;
    this._speed = 100;
    this._t = 0;
    this._duration = 1;
    this._draggingSlider = false;

    this._buildUI();
    this._attachCanvasListeners();
  }

  _buildUI() {
    const C = CTRL_CONFIG;

    // Play/pause button
    this._playBtn = new Button(this.game, {
      x: C.padding,
      y: C.btnY,
      width: C.btnWidth,
      height: C.btnHeight,
      text: '▶ Play',
      origin: 'top-left',
      onClick: () => this._togglePlay(),
    });
    this.add(this._playBtn);

    // Speed buttons
    this._speedBtns = C.speeds.map((spd, i) => {
      const isActive = spd === this._speed;
      const btn = new Button(this.game, {
        x: C.padding + C.btnWidth + C.btnGap + i * (C.btnWidth + C.btnGap),
        y: C.btnY,
        width: C.btnWidth,
        height: C.btnHeight,
        text: `${spd}x`,
        origin: 'top-left',
        colorDefaultBg:     isActive ? 'rgba(30,90,160,0.9)' : 'rgba(0,8,20,0.8)',
        colorDefaultStroke: 'rgba(70,150,220,0.5)',
        colorDefaultText:   isActive ? '#fff' : '#4ab4ff',
        onClick: () => this._setSpeed(spd),
      });
      this.add(btn);
      return btn;
    });

    // Mission clock label
    this._clock = new Text(this.game, 'T+00:00:00:00', {
      x: C.panelWidth / 2,
      y: C.sliderY - 18,
      font: C.clockFont,
      color: C.clockColor,
      align: 'center',
      baseline: 'middle',
    });
    this.add(this._clock);
  }

  _togglePlay() {
    this._playing = !this._playing;
    this._playBtn.text = this._playing ? '⏸ Pause' : '▶ Play';
    if (this._playing) this._cb.onPlay?.();
    else               this._cb.onPause?.();
  }

  _setSpeed(spd) {
    this._speed = spd;
    const C = CTRL_CONFIG;
    this._speedBtns.forEach((btn, i) => {
      const active = C.speeds[i] === spd;
      btn.bg.color    = active ? 'rgba(30,90,160,0.9)' : 'rgba(0,8,20,0.8)';
      btn.label.color = active ? '#fff' : '#4ab4ff';
    });
    this._cb.onSpeedChange?.(spd);
  }

  /** Called by main demo each frame to sync clock and thumb */
  setCurrentTime(t, duration) {
    this._t = t;
    this._duration = duration;
    this._clock.text = formatElapsed(t);
  }

  draw() {
    const C = CTRL_CONFIG;

    // Panel background
    Painter.useCtx((ctx) => {
      ctx.fillStyle = C.bg;
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      ctx.roundRect(0, 0, C.panelWidth, C.panelHeight, 6);
      ctx.fill();
      ctx.stroke();
    }, { saveState: true });

    // Slider track
    const trackX = C.padding;
    const trackW = C.panelWidth - C.padding * 2;
    const trackY = C.sliderY;
    Painter.useCtx((ctx) => {
      ctx.fillStyle = C.trackColor;
      ctx.roundRect(trackX, trackY - C.trackHeight / 2, trackW, C.trackHeight, 2);
      ctx.fill();
    }, { saveState: true });

    // Filled (elapsed) portion
    const progress = this._duration > 0 ? Math.min(1, this._t / this._duration) : 0;
    if (progress > 0) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = '#4ab4ff';
        ctx.roundRect(trackX, trackY - C.trackHeight / 2, trackW * progress, C.trackHeight, 2);
        ctx.fill();
      }, { saveState: true });
    }

    // Thumb
    const thumbX = trackX + trackW * progress;
    Painter.shapes.fillCircle(thumbX, trackY, C.thumbRadius, C.thumbColor);
    Painter.shapes.strokeCircle(thumbX, trackY, C.thumbRadius, 'rgba(200,230,255,0.6)', 1.5);

    super.draw(); // renders Buttons and clock Text
  }

  _attachCanvasListeners() {
    const canvas = this.game.canvas;

    canvas.addEventListener('mousedown', (e) => {
      const pos = this._canvasPos(e);
      if (this._hitSlider(pos.x, pos.y)) {
        this._draggingSlider = true;
        this._cb.onSeek?.(this._sliderValue(pos.x));
      }
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!this._draggingSlider) return;
      const pos = this._canvasPos(e);
      this._cb.onSeek?.(this._sliderValue(pos.x));
    });
    canvas.addEventListener('mouseup',    () => { this._draggingSlider = false; });
    canvas.addEventListener('mouseleave', () => { this._draggingSlider = false; });

    canvas.addEventListener('touchstart', (e) => {
      const pos = this._canvasPos(e.touches[0]);
      if (this._hitSlider(pos.x, pos.y)) {
        e.preventDefault();
        this._draggingSlider = true;
        this._cb.onSeek?.(this._sliderValue(pos.x));
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!this._draggingSlider) return;
      e.preventDefault();
      const pos = this._canvasPos(e.touches[0]);
      this._cb.onSeek?.(this._sliderValue(pos.x));
    }, { passive: false });
    canvas.addEventListener('touchend', () => { this._draggingSlider = false; });
  }

  _canvasPos(e) {
    const rect = this.game.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _hitSlider(cx, cy) {
    const C = CTRL_CONFIG;
    const trackLeft  = this.x + C.padding;
    const trackRight = this.x + C.panelWidth - C.padding;
    const trackY     = this.y + C.sliderY;
    const hitRadius  = 16;
    return cx >= trackLeft && cx <= trackRight &&
           cy >= trackY - hitRadius && cy <= trackY + hitRadius;
  }

  _sliderValue(cx) {
    const C = CTRL_CONFIG;
    const trackLeft = this.x + C.padding;
    const trackW    = C.panelWidth - C.padding * 2;
    const norm = Math.max(0, Math.min(1, (cx - trackLeft) / trackW));
    return norm * this._duration;
  }
}

function formatElapsed(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const ss = s % 60;
  const mm = Math.floor(s / 60) % 60;
  const hh = Math.floor(s / 3600) % 24;
  const dd = Math.floor(s / 86400);
  return `T+${String(dd).padStart(2,'0')}:${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
