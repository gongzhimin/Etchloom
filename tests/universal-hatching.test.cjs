const test = require('node:test');
const assert = require('node:assert/strict');
const HatchInkBudget = require('../src/core/hatching/rules/hatch-ink-budget.js');
const HatchCoherenceGate = require('../src/core/hatching/rules/hatch-coherence-gate.js');
const Stage4Hatching = require('../src/core/pipeline/stage4-hatching.js');
const Stage5MasterPrint = require('../src/core/pipeline/stage5-master-print.js');

test('Sub-Module 2.7: HatchInkBudget enforces spatial ink conservation without materialType', () => {
  const w = 100, h = 100;
  const n = w * h;
  const tone = new Float32Array(n).fill(0.75);
  const toneField = { width: w, height: h, tone };

  // Create dense cluster of contours (like food garnish or flower petals) in the center (x: 40..60, y: 40..60)
  const denseContours = [];
  for (let y = 40; y <= 60; y += 2) {
    const pts = [];
    for (let x = 40; x <= 60; x++) pts.push([x, y]);
    denseContours.push({ points: pts });
  }

  const budget = HatchInkBudget.computeHatchBudget(toneField, null, denseContours);

  // Center should have budget ZERO (100% exempt due to existing ink!)
  assert.equal(budget[50 * w + 50], 0.0, 'Center with dense contours must have 0 hatch budget');

  // Empty corner (x: 5, y: 5) should have positive budget
  assert.ok(budget[5 * w + 5] > 0.5, 'Empty area should have positive budget');
});

test('Sub-Module 2.8: HatchCoherenceGate suppresses isotropic planar surfaces without materialType', () => {
  const w = 100, h = 100;
  const n = w * h;
  const budget = new Float32Array(n).fill(0.8);
  const tone = new Float32Array(n).fill(0.85);
  const detailField = new Float32Array(n).fill(0.001); // smooth wall
  const toneField = { width: w, height: h, tone, detailField };

  // Flow field with low coherence (isotropic noise, e.g. 0.15)
  const flowField = {
    width: w,
    height: h,
    coherence: new Float32Array(n).fill(0.15)
  };

  const { gatedBudget, isPlanar } = HatchCoherenceGate.gateByCoherenceAndFlatness(budget, flowField, toneField, null);

  // Flat smooth surface must be gated to 0.0 and marked planar
  assert.equal(isPlanar[50 * w + 50], 1, 'Smooth low-coherence area must be marked planar');
  assert.equal(gatedBudget[50 * w + 50], 0.0, 'Planar surface must have 0 gated budget');

  // Now test high-coherence 3D curved surface (coherence = 0.85, detail = 0.08)
  const flow3D = {
    width: w,
    height: h,
    coherence: new Float32Array(n).fill(0.85)
  };
  const detail3D = new Float32Array(n).fill(0.08);
  const tone3D = { width: w, height: h, tone, detailField: detail3D };

  const res3D = HatchCoherenceGate.gateByCoherenceAndFlatness(budget, flow3D, tone3D, null);
  assert.equal(res3D.isPlanar[50 * w + 50], 0, '3D curved surface must NOT be marked planar');
  assert.ok(res3D.gatedBudget[50 * w + 50] > 0.5, '3D curved surface must retain hatch budget');
});

test('Universal Category-Agnostic Integration: zero materialType needed', () => {
  const w = 120, h = 120;
  const n = w * h;

  // Simulate a scene with smooth wall on top (low coherence, tone=0.85)
  // and 3D curved cylinder on bottom (high coherence, tone=0.85)
  const tone = new Float32Array(n).fill(0.85);
  const detailField = new Float32Array(n);
  const coherence = new Float32Array(n);

  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < w; x++) {
      detailField[y * w + x] = 0.001; // smooth
      coherence[y * w + x] = 0.15;   // isotropic
    }
  }
  for (let y = 60; y < h; y++) {
    for (let x = 0; x < w; x++) {
      detailField[y * w + x] = 0.06;  // texture
      coherence[y * w + x] = 0.85;   // directional
    }
  }

  const toneField = { width: w, height: h, tone, detailField };
  const flowField = {
    width: w, height: h,
    vx: new Float32Array(n).fill(1),
    vy: new Float32Array(n).fill(0),
    ux: new Float32Array(n).fill(0),
    uy: new Float32Array(n).fill(1),
    coherence
  };

  // Run Stage 4 with ZERO materialType parameter!
  const hatching = Stage4Hatching.runStage4(toneField, flowField, null, {});

  // Run Stage 5 with ZERO materialType parameter!
  const master = Stage5MasterPrint.runStage5([], hatching, toneField, flowField, {});

  // Check top (smooth) vs bottom (curved)
  let topHatch = 0, bottomHatch = 0;
  for (const p of hatching) {
    if (!p.points || p.points.length === 0) continue;
    const centerY = (p.points[0][1] + p.points[p.points.length - 1][1]) * 0.5;
    if (centerY < 55) topHatch++;
    else bottomHatch++;
  }

  assert.equal(topHatch, 0, 'Smooth wall on top must receive 0 hatching');
  assert.ok(bottomHatch > 0, '3D surface on bottom must receive volume hatching');
  assert.ok(master.paths.length > 0, 'Master print must assemble successfully');
});
