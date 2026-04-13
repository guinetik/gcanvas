/**
 * Artemis II Controls Panel
 *
 * Bottom-center panel with button bar (HorizontalLayout), time slider,
 * mission clock, and phase labels.
 *
 * Callbacks: onPlay, onPause, onSeek(day), onSpeedChange(multiplier)
 * External API: setCurrentTime(day), startPlaying()
 */

import {
  Scene,
  Text,
  Button,
  ToggleButton,
  HorizontalLayout,
  Painter,
  Screen,
} from "../../src/index.js";
import { formatElapsed, TLI_DAY, MISSION_DAYS, PHASE_LABELS } from "./artemis2.data.js";

const CTRL = {
  panelHeight:   130,
  padding:       16,
  bg:            'rgba(0,8,20,0.78)',
  border:        'rgba(70,150,220,0.35)',
  cornerRadius:  10,

  // Vertical layout: buttons → clock → slider → phases
  btnBarY:       32,    // center of HorizontalLayout row
  clockY:        62,    // MET text
  sliderY:       80,    // slider track center
  phaseY:        98,    // phase labels

  // Slider
  trackColor:    'rgba(70,150,220,0.3)',
  trackHeight:   4,
  thumbColor:    '#4ab4ff',
  thumbRadius:   7,
  sliderHitRadius: 16,

  // Clock
  clockFont:     '11px monospace',
  clockColor:    'rgba(100,180,220,0.8)',

  // Buttons
  speeds:        [500, 1000, 5000, 10000],
  btnWidth:      54,
  btnHeight:     28,

  // Phase labels
  phaseFont:     '8px monospace',
  phaseColor:    'rgba(255,255,255,0.2)',
  phaseActive:   '#6ec6ff',
};

const BTN_STYLE = {
  colorDefaultBg:     'rgba(0,8,20,0.8)',
  colorDefaultStroke:  'rgba(70,150,220,0.5)',
  colorDefaultText:    '#4ab4ff',
  colorHoverBg:        'rgba(30,90,160,0.9)',
  colorHoverStroke:    '#4ab4ff',
  colorHoverText:      '#fff',
};

export class Artemis2Controls extends Scene {
  constructor(game, callbacks = {}) {
    super(game, { x: 0, y: 0, origin: 'top-left' });

    this._cb = callbacks;
    this._playing = false;
    this._speed = 1000;
    this._day = TLI_DAY;
    this._draggingSlider = false;
    this._panelWidth = Screen.responsive(340, 440, 520);
    this.interactive = true;
    this.forceWidth = this._panelWidth;
    this.forceHeight = CTRL.panelHeight;

    this._buildUI();
    this._attachCanvasListeners();
  }

  get panelWidth() {
    return this._panelWidth;
  }

  _buildUI() {
    this._panelWidth = Screen.responsive(340, 440, 520);

    // ── Button bar via HorizontalLayout ──
    this._btnBar = new HorizontalLayout(this.game, {
      spacing: 5,
      padding: 0,
      align: 'center',
      interactive: true,
    });

    // Play/pause
    this._playBtn = new Button(this.game, {
      width: CTRL.btnWidth,
      height: CTRL.btnHeight,
      text: '\u25B6 Play',
      font: '11px monospace',
      ...BTN_STYLE,
      onClick: () => this._togglePlay(),
    });
    this._btnBar.add(this._playBtn);

    // Speed toggle buttons (exclusive group)
    this._speedBtns = CTRL.speeds.map((spd) => {
      const btn = new ToggleButton(this.game, {
        width: CTRL.btnWidth,
        height: CTRL.btnHeight,
        text: spd >= 1000 ? `${spd / 1000}k` : `${spd}x`,
        font: '10px monospace',
        ...BTN_STYLE,
        startToggled: spd === this._speed,
        colorActiveBg:     'rgba(30,90,160,0.9)',
        colorActiveStroke:  '#4ab4ff',
        colorActiveText:    '#fff',
        onToggle: () => this._setSpeed(spd),
      });
      this._btnBar.add(btn);
      return btn;
    });

    this._btnBar.x = this._panelWidth / 2;
    this._btnBar.y = CTRL.btnBarY;
    this.add(this._btnBar);

    // Mission clock label
    this._clock = new Text(this.game, 'T+00:00:00:00', {
      x: this._panelWidth / 2,
      debug:false,
      y: CTRL.clockY,
      font: CTRL.clockFont,
      color: CTRL.clockColor,
      align: 'center',
      baseline: 'middle',
    });
    this.add(this._clock);
  }

