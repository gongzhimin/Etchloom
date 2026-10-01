/* Sub-Module 2.1: Material Semantic Rules & Hatching Exemption Engine.
 * Implements classical printmaking material rules:
 * 1. Food / Cuisine: 100% EXEMPT from hatching (Zero Hatching Rule).
 * 2. Ceramics / Stoneware / Roof slopes: 100% FORBIDDEN from cross-hatching (Single Direction Rule).
 */
(function(root) {
  'use strict';

  function boxBlurUint8(src, w, h, r) {
    if (r <= 0) return new Uint8Array(src);
    const out = new Uint8Array(w * h);
    const integral = new Uint32Array((w + 1) * (h + 1));

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
        out[y * w + x] = Math.round((integral[b * (w + 1) + rt] - integral[t * (w + 1) + rt] -
                                    integral[b * (w + 1) + l] + integral[t * (w + 1) + l]) / area);
      }
    }
    return out;
  }

  /**
   * Detect food / cuisine organic clusters and compute exemption mask.
   */
  function computeMaterialExemption(lineMap, toneField, vectorContours = [], options = {}) {
    const { width: w, height: h, data } = lineMap;
    const tone = toneField ? toneField.tone : null;
    const n = w * h;

    const exemptionMask = new Uint8Array(n);
    let suppressCrossHatch = false;

    // Caller overrides
    if (options.materialType === 'food') {
      // Entire foreground is food -> 100% exempt from hatching
      exemptionMask.fill(1);
      suppressCrossHatch = true;
      return { exemptionMask, suppressCrossHatch };
    }

    if (options.materialType === 'ceramic' || options.materialType === 'architecture') {
      suppressCrossHatch = true;
    }

    // Auto-detection of high-density organic stroke clusters (typical of food / flowers)
    // Count local stroke footprint
    const strokeEndpoints = new Uint8Array(n);
    let totalContourPoints = 0;

    for (const c of vectorContours) {
      const pts = c.points;
      if (!pts || pts.length < 2) continue;
      totalContourPoints += pts.length;
      for (let i = 0; i < pts.length; i++) {
        const px = Math.round(pts[i][0]), py = Math.round(pts[i][1]);
        if (px >= 0 && px < w && py >= 0 && py < h) {
          strokeEndpoints[py * w + px] = 255;
        }
      }
    }

    // High stroke density region detection (e.g. food garnishes, clay textures, floral clusters)
    const blurR = Math.max(8, Math.round(w / 50));
    const smoothStrokeDensity = boxBlurUint8(strokeEndpoints, w, h, blurR);

    for (let i = 0; i < n; i++) {
      // If local stroke density is high (> 20/255), this is an intricate texture zone
      // (food garnish, ceramic clay texture, flower petals) -> strictly exempt from shading lines!
      if (smoothStrokeDensity[i] > 20) {
        exemptionMask[i] = 1;
      }
    }

    // If the image as a whole has high texture points (e.g. pot with 14k contours or food),
    // automatically suppress cross-hatch globally to prevent wire-mesh artifacts
    if (vectorContours.length > 5000 || totalContourPoints > 25000) {
      suppressCrossHatch = true;
    }

    return { exemptionMask, suppressCrossHatch };
  }

  const api = { computeMaterialExemption };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchMaterialRules = api;
})(globalThis);
