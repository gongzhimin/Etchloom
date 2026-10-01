(function(root) {
  'use strict';

/**
 * Loupe Magnifier Tool (3.1 局部像素放大镜)
 * Circular floating magnifier for inspecting micro-engraving strokes,
 * drypoint burrs, paper fibers, and plate bevel debossing.
 */
class LoupeMagnifier {
  /**
   * @param {HTMLCanvasElement} sourceCanvas Target canvas being inspected
   * @param {Object} [options={}]
   * @param {number} [options.diameter=160] Diameter of the loupe in pixels
   * @param {number} [options.zoom=4] Magnification factor
   */
  constructor(sourceCanvas, options = {}) {
    this.sourceCanvas = sourceCanvas;
    this.diameter = options.diameter || 160;
    this.zoom = options.zoom || 4;
    this.active = false;
    this.cursorPos = { x: 0, y: 0 };

    if (typeof document !== 'undefined') {
      this._createLoupeElement();
      this._bindEvents();
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
      this.updatePosition(e.clientX, e.clientY);
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

    try {
      ctx.drawImage(
        this.sourceCanvas,
        srcX, srcY, srcW, srcH,
        0, 0, this.diameter, this.diameter
      );
    } catch (_) {}
  }

  destroy() {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}

  const api = { LoupeMagnifier };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LoupeMagnifier = LoupeMagnifier;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
