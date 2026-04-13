/**
 * Artemis II Tweet Feed
 *
 * TweetTimeline — loads all_tweets.json, maps timestamps to mission days,
 *   provides current-tweet lookup by simulation day.
 *
 * TweetFeed — GameObject overlay (center-left) that displays the active
 *   tweet with fade-in / fade-out transitions synced to mission time.
 */

import { Scene, Painter, Screen } from "../../../src/index.js";

// Swap this to your R2 URL when ready
const MEDIA_BASE = "./artemis/media/";

// Launch: Apr 1 2026 22:35 UTC (same reference as artemis2.data.js)
const LAUNCH_MS = Date.UTC(2026, 3, 1, 22, 35, 0); // months are 0-indexed

const MS_PER_DAY = 86_400_000;

const FEED = {
  // Deferred — Screen.responsive needs Screen.init() first
  // Match telemetry grid width: 2 * cardW + gap
  width:        () => Screen.responsive(276, 308, 340),
  marginLeft:   () => Screen.responsive(10, 18, 24),
  padding:      () => Screen.responsive(10, 12, 14),
  cornerRadius: 8,
  bg:           'rgba(10,12,20,0.72)',
  border:       'rgba(70,150,220,0.2)',

  // Typography (Datatype font, matching HUD)
  font:         'Datatype, ui-monospace, monospace',
  userFont:     () => `700 ${Screen.responsive(9, 10, 11)}px Datatype, ui-monospace, monospace`,
  timeFont:     () => `500 ${Screen.responsive(8, 9, 9)}px Datatype, ui-monospace, monospace`,
  bodyFont:     () => `400 ${Screen.responsive(10, 11, 12)}px Datatype, ui-monospace, monospace`,
  userColor:    '#6ec6ff',
  timeColor:    'rgba(255,255,255,0.35)',
  bodyColor:    'rgba(255,255,255,0.85)',
  lineHeight:   () => Screen.responsive(14, 16, 18),

  // Transition
  fadeDuration: 0.6,  // seconds (wall-clock, not sim time)
};

// ── TweetTimeline (data model) ──────────────────────────────────

export class TweetTimeline {
  constructor() {
    /** @type {Array<{missionDay:number, text:string, user:string, name:string, time:string, media:Array}>} */
    this.tweets = [];
    this._ready = false;
  }

  get ready() { return this._ready; }

  /**
   * Load and parse the tweet JSON.
   * @param {string} url — path to all_tweets.json
   * @returns {Promise<void>}
   */
  async load(url = "./artemis/all_tweets.json") {
    const res = await fetch(url);
    const raw = await res.json();

    this.tweets = raw
      .map((t) => {
        const ms = new Date(t.createdAt).getTime();
        const missionDay = (ms - LAUNCH_MS) / MS_PER_DAY;
        return {
          missionDay,
          text:  t.fullText,
          user:  `@${t.user.username}`,
          name:  t.user.name,
          time:  t.createdAt,
          media: (t.media || []).map((m) => ({
            type: m.type,
            url:  m.url,
            localFile: this._mediaFilename(t.id, m),
          })),
        };
      })
      .filter((t) => t.missionDay >= 0 && t.missionDay <= 11) // mission window only
      .sort((a, b) => a.missionDay - b.missionDay);

    this._ready = true;
  }

  /**
   * Find the tweet that should be showing at the given simulation day.
   * Returns the latest tweet whose missionDay <= simDay.
   * @param {number} simDay
   * @returns {{tweet: object|null, index: number, nextDay: number|null}}
   */
  getAtDay(simDay) {
    if (!this._ready || this.tweets.length === 0) {
      return { tweet: null, index: -1, nextDay: null };
    }

    // Binary search for the last tweet at or before simDay
    let lo = 0, hi = this.tweets.length - 1, best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (this.tweets[mid].missionDay <= simDay) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best < 0) return { tweet: null, index: -1, nextDay: this.tweets[0].missionDay };

    const nextDay = best + 1 < this.tweets.length
      ? this.tweets[best + 1].missionDay
      : null;

    return { tweet: this.tweets[best], index: best, nextDay };
  }

  /** Derive local media filename from tweet id + media entry */
  _mediaFilename(tweetId, media) {
    // Media files are named: {tweetId}_{mediaKey}.{ext}
    // Extract mediaKey from the URL (last path segment before extension)
    try {
      const urlPath = new URL(media.url).pathname;
      const base = urlPath.split("/").pop().split(".")[0]; // e.g. "HEga7kiWcAAzE34"
      const ext = media.type === "GIF" ? "gif"
                : media.type === "VIDEO" ? "mp4"
                : "jpg";
      return `${tweetId}_${base}.${ext}`;
    } catch {
      return null;
    }
  }
}

// ── TweetFeed (GameObject) ──────────────────────────────────────
//
// FIFO stack of up to MAX_VISIBLE tweet cards. New tweets push onto
// the bottom; when full, the oldest (top) card fades out and the
// rest slide up to make room.

const MAX_VISIBLE = 3;

export class TweetFeed extends Scene {
  /**
   * @param {import('../../../src/index.js').Game} game
   * @param {TweetTimeline} timeline
   */
  constructor(game, timeline) {
    super(game, { x: 0, y: 0, origin: 'top-left' });
    this._timeline = timeline;
    this._lastIndex = -1;

    /**
     * Each slot: { tweet, lines, opacity, fadeDir, targetY, currentY }
     * @type {Array<object>}
     */
    this._slots = [];
  }

