const { test } = require('node:test');
const assert = require('node:assert/strict');
const { VirtualPlateEngine } = require('../src/core/plate/engine/virtual-plate-engine.js');

test('VirtualPlateEngine: Initialization and Allocation', () => {
  const engine = new VirtualPlateEngine(900);
  assert.equal(engine.width, 900);
  assert.equal(engine.height, 660);
  assert.equal(engine.pixelCount, 900 * 660);
  assert.equal(engine.depthField.length, 900 * 660);
  assert.equal(engine.exposedField.length, 900 * 660);
  assert.equal(engine.blockedField.length, 900 * 660);
  assert.equal(engine.burrField.length, 900 * 660);

  // Invalid sizes throw
  assert.throws(() => engine.allocatePlate(800), /版面尺寸无效/);

  // 1500 and 3000 allocation
  engine.allocatePlate(1500);
  assert.equal(engine.width, 1500);
  assert.equal(engine.height, 1100);
  assert.equal(engine.pixelCount, 1500 * 1100);

  engine.allocatePlate(900);
});

test('VirtualPlateEngine: 4 plate-making tools have orthogonal physical behaviors', () => {
  const engine = new VirtualPlateEngine(900);
  const x = 400;
  const y = 300;
  const idx = y * 900 + x;

  // Tool 1: needle
  engine.applyToolDab(x, y, 1.0, 'needle', 4);
  const needleDepth = engine.depthField[idx];
  const needleBurr = engine.burrField[idx];
  const needleExposed = engine.exposedField[idx];
  assert.ok(needleDepth < 0.015, 'Needle should not bite deep copper directly');
  assert.equal(needleBurr, 0, 'Needle does not throw up metal burr');
  assert.ok(needleExposed > 0.5, 'Needle exposes bare copper through ground');

  // Tool 2: drypoint
  engine.clear();
  engine.applyToolDab(x, y, 1.0, 'dry', 4);
  const dryDepth = engine.depthField[idx];
  const dryBurr = engine.burrField[idx];
  assert.ok(dryDepth > 0.25, 'Drypoint cuts deeply into copper');
  assert.ok(dryBurr > 0.35, 'Drypoint throws up significant copper burr');

  // Tool 3: polish (burnisher)
  engine.applyToolDab(x, y, 1.0, 'polish', 4);
  const polishedDepth = engine.depthField[idx];
  const polishedBurr = engine.burrField[idx];
  assert.ok(polishedBurr < dryBurr * 0.3, 'Burnisher should crush away metal burr rapidly');
  assert.ok(polishedDepth < dryDepth, 'Burnisher should reduce groove depth');

  // Tool 4: stop-out varnish
  engine.applyToolDab(x, y, 1.0, 'stop', 4);
  assert.equal(engine.blockedField[idx], 1, 'Stop-out blocks area');
  assert.equal(engine.exposedField[idx], 0, 'Stop-out covers exposed area');
  assert.equal(engine.burrField[idx], 0, 'Stop-out coats burr');
});

test('VirtualPlateEngine: Chemical acid bite PDE simulation and stop-out protection', () => {
  const engine = new VirtualPlateEngine(900);
  const p1 = 200 * 900 + 300;
  const p2 = 200 * 900 + 301;

  engine.exposedField[p1] = 1.0;
  engine.exposedField[p2] = 1.0;
  engine.blockedField[p2] = 1; // Protected by stop-out

  engine.etch(1.0, 0.45, 0.45);

  assert.ok(engine.depthField[p1] > 0, 'Unblocked exposed copper is deepened by acid');
  assert.equal(engine.depthField[p2], 0, 'Stop-out blocked region is completely immune to acid');
  assert.equal(engine.elapsedAcidTime, 1.0);
});

test('VirtualPlateEngine: Pure headless rendering and horizontal mirroring', () => {
  const engine = new VirtualPlateEngine(900);

  // Draw a vertical line strictly on the left half of the plate (x = 200)
  for (let y = 200; y < 400; y++) {
    engine.depthField[y * 900 + 200] = 0.8;
  }

  // Render plate view
  const plateView = engine.render('plate');
  assert.equal(plateView.width, 900);
  assert.equal(plateView.height, 660);
  assert.equal(plateView.pixels.length, 900 * 660 * 4);

  // Render depth view
  const depthView = engine.render('depth');
  assert.equal(depthView.pixels.length, 900 * 660 * 4);

  // Render print view
  const printView = engine.render('print', { ink: 0.9, pressure: 0.8, tone: 0.04 });
  assert.equal(printView.pixels.length, 900 * 660 * 4);

  // On the print, x = 200 should be mirrored to x_mirrored = 900 - 1 - 200 = 699!
  // At y = 300:
  const plateIdxLeft = (300 * 900 + 200) * 4;
  const printIdxLeft = (300 * 900 + 200) * 4;
  const printIdxRight = (300 * 900 + 699) * 4;

  // On plate, left side is etched.
  // On print, right side (x=699) must receive the dark ink (lower R,G,B value) while left side remains paper white!
  const leftPrintLum = printView.pixels[printIdxLeft]; // paper base ~ 240
  const rightPrintLum = printView.pixels[printIdxRight]; // inked groove < 100

  assert.ok(leftPrintLum > 200, 'Left side on paper should remain clean paper base');
  assert.ok(rightPrintLum < 100, 'Right side on paper receives mirrored dark intaglio ink');
});

test('VirtualPlateEngine: Snapshot and Undo Stack', () => {
  const engine = new VirtualPlateEngine(900);
  const idx = 100 * 900 + 100;

  engine.depthField[idx] = Math.fround(0.5);
  engine.snapshot();

  engine.depthField[idx] = Math.fround(0.9);
  assert.equal(engine.depthField[idx], Math.fround(0.9));

  const restored = engine.undo();
  assert.ok(restored);
  assert.equal(engine.depthField[idx], Math.fround(0.5));

  const emptyUndo = engine.undo();
  assert.equal(emptyUndo, false);
});

test('VirtualPlateEngine: Serialization and Roundtrip with PlateCodec', () => {
  const engine = new VirtualPlateEngine(900);
  engine.depthField[100] = Math.fround(0.45);
  engine.exposedField[100] = Math.fround(0.75);
  engine.blockedField[200] = 1;
  engine.elapsedAcidTime = 15;
  engine.plateSources = [{ test: true }];

  const state = engine.exportState({ paperMM: 300 });
  assert.equal(state.width, 900);
  assert.equal(state.paperMM, 300);

  const engine2 = new VirtualPlateEngine(900);
  engine2.importState(state);

  assert.equal(engine2.depthField[100], Math.fround(0.45));
  assert.equal(engine2.exposedField[100], Math.fround(0.75));
  assert.equal(engine2.blockedField[200], 1);
  assert.equal(engine2.elapsedAcidTime, 15);
  assert.equal(engine2.plateSources[0].test, true);
});
