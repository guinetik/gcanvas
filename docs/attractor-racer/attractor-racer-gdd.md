# Attractor Racer - Game Design Document

## Core Concept

A 3D racing game where each track exists within the phase space of a strange attractor (Lorenz, Thomas, Aizawa, etc.). Players pilot a ship through carefully designed routes that follow sections of the attractor's natural flow.

**Key Principle**: You're not racing the entire fractal - each level is a curated segment of the attractor space, with progressive levels exploring more of the structure until the final stage where you ride the complete attractor into its vortex/core.

---

## Level Structure

### Track Design Philosophy

- **Attractor as Environment**: The full attractor renders in the background as flowing particle trails, creating the visual world
- **Route as Track**: A specific path is marked through a section of the attractor space
- **Flat Space Selection**: Choose relatively flat/stable regions of the attractor for track placement
- **Loop Design**: Routes go out to a specific point in space, then loop back to origin
- **Not the Whole Thing**: Each track is a manageable segment, not the entire chaotic structure

### Progression Model

**Early Levels** (e.g., Lorenz Circuit 1-3)
- Simple loops in stable outer regions
- Gentle curves following natural flow
- Short segments with predictable turns

**Mid Levels** (e.g., Lorenz Circuit 4-6)
- Longer routes venturing deeper
- Multiple loops combining different regions
- Introduction to velocity transitions (slow curves → fast straightaways)

**Final Level** (e.g., Lorenz: The Descent)
- Full attractor ride
- Follow the complete trajectory into the vortex
- Maximum speed, maximum chaos
- Culmination of learned skills

---

## Camera System

**This is the critical system that needs to be perfect.**

### Core Requirements

1. **Follow Smoothing**: Camera must smoothly track ship position without jarring movements
2. **Look-Ahead**: Camera needs to anticipate trajectory so player can see upcoming turns
3. **Speed-Responsive**: Camera behavior changes with ship velocity
4. **Orientation Stable**: Prevent camera roll/spin that causes motion sickness
5. **Formation Mode**: Allow free exploration before race starts

### Hard Constraints (Non-Negotiable)

**These rules prevent motion sickness and disorientation:**

1. **No Upside-Down**: Camera roll must never exceed ±90 degrees - world stays right-side-up
2. **Forward-Facing Lock**: Camera always looks in ship's forward direction - if ship goes forward, camera shows forward (never backwards/flipped)
3. **Smooth Rotations Only**: No sudden camera snaps or instant 180° flips
4. **Player Perception**: Even when ship travels through loops/twists in 3D space, player should always feel like they're on flat ground - the WORLD rotates around them, not the camera flipping

### Camera Behaviors by Context

#### Formation / Exploration Mode
- Player can freely rotate camera around ship (drag to rotate, pinch/scroll to zoom)
- Ship is stationary or slow-moving
- Shows the full attractor environment
- No automatic tracking
- Used for: level preview, photo mode, "appreciate the geometry"

#### Racing Mode (CRITICAL - THIS IS THE PROBLEM)
- Camera locks into follow mode when racing starts
- Must handle:
  - **Smooth following** - Ship moves but camera lags slightly with easing
  - **Look-ahead prediction** - Camera aims toward where ship is going, not just where it is
  - **Height/distance control** - Pull back at high speeds? Tilt up?
  - **Curve anticipation** - On tight turns, camera should swing wide to keep track visible
  - **Velocity transitions** - Smooth camera adjustments when ship accelerates/decelerates
  - **Banking/tilting** - Gentle banking for turns (±15°) but never full roll

### Technical Implementation: Rail Camera System

**Reference: F-Zero GX approach - spline-following camera with stabilized up vector**

The core problem: Ship follows 3D attractor trajectory that can loop, twist, go upside down. If camera naively follows ship orientation, it flips when trajectory flips. Solution: decouple ship's 3D position from camera's up vector.

#### System Components

**1. Route Representation**
- Pre-compute route as array of 3D points along attractor segment
- Store point positions: `{x, y, z}` at regular intervals
- Calculate route normals/tangents at each point for reference

