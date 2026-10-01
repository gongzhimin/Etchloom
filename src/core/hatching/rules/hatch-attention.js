/* Sub-Module 3.1: Line Spatial Self-Attention & Hatching Inhibition Field.
 * Implements non-local spatial attention over Informative Drawings LineMap.
 * Where structure or texture lines already exist, inhibition -> 1.0, strictly forbidding hatching.
 */
(function(root) {
  'use strict';

  function boxBlurFloat(src, w, h, r) {
    if (r <= 0) return new Float32Array(src);
    const out = new Float32Array(w * h);
    const integral = new Float64Array((w + 1) * (h + 1));

    for (let y = 0; y < h; y++) {
      let row = 0, yw = y * w;
      for (let x = 0; x < w; x++) {
        row += src[yw + x];
        integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
      }
    }

    for (let y = 0; y < h; y++) {
      const t = Math.max(0, y - r), b = Math.min(h, y + r + 1);
      for (let x = 0; x < w; x++) {
        const l = Math.max(0, x - r), rt = Math.min(w, x + r + 1);
        const area = (rt - l) * (b - t);
        out[y * w + x] = (integral[b * (w + 1) + rt] - integral[t * (w + 1) + rt] -
                         integral[b * (w + 1) + l] + integral[t * (w + 1) + l]) / area;
      }
    }
    return out;
  }

  /**
   * Compute line spatial self-attention inhibition field.
   * @param {Object} lineMap { width, height, data: Float32Array }
   * @param {Object} [options]
   * @param {number} [options.sigma=7.5] Spatial attention radius (px)
   * @param {number} [options.saturationThreshold=0.15] Density at which inhibition reaches 100%
   * @returns {Float32Array} inhibitionField [0.0 ~ 1.0] (1.0 = completely prohibit hatching)
   */
  function computeLineAttentionInhibition(lineMap, options = {}) {
    if (!lineMap || !lineMap.data) {
      return new Float32Array(lineMap.width * lineMap.height);
    }

    const { width: w, height: h, data } = lineMap;
    const n = w * h;
    const sigma = options.sigma ?? Math.max(7, Math.round(w / 80)); // ~10px at 800w
    const satThresh = options.saturationThreshold ?? 0.08;

    const lineInk = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Stronger response to darker lines (0.0=black, 1.0=white)
      lineInk[i] = Math.max(0, 1.0 - data[i]);
    }

    // Spatial attention integration across local neighborhood
    const smoothInk = boxBlurFloat(lineInk, w, h, Math.round(sigma));

    const inhibitionField = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Non-linear response: rapidly saturate above threshold to protect contours
      const ratio = smoothInk[i] / satThresh;
      inhibitionField[i] = Math.min(1.0, Math.max(0.0, Math.pow(ratio, 1.2)));
    }

    return inhibitionField;
  }

  const api = { computeLineAttentionInhibition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchAttention = api;
})(globalThis);
