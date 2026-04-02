/**
 * Artemis II Physics Engine
 *
 * Precomputes a 10-day RK4 n-body trajectory (Earth fixed, Moon + Orion).
 * Returns a Float64Array of 28,800 frames at 30-second intervals.
 *
 * Units: km and seconds throughout.
 */

// Gravitational parameters (G × mass)
const MU_EARTH = 398600;   // km³/s²
const MU_MOON  = 4902;     // km³/s²

// Simulation constants
const DT             = 30;
const DURATION       = 864000;  // 10 days
const COUNT          = Math.round(DURATION / DT);  // 28800
const STRIDE         = 9;
const FLYBY_THRESH   = 280000;  // km — Orion enters Moon's sphere of influence
const REENTRY_THRESH = 50000;   // km

const FALLBACK_FLYBY_FRAC        = 0.30;
const FALLBACK_FREE_RETURN_FRAC  = 0.35;
const FALLBACK_REENTRY_FRAC      = 0.90;

// Initial conditions
// Moon: circular orbit at 384,400 km (vy = sqrt(MU_EARTH/r)), velocity in +Y
// Orion: TLI from 185 km LEO at 25° from Moon line, tuned for free-return arc in 10 days
const INIT = {
  moon:  { x: 384400, y: 0,     z: 0, vx: 0,        vy: Math.sqrt(MU_EARTH / 384400), vz: 0 },
  orion: { x: 6556,   y: 0,     z: 0,
           vx: 10.8 * Math.cos(25 * Math.PI / 180),
           vy: 10.8 * Math.sin(25 * Math.PI / 180),
           vz: 0 },
};

// Derivatives of 12-element state [mx,my,mz,mvx,mvy,mvz, ox,oy,oz,ovx,ovy,ovz]
function derivatives(s) {
  const [mx,my,mz,mvx,mvy,mvz, ox,oy,oz,ovx,ovy,ovz] = s;

  const rm = Math.sqrt(mx*mx + my*my + mz*mz);
  const rm3 = rm * rm * rm;
  const amx = -MU_EARTH * mx / rm3;
  const amy = -MU_EARTH * my / rm3;
  const amz = -MU_EARTH * mz / rm3;

  const ro = Math.sqrt(ox*ox + oy*oy + oz*oz);
  const ro3 = ro * ro * ro;
  const dx = ox - mx, dy = oy - my, dz = oz - mz;
  const rmo = Math.sqrt(dx*dx + dy*dy + dz*dz);
  const rmo3 = rmo * rmo * rmo;
  const aox = -MU_EARTH * ox / ro3 - MU_MOON * dx / rmo3;
  const aoy = -MU_EARTH * oy / ro3 - MU_MOON * dy / rmo3;
  const aoz = -MU_EARTH * oz / ro3 - MU_MOON * dz / rmo3;

  return [mvx,mvy,mvz,amx,amy,amz, ovx,ovy,ovz,aox,aoy,aoz];
}

function rk4Step(s, dt) {
  const k1 = derivatives(s);
  const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]);
  const k2 = derivatives(s2);
  const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]);
  const k3 = derivatives(s3);
  const s4 = s.map((v, i) => v + dt * k3[i]);
  const k4 = derivatives(s4);
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
}

export function readFrame(frames, i) {
  const o = i * STRIDE;
  return {
    moon:  { x: frames[o],   y: frames[o+1], z: frames[o+2] },
    orion: { x: frames[o+3], y: frames[o+4], z: frames[o+5],
             vx: frames[o+6], vy: frames[o+7], vz: frames[o+8] },
  };
}

function writeFrame(frames, i, mx,my,mz, ox,oy,oz, ovx,ovy,ovz) {
  const o = i * STRIDE;
  frames[o]=mx; frames[o+1]=my; frames[o+2]=mz;
  frames[o+3]=ox; frames[o+4]=oy; frames[o+5]=oz;
  frames[o+6]=ovx; frames[o+7]=ovy; frames[o+8]=ovz;
}

