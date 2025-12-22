export const CONFIG = {
    // Sizing (as fraction of screen baseScale)
    bhRadiusRatio: 0.01,        // Initial dormant black hole size (larger for visible lensing)
    bhFinalRadiusRatio: 0.12,   // Final size after consuming star
    starRadiusRatio: 0.08,

    // Phase durations (seconds)
    durations: {
        approach: 10.0,      // Stable wide orbit
        stretch: 10.0,       // Orbit begins to decay
        disrupt: 20.0,      // Mass transfer (event-based exit)
        accrete: 1.0,       // Debris accretion
        flare: 5.0,         // Jets firing - spectacular cosmic event!
        stable: Infinity,   // Final stable state
    },

    // Flash effect (now handled by Tweenetik in FSM)

    // Physics params
    blackHole: {
        initialMass: 2,
        color: "#000",
    },
    star: {
        initialMass: 25,
        color: "#FF6030",  // Deep red-orange (cooler K/M type star)
        // Orbit sizing (fraction of half the smaller screen dimension)
        // apoapsis = initialOrbitRadius * (1 + eccentricity)
        // periapsis = initialOrbitRadius * (1 - eccentricity)
        initialOrbitRadius: 1.2,  // Semi-major axis
        eccentricity: 0.25,       // Lower = more circular, periapsis closer to edge
        // With these values:
        // periapsis (right) = 1.2 * 0.75 = 0.9 (90% to edge - visible on RIGHT side!)
        // apoapsis (left) = 1.2 * 1.25 = 1.5 (goes off screen left)
        orbitSpeed: 0.4,
        decayRate: 0.4,
        massTransferStart: 0.1,
        rotationSpeed: 0.71,
        temperature: 3800,
        orbitCenterX: 0,
        orbitCenterY: 0,
        bypassConstraints: true,
        // Start angle: star should be VISIBLE at start, then swing through orbit
        // 0 = right (periapsis), π/2 = top, π = left (apoapsis), 3π/2 = bottom
        startAngle: Math.PI * 1.85,  // Start lower-right, comes FROM right, swings up and around
    },
    sceneOptions: {
        starCount: 3000,
    },

    // Accretion disk settings
    disk: {
        innerRadiusRatio: 0.03,     // ISCO (innermost stable orbit)
        outerRadiusRatio: 0.15,     // Outer halo edge
        maxParticles: 2000,
        orbitalSpeed: 0.8,
        activationProgress: 0.8,   // Start at 80% of disrupt phase
    },
};
