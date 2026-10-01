'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const StageCache = require('../src/orchestration/cache/stage-cache.js');

test('StageCache: computeStageHash produces deterministic and sensitive hashes', () => {
  const cache = new StageCache();
  const paramsA = { detail: 65, exposure: 50 };
  const paramsB = { detail: 65, exposure: 50 };
  const paramsC = { detail: 66, exposure: 50 };

  const hashA = cache.computeStageHash(1, paramsA);
  const hashB = cache.computeStageHash(1, paramsB);
  const hashC = cache.computeStageHash(1, paramsC);

  assert.equal(hashA, hashB, 'identical parameters produce identical hashes');
  assert.notEqual(hashA, hashC, 'different parameters produce different hashes');

  // Upstream dependency sensitivity
  const hashWithUpstream1 = cache.computeStageHash(2, { flow: 50 }, 'hash_upstream_1');
  const hashWithUpstream2 = cache.computeStageHash(2, { flow: 50 }, 'hash_upstream_2');
  assert.notEqual(hashWithUpstream1, hashWithUpstream2, 'upstream change invalidates downstream hash');
});

test('StageCache: resolveInvalidation correctly pinpoints first invalidated stage', () => {
  const cache = new StageCache();
  
  // Populate cache for stages 1..5
  const hashes = {
    1: 'hash_s1',
    2: 'hash_s2',
    3: 'hash_s3',
    4: 'hash_s4',
    5: 'hash_s5'
  };

  for (let s = 1; s <= 5; s++) {
    cache.put(s, hashes[s], { stage: s, data: `output_${s}` });
  }

  // Case 1: All hashes match -> should return 6 (zero recomputation needed)
  assert.equal(cache.resolveInvalidation(hashes, 5), 6);

  // Case 2: Stage 4 changed -> should return 4
  const changedStage4 = { ...hashes, 4: 'hash_s4_MODIFIED' };
  assert.equal(cache.resolveInvalidation(changedStage4, 5), 4);

  // Case 3: Stage 1 changed -> should return 1 (cascade full invalidation)
  const changedStage1 = { ...hashes, 1: 'hash_s1_MODIFIED' };
  assert.equal(cache.resolveInvalidation(changedStage1, 5), 1);

  // Case 4: Cache missing stage 3 -> should return 3
  cache.invalidateFrom(3, 5);
  assert.equal(cache.resolveInvalidation(hashes, 5), 3);
  assert.equal(cache.has(1), true);
  assert.equal(cache.has(2), true);
  assert.equal(cache.has(3), false);
  assert.equal(cache.has(4), false);
  assert.equal(cache.has(5), false);
});

test('StageCache: put, get, clear operate correctly', () => {
  const cache = new StageCache();
  cache.put(1, 'h1', { lines: [1, 2, 3] });
  assert.equal(cache.size, 1);
  assert.deepEqual(cache.get(1), { lines: [1, 2, 3] });
  assert.equal(cache.getHash(1), 'h1');
  assert.equal(cache.get(2), null);

  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.has(1), false);
});
