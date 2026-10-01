/**
 * Transfer Wizard Controller (M1 & M3: 图稿上版工艺向导控制器)
 * Manages layer selection (contours, hatching, all), resolution allocation (900, 1500 2K, 3000 3K),
 * plate technique (etching vs drypoint), and authentic hairline needle rasterization.
 */
export class TransferWizardController {
  constructor(options = {}) {
    this.overlay = document.getElementById(options.overlayId || 'transferModalOverlay');
    this.closeBtn = document.getElementById(options.closeBtnId || 'transferModalClose');
    this.cancelBtn = document.getElementById(options.cancelBtnId || 'transferCancelBtn');
    this.confirmBtn = document.getElementById(options.confirmBtnId || 'transferConfirmBtn');
    this.openBtn = document.getElementById(options.openBtnId || 'transferToPlateBtn');
    this.drawerOpenBtn = document.getElementById(options.drawerOpenBtnId || 'openWizardFromDrawer');

    this.onExecuteTransfer = options.onExecuteTransfer || (() => {});
    this.getMasterData = options.getMasterData || (() => ({ masterPaths: [], contours: [], hatching: [], loadedImage: null }));

    this.bindEvents();
  }

  bindEvents() {
    if (this.openBtn) {
      this.openBtn.onclick = () => {
        const { masterPaths, contours } = this.getMasterData();
        if ((!masterPaths || !masterPaths.length) && (!contours || !contours.length)) {
          alert('请先载入照片生成母版矢量线条！');
          return;
        }
        this.open();
      };
    }

    if (this.drawerOpenBtn) {
      this.drawerOpenBtn.onclick = () => this.open();
    }

    if (this.closeBtn) this.closeBtn.onclick = () => this.close();
    if (this.cancelBtn) this.cancelBtn.onclick = () => this.close();

    if (this.overlay) {
      this.overlay.onclick = (e) => {
        if (e.target === this.overlay) this.close();
      };
    }

    // Radio card active styling
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.transfer-wizard-modal input[type="radio"]').forEach(radio => {
        radio.onchange = () => {
          const name = radio.name;
          document.querySelectorAll(`.transfer-wizard-modal input[name="${name}"]`).forEach(r => {
            const card = r.closest('.wizard-card');
            if (card) card.classList.toggle('active', r.checked);
          });
        };
      });
    }

    if (this.confirmBtn) {
      this.confirmBtn.onclick = () => {
        this.confirm();
        this.close();
      };
    }
  }

  open() {
    if (this.overlay) this.overlay.hidden = false;
  }

  close() {
    if (this.overlay) this.overlay.hidden = true;
  }

  confirm() {
    const selectedLayer = document.querySelector('input[name="transferLayer"]:checked')?.value || 'all';
    const selectedRes = Number(document.querySelector('input[name="transferRes"]:checked')?.value || 1500);
    const selectedTechnique = document.querySelector('input[name="transferTechnique"]:checked')?.value || 'etching';

    const { masterPaths, contours, hatching, loadedImage } = this.getMasterData();

    let pathsToCarve = [];
    let layerLabel = '';
    if (selectedLayer === 'contours' && contours && contours.length) {
      pathsToCarve = contours;
      layerLabel = `空间轮廓 (${contours.length} 条)`;
    } else if (selectedLayer === 'hatching' && hatching && hatching.length) {
      pathsToCarve = hatching;
      layerLabel = `曲面排线 (${hatching.length} 条)`;
    } else {
      pathsToCarve = (masterPaths && masterPaths.length) ? masterPaths : (contours || []);
      layerLabel = `全部母版 (${pathsToCarve.length} 条)`;
    }

    if (!pathsToCarve.length) {
      alert('当前选择的图层尚无矢量线条可上版。请先载入图片或等待计算完成。');
      return;
    }

    this.onExecuteTransfer({
      pathsToCarve,
      layerLabel,
      selectedRes,
      selectedTechnique,
      loadedImage
    });
  }
}
