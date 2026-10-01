/* Sub-Module 2.8: Universal Flow Coherence & Planar Surface Gating Engine.
 * Utilizes the physical anisotropy of the Structure Tensor (Coherence).
 * Completely eliminates swirling fingerprint and topographic loop artifacts on flat surfaces
 * (walls, ceilings, floors, skies, tabletops) without needing any category labels.
 * Pure TypedArray math. Zero external dependencies.
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
   * Gate hatching budget and streamlines by flow coherence and planar smoothness.
   * @param {Float32Array} hatchBudget Initial budget from ink conservation
   * @param {Object} flowField { width, height, coherence }
   * @param {Object} toneField { width, height, tone, detailField }
   * @param {Uint8Array} [contourMask]
   * @param {Object} [options]
   * @returns {{ gatedBudget: Float32Array, isPlanar: Uint8Array }}
   */
  function gateByCoherenceAndFlatness(hatchBudget, flowField, toneField, contourMask, options = {}) {
    const { width: w, height: h, tone, detailField } = toneField;
    const n = w * h;
    const gatedBudget = new Float32Array(hatchBudget);
    const isPlanar = new Uint8Array(n);

    const r = options.radius ?? Math.max(8, Math.round(w / 65));
    const cohThresh = options.coherenceThreshold ?? 0.38;
    const detailThresh = options.detailThreshold ?? 0.035;

    // 1. High-frequency detail energy
    const dAbs = new Float32Array(n);
    if (detailField) {
      for (let i = 0; i < n; i++) dAbs[i] = Math.abs(detailField[i]);
    } else {
      // Fallback: estimate tone gradient magnitude
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const gx = (tone[i + 1] - tone[i - 1]) * 0.5;
          const gy = (tone[i + w] - tone[i - w]) * 0.5;
          dAbs[i] = Math.hypot(gx, gy);
        }
      }
    }
    const smoothDetail = boxBlurFloat(dAbs, w, h, r);

    // 2. Contour proximity
    let smoothContour = null;
    if (contourMask) {
      const cFloat = new Float32Array(n);
      for (let i = 0; i < n; i++) if (contourMask[i]) cFloat[i] = 1.0;
      smoothContour = boxBlurFloat(cFloat, w, h, r);
    }

    const coh = flowField && flowField.coherence ? flowField.coherence : new Float32Array(n).fill(1);

    // 3. Evaluate universal planar & isotropic smoothness gate
    for (let i = 0; i < n; i++) {
      if (gatedBudget[i] <= 0.0) continue;

      const localCoh = coh[i];
      const localDetail = smoothDetail[i];
      const localContour = smoothContour ? smoothContour[i] : 0;

      // A region is gated out as a planar/swirling surface when:
      // 1) It has low high-frequency structural detail (not textured), AND
      // 2) It has low flow coherence (isotropic noise / swirls)
      const isLowDetail = localDetail < detailThresh;
      const isLowCoh = localCoh < cohThresh;

      // Planar surface (e.g. walls, skies, flat ground): low detail AND low coherence
      // If coherence is high, it's a 3D curved form or directional shadow roll-off!
      const isPlanarSurface = isLowDetail && isLowCoh && (tone[i] < 0.95);

      if (isPlanarSurface) {
        isPlanar[i] = 1;
        gatedBudget[i] = 0.0; // Strictly zero hatching: preserve paper white!
      }
    }

    return { gatedBudget, isPlanar };
  }

  const api = { gateByCoherenceAndFlatness, boxBlurFloat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchCoherenceGate = api;
})(globalThis);
