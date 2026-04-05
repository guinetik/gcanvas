/**
 * Artemis II Mission — State-machine trajectory system
 *
 * Trajectory primitives (circular, spiral, arc, transfer) are composed
 * into sequential states. Each state has a duration and a curve(t) sampler.
 * The Mission class sequences through them, recording the path.
 *
 * The figure-8 forms from two opposing bezier transfers around the Moon's
 * far side: outbound bows to one side, return bows to the other.
 */

import { Painter } from "/gcanvas.es.min.js";

// ── Trajectory primitives ──────────────────────────────────────────

export const Trajectories = {
  /** Circular orbit. speed = total radians traversed over t∈[0,1]. */
  circular: ({ center, radius, speed, phase = 0, zStart = 0, zEnd = 0 }) => t => ({
    x: center.x + Math.cos(phase + t * speed) * radius,
    y: center.y + Math.sin(phase + t * speed) * radius,
    z: zStart + (zEnd - zStart) * t,
  }),

  /** Expanding spiral orbit. turns = number of full revolutions. */
  spiral: ({ center, startR, endR, turns, phase = 0, zStart = 0, zEnd = 0 }) => t => {
    const angle = phase + t * turns * 2 * Math.PI;
    const r = startR + (endR - startR) * t;
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
      z: zStart + (zEnd - zStart) * t,
    };
  },

  /** Partial arc. sweep = signed radians (positive=CCW, negative=CW). */
  arc: ({ center, radius, startAngle, sweep, zStart = 0, zEnd = 0 }) => t => ({
    x: center.x + Math.cos(startAngle + t * sweep) * radius,
    y: center.y + Math.sin(startAngle + t * sweep) * radius,
    z: zStart + (zEnd - zStart) * t,
  }),

  /**
   * Quadratic bezier transfer.
   * height > 0 bows CCW from the from→to line, < 0 bows CW.
   * zPeak = parabolic z-offset peaking at t=0.5.
   */
  transfer: ({ from, to, height = 0.3, zPeak = 0 }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular (CCW 90°)
    const px = -dy / dist;
    const py =  dx / dist;
    // Control point
    const cx = (from.x + to.x) / 2 + px * height * dist;
    const cy = (from.y + to.y) / 2 + py * height * dist;
    const fz = from.z || 0;
    const tz = to.z || 0;

    return t => {
      const u = 1 - t;
      return {
        x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
        y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
        z: fz * u + tz * t + zPeak * 4 * t * u,
      };
    };
  },
};

// ── TrajectoryState ──────────────────────────────────────────

class TrajectoryState {
  constructor({ name, duration, curve, onEnter, onExit }) {
    this.name     = name;
    this.duration = duration;
    this.curve    = curve;
    this.onEnter  = onEnter  || (() => {});
    this.onExit   = onExit   || (() => {});
  }
  sample(t) { return this.curve(t); }
}

// ── Mission ──────────────────────────────────────────────────

const RENDER = {
  pathColor:  'rgba(200,40,40,0.85)',
  pathWidth:  2.5,
  ghostColor: 'rgba(200,40,40,0.12)',
  ghostWidth: 1,
  ghostStep:  4,
  trailStep:  2,
  ghostSamples: 2000,
};

class Mission {
  constructor(states) {
    this.states = states;
    this._totalDuration = states.reduce((s, st) => s + st.duration, 0);
    this._elapsed    = 0;
    this._stateIndex = 0;
    this._stateTime  = 0;
    this._complete   = false;

    // Pre-sample the full trajectory for ghost + trail rendering
    this._ghost = this._buildGhost(RENDER.ghostSamples);

    // Kick off first state
    this.states[0].onEnter();
  }

  get elapsed()  { return this._elapsed; }
  get complete() { return this._complete; }
  get maxT()     { return this._totalDuration; }

  get currentStateName() {
    return this._stateIndex < this.states.length
      ? this.states[this._stateIndex].name
      : 'Complete';
  }

  update(dt, timeScale) {
    if (this._complete) return null;

    const simDt = dt * timeScale;
    this._elapsed  += simDt;
    this._stateTime += simDt;

    // Advance through states
    while (this._stateIndex < this.states.length &&
           this._stateTime >= this.states[this._stateIndex].duration) {
      this._stateTime -= this.states[this._stateIndex].duration;
      this.states[this._stateIndex].onExit();
      this._stateIndex++;
      if (this._stateIndex >= this.states.length) {
        this._complete = true;
        return null;
      }
      this.states[this._stateIndex].onEnter();
    }

    const t = this._stateTime / this.states[this._stateIndex].duration;
    return this.states[this._stateIndex].sample(Math.min(t, 1));
  }

  // ── Ghost path (pre-sampled for rendering) ──

