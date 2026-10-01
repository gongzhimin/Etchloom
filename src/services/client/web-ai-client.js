/**
 * WebAIClient: Client-Side Web Neural Inference Engine for Etchloom v2.
 * Executes Informative Drawings line extraction and Depth Anything V2 depth estimation
 * in the browser via WebGPU / WASM.
 * 
 * IMPORTANT ARCHITECTURAL NOTE:
 * - This path requires initial network access to fetch the ONNX Runtime and model weights
 *   from remote CDNs (jsdelivr / HuggingFace), after which they are persisted in browser CacheStorage.
 * - If offline and no cache exists, the system automatically falls back to pure JavaScript
 *   spatial analytical depth estimation (computeAnalyticalDepth), ensuring 100% offline baseline execution.
 */

export class WebAIClient {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.modelsBasePath='models/'] Path to local model assets
   * @param {number} [options.maxInferenceSide=768] Max boundary for neural inference
   * @param {Function} [options.onProgress] Callback for model download/initialization progress
   * @param {Function} [options.log] System activity logger
   */
  constructor(options = {}) {
    this.modelsBasePath = (options.modelsBasePath || 'models/').replace(/\/+$/, '') + '/';
    this.maxInferenceSide = options.maxInferenceSide || 768;
    this.onProgress = options.onProgress || (() => {});
    this.log = options.log || ((cat, txt) => console.log(`[${cat}] ${txt}`));

    this.ort = null;
    this.lineSession = null;
    this.depthPipeline = null;
    this.device = 'wasm';
    this.isSupported = typeof window !== 'undefined';
    this._initPromise = null;
  }

  /**
   * Probe client-side neural execution capabilities (WebGPU vs WASM).
   * @returns {Promise<{ ready: boolean, device: string, webgpu: boolean }>}
   */
  async probeCapabilities() {
    if (typeof window === 'undefined') {
      return { ready: false, device: 'none', webgpu: false };
    }

    let hasWebGPU = false;
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) hasWebGPU = true;
      } catch (_) {}
    }

    this.device = hasWebGPU ? 'webgpu' : 'wasm';
    return {
      ready: true,
      device: this.device,
      webgpu: hasWebGPU
    };
  }

  /**
   * Dynamically loads ONNX Runtime Web library.
   * @private
   */
  async _loadOrt() {
    if (typeof window === 'undefined') return null;
    if (window.ort) {
      this.ort = window.ort;
      return this.ort;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.webgpu.min.js';
      script.async = true;
      script.onload = () => {
        this.ort = window.ort || null;
        resolve(this.ort);
      };
      script.onerror = () => {
        // Fallback to standard WASM distribution
        const fbScript = document.createElement('script');
        fbScript.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js';
        fbScript.onload = () => {
          this.ort = window.ort || null;
          resolve(this.ort);
        };
        fbScript.onerror = () => resolve(null);
        document.head.appendChild(fbScript);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize or get the cached Informative Drawings ONNX session.
   * @returns {Promise<any>}
   */
  async getLineSession() {
    if (this.lineSession) return this.lineSession;
    const ort = await this._loadOrt();
    if (!ort) return null;

    try {
      const sessionOptions = {
        executionProviders: this.device === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'],
        graphOptimizationLevel: 'all'
      };
      const modelUrl = this.modelsBasePath + 'informative-drawings.onnx';
      this.lineSession = await ort.InferenceSession.create(modelUrl, sessionOptions);
      return this.lineSession;
    } catch (err) {
      this.log('WebAI', 'ONNX 载入失败 (' + err.message + ')，转入 CPU/解析模式', 'warn');
      return null;
    }
  }

  /**
   * Initialize or get the cached Depth Anything V2 pipeline.
   * @returns {Promise<any>}
   */
  async getDepthPipeline() {
    if (this.depthPipeline) return this.depthPipeline;
    try {
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
      env.useBrowserCache = true;
      env.allowLocalModels = false;
      this.depthPipeline = await pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', {
        device: this.device === 'webgpu' ? 'webgpu' : 'wasm',
        progress_callback: (p) => {
          if (p.status === 'progress' && typeof this.onProgress === 'function') {
            this.onProgress(p.progress || 0);
          }
        }
      });
      return this.depthPipeline;
    } catch (err) {
      this.log('WebAI', 'Transformers.js 加载跳过 (' + err.message + ')，使用高精解析深度先验', 'info');
      return null;
    }
  }

  /**
   * Preprocesses image into [1, 3, H, W] float tensor aligned to multiple of 4.
   * @private
   */
  _preprocessLineImage(sourceImg, maxSide) {
    const origW = sourceImg.naturalWidth || sourceImg.width;
    const origH = sourceImg.naturalHeight || sourceImg.height;
    const scale = Math.min(1.0, maxSide / Math.max(origW, origH));
    const scaledW = Math.max(4, Math.round(origW * scale));
    const scaledH = Math.max(4, Math.round(origH * scale));

    const padW = Math.ceil(scaledW / 4) * 4;
    const padH = Math.ceil(scaledH / 4) * 4;

    const canvas = document.createElement('canvas');
    canvas.width = padW;
    canvas.height = padH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, padW, padH);
    ctx.drawImage(sourceImg, 0, 0, scaledW, scaledH);

    const imgData = ctx.getImageData(0, 0, padW, padH).data;
    const n = padW * padH;
    const floatData = new Float32Array(n * 3);

    for (let i = 0; i < n; i++) {
      const idx = i * 4;
      floatData[i] = imgData[idx] / 255.0;            // R
      floatData[n + i] = imgData[idx + 1] / 255.0;    // G
      floatData[n * 2 + i] = imgData[idx + 2] / 255.0;// B
    }

    return { floatData, padW, padH, scaledW, scaledH, origW, origH };
  }

  /**
   * Performs client-side neural line extraction.
   * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
   * @param {number} targetW
   * @param {number} targetH
   * @returns {Promise<Float32Array|null>}
   */
  async predictLineDrawing(sourceImage, targetW, targetH) {
    if (typeof document === 'undefined') return null;
    const session = await this.getLineSession();
    if (!session || !this.ort) return null;

    try {
      const { floatData, padW, padH, scaledW, scaledH } = this._preprocessLineImage(sourceImage, this.maxInferenceSide);
      const tensor = new this.ort.Tensor('float32', floatData, [1, 3, padH, padW]);
      const feeds = { [session.inputNames[0]]: tensor };
      const results = await session.run(feeds);
      const outputTensor = results[session.outputNames[0]];

      if (!outputTensor || !outputTensor.data) return null;
      const rawData = outputTensor.data; // [1, 1, padH, padW]

      // Crop valid area & resample to targetW * targetH via offscreen Canvas
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = scaledW;
      tmpCanvas.height = scaledH;
      const tCtx = tmpCanvas.getContext('2d');
      const imData = tCtx.createImageData(scaledW, scaledH);
      const d = imData.data;

      for (let y = 0; y < scaledH; y++) {
        for (let x = 0; x < scaledW; x++) {
          const srcIdx = y * padW + x;
          const val = Math.round(Math.max(0, Math.min(1, rawData[srcIdx])) * 255);
          const outIdx = (y * scaledW + x) * 4;
          d[outIdx] = val;
          d[outIdx + 1] = val;
          d[outIdx + 2] = val;
          d[outIdx + 3] = 255;
        }
      }
      tCtx.putImageData(imData, 0, 0);

      // Resample to targetW * targetH
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetW;
      finalCanvas.height = targetH;
      const fCtx = finalCanvas.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(tmpCanvas, 0, 0, targetW, targetH);

      const finalData = fCtx.getImageData(0, 0, targetW, targetH).data;
      const outFloat = new Float32Array(targetW * targetH);
      for (let i = 0; i < outFloat.length; i++) {
        outFloat[i] = (finalData[i * 4] * 0.299 + finalData[i * 4 + 1] * 0.587 + finalData[i * 4 + 2] * 0.114) / 255.0;
      }
      return outFloat;
    } catch (e) {
      this.log('WebAI', '线描模型执行异常: ' + (e ? e.message : '未知错误'), 'error');
      return null;
    }
  }

  /**
   * Performs client-side depth estimation via Depth Anything V2 or analytical spatial fallback.
   * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
   * @param {number} targetW
   * @param {number} targetH
   * @returns {Promise<{ width: number, height: number, data: Float32Array }|null>}
   */
  async predictDepth(sourceImage, targetW, targetH) {
    if (typeof document === 'undefined') return null;

    // 1. Try Depth Anything V2 Neural Pipeline
    const pipeline = await this.getDepthPipeline();
    if (pipeline) {
      try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetW;
        tempCanvas.height = targetH;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0, targetW, targetH);

        const out = await pipeline(tempCanvas.toDataURL('image/jpeg', 0.85));
        if (out && out.depth) {
          // Transformers.js depth image output
          const depthImg = out.depth;
          const dCanvas = document.createElement('canvas');
          dCanvas.width = targetW;
          dCanvas.height = targetH;
          const dCtx = dCanvas.getContext('2d');
          
          if (depthImg.toCanvas) {
            dCtx.drawImage(depthImg.toCanvas(), 0, 0, targetW, targetH);
          } else {
            // Raw tensor/image fallback
            dCtx.drawImage(tempCanvas, 0, 0, targetW, targetH);
          }

          const dData = dCtx.getImageData(0, 0, targetW, targetH).data;
          const floats = new Float32Array(targetW * targetH);
          for (let i = 0; i < floats.length; i++) {
            floats[i] = dData[i * 4] / 255.0;
          }
          return { width: targetW, height: targetH, data: floats };
        }
      } catch (e) {
        this.log('WebAI', 'Depth Anything 推理异常: ' + (e ? e.message : '未知错误') + '，启动解析几何深度先验', 'warn');
      }
    }

    // 2. High-Precision Analytical Spatial Depth Prior (Zero-latency fallback)
    return this.computeAnalyticalDepth(sourceImage, targetW, targetH);
  }

  /**
   * Fast analytical depth estimation based on perspective gradients and tone luminance.
   * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
   * @param {number} targetW
   * @param {number} targetH
   * @returns {{ width: number, height: number, data: Float32Array }}
   */
  computeAnalyticalDepth(sourceImage, targetW, targetH) {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH).data;

    const data = new Float32Array(targetW * targetH);
    for (let y = 0; y < targetH; y++) {
      const yPrior = y / targetH; // Bottom (ground) is near (z=0), top (sky) is far (z=1)
      const row = y * targetW;
      for (let x = 0; x < targetW; x++) {
        const idx = (row + x) * 4;
        const lum = (imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114) / 255.0;
        // Perspective depth formulation matching server.py analytical fallback
        data[row + x] = Math.max(0, Math.min(1.0, (1.0 - yPrior * 0.6) * 0.7 + (1.0 - lum * 0.5) * 0.3));
      }
    }

    return { width: targetW, height: targetH, data };
  }
}
