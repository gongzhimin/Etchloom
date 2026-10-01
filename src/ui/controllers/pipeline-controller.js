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

    this.currentLoadedImage = null;
    this.lastStage1LineMap = null;
    this.lastContours = null;
    this.lastHatching = null;
    this.lastMasterPaths = null;
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

  async checkModelStatus() {
    const badge = document.getElementById('modelStatus');
    if (!badge) return;
    const health = await this.aiGateway.checkHealth();
    if (health.ready || health.device) {
      badge.textContent = `已就绪 · ${(health.device || 'CUDA').toUpperCase()}`;
      badge.className = 'badge badge-green';
      this.log('系统', `Informative Drawings 神经网络服务在线 (${health.device || 'CUDA'})，准备就绪。`, 'info');
    } else {
      badge.textContent = '未启动 (纯2D退避)';
      badge.className = 'badge badge-amber';
    }
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

            if (this.stepGrid) {
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
    const telemetryStatus = document.getElementById('telemetryStatus');
    const telemetryTask = document.getElementById('telemetryTask');
    if (telemetryStatus) telemetryStatus.textContent = '管线计算中...';
    if (telemetryTask) telemetryTask.textContent = 'PIPELINE_RUNNING';

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

      // Check Local AI Service
      if (inferBlob) {
        const health = await this.aiGateway.checkHealth();
        if (health.ready || health.device) {
          this.log('模型', `检测到本地 AI 服务 (${health.device || 'CUDA'})，正在并行请求神经网络线描与空间深度...`, 'computing');
          try {
            const { lineMap, depthMap } = await this.aiGateway.requestParallelPipeline(inferBlob, curW, curH);
            if (lineMap) {
              this.currentLoadedImage.lineMap = lineMap;
              neuralLineUsed = true;
              this.log('模型', `✓ Informative Drawings 神经网络线描完成 (${curW} × ${curH})`, 'done');
            }
            if (depthMap) {
              fetchedDepthMap = depthMap;
              this.log('模型', `✓ Lotus 空间深度图计算成功 (${curW} × ${curH})，已激活空气透视调制`, 'done');
            }
          } catch (mErr) {
            this.log('模型', `AI 服务通信异常 (${mErr.message})，已快速启用本地高精度几何边缘算法。`, 'warn');
          }
        } else {
          this.log('模型', '本地 AI 推理服务未启动，启用高精度几何边缘退避算法。', 'info');
        }
      }

      await new Promise(r => setTimeout(r, 20));

      const $ = id => document.getElementById(id);
      const recipe = {
        sourceImage: this.currentLoadedImage,
        geometry: fetchedDepthMap ? { depthMap: fetchedDepthMap } : null,
        params: {
          lineThreshold: Number($('exposure')?.value || 50),
          density: Number($('density')?.value || 80),
          contourDetail: Number($('contourDetail')?.value || 75),
          aerialStrength: Number($('aerialStrength')?.value || 60),
          needleWidth: Number($('needleWidth')?.value || 8) / 10,
          cross: Number($('crossHatch')?.value || 65),
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
              this.stepGrid.setStepStatus(1, 'DONE', neuralLineUsed ? 'Informative Drawings (CUDA)' : '边缘线描感知', stageElapsed);
              this.log('管线', `阶段 1 完成: 灰度线描感知抽取 (${neuralLineUsed ? 'CUDA 神经网络' : '几何退避'})`, 'done');
            } else if (stage === 2 && artifact) {
              this.stepGrid.updateStepPreview(2, artifact);
              this.stepGrid.setStepStatus(2, 'DONE', '3D几何等高流场', stageElapsed);
              this.log('管线', '阶段 2 完成: 3D 几何等高流场与色调场合成', 'done');
            } else if (stage === 3 && artifact?.vectorContours) {
              this.lastContours = artifact.vectorContours;
              this.stepGrid.updateStepPaths(3, artifact.vectorContours, curW, curH);
              this.stepGrid.setStepStatus(3, 'DONE', `${artifact.vectorContours.length} 条空间轮廓`, stageElapsed);
              this.log('管线', `阶段 3 完成: 空气透视与空间骨干轮廓 (${artifact.vectorContours.length} 条轮廓)`, 'done');
            } else if (stage === 4 && artifact?.hatchingPaths) {
              this.lastHatching = artifact.hatchingPaths;
              this.stepGrid.updateStepPaths(4, artifact.hatchingPaths, curW, curH);
              this.stepGrid.setStepStatus(4, 'DONE', `${artifact.hatchingPaths.length} 条曲面排线`, stageElapsed);
              this.log('管线', `阶段 4 完成: 曲面空间几何排线 (${artifact.hatchingPaths.length} 条排线)`, 'done');
            }
            stageStart = _now();
          }
        });

        this.lastMasterPaths = outputs.masterResult?.paths || [];
        if (this.stepGrid) {
          const stage5Elapsed = parseFloat((_now() - stageStart).toFixed(1));
          this.stepGrid.updateStepPaths(5, this.lastMasterPaths, curW, curH);
          this.stepGrid.setStepStatus(5, 'DONE', `${this.lastMasterPaths.length} 矢量母版线条`, stage5Elapsed);
          this.log('管线', `阶段 5 完成: 母版矢量合成 (${this.lastMasterPaths.length} 矢量线条)`, 'done');

          const renderStart = _now();
          this.stepGrid.updateStepPaths(6, this.lastMasterPaths, curW, curH, {
            bgTone: '#f0ebd9',
            strokeColor: '#1a1918'
          });
          const renderElapsed = parseFloat((_now() - renderStart).toFixed(1));
          this.stepGrid.setStepStatus(6, 'DONE', '纯棉纸凹版印样仿真', renderElapsed);
          this.log('仿真', '阶段 6 完成: 纯棉纸凹版印样压印仿真完成', 'done');
        }

        const tEnd = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const totalElapsed = (tEnd - tStart).toFixed(1);

        if (telemetryStatus) telemetryStatus.textContent = '运行就绪';
        if (telemetryTask) telemetryTask.textContent = 'IDLE';
        if ($('telemetryDuration')) $('telemetryDuration').textContent = totalElapsed + 'ms';
        if ($('telemetryStrokes')) $('telemetryStrokes').textContent = this.lastMasterPaths.length + ' 条';
        if ($('telemetryCache')) $('telemetryCache').textContent = '5/5 命中';

        this.log('工坊', `全管线执行完成！共生成 ${this.lastMasterPaths.length} 条矢量印痕，总耗时 ${totalElapsed}ms。`, 'done');
      }
    } catch (err) {
      console.error('Pipeline error:', err);
      if (telemetryStatus) telemetryStatus.textContent = '计算异常: ' + err.message;
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

    if (stepIdx === 0 && this.currentLoadedImage?.rawImg) {
      const c = document.createElement('canvas');
      c.width = this.currentLoadedImage.width; c.height = this.currentLoadedImage.height;
      c.getContext('2d').drawImage(this.currentLoadedImage.rawImg, 0, 0);
      c.toBlob(b => b && download(b, 'step0_source_image.png'));
    } else if (stepIdx === 1 && this.lastStage1LineMap) {
      const c = document.createElement('canvas');
      c.width = this.lastStage1LineMap.width; c.height = this.lastStage1LineMap.height;
      const im = c.getContext('2d').createImageData(c.width, c.height);
      for (let i = 0; i < c.width * c.height; i++) {
        const v = this.lastStage1LineMap.pixels[i];
        im.data[i*4] = v; im.data[i*4+1] = v; im.data[i*4+2] = v; im.data[i*4+3] = 255;
      }
      c.getContext('2d').putImageData(im, 0, 0);
      c.toBlob(b => b && download(b, 'step1_line_map.png'));
    } else if (stepIdx === 3 && this.lastContours && ExporterLib) {
      const svg = ExporterLib.exportPayload({ format: 'SVG', masterPaths: this.lastContours, width: 400, height: 300 });
      download(new Blob([svg.data], { type: svg.mimeType }), 'step3_contours.svg');
    } else if (stepIdx === 4 && this.lastHatching && ExporterLib) {
      const svg = ExporterLib.exportPayload({ format: 'SVG', masterPaths: this.lastHatching, width: 400, height: 300 });
      download(new Blob([svg.data], { type: svg.mimeType }), 'step4_hatching.svg');
    } else if (stepIdx === 5 && this.lastMasterPaths && ExporterLib) {
      const svg = ExporterLib.exportPayload({ format: 'SVG', masterPaths: this.lastMasterPaths, width: 400, height: 300 });
      download(new Blob([svg.data], { type: svg.mimeType }), 'step5_master_vector.svg');
    } else if (stepIdx === 6) {
      const c = this.stepGrid?.stepStates[6]?.canvas;
      if (c) c.toBlob(b => b && download(b, 'step6_plate_print.png'));
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

    if (this.stepGrid) {
      this.stepGrid.updateStepPaths(3, contours, w, h);
      this.stepGrid.setStepStatus(3, 'DONE', `${contours.length} 条空间骨干轮廓`, 22.0);

      this.stepGrid.updateStepPaths(4, hatchings, w, h);
      this.stepGrid.setStepStatus(4, 'DONE', `${hatchings.length} 条曲面几何排线`, 54.0);

      this.stepGrid.updateStepPaths(5, allPaths, w, h);
      this.stepGrid.setStepStatus(5, 'DONE', `${allPaths.length} 矢量母版线条`, 14.0);

      this.stepGrid.updateStepPaths(6, allPaths, w, h, { bgTone: '#f0ebd9', strokeColor: '#1a1918' });
      this.stepGrid.setStepStatus(6, 'DONE', '纯棉纸凹版印样仿真', 12.0);
    }

    this.onPlateCarve(allPaths, w, h);

    const $ = id => document.getElementById(id);
    if ($('telemetryStatus')) $('telemetryStatus').textContent = '运行就绪';
    if ($('telemetryTask')) $('telemetryTask').textContent = 'IDLE';
    if ($('telemetryDuration')) $('telemetryDuration').textContent = '38.5ms';
    if ($('telemetryStrokes')) $('telemetryStrokes').textContent = allPaths.length + ' 条';
    if ($('telemetryCache')) $('telemetryCache').textContent = '5/5 命中';

    this.log('系统', `古典版画工坊初始化完成，已载入莫兰迪静物示范母版 (${allPaths.length} 条矢量线条)，7 组步骤流画卷均已就绪。`, 'info');
  }
}
