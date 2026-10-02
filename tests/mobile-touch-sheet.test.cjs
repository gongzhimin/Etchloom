const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { I18nManager } = require('../src/ui/i18n/i18n.js');

test('Mobile Adaptation: touch-action and user-select protection in styles/app.css', () => {
  const cssPath = path.resolve(__dirname, '../styles/app.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verify touch-action: none on plate canvas frame and canvas
  assert.match(css, /\.plate-canvas-frame\s*\{[^}]*touch-action:\s*none;/);
  assert.match(css, /\.plate-canvas-frame canvas\s*\{[^}]*touch-action:\s*none;/);
  assert.match(css, /\.plate-canvas-frame canvas\s*\{[^}]*user-select:\s*none;/);

  // Verify mobile Bottom Sheet rules
  assert.match(css, /\.bottom-sheet-drag-handle/);
  assert.match(css, /\.plate-main\s*\{[^}]*order:\s*1/);
  assert.match(css, /\.plate-sidebar\s*\{[^}]*order:\s*2/);
  assert.match(css, /\.plate-sidebar\.sheet-collapsed/);
  assert.match(css, /\.plate-sidebar\.sheet-expanded/);
});

test('Mobile Adaptation: layout-templates contains bottom sheet drag handle with trilingual support', async () => {
  const { plateWorkspaceTemplate } = await import('../src/ui/templates/layout-templates.js');

  assert.match(plateWorkspaceTemplate, /id="plateSidebar"/);
  assert.match(plateWorkspaceTemplate, /class="bottom-sheet-drag-handle" id="plateSheetHandle"/);
  assert.match(plateWorkspaceTemplate, /data-i18n-aria="sheet\.toggle"/);

  const i18n = new I18nManager();
  for (const locale of ['zh-CN', 'en-US', 'vi-VN']) {
    i18n.setLocale(locale);
    const translated = i18n.t('sheet.toggle');
    assert.ok(translated && translated !== 'sheet.toggle', `Missing sheet.toggle translation for ${locale}`);
  }
});

test('Mobile Adaptation: multi-touch safety guard suppresses needle carving when 2+ touches active', async () => {
  const { bindPlateStudioEvents } = await import('../src/ui/controllers/plate-studio-controller.js');

  const mockCanvas = {
    getContext: () => ({ clearRect: () => {}, putImageData: () => {} }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 660 }),
    setPointerCapture: () => {},
    onpointerdown: null,
    onpointermove: null,
    onpointerup: null,
    onpointercancel: null
  };

  const classes = new Set();
  const mockSidebar = {
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      contains: c => classes.has(c),
      toggle: c => { if (classes.has(c)) { classes.delete(c); return false; } classes.add(c); return true; }
    }
  };

  const mockHandle = {
    onclick: null,
    addEventListener: () => {}
  };

  const originalDoc = global.document;
  global.document = {
    getElementById: id => {
      if (id === 'canvas') return mockCanvas;
      if (id === 'plateSheetHandle') return mockHandle;
      if (id === 'plateSidebar') return mockSidebar;
      return null;
    },
    querySelector: sel => {
      if (sel === '.plate-sidebar') return mockSidebar;
      return null;
    },
    querySelectorAll: () => []
  };

  try {
    bindPlateStudioEvents();

    assert.ok(typeof mockCanvas.onpointerdown === 'function');
    assert.ok(typeof mockCanvas.onpointermove === 'function');
    assert.ok(typeof mockHandle.onclick === 'function');

    // Test Sheet Handle toggle
    mockHandle.onclick({ stopPropagation: () => {} });
    assert.ok(mockSidebar.classList.contains('sheet-expanded'));

    mockHandle.onclick({ stopPropagation: () => {} });
    assert.ok(mockSidebar.classList.contains('sheet-collapsed'));

    mockHandle.onclick({ stopPropagation: () => {} });
    assert.ok(!mockSidebar.classList.contains('sheet-collapsed'));

    // Test multi-touch pointerdown
    // Pointer 1 down
    mockCanvas.onpointerdown({ pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' });
    // Pointer 2 down -> multi-touch detected, carving aborted
    mockCanvas.onpointerdown({ pointerId: 2, clientX: 200, clientY: 200, pointerType: 'touch' });

    // Moving while 2 pointers active should be ignored
    mockCanvas.onpointermove({ pointerId: 1, clientX: 110, clientY: 110, pointerType: 'touch' });

    // Pointer up cleans up
    mockCanvas.onpointerup({ pointerId: 1 });
    mockCanvas.onpointerup({ pointerId: 2 });
  } finally {
    global.document = originalDoc;
  }
});
