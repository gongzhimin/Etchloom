/* Sub-Module 2.3: Deterministic Jobard-Lefer Style Evenly-Spaced Streamline Generator.
 * Implements priority-queue seed propagation with dynamic tone-spaced distance and SDF margin braking.
 * Completely eliminates Monte Carlo random roulette and broken stub artifacts.
 */
(function(root) {
  'use strict';

  function resolveHatchDep(localPath, fallbackPath, fallbackVar) {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { return require(localPath); } catch (_) {}
      try { return require(fallbackPath); } catch (_) {}
    }
    return root[fallbackVar];
  }
  const HatchDistance = resolveHatchDep('./hatch-distance.js', '../hatch-distance.js', 'HatchDistance');
  const HatchField = resolveHatchDep('../fields/hatch-field.js', '../hatch-field.js', 'HatchField');

  class SpatialHashGrid {
    constructor(width, height, cellSize) {
      this.width = width;
      this.height = height;
      this.cellSize = cellSize;
      this.cols = Math.ceil(width / cellSize);
      this.rows = Math.ceil(height / cellSize);
      this.cells = new Map();
    }

    add(x, y) {
      const gx = Math.floor(x / this.cellSize);
      const gy = Math.floor(y / this.cellSize);
      const key = gy * this.cols + gx;
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push(x, y);
    }

    isTooClose(x, y, radius) {
      const rSq = radius * radius;
      const rCells = Math.ceil(radius / this.cellSize);
      const gx = Math.floor(x / this.cellSize);
      const gy = Math.floor(y / this.cellSize);

      const minX = Math.max(0, gx - rCells);
      const maxX = Math.min(this.cols - 1, gx + rCells);
      const minY = Math.max(0, gy - rCells);
      const maxY = Math.min(this.rows - 1, gy + rCells);

      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const bucket = this.cells.get(cy * this.cols + cx);
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i += 2) {
            const dx = x - bucket[i];
            const dy = y - bucket[i + 1];
            if (dx * dx + dy * dy < rSq) return true;
          }
        }
      }
      return false;
    }
  }

  function sampleTone(toneField, x, y) {
    const { width: w, height: h, tone } = toneField;
    const ix = Math.floor(Math.max(0, Math.min(w - 1, x)));
    const iy = Math.floor(Math.max(0, Math.min(h - 1, y)));
    return tone[iy * w + ix];
  }

  function getSpacing(dark, minSpacing, maxSpacing) {
    const clamped = Math.max(0.0, Math.min(1.0, dark));
    // Non-linear power spacing curve for authentic tonal gradation
    return minSpacing + Math.pow(1.0 - clamped, 1.25) * (maxSpacing - minSpacing);
  }

  /**
   * Trace a single streamline bidirectionally from (sx, sy).
   */
  function traceStreamline(sx, sy, field, layer, toneField, sdf, grid, options) {
    const { width: w, height: h } = toneField;
    const stepSize = options.stepSize ?? 1.1;
    const kissingMargin = options.kissingMargin ?? 2.0;
    const minSpacing = options.minSpacing ?? 2.0;
    const maxSpacing = options.maxSpacing ?? 6.8;
    const defaultMaxSteps = layer === 'cross' ? (options.crossMaxSteps ?? 32) : 80;
    const maxSteps = options.maxSteps ?? defaultMaxSteps;

    const sDark = sampleTone(toneField, sx, sy);
    const highlightCutoff = options.highlightCutoff ?? 0.16;
    if (sDark < highlightCutoff) return null; // Paper white preservation

    const points = [[sx, sy]];

    for (const dir of [1, -1]) {
      let cx = sx, cy = sy;
      let prevTx = 0, prevTy = 0;

      for (let step = 0; step < maxSteps; step++) {
        const [tx, ty] = HatchField.sampleTangent(field, layer, cx, cy);

        // Curvature brake: stop if flow turns abruptly (> 30 degrees)
        if (step > 0) {
          const dot = prevTx * tx + prevTy * ty;
          if (dot < 0.866) break;
        }
        prevTx = tx;
        prevTy = ty;

        // RK2 midpoint predictor
        const midX = cx + dir * tx * (stepSize * 0.5);
        const midY = cy + dir * ty * (stepSize * 0.5);
        const [mtx, mty] = HatchField.sampleTangent(field, layer, midX, midY);

        const effTx = (tx + mtx) * 0.5;
        const effTy = (ty + mty) * 0.5;
        const effLen = Math.hypot(effTx, effTy);
        const ntx = effLen > 1e-4 ? effTx / effLen : tx;
        const nty = effLen > 1e-4 ? effTy / effLen : ty;

        const nextX = cx + dir * ntx * stepSize;
        const nextY = cy + dir * nty * stepSize;

        // Bounds check
        if (nextX < kissingMargin || nextX >= w - kissingMargin ||
            nextY < kissingMargin || nextY >= h - kissingMargin) break;

        // SDF margin collision check (Kissing boundary)
        if (sdf && HatchDistance.isMarginBreached(sdf, w, h, nextX, nextY, kissingMargin)) break;

        // Tone check: stop carving if running into paper white highlight
        const dark = sampleTone(toneField, nextX, nextY);
        if (dark < 0.08) break;

        // Streamline convergence collision test (0.55 * d_sep)
        const localSep = getSpacing(dark, minSpacing, maxSpacing);
        if (grid.isTooClose(nextX, nextY, localSep * 0.55)) break;

        cx = nextX;
        cy = nextY;
        if (dir === 1) points.push([cx, cy]);
        else points.unshift([cx, cy]);
      }
    }

    // Filter out stub lines (< minLength points)
    const minPoints = options.minPoints ?? 6;
    if (points.length < minPoints) return null;

    return points;
  }

  /**
   * Core Jobard-Lefer streamline generation algorithm.
   */
  function generateLayer(field, layer, toneField, sdf, options) {
    const { width: w, height: h } = toneField;
    const minSpacing = options.minSpacing ?? 2.0;
    const maxSpacing = options.maxSpacing ?? 6.8;
    const kissingMargin = options.kissingMargin ?? 2.0;
    const highlightCutoff = options.highlightCutoff ?? 0.16;
    const crossThreshold = options.crossThreshold ?? 0.82; // Strictly confined to deep dark core
    const toneThreshold = layer === 'cross' ? crossThreshold : highlightCutoff;

    const grid = new SpatialHashGrid(w, h, minSpacing * 0.5);
    const paths = [];
    const seedQueue = [];

    // 1. Generate orderly coarse candidate seeds across grid
    const seedStep = Math.max(8, Math.round(maxSpacing * 2.2));
    const initialCandidates = [];
    for (let y = seedStep; y < h - seedStep; y += seedStep) {
      for (let x = seedStep; x < w - seedStep; x += seedStep) {
        const dark = sampleTone(toneField, x, y);
        if (dark >= toneThreshold) {
          const coh = field.coherence ? field.coherence[y * w + x] : 0.5;
          initialCandidates.push({ x, y, dark, score: dark * 0.7 + coh * 0.3 });
        }
      }
    }

    // Deterministic priority order: process deep shadows and strong forms first
    initialCandidates.sort((a, b) => b.score - a.score);
    let candidateIndex = 0;

    while (seedQueue.length > 0 || candidateIndex < initialCandidates.length) {
      let seed;
      if (seedQueue.length > 0) {
        seed = seedQueue.shift();
      } else {
        seed = initialCandidates[candidateIndex++];
      }

      if (!seed) break;
      const { x: sx, y: sy } = seed;

      // Skip if already occupied or in margin
      const sDark = sampleTone(toneField, sx, sy);
      if (sDark < toneThreshold) continue;
      const sSep = getSpacing(sDark, minSpacing, maxSpacing);
      if (grid.isTooClose(sx, sy, sSep * 0.70)) continue;
      if (sdf && HatchDistance.isMarginBreached(sdf, w, h, sx, sy, kissingMargin)) continue;

      // Trace streamline
      const pts = traceStreamline(sx, sy, field, layer, toneField, sdf, grid, options);
      if (!pts) continue;

      // Commit streamline into spatial hash grid
      for (let i = 0; i < pts.length; i++) {
        grid.add(pts[i][0], pts[i][1]);
      }

      // Compute tier based on average tone
      const avgDark = sampleTone(toneField, pts[Math.floor(pts.length / 2)][0], pts[Math.floor(pts.length / 2)][1]);
      const tier = layer === 'cross' ? 3 : (avgDark > 0.45 ? 2 : 1);

      paths.push({
        role: layer === 'cross' ? 'cross' : 'hatch',
        tier,
        points: pts,
        baseWidth: layer === 'cross' ? (0.18 + avgDark * 0.22) : (0.20 + avgDark * 0.38)
      });

      // Spawn orthogonal neighbor seeds along the newly placed streamline (Jobard-Lefer propagation)
      const sampleInterval = 6;
      for (let i = 0; i < pts.length; i += sampleInterval) {
        const pt = pts[i];
        const [tx, ty] = HatchField.sampleTangent(field, layer, pt[0], pt[1]);
        const nx = -ty, ny = tx; // Orthogonal normal
        const dLocal = getSpacing(sampleTone(toneField, pt[0], pt[1]), minSpacing, maxSpacing);

        for (const sign of [1, -1]) {
          const nxCand = pt[0] + sign * nx * dLocal;
          const nyCand = pt[1] + sign * ny * dLocal;

          if (nxCand >= kissingMargin && nxCand < w - kissingMargin &&
              nyCand >= kissingMargin && nyCand < h - kissingMargin) {
            const candDark = sampleTone(toneField, nxCand, nyCand);
            if (candDark >= toneThreshold && !grid.isTooClose(nxCand, nyCand, dLocal * 0.70)) {
              seedQueue.push({ x: nxCand, y: nyCand, dark: candDark });
            }
          }
        }
      }
    }

    return paths;
  }

  /**
   * Main entry for streamline generation across all engraving tiers.
   */
  function generateStreamlines(crossField, toneField, sdf, options = {}) {
    const primaryOptions = {
      ...options,
      minSpacing: options.minSpacing ?? 1.8,
      maxSpacing: options.maxSpacing ?? 6.2,
      kissingMargin: options.kissingMargin ?? 2.0
    };

    // 1. Primary Hatching Layer (Tiers 1 and 2)
    const primaryPaths = generateLayer(crossField, 'primary', toneField, sdf, primaryOptions);

    // 2. Conjugate Cross-Hatching Layer (Tier 3 in shadows)
    let crossPaths = [];
    const crossWeight = (options.cross ?? 65) / 100;
    if (crossWeight > 0.05) {
      const crossOptions = {
        ...options,
        minSpacing: primaryOptions.minSpacing * 1.15,
        maxSpacing: primaryOptions.maxSpacing * 1.25,
        kissingMargin: primaryOptions.kissingMargin
      };
      crossPaths = generateLayer(crossField, 'cross', toneField, sdf, crossOptions);
    }

    return [...primaryPaths, ...crossPaths];
  }

  const api = { generateStreamlines, SpatialHashGrid, getSpacing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchStreamline = api;
})(globalThis);
