const test = require('node:test');
const assert = require('node:assert/strict');

const HatchDistance = require('../src/core/hatching/curves/hatch-distance.js');
const HatchField = require('../src/core/hatching/fields/hatch-field.js');
const HatchStreamline = require('../src/core/hatching/curves/hatch-streamline.js');
const HatchOptimizer = require('../src/core/hatching/curves/hatch-optimizer.js');
const HatchTone = require('../src/core/hatching/curves/hatch-tone.js');
const HatchBackground = require('../src/core/hatching/curves/hatch-background.js');

test('Sub-Module 2.0: HatchTone knee-point highlight suppression and 5-tier slicing', () => {
  const w = 10, h = 10;
  const rawTone = new Float32Array(w * h);
  // Fill gradient from 0.0 to 1.0
  for (let i = 0; i < w * h; i++) rawTone[i] = i / (w * h - 1);

  const { printTone, tiers } = HatchTone.remapToneAndTiers(rawTone, w, h, { whiteKnee: 0.30 });

  // Anything <= 0.30 should be clamped strictly to 0.0 (Tier 0 paper white)
  for (let i = 0; i < Math.floor(w * h * 0.30); i++) {
    assert.equal(printTone[i], 0.0);
    assert.equal(tiers[i], 0);
  }

  // Deep shadow at end should be Tier 3 or 4
  const lastIdx = w * h - 1;
  assert.ok(printTone[lastIdx] > 0.80);
  assert.ok(tiers[lastIdx] >= 3);
});

test('Sub-Module 2.1: HatchBackground provides vignette and natural shadow breathing', () => {
  const w = 20, h = 20;
  const printTone = new Float32Array(w * h).fill(0.35); // Moderate tone
  const isForeground = new Uint8Array(w * h);
  // Foreground is a 6x6 box in center
  for (let y = 7; y < 13; y++) {
    for (let x = 7; x < 13; x++) {
      isForeground[y * w + x] = 1;
    }
  }

  // 1. Vignette mode: background is 100% white (0.0)
  const vig = HatchBackground.modulateBackgroundBreathing(printTone, isForeground, w, h, { mode: 'vignette' });
  assert.equal(vig[0], 0.0); // background is 0.0
  assert.ok(Math.abs(vig[10 * w + 10] - 0.35) < 1e-4); // foreground retains tone

  // 2. Natural-shadow mode: background tone below cutoff (0.40) is suppressed to 0.0
  const nat = HatchBackground.modulateBackgroundBreathing(printTone, isForeground, w, h, { mode: 'natural-shadow', bgCutoff: 0.40 });
  assert.equal(nat[0], 0.0); // 0.35 < 0.40 is suppressed
  assert.ok(Math.abs(nat[10 * w + 10] - 0.35) < 1e-4); // foreground retains tone
});

test('Sub-Module 2.2: exact Euclidean Distance Transform (SDF) and margin detection', () => {
  const w = 50, h = 50;
  const mask = new Uint8Array(w * h);

  // Single vertical line at x = 25
  for (let y = 0; y < h; y++) {
    mask[y * w + 25] = 1;
  }

  const sdf = HatchDistance.computeSDF(mask, w, h);

  // Distance at line should be 0
  assert.equal(sdf[20 * w + 25], 0);

  // Distance at x = 20 should be exactly 5.0 pixels
  assert.equal(Math.round(sdf[20 * w + 20]), 5);

  // Distance at x = 30 should be exactly 5.0 pixels
  assert.equal(Math.round(sdf[20 * w + 30]), 5);

  // Margin breach test with margin = 2.0
  assert.equal(HatchDistance.isMarginBreached(sdf, w, h, 25, 20, 2.0), true);
  assert.equal(HatchDistance.isMarginBreached(sdf, w, h, 24, 20, 2.0), true);
  assert.equal(HatchDistance.isMarginBreached(sdf, w, h, 20, 20, 2.0), false);
});

