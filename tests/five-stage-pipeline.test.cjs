const test = require('node:test');
const assert = require('node:assert/strict');

const Stage1 = require('../src/core/pipeline/stage1-informative.js');
const Stage2 = require('../src/core/pipeline/stage2-tone-flow.js');
const Stage3 = require('../src/core/pipeline/stage3-contours.js');
const Stage4 = require('../src/core/pipeline/stage4-hatching.js');
const Stage5 = require('../src/core/pipeline/stage5-master-print.js');
const PhotoPro = require('../src/core/image/photo-pro.js');

function makeSyntheticImage(fn, w = 900, h = 660) {
  const pixels = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      pixels[y * w + x] = Math.round(Math.max(0, Math.min(255, fn(x, y))));
    }
  }
  return { width: w, height: h, pixels };
}

test('Five-Stage Pipeline: Stage 1 to Stage 5 End-to-End Execution', async () => {
  // Synthetic portrait fixture: face circle + eye lines + background
  const img = makeSyntheticImage((x, y) => {
    const dx = x - 450, dy = y - 330;
    const dist = Math.hypot(dx, dy);
    if (dist < 180) {
      // Inside face: bright with two dark eyes
      if (Math.hypot(x - 390, y - 300) < 18 || Math.hypot(x - 510, y - 300) < 18) return 30;
      return 210;
    }
    return 60; // Dark background
  });

  // 1. Stage 1: LineMap
  const lineMap = await Stage1.runStage1(img);
  assert.ok(lineMap);
  assert.equal(lineMap.width, 900);
  assert.equal(lineMap.height, 660);
  assert.equal(lineMap.data.length, 900 * 660);
  assert.ok(lineMap.data.some(v => v < 0.9), 'LineMap should detect facial and edge boundaries');

  // 2. Stage 2: Tone & Flow Field
  const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50 });
  assert.ok(toneField && flowField);
  assert.equal(toneField.tone.length, 900 * 660);
  assert.equal(flowField.vx.length, 900 * 660);
  assert.equal(flowField.coherence.length, 900 * 660);
  assert.ok(flowField.coherence.some(c => c > 0.3), 'Tensor flow field should have strong coherence at edges');

  // 3. Stage 3: Contours with Engraving Grammar
  const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, { contour: 85 });
  assert.ok(vectorContours.length > 0, 'Vector contours should be extracted');
  assert.ok(contourMask.some(v => v > 0), 'Contour collision mask should be populated');
  for (const c of vectorContours) {
    assert.ok(c.points.length >= 2);
    assert.ok(c.widths.length === c.points.length);
    // Endpoint tapering verification
    assert.ok(c.widths[0] <= c.widths[Math.floor(c.widths.length / 2)]);
  }

  // 4. Stage 4: Hatching with Collision Avoidance
  const hatchingPaths = Stage4.runStage4(toneField, flowField, contourMask, { hatch: 100, density: 50 });
  assert.ok(hatchingPaths.length > 0, 'Hatching streamlines should be generated');

  // 5. Stage 5: Master Print Assembly
  const master = Stage5.runStage5(vectorContours, hatchingPaths, toneField, flowField);
  assert.ok(master.paths.length > 0);
  assert.equal(master.width, 900);
  assert.equal(master.height, 660);
  assert.ok(master.stats.contours > 0);
  assert.ok(master.stats.hatchings > 0);
  assert.ok(master.stats.totalPaths === master.paths.length);
});

test('Five-Stage Pipeline: PhotoPro computeStages exposes all 5 stages', () => {
  const img = makeSyntheticImage((x, y) => (x > 300 && x < 600 ? 50 : 220));
  const stages = PhotoPro.computeStages(img, { contour: 80, hatch: 90 });
  assert.ok(stages);
  assert.ok(stages.stage1, 'stage1 LineMap present');
  assert.ok(stages.stage2, 'stage2 Tone & Flow present');
  assert.ok(stages.stage3, 'stage3 Contours present');
  assert.ok(stages.stage4, 'stage4 Hatching present');
  assert.ok(stages.stage5, 'stage5 Master Print present');
});

test('Five-Stage Pipeline: Layered Subdirectories and Facade Shims Parity', () => {
  // Verify pipeline/ subfolder
  const Stage1Direct = require('../src/core/pipeline/stage1-informative.js');
  const Stage1Facade = require('../src/core/pipeline/stage1-informative.js');
  assert.equal(Stage1Direct, Stage1Facade, 'Stage1 direct and facade exports must be identical');

  // Verify codecs/ subfolder
  const CodecDirect = require('../src/core/codecs/plate-codec.js');
  const CodecFacade = require('../src/core/codecs/plate-codec.js');
  assert.equal(CodecDirect, CodecFacade, 'PlateCodec direct and facade exports must be identical');

  // Verify image/ subfolder
  const PhotoDirect = require('../src/core/image/photo-pro.js');
  const PhotoFacade = require('../src/core/image/photo-pro.js');
  assert.equal(PhotoDirect, PhotoFacade, 'PhotoPro direct and facade exports must be identical');

  // Verify hatching/ fields, rules, curves subfolders
  const FieldDirect = require('../src/core/hatching/fields/hatch-field.js');
  const FieldFacade = require('../src/core/hatching/fields/hatch-field.js');
  assert.equal(FieldDirect, FieldFacade, 'HatchField direct and facade exports must be identical');

  const AttentionDirect = require('../src/core/hatching/rules/hatch-attention.js');
  const AttentionFacade = require('../src/core/hatching/rules/hatch-attention.js');
  assert.equal(AttentionDirect, AttentionFacade, 'HatchAttention direct and facade exports must be identical');

  const DistanceDirect = require('../src/core/hatching/curves/hatch-distance.js');
  const DistanceFacade = require('../src/core/hatching/curves/hatch-distance.js');
  assert.equal(DistanceDirect, DistanceFacade, 'HatchDistance direct and facade exports must be identical');
});