  /** Call each frame from game.update(dt) */
  sync(simDay) {
    if (!this._timeline.ready) return;

    const { tweet, index } = this._timeline.getAtDay(simDay);
    if (!tweet || index === this._lastIndex) return;

    // New tweet arrived — push it into the stack
    this._lastIndex = index;

    const lines = this._wrapText(tweet.text, FEED.width() - FEED.padding() * 2);
    const slot = {
      tweet,
      lines,
      opacity: 0,
      fadeDir: 1,    // fading in
      targetY: 0,    // computed in _layoutSlots
      currentY: 0,
    };

    if (this._slots.length >= MAX_VISIBLE) {
      // Mark the oldest for fade-out; it will be removed when opacity hits 0
      this._slots[0].fadeDir = -1;
      this._slots[0].removing = true;
    }

    this._slots.push(slot);
    this._layoutSlots();
  }

  update(dt) {
    super.update(dt);

    const fadeStep = dt / FEED.fadeDuration;
    const slideLerp = 0.15; // smooth slide speed

    for (const slot of this._slots) {
      // Fade
      if (slot.fadeDir !== 0) {
        slot.opacity += slot.fadeDir * fadeStep;
        if (slot.opacity >= 1) { slot.opacity = 1; slot.fadeDir = 0; }
        if (slot.opacity <= 0) { slot.opacity = 0; slot.fadeDir = 0; }
      }

      // Slide toward target Y
      slot.currentY += (slot.targetY - slot.currentY) * slideLerp;
    }

    // Remove fully faded-out slots
    const before = this._slots.length;
    this._slots = this._slots.filter((s) => !(s.opacity <= 0 && s.removing));
    if (this._slots.length !== before) {
      this._layoutSlots();
    }
  }

  draw() {
    if (this._slots.length === 0) return;

    const w = FEED.width();
    const pad = FEED.padding();
    const lh = FEED.lineHeight();
    const clipH = this._clipH || 9999;

    // Clip so cards don't bleed into the telemetry area
    Painter.save();
    Painter.effects.clipRect(0, 0, w + pad, clipH);

    for (const slot of this._slots) {
      if (slot.opacity <= 0) continue;

      const t = slot.tweet;
      const headerH = lh * 1.6;
      const bodyH = slot.lines.length * lh;
      const h = pad + headerH + bodyH + pad;
      const sy = Math.round(slot.currentY);

      Painter.useCtx((ctx) => {
        ctx.globalAlpha = slot.opacity;

        // Background
        ctx.fillStyle = FEED.bg;
        ctx.strokeStyle = FEED.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(0, sy, w, h, FEED.cornerRadius);
        ctx.fill();
        ctx.stroke();

        // User + name
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = FEED.userFont();
        ctx.fillStyle = FEED.userColor;
        ctx.fillText(`${t.name}  ${t.user}`, pad, sy + pad);

        // Timestamp
        ctx.font = FEED.timeFont();
        ctx.fillStyle = FEED.timeColor;
        ctx.fillText(this._formatTime(t.time), pad, sy + pad + lh * 0.85);

        // Body text
        ctx.font = FEED.bodyFont();
        ctx.fillStyle = FEED.bodyColor;
        let y = sy + pad + headerH;
        for (const line of slot.lines) {
          ctx.fillText(line, pad, y);
          y += lh;
        }
      }, { saveState: true });
    }

    Painter.restore();

    super.draw();
  }

  /** Position the feed on screen — just below the HUD title block */
  reposition(canvasW, canvasH) {
    this.x = FEED.marginLeft();
    // HUD header height: startY(24) + agency(16) + title(34) + phase(20) + MET(20) + gap(10)
    const m = Screen.responsive(0.75, 0.9, 1);
    const hudTop = Screen.responsive(14, 20, 24);
    const hudH = (16 + 34 + 20 + 20) * m;
    this.y = Math.round(hudTop + hudH + 10 * m);

    // Clip height: stop above the telemetry cards (2×2 grid + margin)
    const cardH = Screen.responsive(68, 76, 84);
    const cardGap = Screen.responsive(6, 8, 10);
    const cardMargin = Screen.responsive(10, 18, 24);
    const cardsTop = canvasH - (2 * cardH + cardGap) - cardMargin;
    this._clipH = Math.max(0, cardsTop - this.y - cardGap);

    this._layoutSlots();
  }

  // ── Internal ──

  /** Recompute target Y positions for all slots (stack top-to-bottom) */
  _layoutSlots() {
    const pad = FEED.padding();
    const lh = FEED.lineHeight();
    const gap = () => Screen.responsive(6, 8, 10);

    let y = 0;
    for (const slot of this._slots) {
      slot.targetY = y;
      // If this is a brand-new slot, snap currentY close to target (slight offset for slide-in feel)
      if (slot.opacity === 0 && slot.fadeDir === 1) {
        slot.currentY = y + 12;
      }
      const headerH = lh * 1.6;
      const bodyH = slot.lines.length * lh;
      const h = pad + headerH + bodyH + pad;
      y += h + gap();
    }
  }

  _wrapText(text, maxWidth) {
    let clean = text.replace(/^(@\S+\s*)+/, '').trim();
    if (!clean) clean = text.trim();

    const ctx = this.game.ctx;
    ctx.font = FEED.bodyFont();

    const words = clean.split(/\s+/);
    const lines = [];
    let current = '';

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    if (lines.length > 6) {
      lines.length = 6;
      lines[5] = lines[5].slice(0, -3) + '...';
    }

    return lines;
  }

  _formatTime(isoString) {
    const d = new Date(isoString);
    const month = d.toLocaleString('en', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${month} ${day}, ${hh}:${mm} UTC`;
  }
}
