const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('WebAIClient & AIServiceGateway: Architecture & Fallback Verification', async () => {
  const gatewayMod = await import('file:///' + path.join(__dirname, '../src/services/client/ai-service-gateway.js').replace(/\\/g, '/'));
  assert.ok(gatewayMod.AIServiceGateway, 'AIServiceGateway must be exported');

  const clientMod = await import('file:///' + path.join(__dirname, '../src/services/client/web-ai-client.js').replace(/\\/g, '/'));
  assert.ok(clientMod.WebAIClient, 'WebAIClient must be exported');

  const webClient = new clientMod.WebAIClient();
  assert.ok(webClient);
  assert.equal(webClient.maxInferenceSide, 768);

  // Probe capabilities in node environment
  const caps = await webClient.probeCapabilities();
  assert.ok(typeof caps === 'object');
  assert.equal(caps.webgpu, false); // No WebGPU in default Node.js

  // Gateway health check with unreachable port correctly falls back to offline analytical mode
  const gateway = new gatewayMod.AIServiceGateway('http://127.0.0.1:9999');
  const health = await gateway.checkHealth(100);
  assert.ok(health);
  assert.equal(health.ready, true);
  assert.equal(health.mode, 'offline-analytical');
  assert.equal(health.requiresNetwork, false);
});
