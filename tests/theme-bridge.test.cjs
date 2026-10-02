const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ThemeBridge = require('../src/services/theme/theme-bridge.js');

test('ThemeBridge: Default tokens and theme resolution in headless environment', (t) => {
  assert.ok(ThemeBridge, 'ThemeBridge module should be defined');
  assert.ok(ThemeBridge.DEFAULT_RENDER_THEME, 'DEFAULT_RENDER_THEME should exist');

  const theme = ThemeBridge.getRenderTheme();
  assert.strictEqual(theme.paperGround, '#faf7f0');
  assert.strictEqual(theme.plateGround, '#1e2220');
  assert.strictEqual(theme.inkPrimary, '#1a1918');
  assert.strictEqual(theme.contourGold, '#c8b67e');
  assert.strictEqual(theme.hatchSage, '#b4c0ab');
  assert.strictEqual(theme.masterPaper, '#fcfbf8');

  // getThemeToken with fallback
  const tokenVal = ThemeBridge.getThemeToken('--custom-unknown', '#123456');
  assert.strictEqual(tokenVal, '#123456');
});

test('PipelineController: Parameter and Telemetry decoupling without DOM', async (t) => {
  // Mock ESM import for PipelineController
  const { PipelineController } = await import('../src/ui/controllers/pipeline-controller.js');

  let telemetryReceived = null;
  const customParams = {
    exposure: 72,
    density: 95,
    contourDetail: 88,
    aerialStrength: 45,
    needleWidth: 12,
    crossHatch: 50,
    lotus3D: false,
    frameStyle: 'rough'
  };

  const controller = new PipelineController({
    getParams: () => customParams,
    onTelemetry: (metrics) => {
      telemetryReceived = metrics;
    }
  });

  // Verify getRecipeParams reads injected adapter
  const resolved = controller.getRecipeParams();
  assert.strictEqual(resolved.exposure, 72);
  assert.strictEqual(resolved.density, 95);
  assert.strictEqual(resolved.contourDetail, 88);
  assert.strictEqual(resolved.aerialStrength, 45);
  assert.strictEqual(resolved.needleWidth, 1.2);
  assert.strictEqual(resolved.cross, 50);
  assert.strictEqual(resolved.lotus3D, false);
  assert.strictEqual(resolved.frameStyle, 'rough');

  // Verify updateTelemetry dispatches to injected adapter
  controller.updateTelemetry({
    status: '测试就绪',
    task: 'BENCHMARK',
    duration: 42.5,
    strokes: 1200,
    cache: '4/5'
  });

  assert.ok(telemetryReceived);
  assert.strictEqual(telemetryReceived.status, '测试就绪');
  assert.strictEqual(telemetryReceived.task, 'BENCHMARK');
  assert.strictEqual(telemetryReceived.duration, 42.5);
  assert.strictEqual(telemetryReceived.strokes, 1200);
});

