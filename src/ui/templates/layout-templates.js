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
        <p class="brand-subtitle" data-i18n="app.subtitle">数字版画工坊</p>
      </div>
    </div>

    <!-- Workflow Navigation -->
    <nav class="workspace-tabs" aria-label="工作阶段">
      <button id="showGenerator" class="active" data-i18n="tab.master">母版设计</button>
      <button id="showPlate" data-i18n="tab.plate">虚拟铜版</button>
    </nav>

    <!-- Header Actions -->
    <div class="header-actions">
      <button id="langToggle" class="btn-secondary" data-i18n="lang.toggle">English</button>
      <button id="exportScheme" class="btn-secondary" data-i18n="action.exportScheme">导出配置</button>
      <button id="aboutBtn" class="btn-secondary" data-i18n="action.about">关于</button>
    </div>
  </header>
`;

export const sidebarTemplate = `
  <aside class="app-sidebar">

    <!-- Drawer 00: 图像感知 -->
    <section id="drawer0">
      <h2 class="drawer-title" data-i18n="sec.0.title">00 / 图像感知</h2>
      <button id="uploadPhoto" class="primary" data-i18n="sec.0.upload">载入照片</button>
      <input id="photoFile" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden>
      
      <label class="checkbox-label">
        <input id="lotus3D" type="checkbox" checked>
        <span data-i18n="sec.0.lotus">3D几何增强</span>
        <span id="modelStatus" class="badge badge-amber u-ml-auto">检测中…</span>
      </label>

      <label for="exposure"><span data-i18n="sec.0.exposure">曝光度</span> <output id="exposureVal">50%</output></label>
      <input id="exposure" type="range" min="0" max="100" value="50">

      <label for="blackPoint"><span data-i18n="sec.0.black">黑场</span> <output id="blackPointVal">0%</output></label>
      <input id="blackPoint" type="range" min="0" max="50" value="0">

      <label for="whitePoint"><span data-i18n="sec.0.white">白场</span> <output id="whitePointVal">100%</output></label>
      <input id="whitePoint" type="range" min="50" max="100" value="100">
    </section>

    <!-- Drawer 01: 空间轮廓 -->
    <section id="drawer1">
      <h2 class="drawer-title" data-i18n="sec.1.title">01 / 空间轮廓</h2>
      <label for="contourDetail"><span data-i18n="sec.1.contour">轮廓密度</span> <output id="contourDetailVal">75%</output></label>
      <input id="contourDetail" type="range" min="0" max="100" value="75">

      <label for="aerialStrength"><span data-i18n="sec.1.aerial">透视强度</span> <output id="aerialStrengthVal">60%</output></label>
      <input id="aerialStrength" type="range" min="0" max="100" value="60">

      <label for="needleWidth"><span data-i18n="sec.1.width">轮廓刀宽</span> <output id="needleWidthVal">0.8 mm</output></label>
      <input id="needleWidth" type="range" min="1" max="30" value="8">
    </section>

    <!-- Drawer 02: 曲面排线 -->
    <section id="drawer2">
      <h2 class="drawer-title" data-i18n="sec.2.title">02 / 曲面排线</h2>
      <label for="density"><span data-i18n="sec.2.hatch">排线密度</span> <output id="densityVal">80%</output></label>
      <input id="density" type="range" min="0" max="100" value="80">

      <label for="curvatureGate"><span data-i18n="sec.2.gate">曲率门控</span> <output id="curvatureGateVal">70%</output></label>
      <input id="curvatureGate" type="range" min="0" max="100" value="70">

      <label for="crossHatch"><span data-i18n="sec.2.cross">交叉排线</span> <output id="crossHatchVal">65%</output></label>
      <input id="crossHatch" type="range" min="0" max="100" value="65">

      <label for="frameStyle"><span data-i18n="sec.2.frame">版画外框</span></label>
      <select id="frameStyle">
        <option value="double" selected data-i18n="frame.double">双层古典边框</option>
        <option value="fine" data-i18n="frame.fine">单线精细刻框</option>
        <option value="rough" data-i18n="frame.rough">手工古拙边框</option>
        <option value="none" data-i18n="frame.none">无外框</option>
      </select>
    </section>

    <!-- Drawer 03: 铜版工坊 -->
    <section id="drawer3">
      <h2 class="drawer-title" data-i18n="sec.3.title">03 / 铜版工坊</h2>

      <!-- Process A: 图稿上版 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title" data-i18n="sec.3.groupA">工序 A · 上版</div>
        <button id="openTransferWizardBtn" class="primary u-mt-1" data-i18n="sec.3.wizardBtn">图稿上版向导...</button>
      </div>

      <!-- Process B: 版面刻绘与修版 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title" data-i18n="sec.3.groupB">工序 B · 刻绘修版</div>
        <div class="tools">
          <button class="active" data-tool="needle" data-i18n="tool.needle">刻针</button>
          <button data-tool="dry" data-i18n="tool.dry">干刻针</button>
          <button data-tool="stop" data-i18n="tool.stop">防蚀漆</button>
          <button data-tool="polish" data-i18n="tool.polish">刮磨器</button>
        </div>

        <label for="size"><span data-i18n="sec.3.size">工具直径</span> <output id="sizeValue">4 px</output></label>
        <input id="size" type="range" min="1" max="50" value="4">

        <div class="row u-mt-2">
          <button id="undo" data-i18n="action.undo">撤销刻线</button>
          <button id="clear" data-i18n="action.clear">清空版面</button>
        </div>
        <button id="demo" class="u-mt-2" data-i18n="action.demo">载入静物练习版</button>
      </div>

      <!-- Process C: 酸液腐蚀参数 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title" data-i18n="sec.3.groupC">工序 C · 酸液腐蚀</div>
        <label for="acid"><span data-i18n="sec.3.acid">酸液浓度</span> <output id="acidValue">45%</output></label>
        <input id="acid" type="range" min="1" max="100" value="45">

        <label for="grain"><span data-i18n="sec.3.grain">金相颗粒</span> <output id="grainValue">45%</output></label>
        <input id="grain" type="range" min="0" max="100" value="45">

        <label class="checkbox-label u-mt-2">
          <input id="irreversible" type="checkbox">
          <span data-i18n="sec.3.irreversible">不可逆模式</span>
        </label>
        <button id="etch" hidden data-i18n="sec.3.startAcid">开始腐蚀</button>
      </div>

      <!-- Process D: 填墨与压印试印 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title" data-i18n="sec.3.groupD">工序 D · 填墨试印</div>
        <label for="ink"><span data-i18n="sec.3.ink">油墨饱满</span> <output id="inkValue">90%</output></label>
        <input id="ink" type="range" min="0" max="150" value="90">

        <label for="pressure"><span data-i18n="sec.3.pressure">压印压力</span> <output id="pressureValue">65%</output></label>
        <input id="pressure" type="range" min="0" max="100" value="65">

        <label for="tone"><span data-i18n="sec.3.plateTone">留墨调子</span> <output id="toneValue">4%</output></label>
        <input id="tone" type="range" min="0" max="35" value="4">

        <label for="paper" data-i18n="sec.3.paper">纸张材质</label>
        <select id="paper">
          <option value="rough" data-i18n="paper.rough">暖白 · 粗纹棉纸</option>
          <option value="smooth" data-i18n="paper.smooth">象牙白 · 细纹纸</option>
        </select>

        <label for="plateFrameStyle" data-i18n="sec.3.frame">印样外框</label>
        <select id="plateFrameStyle">
          <option value="double" selected data-i18n="frame.double">双层古典边框</option>
          <option value="fine" data-i18n="frame.fine">单线精细刻框</option>
          <option value="rough" data-i18n="frame.rough">手工古拙边框</option>
          <option value="none" data-i18n="frame.none">无外框</option>
        </select>

        <button id="print" class="primary u-mt-2" data-i18n="sec.3.print">取一张印样</button>

        <div class="row u-mt-2">
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
        <h2 data-i18n="tab.master">母版设计</h2>
        <p data-i18n="step.intro">点击卡片可全屏特写或独立导出图层。</p>
      </div>
      <button id="transferToPlateBtn" class="primary btn-transfer-pad" data-i18n="action.transferToPlate">雕刻至铜版 →</button>
    </div>

    <!-- 7-Stage Adaptive Grid (2 columns x 4 rows) -->
    <div id="stepFlowGridContainer"></div>

    <!-- Atelier Slide-up Activity Log Console -->
    <div id="activityLogWrap" class="activity-log-wrap collapsed">
      <div class="activity-log-header">
        <span class="log-title" data-i18n="console.title">运行日志</span>
        <span id="logStatusBadge" class="badge badge-green">IDLE</span>
        <button id="clearLogBtn" class="card-btn btn-compact-pad u-ml-auto" data-i18n="action.clear">清空</button>
        <span id="logToggleIndicator" class="log-toggle-arrow">▲</span>
      </div>
      <div id="activityLog" class="activity-log-body">
        <div class="log-line"><span class="log-time">[00:00:00]</span> <span class="log-cat">[<span data-i18n="console.sys">系统</span>]</span> <span data-i18n="console.ready">Etchloom 版画工坊就绪。</span></div>
      </div>
    </div>
  </div>
