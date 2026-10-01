/**
 * Transfer Wizard Controller (M1 & M3: 图稿上版工艺向导控制器)
 * Manages layer selection (contours, hatching, all), resolution allocation (900, 1500 2K, 3000 3K),
 * plate technique (etching vs drypoint), and authentic hairline needle rasterization.
 */
export class TransferWizardController {
  constructor(options = {}) {
    this.overlay = document.getElementById(options.overlayId || 'transferModalOverlay') || document.getElementById('transferWizardOverlay');
    this.closeBtn = document.getElementById(options.closeBtnId || 'transferModalClose') || document.getElementById('closeTransferWizardBtn');
    this.cancelBtn = document.getElementById(options.cancelBtnId || 'transferCancelBtn');
    this.confirmBtn = document.getElementById(options.confirmBtnId || 'transferConfirmBtn') || document.getElementById('confirmTransferBtn');
    this.openBtn = document.getElementById(options.openBtnId || 'transferToPlateBtn');
    this.drawerOpenBtn = document.getElementById(options.drawerOpenBtnId || 'openTransferWizardBtn') || document.getElementById('openWizardFromDrawer');

    this.onExecuteTransfer = options.onExecuteTransfer || (() => {});
    this.getMasterData = options.getMasterData || (() => ({ masterPaths: [], contours: [], hatching: [], loadedImage: null }));

    this.bindEvents();
  }

  bindEvents() {
    if (this.openBtn) {
      this.openBtn.onclick = () => {
        const { masterPaths, contours } = this.getMasterData();
        if ((!masterPaths || !masterPaths.length) && (!contours || !contours.length)) {
          alert('请先载入照片或运行管线生成母版矢量线条！');
          return;
        }
        this.open();
      };
    }

    if (this.drawerOpenBtn) {
      this.drawerOpenBtn.onclick = () => {
        const { masterPaths, contours } = this.getMasterData();
        if ((!masterPaths || !masterPaths.length) && (!contours || !contours.length)) {
          alert('请先载入照片或运行管线生成母版矢量线条！');
          return;
        }
        this.open();
      };
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

      const pressureSlider = document.getElementById('wizardNeedlePressure');
      const pressureVal = document.getElementById('wizardNeedlePressureVal');
      if (pressureSlider && pressureVal) {
        pressureSlider.oninput = () => {
          pressureVal.textContent = pressureSlider.value + '%';
        };
      }
    }

    if (this.confirmBtn) {
      this.confirmBtn.onclick = () => {
        this.confirm();
        this.close();
      };
    }
  }

  open() {
    if (!this.overlay) {
      this.overlay = document.getElementById('transferModalOverlay') || document.getElementById('transferWizardOverlay');
    }
    if (!this.overlay) return;

    const { masterPaths, contours, hatching } = this.getMasterData();
    const mLen = masterPaths?.length || 0;
    const cLen = contours?.length || 0;
    const hLen = hatching?.length || 0;

    const statsEl = document.getElementById('wizardStats');
    if (statsEl) {
      statsEl.textContent = `当前就绪矢量母版: 总计 ${mLen} 条线条 (空间轮廓 ${cLen} 条 · 曲面排线 ${hLen} 条)`;
    }
    const allEl = document.getElementById('wizardAllCount');
    if (allEl) allEl.textContent = `${mLen} 条线条`;
    const contEl = document.getElementById('wizardContoursCount');
    if (contEl) contEl.textContent = `${cLen} 条线条`;
    const hatchEl = document.getElementById('wizardHatchingCount');
    if (hatchEl) hatchEl.textContent = `${hLen} 条线条`;

    this.overlay.hidden = false;
  }

  close() {
    if (this.overlay) this.overlay.hidden = true;
  }

  confirm() {
    const selectedLayer = document.querySelector('input[name="transferLayer"]:checked')?.value || 'all';
    const selectedRes = Number(document.querySelector('input[name="transferRes"]:checked')?.value || 1500);
    const selectedTechnique = document.querySelector('input[name="transferTechnique"]:checked')?.value || 'etching';
    const pressure = Number(document.getElementById('wizardNeedlePressure')?.value || 65) / 100;

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
      needlePressure: pressure,
      loadedImage
    });
  }
}
