'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('a superseded photo cannot replace the newer source or start its pipeline', async () => {
  const { PipelineController } = await import('file:///' + path.join(__dirname, '../src/ui/controllers/pipeline-controller.js').replace(/\\/g, '/'));
  const controller = new PipelineController({ log: () => {} });
  controller.scheduler = { cancelActive: () => {} };
  controller.stageCache = { clear: () => {} };
  const readers = [];
  const originalReader = global.FileReader;
  const originalImage = global.Image;
  const originalDocument = global.document;
  global.FileReader = class {
    constructor() { readers.push(this); }
    readAsDataURL() {}
  };
  global.Image = class {
    constructor() { this.naturalWidth = 2; this.naturalHeight = 2; }
    set src(_) { this.onload(); }
  };
  global.document = { createElement: () => ({ getContext: () => ({ drawImage: () => {}, getImageData: () => ({ data: new Uint8ClampedArray(16) }) }) }) };
  const started = [];
  controller.runPipelineOnLoadedPhoto = async file => { started.push(file.name); };
  try {
    const oldRun = controller.handleImageFile({ name: 'old.png', size: 16 });
    const newRun = controller.handleImageFile({ name: 'new.png', size: 16 });
    readers[1].onload({ target: { result: 'new' } });
    readers[0].onload({ target: { result: 'old' } });
    assert.equal(await oldRun, null);
    assert.equal((await newRun).file.name, 'new.png');
    assert.deepEqual(started, ['new.png']);
  } finally {
    global.FileReader = originalReader;
    global.Image = originalImage;
    global.document = originalDocument;
  }
});

test('oversized images are rejected before allocating a canvas', async () => {
  const { PipelineController } = await import('file:///' + path.join(__dirname, '../src/ui/controllers/pipeline-controller.js').replace(/\\/g, '/'));
  const controller = new PipelineController({ log: () => {} });
  const originalReader = global.FileReader;
  const originalImage = global.Image;
  const originalDocument = global.document;
  global.FileReader = class { readAsDataURL() { this.onload({ target: { result: 'large' } }); } };
  global.Image = class { constructor() { this.naturalWidth = 5000; this.naturalHeight = 5000; } set src(_) { this.onload(); } };
  global.document = { createElement: () => { throw new Error('canvas allocated'); } };
  try {
    await assert.rejects(controller.handleImageFile({ name: 'large.png', size: 100 }), /1200 万像素/);
  } finally {
    global.FileReader = originalReader;
    global.Image = originalImage;
    global.document = originalDocument;
  }
});
