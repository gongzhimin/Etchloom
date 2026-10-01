/**
 * Etchloom - Digital Intaglio & Virtual Copperplate Studio
 * Main Native ES Module Entry Point (src/main.js)
 */

import { LightboxController } from './ui/controllers/lightbox-controller.js';
import { TransferWizardController } from './ui/controllers/transfer-wizard-controller.js';
import { PipelineController } from './ui/controllers/pipeline-controller.js';
import {
  W, H, N, depth, exposed, blocked, burr,
  allocatePlate, snapshot, stop, setView, line,
  setPlateStage, bindPlateStudioEvents
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
  lineEl.innerHTML = `<span class="log-time">${timeStr}</span> <span class="log-cat">[${category}]</span> <span class="log-text">${text}</span>`;
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
}

export function updateLocaleUI() {
  if (!i18nManager) return;
  i18nManager.bindDom();
  const btn = $('langToggle');
  if (btn) btn.textContent = i18nManager.t('lang.toggle');

  const running = window.getPlateState ? window.getPlateState().running : false;
  const acidBtnText = running ? i18nManager.t('sec.3.stopAcid') : i18nManager.t('sec.3.startAcid');
  if ($('etch')) $('etch').textContent = acidBtnText;
  if ($('etchTopBtn')) $('etchTopBtn').textContent = acidBtnText;
  if ($('etchBtn')) $('etchBtn').textContent = acidBtnText;

  if (typeof stepGrid !== 'undefined' && stepGrid && typeof stepGrid.updateLocale === 'function') {
    stepGrid.updateLocale(i18nManager);
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
    onStepFullscreen: (stepIdx, cardCanvas) => {
      const title = i18nManager ? i18nManager.t(`step.${stepIdx}.title`) : `Step ${stepIdx}`;
      const meta = stepGrid?.stepStates[stepIdx]?.metaEl?.textContent || '';
      lightbox.open(title, cardCanvas, meta);
    },
    onStepExport: (stepIdx) => {
      pipelineController.downloadStepExport(stepIdx);
    }
  });
}

const pipelineController = new PipelineController({
  stepGrid,
  log: logMessage,
  onPlateCarve: (allPaths, w, h) => {
    // Initial demo hairline engraving onto copperplate
    const scale = Math.min(W / w, H / h);
    const offX = Math.round((W - w * scale) / 2);
    const offY = Math.round((H - h * scale) / 2);
    for (const path of allPaths) {
      const pts = path.points;
      if (pts && pts.length >= 2) {
        for (let k = 1; k < pts.length; k++) {
          line(
            { x: offX + pts[k - 1][0] * scale, y: offY + pts[k - 1][1] * scale },
            { x: offX + pts[k][0] * scale, y: offY + pts[k][1] * scale, p: 0.6 }
          );
        }
      }
    }
  }
});

