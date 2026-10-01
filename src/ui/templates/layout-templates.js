/**
 * @file layout-templates.js
 * @description Decoupled UI template partials for Etchloom atelier.
 * Dynamic template assembly decouples index.html down to a lightweight shell.
 */

export const headerTemplate = `
  <header class="app-header">
    <div class="brand-group">
      <img class="brand-logo" src="docs/images/etchloom-logo.svg" alt="Etchloom Logo">
      <div>
        <h1 class="brand-title" data-i18n="app.title">Etchloom</h1>
        <p class="brand-subtitle" data-i18n="app.subtitle">Digital Printmaking Studio</p>
      </div>
    </div>

    <!-- Workflow Navigation -->
    <nav class="workspace-tabs" aria-label="工作阶段">
      <button id="showGenerator" class="active" data-i18n="tab.master">算法母版设计</button>
      <button id="showPlate" data-i18n="tab.plate">虚拟铜版工坊</button>
    </nav>

    <!-- Header Actions -->
    <div class="header-actions">
      <button id="langToggle" class="btn-secondary" data-i18n="lang.toggle">中 / EN</button>
      <button id="exportScheme" class="btn-secondary" data-i18n="action.exportScheme">导出方案</button>
      <button id="aboutBtn" class="btn-secondary" data-i18n="action.about">关于</button>
    </div>
  </header>
`;

