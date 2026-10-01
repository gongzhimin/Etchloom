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

if (typeof window !== 'undefined') {
  window.getPlateState = () => ({ W, H, N, depth, exposed, burr, blocked, tool, view, running, elapsed });
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

export function allocatePlate(width) {
  if (![900, 1500, 3000].includes(width)) throw Error("版面尺寸无效");
  W = width;
  H = Math.round(W * 660 / 900);
  N = W * H;
  const canvas = getCanvas();
  if (canvas) {
    canvas.width = W;
    canvas.height = H;
  }
  depth = new Float32Array(N);
  exposed = new Float32Array(N);
  blocked = new Uint8Array(N);
  burr = new Float32Array(N);
  next = new Float32Array(N);
  resetGrain();
  dirty = true;
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('.resolution-selector .res-btn').forEach(b => {
      b.classList.toggle('active', Number(b.dataset.res) === W);
    });
  }
}

export const val = id => Number($(id)?.value || 0) / 100;

export function snapshot() {
  if ($('irreversible')?.checked) return;
  history.push({
    width: W,
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
  const startText = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager.t('sec.3.startAcid') : '开始腐蚀';
  if ($('etch')) $('etch').textContent = startText;
  if ($('etchTopBtn')) $('etchTopBtn').textContent = startText;
  if ($('etchBtn')) $('etchBtn').textContent = startText;
  if ($('status')) $('status').textContent = '已停止 · 可以继续制版或试印';
  syncUndo();
  if (wasRunning && typeof logMessage === 'function') {
    logMessage('铜版', `酸液腐蚀已停止，当前累计咬蚀时间: ${elapsed.toFixed(1)} 秒`, 'info');
  }
}

export function setView(v) {
  view = v;
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  }
  if ($('caption')) {
    $('caption').textContent = {
      plate: '制版 / 针尖划开保护层，等待酸液进入',
      depth: '刻深 / 黑色为完整表面，亮度表示凹槽深度',
      print: '印样 / 铜版左右反转，墨色由刻深与压印共同决定'
    }[v] || '';
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
          depth[i] = Math.min(1, depth[i] + f * 0.0008);
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
  next.set(exposed);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let i = y * W + x;
      if (blocked[i]) continue;
      let edge = Math.max(exposed[i - 1], exposed[i + 1], exposed[i - W], exposed[i + W]);
      next[i] = Math.min(1, exposed[i] + Math.max(0, edge - exposed[i]) * dt * strength * (0.14 + g * grainNoise[i] * 0.55));
      depth[i] = Math.min(1, depth[i] + next[i] * dt * strength * 0.058 * (1 + g * (grainNoise[i] - 0.5)));
      if (burr[i] > 0) burr[i] = Math.max(0, burr[i] - dt * strength * 0.14);
    }
  }
  [exposed, next] = [next, exposed];
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
  let rough = $('paper')?.value === 'rough';
  let pm = Math.round(26 * W / 900);
  let bw = Math.round(7 * W / 900);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let i = y * W + x;
      let j = mode === 'print' ? y * W + W - 1 - x : i;
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
        let texture = rough ? noise * 9 : noise * 3.5;
        let paperR = 248 - texture, paperG = 242 - texture, paperB = 226 - texture;
        let dxLeft = x - pm, dxRight = W - 1 - pm - x;
        let dyTop = y - pm, dyBottom = H - 1 - pm - y;
        let minBorderDist = Math.min(dxLeft, dxRight, dyTop, dyBottom);
        let bevel = 0;

        if (minBorderDist < -bw) {
          r = paperR + 2;
          g = paperG + 1;
          b = paperB;
        } else if (minBorderDist <= bw) {
          let t = (minBorderDist + bw) / (2 * bw);
          let isShadowSide = (dxLeft < dxRight && dxLeft <= dyBottom) || (dyTop < dyBottom && dyTop <= dxRight);
          bevel = isShadowSide ? (-54 * pressure * Math.sin(t * Math.PI)) : (38 * pressure * Math.sin(t * Math.PI));
          r = Math.max(0, Math.min(255, paperR + bevel));
          g = Math.max(0, Math.min(255, paperG + bevel));
          b = Math.max(0, Math.min(255, paperB + bevel));
        } else {
          let dropOut = 0.07 * (1 - pressure);
          let effD = Math.max(0, d - dropOut);
          let transferRate = effD > 0 ? (1 - Math.exp(-effD * (1.8 + 13.0 * pressure))) : 0;
          let burrInk = bu * 0.95 * ink * (0.30 + 0.70 * pressure);
          let dryThreshold = Math.max(0, (0.65 - ink) * 1.65);
          let dryBreak = (dryThreshold > 0 && noise < dryThreshold) ? 0.0 : 1.0;
          let lineInk = (transferRate * (0.25 + 0.75 * ink) + burrInk) * dryBreak;
          let variation = rough ? (0.75 + grainNoise[(i + seed * 997) % N] * 0.5) : 1;
          let surfaceTone = tone * ink * 0.32;
          let black = Math.min(0.98, lineInk * variation + surfaceTone);
          let pressedR = paperR - 1.5, pressedG = paperG - 1.5, pressedB = paperB - 1;
          r = Math.max(0, Math.min(255, pressedR * (1 - black)));
          g = Math.max(0, Math.min(255, pressedG * (1 - black)));
          b = Math.max(0, Math.min(255, pressedB * (1 - black)));
        }
      }
      a[i * 4] = r;
      a[i * 4 + 1] = g;
      a[i * 4 + 2] = b;
      a[i * 4 + 3] = 255;
    }
  }
  target.putImageData(im, 0, 0);
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
  const stopText = (typeof i18nManager !== 'undefined' && i18nManager && typeof i18nManager.t === 'function') ? i18nManager.t('sec.3.stopAcid') : '停止腐蚀';
  if ($('etch')) $('etch').textContent = stopText;
  if ($('etchTopBtn')) $('etchTopBtn').textContent = stopText;
  if ($('etchBtn')) $('etchBtn').textContent = stopText;
  setPlateStage(3);
  if ($('status')) $('status').textContent = '酸液作用中 · 随时停止以保留细线';
  syncUndo();
  if (typeof logMessage === 'function') {
    logMessage('铜版', `开始酸液咬蚀物理仿真 (酸液强度: ${$('acid')?.value || 45}%, 金相颗粒: ${$('grain')?.value || 45}%)`, 'computing');
  }
}