export function interpolateState(frames, t, dt) {
  const frameF = t / dt;
  const i = Math.min(Math.floor(frameF), COUNT - 2);
  const alpha = Math.min(frameF - i, 1.0);
  const a = readFrame(frames, i);
  const b = readFrame(frames, i + 1);
  return {
    moon: {
      x: a.moon.x + (b.moon.x - a.moon.x) * alpha,
      y: a.moon.y + (b.moon.y - a.moon.y) * alpha,
      z: a.moon.z + (b.moon.z - a.moon.z) * alpha,
    },
    orion: {
      x:  a.orion.x  + (b.orion.x  - a.orion.x)  * alpha,
      y:  a.orion.y  + (b.orion.y  - a.orion.y)  * alpha,
      z:  a.orion.z  + (b.orion.z  - a.orion.z)  * alpha,
      vx: a.orion.vx + (b.orion.vx - a.orion.vx) * alpha,
      vy: a.orion.vy + (b.orion.vy - a.orion.vy) * alpha,
      vz: a.orion.vz + (b.orion.vz - a.orion.vz) * alpha,
    },
  };
}

export function computeTrajectory() {
  const frames = new Float64Array(COUNT * STRIDE);

  let state = [
    INIT.moon.x,  INIT.moon.y,  INIT.moon.z,
    INIT.moon.vx, INIT.moon.vy, INIT.moon.vz,
    INIT.orion.x, INIT.orion.y, INIT.orion.z,
    INIT.orion.vx,INIT.orion.vy,INIT.orion.vz,
  ];

  let prevOrionMoonDist = Infinity;
  let prevOrionEarthDist = Infinity;
  let flybyDetected = false;
  let freeReturnDetected = false;
  let returnLeg = false;

  const phaseTimestamps = {
    TRANS_LUNAR: 0,
    LUNAR_FLYBY: -1,
    FREE_RETURN: -1,
    REENTRY:     -1,
  };

  for (let i = 0; i < COUNT; i++) {
    const [mx,my,mz,,,,ox,oy,oz,ovx,ovy,ovz] = state;
    writeFrame(frames, i, mx,my,mz, ox,oy,oz, ovx,ovy,ovz);

    const t = i * DT;
    const orionEarthDist = Math.sqrt(ox*ox + oy*oy + oz*oz);
    const dx = ox-mx, dy = oy-my, dz = oz-mz;
    const orionMoonDist = Math.sqrt(dx*dx + dy*dy + dz*dz);

    if (!flybyDetected && orionMoonDist < FLYBY_THRESH) {
      flybyDetected = true;
      phaseTimestamps.LUNAR_FLYBY = t;
    }

    if (flybyDetected && !freeReturnDetected && orionMoonDist > prevOrionMoonDist) {
      freeReturnDetected = true;
      returnLeg = true;
      phaseTimestamps.FREE_RETURN = t;
    }

    if (returnLeg && phaseTimestamps.REENTRY < 0 &&
        orionEarthDist < REENTRY_THRESH && orionEarthDist < prevOrionEarthDist) {
      phaseTimestamps.REENTRY = t;
    }

    prevOrionMoonDist = orionMoonDist;
    prevOrionEarthDist = orionEarthDist;
    state = rk4Step(state, DT);
  }

  // Fallbacks if trajectory didn't reach expected phases
  if (phaseTimestamps.LUNAR_FLYBY < 0) phaseTimestamps.LUNAR_FLYBY = DURATION * FALLBACK_FLYBY_FRAC;
  if (phaseTimestamps.FREE_RETURN < 0) phaseTimestamps.FREE_RETURN = DURATION * FALLBACK_FREE_RETURN_FRAC;
  if (phaseTimestamps.REENTRY    < 0) phaseTimestamps.REENTRY    = DURATION * FALLBACK_REENTRY_FRAC;

  return { frames, phaseTimestamps, count: COUNT, dt: DT };
}
