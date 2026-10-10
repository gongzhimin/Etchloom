/**
 * Pipeline Controller (M2: 5阶段算法母版计算与图纸流水线控制器)
 * Coordinates photo loading, AIServiceGateway parallel inference (Informative Drawings & Lotus Depth),
 * PipelineRunner execution, StepFlowGrid rendering, and telemetry metrics.
 */

import { AIServiceGateway } from '../../services/client/ai-service-gateway.js';

export class PipelineController {
  constructor(options = {}) {
    this.aiGateway = new AIServiceGateway(options.aiServiceUrl || 'http://127.0.0.1:7861');
    this.stepGrid = options.stepGrid || null;
    this.log = options.log || ((cat, txt, lvl) => console.log(`[${cat}] ${txt}`));
    this.onPlateCarve = options.onPlateCarve || (() => {});
    this.onAspectRatioChange = options.onAspectRatioChange || null;
    this.getParams = options.getParams || null;
    this.onTelemetry = options.onTelemetry || null;
    this.onModelStatus = options.onModelStatus || null;
    this.onMasterReady = options.onMasterReady || null;
    this.onRecomputeState = options.onRecomputeState || null;
    this.recomputeRequest = 0;

    this.currentLoadedImage = null;
    this.currentDepthMap = null;
    this.sourceVersion = 0;
    this.sourceAbortController = null;
    this.lastStage1LineMap = null;
    this.lastContours = null;
    this.lastHatching = null;
    this.lastMasterPaths = null;

    const SchedulerClass = (typeof TaskScheduler !== 'undefined' ? TaskScheduler : (globalThis.TaskScheduler || null));
    const CacheClass = (typeof StageCache !== 'undefined' ? StageCache : (globalThis.StageCache || null));
    this.scheduler = SchedulerClass ? new SchedulerClass(140) : null;
    this.stageCache = CacheClass ? new CacheClass() : null;

    this.worker = null;
    this.workerRequestId = 0;
    this.workerPending = new Map();
    if (typeof Worker !== 'undefined' && typeof window !== 'undefined') {
      try {
        this.worker = new Worker('src/orchestration/worker/pipeline-worker.js');
        this._initWorker();
      } catch (_) {
        this.worker = null;
      }
    }
  }

