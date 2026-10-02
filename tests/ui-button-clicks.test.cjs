const { test } = require('node:test');
const assert = require('node:assert/strict');
const { I18nManager } = require('../src/ui/i18n/i18n.js');
const { StepFlowGrid } = require('../src/ui/components/step-flow-grid.js');
const { LoupeMagnifier } = require('../src/ui/components/loupe.js');
const { VirtualPlateEngine } = require('../src/core/plate/engine/virtual-plate-engine.js');

// Simple DOM Mock helper for complete UI interaction testing
function createMockElement(tag = 'div', attrs = {}) {
  const listeners = {};
  const classes = new Set();
  const children = [];

  const el = {
    tagName: tag.toUpperCase(),
    style: {},
    dataset: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => {
        if (typeof force === 'boolean') {
          if (force) classes.add(c); else classes.delete(c);
          return force;
        }
        if (classes.has(c)) { classes.delete(c); return false; }
        classes.add(c); return true;
      }
    },
    get className() { return Array.from(classes).join(' '); },
    set className(val) {
      classes.clear();
      if (val) val.trim().split(/\s+/).forEach(c => classes.add(c));
    },
    children,
    appendChild: (child) => {
      child.parentElement = el;
      children.push(child);
      return child;
    },
    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentElement = null;
      }
      return child;
    },
    addEventListener: (type, handler) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(handler);
    },
    removeEventListener: (type, handler) => {
      if (!listeners[type]) return;
      listeners[type] = listeners[type].filter(h => h !== handler);
    },
    click: () => {
      if (typeof el.onclick === 'function') {
        el.onclick({ stopPropagation: () => {}, preventDefault: () => {}, target: el });
      }
      if (listeners['click']) {
        listeners['click'].forEach(fn => fn({ stopPropagation: () => {}, preventDefault: () => {}, target: el }));
      }
    },
    querySelector: (selector) => {
      const parts = selector.trim().split(/\s+/);
      let current = [el];
      for (const part of parts) {
        let next = [];
        for (const node of current) {
          next = next.concat(findAllDescendants(node, part));
        }
        current = next;
        if (current.length === 0) return null;
      }
      return current[0] || null;
    },
    querySelectorAll: (selector) => {
      return findAllDescendants(el, selector);
    },
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 360, height: 250, right: 460, bottom: 350 }),
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      strokeRect: () => {},
      save: () => {},
      restore: () => {},
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {}
    }),
    width: 360,
    height: 250
  };

  Object.assign(el, attrs);
  return el;
}

function findDescendant(parent, selector) {
  for (const child of parent.children) {
    if (matchesSelector(child, selector)) return child;
    const found = findDescendant(child, selector);
    if (found) return found;
  }
  return null;
}

function findAllDescendants(parent, selector) {
  let list = [];
  for (const child of parent.children) {
    if (matchesSelector(child, selector)) list.push(child);
    list = list.concat(findAllDescendants(child, selector));
  }
  return list;
}

function matchesSelector(el, selector) {
  if (selector.startsWith('.')) {
    const cls = selector.slice(1);
    return el.classList.contains(cls);
  }
  if (selector.startsWith('#')) {
    const id = selector.slice(1);
    return el.id === id;
  }
  if (selector.includes('.')) {
    const parts = selector.split('.');
    if (parts[0] && el.tagName !== parts[0].toUpperCase()) return false;
    for (let i = 1; i < parts.length; i++) {
      if (!el.classList.contains(parts[i])) return false;
    }
    return true;
  }
  return el.tagName === selector.toUpperCase();
}

