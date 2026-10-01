const test = require('node:test');
const assert = require('node:assert/strict');

const Stage2 = require('../src/core/pipeline/stage2-tone-flow.js');
const Stage4 = require('../src/core/pipeline/stage4-hatching.js');

function makeTexturedImage(w = 600, h = 600) {
  const pixels = new Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // High frequency checker/stripe texture simulating fabric / hair / fine wrinkles
      const macro = Math.sin(x * 0.02) * 60 + 128;
      const micro = ((x ^ y) & 4) ? 25 : -25;
      pixels[y * w + x] = Math.max(0, Math.min(255, Math.round(macro + micro)));
    }
  }
  return { width: w, height: h, pixels };
}

test('High-Precision Tone & Flow Field: detailField preserves micro-textures', () => {
  const img = makeTexturedImage(600, 600);
  const toneField = Stage2.computeToneField(img, { detailBoost: 70 });

  assert.ok(toneField.detailField, 'DetailField should be computed');
  assert.equal(toneField.detailField.length, 600 * 600);

  // Measure variance of detail field: micro-textures must not be zeroed out
  let sumSq = 0;
  for (let i = 0; i < toneField.detailField.length; i++) {
    sumSq += toneField.detailField[i] * toneField.detailField[i];
  }
  const variance = sumSq / toneField.detailField.length;
  assert.ok(variance > 0.0001, `High-frequency detail layer should retain micro-contrast, got variance ${variance}`);
});

test('High-Precision Tone & Flow Field: anisotropic diffusion retains sharp coherence', () => {
  const img = makeTexturedImage(600, 600);
  const toneField = Stage2.computeToneField(img);
  const flowField = Stage2.computeFlowField(toneField, null);

  assert.ok(flowField.coherence.length === 600 * 600);
  let highCohCount = 0;
  for (let i = 0; i < flowField.coherence.length; i++) {
    if (flowField.coherence[i] > 0.18) highCohCount++;
  }
  const ratio = highCohCount / flowField.coherence.length;
  assert.ok(ratio > 0.35, `Coherent structure areas should exceed 35%, got ${(ratio * 100).toFixed(1)}%`);
});

test('High-Precision Hatching: generates dense smooth lines and micro-engraving flicks', () => {
  const img = makeTexturedImage(600, 600);
  const toneField = Stage2.computeToneField(img);
  const flowField = Stage2.computeFlowField(toneField, null);

  const paths = Stage4.runStage4(toneField, flowField, null, { density: 60, hatch: 100, cross: 60 });
  assert.ok(paths.length > 500, `Hatching should be dense and detailed, got ${paths.length} paths`);

  const microFlicks = paths.filter(p => p.mark === 'micro-flick');
  assert.ok(microFlicks.length > 0, `Micro-engraving layer should emit micro-flicks in texture regions, got ${microFlicks.length}`);
});
