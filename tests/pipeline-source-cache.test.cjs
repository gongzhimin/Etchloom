'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('loading a new photo invalidates cached stages and changes source version', async () => {
  const { PipelineController } = await import('file:///' + path.join(__dirname, '../src/ui/controllers/pipeline-controller.js').replace(/\\/g, '/'));
  const controller = new PipelineController({ log: () => {} });
  let cancelled = false;
  let cleared = false;
  controller.scheduler = { cancelActive: () => { cancelled = true; } };
  controller.stageCache = { clear: () => { cleared = true; } };
  controller.lastStage1LineMap = { stale: true };
  controller.lastContours = [{ stale: true }];
  const previousReader = global.FileReader;
  const previousImage = global.Image;
  const previousDocument = global.document;
  global.FileReader = class { readAsDataURL() { this.onload({ target: { result: 'data:image/png;base64,AA==' } }); } };
  global.Image = class { constructor() { this.naturalWidth = 2; this.naturalHeight = 2; } set src(_) { this.onload(); } };
  global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage: () => {}, getImageData: () => ({ data: new Uint8ClampedArray(16) }) }) }) };
  controller.runPipelineOnLoadedPhoto = async () => {};
  try {
    await controller.handleImageFile({ name: 'new.png', size: 16 });
    assert.equal(controller.sourceVersion, 1);
    assert.equal(cancelled, true);
    assert.equal(cleared, true);
    assert.equal(controller.lastStage1LineMap, null);
    assert.equal(controller.lastContours, null);
  } finally {
    global.FileReader = previousReader;
    global.Image = previousImage;
    global.document = previousDocument;
  }
});
