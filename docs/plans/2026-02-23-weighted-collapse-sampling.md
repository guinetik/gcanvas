# Weighted Collapse Sampling

**Date:** 2026-02-23
**Status:** Approved

## Problem

The quantum manifold demo's wave function collapse picks a uniform random point on the grid, ignoring the probability density |Ψ|². This means collapse can land in dead zones (corners, nodes), which is both non-intuitive and physically inaccurate. In real QM, measurement outcomes are distributed according to |Ψ|².

## Design

Three new primitives across two files, plus a demo update:

### `src/math/search.js` (new)
- `binarySearch(sortedArray, value)` — general-purpose insertion-index search on a sorted array

### `src/math/random.js` (modified)
- `Random.cdf(weights)` — builds a normalized cumulative distribution function from weights array
- `Random.weighted(items, weights)` — picks an item with probability proportional to its weight; uses `cdf()` + `binarySearch()` internally

### `src/math/index.js` (modified)
- Export `binarySearch` from search.js

### `demos/js/quantum-manifold.js` (modified)
- `_collapse()` samples collapse point weighted by |Ψ|² at each grid vertex instead of uniform random

## Usage

```js
import { Random } from "../../src/math/random.js";

const vertices = this.gridVertices.flat();
const weights = vertices.map(v => {
    const psi = this._computeWave(v.x, v.z, this.time);
    return psi.real * psi.real + psi.imag * psi.imag;
});
const point = Random.weighted(vertices, weights);
this.collapseX = point.x;
this.collapseZ = point.z;
```
