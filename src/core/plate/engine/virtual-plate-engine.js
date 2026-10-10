(function(root) {
  'use strict';

/**
 * Virtual Plate Engine (M3: 虚拟铜版仿真模块)
 * Pure numerical physical simulation of copper plate intaglio printmaking.
 * 100% decoupled with zero DOM dependencies.
 */
const PlateCodec = typeof require !== 'undefined' ? require('../../codecs/plate-codec.js') : globalThis.PlateCodec;
const { simulateAcidBite } = typeof require !== 'undefined' ? require('../physics/acid-simulator.js') : globalThis.AcidSimulator;
const { renderPlate } = typeof require !== 'undefined' ? require('../renderer/press-renderer.js') : globalThis.PressRenderer;

class VirtualPlateEngine {
  /**
   * @param {number} [width=900] Plate width in pixels (900, 1500, or 3000)
   * @param {number} [height=null] Optional plate height in pixels. Defaults to 3:2 ratio (Math.round(width * 660 / 900))
   */
  constructor(width = 900, height = null) {
    this.history = [];
    this.plateSources = [];
    this.elapsedAcidTime = 0;
    this.seed = 17;
    this.allocatePlate(width, height);
  }

  /**
   * Reallocates all continuous typed array fields for the given plate dimensions.
   * @param {number} width 
   * @param {number} [height=null]
   */
  allocatePlate(width, height = null) {
    if (![900, 1500, 3000].includes(width)) {
      throw new Error('版面尺寸无效');
    }
    this.width = width;
    if (height && height > 0) {
      this.height = Math.round(height);
    } else {
      this.height = Math.round(width * 660 / 900);
    }
    this.pixelCount = this.width * this.height;

    const N = this.pixelCount;
    this.depthField = new Float32Array(N);
    this.exposedField = new Float32Array(N);
    this.blockedField = new Uint8Array(N);
    this.burrField = new Float32Array(N);
    this.grainNoise = new Float32Array(N);
    this.nextExposedField = new Float32Array(N);

    this.resetGrain();
  }

  /**
   * Generates deterministic high-frequency metallic crystal grain noise.
   */
  resetGrain() {
    const N = this.pixelCount;
    for (let i = 0; i < N; i++) {
      let x = (Math.imul(i + 19, 374761393) ^ 12347) >>> 0;
      x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
      this.grainNoise[i] = (x >>> 0) / 4294967295;
    }
  }

  /**
   * Applies a single tool dab at coordinates (x, y).
   * 
   * @param {number} x Coordinate X on plate
   * @param {number} y Coordinate Y on plate
   * @param {number} [force=1.0] Pen pressure or applied force [0.0 ~ 1.0]
   * @param {'needle'|'dry'|'stop'|'polish'} [tool='needle'] Tool mode
   * @param {number} [size=4] Tool diameter in baseline pixels
   */
  applyToolDab(x, y, force = 1.0, tool = 'needle', size = 4) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(force) || !Number.isFinite(size)) {
      return;
    }
    const W = this.width;
    const H = this.height;
    const r = Number(size) * W / 900 / 2;
    const maxR = tool === 'dry' ? r * 1.85 : (tool === 'polish' ? r * 1.6 : r);

    const yMin = Math.max(0, Math.floor(y - maxR - 1));
    const yMax = Math.min(H - 1, Math.floor(y + maxR + 1));
    const xMin = Math.max(0, Math.floor(x - maxR - 1));
    const xMax = Math.min(W - 1, Math.floor(x + maxR + 1));

    for (let yy = yMin; yy <= yMax; yy++) {
      const row = yy * W;
      for (let xx = xMin; xx <= xMax; xx++) {
        const dist = Math.hypot(xx - x, yy - y);
        const f = Math.max(0, Math.min(1, r + 0.5 - dist)) * force;
        const i = row + xx;

        if (tool === 'stop') {
          // Stop-out varnish passivation
          if (dist <= r + 0.5) {
            this.blockedField[i] = 1;
            this.exposedField[i] = 0;
            this.burrField[i] = 0;
          }
        } else if (tool === 'polish') {
          // Burnisher flattening
          const fPol = Math.max(0, Math.min(1, maxR + 0.5 - dist)) * force;
          if (fPol > 0) {
            this.burrField[i] *= Math.max(0, 1 - fPol * 0.88);
            this.depthField[i] *= Math.max(0, 1 - fPol * 0.32);
          }
        } else if (tool === 'dry') {
          // Drypoint cutting with burr
          if (f > 0) {
            this.blockedField[i] = 0;
            this.exposedField[i] = Math.max(this.exposedField[i], f * 0.7);
            this.depthField[i] = Math.min(1, this.depthField[i] + f * 0.36);
          }
          const fBurr = Math.max(0, Math.min(1, maxR + 0.5 - dist)) * force;
          if (fBurr > 0) {
            const halo = Math.sin(Math.min(Math.PI, dist / (maxR + 0.5) * Math.PI));
            this.burrField[i] = Math.min(1, this.burrField[i] + fBurr * (0.5 + 0.5 * halo));
          }
        } else {
          // Etching needle (ground opening) - exposes bare copper through ground, depth remains 0 until acid bite
          if (f > 0) {
            this.blockedField[i] = 0;
            this.exposedField[i] = Math.max(this.exposedField[i], f);
            this.burrField[i] = 0;
          }
        }
      }
    }
  }

  /**
   * Applies an interpolated line stroke between points a and b.
   * 
   * @param {{x: number, y: number, p?: number}} a Start point
   * @param {{x: number, y: number, p?: number}} b End point
   * @param {'needle'|'dry'|'stop'|'polish'} [tool='needle'] Tool mode
   * @param {number} [size=4] Tool diameter
   */
  applyToolLine(a, b, tool = 'needle', size = 4) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const stepDist = Math.max(0.7, Number(size) * this.width / 900 / 5);
    const steps = Math.max(1, Math.ceil(d / stepDist));

    for (let j = 1; j <= steps; j++) {
      const t = j / steps;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const pa = a.p ?? 1;
      const pb = b.p ?? 1;
      const p = pa + (pb - pa) * t;
      this.applyToolDab(x, y, p, tool, size);
    }
  }

  /**
   * Applies a continuous tool path (array of points).
   * 
   * @param {Array<{x: number, y: number, p?: number} | [number, number]>} points 
   * @param {'needle'|'dry'|'stop'|'polish'} [tool='needle'] Tool mode
   * @param {number} [size=4] Tool diameter
   */
  applyToolPath(points, tool = 'needle', size = 4) {
    if (!points || points.length === 0) return;
    const norm = pt => Array.isArray(pt) ? { x: pt[0], y: pt[1], p: 1 } : { x: pt.x, y: pt.y, p: pt.p ?? pt.pressure ?? 1 };

    let prev = norm(points[0]);
    this.applyToolDab(prev.x, prev.y, prev.p, tool, size);

    for (let i = 1; i < points.length; i++) {
      const curr = norm(points[i]);
      this.applyToolLine(prev, curr, tool, size);
      prev = curr;
    }
  }

  /**
   * Applies an array of vector master paths (e.g. from Stage 5 / M2).
   * 
   * @param {Array<{ points: [number, number][], width?: number }>} paths 
   * @param {'needle'|'dry'} [tool='needle'] Tool mode
   * @param {number} [defaultSize=2] 
   */
  applyMasterPaths(paths, tool = 'needle', defaultSize = 2) {
    if (!Array.isArray(paths)) return;
    for (const path of paths) {
      const size = path.width ?? defaultSize;
      this.applyToolPath(path.points, tool, size);
    }
  }

  /**
   * Advances chemical acid bite simulation by time dt.
   * 
   * @param {number} dt Time step in seconds
   * @param {number} [strength=0.45] Acid concentration
   * @param {number} [grain=0.45] Grain roughness
   */
  etch(dt, strength = 0.45, grain = 0.45) {
    if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(strength) || !Number.isFinite(grain)) {
      return;
    }
    simulateAcidBite(this, dt, strength, grain);
    this.elapsedAcidTime += dt;
  }

  /**
   * Renders plate view, depth view, or cotton paper print view.
   * 
   * @param {'plate'|'depth'|'print'} [mode='plate'] 
   * @param {Object} [options={}] 
   * @param {Uint8ClampedArray} [targetBuffer] 
   * @returns {{ width: number, height: number, pixels: Uint8ClampedArray }}
   */
  render(mode = 'plate', options = {}, targetBuffer = null) {
    return renderPlate(this, mode, options, targetBuffer);
  }

  /**
   * Saves a state snapshot onto the undo stack.
   * @param {boolean} [irreversible=false] If true, skip snapshot
   */
  snapshot(irreversible = false) {
    if (irreversible) return;
    this.history.push({
      width: this.width,
      depth: this.depthField.slice(),
      exposed: this.exposedField.slice(),
      blocked: this.blockedField.slice(),
      burr: this.burrField.slice(),
      elapsedAcidTime: this.elapsedAcidTime,
      plateSources: structuredClone(this.plateSources)
    });

    // Prune history stack to 12 steps or 128MB
    while (
      this.history.length > 1 &&
      (this.history.length > 12 ||
        this.history.reduce(
          (sum, s) => sum + s.depth.byteLength * 2 + s.blocked.byteLength + (s.burr ? s.burr.byteLength : 0),
          0
        ) > 128 * 1048576)
    ) {
      this.history.shift();
    }
  }

  /**
   * Restores the most recent snapshot from the undo stack.
   * @returns {boolean} True if a snapshot was restored
   */
  undo() {
    const s = this.history.pop();
    if (!s) return false;

    if (s.width !== this.width) {
      this.allocatePlate(s.width);
    }
    this.depthField.set(s.depth);
    this.exposedField.set(s.exposed);
    this.blockedField.set(s.blocked);
    if (s.burr) {
      this.burrField.set(s.burr);
    } else {
      this.burrField.fill(0);
    }
    this.elapsedAcidTime = s.elapsedAcidTime ?? s.elapsed ?? 0;
    this.plateSources = s.plateSources || [];
    return true;
  }

  /**
   * Clears all copper incisions, ground openings, and undo history.
   */
  clear() {
    this.depthField.fill(0);
    this.exposedField.fill(0);
    this.blockedField.fill(0);
    this.burrField.fill(0);
    this.elapsedAcidTime = 0;
    this.plateSources = [];
  }

  /**
   * Serializes the current plate state to a JSON-compatible object.
   * @param {Object} [metadata={}] Extra metadata (settings, designSession, paperMM, etc.)
   */
  exportState(metadata = {}) {
    const isV1 = this.width === 900;
    return {
      version: isV1 ? 1 : 2,
      width: this.width,
      height: this.height,
      depth: isV1 ? Array.from(this.depthField) : PlateCodec.encode(this.depthField),
      exposed: isV1 ? Array.from(this.exposedField) : PlateCodec.encode(this.exposedField),
      blocked: isV1 ? Array.from(this.blockedField) : PlateCodec.encode(this.blockedField),
      burr: isV1 ? Array.from(this.burrField) : PlateCodec.encode(this.burrField),
      paperMM: metadata.paperMM ?? 254,
      elapsed: this.elapsedAcidTime,
      seed: this.seed,
      plateSources: this.plateSources,
      designSession: metadata.designSession,
      settings: metadata.settings
    };
  }

  /**
   * Deserializes and restores plate state from a saved state object.
   * @param {Object} data Saved state object
   */
  importState(data) {
    const decoded = PlateCodec.read(data);
    if (data.width !== this.width) {
      this.allocatePlate(data.width);
    }

    this.depthField.set(decoded.depth);
    this.exposedField.set(decoded.exposed);
    this.blockedField.set(decoded.blocked);

    const N = this.pixelCount;
    if (data.burr) {
      if (data.version === 1) {
        this.burrField.set(Float32Array.from(data.burr));
      } else {
        this.burrField.set(PlateCodec.decode(data.burr, Float32Array, N));
      }
    } else {
      this.burrField.fill(0);
    }

    this.elapsedAcidTime = Number.isFinite(data.elapsed) ? Math.max(0, data.elapsed) : 0;
    this.seed = Number.isInteger(data.seed) ? Math.abs(data.seed) % 100000 : 17;
    this.plateSources = data.plateSources || [];
  }
}

const api = { VirtualPlateEngine };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.VirtualPlateEngine = VirtualPlateEngine;
}


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = typeof api !== 'undefined' ? api : (root.VirtualPlateEngine || VirtualPlateEngine);
  }
  if (typeof root !== 'undefined') {
    if (typeof api !== 'undefined') {
      root.VirtualPlateEngine = api;
    }
    if (typeof VirtualPlateEngine !== 'undefined') {
      root.VirtualPlateEngine = VirtualPlateEngine;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
