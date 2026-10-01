/* Photo refinement pipeline. No DOM; usable in a worker, in browser, and in node tests.
 * Integrated with Etchloom v2 Five-Stage Pipeline:
 * Stage 1: Informative Line Extraction (lineMap)
 * Stage 2: Tone and Flow Field Generation (toneField, flowField)
 * Stage 3: Engraving Contours Vectorization (vectorContours)
 * Stage 4: Flow-Constrained Adaptive Hatching (hatchingPaths)
 * Stage 5: Master Print Synthesis and Physical Embossing (allPaths)
 */
(function(root){
  'use strict';

  function resolveModule(name, fallbackVar) {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { return require('../pipeline/' + name + '.js'); } catch (_) {}
      try { return require('../' + name + '.js'); } catch (_) {}
      try { return require('./' + name + '.js'); } catch (_) {}
    }
    return root[fallbackVar] || null;
  }

  const Stage1 = resolveModule('stage1-informative', 'Stage1Informative');
  const Stage2 = resolveModule('stage2-tone-flow', 'Stage2ToneFlow');
  const Stage3 = resolveModule('stage3-contours', 'Stage3Contours');
  const Stage4 = resolveModule('stage4-hatching', 'Stage4Hatching');
  const Stage5 = resolveModule('stage5-master-print', 'Stage5MasterPrint');

  const defaults = { exposure: 50, blackPoint: 0, whitePoint: 100, shadows: 20, contour: 85, hatch: 100, maze: 0, cross: 65, contourSeed: 1, hatchSeed: 1, mazeSeed: 1, style: 'engraving', curvature: 75 };
  const clone = x => JSON.parse(JSON.stringify(x));
  function random(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function valid(pro) {
    if (!pro || pro.version !== 1) return false;
    for (const k of Object.keys(defaults)) {
      if (k === 'style') {
        const s = pro[k] ?? defaults[k];
        if (!['engraving', 'woodcut'].includes(s)) return false;
        continue;
      }
      const v = pro[k] ?? defaults[k];
      if (!Number.isFinite(v) || v < 0 || v > (k.endsWith('Seed') ? 4294967295 : 100)) return false;
    }
    if ((pro.blackPoint ?? 0) >= (pro.whitePoint ?? 100)) return false;
    return !pro.edits || (Array.isArray(pro.edits) && pro.edits.length <= 300 && pro.edits.every(e =>
      ['white', 'direction', 'cross', 'protect'].includes(e.type) &&
      [e.x, e.y, e.radius, e.angle].every(Number.isFinite) &&
      e.x >= 0 && e.x <= 900 && e.y >= 0 && e.y <= 660 && e.radius >= 1 && e.radius <= 150 &&
      (!e.frozen || (Array.isArray(e.frozen) && e.frozen.length <= 20000 && e.frozen.every(validPath)))
    ));
  }

  function validPath(p) {
    return p && Number.isFinite(p.width) && p.width > 0 && p.width < 30 &&
      Array.isArray(p.points) && p.points.length >= 2 && p.points.length <= 20000 &&
      p.points.every(q => Array.isArray(q) && q.length === 2 && q.every(Number.isFinite) && q[0] >= 0 && q[0] <= 900 && q[1] >= 0 && q[1] <= 660);
  }

  function value(v, pro) {
    const p = { ...defaults, ...pro }, black = p.blackPoint / 100, white = p.whitePoint / 100;
    const adjusted = Math.max(0, Math.min(1, (v / 255 - black) / (white - black)));
    const lit = Math.pow(adjusted, Math.pow(2, (50 - p.exposure) / 35));
    return Math.round(255 * Math.min(1, lit + (p.shadows / 100) * 0.30 * (1 - lit) ** 3));
  }

  function toneImage(image, pro) {
    return { ...image, pixels: image.pixels.map(v => value(v, pro)) };
  }

  function autoLevels(image) {
    const hist = new Uint32Array(256);
    for (const v of image.pixels) hist[v]++;
    const quantile = f => {
      let n = 0;
      for (let i = 0; i < 256; i++) {
        n += hist[i];
        if (n >= image.pixels.length * f) return i;
      }
      return 255;
    };
    const lo = quantile(0.02), hi = quantile(0.98);
    return hi - lo < 5 ? { blackPoint: 0, whitePoint: 100 } : { blackPoint: Math.floor(lo / 255 * 100), whitePoint: Math.min(100, Math.ceil(hi / 255 * 100)) };
  }

  function blur(image, radius) {
    const { width: w, height: h } = image, src = image.pixels, out = new Array(w * h);
    const integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) { row += src[y * w + x]; integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row; }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const l = Math.max(0, x - radius), r = Math.min(w, x + radius + 1), t = Math.max(0, y - radius), b = Math.min(h, y + radius + 1);
      out[y * w + x] = Math.round((integral[b * (w + 1) + r] - integral[t * (w + 1) + r] - integral[b * (w + 1) + l] + integral[t * (w + 1) + l]) / ((r - l) * (b - t)));
    }
    return { width: w, height: h, pixels: out };
  }

  function boxBlurFloat(src, w, h, r) {
    const out = new Float32Array(w * h), integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0, yw = y * w;
      for (let x = 0; x < w; x++) { row += src[yw + x]; integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row; }
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

  const tensorCache = new WeakMap();
  function computeTensorField(image) {
    if (image && typeof image === 'object' && tensorCache.has(image)) {
      const cached = tensorCache.get(image);
      if (cached.width === image.width && cached.height === image.height) return cached;
    }
    const { width: w, height: h } = image, n = w * h, smoothed = blur(image, Math.max(1, Math.round(w / 300))).pixels;
    const jxx = new Float32Array(n), jxy = new Float32Array(n), jyy = new Float32Array(n);
    for (let y = 1; y < h - 1; y++) {
      const yw = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = yw + x, gx = (smoothed[i + 1] - smoothed[i - 1]) * 0.5, gy = (smoothed[i + w] - smoothed[i - w]) * 0.5;
        jxx[i] = gx * gx; jxy[i] = gx * gy; jyy[i] = gy * gy;
      }
    }
    const r = Math.max(2, Math.round(w / 150)), sJxx = boxBlurFloat(jxx, w, h, r), sJxy = boxBlurFloat(jxy, w, h, r), sJyy = boxBlurFloat(jyy, w, h, r);
    const vx = new Float32Array(n), vy = new Float32Array(n), coherence = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const txx = sJxx[i], txy = sJxy[i], tyy = sJyy[i], diff = txx - tyy, trace = txx + tyy, det = txx * tyy - txy * txy;
      const disc = Math.max(0, trace * trace - 4 * det), coh = trace > 0.0001 ? Math.sqrt(disc) / (trace + 0.0001) : 0;
      coherence[i] = coh;
      const norm = Math.hypot(2 * txy, diff);
      if (norm > 0.0001) { vx[i] = -diff / norm * (0.15 + 0.85 * coh); vy[i] = -2 * txy / norm * (0.15 + 0.85 * coh); }
    }
    let curVx = vx, curVy = vy;
    for (let pass = 0; pass < 2; pass++) {
      const nVx = new Float32Array(n), nVy = new Float32Array(n);
      for (let y = 1; y < h - 1; y++) {
        const yw = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = yw + x, blend = 1 - coherence[i] * 0.75;
          const sx = curVx[i] + (curVx[i - 1] + curVx[i + 1] + curVx[i - w] + curVx[i + w]) * 0.25 * blend;
          const sy = curVy[i] + (curVy[i - 1] + curVy[i + 1] + curVy[i - w] + curVy[i + w]) * 0.25 * blend;
          const len = Math.hypot(sx, sy);
          if (len > 0.0001) { nVx[i] = sx / len; nVy[i] = sy / len; } else { nVx[i] = Math.cos(-1.36); nVy[i] = Math.sin(-1.36); }
        }
      }
      curVx = nVx; curVy = nVy;
    }
    const field = { width: w, height: h, vx: curVx, vy: curVy, coherence };
    if (image && typeof image === 'object') tensorCache.set(image, field);
    return field;
  }

  function sampleField(field, x, y) {
    const w = field.width, h = field.height, px = Math.max(0, Math.min(w - 1, (x * w / 900) | 0)), py = Math.max(0, Math.min(h - 1, (y * h / 660) | 0)), i = py * w + px;
    return { vx: field.vx[i], vy: field.vy[i], coherence: field.coherence[i] };
  }

  function sample(image, x, y) {
    return image.pixels[Math.min(image.height - 1, Math.max(0, Math.floor(y * image.height / 660))) * image.width + Math.min(image.width - 1, Math.max(0, Math.floor(x * image.width / 900)))];
  }

  function hash(x, y, seed) {
    let n = (Math.imul((x | 0) + 101, 374761393) ^ Math.imul((y | 0) + 47, 668265263) ^ seed) >>> 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177) >>> 0;
    return (n >>> 0) / 4294967295;
  }

  function angleDelta(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }

  function regionAngle(image, x, y, cross, seed) {
    const field = computeTensorField(image), { vx, vy, coherence } = sampleField(field, x, y), tensorAngle = 0.5 * Math.atan2(vy, vx);
    const tileX = Math.floor(x / 105), tileY = Math.floor(y / 92), drift = (hash(tileX, tileY, seed) - 0.5) * 0.18 * (1 - coherence * 0.85);
    return tensorAngle + drift + (cross ? Math.PI * 0.45 : 0);
  }

  function localContrast(image, x, y) {
    let lo = 255, hi = 0;
    for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4], [0, 0]]) {
      const v = sample(image, x + dx, y + dy);
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    return (hi - lo) / 255;
  }

  function structureKind(image, x, y) {
    const contrast = localContrast(image, x, y);
    if (contrast < 0.045) return 'plane';
    if (contrast > 0.24) return 'fragment';
    return 'curve';
  }

  function engravingGrammar(input, image, seed, params = {}) {
    if (params.style === 'woodcut') {
      return { paths: input, stats: { bundles: input.length, lostContours: 0, deepLayer: 0, brightGaps: 0, planes: input.length, curves: 0, fragments: 0 } };
    }
    const out = [], stats = { bundles: 0, lostContours: 0, deepLayer: 0, brightGaps: 0, planes: 0, curves: 0, fragments: 0 };
    for (let pathIndex = 0; pathIndex < input.length; pathIndex++) {
      const path = input[pathIndex];
      if (path.role === 'contour' || path.role === 'contour-coarse') {
        let points = []; const finish = () => { if (points.length > 1) out.push({ ...path, points }); points = []; };
        for (let i = 0; i < path.points.length; i++) {
          const q = path.points[i], contrast = localContrast(image, q[0], q[1]), keep = contrast > 0.075 || hash(pathIndex, Math.floor(i / 11), seed) > 0.32;
          if (keep) points.push(q); else { finish(); stats.lostContours++; }
        }
        finish(); continue;
      }
      if (path.role !== 'hatch' && path.role !== 'cross') { out.push(path); continue; }
      const centerPoint = path.points[Math.floor(path.points.length / 2)], kind = structureKind(image, centerPoint[0], centerPoint[1]), kindScale = kind === 'plane' ? 1.55 : kind === 'fragment' ? 0.62 : 1;
      const chunk = Math.max(8, Math.round((30 - (params.detail ?? 65) * 0.12) * kindScale));
      for (let start = 0; start < path.points.length - 1; start += chunk) {
        const source = path.points.slice(start, Math.min(path.points.length, start + chunk + 1)); if (source.length < 3) continue;
        const first = source[0], last = source[source.length - 1], cx = (first[0] + last[0]) / 2, cy = (first[1] + last[1]) / 2, dark = 1 - sample(image, cx, cy) / 255;
        if (path.role === 'cross' && (dark < 0.48 || hash(pathIndex, start, seed) > Math.min(1, (dark - 0.42) * 2.2))) continue;
        const current = Math.atan2(last[1] - first[1], last[0] - first[0]), target = regionAngle(image, cx, cy, path.role === 'cross', seed), stability = kind === 'plane' ? 0.82 : kind === 'fragment' ? 0.42 : 0.62, angle = current + angleDelta(current, target) * stability;
        const length = Math.max(5, Math.hypot(last[0] - first[0], last[1] - first[1])) * (0.82 + hash(pathIndex, start + 3, seed) * 0.24), normal = angle + Math.PI / 2;
        const points = source.map((q, i) => { const t = i / (source.length - 1) - 0.5, wobble = (hash(pathIndex * 37 + i, start, seed) - 0.5) * 0.7; return [Math.max(24, Math.min(876, cx + Math.cos(angle) * length * t + Math.cos(normal) * wobble)), Math.max(24, Math.min(636, cy + Math.sin(angle) * length * t + Math.sin(normal) * wobble))]; });
        const separated = fragments({ ...path, points, taper: true, bundle: true, structure: kind }, q => localContrast(image, q[0], q[1]) < 0.19);
        if (separated.length) out.push(...separated); else if (kind === 'fragment') out.push({ ...path, points, taper: true, bundle: true, structure: kind });
        stats.brightGaps += Math.max(0, separated.length - 1); stats.bundles += separated.length; stats[kind === 'plane' ? 'planes' : kind === 'curve' ? 'curves' : 'fragments'] += separated.length;
        if (path.role === 'hatch' && dark > 0.78 && hash(pathIndex, start + 19, seed) < 0.16) {
          const a = angle + Math.PI * 0.24, n = a + Math.PI / 2, l = length * 0.62, deep = points.map((q, i) => { const t = i / (points.length - 1) - 0.5; return [Math.max(24, Math.min(876, cx + Math.cos(a) * l * t + Math.cos(n) * (hash(i, start, seed) - 0.5) * 0.5)), Math.max(24, Math.min(636, cy + Math.sin(a) * l * t + Math.sin(n) * (hash(i, start, seed) - 0.5) * 0.5))]; });
          for (const segment of fragments({ ...path, points: deep, width: path.width * 0.62, role: 'cross', layer: 3, bundle: true, structure: kind }, q => localContrast(image, q[0], q[1]) < 0.19)) out.push(segment); stats.deepLayer++;
        }
      }
    }
    return { paths: out, stats };
  }

  function microDetails(image, seed, params = {}) {
    const { width: w, height: h, pixels } = image, detail = params.detail ?? 65, candidates = [], step = w >= 450 ? 2 : 1;
    const at = (x, y) => pixels[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
    for (let y = 2; y < h - 2; y += step) for (let x = 2; x < w - 2; x += step) {
      const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 1020;
      const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 1020;
      const fine = Math.abs(at(x, y) * 4 - at(x - 1, y) - at(x + 1, y) - at(x, y - 1) - at(x, y + 1)) / 1020, score = Math.hypot(gx, gy) * 0.8 + fine * 0.75, threshold = 0.025 + (100 - detail) * 0.00045;
      if (score > threshold && hash(x, y, seed) < Math.min(1, (score - threshold) * 9 + 0.08)) candidates.push({ x, y, gx, gy, score });
    }
    candidates.sort((a, b) => b.score - a.score); const limit = 1000 + Math.round(detail * 42), paths = [];
    for (const [i, q] of candidates.slice(0, limit).entries()) {
      const x = q.x * 900 / w, y = q.y * 660 / h, a = Math.atan2(q.gy, q.gx) + Math.PI / 2, length = 2.5 + detail * 0.055 + Math.min(7, q.score * 18), jitter = (hash(i, 17, seed) - 0.5) * 0.35, n = a + Math.PI / 2;
      const bound = ([px, py]) => [Math.max(24, Math.min(876, px)), Math.max(24, Math.min(636, py))];
      paths.push({ points: [bound([x - Math.cos(a) * length / 2 + Math.cos(n) * jitter, y - Math.sin(a) * length / 2 + Math.sin(n) * jitter]), bound([x, y]), bound([x + Math.cos(a) * length / 2 - Math.cos(n) * jitter, y + Math.sin(a) * length / 2 + Math.sin(n) * jitter])], width: 0.16 + Math.min(0.62, q.score * 0.9), role: 'hatch', mark: 'micro-detail', taper: true });
    }
    return paths;
  }

  function backgroundField(image, seed, params = {}) {
    const border = []; for (let x = 0; x < 900; x += 8) { border.push(sample(image, x, 25), sample(image, x, 635)); } for (let y = 25; y < 636; y += 8) { border.push(sample(image, 25, y), sample(image, 875, y)); }
    const mean = border.reduce((a, b) => a + b, 0) / border.length, variance = border.reduce((a, b) => a + (b - mean) ** 2, 0) / border.length;
    if (mean > 244 && variance < 100) return [];
    const angle = -0.67 + (hash(3, 5, seed) - 0.5) * 0.14, spacing = 12 - (params.detail ?? 65) * 0.045, paths = [];
    for (let offset = -620; offset < 920; offset += spacing) {
      let points = []; const finish = () => { if (points.length > 4) paths.push({ points, width: 0.22 + Math.max(0, 210 - mean) * 0.0015, role: 'hatch', mark: 'background', taper: true }); points = []; };
      for (let t = -80; t < 1100; t += 4) {
        const x = t, y = offset + Math.tan(angle) * t, v = sample(image, x, y), quiet = localContrast(image, x, y) < 0.09, similar = Math.abs(v - mean) < 42;
        if (x >= 25 && x <= 875 && y >= 25 && y <= 635 && quiet && similar && v < 248) points.push([x, y]); else finish();
      } finish();
    }
    return paths;
  }

  function darkMasses(image, seed, params = {}) {
    const paths = []; for (let y = 28; y < 634; y += 7) for (let x = 28; x < 874; x += 7) {
      const dark = 1 - sample(image, x, y) / 255; if (dark < 0.82 || hash(x, y, seed) > (dark - 0.78) * 1.35) continue;
      const a = regionAngle(image, x, y, false, seed) + ((hash(y, x, seed) - 0.5) * 0.65), length = 2.5 + (dark - 0.82) * 20;
      const point = t => [Math.max(24, Math.min(876, x + Math.cos(a) * length * t)), Math.max(24, Math.min(636, y + Math.sin(a) * length * t))];
      paths.push({ points: [point(-0.5), point(0.5)], width: 0.8 + (dark - 0.82) * 8, role: 'hatch', mark: 'dark-mass' });
    }
    return paths;
  }

  function imageMaze(image, seed) {
    const rng = random(seed), paths = [], regions = [];
    function tile(x, y, w, h, level) {
      let sum = 0, min = 255, max = 0;
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const v = sample(image, x + (i + 0.5) * w / 5, y + (j + 0.5) * h / 5); sum += v; min = Math.min(min, v); max = Math.max(max, v); }
      const dark = 1 - sum / (25 * 255);
      if (level < 2 && (dark > 0.45 || max - min > 80)) { tile(x, y, w / 2, h / 2, level + 1); tile(x + w / 2, y, w / 2, h / 2, level + 1); tile(x, y + h / 2, w / 2, h / 2, level + 1); tile(x + w / 2, y + h / 2, w / 2, h / 2, level + 1); return; }
      if (dark < 0.08 && max - min < 50) return;
      const cols = 6, rows = 6, n = 36, passages = new Uint8Array(n), seen = new Uint8Array(n), tones = new Float32Array(n), edges = [];
      for (let i = 0; i < n; i++) tones[i] = sample(image, x + (i % cols + 0.5) * w / cols, y + (Math.floor(i / cols) + 0.5) * h / rows) / 255;
      const adjacent = i => { const result = []; for (const [dx, dy, bit, back] of [[1, 0, 1, 2], [-1, 0, 2, 1], [0, 1, 4, 8], [0, -1, 8, 4]]) { const xx = i % cols + dx, yy = Math.floor(i / cols) + dy; if (xx >= 0 && xx < cols && yy >= 0 && yy < rows) { const j = yy * cols + xx; if (tones[j] < 0.92 && Math.abs(tones[j] - tones[i]) < 0.18) result.push([j, bit, back]); } } return result; };
      for (let start = 0; start < n; start++) {
        if (seen[start] || tones[start] > 0.92) continue; seen[start] = 1; const stack = [start];
        while (stack.length) { const i = stack[stack.length - 1], options = adjacent(i).filter(([j]) => !seen[j]); if (!options.length) { stack.pop(); continue; } const [j, bit, back] = options[Math.floor(rng() * options.length)]; passages[i] |= bit; passages[j] |= back; seen[j] = 1; edges.push([i, j]); stack.push(j); }
      }
      for (let i = 0; i < n; i++) for (const [j, bit, back] of adjacent(i)) if (j > i && !(passages[i] & bit) && rng() < tones[i] * 0.42) { passages[i] |= bit; passages[j] |= back; edges.push([i, j]); }
      function wall(a, b, d) { if (d < 0.08) return; paths.push({ points: [a, b], width: 0.2 + d * 0.65, role: 'maze' }); }
      for (let i = 0; i < n; i++) {
        const gx = i % cols, gy = Math.floor(i / cols), xx = x + gx * w / cols, yy = y + gy * h / rows, d = 1 - tones[i];
        if (!(passages[i] & 1)) wall([xx + w / cols, yy], [xx + w / cols, yy + h / rows], d);
        if (!(passages[i] & 4)) wall([xx, yy + h / rows], [xx + w / cols, yy + h / rows], d);
        if (gx === 0) wall([xx, yy], [xx, yy + h / rows], d); if (gy === 0) wall([xx, yy], [xx + w / cols, yy], d);
      }
      regions.push({ tones: Array.from(tones), edges, cols, rows });
    }
    for (let y = 30; y < 630; y += 100) for (let x = 30; x < 870; x += 120) tile(x, y, 120, 100, 0);
    return { paths, regions };
  }

  function touches(path, e) {
    return path.points.some(q => Math.hypot(q[0] - e.x, q[1] - e.y) < e.radius) ||
      path.points.slice(1).some((b, i) => {
        const a = path.points[i], dx = b[0] - a[0], dy = b[1] - a[1];
        const t = Math.max(0, Math.min(1, ((e.x - a[0]) * dx + (e.y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(a[0] + t * dx - e.x, a[1] + t * dy - e.y) < e.radius;
      });
  }

  function fragments(path, predicate) {
    const result = [];
    let points = [];
    function finish() { if (points.length > 1) result.push({ ...path, points }); points = []; }
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1], b = path.points[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
      for (let k = 0; k < steps; k++) {
        const q = [a[0] + (b[0] - a[0]) * k / steps, a[1] + (b[1] - a[1]) * k / steps];
        if (predicate(q)) points.push(q); else finish();
      }
    }
    const end = path.points[path.points.length - 1];
    if (predicate(end)) points.push(end);
    finish();
    return result;
  }

  function applyEdits(base, edits = []) {
    let paths = base;
    for (const e of edits) {
      const inside = q => Math.hypot(q[0] - e.x, q[1] - e.y) < e.radius;
      const next = [];
      for (const path of paths) {
        if (!touches(path, e)) { next.push(path); continue; }
        if (e.type === 'white' || e.type === 'protect') {
          next.push(...fragments(path, q => !inside(q)));
          continue;
        }
        if (e.type === 'direction') {
          const points = path.points.map(q => {
            if (!inside(q)) return q;
            const dx = q[0] - e.x, dy = q[1] - e.y, d = Math.hypot(dx, dy), blend = (1 - d / e.radius) ** 2;
            const projection = dx * Math.cos(e.angle) + dy * Math.sin(e.angle);
            return [q[0] + (e.x + Math.cos(e.angle) * projection - q[0]) * blend * 0.85, q[1] + (e.y + Math.sin(e.angle) * projection - q[1]) * blend * 0.85];
          });
          next.push({ ...path, points });
        } else {
          next.push(path);
          for (const segment of fragments(path, inside)) {
            next.push({
              ...segment,
              width: segment.width * 0.65,
              points: segment.points.map(q => [e.x - (q[1] - e.y), e.y + (q[0] - e.x)]).filter(q => q[0] >= 0 && q[0] <= 900 && q[1] >= 0 && q[1] <= 660)
            });
          }
        }
      }
      if (e.type === 'protect' && e.frozen) next.push(...e.frozen);
      paths = next.filter(p => p.points.length > 1);
    }
    return paths;
  }

  function freeze(paths, e) {
    return paths.filter(p => touches(p, e)).flatMap(p => fragments(p, q => Math.hypot(q[0] - e.x, q[1] - e.y) < e.radius));
  }

  // --- Core Five-Stage Pipeline Cache and Execution ---
  const stagesCache = new WeakMap();

  function computeStages(image, params = {}) {
    if (!image || !Array.isArray(image.pixels)) return null;
    const { width: w, height: h, pixels } = image, n = w * h;
    const detail = params.detail ?? 65;

    // Stage 1: Informative Line Map
    let lineMap;
    if (Stage1 && Stage1.runStage1) {
      lineMap = (image.lineMapObj) || {
        width: w, height: h,
        data: (image.lineMap && image.lineMap.length === w * h) ? image.lineMap : null
      };
    }
    if (!lineMap || !lineMap.data) {
      const data = new Float32Array(n);
      data.fill(1.0);
      for (let y = 1; y < h - 1; y++) {
        const yw = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = yw + x;
          const gx = (pixels[i + 1] - pixels[i - 1]) * 0.5;
          const gy = (pixels[i + w] - pixels[i - w]) * 0.5;
          data[i] = Math.max(0, 1.0 - Math.hypot(gx, gy) / 128);
        }
      }
      lineMap = { width: w, height: h, data };
    }

    // Stage 2: Tone & Flow Field
    const toneResult = Stage2 ? Stage2.runStage2(image, lineMap, params) : null;
    const toneField = toneResult?.toneField || { width: w, height: h, tone: Float32Array.from(pixels, v => 1.0 - v / 255) };
    const flowField = toneResult?.flowField || computeTensorField(image);

    // Stage 3: Vector Contours
    const contourResult = Stage3 ? Stage3.runStage3(lineMap, toneField, params) : { vectorContours: [], contourMask: new Uint8Array(n) };
    const vectorContours = contourResult.vectorContours;
    const contourMask = contourResult.contourMask;

    // Stage 4: Hatching
    const hatchingPaths = Stage4 ? Stage4.runStage4(toneField, flowField, contourMask, params) : [];

    // Stage 5: Master Print
    const masterResult = Stage5 ? Stage5.runStage5(vectorContours, hatchingPaths, toneField, flowField, params) : {
      width: w, height: h,
      paths: [...hatchingPaths, ...vectorContours],
      stats: { totalPaths: hatchingPaths.length + vectorContours.length }
    };

    const grayPixels = pixels;
    let toneArr = Float32Array.from(pixels, v => v / 255);
    const smoothPixels = new Uint8Array(n);
    for (let i = 0; i < n; i++) smoothPixels[i] = Math.round((1 - toneField.tone[i]) * 255);

    const ridgePixels = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (contourMask[i]) ridgePixels[i] = 2;

    const bundle = {
      width: w,
      height: h,
      detail,
      grayPixels,
      smoothPixels,
      tensorField: flowField,
      ridgePixels,
      stage1: lineMap,
      stage2: { toneField, flowField },
      stage3: { vectorContours, contourMask },
      stage4: { hatchingPaths },
      stage5: masterResult,
      paths: masterResult.paths
    };

    stagesCache.set(image, bundle);
    return bundle;
  }

  function generate(recipe, baseGenerate, progress = () => {}) {
    const p = { ...defaults, ...recipe.pro };
    const image = toneImage(recipe.image, p);
    progress(10, '明暗校正');

    if (baseGenerate) {
      // Classic generator integration with full grammar/maze pipeline
      const base = baseGenerate({ ...recipe, pro: undefined, image, seed: (recipe.seed ^ p.hatchSeed) >>> 0 });
      progress(55, '轮廓与排线');
      const budget = Math.max(1, (p.hatch + p.maze) / 100);
      const paths = [], contourRandom = random(p.contourSeed);
      for (const path of base.paths) {
        const isContour = path.role === 'contour';
        const weight = (isContour ? p.contour : p.hatch / budget) / 100 * (path.role === 'cross' ? p.cross / 100 : 1) * (isContour ? 0.92 + contourRandom() * 0.16 : 1);
        if (weight > 0) paths.push({ ...path, width: path.width * weight });
      }
      if (p.contour > 0 && recipe.image.width >= 450) {
        const coarse = baseGenerate({ ...recipe, pro: undefined, image: blur(image, Math.max(1, Math.round(image.width / 300))), seed: (p.contourSeed ^ recipe.seed) >>> 0, params: { ...recipe.params, density: 0, fidelity: 100, detail: 45 } });
        for (const path of coarse.paths) if (path.role === 'contour') paths.push({ ...path, width: path.width * p.contour / 100 * 0.35, role: 'contour-coarse' });
      }
      const styleSeed = (recipe.seed ^ recipe.variation ^ p.hatchSeed) >>> 0;
      const grammar = engravingGrammar(paths, image, styleSeed, recipe.params);
      const detailWeight = (p.hatch * 0.65 + p.contour * 0.35) / 100;
      const isWoodcut = recipe.params?.style === 'woodcut';
      const micro = isWoodcut ? [] : microDetails(image, styleSeed ^ 0x51f15e, recipe.params);
      for (const path of micro) grammar.paths.push({ ...path, width: path.width * detailWeight });
      const background = isWoodcut ? [] : backgroundField(image, styleSeed ^ 0xa11ce, recipe.params);
      for (const path of background) grammar.paths.push({ ...path, width: path.width * p.hatch / 100 });
      const masses = isWoodcut ? [] : darkMasses(image, styleSeed ^ 0xda4c, recipe.params);
      for (const path of masses) grammar.paths.push({ ...path, width: path.width * p.hatch / 100 });
      progress(75, '图片迷宫');
      let mazeRegions = 0;
      if (p.maze > 0) {
        const maze = imageMaze(image, (p.mazeSeed ^ recipe.seed ^ recipe.variation) >>> 0);
        mazeRegions = maze.regions.length;
        for (const path of maze.paths) grammar.paths.push({ ...path, width: path.width * p.maze / 100 / budget });
      }
      progress(90, '局部编辑');
      const edited = applyEdits(grammar.paths, p.edits);
      // Precompute 5-stage bundle in background for smooth UI inspection
      computeStages(image, { ...recipe.params, ...p });
      return {
        ...base,
        paths: edited,
        recipe: clone(recipe),
        stats: { ...base.stats, ...grammar.stats, microDetails: micro.length, background: background.length, darkMasses: masses.length, mazeRegions, edits: (p.edits || []).length, pro: true }
      };
    }

    // Direct standalone five-stage generation
    const stages = computeStages(image, { ...recipe.params, ...p });
    let paths = stages.stage5.paths;
    if (p.edits && p.edits.length > 0) paths = applyEdits(paths, p.edits);
    return {
      version: 1,
      width: stages.width,
      height: stages.height,
      paths,
      recipe: clone(recipe),
      stats: { ...stages.stage5.stats, edits: (p.edits || []).length, pro: true }
    };
  }

  function makeOffscreen(source, w, h, colorFn) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const im = ctx.createImageData(w, h);
    const d = im.data;
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      if (colorFn) {
        const [r, g, b, a] = colorFn(source[i], i);
        d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = a;
      } else {
        const val = typeof source[i] === 'number' ? Math.round(source[i] <= 1.0 && source[i] >= 0 ? source[i] * 255 : source[i]) : 255;
        d[idx] = val; d[idx + 1] = val; d[idx + 2] = val; d[idx + 3] = 255;
      }
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }

  function renderStage(context, recipe, result, stageId = 'stage5', options = {}) {
    if (!context || !context.canvas) return;
    const canvas = context.canvas, w = canvas.width, h = canvas.height;
    const onionSkin = Math.max(0, Math.min(1, options.onionSkin || 0));
    const strokeScale = options.strokeScale || 1;
    const stages = recipe?.image ? computeStages(recipe.image, recipe.params) : null;
    const generator = (typeof module !== 'undefined' && module.exports) ? require('./generator.js') : root.PrintGenerator;

    context.save();
    context.clearRect(0, 0, w, h);

    if (onionSkin > 0 && stages) {
      const baseOff = makeOffscreen(stages.grayPixels, stages.width, stages.height);
      if (baseOff) {
        context.save();
        context.globalAlpha = onionSkin;
        context.drawImage(baseOff, 0, 0, w, h);
        context.restore();
      }
    }

    const stageAlpha = onionSkin > 0 ? Math.max(0.25, 1.0 - onionSkin * 0.65) : 1.0;
    context.globalAlpha = stageAlpha;

    switch (stageId) {
      case 'gray': {
        if (stages) {
          const off = makeOffscreen(stages.grayPixels, stages.width, stages.height);
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'smooth': {
        if (stages) {
          const off = makeOffscreen(stages.smoothPixels, stages.width, stages.height);
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'stage1':
      case 'line': {
        if (stages && stages.stage1) {
          const off = makeOffscreen(stages.stage1.data, stages.width, stages.height, v => {
            const ink = Math.round(v * 255);
            return [ink, ink, ink, 255];
          });
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'stage2':
      case 'tensor': {
        if (stages && stages.tensorField) {
          if (stages.smoothPixels) {
            const off = makeOffscreen(stages.smoothPixels, stages.width, stages.height);
            if (off) {
              context.save();
              context.globalAlpha = 0.45;
              context.drawImage(off, 0, 0, w, h);
              context.restore();
            }
          } else if (onionSkin === 0) {
            context.fillStyle = '#1c201c';
            context.fillRect(0, 0, w, h);
          }
          const field = stages.tensorField, fw = field.width, fh = field.height;
          const step = Math.max(10, Math.round(14 * (w / 900)));
          const lenBase = 5 * (w / 900);
          for (let y = step * 0.5; y < h; y += step) {
            for (let x = step * 0.5; x < w; x += step) {
              const px = Math.max(0, Math.min(fw - 1, (x * fw / w) | 0));
              const py = Math.max(0, Math.min(fh - 1, (y * fh / h) | 0));
              const idx = py * fw + px;
              const vx = field.vx[idx], vy = field.vy[idx], coh = field.coherence[idx];
              if (coh < 0.04) continue;
              const angle = 0.5 * Math.atan2(vy, vx);
              // Compact, elegant compass needles: 6px ~ 11px max
              const curLen = (lenBase + coh * 5.5 * (w / 900)) * (0.85 + coh * 0.25);
              const dx = Math.cos(angle) * curLen * 0.5, dy = Math.sin(angle) * curLen * 0.5;
              context.beginPath();
              context.moveTo(x - dx, y - dy);
              context.lineTo(x + dx, y + dy);
              if (coh > 0.45) {
                context.strokeStyle = `rgba(243, 198, 35, ${Math.min(1, 0.45 + coh * 0.55)})`;
                context.lineWidth = Math.max(1.0, 1.8 * (w / 900));
              } else if (coh > 0.18) {
                context.strokeStyle = `rgba(214, 180, 85, ${0.35 + coh * 0.5})`;
                context.lineWidth = Math.max(0.8, 1.3 * (w / 900));
              } else {
                context.strokeStyle = `rgba(145, 160, 138, ${0.25 + coh * 0.4})`;
                context.lineWidth = Math.max(0.6, 0.9 * (w / 900));
              }
              context.stroke();
            }
          }
        }
        break;
      }
      case 'ridge': {
        if (stages) {
          if (onionSkin === 0) {
            context.fillStyle = '#181b19';
            context.fillRect(0, 0, w, h);
          }
          const off = makeOffscreen(stages.ridgePixels, stages.width, stages.height, v => {
            if (v === 2) return [245, 215, 110, 255];
            if (v === 1) return [231, 76, 60, 230];
            return [0, 0, 0, 0];
          });
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'stage3':
      case 'contour': {
        const contourPaths = stages?.stage3?.vectorContours || (result?.paths || []).filter(p => p.role === 'contour' || p.role === 'contour-coarse');
        if (generator) generator.draw(context, { paths: contourPaths }, onionSkin === 0, strokeScale);
        break;
      }
      case 'stage4':
      case 'hatch': {
        const hatchPaths = stages?.stage4?.hatchingPaths || (result?.paths || []).filter(p => (p.role === 'hatch' && p.mark !== 'micro-detail') || p.role === 'cross');
        if (generator) generator.draw(context, { paths: hatchPaths }, onionSkin === 0, strokeScale);
        break;
      }
      case 'stage5':
      case 'full':
      default: {
        if (generator) generator.draw(context, result || stages?.stage5, onionSkin === 0, strokeScale);
        break;
      }
    }
    context.restore();
  }

  const api = {
    defaults,
    valid,
    value,
    toneImage,
    autoLevels,
    imageMaze,
    structureKind,
    engravingGrammar,
    microDetails,
    backgroundField,
    darkMasses,
    generate,
    applyEdits,
    freeze,
    fragments,
    computeTensorField,
    sampleField,
    regionAngle,
    computeStages,
    renderStage
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PhotoPro = api;
})(globalThis);
