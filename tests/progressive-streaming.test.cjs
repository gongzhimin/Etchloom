const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { StepFlowGrid } = require('../src/ui/components/step-flow-grid.js');

test('StepFlowGrid: Progressive Chunk Streaming streams paths across animation frames and supports cancellation', () => {
  const container = {
    querySelector: () => ({ classList: { add() {}, remove() {} } }),
    querySelectorAll: () => []
  };

  const grid = new StepFlowGrid(null);
  let strokeCalls = 0;
  const mockCanvas = {
    width: 900,
    height: 660,
    getContext: () => ({
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() { strokeCalls++; },
      save() {},
      restore() {},
      rect() {},
      clip() {}
    })
  };
  grid.stepStates[5].canvas = mockCanvas;

  // Generate 2500 synthetic paths
  const paths = [];
  for (let i = 0; i < 2500; i++) {
    paths.push({
      width: 0.8,
      points: [[10 + i % 100, 20], [30 + i % 100, 40]]
    });
  }

  // 1. Synchronous fallback when progressive: false
  strokeCalls = 0;
  grid.updateStepPaths(5, paths, 900, 660, { progressive: false });
  assert.ok(strokeCalls > 0, 'Synchronous stroke calls executed');
  assert.equal(grid.stepStates[5].streamRaf, null, 'No stream timer active for synchronous render');

  // 2. Progressive streaming with mock requestAnimationFrame
  const rafCallbacks = [];
  global.requestAnimationFrame = (cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  };
  global.cancelAnimationFrame = (id) => {
    rafCallbacks[id - 1] = null;
  };

  try {
    strokeCalls = 0;
    let completed = false;
    grid.updateStepPaths(5, paths, 900, 660, {
      progressive: true,
      onComplete: () => { completed = true; }
    });

    // Initial chunk (0..600) drawn immediately
    assert.ok(strokeCalls > 0, 'Chunk 0 rendered immediately for instant TTFVS');
    assert.ok(grid.stepStates[5].streamRaf !== null, 'RAF timer registered for subsequent chunks');
    assert.equal(completed, false, 'Not completed after chunk 0');

    // Run frame 1 (600..1800)
    const prevCalls = strokeCalls;
    const cb1 = rafCallbacks[0];
    assert.equal(typeof cb1, 'function');
    cb1();
    assert.ok(strokeCalls > prevCalls, 'Chunk 1 rendered in frame 1');

    // Run frame 2 (1800..2500)
    const cb2 = rafCallbacks[1];
    assert.equal(typeof cb2, 'function');
    cb2();
    assert.equal(completed, true, 'Streaming completed on last chunk');
    assert.equal(grid.stepStates[5].streamRaf, null);

    // 3. Status reset cancels active streaming
    grid.updateStepPaths(5, paths, 900, 660, { progressive: true });
    assert.ok(grid.stepStates[5].streamRaf !== null);
    grid.setStepStatus(5, 'COMPUTING');
    assert.equal(grid.stepStates[5].streamRaf, null, 'Streaming cancelled on status change to COMPUTING');
  } finally {
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  }
});
