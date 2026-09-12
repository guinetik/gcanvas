const CONFIG = { strength: 12, duration: 0.5, capacity: 8 };

/** Temporary localized azimuthal forcing; sampling never mutates pulse history,
 * so RK stage retries see the same force. Add only between accepted steps.
 */
export function createStirSource(baseSource, { R, Z, radialWidth, axialWidth }) {
  const pulses = [];
  const bump = q => Math.abs(q) < 1 ? Math.exp(1 - 1 / (1 - q * q)) : 0;
  const source = (r, z, time) => {
    const base = baseSource?.(r, z, time) ?? { a: 0, chi: 0 };
    let a = base.a;
    for (const pulse of pulses) {
      const age = (time - pulse.time) / CONFIG.duration;
      if (age <= 0 || age >= 1) continue;
      a += pulse.sign * CONFIG.strength * Math.sin(Math.PI * age) ** 2 *
        bump((r - pulse.r) / radialWidth) * bump((z - pulse.z) / axialWidth);
    }
    return { a, chi: base.chi };
  };
  source.addPulse = (r, z, time, sign = 1) => {
    if (![r, z, time, sign].every(Number.isFinite)) throw new RangeError('Invalid stir pulse');
    const pulse = {
      r: Math.max(radialWidth, Math.min(R - radialWidth, Math.abs(r))),
      z: Math.max(-Z + axialWidth, Math.min(Z - axialWidth, z)),
      time, sign: sign < 0 ? -1 : 1,
    };
    for (let i = pulses.length - 1; i >= 0; i--) if (time - pulses[i].time >= CONFIG.duration) pulses.splice(i, 1);
    // Holding still sustains discrete pulses rather than stacking unbounded force.
    if (pulses.some(p => Math.hypot((p.r - pulse.r) / radialWidth, (p.z - pulse.z) / axialWidth) < 0.5 && p.sign === pulse.sign)) return null;
    if (pulses.length === CONFIG.capacity) pulses.shift();
    pulses.push(pulse); return pulse;
  };
  source.activePulses = time => pulses.filter(p => time >= p.time && time < p.time + CONFIG.duration).map(p => ({ ...p, age: (time - p.time) / CONFIG.duration }));
  return source;
}
