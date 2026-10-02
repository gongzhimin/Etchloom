/**
 * Etchloom - Digital Intaglio & Virtual Copperplate Studio
 * Main Native ES Module Entry Point (src/main.js)
 */

import { LightboxController } from './ui/controllers/lightbox-controller.js';
import { TransferWizardController, transferStrokeWidth } from './ui/controllers/transfer-wizard-controller.js';
import { PipelineController } from './ui/controllers/pipeline-controller.js';
import {
  W, H, N, depth, exposed, blocked, burr,
  allocatePlate, snapshot, stop, resetEtchProgress, setView, line, render,
  setPlateStage, bindPlateStudioEvents, setPlateFrameStyle,
  setPlateAspectRatio, setMirrorPrint,
  hasPlateModifications, savePlateBackup, etchState
} from './ui/controllers/plate-studio-controller.js';
import { mountAppLayout } from './ui/templates/layout-templates.js';

// DOM Utilities
const $ = id => document.getElementById(id);

// 0. Mount Decoupled Layout Templates if mount root exists
if (typeof document !== 'undefined') {
  const root = $('app');
  if (root && !$('masterWorkspace')) {
    mountAppLayout(root);
  }
}

// 1. Activity Log Console Logger
export function logMessage(category, text, level = 'info') {
  const logEl = $('activityLog');
  if (!logEl) return;
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timeStr = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}]`;
  const lineEl = document.createElement('div');
  lineEl.className = `log-line${level === 'warn' ? ' log-warn' : level === 'error' ? ' log-error' : level === 'computing' ? ' log-computing' : ''}`;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = timeStr;

  const catSpan = document.createElement('span');
  catSpan.className = 'log-cat';
  catSpan.textContent = `[${category}]`;

  const textSpan = document.createElement('span');
  textSpan.className = 'log-text';
  textSpan.textContent = text;

  lineEl.appendChild(timeSpan);
  lineEl.appendChild(document.createTextNode(' '));
  lineEl.appendChild(catSpan);
  lineEl.appendChild(document.createTextNode(' '));
  lineEl.appendChild(textSpan);
  logEl.appendChild(lineEl);
  while (logEl.children.length > 200) {
    logEl.removeChild(logEl.firstChild);
  }
  logEl.scrollTop = logEl.scrollHeight;

  const badge = $('logStatusBadge');
  if (badge) {
    if (level === 'computing') {
      badge.className = 'badge badge-gold';
      badge.textContent = 'RUNNING';
    } else if (level === 'error') {
      badge.className = 'badge badge-amber';
      badge.textContent = 'ERROR';
    } else {
      badge.className = 'badge badge-green';
      badge.textContent = 'IDLE';
    }
  }
}

// 2. I18n Manager and Localization
let i18nManager = null;
const I18nLib = (typeof I18n !== 'undefined' ? I18n : (typeof window !== 'undefined' ? window.I18n : null));
if (I18nLib && I18nLib.I18nManager) {
  i18nManager = new I18nLib.I18nManager();
  if (typeof window !== 'undefined') {
    window.i18nManager = i18nManager;
  }
}

export function updateLocaleUI() {
  if (!i18nManager) return;
  i18nManager.bindDom();
  const locale = i18nManager.getLocale();
  document.documentElement.lang = locale;
  document.querySelectorAll('#languageTabs .language-tab').forEach(tab => {
    const selected = tab.dataset.locale === locale;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  const running = window.getPlateState ? window.getPlateState().running : false;
  const currentEtchState = window.getPlateState ? window.getPlateState().etchState : (running ? 1 : 0);
  const acidBtnText = running ? i18nManager.t('cta.pauseEtch') : (currentEtchState === 2 ? i18nManager.t('cta.resumeEtch') : i18nManager.t('cta.startEtch'));
  if ($('etch')) $('etch').textContent = running ? i18nManager.t('sec.3.stopAcid') : i18nManager.t('sec.3.startAcid');
  if ($('etchTopBtn')) $('etchTopBtn').textContent = running ? i18nManager.t('sec.3.stopAcid') : i18nManager.t('sec.3.startAcid');
  if ($('etchBtn')) $('etchBtn').textContent = acidBtnText;

  const badge = $('etchStateBadge');
  if (badge) {
    if (currentEtchState === 1) {
      badge.textContent = i18nManager.t('etch.state.biting');
    } else if (currentEtchState === 2) {
      badge.textContent = i18nManager.t('etch.state.paused');
    } else {
      badge.textContent = i18nManager.t('etch.state.standby');
    }
  }

  const mData = (typeof pipelineController !== 'undefined' && pipelineController && typeof pipelineController.getMasterData === 'function')
    ? pipelineController.getMasterData()
    : { masterPaths: [], contours: [] };
  const mCount = (mData?.masterPaths?.length || mData?.contours?.length || 0);
  const unit = i18nManager.t('telemetry.strokesUnit');

  const heroCount = $('masterStrokesBadge');
  if (heroCount) {
    heroCount.textContent = `${mCount.toLocaleString()} ${unit}`;
  }
  const plateMasterStats = $('plateMasterStats');
  if (plateMasterStats) {
    plateMasterStats.textContent = `${mCount.toLocaleString()} ${unit}`;
  }

  if (typeof stepGrid !== 'undefined' && stepGrid && typeof stepGrid.updateLocale === 'function') {
    stepGrid.updateLocale(i18nManager);
  }
  if (typeof pipelineController !== 'undefined' && pipelineController && typeof pipelineController.checkModelStatus === 'function') {
    pipelineController.checkModelStatus(i18nManager.getLocale());
  }

  const telStatus = $('telemetryStatus');
  if (telStatus) {
    const raw = telStatus.textContent || '';
    if (raw === 'Ready' || raw === '运行就绪' || raw === 'Sẵn sàng hoạt động') {
      telStatus.textContent = i18nManager.t('status.ready');
    }
  }
  const telCache = $('telemetryCache');
  if (telCache) {
    const hits = (telCache.textContent.match(/\d+\/\d+/) || ['0/5'])[0];
    telCache.textContent = `${hits} ${i18nManager.t('telemetry.cacheUnit')}`;
  }
  const telStrokes = $('telemetryStrokes');
  if (telStrokes) {
    const count = (telStrokes.textContent.match(/\d+/) || ['0'])[0];
    telStrokes.textContent = `${count} ${unit}`;
  }
}

// 3. Workflow Mode Switching: 'master' vs 'plate'
export function switchWorkflow(mode) {
  if (typeof document !== 'undefined' && document.body) {
    document.body.className = mode === 'plate' ? 'mode-plate' : 'mode-master';
  }
  const showGenBtn = $('showGenerator');
  const showPlateBtn = $('showPlate');
  const masterWs = $('masterWorkspace');
  const plateWs = $('plateWorkspace');

  if (mode === 'plate') {
    showPlateBtn?.classList.add('active');
    showGenBtn?.classList.remove('active');
    if (masterWs) masterWs.hidden = true;
    if (plateWs) plateWs.hidden = false;
  } else {
    showGenBtn?.classList.add('active');
    showPlateBtn?.classList.remove('active');
    if (masterWs) masterWs.hidden = false;
    if (plateWs) plateWs.hidden = true;
  }
  const workspace = typeof document !== 'undefined' ? document.querySelector('.workspace-area') : null;
  if (workspace) workspace.scrollTop = 0;
}

let currentMasterScreen = null;
function setMasterScreen(screen) {
  document.body.dataset.masterScreen = screen;
  const intro = $('masterIntro');
  const computing = $('masterComputing');
  if (intro) intro.hidden = screen !== 'intro';
  if (computing) computing.hidden = screen !== 'computing';
  document.querySelectorAll('[data-master-result]').forEach(el => {
    el.hidden = screen !== 'ready';
  });
  const plateNav = $('showPlate');
  if (plateNav) plateNav.disabled = screen !== 'ready';
  if (currentMasterScreen !== screen) {
    const workspace = document.querySelector('.workspace-area');
    if (workspace) workspace.scrollTop = 0;
  }
  currentMasterScreen = screen;
}

// 4. Initialize Controllers
const lightbox = new LightboxController();

let stepGrid = null;
const gridContainer = $('stepFlowGridContainer');
const StepFlowGridLib = (typeof StepFlowGrid !== 'undefined' ? StepFlowGrid : (typeof window !== 'undefined' ? window.StepFlowGrid : null));

if (gridContainer && StepFlowGridLib) {
  stepGrid = new StepFlowGridLib(gridContainer, {
    i18n: i18nManager,
    onStepSelect: (stepIdx) => {
      if (stepGrid) stepGrid.setActiveStep(stepIdx);
    },
    onStepLoupe: () => {},
    onStepFullscreen: (stepIdx, cardCanvas, vectorData = {}) => {
      const title = i18nManager ? i18nManager.t(`step.${stepIdx}.title`) : `Step ${stepIdx}`;
      const meta = stepGrid?.stepStates[stepIdx]?.metaEl?.textContent || '';
      lightbox.open(title, cardCanvas, meta, vectorData);
    },
    onStepExport: (stepIdx) => {
      pipelineController.downloadStepExport(stepIdx);
    }
  });
}

const pipelineController = new PipelineController({
  stepGrid,
  log: logMessage,
  onMasterReady: () => setMasterScreen('ready'),
  onRecomputeState: (active) => {
    const status = $('masterRedrawStatus');
    if (status) status.hidden = !active;
    const preview = $('masterHeroViewport');
    if (preview) preview.setAttribute('aria-busy', String(active));
  },
  getParams: () => ({
    exposure: $('exposure')?.value,
    blackPoint: $('blackPoint')?.value,
    whitePoint: $('whitePoint')?.value,
    contourDetail: $('contourDetail')?.value,
    aerialStrength: $('aerialStrength')?.value,
    needleWidth: $('needleWidth')?.value,
    density: $('density')?.value,
    curvatureGate: $('curvatureGate')?.value,
    crossHatch: $('crossHatch')?.value,
    lotus3D: $('lotus3D')?.checked,
    frameStyle: $('frameStyle')?.value
  }),
  onTelemetry: (metrics) => {
    if (metrics.status && $('telemetryStatus')) $('telemetryStatus').textContent = metrics.status;
    if (metrics.task && $('telemetryTask')) $('telemetryTask').textContent = metrics.task;
    if (metrics.duration != null && $('telemetryDuration')) $('telemetryDuration').textContent = `${metrics.duration}ms`;
    if (metrics.strokes != null && $('telemetryStrokes')) {
      const strokeCount = typeof metrics.strokes === 'number' ? metrics.strokes : String(metrics.strokes).replace(/[^0-9]/g, '');
      const unit = i18nManager ? i18nManager.t('telemetry.strokesUnit') : '条';
      $('telemetryStrokes').textContent = `${strokeCount} ${unit}`;
    }
    if (metrics.cache && $('telemetryCache')) {
      const hits = (String(metrics.cache).match(/\d+\/\d+/) || [''])[0];
      const unit = i18nManager ? i18nManager.t('telemetry.cacheUnit') : '命中';
      $('telemetryCache').textContent = hits ? `${hits} ${unit}` : metrics.cache;
    }
  },
  onModelStatus: (statusData) => {
    const badge = $('modelStatus');
    if (badge) {
      badge.textContent = statusData.label;
      badge.className = statusData.badgeClass;
    }
  },
  onAspectRatioChange: (origW, origH) => {
    setPlateAspectRatio(origW, origH);
    const targetH = Math.max(1, Math.round(W * origH / origW));
    allocatePlate(W, targetH);
    if (origW && origH) {
      const aspectStr = `${origW} / ${origH}`;
      const heroCanvas = $('masterHeroCanvas');
      const heroViewport = $('masterHeroViewport');
      if (heroCanvas) heroCanvas.style.aspectRatio = aspectStr;
      if (heroViewport) heroViewport.style.setProperty('--source-aspect-ratio', aspectStr);
    }
  }
});

export function executeTransfer({ pathsToCarve, selectedRes = 1500, selectedTechnique = 'etching', needlePressure = 0.65, lineWidthScale = 1, layerLabel = '' }) {
  stop();
  snapshot();

  const srcW = pipelineController.currentLoadedImage?.width || 900;
  const srcH = pipelineController.currentLoadedImage?.height || 660;
  const targetH = Math.max(1, Math.round(selectedRes * srcH / srcW));

  if (W !== selectedRes || H !== targetH) {
    allocatePlate(selectedRes, targetH);
  }

  depth.fill(0);
  exposed.fill(0);
  blocked.fill(0);
  burr.fill(0);
  resetEtchProgress();

  const mask = document.createElement('canvas');
  mask.width = W;
  mask.height = H;
  const mctx = mask.getContext('2d');
  mctx.clearRect(0, 0, W, H);

  // Leave plate margin so engraving lines are strictly INSIDE the frame rules!
  const frameMargin = Math.round(54 * W / 900);
  const artW = W - 2 * frameMargin;
  const artH = H - 2 * frameMargin;
  const scale = Math.min(artW / srcW, artH / srcH);
  const offX = frameMargin + Math.round((artW - srcW * scale) / 2);
  const offY = frameMargin + Math.round((artH - srcH * scale) / 2);

  mctx.strokeStyle = '#000000';
  mctx.lineCap = 'round';
  mctx.lineJoin = 'round';

  for (const path of pathsToCarve) {
    const pts = path.points;
    if (!pts || pts.length < 2) continue;

    mctx.lineWidth = transferStrokeWidth(path.width, scale, W, lineWidthScale);

    mctx.beginPath();
    mctx.moveTo(offX + pts[0][0] * scale, offY + pts[0][1] * scale);
    for (let k = 1; k < pts.length; k++) {
      mctx.lineTo(offX + pts[k][0] * scale, offY + pts[k][1] * scale);
    }
    mctx.stroke();
  }

  const imgData = mctx.getImageData(0, 0, W, H).data;
  const isDrypoint = selectedTechnique === 'drypoint';
  const pressFactor = needlePressure || 0.65;

  for (let i = 0; i < N; i++) {
    const alpha = imgData[i * 4 + 3];
    if (alpha > 0) {
      const val = (alpha / 255) * (pressFactor / 0.65);
      exposed[i] = Math.max(exposed[i], Math.min(1.0, val));
      blocked[i] = 0;
      if (isDrypoint) {
        depth[i] = Math.min(1, depth[i] + val * 0.32);
        burr[i] = Math.min(1, burr[i] + val * 0.42);
      } else {
        burr[i] = 0;
      }
    }
  }

  setPlateStage(2);
  setView('plate');
  switchWorkflow('plate');

  const techLabel = selectedTechnique === 'drypoint'
    ? (i18nManager ? i18nManager.t('wizard.drypointTitle') : '干刻直刻 (Drypoint)')
    : (i18nManager ? i18nManager.t('wizard.etchingTitle') : '蚀刻针划线 (Etching)');
  const transferTitle = i18nManager ? i18nManager.t('stepper.transfer') : '上版';
  const strokesUnit = i18nManager ? i18nManager.t('telemetry.strokesUnit') : '条';
  const statusText = `${transferTitle}: ${pathsToCarve.length} ${strokesUnit} (${techLabel}, ${W} × ${H})`;
  if ($('status')) $('status').textContent = statusText;
  const logCat = i18nManager ? i18nManager.t('console.plate') : '铜版';
  logMessage(logCat, `【${transferTitle}】${techLabel} | ${W} × ${H} | ${layerLabel}`, 'done');
}

const transferWizard = new TransferWizardController({
  openBtnId: 'openTransferWizardBtn',
  getMasterData: () => pipelineController.getMasterData(),
  onWarning: (msg) => logMessage(i18nManager ? i18nManager.t('console.wizard') : '向导', msg, 'warn'),
  onExecuteTransfer: executeTransfer
});

// 5. Global Topbar & Drawer Event Bindings
function initEventBindings() {
  const showGenBtn = $('showGenerator');
  const showPlateBtn = $('showPlate');
  if (showGenBtn) showGenBtn.onclick = () => switchWorkflow('master');
  if (showPlateBtn) showPlateBtn.onclick = () => switchWorkflow('plate');

  const languageTabs = Array.from(document.querySelectorAll('#languageTabs .language-tab'));
  for (const tab of languageTabs) {
    tab.onclick = () => {
      i18nManager.setLocale(tab.dataset.locale);
      updateLocaleUI();
    };
    tab.onkeydown = event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = languageTabs.indexOf(tab);
      const targetIndex = event.key === 'Home' ? 0
        : event.key === 'End' ? languageTabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + languageTabs.length) % languageTabs.length;
      languageTabs[targetIndex].click();
      languageTabs[targetIndex].focus();
    };
  }

  const clearLogBtn = $('clearLogBtn');
  if (clearLogBtn) {
    clearLogBtn.onclick = () => {
      const logEl = $('activityLog');
      if (logEl) logEl.innerHTML = '';
      logMessage(i18nManager ? i18nManager.t('console.sys') : '系统', i18nManager ? i18nManager.t('console.cleared') : '日志已清空。');
    };
  }

  const activityLogWrap = document.querySelector('.activity-log-wrap');
  const activityLogHeader = document.querySelector('.activity-log-header');
  const logToggleBtn = $('activityLogToggle');

  const toggleLogDrawer = () => {
    if (!activityLogWrap) return;
    const isCollapsed = activityLogWrap.classList.toggle('collapsed');
    const indicator = $('logToggleIndicator');
    if (indicator) indicator.textContent = isCollapsed ? '▲' : '▼';
  };

  if (activityLogHeader && activityLogWrap) {
    activityLogHeader.onclick = (e) => {
      if (e.target && (e.target.id === 'clearLogBtn' || e.target.closest('#clearLogBtn'))) return;
      toggleLogDrawer();
    };
  }
  if (logToggleBtn) {
    logToggleBtn.onclick = () => toggleLogDrawer();
  }

  const uploadBtn = $('uploadPhoto');
  const photoFileInput = $('photoFile');
  if (uploadBtn && photoFileInput) {
    const sourcePreview = $('masterSourcePreview');
    let sourcePreviewUrl = null;
    const openPhotoPicker = () => {
      photoFileInput.value = '';
      photoFileInput.click();
    };
    uploadBtn.onclick = openPhotoPicker;
    if ($('selectPhotoBtn')) $('selectPhotoBtn').onclick = openPhotoPicker;
    photoFileInput.onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
      sourcePreviewUrl = URL.createObjectURL(file);
      if (sourcePreview) {
        sourcePreview.src = sourcePreviewUrl;
        sourcePreview.hidden = false;
      }
      if ($('masterLoadError')) $('masterLoadError').hidden = true;
      setMasterScreen('computing');
      try {
        await pipelineController.handleImageFile(file);
        if (!pipelineController.getMasterData().masterPaths?.length) {
          setMasterScreen('intro');
          if ($('masterLoadError')) {
            $('masterLoadError').textContent = i18nManager ? i18nManager.t('wizard.alertNoLines') : '未能生成母版，请换一张照片重试。';
            $('masterLoadError').hidden = false;
          }
        }
      } catch (error) {
        setMasterScreen('intro');
        if ($('masterLoadError')) {
          $('masterLoadError').textContent = error.message;
          $('masterLoadError').hidden = false;
        }
      }
    };
  }
  if ($('loadDemoBtn')) {
    $('loadDemoBtn').onclick = async () => {
      setMasterScreen('computing');
      try {
        const resp = await fetch('docs/images/demo-still-life.jpg');
        if (resp.ok) {
          const blob = await resp.blob();
          blob.name = 'demo-still-life.jpg';
          await pipelineController.handleImageFile(blob);
          return;
        }
      } catch (_) {}
      requestAnimationFrame(() => pipelineController.initBrowserDemo());
    };
  }

  const exportSchemeBtn = $('exportScheme');
  if (exportSchemeBtn) {
    exportSchemeBtn.onclick = () => {
      const scheme = {
        title: 'Etchloom Atelier Recipe Scheme',
        version: 2,
        timestamp: new Date().toISOString(),
        parameters: {
          exposure: $('exposure')?.value,
          blackPoint: $('blackPoint')?.value,
          whitePoint: $('whitePoint')?.value,
          contourDetail: $('contourDetail')?.value,
          aerialStrength: $('aerialStrength')?.value,
          needleWidth: $('needleWidth')?.value,
          density: $('density')?.value,
          curvatureGate: $('curvatureGate')?.value,
          crossHatch: $('crossHatch')?.value,
          acid: $('acid')?.value,
          grain: $('grain')?.value,
          ink: $('ink')?.value,
          pressure: $('pressure')?.value,
          tone: $('tone')?.value,
          paper: $('paper')?.value
        }
      };
      const blob = new Blob([JSON.stringify(scheme, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const pad = n => String(n).padStart(2, '0');
      const now = new Date();
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      a.download = `Etchloom-scheme-${ts}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
  }

  const aboutBtn = $('aboutBtn');
  const aboutOverlay = $('aboutModalOverlay');
  const aboutClose = $('aboutClose');
  let aboutReturnFocus = null;
  const closeAbout = () => {
    if (!aboutOverlay || aboutOverlay.hidden) return;
    aboutOverlay.hidden = true;
    aboutReturnFocus?.focus?.();
  };
  if (aboutBtn && aboutOverlay) {
    aboutBtn.onclick = () => {
      aboutReturnFocus = document.activeElement;
      aboutOverlay.hidden = false;
      aboutClose?.focus?.();
    };
    if (aboutClose) aboutClose.onclick = closeAbout;
    aboutOverlay.onclick = event => {
      if (event.target === aboutOverlay) closeAbout();
    };
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !aboutOverlay.hidden) closeAbout();
      if (event.key === 'Tab' && !aboutOverlay.hidden) {
        const focusable = [...aboutOverlay.querySelectorAll('button:not([disabled]), a[href]:not([disabled])')].filter(el => !el.hidden);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!aboutOverlay.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    });
  }

  // Transfer Wizard Drawer Trigger Button
  const openWizardDrawerBtn = $('openTransferWizardBtn');
  if (openWizardDrawerBtn) {
    openWizardDrawerBtn.onclick = () => transferWizard.open();
  }

  // Master Algorithm Recipe Sliders Reactive Binding
  const masterParamIds = ['exposure', 'blackPoint', 'whitePoint', 'contourDetail', 'aerialStrength', 'needleWidth', 'density', 'curvatureGate', 'crossHatch'];
  for (const id of masterParamIds) {
    const slider = $(id);
    if (slider) {
      slider.addEventListener('input', () => {
        const out = $(id + 'Val');
        if (out) {
          out.textContent = id === 'needleWidth' ? `${(slider.value / 10).toFixed(1)} mm` : `${slider.value}%`;
        }
        pipelineController.scheduleParameterRun();
      });
    }
  }

  const lotusCheck = $('lotus3D');
  if (lotusCheck) {
    lotusCheck.addEventListener('change', () => {
      pipelineController.scheduleParameterRun();
    });
  }

  // Frame Style selection synchronization (Algorithm Master Step 6 & Virtual Plate Studio)
  const frameSelect = $('frameStyle');
  const plateFrameSelect = $('plateFrameStyle');
  const handleFrameChange = (style) => {
    if (frameSelect && frameSelect.value !== style) frameSelect.value = style;
    if (plateFrameSelect && plateFrameSelect.value !== style) plateFrameSelect.value = style;
    if (stepGrid) {
      stepGrid.setFrameStyle(style);
    }
    const source = pipelineController.getMasterData().loadedImage;
    const paths = pipelineController.getMasterData().masterPaths;
    if (source && paths?.length) {
      pipelineController.syncHeroMasterPreview(paths, source.width, source.height);
    }
    setPlateFrameStyle(style);
    const styleLabel = i18nManager ? i18nManager.t(`frame.${style}`) : style;
    const cat = i18nManager ? i18nManager.t('console.frame') : '版画';
    const msg = i18nManager ? `${i18nManager.t('status.frameUpdated')}: ${styleLabel}` : `版画外框风格已更新: ${styleLabel}`;
    logMessage(cat, msg);
  };
  if (frameSelect) {
    frameSelect.addEventListener('change', () => handleFrameChange(frameSelect.value));
  }
  if (plateFrameSelect) {
    plateFrameSelect.addEventListener('change', () => handleFrameChange(plateFrameSelect.value));
  }

  // Master Hero Viewport Actions
  const heroInspectBtn = $('heroInspectBtn');
  if (heroInspectBtn) {
    heroInspectBtn.onclick = () => {
      const hCanvas = $('masterHeroCanvas') || stepGrid?.stepStates[6]?.canvas;
      if (!hCanvas) return;
      const title = i18nManager ? i18nManager.t('step.6.title') : '纯棉纸凹版印样';
      const meta = $('heroResolutionMeta')?.textContent || '';
      const vectorSvg = stepGrid ? stepGrid.getStepVectorSvg(6) : null;
      lightbox.open(title, hCanvas, meta, { isVector: !!vectorSvg, vectorSvg });
    };
  }

  const heroExportBtn = $('heroExportBtn');
  if (heroExportBtn) {
    heroExportBtn.onclick = () => {
      pipelineController.downloadStepExport(6);
    };
  }

  const heroCanvas = $('masterHeroCanvas');
  if (heroCanvas) {
    heroCanvas.onclick = () => {
      if (heroInspectBtn) heroInspectBtn.click();
    };
  }

  // Plate Fullscreen Lightbox Trigger (Replaces Loupe with full-viewport close-up)
  const canvas = $('canvas');
  const plateFullscreenBtn = $('plateFullscreenBtn');
  const plateCanvasInspectBtn = $('plateCanvasInspectBtn');
  const openPlateLightbox = () => {
    if (!canvas) return;
    const mode = (window.getPlateState ? window.getPlateState().view : 'plate') || 'plate';
    const titleKey = mode === 'depth' ? 'lightbox.depthCloseUp' : mode === 'print' ? 'lightbox.printCloseUp' : 'lightbox.plateCloseUp';
    const title = i18nManager ? i18nManager.t(titleKey) : (mode === 'depth' ? '刻深图 · 全屏特写' : mode === 'print' ? '压印预览 · 全屏特写' : '虚拟铜版 · 全屏特写');
    const metaSuffix = i18nManager ? i18nManager.t('lightbox.gridMeta') : '物理网格';
    lightbox.open(title, canvas, `${canvas.width} × ${canvas.height} ${metaSuffix}`);
  };

  if (plateFullscreenBtn) {
    plateFullscreenBtn.onclick = openPlateLightbox;
  }
  if (plateCanvasInspectBtn) {
    plateCanvasInspectBtn.onclick = openPlateLightbox;
  }
  if (canvas) {
    canvas.ondblclick = openPlateLightbox;
    canvas.onclick = () => {
      const mode = (window.getPlateState ? window.getPlateState().view : 'plate') || 'plate';
      if (mode === 'print') {
        openPlateLightbox();
      }
    };
  }

  // Two-Stage Workflow Actions: Transfer to Plate & Back to Master
  const transferToPlateBtn = $('transferToPlateBtn');
  if (transferToPlateBtn) {
    transferToPlateBtn.onclick = () => {
      switchWorkflow('plate');
      setPlateStage(1);
      const { masterPaths, contours } = pipelineController.getMasterData();
      const count = (masterPaths?.length || contours?.length || 0);
      const masterStats = $('plateMasterStats');
      if (masterStats) {
        const unit = i18nManager ? i18nManager.t('telemetry.strokesUnit') : '条矢量线条';
        masterStats.textContent = `${count.toLocaleString()} ${unit}`;
      }
    };
  }

  const backToMasterBtn = $('backToMasterBtn');
  if (backToMasterBtn) {
    backToMasterBtn.onclick = () => {
      switchWorkflow('master');
    };
  }

  // Stage 1 Panel: Confirm Transfer
  const performStage1Transfer = () => {
    const { masterPaths, contours } = pipelineController.getMasterData();
    const paths = (masterPaths && masterPaths.length) ? masterPaths : (contours || []);
    if (!paths.length) {
      logMessage(i18nManager ? i18nManager.t('console.wizard') : '向导', i18nManager ? i18nManager.t('wizard.alertNoLines') : '当前母版尚无矢量线条可上版。', 'warn');
      return;
    }
    const techRadio = document.querySelector('input[name="stageTransferTechnique"]:checked');
    const selectedTechnique = techRadio?.value || 'etching';
    const nextBtn = $('panel2EtchNavBtn');
    if (nextBtn) {
      const key = selectedTechnique === 'drypoint' ? 'cta.toDrypointProof' : 'cta.startEtchNav';
      nextBtn.dataset.i18n = key;
      nextBtn.textContent = i18nManager ? i18nManager.t(key) : nextBtn.textContent;
    }
    executeTransfer({
      pathsToCarve: paths,
      selectedRes: 1500,
      selectedTechnique,
      needlePressure: 0.65,
      lineWidthScale: 1,
      layerLabel: i18nManager ? i18nManager.t('wizard.layerAll') : '全部母版'
    });
  };

  const panel1ConfirmBtn = $('panel1ConfirmBtn');
  if (panel1ConfirmBtn) {
    panel1ConfirmBtn.onclick = () => {
      if (hasPlateModifications()) {
        const modal = $('retransferModalOverlay');
        if (modal) modal.hidden = false;
      } else {
        performStage1Transfer();
      }
    };
  }

  // Retransfer Safety Intercept Modal Actions
  const retransferModal = $('retransferModalOverlay');
  const retransferCancelBtn = $('retransferCancelBtn');
  const retransferSaveBtn = $('retransferSaveBtn');
  const retransferDirectBtn = $('retransferDirectBtn');

  if (retransferCancelBtn) {
    retransferCancelBtn.onclick = () => {
      if (retransferModal) retransferModal.hidden = true;
    };
  }
  if (retransferSaveBtn) {
    retransferSaveBtn.onclick = () => {
      savePlateBackup();
      if (retransferModal) retransferModal.hidden = true;
      performStage1Transfer();
    };
  }
  if (retransferDirectBtn) {
    retransferDirectBtn.onclick = () => {
      if (retransferModal) retransferModal.hidden = true;
      performStage1Transfer();
    };
  }
  if (retransferModal) {
    retransferModal.onclick = (e) => {
      if (e.target === retransferModal) retransferModal.hidden = true;
    };
  }

  // Stage 2 Panel: Go to Acid Etch
  const panel2EtchNavBtn = $('panel2EtchNavBtn');
  if (panel2EtchNavBtn) {
    panel2EtchNavBtn.onclick = () => {
      const isDrypoint = document.querySelector('input[name="stageTransferTechnique"]:checked')?.value === 'drypoint';
      setPlateStage(isDrypoint ? 4 : 3);
      setView(isDrypoint ? 'print' : 'depth');
    };
  }

  // Stage 3 Panel: Go to Proof Print
  const panel3ProofNavBtn = $('panel3ProofNavBtn');
  if (panel3ProofNavBtn) {
    panel3ProofNavBtn.onclick = () => {
      stop();
      setPlateStage(4);
      setView('print');
    };
  }

  // Stage 4 Panel: Feedback loop - Back to Etch
  const proofBackToEtchBtn = $('proofBackToEtchBtn');
  if (proofBackToEtchBtn) {
    proofBackToEtchBtn.onclick = () => {
      setPlateStage(3);
      setView('depth');
    };
  }

  // Stage 4 Panel: Feedback loop - Back to Inscribe
  const proofBackToInscribeBtn = $('proofBackToInscribeBtn');
  if (proofBackToInscribeBtn) {
    proofBackToInscribeBtn.onclick = () => {
      setPlateStage(2);
      setView('plate');
    };
  }

  // Stage 4 Panel: Reprint
  const reprintBtn = $('reprintBtn');
  if (reprintBtn) {
    reprintBtn.onclick = () => {
      setView('print');
      render();
      if ($('status')) {
        $('status').textContent = i18nManager ? i18nManager.t('caption.print') : '已刷新调墨印样预览';
      }
    };
  }

  bindPlateStudioEvents({
    openTransferWizard: () => transferWizard.open(),
    onMasterParamChange: () => pipelineController.scheduleParameterRun(),
    openPlateFullscreen: openPlateLightbox
  });
}

// 6. Application Bootstrap
function bootstrap() {
  switchWorkflow('master');
  setMasterScreen('intro');
  initEventBindings();
  updateLocaleUI();
  pipelineController.checkModelStatus();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
  } else if (typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  }
}