export const sidebarTemplate = `
  <aside class="app-sidebar">

    <!-- Drawer 00: 图像与几何感知 -->
    <section id="drawer0">
      <h2 class="drawer-title" data-i18n="sec.0.title">00 / 图像与几何感知</h2>
      <button id="uploadPhoto" class="primary" data-i18n="sec.0.upload">载入照片</button>
      <input id="photoFile" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden>
      
      <label class="checkbox-label">
        <input id="lotus3D" type="checkbox" checked>
        <span data-i18n="sec.0.lotus">Lotus 3D几何增强</span>
        <span id="modelStatus" class="badge badge-amber" style="margin-left:auto">检测中…</span>
      </label>

      <label><span data-i18n="sec.0.exposure">曝光度</span> <output id="exposureVal">50%</output></label>
      <input id="exposure" type="range" min="0" max="100" value="50">

      <label><span data-i18n="sec.0.black">黑场位点</span> <output id="blackPointVal">0%</output></label>
      <input id="blackPoint" type="range" min="0" max="50" value="0">

      <label><span data-i18n="sec.0.white">白场位点</span> <output id="whitePointVal">100%</output></label>
      <input id="whitePoint" type="range" min="50" max="100" value="100">
    </section>

    <!-- Drawer 01: 轮廓与空间透视 -->
    <section id="drawer1">
      <h2 class="drawer-title" data-i18n="sec.1.title">01 / 轮廓与空间透视</h2>
      <label><span data-i18n="sec.1.contour">轮廓密度</span> <output id="contourDetailVal">75%</output></label>
      <input id="contourDetail" type="range" min="0" max="100" value="75">

      <label><span data-i18n="sec.1.aerial">空气透视强度</span> <output id="aerialStrengthVal">60%</output></label>
      <input id="aerialStrength" type="range" min="0" max="100" value="60">

      <label><span data-i18n="sec.1.width">轮廓刀宽</span> <output id="needleWidthVal">0.8 mm</output></label>
      <input id="needleWidth" type="range" min="1" max="30" value="8">
    </section>

    <!-- Drawer 02: 3D曲面排线与曲率门控 -->
    <section id="drawer2">
      <h2 class="drawer-title" data-i18n="sec.2.title">02 / 3D曲面排线与曲率门控</h2>
      <label><span data-i18n="sec.2.hatch">排线密度</span> <output id="densityVal">80%</output></label>
      <input id="density" type="range" min="0" max="100" value="80">

      <label><span data-i18n="sec.2.gate">曲率门控阈值</span> <output id="curvatureGateVal">70%</output></label>
      <input id="curvatureGate" type="range" min="0" max="100" value="70">

      <label><span data-i18n="sec.2.cross">交叉排线</span> <output id="crossHatchVal">65%</output></label>
      <input id="crossHatch" type="range" min="0" max="100" value="65">
    </section>

    <!-- Drawer 03: 铜版物理工坊与印样 -->
    <section id="drawer3">
      <h2 class="drawer-title" data-i18n="sec.3.title">03 / 铜版物理工坊与印样</h2>

      <!-- Process A: 图稿上版 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 A · 图稿上版</div>
        <p style="font-size:11px;color:var(--text-secondary);margin:0 0 8px 0;line-height:1.4;">将母版矢量图稿按工艺技法转移至指定规格的铜版物理网格。</p>
        <button id="openTransferWizardBtn" class="primary" style="margin-top:2px;">图稿上版向导...</button>
      </div>

      <!-- Process B: 版面刻绘与修版 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 B · 版面刻绘与修版</div>
        <div class="tools">
          <button class="active" data-tool="needle" data-i18n="tool.needle">刻针</button>
          <button data-tool="dry" data-i18n="tool.dry">干刻针</button>
          <button data-tool="stop" data-i18n="tool.stop">防蚀漆</button>
          <button data-tool="polish" data-i18n="tool.polish">刮磨器</button>
        </div>

        <label><span data-i18n="sec.3.size">工具直径</span> <output id="sizeValue">4 px</output></label>
        <input id="size" type="range" min="1" max="50" value="4">

        <div class="row" style="margin-top:8px">
          <button id="undo" data-i18n="action.undo">撤销刻线</button>
          <button id="clear" data-i18n="action.clear">清空版面</button>
        </div>
        <button id="demo" style="margin-top:6px" data-i18n="action.demo">载入静物练习版</button>
      </div>

      <!-- Process C: 酸液腐蚀参数 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 C · 酸液腐蚀参数</div>
        <label><span data-i18n="sec.3.acid">酸液浓度强度</span> <output id="acidValue">45%</output></label>
        <input id="acid" type="range" min="1" max="100" value="45">

        <label><span data-i18n="sec.3.grain">腐蚀金相颗粒</span> <output id="grainValue">45%</output></label>
        <input id="grain" type="range" min="0" max="100" value="45">

        <label class="checkbox-label" style="margin-top:8px">
          <input id="irreversible" type="checkbox">
          <span data-i18n="sec.3.irreversible">不可逆模式（清除撤销）</span>
        </label>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px;line-height:1.4;">
          💡 提示：腐蚀计时与启停请在工作台顶栏 [开始腐蚀] 控制台操作。
        </div>
        <button id="etch" hidden data-i18n="sec.3.startAcid">开始腐蚀</button>
      </div>

      <!-- Process D: 填墨与压印试印 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 D · 填墨与压印试印</div>
        <label><span data-i18n="sec.3.ink">油墨饱满度</span> <output id="inkValue">90%</output></label>
        <input id="ink" type="range" min="0" max="150" value="90">

        <label><span data-i18n="sec.3.pressure">滚筒机械压力</span> <output id="pressureValue">65%</output></label>
        <input id="pressure" type="range" min="0" max="100" value="65">

        <label><span data-i18n="sec.3.plateTone">擦版留墨调子</span> <output id="toneValue">4%</output></label>
        <input id="tone" type="range" min="0" max="35" value="4">

        <label data-i18n="sec.3.paper">纸张材质基底</label>
        <select id="paper">
          <option value="rough" data-i18n="paper.rough">暖白 · 粗纹棉纸</option>
          <option value="smooth" data-i18n="paper.smooth">象牙白 · 细纹纸</option>
        </select>

        <button id="print" class="primary" style="margin-top:10px" data-i18n="sec.3.print">取一张印样</button>

        <div class="row" style="margin-top:8px">
          <button id="save" data-i18n="action.save">保存虚拟版</button>
          <button id="load" data-i18n="action.load">打开虚拟版</button>
        </div>
        <input id="file" type="file" accept="application/json,.json" hidden>
      </div>
    </section>

  </aside>
`;

export const masterWorkspaceTemplate = `
  <!-- 1. Master Workspace (Step Flow Grid: Step 0 ~ Step 6) -->
  <div id="masterWorkspace">
    <div class="workspace-header">
      <div>
        <h2 data-i18n="tab.master">算法母版设计 (Step Flow Grid)</h2>
        <p data-i18n="step.intro">由 5 阶段几何算法合成的完整版画母版，点击任一卡片可特写放大或独立导出图层。</p>
      </div>
      <button id="transferToPlateBtn" class="primary" style="width:auto;padding:8px 20px" data-i18n="action.transferToPlate">雕刻至虚拟铜版 →</button>
    </div>

    <!-- 7-Stage Adaptive Grid -->
    <div id="stepFlowGridContainer"></div>

    <!-- Atelier Activity Log Console -->
    <div class="activity-log-wrap">
      <div class="activity-log-header">
        <span class="log-title" data-i18n="console.title">工坊实时运行日志</span>
        <span id="logStatusBadge" class="badge badge-green">IDLE</span>
        <button id="clearLogBtn" class="card-btn" style="margin-left:auto;padding:2px 8px" data-i18n="action.clear">清空日志</button>
      </div>
      <div id="activityLog" class="activity-log-body">
        <div class="log-line"><span class="log-time">[00:00:00]</span> <span class="log-cat">[系统]</span> Etchloom v2.0 古典版画工坊初始化完成，等待载入原图。</div>
      </div>
    </div>
  </div>
`;

