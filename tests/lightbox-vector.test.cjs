const test = require('node:test');
const assert = require('node:assert/strict');

// Import StepFlowGrid from universal module
const { StepFlowGrid, getFrameGeometry, generateFrameSvg } = require('../src/ui/components/step-flow-grid.js');
const { I18nManager } = require('../src/ui/i18n/i18n.js');
const { LightboxController } = require('../src/ui/controllers/lightbox-controller.js');

test('StepFlowGrid recomposes completed card metadata when locale changes', () => {
  const i18n = new I18nManager('zh-CN');
  const grid = new StepFlowGrid(null, { i18n });
  const card = { classList: { add() {}, remove() {} } };
  grid.container = {
    querySelector: selector => selector === '.step-3' ? card : null,
    querySelectorAll: () => []
  };
  grid.stepStates[3].metaEl = { textContent: '' };
  grid.stepStates[3].badgeEl = { textContent: '', className: '' };
  grid.setStepStatus(3, 'DONE', { key: 'card.contourCount', args: [42] });
  assert.equal(grid.stepStates[3].metaEl.textContent, '42 条轮廓');
  i18n.setLocale('en-US');
  grid.updateLocale(i18n);
  assert.equal(grid.stepStates[3].metaEl.textContent, '42 contours');
  i18n.setLocale('vi-VN');
  grid.updateLocale(i18n);
  assert.equal(grid.stepStates[3].metaEl.textContent, '42 nét viền');
});

function createMockElement(tag, props = {}) {
  const listeners = {};
  const style = { ...props.style };
  const classList = new Set(props.className ? props.className.split(' ') : []);
  const children = [];

  const el = {
    tagName: tag.toUpperCase(),
    style,
    hidden: props.hidden ?? false,
    width: props.width ?? 0,
    height: props.height ?? 0,
    naturalWidth: props.naturalWidth ?? 0,
    naturalHeight: props.naturalHeight ?? 0,
    clientWidth: props.clientWidth ?? 1920,
    clientHeight: props.clientHeight ?? 1080,
    innerHTML: '',
    textContent: props.textContent ?? '',
    dataset: {},
    children,
    classList: {
      add: (c) => classList.add(c),
      remove: (c) => classList.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classList.has(c)) { classList.delete(c); return false; }
          classList.add(c); return true;
        }
        if (force) classList.add(c); else classList.delete(c);
        return force;
      },
      contains: (c) => classList.has(c)
    },
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt) => {
      const fns = listeners[evt.type] || [];
      fns.forEach(fn => fn(evt));
    },
    click: () => {
      if (el.onclick) el.onclick({ stopPropagation: () => {} });
      el.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    },
    appendChild: (child) => {
      children.push(child);
      return child;
    },
    querySelectorAll: (sel) => [],
    querySelector: (sel) => {
      if (sel === 'svg' && el.innerHTML.includes('<svg')) {
        return {
          getAttribute: (attr) => attr === 'viewBox' ? '0 0 900 660' : null,
          viewBox: { baseVal: { width: 900, height: 660 } }
        };
      }
      return null;
    },
    getContext: (type) => ({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      clearRect: () => {},
      drawImage: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      strokeRect: () => {},
      rect: () => {},
      clip: () => {},
      save: () => {},
      restore: () => {}
    })
  };
  return el;
}

