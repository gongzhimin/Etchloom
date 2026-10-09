/**
 * Adversarial Resilience & Attacker-Mindset Test Suite (对抗性攻防与系统韧性测试套件)
 * Validates the 6 attack vectors defined in docs/standards/TEST_RULES.md:
 * - ATTACK-001: Malformed Payload & Parameter Poisoning
 * - ATTACK-002: Race Condition & Preemption Storm
 * - ATTACK-003: Physical Invariant & Conservation Breach
 * - ATTACK-004: Boundary Penetration & Memory Bomb
 * - ATTACK-005: Chaos Fault Injection & Circuit Breaking
 * - ATTACK-006: Unauthorized State Transition & Safety Intercept
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { VirtualPlateEngine } = require('../src/core/plate/engine/virtual-plate-engine.js');
const PlateCodec = require('../src/core/codecs/plate-codec.js');
const TaskScheduler = require('../src/orchestration/scheduler/task-scheduler.js');
const StageCache = require('../src/orchestration/cache/stage-cache.js');
const PipelineRunner = require('../src/core/pipeline/pipeline-runner.js');

test('ATTACK-001: Malformed Payload & Poisoning - Engine and Codec safely reject corrupt data without NaN pollution', () => {
  const engine = new VirtualPlateEngine(900);

  // 1. Poisoning applyToolDab with NaNs, Infinities, and negative forces
  engine.applyToolDab(NaN, NaN, NaN, 'needle', NaN);
  engine.applyToolDab(Infinity, -Infinity, NaN, 'dry', 5);
  engine.applyToolDab(100, 100, Infinity, 'stop', 4);

  // Assert no NaN was injected into any continuous buffer
  for (let i = 0; i < 1000; i++) {
    assert.ok(!Number.isNaN(engine.depthField[i]), 'depthField must never contain NaN');
    assert.ok(!Number.isNaN(engine.exposedField[i]), 'exposedField must never contain NaN');
    assert.ok(!Number.isNaN(engine.burrField[i]), 'burrField must never contain NaN');
  }

  // 2. Poisoning PlateCodec with corrupted Base64 and invalid headers
  assert.throws(() => {
    PlateCodec.decode('not_valid_base64!!!', Float32Array, 100);
  }, /刻深数据编码无效/);

  assert.throws(() => {
    PlateCodec.decode(btoa('short'), Float32Array, 100);
  }, /刻深数据/);

  // 3. Poisoning PipelineRunner with null context
  assert.rejects(async () => {
    await PipelineRunner.runIncremental(null);
  }, /context.sourceImage is required/);
});

test('ATTACK-002: Race Condition & Preemption Storm - 50 rapid calls settle gracefully with only the latest task executed', async () => {
  const scheduler = new TaskScheduler(20);
  const executionLog = [];
  const promises = [];

  // Fire 50 tasks within 2 milliseconds
  for (let i = 0; i < 50; i++) {
    const taskIndex = i;
    promises.push(
      scheduler.schedule(async (signal) => {
        executionLog.push(taskIndex);
        return `result_${taskIndex}`;
      })
    );
  }

  const results = await Promise.all(promises);

  // Only the last task (index 49) should have executed
  assert.equal(executionLog.length, 1, 'Only exactly 1 task should have executed after debouncing');
  assert.equal(executionLog[0], 49, 'The executed task must be the latest submitted task');

  // Preceding 49 tasks must be marked as aborted
  for (let i = 0; i < 49; i++) {
    assert.equal(results[i].aborted, true, `Task ${i} must report aborted: true`);
  }
  assert.equal(results[49].aborted, false, 'The latest task must not be aborted');
  assert.equal(results[49].result, 'result_49');

  // Cancellation storm: mid-flight cancelActive halts immediate execution
  const cancelPromise = scheduler.schedule(async (signal) => {
    await new Promise(r => setTimeout(r, 100));
    return 'should_not_reach';
  }, 0);

  scheduler.cancelActive('FORCED_ATTACK_CANCEL');
  const cancelRes = await cancelPromise;
  assert.equal(cancelRes.aborted, true);
  assert.equal(cancelRes.reason, 'FORCED_ATTACK_CANCEL');
});

test('ATTACK-003: Physical Invariant & Conservation Breach - Stopout inviolability and depth boundedness under extreme bite', () => {
  const engine = new VirtualPlateEngine(900);

  // 1. Scratch with needle to expose bare copper
  engine.applyToolDab(450, 330, 1.0, 'needle', 30);
  const centerIdx = 330 * 900 + 450;
  assert.ok(engine.exposedField[centerIdx] > 0, 'Center pixel must be exposed by needle');

  // 2. Cover center with stop-out varnish (passivation)
  engine.applyToolDab(450, 330, 1.0, 'stop', 30);
  assert.equal(engine.blockedField[centerIdx], 1, 'Center pixel must be blocked by stop-out');
  assert.equal(engine.exposedField[centerIdx], 0, 'Exposed field must be cleared by stop-out');

  // 3. Etch for a massive 200 seconds
  engine.etch(200.0, 1.0, 1.0);

  // Invariant 1: Blocked metal must have strictly 0 depth
  assert.equal(engine.depthField[centerIdx], 0.0, 'Blocked field must strictly have 0.0 depth (Stopout Inviolability)');

  // Invariant 2: Exposed areas elsewhere must be bounded to <= 1.0 even under extreme etch
  engine.applyToolDab(100, 100, 1.0, 'needle', 10);
  for (let step = 0; step < 50; step++) {
    engine.etch(10.0, 1.0, 1.0); // Total 500 seconds
  }
  const exposedIdx = 100 * 900 + 100;
  assert.ok(engine.depthField[exposedIdx] > 0.5, 'Exposed area should be deep');
  assert.ok(engine.depthField[exposedIdx] <= 1.0, 'Depth must never exceed theoretical ceiling 1.0');

  // Invariant 3: Negative or non-finite time steps must be completely ignored
  const timeBefore = engine.elapsedAcidTime;
  engine.etch(-20.0);
  engine.etch(NaN);
  engine.etch(Infinity);
  assert.equal(engine.elapsedAcidTime, timeBefore, 'Elapsed time must not be corrupted by negative or non-finite values');
});

test('ATTACK-004: Boundary Penetration & Memory Bomb - Extreme coordinates and bounded snapshot history', () => {
  const engine = new VirtualPlateEngine(900);

  // 1. Extreme off-screen coordinates: should be safely clipped by bounding box
  assert.doesNotThrow(() => {
    engine.applyToolDab(-999999, -999999, 1.0, 'needle', 50);
    engine.applyToolDab(999999, 999999, 1.0, 'needle', 50);
    engine.applyToolLine({ x: -5000, y: -5000 }, { x: 5000, y: 5000 }, 'dry', 20);
  }, 'Out-of-bound tool coords must be silently clipped without indexing segmentation faults');

  // 2. Snapshot bomb: Push 50 snapshots in a loop
  for (let s = 0; s < 50; s++) {
    engine.snapshot();
  }
  // Stack must be capped to 12 snapshots to protect heap memory from OOM
  assert.ok(engine.history.length <= 12, `Snapshot history must be capped (actual: ${engine.history.length})`);
});

test('ATTACK-005: Chaos Fault Injection - StageCache resilience against corrupt hashes and parameters', () => {
  const cache = new StageCache();

  // Test with undefined, null, circular-like or weird inputs
  const h1 = cache.computeStageHash(1, null, '');
  const h2 = cache.computeStageHash(1, {}, '');
  assert.ok(typeof h1 === 'string' && h1.length > 0, 'Hash must be valid string even with null params');
  assert.ok(typeof h2 === 'string' && h2.length > 0);

  // Invalid hashes map resolution
  const invalidation = cache.resolveInvalidation({ 1: 'foo', 2: 'bar', 3: 'baz' });
  assert.equal(invalidation, 1, 'Empty cache should invalidate starting from Stage 1');

  // Put and retrieve
  cache.put(1, 'foo', { data: [1, 2, 3] });
  assert.deepEqual(cache.get(1), { data: [1, 2, 3] });
  assert.equal(cache.get(99), null, 'Non-existent stage must safely return null');
});

test('ATTACK-006: State Transition Guard - Plate modifications detection prevents silent overwrite', () => {
  const engine = new VirtualPlateEngine(900);

  // Pristine engine has zero elapsed and zero modifications
  assert.equal(engine.elapsedAcidTime, 0);

  // Check pristine buffer
  let hasCarvings = false;
  for (let i = 0; i < engine.pixelCount; i++) {
    if (engine.depthField[i] > 0 || engine.exposedField[i] > 0 || engine.burrField[i] > 0 || engine.blockedField[i] > 0) {
      hasCarvings = true;
      break;
    }
  }
  assert.equal(hasCarvings, false, 'Pristine plate must have 0 carved pixels');

  // Add a needle carving
  engine.applyToolDab(200, 200, 1.0, 'needle', 4);
  hasCarvings = false;
  for (let i = 0; i < engine.pixelCount; i++) {
    if (engine.depthField[i] > 0 || engine.exposedField[i] > 0 || engine.burrField[i] > 0 || engine.blockedField[i] > 0) {
      hasCarvings = true;
      break;
    }
  }
  assert.equal(hasCarvings, true, 'Plate modification must be reliably detectable for guarded transfer');

  // Test stop-out varnish specifically (Bug 3 regression defense)
  const engineVarnish = new VirtualPlateEngine(900);
  engineVarnish.applyToolDab(150, 150, 1.0, 'stopout', 5);
  let hasVarnish = false;
  for (let i = 0; i < engineVarnish.pixelCount; i++) {
    if (engineVarnish.depthField[i] > 0 || engineVarnish.exposedField[i] > 0 || engineVarnish.burrField[i] > 0 || engineVarnish.blockedField[i] > 0) {
      hasVarnish = true;
      break;
    }
  }
  assert.equal(hasVarnish, true, 'Applying stop-out varnish must trigger plate modification guard');

  // Test allocate / clear plate clears elapsed time (Bug 2 regression defense)
  engineVarnish.elapsedAcidTime = 12.5;
  engineVarnish.clear(900, 660);
  assert.equal(engineVarnish.elapsedAcidTime, 0, 'Re-allocating plate must reset elapsed acid time to 0');
});

test('ATTACK-007: NaN Poisoning Defense - Stage 4 hatching and sampling handle corrupt inputs without NaN', () => {
  const Stage4Hatching = require('../src/core/pipeline/stage4-hatching.js');
  assert.ok(Stage4Hatching.runStage4, 'Stage4Hatching must export runStage4');

  // Bilinear sampling with extreme / NaN inputs
  const field = new Float32Array([1, 2, 3, 4]);
  const sampleNaN = Stage4Hatching.sampleFieldBilinear(field, 2, 2, NaN, NaN);
  assert.ok(!Number.isNaN(sampleNaN), 'Bilinear sampling must not return NaN for NaN inputs');
  const sampleInf = Stage4Hatching.sampleFieldBilinear(field, 2, 2, Infinity, -Infinity);
  assert.ok(!Number.isNaN(sampleInf), 'Bilinear sampling must not return NaN for Infinity inputs');
});