export const plateWorkspaceTemplate = `
  <!-- 2. Virtual Plate Studio Workspace (Interactive Copperplate Studio) -->
  <div id="plateWorkspace" hidden class="plate-studio-wrap">
    <!-- 5-Stage Classical Printmaking Stepper -->
    <div id="plateStepper" class="plate-process-stepper">
      <div class="stepper-step done" data-step="1" id="stepTransfer">
        <span class="stepper-num">1</span>
        <span>图稿上版</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step active" data-step="2" id="stepInscribe">
        <span class="stepper-num">2</span>
        <span>版面刻绘</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="3" id="stepEtch">
        <span class="stepper-num">3</span>
        <span>酸液腐蚀</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="4" id="stepInk">
        <span class="stepper-num">4</span>
        <span>填墨擦版</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="5" id="stepPrint">
        <span class="stepper-num">5</span>
        <span>压印试印</span>
      </div>
    </div>

    <!-- Workbench Top Bar -->
    <div class="plate-top-bar">
      <!-- View Modes -->
      <div class="view-tabs">
        <button class="active" data-view="plate" data-i18n="view.plate">虚拟铜版</button>
        <button data-view="depth" data-i18n="view.depth">刻深图</button>
        <button data-view="print" data-i18n="view.print">压印预览</button>
      </div>

      <!-- Resolution Switcher (900, 1500 2K, 3000 3K) -->
      <div class="resolution-selector">
        <span class="resolution-label">物理网格:</span>
        <button class="res-btn" data-res="900">900px</button>
        <button class="res-btn active" data-res="1500">1500px (2K)</button>
        <button class="res-btn" data-res="3000">3000px (3K)</button>
      </div>

      <!-- Unified Acid Bite Console -->
      <div class="acid-console-wrap">
        <button id="etchBtn" class="primary" style="width:auto;padding:6px 18px;font-size:12px;" data-i18n="sec.3.startAcid">开始腐蚀</button>
        <!-- Backward compatibility elements for tests -->
        <button id="etchTopBtn" hidden></button>
        <div id="plateAcidGauge" class="gauge-badge">腐蚀 0.0s · 平均深 0.0μm</div>
        <span id="timerBadge" hidden>腐蚀累计 0.0 s</span>
        <span id="timer" hidden>腐蚀累计 0.0 s</span>
      </div>
    </div>

    <!-- High-Resolution Plate Canvas Frame (Default 1500x1100 2K) -->
    <div class="plate-canvas-frame">
      <canvas id="canvas" width="1500" height="1100" aria-label="数字铜版绘图区"></canvas>
    </div>

    <!-- Studio Caption & Telemetry -->
    <div class="plate-caption">
      <span id="caption" data-i18n="caption.plate">制版 / 针尖划开保护层，等待酸液进入</span>
      <span id="status" class="telemetry-status-val">就绪 · 在版面上划出第一条线</span>
    </div>
  </div>
`;

export const telemetryFooterTemplate = `
  <footer class="telemetry-footer">
    <div>
      <span><span data-i18n="telemetry.status">状态</span>: <span id="telemetryStatus" class="telemetry-status-val">运行就绪</span></span> |
      <span><span data-i18n="telemetry.task">活跃任务</span>: <span id="telemetryTask" class="telemetry-status-val">IDLE</span></span> |
      <span><span data-i18n="telemetry.duration">总耗时</span>: <span id="telemetryDuration" class="telemetry-status-val">0ms</span></span> |
      <span><span data-i18n="telemetry.strokes">矢量线条</span>: <span id="telemetryStrokes" class="telemetry-status-val">0 条</span></span> |
      <span><span data-i18n="telemetry.cache">拓扑缓存命中</span>: <span id="telemetryCache" class="telemetry-status-val">0/5</span></span>
    </div>
    <div style="margin-left:auto">
      <span style="color:var(--accent-gold)">Etchloom v2.0 Atelier</span>
    </div>
  </footer>
`;