const transferWizard = new TransferWizardController({
  getMasterData: () => pipelineController.getMasterData(),
  onExecuteTransfer: ({ pathsToCarve, selectedRes, selectedTechnique, needlePressure = 0.65, layerLabel }) => {
    stop();
    snapshot();

    if (W !== selectedRes) {
      allocatePlate(selectedRes);
    }

    depth.fill(0);
    exposed.fill(0);
    blocked.fill(0);
    burr.fill(0);

    const mask = document.createElement('canvas');
    mask.width = W;
    mask.height = H;
    const mctx = mask.getContext('2d');
    mctx.clearRect(0, 0, W, H);

    const srcW = pipelineController.currentLoadedImage?.width || 900;
    const srcH = pipelineController.currentLoadedImage?.height || 660;
    const scale = Math.min(W / srcW, H / srcH);
    const offX = Math.round((W - srcW * scale) / 2);
    const offY = Math.round((H - srcH * scale) / 2);

    mctx.strokeStyle = '#000000';
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';

    const baseNeedleWidth = Math.max(0.6, (W / 1500) * 0.9);

    for (const path of pathsToCarve) {
      const pts = path.points;
      if (!pts || pts.length < 2) continue;

      const pWidth = (path.width || 1.0) * scale * 0.75;
      const strokeW = Math.max(0.5, Math.min(baseNeedleWidth * 2.0, pWidth));
      mctx.lineWidth = strokeW;

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

    const techLabel = selectedTechnique === 'drypoint' ? '干刻直刻 (Drypoint)' : '蚀刻针划线 (Etching)';
    const statusText = `已成功上版: ${pathsToCarve.length} 条线条 (${techLabel}, ${W} × ${H})`;
    if ($('status')) $('status').textContent = statusText;
    logMessage('制版', `【图稿上版成功】工艺: ${techLabel} | 分辨率: ${W} × ${H} | 载入图层: ${layerLabel}。已转入虚拟铜版工坊！`, 'done');
  }
});

// 5. Global Topbar & Drawer Event Bindings
function initEventBindings() {
  const showGenBtn = $('showGenerator');
  const showPlateBtn = $('showPlate');
  if (showGenBtn) showGenBtn.onclick = () => switchWorkflow('master');
  if (showPlateBtn) showPlateBtn.onclick = () => switchWorkflow('plate');

  const langBtn = $('langToggle');
  if (langBtn && i18nManager) {
    langBtn.onclick = () => {
      i18nManager.toggleLocale();
      updateLocaleUI();
      logMessage(
        i18nManager.getLocale() === 'zh-CN' ? '系统' : 'System',
        i18nManager.getLocale() === 'zh-CN' ? '界面语言已切换为: 简体中文' : 'Language switched to English',
        'info'
      );
    };
  }

  const clearLogBtn = $('clearLogBtn');
  if (clearLogBtn) {
    clearLogBtn.onclick = () => {
      const logEl = $('activityLog');
      if (logEl) logEl.innerHTML = '';
      logMessage('系统', '日志已清空。');
    };
  }

  const activityLogWrap = document.querySelector('.activity-log-wrap');
  const activityLogHeader = document.querySelector('.activity-log-header');
  if (activityLogHeader && activityLogWrap) {
    activityLogHeader.onclick = (e) => {
      if (e.target && (e.target.id === 'clearLogBtn' || e.target.closest('#clearLogBtn'))) return;
      activityLogWrap.classList.toggle('collapsed');
    };
  }

  const uploadBtn = $('uploadPhoto');
  const photoFileInput = $('photoFile');
  if (uploadBtn && photoFileInput) {
    uploadBtn.onclick = () => {
      photoFileInput.value = '';
      photoFileInput.click();
    };
    photoFileInput.onchange = e => {
      const file = e.target.files[0];
      if (file) pipelineController.handleImageFile(file);
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
      a.download = 'Etchloom-scheme.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
  }

  const aboutBtn = $('aboutBtn');
  if (aboutBtn) {
    aboutBtn.onclick = () => {
      const modalCanvas = $('modalCanvas');
      if (modalCanvas) {
        modalCanvas.width = 720;
        modalCanvas.height = 200;
        const mctx = modalCanvas.getContext('2d');
        mctx.fillStyle = '#191d1a';
        mctx.fillRect(0, 0, 720, 200);
        mctx.fillStyle = '#c8b67e';
        mctx.font = '24px Georgia, serif';
        mctx.fillText('Etchloom Classical Printmaking Studio', 40, 90);
        mctx.font = '13px sans-serif';
        mctx.fillStyle = '#ded9cc';
        mctx.fillText('Digital Intaglio & Copperplate Simulation Engine v2.0', 40, 130);
      }
      lightbox.open(
        'Etchloom · 数字古典版画工坊 (Atelier Digital Printmaking Studio)',
        modalCanvas,
        `
          <p><strong>系统设计架构 (Architecture Modules)</strong></p>
          <ul>
            <li><strong>M1 视口引擎</strong>：Atelier Classical Dark 莫兰迪古典暗调美学，7阶段自适应响应式网格 (Step 0 ~ Step 6)。</li>
            <li><strong>M2 算法管线</strong>：5阶段纯状态机（灰度线描感知 → 3D几何流场 → 空气透视轮廓 → 空间曲面几何排线 → 矢量母版合成）。</li>
            <li><strong>M3 铜版工坊</strong>：4大正交物理工具（刻针、干刻针、防蚀漆、刮磨器）与 2D 偏微分酸液咬蚀化学仿真、纯手工棉纸凹版压痕印样。</li>
            <li><strong>M4 调度编排</strong>：拓扑有向无环图哈希增量缓存、抢占式微任务调度、多格式图层导出 (SVG / CNC G-Code / Recipe JSON)。</li>
          </ul>
          <p><strong>快捷操作指南 (Keyboard Shortcuts)</strong></p>
          <ul>
            <li>按住 <code>Alt</code> 键在铜版或步骤画布上悬停：开启 160px 直径物理像素级放大镜 (Loupe Inspection)。</li>
            <li>点击任意卡片右下角 <code>[⛶ 特写]</code>：展开超高清全屏视口特写。</li>
            <li>点击 <code>[雕刻至虚拟铜版 →]</code>：将母版计算所得的数千条矢量线条无缝转录为物理干刻针痕迹，直接进入酸液腐蚀工坊。</li>
          </ul>
        `
      );
    };
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

  // Loupe Magnifier Init on Plate Canvas
  const canvas = $('canvas');
  const LoupeLib = (typeof LoupeMagnifier !== 'undefined' ? LoupeMagnifier : (typeof window !== 'undefined' ? window.LoupeMagnifier : null));
  if (canvas && LoupeLib) {
    new LoupeLib(canvas, { diameter: 160, zoom: 4 });
  }

  bindPlateStudioEvents({
    openTransferWizard: () => transferWizard.open(),
    onMasterParamChange: () => pipelineController.scheduleParameterRun()
  });
}

// 6. Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  switchWorkflow('master');
  initEventBindings();
  updateLocaleUI();
  pipelineController.checkModelStatus();

  // Launch initial demo on load
  setTimeout(() => {
    pipelineController.initBrowserDemo();
  }, 10);
});
