/**
 * Keplerian orbital mechanics — pure functions.
 * Solves the two-body problem for elliptical orbits using classical orbital elements.
 * No visualization dependencies.
 * @module math/kepler
 */

const TWO_PI = 2 * Math.PI;

/**
 * Solve Kepler's equation M = E - e*sin(E) for eccentric anomaly E.
 * Uses Newton-Raphson iteration with initial guess E₀ = M.
 */
export function solveKeplerEquation(M, e, tolerance = 1e-10, maxIter = 50) {
  if (e === 0) return M;
  let E = M;
  for (let i = 0; i < maxIter; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

/**
 * Compute mean anomaly at a given time.
 * M = 2π * (t - epoch) / period
 */
export function meanAnomaly(period, time, epoch = 0) {
  return TWO_PI * ((time - epoch) / period);
}

/**
 * Convert eccentric anomaly to true anomaly.
 * tan(ν/2) = sqrt((1+e)/(1-e)) * tan(E/2)
 */
export function trueAnomalyFromEccentric(E, e) {
  if (e === 0) return E;
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

/**
 * Orbital radius from true anomaly (conic section equation).
 * r = a(1 - e²) / (1 + e*cos(ν))
 * Named keplerRadius to avoid collision with orbitalRadius in orbital.js
 */
export function keplerRadius(semiMajorAxis, eccentricity, trueAnomaly) {
  if (eccentricity === 0) return semiMajorAxis;
  const p = semiMajorAxis * (1 - eccentricity * eccentricity);
  return p / (1 + eccentricity * Math.cos(trueAnomaly));
}

/**
 * Compute 3D heliocentric cartesian position from orbital elements.
 * Pipeline: time → mean anomaly → Kepler solve → true anomaly → radius → 3D rotation
 *
 * The orbital plane is rotated into 3D space using three Euler angles:
 * - Ω (longitude of ascending node): rotates around Z
 * - i (inclination): tilts the orbital plane
 * - ω (argument of periapsis): rotates within the orbital plane
 */
export function orbitalPosition3D(elements, time) {
  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: Omega,
    argumentOfPeriapsis: omega,
    period,
    epoch = 0,
  } = elements;

  const M = meanAnomaly(period, time, epoch);
  const E = solveKeplerEquation(M, e);
  const nu = trueAnomalyFromEccentric(E, e);
  const r = keplerRadius(a, e, nu);

  const xOrbital = r * Math.cos(nu);
  const yOrbital = r * Math.sin(nu);

  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const x =
    (cosOmega * cosW - sinOmega * sinW * cosI) * xOrbital +
    (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrbital;
  const y =
    (sinOmega * cosW + cosOmega * sinW * cosI) * xOrbital +
    (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrbital;
  const z =
    (sinW * sinI) * xOrbital +
    (cosW * sinI) * yOrbital;

  return { x, y, z };
}

/**
 * Generate array of 3D points tracing the full orbit ellipse.
 * Samples uniformly in mean anomaly for even visual spacing.
 */
export function orbitPathPoints(elements, numSegments = 128) {
  const {
    semiMajorAxis: a,
    eccentricity: e,
    inclination: i,
    longitudeOfAscendingNode: Omega,
    argumentOfPeriapsis: omega,
  } = elements;

  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  const points = new Array(numSegments);
  for (let j = 0; j < numSegments; j++) {
    const M = TWO_PI * (j / numSegments);
    const E = solveKeplerEquation(M, e);
    const nu = trueAnomalyFromEccentric(E, e);
    const r = keplerRadius(a, e, nu);

    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);

    points[j] = {
      x: (cosOmega * cosW - sinOmega * sinW * cosI) * xOrb +
         (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrb,
      y: (sinOmega * cosW + cosOmega * sinW * cosI) * xOrb +
         (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrb,
      z: (sinW * sinI) * xOrb + (cosW * sinI) * yOrb,
    };
  }
  return points;
}
