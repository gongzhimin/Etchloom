const test = require('node:test');
const assert = require('node:assert/strict');

const Stage3 = require('../src/core/pipeline/stage3-contours.js');
const HatchInkBudget = require('../src/core/hatching/rules/hatch-ink-budget.js');

test('Lotus 3D Integration: Stage 3 Contours Depth Modulation (Aerial Perspective)', async (t) => {
  const w = 50, h = 50;
  const n = w * h;

  // Linear depth map: top is near (z=0.1), bottom is far (z=0.9)
  const depthData = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      depthData[y * w + x] = y / (h - 1);
    }
  }
  const depthMap = { width: w, height: h, data: depthData };

  const nearContour = {
    role: 'contour',
    points: [[10, 5], [15, 5], [20, 5], [25, 5], [30, 5]], // y = 5 -> z ~ 0.1
    widths: new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5]),
    width: 0.5
  };

  const farContour = {
    role: 'contour',
    points: [[10, 45], [15, 45], [20, 45], [25, 45], [30, 45]], // y = 45 -> z ~ 0.92
    widths: new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5]),
    width: 0.5
  };

  await t.test('attenuates distant contour widths while preserving near contour widths', () => {
    const modulated = Stage3.modulateContoursByDepth([nearContour, farContour], depthMap, w, h);
    assert.equal(modulated.length, 2);

    const mNear = modulated[0];
    const mFar = modulated[1];

    assert.ok(Math.abs(mNear.width - 0.5) < 0.01, `Near contour must retain ~0.50 width, got ${mNear.width}`);
    assert.ok(mFar.width < 0.35, `Far contour width must shrink (< 0.35), got ${mFar.width}`);
    assert.ok(mFar.width < mNear.width * 0.7, 'Far contour width must be at least 30% thinner than near contour');
  });

  await t.test('gracefully preserves contours when depthMap is null', () => {
    const rawContours = [nearContour, farContour];
    const dummyLineMap = { width: w, height: h, data: new Float32Array(n).fill(1.0) };
    const dummyTone = { width: w, height: h, tone: new Float32Array(n).fill(0.5) };

    const resWithDepth = Stage3.runStage3(dummyLineMap, dummyTone, { depthMap: null });
    assert.ok(Array.isArray(resWithDepth.vectorContours));
  });
});

test('Lotus 3D Integration: Stage 4 Curvature-Gated Ink Budget (Anti-Chaos & Carving)', async (t) => {
  const w = 40, h = 40;
  const n = w * h;

  const tone = new Float32Array(n).fill(0.6);
  const toneField = { width: w, height: h, tone };

  // Flat plane normals: (0, 0, 1) everywhere -> kappa = 0
  const flatNormals = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    flatNormals[i * 3] = 0.0;
    flatNormals[i * 3 + 1] = 0.0;
    flatNormals[i * 3 + 2] = 1.0;
  }
  const flatNormalMap = { width: w, height: h, normals: flatNormals };

  // Curved cylinder normals: normal varies across x -> kappa > 0.1
  const curvedNormals = new Float32Array(n * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const nx = Math.max(-0.95, Math.min(0.95, (x - 20) / 10));
      const nz = Math.sqrt(Math.max(0.01, 1.0 - nx * nx));
      curvedNormals[idx * 3] = nx;
      curvedNormals[idx * 3 + 1] = 0.0;
      curvedNormals[idx * 3 + 2] = nz;
    }
  }
  const curvedNormalMap = { width: w, height: h, normals: curvedNormals };

  await t.test('strictly zeroes hatching budget on flat planar surfaces (kappa = 0)', () => {
    const budget = HatchInkBudget.computeHatchBudget(toneField, null, [], {
      normalMap: flatNormalMap
    });
    // On flat plane (kappa < 0.035), all pixels must have 0.0 budget!
    let nonzeroCount = 0;
    for (let i = 0; i < n; i++) {
      if (budget[i] > 0) nonzeroCount++;
    }
    assert.equal(nonzeroCount, 0, `Flat planar surface must have exactly 0 hatching budget, got ${nonzeroCount} nonzero pixels`);
  });

  await t.test('allows hatching budget on 3D curved surfaces (kappa >= 0.07)', () => {
    const budget = HatchInkBudget.computeHatchBudget(toneField, null, [], {
      normalMap: curvedNormalMap
    });
    let nonzeroCount = 0;
    for (let i = 0; i < n; i++) {
      if (budget[i] > 0) nonzeroCount++;
    }
    assert.ok(nonzeroCount > 0, `3D curved cylinder must permit hatching budget, got ${nonzeroCount}`);
  });
});
