/* Sub-Module 2.7: Spatial Ink Conservation & Unified Hatching Budget Engine.
 * Implements the physical law of ink conservation: contours and line art already deposit ink.
 * Hatching lines are only budgeted where tone exceeds existing contour ink.
 * Completely category-agnostic: automatically exempts food, flowers, whiskers, and dense textures.
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
   * Compute unified ink budget for hatching based on conservation law.
   * @param {Object} toneField { width, height, tone, detailField }
   * @param {Object} [lineMap] { width, height, data }
   * @param {Array} [vectorContours=[]] Array of contour stroke objects { points }
   * @param {Object} [options]
   * @returns {Float32Array} hatchBudgetField [0.0 ~ 1.0]
   */
  function computeHatchBudget(toneField, lineMap, vectorContours = [], options = {}) {
    const { width: w, height: h, tone } = toneField;
    const n = w * h;
    const budget = new Float32Array(n);

    const r = options.radius ?? Math.max(7, Math.round(w / 75)); // ~10px at 800w
    const contourWeight = options.contourWeight ?? 1.5;
    const lineWeight = options.lineWeight ?? 1.1;

    // 1. Rasterize vector contours footprint
    const contourMask = new Float32Array(n);
    for (const c of vectorContours) {
      const pts = c.points;
      if (!pts || pts.length < 2) continue;
      for (let i = 0; i < pts.length; i++) {
        const px = Math.round(pts[i][0]), py = Math.round(pts[i][1]);
        if (px >= 0 && px < w && py >= 0 && py < h) {
          contourMask[py * w + px] = 1.0;
        }
      }
    }
    const smoothContour = boxBlurFloat(contourMask, w, h, r);

    // 2. Line map ink density
    let smoothLine = null;
    if (lineMap && lineMap.data) {
      const lineInk = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        lineInk[i] = Math.max(0, 1.0 - lineMap.data[i]);
      }
      smoothLine = boxBlurFloat(lineInk, w, h, r);
    }

    // 2.5 Optional 3D Surface Curvature Estimation from NormalMap
    let curvatureField = null;
    const normalMap = options.normalMap || options.normals || toneField.normalMap;
    if (normalMap && normalMap.normals) {
      const normals = normalMap.normals;
      const nw = normalMap.width || w;
      const nh = normalMap.height || h;
      curvatureField = new Float32Array(n);

      for (let y = 1; y < h - 1; y++) {
        const yw = y * w;
        const srcY0 = Math.floor(y * nh / h);
        const srcY1 = Math.min(nh - 1, srcY0 + 1);
        for (let x = 1; x < w - 1; x++) {
          const srcX0 = Math.floor(x * nw / w);
          const srcX1 = Math.min(nw - 1, srcX0 + 1);

          const i00 = (srcY0 * nw + srcX0) * 3;
          const i10 = (srcY0 * nw + srcX1) * 3;
          const i01 = (srcY1 * nw + srcX0) * 3;

          const dnx_dx = normals[i10] - normals[i00];
          const dny_dx = normals[i10 + 1] - normals[i00 + 1];
          const dnx_dy = normals[i01] - normals[i00];
          const dny_dy = normals[i01 + 1] - normals[i00 + 1];

          curvatureField[yw + x] = Math.hypot(dnx_dx, dnx_dy) + Math.hypot(dny_dx, dny_dy);
        }
      }
    }

    // 3. Compute available hatching budget under ink conservation law
    for (let i = 0; i < n; i++) {
      const t = tone[i];
      if (t <= 0.05) {
        budget[i] = 0.0;
        continue;
      }

      const cSat = smoothContour ? Math.min(1.0, (smoothContour[i] * contourWeight) / 0.12) : 0;
      const lSat = smoothLine ? Math.min(1.0, (smoothLine[i] * lineWeight) / 0.15) : 0;
      const existingSat = Math.max(cSat, lSat);

      if (curvatureField) {
        const kappa = curvatureField[i];
        // Flat planar surface (kappa < 0.035): strict zero hatching (prevents zebra stripes on walls, sky, table)
        if (kappa < 0.035) {
          budget[i] = 0.0;
          continue;
        }

        // 3D Curved surface (kappa >= 0.07): volume requires 3D cross-contour carving!
        // Relax threshold from 0.40 up to 0.85 proportionally to curvature
        const satThreshold = 0.40 + Math.min(0.45, (kappa - 0.035) * 6.0);
        if (existingSat >= satThreshold) {
          budget[i] = 0.0;
        } else if (existingSat > 0.08) {
          budget[i] = Math.max(0.0, t * (1.0 - existingSat / satThreshold));
        } else {
          budget[i] = t;
        }
      } else {
        // Standard baseline behavior without normal map
        if (existingSat >= 0.40) {
          budget[i] = 0.0; // Dense contours (food, hair, petals, line art) -> strictly 0 hatching
        } else if (existingSat > 0.05) {
          budget[i] = Math.max(0.0, t * (1.0 - existingSat * 2.0));
        } else {
          budget[i] = t;
        }
      }
    }

    return budget;
  }

  const api = { computeHatchBudget, boxBlurFloat };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchInkBudget = api;
})(globalThis);