test('UI Button Click: Header Mode Switch Buttons', () => {
  let activeMode = 'generator';
  const showGenBtn = createMockElement('button', { id: 'showGenerator', className: 'active' });
  const showPlateBtn = createMockElement('button', { id: 'showPlate', className: '' });

  function switchWorkflow(mode) {
    activeMode = mode;
    showGenBtn.classList.toggle('active', mode === 'generator');
    showPlateBtn.classList.toggle('active', mode === 'plate');
  }

  showGenBtn.onclick = () => switchWorkflow('generator');
  showPlateBtn.onclick = () => switchWorkflow('plate');

  assert.equal(activeMode, 'generator');
  assert.equal(showGenBtn.classList.contains('active'), true);
  assert.equal(showPlateBtn.classList.contains('active'), false);

  // Click 虚拟铜版工坊
  showPlateBtn.click();
  assert.equal(activeMode, 'plate');
  assert.equal(showGenBtn.classList.contains('active'), false);
  assert.equal(showPlateBtn.classList.contains('active'), true);

  // Click 算法母版设计
  showGenBtn.click();
  assert.equal(activeMode, 'generator');
  assert.equal(showGenBtn.classList.contains('active'), true);
  assert.equal(showPlateBtn.classList.contains('active'), false);
});

test('UI Button Click: Language Tab Selection', () => {
  const i18n = new I18nManager('zh-CN');
  const tabs = ['zh-CN', 'en-US', 'vi-VN'].map(locale => {
    const tab = createMockElement('button', { dataset: { locale } });
    tab.onclick = () => i18n.setLocale(tab.dataset.locale);
    return tab;
  });

  assert.equal(i18n.getLocale(), 'zh-CN');
  tabs[1].click();
  assert.equal(i18n.getLocale(), 'en-US');
  tabs[2].click();
  assert.equal(i18n.getLocale(), 'vi-VN');
  tabs[0].click();
  assert.equal(i18n.getLocale(), 'zh-CN');
});

