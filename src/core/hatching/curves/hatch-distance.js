/* Sub-Module 2.2: Euclidean Distance Transform & Margin Detection.
 * Implementation of Felzenszwalb & Huttenlocher (2012) exact O(N) 2D EDT.
 * Dependency-free, pure typed-array math. Compatible with Node.js & browser.
 */
(function(root) {
  'use strict';

  const INF = 1e9;

  // 1D Squared Distance Transform on an array of length n
  function edt1d(f, n, d, v, z) {
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;

    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }

    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      const vk = v[k];
      const diff = q - vk;
      d[q] = diff * diff + f[vk];
    }
  }

  /**
   * Compute exact 2D Euclidean Distance Field (in pixels).
   * @param {Uint8Array|Array} binaryMask 1 for boundary/obstacle, 0 for free space
   * @param {number} width
   * @param {number} height
   * @returns {Float32Array} Distance in pixels to nearest boundary pixel
   */
  function computeSDF(binaryMask, width, height) {
    const n = width * height;
    const f = new Float32Array(Math.max(width, height));
    const d = new Float32Array(Math.max(width, height));
    const v = new Int32Array(Math.max(width, height));
    const z = new Float32Array(Math.max(width, height) + 1);

    // Initial grid: 0 on boundary, INF elsewhere
    const grid = new Float32Array(n);
    let hasBoundary = false;
    for (let i = 0; i < n; i++) {
      if (binaryMask && binaryMask[i]) {
        grid[i] = 0;
        hasBoundary = true;
      } else {
        grid[i] = INF;
      }
    }

    if (!hasBoundary) {
      // If no boundary, distance to boundary is infinite (or large constant)
      const sdf = new Float32Array(n);
      sdf.fill(INF);
      return sdf;
    }

    // Transform along columns
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        f[y] = grid[y * width + x];
      }
      edt1d(f, height, d, v, z);
      for (let y = 0; y < height; y++) {
        grid[y * width + x] = d[y];
      }
    }

    // Transform along rows
    for (let y = 0; y < height; y++) {
      const yw = y * width;
      for (let x = 0; x < width; x++) {
        f[x] = grid[yw + x];
      }
      edt1d(f, width, d, v, z);
      for (let x = 0; x < width; x++) {
        grid[yw + x] = d[x];
      }
    }

    // Final distance in pixels
    const sdf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      sdf[i] = Math.sqrt(grid[i]);
    }
    return sdf;
  }

  /**
   * Sample distance at sub-pixel coordinate (x, y) with bilinear interpolation.
   */
  function sampleSDF(sdf, width, height, x, y) {
    if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) return 0;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1, y1 = y0 + 1;
    const wx = x - x0, wy = y - y0;

    const d00 = sdf[y0 * width + x0];
    const d10 = sdf[y0 * width + x1];
    const d01 = sdf[y1 * width + x0];
    const d11 = sdf[y1 * width + x1];

    return (1 - wy) * ((1 - wx) * d00 + wx * d10) + wy * ((1 - wx) * d01 + wx * d11);
  }

  /**
   * Check if point (x, y) breaches the margin around boundary.
   */
  function isMarginBreached(sdf, width, height, x, y, margin) {
    if (x < margin || x >= width - margin || y < margin || y >= height - margin) {
      return true;
    }
    const dist = sampleSDF(sdf, width, height, x, y);
    return dist <= margin;
  }

  const api = { computeSDF, sampleSDF, isMarginBreached };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchDistance = api;
})(globalThis);
