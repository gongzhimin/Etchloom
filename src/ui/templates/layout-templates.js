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
      <button id="langToggle" class="btn-secondary" data-i18n="lang.toggle">中 / EN</button>
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
        <span id="modelStatus" class="badge badge-amber" style="margin-left:auto">检测中…</span>
      </label>

      <label><span data-i18n="sec.0.exposure">曝光度</span> <output id="exposureVal">50%</output></label>
      <input id="exposure" type="range" min="0" max="100" value="50">

      <label><span data-i18n="sec.0.black">黑场</span> <output id="blackPointVal">0%</output></label>
      <input id="blackPoint" type="range" min="0" max="50" value="0">

      <label><span data-i18n="sec.0.white">白场</span> <output id="whitePointVal">100%</output></label>
      <input id="whitePoint" type="range" min="50" max="100" value="100">
    </section>

    <!-- Drawer 01: 空间轮廓 -->
    <section id="drawer1">
      <h2 class="drawer-title" data-i18n="sec.1.title">01 / 空间轮廓</h2>
      <label><span data-i18n="sec.1.contour">轮廓密度</span> <output id="contourDetailVal">75%</output></label>
      <input id="contourDetail" type="range" min="0" max="100" value="75">

      <label><span data-i18n="sec.1.aerial">透视强度</span> <output id="aerialStrengthVal">60%</output></label>
      <input id="aerialStrength" type="range" min="0" max="100" value="60">

      <label><span data-i18n="sec.1.width">轮廓刀宽</span> <output id="needleWidthVal">0.8 mm</output></label>
      <input id="needleWidth" type="range" min="1" max="30" value="8">
    </section>

    <!-- Drawer 02: 曲面排线 -->
    <section id="drawer2">
      <h2 class="drawer-title" data-i18n="sec.2.title">02 / 曲面排线</h2>
      <label><span data-i18n="sec.2.hatch">排线密度</span> <output id="densityVal">80%</output></label>
      <input id="density" type="range" min="0" max="100" value="80">

      <label><span data-i18n="sec.2.gate">曲率门控</span> <output id="curvatureGateVal">70%</output></label>
      <input id="curvatureGate" type="range" min="0" max="100" value="70">

      <label><span data-i18n="sec.2.cross">交叉排线</span> <output id="crossHatchVal">65%</output></label>
      <input id="crossHatch" type="range" min="0" max="100" value="65">
    </section>

    <!-- Drawer 03: 铜版工坊 -->
    <section id="drawer3">
      <h2 class="drawer-title" data-i18n="sec.3.title">03 / 铜版工坊</h2>

      <!-- Process A: 图稿上版 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 A · 上版</div>
        <button id="openTransferWizardBtn" class="primary" style="margin-top:4px;">图稿上版向导...</button>
      </div>

      <!-- Process B: 版面刻绘与修版 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 B · 刻绘修版</div>
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
        <div class="drawer-subgroup-title">工序 C · 酸液腐蚀</div>
        <label><span data-i18n="sec.3.acid">酸液浓度</span> <output id="acidValue">45%</output></label>
        <input id="acid" type="range" min="1" max="100" value="45">

        <label><span data-i18n="sec.3.grain">金相颗粒</span> <output id="grainValue">45%</output></label>
        <input id="grain" type="range" min="0" max="100" value="45">

        <label class="checkbox-label" style="margin-top:8px">
          <input id="irreversible" type="checkbox">
          <span data-i18n="sec.3.irreversible">不可逆模式</span>
        </label>
        <button id="etch" hidden data-i18n="sec.3.startAcid">开始腐蚀</button>
      </div>

      <!-- Process D: 填墨与压印试印 -->
      <div class="drawer-subgroup">
        <div class="drawer-subgroup-title">工序 D · 填墨试印</div>
        <label><span data-i18n="sec.3.ink">油墨饱满</span> <output id="inkValue">90%</output></label>
        <input id="ink" type="range" min="0" max="150" value="90">

        <label><span data-i18n="sec.3.pressure">压印压力</span> <output id="pressureValue">65%</output></label>
        <input id="pressure" type="range" min="0" max="100" value="65">

        <label><span data-i18n="sec.3.plateTone">留墨调子</span> <output id="toneValue">4%</output></label>
        <input id="tone" type="range" min="0" max="35" value="4">

        <label data-i18n="sec.3.paper">纸张材质</label>
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
        <h2 data-i18n="tab.master">母版设计</h2>
        <p data-i18n="step.intro">点击卡片可全屏特写或独立导出图层。</p>
      </div>
      <button id="transferToPlateBtn" class="primary" style="width:auto;padding:8px 20px" data-i18n="action.transferToPlate">雕刻至铜版 →</button>
    </div>

    <!-- 7-Stage Adaptive Grid (2 columns x 4 rows) -->
    <div id="stepFlowGridContainer"></div>

    <!-- Atelier Slide-up Activity Log Console -->
    <div id="activityLogWrap" class="activity-log-wrap collapsed">
      <div class="activity-log-header">
        <span class="log-title" data-i18n="console.title">运行日志</span>
        <span id="logStatusBadge" class="badge badge-green">IDLE</span>
        <button id="clearLogBtn" class="card-btn" style="margin-left:auto;padding:2px 8px" data-i18n="action.clear">清空</button>
        <span id="logToggleIndicator" class="log-toggle-arrow">▲</span>
      </div>
      <div id="activityLog" class="activity-log-body">
        <div class="log-line"><span class="log-time">[00:00:00]</span> <span class="log-cat">[系统]</span> Etchloom 版画工坊就绪。</div>
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
        <span>上版</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step active" data-step="2" id="stepInscribe">
        <span class="stepper-num">2</span>
        <span>刻绘</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="3" id="stepEtch">
        <span class="stepper-num">3</span>
        <span>腐蚀</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="4" id="stepInk">
        <span class="stepper-num">4</span>
        <span>填墨</span>
      </div>
      <span class="stepper-arrow">→</span>
      <div class="stepper-step" data-step="5" id="stepPrint">
        <span class="stepper-num">5</span>
        <span>试印</span>
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

      <!-- Plate Fullscreen Button -->
      <button id="plateFullscreenBtn" class="btn-plate-fullscreen" title="全屏特写检查">⛶ 全屏特写</button>

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
      <span id="caption" data-i18n="caption.plate">针尖划开保护层，等待酸液咬蚀</span>
      <span id="status" class="telemetry-status-val">就绪</span>
    </div>
  </div>
