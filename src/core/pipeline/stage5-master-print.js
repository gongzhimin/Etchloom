/* Stage 5: Master Print Synthesis and Physical Debossing.
 * Combines contours, adaptive hatching, and deep dark masses into the final engraving print.
 */
(function(root){
  'use strict';

  function extractDarkMasses(toneField, flowField, params = {}) {
    if (params.suppressDarkMass) {
      return [];
    }

    // Prefer effectiveTone if provided via params or inside toneField
    const activeTone = params.effectiveToneField?.tone || toneField.effectiveTone || toneField.tone;
    const { width: w, height: h } = toneField;
    const threshold = params.darkThreshold ?? 0.94; // Deepest crevice/pupils only
    const paths = [];

    // Dense short ink dashes in maximum shadow
    const step = params.darkMassStep ?? 8;
    for (let y = step; y < h - step; y += step) {
      for (let x = step; x < w - step; x += step) {
        const idx = y * w + x;
        if (activeTone[idx] > threshold) {
          const coh = flowField && flowField.coherence ? flowField.coherence[idx] : 1;
          if (coh < 0.45) continue; // Flat/unoriented regions never receive dark masses
          const vx = flowField && flowField.vx ? flowField.vx[idx] : 1;
          const vy = flowField && flowField.vy ? flowField.vy[idx] : 0;
          const len = 3.0;
          paths.push({
            role: 'hatch',
            mark: 'dark-mass',
            points: [[x - vx * len, y - vy * len], [x + vx * len, y + vy * len]],
            width: 0.75
          });
        }
      }
    }
    return paths;
  }

  function runStage5(contours, hatchings, toneField, flowField, params = {}) {
    const activeToneField = params.effectiveToneField || hatchings?.effectiveToneField || toneField;
    const darkMasses = extractDarkMasses(activeToneField, flowField, params);

    // Assembly order: 1. Hatchings, 2. Dark Masses, 3. Contours (on top)
    const allPaths = [...hatchings, ...darkMasses, ...contours];

    const stats = {
      contours: contours.length,
      hatchings: hatchings.filter(p => p.role === 'hatch').length,
      crosses: hatchings.filter(p => p.role === 'cross').length,
      darkMasses: darkMasses.length,
      totalPaths: allPaths.length
    };

    return {
      width: toneField.width,
      height: toneField.height,
      paths: allPaths,
      stats
    };
  }

  const api = { runStage5, extractDarkMasses };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stage5MasterPrint = api;
})(globalThis);
