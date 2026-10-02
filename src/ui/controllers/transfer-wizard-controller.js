/**
 * Transfer Wizard Controller (M1 & M3: 图稿上版工艺向导控制器)
 * Manages layer selection (contours, hatching, all), resolution allocation (900, 1500 2K, 3000 3K),
 * plate technique (etching vs drypoint), and authentic hairline needle rasterization.
 */
export function transferStrokeWidth(pathWidth, imageScale, plateWidth, lineWidthScale = 1) {
  const baseNeedleWidth = Math.max(0.6, (plateWidth / 1500) * 0.9);
  const pathPixels = (pathWidth || 1) * imageScale * 0.75;
  return Math.max(0.5, Math.min(baseNeedleWidth * 2, pathPixels)) * lineWidthScale;
}

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

    this.onWarning = options.onWarning || null;
    this.bindEvents();
  }

  notifyWarning(msg) {
    if (typeof this.onWarning === 'function') {
      this.onWarning(msg);
      return;
    }
    const fn = (typeof window !== 'undefined' && window.logMessage) || (typeof globalThis !== 'undefined' && globalThis.logMessage);
    const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
    const cat = i18n ? i18n.t('console.wizard') : '向导';
    if (typeof fn === 'function') {
      fn(cat, msg, 'warn');
      return;
    }
    if (typeof alert === 'function') {
      alert(msg);
    } else {
      console.warn(msg);
    }
  }

  bindEvents() {
    const getWarnMsg = () => {
      const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
      return i18n ? i18n.t('wizard.warnGenerateFirst') : '请先载入照片或运行管线生成母版矢量线条！';
    };

    if (this.openBtn) {
      this.openBtn.onclick = () => {
        const { masterPaths, contours } = this.getMasterData();
        if ((!masterPaths || !masterPaths.length) && (!contours || !contours.length)) {
          this.notifyWarning(getWarnMsg());
          return;
        }
        this.open();
      };
    }

    if (this.drawerOpenBtn) {
      this.drawerOpenBtn.onclick = () => {
        const { masterPaths, contours } = this.getMasterData();
        if ((!masterPaths || !masterPaths.length) && (!contours || !contours.length)) {
          this.notifyWarning(getWarnMsg());
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
      const lineWidthSlider = document.getElementById('wizardLineWidth');
      const lineWidthVal = document.getElementById('wizardLineWidthVal');
      if (lineWidthSlider && lineWidthVal) {
        lineWidthSlider.oninput = () => {
          lineWidthVal.textContent = `${lineWidthSlider.value}%`;
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

    const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
    const strokesUnit = i18n ? i18n.t('telemetry.strokesUnit') : '条';
    const cTitle = i18n ? i18n.t('wizard.layerContours') : '空间轮廓';
    const hTitle = i18n ? i18n.t('wizard.layerHatching') : '曲面排线';

    const statsEl = document.getElementById('wizardStats');
    if (statsEl) {
      const loc = i18n?.getLocale() || 'zh-CN';
      if (loc === 'en-US') {
        statsEl.textContent = `Current Ready Master: ${mLen} lines (${cTitle}: ${cLen} · ${hTitle}: ${hLen})`;
      } else if (loc === 'vi-VN') {
        statsEl.textContent = `Bản mẫu sẵn sàng: Tổng ${mLen} nét (${cTitle}: ${cLen} · ${hTitle}: ${hLen})`;
      } else {
        statsEl.textContent = `当前就绪矢量母版: 总计 ${mLen} 条线条 (${cTitle} ${cLen} 条 · ${hTitle} ${hLen} 条)`;
      }
    }
    const allEl = document.getElementById('wizardAllCount');
    if (allEl) allEl.textContent = `${mLen} ${strokesUnit}`;
    const contEl = document.getElementById('wizardContoursCount');
    if (contEl) contEl.textContent = `${cLen} ${strokesUnit}`;
    const hatchEl = document.getElementById('wizardHatchingCount');
    if (hatchEl) hatchEl.textContent = `${hLen} ${strokesUnit}`;

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
    const lineWidthScale = Number(document.getElementById('wizardLineWidth')?.value || 100) / 100;

    const { masterPaths, contours, hatching, loadedImage } = this.getMasterData();

    const i18n = (typeof window !== 'undefined' && window.i18nManager) || (typeof globalThis !== 'undefined' && globalThis.i18nManager) || null;
    const strokesUnit = i18n ? i18n.t('telemetry.strokesUnit') : '条';

    let pathsToCarve = [];
    let layerLabel = '';
    if (selectedLayer === 'contours' && contours && contours.length) {
      pathsToCarve = contours;
      const cTitle = i18n ? i18n.t('wizard.layerContours') : '空间轮廓';
      layerLabel = `${cTitle} (${contours.length} ${strokesUnit})`;
    } else if (selectedLayer === 'hatching' && hatching && hatching.length) {
      pathsToCarve = hatching;
      const hTitle = i18n ? i18n.t('wizard.layerHatching') : '曲面排线';
      layerLabel = `${hTitle} (${hatching.length} ${strokesUnit})`;
    } else {
      pathsToCarve = (masterPaths && masterPaths.length) ? masterPaths : (contours || []);
      const aTitle = i18n ? i18n.t('wizard.layerAll') : '全部母版';
      layerLabel = `${aTitle} (${pathsToCarve.length} ${strokesUnit})`;
    }

    if (!pathsToCarve.length) {
      const alertMsg = i18n ? i18n.t('wizard.alertNoLines') : '当前选择的图层尚无矢量线条可上版。请先载入图片或等待计算完成。';
      if (typeof alert === 'function') {
        alert(alertMsg);
      } else {
        console.warn(alertMsg);
      }
      return;
    }

    this.onExecuteTransfer({
      pathsToCarve,
      layerLabel,
      selectedRes,
      selectedTechnique,
      needlePressure: pressure,
      lineWidthScale,
      loadedImage
    });
  }
}
