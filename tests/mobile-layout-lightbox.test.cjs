const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LightboxController } = require('../src/ui/controllers/lightbox-controller.js');

test('Mobile Visual Layout: styles/app.css anti-wrapping and responsive rules', () => {
  const cssPath = path.resolve(__dirname, '../styles/app.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // 1. Filmstrip step card minimum width is at least 220px to prevent character vertical stacking
  assert.match(css, /\.filmstrip-scroll \.step-card[\s\S]*?min-width:\s*220px !important;/);

  // 2. Card and step titles strictly do not wrap and have text-overflow ellipsis
  assert.match(css, /\.card-title,\s*\.step-title\s*\{[\s\S]*?white-space:\s*nowrap !important;[\s\S]*?text-overflow:\s*ellipsis;/);

  // 3. Mobile header uses structured 2-row layout with safe-area
  assert.match(css, /header\.app-header\s*\{[\s\S]*?grid-template-areas:[\s\S]*?"brand actions"[\s\S]*?"stepper stepper"/);
  assert.match(css, /padding:\s*max\(8px,\s*env\(safe-area-inset-top\)\)/);

  // 4. Mobile top banner stacks into 2 rows to avoid title text squishing
  assert.match(css, /\.master-top-banner\s*\{[\s\S]*?flex-direction:\s*column;/);

  // 5. Fullscreen lightbox overlay has fixed viewport with dvh and touch-action none
  assert.match(css, /#modalOverlay[\s\S]*?position:\s*fixed !important;[\s\S]*?height:\s*100dvh !important;[\s\S]*?touch-action:\s*none;/);

  // 6. Mobile Master Hero stage expands adaptively with clamp dvh and contained frame
  assert.match(css, /\.master-hero-viewport\s*\{[\s\S]*?height:\s*clamp\(340px,\s*58dvh,\s*560px\)\s*!important;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /\.master-hero-frame\s*\{[\s\S]*?max-height:\s*100%\s*!important;[\s\S]*?display:\s*flex\s*!important;/);
  assert.match(css, /\.master-hero-canvas\s*\{[\s\S]*?aspect-ratio:\s*var\(--source-aspect-ratio,\s*1400\s*\/\s*1027\);/);
});

test('LightboxController: Mobile viewport sizing and multi-touch pinch gesture', () => {
  const listeners = {};
  const mockOverlay = { hidden: true, focus: () => {} };
  const mockCanvas = { style: {}, width: 0, height: 0, getContext: () => ({ clearRect: () => {}, drawImage: () => {} }) };
  const mockSvgWrap = { style: {}, hidden: true, innerHTML: '', querySelector: () => null };
  const mockViewport = {
    clientWidth: 390,
    clientHeight: 844,
    classList: { add: () => {}, remove: () => {} },
    setPointerCapture: () => {},
    onpointerdown: null,
    onpointermove: null,
    onpointerup: null
  };
  const mockTitle = { textContent: '' };
  const mockDesc = { textContent: '' };
  const mockBadge = { textContent: '' };
  const mockClose = { focus: () => {} };

  const origDoc = global.document;
  const origWin = global.window;

  global.window = {
    innerWidth: 390,
    innerHeight: 844,
    addEventListener: (k, fn) => { listeners[k] = fn; }
  };

  global.document = {
    getElementById: (id) => {
      if (id === 'modalOverlay') return mockOverlay;
      if (id === 'modalCanvas') return mockCanvas;
      if (id === 'modalSvgWrap') return mockSvgWrap;
      if (id === 'modalViewportWrap') return mockViewport;
      if (id === 'modalTitle') return mockTitle;
      if (id === 'modalDescription') return mockDesc;
      if (id === 'lightboxZoomLevel') return mockBadge;
      if (id === 'modalClose') return mockClose;
      return null;
    }
  };

  try {
    const lightbox = new LightboxController();

    // Open raster canvas on simulated mobile screen (390 x 844)
    const sourceCanvas = { width: 1400, height: 1000, naturalWidth: 1400, naturalHeight: 1000 };
    lightbox.open('手机特写检查', sourceCanvas, '1400 x 1000 物理网格');

    assert.equal(mockOverlay.hidden, false);
    assert.equal(lightbox.currentMode, 'canvas');

    // Canvas width must not overflow the 390px mobile viewport (390 - 16 = 374 max width)
    const assignedWidth = parseInt(mockCanvas.style.width, 10);
    assert.ok(assignedWidth <= 374, `Canvas width ${assignedWidth}px should not exceed mobile viewport 374px`);
    assert.ok(assignedWidth >= 200, `Canvas width ${assignedWidth}px should be visible`);

    // Verify multi-touch pinch to zoom interaction
    assert.equal(typeof mockViewport.onpointerdown, 'function');
    assert.equal(typeof mockViewport.onpointermove, 'function');

    // Pointer 1 down at (100, 200)
    mockViewport.onpointerdown({ pointerId: 1, clientX: 100, clientY: 200, pointerType: 'touch' });
    // Pointer 2 down at (100, 300) -> initial distance = 100px
    mockViewport.onpointerdown({ pointerId: 2, clientX: 100, clientY: 300, pointerType: 'touch' });

    // Pinch out: distance expands from 100px to 200px (2x scale)
    mockViewport.onpointermove({ pointerId: 2, clientX: 100, clientY: 400, pointerType: 'touch' });
    assert.ok(lightbox.scale >= 1.9 && lightbox.scale <= 2.1, `Scale should be ~2.0, got ${lightbox.scale}`);

    // Release pointers
    mockViewport.onpointerup({ pointerId: 1 });
    mockViewport.onpointerup({ pointerId: 2 });
    assert.equal(lightbox.isDragging, false);
  } finally {
    global.document = origDoc;
    global.window = origWin;
  }
});

test('Master Hero Stage: Mobile responsiveness and dynamic aspect-ratio adaptation', async () => {
  const { PipelineController } = await import('file:///' + path.join(__dirname, '../src/ui/controllers/pipeline-controller.js').replace(/\\/g, '/'));

  const origDoc = global.document;
  const mockProperties = {};
  const mockHeroViewport = {
    style: {
      setProperty: (k, v) => { mockProperties[k] = v; }
    }
  };
  const mockHeroCanvas = {
    style: {},
    width: 0,
    height: 0,
    getContext: () => ({ clearRect: () => {}, drawImage: () => {} })
  };
  const mockHeroResMeta = { textContent: '' };
  const mockHeroBadge = { textContent: '' };

  global.document = {
    getElementById: (id) => {
      if (id === 'masterHeroCanvas') return mockHeroCanvas;
      if (id === 'masterHeroViewport') return mockHeroViewport;
      if (id === 'heroResolutionMeta') return mockHeroResMeta;
      if (id === 'masterStrokesBadge') return mockHeroBadge;
      return null;
    }
  };

  try {
    const controller = new PipelineController({ log: () => {} });
    controller.stepGrid = {
      stepStates: {
        6: {
          canvas: { width: 800, height: 1200 } // Vertical / portrait cat artwork
        }
      }
    };

    // Trigger syncHeroMasterPreview with portrait dimensions
    controller.syncHeroMasterPreview(['path1', 'path2'], 800, 1200);

    // Verify canvas style aspect ratio and viewport CSS property adapt to 800 / 1200
    assert.equal(mockHeroCanvas.style.aspectRatio, '800 / 1200');
    assert.equal(mockProperties['--source-aspect-ratio'], '800 / 1200');
    assert.equal(mockHeroResMeta.textContent, '800 × 1200 px');
    assert.equal(mockHeroCanvas.width, 800);
    assert.equal(mockHeroCanvas.height, 1200);
  } finally {
    global.document = origDoc;
  }
});

