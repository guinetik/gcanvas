export const CONFIG = {
    // Sizing (as fraction of screen baseScale)
    bhRadiusRatio: 0.05,        // Initial dormant black hole size (larger for visible lensing)
    bhFinalRadiusRatio: 0.12,   // Final size after consuming star
    starRadiusRatio: 0.08,

    // Phase durations (seconds)
    durations: {
        approach: 5.0,      // Stable wide orbit
        stretch: 10.0,       // Orbit begins to decay
        disrupt: 15.0,      // Mass transfer (event-based exit)
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
        initialOrbitRadius: 0.85, // Semi-major axis - wide orbit across screen
        eccentricity: 0.3, // Orbital eccentricity (reduced for wider orbit)
        orbitSpeed: 0.35,
        decayRate: 0.4, // Decay factor for exponential radius reduction
        massTransferStart: 0.1, // Start mass transfer at 50% of decay phase
        rotationSpeed: 0.71, // Self-rotation speed (radians/second) - visible rotation
        temperature: 3800, // Kelvin - cool red dwarf, heats up dramatically under tidal stress
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
