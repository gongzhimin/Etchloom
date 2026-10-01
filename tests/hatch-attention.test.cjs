const test = require('node:test');
const assert = require('node:assert/strict');
const HatchAttention = require('../src/core/hatching/rules/hatch-attention.js');
const HatchMaterialRules = require('../src/core/hatching/rules/hatch-material-rules.js');
const Stage4Hatching = require('../src/core/pipeline/stage4-hatching.js');

test('Sub-Module 3.1: HatchAttention computes line spatial self-inhibition', () => {
  const w = 100, h = 100;
  const lineData = new Float32Array(w * h).fill(1.0); // all white

  // Draw a dark feature in the center (x: 45..55, y: 45..55)
  for (let y = 45; y <= 55; y++) {
    for (let x = 45; x <= 55; x++) {
      lineData[y * w + x] = 0.0; // pure black line
    }
  }

  const lineMap = { width: w, height: h, data: lineData };
  const inhibition = HatchAttention.computeLineAttentionInhibition(lineMap, { sigma: 6, saturationThreshold: 0.1 });

  // Center must have high inhibition
  const centerInh = inhibition[50 * w + 50];
  assert.ok(centerInh > 0.8, `Center inhibition should be > 0.8, got ${centerInh}`);

  // Far away corners (x: 5, y: 5) must have zero inhibition
  const cornerInh = inhibition[5 * w + 5];
  assert.equal(cornerInh, 0.0, `Corner inhibition should be 0, got ${cornerInh}`);
});

test('Sub-Module 2.1: HatchMaterialRules enforces food exemption and ceramic single-direction', () => {
  const w = 100, h = 100;
  const lineMap = { width: w, height: h, data: new Float32Array(w * h).fill(1.0) };

  // Food override test
  const foodRes = HatchMaterialRules.computeMaterialExemption(lineMap, null, [], { materialType: 'food' });
  assert.equal(foodRes.suppressCrossHatch, true);
  assert.equal(foodRes.exemptionMask[0], 1);
  assert.equal(foodRes.exemptionMask[50 * w + 50], 1);

  // Ceramic override test
  const ceramicRes = HatchMaterialRules.computeMaterialExemption(lineMap, null, [], { materialType: 'ceramic' });
  assert.equal(ceramicRes.suppressCrossHatch, true);

  // Organic stroke cluster auto-detection test
  const denseContours = [];
  for (let k = 0; k < 60; k++) {
    const pts = [];
    for (let i = 40; i <= 60; i++) pts.push([i, 40 + k % 20]);
    denseContours.push({ points: pts });
  }
  const autoRes = HatchMaterialRules.computeMaterialExemption(lineMap, null, denseContours);
  assert.equal(autoRes.exemptionMask[50 * w + 50], 1, 'Dense cluster center should be exempted');
  assert.equal(autoRes.exemptionMask[5 * w + 5], 0, 'Sparse corner should not be exempted');
});

test('Stage 4 Integration: attention and material rules strictly restrain shading lines', () => {
  const w = 120, h = 120;
  const n = w * h;

  // Tone field: dark everywhere (0.8) so hatching would normally flood
  const tone = new Float32Array(n).fill(0.8);
  const toneField = { width: w, height: h, tone };

  // Line map with dark feature in top-half
  const lineData = new Float32Array(n).fill(1.0);
  for (let y = 10; y < 60; y++) {
    for (let x = 10; x < 110; x++) {
      if ((x + y) % 3 === 0) lineData[y * w + x] = 0.0; // dense Informative lines
    }
  }
  const lineMap = { width: w, height: h, data: lineData };

  // Run Stage 4
  const paths = Stage4Hatching.runStage4(toneField, null, null, {
    lineMap,
    density: 50,
    hatch: 100
  });

  // Check where hatching lines fall
  let topHalfHatch = 0;
  let bottomHalfHatch = 0;

  for (const p of paths) {
    if (!p.points || p.points.length === 0) continue;
    const midY = p.points[0][1];
    if (midY < 60) topHalfHatch++;
    else bottomHalfHatch++;
  }

  // Top-half has dense lines, so line attention must heavily suppress hatching there!
  assert.ok(bottomHalfHatch > topHalfHatch * 3, `Top-half hatch (${topHalfHatch}) should be heavily suppressed compared to bottom (${bottomHalfHatch})`);
});
