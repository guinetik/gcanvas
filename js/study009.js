/**
 * Study 009 - Monad Melody
 *
 * Glowing orbs ("monads") drift in from the edges, orbiting along
 * Lissajous paths and weaving a luminous network. As they cluster,
 * Louvain community detection recolors them — each shift punctuated
 * by a stereo chime. Close encounters trigger pentatonic blips;
 * clicks scatter the swarm with a windy burst. The canvas hums.
 *
 * Features:
 * - Staggered spawn from offscreen edges
 * - Lissajous orbital dynamics with anchor drift
 * - Distance-based network graph with hue-blended connections
 * - Louvain community detection with flash + chime on reassignment
 * - Stereo-panned procedural audio (touch blips, community chimes, woosh)
 * - Click repulsion with wind-noise burst
 * - Motion trails, additive glow halos
 * - Fully responsive (Screen.responsive)
 * - Press R to reset
 */

import { gcanvas } from "/gcanvas.es.min.js";
import { Screen } from "/gcanvas.es.min.js";
import { Synth } from "/gcanvas.es.min.js";
import { SynthNoise } from "/gcanvas.es.min.js";

// Configuration
const CONFIG = {
  monadCount: Screen.responsive(40, 70, 120),
  baseRadius: Screen.responsive(4, 5, 5),
  orbitRadiusRange: Screen.responsive([50, 150], [65, 200], [80, 250]),
  freqRange: [0.2, 0.8],
  anchorDriftSpeed: 0.02,

  connectionDistance: Screen.responsive(120, 150, 180),
  connectionAlpha: 0.35,

  trailAlpha: 0.08,
  glowRadius: Screen.responsive(14, 17, 20),
  pulseSpeed: 2.5,

  // Louvain community detection
  louvain: {
    interval: 0.5,    // seconds between re-detection
    maxPasses: 10,
    colorLerp: 0.04,  // per-frame color transition speed
  },

  // Community palette
  communityColors: [
    { h: 270, s: 80, l: 60 },  // violet
    { h: 300, s: 70, l: 55 },  // magenta
    { h: 240, s: 75, l: 60 },  // blue-violet
    { h: 320, s: 65, l: 55 },  // pink
    { h: 200, s: 70, l: 55 },  // cyan-blue
    { h: 280, s: 85, l: 65 },  // bright purple
    { h: 340, s: 60, l: 55 },  // rose
    { h: 220, s: 70, l: 55 },  // deep blue
    { h: 160, s: 65, l: 50 },  // teal
    { h: 30,  s: 80, l: 55 },  // orange
    { h: 60,  s: 70, l: 50 },  // gold
    { h: 0,   s: 75, l: 55 },  // red
    { h: 180, s: 60, l: 50 },  // cyan
    { h: 130, s: 65, l: 50 },  // emerald
    { h: 350, s: 80, l: 65 },  // hot pink
    { h: 45,  s: 85, l: 55 },  // amber
  ],

  colors: {
    primary: "#836EF9",
    secondary: "#B08EFF",
    tertiary: "#5B3FD6",
    glow: "rgba(131,110,249,0.3)",
    bg: "#0A0612",
    bgRgb: [10, 6, 18],
    connection: [131, 110, 249],
  },

  gravityWell: {
    strength: -80000,
    duration: 1.2,
    ringSpeed: 200,
    ringMaxRadius: 300,
  },

  // Sound
  sound: {
    touchDistance: 25,         // monads "touching" threshold
    touchCooldown: 0.08,      // min seconds between touch blips
    touchBaseFreq: 600,       // base frequency for touch blip
    touchVolume: 0.06,
    communityFreq: 440,       // base freq for community chime
    communityVolume: 0.08,
  },

  // Community flash
  flash: {
    duration: 0.6,            // seconds
    radiusMultiplier: 4,      // glow expands to this * glowRadius
  },

  // Spawn
  spawn: {
    interval: 0.35,           // seconds between each new monad
    entrySpeed: 4,            // how fast they drift inward from the edge
  },
};

// ─── Louvain community detection ────────────────────────────

