# Axisymmetric CPU reference — Thom wall validation

**Date:** 2026-09-11. **Result:** The tested closed-cylinder cases support
retaining Thom's baseline closure. Wall slip and global solution errors
decrease under refinement; no extra wall/elliptic iteration was needed.
This extends the [phase 1 results](2026-09-11-ns-axisym-cpu-validation.md).

## Boundary implementation

`noSlipBoundary()` supplies stationary walls with a = 0 and psi = 0.
The evolved variables remain a, chi, and phi with psi = r² phi. Each RK
preparation solves the potential first and then refreshes Thom vorticity
from that solved potential, including initialization and final publication.

For distance d = h/2 between a wall and the first interior center:

```text
outer wall: chi_wall = -2 psi_near/(R² d²)
                     = -8 (r_near/R)² phi_near/dr²
end caps:  chi_wall = -8 phi_near/dz²
```

The radial conversion factor is essential. Thom's estimate is locally
first order; second-order behavior is measured here, rather than assumed
for every flow or norm. The classical background is E and Liu,
[Vorticity Boundary Condition and Related Issues for Finite Difference
Schemes](https://web.math.princeton.edu/~weinan/pdf%20files/vorticity.pdf),
J. Comput. Phys. 124 (1996), 368–382. The cell-centered cylindrical
adaptation and its validation are specific to this implementation.

For any prescribed wall scalar f0 and interior samples f1, f2 at h/2,
3h/2, the two exterior ghosts are:

```text
f(-h/2)  = (8 f0 + f2)/3 - 2 f1
f(-3h/2) = 8 f0 + 2 f2 - 9 f1
```

This quadratic continuation supplies Dirichlet geometry; it does not
upgrade the Thom estimate. Potential rows eliminate those ghosts directly:
for an outward coefficient c, add 2c to the diagonal and c/3 to the
opposite interior neighbor. Tests compare the eliminated rows with direct
ghost-stencil application on an unequal-spacing rectangular grid.

Fill radial exterior ghosts, then axial ghosts (including the exterior
radial columns), then even axis ghosts. This gives a deterministic corner
extension. Evolution reads face strips; corner interpolation reads the
diagonal strips. Physical boundary corner psi is exactly zero, hence
normal face flux is zero at both caps and both radial endpoints.

Tangential slip is independently estimated from the first two interior
streamfunction samples: |9 psi1 - psi2|/(3 h r_wall), with the regular
r phi equivalent on the caps. It is not read from prescribed wall velocity.
Tests include the first/last wall-adjacent samples and a deliberately
non-clamped potential that must produce substantial slip. Diagnostics
expose `maxWallSlip` only for the no-slip policy.

The explicit time-step calculation uses the eliminated diagonal with a
conservative factor of four for the potential-dependent wall diffusion.
This is a tested safety allowance, not a stability theorem. Transport and
source limits, stage checks, and atomic accepted-state publication remain
active.

## Coupled manufactured refinement

Domain R = 1, Z = 0.5, viscosity 0.05, endpoint 0.02. Let
F = 1-r²/R² and G = 1-z²/Z²:

```text
a   = 0.15 exp(-0.1t) F G
phi = 0.02 exp(-0.2t) F² G²
chi = -L5 phi
```

The forcing is computed from independent continuous derivatives in the
test fixture; all transport, diffusion, and swirl couplings are active.
Both psi and its normal derivative vanish on the physical walls.
Errors are cylindrical-volume-weighted L2, except the maximum wall slip.

| Quantity | 16² error | 32² error | 64² error | Successive orders |
|---|---:|---:|---:|---|
| a | 2.23944e-6 | 4.70838e-7 | 1.02335e-7 | 2.250, 2.202 |
| chi | 3.06127e-3 | 9.72133e-4 | 2.57528e-4 | 1.655, 1.916 |
| phi | 6.60776e-5 | 1.81492e-5 | 4.76641e-6 | 1.864, 1.929 |
| ur | 7.91576e-5 | 2.20620e-5 | 6.13010e-6 | 1.843, 1.848 |
| uz | 1.01641e-4 | 2.79337e-5 | 7.42077e-6 | 1.863, 1.912 |
| Maximum wall slip | 7.48227e-4 | 2.02846e-4 | 5.22101e-5 | 1.883, 1.958 |

The initial 8² exploratory run was pre-asymptotic: chi order from 8² to
16² was 0.435 and slip order was 1.642. Extending the grid family to 64²
resolved that question without changing the closure or loosening the
velocity/slip threshold. The automated study requires orders above 1.7
for a, phi, velocities and slip, and above 1.5 for chi. These are practical
acceptance bands for the documented family, not universal order claims.
Maximum, axis-row, and boundary-strip errors are printed alongside L2;
at 64² maximum chi error is 2.180e-3, so L2 does not conceal a claim of
uniformly tiny local vorticity error.

All grids reach exactly 0.02 with 40, 74, and 293 accepted steps and zero
retries. Step sizes are capped at 5e-4; the fine grid uses about 6.83e-5.
Poisson residuals stay below 1e-11, with relative tolerance zero.

At 16², halving the cap to 2.5e-4 changes chi by 4.23244e-7 in L2, about
0.014% of its spatial error. Tightening Poisson tolerance separately to
1e-13 changes chi by 8.44e-13. Both checks also bound changes in a and phi
below 1% of their spatial errors.

## Unforced energy budget

Use the same initial fields with forcing removed. Integrate
nu integral |omega|² dV dt by trapezoidal quadrature of the full-vector
enstrophy diagnostic. The measured defect is
|E(t)-E(0)+integrated_dissipation|/E(0).

| Grid | E(0) | E(0.02) | Integrated dissipation | Relative budget defect |
|---|---:|---:|---:|---:|
| 8² | 1.805975e-3 | 1.705352e-3 | 9.821609e-5 | 0.13327% |
| 16² | 1.808711e-3 | 1.707635e-3 | 1.003722e-4 | 0.03887% |
| 32² | 1.809030e-3 | 1.707786e-3 | 1.010187e-4 | 0.01243% |

Energy decreases at every accepted step. Defect orders are 1.777 and
1.645. The test requires decreasing energy, defect orders above 1.5,
and a fine-grid defect below 1%. This checks convergence of the discrete
budget; the scheme does not impose exact discrete energy conservation.

## Interacting-ring preset

`interactingRingsPreset` records its parameters in `config`. Define
b(x) = exp(1-1/(1-x²)) for |x| < 1, otherwise zero. With radial bump br
and axial bumps bplus/bminus centered at z = +/- separation/2:

```text
a   = swirlStrength * br * (bplus - bminus)
phi = meridionalStrength * br * (bplus + bminus)
chi = -L5 phi, evaluated by analytic bump derivatives
```

Defaults: R = Z = 1, ringRadius = 0.5, radialWidth = axialWidth = 0.2,
separation = 0.6, swirlStrength = 1, meridionalStrength = 0. Viscosity
must be supplied. Widths are support half-widths. Supports must be disjoint,
strictly inside the walls, and away from the axis. The axis is then regular
by exact zero extension. An optional nonzero potential supplies initial
meridional motion; the numerical initial potential is obtained by Poisson
inversion of the analytic chi samples.

The preset rejects mismatched domains/viscosities/boundaries and a solver
with an external source. Tests check support, opposite signs, independent
potential differentiation, subsequent chi creation from initially zero chi,
finite diagnostics, energy decay, and divergence below 1e-12 on 24x48.
These are initialization and short evolution checks, not a resolution study
of a developed ring interaction.

## Reproduction and scope

The complete native Node run passed **530 tests in 33 files**, including
**41 axisymmetric reference tests in seven files**, in **130.67 seconds**
on this workstation. The wall file took 94.63 seconds, including 91.83
seconds for the 16²/32²/64² refinement. Existing phase 1 benchmark orders
and coupled temporal order remain unchanged.

The Vite production build and both Terser minifications passed. Vite still
reports the existing output-format and duplicate `probabilityDensity`
export warnings. `git diff --check` passed. The reference is imported
through `src/math/ns-axisym.js`; it is not added to the top-level GCanvas
bundle exports.

```bash
node node_modules/vitest/vitest.mjs run test/ns-axisym --pool=threads --maxWorkers=1 --minWorkers=1
```

Omit `test/ns-axisym` for the full repository suite. The new `walls` and
`rings` files add ten tests; the wall refinement is intentionally slower
than unit tests. Machine-readable `NS_THOM_*` records include measured
errors, orders, solver residuals, and calibration differences.

GPU/f32 parity, browser performance, high-Reynolds-number or long-time
ring behavior, and the UI remain unvalidated. These finite CPU tests do
not establish blowup or global regularity.