**2. Track Position System**
- Find ship's current position on route (closest point + progress parameter `t`)
- Parameter `t` ranges from 0 (start) to 1 (finish)
- Track distance traveled along route for lap timing

**3. Look-Ahead Sampling**
- Sample route at `t + lookAheadDistance` (3-5 seconds ahead at current speed)
- This point becomes camera's look target
- Dynamic look-ahead: faster speed = look further ahead

**4. Up Vector Stabilization** (THE CRITICAL PART)
```
// Stable reference
worldUp = (0, 1, 0)  // Always points "up" in world space

// Track's local orientation at ship position
trackNormal = perpendicular to trajectory at current point

// Blend between world-up and track normal
// bankingAmount = 0 to 1 (how much to bank in turns)
desiredUp = lerp(worldUp, trackNormal, bankingAmount)

// Safety check: prevent flipping
if (dot(desiredUp, worldUp) < 0) {
  // Up vector pointing down - snap to world up
  desiredUp = worldUp
}

// Smooth interpolation to prevent jarring
cameraUp = lerp(cameraUp, desiredUp, smoothingFactor)
```

**5. Camera Transform Construction**
```
// Build orthonormal basis for camera
forward = normalize(lookAheadPoint - cameraPosition)
right = normalize(cross(forward, cameraUp))
up = cross(right, forward)  // Recompute to ensure orthogonal basis

// These vectors define camera orientation
// Convert to rotation matrix or quaternion for rendering
```

**6. Position Following**
```
// Camera offset behind and above ship
offset = ship.forward * -distance + ship.up * height

// Target position with offset
targetPosition = ship.position + offset

// Smooth follow with easing
cameraPosition = lerp(cameraPosition, targetPosition, followSpeed)
```

#### Camera Parameters

**Racing Mode Settings:**
- `followDistance`: 20-30 units behind ship
- `followHeight`: 5-10 units above ship
- `lookAheadDistance`: 3-5 seconds of travel at current speed
- `bankingAmount`: 0.2-0.3 (gentle banking, not full roll)
- `upVectorSmoothness`: 0.1-0.2 (smooth transitions)
- `followSpeed`: 0.15 (position lerp speed)

**Speed-Responsive Adjustments:**
- High speed: pull back distance, increase look-ahead
- Low speed: closer camera, shorter look-ahead
- Boost active: wider FOV effect, pull back slightly

### Camera Problems to Solve

**Current Issues:**
- Camera gets "stuck" or jumps unexpectedly
- Can't see upcoming track sections during high-speed runs
- Disorienting when ship changes direction rapidly
- Following the attractor's natural 3D curves makes camera spin/roll
- **Root cause**: No up vector stabilization - camera inherits ship's full 3D orientation

**Solution via Rail Camera:**
- Pre-computed route provides stable reference
- Look-ahead shows track ahead naturally
- Up vector stabilization prevents flipping
- Smooth interpolation eliminates jarring

**Desired Feel:**
- Like F-Zero GX / Wipeout third-person camera
- Smooth, predictable, never fights the player
- Shows enough track ahead to make split-second decisions
- Feels fast but controllable
- Player always feels "right-side-up" even through impossible geometry

---

## Ship Controls

### Control Scheme
- **Steer**: Arrow keys or WASD
- **Throttle / Brake**: W/S or Up/Down
- **Boost**: Spacebar (drains energy)
- **Reset**: R (if you detach from track)

### Physics Behavior
- Ship wants to follow the attractor's natural flow (attraction force)
- Player input modifies trajectory within bounds
- **Detach Mechanic**: Drift too far from the route → lose attraction → fall into void → respawn
- Energy system: boost drains energy, coasting recharges
- Speed varies naturally with attractor velocity (blue = slow curves, red = fast sections)

---

## Visual Design

### Attractor Environment
- Particle trails render full attractor in background
- Velocity-based coloring (blue=slow, cyan→magenta→red=fast)
- Additive blending creates glowing, ethereal look
- Creates sense of "riding through a living mathematical structure"

