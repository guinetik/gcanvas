# Driven vortices and manual stirring

The default in `demos/ns-lab.html` is now **Driven vortices · continuous**.
Decaying swirl rings and both analytic validation presets remain available;
the lab stays under Physics. This is a single-fluid, externally forced
axisymmetric flow, not a thermal or multiphase lava-lamp simulation.

## Automatic drive

The preset adds an azimuthal body force through the existing solver source
interface: `f_theta = r S_a`, with no direct external source in the chi
equation. Two smooth compact torque regions reverse out of phase and drift
within the cylinder. Strength defaults to 3; the torque period is 2.4 units
of simulation time. A slower incommensurate radial drift also changes the
geometry of the drive. Source evaluation uses the physical RK stage time,
including retries. Numerical equations, boundary policies, timestep guards,
and Poisson tolerances have not been relaxed.

Strength and period controls reset the run. Strength zero disables the
automatic drive; manual gestures can still add energy. The scalar color
range remains fixed at initialization. Direction arrows remain normalized
direction indicators, not particle traces or a speed scale.

The 32×64 default-grid regression ran to **t = 6.01478**, through **4,432
accepted steps** and more than two drive periods. Between successive late
quarter-period samples, the scalar image changed by **32–41%** (summed
absolute RGB difference divided by prior summed RGB signal). Late peak
speed stayed between **0.43 and 0.55**. Energy varied between approximately
0.023 and 0.040 over those samples rather than simply decaying to zero.

The run passed all 22 checks in about 150 seconds on the recorded Chrome /
NVIDIA GPU setup. Pausing preserved both time and image; switching strength
to zero reset successfully and subsequently reduced energy. No full-field
readbacks were needed for these visual checks. This finite-duration check
establishes ongoing visible evolution over the tested interval, not
long-time numerical convergence or a performance guarantee for other GPUs.

Evidence: [driven-results.json](2026-09-12-ns-axisym-driven-results.json).

## Pointer and touch input

In the driven preset, tapping or dragging queues compact swirl pulses at
the selected radius and height. Both mirrored halves depict the same ring.
The Positive/Negative control selects torque direction; Shift reverses it.
Pulse support is clamped inside the walls and away from the axis. An outline
shows that support; it is an input indicator, not a simulated particle.

Pulses last 0.5 units of physical simulation time, have smooth temporal
envelopes, and are bounded to eight active pulses. Nearby repeated gestures
are coalesced. Events are queued until the next accepted-step boundary so
they cannot change forcing partway through an in-flight RK step. Paused
gestures wait for Play or Step. Reset clears pending and active pulses.
The analytic and unforced presets do not accept manual stirring.

Eleven focused unit tests cover preset parameters, bounded force support,
time reversal and repeatable stage sampling, zero-drive behavior, pulse
duration and sign, and reset initialization. The browser integration suite
compares a mouse-stirred run with a zero-drive baseline; at about t = 0.26,
the radial profile's maximum swirl-velocity difference was **0.778**.
It also verifies pause semantics, clearing pulses on reset, mirrored input,
native touch dispatch, and desktop/mobile layout.

All **45 browser integration checks** pass. Evidence:
[interaction-results.json](2026-09-12-ns-axisym-interaction-results.json).

## Reproduce

```sh
node node_modules/vitest/vitest.mjs run test/ns-axisym/lab-model.test.js test/ns-axisym/stir.test.js --pool=threads --maxWorkers=1 --minWorkers=1
node scripts/validate-ns-webgpu.mjs --driven --output driven-results.json
node scripts/validate-ns-webgpu.mjs --lab --screenshot lab.png --output lab-results.json
```

Run browser validations sequentially; they share a local server port.
