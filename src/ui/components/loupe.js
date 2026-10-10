(function(root) {
  'use strict';

/**
 * MasterSpatialGrid (5.2 粗粒度空间网格索引与视锥裁剪)
 * Partitions master vector paths into uniform cells (default 64x64) for sub-millisecond frustum queries.
 */
class MasterSpatialGrid {
  /**
   * @param {number} width Coordinate space width
   * @param {number} height Coordinate space height
   * @param {number} [cellSize=64] Grid cell width and height in pixels
   */
  constructor(width, height, cellSize = 64) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
    this.buckets = new Array(this.cols * this.rows);
    this.indexedCount = 0;
  }

  /**
   * Computes Axis-Aligned Bounding Box for a single path.
   * @param {Array<[number, number]>} points
   * @returns {[number, number, number, number]} [minX, minY, maxX, maxY]
   */
  static computeAABB(points) {
    if (!points || points.length === 0) return [0, 0, 0, 0];
    let minX = points[0][0], maxX = points[0][0];
    let minY = points[0][1], maxY = points[0][1];
    for (let i = 1; i < points.length; i++) {
      const x = points[i][0];
      const y = points[i][1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return [minX, minY, maxX, maxY];
  }

  /**
   * Indexes an array of vector paths into the spatial grid.
   * @param {Array<{ points: [number, number][], width?: number }>} paths
   */
  indexPaths(paths) {
    if (!Array.isArray(paths)) return;
    this.buckets = new Array(this.cols * this.rows);
    this.indexedCount = paths.length;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const pts = path.points || path;
      if (!pts || pts.length === 0) continue;
      const [minX, minY, maxX, maxY] = MasterSpatialGrid.computeAABB(pts);

      const c0 = Math.max(0, Math.min(this.cols - 1, Math.floor(minX / this.cellSize)));
      const c1 = Math.max(0, Math.min(this.cols - 1, Math.floor(maxX / this.cellSize)));
      const r0 = Math.max(0, Math.min(this.rows - 1, Math.floor(minY / this.cellSize)));
      const r1 = Math.max(0, Math.min(this.rows - 1, Math.floor(maxY / this.cellSize)));

      for (let r = r0; r <= r1; r++) {
        const rowOffset = r * this.cols;
        for (let c = c0; c <= c1; c++) {
          const idx = rowOffset + c;
          if (!this.buckets[idx]) {
            this.buckets[idx] = [];
          }
          this.buckets[idx].push(path);
        }
      }
    }
  }

  /**
   * Queries paths intersecting the given bounding box viewport.
   * @param {number} vx0 Min X
   * @param {number} vy0 Min Y
   * @param {number} vx1 Max X
   * @param {number} vy1 Max Y
   * @returns {Array<Object>} Unique candidate paths inside viewport
   */
  queryFrustum(vx0, vy0, vx1, vy1) {
    if (this.indexedCount === 0) return [];
    const c0 = Math.max(0, Math.min(this.cols - 1, Math.floor(vx0 / this.cellSize)));
    const c1 = Math.max(0, Math.min(this.cols - 1, Math.floor(vx1 / this.cellSize)));
    const r0 = Math.max(0, Math.min(this.rows - 1, Math.floor(vy0 / this.cellSize)));
    const r1 = Math.max(0, Math.min(this.rows - 1, Math.floor(vy1 / this.cellSize)));

    const seen = new Set();
    const hits = [];

    for (let r = r0; r <= r1; r++) {
      const rowOffset = r * this.cols;
      for (let c = c0; c <= c1; c++) {
        const bucket = this.buckets[rowOffset + c];
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const path = bucket[k];
          if (!seen.has(path)) {
            seen.add(path);
            hits.push(path);
          }
        }
      }
    }
    return hits;
  }
}

class LoupeMagnifier {
  /**
   * @param {HTMLCanvasElement} sourceCanvas Target canvas being inspected
   * @param {Object} [options={}]
   * @param {number} [options.diameter=160] Diameter of the loupe in pixels
   * @param {number} [options.zoom=4] Magnification factor
   * @param {Array<Object>} [options.vectorPaths=null] Optional vector paths for direct vector crisp magnification
   * @param {number} [options.srcWidth] Original coordinate space width
   * @param {number} [options.srcHeight] Original coordinate space height
   */
  constructor(sourceCanvas, options = {}) {
    this.sourceCanvas = sourceCanvas;
    this.diameter = options.diameter || 160;
    this.zoom = options.zoom || 4;
    this.active = false;
    this.cursorPos = { x: 0, y: 0 };
    this.pendingFrame = null;
    this.spatialGrid = null;
    this.srcWidth = options.srcWidth || (sourceCanvas?.width || 900);
    this.srcHeight = options.srcHeight || (sourceCanvas?.height || 660);

    if (options.vectorPaths && options.vectorPaths.length > 0) {
      this.setVectorPaths(options.vectorPaths, this.srcWidth, this.srcHeight);
    }

    if (typeof document !== 'undefined') {
      this._createLoupeElement();
      this._bindEvents();
    }
  }

  setVectorPaths(paths, srcWidth = null, srcHeight = null) {
    if (srcWidth) this.srcWidth = srcWidth;
    if (srcHeight) this.srcHeight = srcHeight;
    if (paths && paths.length > 0) {
      this.spatialGrid = new MasterSpatialGrid(this.srcWidth, this.srcHeight, 64);
      this.spatialGrid.indexPaths(paths);
    } else {
      this.spatialGrid = null;
    }
  }

  _createLoupeElement() {
    this.container = document.createElement('div');
    this.container.className = 'etchloom-loupe';
    this.container.style.width = `${this.diameter}px`;
    this.container.style.height = `${this.diameter}px`;

    this.loupeCanvas = document.createElement('canvas');
    this.loupeCanvas.width = this.diameter;
    this.loupeCanvas.height = this.diameter;
    this.loupeCanvas.className = 'etchloom-loupe-canvas';
    this.container.appendChild(this.loupeCanvas);

    // Crosshair overlay
    const crosshair = document.createElement('div');
    crosshair.className = 'etchloom-loupe-crosshair';
    this.container.appendChild(crosshair);

    const parent = document.body || this.sourceCanvas?.parentElement;
    if (parent) parent.appendChild(this.container);
  }

  _bindEvents() {
    if (!this.sourceCanvas) return;

    this.sourceCanvas.addEventListener('pointermove', (e) => {
      if (!this.active && !e.altKey && !this.altActive) {
        return;
      }
      this.show();
      this.cursorPos = { x: e.clientX, y: e.clientY };
      if (this.pendingFrame !== null) return;
      if (typeof requestAnimationFrame === 'function') {
        this.pendingFrame = requestAnimationFrame(() => {
          this.pendingFrame = null;
          this.updatePosition(this.cursorPos.x, this.cursorPos.y);
        });
      } else {
        this.updatePosition(this.cursorPos.x, this.cursorPos.y);
      }
    });

    this.sourceCanvas.addEventListener('pointerleave', () => {
      if (!this.active) {
        this.hide();
      }
    });

    this.sourceCanvas.addEventListener('pointerenter', (e) => {
      if (this.active || e.altKey || this.altActive) {
        this.show();
        this.updatePosition(e.clientX, e.clientY);
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.active = false;
          this.altActive = false;
          this.hide();
        }
      });
    }
  }

  show() {
    if (this.container) this.container.style.display = 'block';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  toggle(clientX, clientY) {
    this.active = !this.active;
    if (this.active) {
      this.show();
      if (this.sourceCanvas) {
        const rect = this.sourceCanvas.getBoundingClientRect();
        const x = (typeof clientX === 'number') ? clientX : (rect.left + rect.width / 2);
        const y = (typeof clientY === 'number') ? clientY : (rect.top + rect.height / 2);
        this.updatePosition(x, y);
      }
    } else {
      this.hide();
    }
    return this.active;
  }

  /**
   * Updates loupe position and renders magnified sub-region.
   */
  updatePosition(clientX, clientY) {
    if (!this.sourceCanvas || !this.container) return;

    const rect = this.sourceCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Center loupe near cursor using fixed coordinates
    this.container.style.position = 'fixed';
    this.container.style.left = `${clientX - this.diameter / 2}px`;
    this.container.style.top = `${clientY - this.diameter / 2}px`;

    // Map to canvas coordinate space
    const canvasX = (x / (rect.width || 1)) * this.sourceCanvas.width;
    const canvasY = (y / (rect.height || 1)) * this.sourceCanvas.height;

    const ctx = this.loupeCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, this.diameter, this.diameter);

    const srcW = this.diameter / this.zoom;
    const srcH = this.diameter / this.zoom;
    const srcX = canvasX - srcW / 2;
    const srcY = canvasY - srcH / 2;

    // Fast path: drawImage blit from source canvas
    try {
      ctx.drawImage(
        this.sourceCanvas,
        srcX, srcY, srcW, srcH,
        0, 0, this.diameter, this.diameter
      );
    } catch (_) {}

    // Vector crisp path with Spatial Frustum Culling
    if (this.spatialGrid && this.srcWidth && this.srcHeight) {
      const scaleCanvas = this.sourceCanvas.width / this.srcWidth;
      const vX0 = srcX / scaleCanvas;
      const vY0 = srcY / scaleCanvas;
      const vX1 = (srcX + srcW) / scaleCanvas;
      const vY1 = (srcY + srcH) / scaleCanvas;

      const culledPaths = this.spatialGrid.queryFrustum(vX0, vY0, vX1, vY1);
      if (culledPaths.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.diameter / 2, this.diameter / 2, this.diameter / 2, 0, Math.PI * 2);
        ctx.clip();

        const zoomScale = this.zoom * scaleCanvas;
        const offX = -vX0 * zoomScale;
        const offY = -vY0 * zoomScale;

        ctx.strokeStyle = '#1a1918';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < culledPaths.length; i++) {
          const path = culledPaths[i];
          const pts = path.points || path;
          if (!pts || pts.length < 2) continue;
          ctx.lineWidth = Math.max(0.6, (path.width || 0.8) * zoomScale);
          ctx.beginPath();
          ctx.moveTo(offX + pts[0][0] * zoomScale, offY + pts[0][1] * zoomScale);
          for (let j = 1; j < pts.length; j++) {
            ctx.lineTo(offX + pts[j][0] * zoomScale, offY + pts[j][1] * zoomScale);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  destroy() {
    if (this.pendingFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.pendingFrame);
      this.pendingFrame = null;
    }
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}

  const api = { LoupeMagnifier, MasterSpatialGrid };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LoupeMagnifier = LoupeMagnifier;
    root.MasterSpatialGrid = MasterSpatialGrid;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
