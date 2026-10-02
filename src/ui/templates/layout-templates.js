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
        <p class="brand-subtitle" data-i18n="app.subtitle">数字古典版画工坊</p>
      </div>
    </div>

    <!-- Two-Stage Master Stepper Navigation -->
    <nav class="master-stepper" data-i18n-aria="nav.stages" aria-label="工作阶段">
      <button id="showGenerator" class="step-pill active" data-i18n-title="nav.step1">
        <span class="step-pill-num">1</span>
        <span data-i18n="nav.step1">制作母版</span>
      </button>
      <span class="step-connector">────────</span>
      <button id="showPlate" class="step-pill" data-i18n-title="nav.step2">
        <span class="step-pill-num">2</span>
        <span data-i18n="nav.step2">蚀刻铜版</span>
      </button>
    </nav>

    <!-- Header Actions -->
    <div class="header-actions">
      <div id="languageTabs" class="language-tabs" role="tablist" data-i18n-aria="lang.label" aria-label="界面语言">
        <button type="button" class="language-tab" role="tab" data-locale="zh-CN" aria-selected="true">中文</button>
        <button type="button" class="language-tab" role="tab" data-locale="en-US" aria-selected="false">English</button>
        <button type="button" class="language-tab" role="tab" data-locale="vi-VN" aria-selected="false">Tiếng Việt</button>
      </div>
      <button id="exportScheme" class="btn-secondary" data-i18n="action.exportScheme">导出配置</button>
      <button id="aboutBtn" class="btn-secondary" data-i18n="action.about">关于</button>
    </div>
  </header>
`;

export const sidebarTemplate = `
  <aside class="app-sidebar" hidden>
    <!-- Hidden container preserved for backward compatibility -->
  </aside>
