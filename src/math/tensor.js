/**
 * Rank-2 Tensor class for general relativity calculations.
 * Provides immutable tensor operations following the Complex class pattern.
 *
 * @example
 * // Create a Schwarzschild metric at r = 10, rs = 2
 * const g = Tensor.schwarzschild(10, 2);
 * console.log(g.get(0, 0)); // g_tt component
 *
 * @example
 * // Create from components
 * const metric = new Tensor([
 *   [-1, 0, 0, 0],
 *   [0, 1, 0, 0],
 *   [0, 0, 1, 0],
 *   [0, 0, 0, 1]
 * ]);
 */
export class Tensor {
  #components;
  #dimension;
  #name;
  #signature;
  #coordinates;

  /**
   * Create a new rank-2 tensor from a 2D array of components.
   * @param {number[][]} components - 2D array of tensor components
   * @param {Object} [options={}] - Optional metadata
   * @param {string} [options.name] - Name of the tensor (e.g., 'Schwarzschild')
   * @param {number[]} [options.signature] - Metric signature (e.g., [-1, 1, 1, 1])
   * @param {string[]} [options.coordinates] - Coordinate names (e.g., ['t', 'r', 'θ', 'φ'])
   */
  constructor(components, options = {}) {
    // Deep copy to ensure immutability
    this.#components = components.map((row) => [...row]);
    this.#dimension = components.length;
    this.#name = options.name || "";
    this.#signature = options.signature || null;
    this.#coordinates = options.coordinates || null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STATIC FACTORY METHODS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a Minkowski (flat spacetime) metric tensor.
   * @returns {Tensor} Minkowski metric with signature (-,+,+,+)
   */
  static minkowski() {
    return new Tensor(
      [
        [-1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
      ],
      {
        name: "Minkowski",
        signature: [-1, 1, 1, 1],
        coordinates: ["t", "x", "y", "z"],
      }
    );
  }

  /**
   * Create a Schwarzschild metric tensor at a given radial position.
   * Uses geometrized units where G = c = 1.
   *
   * @param {number} r - Radial coordinate (must be > rs)
   * @param {number} rs - Schwarzschild radius (2GM/c²)
   * @param {number} [theta=Math.PI/2] - Polar angle (default: equatorial plane)
   * @returns {Tensor} Schwarzschild metric tensor
   */
  static schwarzschild(r, rs, theta = Math.PI / 2) {
    if (r <= rs) {
      // Inside event horizon - metric components swap signature
      // For visualization purposes, we clamp to a small value outside
      r = rs * 1.001;
    }

    const factor = 1 - rs / r;
    const sinTheta = Math.sin(theta);

    return new Tensor(
      [
        [-factor, 0, 0, 0],
        [0, 1 / factor, 0, 0],
        [0, 0, r * r, 0],
        [0, 0, 0, r * r * sinTheta * sinTheta],
      ],
      {
        name: "Schwarzschild",
        signature: [-1, 1, 1, 1],
        coordinates: ["t", "r", "θ", "φ"],
      }
    );
  }

  /**
   * Create a Kerr metric tensor at a given position.
   * Describes spacetime around a rotating (spinning) black hole.
   * Uses Boyer-Lindquist coordinates and geometrized units (G = c = 1).
   *
   * The Kerr metric has an OFF-DIAGONAL g_tφ term representing frame dragging.
   *
   * @param {number} r - Radial coordinate
   * @param {number} theta - Polar angle (0 to π)
   * @param {number} M - Mass parameter
   * @param {number} a - Spin parameter (0 ≤ a ≤ M, a=M is extremal)
   * @returns {Tensor} Kerr metric tensor (non-diagonal)
   */
  static kerr(r, theta, M, a) {
    // Clamp spin to valid range [0, M]
    a = Math.min(Math.abs(a), M);

    const a2 = a * a;
    const r2 = r * r;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const sin2Theta = sinTheta * sinTheta;
    const cos2Theta = cosTheta * cosTheta;

    // Fundamental Kerr quantities
    const Sigma = r2 + a2 * cos2Theta;
    const Delta = r2 - 2 * M * r + a2;

    // Outer event horizon radius
    const rPlus = M + Math.sqrt(Math.max(0, M * M - a2));

    // Clamp to just outside horizon to avoid coordinate singularity
    if (r <= rPlus) {
      r = rPlus * 1.001;
      const r2New = r * r;
      const SigmaNew = r2New + a2 * cos2Theta;
      const DeltaNew = r2New - 2 * M * r + a2;
      return Tensor._buildKerrMetric(r, theta, M, a, SigmaNew, DeltaNew, sin2Theta);
    }

    return Tensor._buildKerrMetric(r, theta, M, a, Sigma, Delta, sin2Theta);
  }

  /**
   * Internal helper to build Kerr metric components.
   * @private
   */
  static _buildKerrMetric(r, theta, M, a, Sigma, Delta, sin2Theta) {
    const a2 = a * a;
    const r2 = r * r;

    // Metric components in Boyer-Lindquist coordinates
    // g_tt = -(1 - 2Mr/Σ)
    const g_tt = -(1 - (2 * M * r) / Sigma);

    // g_rr = Σ/Δ
    const g_rr = Sigma / Delta;

    // g_θθ = Σ
    const g_thth = Sigma;

    // g_φφ = (r² + a² + 2Ma²r sin²θ/Σ) sin²θ
    const g_phph = (r2 + a2 + (2 * M * a2 * r * sin2Theta) / Sigma) * sin2Theta;

    // OFF-DIAGONAL: g_tφ = g_φt = -2Mar sin²θ / Σ
    // This is the FRAME DRAGGING term!
    const g_tph = -(2 * M * a * r * sin2Theta) / Sigma;

    return new Tensor(
      [
        [g_tt, 0, 0, g_tph],
        [0, g_rr, 0, 0],
        [0, 0, g_thth, 0],
        [g_tph, 0, 0, g_phph],
      ],
      {
        name: "Kerr",
        signature: [-1, 1, 1, 1],
        coordinates: ["t", "r", "θ", "φ"],
      }
    );
  }

  /**
   * Calculate Kerr horizon radii.
   * r± = M ± √(M² - a²)
   *
   * @param {number} M - Mass parameter
   * @param {number} a - Spin parameter
   * @param {boolean} [inner=false] - Return inner (Cauchy) horizon if true
   * @returns {number} Horizon radius (outer by default, NaN if a > M)
   */
  static kerrHorizonRadius(M, a, inner = false) {
    const discriminant = M * M - a * a;
    if (discriminant < 0) return NaN; // Naked singularity (a > M)
    const sqrtDisc = Math.sqrt(discriminant);
    return inner ? M - sqrtDisc : M + sqrtDisc;
  }

  /**
   * Calculate ergosphere radius (static limit surface).
   * r_ergo(θ) = M + √(M² - a²cos²θ)
   *
   * At poles (θ=0,π): r_ergo = r+ (touches horizon)
   * At equator (θ=π/2): r_ergo = 2M (maximum extent)
   *
   * @param {number} M - Mass parameter
   * @param {number} a - Spin parameter
   * @param {number} theta - Polar angle
   * @returns {number} Ergosphere radius at given theta
   */
  static kerrErgosphereRadius(M, a, theta) {
    const cosTheta = Math.cos(theta);
    const discriminant = M * M - a * a * cosTheta * cosTheta;
    if (discriminant < 0) return NaN;
    return M + Math.sqrt(discriminant);
  }

  /**
   * Calculate ISCO radius for Kerr metric.
   * Different for prograde (co-rotating) vs retrograde (counter-rotating) orbits.
   *
   * Prograde ISCO: approaches M as a → M (can orbit closer)
   * Retrograde ISCO: approaches 9M as a → M (must orbit farther)
   *
   * Uses the exact Bardeen formula.
   *
   * @param {number} M - Mass parameter
   * @param {number} a - Spin parameter
   * @param {boolean} [prograde=true] - Prograde orbit if true
   * @returns {number} ISCO radius
   */
  static kerrISCO(M, a, prograde = true) {
    const aM = a / M; // Dimensionless spin
    const sign = prograde ? 1 : -1;

    // Bardeen's formula for Kerr ISCO
    const Z1 = 1 + Math.cbrt(1 - aM * aM) * (Math.cbrt(1 + aM) + Math.cbrt(1 - aM));
    const Z2 = Math.sqrt(3 * aM * aM + Z1 * Z1);

    return M * (3 + Z2 - sign * Math.sqrt((3 - Z1) * (3 + Z1 + 2 * Z2)));
  }

  /**
   * Calculate frame-dragging angular velocity (omega).
   * This is the angular velocity at which spacetime itself rotates.
   *
   * ω = -g_tφ / g_φφ
   *
   * At large r: ω ≈ 2Ma/r³ (Lense-Thirring precession)
   *
   * @param {number} r - Radial coordinate
   * @param {number} theta - Polar angle
   * @param {number} M - Mass parameter
   * @param {number} a - Spin parameter
   * @returns {number} Frame dragging angular velocity
   */
  static kerrFrameDraggingOmega(r, theta, M, a) {
    const metric = Tensor.kerr(r, theta, M, a);
    const g_tph = metric.get(0, 3);
    const g_phph = metric.get(3, 3);

    if (Math.abs(g_phph) < 1e-10) return 0;
    return -g_tph / g_phph;
  }

  /**
   * Calculate effective potential for Kerr geodesics (equatorial plane).
   *
   * @param {number} M - Mass parameter
   * @param {number} a - Spin parameter
   * @param {number} E - Energy per unit mass
   * @param {number} L - Angular momentum per unit mass
   * @param {number} r - Radial coordinate
   * @returns {number} Effective potential value
   */
  static kerrEffectivePotential(M, a, E, L, r) {
    if (r <= 0) return Infinity;

    const r2 = r * r;
    const a2 = a * a;
    const Delta = r2 - 2 * M * r + a2;

    // Simplified effective potential for equatorial orbits
    const term1 = -M / r;
    const term2 = (L * L - a2 * (E * E - 1)) / (2 * r2);
    const term3 = -M * Math.pow(L - a * E, 2) / (r2 * r);

    return term1 + term2 + term3;
  }

  /**
   * Create a diagonal tensor from an array of values.
   * @param {number[]} values - Diagonal values
   * @param {Object} [options={}] - Optional metadata
   * @returns {Tensor} Diagonal tensor
   */
  static diagonal(values, options = {}) {
    const n = values.length;
    const components = [];
    for (let i = 0; i < n; i++) {
      components[i] = [];
      for (let j = 0; j < n; j++) {
        components[i][j] = i === j ? values[i] : 0;
      }
    }
    return new Tensor(components, options);
  }

  /**
   * Create an identity tensor of given dimension.
   * @param {number} [n=4] - Dimension
   * @returns {Tensor} Identity tensor
   */
  static identity(n = 4) {
    const values = new Array(n).fill(1);
    return Tensor.diagonal(values, { name: "Identity" });
  }

  /**
   * Create a zero tensor of given dimension.
   * @param {number} [n=4] - Dimension
   * @returns {Tensor} Zero tensor
   */
  static zero(n = 4) {
    const components = [];
    for (let i = 0; i < n; i++) {
      components[i] = new Array(n).fill(0);
    }
    return new Tensor(components, { name: "Zero" });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPONENT ACCESS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get a component at the specified indices.
   * @param {number} i - Row index
   * @param {number} j - Column index
   * @returns {number} Component value
   */
  get(i, j) {
    return this.#components[i][j];
  }

  /**
   * Return a new tensor with the specified component changed.
   * @param {number} i - Row index
   * @param {number} j - Column index
   * @param {number} value - New value
   * @returns {Tensor} New tensor with updated component
   */
  set(i, j, value) {
    const newComponents = this.#components.map((row) => [...row]);
    newComponents[i][j] = value;
    return new Tensor(newComponents, {
      name: this.#name,
      signature: this.#signature,
      coordinates: this.#coordinates,
    });
  }

  /**
   * Get the diagonal components as an array.
   * @returns {number[]} Diagonal values
   */
  getDiagonal() {
    const diag = [];
    for (let i = 0; i < this.#dimension; i++) {
      diag.push(this.#components[i][i]);
    }
    return diag;
  }

  /**
   * Get the dimension of the tensor.
   * @returns {number} Dimension (n for n×n tensor)
   */
  get dimension() {
    return this.#dimension;
  }

  /**
   * Get the tensor name.
   * @returns {string} Name
   */
  get name() {
    return this.#name;
  }

  /**
   * Get the metric signature.
   * @returns {number[]|null} Signature array or null
   */
  get signature() {
    return this.#signature;
  }

  /**
   * Get the coordinate names.
   * @returns {string[]|null} Coordinate names or null
   */
  get coordinates() {
    return this.#coordinates;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TENSOR OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add another tensor to this one.
   * @param {Tensor} other - Tensor to add
   * @returns {Tensor} Sum of tensors
   */
  add(other) {
    const result = [];
    for (let i = 0; i < this.#dimension; i++) {
      result[i] = [];
      for (let j = 0; j < this.#dimension; j++) {
        result[i][j] = this.#components[i][j] + other.get(i, j);
      }
    }
    return new Tensor(result);
  }

  /**
   * Subtract another tensor from this one.
   * @param {Tensor} other - Tensor to subtract
   * @returns {Tensor} Difference of tensors
   */
  subtract(other) {
    const result = [];
    for (let i = 0; i < this.#dimension; i++) {
      result[i] = [];
      for (let j = 0; j < this.#dimension; j++) {
        result[i][j] = this.#components[i][j] - other.get(i, j);
      }
    }
    return new Tensor(result);
  }

  /**
   * Multiply this tensor by a scalar.
   * @param {number} scalar - Scalar multiplier
   * @returns {Tensor} Scaled tensor
   */
  scale(scalar) {
    const result = [];
    for (let i = 0; i < this.#dimension; i++) {
      result[i] = [];
      for (let j = 0; j < this.#dimension; j++) {
        result[i][j] = this.#components[i][j] * scalar;
      }
    }
    return new Tensor(result);
  }

  /**
   * Matrix multiply this tensor with another.
   * @param {Tensor} other - Tensor to multiply with
   * @returns {Tensor} Product tensor
   */
  multiply(other) {
    const result = [];
    for (let i = 0; i < this.#dimension; i++) {
      result[i] = [];
      for (let j = 0; j < this.#dimension; j++) {
        let sum = 0;
        for (let k = 0; k < this.#dimension; k++) {
          sum += this.#components[i][k] * other.get(k, j);
        }
        result[i][j] = sum;
      }
    }
    return new Tensor(result);
  }

  /**
   * Transpose this tensor (swap indices).
   * @returns {Tensor} Transposed tensor
   */
  transpose() {
    const result = [];
    for (let i = 0; i < this.#dimension; i++) {
      result[i] = [];
      for (let j = 0; j < this.#dimension; j++) {
        result[i][j] = this.#components[j][i];
      }
    }
    return new Tensor(result, {
      name: this.#name ? `${this.#name}ᵀ` : "",
      signature: this.#signature,
      coordinates: this.#coordinates,
    });
  }

  /**
   * Compute the inverse of this tensor (for rank-2).
   * Uses Gaussian elimination with partial pivoting.
   * @returns {Tensor} Inverse tensor
   */
  inverse() {
    const n = this.#dimension;

    // Create augmented matrix [A|I]
    const aug = [];
    for (let i = 0; i < n; i++) {
      aug[i] = [];
      for (let j = 0; j < n; j++) {
        aug[i][j] = this.#components[i][j];
      }
      for (let j = 0; j < n; j++) {
        aug[i][n + j] = i === j ? 1 : 0;
      }
    }

    // Gaussian elimination with partial pivoting
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row;
        }
      }

      // Swap rows
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      // Check for singular matrix
      if (Math.abs(aug[col][col]) < 1e-10) {
        throw new Error("Matrix is singular, cannot compute inverse");
      }

      // Scale pivot row
      const pivot = aug[col][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[col][j] /= pivot;
      }

      // Eliminate column
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = aug[row][col];
          for (let j = 0; j < 2 * n; j++) {
            aug[row][j] -= factor * aug[col][j];
          }
        }
      }
    }

    // Extract inverse from augmented matrix
    const result = [];
    for (let i = 0; i < n; i++) {
      result[i] = [];
      for (let j = 0; j < n; j++) {
        result[i][j] = aug[i][n + j];
      }
    }

    return new Tensor(result, {
      name: this.#name ? `${this.#name}⁻¹` : "",
      signature: this.#signature,
      coordinates: this.#coordinates,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DERIVED QUANTITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Compute the determinant of this tensor.
   * Uses LU decomposition for efficiency.
   * @returns {number} Determinant
   */
  determinant() {
    const n = this.#dimension;

    // For small matrices, use direct formulas
    if (n === 2) {
      return (
        this.#components[0][0] * this.#components[1][1] -
        this.#components[0][1] * this.#components[1][0]
      );
    }

    if (n === 3) {
      const m = this.#components;
      return (
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
      );
    }

    // For 4x4 and larger, use LU decomposition
    const lu = this.#components.map((row) => [...row]);
    let det = 1;
    let swaps = 0;

    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(lu[row][col]) > Math.abs(lu[maxRow][col])) {
          maxRow = row;
        }
      }

      if (maxRow !== col) {
        [lu[col], lu[maxRow]] = [lu[maxRow], lu[col]];
        swaps++;
      }

      if (Math.abs(lu[col][col]) < 1e-10) {
        return 0;
      }

      det *= lu[col][col];

      for (let row = col + 1; row < n; row++) {
        lu[row][col] /= lu[col][col];
        for (let j = col + 1; j < n; j++) {
          lu[row][j] -= lu[row][col] * lu[col][j];
        }
      }
    }

    return swaps % 2 === 0 ? det : -det;
  }

