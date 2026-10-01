/**
 * Virtual Plate Studio Controller (M3: 虚拟铜版画与酸液物理工坊控制器)
 * Manages copperplate state arrays (depth, exposed, blocked, burr),
 * 4 orthogonal tool interactions (needle, drypoint, stop-out varnish, burnisher),
 * PDE-based acid biting simulation, intaglio press rendering, and high-DPI JSON/PNG serialization.
 */

// Core Virtual Plate Studio State
export let W = 900, H = 660, N = W * H;
const $ = id => (typeof document !== 'undefined' && document.getElementById ? document.getElementById(id) : null);
export const getCanvas = () => (typeof document !== 'undefined' ? $('canvas') : null);
export const getCtx = () => {
  const c = getCanvas();
  return c && c.getContext ? c.getContext('2d') : null;
};

export let depth = new Float32Array(N);
export let exposed = new Float32Array(N);
export let blocked = new Uint8Array(N);
export let burr = new Float32Array(N);
export let next = new Float32Array(N);
export let tool = 'needle';
export let view = 'plate';
export let running = false;
export let elapsed = 0;
export let history = [];
export let drawing = false;
export let last = null;
export let seed = 17;
export let dirty = true;
export let plateSources = [];
export let grainNoise = new Float32Array(N);
export let plateFrameStyle = 'double';
export let mirrorPrint = false;
export let sourceAspectRatio = null;
export let etchState = 0; // 0: Standby (待开始), 1: Biting (腐蚀中), 2: Paused (已暂停)

export function setPlateFrameStyle(style) {
  plateFrameStyle = style || 'double';
  dirty = true;
}
export function getPlateFrameStyle() {
  return plateFrameStyle;
}

export function setMirrorPrint(val) {
  mirrorPrint = !!val;
  dirty = true;
}

export function setPlateAspectRatio(width, height) {
  if (width > 0 && height > 0) {
    sourceAspectRatio = width / height;
    const canvas = getCanvas();
    if (canvas && canvas.style) {
      canvas.style.aspectRatio = `${width} / ${height}`;
    }
  }
}

if (typeof window !== 'undefined') {
  window.getPlateState = () => ({ W, H, N, depth, exposed, burr, blocked, tool, view, running, elapsed, etchState });
}

export function resetGrain() {
  grainNoise = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x = (Math.imul(i + 19, 374761393) ^ 12347) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
    grainNoise[i] = (x >>> 0) / 4294967295;
  }
}
resetGrain();

export function allocatePlate(width, height = null) {
  if (![900, 1500, 3000].includes(width)) throw Error("版面尺寸无效");
  W = width;
  if (height && height > 0) {
    H = Math.round(height);
  } else if (sourceAspectRatio && sourceAspectRatio > 0) {
    H = Math.max(1, Math.round(W / sourceAspectRatio));
  } else {
    H = Math.round(W * 660 / 900);
  }
  N = W * H;
  const canvas = getCanvas();
  if (canvas) {
    canvas.width = W;
    canvas.height = H;
    if (canvas.style) {
      canvas.style.aspectRatio = `${W} / ${H}`;
    }
  }
  depth = new Float32Array(N);
  exposed = new Float32Array(N);
  blocked = new Uint8Array(N);
  burr = new Float32Array(N);
  next = new Float32Array(N);
  resetGrain();
  dirty = true;
  const resolutionValue = $('plateResolutionValue');
  if (resolutionValue) resolutionValue.textContent = `${W} × ${H}`;
}

export const val = id => Number($(id)?.value || 0) / 100;

export function snapshot() {
  if ($('irreversible')?.checked) return;
  history.push({
    width: W,
    height: H,
    depth: depth.slice(),
    exposed: exposed.slice(),
    blocked: blocked.slice(),
    burr: burr.slice(),
    elapsed,
    plateSources: (typeof structuredClone === 'function' ? structuredClone(plateSources) : JSON.parse(JSON.stringify(plateSources)))
  });
  while (
    history.length > 1 &&
    (history.length > 12 ||
      history.reduce((n, s) => n + s.depth.byteLength * 2 + s.blocked.byteLength + (s.burr ? s.burr.byteLength : 0), 0) > 128 * 1048576)
  ) {
    history.shift();
  }
  syncUndo();
}

export function syncUndo() {
  if ($('undo')) $('undo').disabled = running || !history.length;
}