function detectCommunities(monads) {
  const n = monads.length;
  const maxDistSq = CONFIG.connectionDistance * CONFIG.connectionDistance;

  // Build adjacency lists
  const adj = new Array(n);
  for (let i = 0; i < n; i++) adj[i] = [];

  let totalEdges = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = monads[i].x - monads[j].x;
      const dy = monads[i].y - monads[j].y;
      if (dx * dx + dy * dy < maxDistSq) {
        adj[i].push(j);
        adj[j].push(i);
        totalEdges++;
      }
    }
  }

  if (totalEdges === 0) return null;
  const m2 = totalEdges * 2; // 2m

  // Each node starts in its own community
  const comm = new Array(n);
  for (let i = 0; i < n; i++) comm[i] = i;

  // Degree of each node
  const deg = new Array(n);
  for (let i = 0; i < n; i++) deg[i] = adj[i].length;

  // Iterate
  let changed = true;
  let passes = 0;
  while (changed && passes < CONFIG.louvain.maxPasses) {
    changed = false;
    passes++;

    for (let i = 0; i < n; i++) {
      const ki = deg[i];
      const ci = comm[i];

      // Count edges from i into each neighboring community
      const edgesTo = {};
      for (const j of adj[i]) {
        const cj = comm[j];
        edgesTo[cj] = (edgesTo[cj] || 0) + 1;
      }

      // Compute sum of degrees for each candidate community
      // (including current, excluding node i)
      let bestComm = ci;
      let bestDeltaQ = 0;

      const sigmaCurrentExcl = communityDegreeExcluding(comm, deg, ci, i, n);
      const ki_in_current = edgesTo[ci] || 0;

      for (const cj in edgesTo) {
        const c = parseInt(cj);
        if (c === ci) continue;

        const ki_in = edgesTo[c];
        const sigmaTot = communityDegree(comm, deg, c, n);

        // Modularity gain: moving i from ci to c
        const gain = (ki_in - sigmaTot * ki / m2)
                   - (ki_in_current - sigmaCurrentExcl * ki / m2);

        if (gain > bestDeltaQ) {
          bestDeltaQ = gain;
          bestComm = c;
        }
      }

      if (bestComm !== ci) {
        comm[i] = bestComm;
        changed = true;
      }
    }
  }

  return comm;
}

function communityDegree(comm, deg, c, n) {
  let s = 0;
  for (let k = 0; k < n; k++) {
    if (comm[k] === c) s += deg[k];
  }
  return s;
}

function communityDegreeExcluding(comm, deg, c, exclude, n) {
  let s = 0;
  for (let k = 0; k < n; k++) {
    if (k !== exclude && comm[k] === c) s += deg[k];
  }
  return s;
}

// ─── Monad class ────────────────────────────────────────────

class Monad {
  constructor(canvasW, canvasH, fromEdge = false) {
    this.reset(canvasW, canvasH, fromEdge);
  }

  reset(canvasW, canvasH, fromEdge = false) {
    const pad = 60;
    // Final destination anchor somewhere inside the canvas
    const destX = pad + Math.random() * (canvasW - pad * 2);
    const destY = pad + Math.random() * (canvasH - pad * 2);

    if (fromEdge) {
      // Start offscreen from a random edge
      const edge = Math.floor(Math.random() * 4);
      const offset = 80;
      if (edge === 0)      { this.anchorX = -offset;          this.anchorY = Math.random() * canvasH; }
      else if (edge === 1) { this.anchorX = canvasW + offset;  this.anchorY = Math.random() * canvasH; }
      else if (edge === 2) { this.anchorX = Math.random() * canvasW; this.anchorY = -offset; }
      else                 { this.anchorX = Math.random() * canvasW; this.anchorY = canvasH + offset; }
      this.destX = destX;
      this.destY = destY;
      this.entering = true;
    } else {
      this.anchorX = destX;
      this.anchorY = destY;
      this.entering = false;
    }

    const [minR, maxR] = CONFIG.orbitRadiusRange;
    this.orbitA = minR + Math.random() * (maxR - minR);
    this.orbitB = minR + Math.random() * (maxR - minR);

    const [minF, maxF] = CONFIG.freqRange;
    this.freqA = minF + Math.random() * (maxF - minF);
    this.freqB = minF + Math.random() * (maxF - minF);

    this.phase = Math.random() * Math.PI * 2;

    this.driftPeriodX = 3 + Math.random() * 5;
    this.driftPeriodY = 4 + Math.random() * 6;
    this.driftOffsetX = Math.random() * Math.PI * 2;
    this.driftOffsetY = Math.random() * Math.PI * 2;

    // Color — starts with random purple, will be driven by Louvain
    this.hue = 260 + Math.random() * 40;
    this.sat = 70;
    this.lit = 60;
    this.targetHue = this.hue;
    this.targetSat = this.sat;
    this.targetLit = this.lit;

    this.x = this.anchorX;
    this.y = this.anchorY;
    this.radius = CONFIG.baseRadius;

    this.communityId = -1;    // current Louvain community
    this.flashTime = -1;      // time when community changed (-1 = no flash)
  }