export function updateAcidGauge() {
  const gauge = $('plateAcidGauge');
  if (!gauge) return;
  let totalD = 0, count = 0;
  const step = Math.max(1, Math.floor(N / 500));
  for (let i = 0; i < N; i += step) {
    if (depth[i] > 0) {
      totalD += depth[i];
      count++;
    }
  }
  const avgMicrons = count > 0 ? (totalD / count * 45).toFixed(1) : '0.0';
  gauge.textContent = `腐蚀 ${elapsed.toFixed(1)}s · 深度 ${avgMicrons}μm`;
}

// Classical 5-Stage Stepper
export let currentPlateStage = 2;
export function setPlateStage(stageNum) {
  currentPlateStage = stageNum;
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
  const steps = document.querySelectorAll('#plateStepper .stepper-step');
  steps.forEach(step => {
    const num = Number(step.dataset.step);
    step.classList.remove('active', 'done');
    if (num < stageNum) {
      step.classList.add('done');
    } else if (num === stageNum) {
      step.classList.add('active');
    }
  });
}

// Bind DOM event listeners for buttons and canvas
export function bindPlateStudioEvents(options = {}) {
  const canvas = getCanvas();
  if (canvas) {
    canvas.onpointerdown = e => {
      if (view === 'print') {
        if ($('status')) $('status').textContent = '切换到铜版或刻深图继续制版';
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
      if (s.width !== W) allocatePlate(s.width);
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
      if ($('status')) $('status').textContent = '虚拟版已载入';
    } catch (err) {
      if ($('status')) $('status').textContent = '打开失败：' + err.message;
    }
    e.target.value = '';
  };

  if ($('etch')) $('etch').onclick = toggleEtch;
  if ($('etchTopBtn')) $('etchTopBtn').onclick = toggleEtch;
  if ($('etchBtn')) $('etchBtn').onclick = toggleEtch;

  if ($('undo')) $('undo').onclick = () => {
    const s = history.pop();
    if (!s) return;
    if (s.width !== W) allocatePlate(s.width);
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
    if ($('status')) $('status').textContent = '静物练习版 · 可继续刻线或开始腐蚀';
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

    // Stepper Steps
    document.querySelectorAll('#plateStepper .stepper-step').forEach(step => {
      step.onclick = () => {
        const num = Number(step.dataset.step);
        if (num === 1) {
          if (typeof options.openTransferWizard === 'function') options.openTransferWizard();
        } else if (num === 2) {
          setPlateStage(2);
          setView('plate');
        } else if (num === 3) {
          setPlateStage(3);
          setView('depth');
        } else if (num === 4) {
          setPlateStage(4);
          setView('plate');
        } else if (num === 5) {
          setPlateStage(5);
          setView('print');
        }
      };
    });

    // Resolution Switcher
    document.querySelectorAll('.resolution-selector .res-btn').forEach(btn => {
      btn.onclick = () => {
        const res = Number(btn.dataset.res);
        if (![900, 1500, 3000].includes(res)) return;
        if (W === res) return;
        snapshot();
        allocatePlate(res);
        document.querySelectorAll('.resolution-selector .res-btn').forEach(b => {
          b.classList.toggle('active', Number(b.dataset.res) === res);
        });
        if (typeof logMessage === 'function') {
          logMessage('铜版', `版面物理网格分辨率切换为: ${W} × ${H} 像素`, 'info');
        }
        if ($('status')) $('status').textContent = `物理网格已切换为 ${W} × ${H}`;
      };
    });
  }

  // Sliders binding with output tags
  for (const id of ['size', 'acid', 'grain', 'ink', 'pressure', 'tone', 'exposure', 'blackPoint', 'whitePoint', 'contourDetail', 'aerialStrength', 'needleWidth', 'density', 'curvatureGate', 'crossHatch']) {
    const el = $(id);
    const out = $(id + 'Val') || $(id + 'Value');
    if (el && out) {
      el.oninput = () => {
        out.value = el.value + (id === 'size' ? ' px' : id === 'needleWidth' ? ' mm' : '%');
        dirty = true;
      };
      el.oninput();
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

// Auto-bind if loaded in browser or test harness
if (typeof document !== 'undefined') {
  bindPlateStudioEvents();
}
