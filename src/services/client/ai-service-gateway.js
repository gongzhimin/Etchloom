/**
 * Etchloom AI Service Gateway (M4: 智能模型网关)
 * Manages health checks, circuit breakers, and parallel inference
 * for Informative Drawings (line extraction) and Lotus Geometry (depth map).
 */
export class AIServiceGateway {
  /**
   * @param {string} [baseUrl='http://127.0.0.1:7861']
   */
  constructor(baseUrl = 'http://127.0.0.1:7861') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Probe service health with quick timeout.
   * @param {number} [timeoutMs=1500]
   * @returns {Promise<{ ready: boolean, device?: string, lotusReady?: boolean }>}
   */
  async checkHealth(timeoutMs = 1500) {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) {
        return await res.json();
      }
      return { ready: false };
    } catch (_) {
      return { ready: false };
    }
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
   * @param {Blob} imageBlob
   * @param {number} curW Target width
   * @param {number} curH Target height
   * @returns {Promise<{ lineMap: Float32Array|null, depthMap: { width: number, height: number, data: Float32Array }|null }>}
   */
  async requestParallelPipeline(imageBlob, curW, curH) {
    const [lineBlob, depthBlob] = await Promise.all([
      this.requestLineDrawing(imageBlob),
      this.requestDepthMap(imageBlob)
    ]);

    let lineMap = null;
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

    let depthMap = null;
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

    return { lineMap, depthMap };
  }
}