test('Design Tokens in styles/app.css: Spacing, dimensions, radii and render tokens', (t) => {
  const cssPath = path.join(__dirname, '..', 'styles', 'app.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Check Spacing scale tokens
  assert.ok(css.includes('--space-1: 4px;'), 'Should define --space-1');
  assert.ok(css.includes('--space-2: 8px;'), 'Should define --space-2');
  assert.ok(css.includes('--space-4: 16px;'), 'Should define --space-4');
  assert.ok(css.includes('--space-8: 32px;'), 'Should define --space-8');
  assert.ok(css.includes('--space-12: 48px;'), 'Should define --space-12');

  // Check Structural dimensions
  assert.ok(css.includes('--header-height: 60px;'), 'Should define --header-height');
  assert.ok(css.includes('--sidebar-width: 320px;'), 'Should define --sidebar-width');

  // Check Radii scale
  assert.ok(css.includes('--radius-xs: 2px;'), 'Should define --radius-xs');
  assert.ok(css.includes('--radius-md: 6px;'), 'Should define --radius-md');
  assert.ok(css.includes('--radius-pill: 9999px;'), 'Should define --radius-pill');

  // Check Render Theme tokens
  assert.ok(css.includes('--render-paper-ground: #faf7f0;'), 'Should define --render-paper-ground');
  assert.ok(css.includes('--render-plate-ground: #1e2220;'), 'Should define --render-plate-ground');
  assert.ok(css.includes('--render-ink-primary: #1a1918;'), 'Should define --render-ink-primary');

  // Check semantic classes
  assert.ok(css.includes('.transfer-wizard-modal'), 'Should define .transfer-wizard-modal');
  assert.ok(css.includes('.wizard-stats-box'), 'Should define .wizard-stats-box');
  assert.ok(css.includes('.etchloom-loupe'), 'Should define .etchloom-loupe');
});

test('Layout templates: zero inline style attributes', (t) => {
  const layoutPath = path.join(__dirname, '..', 'src', 'ui', 'templates', 'layout-templates.js');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  // Match any style="..." inside template literals
  const inlineStyleMatches = layoutContent.match(/style=["'][^"']*["']/g) || [];
  assert.strictEqual(
    inlineStyleMatches.length,
    0,
    `layout-templates.js should have zero inline style attributes, but found: ${inlineStyleMatches.join(', ')}`
  );
});

test('Plate Studio initialization: starts uncarved (blank plate, stage 1), needle does not fake depth before etching', async (t) => {
  const { currentPlateStage, depth, exposed, dab, W, H } = await import('../src/ui/controllers/plate-studio-controller.js');
  
  // Verify initial stepper state is Stage 1 (上版)
  assert.strictEqual(currentPlateStage, 1, 'Plate process stepper should start at Stage 1 (上版)');
  
  // Verify plate surface is initially blank (zero depth, zero exposed)
  let nonZeroDepth = 0;
  let nonZeroExposed = 0;
  for (let i = 0; i < depth.length; i++) {
    if (depth[i] > 0) nonZeroDepth++;
    if (exposed[i] > 0) nonZeroExposed++;
  }
  assert.strictEqual(nonZeroDepth, 0, 'Initial copperplate must have zero depth');
  assert.strictEqual(nonZeroExposed, 0, 'Initial copperplate must have zero exposed marks');

  // Verify etching needle only scratches wax ground (exposed) and leaves depth at 0 until acid bites
  const testIdx = Math.round(H / 2) * W + Math.round(W / 2);
  dab(Math.round(W / 2), Math.round(H / 2), 1.0);
  assert.ok(exposed[testIdx] > 0, 'Needle should expose copper through wax ground');
  assert.strictEqual(depth[testIdx], 0, 'Etching needle before acid biting must NOT create groove depth');
});

test('Plate Studio acid etching: groove depth genuinely increases with etch time and reflects in gauge', async (t) => {
  const { etch, updateAcidGauge, dab, W, H, depth, exposed } = await import('../src/ui/controllers/plate-studio-controller.js');

  const mockTime = { textContent: '' };
  const mockDepth = { textContent: '' };
  const mockGauge = { textContent: '' };
  const mockProgressBar = { style: { width: '' } };

  const prevDoc = global.document;
  global.document = {
    getElementById: (id) => {
      if (id === 'etchTimeVal') return mockTime;
      if (id === 'etchDepthVal') return mockDepth;
      if (id === 'plateAcidGauge') return mockGauge;
      if (id === 'etchProgressBar') return mockProgressBar;
      return null;
    }
  };

  try {
    // Draw needle lines across x = 200..300
    for (let x = 200; x < 300; x++) {
      dab(x, 250, 1.0);
    }

    // Before etching: groove depth must be 0.0 μm
    updateAcidGauge();
    assert.strictEqual(mockDepth.textContent, '0.0 μm', 'Depth before etching must be 0.0 μm');

    // Advance acid etching by simulating several seconds of biting
    for (let s = 0; s < 40; s++) {
      etch(0.1);
    }
    updateAcidGauge();
    const depthAfterEtch = parseFloat(mockDepth.textContent);
    assert.ok(depthAfterEtch > 0.5, `Groove depth must increase after acid biting, got: ${mockDepth.textContent}`);
  } finally {
    global.document = prevDoc;
  }
});

test('Export Filenames: all downloads include structured timestamps (YYYYMMDD-HHmmss) without duplicate collisions', async (t) => {
  const { getPlateTimestamp } = await import('../src/ui/controllers/plate-studio-controller.js');
  const ts = getPlateTimestamp();
  assert.match(ts, /^\d{8}-\d{6}$/, 'Timestamp must match YYYYMMDD-HHmmss format');

  const { PipelineController } = await import('../src/ui/controllers/pipeline-controller.js');
  const downloadedFiles = [];

  const prevURL = global.URL;
  const prevDoc = global.document;
  const prevExporter = global.Exporter;

  global.Exporter = require('../src/orchestration/export/exporter.js');
  global.URL = {
    createObjectURL: () => 'blob:mock',
    revokeObjectURL: () => {}
  };

  global.document = {
    getElementById: () => null,
    createElement: (tag) => {
      if (tag === 'a') {
        return {
          click: () => {},
          set download(val) {
            downloadedFiles.push(val);
          }
        };
      }
      return { getContext: () => null };
    }
  };

  try {
    const pc = new PipelineController();
    pc.lastMasterPaths = [{ points: [[0, 0], [10, 10]], width: 1 }];
    pc.lastContours = [{ points: [[0, 0], [10, 10]], width: 1 }];
    pc.lastHatching = [{ points: [[0, 0], [10, 10]], width: 1 }];
    pc.currentLoadedImage = { width: 900, height: 660, rawImg: {} };

    // Trigger step 3, 4, 5, 6 vector exports
    pc.downloadStepExport(3);
    pc.downloadStepExport(4);
    pc.downloadStepExport(5);
    pc.downloadStepExport(6);

    assert.equal(downloadedFiles.length, 4, 'Should have downloaded 4 step export files');
    for (const filename of downloadedFiles) {
      assert.match(filename, /^Etchloom-step\d+-[a-z]+-\d{8}-\d{6}\.(svg|png)$/, `Filename ${filename} must have Etchloom prefix, stage, timestamp and extension`);
    }
  } finally {
    global.URL = prevURL;
    global.document = prevDoc;
    global.Exporter = prevExporter;
  }
});

