export class Complex {
  constructor(real, imag = 0) {
    this.real = real;
    this.imag = imag;
  }
  
  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }
  
  add(other) {
    return new Complex(this.real + other.real, this.imag + other.imag);
  }
  
  subtract(other) {
    return new Complex(this.real - other.real, this.imag - other.imag);
  }
  
  multiply(other) {
    return new Complex(
      this.real * other.real - this.imag * other.imag,
      this.real * other.imag + this.imag * other.real
    );
  }
  
  divide(scalar) {
    return new Complex(this.real / scalar, this.imag / scalar);
  }
  
  scale(scalar) {
    return new Complex(this.real * scalar, this.imag * scalar);
  }
  
  abs() {
    return Math.sqrt(this.real * this.real + this.imag * this.imag);
  }

  conjugate() {
    return new Complex(this.real, -this.imag);
  }

  arg() {
    return Math.atan2(this.imag, this.real);
  }

  divideComplex(other) {
    const denom = other.real * other.real + other.imag * other.imag;
    return new Complex(
      (this.real * other.real + this.imag * other.imag) / denom,
      (this.imag * other.real - this.real * other.imag) / denom
    );
  }
}