(function(root) {
  'use strict';

/**
 * Acid Simulator (工序 2: 酸液动态化学咬蚀)
 * Pure 2D PDE numerical simulation on discrete continuous fields.
 * Zero DOM dependencies.
 */
/**
 * Simulates a single time-step of acid bite etching.
 * 
 * @param {Object} plate Virtual plate context containing continuous typed array fields
 * @param {number} plate.width Plate width
 * @param {number} plate.height Plate height
 * @param {Float32Array} plate.depthField Groove depth field [0.0 ~ 1.0]
 * @param {Float32Array} plate.exposedField Metal surface exposure [0.0 ~ 1.0]
 * @param {Uint8Array} plate.blockedField Stop-out varnish mask [0 or 1]
 * @param {Float32Array} plate.burrField Drypoint burr height [0.0 ~ 1.0]
 * @param {Float32Array} plate.grainNoise Metallurgical grain noise [0.0 ~ 1.0]
 * @param {Float32Array} [plate.nextExposedField] Pre-allocated scratch buffer for double buffering
 * @param {number} dt Time step in seconds (e.g. 0.08 or 1.0)
 * @param {number} strength Acid concentration factor [0.0 ~ 1.0] (default: 0.45)
 * @param {number} grain Metallurgical grain roughness factor [0.0 ~ 1.0] (default: 0.45)
 */
function simulateAcidBite(plate, dt, strength = 0.45, grain = 0.45) {
  const {
    width: W,
    height: H,
    depthField: depth,
    exposedField: exposed,
    blockedField: blocked,
    burrField: burr,
    grainNoise
  } = plate;

  const N = W * H;
  const next = plate.nextExposedField || new Float32Array(N);
  next.set(exposed);

  for (let y = 1; y < H - 1; y++) {
    const row = y * W;
    for (let x = 1; x < W - 1; x++) {
      const i = row + x;
      if (blocked[i]) continue;

      // 4-neighbor lateral under-cutting diffusion
      const edge = Math.max(exposed[i - 1], exposed[i + 1], exposed[i - W], exposed[i + W]);
      next[i] = Math.min(
        1.0,
        exposed[i] + Math.max(0, edge - exposed[i]) * dt * strength * (0.14 + grain * grainNoise[i] * 0.55)
      );

      // Vertical bite deepening
      depth[i] = Math.min(
        1.0,
        depth[i] + next[i] * dt * strength * 0.058 * (1.0 + grain * (grainNoise[i] - 0.5))
      );

      // Acid dissolution of micro burr edges
      if (burr[i] > 0) {
        burr[i] = Math.max(0, burr[i] - dt * strength * 0.14);
      }
    }
  }

  exposed.set(next);
  return { dt };
}

  const api = { simulateAcidBite };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.AcidSimulator = api;
    root.simulateAcidBite = simulateAcidBite;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