  /**
   * Compute the trace (sum of diagonal elements).
   * @returns {number} Trace
   */
  trace() {
    let sum = 0;
    for (let i = 0; i < this.#dimension; i++) {
      sum += this.#components[i][i];
    }
    return sum;
  }

  /**
   * Check if the tensor is diagonal (off-diagonal elements near zero).
   * @param {number} [tolerance=1e-10] - Tolerance for zero comparison
   * @returns {boolean} True if diagonal
   */
  isDiagonal(tolerance = 1e-10) {
    for (let i = 0; i < this.#dimension; i++) {
      for (let j = 0; j < this.#dimension; j++) {
        if (i !== j && Math.abs(this.#components[i][j]) > tolerance) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if the tensor is symmetric.
   * @param {number} [tolerance=1e-10] - Tolerance for comparison
   * @returns {boolean} True if symmetric
   */
  isSymmetric(tolerance = 1e-10) {
    for (let i = 0; i < this.#dimension; i++) {
      for (let j = i + 1; j < this.#dimension; j++) {
        if (
          Math.abs(this.#components[i][j] - this.#components[j][i]) > tolerance
        ) {
          return false;
        }
      }
    }
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GR-SPECIFIC STATIC UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Compute Christoffel symbols (connection coefficients) for a metric.
   * Uses numerical differentiation.
   *
   * Γ^λ_μν = ½ g^λσ (∂_μ g_νσ + ∂_ν g_μσ - ∂_σ g_μν)
   *
   * @param {Function} metricFn - Function(position: number[]) => Tensor
   * @param {number[]} position - Position [t, r, θ, φ] at which to evaluate
   * @param {number} [delta=0.001] - Step size for numerical differentiation
   * @returns {number[][][]} Christoffel symbols Γ[λ][μ][ν]
   */
  static christoffel(metricFn, position, delta = 0.001) {
    const dim = 4;
    const result = [];

    // Get metric and inverse at position
    const g = metricFn(position);
    const gInv = g.inverse();

    // Calculate partial derivatives ∂_ρ g_μν
    const dg = []; // dg[rho][mu][nu] = ∂_ρ g_μν
    for (let rho = 0; rho < dim; rho++) {
      const posPlus = [...position];
      const posMinus = [...position];
      posPlus[rho] += delta;
      posMinus[rho] -= delta;

      const gPlus = metricFn(posPlus);
      const gMinus = metricFn(posMinus);

      dg[rho] = [];
      for (let mu = 0; mu < dim; mu++) {
        dg[rho][mu] = [];
        for (let nu = 0; nu < dim; nu++) {
          dg[rho][mu][nu] = (gPlus.get(mu, nu) - gMinus.get(mu, nu)) / (2 * delta);
        }
      }
    }

    // Compute Christoffel symbols
    for (let lambda = 0; lambda < dim; lambda++) {
      result[lambda] = [];
      for (let mu = 0; mu < dim; mu++) {
        result[lambda][mu] = [];
        for (let nu = 0; nu < dim; nu++) {
          let sum = 0;
          for (let sigma = 0; sigma < dim; sigma++) {
            sum +=
              (gInv.get(lambda, sigma) *
                (dg[mu][nu][sigma] + dg[nu][mu][sigma] - dg[sigma][mu][nu])) /
              2;
          }
          result[lambda][mu][nu] = sum;
        }
      }
    }

    return result;
  }

  /**
   * Compute the effective potential for geodesic motion in Schwarzschild spacetime.
   *
   * V_eff = -M/r + L²/(2r²) - ML²/r³
   *
   * @param {number} M - Mass (Schwarzschild radius / 2)
   * @param {number} L - Angular momentum per unit mass
   * @param {number} r - Radial coordinate
   * @returns {number} Effective potential value
   */
  static effectivePotential(M, L, r) {
    if (r <= 0) return Infinity;
    const L2 = L * L;
    return -M / r + L2 / (2 * r * r) - (M * L2) / (r * r * r);
  }

  /**
   * Find the ISCO (Innermost Stable Circular Orbit) radius.
   * For Schwarzschild: r_ISCO = 6M = 3rs
   *
   * @param {number} rs - Schwarzschild radius
   * @returns {number} ISCO radius
   */
  static iscoRadius(rs) {
    return 3 * rs;
  }

  /**
   * Find the photon sphere radius.
   * For Schwarzschild: r_photon = 3M = 1.5rs
   *
   * @param {number} rs - Schwarzschild radius
   * @returns {number} Photon sphere radius
   */
  static photonSphereRadius(rs) {
    return 1.5 * rs;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DISPLAY/UTILITY
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get a flat array of all components (row-major order).
   * @returns {number[]} Flat array
   */
  toArray() {
    const flat = [];
    for (let i = 0; i < this.#dimension; i++) {
      for (let j = 0; j < this.#dimension; j++) {
        flat.push(this.#components[i][j]);
      }
    }
    return flat;
  }

  /**
   * Get a 2D array copy of the components.
   * @returns {number[][]} 2D array
   */
  toMatrix() {
    return this.#components.map((row) => [...row]);
  }

  /**
   * Get a string representation of the tensor.
   * @param {number} [precision=3] - Decimal precision
   * @returns {string} String representation
   */
  toString(precision = 3) {
    const header = this.#name ? `${this.#name} Tensor:\n` : "";
    const rows = this.#components.map(
      (row) => `[ ${row.map((v) => v.toFixed(precision).padStart(10)).join(" ")} ]`
    );
    return header + rows.join("\n");
  }

  /**
   * Get a LaTeX representation of the tensor.
   * @param {number} [precision=3] - Decimal precision
   * @returns {string} LaTeX string
   */
  toLatex(precision = 3) {
    const rows = this.#components.map((row) =>
      row.map((v) => v.toFixed(precision)).join(" & ")
    );
    return `\\begin{pmatrix}\n${rows.join(" \\\\\n")}\n\\end{pmatrix}`;
  }
}