  _initWorker() {
    if (!this.worker) return;
    this.worker.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      const { requestId, type } = data;
      const pending = this.workerPending.get(requestId);
      if (!pending) return;

      if (type === 'PROGRESS') {
        if (typeof pending.onProgress === 'function') {
          pending.onProgress(data.stage, data.progress, data.artifact);
        }
      } else if (type === 'COMPLETE') {
        this.workerPending.delete(requestId);
        pending.resolve(data.outputs);
      } else if (type === 'ABORTED') {
        this.workerPending.delete(requestId);
        const err = new Error('PIPELINE_ABORTED');
        err.name = 'AbortError';
        pending.reject(err);
      } else if (type === 'ERROR') {
        this.workerPending.delete(requestId);
        pending.reject(new Error(data.message || 'Worker pipeline error'));
      }
    };
    this.worker.onerror = (err) => {
      for (const [, pending] of this.workerPending) {
        pending.reject(err);
      }
      this.workerPending.clear();
      this.worker = null;
    };
  }

  releaseMemory() {
    if (this.aiGateway && typeof this.aiGateway.releaseMemory === 'function') {
      this.aiGateway.releaseMemory();
    }
  }

  getRecipeParams() {
    if (typeof this.getParams === 'function') {
      const p = this.getParams() || {};
      return {
        lineThreshold: Number(p.exposure ?? p.lineThreshold ?? 50),
        exposure: Number(p.exposure ?? p.lineThreshold ?? 50),
        blackPoint: Number(p.blackPoint ?? 0),
        whitePoint: Number(p.whitePoint ?? 100),
        contourDetail: Number(p.contourDetail ?? 75),
        aerialStrength: Number(p.aerialStrength ?? 60),
        needleWidth: Number(p.needleWidth ?? 8) / 10,
        density: Number(p.density ?? 80),
        curvatureGate: Number(p.curvatureGate ?? 70),
        cross: Number(p.crossHatch ?? p.cross ?? 65),
        lotus3D: p.lotus3D ?? true,
        frameStyle: p.frameStyle || 'double'
      };
    }
    const $ = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
    return {
      lineThreshold: Number($('exposure')?.value || 50),
      exposure: Number($('exposure')?.value || 50),
      blackPoint: Number($('blackPoint')?.value || 0),
      whitePoint: Number($('whitePoint')?.value || 100),
      contourDetail: Number($('contourDetail')?.value || 75),
      aerialStrength: Number($('aerialStrength')?.value || 60),
      needleWidth: Number($('needleWidth')?.value || 8) / 10,
      density: Number($('density')?.value || 80),
      curvatureGate: Number($('curvatureGate')?.value || 70),
      cross: Number($('crossHatch')?.value || 65),
      lotus3D: $('lotus3D')?.checked ?? true,
      frameStyle: $('frameStyle')?.value || 'double'
    };
  }

  updateTelemetry(metrics = {}) {
    if (typeof this.onTelemetry === 'function') {
      this.onTelemetry(metrics);
      return;
    }
    if (typeof document === 'undefined') return;
    const $ = id => document.getElementById(id);
    if (metrics.status && $('telemetryStatus')) $('telemetryStatus').textContent = metrics.status;
    if (metrics.task && $('telemetryTask')) $('telemetryTask').textContent = metrics.task;
    if (metrics.duration != null && $('telemetryDuration')) $('telemetryDuration').textContent = `${metrics.duration}ms`;
    const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
    if (metrics.strokes != null && $('telemetryStrokes')) {
      const strokeCount = typeof metrics.strokes === 'number' ? metrics.strokes : String(metrics.strokes).replace(/[^0-9]/g, '');
      const unit = i18n ? i18n.t('telemetry.strokesUnit') : '条';
      $('telemetryStrokes').textContent = `${strokeCount} ${unit}`;
    }
    if (metrics.cache && $('telemetryCache')) {
      const hits = (String(metrics.cache).match(/\d+\/\d+/) || [''])[0];
      const unit = i18n ? i18n.t('telemetry.cacheUnit') : '命中';
      $('telemetryCache').textContent = hits ? `${hits} ${unit}` : metrics.cache;
    }
  }

  setStepGrid(grid) {
    this.stepGrid = grid;
  }

  getMasterData() {
    return {
      loadedImage: this.currentLoadedImage,
      contours: this.lastContours,
      hatching: this.lastHatching,
      masterPaths: this.lastMasterPaths
    };
  }

  async checkModelStatus(locale) {
    const health = await this.aiGateway.checkHealth();
    const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
    const loc = locale || i18n?.getLocale() || 'zh-CN';
    let label = i18n ? i18n.t('model.offline') : '基础离线模式 (纯几何)';
    let badgeClass = 'badge badge-green';

    if (health.mode === 'remote-python') {
      const prefix = i18n ? i18n.t('model.localAi') : (loc === 'en-US' ? 'Local AI' : (loc === 'vi-VN' ? 'AI Cục bộ' : '本机服务'));
      label = `${prefix} · ${health.device}`;
      badgeClass = 'badge badge-green';
    } else if (health.mode === 'browser-webai') {
      const prefix = i18n ? i18n.t('model.online') : (loc === 'en-US' ? 'Local Model' : (loc === 'vi-VN' ? 'Mô hình cục bộ' : '本地模型'));
      label = `${prefix} · ${health.device}`;
      badgeClass = 'badge badge-green';
    } else {
      label = i18n ? i18n.t('model.offline') : (loc === 'en-US' ? 'Offline Mode (Geometric)' : (loc === 'vi-VN' ? 'Chế độ ngoại tuyến (Hình học thuần)' : '基础离线模式 (纯几何)'));
      badgeClass = 'badge badge-green';
    }

    const statusData = {
      ready: true,
      mode: health.mode,
      device: health.device,
      label,
      badgeClass
    };

    if (typeof this.onModelStatus === 'function') {
      this.onModelStatus(statusData);
    } else if (typeof document !== 'undefined') {
      const badge = document.getElementById('modelStatus');
      if (badge) {
        badge.textContent = statusData.label;
        badge.className = statusData.badgeClass;
      }
    }

    const sysCat = i18n ? i18n.t('console.sys') : '系统';
    this.log(sysCat, `AI 引擎状态: ${health.modeLabel || label}`, 'info');
    return statusData;
  }

  async handleImageFile(file) {
    if (!file) return;
    this.sourceVersion += 1;
    this.sourceAbortController?.abort('NEW_SOURCE_IMAGE');
    const sourceController = new AbortController();
    this.sourceAbortController = sourceController;
    const sourceVersion = this.sourceVersion;
    const isCurrent = () => sourceVersion === this.sourceVersion && !sourceController.signal.aborted;
    this.scheduler?.cancelActive('NEW_SOURCE_IMAGE');
    this.stageCache?.clear();
    this.lastStage1LineMap = null;
    this.lastStage2Artifact = null;
    this.lastContours = null;
    this.lastContourMask = null;
    this.lastHatching = null;
    this.lastMasterPaths = null;
    this.currentDepthMap = null;
    this.log('图像', `正在载入原图: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`, 'computing');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        if (!isCurrent()) { resolve(null); return; }
        const img = new Image();
        img.onload = async () => {
          try {
            if (!isCurrent()) { resolve(null); return; }
            const origW = img.naturalWidth || img.width;
            const origH = img.naturalHeight || img.height;
            if (!Number.isSafeInteger(origW) || !Number.isSafeInteger(origH) || origW <= 0 || origH <= 0 || !Number.isSafeInteger(origW * origH)) {
              throw new Error('图片尺寸无效');
            }
            const scale = Math.min(1, Math.sqrt(12000000 / (origW * origH)), 4096 / origW, 4096 / origH);
            const workW = Math.max(1, Math.floor(origW * scale));
            const workH = Math.max(1, Math.floor(origH * scale));
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = workW;
            tmpCanvas.height = workH;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.drawImage(img, 0, 0, workW, workH);
            const imgData = tmpCtx.getImageData(0, 0, workW, workH);

            const pixels = new Uint8ClampedArray(workW * workH);
            const d = imgData.data;
            for (let i = 0; i < pixels.length; i++) {
              const idx = i * 4;
              pixels[i] = Math.round(d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114);
            }
            this.currentLoadedImage = { width: workW, height: workH, originalWidth: origW, originalHeight: origH, pixels, rawImg: tmpCanvas, file };

            if (typeof this.onAspectRatioChange === 'function') {
              this.onAspectRatioChange(workW, workH);
            }

            if (this.stepGrid) {
              if (typeof this.stepGrid.setAspectRatio === 'function') {
                this.stepGrid.setAspectRatio(workW, workH);
              }
              this.stepGrid.updateStepPreview(0, tmpCanvas);
              this.stepGrid.setStepStatus(0, 'DONE', { key: 'card.sourceSize', args: [origW, origH] });
            }

            this.log('图像', `图像装载完成: ${origW} × ${origH}；处理尺寸 ${workW} × ${workH}。`, 'done');
            await this.runPipelineOnLoadedPhoto(file, sourceController.signal, sourceVersion);
            resolve(isCurrent() ? this.currentLoadedImage : null);
          } catch (err) {
            if (!isCurrent()) { resolve(null); return; }
            console.error('Error processing image:', err);
            this.log('图像', `图片处理异常: ${err.message}`, 'error');
            reject(err);
          }
        };
        img.onerror = () => {
          if (!isCurrent()) { resolve(null); return; }
          this.log('图像', '无法解析该图片文件，请换一张常见格式的图片重试。', 'error');
          reject(new Error('Image parse error'));
        };
        img.src = ev.target.result;
      };
      reader.onerror = () => {
        if (!isCurrent()) { resolve(null); return; }
        this.log('图像', '读取本地文件失败，请检查文件权限。', 'error');
        reject(new Error('File read error'));
      };
      reader.readAsDataURL(file);
    });
  }

  async runPipelineOnLoadedPhoto(optionalFile = null, signal = null, sourceVersion = this.sourceVersion) {
    if (!this.currentLoadedImage) return;
    const isCurrent = () => !(signal?.aborted) && sourceVersion === this.sourceVersion;

    let neuralLineUsed = false;
    let engineTag = '神经网络';
    this.updateTelemetry({ status: '管线计算中...', task: 'PIPELINE_RUNNING' });

    const tStart = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    for (let s = 1; s <= 6; s++) {
      if (this.stepGrid) this.stepGrid.setStepStatus(s, 'COMPUTING');
    }

    try {
      const curW = this.currentLoadedImage.width;
      const curH = this.currentLoadedImage.height;

      let inferBlob = null;
      if (this.currentLoadedImage.rawImg && this.currentLoadedImage.rawImg.toBlob) {
        inferBlob = await new Promise(res => this.currentLoadedImage.rawImg.toBlob(res, 'image/jpeg', 0.92));
      } else if (optionalFile || this.currentLoadedImage.file) {
        inferBlob = optionalFile || this.currentLoadedImage.file;
      }
      if (!isCurrent()) return;

      let fetchedDepthMap = null;

      // Check AI Engine Mode (Remote Python / Online Browser Model / Offline Analytical)
      if (inferBlob) {
        const health = await this.aiGateway.checkHealth();
        if (!isCurrent()) return;
        this.log('模型', `当前引擎: ${health.modeLabel}，开始处理线描与空间深度...`, 'computing');
        try {
          const { lineMap, depthMap, backend } = await this.aiGateway.requestParallelPipeline(inferBlob, curW, curH);
          if (!isCurrent()) return;
          if (lineMap) {
            this.currentLoadedImage.lineMap = lineMap;
            neuralLineUsed = true;
            engineTag = health?.modeLabel || '神经网络';
            this.log('模型', `✓ Informative Drawings 神经网络线描完成 (${curW} × ${curH})`, 'done');
          }
          if (depthMap) {
            fetchedDepthMap = depthMap;
            const depthLabel = (backend && backend.startsWith('remote')) ? 'Lotus (本机服务)' : (backend === 'analytical' ? '视角梯度 (基础离线)' : 'MiDaS (本地神经网络)');
            this.log('模型', `✓ ${depthLabel} 空间深度图计算成功 (${curW} × ${curH})，已激活空气透视调制`, 'done');
          }
        } catch (mErr) {
          this.log('模型', `AI 推理异常 (${mErr.message})，自动降级至基础离线几何算法。`, 'warn');
        }
      }

      await new Promise(r => setTimeout(r, 20));
      if (!isCurrent()) return;

      const recipeParams = this.getRecipeParams();
      const recipe = {
        sourceImage: this.currentLoadedImage,
        geometry: fetchedDepthMap ? { depthMap: fetchedDepthMap } : null,
        params: {
          lineThreshold: recipeParams.exposure,
          density: recipeParams.density,
          contourDetail: recipeParams.contourDetail,
          aerialStrength: recipeParams.aerialStrength,
          needleWidth: recipeParams.needleWidth,
          cross: recipeParams.cross,
          targetWidth: curW,
          targetHeight: curH,
          depthMap: fetchedDepthMap
        }
      };

      const Runner = (typeof PipelineRunner !== 'undefined' ? PipelineRunner : (typeof window !== 'undefined' ? window.PipelineRunner : null));
      if (Runner) {
        const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
        let stageStart = _now();
        const outputs = await Runner.run(recipe, {
          signal,
          onProgress: (stage, progress, artifact) => {
            if (!isCurrent()) return;
            if (!this.stepGrid) return;
            const stageElapsed = parseFloat((_now() - stageStart).toFixed(1));
            if (stage === 1 && artifact) {
              this.lastStage1LineMap = artifact;
              this.stepGrid.updateStepPreview(1, artifact);
              this.stepGrid.setStepStatus(1, 'DONE', { key: neuralLineUsed ? 'card.aiLine' : 'card.lineReady' }, stageElapsed);
              this.log('管线', `阶段 1 完成: 线描感知抽取 (${neuralLineUsed ? engineTag : '几何退避'})`, 'done');
            } else if (stage === 2 && artifact) {
              this.lastStage2Artifact = artifact;
              this.stepGrid.updateStepPreview(2, artifact);
              this.stepGrid.setStepStatus(2, 'DONE', { key: 'card.flowReady' }, stageElapsed);
              this.log('管线', '阶段 2 完成: 3D 几何等高流场与色调场合成', 'done');
            } else if (stage === 3 && artifact?.vectorContours) {
              this.lastContours = artifact.vectorContours;
              this.lastContourMask = artifact.contourMask;
              this.stepGrid.updateStepPaths(3, artifact.vectorContours, curW, curH);
              this.stepGrid.setStepStatus(3, 'DONE', { key: 'card.contourCount', args: [artifact.vectorContours.length] }, stageElapsed);
              this.log('管线', `阶段 3 完成: 透视空间骨干轮廓 (${artifact.vectorContours.length} 条轮廓)`, 'done');
            } else if (stage === 4 && artifact?.hatchingPaths) {
              this.lastHatching = artifact.hatchingPaths;
              this.stepGrid.updateStepPaths(4, artifact.hatchingPaths, curW, curH);
              this.stepGrid.setStepStatus(4, 'DONE', { key: 'card.hatchingCount', args: [artifact.hatchingPaths.length] }, stageElapsed);
              this.log('管线', `阶段 4 完成: 曲面空间几何排线 (${artifact.hatchingPaths.length} 条排线)`, 'done');
            }
            stageStart = _now();
          }
        });
        if (!isCurrent()) return;

        const masterPaths = outputs.stage5?.paths || outputs.masterResult?.paths || [...(this.lastContours || []), ...(this.lastHatching || [])];
        this.lastMasterPaths = masterPaths;

        if (this.stageCache) {
          const s1Params = { lotus3D: recipeParams.lotus3D, sourceVersion: this.sourceVersion };
          const s2Params = { exposure: recipeParams.exposure, blackPoint: recipeParams.blackPoint, whitePoint: recipeParams.whitePoint };
          const s3Params = { contourDetail: recipeParams.contourDetail, aerialStrength: recipeParams.aerialStrength, needleWidth: recipeParams.needleWidth };
          const s4Params = { density: recipeParams.density, cross: recipeParams.cross, curvatureGate: recipeParams.curvatureGate };
          const s5Params = {};

          const h1 = this.stageCache.computeStageHash(1, s1Params, '');
          const h2 = this.stageCache.computeStageHash(2, s2Params, h1);
          const h3 = this.stageCache.computeStageHash(3, s3Params, h2);
          const h4 = this.stageCache.computeStageHash(4, s4Params, h3);
          const h5 = this.stageCache.computeStageHash(5, s5Params, h4);

          if (outputs.stage1) this.stageCache.put(1, h1, outputs.stage1);
          if (outputs.stage2) this.stageCache.put(2, h2, outputs.stage2);
          if (outputs.stage3) this.stageCache.put(3, h3, outputs.stage3);
          if (outputs.stage4) this.stageCache.put(4, h4, outputs.stage4);
          if (outputs.stage5) this.stageCache.put(5, h5, outputs.stage5);
        }

        if (this.stepGrid) {
          const stage5Elapsed = parseFloat((_now() - stageStart).toFixed(1));
          this.stepGrid.updateStepPaths(5, this.lastMasterPaths, curW, curH);
          this.stepGrid.setStepStatus(5, 'DONE', { key: 'card.masterCount', args: [this.lastMasterPaths.length] }, stage5Elapsed);
          this.log('管线', `阶段 5 完成: 母版矢量合成 (${this.lastMasterPaths.length} 矢量线条)`, 'done');

          const renderStart = _now();
          const theme = (typeof ThemeBridge !== 'undefined' && ThemeBridge.getRenderTheme)
            ? ThemeBridge.getRenderTheme()
            : (globalThis.ThemeBridge?.getRenderTheme ? globalThis.ThemeBridge.getRenderTheme() : null);
          this.stepGrid.updateStepPaths(6, this.lastMasterPaths, curW, curH, {
            bgTone: theme?.paperGround || '#faf7f0',
            strokeColor: theme?.inkPrimary || '#1a1918',
            frameStyle: recipeParams.frameStyle
          });
          const renderElapsed = parseFloat((_now() - renderStart).toFixed(1));
          this.stepGrid.setStepStatus(6, 'DONE', { key: 'card.transferReady' }, renderElapsed);
          this.syncHeroMasterPreview(this.lastMasterPaths, curW, curH);
          this.log('管线', '阶段 6 完成: 上版母稿已生成', 'done');
        }

        const tEnd = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const totalElapsed = (tEnd - tStart).toFixed(1);

        this.updateTelemetry({
          status: '运行就绪',
          task: 'IDLE',
          duration: totalElapsed,
          strokes: this.lastMasterPaths.length,
          cache: '5/5 命中'
        });

        this.log('工坊', `全管线执行完成！共生成 ${this.lastMasterPaths.length} 条矢量印痕，总耗时 ${totalElapsed}ms。`, 'done');
      }
    } catch (err) {
      if (!isCurrent()) return;
      console.error('Pipeline error:', err);
      this.updateTelemetry({ status: '计算异常: ' + err.message });
      this.log('管线', `管线计算异常: ${err.message}`, 'error');
    }
  }

  downloadStepExport(stepIdx) {
    const download = (blob, name) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    const ExporterLib = (typeof Exporter !== 'undefined' ? Exporter : (typeof window !== 'undefined' ? window.Exporter : null));
    const stepCanvas = this.stepGrid?.stepStates[stepIdx]?.canvas;
    const curW = this.currentLoadedImage?.width || 900;
    const curH = this.currentLoadedImage?.height || 660;
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    if (stepIdx === 0) {
      if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step0-source-${ts}.png`));
      } else if (this.currentLoadedImage?.rawImg) {
        const c = document.createElement('canvas');
        c.width = curW; c.height = curH;
        c.getContext('2d').drawImage(this.currentLoadedImage.rawImg, 0, 0);
        c.toBlob(b => b && download(b, `Etchloom-step0-source-${ts}.png`));
      }
    } else if (stepIdx === 1) {
      if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step1-linemap-${ts}.png`));
      } else if (this.lastStage1LineMap) {
        const c = document.createElement('canvas');
        c.width = this.lastStage1LineMap.width || curW;
        c.height = this.lastStage1LineMap.height || curH;
        const im = c.getContext('2d').createImageData(c.width, c.height);
        const px = this.lastStage1LineMap.pixels || this.lastStage1LineMap;
        for (let i = 0; i < c.width * c.height; i++) {
          const v = px[i] ?? 255;
          im.data[i * 4] = v;
          im.data[i * 4 + 1] = v;
          im.data[i * 4 + 2] = v;
          im.data[i * 4 + 3] = 255;
        }
        c.getContext('2d').putImageData(im, 0, 0);
        c.toBlob(b => b && download(b, `Etchloom-step1-linemap-${ts}.png`));
      }
    } else if (stepIdx === 2) {
      if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step2-toneflow-${ts}.png`));
      }
    } else if (stepIdx === 3) {
      if (this.lastContours && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastContours,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), `Etchloom-step3-contours-${ts}.svg`);
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step3-contours-${ts}.png`));
      }
    } else if (stepIdx === 4) {
      if (this.lastHatching && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastHatching,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), `Etchloom-step4-hatching-${ts}.svg`);
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step4-hatching-${ts}.png`));
      }
    } else if (stepIdx === 5) {
      if (this.lastMasterPaths && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastMasterPaths,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), `Etchloom-step5-master-${ts}.svg`);
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step5-master-${ts}.png`));
      }
    } else if (stepIdx === 6) {
      if (this.lastMasterPaths && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastMasterPaths,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), `Etchloom-step6-transfer-${ts}.svg`);
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, `Etchloom-step6-transfer-${ts}.png`));
      }
    }
  }

  scheduleParameterRun(options = {}) {
    if (!this.currentLoadedImage) return;
    const isDraft = Boolean(options && options.isDraft);
    const request = ++this.recomputeRequest;
    this.onRecomputeState?.(true);

    if (!this.scheduler) {
      const SchedulerClass = (typeof TaskScheduler !== 'undefined' ? TaskScheduler : (globalThis.TaskScheduler || null));
      if (SchedulerClass) this.scheduler = new SchedulerClass(140);
    }

    if (!this.scheduler) {
      Promise.resolve(this.runPipelineOnLoadedPhoto())
        .catch(err => console.error('Parameter redraw failed:', err))
        .finally(() => {
          if (request === this.recomputeRequest) this.onRecomputeState?.(false);
        });
      return;
    }

    const debounceMs = isDraft ? 45 : 0;
    this.scheduler.schedule(async (signal) => {
      await this._executeIncrementalRun(signal, isDraft);
    }, debounceMs).catch(err => {
      console.error('Parameter redraw failed:', err);
    }).finally(() => {
      if (request === this.recomputeRequest) this.onRecomputeState?.(false);
    });
  }

  async _executeIncrementalRun(signal, isDraft = false) {
    if (!this.currentLoadedImage) return;
    const curW = this.currentLoadedImage.width;
    const curH = this.currentLoadedImage.height;

    const recipeParams = this.getRecipeParams();
    const params = {
      lineThreshold: recipeParams.exposure,
      exposure: recipeParams.exposure,
      blackPoint: recipeParams.blackPoint,
      whitePoint: recipeParams.whitePoint,
      contourDetail: recipeParams.contourDetail,
      aerialStrength: recipeParams.aerialStrength,
      needleWidth: recipeParams.needleWidth,
      density: recipeParams.density,
      curvatureGate: recipeParams.curvatureGate,
      cross: recipeParams.cross,
      targetWidth: curW,
      targetHeight: curH,
      depthMap: this.currentDepthMap || null,
      isDraft
    };

    if (!this.stageCache) {
      const CacheClass = (typeof StageCache !== 'undefined' ? StageCache : (globalThis.StageCache || null));
      if (CacheClass) this.stageCache = new CacheClass();
    }

    let startStage = 2; // Incremental recalculation starts from stage 2
    let newHashes = {};

    if (this.stageCache) {
      const s1Params = { lotus3D: recipeParams.lotus3D, sourceVersion: this.sourceVersion };
      const s2Params = { exposure: params.exposure, blackPoint: params.blackPoint, whitePoint: params.whitePoint };
      const s3Params = { contourDetail: params.contourDetail, aerialStrength: params.aerialStrength, needleWidth: params.needleWidth };
      const s4Params = { density: params.density, cross: params.cross, curvatureGate: params.curvatureGate };
      const s5Params = {};

      const h1 = this.stageCache.computeStageHash(1, s1Params, '');
      const h2 = this.stageCache.computeStageHash(2, s2Params, h1);
      const h3 = this.stageCache.computeStageHash(3, s3Params, h2);
      const h4 = this.stageCache.computeStageHash(4, s4Params, h3);
      const h5 = this.stageCache.computeStageHash(5, s5Params, h4);

      newHashes = { 1: h1, 2: h2, 3: h3, 4: h4, 5: h5 };
      startStage = this.stageCache.resolveInvalidation(newHashes, 5);
      if (startStage === 1 && this.stageCache.get(1)) {
        startStage = 2; // Keep stage 1 line map cached for parameter tweaks
      }
    }

    if (startStage > 5) return; // All stages cached

    this.updateTelemetry({
      status: '增量重算中...',
      task: `RECOMPUTING_STAGE_${startStage}_5`
    });

    for (let s = startStage; s <= 6; s++) {
      if (this.stepGrid) this.stepGrid.setStepStatus(s, 'COMPUTING');
    }

    const tStart = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    try {
      const Runner = (typeof PipelineRunner !== 'undefined' ? PipelineRunner : (typeof window !== 'undefined' ? window.PipelineRunner : null));
      if (!Runner) return;

      const previousOutputs = {
        stage1: (this.stageCache && this.stageCache.get(1)) || (this.lastStage1LineMap ? { width: curW, height: curH, data: this.lastStage1LineMap.data || this.lastStage1LineMap.pixels || this.lastStage1LineMap } : null),
        stage2: (this.stageCache && this.stageCache.get(2)) || this.lastStage2Artifact || null,
        stage3: (this.stageCache && this.stageCache.get(3)) || (this.lastContours ? { vectorContours: this.lastContours, contourMask: this.lastContourMask } : null),
        stage4: (this.stageCache && this.stageCache.get(4)) || (this.lastHatching ? { hatchingPaths: this.lastHatching } : null),
        stage5: (this.stageCache && this.stageCache.get(5)) || null
      };

      if (!previousOutputs.stage1 && this.lastStage1LineMap) {
        previousOutputs.stage1 = { width: curW, height: curH, data: this.lastStage1LineMap.data || this.lastStage1LineMap.pixels || this.lastStage1LineMap };
      }

      const context = {
        sourceImage: this.currentLoadedImage,
        geometry: this.currentDepthMap ? { depthMap: this.currentDepthMap } : null
      };

      const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      let stageStart = _now();

      let outputs;
      const onProgressCallback = (stage, progress, artifact) => {
        if (signal && signal.aborted) return;
        if (!this.stepGrid) return;
        const stageElapsed = parseFloat((_now() - stageStart).toFixed(1));
        if (stage === 2 && artifact) {
          this.lastStage2Artifact = artifact;
          this.stepGrid.updateStepPreview(2, artifact);
          this.stepGrid.setStepStatus(2, 'DONE', { key: 'card.flowReady' }, stageElapsed);
        } else if (stage === 3 && artifact?.vectorContours) {
          this.lastContours = artifact.vectorContours;
          this.lastContourMask = artifact.contourMask;
          this.stepGrid.updateStepPaths(3, artifact.vectorContours, curW, curH);
          this.stepGrid.setStepStatus(3, 'DONE', { key: 'card.contourCount', args: [artifact.vectorContours.length] }, stageElapsed);
        } else if (stage === 4 && artifact?.hatchingPaths) {
          this.lastHatching = artifact.hatchingPaths;
          this.stepGrid.updateStepPaths(4, artifact.hatchingPaths, curW, curH);
          this.stepGrid.setStepStatus(4, 'DONE', { key: 'card.hatchingCount', args: [artifact.hatchingPaths.length] }, stageElapsed);
        }
        stageStart = _now();
      };

      if (this.worker) {
        const reqId = ++this.workerRequestId;
        outputs = await new Promise((resolve, reject) => {
          this.workerPending.set(reqId, {
            resolve,
            reject,
            onProgress: onProgressCallback
          });

          if (signal) {
            signal.addEventListener('abort', () => {
              this.worker?.postMessage({ type: 'ABORT', requestId: reqId, reason: signal.reason });
              this.workerPending.delete(reqId);
              const abortErr = new Error(signal.reason || 'PIPELINE_ABORTED');
              abortErr.name = 'AbortError';
              reject(abortErr);
            }, { once: true });
          }

          const workerContext = {
            sourceImage: {
              width: curW,
              height: curH,
              pixels: this.currentLoadedImage.pixels,
              lineMap: this.currentLoadedImage.lineMap || null
            },
            geometry: this.currentDepthMap ? { depthMap: this.currentDepthMap } : null
          };

          this.worker.postMessage({
            type: 'RUN_INCREMENTAL',
            requestId: reqId,
            context: workerContext,
            previousOutputs,
            params,
            startStage
          });
        });
      } else {
        outputs = await Runner.runIncremental(context, previousOutputs, params, startStage, signal, onProgressCallback);
      }

      if (signal && signal.aborted) return;

      const masterPaths = outputs.stage5?.paths || outputs.stage5?.masterResult?.paths || outputs.masterResult?.paths || [...(this.lastContours || []), ...(this.lastHatching || [])];
      this.lastMasterPaths = masterPaths;

      if (this.stepGrid) {
        const s5Elapsed = parseFloat((_now() - stageStart).toFixed(1));
        this.stepGrid.updateStepPaths(5, masterPaths, curW, curH);
        this.stepGrid.setStepStatus(5, 'DONE', { key: 'card.masterCount', args: [masterPaths.length] }, s5Elapsed);

        const theme = (typeof ThemeBridge !== 'undefined' && ThemeBridge.getRenderTheme)
          ? ThemeBridge.getRenderTheme()
          : (globalThis.ThemeBridge?.getRenderTheme ? globalThis.ThemeBridge.getRenderTheme() : null);
        this.stepGrid.updateStepPaths(6, masterPaths, curW, curH, {
          bgTone: theme?.paperGround || '#faf7f0',
          strokeColor: theme?.inkPrimary || '#1a1918',
          frameStyle: recipeParams.frameStyle
        });
        this.stepGrid.setStepStatus(6, 'DONE', { key: 'card.transferReady' }, parseFloat((_now() - stageStart).toFixed(1)));
        this.syncHeroMasterPreview(masterPaths, curW, curH);
      }

      if (this.stageCache && !isDraft) {
        if (outputs.stage1) this.stageCache.put(1, newHashes[1] || 's1', outputs.stage1);
        if (outputs.stage2) this.stageCache.put(2, newHashes[2] || 's2', outputs.stage2);
        if (outputs.stage3) this.stageCache.put(3, newHashes[3] || 's3', outputs.stage3);
        if (outputs.stage4) this.stageCache.put(4, newHashes[4] || 's4', outputs.stage4);
        if (outputs.stage5) this.stageCache.put(5, newHashes[5] || 's5', outputs.stage5);
      }

      const tEnd = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const totalElapsed = (tEnd - tStart).toFixed(1);

      this.updateTelemetry({
        status: isDraft ? '参数拖拽实时预览' : '运行就绪',
        task: isDraft ? 'DRAFT_PREVIEW' : 'IDLE',
        duration: totalElapsed,
        strokes: masterPaths.length,
        cache: isDraft ? '草稿模式' : `${5 - (5 - startStage + 1)}/5 命中`
      });

      this.log('管线', `${isDraft ? '草稿预览生成' : '参数微调完成'} (重算阶段 ${startStage}..5): 生成 ${masterPaths.length} 条矢量线条，增量耗时 ${totalElapsed}ms。`, 'done');
    } catch (err) {
      if (err.name === 'AbortError' || signal?.aborted) {
        return;
      }
      console.error('Incremental run error:', err);
      this.updateTelemetry({ status: '计算异常: ' + err.message });
      this.log('管线', `增量计算异常: ${err.message}`, 'error');
    }
  }

  initBrowserDemo() {
    if (typeof window === 'undefined' || !window.location || !window.location.href || !document.getElementById('stepFlowGridContainer')) return;
    const demoStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const w = 900, h = 660;
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = w;
    demoCanvas.height = h;
    const dctx = demoCanvas.getContext('2d');

    const grad = dctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ebe4d5');
    grad.addColorStop(1, '#b6aba0');
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, w, h);

    dctx.fillStyle = '#635c54';
    dctx.fillRect(140, 480, 620, 55);
    dctx.fillStyle = '#4b453e';
    dctx.fillRect(100, 535, 700, 75);

    dctx.fillStyle = '#52483d';
    dctx.fillRect(240, 190, 80, 290);
    dctx.fillStyle = '#796f64';
    dctx.fillRect(265, 110, 30, 80);

    dctx.beginPath();
    dctx.moveTo(370, 150);
    dctx.lineTo(530, 150);
    dctx.bezierCurveTo(550, 240, 620, 320, 570, 410);
    dctx.bezierCurveTo(530, 480, 370, 480, 330, 410);
    dctx.bezierCurveTo(280, 320, 350, 240, 370, 150);
    dctx.fillStyle = '#3b332c';
    dctx.fill();

    dctx.beginPath();
    dctx.ellipse(450, 150, 80, 20, 0, 0, Math.PI * 2);
    dctx.fillStyle = '#9d9385';
    dctx.fill();

    dctx.beginPath();
    dctx.ellipse(620, 390, 65, 90, 0, 0, Math.PI * 2);
    dctx.fillStyle = '#453b31';
    dctx.fill();

    const imgData = dctx.getImageData(0, 0, w, h);
    const pixels = new Array(w * h);
    for (let i = 0; i < pixels.length; i++) {
      const idx = i * 4;
      pixels[i] = Math.round(imgData.data[idx] * 0.299 + imgData.data[idx + 1] * 0.587 + imgData.data[idx + 2] * 0.114);
    }
    this.currentLoadedImage = { width: w, height: h, pixels, rawImg: demoCanvas };

    if (typeof this.onAspectRatioChange === 'function') {
      this.onAspectRatioChange(w, h);
    }

    if (this.stepGrid) {
      if (typeof this.stepGrid.setAspectRatio === 'function') {
        this.stepGrid.setAspectRatio(w, h);
      }
      this.stepGrid.updateStepPreview(0, demoCanvas);
      this.stepGrid.setStepStatus(0, 'DONE', { key: 'card.sourceSize', args: [w, h] });
    }

    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = w; lineCanvas.height = h;
    const lctx = lineCanvas.getContext('2d');
    lctx.fillStyle = '#ffffff';
    lctx.fillRect(0, 0, w, h);
    lctx.strokeStyle = '#1b1b1b';
    lctx.lineWidth = 1.8;
    lctx.lineCap = 'round';
    lctx.lineJoin = 'round';
    lctx.strokeRect(140, 480, 620, 55);
    lctx.strokeRect(100, 535, 700, 75);
    lctx.strokeRect(240, 190, 80, 290);
    lctx.strokeRect(265, 110, 30, 80);
    lctx.beginPath();
    lctx.ellipse(620, 390, 65, 90, 0, 0, Math.PI * 2);
    lctx.stroke();
    lctx.beginPath();
    lctx.moveTo(370, 150); lctx.lineTo(530, 150);
    lctx.bezierCurveTo(550, 240, 620, 320, 570, 410);
    lctx.bezierCurveTo(530, 480, 370, 480, 330, 410);
    lctx.bezierCurveTo(280, 320, 350, 240, 370, 150);
    lctx.stroke();
    lctx.beginPath();
    lctx.ellipse(450, 150, 80, 20, 0, 0, Math.PI * 2);
    lctx.stroke();

    const lineImgData = lctx.getImageData(0, 0, w, h).data;
    const linePixels = new Uint8ClampedArray(w * h);
    for (let i = 0; i < linePixels.length; i++) {
      linePixels[i] = lineImgData[i * 4];
    }
    this.lastStage1LineMap = { width: w, height: h, pixels: linePixels };

    if (this.stepGrid) {
      this.stepGrid.updateStepPreview(1, lineCanvas);
      this.stepGrid.setStepStatus(1, 'DONE', { key: 'card.lineReady' });
    }

    const toneField = { width: w, height: h, tone: Float32Array.from(pixels, v => 1.0 - v / 255) };
    const flowField = {
      width: w, height: h,
      vx: new Float32Array(w * h),
      vy: new Float32Array(w * h),
      coherence: new Float32Array(w * h)
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        flowField.vx[i] = Math.cos((x - 450) / 100);
        flowField.vy[i] = Math.sin((y - 300) / 100);
        flowField.coherence[i] = (x > 200 && x < 700 && y > 100 && y < 550) ? 0.8 : 0.1;
      }
    }
    if (this.stepGrid) {
      this.stepGrid.updateStepPreview(2, { toneField, flowField });
      this.stepGrid.setStepStatus(2, 'DONE', { key: 'card.flowReady' });
    }

    const contours = [];
    const hatchings = [];

    contours.push({ width: 1.4, points: [[100, 535], [800, 535], [800, 610], [100, 610], [100, 535]] });
    contours.push({ width: 1.2, points: [[140, 480], [760, 480], [760, 535], [140, 535], [140, 480]] });
    contours.push({ width: 1.2, points: [[240, 190], [320, 190], [320, 480], [240, 480], [240, 190]] });
    contours.push({ width: 1.0, points: [[265, 110], [295, 110], [295, 190], [265, 190], [265, 110]] });

    const vaseContour = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.15) {
      const rx = 450 + Math.cos(t) * (t > Math.PI ? 75 : 120);
      const ry = 300 + Math.sin(t) * 160;
      vaseContour.push([rx, ry]);
    }
    vaseContour.push(vaseContour[0]);
    contours.push({ width: 1.6, points: vaseContour });

    const jarContour = [];
    for (let t = 0; t <= Math.PI * 2; t += 0.2) {
      jarContour.push([620 + Math.cos(t) * 65, 390 + Math.sin(t) * 90]);
    }
    jarContour.push(jarContour[0]);
    contours.push({ width: 1.3, points: jarContour });

    for (let x = 245; x < 315; x += 6) {
      hatchings.push({ width: 0.8, points: [[x, 200], [x + 2, 470]] });
    }
    for (let y = 160; y < 460; y += 8) {
      hatchings.push({ width: 0.9, points: [[380, y], [520, y + 4]] });
    }
    for (let y = 320; y < 460; y += 7) {
      hatchings.push({ width: 0.7, points: [[570, y], [670, y - 5]] });
    }
    for (let k = 0; k < 35; k++) {
      hatchings.push({ width: 0.8, points: [[150 + k * 16, 490], [190 + k * 16, 530]] });
    }

    const allPaths = [...contours, ...hatchings];
    this.lastContours = contours;
    this.lastHatching = hatchings;
    this.lastMasterPaths = allPaths;

    if (this.stageCache) {
      this.stageCache.put(1, 'init1', { width: w, height: h, data: linePixels });
      this.stageCache.put(2, 'init2', { toneField, flowField });
      this.stageCache.put(3, 'init3', { vectorContours: contours, contourMask: new Uint8Array(w * h) });
      this.stageCache.put(4, 'init4', { hatchingPaths: hatchings });
      this.stageCache.put(5, 'init5', { masterResult: { paths: allPaths } });
    }

    if (this.stepGrid) {
      this.stepGrid.updateStepPaths(3, contours, w, h);
      this.stepGrid.setStepStatus(3, 'DONE', { key: 'card.contourCount', args: [contours.length] });

      this.stepGrid.updateStepPaths(4, hatchings, w, h);
      this.stepGrid.setStepStatus(4, 'DONE', { key: 'card.hatchingCount', args: [hatchings.length] });

      this.stepGrid.updateStepPaths(5, allPaths, w, h);
      this.stepGrid.setStepStatus(5, 'DONE', { key: 'card.masterCount', args: [allPaths.length] });

      const theme = (typeof ThemeBridge !== 'undefined' && ThemeBridge.getRenderTheme)
        ? ThemeBridge.getRenderTheme()
        : (globalThis.ThemeBridge?.getRenderTheme ? globalThis.ThemeBridge.getRenderTheme() : null);
      this.stepGrid.updateStepPaths(6, allPaths, w, h, {
        bgTone: theme?.paperGround || '#f0ebd9',
        strokeColor: theme?.inkPrimary || '#1a1918'
      });
      this.stepGrid.setStepStatus(6, 'DONE', { key: 'card.transferReady' });
      this.syncHeroMasterPreview(allPaths, w, h);
    }

    const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
    this.updateTelemetry({
      status: i18n ? i18n.t('status.ready') : '运行就绪',
      task: 'IDLE',
      duration: ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - demoStart).toFixed(1),
      strokes: allPaths.length,
      cache: '0/5'
    });

    const sysCat = i18n ? i18n.t('console.sys') : '系统';
    this.log(sysCat, `古典版画工坊初始化完成，已载入莫兰迪静物示范母版 (${allPaths.length} 条矢量线条)，7 组步骤流画卷均已就绪。`, 'info');
  }

  syncHeroMasterPreview(paths, w, h) {
    if (typeof document === 'undefined') return;
    const heroCanvas = document.getElementById('masterHeroCanvas');
    const heroResMeta = document.getElementById('heroResolutionMeta');
    const heroBadge = document.getElementById('masterStrokesBadge');
    if (heroResMeta && w && h) {
      heroResMeta.textContent = `${w} × ${h} px`;
    }
    if (heroBadge && paths) {
      const i18n = (typeof window !== 'undefined' && window.i18nManager) || null;
      const unit = i18n ? i18n.t('telemetry.strokesUnit') : '条矢量线条';
      heroBadge.textContent = `${paths.length.toLocaleString()} ${unit}`;
    }
    if (!heroCanvas) return;
    const srcCanvas = this.stepGrid?.stepStates[6]?.canvas || this.stepGrid?.stepStates[5]?.canvas;
    if (srcCanvas) {
      heroCanvas.width = srcCanvas.width;
      heroCanvas.height = srcCanvas.height;
      const aspectStr = `${srcCanvas.width} / ${srcCanvas.height}`;
      heroCanvas.style.aspectRatio = aspectStr;
      const heroViewport = document.getElementById('masterHeroViewport');
      if (heroViewport) {
        heroViewport.style.setProperty('--source-aspect-ratio', aspectStr);
      }
      const ctx = heroCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
        ctx.drawImage(srcCanvas, 0, 0);
      }
    } else if (w && h) {
      const aspectStr = `${w} / ${h}`;
      heroCanvas.style.aspectRatio = aspectStr;
      const heroViewport = document.getElementById('masterHeroViewport');
      if (heroViewport) {
        heroViewport.style.setProperty('--source-aspect-ratio', aspectStr);
      }
    }
    if (paths?.length && typeof this.onMasterReady === 'function') {
      this.onMasterReady();
    }
  }
}