  _buildGhost(samples) {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const absT = (i / samples) * this._totalDuration;
      let acc = 0;
      for (let j = 0; j < this.states.length; j++) {
        const st = this.states[j];
        if (absT < acc + st.duration || j === this.states.length - 1) {
          const localT = Math.min((absT - acc) / st.duration, 1);
          pts.push(st.sample(localT));
          break;
        }
        acc += st.duration;
      }
    }
    return pts;
  }

  // ── Drawing ──

  draw(projectFn) {
    const progress = Math.min(this._elapsed / this._totalDuration, 1);
    const trailEnd = Math.floor(progress * (this._ghost.length - 1));

    // Ghost: full path (faint)
    this._drawPolyline(this._ghost, this._ghost.length - 1, projectFn,
      RENDER.ghostColor, RENDER.ghostWidth, RENDER.ghostStep);

    // Trail: solid red up to current progress
    if (trailEnd > 0) {
      this._drawPolyline(this._ghost, trailEnd, projectFn,
        RENDER.pathColor, RENDER.pathWidth, RENDER.trailStep);
    }
  }

  _drawPolyline(pts, upTo, projectFn, color, width, step) {
    if (upTo < 1) return;
    Painter.useCtx((ctx) => {
      ctx.strokeStyle = color;
      ctx.lineWidth   = width;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      let first = true;
      for (let i = 0; i <= upTo; i += step) {
        const pt = pts[i];
        const p = projectFn(pt.x, pt.y, pt.z || 0);
        if (first) { ctx.moveTo(p.x, p.y); first = false; }
        else         ctx.lineTo(p.x, p.y);
      }
      // Always draw to exact tip
      if (upTo % step !== 0) {
        const pt = pts[upTo];
        const p = projectFn(pt.x, pt.y, pt.z || 0);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }, { saveState: true });
  }
}

// ── Factory ──────────────────────────────────────────────────

/**
 * Build the Artemis II mission from the Moon's current orbital state.
 *
 * @param {number} launchAngle     Moon angle at launch (radians)
 * @param {number} moonPeriod      Moon orbital period (seconds)
 * @param {number} R               Moon orbital radius (km)
 */
export function createArtemisMission(launchAngle, moonPeriod, R) {
  const DAY = 86400;
  const PI  = Math.PI;
  const EARTH = { x: 0, y: 0, z: 0 };

  // ── Moon position at flyby (day 4) ──
  const FLYBY_DAY = 4;
  const θf = launchAngle + (2 * PI * FLYBY_DAY * DAY) / moonPeriod;
  const MOON = { x: R * Math.cos(θf), y: R * Math.sin(θf), z: 0 };

  // Directions
  const toMoon   = θf;          // Earth → Moon
  const fromMoon = θf + PI;     // Moon → Earth

  // ── Sizing (exaggerated for game visibility) ──
  const LEO_R    = R * 0.04;    // starting orbit radius
  const HIGH_R   = R * 0.13;    // departure orbit radius
  const FLYBY_R  = R * 0.07;    // flyby arc radius around Moon
  const Z_AMP    = R * 0.025;   // 3D depth amplitude
  const BOW      = 0.25;        // transfer curve lateral bow

  // ── Flyby geometry ──
  // Entry/exit 45° above/below the Moon→Earth direction.
  // Arc sweeps CCW the long way around the far side.
  const ARC_OFF    = PI / 4;
  const entryAngle = fromMoon + ARC_OFF;
  const exitAngle  = fromMoon - ARC_OFF;   // = entryAngle + sweep (mod 2π)
  const flybySweep = 2 * PI - 2 * ARC_OFF; // +270° CCW through far side

  const flybyEntry = {
    x: MOON.x + FLYBY_R * Math.cos(entryAngle),
    y: MOON.y + FLYBY_R * Math.sin(entryAngle),
    z: Z_AMP * 0.3,
  };
  const flybyExit = {
    x: MOON.x + FLYBY_R * Math.cos(exitAngle),
    y: MOON.y + FLYBY_R * Math.sin(exitAngle),
    z: -Z_AMP * 0.3,
  };

  // ── Spiral → TLI departure point ──
  // 3 turns, ending at the toMoon angle at HIGH_R
  const TURNS = 3;
  const spiralEnd = {
    x: HIGH_R * Math.cos(toMoon),
    y: HIGH_R * Math.sin(toMoon),
    z: 0,
  };

  // ── Build states ──
  return new Mission([
    // 1. Earth orbits — spiral outward from LEO to high orbit
    new TrajectoryState({
      name: 'Earth Orbits',
      duration: 1.5 * DAY,
      curve: Trajectories.spiral({
        center: EARTH,
        startR: LEO_R,
        endR:   HIGH_R,
        turns:  TURNS,
        phase:  toMoon,     // ends at toMoon after N full turns
      }),
    }),

    // 2. Trans-Lunar Injection — outbound transfer (bows +perp = above the line)
    new TrajectoryState({
      name: 'Trans-Lunar Injection',
      duration: 3.0 * DAY,
      curve: Trajectories.transfer({
        from:   spiralEnd,
        to:     flybyEntry,
        height: BOW,
        zPeak:  Z_AMP,
      }),
    }),

    // 3. Lunar Flyby — wide arc around the Moon's far side (CCW)
    new TrajectoryState({
      name: 'Lunar Flyby',
      duration: 1.5 * DAY,
      curve: Trajectories.arc({
        center:     MOON,
        radius:     FLYBY_R,
        startAngle: entryAngle,
        sweep:      flybySweep,
        zStart:     Z_AMP * 0.3,
        zEnd:       -Z_AMP * 0.3,
      }),
    }),

    // 4. Trans-Earth Return — return transfer (bows -perp = below the line → figure-8)
    new TrajectoryState({
      name: 'Trans-Earth Return',
      duration: 3.0 * DAY,
      curve: Trajectories.transfer({
        from:   flybyExit,
        to:     EARTH,
        height: -BOW,
        zPeak:  -Z_AMP,
      }),
    }),

    // 5. Reentry — tightening orbit back at Earth
    new TrajectoryState({
      name: 'Reentry',
      duration: 1.0 * DAY,
      curve: Trajectories.spiral({
        center: EARTH,
        startR: HIGH_R * 0.8,
        endR:   LEO_R,
        turns:  2,
        phase:  toMoon + PI, // enters from Moon direction
      }),
    }),
  ]);
}
