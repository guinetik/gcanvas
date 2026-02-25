// arrakis
// "arrakis is so beautiful when the sun is low"
// the desert planet — twin suns arc across the sky,
// spice-laden winds, heat shimmer, and the worm's domain

#define PI 3.14159265359
#define TAU 6.28318530718

// ── noise primitives ──────────────────────────────────────────

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash21(float p) {
    return fract(sin(p * 127.1) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1, 0)), f.x),
        mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
        f.y
    );
}

float fbm(vec2 p, int octaves) {
    float v = 0.0, a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// ── palettes ──────────────────────────────────────────────────

vec3 sandPalette(float t) {
    // warm desert golds → burnt orange → deep rust → bleached bone
    vec3 a = vec3(0.78, 0.50, 0.28);
    vec3 b = vec3(0.28, 0.20, 0.12);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.00, 0.15, 0.25);
    return a + b * cos(TAU * (c * t + d));
}

vec3 spicePalette(float t) {
    // melange purple → violet → deep indigo
    vec3 a = vec3(0.55, 0.20, 0.65);
    vec3 b = vec3(0.30, 0.15, 0.25);
    vec3 c = vec3(1.0, 0.8, 0.6);
    vec3 d = vec3(0.10, 0.25, 0.50);
    return a + b * cos(TAU * (c * t + d));
}

vec3 skyPalette(float t) {
    // pale amber zenith → burnt horizon
    vec3 a = vec3(0.90, 0.72, 0.48);
    vec3 b = vec3(0.15, 0.12, 0.10);
    vec3 c = vec3(0.5, 0.5, 0.3);
    vec3 d = vec3(0.25, 0.30, 0.40);
    return a + b * cos(TAU * (c * t + d));
}

// ── dune terrain ──────────────────────────────────────────────

// sharp asymmetric dune ridge — steep slip face, gentle windward slope
float duneRidge(float x) {
    float s = sin(x);
    // sharpen the peaks, flatten the troughs
    return s * s * sign(s) * 0.5 + 0.5 * s;
}

float duneHeight(vec2 p, float time) {
    // 1. regional mask — cheap single noise instead of fbm
    float region = noise(p * 0.025 + time * 0.002);
    float duneMask = smoothstep(0.30, 0.55, region);

    // 2. flat basin floor
    float basin = noise(p * 0.04) * 0.3 - 0.5;

    // 3. primary mega-dunes
    float megaDune = duneRidge(p.x * 0.12 + p.y * 0.28 + time * 0.008) * 3.5
                   + duneRidge(p.x * 0.22 - p.y * 0.10 + time * 0.005) * 1.8;
    // height variation — single noise lookup instead of fbm
    megaDune *= 0.5 + noise(p * 0.05 + vec2(3.7, 8.1));

    // 4. medium dunes
    float medDune = duneRidge(p.x * 0.5 + p.y * 1.5 + time * 0.015) * 0.6
                  + duneRidge(p.x * 0.8 - p.y * 0.4 + time * 0.012) * 0.35;

    // 5. wind ripples — single layer
    float ripple = noise(p * vec2(8.0, 3.0) + vec2(time * 0.1, 0.0)) * 0.09;

    float h = basin;
    h += (megaDune + medDune) * duneMask;
    h += ripple * (0.2 + 0.8 * duneMask);

    return h;
}

// ── ray marching the dune field ───────────────────────────────

float terrainMap(vec3 p, float time) {
    return p.y - duneHeight(p.xz, time);
}

vec3 terrainNormal(vec3 p, float time) {
    vec2 e = vec2(0.03, 0.0);
    return normalize(vec3(
        terrainMap(p + e.xyy, time) - terrainMap(p - e.xyy, time),
        terrainMap(p + e.yxy, time) - terrainMap(p - e.yxy, time),
        terrainMap(p + e.yyx, time) - terrainMap(p - e.yyx, time)
    ));
}

float marchTerrain(vec3 ro, vec3 rd, float time) {
    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = terrainMap(p, time);
        if (d < 0.005 * t) return t;
        if (t > 180.0) break;
        t += d * 0.7 + 0.02;
    }
    return -1.0;
}

// ── twin suns ─────────────────────────────────────────────────

