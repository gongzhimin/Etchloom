'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPreviewServer } = require('../scripts/serve.cjs');

test('preview serves app assets and denies repository archives and documentation', async () => {
  const server = createPreviewServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/src/main.js`)).status, 200);
    assert.equal((await fetch(`${base}/archive/legacy_v1/README.md`)).status, 404);
    assert.equal((await fetch(`${base}/BENCHMARK.json`)).status, 404);
    assert.equal((await fetch(`${base}/docs/README.md`)).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