  startPlaying() {
    this._playing = true;
    this._playBtn.text = '\u23F8 Pause';
  }

  _togglePlay() {
    this._playing = !this._playing;
    this._playBtn.text = this._playing ? '\u23F8 Pause' : '\u25B6 Play';
    if (this._playing) this._cb.onPlay?.();
    else               this._cb.onPause?.();
  }

  _setSpeed(spd) {
    this._speed = spd;
    // Exclusive toggle
    this._speedBtns.forEach((btn, i) => {
      btn.toggle(CTRL.speeds[i] === spd);
    });
    this._cb.onSpeedChange?.(spd);
  }

  setCurrentTime(day) {
    this._day = day;
    this._clock.text = formatElapsed(day * 86400);
  }

  reposition(canvasW, canvasH) {
    this._panelWidth = Screen.responsive(340, 440, 520);
    this.x = Math.round((canvasW - this._panelWidth) / 2);
    this.y = canvasH - CTRL.panelHeight - Screen.responsive(10, 14, 16);
    this.forceWidth = this._panelWidth;
    this.forceHeight = CTRL.panelHeight;
    // Re-center layout and clock
    if (this._btnBar) this._btnBar.x = (this._panelWidth / 2) + 10;
    if (this._clock)  this._clock.x = (this._panelWidth / 2) - 30;
  }

  draw() {
    const pw = this._panelWidth;

    // Panel background
    Painter.useCtx((ctx) => {
      ctx.fillStyle = CTRL.bg;
      ctx.strokeStyle = CTRL.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, pw, CTRL.panelHeight, CTRL.cornerRadius);
      ctx.fill();
      ctx.stroke();
    }, { saveState: true });

    // Slider track
    const trackX = CTRL.padding;
    const trackW = pw - CTRL.padding * 2;
    const trackY = CTRL.sliderY;
    Painter.useCtx((ctx) => {
      ctx.fillStyle = CTRL.trackColor;
      ctx.beginPath();
      ctx.roundRect(trackX, trackY - CTRL.trackHeight / 2, trackW, CTRL.trackHeight, 2);
      ctx.fill();
    }, { saveState: true });

    // Progress fill
    const progress = this._dayToProgress(this._day);
    if (progress > 0) {
      Painter.useCtx((ctx) => {
        ctx.fillStyle = '#4ab4ff';
        ctx.beginPath();
        ctx.roundRect(trackX, trackY - CTRL.trackHeight / 2, trackW * progress, CTRL.trackHeight, 2);
        ctx.fill();
      }, { saveState: true });
    }

    // Thumb
    const thumbX = trackX + trackW * progress;
    Painter.useCtx((ctx) => {
      ctx.fillStyle = CTRL.thumbColor;
      ctx.beginPath();
      ctx.arc(thumbX, trackY, CTRL.thumbRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,230,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(thumbX, trackY, CTRL.thumbRadius, 0, Math.PI * 2);
      ctx.stroke();
    }, { saveState: true });

    // Phase labels below slider — skip pre-TLI phases, map days to slider range
    const labelY = CTRL.phaseY;
    const sliderRange = MISSION_DAYS - TLI_DAY;
    Painter.useCtx((ctx) => {
      ctx.font = CTRL.phaseFont;
      ctx.textBaseline = 'top';
      for (const pl of PHASE_LABELS) {
        // Skip phases that end before the slider starts
        if (pl.endDay <= TLI_DAY) continue;
        const active = this._day >= pl.startDay && this._day < pl.endDay;
        ctx.fillStyle = active ? CTRL.phaseActive : CTRL.phaseColor;
        ctx.textAlign = 'center';
        // Clamp start to TLI_DAY so label center is within slider
        const visStart = Math.max(pl.startDay, TLI_DAY);
        const centerDay = (visStart + pl.endDay) / 2;
        const sliderPos = (centerDay - TLI_DAY) / sliderRange;
        ctx.fillText(pl.label, trackX + trackW * sliderPos, labelY);
      }
    }, { saveState: true });

    super.draw();
  }

