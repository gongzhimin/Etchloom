/* Sub-Module 2.5: Architectural Facade & Planar Surface Exemption Engine.
 * Detects smooth architectural facades, walls, and flat pavements.
 * Completely exempts them from wavy/concentric shading lines (Zero Hatching on Facades).
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
   * Detect planar architectural facades, walls, and flat pavements.
   * @param {Object} toneField { width, height, tone, detailField }
   * @param {Object} lineMap { width, height, data }
   * @param {Object} [options]
   * @returns {Uint8Array} facadeMask (1 = flat facade, strictly 0 hatching)
   */
  function detectPlanarFacades(toneField, lineMap, options = {}) {
    const { width: w, height: h, tone, detailField } = toneField;
    const n = w * h;
    const facadeMask = new Uint8Array(n);

    if (!lineMap || !lineMap.data) return facadeMask;

    const r = options.radius ?? Math.max(8, Math.round(w / 60)); // ~13px at 800w
    const lineData = lineMap.data;

    // 1. Line ink density
    const lineInk = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      lineInk[i] = Math.max(0, 1.0 - lineData[i]);
    }
    const smoothLine = boxBlurFloat(lineInk, w, h, r);

    // 2. High-frequency detail energy & variance
    const dSq = new Float32Array(n);
    const dAbs = new Float32Array(n);
    if (detailField) {
      for (let i = 0; i < n; i++) {
        const d = detailField[i];
        dSq[i] = d * d;
        dAbs[i] = Math.abs(d);
      }
    } else {
      // Fallback: estimate local gradient magnitude of tone
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          const gx = (tone[i + 1] - tone[i - 1]) * 0.5;
          const gy = (tone[i + w] - tone[i - w]) * 0.5;
          const g = Math.hypot(gx, gy);
          dSq[i] = g * g;
          dAbs[i] = g;
        }
      }
    }

    const smoothDetailAbs = boxBlurFloat(dAbs, w, h, r);
    const smoothDetailSq = boxBlurFloat(dSq, w, h, r);

    const isArch = options.materialType === 'architecture';
    const lineThresh = isArch ? (options.lineThreshold ?? 0.08) : (options.lineThreshold ?? 0.04);
    const detailThresh = isArch ? (options.detailThreshold ?? 0.025) : (options.detailThreshold ?? 0.015);

    for (let i = 0; i < n; i++) {
      // A flat facade has:
      // 1. Minimal or zero line contours (smoothLine < lineThresh)
      // 2. Minimal local high-frequency detail / texture (smoothDetailAbs < detailThresh)
      // 3. Not an absolute black edge or deep crevice (tone[i] < 0.96)
      if (smoothLine[i] < lineThresh && smoothDetailAbs[i] < detailThresh && tone[i] < 0.96) {
        facadeMask[i] = 1;
      }
    }

    return facadeMask;
  }

  const api = { detectPlanarFacades, boxBlurFloat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchFacadeRules = api;
})(globalThis);