vec3 sun(vec2 uv, vec2 pos, float size, vec3 color, float halo) {
    float d = length(uv - pos);
    vec3 col = vec3(0.0);
    // core
    col += color * smoothstep(size, size * 0.2, d);
    // corona
    col += color * 0.6 * exp(-d * d * halo);
    // outer halo
    col += color * 0.15 * exp(-d * 3.0);
    return col;
}

// ── sandworm track ────────────────────────────────────────────

float wormTrack(vec2 p, float time) {
    // sinuous path carved through the sand
    float wormX = sin(p.y * 0.12 + time * 0.08) * 8.0
                + sin(p.y * 0.05 - time * 0.03) * 15.0;
    float dist = abs(p.x - wormX);
    // track width varies
    float width = 2.5 + sin(p.y * 0.3 + time * 0.1) * 0.8;
    return smoothstep(width, width * 0.3, dist);
}

// ── spice blow ────────────────────────────────────────────────

vec3 spiceBlow(vec2 uv, float time) {
    vec3 col = vec3(0.0);

    // sporadic eruption — only one burst at a time, cycles every ~15s
    for (float i = 0.0; i < 3.0; i++) {
        // each eruption has its own phase, only briefly burst
        float phase = sin(time * 0.2 + i * 2.09) * 0.5 + 0.5;
        float burst = smoothstep(0.7, 0.85, phase) * smoothstep(1.0, 0.92, phase);
        if (burst < 0.01) continue;

        vec2 center = vec2(
            sin(time * 0.03 + i * 2.09) * 0.25,
            cos(time * 0.02 + i * 1.73) * 0.1 - 0.05
        );

        float d = length(uv - center);
        // tight, small cloud — not a screen-filling blanket
        float cloud = fbm((uv - center) * 14.0 + time * 0.3, 4);
        float mask = exp(-d * d * 60.0) * burst;
        col += spicePalette(cloud + i * 0.33) * mask * cloud * 0.5;

        // small bright core flash
        col += vec3(0.7, 0.4, 1.0) * exp(-d * d * 200.0) * burst * 0.3;
    }

    return col;
}

// ── heat distortion ───────────────────────────────────────────

vec2 heatHaze(vec2 uv, float time) {
    float distort = noise(uv * vec2(3.0, 20.0) + vec2(0.0, time * 0.8)) * 2.0 - 1.0;
    distort += noise(uv * vec2(5.0, 35.0) + vec2(time * 0.3, time * 1.2)) * 0.5;
    // stronger near the horizon
    float horizonMask = smoothstep(0.1, -0.15, uv.y);
    return vec2(distort * 0.006 * horizonMask, distort * 0.003 * horizonMask);
}

