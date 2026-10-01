/* Sub-Module 2.2: Structure-Aligned Geometric Flow Engine.
 * Replaces indiscriminate 25px macro blur with rigid plane tangent snapping.
 * Aligns roof tiles downwards along the roof slope, aligns pillars vertically, and aligns water horizontally.
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
   * Compute structure-aligned flow field.
   */
  function computeStructureAlignedFlow(toneField, lineMap, vectorContours = [], options = {}) {
    const { width: w, height: h, tone } = toneField;
    const n = w * h;

    const planarR = options.planarR ?? Math.max(4, Math.round(w / 120)); // ~6px at 800w
    const edgeSnapStrength = options.edgeSnapStrength ?? 0.88;
    const bgAngle = (options.bgAngle ?? -45) * (Math.PI / 180);
    const bgUx = Math.cos(bgAngle), bgUy = Math.sin(bgAngle);
    const crossAngleOffset = (options.crossAngle ?? 68) * (Math.PI / 180);

    // 1. Compute fine-scale volume tone (preserves ridges, eaves, corners)
    const smoothTone = boxBlurFloat(tone, w, h, planarR);

    // 2. Rasterize vector contour tangents into a tensor field
    const cTxx = new Float32Array(n);
    const cTxy = new Float32Array(n);
    const cWeight = new Float32Array(n);

    for (const c of vectorContours) {
      const pts = c.points;
      if (!pts || pts.length < 2) continue;

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
        const dLen = Math.hypot(dx, dy);
        if (dLen < 1e-4) continue;

        const tx = dx / dLen, ty = dy / dLen;
        // Direction tensor for unoriented lines (angle modulo PI)
        const jx = tx * tx - ty * ty;
        const jy = 2 * tx * ty;

        // Splat along segment with radius ~ 3px
        const steps = Math.max(1, Math.ceil(dLen));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const sx = Math.round(p0[0] + dx * t);
          const sy = Math.round(p0[1] + dy * t);

          for (let ry = -3; ry <= 3; ry++) {
            const py = sy + ry;
            if (py < 0 || py >= h) continue;
            for (let rx = -3; rx <= 3; rx++) {
              const px = sx + rx;
              if (px < 0 || px >= w) continue;
              const rDist = Math.hypot(rx, ry);
              if (rDist > 3.5) continue;

              const pidx = py * w + px;
              const wVal = Math.max(0, 1.0 - rDist / 3.5);
              cTxx[pidx] += jx * wVal;
              cTxy[pidx] += jy * wVal;
              cWeight[pidx] += wVal;
            }
          }
        }
      }
    }

    // 3. Compute surface gradient tensor and combine with contour tangents
    const jxx = new Float32Array(n);
    const jxy = new Float32Array(n);
    const jEnergy = new Float32Array(n);
    const isForeground = new Uint8Array(n);

    // Segment foreground by structure presence or dark tone
    for (let i = 0; i < n; i++) {
      if (cWeight[i] > 0.05 || tone[i] > 0.14) {
        isForeground[i] = 1;
      }
    }

    for (let y = 1; y < h - 1; y++) {
      const yw = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = yw + x;
        if (isForeground[i]) {
          // Tone gradient
          const gtx = (smoothTone[i + 1] - smoothTone[i - 1]) * 0.5;
          const gty = (smoothTone[i + w] - smoothTone[i - w]) * 0.5;
          const gLen = Math.hypot(gtx, gty);

          // Streamline flow is perpendicular to gradient (along iso-luminance)
          // Normal flow tensor:
          let flowJx = 0, flowJy = 0;
          if (gLen > 1e-4) {
            const nx = -gty / gLen, ny = gtx / gLen;
            flowJx = nx * nx - ny * ny;
            flowJy = 2 * nx * ny;
          }

          // Contour tangent tensor:
          const cw = cWeight[i];
          if (cw > 0.01) {
            const cLen = Math.hypot(cTxx[i], cTxy[i]);
            if (cLen > 1e-4) {
              const cNormJx = cTxx[i] / cLen;
              const cNormJy = cTxy[i] / cLen;
              // Strongly snap to contour tangent
              const snapW = Math.min(edgeSnapStrength, 0.4 + cw * 0.2);
              flowJx = flowJx * (1.0 - snapW) + cNormJx * snapW;
              flowJy = flowJy * (1.0 - snapW) + cNormJy * snapW;
            }
          }

          jxx[i] = flowJx;
          jxy[i] = flowJy;
          jEnergy[i] = 1.0;
        } else {
          // Background steady angle
          jxx[i] = Math.cos(2 * bgAngle);
          jxy[i] = Math.sin(2 * bgAngle);
          jEnergy[i] = 1.0;
        }
      }
    }

    // 4. Smooth tensor field slightly (radius 3px)
    const smoothJxx = boxBlurFloat(jxx, w, h, 3);
    const smoothJxy = boxBlurFloat(jxy, w, h, 3);

    const ux = new Float32Array(n);
    const uy = new Float32Array(n);
    const vx = new Float32Array(n);
    const vy = new Float32Array(n);
    const coherence = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      if (!isForeground[i]) {
        ux[i] = bgUx;
        uy[i] = bgUy;
        const vAngle = bgAngle + crossAngleOffset;
        vx[i] = Math.cos(vAngle);
        vy[i] = Math.sin(vAngle);
        coherence[i] = 1.0;
      } else {
        const sx = smoothJxx[i], sy = smoothJxy[i];
        const sLen = Math.hypot(sx, sy);
        coherence[i] = sLen;

        let uAngle = 0.5 * Math.atan2(sy, sx);
        const vAngle = uAngle + crossAngleOffset;

        ux[i] = Math.cos(uAngle);
        uy[i] = Math.sin(uAngle);
        vx[i] = Math.cos(vAngle);
        vy[i] = Math.sin(vAngle);
      }
    }

    return { width: w, height: h, ux, uy, vx, vy, coherence, isForeground };
  }

  const api = { computeStructureAlignedFlow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchGeometryFlow = api;
})(globalThis);
