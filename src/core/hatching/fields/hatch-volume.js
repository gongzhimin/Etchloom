/* Sub-Module 2.1-Extended: Volumetric Form & Spatial Stratification Engine.
 * Decouples 3D surface geometry from 2D texture/albedo patterns (fur stripes, wood grain).
 * Separates foreground volumetric wrapping flow from background planar perspective flow.
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
   * Stratify spatial depth into Foreground Subject vs Background Planes.
   * Uses Informative Drawings semantic contours to segment regions.
   */
  function computeSpatialStratification(toneField, lineMap) {
    const { width: w, height: h, tone } = toneField;
    const n = w * h;
    const isForeground = new Uint8Array(n);
    const lineData = lineMap?.data;

    // Line density accumulation to identify high-structure foreground object
    const lineDensity = new Float32Array(n);
    if (lineData) {
      for (let i = 0; i < n; i++) {
        // High ink density on informative lines
        lineDensity[i] = Math.max(0, 1.0 - lineData[i]);
      }
    }

    // Blur line density with large radius (w/25 ~ 32px) to detect subject envelope
    const blurR = Math.max(8, Math.round(w / 28));
    const smoothDensity = boxBlurFloat(lineDensity, w, h, blurR);

    // Subject threshold: region with meaningful structure & tone
    for (let i = 0; i < n; i++) {
      const d = smoothDensity[i];
      const t = tone[i];
      // Foreground: has structural line density and not pure paper white
      if (d > 0.035 && t > 0.12) {
        isForeground[i] = 1;
      }
    }

    return isForeground;
  }

  /**
   * Compute structure-aligned, volume-decoupled cross-field.
   * @param {Object} toneField { width, height, tone: Float32Array }
   * @param {Object} lineMap { width, height, data: Float32Array }
   * @param {Object} options
   */
  function computeVolumetricField(toneField, lineMap, options = {}) {
    const { width: w, height: h, tone } = toneField;
    const n = w * h;
    const lineData = lineMap?.data;

    // Master print background inclination (steady -45 degrees)
    const bgAngle = (options.bgAngle ?? -45) * (Math.PI / 180);
    const bgUx = Math.cos(bgAngle), bgUy = Math.sin(bgAngle);
    const crossAngleOffset = (options.crossAngle ?? 68) * (Math.PI / 180);

    // 1. Decouple Volume from Texture:
    // Macro-smoothed tone field removes micro fur stripes and isolates 3D cylindrical/spherical form
    const macroR = Math.max(6, Math.round(w / 32));
    const volumeTone = boxBlurFloat(tone, w, h, macroR);

    // 2. Compute Spatial Stratification (Foreground vs Background)
    const isForeground = computeSpatialStratification(toneField, lineMap);

    const jxx = new Float32Array(n);
    const jxy = new Float32Array(n);
    const jEnergy = new Float32Array(n);

    for (let y = 1; y < h - 1; y++) {
      const yw = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = yw + x;

        if (isForeground[i]) {
          // Foreground: Follow 3D volumetric surface lighting & Informative contour tangents
          const gtx = (volumeTone[i + 1] - volumeTone[i - 1]) * 0.5;
          const gty = (volumeTone[i + w] - volumeTone[i - w]) * 0.5;

          // Localized Informative line guidance
          let glx = 0, gly = 0;
          if (lineData) {
            const dlx = (lineData[i + 1] - lineData[i - 1]) * 0.5;
            const dly = (lineData[i + w] - lineData[i - w]) * 0.5;
            if (Math.hypot(dlx, dly) > 0.04) {
              glx = dlx * 4.0;
              gly = dly * 4.0;
            }
          }

          const gx = gtx + glx;
          const gy = gty + gly;
          jxx[i] = gx * gx - gy * gy;
          jxy[i] = 2 * gx * gy;
          jEnergy[i] = gx * gx + gy * gy;
        } else {
          // Background: Pure steady planar angle (no ripple waves!)
          const masterJx = Math.cos(2 * (bgAngle - Math.PI / 2));
          const masterJy = Math.sin(2 * (bgAngle - Math.PI / 2));
          jxx[i] = masterJx;
          jxy[i] = masterJy;
          jEnergy[i] = 1.0;
        }
      }
    }

    // Topological diffusion within regions
    const smoothR = Math.max(3, Math.round(w / 50));
    const smoothJxx = boxBlurFloat(jxx, w, h, smoothR);
    const smoothJxy = boxBlurFloat(jxy, w, h, smoothR);
    const smoothEnergy = boxBlurFloat(jEnergy, w, h, smoothR);

    const ux = new Float32Array(n);
    const uy = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);
    const coherence = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      if (!isForeground[i]) {
        // Background has fixed, steady, calm direction
        ux[i] = bgUx;
        uy[i] = bgUy;
        const vAngle = bgAngle + crossAngleOffset;
        vx[i] = Math.cos(vAngle);
        vy[i] = Math.sin(vAngle);
        coherence[i] = 1.0;
      } else {
        const sx = smoothJxx[i];
        const sy = smoothJxy[i];
        const len = Math.hypot(sx, sy);
        const en = smoothEnergy[i];

        const coh = en > 1e-5 ? Math.min(1.0, len / (en + 1e-4)) : 0;
        coherence[i] = coh;

        // Harmonic fallback toward anatomical master angle if gradient is ambiguous
        const blendWeight = Math.min(1.0, coh * 2.2);
        const finalJx = sx * blendWeight + Math.cos(2 * bgAngle) * (1.0 - blendWeight) * 0.1;
        const finalJy = sy * blendWeight + Math.sin(2 * bgAngle) * (1.0 - blendWeight) * 0.1;

        const gradAngle = 0.5 * Math.atan2(finalJy, finalJx);
        const uAngle = gradAngle + Math.PI * 0.5;
        const vAngle = uAngle + crossAngleOffset;

        ux[i] = Math.cos(uAngle);
        uy[i] = Math.sin(uAngle);
        vx[i] = Math.cos(vAngle);
        vy[i] = Math.sin(vAngle);
      }
    }

    return { width: w, height: h, ux, uy, vx, vy, coherence, isForeground };
  }

  const api = { computeVolumetricField, computeSpatialStratification };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchVolume = api;
})(globalThis);