test('Sub-Module 2.1: topological cross-field computes normalized tangents and conjugate angle', () => {
  const w = 60, h = 60;
  const tone = new Float32Array(w * h);

  // Horizontal gradient: left is white (0), right is dark (1)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tone[y * w + x] = x / (w - 1);
    }
  }

  const toneField = { width: w, height: h, tone };
  const field = HatchField.computeCrossField(toneField, null, { crossAngle: 68 });

  assert.equal(field.width, w);
  assert.equal(field.height, h);
  assert.equal(field.ux.length, w * h);
  assert.equal(field.vx.length, w * h);

  // In horizontal gradient, isophotes are vertical lines (tangent is y-axis: ux ~ 0, |uy| ~ 1)
  const [tx, ty] = HatchField.sampleTangent(field, 'primary', 30, 30);
  assert.ok(Math.hypot(tx, ty) > 0.99 && Math.hypot(tx, ty) < 1.01);
  assert.ok(Math.abs(ty) > 0.85, `Expected dominant vertical flow, got ty=${ty}, tx=${tx}`);

  // Cross field should be rotated by approx 68 degrees
  const [cx, cy] = HatchField.sampleTangent(field, 'cross', 30, 30);
  const dot = tx * cx + ty * cy;
  // Cos(68 deg) approx 0.3746
  assert.ok(Math.abs(dot) < 0.65, `Expected conjugate angle separation, dot=${dot}`);
});

test('Sub-Module 2.3: Jobard-Lefer streamline generation guarantees highlight safety & determinism', () => {
  const w = 80, h = 80;
  const tone = new Float32Array(w * h);

  // Left half is paper white (0.0), Right half has shadow (0.75)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tone[y * w + x] = x < 40 ? 0.02 : 0.75;
    }
  }

  const toneField = { width: w, height: h, tone };
  const field = HatchField.computeCrossField(toneField, null);
  const mask = new Uint8Array(w * h);
  // Add an obstacle boundary at x = 60
  for (let y = 0; y < h; y++) mask[y * w + 60] = 1;
  const sdf = HatchDistance.computeSDF(mask, w, h);

  const paths = HatchStreamline.generateStreamlines(field, toneField, sdf, {
    minSpacing: 2.5,
    maxSpacing: 6.0,
    kissingMargin: 2.5,
    minPoints: 6
  });

  assert.ok(paths.length > 0, 'Streamlines should be generated');

  for (const path of paths) {
    // 1. Zero broken stubs rule
    assert.ok(path.points.length >= 6, `Stroke must have >= 6 points, got ${path.points.length}`);

    // 2. Paper white highlight preservation rule: no stroke point inside x < 38
    for (const pt of path.points) {
      assert.ok(pt[0] >= 38, `Highlight breached: point at x=${pt[0]} in white zone`);
      // 3. Kissing margin rule: no point within 2.0px of obstacle at x = 60
      const distToObstacle = Math.abs(pt[0] - 60);
      assert.ok(distToObstacle >= 1.9, `Obstacle margin breached: dist=${distToObstacle} at x=${pt[0]}`);
    }
  }

  // 4. Determinism: re-running gives identical path count and points
  const paths2 = HatchStreamline.generateStreamlines(field, toneField, sdf, {
    minSpacing: 2.5,
    maxSpacing: 6.0,
    kissingMargin: 2.5,
    minPoints: 6
  });

  assert.equal(paths.length, paths2.length);
  assert.deepEqual(paths[0].points, paths2[0].points);
});

test('Sub-Module 2.4: burin dynamics, serpentine toolpath chaining, and SVG/GCode export', () => {
  const dummyPaths = [
    { role: 'hatch', points: [[10, 10], [10, 20], [10, 30]], baseWidth: 0.3 },
    { role: 'hatch', points: [[13, 30], [13, 20], [13, 10]], baseWidth: 0.3 }
  ];

  const toneField = { width: 50, height: 50, tone: new Float32Array(2500).fill(0.5) };
  const shaped = HatchOptimizer.applyBurinDynamics(dummyPaths, toneField);

  assert.equal(shaped.length, 2);
  assert.equal(shaped[0].taper, true);
  assert.ok(shaped[0].width > 0);

  // Test toolpath chaining (distance between (10,30) and (13,30) is 3.0 < 8.0)
  const chained = HatchOptimizer.chainContinuousToolpaths(dummyPaths, 5.0);
  assert.equal(chained.length, 1, 'Two adjacent strokes should merge into one continuous toolpath');
  assert.equal(chained[0].points.length, 6);

  // Test SVG export
  const svg = HatchOptimizer.exportToSVG(shaped, 50, 50);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('stroke-width='));
  assert.ok(svg.includes('</svg>'));

  // Test G-code export
  const gcode = HatchOptimizer.exportToGCode(shaped);
  assert.ok(gcode.includes('G21'));
  assert.ok(gcode.includes('G00 Z'));
  assert.ok(gcode.includes('G01 X'));
  assert.ok(gcode.includes('M02'));
});