`;

export const plateWorkspaceTemplate = `
  <!-- 2. Virtual Plate Studio Workspace (Interactive Copperplate Studio) -->
  <div id="plateWorkspace" hidden class="plate-studio-wrap">
    <!-- 5-Stage Classical Printmaking Stepper -->
    <div id="plateStepper" class="plate-process-stepper">
      <div class="stepper-step active" data-step="1" id="stepTransfer">
        <span class="stepper-num">1</span>
        <span data-i18n="stepper.transfer">上版</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="2" id="stepInscribe">
        <span class="stepper-num">2</span>
        <span data-i18n="stepper.inscribe">刻绘</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="3" id="stepEtch">
        <span class="stepper-num">3</span>
        <span data-i18n="stepper.etch">腐蚀</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="4" id="stepInk">
        <span class="stepper-num">4</span>
        <span data-i18n="stepper.ink">填墨</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="5" id="stepPrint">
        <span class="stepper-num">5</span>
        <span data-i18n="stepper.print">试印</span>
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
        <span class="resolution-label" data-i18n="plate.resLabel">物理网格:</span>
        <button class="res-btn" data-res="900">900px</button>
        <button class="res-btn active" data-res="1500">1500px (2K)</button>
        <button class="res-btn" data-res="3000">3000px (3K)</button>
      </div>

      <!-- Plate Fullscreen Button -->
      <button id="plateFullscreenBtn" class="btn-plate-fullscreen" data-i18n-title="plate.fullscreenTitle" data-i18n="plate.fullscreen">⛶ 全屏特写</button>

      <!-- Unified Acid Bite Console -->
      <div class="acid-console-wrap">
        <button id="etchBtn" class="primary btn-etch-top" data-i18n="sec.3.startAcid">开始腐蚀</button>
        <!-- Backward compatibility elements for tests -->
        <button id="etchTopBtn" hidden></button>
        <div id="plateAcidGauge" class="gauge-badge">腐蚀 0.0s · 深度 0.0μm</div>
        <span id="timerBadge" hidden>腐蚀累计 0.0 s</span>
        <span id="timer" hidden>腐蚀累计 0.0 s</span>
      </div>
    </div>

    <!-- High-Resolution Plate Canvas Frame (Default 1500x1100 2K) -->
    <div class="plate-canvas-frame" id="plateCanvasFrame">
      <div class="plate-canvas-actions">
        <button id="plateCanvasInspectBtn" class="card-btn btn-inspect-layer" data-i18n-title="card.clickInspect">⛶ <span data-i18n="card.inspect">全屏特写</span></button>
      </div>
      <canvas id="canvas" width="1500" height="1100" aria-label="数字铜版绘图区"></canvas>
    </div>

    <!-- Studio Caption & Telemetry -->
    <div class="plate-caption">
      <span id="caption" data-i18n="caption.plate">针尖划开保护层，等待酸液咬蚀</span>
      <span id="status" class="telemetry-status-val" data-i18n="status.ready">运行就绪</span>
    </div>
  </div>
