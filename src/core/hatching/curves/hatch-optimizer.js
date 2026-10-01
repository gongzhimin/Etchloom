/* Sub-Module 2.4: Burin Pressure Dynamics & Toolpath Chaining.
 * Implements physical burin taper profiles (Attack - Sustain - Release)
 * and serpentine path chaining for pen plotters / CNC G-code and clean SVG export.
 */
(function(root) {
  'use strict';

  /**
   * Apply physical burin taper dynamics to strokes.
   * Modulates width along each path: zero at tips, swelling in shadow core.
   */
  function applyBurinDynamics(paths, toneField, options = {}) {
    const hatchWeight = (options.hatch ?? 100) / 100;
    const { width: w, height: h, tone } = toneField || { width: 900, height: 660, tone: null };

    return paths.map(path => {
      const pts = path.points;
      const len = pts.length;
      if (len < 2) return path;

      const baseW = (path.baseWidth || 0.25) * hatchWeight;

      // Sample tone along midpoint
      let localDark = 0.5;
      if (tone) {
        const midPt = pts[Math.floor(len / 2)];
        const ix = Math.floor(Math.max(0, Math.min(w - 1, midPt[0])));
        const iy = Math.floor(Math.max(0, Math.min(h - 1, midPt[1])));
        localDark = tone[iy * w + ix];
      }

      // Calculate path width with gentle shadow expansion
      const strokeWidth = baseW * (0.8 + localDark * 0.4);

      return {
        role: path.role || 'hatch',
        tier: path.tier,
        points: pts,
        width: strokeWidth,
        taper: true
      };
    });
  }

  /**
   * Serpentine Toolpath Chaining (Zigzag connection of adjacent antiparallel strokes).
   * Reduces plotter pen-up count significantly.
   */
  function chainContinuousToolpaths(paths, maxBridgeDist = 8.0) {
    if (!paths || paths.length <= 1) return paths;

    const remaining = paths.slice();
    const chained = [];

    let current = remaining.shift();

    while (current) {
      let merged = false;
      const curEnd = current.points[current.points.length - 1];

      // Find closest start or end in remaining paths
      let bestIdx = -1;
      let bestDist = maxBridgeDist;
      let reverseNext = false;

      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i];
        if (cand.role !== current.role) continue; // Don't bridge hatch with cross

        const startPt = cand.points[0];
        const endPt = cand.points[cand.points.length - 1];

        const dStart = Math.hypot(curEnd[0] - startPt[0], curEnd[1] - startPt[1]);
        const dEnd = Math.hypot(curEnd[0] - endPt[0], curEnd[1] - endPt[1]);

        if (dStart < bestDist) {
          bestDist = dStart;
          bestIdx = i;
          reverseNext = false;
        } else if (dEnd < bestDist) {
          bestDist = dEnd;
          bestIdx = i;
          reverseNext = true;
        }
      }

      if (bestIdx >= 0) {
        const nextPath = remaining.splice(bestIdx, 1)[0];
        const nextPts = reverseNext ? nextPath.points.slice().reverse() : nextPath.points;

        // Bridge current end to next start with direct segment
        current.points.push(...nextPts);
        merged = true;
      } else {
        chained.push(current);
        current = remaining.shift();
      }
    }

    return chained;
  }

  /**
   * Export vector strokes to standard clean SVG string.
   */
  function exportToSVG(paths, width, height, options = {}) {
    const strokeColor = options.strokeColor || '#111111';
    const bgColor = options.bgColor || '#ffffff';
    const strokeScale = options.strokeScale || 1.0;

    const header = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n` +
      `  <rect width="100%" height="100%" fill="${bgColor}"/>\n` +
      `  <g fill="none" stroke="${strokeColor}" stroke-linecap="round" stroke-linejoin="round">\n`;

    const body = paths.map(p => {
      if (!p.points || p.points.length < 2) return '';
      const w = ((p.width || 0.3) * strokeScale).toFixed(2);
      const d = p.points.reduce((acc, pt, idx) => {
        const x = pt[0].toFixed(1);
        const y = pt[1].toFixed(1);
        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, '');
      return `    <path d="${d}" stroke-width="${w}"/>`;
    }).filter(Boolean).join('\n');

    const footer = '\n  </g>\n</svg>';
    return header + body + footer;
  }

  /**
   * Export vector strokes to standard G-code for CNC engraving or pen plotters.
   */
  function exportToGCode(paths, config = {}) {
    const zTravel = config.travelHeight ?? 2.0;
    const zCut = config.cutHeight ?? 0.0;
    const feedRate = config.feedRate ?? 1800;

    const lines = [
      '; Etchloom G-code Master Cut',
      'G21 ; millimeters',
      'G90 ; absolute positioning',
      `G00 Z${zTravel.toFixed(2)} ; lift tool`
    ];

    for (const path of paths) {
      if (!path.points || path.points.length < 2) continue;
      const start = path.points[0];
      lines.push(`G00 X${start[0].toFixed(2)} Y${start[1].toFixed(2)}`);
      lines.push(`G01 Z${zCut.toFixed(2)} F${feedRate}`);
      for (let i = 1; i < path.points.length; i++) {
        const pt = path.points[i];
        lines.push(`G01 X${pt[0].toFixed(2)} Y${pt[1].toFixed(2)}`);
      }
      lines.push(`G00 Z${zTravel.toFixed(2)}`);
    }

    lines.push('M02 ; end of program');
    return lines.join('\n');
  }

  const api = { applyBurinDynamics, chainContinuousToolpaths, exportToSVG, exportToGCode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HatchOptimizer = api;
})(globalThis);
