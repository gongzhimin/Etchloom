'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const PipelineRunner = require('../src/core/pipeline/pipeline-runner.js');

function makeSyntheticImage(fn, w = 400, h = 300) {
  const pixels = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      pixels[y * w + x] = Math.round(Math.max(0, Math.min(255, fn(x, y))));
    }
  }
  return { width: w, height: h, pixels };
}

test('PipelineRunner: Full execution from Stage 1 to Stage 5', async () => {
  const img = makeSyntheticImage((x, y) => {
    const dist = Math.hypot(x - 200, y - 150);
    return dist < 80 ? 40 : 220;
  });

  const progressReports = [];
  const outputs = await PipelineRunner.runIncremental(
    { sourceImage: img },
    {},
    { contour: 80, hatch: 85 },
    1,
    null,
    (stageIndex, pct) => progressReports.push({ stageIndex, pct })
  );

  assert.ok(outputs.stage1, 'stage1 output present');
  assert.ok(outputs.stage2, 'stage2 output present');
  assert.ok(outputs.stage3, 'stage3 output present');
  assert.ok(outputs.stage4, 'stage4 output present');
  assert.ok(outputs.stage5, 'stage5 output present');
  assert.ok(outputs.masterResult.paths.length > 0, 'master paths generated');
  assert.equal(progressReports.length, 5, '5 progress reports emitted');
});

test('PipelineRunner: Incremental execution from Stage 4 with pre-cached Stage 1..3', async () => {
  const img = makeSyntheticImage((x, y) => (x > 150 && x < 250 ? 50 : 200));

  // Run initial stages
  const initial = await PipelineRunner.runIncremental({ sourceImage: img }, {}, { contour: 80, hatch: 80 }, 1);
  const cachedOutputs = {
    stage1: initial.stage1,
    stage2: initial.stage2,
    stage3: initial.stage3
  };

  // Run incrementally from Stage 4 with different hatch settings
  const progressReports = [];
  const incremental = await PipelineRunner.runIncremental(
    { sourceImage: img },
    cachedOutputs,
    { contour: 80, hatch: 100, cross: 80 },
    4,
    null,
    (stageIndex, pct) => progressReports.push({ stageIndex, pct })
  );

  // Verify Stage 1..3 were untouched and strictly equal by reference
  assert.equal(incremental.stage1, cachedOutputs.stage1);
  assert.equal(incremental.stage2, cachedOutputs.stage2);
  assert.equal(incremental.stage3, cachedOutputs.stage3);

  // Verify Stage 4 and 5 were freshly computed
  assert.ok(incremental.stage4);
  assert.ok(incremental.stage5);
  assert.equal(progressReports.length, 2, 'only Stage 4 and 5 emitted progress');
  assert.equal(progressReports[0].stageIndex, 4);
  assert.equal(progressReports[1].stageIndex, 5);
});

test('PipelineRunner: Aborts gracefully when AbortSignal triggers', async () => {
  const img = makeSyntheticImage((x, y) => 128);
  const controller = new AbortController();
  controller.abort('USER_CANCEL_PIPELINE');

  await assert.rejects(
    async () => {
      await PipelineRunner.runIncremental({ sourceImage: img }, {}, {}, 1, controller.signal);
    },
    (err) => {
      assert.equal(err.name, 'AbortError');
      return true;
    }
  );
});