export function stop() {
  const wasRunning = running;
  running = false;
  if (wasRunning || elapsed > 0) {
    etchState = 2; // Paused
  } else {
    etchState = 0; // Standby
  }
  const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
  const resumeText = i18n ? i18n.t('cta.resumeEtch') : '继续腐蚀';
  const startText = i18n ? i18n.t('cta.startEtch') : '开始腐蚀';
  const btnText = etchState === 2 ? resumeText : startText;

  if ($('etch')) $('etch').textContent = btnText;
  if ($('etchTopBtn')) $('etchTopBtn').textContent = btnText;
  if ($('etchBtn')) $('etchBtn').textContent = btnText;

  const badge = $('etchStateBadge');
  if (badge && badge.classList) {
    badge.classList.remove('status-biting', 'status-standby', 'status-paused');
    if (etchState === 2) {
      badge.classList.add('status-paused');
      badge.textContent = i18n ? i18n.t('etch.state.paused') : '已暂停';
    } else {
      badge.classList.add('status-standby');
      badge.textContent = i18n ? i18n.t('etch.state.standby') : '待开始';
    }
  }

  if ($('status')) $('status').textContent = i18n ? i18n.t('status.stopped') : '已停止 · 可以继续制版或试印';
  if ($('panel3ProofNavBtn')) $('panel3ProofNavBtn').disabled = etchState !== 2;
  syncUndo();
  if (wasRunning && typeof logMessage === 'function') {
    const cat = i18n ? i18n.t('console.plate') : '铜版';
    logMessage(cat, `酸液腐蚀已停止，当前累计咬蚀时间: ${elapsed.toFixed(1)} 秒`, 'info');
  }
}

export function resetEtchProgress() {
  running = false;
  elapsed = 0;
  etchState = 0;
  const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
  if ($('etchBtn')) $('etchBtn').textContent = i18n ? i18n.t('cta.startEtch') : '放入酸槽，开始腐蚀';
  if ($('panel3ProofNavBtn')) $('panel3ProofNavBtn').disabled = true;
  if ($('etchStateBadge')) $('etchStateBadge').textContent = i18n ? i18n.t('etch.state.standby') : '待开始';
  updateAcidGauge();
  dirty = true;
}

export function setView(v) {
  view = v;
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  }
  const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
  const canvas = getCanvas();
  if (canvas) {
    if (v === 'print') {
      canvas.classList.add('cursor-zoom');
      canvas.title = i18n ? i18n.t('card.clickInspect') : '点击查看全屏大图 (支持滚轮缩放与拖拽)';
    } else {
      canvas.classList.remove('cursor-zoom');
      canvas.title = i18n ? i18n.t('card.clickInspect') : '数字铜版绘图区 (双击或点击右上角按钮可全屏特写)';
    }
  }
  if ($('caption')) {
    const captions = {
      plate: i18n ? i18n.t('caption.plate') : '制版 / 针尖划开保护层，等待酸液进入',
      depth: i18n ? i18n.t('caption.depth') : '刻深 / 黑色为完整表面，亮度表示凹槽深度',
      print: i18n ? i18n.t('caption.print') : '印样 / 纯棉纸双线外框正向印痕，点击画布可全屏特写'
    };
    $('caption').textContent = captions[v] || '';
  }
  dirty = true;
}

export function dab(x, y, force = 1) {
  let r = Number($('size')?.value || 4) * W / 900 / 2;
  let maxR = tool === 'dry' ? r * 1.85 : tool === 'polish' ? r * 1.6 : r;
  for (let yy = Math.max(0, Math.floor(y - maxR - 1)); yy <= Math.min(H - 1, y + maxR + 1); yy++) {
    for (let xx = Math.max(0, Math.floor(x - maxR - 1)); xx <= Math.min(W - 1, x + maxR + 1); xx++) {
      let dist = Math.hypot(xx - x, yy - y);
      let f = Math.max(0, Math.min(1, r + 0.5 - dist)) * force;
      let i = yy * W + xx;
      if (tool === 'stop') {
        if (dist <= r + 0.5) {
          blocked[i] = 1;
          exposed[i] = 0;
          burr[i] = 0;
        }
      } else if (tool === 'polish') {
        let fPol = Math.max(0, Math.min(1, maxR + 0.5 - dist)) * force;
        if (fPol > 0) {
          burr[i] *= Math.max(0, 1 - fPol * 0.88);
          depth[i] *= Math.max(0, 1 - fPol * 0.32);
        }
      } else if (tool === 'dry') {
        if (f > 0) {
          blocked[i] = 0;
          exposed[i] = Math.max(exposed[i], f * 0.7);
          depth[i] = Math.min(1, depth[i] + f * 0.36);
        }
        let fBurr = Math.max(0, Math.min(1, maxR + 0.5 - dist)) * force;
        if (fBurr > 0) {
          let halo = Math.sin(Math.min(Math.PI, dist / (maxR + 0.5) * Math.PI));
          burr[i] = Math.min(1, burr[i] + fBurr * (0.5 + 0.5 * halo));
        }
      } else {
        if (f > 0) {
          blocked[i] = 0;
          exposed[i] = Math.max(exposed[i], f);
          burr[i] = 0;
        }
      }
    }
  }
  dirty = true;
}

export function line(a, b) {
  let d = Math.hypot(b.x - a.x, b.y - a.y);
  let steps = Math.max(1, Math.ceil(d / Math.max(0.7, Number($('size')?.value || 4) * W / 900 / 5)));
  for (let j = 1; j <= steps; j++) {
    dab(a.x + (b.x - a.x) * j / steps, a.y + (b.y - a.y) * j / steps, b.p);
  }
}