  // ── Slider hit-testing ──

  _dayToProgress(day) {
    const range = MISSION_DAYS - TLI_DAY;
    return range > 0 ? Math.max(0, Math.min(1, (day - TLI_DAY) / range)) : 0;
  }

  _progressToDay(progress) {
    return TLI_DAY + progress * (MISSION_DAYS - TLI_DAY);
  }

  _attachCanvasListeners() {
    const canvas = this.game.canvas;

    this._onMouseDown = (e) => {
      const pos = this._canvasPos(e);
      if (this._hitSlider(pos.x, pos.y)) {
        this._draggingSlider = true;
        this.game._uiHandledInput = true; // block camera drag
        this._cb.onSeek?.(this._sliderValue(pos.x));
      }
    };
    this._onMouseMove = (e) => {
      if (!this._draggingSlider) return;
      const pos = this._canvasPos(e);
      this._cb.onSeek?.(this._sliderValue(pos.x));
    };
    this._onMouseUp    = () => { this._draggingSlider = false; this.game._uiHandledInput = false; };
    this._onMouseLeave = () => { this._draggingSlider = false; this.game._uiHandledInput = false; };

    this._onTouchStart = (e) => {
      const pos = this._canvasPos(e.touches[0]);
      if (this._hitSlider(pos.x, pos.y)) {
        e.preventDefault();
        this._draggingSlider = true;
        this.game._uiHandledInput = true; // block camera drag
        this._cb.onSeek?.(this._sliderValue(pos.x));
      }
    };
    this._onTouchMove = (e) => {
      if (!this._draggingSlider) return;
      e.preventDefault();
      const pos = this._canvasPos(e.touches[0]);
      this._cb.onSeek?.(this._sliderValue(pos.x));
    };
    this._onTouchEnd = () => { this._draggingSlider = false; this.game._uiHandledInput = false; };

    canvas.addEventListener('mousedown',  this._onMouseDown);
    canvas.addEventListener('mousemove',  this._onMouseMove);
    canvas.addEventListener('mouseup',    this._onMouseUp);
    canvas.addEventListener('mouseleave', this._onMouseLeave);
    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  this._onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   this._onTouchEnd);
  }

  destroy() {
    const canvas = this.game.canvas;
    canvas.removeEventListener('mousedown',  this._onMouseDown);
    canvas.removeEventListener('mousemove',  this._onMouseMove);
    canvas.removeEventListener('mouseup',    this._onMouseUp);
    canvas.removeEventListener('mouseleave', this._onMouseLeave);
    canvas.removeEventListener('touchstart', this._onTouchStart);
    canvas.removeEventListener('touchmove',  this._onTouchMove);
    canvas.removeEventListener('touchend',   this._onTouchEnd);
  }

  _canvasPos(e) {
    const rect = this.game.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _hitSlider(cx, cy) {
    const trackLeft  = this.x + CTRL.padding;
    const trackRight = this.x + this._panelWidth - CTRL.padding;
    const trackY     = this.y + CTRL.sliderY;
    return cx >= trackLeft && cx <= trackRight &&
           cy >= trackY - CTRL.sliderHitRadius && cy <= trackY + CTRL.sliderHitRadius;
  }

  _sliderValue(cx) {
    const trackLeft = this.x + CTRL.padding;
    const trackW    = this._panelWidth - CTRL.padding * 2;
    if (trackW <= 0) return TLI_DAY;
    const norm = Math.max(0, Math.min(1, (cx - trackLeft) / trackW));
    return this._progressToDay(norm);
  }
}
