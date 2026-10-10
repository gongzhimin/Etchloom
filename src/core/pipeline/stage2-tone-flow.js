/* Stage 2: High-Precision Multi-Scale Tone and Flow Field Generation.
 * Features:
 * 1. Multi-scale edge-preserving Tone decomposition: BaseTone (volume) + High-Frequency Structural Detail.
 * 2. Multi-scale Structure Tensor (Fine scale for micro-edges/hair + Coarse scale for macro stability).
 * 3. LineMap gradient-guided localized orientation enhancement.
 * 4. Anisotropic streamline-aligned tensor diffusion (smoothing strictly along flow tangents, never across edges).
 */
(function(root){
  'use strict';

  function boxBlurFloat(src, w, h, r) {
    if (r <= 0) return new Float32Array(src);
    const out = new Float32Array(w * h), integral = new Float64Array((w + 1) * (h + 1));
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
        out[y * w + x] = (integral[b * (w + 1) + rt] - integral[t * (w + 1) + rt] - integral[b * (w + 1) + l] + integral[t * (w + 1) + l]) / ((rt - l) * (b - t));
      }
    }
    return out;
  }

  // Fast Edge-Preserving Guided Filter
  function guidedFilter(guide, p, w, h, r, eps = 0.02) {
    const n = w * h;
    const meanI = boxBlurFloat(guide, w, h, r);
    const meanP = boxBlurFloat(p, w, h, r);

    // Zero-allocation buffer reuse: avoid Float32Array.from creating intermediate objects
    const ip = new Float32Array(n);
    const ii = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const g = guide[i];
      ip[i] = g * p[i];
      ii[i] = g * g;
    }
    const meanIp = boxBlurFloat(ip, w, h, r);
    const meanII = boxBlurFloat(ii, w, h, r);

    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const varI = Math.max(0, meanII[i] - meanI[i] * meanI[i]);
      const covIp = meanIp[i] - meanI[i] * meanP[i];
      a[i] = covIp / (varI + eps);
      b[i] = meanP[i] - a[i] * meanI[i];
    }
    const meanA = boxBlurFloat(a, w, h, r);
    const meanB = boxBlurFloat(b, w, h, r);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      out[i] = meanA[i] * guide[i] + meanB[i];
    }
    return out;
  }

  // Multi-Scale Tone Field with High-Frequency Detail Retention
  function computeToneField(sourceImage, params = {}) {
    const { width: w, height: h, pixels } = sourceImage, n = w * h;
    const rawTone = new Float32Array(n);
    const exposure = params.exposure ?? 50;
    const black = (params.blackPoint ?? 0) / 100;
    const white = (params.whitePoint ?? 100) / 100;
    const gamma = Math.pow(2, (50 - exposure) / 35);
    const shadows = (params.shadows ?? 20) / 100;
    const detailBoost = (params.detailBoost ?? 60) / 100; // Micro-structure emphasis

    for (let i = 0; i < n; i++) {
      const v = pixels[i] / 255;
      const adjusted = Math.max(0, Math.min(1, (v - black) / (Math.max(0.01, white - black))));
      const lit = Math.pow(adjusted, gamma);
      // Raw dark depth: 0 = white, 1 = deep dark ink
      rawTone[i] = 1.0 - Math.min(1.0, lit + shadows * 0.30 * Math.pow(1 - lit, 3));
    }

    // 1. Base Tone (macro volume) via bilateral edge-preserving guided filter
    const baseR = Math.max(2, Math.round(w / 180));
    const baseTone = guidedFilter(rawTone, rawTone, w, h, baseR, 0.015);

    // 2. High-Frequency Structural Detail Layer: D = rawTone - baseTone
    const detailField = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Retain fine wrinkles, hair strands, fabric textures
      detailField[i] = rawTone[i] - baseTone[i];
    }

    // 3. Composite High-Definition Tone Field
    const finalTone = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // Modulate base tone with detail layer to ensure micro-contrast is not wiped out
      const combined = baseTone[i] + detailField[i] * (0.85 + detailBoost * 0.5);
      finalTone[i] = Math.max(0, Math.min(1, combined));
    }

    return {
      width: w,
      height: h,
      tone: finalTone,
      baseTone,
      detailField
    };
  }

  // Multi-Scale Structure Tensor Field with Anisotropic Smoothing
  function computeFlowField(toneField, lineMap, params = {}) {
    const { width: w, height: h, tone, detailField } = toneField;
    const n = w * h;
    const lineData = lineMap?.data;
    const alpha = params.lineGuideWeight ?? 2.2; // Strength of line gradient reinforcement

    // 1. Gradients of Tone, High-frequency Details and LineMap
    const jxx = new Float32Array(n), jxy = new Float32Array(n), jyy = new Float32Array(n);

    for (let y = 1; y < h - 1; y++) {
      const yw = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = yw + x;
        // Tone gradients (macro & micro combined)
        const gtx = (tone[i + 1] - tone[i - 1]) * 0.5;
        const gty = (tone[i + w] - tone[i - w]) * 0.5;

        // Detail gradient (captures micro surface turnings)
        let gdx = 0, gdy = 0;
        if (detailField) {
          gdx = (detailField[i + 1] - detailField[i - 1]) * 0.5;
          gdy = (detailField[i + w] - detailField[i - w]) * 0.5;
        }

        // Line gradients (inverted: line is 0, background is 1)
        let glx = 0, gly = 0;
        if (lineData) {
          glx = (lineData[i + 1] - lineData[i - 1]) * 0.5;
          gly = (lineData[i + w] - lineData[i - w]) * 0.5;
        }

        // Composite gradient: tone + micro-detail + lineart edge guidance
        const gx = gtx + gdx * 1.2 + alpha * glx;
        const gy = gty + gdy * 1.2 + alpha * gly;

        jxx[i] = gx * gx;
        jxy[i] = gx * gy;
        jyy[i] = gy * gy;
      }
    }

    // 2. Dual-scale integration: Fine scale (preserves sharp micro-features) & Coarse scale (stability)
    const fineR = Math.max(1, Math.round(w / 450));   // ~2px
    const coarseR = Math.max(3, Math.round(w / 120)); // ~7px

    const fJxx = boxBlurFloat(jxx, w, h, fineR);
    const fJxy = boxBlurFloat(jxy, w, h, fineR);
    const fJyy = boxBlurFloat(jyy, w, h, fineR);

    const cJxx = boxBlurFloat(jxx, w, h, coarseR);
    const cJxy = boxBlurFloat(jxy, w, h, coarseR);
    const cJyy = boxBlurFloat(jyy, w, h, coarseR);

    const vx = new Float32Array(n), vy = new Float32Array(n), coherence = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      // Local gradient energy
      const fTrace = fJxx[i] + fJyy[i];
      const fDiff = fJxx[i] - fJyy[i];
      const fDet = fJxx[i] * fJyy[i] - fJxy[i] * fJxy[i];
      const fDisc = Math.max(0, fTrace * fTrace - 4 * fDet);
      const fCoh = fTrace > 0.0001 ? Math.sqrt(fDisc) / (fTrace + 0.0001) : 0;

      // In areas with high fine-scale coherence (facial contours, hair, micro-crevices), use fine tensor.
      // In flat or ambiguous shadow regions, blend in coarse tensor to maintain consistent flow direction.
      const fineWeight = Math.min(1.0, fCoh * 1.8 + Math.hypot(fJxy[i], fDiff) * 8.0);
      const txx = fineWeight * fJxx[i] + (1 - fineWeight) * cJxx[i];
      const txy = fineWeight * fJxy[i] + (1 - fineWeight) * cJxy[i];
      const tyy = fineWeight * fJyy[i] + (1 - fineWeight) * cJyy[i];

      const diff = txx - tyy, trace = txx + tyy;
      const det = txx * tyy - txy * txy;
      const disc = Math.max(0, trace * trace - 4 * det);
      const coh = trace > 0.0001 ? Math.sqrt(disc) / (trace + 0.0001) : 0;
      coherence[i] = Math.min(1.0, coh);

      const norm = Math.hypot(2 * txy, diff);
      if (norm > 0.00005) {
        // Tangent perpendicular to the dominant gradient direction
        vx[i] = -diff / norm;
        vy[i] = -2 * txy / norm;
      } else {
        // Organic harmonic surface curl in flat / low-contrast regions (preventing dead stiff parallel lines)
        const xCoord = i % w, yCoord = Math.floor(i / w);
        const curl = Math.sin(xCoord / 85 + yCoord / 140) * 0.22 + Math.cos(yCoord / 95 - xCoord / 180) * 0.15;
        const angle = -1.36 + curl;
        vx[i] = Math.cos(angle);
        vy[i] = Math.sin(angle);
      }

      // 2.1 3D Surface Normal Enhancement (Lotus / 3D Geometry Integration)
      // When 3D surface normals are present, align flow field with the true cross-contour tangent
      const normalData = params.normalMap?.normals || params.normals;
      if (normalData) {
        const nx = normalData[i * 3];
        const ny = normalData[i * 3 + 1];
        const nz = normalData[i * 3 + 2];
        const normLen = Math.hypot(nx, ny);
        if (normLen > 0.04) {
          // Cross-contour tangent: T = n x (0,0,1) = (ny, -nx)
          const ntx = ny / normLen;
          const nty = -nx / normLen;
          // Align tangent direction with existing vx, vy to prevent 180-deg flipping
          const dot = vx[i] * ntx + vy[i] * nty;
          const sign = dot < 0 ? -1 : 1;
          const alignNtx = ntx * sign;
          const alignNty = nty * sign;

          // Blend 3D normal tangent with 2D gradient tangent
          const normalWeight = Math.min(1.0, normLen * 1.6);
          vx[i] = normalWeight * alignNtx + (1 - normalWeight) * vx[i];
          vy[i] = normalWeight * alignNty + (1 - normalWeight) * vy[i];
          const l = Math.hypot(vx[i], vy[i]);
          if (l > 0.0001) { vx[i] /= l; vy[i] /= l; }
          coherence[i] = Math.max(coherence[i], normalWeight);
        }
      }
    }

    // 3. Anisotropic Flow Diffusion: Smooth ONLY along the tangent flow (never across edges)
    let curVx = vx, curVy = vy;
    for (let pass = 0; pass < 2; pass++) {
      const nVx = new Float32Array(n), nVy = new Float32Array(n);
      for (let y = 1; y < h - 1; y++) {
        const yw = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = yw + x;
          const tx = curVx[i], ty = curVy[i];
          const coh = coherence[i];

          // Sample forward and backward along tangent
          const fx = Math.max(0, Math.min(w - 1, Math.round(x + tx)));
          const fy = Math.max(0, Math.min(h - 1, Math.round(y + ty)));
          const bx = Math.max(0, Math.min(w - 1, Math.round(x - tx)));
          const by = Math.max(0, Math.min(h - 1, Math.round(y - ty)));

          const fIdx = fy * w + fx;
          const bIdx = by * w + bx;

          // Tangent alignment check (dot product) to prevent sign flip
          let fvx = curVx[fIdx], fvy = curVy[fIdx];
          if (tx * fvx + ty * fvy < 0) { fvx = -fvx; fvy = -fvy; }
          let bvx = curVx[bIdx], bvy = curVy[bIdx];
          if (tx * bvx + ty * bvy < 0) { bvx = -bvx; bvy = -bvy; }

          // Anisotropic blend: high coherence keeps strict local tangent, low coherence relaxes along stream
          const smoothWeight = 0.45 * (1.0 - coh * 0.5);
          const sx = tx + (fvx + bvx) * smoothWeight;
          const sy = ty + (fvy + bvy) * smoothWeight;
          const len = Math.hypot(sx, sy);
          if (len > 0.0001) {
            nVx[i] = sx / len;
            nVy[i] = sy / len;
          } else {
            nVx[i] = tx;
            nVy[i] = ty;
          }
        }
      }
      curVx = nVx;
      curVy = nVy;
    }

    return { width: w, height: h, vx: curVx, vy: curVy, coherence };
  }

  function runStage2(sourceImage, lineMap, params = {}) {
    const toneField = computeToneField(sourceImage, params);
    const flowField = computeFlowField(toneField, lineMap, params);
    return { toneField, flowField };
  }

  const api = { runStage2, computeToneField, computeFlowField, guidedFilter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stage2ToneFlow = api;
})(globalThis);
