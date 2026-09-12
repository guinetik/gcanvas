import { defineConfig, configDefaults, mergeConfig } from 'vitest/config';
import base from './vitest.config.js';

/**
 * Release gate config. Same as the default one, minus the suites that run for
 * minutes rather than seconds.
 *
 * `npm test` stays the ground truth and runs everything. This config exists so
 * `.github/workflows/release.yml` can gate a publish on the fast suite without
 * making every master push wait on a grid-refinement sweep.
 *
 * Excluded here are numerical convergence tests: synchronous refinement loops
 * with tight Poisson tolerances that block the vitest worker's event loop long
 * enough to time out its `onTaskUpdate` RPC, which vitest reports as a run
 * failure even when every assertion passes. Run them with `npm test`.
 */
const SLOW_SUITES = ['test/ns-axisym/walls.test.js'];

export default mergeConfig(
  base,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, ...SLOW_SUITES],
    },
  })
);