  update(dt, gravityWells, canvasW, canvasH, time) {
    this.phase += dt;

    // Drift toward destination if entering from offscreen
    if (this.entering) {
      const dx = this.destX - this.anchorX;
      const dy = this.destY - this.anchorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2) {
        this.anchorX = this.destX;
        this.anchorY = this.destY;
        this.entering = false;
      } else {
        const speed = CONFIG.spawn.entrySpeed;
        this.anchorX += (dx / dist) * speed * dt * 60;
        this.anchorY += (dy / dist) * speed * dt * 60;
      }
    }

    const driftAmount = 30;
    const driftX = Math.sin(time / this.driftPeriodX + this.driftOffsetX) * driftAmount * CONFIG.anchorDriftSpeed;
    const driftY = Math.cos(time / this.driftPeriodY + this.driftOffsetY) * driftAmount * CONFIG.anchorDriftSpeed;
    this.anchorX += driftX;
    this.anchorY += driftY;

    this.x = this.anchorX + this.orbitA * Math.sin(this.freqA * this.phase);
    this.y = this.anchorY + this.orbitB * Math.cos(this.freqB * this.phase);

    for (const well of gravityWells) {
      const dx = well.x - this.x;
      const dy = well.y - this.y;
      const distSq = dx * dx + dy * dy;
      const minDistSq = 2500;
      const effectiveDistSq = Math.max(distSq, minDistSq);
      const force = CONFIG.gravityWell.strength / effectiveDistSq;
      const dist = Math.sqrt(effectiveDistSq);
      const wellLife = 1 - well.age / CONFIG.gravityWell.duration;
      // Push the anchor so the effect persists across frames
      this.anchorX += (dx / dist) * force * wellLife * dt * 60;
      this.anchorY += (dy / dist) * force * wellLife * dt * 60;
    }

    this.radius = CONFIG.baseRadius + Math.sin(this.phase * CONFIG.pulseSpeed) * 2;

    const margin = 100;
    if (this.anchorX < -margin) this.anchorX = canvasW + margin;
    else if (this.anchorX > canvasW + margin) this.anchorX = -margin;
    if (this.anchorY < -margin) this.anchorY = canvasH + margin;
    else if (this.anchorY > canvasH + margin) this.anchorY = -margin;

    // Smooth color lerp toward community target
    const lerp = CONFIG.louvain.colorLerp;
    this.hue += shortestAngleDelta(this.hue, this.targetHue) * lerp;
    this.sat += (this.targetSat - this.sat) * lerp;
    this.lit += (this.targetLit - this.lit) * lerp;
  }
}

/** Shortest rotation delta for hue lerp (handles 350→10 wrapping) */
function shortestAngleDelta(from, to) {
  let d = ((to - from) % 360 + 540) % 360 - 180;
  return d;
}

// ─── Initialize ─────────────────────────────────────────────

