/* Sub-Module 2.6: Architectural Manhattan & Rigid Flow Alignment Engine.
 * Regularizes cross-fields for architectural scenes to eliminate swirls, loops, and topographic waves.
 * Aligns flow strictly with dominant architectural axes (horizontal, vertical, roof slope).
 * Pure TypedArray math. Zero external dependencies.
 */
(function(root) {
  'use strict';

  function normalizeAngle(a) {
    let ang = a % Math.PI;
    if (ang < 0) ang += Math.PI;
    return ang;
  }

  function angularDiff(a, b) {
    const diff = Math.abs(a - b);
    return Math.min(diff, Math.PI - diff);
  }

  /**
   * Regularize crossField flow for architectural scenes to eliminate swirls and loops.
   * @param {Object} crossField { width, height, ux, uy, vx, vy, coherence }
   * @param {Array<number>} [dominantAngles=[0, Math.PI / 2]]
   * @param {Object} [options]
   * @returns {Object} regularizedCrossField
   */
  function regularizeArchitecturalFlow(crossField, dominantAngles = [], options = {}) {
    if (!crossField || !crossField.vx || !crossField.vy) return crossField;

    const { width: w, height: h, vx, vy, ux, uy, coherence } = crossField;
    const n = w * h;

    const targets = dominantAngles && dominantAngles.length > 0
      ? dominantAngles.map(normalizeAngle)
      : [0, Math.PI * 0.5]; // Default horizontal & vertical

    const snapThreshold = options.snapThreshold ?? (Math.PI * 0.28); // ~50 degrees capture range
    const snapStrength = options.snapStrength ?? 0.85;

    const outVx = new Float32Array(n);
    const outVy = new Float32Array(n);
    const outUx = new Float32Array(n);
    const outUy = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const curVx = vx[i], curVy = vy[i];
      const curAng = normalizeAngle(Math.atan2(curVy, curVx));

      // Find closest dominant axis
      let bestTarget = targets[0];
      let minDiff = angularDiff(curAng, targets[0]);
      for (let j = 1; j < targets.length; j++) {
        const diff = angularDiff(curAng, targets[j]);
        if (diff < minDiff) {
          minDiff = diff;
          bestTarget = targets[j];
        }
      }

      let finalAngle = curAng;
      if (minDiff < snapThreshold) {
        // Softly or rigidly snap towards dominant axis
        const factor = snapStrength * (1.0 - minDiff / snapThreshold);
        // Shortest interpolation on circle
        let delta = bestTarget - curAng;
        if (delta > Math.PI * 0.5) delta -= Math.PI;
        else if (delta < -Math.PI * 0.5) delta += Math.PI;
        finalAngle = curAng + delta * factor;
      }

      outVx[i] = Math.cos(finalAngle);
      outVy[i] = Math.sin(finalAngle);

      // Conjugate cross angle is perpendicular (PI / 2)
      const perpAngle = finalAngle + Math.PI * 0.5;
      outUx[i] = Math.cos(perpAngle);
      outUy[i] = Math.sin(perpAngle);
    }

    return {
      width: w,
      height: h,
      vx: outVx,
      vy: outVy,
      ux: outUx,
      uy: outUy,
      coherence: coherence || new Float32Array(n).fill(1)
    };
  }

  const api = { regularizeArchitecturalFlow, normalizeAngle, angularDiff };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchManhattanFlow = api;
})(globalThis);
