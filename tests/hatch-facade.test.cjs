const test = require('node:test');
const assert = require('node:assert/strict');
const HatchFacadeRules = require('../src/core/hatching/rules/hatch-facade-rules.js');
const HatchManhattanFlow = require('../src/core/hatching/fields/hatch-manhattan-flow.js');
const Stage4Hatching = require('../src/core/pipeline/stage4-hatching.js');
const Stage5MasterPrint = require('../src/core/pipeline/stage5-master-print.js');

test('Sub-Module 2.5: HatchFacadeRules detects smooth planar facades and exempts them', () => {
  const w = 100, h = 100;
  const n = w * h;

  // Tone field: dark uniform wall (0.85), flat detailField (0.0001)
  const tone = new Float32Array(n).fill(0.85);
  const detailField = new Float32Array(n).fill(0.0001);
  const toneField = { width: w, height: h, tone, detailField };

  // LineMap: pure white (no lines = 1.0)
  const lineMap = { width: w, height: h, data: new Float32Array(n).fill(1.0) };

  const facadeMask = HatchFacadeRules.detectPlanarFacades(toneField, lineMap, { materialType: 'architecture' });

  // Center should be detected as planar facade
  assert.equal(facadeMask[50 * w + 50], 1, 'Smooth wall center should be marked as facade');

  // If a region has high detail variance (e.g. textured brickwork or foliage)
  for (let y = 10; y < 30; y++) {
    for (let x = 10; x < 30; x++) {
      detailField[y * w + x] = (x % 2 === 0) ? 0.3 : -0.3;
    }
  }
  const facadeMask2 = HatchFacadeRules.detectPlanarFacades(toneField, lineMap, { materialType: 'architecture' });
  assert.equal(facadeMask2[20 * w + 20], 0, 'Textured region should NOT be marked as flat facade');
});

test('Sub-Module 2.6: HatchManhattanFlow snaps architectural flow to rigid axes', () => {
  const w = 20, h = 20;
  const n = w * h;

  // Flow tilted slightly at 15 degrees
  const angle = 15 * (Math.PI / 180);
  const vx = new Float32Array(n).fill(Math.cos(angle));
  const vy = new Float32Array(n).fill(Math.sin(angle));
  const crossField = { width: w, height: h, vx, vy, ux: new Float32Array(n), uy: new Float32Array(n) };

  const regularized = HatchManhattanFlow.regularizeArchitecturalFlow(crossField, [0, Math.PI * 0.5], { snapStrength: 0.95 });

  // Resulting angle should be snapped close to 0 (horizontal, < 6 degrees / 0.10 rad)
  const resAngle = Math.atan2(regularized.vy[0], regularized.vx[0]);
  assert.ok(Math.abs(resAngle) < 0.10, `Snapped angle should be near 0, got ${resAngle}`);
});

test('Stage 4 & 5 Architectural Integration: cleans facades and suppresses dark masses', () => {
  const w = 120, h = 120;
  const n = w * h;

  // Tone field: dark flat wall (0.85)
  const tone = new Float32Array(n).fill(0.85);
  const toneField = { width: w, height: h, tone, detailField: new Float32Array(n).fill(0) };
  const lineMap = { width: w, height: h, data: new Float32Array(n).fill(1.0) };

  // Stage 4 with materialType: 'architecture'
  const hatching = Stage4Hatching.runStage4(toneField, null, null, {
    lineMap,
    materialType: 'architecture'
  });

  // Since it's a flat facade, hatching should be completely zeroed!
  assert.equal(hatching.length, 0, `Hatching on flat architectural wall should be 0, got ${hatching.length}`);

  // Stage 5 with materialType: 'architecture'
  const master = Stage5MasterPrint.runStage5([], hatching, toneField, null, {
    materialType: 'architecture'
  });

  // Dark masses must be 0 in architecture mode
  assert.equal(master.stats.darkMasses, 0, `Dark masses in architecture must be 0, got ${master.stats.darkMasses}`);
});
