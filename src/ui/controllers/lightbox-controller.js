/**
 * Lightbox Modal Controller (M1: 图像全屏微观特写与无级缩放控制器)
 * Manages the interactive lightbox modal, wheel zoom (80%~500%),
 * mouse pointer pan/drag, double-click fit/zoom, and ESC exit.
 */
export class LightboxController {
  constructor(options = {}) {
    this.overlay = document.getElementById(options.overlayId || 'modalOverlay');
    this.canvas = document.getElementById(options.canvasId || 'modalCanvas');
    this.viewportWrap = document.getElementById(options.viewportWrapId || 'modalViewportWrap');
    this.titleEl = document.getElementById(options.titleId || 'modalTitle');
    this.descEl = document.getElementById(options.descId || 'modalDescription');
    this.closeBtn = document.getElementById(options.closeBtnId || 'modalClose');
    this.zoomBadge = document.getElementById(options.zoomBadgeId || 'lightboxZoomLevel');
    this.zoomInBtn = document.getElementById(options.zoomInBtnId || 'lightboxZoomIn');
    this.zoomOutBtn = document.getElementById(options.zoomOutBtnId || 'lightboxZoomOut');
    this.zoomResetBtn = document.getElementById(options.zoomResetBtnId || 'lightboxReset');

    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    this.bindEvents();
  }

  bindEvents() {
    if (this.zoomInBtn) {
      this.zoomInBtn.onclick = (e) => {
        e.stopPropagation();
        this.scale = Math.min(5.0, Number((this.scale * 1.25).toFixed(2)));
        this.updateTransform();
      };
    }

    if (this.zoomOutBtn) {
      this.zoomOutBtn.onclick = (e) => {
        e.stopPropagation();
        this.scale = Math.max(0.8, Number((this.scale / 1.25).toFixed(2)));
        this.updateTransform();
      };
    }

    if (this.zoomResetBtn) {
      this.zoomResetBtn.onclick = (e) => {
        e.stopPropagation();
        this.resetView();
      };
    }

    if (this.viewportWrap) {
      this.viewportWrap.onwheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.15 : 0.87;
        const newScale = Math.max(0.8, Math.min(5.0, this.scale * delta));
        this.scale = Number(newScale.toFixed(2));
        this.updateTransform();
      };

      this.viewportWrap.onpointerdown = (e) => {
        if (e.button !== 0) return;
        this.isDragging = true;
        this.startX = e.clientX - this.translateX;
        this.startY = e.clientY - this.translateY;
        this.viewportWrap.classList.add('is-dragging');
        this.viewportWrap.setPointerCapture(e.pointerId);
      };

      this.viewportWrap.onpointermove = (e) => {
        if (!this.isDragging) return;
        this.translateX = e.clientX - this.startX;
        this.translateY = e.clientY - this.startY;
        this.updateTransform();
      };

      this.viewportWrap.onpointerup = this.viewportWrap.onpointercancel = () => {
        this.isDragging = false;
        this.viewportWrap.classList.remove('is-dragging');
      };

      this.viewportWrap.ondblclick = (e) => {
        e.preventDefault();
        if (this.scale > 1.1) {
          this.resetView();
        } else {
          this.scale = 2.0;
          this.updateTransform();
        }
      };
    }

    if (this.closeBtn) {
      this.closeBtn.onclick = () => this.close();
    }

    if (this.overlay) {
      this.overlay.onclick = (e) => {
        if (e.target === this.overlay) this.close();
      };
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay && !this.overlay.hidden) {
        this.close();
      }
    });
  }

  updateTransform() {
    if (!this.canvas) return;
    this.canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    if (this.zoomBadge) {
      this.zoomBadge.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  resetView() {
    this.scale = 1.0;
    this.translateX = 0;
    this.translateY = 0;
    this.updateTransform();
  }

  /**
   * Opens the lightbox modal displaying a canvas or image source.
   * @param {string} title
   * @param {HTMLCanvasElement|HTMLImageElement} sourceCanvas
   * @param {string} [description='']
   */
  open(title, sourceCanvas, description = '') {
    if (!this.overlay || !this.canvas || !sourceCanvas) return;
    if (this.titleEl) this.titleEl.textContent = title;
    if (this.descEl) this.descEl.textContent = description;

    const sw = sourceCanvas.naturalWidth || sourceCanvas.width || 1440;
    const sh = sourceCanvas.naturalHeight || sourceCanvas.height || 1000;
    this.canvas.width = sw;
    this.canvas.height = sh;

    const wrapW = this.viewportWrap?.clientWidth || 900;
    const wrapH = this.viewportWrap?.clientHeight || 560;
    const fitScale = Math.min(wrapW / sw, wrapH / sh, 1.0);
    this.canvas.style.width = `${Math.round(sw * fitScale)}px`;
    this.canvas.style.height = `${Math.round(sh * fitScale)}px`;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, sw, sh);
      ctx.drawImage(sourceCanvas, 0, 0, sw, sh);
    }

    this.resetView();
    this.overlay.hidden = false;
  }

  close() {
    if (this.overlay) {
      this.overlay.hidden = true;
    }
  }
}
