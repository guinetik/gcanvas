/**
 * Particle - Lightweight data class for accretion disk particles
 *
 * NOT a GameObject - plain objects for performance (2500+ items)
 * Creating GameObjects for each particle would add massive overhead.
 */
export class Particle {
  constructor(options = {}) {
    // Current animated position
    this.angle = options.angle ?? 0;
    this.distance = options.distance ?? 0;
    this.yOffset = options.yOffset ?? 0;

    // Target (final disk orbit)
    this.targetAngle = options.targetAngle ?? this.angle;
    this.targetDistance = options.targetDistance ?? this.distance;
    this.targetYOffset = options.targetYOffset ?? this.yOffset;

    // Starting position (for infall animation)
    this.startAngle = options.startAngle ?? this.angle;
    this.startDistance = options.startDistance ?? this.distance;
    this.startYOffset = options.startYOffset ?? 0;

    // Physics
    this.speed = options.speed ?? 0;
    this.baseColor = options.baseColor ?? { r: 255, g: 255, b: 255, a: 1 };

    // Formation state
    this.infallDelay = options.infallDelay ?? 0;
    this.circularizeSpeed = options.circularizeSpeed ?? 1;
    this.streamOffset = options.streamOffset ?? 0;
    this.spiralTurns = options.spiralTurns ?? 1.5;
    this.willFallIn = options.willFallIn ?? false;
    this.consumed = options.consumed ?? false;
    this.isFalling = options.isFalling ?? false;
  }

  /**
   * Factory method for creating disk particles at final positions
   */
  static createForDisk(angle, distance, yOffset, speed, baseColor) {
    return new Particle({
      angle,
      distance,
      yOffset,
      speed,
      baseColor,
      targetAngle: angle,
      targetDistance: distance,
      targetYOffset: yOffset,
      startAngle: angle,
      startDistance: distance,
      circularizeSpeed: 0.8 + Math.random() * 0.4,
    });
  }
}