`;

export const masterWorkspaceTemplate = `
  <!-- 1. Master Workspace (Two-Stage Architecture: Hero Preview + 7-Stage Filmstrip + 3 Drawers) -->
  <div id="masterWorkspace" class="master-workspace-wrap">
    <section id="masterIntro" class="master-entry" aria-labelledby="masterIntroTitle">
      <div class="master-entry-content">
        <h2 id="masterIntroTitle" data-i18n="m1.initTitle">从照片开始</h2>
        <p data-i18n="m1.initDesc">将照片转为可上版的线条母版。</p>
        <p id="masterLoadError" class="master-load-error" role="alert" hidden></p>
        <button id="selectPhotoBtn" type="button" class="btn-sage-primary" data-i18n="cta.selectPhoto">选择照片</button>
        <button id="loadDemoBtn" type="button" class="master-demo-link" data-i18n="m1.loadDemo">试用示例图</button>
      </div>
    </section>
    <section id="masterComputing" class="master-entry" aria-live="polite" hidden>
      <div class="master-entry-content">
        <img id="masterSourcePreview" class="master-source-preview" data-i18n-alt="m1.sourcePreview" alt="原图预览" hidden>
        <h2 data-i18n="m1.compTitle">正在制作母版…</h2>
        <progress class="master-computing-progress" aria-label="正在制作母版" data-i18n-aria="m1.compTitle"></progress>
      </div>
    </section>
    <!-- Master Top Banner -->
    <div class="master-top-banner" id="masterTopBanner" data-master-result hidden>
      <div class="master-banner-info">
        <div class="master-banner-title-row">
          <h2 class="master-title-serif" data-i18n="m1.readyTitle">母版已完成</h2>
          <span id="masterStrokesBadge" class="badge badge-green font-mono" data-i18n="m1.readyCount">3,892 条矢量线条</span>
        </div>
      </div>

      <div class="master-banner-actions">
        <button id="uploadPhoto" class="btn-atelier-secondary" data-i18n="m1.changePhoto">换一张照片</button>
        <input id="photoFile" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden>
        <button id="transferToPlateBtn" class="btn-sage-primary" data-i18n="cta.transferToPlate">制作铜版 →</button>
      </div>
    </div>
    <div id="masterRedrawStatus" class="master-redraw-status" role="status" aria-live="polite" hidden>
      <span data-i18n="m1.redrawing">正在重绘母版…</span>
      <progress class="master-redraw-progress" data-i18n-aria="m1.redrawing" aria-label="正在重绘母版"></progress>
    </div>

    <!-- Master Hero Preview Viewport -->
    <div class="master-hero-viewport" id="masterHeroViewport" data-master-result hidden>
      <div class="master-hero-frame">
        <canvas id="masterHeroCanvas" class="master-hero-canvas" width="900" height="660" data-i18n-aria="m1.preview" aria-label="母版预览"></canvas>
        <div class="master-hero-footer-row font-mono">
          <span id="heroResolutionMeta">900 × 660 px</span>
          <span id="masterHeroBrandLabel" data-i18n="m1.masterLabel">上版母稿</span>
        </div>
      </div>

      <!-- Floating Action Capsule -->
      <div class="floating-action-capsule">
        <button id="heroInspectBtn" data-i18n="card.inspect">全屏特写</button>
        <span class="u-text-muted">|</span>
        <button id="heroExportBtn" data-i18n="card.download">导出母版 SVG</button>
      </div>
    </div>

    <!-- Section: 7-Stage Pipeline Filmstrip Viewport -->
    <details id="filmstripDetails" class="filmstrip-drawer" data-master-result hidden>
      <summary class="filmstrip-summary">
        <div class="filmstrip-summary-left">
          <span data-i18n="m1.filmstripTitle">查看制作过程</span>
        </div>
        <span class="u-text-muted font-mono" aria-hidden="true">▾</span>
      </summary>

      <!-- Horizontal Scrollable Filmstrip Container -->
      <div class="filmstrip-scroll">
        <div id="stepFlowGridContainer"></div>
      </div>
    </details>

    <!-- Section: Full Inventory of 25 Parameters in 3 Drawers -->
    <div class="param-drawers-container" data-master-result hidden>
      <!-- Drawer 1: 常用外观效果 (3 项默认折叠) -->
      <details class="param-drawer">
        <summary>
          <span data-i18n="m1.drawerAppearance">外观调整</span>
          <span class="u-text-muted font-mono" aria-hidden="true">▾</span>
        </summary>
        <div class="param-grid-3">
          <div>
            <label for="frameStyle"><span data-i18n="sec.2.frame">版画外框</span></label>
            <select id="frameStyle">
              <option value="double" selected data-i18n="frame.double">双层古典边框</option>
              <option value="fine" data-i18n="frame.fine">单线精细刻框</option>
              <option value="rough" data-i18n="frame.rough">手工古拙边框</option>
              <option value="none" data-i18n="frame.none">无外框</option>
            </select>
          </div>
          <div>
            <label for="density"><span data-i18n="sec.2.hatch">排线密度</span> <output id="densityVal">80%</output></label>
            <input id="density" type="range" min="0" max="100" value="80">
          </div>
          <div>
            <label for="needleWidth"><span data-i18n="sec.1.width">轮廓刀宽</span> <output id="needleWidthVal">0.8 mm</output></label>
            <input id="needleWidth" type="range" min="1" max="30" value="8">
          </div>
        </div>
      </details>

      <!-- Drawer 2: 高级光影参数 (3 项默认折叠) -->
      <details class="param-drawer">
        <summary>
          <span data-i18n="m1.drawerTone">明暗调整</span>
          <span class="u-text-muted font-mono" aria-hidden="true">▾</span>
        </summary>
        <div class="param-grid-3">
          <div>
            <label for="exposure"><span data-i18n="sec.0.exposure">曝光度</span> <output id="exposureVal">50%</output></label>
            <input id="exposure" type="range" min="0" max="100" value="50">
          </div>
          <div>
            <label for="blackPoint"><span data-i18n="sec.0.black">黑场</span> <output id="blackPointVal">0%</output></label>
            <input id="blackPoint" type="range" min="0" max="50" value="0">
          </div>
          <div>
            <label for="whitePoint"><span data-i18n="sec.0.white">白场</span> <output id="whitePointVal">100%</output></label>
            <input id="whitePoint" type="range" min="50" max="100" value="100">
          </div>
        </div>
      </details>

      <!-- Drawer 3: 专家算法参数 (5 项默认折叠) -->
      <details class="param-drawer">
        <summary>
          <span data-i18n="m1.drawerAlgorithm">进阶参数</span>
          <span class="u-text-muted font-mono" aria-hidden="true">▾</span>
        </summary>
        <div>
          <div class="param-lotus-row">
            <label class="checkbox-label">
              <input id="lotus3D" type="checkbox" checked>
              <span data-i18n="sec.0.lotus">3D几何增强</span>
              <span id="modelStatus" class="badge badge-amber u-ml-auto">检测中…</span>
            </label>
            <span class="filmstrip-tip" data-i18n="m1.lotusDesc">分析物体曲率张量，驱动排线顺形环绕</span>
          </div>
          <div class="param-grid-4">
            <div>
              <label for="contourDetail"><span data-i18n="sec.1.contour">轮廓密度</span> <output id="contourDetailVal">75%</output></label>
              <input id="contourDetail" type="range" min="0" max="100" value="75">
            </div>
            <div>
              <label for="aerialStrength"><span data-i18n="sec.1.aerial">透视强度</span> <output id="aerialStrengthVal">60%</output></label>
              <input id="aerialStrength" type="range" min="0" max="100" value="60">
            </div>
            <div>
              <label for="curvatureGate"><span data-i18n="sec.2.gate">曲率门控</span> <output id="curvatureGateVal">70%</output></label>
              <input id="curvatureGate" type="range" min="0" max="100" value="70">
            </div>
            <div>
              <label for="crossHatch"><span data-i18n="sec.2.cross">交叉排线</span> <output id="crossHatchVal">65%</output></label>
              <input id="crossHatch" type="range" min="0" max="100" value="65">
            </div>
          </div>
        </div>
      </details>
    </div>

    <!-- Atelier Slide-up Activity Log Console -->
    <div id="activityLogWrap" class="activity-log-wrap collapsed" data-master-result hidden>
      <div class="activity-log-header">
        <span class="log-title" data-i18n="console.title">运行日志</span>
        <span id="logStatusBadge" class="badge badge-green">IDLE</span>
        <button id="clearLogBtn" class="card-btn btn-compact-pad u-ml-auto" data-i18n="action.clearLog">清空日志</button>
        <span id="logToggleIndicator" class="log-toggle-arrow">▲</span>
      </div>
      <div id="activityLog" class="activity-log-body">
        <div class="log-line"><span class="log-time">[00:00:00]</span> <span class="log-cat">[<span data-i18n="console.sys">系统</span>]</span> <span data-i18n="console.ready">Etchloom 版画工坊就绪。</span></div>
      </div>
    </div>
  </div>
