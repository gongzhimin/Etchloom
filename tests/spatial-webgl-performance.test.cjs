const test = require('node:test');
const assert = require('node:assert/strict');

const { MasterSpatialGrid, LoupeMagnifier } = require('../src/ui/components/loupe.js');
const PressRenderer = require('../src/core/plate/renderer/press-renderer.js');
const { VirtualPlateEngine } = require('../src/core/plate/engine/virtual-plate-engine.js');

test('Performance Architecture: MasterSpatialGrid indexes paths and accelerates frustum queries', () => {
  const grid = new MasterSpatialGrid(900, 660, 64);

  // Generate 200 synthetic paths across the canvas
  const paths = [];
  for (let i = 0; i < 200; i++) {
    const x0 = (i * 17) % 850;
    const y0 = (i * 23) % 620;
    paths.push({
      role: 'hatch',
      points: [[x0, y0], [x0 + 20, y0 + 15]],
      width: 0.8
    });
  }

  grid.indexPaths(paths);
  assert.equal(grid.indexedCount, 200);

  // Query a small 100x100 viewport around center (400, 300)
  const results = grid.queryFrustum(350, 250, 450, 350);
  assert.ok(Array.isArray(results));
  // Results should only contain paths in that localized frustum (significantly less than 200)
  assert.ok(results.length < paths.length);
  assert.ok(results.length > 0);

  // Outside bounds query should yield 0 hits
  const emptyHits = grid.queryFrustum(2000, 2000, 2100, 2100);
  assert.equal(emptyHits.length, 0);
});

test('Performance Architecture: LoupeMagnifier integrates MasterSpatialGrid vector culling', () => {
  const fakeCanvas = { width: 900, height: 660, getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 660 }) };
  const paths = [
    { points: [[100, 100], [120, 120]], width: 1.0 },
    { points: [[800, 600], [820, 620]], width: 0.8 }
  ];

  const loupe = new LoupeMagnifier(fakeCanvas, {
    diameter: 160,
    zoom: 4,
    vectorPaths: paths,
    srcWidth: 900,
    srcHeight: 660
  });

  assert.ok(loupe.spatialGrid);
  assert.equal(loupe.spatialGrid.indexedCount, 2);

  // Query around top-left (100, 100)
  const culled = loupe.spatialGrid.queryFrustum(80, 80, 150, 150);
  assert.equal(culled.length, 1);
  assert.deepEqual(culled[0].points[0], [100, 100]);
});

test('Performance Architecture: PressRenderer exports WebGL2 fragment shader and hardware pipeline factory', () => {
  assert.ok(PressRenderer.PRESS_FRAGMENT_SHADER);
  assert.ok(PressRenderer.PRESS_FRAGMENT_SHADER.includes('#version 300 es'));
  assert.ok(PressRenderer.PRESS_FRAGMENT_SHADER.includes('uDepthField'));
  assert.ok(typeof PressRenderer.createWebGLPressPipeline === 'function');

  // When given null or headless canvas without WebGL2, pipeline factory returns null gracefully
  const fake2dCanvas = { getContext: () => null };
  const pipeline = PressRenderer.createWebGLPressPipeline(fake2dCanvas);
  assert.equal(pipeline, null);
});

test('Performance Architecture: VirtualPlateEngine fallback and WebGL2 render interface', () => {
  const engine = new VirtualPlateEngine(900);
  // Default CPU fallback render works zero-error
  const res = engine.render('plate');
  assert.equal(res.width, 900);
  assert.ok(res.pixels instanceof Uint8ClampedArray);

  // When glCanvas is provided but no WebGL2 in Node, it seamlessly falls back to CPU
  const fakeCanvas = { width: 900, height: 660, getContext: () => null };
  const fallbackRes = engine.render('print', { glCanvas: fakeCanvas });
  assert.equal(fallbackRes.width, 900);
  assert.ok(fallbackRes.pixels instanceof Uint8ClampedArray);
});
