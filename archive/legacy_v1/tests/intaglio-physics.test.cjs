'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const IntaglioPhysics = require('../src/core/intaglio-physics.js');

test('diagnostic test plate contains 5 distinct calibrated zones', () => {
  const plate = IntaglioPhysics.generateDiagnosticPlate(900, 660);
  assert.equal(plate.width, 900);
  assert.equal(plate.height, 660);

  // Check Zone 1 (Hairlines): shallow lines present
  let z1InkPixels = 0;
  for (let y = 50; y < 140; y++) {
    for (let x = 100; x < 800; x++) {
      if (plate.depth[y * 900 + x] > 0.02) z1InkPixels++;
    }
  }
  assert.ok(z1InkPixels > 100, 'Zone 1 should contain thin hairlines');

  // Check Zone 4 (Solid patch): dense deep groove
  let z4DeepPixels = 0;
  for (let y = 430; y < 510; y++) {
    for (let x = 100; x < 800; x++) {
      if (plate.depth[y * 900 + x] > 0.8) z4DeepPixels++;
    }
  }
  assert.ok(z4DeepPixels > 10000, 'Zone 4 should contain solid deep groove');

  // Check Zone 5 (Clean polished copper): pure white, depth = 0
  let z5DepthSum = 0;
  for (let y = 540; y < 600; y++) {
    for (let x = 100; x < 800; x++) {
      z5DepthSum += plate.depth[y * 900 + x];
    }
  }
  assert.equal(z5DepthSum, 0, 'Zone 5 must remain completely clean polished copper');
});

test('wiping cleanly separates plate tone from deep groove ink', () => {
  const plate = IntaglioPhysics.generateDiagnosticPlate(900, 660);

  // Light wiping: residual plate tone is high
  const dirtyState = IntaglioPhysics.simulateInkingAndWiping(plate, {
    inkLoad: 1.0,
    wiping: 0.1,
    plateToneBias: 0.12,
  });

  // Clean wiping: residual plate tone is wiped away
  const cleanState = IntaglioPhysics.simulateInkingAndWiping(plate, {
    inkLoad: 1.0,
    wiping: 0.95,
    plateToneBias: 0.01,
  });

  // Sample blank surface pixel in Zone 5 (x=450, y=560)
  const blankIdx = 560 * 900 + 450;
  assert.ok(dirtyState.surfaceInk[blankIdx] > cleanState.surfaceInk[blankIdx] * 4,
    'Surface ink in clean wipe must be substantially lower than dirty wipe');

  // Sample deep groove in Zone 4 (x=450, y=470)
  const deepIdx = 470 * 900 + 450;
  assert.ok(cleanState.grooveInk[deepIdx] > 0.5, 'Deep groove retains rich ink even when wiped clean');
  // Groove ink should not collapse like surface ink
  const ratio = cleanState.grooveInk[deepIdx] / dirtyState.grooveInk[deepIdx];
  assert.ok(ratio > 0.65, 'Deep groove is shielded from aggressive surface wiping');
});

test('low pressure causes hairline skipping while high pressure transfers completely', () => {
  const plate = IntaglioPhysics.generateDiagnosticPlate(900, 660);
  const inkState = IntaglioPhysics.simulateInkingAndWiping(plate, {
    inkLoad: 1.0,
    wiping: 0.85,
    plateToneBias: 0.02,
  });

  // Low pressure print
  const lowP = IntaglioPhysics.simulateTransfer(plate, inkState, {
    pressure: 18,
    paper: 'rough',
    seed: 42,
  });

  // High pressure print
  const highP = IntaglioPhysics.simulateTransfer(plate, inkState, {
    pressure: 85,
    paper: 'rough',
    seed: 42,
  });

  // Sample Zone 1 thinnest hairline (around y=67, x from 100 to 700)
  let lowHairlineSum = 0, highHairlineSum = 0;
  let lowBreaks = 0;
  const lineY = 67;
  for (let x = 150; x < 750; x++) {
    const valLow = lowP.transferred[lineY * 900 + x];
    const valHigh = highP.transferred[lineY * 900 + x];
    lowHairlineSum += valLow;
    highHairlineSum += valHigh;
    if (valLow < 0.03) lowBreaks++;
  }

  assert.ok(highHairlineSum > lowHairlineSum * 2, 'High pressure transfers hairlines with far greater ink body');
  assert.ok(lowBreaks > 50, 'Low pressure on rough paper creates physical line breaks / chattering');
});

test('realistic plate mark embossing is formed around copper bevel edges', () => {
  const plate = IntaglioPhysics.createPlate(900, 660);
  const inkState = IntaglioPhysics.simulateInkingAndWiping(plate);
  const result = IntaglioPhysics.simulateTransfer(plate, inkState, { pressure: 70 });

  // Outside plate mark bevel: embossing = 0, transferred = 0
  const outsideIdx = 5 * 900 + 5;
  assert.equal(result.embossing[outsideIdx], 0);
  assert.equal(result.transferred[outsideIdx], 0);

  // Inside plate plateau: embossing = 1.0
  const insideIdx = 330 * 900 + 450;
  assert.equal(result.embossing[insideIdx], 1.0);

  // On the bevel slope: embossing is smoothly intermediate between 0 and 1
  const bevelIdx = result.plateBounds.top * 900 + 450;
  assert.ok(result.embossing[bevelIdx] >= 0 && result.embossing[bevelIdx] <= 1.0);
});

test('acid etching expands laterally (lateral bite) and deepens grooves', () => {
  const plate = IntaglioPhysics.createPlate(200, 200);
  // Cut a 1-pixel center slit
  for (let y = 80; y <= 120; y++) {
    plate.exposed[y * 200 + 100] = 0.8;
  }

  const initialD = plate.depth[100 * 200 + 100];
  const initialNeighborExp = plate.exposed[100 * 200 + 101];
  assert.equal(initialD, 0);
  assert.equal(initialNeighborExp, 0);

  // Run etching for 3 seconds with strength 0.8
  IntaglioPhysics.simulateEtching(plate, 0.8, 3.0, 0.4);

  // Center groove deepened
  assert.ok(plate.depth[100 * 200 + 100] > 0.15, 'Acid must deepen exposed groove');
  // Neighbor acquired lateral bite
  assert.ok(plate.exposed[100 * 200 + 101] > 0.05, 'Acid must bite laterally into neighboring copper');
});
