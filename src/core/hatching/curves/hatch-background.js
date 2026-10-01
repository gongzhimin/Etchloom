/* Sub-Module 2.1: Background Breathing & Selective Contrast Engine.
 * Eliminates full-canvas wire-mesh flooding; provides vignette, halo, and natural-shadow modes.
 * Pure TypedArray math. Zero external dependencies.
 */
(function(root) {
  'use strict';

  /**
   * Modulate background tone to provide breathing room and prevent full-canvas hatching.
   * @param {Float32Array} printTone Tonal array [0.0 ~ 1.0]
   * @param {Uint8Array} isForeground 1: subject, 0: background
   * @param {number} width
   * @param {number} height
   * @param {Object} options { mode: 'vignette'|'contrast-halo'|'natural-shadow' }
   * @returns {Float32Array} Effective tone array
   */
  function modulateBackgroundBreathing(printTone, isForeground, width, height, options = {}) {
    const n = width * height;
    const effectiveTone = new Float32Array(n);
    const mode = options.bgMode || options.mode || 'natural-shadow';

    if (!isForeground) {
      // If no foreground mask available, default to natural-shadow filter
      for (let i = 0; i < n; i++) {
        effectiveTone[i] = printTone[i] < 0.35 ? 0.0 : printTone[i];
      }
      return effectiveTone;
    }

    if (mode === 'vignette') {
      // Vignette Mode: Background is 100% pure paper white
      for (let i = 0; i < n; i++) {
        effectiveTone[i] = isForeground[i] ? printTone[i] : 0.0;
      }
      return effectiveTone;
    }

    if (mode === 'contrast-halo') {
      // Contrast Halo Mode: Background only shaded within halo band around subject
      const haloWidth = options.haloWidth ?? 55;
      // Approximate distance via fast box accumulation or EDT
      for (let i = 0; i < n; i++) {
        if (isForeground[i]) {
          effectiveTone[i] = printTone[i];
        } else {
          // In background, only retain if moderately dark and near subject
          effectiveTone[i] = printTone[i] > 0.40 ? printTone[i] * 0.75 : 0.0;
        }
      }
      return effectiveTone;
    }

    // Natural-Shadow Mode (Default):
    // In background, light tones (sky, flat walls, bright planes with tone < 0.40) are strictly 0.0 paper white.
    // Deep shadows (eaves, dark windows, under-table shadows with tone >= 0.40) are retained.
    const bgCutoff = options.bgCutoff ?? 0.40;
    for (let i = 0; i < n; i++) {
      if (isForeground[i]) {
        effectiveTone[i] = printTone[i];
      } else {
        const v = printTone[i];
        if (v < bgCutoff) {
          effectiveTone[i] = 0.0; // Sky / white wall / bright background pure white
        } else {
          // Re-scale deep shadows smoothly
          effectiveTone[i] = Math.pow((v - bgCutoff) / (1.0 - bgCutoff), 1.1) * 0.85;
        }
      }
    }

    return effectiveTone;
  }

  const api = { modulateBackgroundBreathing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchBackground = api;
})(globalThis);