test('StepFlowGrid: Vector SVG generation for Stages 3..6 and raster rejection for Stages 0..2', () => {
  const origDoc = global.document;
  global.document = {
    createElement: (tag) => createMockElement(tag),
    getElementById: () => null
  };
  try {
    const container = createMockElement('div');
    const grid = new StepFlowGrid(container);

  // Stages 0..2 must return null (they are raster pixel/tensor stages)
  assert.equal(grid.getStepVectorSvg(0), null);
  assert.equal(grid.getStepVectorSvg(1), null);
  assert.equal(grid.getStepVectorSvg(2), null);

  // Mock vector paths for Stages 3, 4, 5, 6
  const mockPaths = [
    { points: [[10, 20], [30, 40], [50, 60]], width: 1.2 },
    { points: [[100, 120], [140, 160]], width: 0.8 }
  ];

  // Update Step 3 (透视轮廓)
  grid.updateStepPaths(3, mockPaths, 900, 660);
  const svg3 = grid.getStepVectorSvg(3);
  assert.ok(typeof svg3 === 'string');
  assert.ok(svg3.includes('viewBox="0 0 900 660"'));
  assert.ok(svg3.includes('id="etchloom-vector-paths"'));
  assert.ok(svg3.includes('d="    <path d="M 10.00 20.00 L 30.00 40.00 L 50.00 60.00" stroke-width="1.20" />') || svg3.includes('M 10.00 20.00 L 30.00 40.00 L 50.00 60.00'));

  // Update Step 4 (曲面排线)
  grid.updateStepPaths(4, mockPaths, 900, 660);
  const svg4 = grid.getStepVectorSvg(4);
  assert.ok(typeof svg4 === 'string');
  assert.ok(svg4.includes('id="etchloom-vector-paths"'));

  // Update Step 5 (母版合成)
  grid.updateStepPaths(5, mockPaths, 900, 660);
  const svg5 = grid.getStepVectorSvg(5);
  assert.ok(typeof svg5 === 'string');
  assert.ok(svg5.includes('#fcfbf8')); // Ivory cream background

  // Update Step 6 with 'double' frame
  grid.updateStepPaths(6, mockPaths, 900, 660, { frameStyle: 'double' });
  const svg6Double = grid.getStepVectorSvg(6);
  assert.ok(typeof svg6Double === 'string');
  assert.ok(svg6Double.includes('id="etchloom-frame"'));
  assert.ok(svg6Double.includes('id="etchloom-artwork"'));
  assert.ok(svg6Double.includes('fill="#f4f7f7"')); // Flat transfer master ground
  assert.ok(svg6Double.includes('id="etchloom-registration"'));
  assert.ok(svg6Double.includes('<rect x=')); // Double frame rects

  // Update Step 6 with 'rough' artisanal chisel frame
  grid.updateStepPaths(6, mockPaths, 900, 660, { frameStyle: 'rough' });
  const svg6Rough = grid.getStepVectorSvg(6);
  assert.ok(typeof svg6Rough === 'string');
  assert.ok(svg6Rough.includes('<line x1=')); // Hand-chiseled burin cut segments
  } finally {
    global.document = origDoc;
  }
});

test('LightboxController: Dual-Engine Vector and Raster switching and transform scaling', () => {
  const mockOverlay = createMockElement('div', { id: 'modalOverlay', hidden: true });
  const mockCanvas = createMockElement('canvas', { id: 'modalCanvas', width: 900, height: 600 });
  const mockSvgWrap = createMockElement('div', { id: 'modalSvgWrap' });
  mockSvgWrap.style.display = 'none';
  const mockViewport = createMockElement('div', { id: 'modalViewportWrap', clientWidth: 1600, clientHeight: 900 });
  const mockTitle = createMockElement('h3', { id: 'modalTitle' });
  const mockBadge = createMockElement('span', { id: 'lightboxZoomLevel' });
  const mockZoomIn = createMockElement('button', { id: 'lightboxZoomIn' });

  // Mock global document
  const origDoc = global.document;
  global.document = {
    getElementById: (id) => {
      if (id === 'modalOverlay') return mockOverlay;
      if (id === 'modalCanvas') return mockCanvas;
      if (id === 'modalSvgWrap') return mockSvgWrap;
      if (id === 'modalViewportWrap') return mockViewport;
      if (id === 'modalTitle') return mockTitle;
      if (id === 'lightboxZoomLevel') return mockBadge;
      if (id === 'lightboxZoomIn') return mockZoomIn;
      return null;
    }
  };

  try {
    const lightbox = new LightboxController();

    // 1. Open with Vector SVG (Steps 3..6)
    const testSvg = '<svg viewBox="0 0 900 660"><rect width="100%" height="100%" fill="#faf7f0" /></svg>';
    lightbox.open('母版合成 · 矢量特写', null, '矢量无限放大', { isVector: true, vectorSvg: testSvg });

    assert.equal(lightbox.currentMode, 'vector');
    assert.equal(mockOverlay.hidden, false);
    assert.equal(mockCanvas.style.display, 'none');
    assert.equal(mockSvgWrap.style.display, 'flex');
    assert.equal(mockSvgWrap.innerHTML, testSvg);
    assert.ok(mockSvgWrap.style.width.endsWith('px'));
    assert.ok(mockSvgWrap.style.height.endsWith('px'));

    // Zooming operates on svgWrap in vector mode
    lightbox.scale = 2.5;
    lightbox.updateTransform();
    assert.ok(mockSvgWrap.style.transform.includes('scale(2.5)'));
    assert.equal(mockBadge.textContent, '250%');

    // 2. Open with Raster Canvas (Step 0 or Copperplate)
    const rasterCanvas = createMockElement('canvas', { width: 1200, height: 800 });
    lightbox.open('原始像素底稿', rasterCanvas, '栅格位图显示');

    assert.equal(lightbox.currentMode, 'canvas');
    assert.equal(mockCanvas.style.display, 'block');
    assert.equal(mockSvgWrap.style.display, 'none');
    assert.equal(lightbox.scale, 1.0);

    // Zooming operates on canvas in canvas mode
    lightbox.scale = 3.0;
    lightbox.updateTransform();
    assert.ok(mockCanvas.style.transform.includes('scale(3)'));
    assert.equal(mockBadge.textContent, '300%');
  } finally {
    global.document = origDoc;
  }
});
