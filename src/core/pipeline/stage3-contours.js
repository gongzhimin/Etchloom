/* Stage 3: Engraving Contours Vectorization.
 * Extracts continuous sub-pixel centerlines from LineMap and injects engraving grammar:
 * - Dynamic line-width modulation from ToneField
 * - Cubic spline tapering at endpoints
 * - Lost-and-found breath in low-contrast zones
 */
(function(root){
  'use strict';

  function traceCenterlines(lineMap, params = {}) {
    const { width: w, height: h, data } = lineMap;
    const minThreshold = params.contourThreshold ?? 0.85; // Values below this are line candidates
    const visited = new Uint8Array(w * h);
    const polylines = [];

    // Direction offsets (8-neighborhood)
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];

    const gridStep = params.isDraft ? 4 : 2;
    for (let y = gridStep; y < h - gridStep; y += gridStep) {
      const yw = y * w;
      for (let x = gridStep; x < w - gridStep; x += gridStep) {
        const idx = yw + x;
        if (visited[idx] || data[idx] > minThreshold) continue;

        // Trace a polyline starting from this seed
        const points = [];
        let cx = x, cy = y;
        visited[idx] = 1;
        points.push([cx, cy]);

        let tracing = true;
        let stepCount = 0;
        const maxSteps = 1200;

        while (tracing && stepCount++ < maxSteps) {
          let bestNeighbor = -1;
          let bestVal = 1.0;
          for (let dir = 0; dir < 8; dir++) {
            const nx = cx + dx[dir], ny = cy + dy[dir];
            if (nx < 1 || nx >= w - 1 || ny < 1 || ny >= h - 1) continue;
            const nidx = ny * w + nx;
            if (!visited[nidx] && data[nidx] < minThreshold && data[nidx] < bestVal) {
              bestVal = data[nidx];
              bestNeighbor = dir;
            }
          }

          if (bestNeighbor >= 0) {
            cx += dx[bestNeighbor];
            cy += dy[bestNeighbor];
            const nidx = cy * w + cx;
            visited[nidx] = 1;

            // Sub-pixel refinement along gradient
            const gx = (data[nidx + 1] - data[nidx - 1]) * 0.5;
            const gy = (data[nidx + w] - data[nidx - w]) * 0.5;
            const gLen = Math.hypot(gx, gy);
            let subX = cx, subY = cy;
            if (gLen > 0.05) {
              const shift = (data[nidx] - 0.5) * 0.4;
              subX -= (gx / gLen) * shift;
              subY -= (gy / gLen) * shift;
            }
            points.push([subX, subY]);
          } else {
            tracing = false;
          }
        }

        if (points.length >= 4) {
          polylines.push(points);
        }
      }
    }

    return polylines;
  }

  function applyEngravingGrammar(polylines, toneField, params = {}) {
    const { width: w, height: h, tone } = toneField;
    const baseWeight = (params.contour ?? 85) / 100;
    const contours = [];

    for (let pIdx = 0; pIdx < polylines.length; pIdx++) {
      const pts = polylines[pIdx];
      const len = pts.length;
      if (len < 3) continue;

      const widths = new Float32Array(len);
      let validSegments = [];
      let currentSegment = [];

      for (let i = 0; i < len; i++) {
        const [px, py] = pts[i];
        const ix = Math.max(0, Math.min(w - 1, Math.round(px)));
        const iy = Math.max(0, Math.min(h - 1, Math.round(py)));
        const localDark = tone[iy * w + ix]; // 0.0 white, 1.0 dark

        // Dynamic line width modulated gently by local tone
        let width = (0.28 + localDark * 0.52) * baseWeight;

        // Smooth tapering at stroke endpoints
        const taperDist = Math.min(8, Math.floor(len * 0.3));
        if (i < taperDist) {
          width *= (i + 0.5) / taperDist;
        } else if (i >= len - taperDist) {
          width *= (len - i - 0.5) / taperDist;
        }
        widths[i] = Math.max(0.1, width);
      }

      // Preserve the entire continuous contour from Informative Drawings
      contours.push({
        role: 'contour',
        points: pts,
        widths: widths,
        width: widths.reduce((acc, wVal) => acc + wVal, 0) / len
      });
    }

    return contours;
  }

  // Create a fast collision distance/mask map for Stage 4 hatching
  function buildContourMask(contours, width, height) {
    const mask = new Uint8Array(width * height);
    for (const c of contours) {
      for (const pt of c.points) {
        const x = Math.round(pt[0]), y = Math.round(pt[1]);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          mask[y * width + x] = 255;
          // 1px dilation for safety clearance
          if (x > 0) mask[y * width + x - 1] = 255;
          if (x < width - 1) mask[y * width + x + 1] = 255;
          if (y > 0) mask[(y - 1) * width + x] = 255;
          if (y < height - 1) mask[(y + 1) * width + x] = 255;
        }
      }
    }
    return mask;
  }

  function modulateContoursByDepth(contours, depthMap, width, height, params = {}) {
    const depthData = depthMap.data || depthMap;
    const dw = depthMap.width || width;
    const dh = depthMap.height || height;
    const out = [];

    for (let cIdx = 0; cIdx < contours.length; cIdx++) {
      const c = contours[cIdx];
      const pts = c.points;
      if (!pts || pts.length < 2) continue;

      // Sample depth at contour midpoint
      const mid = pts[Math.floor(pts.length / 2)];
      const mx = Math.max(0, Math.min(dw - 1, Math.round(mid[0] * dw / width)));
      const my = Math.max(0, Math.min(dh - 1, Math.round(mid[1] * dh / height)));
      const z = depthData[my * dw + mx]; // 0.0 near, 1.0 far

      // Skip tiny broken fragments in extreme distance (atmospheric fade / paper white)
      if (z > 0.88 && pts.length <= 4) {
        continue;
      }

      // Depth attenuation (aerial perspective: 近浓远淡)
      const aerial = Number(params.aerialStrength ?? 60) / 100;
      const maxAttenuation = 0.65 * aerial;
      const depthScale = z <= 0.35 ? 1.0 : Math.max(1.0 - maxAttenuation, 1.0 - maxAttenuation * ((z - 0.35) / 0.65));

      const newWidths = new Float32Array(c.widths.length);
      for (let i = 0; i < c.widths.length; i++) {
        newWidths[i] = Math.max(0.08, c.widths[i] * depthScale);
      }

      out.push({
        ...c,
        widths: newWidths,
        width: c.width * depthScale
      });
    }

    return out;
  }

  function runStage3(lineMap, toneField, params = {}) {
    const rawLines = traceCenterlines(lineMap, params);
    let vectorContours = applyEngravingGrammar(rawLines, toneField, params);

    // 3D Depth Modulation (Aerial Perspective: 近浓远淡)
    const depthMap = params.depthMap || params.depth;
    if (depthMap) {
      vectorContours = modulateContoursByDepth(vectorContours, depthMap, lineMap.width, lineMap.height, params);
    }

    const contourMask = buildContourMask(vectorContours, lineMap.width, lineMap.height);
    return { vectorContours, contourMask };
  }

  const api = { runStage3, traceCenterlines, applyEngravingGrammar, buildContourMask, modulateContoursByDepth };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stage3Contours = api;
})(globalThis);