`;

export const telemetryFooterTemplate = `
  <footer class="telemetry-footer">
    <div class="u-flex-gap-2">
      <button id="activityLogToggle" class="card-btn log-drawer-trigger btn-compact-pad">📋 <span data-i18n="console.title">运行日志</span></button>
      <span><span data-i18n="telemetry.status">状态</span>: <span id="telemetryStatus" class="telemetry-status-val" data-i18n="status.ready">运行就绪</span></span> |
      <span><span data-i18n="telemetry.task">活跃任务</span>: <span id="telemetryTask" class="telemetry-status-val">IDLE</span></span> |
      <span><span data-i18n="telemetry.duration">总耗时</span>: <span id="telemetryDuration" class="telemetry-status-val">0ms</span></span> |
      <span><span data-i18n="telemetry.strokes">矢量线条</span>: <span id="telemetryStrokes" class="telemetry-status-val">0 条</span></span> |
      <span><span data-i18n="telemetry.cache">拓扑缓存命中</span>: <span id="telemetryCache" class="telemetry-status-val">0/5</span></span>
    </div>
    <div class="u-ml-auto">
      <span class="telemetry-brand">Etchloom v2.0 Atelier</span>
    </div>
  </footer>
`;

export const modalsTemplate = `
  <!-- True Fullscreen Viewport (全屏沉浸式特写画廊，全屏饱满铺满，彻底消除卡片框束缚) -->
  <div id="modalOverlay" class="fullscreen-viewport-overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalDescription" hidden>
    <!-- Floating Translucent Control Header Capsule -->
    <header class="fullscreen-floating-header">
      <div class="fullscreen-header-info">
        <h3 id="modalTitle" class="fullscreen-title" data-i18n="lightbox.inspect">特写检查</h3>
        <span id="modalDescription" class="fullscreen-meta"></span>
      </div>
      <div class="fullscreen-toolbar">
        <button id="lightboxZoomOut" class="fullscreen-btn" data-i18n-title="lightbox.zoomOut">−</button>
        <span id="lightboxZoomLevel" class="fullscreen-zoom-badge">100%</span>
        <button id="lightboxZoomIn" class="fullscreen-btn" data-i18n-title="lightbox.zoomIn">+</button>
        <button id="lightboxFit" class="fullscreen-btn" data-i18n-title="lightbox.fitTitle" data-i18n="lightbox.fit">自适应</button>
        <button id="lightboxReset" class="fullscreen-btn" data-i18n-title="lightbox.resetTitle" data-i18n="lightbox.reset">1:1</button>
        <button id="lightboxNativeFs" class="fullscreen-btn" data-i18n-title="lightbox.nativeFsTitle" data-i18n="lightbox.nativeFs">⛶ 全屏</button>
        <button id="modalClose" class="fullscreen-btn fullscreen-close-btn" data-i18n-title="lightbox.closeTitle">✕</button>
      </div>
    </header>

    <!-- Edge-to-Edge Fullscreen Canvas/Vector Viewport -->
    <div id="modalViewportWrap" class="fullscreen-canvas-viewport">
      <canvas id="modalCanvas" class="fullscreen-canvas"></canvas>
      <div id="modalSvgWrap" class="fullscreen-svg-wrap" hidden></div>
    </div>
  </div>

  <!-- Transfer Wizard Modal (M1 & M3: 图稿上版工艺向导) -->
  <div id="transferModalOverlay" class="etchloom-modal-overlay transfer-modal-overlay" hidden>
    <div class="etchloom-modal transfer-wizard-modal">
      <div class="modal-header">
        <div class="u-flex-gap-2">
          <h3 class="modal-title" data-i18n="wizard.title">母版图稿上版向导</h3>
          <span class="badge badge-gold badge-caption" data-i18n="wizard.badge">M1 → M3 物理转录</span>
        </div>
        <button id="transferModalClose" class="card-btn btn-compact-pad">✕</button>
      </div>
      <div class="modal-body wizard-modal-body">
        <div id="wizardStats" class="wizard-stats-box" data-i18n="wizard.statsReady">
          当前就绪母版: 检测中...
        </div>

        <!-- Section 1: 工艺技法 -->
        <div class="wizard-group">
          <label class="wizard-label" data-i18n="wizard.sec1">
            1. 选择雕刻转录工艺技法:
          </label>
          <div class="wizard-radio-grid wizard-radio-grid-2">
            <label class="wizard-card wizard-card-label active">
              <input type="radio" name="transferTechnique" value="etching" checked class="u-mt-1">
              <div>
                <strong class="wizard-item-title" data-i18n="wizard.etchingTitle">蚀刻针划线 (Etching)</strong>
                <span class="wizard-item-desc" data-i18n="wizard.etchingDesc">划破表面防蚀防酸保护漆，等待酸液咬蚀形成深沟。</span>
              </div>
            </label>
            <label class="wizard-card wizard-card-label">
              <input type="radio" name="transferTechnique" value="drypoint" class="u-mt-1">
              <div>
                <strong class="wizard-item-title" data-i18n="wizard.drypointTitle">干刻直刻 (Drypoint)</strong>
                <span class="wizard-item-desc" data-i18n="wizard.drypointDesc">锋利钢针直接切削铜板，边缘翻起金属毛刺，暗部极深润。</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Section 2: 目标物理铜版规格 -->
        <div class="wizard-group">
          <label class="wizard-label" data-i18n="wizard.sec2">
            2. 目标物理铜版规格:
          </label>
          <div class="wizard-radio-grid wizard-radio-grid-3">
            <label class="wizard-card wizard-card-center">
              <input type="radio" name="transferRes" value="900">
              <strong class="wizard-spec-title">900 × 660</strong>
              <span class="wizard-spec-sub" data-i18n="wizard.resStandard">标准轻量</span>
            </label>
            <label class="wizard-card wizard-card-center active">
              <input type="radio" name="transferRes" value="1500" checked>
              <strong class="wizard-spec-title wizard-highlight">1500 × 1100</strong>
              <span class="wizard-spec-sub" data-i18n="wizard.res2k">2K 高清 (推荐)</span>
            </label>
            <label class="wizard-card wizard-card-center">
              <input type="radio" name="transferRes" value="3000">
              <strong class="wizard-spec-title">3000 × 2200</strong>
              <span class="wizard-spec-sub" data-i18n="wizard.res3k">3K 展品级</span>
            </label>
          </div>
        </div>

        <!-- Section 3: 转移图层选择 -->
        <div class="wizard-group">
          <label class="wizard-label" data-i18n="wizard.sec3">
            3. 选择转录矢量图层:
          </label>
          <div class="wizard-radio-grid wizard-radio-grid-3">
            <label class="wizard-card wizard-card-center active">
              <input type="radio" name="transferLayer" value="all" checked>
              <strong class="wizard-spec-title" data-i18n="wizard.layerAll">全部母版图稿</strong>
              <span id="wizardAllCount" class="wizard-spec-sub" data-i18n="wizard.layerAllSub">全部矢量线条</span>
            </label>
            <label class="wizard-card wizard-card-center">
              <input type="radio" name="transferLayer" value="contours">
              <strong class="wizard-spec-title" data-i18n="wizard.layerContours">仅空间轮廓</strong>
              <span id="wizardContoursCount" class="wizard-spec-sub" data-i18n="wizard.layerContoursSub">骨干轮廓线</span>
            </label>
            <label class="wizard-card wizard-card-center">
              <input type="radio" name="transferLayer" value="hatching">
              <strong class="wizard-spec-title" data-i18n="wizard.layerHatching">仅曲面排线</strong>
              <span id="wizardHatchingCount" class="wizard-spec-sub" data-i18n="wizard.layerHatchingSub">细密顺形排线</span>
            </label>
          </div>
        </div>

        <!-- Section 4: 针尖下压力度 -->
        <div class="wizard-group">
          <div class="wizard-range-row">
            <label for="wizardNeedlePressure" class="wizard-label" data-i18n="wizard.sec4">4. 针尖刻划下压力度:</label>
            <output id="wizardNeedlePressureVal" class="wizard-output-mono">65%</output>
          </div>
          <input type="range" id="wizardNeedlePressure" min="10" max="100" value="65" class="u-w-full">
        </div>

        <!-- Buttons -->
        <div class="wizard-footer-actions">
          <button id="transferCancelBtn" class="card-btn btn-transfer-pad" data-i18n="action.cancel">取消</button>
          <button id="transferConfirmBtn" class="primary btn-transfer-pad" data-i18n="wizard.confirmBtn">确认转入铜版并刻绘 →</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Backward Compatibility Alias Container for Legacy IDs -->
  <div id="transferWizardOverlay" hidden></div>
  <button id="closeTransferWizardBtn" hidden></button>
  <button id="confirmTransferBtn" hidden></button>

  <!-- About Modal Dialog -->
  <div id="aboutModalOverlay" class="etchloom-modal-overlay" hidden>
    <div class="etchloom-modal about-modal">
      <div class="modal-header">
        <h3 class="modal-title" data-i18n="about.title">关于 Etchloom</h3>
        <button id="aboutClose" class="card-btn btn-compact-pad">✕</button>
      </div>
      <div class="modal-body about-modal-body">
        <p data-i18n-html="about.p1"><strong>Etchloom</strong> 是一套面向计算机图形学与计算摄影的数字古典铜版画工作室系统。</p>
        <p data-i18n-html="about.p2">系统完全基于纯数学几何管线与连续物理介质数值模拟，解耦实现五阶段离散数学管线、PDE 酸液侧向咬蚀与凹版压印光影着色。</p>
        <p class="about-meta-text" data-i18n-html="about.meta">版本：v2.0.0 (Decoupled Pure ESM Architecture)<br>许可证：MIT License</p>
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