export function point(e) {
  const canvas = getCanvas();
  if (!canvas || !canvas.getBoundingClientRect) return { x: 0, y: 0, p: 1 };
  let r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * W / (r.width || W),
    y: (e.clientY - r.top) * H / (r.height || H),
    p: e.pointerType === 'pen' ? Math.max(0.15, e.pressure) : 1
  };
}

export function etch(dt) {
  let strength = val('acid'), g = val('grain');
  const reactionDt = dt * 0.4;
  next.set(exposed);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let i = y * W + x;
      if (blocked[i]) continue;
      let edge = Math.max(exposed[i - 1], exposed[i + 1], exposed[i - W], exposed[i + W]);
      next[i] = Math.min(1, exposed[i] + Math.max(0, edge - exposed[i]) * reactionDt * strength * (0.14 + g * grainNoise[i] * 0.55));
      depth[i] = Math.min(1, depth[i] + next[i] * reactionDt * strength * 0.058 * (1 + g * (grainNoise[i] - 0.5)));
      if (burr[i] > 0) burr[i] = Math.max(0, burr[i] - reactionDt * strength * 0.14);
    }
  }
  exposed.set(next);
  elapsed += dt;
  dirty = true;
}

export function render(target = getCtx(), mode = view) {
  if (!target || !target.createImageData) return;
  let im = target.createImageData(W, H);
  let a = im.data;
  let ink = val('ink');
  let pressure = val('pressure');
  let tone = val('tone');
  const paper = $('paper')?.value || 'rough';
  const paperBase = paper === 'smooth' ? [252, 249, 243]
    : paper === 'linen' ? [244, 238, 224]
    : paper === 'rosaspina' ? [247, 242, 229]
    : [247, 238, 219];
  let pm = Math.round(26 * W / 900);
  let bw = Math.round(7 * W / 900);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let i = y * W + x;
      let j = (mode === 'print' && mirrorPrint) ? y * W + W - 1 - x : i;
      let d = depth[j];
      let bu = burr[j];
      let noise = grainNoise[i];
      let r, g, b;

      if (mode === 'depth') {
        let dVal = Math.min(1, d + bu * 0.4);
        r = g = b = dVal * 255;
      } else if (mode === 'plate') {
        let slope = d - depth[Math.max(0, j - 1)];
        let cut = exposed[j];
        let burrReflect = bu * 55;
        r = 116 + noise * 9 - d * 67 + slope * 110 + cut * 27 + burrReflect;
        g = 85 + noise * 7 - d * 50 + slope * 95 + cut * 25 + burrReflect * 0.9;
        b = 61 + noise * 5 - d * 29 + slope * 75 + cut * 23 + burrReflect * 0.8;
        if (blocked[j]) {
          r *= 0.42;
          g *= 0.32;
          b *= 0.20;
        }
      } else {
        const fiber = (((x >> 3) * 37 ^ (y >> 3) * 91) & 15);
        const cloud = (((x >> 5) * 23 ^ (y >> 5) * 41) & 15);
        const strand = ((x & 31) < 2 && ((y >> 4) & 3) === 0) ? 4 : 0;
        const texture = paper === 'smooth' ? noise * 2.5 + fiber * 0.12
          : paper === 'linen' ? noise * 9 + fiber * 0.7 + strand
          : paper === 'rosaspina' ? noise * 6 + fiber * 0.3 + cloud * 0.5
          : noise * 13 + fiber * 0.9;
        let paperR = paperBase[0] - texture;
        let paperG = paperBase[1] - texture;
        let paperB = paperBase[2] - texture;
        let dropOut = 0.07 * (1 - pressure);
        let effD = Math.max(0, d - dropOut);
        let transferRate = effD > 0 ? (1 - Math.exp(-effD * (1.8 + 13.0 * pressure))) : 0;
        let burrInk = bu * 0.95 * ink * (0.30 + 0.70 * pressure);
        let dryThreshold = Math.max(0, (0.65 - ink) * 1.65);
        let dryBreak = (dryThreshold > 0 && noise < dryThreshold) ? 0.0 : 1.0;
        let lineInk = (transferRate * (0.25 + 0.75 * ink) + burrInk) * dryBreak;
        const grain = grainNoise[(i + seed * 997) % N];
        let variation = paper === 'smooth' ? 1
          : paper === 'linen' ? 0.65 + grain * 0.7
          : paper === 'rosaspina' ? 0.78 + grain * 0.42
          : 0.68 + grain * 0.62;
        let surfaceTone = tone * ink * 0.32;
        let black = Math.min(0.98, lineInk * variation + surfaceTone);
        let pressedR = paperR - 1.5, pressedG = paperG - 1.5, pressedB = paperB - 1;
        r = Math.max(0, Math.min(255, pressedR * (1 - black)));
        g = Math.max(0, Math.min(255, pressedG * (1 - black)));
        b = Math.max(0, Math.min(255, pressedB * (1 - black)));
      }
      a[i * 4] = r;
      a[i * 4 + 1] = g;
      a[i * 4 + 2] = b;
      a[i * 4 + 3] = 255;
    }
  }
  target.putImageData(im, 0, 0);

  // Classical Engraved Frame Border (古典版画外框/边框)
  if (mode === 'print' && target && typeof target.strokeRect === 'function') {
    let style = plateFrameStyle || (typeof document !== 'undefined' ? (document.getElementById('plateFrameStyle')?.value || document.getElementById('frameStyle')?.value) : 'double') || 'double';
    if (style !== 'none') {
      let margin = Math.round(26 * W / 900);
      let gap = Math.round(5 * W / 900);
      let fx1 = margin;
      let fy1 = margin;
      let fw1 = W - 2 * margin;
      let fh1 = H - 2 * margin;

      if (typeof target.save === 'function') target.save();
      const tb = (typeof ThemeBridge !== 'undefined' && ThemeBridge) || (typeof globalThis !== 'undefined' && globalThis.ThemeBridge);
      const theme = tb?.getRenderTheme ? tb.getRenderTheme() : null;
      target.strokeStyle = theme?.inkPrimary || '#1a1918';
      target.lineCap = 'round';
      target.lineJoin = 'round';

      if (style === 'double') {
        let fx2 = fx1 + gap;
        let fy2 = fy1 + gap;
        let fw2 = fw1 - 2 * gap;
        let fh2 = fh1 - 2 * gap;

        target.lineWidth = Math.max(1.2, 1.8 * W / 900);
        target.strokeRect(fx1, fy1, fw1, fh1);
        target.lineWidth = Math.max(0.6, 0.9 * W / 900);
        target.strokeRect(fx2, fy2, fw2, fh2);
      } else if (style === 'fine') {
        target.lineWidth = Math.max(1.0, 1.5 * W / 900);
        target.strokeRect(fx1, fy1, fw1, fh1);
      } else if (style === 'rough') {
        // Authentic Artisanal Hand-cut Rough Frame
        const scale = Math.max(0.7, Math.min(fw1, fh1) / 660);
        const cornerOvershoot = Math.round(7 * scale);
        const lineWidth = Math.max(1.2, 1.6 * W / 900);
        const edges = [
          { p1: [fx1 - cornerOvershoot, fy1], p2: [fx1 + fw1 + cornerOvershoot, fy1], isH: true, seed: 101 },
          { p1: [fx1 + fw1, fy1 - cornerOvershoot], p2: [fx1 + fw1, fy1 + fh1 + cornerOvershoot], isH: false, seed: 202 },
          { p1: [fx1 + fw1 + cornerOvershoot, fy1 + fh1], p2: [fx1 - cornerOvershoot, fy1 + fh1], isH: true, seed: 303 },
          { p1: [fx1, fy1 + fh1 + cornerOvershoot], p2: [fx1, fy1 - cornerOvershoot], isH: false, seed: 404 }
        ];

        for (const edge of edges) {
          const { p1, p2, isH, seed: eSeed } = edge;
          const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          const segments = Math.max(48, Math.round(len / 8));
          let s = eSeed;
          const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

          const pts = [];
          for (let k = 0; k <= segments; k++) {
            const t = k / segments;
            const wave1 = Math.sin(t * Math.PI * 3 + eSeed * 0.1) * 1.8 * scale;
            const wave2 = Math.sin(t * Math.PI * 8 + eSeed * 0.2) * 1.0 * scale;
            const wave3 = Math.sin(t * Math.PI * 23 + eSeed * 0.3) * 0.5 * scale;
            const jitter = (rnd() - 0.5) * 1.6 * scale;
            const offset = wave1 + wave2 + wave3 + jitter;

            const basePx = p1[0] + (p2[0] - p1[0]) * t;
            const basePy = p1[1] + (p2[1] - p1[1]) * t;

            const px = isH ? basePx : basePx + offset;
            const py = isH ? basePy + offset : basePy;

            const widthPulse = Math.sin(t * Math.PI * 4 + eSeed * 0.15);
            const widthJitter = (rnd() - 0.5) * 0.5;
            const strokeW = Math.max(0.6 * scale, lineWidth * (1.1 + 0.65 * widthPulse + widthJitter));

            pts.push({ x: px, y: py, width: strokeW });
          }

          for (let k = 1; k < pts.length; k++) {
            if (typeof target.beginPath === 'function') {
              target.beginPath();
              target.lineWidth = pts[k].width;
              target.moveTo(pts[k - 1].x, pts[k - 1].y);
              target.lineTo(pts[k].x, pts[k].y);
              target.stroke();
            }
          }

          const fleckCount = Math.floor(4 + rnd() * 4);
          for (let f = 0; f < fleckCount; f++) {
            const ft = 0.1 + rnd() * 0.8;
            const idx = Math.floor(ft * segments);
            const basePt = pts[idx];
            const side = rnd() > 0.5 ? 1 : -1;
            const dist = (2.5 + rnd() * 3.5) * scale;
            const fLen = (5 + rnd() * 12) * scale;
            const fxA = isH ? basePt.x : basePt.x + side * dist;
            const fyA = isH ? basePt.y + side * dist : basePt.y;
            const fxB = isH ? fxA + fLen : fxA;
            const fyB = isH ? fyA : fyA + fLen;
            if (typeof target.beginPath === 'function') {
              target.beginPath();
              target.lineWidth = Math.max(0.5 * scale, lineWidth * 0.5);
              target.moveTo(fxA, fyA);
              target.lineTo(fxB, fyB);
              target.stroke();
            }
          }
        }
      }
      if (typeof target.restore === 'function') target.restore();
    }
  }
}