`;

export const telemetryFooterTemplate = `
  <footer class="telemetry-footer">
    <div style="display:flex;align-items:center;gap:10px;">
      <button id="activityLogToggle" class="card-btn log-drawer-trigger" style="padding:2px 8px;font-size:11px;">📋 <span data-i18n="console.title">运行日志</span></button>
      <span><span data-i18n="telemetry.status">状态</span>: <span id="telemetryStatus" class="telemetry-status-val">运行就绪</span></span> |
      <span><span data-i18n="telemetry.task">活跃任务</span>: <span id="telemetryTask" class="telemetry-status-val">IDLE</span></span> |
      <span><span data-i18n="telemetry.duration">总耗时</span>: <span id="telemetryDuration" class="telemetry-status-val">0ms</span></span> |
      <span><span data-i18n="telemetry.strokes">矢量线条</span>: <span id="telemetryStrokes" class="telemetry-status-val">0 条</span></span> |
      <span><span data-i18n="telemetry.cache">拓扑缓存命中</span>: <span id="telemetryCache" class="telemetry-status-val">0/5</span></span>
    </div>
    <div style="margin-left:auto">
      <span style="color:var(--accent-gold);font-weight:600;">Etchloom v2.0 Atelier</span>
    </div>
  </footer>
`;

export const modalsTemplate = `
  <!-- Modal Dialog (Close-up & Fullscreen Lightbox) -->
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
      <div id="modalBody" class="modal-body lightbox-modal-body" style="padding:10px;">
        <div id="modalViewportWrap" class="modal-viewport-wrap lightbox-viewport">
          <canvas id="modalCanvas" class="lightbox-canvas"></canvas>
        </div>
        <div id="modalDescription" class="lightbox-desc" style="margin-top:8px;font-size:12px;color:var(--text-secondary);line-height:1.5;"></div>
      </div>
    </div>
  </div>

  <!-- Transfer Wizard Modal (M1 & M3: 图稿上版工艺向导) -->
  <div id="transferModalOverlay" class="etchloom-modal-overlay transfer-modal-overlay" hidden>
    <div class="etchloom-modal transfer-wizard-modal" style="max-width:580px;">
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <h3 class="modal-title" data-i18n="wizard.title">母版图稿上版向导</h3>
          <span class="badge badge-gold" style="font-size:11px;">M1 → M3 物理转录</span>
        </div>
        <button id="transferModalClose" class="card-btn" style="padding:2px 8px;">✕</button>
      </div>
      <div class="modal-body" style="padding:20px 24px;display:flex;flex-direction:column;gap:18px;">
        <div id="wizardStats" style="font-size:12px;color:var(--accent-gold);background:var(--bg-app);padding:10px 14px;border-radius:4px;border:1px solid var(--border-subtle);">
          当前就绪母版: 检测中...
        </div>

        <!-- Section 1: 工艺技法 -->
        <div class="wizard-group">
          <label class="wizard-label" style="display:block;font-weight:600;margin-bottom:8px;color:var(--text-primary);">
            1. 选择雕刻转录工艺技法:
          </label>
          <div class="wizard-radio-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <label class="wizard-card active" style="padding:10px 12px;background:var(--bg-app);border:1px solid var(--border-strong);border-radius:6px;cursor:pointer;display:flex;align-items:flex-start;gap:8px;">
              <input type="radio" name="transferTechnique" value="etching" checked style="margin-top:3px;">
              <div>
                <strong style="color:var(--text-primary);display:block;">蚀刻针划线 (Etching)</strong>
                <span style="font-size:11px;color:var(--text-secondary);display:block;margin-top:2px;">划破表面防蚀防酸保护漆，等待酸液咬蚀形成深沟。</span>
              </div>
            </label>
            <label class="wizard-card" style="padding:10px 12px;background:var(--bg-app);border:1px solid var(--border-subtle);border-radius:6px;cursor:pointer;display:flex;align-items:flex-start;gap:8px;">
              <input type="radio" name="transferTechnique" value="drypoint" style="margin-top:3px;">
              <div>
                <strong style="color:var(--text-primary);display:block;">干刻直刻 (Drypoint)</strong>
                <span style="font-size:11px;color:var(--text-secondary);display:block;margin-top:2px;">锋利钢针直接切削铜板，边缘翻起金属毛刺，暗部极深润。</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Section 2: 目标物理铜版规格 -->
        <div class="wizard-group">
          <label class="wizard-label" style="display:block;font-weight:600;margin-bottom:8px;color:var(--text-primary);">
            2. 目标物理铜版规格:
          </label>
          <div class="wizard-radio-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <label class="wizard-card" style="padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-subtle);border-radius:6px;cursor:pointer;text-align:center;">
              <input type="radio" name="transferRes" value="900">
              <strong style="display:block;margin-top:4px;">900 × 660</strong>
              <span style="font-size:10px;color:var(--text-muted);">标准轻量</span>
            </label>
            <label class="wizard-card active" style="padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-strong);border-radius:6px;cursor:pointer;text-align:center;">
              <input type="radio" name="transferRes" value="1500" checked>
              <strong style="display:block;margin-top:4px;color:var(--accent-gold);">1500 × 1100</strong>
              <span style="font-size:10px;color:var(--text-secondary);">2K 高清 (推荐)</span>
            </label>
            <label class="wizard-card" style="padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-subtle);border-radius:6px;cursor:pointer;text-align:center;">
              <input type="radio" name="transferRes" value="3000">
              <strong style="display:block;margin-top:4px;">3000 × 2200</strong>
              <span style="font-size:10px;color:var(--text-muted);">3K 展品级</span>
            </label>
          </div>
        </div>

        <!-- Section 3: 转移图层选择 -->
        <div class="wizard-group">
          <label class="wizard-label" style="display:block;font-weight:600;margin-bottom:8px;color:var(--text-primary);">
            3. 选择转录矢量图层:
          </label>
          <div class="wizard-radio-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            <label class="wizard-card active" style="padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-strong);border-radius:6px;cursor:pointer;text-align:center;">
              <input type="radio" name="transferLayer" value="all" checked>
              <strong style="display:block;margin-top:4px;">全部母版图稿</strong>
              <span id="wizardAllCount" style="font-size:10px;color:var(--text-secondary);">全部矢量线条</span>
            </label>
            <label class="wizard-card" style="padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-subtle);border-radius:6px;cursor:pointer;text-align:center;">
              <input type="radio" name="transferLayer" value="contours">
              <strong style="display:block;margin-top:4px;">仅空间轮廓</strong>
              <span id="wizardContoursCount" style="font-size:10px;color:var(--text-muted);">骨干轮廓线</span>
            </label>
            <label class="wizard-card" style="padding:8px 10px;background:var(--bg-app);border:1px solid var(--border-subtle);border-radius:6px;cursor:pointer;text-align:center;">
              <input type="radio" name="transferLayer" value="hatching">
              <strong style="display:block;margin-top:4px;">仅曲面排线</strong>
              <span id="wizardHatchingCount" style="font-size:10px;color:var(--text-muted);">细密顺形排线</span>
            </label>
          </div>
        </div>

        <!-- Section 4: 针尖下压力度 -->
        <div class="wizard-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label for="wizardNeedlePressure" style="font-weight:600;color:var(--text-primary);">针尖刻划下压力度:</label>
            <output id="wizardNeedlePressureVal" style="font-family:var(--font-mono);color:var(--accent-gold);">65%</output>
          </div>
          <input type="range" id="wizardNeedlePressure" min="10" max="100" value="65" style="width:100%;">
        </div>

        <!-- Buttons -->
        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:12px;padding-top:16px;border-top:1px solid var(--border-subtle);">
          <button id="transferCancelBtn" class="card-btn" style="padding:8px 20px;">取消</button>
          <button id="transferConfirmBtn" class="primary" style="padding:8px 24px;">确认转入铜版并刻绘 →</button>
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
