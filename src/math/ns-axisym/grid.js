/** Geometry and scalar storage for the axisymmetric CPU reference. */
const CONFIG = { ghosts: 2, minimumCells: 4 };

/** Create a uniform cell-centered cylinder grid with two ghost layers. */
export function createGrid({ nr, nz, R, Z }) {
  if (![nr, nz].every(n => Number.isInteger(n) && n >= CONFIG.minimumCells) ||
      ![R, Z].every(x => Number.isFinite(x) && x > 0)) {
    throw new RangeError("Expected integer nr,nz >= 4 and finite positive R,Z");
  }
  const G = CONFIG.ghosts, W = nr + 2 * G, H = nz + 2 * G;
  const dr = R / nr, dz = 2 * Z / nz;
  if (![dr, dz, 1 / dr ** 2, 1 / dz ** 2].every(Number.isFinite) || dr * dz === 0) {
    throw new RangeError("Grid spacing is not representable");
  }
  return Object.freeze({
    nr, nz, R, Z, G, W, H, dr, dz,
    idx: (i, j) => (j + G) * W + i + G,
    rc: i => (i + 0.5) * dr, zc: j => -Z + (j + 0.5) * dz,
    rn: i => i * dr, zn: j => -Z + j * dz,
  });
}

/** Allocate an owned Float64 scalar field, including ghosts. */
export function allocField(g) { return new Float64Array(g.W * g.H); }

/** Check storage shape; optionally reject nonfinite samples, including ghosts. */
export function checkField(g, f, finite = false) {
  if (!(f instanceof Float64Array) || f.length !== g.W * g.H) {
    throw new RangeError("Invalid scalar field storage");
  }
  if (finite && !f.every(Number.isFinite)) throw new RangeError("Nonfinite scalar field");
}

/** Visit interior point samples with (i,j,linearIndex). */
export function forEachInterior(g, fn) {
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nr; i++) fn(i, j, g.idx(i, j));
}

/** Even extension of a, chi, or phi; fill axial ghosts before calling. */
export function applyAxisGhosts(g, f) {
  checkField(g, f);
  for (let j = -g.G; j < g.nz + g.G; j++)
    for (let k = 0; k < g.G; k++) f[g.idx(-1 - k, j)] = f[g.idx(k, j)];
}
