const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Orchestrator } = require('../src/orchestration/engine/orchestrator.js');

test('Orchestrator: initialization and component integration', () => {
  const orch = new Orchestrator({ debounceMs: 10, plateWidth: 900 });
  assert.ok(orch.stageCache);
  assert.ok(orch.scheduler);
  assert.ok(orch.telemetry);
  assert.ok(orch.plateEngine);
  assert.equal(orch.plateEngine.width, 900);
});

test('Orchestrator: lifecycle events dispatching', async () => {
  const orch = new Orchestrator({ debounceMs: 10 });
  const events = [];
  const unsubscribe = orch.subscribe(e => events.push(e));

  // Synthetic 32x24 blank image
  const syntheticImg = { width: 32, height: 24, pixels: new Uint8Array(32 * 24 * 4).fill(255) };
  const recipe = {
    sourceImage: syntheticImg,
    params: {
      lineThreshold: 50,
      lineNoiseSuppression: 2,
      toneContrast: 1,
      toneBrightness: 0,
      flowSmoothing: 2,
      contourDetail: 1,
      contourSimplify: 1,
      density: 20,
      angle: 45,
      crossHatch: false,
      waviness: 0,
      needleWidth: 1,
      inkGain: 0
    }
  };

  const result = await orch.scheduleRecipe(recipe);
  assert.ok(result);
  assert.ok(!result.aborted);
  assert.ok(events.length > 0);

  const types = events.map(e => e.type);
  assert.ok(types.includes('PIPELINE_STARTED'));
  assert.ok(types.includes('PIPELINE_COMPLETED'));

  // Test transferring to virtual plate
  orch.transferToPlate(result.masterPaths, 'needle', 2);
  assert.ok(events.some(e => e.type === 'PLATE_UPDATED'));

  // Test export from orchestrator
  const svg = orch.exportAsset('SVG');
  assert.ok(svg.data.includes('<svg'));

  unsubscribe();
});
