/* Sub-Module 2.1: Topologically Smooth Cross-Field Engine.
 * Computes structure-aligned primary flow field u(x, y) and conjugate cross field v(x, y).
 * Eliminates artificial sinusoidal noise; aligns tangents strictly to contours.
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
        out[y * w + x] = (integral[b * (w + 1) + rt] - integral[t * (w + 1) + rt] -
                         integral[b * (w + 1) + l] + integral[t * (w + 1) + l]) /
                         ((rt - l) * (b - t));
      }
    }
    return out;
  }

  /**
   * Compute structure-aligned cross field.
   * @param {Object} toneField { width, height, tone: Float32Array }
   * @param {Object} lineMap Optional { data: Float32Array }
   * @param {Object} options Configuration
   * @returns {Object} { width, height, ux, uy, vx, vy, coherence }
   */
  function computeCrossField(toneField, lineMap, options = {}) {
    const { width: w, height: h, tone } = toneField;
    const n = w * h;
    const lineData = lineMap?.data;
    const lineWeight = options.lineWeight ?? 3.5;
    const crossAngleOffset = (options.crossAngle ?? 68) * (Math.PI / 180);
    // Classical Dürer hatching master inclination (-40 degrees from horizontal)
    const defaultAngle = (options.defaultAngle ?? -40) * (Math.PI / 180);
    const masterJx = Math.cos(2 * (defaultAngle - Math.PI / 2));
    const masterJy = Math.sin(2 * (defaultAngle - Math.PI / 2));

    // Macro-smoothed tone for volumetric 3D form flow (radius ~ w/45)
    const macroR = Math.max(3, Math.round(w / 45));
    const macroTone = boxBlurFloat(tone, w, h, macroR);

    const jxx = new Float32Array(n);
    const jxy = new Float32Array(n);
    const jEnergy = new Float32Array(n);

    for (let y = 1; y < h - 1; y++) {
      const yw = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = yw + x;
        // Volumetric 3D gradient from macro tone
        const gtx = (macroTone[i + 1] - macroTone[i - 1]) * 0.5;
        const gty = (macroTone[i + w] - macroTone[i - w]) * 0.5;

        // LineMap gradient (Module 1 edge) - strictly localized
        let glx = 0, gly = 0;
        if (lineData) {
          const dlx = (lineData[i + 1] - lineData[i - 1]) * 0.5;
          const dly = (lineData[i + w] - lineData[i - w]) * 0.5;
          const edgeMag = Math.hypot(dlx, dly);
          if (edgeMag > 0.03) {
            // Apply edge tangent strictly near actual contour lines
            glx = dlx * lineWeight;
            gly = dly * lineWeight;
          }
        }

        const gx = gtx + glx;
        const gy = gty + gly;
        const magSq = gx * gx + gy * gy;

        // Double-angle representation of gradient orientation
        jxx[i] = gx * gx - gy * gy;
        jxy[i] = 2 * gx * gy;
        jEnergy[i] = magSq;
      }
    }

    // Two-pass spatial diffusion for topological smoothness (radius ~ w/60)
    const smoothR = Math.max(3, Math.round(w / 60));
    const smoothJxx = boxBlurFloat(jxx, w, h, smoothR);
    const smoothJxy = boxBlurFloat(jxy, w, h, smoothR);
    const smoothEnergy = boxBlurFloat(jEnergy, w, h, smoothR);

    const ux = new Float32Array(n);
    const uy = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);
    const coherence = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const sx = smoothJxx[i];
      const sy = smoothJxy[i];
      const len = Math.hypot(sx, sy);
      const en = smoothEnergy[i];

      const coh = en > 1e-5 ? Math.min(1.0, len / (en + 1e-4)) : 0;
      coherence[i] = coh;

      // Soft harmonic blend: if gradient is weak/absent, blend toward harmonious print inclination
      const blendWeight = Math.min(1.0, coh * 2.0);
      const finalJx = sx * blendWeight + masterJx * (1.0 - blendWeight) * 0.05;
      const finalJy = sy * blendWeight + masterJy * (1.0 - blendWeight) * 0.05;

      // Tangent is normal to gradient (+ 90 degrees in double angle is + 180 degrees)
      const gradAngle = 0.5 * Math.atan2(finalJy, finalJx);
      const uAngle = gradAngle + Math.PI * 0.5;
      const vAngle = uAngle + crossAngleOffset;

      ux[i] = Math.cos(uAngle);
      uy[i] = Math.sin(uAngle);
      vx[i] = Math.cos(vAngle);
      vy[i] = Math.sin(vAngle);
    }

    return { width: w, height: h, ux, uy, vx, vy, coherence };
  }

  /**
   * Sample tangent vector at continuous position (x, y) with sign continuity.
   * @param {Object} field CrossField
   * @param {'primary'|'cross'} layer
   * @param {number} x
   * @param {number} y
   * @returns {[number, number]} Normalized [tx, ty]
   */
  function sampleTangent(field, layer, x, y) {
    const { width: w, height: h } = field;
    const fx = Math.max(0, Math.min(w - 2, x));
    const fy = Math.max(0, Math.min(h - 2, y));
    const x0 = Math.floor(fx), x1 = x0 + 1;
    const y0 = Math.floor(fy), y1 = y0 + 1;
    const wx = fx - x0, wy = fy - y0;

    const fX = layer === 'cross' ? field.vx : field.ux;
    const fY = layer === 'cross' ? field.vy : field.uy;

    const i00 = y0 * w + x0, i10 = y0 * w + x1;
    const i01 = y1 * w + x0, i11 = y1 * w + x1;

    let x00 = fX[i00], y00 = fY[i00];
    let x10 = fX[i10], y10 = fY[i10];
    let x01 = fX[i01], y01 = fY[i01];
    let x11 = fX[i11], y11 = fY[i11];

    // Align signs of neighbors to i00 to avoid cancellation when averaging antiparallel tangents
    if (x00 * x10 + y00 * y10 < 0) { x10 = -x10; y10 = -y10; }
    if (x00 * x01 + y00 * y01 < 0) { x01 = -x01; y01 = -y01; }
    if (x00 * x11 + y00 * y11 < 0) { x11 = -x11; y11 = -y11; }

    const topX = (1 - wx) * x00 + wx * x10;
    const topY = (1 - wx) * y00 + wx * y10;
    const botX = (1 - wx) * x01 + wx * x11;
    const botY = (1 - wx) * y01 + wx * y11;

    const rx = (1 - wy) * topX + wy * botX;
    const ry = (1 - wy) * topY + wy * botY;
    const rLen = Math.hypot(rx, ry);

    if (rLen > 1e-4) return [rx / rLen, ry / rLen];
    return [x00, y00];
  }

  const api = { computeCrossField, sampleTangent };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchField = api;
})(globalThis);