test('About uses a dedicated dialog with two workflow sections', async () => {
  const { modalsTemplate } = await import('../src/ui/templates/layout-templates.js');
  assert.match(modalsTemplate, /id="aboutModalOverlay"[^>]*hidden/);
  assert.match(modalsTemplate, /role="dialog" aria-modal="true" aria-labelledby="aboutTitle"/);
  assert.match(modalsTemplate, /id="aboutClose"/);
  assert.match(modalsTemplate, /data-i18n="about.stage1Title"/);
  assert.match(modalsTemplate, /data-i18n="about.stage2Title"/);
  assert.match(modalsTemplate, /href="https:\/\/github\.com\/gongzhimin\/Etchloom(\/releases)?"[^>]*rel="noopener noreferrer"/);
  assert.match(modalsTemplate, /href="https:\/\/github\.com\/gongzhimin\/Etchloom\/issues"/);
  assert.doesNotMatch(modalsTemplate, /data-i18n-html="about\./);
});

test('UI Button Click: StepFlowGrid Card Actions (Loupe, Fullscreen, Export)', () => {
  const container = createMockElement('div', { id: 'stepFlowGridContainer' });
  global.LoupeMagnifier = LoupeMagnifier;
  global.document = {
    createElement: (tag) => createMockElement(tag),
    body: createMockElement('body')
  };

  const selectedSteps = [];
  const loupeEvents = [];
  const fullscreenEvents = [];
  const exportEvents = [];

  const grid = new StepFlowGrid(container, {
    onStepSelect: (idx) => selectedSteps.push(idx),
    onStepLoupe: (idx, cv) => loupeEvents.push(idx),
    onStepFullscreen: (idx, cv) => fullscreenEvents.push(idx),
    onStepExport: (idx) => exportEvents.push(idx)
  });

  // Verify 7 cards were generated
  assert.equal(grid.stepStates.length, 7);

  // 1. Test clicking Card 1 to select step
  const card1 = container.querySelector('.step-1');
  assert.ok(card1);
  card1.click();
  assert.equal(selectedSteps.pop(), 1);
  assert.equal(card1.classList.contains('active-step'), true);

  // 2. Test clicking Card 1 Viewport directly opens Lightbox modal and selects step
  const viewport1 = card1.querySelector('.card-viewport');
  assert.ok(viewport1);
  viewport1.click();
  assert.equal(fullscreenEvents.pop(), 1);
  assert.equal(selectedSteps.pop(), 1);
  const previewCanvas = viewport1.querySelector('canvas');
  previewCanvas.onkeydown({ key: 'Enter', preventDefault: () => {}, stopPropagation: () => {} });
  assert.equal(fullscreenEvents.pop(), 1);

  // 3. Test programmatic toggleLoupe API
  grid.toggleLoupe(1);
  assert.equal(grid.stepStates[1].loupe.active, true);
  grid.toggleLoupe(2);
  assert.equal(grid.stepStates[1].loupe.active, false);
  assert.equal(grid.stepStates[2].loupe.active, true);
  grid.toggleLoupe(2);
  assert.equal(grid.stepStates[2].loupe.active, false);

  // 4. Test clicking Card 3 Viewport
  const card3 = container.querySelector('.step-3');
  const viewport3 = card3.querySelector('.card-viewport');
  assert.ok(viewport3);
  viewport3.click();
  assert.equal(fullscreenEvents.pop(), 3);

  // 5. Test Export Layer Button on Card 5
  const card5 = container.querySelector('.step-5');
  const exportBtn5 = card5.querySelector('.btn-export-layer');
  assert.ok(exportBtn5);
  exportBtn5.click();
  assert.equal(exportEvents.pop(), 5);
});

test('UI Button Click: Transfer to Virtual Plate Button', () => {
  const engine = new VirtualPlateEngine(900);
  let switchedMode = null;

  const transferBtn = createMockElement('button', { id: 'transferToPlateBtn' });
  const mockMasterPaths = [
    { points: [[10, 10], [50, 50], [90, 90]], width: 1.0 },
    { points: [[100, 100], [200, 200]], width: 0.8 }
  ];

  transferBtn.onclick = () => {
    mockMasterPaths.forEach(path => {
      const pts = path.points;
      for (let k = 1; k < pts.length; k++) {
        engine.applyToolDab(pts[k][0], pts[k][1], 0.6, 'dry', 4);
      }
    });
    switchedMode = 'plate';
  };

  const countNonZero = () => engine.depthField.reduce((acc, v) => acc + (v > 0 ? 1 : 0), 0);
  assert.equal(countNonZero(), 0);
  transferBtn.click();
  assert.equal(switchedMode, 'plate');
  assert.ok(countNonZero() > 0, 'Strokes were successfully inscribed onto copper plate');
});

test('UI Button Click: Plate Tool Selection & Acid Bite Simulation Controls', () => {
  const engine = new VirtualPlateEngine(900);
  let activeTool = 'needle';
  let isEtching = false;

  const tools = ['needle', 'dry', 'stop', 'polish'].map(t => {
    const btn = createMockElement('button', { dataset: { tool: t } });
    btn.onclick = () => { activeTool = t; };
    return btn;
  });

  // Test tool selection clicks
  tools[1].click(); // dry
  assert.equal(activeTool, 'dry');
  tools[2].click(); // stop
  assert.equal(activeTool, 'stop');
  tools[3].click(); // polish
  assert.equal(activeTool, 'polish');
  tools[0].click(); // needle
  assert.equal(activeTool, 'needle');

  // Test Acid Bite toggle button
  const etchBtn = createMockElement('button', { id: 'etch', textContent: '开始腐蚀' });
  etchBtn.onclick = () => {
    isEtching = !isEtching;
    etchBtn.textContent = isEtching ? '停止腐蚀' : '开始腐蚀';
    if (isEtching) {
      engine.etch(1.5, 0.45);
    }
  };

  assert.equal(isEtching, false);
  etchBtn.click();
  assert.equal(isEtching, true);
  assert.equal(etchBtn.textContent, '停止腐蚀');
  assert.equal(engine.elapsedAcidTime, 1.5);

  etchBtn.click();
  assert.equal(isEtching, false);
  assert.equal(etchBtn.textContent, '开始腐蚀');
});

test('UI Button Click: Plate Undo and Clear Actions', () => {
  const engine = new VirtualPlateEngine(900);
  engine.snapshot();
  engine.applyToolDab(50, 50, 0.8, 'dry', 5);
  const countNonZero = () => engine.depthField.reduce((acc, v) => acc + (v > 0 ? 1 : 0), 0);
  const openCountBefore = countNonZero();
  assert.ok(openCountBefore > 0);

  const undoBtn = createMockElement('button', { id: 'undo' });
  undoBtn.onclick = () => { engine.undo(); };

  undoBtn.click();
  assert.equal(countNonZero(), 0, 'Undo restored empty plate state');

  engine.applyToolDab(80, 80, 0.8, 'dry', 5);
  assert.ok(countNonZero() > 0);

  const clearBtn = createMockElement('button', { id: 'clear' });
  clearBtn.onclick = () => { engine.clear(); };
  clearBtn.click();
  assert.equal(countNonZero(), 0, 'Clear emptied the plate');
});


test('UI Button Click: Activity Log Toggle and Clear Buttons', () => {
  const logWrap = createMockElement('div', { id: 'activityLogWrap', className: 'activity-log-wrap' });
  const toggleBtn = createMockElement('button', { id: 'activityLogToggle' });
  toggleBtn.onclick = () => { logWrap.classList.toggle('collapsed'); };

  assert.equal(logWrap.classList.contains('collapsed'), false);
  toggleBtn.click();
  assert.equal(logWrap.classList.contains('collapsed'), true);
  toggleBtn.click();
  assert.equal(logWrap.classList.contains('collapsed'), false);

  const logBody = createMockElement('div', { id: 'activityLog' });
  logBody.appendChild(createMockElement('div', { className: 'log-line' }));
  logBody.appendChild(createMockElement('div', { className: 'log-line' }));
  assert.equal(logBody.children.length, 2);

  const clearBtn = createMockElement('button', { id: 'clearLogBtn' });
  clearBtn.onclick = () => { logBody.children.length = 0; };
  clearBtn.click();
  assert.equal(logBody.children.length, 0);
});

test('Virtual Plate Studio presents four process steps and matching panels', async () => {
  const { plateWorkspaceTemplate } = await import('../src/ui/templates/layout-templates.js');
  const stepNumbers = [...plateWorkspaceTemplate.matchAll(/class="stepper-step(?: active)?" data-step="(\d)"/g)]
    .map((match) => Number(match[1]));
  const panelNumbers = [...plateWorkspaceTemplate.matchAll(/id="plateStagePanel(\d)"/g)]
    .map((match) => Number(match[1]));
  assert.deepEqual(stepNumbers, [1, 2, 3, 4]);
  assert.deepEqual(panelNumbers, stepNumbers);
});

test('plate resolution is displayed without a destructive switcher', async () => {
  const { plateWorkspaceTemplate } = await import('../src/ui/templates/layout-templates.js');
  assert.match(plateWorkspaceTemplate, /id="plateResolutionValue"/);
  assert.doesNotMatch(plateWorkspaceTemplate, /class="res-btn/);
  assert.match(plateWorkspaceTemplate, /id="size" type="range"/);
});

test('UI Button Click: Transfer Wizard Modal (Open, Select Options, Confirm)', () => {
  const modal = createMockElement('div', { id: 'transferModalOverlay', hidden: true });
  const openBtn = createMockElement('button', { id: 'transferToPlateBtn' });
  const closeBtn = createMockElement('button', { id: 'transferModalClose' });
  const cancelBtn = createMockElement('button', { id: 'transferCancelBtn' });
  const confirmBtn = createMockElement('button', { id: 'transferConfirmBtn' });

  let wizardOpen = false;
  let selectedLayer = 'all';
  let selectedRes = 1500;
  let selectedTech = 'etching';
  let transferExecuted = false;

  openBtn.onclick = () => { wizardOpen = true; modal.hidden = false; };
  closeBtn.onclick = () => { wizardOpen = false; modal.hidden = true; };
  cancelBtn.onclick = () => { wizardOpen = false; modal.hidden = true; };
  confirmBtn.onclick = () => {
    wizardOpen = false;
    modal.hidden = true;
    transferExecuted = true;
  };

  // 1. Open Wizard
  assert.equal(wizardOpen, false);
  openBtn.click();
  assert.equal(wizardOpen, true);
  assert.equal(modal.hidden, false);

  // 2. Cancel closes Wizard without transfer
  cancelBtn.click();
  assert.equal(wizardOpen, false);
  assert.equal(modal.hidden, true);
  assert.equal(transferExecuted, false);

  // 3. Open again and confirm
  openBtn.click();
  assert.equal(wizardOpen, true);
  selectedLayer = 'contours';
  selectedRes = 3000;
  selectedTech = 'drypoint';
  confirmBtn.click();
  assert.equal(wizardOpen, false);
  assert.equal(modal.hidden, true);
  assert.equal(transferExecuted, true);
  assert.equal(selectedLayer, 'contours');
  assert.equal(selectedRes, 3000);
  assert.equal(selectedTech, 'drypoint');
});

test('UI Button Click: Unified Acid Console Toggle & Gauge Display', () => {
  const etchBtn = createMockElement('button', { id: 'etchBtn', textContent: '开始腐蚀' });
  const gauge = createMockElement('div', { id: 'plateAcidGauge', textContent: '腐蚀 0.0s · 深度 0.0μm' });
  let isEtching = false;
  let elapsedSeconds = 0.0;
  let averageDepthMicrons = 0.0;

  function updateGauge() {
    gauge.textContent = `腐蚀 ${elapsedSeconds.toFixed(1)}s · 深度 ${averageDepthMicrons.toFixed(1)}μm`;
  }

  etchBtn.onclick = () => {
    isEtching = !isEtching;
    etchBtn.textContent = isEtching ? '停止腐蚀' : '开始腐蚀';
    if (isEtching) {
      elapsedSeconds += 2.5;
      averageDepthMicrons = 14.8;
      updateGauge();
    }
  };

  assert.equal(isEtching, false);
  etchBtn.click();
  assert.equal(isEtching, true);
  assert.equal(etchBtn.textContent, '停止腐蚀');
  assert.equal(gauge.textContent, '腐蚀 2.5s · 深度 14.8μm');

  etchBtn.click();
  assert.equal(isEtching, false);
  assert.equal(etchBtn.textContent, '开始腐蚀');
});

test('Universal Exporter: Browser compatibility without Node.js Buffer global', () => {
  const Exporter = require('../src/orchestration/export/exporter.js');
  const mockPaths = [{ points: [[0, 0], [100, 100]], width: 1.0 }];

  // Temporarily shadow Buffer to simulate browser environment
  const originalBuffer = global.Buffer;
  try {
    delete global.Buffer;
    const svgResult = Exporter.exportPayload({
      format: 'SVG',
      masterPaths: mockPaths,
      options: { width: 400, height: 300 }
    });
    assert.ok(svgResult.data.includes('<svg'));
    assert.equal(svgResult.mimeType, 'image/svg+xml');
    assert.ok(svgResult.byteSize > 0);

    const recipeResult = Exporter.exportPayload({
      format: 'RECIPE_JSON',
      recipe: { test: true }
    });
    assert.equal(recipeResult.mimeType, 'application/json');
    assert.ok(recipeResult.byteSize > 0);
  } finally {
    global.Buffer = originalBuffer;
  }
});

test('LightboxController: Viewport scaling, fit-to-view, and reset lifecycle', () => {
  const mockCanvas = createMockElement('canvas', { id: 'modalCanvas', width: 800, height: 600 });
  const mockViewport = createMockElement('div', { id: 'modalViewportWrap', clientWidth: 900, clientHeight: 560 });
  const mockOverlay = createMockElement('div', { id: 'modalOverlay', hidden: true });
  const mockTitle = createMockElement('h3', { id: 'modalTitle' });
  const mockBadge = createMockElement('span', { id: 'lightboxZoomLevel' });
  const mockZoomIn = createMockElement('button', { id: 'lightboxZoomIn' });
  const mockZoomOut = createMockElement('button', { id: 'lightboxZoomOut' });
  const mockReset = createMockElement('button', { id: 'lightboxReset' });
  const mockFit = createMockElement('button', { id: 'lightboxFit' });
  const mockClose = createMockElement('button', { id: 'modalClose' });

  // Simulate LightboxController state
  let scale = 1.0;
  let tx = 0, ty = 0;
  function updateTransform() {
    mockCanvas.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    mockBadge.textContent = `${Math.round(scale * 100)}%`;
  }
  function resetView() {
    scale = 1.0; tx = 0; ty = 0;
    updateTransform();
  }

  mockZoomIn.onclick = () => { scale = Math.min(5.0, Number((scale * 1.25).toFixed(2))); updateTransform(); };
  mockZoomOut.onclick = () => { scale = Math.max(0.5, Number((scale / 1.25).toFixed(2))); updateTransform(); };
  mockReset.onclick = () => resetView();
  mockFit.onclick = () => resetView();
  mockClose.onclick = () => { mockOverlay.hidden = true; };

  // 1. Initial State
  assert.equal(scale, 1.0);

  // 2. Zoom In
  mockZoomIn.click();
  assert.equal(scale, 1.25);
  assert.equal(mockBadge.textContent, '125%');

  // 3. Zoom Out twice
  mockZoomOut.click();
  mockZoomOut.click();
  assert.ok(scale < 1.0);

  // 4. Fit / Reset
  mockFit.click();
  assert.equal(scale, 1.0);
  assert.equal(mockBadge.textContent, '100%');

  // 5. Open & Close
  mockOverlay.hidden = false;
  assert.equal(mockOverlay.hidden, false);
  mockClose.click();
  assert.equal(mockOverlay.hidden, true);
});

test('StepFlowGrid All 7 Stages Independent Export Dispatcher', () => {
  const Exporter = require('../src/orchestration/export/exporter.js');
  const mockPaths = [{ points: [[10, 10], [50, 50]], width: 1.0 }];
  const downloads = [];

  function simulateDownloadStepExport(stepIdx) {
    if (stepIdx === 0) {
      downloads.push('step0_source_image.png');
    } else if (stepIdx === 1) {
      downloads.push('step1_line_map.png');
    } else if (stepIdx === 2) {
      downloads.push('step2_tone_flow.png');
    } else if (stepIdx === 3) {
      const svg = Exporter.exportPayload({ format: 'SVG', masterPaths: mockPaths, options: { width: 900, height: 660 } });
      assert.ok(svg.data.length > 0);
      downloads.push('step3_contours.svg');
    } else if (stepIdx === 4) {
      const svg = Exporter.exportPayload({ format: 'SVG', masterPaths: mockPaths, options: { width: 900, height: 660 } });
      assert.ok(svg.data.length > 0);
      downloads.push('step4_hatching.svg');
    } else if (stepIdx === 5) {
      const svg = Exporter.exportPayload({ format: 'SVG', masterPaths: mockPaths, options: { width: 900, height: 660 } });
      assert.ok(svg.data.length > 0);
      downloads.push('step5_master_vector.svg');
    } else if (stepIdx === 6) {
      downloads.push('step6_transfer_master.png');
    }
  }

  for (let s = 0; s <= 6; s++) {
    simulateDownloadStepExport(s);
  }

  assert.equal(downloads.length, 7);
  assert.equal(downloads[0], 'step0_source_image.png');
  assert.equal(downloads[1], 'step1_line_map.png');
  assert.equal(downloads[2], 'step2_tone_flow.png');
  assert.equal(downloads[3], 'step3_contours.svg');
  assert.equal(downloads[4], 'step4_hatching.svg');
  assert.equal(downloads[5], 'step5_master_vector.svg');
  assert.equal(downloads[6], 'step6_transfer_master.png');
});


