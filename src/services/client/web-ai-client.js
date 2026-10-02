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
    this.depthSession = null;
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
   * Initialize or get the cached local MiDaS v2.1 Small ONNX session.
   * @returns {Promise<any>}
   */
  async getDepthSession() {
    if (this.depthSession) return this.depthSession;
    const ort = await this._loadOrt();
    if (!ort) return null;

    try {
      const sessionOptions = {
        executionProviders: this.device === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'],
        graphOptimizationLevel: 'all'
      };
      const modelUrl = this.modelsBasePath + 'midas-small.onnx';
      this.depthSession = await ort.InferenceSession.create(modelUrl, sessionOptions);
      return this.depthSession;
    } catch (err) {
      this.log('WebAI', 'MiDaS 深度模型载入失败 (' + err.message + ')，启动解析几何深度先验', 'warn');
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
      const isMobile = this.device === 'wasm' || (typeof window !== 'undefined' && (window.innerWidth <= 760 || /Android|iPhone|iPad/i.test(navigator.userAgent)));
      const effMaxSide = isMobile ? Math.min(this.maxInferenceSide, 384) : this.maxInferenceSide;
      const { floatData, padW, padH, scaledW, scaledH } = this._preprocessLineImage(sourceImage, effMaxSide);
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
   * Performs client-side depth estimation via local MiDaS v2.1 Small ONNX model or analytical spatial fallback.
   * @param {HTMLImageElement|HTMLCanvasElement} sourceImage
   * @param {number} targetW
   * @param {number} targetH
   * @returns {Promise<{ width: number, height: number, data: Float32Array }|null>}
   */
  async predictDepth(sourceImage, targetW, targetH) {
    if (typeof document === 'undefined') return null;

    // 1. Try Local MiDaS v2.1 Small ONNX Session
    const session = await this.getDepthSession();
    if (session && this.ort) {
      try {
        const inW = 256;
        const inH = 256;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = inW;
        tempCanvas.height = inH;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0, inW, inH);
        const imgData = ctx.getImageData(0, 0, inW, inH).data;

        // ImageNet normalization for MiDaS: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
        const floatData = new Float32Array(3 * inW * inH);
        const planeSize = inW * inH;
        for (let i = 0; i < planeSize; i++) {
          const r = imgData[i * 4] / 255.0;
          const g = imgData[i * 4 + 1] / 255.0;
          const b = imgData[i * 4 + 2] / 255.0;
          floatData[i] = (r - 0.485) / 0.229;
          floatData[planeSize + i] = (g - 0.456) / 0.224;
          floatData[2 * planeSize + i] = (b - 0.406) / 0.225;
        }

        const tensor = new this.ort.Tensor('float32', floatData, [1, 3, inH, inW]);
        const inputName = session.inputNames[0];
        const results = await session.run({ [inputName]: tensor });
        const outputTensor = results[session.outputNames[0]];

        if (outputTensor && outputTensor.data) {
          const rawDepth = outputTensor.data; // [1, 256, 256]
          let minVal = Infinity;
          let maxVal = -Infinity;
          for (let i = 0; i < rawDepth.length; i++) {
            const v = rawDepth[i];
            if (v < minVal) minVal = v;
            if (v > maxVal) maxVal = v;
          }
          const range = (maxVal - minVal > 1e-5) ? (maxVal - minVal) : 1.0;

          // Invert disparity to depth: near=0 (foreground), far=1 (background)
          const dCanvas = document.createElement('canvas');
          dCanvas.width = inW;
          dCanvas.height = inH;
          const dCtx = dCanvas.getContext('2d');
          const dImgData = dCtx.createImageData(inW, inH);
          const d = dImgData.data;

          for (let i = 0; i < rawDepth.length; i++) {
            const dispNorm = (rawDepth[i] - minVal) / range;
            const depthNorm = Math.max(0, Math.min(1.0, 1.0 - dispNorm));
            const byteVal = Math.round(depthNorm * 255);
            const idx = i * 4;
            d[idx] = byteVal;
            d[idx + 1] = byteVal;
            d[idx + 2] = byteVal;
            d[idx + 3] = 255;
          }
          dCtx.putImageData(dImgData, 0, 0);

          // Bilinear upscale to targetW * targetH
          const resampleCanvas = document.createElement('canvas');
          resampleCanvas.width = targetW;
          resampleCanvas.height = targetH;
          const rCtx = resampleCanvas.getContext('2d');
          rCtx.imageSmoothingEnabled = true;
          rCtx.imageSmoothingQuality = 'high';
          rCtx.drawImage(dCanvas, 0, 0, targetW, targetH);

          const finalData = rCtx.getImageData(0, 0, targetW, targetH).data;
          const floats = new Float32Array(targetW * targetH);
          for (let i = 0; i < floats.length; i++) {
            floats[i] = finalData[i * 4] / 255.0;
          }
          return { width: targetW, height: targetH, data: floats };
        }
      } catch (err) {
        this.log('WebAI', 'MiDaS 推理异常: ' + (err ? err.message : '未知错误') + '，启动解析几何深度先验', 'warn');
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
