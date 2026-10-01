/**
 * lotus-client.js - Node.js IPC client for Lotus 3D Geometry Inference
 * 
 * Provides zero-copy Float32Array loading for:
 *   - DepthMap: { width, height, data: Float32Array } (0.0 near, 1.0 far)
 *   - NormalMap: { width, height, normals: Float32Array } (nx, ny, nz unit vectors in [-1, 1])
 * 
 * Decoupled & Resilient:
 *   - Direct binary cache loading (< 2ms)
 *   - Python CLI runner (geometry_cli.py) via child_process IPC
 *   - 100% graceful fallback if Python/CUDA is absent
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function loadFloat32Bin(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  // Ensure correct byte offset and length alignment
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Float32Array.BYTES_PER_ELEMENT);
}

function loadGeometryFromDir(dirPath) {
  const metaPath = path.join(dirPath, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const w = meta.width;
    const h = meta.height;

    let depthMap = null;
    const depthBin = path.join(dirPath, meta.depth_bin || 'depth.bin');
    if (fs.existsSync(depthBin)) {
      const data = loadFloat32Bin(depthBin);
      if (data && data.length === w * h) {
        depthMap = { width: w, height: h, data };
      }
    }

    let normalMap = null;
    const normalBin = path.join(dirPath, meta.normal_bin || 'normal.bin');
    if (fs.existsSync(normalBin)) {
      const normals = loadFloat32Bin(normalBin);
      if (normals && normals.length === w * h * 3) {
        normalMap = { width: w, height: h, normals };
      }
    }

    return { depthMap, normalMap, meta };
  } catch (err) {
    console.warn('[LotusClient] Failed to load cached geometry:', err.message);
    return null;
  }
}

function estimateGeometry(imagePath, options = {}) {
  const resolvedImg = path.resolve(imagePath);
  if (!fs.existsSync(resolvedImg)) {
    return { depthMap: null, normalMap: null, error: `Image not found: ${imagePath}` };
  }

  const cliScript = path.resolve(__dirname, '../../services/lotus_geometry/geometry_cli.py');
  if (!fs.existsSync(cliScript)) {
    return { depthMap: null, normalMap: null, error: `Lotus CLI not found at: ${cliScript}` };
  }

  const pythonBin = options.pythonBin || process.env.PYTHON_BIN || 'C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe';
  const outDir = options.outputDir 
    ? path.resolve(options.outputDir)
    : path.resolve(__dirname, `../../experiments/lotus_${path.basename(imagePath, path.extname(imagePath))}`);

  // 1. Check if cached results already exist
  if (!options.forceRefresh && fs.existsSync(path.join(outDir, 'meta.json'))) {
    const cached = loadGeometryFromDir(outDir);
    if (cached && (cached.depthMap || cached.normalMap)) {
      return cached;
    }
  }

  // 2. Build CLI arguments
  const args = [
    cliScript,
    '--input', resolvedImg,
    '--output-dir', outDir,
    '--task', options.task || 'both'
  ];

  if (options.fallback) {
    args.push('--fallback');
  }
  if (options.device) {
    args.push('--device', options.device);
  }
  if (options.processingRes) {
    args.push('--processing-res', String(options.processingRes));
  }

  try {
    const stdout = execFileSync(pythonBin, args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: options.timeout || 120000
    });

    const result = loadGeometryFromDir(outDir);
    if (result) return result;

    return { depthMap: null, normalMap: null, rawOutput: stdout };
  } catch (err) {
    console.warn('[LotusClient] Inference error, falling back gracefully:', err.message);
    return { depthMap: null, normalMap: null, error: err.message };
  }
}

module.exports = {
  loadFloat32Bin,
  loadGeometryFromDir,
  estimateGeometry
};