`;

export const plateWorkspaceTemplate = `
  <!-- 2. Virtual Plate Studio Workspace (Two-Stage Architecture: Sub-Stepper + Dynamic Substage Panels) -->
  <div id="plateWorkspace" hidden class="plate-studio-wrap-v2">
    <!-- Sub-Stepper Top Bar -->
    <div class="plate-sub-header">
      <div class="plate-process-stepper" id="plateStepper">
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
        <div class="stepper-step" data-step="4" id="stepPrint">
          <span class="stepper-num">4</span>
          <span data-i18n="stepper.print">试印</span>
        </div>
      </div>

      <button id="backToMasterBtn" class="btn-link-atelier" data-i18n="m2.backToMaster">
        ← 查看母版
      </button>
    </div>

    <!-- Main Workspace Body: Dynamic Left Sidebar + Right Canvas Area -->
    <div class="plate-body">
      <!-- Dynamic Left Sidebar with 4 Stage Panels (Mobile: Bottom Sheet) -->
      <aside class="plate-sidebar" id="plateSidebar">
        <div class="bottom-sheet-drag-handle" id="plateSheetHandle" data-i18n-aria="sheet.toggle" aria-label="切换面板展开"></div>
        <!-- Panel 1: 工序 1 · 图稿上版 -->
        <div id="plateStagePanel1" class="plate-stage-panel active">
          <div>
            <h3 class="plate-stage-title-serif" data-i18n="m2.step1Title">选择上版方式</h3>
            <p class="plate-stage-desc" data-i18n="m2.step1Desc">先转入母版线条，再亲手刻绘。</p>

            <div class="plate-master-stats-card">
              <div>
                <div class="u-text-bold" data-i18n="m2.currentMaster">母版线条</div>
                <div id="plateMasterStats" class="font-mono u-text-gold" data-i18n="m2.currentMasterLines">3,892 矢量线条</div>
              </div>
            </div>

            <div class="wizard-radio-grid wizard-radio-grid-2">
              <label class="wizard-card wizard-card-label active">
                <input type="radio" name="stageTransferTechnique" value="etching" checked>
                <div>
                  <strong class="wizard-item-title" data-i18n="wizard.etchingTitle">标准蚀刻针划线 (推荐)</strong>
                  <span class="wizard-item-desc" data-i18n="wizard.etchingDesc">划破防酸保护漆暴露裸铜(刻深 0μm)，进入工序2手工补线或补漆修抹。</span>
                </div>
              </label>
              <label class="wizard-card wizard-card-label">
                <input type="radio" name="stageTransferTechnique" value="drypoint">
                <div>
                  <strong class="wizard-item-title" data-i18n="wizard.drypointTitle">干刻直刻 (Drypoint)</strong>
                  <span class="wizard-item-desc" data-i18n="wizard.drypointDesc">钢针直接在铜板起毛刺，进入工序2亲手在暗部反复深切加重。</span>
                </div>
              </label>
            </div>

          </div>

          <div class="u-pt-3 u-border-t">
            <button id="panel1ConfirmBtn" class="btn-sage-primary u-w-full" data-i18n="cta.confirmTransfer">上版，开始刻绘 →</button>
            <button id="openTransferWizardBtn" class="btn-atelier-secondary u-w-full u-mt-2" data-i18n="sec.3.wizardBtn">调整上版细节</button>
          </div>
        </div>

        <!-- Panel 2: 工序 2 · 刻绘修版 -->
        <div id="plateStagePanel2" class="plate-stage-panel">
          <div>
            <h3 class="plate-stage-title-serif" data-i18n="m2.step2Title">亲手刻绘</h3>
            <p class="plate-stage-desc" data-i18n="m2.step2Desc">在铜版上补线或修整刻痕。</p>

            <div class="tools">
              <button class="active" data-tool="needle" data-i18n="tool.needle">刻针</button>
              <button data-tool="polish" data-i18n="tool.polish">刮磨器</button>
            </div>

            <label for="size"><span data-i18n="sec.3.size">工具直径</span> <output id="sizeValue">4 px</output></label>
            <input id="size" type="range" min="1" max="50" value="4">

            <div class="row u-mt-2">
              <button id="undo" class="btn-atelier-secondary" data-i18n="action.undo">撤销刻线</button>
              <button id="clear" class="btn-atelier-secondary" data-i18n="action.clear">清空版面</button>
            </div>

            <details class="param-drawer u-mt-3">
              <summary class="u-text-secondary">
                <span data-i18n="m2.moreTools">更多工具</span>
              </summary>
              <div class="u-mt-2">
                <div class="tools">
                  <button data-tool="dry" data-i18n="tool.dry">干刻针</button>
                  <button data-tool="stop" data-i18n="tool.stop">防蚀漆</button>
                </div>
                <label class="checkbox-label u-mt-2">
                  <input id="irreversible" type="checkbox">
                  <span data-i18n="sec.3.irreversible">不可逆模式</span>
                </label>
                <button id="demo" class="btn-atelier-secondary u-w-full u-mt-2" data-i18n="action.demo">载入静物练习版</button>
              </div>
            </details>
          </div>

          <div class="u-pt-3 u-border-t">
            <button id="panel2EtchNavBtn" class="btn-sage-primary u-w-full" data-i18n="cta.startEtchNav">前往腐蚀 →</button>
          </div>
        </div>

        <!-- Panel 3: 工序 3 · 酸液腐蚀 -->
        <div id="plateStagePanel3" class="plate-stage-panel">
          <div>
            <h3 class="plate-stage-title-serif" data-i18n="m2.step3Title">控制腐蚀</h3>
            <p class="plate-stage-desc" data-i18n="m2.step3Desc">开始后可随时暂停，保留当前刻深。</p>

            <!-- Real-time Acid Metrics Card -->
            <div class="acid-metrics-box">
              <div class="row">
                <span class="u-text-secondary" data-i18n="etch.timeLabel">累计腐蚀时间</span>
                <span id="etchTimeVal" class="font-mono u-text-bold">0.0 秒</span>
              </div>
              <div class="row u-mt-1">
                <span class="u-text-secondary" data-i18n="etch.depthLabel">平均刻槽深度</span>
                <span id="etchDepthVal" class="font-mono u-text-bold">0.0 μm</span>
              </div>
              <div class="acid-progress-track">
                <div id="etchProgressBar" class="acid-progress-fill"></div>
              </div>
            </div>

            <!-- Start / Pause State Button -->
            <div class="u-mb-3">
              <button id="etchBtn" class="btn-sage-primary u-w-full" data-i18n="cta.startEtch">开始腐蚀</button>
              <!-- Backward compatibility elements for tests -->
              <button id="etch" hidden></button>
              <button id="etchTopBtn" hidden></button>
              <div id="plateAcidGauge" class="gauge-badge u-mt-2" hidden>腐蚀 0.0s · 深度 0.0μm</div>
              <span id="timerBadge" hidden>腐蚀累计 0.0 s</span>
              <span id="timer" hidden>腐蚀累计 0.0 s</span>
            </div>

            <details class="param-drawer">
              <summary class="u-text-secondary">
                <span data-i18n="etch.drawerSettings">腐蚀参数</span>
              </summary>
              <div class="u-mt-2">
                <label for="acid"><span data-i18n="sec.3.acid">酸液浓度</span> <output id="acidValue">45%</output></label>
                <input id="acid" type="range" min="1" max="100" value="45">

                <label for="grain"><span data-i18n="sec.3.grain">金相颗粒</span> <output id="grainValue">45%</output></label>
                <input id="grain" type="range" min="0" max="100" value="45">
              </div>
            </details>
          </div>

          <div class="u-pt-3 u-border-t">
              <button id="panel3ProofNavBtn" class="btn-atelier-secondary u-w-full" data-i18n="cta.toProofPrint" disabled>前往试印 →</button>
          </div>
        </div>

        <!-- Panel 4: 工序 4 · 填墨与试印 -->
        <div id="plateStagePanel4" class="plate-stage-panel">
          <div>
            <h3 class="plate-stage-title-serif" data-i18n="m2.step4Title">填墨试印</h3>
            <p class="plate-stage-desc" data-i18n="m2.step4Desc">选择纸张，检查印样。</p>

            <label for="paper" data-i18n="sec.3.paper">纸张材质</label>
            <select id="paper">
              <option value="rough" data-i18n="paper.rough">暖白 · 粗纹棉纸</option>
              <option value="smooth" data-i18n="paper.smooth">象牙白 · 细纹纸</option>
              <option value="linen" data-i18n="paper.linen">麻棉混纺纸 · 粗纹</option>
              <option value="rosaspina" data-i18n="paper.rosaspina">Rosaspina · 自然纹</option>
            </select>
            <p id="paperDescription" class="paper-description" data-i18n="paper.desc.rough">暖白色，表面纹理较明显。</p>

            <div class="u-mt-3">
              <button id="print" class="btn-sage-primary u-w-full" data-i18n="proof.download">下载印样 PNG</button>
              <button id="proofBackToEtchBtn" class="btn-atelier-secondary u-w-full u-mt-2" data-i18n="proof.backToEtch">继续腐蚀</button>
              <button id="proofBackToInscribeBtn" class="btn-atelier-secondary u-w-full u-mt-2" data-i18n="proof.backToInscribe">返回刻绘</button>
              <button id="reprintBtn" class="btn-atelier-secondary u-w-full u-mt-2" data-i18n="cta.reprint">重新试印</button>
            </div>

            <details class="param-drawer u-mt-3">
              <summary class="u-text-secondary">
                <span data-i18n="proof.drawerInking">油墨与压印设置</span>
              </summary>
              <div class="u-mt-2">
                <label for="ink"><span data-i18n="sec.3.ink">油墨饱满</span> <output id="inkValue">90%</output></label>
                <input id="ink" type="range" min="0" max="150" value="90">

                <label for="pressure"><span data-i18n="sec.3.pressure">压印压力</span> <output id="pressureValue">65%</output></label>
                <input id="pressure" type="range" min="0" max="100" value="65">

                <label for="tone"><span data-i18n="sec.3.plateTone">留墨调子</span> <output id="toneValue">4%</output></label>
                <input id="tone" type="range" min="0" max="35" value="4">

                <label for="plateFrameStyle" data-i18n="sec.3.frame">印样外框</label>
                <select id="plateFrameStyle">
                  <option value="double" selected data-i18n="frame.double">双层古典边框</option>
                  <option value="fine" data-i18n="frame.fine">单线精细刻框</option>
                  <option value="rough" data-i18n="frame.rough">手工古拙边框</option>
                  <option value="none" data-i18n="frame.none">无外框</option>
                </select>

                <div class="row u-mt-2">
                  <button id="save" class="btn-atelier-secondary" data-i18n="action.save">保存虚拟版</button>
                  <button id="load" class="btn-atelier-secondary" data-i18n="action.load">打开虚拟版</button>
                </div>
                <input id="file" type="file" accept="application/json,.json" hidden>
              </div>
            </details>
          </div>

        </div>
      </aside>

      <!-- Right Main Workspace Canvas Frame -->
      <main class="plate-main">
        <!-- Workbench Controls Bar -->
        <div class="plate-top-bar u-w-full">
          <!-- View Modes -->
          <div class="view-tabs">
            <button class="active" data-view="plate" data-i18n="view.plate">虚拟铜版</button>
            <button data-view="depth" data-i18n="view.depth">刻深图</button>
            <button data-view="print" data-i18n="view.print">压印预览</button>
          </div>

          <!-- Current plate resolution; change it through the guarded transfer flow. -->
          <div class="resolution-selector">
            <span class="resolution-label" data-i18n="plate.resLabel">当前精度</span>
            <output id="plateResolutionValue">900 × 660</output>
          </div>

          <!-- Plate Fullscreen Button -->
          <button id="plateFullscreenBtn" class="btn-plate-fullscreen" data-i18n-title="plate.fullscreenTitle" data-i18n="plate.fullscreen">⛶ 全屏特写</button>
        </div>

        <!-- Plate canvas starts at 900 x 660; transfer can allocate a higher resolution. -->
        <div class="plate-canvas-frame" id="plateCanvasFrame">
          <div class="plate-canvas-actions">
            <button id="plateCanvasInspectBtn" class="card-btn btn-inspect-layer" data-i18n-title="card.clickInspect">⛶ <span data-i18n="card.inspect">全屏特写</span></button>
          </div>
          <canvas id="canvas" width="900" height="660" data-i18n-aria="m2.canvas" aria-label="铜版绘图区"></canvas>
        </div>

        <!-- Studio Caption & Telemetry -->
        <div class="plate-caption">
          <span id="caption" class="plate-caption-text" data-i18n="caption.plate">针尖划开保护层，等待酸液咬蚀</span>
          <span id="status" class="plate-caption-status telemetry-status-val" data-i18n="status.ready">运行就绪</span>
        </div>
      </main>
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
      <span class="telemetry-brand">Etchloom</span>
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

        <div class="wizard-group">
          <div class="wizard-range-row">
            <label for="wizardLineWidth" class="wizard-label" data-i18n="wizard.lineWidth">上版线宽</label>
            <output id="wizardLineWidthVal" class="wizard-output-mono">100%</output>
          </div>
          <input type="range" id="wizardLineWidth" min="50" max="200" step="10" value="100" class="u-w-full">
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

  <!-- Re-transfer Overwrite Modal (再次上版覆写安全拦截模态) -->
  <div id="retransferModalOverlay" class="etchloom-modal-overlay" hidden>
    <div class="etchloom-modal retransfer-modal">
      <div class="modal-icon-badge">!</div>
      <h3 class="modal-title font-serif-title" data-i18n="dialog.retransferTitle">重新上版将覆写当前铜版</h3>
      <p class="modal-body-text" data-i18n="dialog.retransferDesc">当前铜版已包含手工刻绘痕迹或酸液咬蚀深度。再次执行上版将以新母版重写并清空当前版面数据。</p>
      <div class="modal-footer-column">
        <div class="modal-button-row">
          <button id="retransferCancelBtn" class="btn-atelier-secondary" data-i18n="dialog.cancel">取消 (保留当前铜版)</button>
          <button id="retransferSaveBtn" class="btn-sage-primary" data-i18n="dialog.saveAndOverwrite">备份保存当前版并覆盖</button>
        </div>
        <button id="retransferDirectBtn" class="btn-link-danger" data-i18n="dialog.directOverwrite">直接清空覆盖 (不备份) →</button>
      </div>
    </div>
  </div>

  <!-- About Modal Dialog -->
  <div id="aboutModalOverlay" class="etchloom-modal-overlay" hidden>
    <div class="etchloom-modal about-modal" role="dialog" aria-modal="true" aria-labelledby="aboutTitle">
      <div class="modal-header">
        <h3 id="aboutTitle" class="modal-title" data-i18n="about.title">关于 Etchloom</h3>
        <button id="aboutClose" class="card-btn btn-compact-pad" type="button" data-i18n-aria="about.close" aria-label="关闭关于页面">✕</button>
      </div>
      <div class="modal-body about-modal-body">
        <p class="about-intro" data-i18n="about.intro">Etchloom 将照片转为线条母版，再让你亲手制作铜版与试印。</p>
        <div class="about-stages">
          <section>
            <span class="about-step-number">01</span>
            <h4 data-i18n="about.stage1Title">制作母版</h4>
            <p data-i18n="about.stage1Body">选择照片，调整线条，检查生成的母版。</p>
          </section>
          <section>
            <span class="about-step-number">02</span>
            <h4 data-i18n="about.stage2Title">蚀刻铜版</h4>
            <p data-i18n="about.stage2Body">将母版上版，亲手刻绘、腐蚀，并在不同纸张上试印。</p>
          </section>
        </div>
        <div class="about-details">
          <section>
            <h4 data-i18n="about.guideTitle">操作提示</h4>
            <ul>
              <li data-i18n="about.guide1">从示例或自己的照片开始。</li>
              <li data-i18n="about.guide2">上版前可调整铜版精度和转录线宽。</li>
              <li data-i18n="about.guide3">刻绘时可调整笔触宽度；试印前可选择纸张。</li>
            </ul>
          </section>
          <section>
            <h4 data-i18n="about.outputTitle">保存与导出</h4>
            <p data-i18n="about.outputBody">可导出母版 SVG、下载试印 PNG，并保存铜版进度。</p>
          </section>
        </div>
        <footer class="about-footer">
          <span class="about-meta-text" data-i18n="about.meta">开源许可：MIT</span>
          <span class="about-footer-sep" aria-hidden="true">·</span>
          <a class="about-footer-link" href="https://github.com/gongzhimin/Etchloom/releases" target="_blank" rel="noopener noreferrer" data-i18n="about.repositoryLink">下载最新</a>
          <span class="about-footer-sep" aria-hidden="true">·</span>
          <a class="about-footer-link" href="https://github.com/gongzhimin/Etchloom/issues" target="_blank" rel="noopener noreferrer" data-i18n="about.issuesLink">反馈</a>
        </footer>
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
    <main class="app-main two-stage-mode">
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