window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: "#000000", fluid: true });
  const scene = game.scene("main");
  const gameInstance = game.game;

  let resizeTimeout = null;
  let needsRebuild = false;

  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const ctx = gameInstance.ctx;
      ctx.fillStyle = CONFIG.colors.bg;
      ctx.fillRect(0, 0, gameInstance.width, gameInstance.height);
      needsRebuild = true;
    }, 100);
  };

  window.addEventListener("resize", handleResize);

  // State
  let monads = [];
  let gravityWells = [];
  let time = 0;
  let louvainTimer = 0;
  let soundEnabled = false;
  let lastTouchSoundTime = 0;

  // Initialize audio on first click
  const initAudio = () => {
    if (!Synth.isInitialized) {
      Synth.init({ masterVolume: 0.3 });
    }
    Synth.resume();
    soundEnabled = true;
    gameInstance.canvas.removeEventListener("click", initAudio);
  };
  gameInstance.canvas.addEventListener("click", initAudio);

  /** Map an x position to stereo pan (-1 left, +1 right) */
  function panFor(x) {
    const w = gameInstance.width;
    if (w <= 0) return 0;
    return Math.max(-1, Math.min(1, (x / w) * 2 - 1));
  }

  /** Create a StereoPannerNode routed to master */
  function makePanner(pan) {
    const ctx = Synth.ctx;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(Synth.master);
    return panner;
  }

  function playTouchBlip(hue, x) {
    if (!soundEnabled) return;
    const ctx = Synth.ctx;
    const now = ctx.currentTime;
    const scale = [1, 1.125, 1.25, 1.5, 1.667];
    const normalizedHue = ((hue % 360) + 360) % 360;
    const idx = Math.floor((normalizedHue / 360) * scale.length);
    const freq = CONFIG.sound.touchBaseFreq * scale[idx];

    const panner = makePanner(panFor(x));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(CONFIG.sound.touchVolume, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.08);
    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  function playWoosh(x) {
    if (!soundEnabled) return;
    const ctx = Synth.ctx;
    const now = ctx.currentTime;
    const duration = 0.5;

    const panner = makePanner(panFor(x));
    const noise = SynthNoise.pink(ctx, duration);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.06);
    gain.gain.setValueAtTime(0.4, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    noise.start(now);
    noise.stop(now + duration);
  }

  function playCommunityChime(hue, x) {
    if (!soundEnabled) return;
    const ctx = Synth.ctx;
    const now = ctx.currentTime;
    const scale = [1, 1.2, 1.333, 1.5, 1.8];
    const normalizedHue = ((hue % 360) + 360) % 360;
    const idx = Math.floor((normalizedHue / 360) * scale.length);
    const freq = CONFIG.sound.communityFreq * scale[idx];

    const panner = makePanner(panFor(x));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(CONFIG.sound.communityVolume, now);
    gain.gain.linearRampToValueAtTime(CONFIG.sound.communityVolume * 0.4, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.connect(gain);
    gain.connect(panner);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Override clear for trail effect + all custom rendering
  gameInstance.clear = function () {
    const ctx = this.ctx;
    const w = gameInstance.width;
    const h = gameInstance.height;
    const TWO_PI = Math.PI * 2;

    // 1. Trail effect — fade toward pure black
    ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.trailAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // 2. Connection lines
    const maxDist = CONFIG.connectionDistance;
    const maxDistSq = maxDist * maxDist;

    for (let i = 0; i < monads.length; i++) {
      const a = monads[i];
      for (let j = i + 1; j < monads.length; j++) {
        const b = monads[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const alpha = CONFIG.connectionAlpha * (1 - dist / maxDist);
          // Blend connection color from the two monads' hues
          const midHue = (a.hue + b.hue) / 2;
          ctx.strokeStyle = `hsla(${midHue}, 70%, 50%, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // 3. Glow halos
    for (const m of monads) {
      const gradient = ctx.createRadialGradient(
        m.x, m.y, 0,
        m.x, m.y, CONFIG.glowRadius
      );
      gradient.addColorStop(0, `hsla(${m.hue}, ${m.sat}%, ${m.lit}%, 0.3)`);
      gradient.addColorStop(1, `hsla(${m.hue}, ${m.sat}%, ${m.lit}%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(m.x, m.y, CONFIG.glowRadius, 0, TWO_PI);
      ctx.fill();
    }

    // 4. Monad cores
    for (const m of monads) {
      ctx.fillStyle = `hsl(${m.hue}, ${m.sat}%, ${m.lit}%)`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, TWO_PI);
      ctx.fill();

      ctx.fillStyle = `hsl(${m.hue}, ${m.sat + 10}%, ${m.lit + 25}%)`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * 0.4, 0, TWO_PI);
      ctx.fill();
    }

    // 5. Community-change flash
    for (const m of monads) {
      if (m.flashTime < 0) continue;
      const elapsed = time - m.flashTime;
      const duration = CONFIG.flash.duration;
      if (elapsed > duration) { m.flashTime = -1; continue; }
      const progress = elapsed / duration;
      const flashRadius = CONFIG.glowRadius * (1 + progress * (CONFIG.flash.radiusMultiplier - 1));
      const alpha = (1 - progress) * 0.5;
      const gradient = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, flashRadius);
      gradient.addColorStop(0, `hsla(${m.targetHue}, 100%, 85%, ${alpha})`);
      gradient.addColorStop(0.5, `hsla(${m.targetHue}, 90%, 65%, ${alpha * 0.4})`);
      gradient.addColorStop(1, `hsla(${m.targetHue}, 80%, 50%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(m.x, m.y, flashRadius, 0, TWO_PI);
      ctx.fill();
    }

    // 6. Gravity well expanding rings
    for (const well of gravityWells) {
      const progress = well.age / CONFIG.gravityWell.duration;
      const ringRadius = progress * CONFIG.gravityWell.ringMaxRadius;
      const alpha = (1 - progress) * 0.6;
      const [wr, wg, wb] = CONFIG.colors.connection;
      ctx.strokeStyle = `rgba(${wr}, ${wg}, ${wb}, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(well.x, well.y, ringRadius, 0, TWO_PI);
      ctx.stroke();

      const innerRadius = progress * CONFIG.gravityWell.ringMaxRadius * 0.5;
      const innerAlpha = (1 - progress) * 0.3;
      ctx.strokeStyle = `rgba(${wr}, ${wg}, ${wb}, ${innerAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(well.x, well.y, innerRadius, 0, TWO_PI);
      ctx.stroke();
    }

  };

  let spawnTimer = 0;

  function setup() {
    monads = [];
    spawnTimer = 0;
    louvainTimer = CONFIG.louvain.interval; // run immediately on first frame
  }

  setup();

  // Update loop
  game.on("update", (dt) => {
    time += dt;

    if (needsRebuild) {
      needsRebuild = false;
      setup();
    }

    // Spawn monads one at a time from offscreen
    if (monads.length < CONFIG.monadCount) {
      spawnTimer += dt;
      if (spawnTimer >= CONFIG.spawn.interval) {
        spawnTimer = 0;
        const w = gameInstance.width;
        const h = gameInstance.height;
        const m = new Monad(w, h, true);
        monads.push(m);
      }
    }

    // Update gravity wells
    for (let i = gravityWells.length - 1; i >= 0; i--) {
      gravityWells[i].age += dt;
      if (gravityWells[i].age > CONFIG.gravityWell.duration) {
        gravityWells.splice(i, 1);
      }
    }

    // Update monads
    const w = gameInstance.width;
    const h = gameInstance.height;
    for (const m of monads) {
      m.update(dt, gravityWells, w, h, time);
    }

    // Touch detection — play blip when monads get very close
    const touchDistSq = CONFIG.sound.touchDistance * CONFIG.sound.touchDistance;
    if (time - lastTouchSoundTime > CONFIG.sound.touchCooldown) {
      for (let i = 0; i < monads.length; i++) {
        const a = monads[i];
        for (let j = i + 1; j < monads.length; j++) {
          const b = monads[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx * dx + dy * dy < touchDistSq) {
            playTouchBlip((a.hue + b.hue) / 2, (a.x + b.x) / 2);
            lastTouchSoundTime = time;
            i = monads.length; // break both loops
            break;
          }
        }
      }
    }

    // Louvain community detection on interval
    louvainTimer += dt;
    if (louvainTimer >= CONFIG.louvain.interval) {
      louvainTimer = 0;
      const communities = detectCommunities(monads);
      if (communities) {
        // Map community IDs → palette indices
        const uniqueComms = [...new Set(communities)];
        const palette = CONFIG.communityColors;
        let chimed = false;
        for (let i = 0; i < monads.length; i++) {
          const commIndex = uniqueComms.indexOf(communities[i]);
          const color = palette[commIndex % palette.length];
          // Detect community change → flash + chime
          if (monads[i].communityId !== -1 && monads[i].communityId !== communities[i]) {
            monads[i].flashTime = time;
            if (!chimed) {
              playCommunityChime(color.h, monads[i].x);
              chimed = true; // one chime per detection pass
            }
          }
          monads[i].communityId = communities[i];
          monads[i].targetHue = color.h;
          monads[i].targetSat = color.s;
          monads[i].targetLit = color.l;
        }
      }
    }
  });

  // Click to create gravity well
  game.on("click", (ctx, e) => {
    if (!e) return;
    const rect = gameInstance.canvas.getBoundingClientRect();
    const scaleX = gameInstance.canvas.width / rect.width;
    const scaleY = gameInstance.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    gravityWells.push({ x: mx, y: my, age: 0 });
    playWoosh(mx);
  });

  // Press R to reset
  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
      gravityWells = [];
      time = 0;
      const ctx = gameInstance.ctx;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, gameInstance.width, gameInstance.height);
      setup();
    }
  });

  game.start();
});
