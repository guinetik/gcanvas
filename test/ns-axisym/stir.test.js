import { describe, it, expect } from 'vitest';
import { createStirSource } from '../../demos/js/ns-lab-stir.js';

const geometry = { R: 1, Z: 1, radialWidth: 0.22, axialWidth: 0.23 };
describe('manual swirl pulses', () => {
  it('adds temporary localized swirl without changing the base force or chi', () => {
    const source = createStirSource(() => ({ a: 2, chi: 3 }), geometry);
    source.addPulse(0.5, 0.3, 1);
    expect(source(0.5, 0.3, 1)).toEqual({ a: 2, chi: 3 });
    expect(source(0.5, 0.3, 1.25)).toEqual({ a: 14, chi: 3 });
    expect(source(0.5, 0.3, 1.5)).toEqual({ a: 2, chi: 3 });
    expect(source(0.9, 0.3, 1.25)).toEqual({ a: 2, chi: 3 });
    expect(source(0.5, 0.3, 1.25)).toEqual({ a: 14, chi: 3 });
  });
  it('mirrors taps, reverses their sign, and keeps support within the walls', () => {
    const source = createStirSource(null, geometry);
    const pulse = source.addPulse(-0.95, 0.95, 0, -1);
    expect(pulse.r).toBe(0.78); expect(pulse.z).toBe(0.77);
    expect(source(pulse.r, pulse.z, 0.25).a).toBe(-12);
    for (const [r, z] of [[0, 0.77], [1, 0.77], [0.78, 1], [0.78, -1]]) expect(source(r, z, 0.25).a).toBeCloseTo(0, 12);
  });
  it('bounds repeated gestures and reports only active pulses', () => {
    const source = createStirSource(null, geometry);
    source.addPulse(0.5, 0.3, 0);
    expect(source.addPulse(0.5, 0.3, 0.1)).toBeNull();
    expect(source.activePulses(0.25)).toHaveLength(1);
    expect(source.activePulses(0.5)).toHaveLength(0);
    expect(source.addPulse(0.5, 0.3, 0.6)).not.toBeNull();
    expect(() => source.addPulse(NaN, 0, 0)).toThrow(RangeError);
  });
});
