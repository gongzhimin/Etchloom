/**
 * App Entrypoint and ES Module Graph Integrity Test
 * Prevents regressions where index.html or src/main.js fails to boot in browser.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const workshopRoot = path.resolve(__dirname, '..');

test('App Entrypoint: src/main.js module graph parses and mounts with zero syntax errors', async () => {
  const listeners = {};
  const elements = {};

  function createEl(id, tag = 'div') {
    const el = {
      id,
      tagName: tag.toUpperCase(),
      style: {},
      dataset: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => {}
      },
      children: [],
      appendChild: (c) => { el.children.push(c); return c; },
      removeChild: (c) => {
        const idx = el.children.indexOf(c);
        if (idx !== -1) el.children.splice(idx, 1);
        return c;
      },
      addEventListener: (type, h) => { listeners[id + ':' + type] = h; },
      removeEventListener: () => {},
      value: '',
      textContent: '',
      hidden: false,
      getContext: () => ({
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: () => {},
        drawImage: () => {},
        strokeRect: () => {},
        fillRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        rect: () => {},
        clip: () => {}
      })
    };
    elements[id] = el;
    return el;
  }

  const rootApp = createEl('app');
  createEl('canvas');
  createEl('plateCanvasInspectBtn');
  createEl('plateFullscreenBtn');
  createEl('activityLog');
  createEl('logStatusBadge');
  createEl('activityLogWrap');
  createEl('activityLogToggle');
  createEl('clearLogBtn');
  createEl('masterWorkspace');
  createEl('plateWorkspace');
  createEl('showGenerator');
  createEl('showPlate');
  createEl('stepFlowGridContainer');
  createEl('print');
  createEl('save');
  createEl('load');
  createEl('file', 'input');
  createEl('undo');
  createEl('clear');
  createEl('demo');
  createEl('etch');
  createEl('etchTopBtn');
  createEl('etchBtn');
  createEl('resetEtchBtn');
  createEl('etchPhaseVal');
  createEl('status');
  createEl('caption');
  createEl('paper', 'select');
  createEl('irreversible', 'input');
  createEl('aboutModal');
  createEl('aboutBtn');
  createEl('closeAboutBtn');
  createEl('langToggle');

  globalThis.document = {
    getElementById: (id) => elements[id] || createEl(id),
    querySelector: (sel) => null,
    querySelectorAll: (sel) => [],
    createElement: (tag) => createEl('temp_' + Math.random(), tag),
    body: createEl('body'),
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  globalThis.window = {
    document: globalThis.document,
    addEventListener: () => {},
    removeEventListener: () => {},
    getComputedStyle: () => ({}),
    getPlateState: () => ({ running: false })
  };

  const { I18nManager } = require(path.join(workshopRoot, 'src/ui/i18n/i18n.js'));
  const { StepFlowGrid, getFrameGeometry, drawEngravedFrame } = require(path.join(workshopRoot, 'src/ui/components/step-flow-grid.js'));
  const { LoupeMagnifier } = require(path.join(workshopRoot, 'src/ui/components/loupe.js'));

  globalThis.I18n = { I18nManager };
  globalThis.StepFlowGrid = StepFlowGrid;
  globalThis.getFrameGeometry = getFrameGeometry;
  globalThis.drawEngravedFrame = drawEngravedFrame;
  globalThis.LoupeMagnifier = LoupeMagnifier;

  const layoutMod = await import('file:///' + path.join(workshopRoot, 'src/ui/templates/layout-templates.js').replace(/\\/g, '/'));
  assert.ok(typeof layoutMod.mountAppLayout === 'function', 'mountAppLayout must be an exported function');
  layoutMod.mountAppLayout(rootApp);
  assert.ok(rootApp.innerHTML && rootApp.innerHTML.length > 500, 'Layout HTML must be non-empty');

  const mainUrl = 'file:///' + path.join(workshopRoot, 'src/main.js').replace(/\\/g, '/');
  const mainMod = await import(mainUrl);

  assert.ok(mainMod, 'src/main.js must load and export module interface successfully');
  assert.ok(typeof mainMod.logMessage === 'function', 'logMessage should be exported');
  assert.ok(typeof mainMod.switchWorkflow === 'function', 'switchWorkflow should be exported');
});
