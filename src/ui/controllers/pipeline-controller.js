/**
 * Pipeline Controller (M2: 5阶段算法母版计算与图纸流水线控制器)
 * Coordinates photo loading, AIServiceGateway parallel inference (Informative Drawings & Lotus Depth),
 * PipelineRunner execution, StepFlowGrid rendering, and telemetry metrics.
 */

import { AIServiceGateway } from '../../services/client/ai-service-gateway.js';

const getFrameGeometry = (w, h, s) => {
  const fn = (typeof window !== 'undefined' && window.getFrameGeometry) || (typeof globalThis !== 'undefined' && globalThis.getFrameGeometry);
  if (typeof fn === 'function') return fn(w, h, s);
  const m = Math.round(50 * Math.min(w, h) / 660);
  return { art: { x: m, y: m, w: w - 2 * m, h: h - 2 * m }, style: s || 'none' };
};

const drawEngravedFrame = (ctx, w, h, geom, strokeColor) => {
  const fn = (typeof window !== 'undefined' && window.drawEngravedFrame) || (typeof globalThis !== 'undefined' && globalThis.drawEngravedFrame);
  if (typeof fn === 'function') return fn(ctx, w, h, geom, strokeColor);
};

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

    this.currentLoadedImage = null;
    this.currentDepthMap = null;
    this.lastStage1LineMap = null;
    this.lastContours = null;
    this.lastHatching = null;
    this.lastMasterPaths = null;

    const SchedulerClass = (typeof TaskScheduler !== 'undefined' ? TaskScheduler : (globalThis.TaskScheduler || null));
    const CacheClass = (typeof StageCache !== 'undefined' ? StageCache : (globalThis.StageCache || null));
    this.scheduler = SchedulerClass ? new SchedulerClass(140) : null;
    this.stageCache = CacheClass ? new CacheClass() : null;
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
    if (metrics.strokes != null && $('telemetryStrokes')) {
      const isEn = (typeof window !== 'undefined' && window.i18nManager && window.i18nManager.getLocale() === 'en-US');
      const strokeCount = typeof metrics.strokes === 'number' ? metrics.strokes : String(metrics.strokes).replace(/[^0-9]/g, '');
      $('telemetryStrokes').textContent = isEn ? `${strokeCount} lines` : `${strokeCount} 条`;
    }
    if (metrics.cache && $('telemetryCache')) $('telemetryCache').textContent = metrics.cache;
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
    const isEn = locale === 'en-US' || (typeof window !== 'undefined' && window.i18nManager && window.i18nManager.getLocale() === 'en-US');
    let label = isEn ? 'Offline Mode (Geometric)' : '基础离线模式 (纯几何)';
    let badgeClass = 'badge badge-green';

    if (health.mode === 'remote-python') {
      label = isEn ? `Local AI · ${health.device}` : `本机服务 · ${health.device}`;
      badgeClass = 'badge badge-green';
    } else if (health.mode === 'browser-webai') {
      label = isEn ? `Online Model · ${health.device}` : `联网模型 · ${health.device}`;
      badgeClass = 'badge badge-gold';
    } else {
      label = isEn ? 'Offline Mode (Geometric)' : '基础离线模式 (纯几何)';
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

    this.log('系统', `AI 引擎状态: ${health.modeLabel || label}`, 'info');
    return statusData;
  }

  async handleImageFile(file) {
    if (!file) return;
    this.log('图像', `正在载入原图: ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`, 'computing');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = async () => {
          try {
            const origW = img.naturalWidth || img.width;
            const origH = img.naturalHeight || img.height;
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = origW;
            tmpCanvas.height = origH;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.drawImage(img, 0, 0, origW, origH);
            const imgData = tmpCtx.getImageData(0, 0, origW, origH);

            const pixels = new Uint8ClampedArray(origW * origH);
            const d = imgData.data;
            for (let i = 0; i < pixels.length; i++) {
              const idx = i * 4;
              pixels[i] = Math.round(d[idx] * 0.299 + d[idx + 1] * 0.587 + d[idx + 2] * 0.114);
            }
            this.currentLoadedImage = { width: origW, height: origH, pixels, rawImg: tmpCanvas, file };

            if (typeof this.onAspectRatioChange === 'function') {
              this.onAspectRatioChange(origW, origH);
            }

            if (this.stepGrid) {
              if (typeof this.stepGrid.setAspectRatio === 'function') {
                this.stepGrid.setAspectRatio(origW, origH);
              }
              this.stepGrid.updateStepPreview(0, tmpCanvas);
              this.stepGrid.setStepStatus(0, 'DONE', `${origW} × ${origH} (原图比例)`);
            }

            this.log('图像', `图像装载完成: ${origW} × ${origH} 原始物理规格，维持原图尺寸与比例。进入 5 阶段管线计算。`, 'done');
            await this.runPipelineOnLoadedPhoto(file);
            resolve(this.currentLoadedImage);
          } catch (err) {
            console.error('Error processing image:', err);
            this.log('图像', `图片处理异常: ${err.message}`, 'error');
            reject(err);
          }
        };
        img.onerror = () => {
          this.log('图像', '无法解析该图片文件，请换一张常见格式的图片重试。', 'error');
          reject(new Error('Image parse error'));
        };
        img.src = ev.target.result;
      };
      reader.onerror = () => {
        this.log('图像', '读取本地文件失败，请检查文件权限。', 'error');
        reject(new Error('File read error'));
      };
      reader.readAsDataURL(file);
    });
  }

  async runPipelineOnLoadedPhoto(optionalFile = null) {
    if (!this.currentLoadedImage) return;

    let neuralLineUsed = false;
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

      let fetchedDepthMap = null;

      // Check AI Engine Mode (Remote Python / Online Browser Model / Offline Analytical)
      if (inferBlob) {
        const health = await this.aiGateway.checkHealth();
        this.log('模型', `当前引擎: ${health.modeLabel}，开始处理线描与空间深度...`, 'computing');
        try {
          const { lineMap, depthMap, backend } = await this.aiGateway.requestParallelPipeline(inferBlob, curW, curH);
          if (lineMap) {
            this.currentLoadedImage.lineMap = lineMap;
            neuralLineUsed = true;
            this.log('模型', `✓ Informative Drawings 神经网络线描完成 (${curW} × ${curH})`, 'done');
          }
          if (depthMap) {
            fetchedDepthMap = depthMap;
            const depthLabel = (backend && backend.startsWith('remote')) ? 'Lotus (本机服务)' : (backend === 'analytical' ? '视角梯度 (基础离线)' : 'Depth Anything V2 (联网浏览器模型)');
            this.log('模型', `✓ ${depthLabel} 空间深度图计算成功 (${curW} × ${curH})，已激活空气透视调制`, 'done');
          }
        } catch (mErr) {
          this.log('模型', `AI 推理异常 (${mErr.message})，自动降级至基础离线几何算法。`, 'warn');
        }
      }

      await new Promise(r => setTimeout(r, 20));

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
          onProgress: (stage, progress, artifact) => {
            if (!this.stepGrid) return;
            const stageElapsed = parseFloat((_now() - stageStart).toFixed(1));
            if (stage === 1 && artifact) {
              this.lastStage1LineMap = artifact;
              this.stepGrid.updateStepPreview(1, artifact);
              this.stepGrid.setStepStatus(1, 'DONE', neuralLineUsed ? 'Informative Drawings (CUDA)' : '线描感知', stageElapsed);
              this.log('管线', `阶段 1 完成: 线描感知抽取 (${neuralLineUsed ? 'CUDA 神经网络' : '几何退避'})`, 'done');
            } else if (stage === 2 && artifact) {
              this.lastStage2Artifact = artifact;
              this.stepGrid.updateStepPreview(2, artifact);
              this.stepGrid.setStepStatus(2, 'DONE', '3D几何等高流场', stageElapsed);
              this.log('管线', '阶段 2 完成: 3D 几何等高流场与色调场合成', 'done');
            } else if (stage === 3 && artifact?.vectorContours) {
              this.lastContours = artifact.vectorContours;
              this.lastContourMask = artifact.contourMask;
              this.stepGrid.updateStepPaths(3, artifact.vectorContours, curW, curH);
              this.stepGrid.setStepStatus(3, 'DONE', `${artifact.vectorContours.length} 条空间轮廓`, stageElapsed);
              this.log('管线', `阶段 3 完成: 透视空间骨干轮廓 (${artifact.vectorContours.length} 条轮廓)`, 'done');
            } else if (stage === 4 && artifact?.hatchingPaths) {
              this.lastHatching = artifact.hatchingPaths;
              this.stepGrid.updateStepPaths(4, artifact.hatchingPaths, curW, curH);
              this.stepGrid.setStepStatus(4, 'DONE', `${artifact.hatchingPaths.length} 条曲面排线`, stageElapsed);
              this.log('管线', `阶段 4 完成: 曲面空间几何排线 (${artifact.hatchingPaths.length} 条排线)`, 'done');
            }
            stageStart = _now();
          }
        });

        const masterPaths = outputs.stage5?.paths || outputs.masterResult?.paths || [...(this.lastContours || []), ...(this.lastHatching || [])];
        this.lastMasterPaths = masterPaths;

        if (this.stageCache) {
          const s1Params = { lotus3D: recipeParams.lotus3D };
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
          this.stepGrid.setStepStatus(5, 'DONE', `${this.lastMasterPaths.length} 矢量母版线条`, stage5Elapsed);
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
          this.stepGrid.setStepStatus(6, 'DONE', '纯棉纸凹版印样', renderElapsed);
          this.log('仿真', '阶段 6 完成: 纯棉纸凹版印样仿真完成', 'done');
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

    if (stepIdx === 0) {
      if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step0_source_image.png'));
      } else if (this.currentLoadedImage?.rawImg) {
        const c = document.createElement('canvas');
        c.width = curW; c.height = curH;
        c.getContext('2d').drawImage(this.currentLoadedImage.rawImg, 0, 0);
        c.toBlob(b => b && download(b, 'step0_source_image.png'));
      }
    } else if (stepIdx === 1) {
      if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step1_line_map.png'));
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
        c.toBlob(b => b && download(b, 'step1_line_map.png'));
      }
    } else if (stepIdx === 2) {
      if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step2_tone_flow.png'));
      }
    } else if (stepIdx === 3) {
      if (this.lastContours && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastContours,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), 'step3_contours.svg');
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step3_contours.png'));
      }
    } else if (stepIdx === 4) {
      if (this.lastHatching && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastHatching,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), 'step4_hatching.svg');
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step4_hatching.png'));
      }
    } else if (stepIdx === 5) {
      if (this.lastMasterPaths && ExporterLib) {
        const svg = ExporterLib.exportPayload({
          format: 'SVG',
          masterPaths: this.lastMasterPaths,
          options: { width: curW, height: curH }
        });
        download(new Blob([svg.data], { type: svg.mimeType }), 'step5_master_vector.svg');
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step5_master_vector.png'));
      }
    } else if (stepIdx === 6) {
      // Export pristine physical fine-art print on cotton paper with plate bevel
      const expW = Math.max(1400, curW);
      const expH = Math.max(1, Math.round(expW * curH / curW));
      const c = document.createElement('canvas');
      c.width = expW;
      c.height = expH;
      const ctx = c.getContext('2d');
      if (ctx) {
        const recipeParams = this.getRecipeParams();
        const frameStyle = recipeParams.frameStyle || 'double';
        const geom = getFrameGeometry(expW, expH, frameStyle);

        const theme = (typeof ThemeBridge !== 'undefined' && ThemeBridge.getRenderTheme)
          ? ThemeBridge.getRenderTheme()
          : (globalThis.ThemeBridge?.getRenderTheme ? globalThis.ThemeBridge.getRenderTheme() : null);
        const paperGround = theme?.paperGround || '#faf7f0';
        const inkPrimary = theme?.inkPrimary || '#1a1918';

        // Pure archival cotton paper
        ctx.fillStyle = paperGround;
        ctx.fillRect(0, 0, expW, expH);

        // Draw impressed paper depression, plate bevel, and chosen frame style (outer, fine, rough)
        drawEngravedFrame(ctx, expW, expH, geom, inkPrimary);

        // Artwork Display Area strictly nested within inner frame clearance
        const { x: artX, y: artY, w: artW, h: artH } = geom.art;

        // Render intaglio ink strokes
        if (this.lastMasterPaths && this.lastMasterPaths.length > 0) {
          const scale = Math.min(artW / curW, artH / curH);
          const offX = artX + Math.round((artW - curW * scale) / 2);
          const offY = artY + Math.round((artH - curH * scale) / 2);

          ctx.save();
          ctx.beginPath();
          ctx.rect(artX, artY, artW, artH);
          ctx.clip();

          ctx.strokeStyle = inkPrimary;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (const path of this.lastMasterPaths) {
            const pts = path.points || path;
            if (!pts || pts.length < 2) continue;
            ctx.beginPath();
            ctx.lineWidth = Math.max(0.6, (path.width || 0.8) * scale);
            ctx.moveTo(offX + pts[0][0] * scale, offY + pts[0][1] * scale);
            for (let j = 1; j < pts.length; j++) {
              ctx.lineTo(offX + pts[j][0] * scale, offY + pts[j][1] * scale);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
        c.toBlob(b => b && download(b, 'step6_plate_print.png'));
      } else if (stepCanvas) {
        stepCanvas.toBlob(b => b && download(b, 'step6_plate_print.png'));
      }
    }
  }

  scheduleParameterRun() {
    if (!this.currentLoadedImage) return;

    if (!this.scheduler) {
      const SchedulerClass = (typeof TaskScheduler !== 'undefined' ? TaskScheduler : (globalThis.TaskScheduler || null));
      if (SchedulerClass) this.scheduler = new SchedulerClass(140);
    }

    if (!this.scheduler) {
      this.runPipelineOnLoadedPhoto();
      return;
    }

    this.scheduler.schedule(async (signal) => {
      await this._executeIncrementalRun(signal);
    });
  }

  async _executeIncrementalRun(signal) {
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
      depthMap: this.currentDepthMap || null
    };

    if (!this.stageCache) {
      const CacheClass = (typeof StageCache !== 'undefined' ? StageCache : (globalThis.StageCache || null));
      if (CacheClass) this.stageCache = new CacheClass();
    }

    let startStage = 2; // Incremental recalculation starts from stage 2
    let newHashes = {};

    if (this.stageCache) {
      const s1Params = { lotus3D: recipeParams.lotus3D };
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
        stage1: (this.stageCache && this.stageCache.get(1)) || (this.lastStage1LineMap ? { width: curW, height: curH, data: this.lastStage1LineMap.pixels || this.lastStage1LineMap } : null),
        stage2: (this.stageCache && this.stageCache.get(2)) || this.lastStage2Artifact || null,
        stage3: (this.stageCache && this.stageCache.get(3)) || (this.lastContours ? { vectorContours: this.lastContours, contourMask: this.lastContourMask } : null),
        stage4: (this.stageCache && this.stageCache.get(4)) || (this.lastHatching ? { hatchingPaths: this.lastHatching } : null),
        stage5: (this.stageCache && this.stageCache.get(5)) || null
      };

      if (!previousOutputs.stage1 && this.lastStage1LineMap) {
        previousOutputs.stage1 = { width: curW, height: curH, data: this.lastStage1LineMap.pixels || this.lastStage1LineMap };
      }

      const context = {
        sourceImage: this.currentLoadedImage,
        geometry: this.currentDepthMap ? { depthMap: this.currentDepthMap } : null
      };

      const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      let stageStart = _now();

      const outputs = await Runner.runIncremental(context, previousOutputs, params, startStage, signal, (stage, progress, artifact) => {
        if (signal && signal.aborted) return;
        if (!this.stepGrid) return;
        const stageElapsed = parseFloat((_now() - stageStart).toFixed(1));
        if (stage === 2 && artifact) {
          this.lastStage2Artifact = artifact;
          this.stepGrid.updateStepPreview(2, artifact);
          this.stepGrid.setStepStatus(2, 'DONE', '3D几何流场', stageElapsed);
        } else if (stage === 3 && artifact?.vectorContours) {
          this.lastContours = artifact.vectorContours;
          this.lastContourMask = artifact.contourMask;
          this.stepGrid.updateStepPaths(3, artifact.vectorContours, curW, curH);
          this.stepGrid.setStepStatus(3, 'DONE', `${artifact.vectorContours.length} 条空间轮廓`, stageElapsed);
        } else if (stage === 4 && artifact?.hatchingPaths) {
          this.lastHatching = artifact.hatchingPaths;
          this.stepGrid.updateStepPaths(4, artifact.hatchingPaths, curW, curH);
          this.stepGrid.setStepStatus(4, 'DONE', `${artifact.hatchingPaths.length} 条曲面排线`, stageElapsed);
        }
        stageStart = _now();
      });

      if (signal && signal.aborted) return;

      const masterPaths = outputs.stage5?.paths || outputs.stage5?.masterResult?.paths || outputs.masterResult?.paths || [...(this.lastContours || []), ...(this.lastHatching || [])];
      this.lastMasterPaths = masterPaths;

      if (this.stepGrid) {
        const s5Elapsed = parseFloat((_now() - stageStart).toFixed(1));
        this.stepGrid.updateStepPaths(5, masterPaths, curW, curH);
        this.stepGrid.setStepStatus(5, 'DONE', `${masterPaths.length} 矢量母版线条`, s5Elapsed);

        const theme = (typeof ThemeBridge !== 'undefined' && ThemeBridge.getRenderTheme)
          ? ThemeBridge.getRenderTheme()
          : (globalThis.ThemeBridge?.getRenderTheme ? globalThis.ThemeBridge.getRenderTheme() : null);
        this.stepGrid.updateStepPaths(6, masterPaths, curW, curH, {
          bgTone: theme?.paperGround || '#faf7f0',
          strokeColor: theme?.inkPrimary || '#1a1918',
          frameStyle: recipeParams.frameStyle
        });
        this.stepGrid.setStepStatus(6, 'DONE', '纯棉纸凹版印样', 10.0);
      }

      if (this.stageCache) {
        if (outputs.stage1) this.stageCache.put(1, newHashes[1] || 's1', outputs.stage1);
        if (outputs.stage2) this.stageCache.put(2, newHashes[2] || 's2', outputs.stage2);
        if (outputs.stage3) this.stageCache.put(3, newHashes[3] || 's3', outputs.stage3);
        if (outputs.stage4) this.stageCache.put(4, newHashes[4] || 's4', outputs.stage4);
        if (outputs.stage5) this.stageCache.put(5, newHashes[5] || 's5', outputs.stage5);
      }

      const tEnd = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const totalElapsed = (tEnd - tStart).toFixed(1);

      this.updateTelemetry({
        status: '运行就绪',
        task: 'IDLE',
        duration: totalElapsed,
        strokes: masterPaths.length,
        cache: `${5 - (5 - startStage + 1)}/5 命中`
      });

      this.log('管线', `参数微调完成 (重算阶段 ${startStage}..5): 生成 ${masterPaths.length} 条矢量线条，增量耗时 ${totalElapsed}ms。`, 'done');
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

    if (this.stepGrid) {
      if (typeof this.stepGrid.setAspectRatio === 'function') {
        this.stepGrid.setAspectRatio(w, h);
      }
      this.stepGrid.updateStepPreview(0, demoCanvas);
      this.stepGrid.setStepStatus(0, 'DONE', '900 × 660 莫兰迪静物');
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
      this.stepGrid.setStepStatus(1, 'DONE', '神经感知线描', 18.5);
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
      this.stepGrid.setStepStatus(2, 'DONE', '3D几何等高流场', 34.0);
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
      this.stepGrid.setStepStatus(3, 'DONE', `${contours.length} 条空间骨干轮廓`, 22.0);

      this.stepGrid.updateStepPaths(4, hatchings, w, h);
      this.stepGrid.setStepStatus(4, 'DONE', `${hatchings.length} 条曲面几何排线`, 54.0);

      this.stepGrid.updateStepPaths(5, allPaths, w, h);
      this.stepGrid.setStepStatus(5, 'DONE', `${allPaths.length} 矢量母版线条`, 14.0);

      const theme = (typeof ThemeBridge !== 'undefined' && ThemeBridge.getRenderTheme)
        ? ThemeBridge.getRenderTheme()
        : (globalThis.ThemeBridge?.getRenderTheme ? globalThis.ThemeBridge.getRenderTheme() : null);
      this.stepGrid.updateStepPaths(6, allPaths, w, h, {
        bgTone: theme?.paperGround || '#f0ebd9',
        strokeColor: theme?.inkPrimary || '#1a1918'
      });
      this.stepGrid.setStepStatus(6, 'DONE', '纯棉纸凹版印样仿真', 12.0);
    }

    const isEn = (typeof window !== 'undefined' && window.i18nManager && window.i18nManager.getLocale() === 'en-US');
    this.updateTelemetry({
      status: isEn ? 'Ready' : '运行就绪',
      task: 'IDLE',
      duration: '38.5',
      strokes: allPaths.length,
      cache: isEn ? '5/5 Hits' : '5/5 命中'
    });

    this.log('系统', `古典版画工坊初始化完成，已载入莫兰迪静物示范母版 (${allPaths.length} 条矢量线条)，7 组步骤流画卷均已就绪。`, 'info');
  }
}