// ── main ──────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
    float time = iTime;

    // ── day/night cycle — ~80s full rotation ─────────────
    // phases (in dayCycle 0→1):
    //   0.00–0.10  dawn / sunrise (sun climbs from below horizon)
    //   0.10–0.20  golden hour morning (sun low, warm light)
    //   0.20–0.45  midday (sun at peak)
    //   0.45–0.55  golden hour evening (sun sinking, long shadows)
    //   0.55–0.65  sunset (sun on the horizon, deep reds)
    //   0.65–0.70  dusk (sun gone, sky fading)
    //   0.70–0.95  night (moons arc across)
    //   0.95–1.00  pre-dawn (sky lightening)
    float dayCycle = fract(time / 80.0 + 0.15); // offset so t=0 starts in morning

    // sun elevation — uses sin curve but remapped to spend more time low
    float sunPhase = smoothstep(0.0, 0.65, dayCycle); // 0→1 over the sun's journey
    float sunElev = 0.0;
    if (dayCycle < 0.65) {
        // sin arc: rises at 0, peaks at ~0.32, sets at 0.65
        sunElev = sin(sunPhase * PI) * 0.30;
    } else if (dayCycle < 0.70) {
        // dusk: sun sinks below horizon
        float duskT = (dayCycle - 0.65) / 0.05;
        sunElev = -0.3 * duskT;
    } else {
        sunElev = -0.3; // fully below
    }

    float daylight = smoothstep(-0.02, 0.06, sunElev);
    // sunset factor: wide window when sun is low but still visible
    float sunsetFactor = smoothstep(0.15, 0.03, sunElev) * smoothstep(-0.01, 0.01, sunElev);

    // sun screen position: sweeps left→right, stops at edge when setting
    float sunScreenX = mix(-0.50, 0.55, clamp(dayCycle / 0.65, 0.0, 1.0));
    float sunScreenY = max(sunElev, -0.08) * 0.9; // sinks just below horizon line

    // world-space sun direction for lighting
    vec3 sunDir1 = normalize(vec3(sunScreenX, max(sunElev, 0.01), 1.0));
    vec3 sunDir2 = normalize(vec3(sunScreenX - 0.12, max(sunElev * 0.8, 0.01), 1.0));

    // moon: arcs across during night (0.70–0.95), with rise/set at horizon
    float moonStart = 0.70;
    float moonEnd = 0.97;
    float nightPhase = clamp((dayCycle - moonStart) / (moonEnd - moonStart), 0.0, 1.0);
    float moonElev = 0.0;
    if (dayCycle > moonStart && dayCycle < moonEnd) {
        moonElev = sin(nightPhase * PI) * 0.40;
    }
    float moonScreenX = mix(-0.45, 0.50, nightPhase);
    float moonScreenY = moonElev * 1.2;
    vec3 moonDir = normalize(vec3(moonScreenX, max(moonElev, 0.01), 1.0));
    float moonVis = smoothstep(0.0, 0.05, moonElev);

    // heat shimmer distortion — only during the day
    uv += heatHaze(uv, time) * daylight;

    // camera — high enough to see over the mega-dunes
    float camHeight = 8.0 + sin(time * 0.08) * 2.0;
    vec3 ro = vec3(time * 0.6, camHeight, time * 0.25);
    vec3 lookAt = ro + vec3(0.8, -0.25, 0.6);
    vec3 forward = normalize(lookAt - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = cross(right, forward);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up);

    // ── sky ────────────────────────────────────────────────
    vec3 col = vec3(0.0);

    float skyGrad = smoothstep(-0.1, 0.6, rd.y);
    float highSky = smoothstep(0.4, 0.9, rd.y);

    // day sky
    vec3 dayHorizon = vec3(0.95, 0.55, 0.25);
    vec3 dayZenith = vec3(0.70, 0.42, 0.30);
    vec3 dayUpper = vec3(0.40, 0.22, 0.45);
    vec3 daySky = mix(dayHorizon, dayZenith, skyGrad);
    daySky = mix(daySky, dayUpper, highSky);

    // sunset sky — deep reds, oranges, purples
    vec3 sunsetHorizon = vec3(1.0, 0.30, 0.08);
    vec3 sunsetZenith = vec3(0.55, 0.18, 0.40);
    vec3 sunsetUpper = vec3(0.20, 0.08, 0.35);
    vec3 sunsetSky = mix(sunsetHorizon, sunsetZenith, skyGrad);
    sunsetSky = mix(sunsetSky, sunsetUpper, highSky);

    // night sky — deep indigo
    vec3 nightHorizon = vec3(0.06, 0.04, 0.10);
    vec3 nightZenith = vec3(0.02, 0.01, 0.06);
    vec3 nightSky = mix(nightHorizon, nightZenith, skyGrad);

    // blend: night → sunset → day → sunset → night
    vec3 sky = mix(nightSky, daySky, daylight);
    sky = mix(sky, sunsetSky, sunsetFactor);

    // atmospheric haze bands
    float hazeBand = fbm(vec2(rd.x * 3.0 + time * 0.01, rd.y * 8.0), 3);
    sky += vec3(0.15, 0.06, 0.10) * hazeBand * smoothstep(0.3, 0.0, abs(rd.y)) * daylight;

    // horizon glow — stronger at sunset, warm ember at night
    float horizonGlow = smoothstep(0.15, 0.0, abs(rd.y));
    sky += vec3(0.40, 0.12, 0.05) * horizonGlow * 0.3 * daylight;
    sky += vec3(0.80, 0.25, 0.05) * horizonGlow * 0.6 * sunsetFactor;
    sky += vec3(0.05, 0.02, 0.08) * horizonGlow * 0.3 * (1.0 - daylight); // faint night glow

    col = sky;

    // ── stars — visible at night ─────────────────────────
    float nightAmount = 1.0 - daylight;
    if (nightAmount > 0.01) {
        for (float i = 0.0; i < 5.0; i++) {
            vec2 starUV = rd.xz * (60.0 + i * 80.0) / max(rd.y, 0.01);
            vec2 starId = floor(starUV);
            vec2 starF = fract(starUV) - 0.5;
            float sh = hash(starId + i * 137.0);
            float starDist = length(starF);

            if (sh > 0.90) {
                float starBright = exp(-starDist * starDist * 400.0);
                starBright *= step(0.05, rd.y); // only above horizon
                float twinkle = 0.7 + 0.3 * sin(time * (2.0 + sh * 5.0) + sh * TAU);
                vec3 starCol = mix(vec3(0.8, 0.85, 1.0), vec3(1.0, 0.8, 0.6), sh);
                col += starCol * starBright * twinkle * nightAmount * 0.6;
            }
        }

        // a few bright guide stars
        for (float i = 0.0; i < 3.0; i++) {
            vec2 gPos = vec2(sin(i * 2.39 + 0.5) * 0.5, 0.3 + i * 0.12);
            vec2 starUV2 = vec2(dot(rd, right), dot(rd, up));
            float gDist = length(starUV2 - gPos);
            float glow = exp(-gDist * gDist * 200.0) * 0.4;
            glow += exp(-gDist * gDist * 2000.0) * 0.6;
            vec3 gCol = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.6, 0.4), i / 3.0);
            col += gCol * glow * nightAmount;
        }
    }

    // save sky before celestial bodies — terrain fog blends toward this
    vec3 skyCol = col;

    // ── twin suns — arc across the sky from horizon to horizon ──
    vec2 sun1Pos = vec2(sunScreenX, sunScreenY);
    vec2 sun2Pos = vec2(sunScreenX - 0.12, sunScreenY * 0.8 - 0.02);
    float sun1Vis = smoothstep(0.0, 0.03, sunElev);
    float sun2Vis = smoothstep(0.0, 0.03, sunElev) * 0.9;
    vec3 sun1Col = mix(vec3(1.0, 0.25, 0.02), vec3(1.0, 0.55, 0.12), smoothstep(0.0, 0.20, sunElev));
    vec3 sun2Col = mix(vec3(1.0, 0.15, 0.01), vec3(1.0, 0.40, 0.08), smoothstep(0.0, 0.20, sunElev));
    col += sun(uv, sun1Pos, 0.06, sun1Col * 1.3, 35.0) * sun1Vis;
    col += sun(uv, sun2Pos, 0.04, sun2Col * 1.2, 50.0) * sun2Vis;

    // ── terrain ────────────────────────────────────────────
    float t = marchTerrain(ro, rd, time);

    if (t > 0.0) {
        vec3 p = ro + rd * t;
        vec3 n = terrainNormal(p, time);

        // ── sand grain micro-detail ──────────────────────
        // two noise lookups, derive everything else from them
        float grainScale = 40.0 / (1.0 + t * 0.05);
        float grain1 = noise(p.xz * grainScale);
        float grain2 = noise(p.xz * grainScale + 77.7);

        // perturb normal for rough sand surface
        vec3 nGrain = normalize(n + vec3(grain1 - 0.5, 0.0, grain2 - 0.5) * 0.15);

        // diffuse from both suns
        float diff1 = max(dot(nGrain, sunDir1), 0.0) * sun1Vis;
        float diff2 = max(dot(nGrain, sunDir2), 0.0) * sun2Vis;
        float diff = diff1 * 0.7 + diff2 * 0.4;

        // specular — reuse grain noise for glint mask
        vec3 halfVec = normalize(sunDir1 - rd);
        float nDotH = max(dot(nGrain, halfVec), 0.0);
        float specRough = pow(nDotH, 8.0) * 0.12 * sun1Vis;
        float specSharp = pow(nDotH, 80.0) * grain2 * 0.5 * sun1Vis;
        float spec = specRough + specSharp;

        // ── sand color — reuse grain noise for variation ─
        float sandVar = noise(p.xz * 0.8) * 0.7 + grain1 * 0.3;
        vec3 sandCol = sandPalette(sandVar * 0.6 + 0.2);
        // micro variation from grain1
        sandCol *= 0.85 + 0.3 * grain1;
        sandCol = mix(sandCol, sandCol * vec3(1.05, 0.95, 0.85), grain1 * 0.3);

        // pores — derive from grain2 (already sampled, different offset)
        float pores = smoothstep(0.35, 0.25, grain2) * 0.15;
        sandCol *= 1.0 - pores;

        // darken wind shadow side of dunes
        float windShadow = smoothstep(0.0, 0.5, dot(n, vec3(0.7, 0.0, 0.7)));
        sandCol *= 0.6 + 0.4 * windShadow;

        // worm tracks — disturbed sand exposing spice-stained substrate
        float track = wormTrack(p.xz, time);
        vec3 trackCol = sandCol * 0.4 + vec3(0.12, 0.04, 0.15);
        sandCol = mix(sandCol, trackCol, track * 0.7);

        // ── lighting ─────────────────────────────────────
        vec3 sunLightCol = mix(vec3(1.0, 0.35, 0.10), vec3(1.0, 0.80, 0.55), smoothstep(0.0, 0.4, sunElev));
        vec3 dayAmbient = vec3(0.30, 0.20, 0.18);
        vec3 nightAmbient = vec3(0.04, 0.04, 0.08);
        vec3 ambient = mix(nightAmbient, dayAmbient, daylight);

        vec3 terrainCol = sandCol * (ambient + sunLightCol * diff);
        terrainCol += sunLightCol * spec;

        // rim light on dune crests — beautiful at sunset
        float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        vec3 rimCol = mix(vec3(1.0, 0.25, 0.08), vec3(1.0, 0.50, 0.20), smoothstep(0.0, 0.3, sunElev));
        terrainCol += rimCol * rim * 0.15 * daylight;
        // at sunset, extra-strong golden rim
        terrainCol += vec3(1.0, 0.40, 0.10) * rim * 0.25 * sunsetFactor;

        // night: moonlight from actual moon direction
        float moonDiff = max(dot(nGrain, moonDir), 0.0);
        terrainCol += vec3(0.08, 0.08, 0.18) * moonDiff * moonVis;

        // atmospheric fog — blend terrain into sky at distance (seamless horizon)
        float fogAmount = 1.0 - exp(-t * 0.008);
        fogAmount *= fogAmount;
        terrainCol = mix(terrainCol, skyCol, fogAmount);

        col = terrainCol;
    }

    // ── moons — rendered after terrain so dunes occlude them ──
    if (moonVis > 0.01 && t < 0.0) {
        // only draw moons where terrain was NOT hit (sky pixels)
        vec2 moon1Pos = vec2(moonScreenX, moonScreenY);
        float moonDist = length(uv - moon1Pos);
        float moonDisc = smoothstep(0.045, 0.035, moonDist);
        float shadow = smoothstep(0.04, 0.02, length(uv - moon1Pos + vec2(0.02, 0.01)));
        moonDisc *= 1.0 - shadow * 0.7;
        vec3 moonCol = vec3(0.75, 0.78, 0.90) * moonDisc;
        moonCol += vec3(0.3, 0.35, 0.55) * exp(-moonDist * moonDist * 60.0);
        col += moonCol * moonVis;

        vec2 moon2Pos = vec2(moonScreenX + 0.18, moonScreenY - 0.04);
        float moon2Dist = length(uv - moon2Pos);
        float moon2Disc = smoothstep(0.025, 0.018, moon2Dist);
        vec3 moon2Col = vec3(0.85, 0.75, 0.60) * moon2Disc;
        moon2Col += vec3(0.25, 0.20, 0.30) * exp(-moon2Dist * moon2Dist * 100.0);
        col += moon2Col * moonVis;
    }

    // ── spice in the atmosphere ────────────────────────────
    col += spiceBlow(uv, time);

    // ── dust in the wind — sparse drifting wisps ───────────
    float dust = fbm(uv * 3.0 + vec2(time * 0.12, time * 0.04), 5);
    float dustBreak = noise(uv * 1.5 + time * 0.03); // large-scale breakup
    float dustMask = smoothstep(0.55, 0.72, dust) * smoothstep(0.35, 0.65, dustBreak);
    dustMask *= smoothstep(0.25, -0.15, uv.y) * 0.25 * daylight;
    vec3 dustCol = mix(vec3(0.85, 0.35, 0.15), vec3(0.85, 0.55, 0.30), smoothstep(0.0, 0.3, sunElev));
    col += dustCol * dustMask;

    // ── periodic spice dust storm ────────────────────────────
    // every ~20s a wave of purple spice dust sweeps across the screen
    float stormCycle = mod(time, 20.0);
    float stormActive = smoothstep(8.0, 10.0, stormCycle) * smoothstep(16.0, 14.0, stormCycle);
    if (stormActive > 0.01) {
        // dust sweeps from left to right
        float stormProgress = (stormCycle - 9.0) / 6.0; // 0→1 over the burst window
        float waveFront = stormProgress * 3.0 - 1.0;

        // distance from the wave front
        float waveDist = uv.x - waveFront;
        float waveShape = smoothstep(0.6, 0.0, waveDist) * smoothstep(-0.8, -0.1, waveDist);

        // turbulent spice particles within the storm
        float stormNoise = fbm(uv * 6.0 + vec2(time * 0.5, time * 0.2), 5);
        float stormDetail = noise(uv * 25.0 + time * 1.5);

        // purple spice dust
        float spiceDust = waveShape * stormActive * stormNoise;
        vec3 spiceDustCol = mix(
            vec3(0.50, 0.18, 0.60), // deep purple
            vec3(0.75, 0.35, 0.85), // bright violet
            stormDetail
        );
        // add some iridescent shimmer
        spiceDustCol += vec3(0.15, 0.0, 0.2) * sin(uv.x * 30.0 + time * 3.0);
        col += spiceDustCol * spiceDust * 0.7;

        // bright spice motes within the storm
        for (float i = 0.0; i < 4.0; i++) {
            vec2 moteUV = uv * (50.0 + i * 40.0) + vec2(time * (2.0 + i), i * 7.7);
            vec2 moteId = floor(moteUV);
            vec2 moteF = fract(moteUV) - 0.5;
            float mh = hash(moteId + i * 77.0);
            float moteDist = length(moteF);
            if (mh > 0.92) {
                float flash = pow(sin(time * (5.0 + mh * 10.0) + mh * TAU) * 0.5 + 0.5, 3.0);
                float moteBright = exp(-moteDist * moteDist * 300.0) * flash * waveShape * stormActive;
                vec3 moteCol = mix(vec3(0.7, 0.3, 1.0), vec3(1.0, 0.7, 1.0), mh);
                col += moteCol * moteBright * 0.8;
            }
        }
    }

    // ── spice sparkle — tiny glints of melange ─────────────
    for (float i = 0.0; i < 3.0; i++) {
        vec2 sparkUV = uv * (80.0 + i * 60.0);
        vec2 sparkId = floor(sparkUV);
        vec2 sparkF = fract(sparkUV) - 0.5;
        float h = hash(sparkId + i * 100.0);
        float sparkDist = length(sparkF);

        if (h > 0.985) {
            float twinkle = sin(time * (3.0 + h * 8.0) + h * TAU) * 0.5 + 0.5;
            twinkle *= twinkle;
            float sparkBright = exp(-sparkDist * sparkDist * 200.0) * twinkle;
            // melange purple/violet glints among gold sand
            vec3 sparkCol = mix(vec3(1.0, 0.75, 0.25), vec3(0.6, 0.25, 1.0), h);
            col += sparkCol * sparkBright * 0.7;
        }
    }

    // ── post processing ────────────────────────────────────

    // vignette — dark edges like looking through a stillsuit visor
    float vig = 1.0 - dot(uv * 0.7, uv * 0.7);
    col *= smoothstep(-0.2, 0.5, vig);

    // subtle visor tint — stillsuit helmet, warm but not desaturating
    col = mix(col, col * vec3(1.0, 0.90, 0.85), 0.08);

    // film grain — desert grit
    col += (hash(fragCoord + fract(time * 17.0)) - 0.5) * 0.025;

    // tone mapping
    col = col / (col + 0.5);
    // gamma
    col = pow(max(col, 0.0), vec3(0.45));

    col = clamp(col, 0.0, 1.0);
    fragColor = vec4(col, 1.0);
}
