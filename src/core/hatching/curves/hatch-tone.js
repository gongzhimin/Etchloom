/* Sub-Module 2.0: Tone Remapping and Stepped Tonal Tier Slicing.
 * Implements knee-point highlight suppression and 5-tier discrete engraving grammar.
 * Pure TypedArray math. Zero external dependencies.
 */
(function(root) {
  'use strict';

  /**
   * Remap raw tone to high-contrast print tone and assign discrete tiers.
   * @param {Float32Array} rawTone 0.0 (paper white) to 1.0 (ink black)
   * @param {number} width
   * @param {number} height
   * @param {Object} options
   * @returns {{ printTone: Float32Array, tiers: Uint8Array }}
   */
  function remapToneAndTiers(rawTone, width, height, options = {}) {
    const n = width * height;
    const printTone = new Float32Array(n);
    const tiers = new Uint8Array(n);

    const whiteKnee = options.whiteKnee ?? 0.30;
    const gamma = options.gamma ?? 1.35;
    const shadowBoost = options.shadowBoost ?? 1.15;
    const range = Math.max(0.01, 1.0 - whiteKnee);

    for (let i = 0; i < n; i++) {
      const v = rawTone[i];

      // 1. Highlight Knee-point: pure paper white reserve (Tier 0)
      if (v <= whiteKnee) {
        printTone[i] = 0.0;
        tiers[i] = 0;
        continue;
      }

      // 2. High-contrast tonal expansion above knee
      const normalized = (v - whiteKnee) / range;
      const mapped = Math.min(1.0, Math.pow(normalized, gamma) * shadowBoost);
      printTone[i] = mapped;

      // 3. Discrete Stepped Tier Grammar
      if (mapped <= 0.30) {
        tiers[i] = 1; // Tier 1: Light tone (sparse single lines)
      } else if (mapped <= 0.65) {
        tiers[i] = 2; // Tier 2: Mid tone (dense volume lines)
      } else if (mapped <= 0.86) {
        tiers[i] = 3; // Tier 3: Dark tone (activates conjugate cross-hatch)
      } else {
        tiers[i] = 4; // Tier 4: Deep shadow core (dense cross & stipples)
      }
    }

    return { printTone, tiers };
  }

  const api = { remapToneAndTiers };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchTone = api;
})(globalThis);
