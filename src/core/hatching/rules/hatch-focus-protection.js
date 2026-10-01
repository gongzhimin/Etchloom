/* Sub-Module 2.3: Semantic Focus & Calligraphy Plaque SDF Protection.
 * Detects high-density focal elements (calligraphy plaques, signage, eyes, fine inscriptions)
 * and builds a 3.5px SDF clearance halo where hatching is strictly forbidden.
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
   * Compute semantic focus mask and protected tone field.
   */
  function applySemanticFocusProtection(lineMap, toneField, distField, options = {}) {
    const { width: w, height: h, data: lineData } = lineMap;
    const tone = toneField.tone;
    const n = w * h;

    const focusMargin = options.focusMargin ?? 3.5;
    const rawLineInk = new Uint8Array(n);

    // 1. Mark strong black ink pixels
    for (let i = 0; i < n; i++) {
      if (lineData[i] < 0.70) {
        rawLineInk[i] = 255;
      }
    }

    // 2. Local stroke density (radius 12px)
    const localDensity = boxBlurUint8(rawLineInk, w, h, 12);

    // High frequency stroke cluster = plaque / calligraphy / dense carving
    const isPlaqueZone = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      // If stroke density in 24px box is > 18% and local tone is not pure black mass
      if (localDensity[i] > 45 && tone[i] < 0.85) {
        isPlaqueZone[i] = 1;
      }
    }

    // 3. Dilate plaque zone by focusMargin to build the breathing halo
    const haloR = Math.ceil(focusMargin);
    const focusHalo = new Uint8Array(n);
    for (let y = 0; y < h; y++) {
      const yw = y * w;
      for (let x = 0; x < w; x++) {
        if (!isPlaqueZone[yw + x]) continue;
        for (let dy = -haloR; dy <= haloR; dy++) {
          const py = y + dy;
          if (py < 0 || py >= h) continue;
          for (let dx = -haloR; dx <= haloR; dx++) {
            const px = x + dx;
            if (px < 0 || px >= w) continue;
            if (Math.hypot(dx, dy) <= focusMargin) {
              focusHalo[py * w + px] = 1;
            }
          }
        }
      }
    }

    // 4. Create protected tone (tones in focusHalo zeroed out -> Paper White)
    const protectedTone = new Float32Array(tone);
    for (let i = 0; i < n; i++) {
      if (focusHalo[i]) {
        protectedTone[i] = 0.0; // Strictly zeroed out so no hatching penetrates plaque
      }
    }

    return { focusHalo, protectedTone };
  }

  const api = { applySemanticFocusProtection };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchFocusProtection = api;
})(globalThis);