export function download(blob, name) {
  if (typeof URL === 'undefined' || !URL.createObjectURL) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function toggleEtch() {
  if (running) {
    stop();
    return;
  }
  snapshot();
  running = true;
  etchState = 1;
  if ($('panel3ProofNavBtn')) $('panel3ProofNavBtn').disabled = true;
  const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
  const stopText = i18n ? i18n.t('sec.3.stopAcid') : '停止腐蚀';
  const pauseText = i18n ? i18n.t('cta.pauseEtch') : '取出铜版，暂停腐蚀';
  if ($('etch')) $('etch').textContent = stopText;
  if ($('etchTopBtn')) $('etchTopBtn').textContent = stopText;
  if ($('etchBtn')) $('etchBtn').textContent = pauseText;

  const badge = $('etchStateBadge');
  if (badge && badge.classList) {
    badge.classList.remove('status-standby', 'status-paused');
    badge.classList.add('status-biting');
    badge.textContent = i18n ? i18n.t('etch.state.biting') : '腐蚀中';
  }

  setPlateStage(3);
  if ($('status')) $('status').textContent = i18n ? i18n.t('status.etching') : '酸液作用中 · 随时停止以保留细线';
  syncUndo();
  if (typeof logMessage === 'function') {
    const cat = i18n ? i18n.t('console.plate') : '铜版';
    logMessage(cat, `开始酸液咬蚀物理仿真 (酸液强度: ${$('acid')?.value || 45}%, 金相颗粒: ${$('grain')?.value || 45}%)`, 'computing');
  }
}

export function updateAcidGauge() {
  let totalD = 0, count = 0;
  const step = Math.max(1, Math.floor(N / 500));
  for (let i = 0; i < N; i += step) {
    if (depth[i] > 0) {
      totalD += depth[i];
      count++;
    }
  }
  const avgMicrons = count > 0 ? (totalD / count * 45).toFixed(1) : '0.0';
  const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
  const gauge = $('plateAcidGauge');
  if (gauge) {
    gauge.textContent = i18n ? i18n.t('plate.gauge', [elapsed.toFixed(1), avgMicrons]) : `腐蚀 ${elapsed.toFixed(1)}s · 深度 ${avgMicrons}μm`;
  }
  const timeVal = $('etchTimeVal');
  if (timeVal) {
    const sUnit = i18n?.getLocale() === 'en-US' ? 's' : (i18n?.getLocale() === 'vi-VN' ? 'giây' : '秒');
    timeVal.textContent = `${elapsed.toFixed(1)} ${sUnit}`;
  }
  const depthVal = $('etchDepthVal');
  if (depthVal) {
    depthVal.textContent = `${avgMicrons} μm`;
  }
  const progressBar = $('etchProgressBar');
  if (progressBar && progressBar.style) {
    const pct = Math.min(100, Math.round(Number(avgMicrons) / 25.0 * 100));
    progressBar.style.width = `${pct}%`;
  }
}

// Classical 4-Stage Progressive Workflow
export let currentPlateStage = 1;
export function setPlateStage(stageNum) {
  if (stageNum > 4) stageNum = 4;
  if (stageNum < 1) stageNum = 1;
  currentPlateStage = stageNum;
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  const steps = document.querySelectorAll('#plateStepper .stepper-step');
  if (steps && steps.forEach) {
    steps.forEach(step => {
      const num = Number(step.dataset?.step || step.getAttribute?.('data-step') || 0);
      if (step.classList) {
        step.classList.remove('active', 'done');
        if (num < stageNum) {
          step.classList.add('done');
        } else if (num === stageNum) {
          step.classList.add('active');
        }
      }
    });
  }

  for (let i = 1; i <= 4; i++) {
    const panel = $('plateStagePanel' + i);
    if (panel && panel.classList) {
      panel.classList.toggle('active', i === stageNum);
    }
  }
}

// Bind DOM event listeners for buttons and canvas
export function bindPlateStudioEvents(options = {}) {
  const canvas = getCanvas();
  if (canvas) {
    canvas.onpointerdown = e => {
      if (view === 'print') {
        if (typeof options.openPlateFullscreen === 'function') {
          options.openPlateFullscreen();
        }
        return;
      }
      snapshot();
      drawing = true;
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
      last = point(e);
      dab(last.x, last.y, last.p);
    };
    canvas.onpointermove = e => {
      if (!drawing) return;
      const p = point(e);
      line(last, p);
      last = p;
    };
    canvas.onpointerup = canvas.onpointercancel = () => {
      drawing = false;
      last = null;
    };
    canvas.onclick = e => {
      if (view === 'print' && typeof options.openPlateFullscreen === 'function') {
        options.openPlateFullscreen();
      }
    };
    canvas.ondblclick = e => {
      if (typeof options.openPlateFullscreen === 'function') {
        options.openPlateFullscreen();
      }
    };

    const inspectBtn = $('plateCanvasInspectBtn');
    if (inspectBtn) {
      inspectBtn.onclick = e => {
        e?.stopPropagation?.();
        if (typeof options.openPlateFullscreen === 'function') {
          options.openPlateFullscreen();
        }
      };
    }
  }

  if ($('print')) $('print').onclick = () => {
    seed++;
    setPlateStage(5);
    setView('print');
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    render(c.getContext('2d'), 'print');
    c.toBlob(async b => {
      if (!b) {
        if ($('status')) $('status').textContent = '导出失败，请重试';
        return;
      }
      const PlateCodecLib = (typeof PlateCodec !== 'undefined' ? PlateCodec : (typeof window !== 'undefined' ? window.PlateCodec : null));
      if (PlateCodecLib && PlateCodecLib.pngDpi) {
        download(await PlateCodecLib.pngDpi(b, W, window.printPaperMM || 254), 'Etchloom-print-' + seed + '.png');
      } else {
        download(b, 'Etchloom-print-' + seed + '.png');
      }
      if ($('status')) $('status').textContent = '已生成 ' + W + ' × ' + H + ' 印样 · 已发起下载';
    });
  };

  if ($('save')) $('save').onclick = () => {
    const PlateCodecLib = (typeof PlateCodec !== 'undefined' ? PlateCodec : (typeof window !== 'undefined' ? window.PlateCodec : null));
    download(
      new Blob([
        JSON.stringify({
          version: W === 900 ? 1 : 2,
          width: W,
          height: H,
          depth: W === 900 ? Array.from(depth) : PlateCodecLib.encode(depth),
          exposed: W === 900 ? Array.from(exposed) : PlateCodecLib.encode(exposed),
          blocked: W === 900 ? Array.from(blocked) : PlateCodecLib.encode(blocked),
          burr: W === 900 ? Array.from(burr) : PlateCodecLib.encode(burr),
          paperMM: (typeof window !== 'undefined' && window.printPaperMM) || 254,
          elapsed,
          seed,
          plateSources,
          designSession: (typeof window !== 'undefined' && window.designSession) ? window.designSession.save() : null,
          settings: Object.fromEntries(
            ['ink', 'pressure', 'tone', 'paper', 'acid', 'grain', 'size', 'needleMM', 'inkGain']
              .map(id => [id, $(id)?.value])
              .filter(([, value]) => value != null)
          )
        })
      ], { type: 'application/json' }),
      'Etchloom-plate.json'
    );
  };

  if ($('load')) $('load').onclick = () => $('file')?.click();
  if ($('file')) $('file').onchange = async e => {
    try {
      const f = e.target.files[0];
      if (!f) return;
      const s = JSON.parse(await f.text());
      const PlateCodecLib = (typeof PlateCodec !== 'undefined' ? PlateCodec : (typeof window !== 'undefined' ? window.PlateCodec : null));
      const PrintGeneratorLib = (typeof PrintGenerator !== 'undefined' ? PrintGenerator : (typeof window !== 'undefined' ? window.PrintGenerator : null));
      const decoded = PlateCodecLib.read(s);
      if (s.designSession && typeof window !== 'undefined' && window.designSession && !window.designSession.validate(s.designSession)) {
        throw Error('图案会话数据无效');
      }
      if (s.plateSources && (!Array.isArray(s.plateSources) || s.plateSources.length > 1000 || (PrintGeneratorLib && !s.plateSources.every(PrintGeneratorLib.validRecipe)))) {
        throw Error('制版来源数据无效');
      }
      stop();
      snapshot();
      if (s.width !== W || (s.height && s.height !== H)) allocatePlate(s.width, s.height);
      ({ depth, exposed, blocked } = decoded);
      burr = s.burr ? (s.version === 1 ? Float32Array.from(s.burr) : PlateCodecLib.decode(s.burr, Float32Array, N)) : new Float32Array(N);
      if (typeof window !== 'undefined') {
        window.printPaperMM = Number.isFinite(s.paperMM) ? Math.max(50, Math.min(1000, s.paperMM)) : 254;
      }
      elapsed = Number.isFinite(s.elapsed) ? Math.max(0, s.elapsed) : 0;
      seed = Number.isInteger(s.seed) ? Math.abs(s.seed) % 100000 : 17;
      for (const id of ['ink', 'pressure', 'tone', 'paper', 'acid', 'grain', 'size', 'needleMM', 'inkGain']) {
        if (s.settings && s.settings[id] != null && $(id)) {
          $(id).value = s.settings[id];
          if ($(id).oninput) $(id).oninput();
        }
      }
      plateSources = s.plateSources || [];
      if (s.designSession && typeof window !== 'undefined' && window.designSession) await window.designSession.restore(s.designSession);
      dirty = true;
      const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
      if ($('status')) $('status').textContent = i18n ? i18n.t('status.loaded') : '虚拟版已载入';
    } catch (err) {
      const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
      if ($('status')) $('status').textContent = (i18n ? i18n.t('status.loadFailed') : '打开失败') + '：' + err.message;
    }
    e.target.value = '';
  };

  if ($('etch')) $('etch').onclick = toggleEtch;
  if ($('etchTopBtn')) $('etchTopBtn').onclick = toggleEtch;
  if ($('etchBtn')) $('etchBtn').onclick = toggleEtch;

  if ($('undo')) $('undo').onclick = () => {
    const s = history.pop();
    if (!s) return;
    if (s.width !== W || (s.height && s.height !== H)) allocatePlate(s.width, s.height);
    ({ depth, exposed, blocked, elapsed, plateSources } = s);
    burr = s.burr ? s.burr.slice() : new Float32Array(N);
    dirty = true;
    syncUndo();
  };

  if ($('clear')) $('clear').onclick = () => {
    stop();
    snapshot();
    depth.fill(0);
    exposed.fill(0);
    blocked.fill(0);
    burr.fill(0);
    elapsed = 0;
    plateSources = [];
    etchState = 0;
    const badge = $('etchStateBadge');
    if (badge && badge.classList) {
      badge.classList.remove('status-biting', 'status-paused');
      badge.classList.add('status-standby');
      const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
      badge.textContent = i18n ? i18n.t('etch.state.standby') : '待开始';
    }
    const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
    const startText = i18n ? i18n.t('cta.startEtch') : '开始腐蚀';
    if ($('etch')) $('etch').textContent = startText;
    if ($('etchTopBtn')) $('etchTopBtn').textContent = startText;
    if ($('etchBtn')) $('etchBtn').textContent = startText;
    updateAcidGauge();
    dirty = true;
  };

  if ($('demo')) $('demo').onclick = () => {
    stop();
    snapshot();
    if (W !== 900) allocatePlate(900);
    depth.fill(0);
    exposed.fill(0);
    blocked.fill(0);
    burr.fill(0);
    elapsed = 0;
    plateSources = [];
    etchState = 0;
    const badge = $('etchStateBadge');
    if (badge && badge.classList) {
      badge.classList.remove('status-biting', 'status-paused');
      badge.classList.add('status-standby');
      const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
      badge.textContent = i18n ? i18n.t('etch.state.standby') : '待开始';
    }
    let old = tool, sz = $('size')?.value || 4;
    tool = 'dry';
    if ($('size')) $('size').value = 2;
    const path = ps => {
      for (let k = 1; k < ps.length; k++) {
        line({ x: ps[k - 1][0], y: ps[k - 1][1] }, { x: ps[k][0], y: ps[k][1], p: 0.6 });
      }
    };
    path([[90, 505], [810, 505]]);
    path([[240, 490], [233, 293], [260, 266], [260, 176], [310, 176], [310, 266], [337, 293], [331, 490], [240, 490]]);
    path([[377, 490], [368, 335], [481, 335], [471, 490], [377, 490]]);
    path([[530, 490], [526, 245], [628, 245], [641, 490], [530, 490]]);
    for (let x = 240; x < 331; x += 6) path([[x, 302], [x + 2, 482]]);
    for (let y = 350; y < 485; y += 7) path([[379, y], [470, y - 8]]);
    for (let x = 538; x < 632; x += 5) path([[x, 267], [x + 3, 483]]);
    for (let k = 0; k < 40; k++) path([[220 + k * 10, 513], [260 + k * 10, 541 + (k % 4) * 3]]);
    tool = old;
    if ($('size')) $('size').value = sz;
    dirty = true;
    setView('plate');
    const i18n = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager : null;
    if ($('status')) $('status').textContent = i18n ? i18n.t('status.demoLoaded') : '静物练习版 · 可继续刻线或开始腐蚀';
  };

  // Tool Selection Buttons
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-tool]').forEach(b => {
      b.onclick = () => {
        tool = b.dataset.tool;
        document.querySelectorAll('[data-tool]').forEach(e => e.classList.toggle('active', e === b));
      };
    });

    // View Selection Buttons
    document.querySelectorAll('[data-view]').forEach(b => {
      b.onclick = () => setView(b.dataset.view);
    });

    // Stepper Steps (4-stage progressive flow)
    document.querySelectorAll('#plateStepper .stepper-step').forEach(step => {
      step.onclick = () => {
        const num = Number(step.dataset.step);
        if (num === 1) {
          setPlateStage(1);
          setView('plate');
        } else if (num === 2) {
          setPlateStage(2);
          setView('plate');
        } else if (num === 3) {
          setPlateStage(3);
          setView('depth');
        } else if (num === 4 || num === 5) {
          setPlateStage(4);
          setView('print');
        }
      };
    });

  }

  // Sliders binding with output tags & pipeline reactive hooks
  const paperSelect = $('paper');
  if (paperSelect && typeof paperSelect.addEventListener === 'function') {
    const updatePaper = () => {
      dirty = true;
      const description = $('paperDescription');
      const key = `paper.desc.${paperSelect.value}`;
      if (description) {
        description.setAttribute?.('data-i18n', key);
        description.textContent = ((typeof window !== 'undefined' && window.i18nManager) || globalThis.i18nManager)?.t(key) || description.textContent;
      }
    };
    paperSelect.addEventListener('change', updatePaper);
  }
  const masterParamIds = ['exposure', 'blackPoint', 'whitePoint', 'contourDetail', 'aerialStrength', 'needleWidth', 'density', 'curvatureGate', 'crossHatch'];
  for (const id of ['size', 'acid', 'grain', 'ink', 'pressure', 'tone', ...masterParamIds]) {
    const el = $(id);
    const out = $(id + 'Val') || $(id + 'Value');
    if (el && out) {
      const updateVal = () => {
        out.value = id === 'needleWidth'
          ? `${(Number(el.value) / 10).toFixed(1)} mm`
          : el.value + (id === 'size' ? ' px' : '%');
        dirty = true;
      };
      const handleInput = () => {
        updateVal();
        if (masterParamIds.includes(id) && typeof options.onMasterParamChange === 'function') {
          options.onMasterParamChange(id, el.value);
        }
      };
      if (typeof el.addEventListener === 'function') {
        el.addEventListener('input', handleInput);
      }
      el.oninput = handleInput;
      updateVal();
    }
  }

  // Animation frame loop
  let previous = 0, acc = 0;
  function frame(t) {
    let dt = Math.min(0.1, (t - previous) / 1000);
    previous = t;
    if (running) {
      acc += dt;
      if (acc >= 0.08) {
        etch(acc);
        acc = 0;
      }
      if ($('status')) $('status').textContent = '酸液作用中 · 随时停止以保留细线';
    }
    if (dirty) {
      render();
      const timeStr = `${(typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager.t('caption.timer') : '腐蚀累计'} ${elapsed.toFixed(1)} s`;
      if ($('timer')) $('timer').textContent = timeStr;
      if ($('timerBadge')) $('timerBadge').textContent = timeStr;
      updateAcidGauge();
      dirty = false;
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(frame);
    }
  }

  syncUndo();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(frame);
  }
}

