/**
 * Advanced Complex Number Class with Static Utility Methods
 * Including highly optimized solving Newton binomials and cubic equations
 */
export class Complex {
  /**
   * Create a complex number
   * @param {number} real - Real part
   * @param {number} imag - Imaginary part
   */
  constructor(real = 0, imag = 0) {
    this.real = real;
    this.imag = imag;
  }

  /**
   * Add two complex numbers
   * @param {Complex} other - Complex number to add
   * @returns {Complex} Sum of complex numbers
   */
  add(other) {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }

  /**
   * Subtract two complex numbers
   * @param {Complex} other - Complex number to subtract
   * @returns {Complex} Difference of complex numbers
   */
  sub(other) {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }

  /**
   * Multiply two complex numbers
   * @param {Complex} other - Complex number to multiply
   * @returns {Complex} Product of complex numbers
   */
  mul(other) {
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real
    );
  }

  /**
   * Divide two complex numbers
   * @param {Complex} other - Complex number to divide by
   * @returns {Complex} Quotient of complex numbers
   */
  div(other) {
    const denom = other.real * other.real + other.imag * other.imag;
    return new Complex(
      (this.real * other.real + this.imag * other.imag) / denom,
      (this.imag * other.real - this.real * other.imag) / denom
    );
  }

  /**
   * Calculate complex number magnitude
   * @returns {number} Magnitude of complex number
   */
  magnitude() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  /**
   * Calculate complex number argument (angle)
   * @returns {number} Argument of complex number
   */
  argument() {
    return Math.atan2(this.imag, this.real);
  }

  /**
   * Static method to create a complex number from polar coordinates
   * @param {number} magnitude - Magnitude
   * @param {number} angle - Angle in radians
   * @returns {Complex} Complex number
   */
  static fromPolar(magnitude, angle) {
    return new Complex(
      magnitude * Math.cos(angle),
      magnitude * Math.sin(angle)
    );
  }

  /**
   * Static method to generate roots of a polynomial
   * @param {number} degree - Degree of the polynomial
   * @returns {Complex[]} Array of complex roots
   */
  static generateRoots(degree) {
    return Array.from({ length: degree }, (_, k) =>
      Complex.fromPolar(1, (2 * Math.PI * k) / degree)
    );
  }
}
