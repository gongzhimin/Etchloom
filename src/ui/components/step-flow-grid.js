(function(root) {
  'use strict';

/**
 * Step Flow Grid Component (M1: 步骤流视口网格)
 * Manages 7 pipeline stage cards (Step 0..6) in the collapsible filmstrip,
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

    this.frameStyle = options.frameStyle || 'double';
    this.lastSrcWidth = 900;
    this.lastSrcHeight = 660;

    this.stepStates = Array.from({ length: 7 }, (_, idx) => ({
      index: idx,
      status: 'IDLE', // 'IDLE' | 'COMPUTING' | 'CACHED' | 'DONE' | 'ERROR'
      cached: false,
      canvas: null,
      metaEl: null,
      badgeEl: null,
      timeEl: null,
      lastImage: null,
      lastPaths: null,
      streamRaf: null,
      metaSpec: { key: idx === 0 ? 'card.pixelBase' : 'card.initMeta' }
    }));

    if (this.container) {
      this.render();
    }
  }

  setFrameStyle(style) {
    this.frameStyle = style || 'double';
    if (this.stepStates[6]?.lastPaths) {
      this.updateStepPaths(6, this.stepStates[6].lastPaths, this.lastSrcWidth, this.lastSrcHeight, {
        frameStyle: this.frameStyle
      });
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
      viewport.title = this.i18n ? this.i18n.t('card.clickInspect') : '点击查看大图 (支持滚轮缩放与拖拽)';
      viewport.style.cursor = 'zoom-in';
      const canvas = document.createElement('canvas');
      canvas.setAttribute?.('role', 'button');
      canvas.setAttribute?.('tabindex', '0');
      canvas.setAttribute?.('aria-label', `${title.textContent}：${this.i18n ? this.i18n.t('card.inspect') : '特写检查'}`);
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
        const vectorSvg = i >= 3 ? this.getStepVectorSvg(i) : null;
        this.onStepFullscreen(i, canvas, { isVector: !!vectorSvg, vectorSvg });
      };
      canvas.onkeydown = (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        viewport.onclick(e);
      };
      // Floating Ghost Hover Action Toolbar (特写 + 导出)
      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const inspectBtn = document.createElement('button');
      inspectBtn.className = 'card-btn btn-inspect-layer';
      inspectBtn.title = this.i18n ? this.i18n.t('card.clickInspect') : '特写检查 (支持滚轮缩放与拖拽)';
      inspectBtn.innerHTML = '⛶ <span data-i18n="card.inspect">' + (this.i18n ? this.i18n.t('card.inspect') : '特写') + '</span>';
      inspectBtn.onclick = (e) => {
        e?.stopPropagation?.();
        this.setActiveStep(i);
        this.onStepSelect(i);
        const vectorSvg = i >= 3 ? this.getStepVectorSvg(i) : null;
        this.onStepFullscreen(i, canvas, { isVector: !!vectorSvg, vectorSvg });
      };
      actions.appendChild(inspectBtn);

      const exportBtn = document.createElement('button');
      exportBtn.className = 'card-btn btn-export-layer';
      exportBtn.title = this.i18n ? this.i18n.t('card.download') : '独立导出图层';
      exportBtn.innerHTML = '⬇ <span data-i18n="card.download">' + (this.i18n ? this.i18n.t('card.download') : '导出') + '</span>';
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
      meta.textContent = i === 0
        ? (this.i18n ? this.i18n.t('card.pixelBase') : '原始像素基准')
        : (this.i18n ? this.i18n.t('card.initMeta') : '等待计算...');
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
    this.container?.style?.setProperty('--source-aspect-ratio', `${width} / ${height}`);
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
    const state = this.stepStates[stepIndex];
    if (!state) return;

    state.status = status;
    state.badgeEl?.removeAttribute?.('aria-label');
    state.badgeEl?.removeAttribute?.('role');
    if (status === 'COMPUTING' && !meta) {
      state.metaSpec = { key: 'card.computing' };
    } else if (meta) {
      state.metaSpec = meta;
    }

    if (status === 'COMPUTING' && state.streamRaf) {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.streamRaf);
      state.streamRaf = null;
    }

    const card = this.container?.querySelector(`.step-${stepIndex}`);
    if (!card) return;

    card.classList.remove('status-computing', 'status-cached', 'status-done', 'status-error');

    if (status === 'COMPUTING') {
      card.classList.add('status-computing');
      if (state.streamRaf) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(state.streamRaf);
        state.streamRaf = null;
      }
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
        state.badgeEl.textContent = '✓';
        state.badgeEl.setAttribute?.('role', 'img');
        state.badgeEl.setAttribute?.('aria-label', this.i18n ? this.i18n.t('card.done') : '完成');
        state.badgeEl.className = 'card-badge badge-done';
      }
    } else if (status === 'ERROR') {
      card.classList.add('status-error');
      if (state.badgeEl) {
        state.badgeEl.textContent = this.i18n ? this.i18n.t('card.error') : '异常';
        state.badgeEl.className = 'card-badge badge-amber';
      }
    } else {
      if (state.badgeEl) state.badgeEl.textContent = '';
    }

    if (elapsedMs != null && state.timeEl) {
      state.timeEl.textContent = `${Number(elapsedMs).toFixed(1)}ms`;
      state.timeEl.style.display = 'inline-block';
    }

    if (state.metaEl && state.metaSpec) {
      state.metaEl.textContent = this.formatMeta(state.metaSpec);
    }
  }

  formatMeta(spec) {
    if (typeof spec === 'string') return spec;
    if (!spec?.key) return '';
    return this.i18n ? this.i18n.t(spec.key, spec.args || []) : spec.key;
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
        cardState.loupe = new LoupeMagnifier(cardState.canvas, {
          diameter: 160,
          zoom: 4,
          vectorPaths: cardState.lastPaths || null,
          srcWidth: cardState.lastSrcWidth || this.lastSrcWidth || 900,
          srcHeight: cardState.lastSrcHeight || this.lastSrcHeight || 660
        });
      } else {
        return false;
      }
    } else if (cardState.lastPaths && cardState.loupe.setVectorPaths) {
      cardState.loupe.setVectorPaths(
        cardState.lastPaths,
        cardState.lastSrcWidth || this.lastSrcWidth || 900,
        cardState.lastSrcHeight || this.lastSrcHeight || 660
      );
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

    const cw = canvas.width;
    const ch = canvas.height;
    const sw = srcWidth || cw;
    const sh = srcHeight || ch;

    this.stepStates[stepIndex].lastPaths = paths;
    this.stepStates[stepIndex].lastSrcWidth = sw;
    this.stepStates[stepIndex].lastSrcHeight = sh;
    this.stepStates[stepIndex].lastOptions = options;

    const getTheme = () => {
      const tb = (typeof ThemeBridge !== 'undefined' && ThemeBridge) || (typeof globalThis !== 'undefined' && globalThis.ThemeBridge);
      return tb?.getRenderTheme ? tb.getRenderTheme() : {
        paperGround: '#faf7f0',
        plateGround: '#1e2220',
        inkPrimary: '#1a1918',
        contourGold: '#c8b67e',
        hatchSage: '#b4c0ab',
        masterPaper: '#fcfbf8'
      };
    };
    const theme = getTheme();

    // Cancel any in-flight progressive streaming for this card
    if (this.stepStates[stepIndex].streamRaf) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.stepStates[stepIndex].streamRaf);
      }
      this.stepStates[stepIndex].streamRaf = null;
    }

    if (stepIndex === 6) {
      // Step 6: flat transfer master; paper and ink effects appear only after plate printing.
      this.lastSrcWidth = sw;
      this.lastSrcHeight = sh;

      const frameStyle = options.frameStyle || this.frameStyle || 'double';
      const geom = getFrameGeometry(cw, ch, frameStyle);
      const paperGround = '#f4f7f7';
      const inkPrimary = '#253a3d';

      // 1. Paper ground
      ctx.fillStyle = paperGround;
      ctx.fillRect(0, 0, cw, ch);

      // 2. Draw impressed paper depression, plate bevel, and chosen frame style (outer, fine, rough)
      drawEngravedFrame(ctx, cw, ch, geom, inkPrimary);
      const markInset = Math.max(12, Math.round(geom.pm / 2));
      const markLength = Math.max(5, Math.round(geom.pm / 5));
      ctx.save();
      ctx.strokeStyle = '#8a9b9d';
      ctx.lineWidth = 1;
      for (const x of [markInset, cw - markInset]) {
        for (const y of [markInset, ch - markInset]) {
          ctx.beginPath();
          ctx.moveTo(x - markLength, y);
          ctx.lineTo(x + markLength, y);
          ctx.moveTo(x, y - markLength);
          ctx.lineTo(x, y + markLength);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 3. Artwork nesting area strictly inside the innermost frame clearance
      const { x: artX, y: artY, w: artW, h: artH } = geom.art;
      const scale = Math.min(artW / sw, artH / sh);
      const offX = artX + Math.round((artW - sw * scale) / 2);
      const offY = artY + Math.round((artH - sh * scale) / 2);

      const renderStep6Chunk = (startIdx, endIdx) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(artX, artY, artW, artH);
        ctx.clip();
        ctx.strokeStyle = inkPrimary;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this._renderBatchedChunk(ctx, paths, startIdx, endIdx, scale, offX, offY);
        ctx.restore();
      };

      const isProgressive = options.progressive !== false && paths.length > 600 && typeof requestAnimationFrame === 'function';
      if (!isProgressive) {
        renderStep6Chunk(0, paths.length);
        return;
      }

      // Initial visual chunk (0..600) rendered immediately for instant TTFVS
      renderStep6Chunk(0, 600);
      let curOffset = 600;
      const CHUNK_SIZE = 1200;
      const streamNext = () => {
        if (curOffset >= paths.length) {
          this.stepStates[stepIndex].streamRaf = null;
          options.onComplete?.();
          return;
        }
        const nextEnd = Math.min(paths.length, curOffset + CHUNK_SIZE);
        renderStep6Chunk(curOffset, nextEnd);
        curOffset = nextEnd;
        if (curOffset < paths.length) {
          this.stepStates[stepIndex].streamRaf = requestAnimationFrame(streamNext);
        } else {
          this.stepStates[stepIndex].streamRaf = null;
          options.onComplete?.();
        }
      };
      this.stepStates[stepIndex].streamRaf = requestAnimationFrame(streamNext);
      return;
    }

    const scale = Math.min(cw / sw, ch / sh);
    const offX = Math.round((cw - sw * scale) / 2);
    const offY = Math.round((ch - sh * scale) / 2);

    // Background tone
    const isLightBg = stepIndex === 5;
    ctx.fillStyle = options.bgTone || (isLightBg ? (theme.masterPaper || '#fcfbf8') : (theme.plateGround || '#1e2220'));
    ctx.fillRect(0, 0, cw, ch);

    // Default ink color
    const defaultColor = options.strokeColor || (isLightBg ? (theme.inkPrimary || '#1b1b1b') : '#ded9cc');
    const stageColor = stepIndex === 3 ? (isLightBg ? 'rgba(20, 20, 20, 0.85)' : (theme.contourGold || '#c8b67e'))
      : stepIndex === 4 ? (isLightBg ? 'rgba(30, 28, 26, 0.9)' : (theme.hatchSage || '#b4c0ab'))
      : defaultColor;

    ctx.strokeStyle = stageColor;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isProgressive = options.progressive !== false && paths.length > 600 && typeof requestAnimationFrame === 'function';
    if (!isProgressive) {
      this._renderBatchedChunk(ctx, paths, 0, paths.length, scale, offX, offY);
      return;
    }

    // Initial visual chunk (0..600) rendered immediately for instant TTFVS
    this._renderBatchedChunk(ctx, paths, 0, 600, scale, offX, offY);
    let curOffset = 600;
    const CHUNK_SIZE = 1200;
    const streamNext = () => {
      if (curOffset >= paths.length) {
        this.stepStates[stepIndex].streamRaf = null;
        options.onComplete?.();
        return;
      }
      const nextEnd = Math.min(paths.length, curOffset + CHUNK_SIZE);
      ctx.strokeStyle = stageColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      this._renderBatchedChunk(ctx, paths, curOffset, nextEnd, scale, offX, offY);
      curOffset = nextEnd;
      if (curOffset < paths.length) {
        this.stepStates[stepIndex].streamRaf = requestAnimationFrame(streamNext);
      } else {
        this.stepStates[stepIndex].streamRaf = null;
        options.onComplete?.();
      }
    };
    this.stepStates[stepIndex].streamRaf = requestAnimationFrame(streamNext);
  }

  _renderBatchedChunk(ctx, paths, startIndex, endIndex, scale, offX, offY) {
    const buckets = new Map();
    for (let i = startIndex; i < endIndex; i++) {
      const path = paths[i];
      const pts = path.points || path;
      if (!pts || pts.length < 2) continue;
      const strokeW = Math.round(Math.max(0.4, (path.width || 0.8) * scale) * 10) / 10;
      let list = buckets.get(strokeW);
      if (!list) {
        list = [];
        buckets.set(strokeW, list);
      }
      list.push(pts);
    }

    for (const [wVal, pathList] of buckets) {
      ctx.lineWidth = wVal;
      ctx.beginPath();
      for (let pIdx = 0; pIdx < pathList.length; pIdx++) {
        const pts = pathList[pIdx];
        ctx.moveTo(offX + pts[0][0] * scale, offY + pts[0][1] * scale);
        for (let j = 1; j < pts.length; j++) {
          ctx.lineTo(offX + pts[j][0] * scale, offY + pts[j][1] * scale);
        }
      }
      ctx.stroke();
    }
  }

  /**
   * Generates a pristine, scalable vector SVG for vector stages (Steps 3, 4, 5, 6).
   * Enables infinite-resolution vector zooming without raster pixelation or blur.
   * @param {number} stepIndex
   * @returns {string|null} SVG XML string or null if not a vector stage
   */
  getStepVectorSvg(stepIndex) {
    if (stepIndex < 3 || stepIndex > 6) return null;
    const state = this.stepStates[stepIndex];
    if (!state || !state.lastPaths || !state.lastPaths.length) return null;

    const paths = state.lastPaths;
    const sw = state.lastSrcWidth || (stepIndex === 6 ? (this.lastSrcWidth || 1400) : 900);
    const sh = state.lastSrcHeight || (stepIndex === 6 ? (this.lastSrcHeight || Math.round(1400 * 660 / 900)) : 660);
    const options = state.lastOptions || {};

    const tb = (typeof ThemeBridge !== 'undefined' && ThemeBridge) || (typeof globalThis !== 'undefined' && globalThis.ThemeBridge);
    const theme = tb?.getRenderTheme ? tb.getRenderTheme() : {
      paperGround: '#faf7f0',
      plateGround: '#1e2220',
      inkPrimary: '#1a1918',
      contourGold: '#c8b67e',
      hatchSage: '#b4c0ab',
      masterPaper: '#fcfbf8'
    };

    if (stepIndex === 6) {
      const cw = 1400;
      const ch = Math.max(1, Math.round(cw * sh / sw));
      const frameStyle = options.frameStyle || this.frameStyle || 'double';
      const geom = getFrameGeometry(cw, ch, frameStyle);
      const strokeColor = '#253a3d';
      const bgTone = '#f4f7f7';

      const frameXml = generateFrameSvg(cw, ch, geom, strokeColor);
      const markInset = Math.max(12, Math.round(geom.pm / 2));
      const markLength = Math.max(5, Math.round(geom.pm / 5));
      const marksXml = [markInset, cw - markInset].flatMap(x =>
        [markInset, ch - markInset].map(y =>
          `<path d="M ${x - markLength} ${y} L ${x + markLength} ${y} M ${x} ${y - markLength} L ${x} ${y + markLength}" />`
        )
      ).join('\n');

      const { x: artX, y: artY, w: artW, h: artH } = geom.art;
      const scale = Math.min(artW / sw, artH / sh);
      const offX = artX + Math.round((artW - sw * scale) / 2);
      const offY = artY + Math.round((artH - sh * scale) / 2);

      const artPathsXml = pathsToSvgXml(paths, scale, offX, offY, 0.8);

      return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">
  <style>
    path, line, rect { stroke-linecap: round; stroke-linejoin: round; }
  </style>
  <defs>
    <clipPath id="etchloom-art-clip">
      <rect x="${artX}" y="${artY}" width="${artW}" height="${artH}" />
    </clipPath>
  </defs>
  <!-- Flat transfer master ground -->
  <rect width="100%" height="100%" fill="${bgTone}" />
  <g id="etchloom-registration" fill="none" stroke="#8a9b9d" stroke-width="1">
${marksXml}
  </g>
  <!-- Classical Frame Border -->
  <g id="etchloom-frame">
${frameXml}
  </g>
  <!-- Nested Vector Art -->
  <g id="etchloom-artwork" clip-path="url(#etchloom-art-clip)" fill="none" stroke="${strokeColor}">
${artPathsXml}
  </g>
</svg>`;
    }

    const isLightBg = stepIndex === 5;
    const bgTone = options.bgTone || (isLightBg ? (theme.masterPaper || '#fcfbf8') : (theme.plateGround || '#1e2220'));
    let strokeColor = options.strokeColor || (isLightBg ? (theme.inkPrimary || '#1b1b1b') : '#ded9cc');
    if (stepIndex === 3) {
      strokeColor = isLightBg ? 'rgba(20, 20, 20, 0.85)' : (theme.contourGold || '#c8b67e');
    } else if (stepIndex === 4) {
      strokeColor = isLightBg ? 'rgba(30, 28, 26, 0.9)' : (theme.hatchSage || '#b4c0ab');
    }

    const defaultWidth = stepIndex === 3 ? 1.2 : 0.8;
    const pathsXml = pathsToSvgXml(paths, 1.0, 0, 0, defaultWidth);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}" viewBox="0 0 ${sw} ${sh}">
  <style>
    path { fill: none; stroke: ${strokeColor}; stroke-linecap: round; stroke-linejoin: round; }
  </style>
  <!-- Background Plate Tone -->
  <rect width="100%" height="100%" fill="${bgTone}" />
  <g id="etchloom-vector-paths">
${pathsXml}
  </g>
</svg>`;
  }

  /**
   * Re-translates text within all cards when the active locale changes.
   * @param {Object} [i18n]
   */
  updateLocale(i18n) {
    if (i18n) this.i18n = i18n;
    if (!this.container || !this.i18n || typeof this.container.querySelector !== 'function') return;
    for (let i = 0; i <= 6; i++) {
      const title = this.container.querySelector(`.step-${i} .step-title`);
      if (title) title.textContent = this.i18n.t(`step.${i}.title`);
      const state = this.stepStates[i];
      if (state?.metaEl && state.metaSpec) state.metaEl.textContent = this.formatMeta(state.metaSpec);
      if (state && state.badgeEl) {
        if (state.status === 'COMPUTING') state.badgeEl.textContent = this.i18n.t('card.computing');
        else if (state.status === 'CACHED') state.badgeEl.textContent = this.i18n.t('card.cached');
        else if (state.status === 'DONE') {
          state.badgeEl.textContent = '✓';
          state.badgeEl.setAttribute?.('aria-label', this.i18n.t('card.done'));
        }
        else if (state.status === 'ERROR') state.badgeEl.textContent = this.i18n.t('card.error');
      }
      const vp = this.container.querySelector(`.step-${i} .card-viewport`);
      if (vp) vp.title = this.i18n.t('card.clickInspect');
      const inspect = this.container.querySelector(`.step-${i} .btn-inspect-layer`);
      if (inspect) inspect.title = this.i18n.t('card.clickInspect');
      const exp = this.container.querySelector(`.step-${i} .btn-export-layer`);
      if (exp) exp.title = this.i18n.t('card.download');
    }
    this.i18n.bindDom(this.container);
  }
}

/**
 * Calculates authentic printmaking frame geometry.
 * Guarantees that the frame is strictly on the OUTSIDE of the artwork (artwork bounds are strictly inside).
 * @param {number} cw - Canvas width
 * @param {number} ch - Canvas height
 * @param {string} [style='double'] - 'double' | 'fine' | 'rough' | 'none'
 */
function getFrameGeometry(cw, ch, style = 'double') {
  const short = Math.min(cw, ch);
  const pm = Math.round(26 * short / 660); // 纸边留白 (Paper Margin)
  const bw = Math.round(6 * short / 660);  // 倒角凹痕 (Plate Bevel)
  const pw = cw - 2 * pm;
  const ph = ch - 2 * pm;

  const outerMargin = Math.round(14 * short / 660);
  const gap = Math.round(5 * short / 660);
  const clearance = Math.round(10 * short / 660);

  const fx1 = pm + outerMargin;
  const fy1 = pm + outerMargin;
  const fw1 = pw - 2 * outerMargin;
  const fh1 = ph - 2 * outerMargin;

  let artX, artY, artW, artH;

  if (style === 'double') {
    const fx2 = fx1 + gap;
    const fy2 = fy1 + gap;
    const fw2 = fw1 - 2 * gap;
    const fh2 = fh1 - 2 * gap;

    artX = fx2 + clearance;
    artY = fy2 + clearance;
    artW = fw2 - 2 * clearance;
    artH = fh2 - 2 * clearance;

    return {
      style,
      pm, bw, pw, ph,
      outer: { x: fx1, y: fy1, w: fw1, h: fh1, lineWidth: Math.max(1.3, 1.8 * short / 660) },
      inner: { x: fx2, y: fy2, w: fw2, h: fh2, lineWidth: Math.max(0.6, 0.9 * short / 660) },
      art: { x: artX, y: artY, w: artW, h: artH }
    };
  } else if (style === 'fine' || style === 'rough') {
    artX = fx1 + clearance;
    artY = fy1 + clearance;
    artW = fw1 - 2 * clearance;
    artH = fh1 - 2 * clearance;

    return {
      style,
      pm, bw, pw, ph,
      outer: { x: fx1, y: fy1, w: fw1, h: fh1, lineWidth: Math.max(1.0, 1.4 * short / 660) },
      inner: null,
      art: { x: artX, y: artY, w: artW, h: artH }
    };
  } else {
    // 'none'
    artX = pm + outerMargin;
    artY = pm + outerMargin;
    artW = pw - 2 * outerMargin;
    artH = ph - 2 * outerMargin;

    return {
      style: 'none',
      pm, bw, pw, ph,
      outer: null,
      inner: null,
      art: { x: artX, y: artY, w: artW, h: artH }
    };
  }
}

/**
 * Draws paper depression, plate bevel, and the chosen outer frame style.
 * Frame rules are strictly drawn on the outside of the artwork.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cw
 * @param {number} ch
 * @param {Object} geom - Computed geometry from getFrameGeometry
 * @param {string} [strokeColor='#1a1918']
 */
function drawEngravedFrame(ctx, cw, ch, geom, strokeColor = '#1a1918') {
  if (!ctx || !geom || geom.style === 'none') return;

  // Render Chosen Classical Frame Rules on Archival Paper Ground
  ctx.save();
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (geom.style === 'double') {
    // 1. Primary Outer Frame Rule (外框主线)
    ctx.lineWidth = geom.outer.lineWidth;
    ctx.strokeRect(geom.outer.x, geom.outer.y, geom.outer.w, geom.outer.h);

    // 2. Parallel Inner Hairline Frame (细内边框)
    ctx.lineWidth = geom.inner.lineWidth;
    ctx.strokeRect(geom.inner.x, geom.inner.y, geom.inner.w, geom.inner.h);
  } else if (geom.style === 'fine') {
    // Single fine hairline rule
    ctx.lineWidth = geom.outer.lineWidth;
    ctx.strokeRect(geom.outer.x, geom.outer.y, geom.outer.w, geom.outer.h);
  } else if (geom.style === 'rough') {
    // Authentic Artisanal Hand-cut / Woodblock Rough Frame (古拙手工刀刻边框)
    const { x, y, w, h, lineWidth } = geom.outer;
    const scale = Math.max(0.7, Math.min(w, h) / 660);
    const cornerOvershoot = Math.round(7 * scale);
    const edges = [
      // Top: Left to Right
      { p1: [x - cornerOvershoot, y], p2: [x + w + cornerOvershoot, y], isH: true, seed: 101 },
      // Right: Top to Bottom
      { p1: [x + w, y - cornerOvershoot], p2: [x + w, y + h + cornerOvershoot], isH: false, seed: 202 },
      // Bottom: Right to Left
      { p1: [x + w + cornerOvershoot, y + h], p2: [x - cornerOvershoot, y + h], isH: true, seed: 303 },
      // Left: Bottom to Top
      { p1: [x, y + h + cornerOvershoot], p2: [x, y - cornerOvershoot], isH: false, seed: 404 }
    ];

    for (const edge of edges) {
      const { p1, p2, isH, seed } = edge;
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const segments = Math.max(48, Math.round(len / 8));
      let s = seed;
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

      const pts = [];
      for (let k = 0; k <= segments; k++) {
        const t = k / segments;
        // Multi-octave tactile chisel resistance wave
        const wave1 = Math.sin(t * Math.PI * 3 + seed * 0.1) * 1.8 * scale;
        const wave2 = Math.sin(t * Math.PI * 8 + seed * 0.2) * 1.0 * scale;
        const wave3 = Math.sin(t * Math.PI * 23 + seed * 0.3) * 0.5 * scale;
        const jitter = (rnd() - 0.5) * 1.6 * scale;
        const offset = wave1 + wave2 + wave3 + jitter;

        const basePx = p1[0] + (p2[0] - p1[0]) * t;
        const basePy = p1[1] + (p2[1] - p1[1]) * t;

        const px = isH ? basePx : basePx + offset;
        const py = isH ? basePy + offset : basePy;

        // Burin cut depth and line swell
        const widthPulse = Math.sin(t * Math.PI * 4 + seed * 0.15);
        const widthJitter = (rnd() - 0.5) * 0.5;
        const strokeW = Math.max(0.6 * scale, lineWidth * (1.1 + 0.65 * widthPulse + widthJitter));

        pts.push({ x: px, y: py, width: strokeW });
      }

      // Draw undulating chiseled line
      for (let k = 1; k < pts.length; k++) {
        ctx.beginPath();
        ctx.lineWidth = pts[k].width;
        ctx.moveTo(pts[k - 1].x, pts[k - 1].y);
        ctx.lineTo(pts[k].x, pts[k].y);
        ctx.stroke();
      }

      // Hand-engraved chisel chatter & companion burr flecks (手工飞刺与刀花)
      const fleckCount = Math.floor(4 + rnd() * 4);
      for (let f = 0; f < fleckCount; f++) {
        const ft = 0.1 + rnd() * 0.8;
        const idx = Math.floor(ft * segments);
        const basePt = pts[idx];
        const side = rnd() > 0.5 ? 1 : -1;
        const dist = (2.5 + rnd() * 3.5) * scale;
        const fLen = (5 + rnd() * 12) * scale;
        const fx1 = isH ? basePt.x : basePt.x + side * dist;
        const fy1 = isH ? basePt.y + side * dist : basePt.y;
        const fx2 = isH ? fx1 + fLen : fx1;
        const fy2 = isH ? fy1 : fy1 + fLen;
        ctx.beginPath();
        ctx.lineWidth = Math.max(0.5 * scale, lineWidth * 0.5);
        ctx.moveTo(fx1, fy1);
        ctx.lineTo(fx2, fy2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/**
 * Converts path objects to SVG <path> elements with coordinates scaled and offset.
 * @param {Array<Object>} paths
 * @param {number} [scale=1.0]
 * @param {number} [offX=0]
 * @param {number} [offY=0]
 * @param {number} [defaultWidth=0.8]
 * @returns {string}
 */
function pathsToSvgXml(paths, scale = 1.0, offX = 0, offY = 0, defaultWidth = 0.8) {
  if (!Array.isArray(paths)) return '';
  return paths.map(p => {
    const pts = p.points || p;
    if (!Array.isArray(pts) || pts.length < 2) return '';
    const strokeW = Math.max(0.4, (p.width ?? defaultWidth) * scale).toFixed(2);
    const d = pts.map((pt, idx) => {
      const px = ((pt[0] ?? pt.x) * scale + offX).toFixed(2);
      const py = ((pt[1] ?? pt.y) * scale + offY).toFixed(2);
      return idx === 0 ? `M ${px} ${py}` : `L ${px} ${py}`;
    }).join(' ');
    return `    <path d="${d}" stroke-width="${strokeW}" />`;
  }).filter(Boolean).join('\n');
}

/**
 * Generates pure vector SVG XML elements for the chosen frame style.
 * Supports double, fine, and authentic artisanal rough chisel marks.
 * @param {number} cw
 * @param {number} ch
 * @param {Object} geom
 * @param {string} [strokeColor='#1a1918']
 * @returns {string} SVG snippet
 */
function generateFrameSvg(cw, ch, geom, strokeColor = '#1a1918') {
  if (!geom || geom.style === 'none') return '';

  if (geom.style === 'double') {
    return `    <rect x="${geom.outer.x}" y="${geom.outer.y}" width="${geom.outer.w}" height="${geom.outer.h}" fill="none" stroke="${strokeColor}" stroke-width="${geom.outer.lineWidth.toFixed(2)}" />
    <rect x="${geom.inner.x}" y="${geom.inner.y}" width="${geom.inner.w}" height="${geom.inner.h}" fill="none" stroke="${strokeColor}" stroke-width="${geom.inner.lineWidth.toFixed(2)}" />`;
  }

  if (geom.style === 'fine') {
    return `    <rect x="${geom.outer.x}" y="${geom.outer.y}" width="${geom.outer.w}" height="${geom.outer.h}" fill="none" stroke="${strokeColor}" stroke-width="${geom.outer.lineWidth.toFixed(2)}" />`;
  }

  if (geom.style === 'rough') {
    const { x, y, w, h, lineWidth } = geom.outer;
    const scale = Math.max(0.7, Math.min(w, h) / 660);
    const cornerOvershoot = Math.round(7 * scale);
    const edges = [
      { p1: [x - cornerOvershoot, y], p2: [x + w + cornerOvershoot, y], isH: true, seed: 101 },
      { p1: [x + w, y - cornerOvershoot], p2: [x + w, y + h + cornerOvershoot], isH: false, seed: 202 },
      { p1: [x + w + cornerOvershoot, y + h], p2: [x - cornerOvershoot, y + h], isH: true, seed: 303 },
      { p1: [x, y + h + cornerOvershoot], p2: [x, y - cornerOvershoot], isH: false, seed: 404 }
    ];

    const xmlLines = [];
    for (const edge of edges) {
      const { p1, p2, isH, seed } = edge;
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const segments = Math.max(48, Math.round(len / 8));
      let s = seed;
      const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

      const pts = [];
      for (let k = 0; k <= segments; k++) {
        const t = k / segments;
        const wave1 = Math.sin(t * Math.PI * 3 + seed * 0.1) * 1.8 * scale;
        const wave2 = Math.sin(t * Math.PI * 8 + seed * 0.2) * 1.0 * scale;
        const wave3 = Math.sin(t * Math.PI * 23 + seed * 0.3) * 0.5 * scale;
        const jitter = (rnd() - 0.5) * 1.6 * scale;
        const offset = wave1 + wave2 + wave3 + jitter;

        const basePx = p1[0] + (p2[0] - p1[0]) * t;
        const basePy = p1[1] + (p2[1] - p1[1]) * t;

        const px = isH ? basePx : basePx + offset;
        const py = isH ? basePy + offset : basePy;

        const widthPulse = Math.sin(t * Math.PI * 4 + seed * 0.15);
        const widthJitter = (rnd() - 0.5) * 0.5;
        const strokeW = Math.max(0.6 * scale, lineWidth * (1.1 + 0.65 * widthPulse + widthJitter));

        pts.push({ x: px, y: py, width: strokeW });
      }

      // Draw undulating chiseled line segments
      for (let k = 1; k < pts.length; k++) {
        const sw = pts[k].width.toFixed(2);
        xmlLines.push(`    <line x1="${pts[k-1].x.toFixed(2)}" y1="${pts[k-1].y.toFixed(2)}" x2="${pts[k].x.toFixed(2)}" y2="${pts[k].y.toFixed(2)}" stroke="${strokeColor}" stroke-width="${sw}" />`);
      }

      // Hand-engraved chisel chatter & companion burr flecks
      const fleckCount = Math.floor(4 + rnd() * 4);
      for (let f = 0; f < fleckCount; f++) {
        const ft = 0.1 + rnd() * 0.8;
        const idx = Math.floor(ft * segments);
        const basePt = pts[idx];
        const side = rnd() > 0.5 ? 1 : -1;
        const dist = (2.5 + rnd() * 3.5) * scale;
        const fLen = (5 + rnd() * 12) * scale;
        const fx1 = isH ? basePt.x : basePt.x + side * dist;
        const fy1 = isH ? basePt.y + side * dist : basePt.y;
        const fx2 = isH ? fx1 + fLen : fx1;
        const fy2 = isH ? fy1 : fy1 + fLen;
        const sw = Math.max(0.5 * scale, lineWidth * 0.5).toFixed(2);
        xmlLines.push(`    <line x1="${fx1.toFixed(2)}" y1="${fy1.toFixed(2)}" x2="${fx2.toFixed(2)}" y2="${fy2.toFixed(2)}" stroke="${strokeColor}" stroke-width="${sw}" />`);
      }
    }
    return xmlLines.join('\n');
  }

  return '';
}

  const api = { StepFlowGrid, getFrameGeometry, drawEngravedFrame, generateFrameSvg, pathsToSvgXml };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.StepFlowGrid = StepFlowGrid;
    globalThis.StepFlowGridModule = api;
    globalThis.getFrameGeometry = getFrameGeometry;
    globalThis.drawEngravedFrame = drawEngravedFrame;
    globalThis.generateFrameSvg = generateFrameSvg;
    globalThis.pathsToSvgXml = pathsToSvgXml;
  }
  if (typeof root !== 'undefined') {
    root.StepFlowGridModule = api;
    root.StepFlowGrid = StepFlowGrid;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