// Guarded Retransfer: check if copperplate has manual carvings or acid depth
export function hasPlateModifications() {
  if (elapsed > 0) return true;
  for (let i = 0; i < N; i++) {
    if (depth[i] > 0 || burr[i] > 0 || exposed[i] > 0) return true;
  }
  return false;
}

// Guarded Retransfer: backup current plate state to JSON before overwrite
export function savePlateBackup() {
  const PlateCodecLib = (typeof PlateCodec !== 'undefined' ? PlateCodec : (typeof window !== 'undefined' ? window.PlateCodec : null));
  download(
    new Blob([
      JSON.stringify({
        version: W === 900 ? 1 : 2,
        width: W,
        height: H,
        depth: W === 900 ? Array.from(depth) : (PlateCodecLib && PlateCodecLib.encode ? PlateCodecLib.encode(depth) : Array.from(depth)),
        exposed: W === 900 ? Array.from(exposed) : (PlateCodecLib && PlateCodecLib.encode ? PlateCodecLib.encode(exposed) : Array.from(exposed)),
        blocked: W === 900 ? Array.from(blocked) : (PlateCodecLib && PlateCodecLib.encode ? PlateCodecLib.encode(blocked) : Array.from(blocked)),
        burr: W === 900 ? Array.from(burr) : (PlateCodecLib && PlateCodecLib.encode ? PlateCodecLib.encode(burr) : Array.from(burr)),
        paperMM: (typeof window !== 'undefined' && window.printPaperMM) || 254,
        elapsed,
        seed,
        plateSources,
        timestamp: new Date().toISOString()
      })
    ], { type: 'application/json' }),
    'Etchloom-plate-backup-' + Date.now() + '.json'
  );
}

// Auto-bind if loaded in browser or test harness
if (typeof document !== 'undefined') {
  bindPlateStudioEvents();
}
