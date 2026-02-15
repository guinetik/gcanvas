// Project 3D point to 2D screen with camera
vec2 project(vec3 p, vec3 camPos, vec3 camTarget, float zoom) {
    // Build camera basis
    vec3 forward = normalize(camTarget - camPos);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    
    // Transform point to camera space
    vec3 relPos = p - camPos;
    vec3 camSpace = vec3(
        dot(relPos, right),
        dot(relPos, up),
        dot(relPos, forward)
    );
    
    // Perspective projection
    if (camSpace.z <= 0.0) return vec2(1000.0); // Behind camera
    vec2 screen = camSpace.xy / camSpace.z * zoom;
    return screen;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 screenUV = uv;
    screenUV -= 0.5;
    screenUV.x *= ar;
    
    vec3 col = vec3(0.0);
    //screenUV.y -= 0.15;
    // Mouse orbit camera
    // Read saved camera state from corner pixel
    vec2 savedState = texture(iChannel1, vec2(0.5/iResolution.x, 0.5/iResolution.y)).rg;
    float orbitAngle = savedState.r * 6.28318;
    float orbitHeight = (savedState.g - 0.5) * 40.0;
    float orbitDist = 140.0;
    
    // Update camera state if mouse is pressed
    vec2 mouse = iMouse.xy / iResolution.xy;
    if (iMouse.z > 0.0) {
        orbitAngle = (mouse.x - 0.5) * 6.28318; // Full rotation
        orbitHeight = (mouse.y - 0.5) * 40.0; // -20 to +20
        
    }
    //orbitAngle += sin(time);
    
    
    // Save camera state to corner pixel
    if (fragCoord.x < 1.0 && fragCoord.y < 1.0) {
        fragColor = vec4(orbitAngle / 6.28318, orbitHeight / 40.0 + 0.5, 0.0, 1.0);
        return;
    }
    orbitAngle += time/4.;
    screenUV.x -= sin(orbitAngle)*0.33;
    // Build camera from orbit parameters
    vec3 camPos = vec3(
        sin(orbitAngle) * orbitDist,
        orbitHeight,
        cos(orbitAngle) * orbitDist
    );
    vec3 camTarget = vec3(0.0, 0.0, 0.0);
    float zoom = 1.5;
    
    // Visualize particle states from iChannel0
    int numSamples = 600;
    for (int t = 0; t < 600; t++) {
        float sampleIdx = float(t);
        
        // Sample particle position from buffer
        vec2 sampleUV = vec2(
            (sampleIdx + 0.5) / 5.0,
            0.5
        );
        
        // Distribute samples across texture
        sampleUV.x = mod(sampleIdx, iResolution.x) / iResolution.x;
        sampleUV.y = floor(sampleIdx / iResolution.x) / iResolution.y;
        sampleUV += 0.5 / iResolution.xy;
        
        vec3 encoded = texture(iChannel0, sampleUV).rgb;
        vec3 p = encoded * 50.0 - 25.0; // Decode from [0,1] to Lorenz space
        
        // Skip if uninitialized
        if (length(p) < 0.1) continue;
        
        // Project to screen with camera
        vec2 pos2D = project(p, camPos, camTarget, zoom);
        
        // Draw particle
        float d = length(screenUV - pos2D);
        float particleSize = 0.005;
        
        // Color based on Z coordinate
        vec3 particleCol = 0.5 + 0.5 * cos(6.28318 * (p.z * 0.02 + vec3(0.0, 0.33, 0.67)));
        
        col += particleCol * smoothstep(particleSize, 0.0, d) * 0.15;
        //col += particleCol * 0.01 / (d + 0.01); // Glow
    }
    col += texture(iChannel1,uv).rgb*0.98;
    fragColor = vec4(col, 1.0);
}