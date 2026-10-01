(function(root) {
  'use strict';

/**
 * Step Flow Grid Component (M1: 步骤流视口网格)
 * Manages the responsive grid of 7 pipeline stages (Step 0..6),
 * status badges (cached, computing, done), vector path drawing, and micro-interactions.
 */
class StepFlowGrid {
  /**
   * @param {HTMLElement} container Parent DOM element to render into
   * @param {Object} options
   * @param {Object} [options.i18n] I18nManager instance
   * @param {Function} [options.onStepSelect] (stepIndex: number) => void
   * @param {Function} [options.onStepExport] (stepIndex: number) => void
   * @param {Function} [options.onStepLoupe] (stepIndex: number, canvas: HTMLCanvasElement) => void
   * @param {Function} [options.onStepFullscreen] (stepIndex: number, canvas: HTMLCanvasElement) => void
   */
  constructor(container, options = {}) {
    this.container = container;
    this.i18n = options.i18n || (globalThis.I18n?.I18nManager ? new globalThis.I18n.I18nManager() : null);
    this.onStepSelect = options.onStepSelect || (() => {});
    this.onStepExport = options.onStepExport || (() => {});
    this.onStepLoupe = options.onStepLoupe || (() => {});
    this.onStepFullscreen = options.onStepFullscreen || (() => {});

    this.stepStates = Array.from({ length: 7 }, (_, idx) => ({
      index: idx,
      status: 'IDLE', // 'IDLE' | 'COMPUTING' | 'CACHED' | 'DONE' | 'ERROR'
      cached: false,
      canvas: null,
      metaEl: null,
      badgeEl: null,
      timeEl: null,
      lastImage: null,
      lastPaths: null
    }));

    if (this.container) {
      this.render();
    }
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'step-flow-grid etchloom-step-grid';

    for (let i = 0; i <= 6; i++) {
      const card = document.createElement('div');
      card.className = `step-card etchloom-step-card step-${i}${i === 6 ? ' step-final' : ''}`;
      card.dataset.step = i;

      // Card Header
      const header = document.createElement('div');
      header.className = 'card-header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'card-title-wrap';

      const stepNum = document.createElement('span');
      stepNum.className = 'step-num';
      stepNum.textContent = `[0${i}]`;

      const title = document.createElement('span');
      title.className = 'card-title step-title';
      title.dataset.i18n = `step.${i}.title`;
      title.textContent = this.i18n ? this.i18n.t(`step.${i}.title`) : `Step ${i}`;

      titleWrap.appendChild(stepNum);
      titleWrap.appendChild(title);
      header.appendChild(titleWrap);

      const badges = document.createElement('div');
      badges.className = 'card-badges';

      const timeBadge = document.createElement('span');
      timeBadge.className = 'badge-time';
      timeBadge.style.display = 'none';
      badges.appendChild(timeBadge);
      this.stepStates[i].timeEl = timeBadge;

      const statusBadge = document.createElement('span');
      statusBadge.className = 'card-badge';
      badges.appendChild(statusBadge);
      this.stepStates[i].badgeEl = statusBadge;

      header.appendChild(badges);
      card.appendChild(header);

      // Card Canvas Viewport - clicking image opens Lightbox with zoom and pan
      const viewport = document.createElement('div');
      viewport.className = 'card-viewport';
      viewport.title = '点击查看大图 (支持滚轮缩放与拖拽)';
      viewport.style.cursor = 'zoom-in';
      const canvas = document.createElement('canvas');
      canvas.width = i === 6 ? 1400 : 900;
      canvas.height = i === 6 ? Math.round(1400 * 660 / 900) : 660;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';
      canvas.style.aspectRatio = '900 / 660';
      viewport.appendChild(canvas);
      viewport.onclick = (e) => {
        e?.stopPropagation?.();
        this.setActiveStep(i);
        this.onStepSelect(i);
        this.onStepFullscreen(i, canvas);
      };
      // Floating Ghost Hover Action Toolbar (特写 + 导出)
      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const inspectBtn = document.createElement('button');
      inspectBtn.className = 'card-btn btn-inspect-layer';
      inspectBtn.title = '特写检查 (支持滚轮缩放与拖拽)';
      inspectBtn.innerHTML = '⛶ <span data-i18n="card.inspect">特写</span>';
      inspectBtn.onclick = (e) => {
        e?.stopPropagation?.();
        this.setActiveStep(i);
        this.onStepSelect(i);
        this.onStepFullscreen(i, canvas);
      };
      actions.appendChild(inspectBtn);

      const exportBtn = document.createElement('button');
      exportBtn.className = 'card-btn btn-export-layer';
      exportBtn.title = '独立导出图层';
      exportBtn.innerHTML = '⬇ <span data-i18n="card.download">导出</span>';
      exportBtn.onclick = (e) => {
        e?.stopPropagation?.();
        this.onStepExport(i);
      };
      actions.appendChild(exportBtn);

      viewport.appendChild(actions);
      card.appendChild(viewport);
      this.stepStates[i].canvas = canvas;

      // Card Footer (Metadata & Status)
      const footer = document.createElement('div');
      footer.className = 'card-footer';

      const meta = document.createElement('span');
      meta.className = 'card-meta';
      meta.textContent = i === 0 ? '原始像素基准' : '等待计算...';
      footer.appendChild(meta);
      this.stepStates[i].metaEl = meta;

      card.appendChild(footer);

      card.onclick = () => {
        this.setActiveStep(i);
        this.onStepSelect(i);
      };
      this.container.appendChild(card);
    }
  }

  setActiveStep(stepIndex) {
    if (!this.container) return;
    this.container.querySelectorAll('.step-card').forEach((card, idx) => {
      card.classList.toggle('active-step', idx === stepIndex);
    });
  }

  /**
   * Sets the adaptive aspect ratio for all 7 cards in the flow grid.
   * Dynamically reconfigures canvas resolutions and CSS aspect-ratio so cards
   * horizontally fill their columns and match the imported image's physical proportion.
   * @param {number} width - Source image physical width
   * @param {number} height - Source image physical height
   */
  setAspectRatio(width, height) {
    if (!width || !height || width <= 0 || height <= 0) return;
    const aspect = width / height;
    this.currentAspect = aspect;
    this.currentSrcWidth = width;
    this.currentSrcHeight = height;

    const baseW = 900;
    const baseH = Math.max(1, Math.round(baseW / aspect));
    const printW = 1400;
    const printH = Math.max(1, Math.round(printW / aspect));

    for (let i = 0; i <= 6; i++) {
      const state = this.stepStates[i];
      if (!state || !state.canvas) continue;
      const cv = state.canvas;
      const tw = (i === 6 ? printW : baseW);
      const th = (i === 6 ? printH : baseH);

      cv.width = tw;
      cv.height = th;
      cv.style.width = '100%';
      cv.style.height = 'auto';
      cv.style.display = 'block';
      cv.style.aspectRatio = `${width} / ${height}`;

      // Refresh canvas rendering if an image or paths was previously rendered
      if (state.lastPaths && (i === 3 || i === 4 || i === 5 || i === 6)) {
        this.updateStepPaths(i, state.lastPaths, width, height);
      } else if (state.lastImage) {
        this.updateStepPreview(i, state.lastImage);
      } else if (state.status === 'COMPUTING') {
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.fillStyle = '#faf8f5';
          ctx.fillRect(0, 0, cv.width, cv.height);
        }
      }
    }
  }

  /**
   * Updates status badge, elapsed time, and visual state for a given step.
   * @param {number} stepIndex 0..6
   * @param {'IDLE'|'COMPUTING'|'CACHED'|'DONE'|'ERROR'} status
   * @param {string} [meta='']
   * @param {number} [elapsedMs=null]
   */
  setStepStatus(stepIndex, status, meta = '', elapsedMs = null) {
    if (stepIndex < 0 || stepIndex > 6) return;
    const card = this.container?.querySelector(`.step-${stepIndex}`);
    if (!card) return;

    const state = this.stepStates[stepIndex];
    state.status = status;

    card.classList.remove('status-computing', 'status-cached', 'status-done', 'status-error');

    if (status === 'COMPUTING') {
      card.classList.add('status-computing');
      if (state.badgeEl) {
        state.badgeEl.textContent = this.i18n ? this.i18n.t('card.computing') : '计算中...';
        state.badgeEl.className = 'card-badge badge-compute';
      }
      // Purge previous image/paths immediately so no stale canvas is shown
      const cv = state.canvas;
      if (cv) {
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.fillStyle = '#faf8f5';
          ctx.fillRect(0, 0, cv.width, cv.height);
        }
      }
      state.lastImage = null;
      state.lastPaths = null;
    } else if (status === 'CACHED') {
      card.classList.add('status-cached');
      if (state.badgeEl) {
        state.badgeEl.textContent = this.i18n ? this.i18n.t('card.cached') : '● 缓存命中';
        state.badgeEl.className = 'card-badge badge-cache';
      }
    } else if (status === 'DONE') {
      card.classList.add('status-done');
      if (state.badgeEl) {
        state.badgeEl.textContent = '✓ 完成';
        state.badgeEl.className = 'card-badge badge-done';
      }
    } else if (status === 'ERROR') {
      card.classList.add('status-error');
      if (state.badgeEl) {
        state.badgeEl.textContent = '异常';
        state.badgeEl.className = 'card-badge badge-amber';
      }
    } else {
      if (state.badgeEl) state.badgeEl.textContent = '';
    }

    if (elapsedMs != null && state.timeEl) {
      state.timeEl.textContent = `${Number(elapsedMs).toFixed(1)}ms`;
      state.timeEl.style.display = 'inline-block';
    }

    if (meta && state.metaEl) {
      state.metaEl.textContent = meta;
    }
  }

  /**
   * Toggles the Loupe magnifier for a given card canvas.
   * Ensures only one card loupe is active at a time and updates button style.
   * @param {number} stepIndex 0..6
   * @returns {boolean} Whether loupe is now active
   */
  toggleLoupe(stepIndex) {
    const cardState = this.stepStates[stepIndex];
    if (!cardState || !cardState.canvas) return false;

    // Close any other active loupes
    for (let j = 0; j < this.stepStates.length; j++) {
      if (j !== stepIndex && this.stepStates[j]?.loupe?.active) {
        this.stepStates[j].loupe.toggle();
        const otherBtn = this.container?.querySelector(`.step-${j} .btn-loupe`);
        if (otherBtn) otherBtn.classList.remove('active');
      }
    }

    if (!cardState.loupe) {
      if (typeof LoupeMagnifier !== 'undefined') {
        cardState.loupe = new LoupeMagnifier(cardState.canvas, { diameter: 160, zoom: 4 });
      } else {
        return false;
      }
    }

    const isActive = cardState.loupe.toggle();
    const btn = this.container?.querySelector(`.step-${stepIndex} .btn-loupe`);
    if (btn) btn.classList.toggle('active', !!isActive);
    return isActive;
  }

  /**
   * Updates viewport bitmap preview on the card's canvas preserving aspect ratio (contain).
   * @param {number} stepIndex 
   * @param {Object|HTMLImageElement|HTMLCanvasElement} imageSource 
   */
  updateStepPreview(stepIndex, imageSource) {
    const canvas = this.stepStates[stepIndex]?.canvas;
    if (!canvas || !imageSource) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.stepStates[stepIndex].lastImage = imageSource;
    const cw = canvas.width, ch = canvas.height;

    const drawContained = (sourceCanvasOrImg, sw, sh) => {
      ctx.fillStyle = '#faf8f5';
      ctx.fillRect(0, 0, cw, ch);
      const scale = Math.min(cw / (sw || cw), ch / (sh || ch));
      const dw = Math.round((sw || cw) * scale);
      const dh = Math.round((sh || ch) * scale);
      const dx = Math.round((cw - dw) / 2);
      const dy = Math.round((ch - dh) / 2);
      ctx.drawImage(sourceCanvasOrImg, dx, dy, dw, dh);
    };

    // 1. Direct Image, Canvas, or ImageBitmap
    if (imageSource instanceof HTMLImageElement || imageSource instanceof HTMLCanvasElement || (typeof ImageBitmap !== 'undefined' && imageSource instanceof ImageBitmap)) {
      const sw = imageSource.naturalWidth || imageSource.width || cw;
      const sh = imageSource.naturalHeight || imageSource.height || ch;
      drawContained(imageSource, sw, sh);
      return;
    }

    // 2. Object with rawImg (HTMLImageElement or HTMLCanvasElement)
    if (imageSource.rawImg && (imageSource.rawImg instanceof HTMLImageElement || imageSource.rawImg instanceof HTMLCanvasElement)) {
      const sw = imageSource.rawImg.naturalWidth || imageSource.rawImg.width || imageSource.width || cw;
      const sh = imageSource.rawImg.naturalHeight || imageSource.rawImg.height || imageSource.height || ch;
      drawContained(imageSource.rawImg, sw, sh);
      return;
    }

    // 3. Object with .pixels (Grayscale byte array or RGBA)
    if (imageSource.width && imageSource.height && imageSource.pixels) {
      const w = imageSource.width, h = imageSource.height;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      const imgData = tctx.createImageData(w, h);
      const px = imageSource.pixels;

      if (px.length === w * h * 4) {
        imgData.data.set(px);
      } else {
        for (let i = 0; i < w * h; i++) {
          const val = px[i];
          const base = i * 4;
          imgData.data[base] = val;
          imgData.data[base + 1] = val;
          imgData.data[base + 2] = val;
          imgData.data[base + 3] = 255;
        }
      }
      tctx.putImageData(imgData, 0, 0);
      drawContained(tmp, w, h);
      return;
    }

    // 4. Object with .data (LineMap / Float32Array 0.0=black..1.0=white)
    if (imageSource.width && imageSource.height && imageSource.data) {
      const w = imageSource.width, h = imageSource.height;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      const imgData = tctx.createImageData(w, h);
      const d = imgData.data;
      const src = imageSource.data;
      for (let i = 0; i < w * h; i++) {
        const val = Math.max(0, Math.min(255, Math.round(src[i] * 255)));
        const base = i * 4;
        d[base] = val;
        d[base + 1] = val;
        d[base + 2] = val;
        d[base + 3] = 255;
      }
      tctx.putImageData(imgData, 0, 0);
      drawContained(tmp, w, h);
      return;
    }

    // 5. Stage 2 ToneField / FlowField composite
    const toneField = imageSource.toneField || (imageSource.tone ? imageSource : null);
    const flowField = imageSource.flowField || (imageSource.vx ? imageSource : null);
    if (toneField && toneField.width && toneField.height) {
      const w = toneField.width, h = toneField.height;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      const imgData = tctx.createImageData(w, h);
      const d = imgData.data;
      const tone = toneField.tone;
      for (let i = 0; i < w * h; i++) {
        const val = Math.max(0, Math.min(255, Math.round((1.0 - tone[i]) * 255)));
        const base = i * 4;
        d[base] = val;
        d[base + 1] = val;
        d[base + 2] = val;
        d[base + 3] = 255;
      }
      tctx.putImageData(imgData, 0, 0);
      drawContained(tmp, w, h);

      // Draw directional flow compass needles on top (respecting contain scale & offset)
      if (flowField && flowField.vx && flowField.vy) {
        ctx.save();
        const scale = Math.min(cw / w, ch / h);
        const offX = Math.round((cw - w * scale) / 2);
        const offY = Math.round((ch - h * scale) / 2);
        const step = Math.max(14, Math.round(cw / 22));
        const len = step * 0.45;
        const fw = flowField.width, fh = flowField.height;
        for (let y = step * 0.5; y < ch; y += step) {
          for (let x = step * 0.5; x < cw; x += step) {
            const imgX = (x - offX) / scale;
            const imgY = (y - offY) / scale;
            if (imgX < 0 || imgX >= fw || imgY < 0 || imgY >= fh) continue;
            const fx = Math.floor(imgX);
            const fy = Math.floor(imgY);
            const idx = fy * fw + fx;
            const vx = flowField.vx[idx] || 0;
            const vy = flowField.vy[idx] || 0;
            const coh = flowField.coherence ? flowField.coherence[idx] : 0.5;
            if (coh < 0.05) continue;
            const angle = 0.5 * Math.atan2(vy, vx);
            const dx = Math.cos(angle) * len;
            const dy = Math.sin(angle) * len;
            ctx.beginPath();
            ctx.moveTo(x - dx, y - dy);
            ctx.lineTo(x + dx, y + dy);
            ctx.strokeStyle = `rgba(243, 198, 35, ${Math.min(1, 0.4 + coh * 0.6)})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      return;
    }
  }

  /**
   * Renders vector stroke paths directly onto the card's canvas with classical print aesthetics.
   * Maintains original aspect ratio and coordinates without stretching or distortion.
   * @param {number} stepIndex
   * @param {Array<Object>} paths - Array of path objects: { points: [[x,y], ...], width?: number }
   * @param {number} srcWidth - Coordinate space width
   * @param {number} srcHeight - Coordinate space height
   * @param {Object} [options={}] - { bgTone?: string, strokeColor?: string, stage?: number }
   */
  updateStepPaths(stepIndex, paths, srcWidth, srcHeight, options = {}) {
    const canvas = this.stepStates[stepIndex]?.canvas;
    if (!canvas || !paths) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.stepStates[stepIndex].lastPaths = paths;

    const cw = canvas.width;
    const ch = canvas.height;
    const sw = srcWidth || cw;
    const sh = srcHeight || ch;

    if (stepIndex === 6) {
      // Step 6: Authentic Hand-printed Intaglio Sample on Cotton Rag Paper
      ctx.fillStyle = options.bgTone || '#faf7f0';
      ctx.fillRect(0, 0, cw, ch);

      const pm = Math.round(26 * cw / 900);
      const bw = Math.round(6 * cw / 900);
      const pw = cw - 2 * pm;
      const ph = ch - 2 * pm;

      // Soft paper plate depression (impressed intaglio plate surface)
      ctx.fillStyle = '#f7f4ec';
      ctx.fillRect(pm, pm, pw, ph);

      // Debossed plate bevel: top & left shadow side
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(pm - bw, pm - bw, pw + 2 * bw, bw);
      ctx.fillRect(pm - bw, pm - bw, bw, ph + 2 * bw);

      // Bottom & right highlight side
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(pm - bw, pm + ph, pw + 2 * bw, bw);
      ctx.fillRect(pm + pw, pm - bw, bw, ph + 2 * bw);

      // Bevel boundary seam
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pm, pm, pw, ph);

      // Classical Engraved Double-Line Outer Frame Border (古典版画双线外框/边框)
      // Preserved from historical Etchloom printmaking design (PhotoPro.framePaths & output-ui.js)
      const outerMargin = Math.round(14 * cw / 900);
      const gap = Math.round(5 * cw / 900);
      const clearance = Math.round(8 * cw / 900);

      const fx1 = pm + outerMargin;
      const fy1 = pm + outerMargin;
      const fw1 = pw - 2 * outerMargin;
      const fh1 = ph - 2 * outerMargin;

      const fx2 = fx1 + gap;
      const fy2 = fy1 + gap;
      const fw2 = fw1 - 2 * gap;
      const fh2 = fh1 - 2 * gap;

      ctx.save();
      ctx.strokeStyle = options.strokeColor || '#1a1918';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Primary Outer Frame Rule (外框主线)
      ctx.lineWidth = Math.max(1.2, 1.8 * cw / 900);
      ctx.strokeRect(fx1, fy1, fw1, fh1);

      // 2. Parallel Inner Hairline Frame (细内边框)
      ctx.lineWidth = Math.max(0.6, 0.9 * cw / 900);
      ctx.strokeRect(fx2, fy2, fw2, fh2);
      ctx.restore();

      // Artwork nesting area strictly inside the inner frame clearance
      const artX = fx2 + clearance;
      const artY = fy2 + clearance;
      const artW = fw2 - 2 * clearance;
      const artH = fh2 - 2 * clearance;

      const scale = Math.min(artW / sw, artH / sh);
      const offX = artX + Math.round((artW - sw * scale) / 2);
      const offY = artY + Math.round((artH - sh * scale) / 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(artX, artY, artW, artH);
      ctx.clip();

      ctx.strokeStyle = options.strokeColor || '#1a1918';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const pts = path.points || path;
        if (!pts || pts.length < 2) continue;

        ctx.beginPath();
        const strokeW = Math.max(0.4, (path.width || 0.8) * scale);
        ctx.lineWidth = strokeW;
        ctx.moveTo(offX + pts[0][0] * scale, offY + pts[0][1] * scale);
        for (let j = 1; j < pts.length; j++) {
          ctx.lineTo(offX + pts[j][0] * scale, offY + pts[j][1] * scale);
        }
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const scale = Math.min(cw / sw, ch / sh);
    const offX = Math.round((cw - sw * scale) / 2);
    const offY = Math.round((ch - sh * scale) / 2);

    // Background tone
    const isLightBg = stepIndex === 5;
    ctx.fillStyle = options.bgTone || (isLightBg ? '#fcfbf8' : '#1e2220');
    ctx.fillRect(0, 0, cw, ch);

    // Default ink color
    ctx.strokeStyle = options.strokeColor || (isLightBg ? '#1b1b1b' : '#ded9cc');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const pts = path.points || path;
      if (!pts || pts.length < 2) continue;

      ctx.beginPath();
      const strokeW = Math.max(0.4, (path.width || 0.8) * scale);
      ctx.lineWidth = strokeW;

      // Subtle nuance by stage
      if (stepIndex === 3) {
        ctx.strokeStyle = isLightBg ? 'rgba(20, 20, 20, 0.85)' : '#c8b67e';
      } else if (stepIndex === 4) {
        ctx.strokeStyle = isLightBg ? 'rgba(30, 28, 26, 0.9)' : '#b4c0ab';
      }

      ctx.moveTo(offX + pts[0][0] * scale, offY + pts[0][1] * scale);
      for (let j = 1; j < pts.length; j++) {
        ctx.lineTo(offX + pts[j][0] * scale, offY + pts[j][1] * scale);
      }
      ctx.stroke();
    }
  }

  /**
   * Re-translates text within all cards when the active locale changes.
   * @param {Object} [i18n]
   */
  updateLocale(i18n) {
    if (i18n) this.i18n = i18n;
    if (!this.container || !this.i18n) return;
    for (let i = 0; i <= 6; i++) {
      const title = this.container.querySelector(`.step-${i} .step-title`);
      if (title) title.textContent = this.i18n.t(`step.${i}.title`);
      const state = this.stepStates[i];
      if (state && state.badgeEl) {
        if (state.status === 'COMPUTING') state.badgeEl.textContent = this.i18n.t('card.computing');
        else if (state.status === 'CACHED') state.badgeEl.textContent = this.i18n.t('card.cached');
      }
    }
    this.i18n.bindDom(this.container);
  }
}

const api = { StepFlowGrid };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.StepFlowGrid = StepFlowGrid;
}


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = typeof api !== 'undefined' ? api : (root.StepFlowGridModule || StepFlowGrid);
  }
  if (typeof root !== 'undefined') {
    if (typeof api !== 'undefined') {
      root.StepFlowGridModule = api;
    }
    if (typeof StepFlowGrid !== 'undefined') {
      root.StepFlowGrid = StepFlowGrid;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
