/**
 * Etchloom AI Service Gateway (M4: 智能模型网关)
 * Manages health checks, circuit breakers, and parallel inference
 * for Informative Drawings (line extraction) and Lotus Geometry (depth map).
 */
import { WebAIClient } from './web-ai-client.js';

export class AIServiceGateway {
  /**
   * @param {string} [baseUrl='http://127.0.0.1:7861']
   * @param {Object} [options={}]
   */
  constructor(baseUrl = 'http://127.0.0.1:7861', options = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.webClient = new WebAIClient(options.webAiOptions || {});
    this.activeBackend = 'unknown'; // 'remote-python' | 'browser-webai' | 'offline-analytical'
  }

  /**
   * Probe backend modes and neural execution environment.
   * Differentiates:
   * 1. 'remote-python': Local Python server (CUDA/PyTorch at 127.0.0.1:7861)
   * 2. 'browser-webai': In-browser neural models (loads runtime/weights via CDN, requires initial network or cache)
   * 3. 'offline-analytical': Core geometric analytical mode (zero network, 100% offline pure JS)
   * 
   * @param {number} [timeoutMs=1500]
   * @returns {Promise<{
   *   ready: boolean,
   *   mode: 'remote-python'|'browser-webai'|'offline-analytical',
   *   modeLabel: string,
   *   device: string,
   *   requiresNetwork: boolean,
   *   lotusReady?: boolean
   * }>}
   */
  async checkHealth(timeoutMs = 1500) {
    // Mode 1: Check local Python HTTP backend if running
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) {
        const data = await res.json();
        const dev = (data.device || 'CUDA').toUpperCase();
        this.activeBackend = 'remote-python';
        return {
          ready: true,
          mode: 'remote-python',
          modeLabel: `本机 Python 服务 (${dev})`,
          device: dev,
          requiresNetwork: false,
          lotusReady: !!data.lotusReady
        };
      }
    } catch (_) {}

    // Mode 2: Client-side local neural models (WebGPU or WASM)
    // Runs 100% offline via bundled Informative Drawings and MiDaS ONNX models.
    const clientCaps = await this.webClient.probeCapabilities();
    if (clientCaps.ready) {
      this.activeBackend = 'browser-webai';
      const dev = clientCaps.webgpu ? 'WebGPU' : 'WASM';
      return {
        ready: true,
        mode: 'browser-webai',
        modeLabel: `本地模型 (${dev})`,
        device: dev,
        modelReady: true,
        requiresNetwork: false,
        webgpu: clientCaps.webgpu
      };
    }

    // Mode 3: Base offline analytical mode (pure deterministic JS, zero external network)
    this.activeBackend = 'offline-analytical';
    return {
      ready: true,
      mode: 'offline-analytical',
      modeLabel: '基础离线模式 (纯几何解析)',
      device: 'CPU (纯JS)',
      requiresNetwork: false
    };
  }

  /**
   * Request neural line drawing extraction (/infer).
   * @param {Blob} imageBlob
   * @param {number} [timeoutMs=8000]
   * @returns {Promise<Blob|null>}
   */
  async requestLineDrawing(imageBlob, timeoutMs = 8000) {
    try {
      const res = await fetch(`${this.baseUrl}/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: imageBlob,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) {
        return await res.blob();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Request spatial geometry depth map (/depth).
   * @param {Blob} imageBlob
   * @param {number} [timeoutMs=8000]
   * @returns {Promise<Blob|null>}
   */
  async requestDepthMap(imageBlob, timeoutMs = 8000) {
    try {
      const res = await fetch(`${this.baseUrl}/depth`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg' },
        body: imageBlob,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) {
        return await res.blob();
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Parallel execution of line drawing and depth prediction.
   * If remote Python backend is unreachable, automatically executes via in-browser WebAIClient.
   * @param {Blob|HTMLImageElement|HTMLCanvasElement} imageSource
   * @param {number} curW Target width
   * @param {number} curH Target height
   * @returns {Promise<{ lineMap: Float32Array|null, depthMap: { width: number, height: number, data: Float32Array }|null, backend: string }>}
   */
  async requestParallelPipeline(imageSource, curW, curH) {
    let lineMap = null;
    let depthMap = null;
    let backendUsed = 'none';

    // 1. If remote service was detected, try remote HTTP first
    if (this.activeBackend.startsWith('remote')) {
      try {
        let inferBlob = imageSource;
        if (typeof imageSource === 'object' && imageSource && imageSource.toBlob) {
          inferBlob = await new Promise(res => imageSource.toBlob(res, 'image/jpeg', 0.92));
        }

        if (inferBlob instanceof Blob) {
          const [lineBlob, depthBlob] = await Promise.all([
            this.requestLineDrawing(inferBlob),
            this.requestDepthMap(inferBlob)
          ]);

          if (lineBlob && typeof Image !== 'undefined' && typeof document !== 'undefined') {
            const img = new Image();
            await new Promise((res, rej) => {
              img.onload = res;
              img.onerror = rej;
              img.src = URL.createObjectURL(lineBlob);
            });
            const c = document.createElement('canvas');
            c.width = curW;
            c.height = curH;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, curW, curH);
            const data = ctx.getImageData(0, 0, curW, curH).data;
            lineMap = new Float32Array(curW * curH);
            for (let i = 0; i < lineMap.length; i++) {
              lineMap[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255.0;
            }
          }

          if (depthBlob && typeof Image !== 'undefined' && typeof document !== 'undefined') {
            const img = new Image();
            await new Promise((res, rej) => {
              img.onload = res;
              img.onerror = rej;
              img.src = URL.createObjectURL(depthBlob);
            });
            const c = document.createElement('canvas');
            c.width = curW;
            c.height = curH;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, curW, curH);
            const data = ctx.getImageData(0, 0, curW, curH).data;
            const floats = new Float32Array(curW * curH);
            for (let i = 0; i < floats.length; i++) {
              floats[i] = data[i * 4] / 255.0;
            }
            depthMap = { width: curW, height: curH, data: floats };
          }

          if (lineMap || depthMap) {
            backendUsed = this.activeBackend;
            return { lineMap, depthMap, backend: backendUsed };
          }
        }
      } catch (_) {}
    }

    // 2. Client-side WebAIClient Execution (WebGPU / WASM / MiDaS Small)
    if (this.webClient && typeof document !== 'undefined') {
      try {
        let imageElement = imageSource;
        if (imageSource instanceof Blob) {
          imageElement = new Image();
          await new Promise((res, rej) => {
            imageElement.onload = res;
            imageElement.onerror = rej;
            imageElement.src = URL.createObjectURL(imageSource);
          });
        }

        const [wLine, wDepth] = await Promise.all([
          this.webClient.predictLineDrawing(imageElement, curW, curH),
          this.webClient.predictDepth(imageElement, curW, curH)
        ]);

        lineMap = wLine;
        depthMap = wDepth;
        backendUsed = this.webClient.device;
      } catch (_) {}
    }

    return { lineMap, depthMap, backend: backendUsed };
  }
}