export const modalsTemplate = `
  <!-- Modal Dialog (Close-up & About) -->
  <div id="modalOverlay" class="etchloom-modal-overlay" hidden>
    <div class="etchloom-modal lightbox-modal">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:16px;">
          <h3 id="modalTitle" class="modal-title">特写检查</h3>
          <div class="lightbox-toolbar">
            <button id="lightboxZoomOut" class="card-btn" title="缩小" style="padding:2px 8px;">−</button>
            <span id="lightboxZoomLevel" class="lightbox-zoom-badge">100%</span>
            <button id="lightboxZoomIn" class="card-btn" title="放大" style="padding:2px 8px;">+</button>
            <button id="lightboxReset" class="card-btn" title="重置视图" style="padding:2px 8px;">重置</button>
            <button id="lightboxFit" class="card-btn" title="自适应窗口" style="padding:2px 8px;">自适应</button>
          </div>
        </div>
        <button id="modalClose" class="card-btn" style="padding:2px 8px;">✕</button>
      </div>
      <div id="modalBody" class="modal-body lightbox-modal-body">
        <div id="lightboxViewport" class="lightbox-viewport">
          <canvas id="lightboxCanvas" class="lightbox-canvas"></canvas>
        </div>
      </div>
    </div>
  </div>

  <!-- Transfer Wizard Modal -->
  <div id="transferWizardOverlay" class="etchloom-modal-overlay" hidden>
    <div class="etchloom-modal" style="max-width:540px;">
      <div class="modal-header">
        <h3 class="modal-title" data-i18n="wizard.title">母版图稿上版向导</h3>
        <button id="closeTransferWizardBtn" class="card-btn" style="padding:2px 8px;">✕</button>
      </div>
      <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:16px;">
        <label>目标物理铜版规格:
          <select id="wizardPlateSize" style="margin-top:6px;">
            <option value="900">900 x 660 (标准轻量)</option>
            <option value="1500" selected>1500 x 1100 (2K 高清推荐)</option>
            <option value="3000">3000 x 2200 (3K 展品级)</option>
          </select>
        </label>
        <div>
          <span style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">选择转移图层:</span>
          <label class="checkbox-label"><input type="checkbox" id="wizardLayerContours" checked> <span>结构轮廓线 (Contours)</span></label>
          <label class="checkbox-label"><input type="checkbox" id="wizardLayerHatching" checked> <span>表面顺形排线 (Hatching)</span></label>
          <label class="checkbox-label"><input type="checkbox" id="wizardLayerCross" checked> <span>暗部交叉排线 (Cross-hatch)</span></label>
        </div>
        <label>针尖下压力度刻深:
          <input type="range" id="wizardNeedlePressure" min="10" max="100" value="65" style="margin-top:6px;">
        </label>
        <button id="confirmTransferBtn" class="primary" style="margin-top:8px;">确认雕刻转移到铜版</button>
      </div>
    </div>
  </div>

  <!-- About Modal Dialog -->
  <div id="aboutModalOverlay" class="etchloom-modal-overlay" hidden>
    <div class="etchloom-modal" style="max-width:560px;">
      <div class="modal-header">
        <h3 class="modal-title" data-i18n="action.about">关于 Etchloom</h3>
        <button id="aboutClose" class="card-btn" style="padding:2px 8px;">✕</button>
      </div>
      <div class="modal-body" style="padding:24px;line-height:1.7;color:var(--text-secondary);">
        <p><strong>Etchloom</strong> 是一套面向计算机图形学与计算摄影的数字古典铜版画工作室系统。</p>
        <p>系统完全基于纯数学几何管线与连续物理介质数值模拟，解耦实现五阶段离散数学管线、PDE 酸液侧向咬蚀与凹版压印光影着色。</p>
        <p style="margin-top:16px;font-size:12px;color:var(--text-muted);">版本：v2.0.0 (Decoupled Pure ESM Architecture)<br>许可证：MIT License</p>
      </div>
    </div>
  </div>
`;

/**
 * Mount the full application layout inside the container
 * @param {HTMLElement} container - The mount root element (e.g. #app)
 */
export function mountAppLayout(container) {
  if (!container) return;
  container.innerHTML = `
    ${headerTemplate}
    <main class="app-main">
      ${sidebarTemplate}
      <div class="workspace-area">
        ${masterWorkspaceTemplate}
        ${plateWorkspaceTemplate}
      </div>
    </main>
    ${telemetryFooterTemplate}
    ${modalsTemplate}
  `;
}
