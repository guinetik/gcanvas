/**
 * General-purpose search algorithms.
 *
 * @example
 * import { binarySearch } from './search.js';
 *
 * const sorted = [1, 3, 5, 7, 9];
 * binarySearch(sorted, 4); // => 2 (insertion point between 3 and 5)
 * binarySearch(sorted, 5); // => 2 (index of exact match)
 */

/**
 * Find the insertion index for `value` in a sorted array.
 *
 * Returns the leftmost index `i` such that `sorted[i] >= value`.
 * If `value` is greater than all elements, returns `sorted.length`.
 *
 * Runs in O(log n) time.
 *
 * @param {number[]|Float64Array} sorted - Array sorted in ascending order
 * @param {number} value - Value to search for
 * @returns {number} Insertion index in [0, sorted.length]
 */
export function binarySearch(sorted, value) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