### Track Marking
- Route needs clear visual distinction from background attractor
- Options: brighter trail, different color, pulsing energy ribbon, holographic markers
- Must be visible against particle trails but not obscure them

### Ship Design
- Glowing shader that stands out against track
- Energy state visualization (color shift, intensity, particle effects)
- Boost effect (trail intensifies, speed lines, sound)

---

## Core Gameplay Loop

1. **Formation**: Explore level, understand the route, see the attractor geometry
2. **Race Start**: Camera locks, ship accelerates, timer begins
3. **Navigate**: Follow route through attractor space, manage speed and energy
4. **Survive**: Don't detach from track (distance threshold)
5. **Complete**: Reach finish point (or complete full attractor ride in final level)
6. **Progress**: Unlock next circuit in attractor, or next attractor entirely

---

## Success Criteria

### What "Good" Looks Like

**Camera**:
- Player can see 3-5 seconds ahead of ship position
- No unexpected jumps or rotations
- Smooth transitions between speed ranges
- Can anticipate turns before reaching them

**Ship**:
- Feels fast but controllable
- Clear feedback when approaching detach distance
- Boost feels powerful and risky (speed vs energy management)

**Track**:
- Route is always visible and distinguishable
- Natural flow feels intuitive (when to accelerate, when to brake)
- Difficulty comes from speed/energy management, not camera fighting

---

## Open Questions

1. **Camera**: What's the right balance between "show the track ahead" and "show the beautiful environment"?
2. **Difficulty**: Should detach distance be forgiving (arcade) or punishing (sim)?
3. **Route Visualization**: How do we mark the path without cluttering the attractor beauty?
4. **Time Attack vs Survival**: Is this about fastest lap, or just completing the route?
5. **Multiplayer**: Ghost data for time trials? Or focus on single-player mastery?

---

## Next Steps

### Priority 1: Implement Rail Camera System

**Prerequisites:**
1. **Route pre-computation system**
   - Convert attractor segment to array of waypoints `{x, y, z, tangent, normal}`
   - Store positions at regular intervals along chosen path
   - Build spatial lookup for finding closest route point to ship position

2. **Ship route tracking**
   - Find current position parameter `t` (0 to 1) on route
   - Track progress/distance traveled for timing
   - Calculate ship's forward direction from route tangent at current point

3. **RacingCamera class** (extends or replaces Camera3D for racing mode)
   - Implement look-ahead sampling (sample route at `t + lookAheadDistance`)
   - Up vector stabilization with world-up reference
   - Orthonormal basis construction (forward/right/up vectors)
   - Speed-responsive camera distance and FOV adjustments
   - Smooth interpolation for all transforms

**Implementation Approach:**
- Start with simple straight test route to verify camera basics
- Add curves to test up vector stabilization under rotation
- Test with actual Lorenz attractor segment
- Tune parameters (follow distance, banking amount, look-ahead) for feel
- Implement Formation mode (free camera) vs Racing mode toggle

**Success Criteria:**
- No camera flipping or sudden rotations
- Player can see 3-5 seconds ahead at all speeds
- Camera feels smooth through loops and twists
- World appears to rotate around player, not vice versa

### Priority 2: Refine Ship Physics
- Once camera works, tune ship control feel
- Implement attractor attraction force vs player steering input
- Define detach distance threshold and respawn behavior
- Balance boost/energy drain mechanics

### Priority 3: Route Visualization
- Test different track marking methods
- Ensure route visibility against attractor particle trails
- Consider: energy ribbons, holographic waypoint markers, pulsing guide trails
- Maintain visual hierarchy (track markers > attractor ambience)

### Priority 4: Level Design
- Design actual playable routes through Lorenz attractor sections
- Create progression: simple outer loops → complex inner paths → full vortex descent
- Test each circuit for camera stability and player comprehension
- Balance difficulty (route complexity vs speed requirements)

### Priority 5: Visual Polish
- Ship shader with energy state indication
- Boost particle effects and trails
- UI elements (speed gauge, energy meter, lap timer, position indicator)
- Audio feedback for speed, boost, warnings
