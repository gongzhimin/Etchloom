/* Stage 1: Informative Line Extraction Adapter.
 * Outputs a normalized lineMap: 0.0 (pure dark ink) to 1.0 (pure white paper).
 * Supports automatic connection to local Informative Drawings service (http://127.0.0.1:7861),
 * external manual injection, or high-accuracy procedural sketch fallback.
 */
(function(root){
  'use strict';

  const DEFAULT_ENDPOINT = 'http://127.0.0.1:7861';

  async function checkService(endpoint = DEFAULT_ENDPOINT) {
    if (typeof fetch === 'undefined') return { ready: false, reason: 'no-fetch' };
    try {
      const resp = await fetch(endpoint + '/health', { cache: 'no-store' });
      if (!resp.ok) return { ready: false };
      const data = await resp.json();
      return { ready: true, device: data.device, maxSide: data.maxSide };
    } catch (_) {
      return { ready: false };
    }
  }

  async function requestInference(blobOrFile, endpoint = DEFAULT_ENDPOINT, timeoutMs = 4000) {
    if (typeof fetch === 'undefined') throw new Error('Fetch API not available in current context');
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller && timeoutMs > 0 ? setTimeout(() => {
      try { controller.abort(new Error('Inference request timed out')); } catch (_) { controller.abort(); }
    }, timeoutMs) : null;
    try {
      const resp = await fetch(endpoint + '/infer', {
        method: 'POST',
        headers: { 'Content-Type': blobOrFile.type || 'application/octet-stream' },
        body: blobOrFile,
        signal: controller ? controller.signal : null
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error('Inference service error: ' + (errText || resp.statusText));
      }
      return await resp.blob();
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  function normalizeExternalLine(imageData, targetWidth, targetHeight) {
    const { width: sw, height: sh, data } = imageData;
    const out = new Float32Array(targetWidth * targetHeight);
    for (let ty = 0; ty < targetHeight; ty++) {
      const sy = Math.min(sh - 1, Math.floor(ty * sh / targetHeight));
      const rowOffset = ty * targetWidth;
      const srcRowOffset = sy * sw;
      for (let tx = 0; tx < targetWidth; tx++) {
        const sx = Math.min(sw - 1, Math.floor(tx * sw / targetWidth));
        const idx = (srcRowOffset + sx) * 4;
        const lum = (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255;
        out[rowOffset + tx] = Math.max(0, Math.min(1, lum));
      }
    }
    return out;
  }

  // High-accuracy procedural sketch fallback when no neural model/weights are loaded
  function proceduralSketch(pixels, width, height) {
    const n = width * height;
    const out = new Float32Array(n);
    out.fill(1.0);

    const gx = new Float32Array(n), gy = new Float32Array(n);
    for (let y = 1; y < height - 1; y++) {
      const yw = y * width;
      for (let x = 1; x < width - 1; x++) {
        const i = yw + x;
        const dx = (pixels[i + 1] - pixels[i - 1]) * 0.5;
        const dy = (pixels[i + width] - pixels[i - width]) * 0.5;
        gx[i] = dx;
        gy[i] = dy;
      }
    }

    for (let i = 0; i < n; i++) {
      const mag = Math.hypot(gx[i], gy[i]) / 255;
      const val = 1.0 - Math.min(1.0, Math.pow(mag * 2.2, 1.2));
      out[i] = val;
    }
    return out;
  }

  // Fast binary PPM format utilities for zero-overhead IPC
  function writePPM(filePath, width, height, pixels) {
    const fs = require('fs');
    const header = Buffer.from(`P5\n${width} ${height}\n255\n`);
    const data = Buffer.from(pixels);
    fs.writeFileSync(filePath, Buffer.concat([header, data]));
  }

  function readPPM(filePath) {
    const fs = require('fs');
    const buf = fs.readFileSync(filePath);
    let pos = 0;
    function readToken() {
      while (pos < buf.length && (buf[pos] === 32 || buf[pos] === 10 || buf[pos] === 13 || buf[pos] === 9)) pos++;
      if (pos >= buf.length) return null;
      if (buf[pos] === 35) {
        while (pos < buf.length && buf[pos] !== 10 && buf[pos] !== 13) pos++;
        return readToken();
      }
      const start = pos;
      while (pos < buf.length && buf[pos] !== 32 && buf[pos] !== 10 && buf[pos] !== 13 && buf[pos] !== 9) pos++;
      return buf.toString('ascii', start, pos);
    }
    const magic = readToken();
    if (magic !== 'P5') throw new Error('Invalid PPM format');
    const w = parseInt(readToken(), 10);
    const h = parseInt(readToken(), 10);
    const maxVal = parseInt(readToken(), 10);
    pos++; // skip trailing newline/space
    const raw = buf.subarray(pos, pos + w * h);
    const data = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      data[i] = raw[i] / 255.0;
    }
    return { width: w, height: h, data };
  }

  // Direct Node.js PyTorch IPC runner (zero HTTP daemon required)
  function runLocalPythonInference(sourceImage, options = {}) {
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) return null;
    try {
      const path = require('path');
      const fs = require('fs');
      const { execFileSync } = require('child_process');

      const os = require('os');
      const pythonBin = options.pythonBin || process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
      const cliScript = path.resolve(__dirname, '../../services/informative_drawings/infer_cli.py');
      const weightsPath = path.resolve(__dirname, '../../services/informative_drawings/weights/model.pth');

      if (!fs.existsSync(cliScript) || !fs.existsSync(weightsPath)) return null;

      const tmpDir = path.join(os.tmpdir(), 'molandi_pipeline');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const randSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const tmpIn = path.join(tmpDir, `tmp_inf_in_${randSuffix}.ppm`);
      const tmpOut = path.join(tmpDir, `tmp_inf_out_${randSuffix}.ppm`);

      try {
        writePPM(tmpIn, sourceImage.width, sourceImage.height, sourceImage.pixels);
        execFileSync(pythonBin, [cliScript, tmpIn, tmpOut], {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 20000
        });

        if (fs.existsSync(tmpOut)) {
          const result = readPPM(tmpOut);
          return { width: result.width, height: result.height, data: result.data, source: 'informative-torch' };
        }
      } finally {
        if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      }
    } catch (err) {
      if (options.throwOnError) throw err;
      console.warn('[Stage1] Direct Informative Drawings IPC failed:', err.message);
    }
    return null;
  }

  async function runStage1(sourceImage, options = {}) {
    const w = options.targetWidth || sourceImage.width;
    const h = options.targetHeight || sourceImage.height;

    // 1. Check if external line drawing is supplied
    if (options.externalLineData) {
      const data = normalizeExternalLine(options.externalLineData, w, h);
      return { width: w, height: h, data, source: 'external-informative' };
    }

    // 2. Pre-computed line data attached to image object
    if (sourceImage.lineMap && sourceImage.lineMap.length === w * h) {
      return { width: w, height: h, data: sourceImage.lineMap, source: 'cached-line' };
    }

    // 3. Direct local PyTorch inference in Node.js
    const localPyResult = runLocalPythonInference(sourceImage, options);
    if (localPyResult) {
      return localPyResult;
    }

    // 4. Fallback procedural sketch (only if explicitly allowed or in browser without backend)
    const data = proceduralSketch(sourceImage.pixels, w, h);
    return { width: w, height: h, data, source: 'procedural-sketch' };
  }

  const api = { runStage1, normalizeExternalLine, checkService, requestInference, runLocalPythonInference, DEFAULT_ENDPOINT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stage1Informative = api;
})(globalThis);
