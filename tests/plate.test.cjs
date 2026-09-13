const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const G = require('../src/core/generator.js');
const source = fs.readFileSync(require.resolve('../index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const recipe = { version: 1, mode: 'wind', seed: 17, layoutSeed: 17, variation: 0, params: { ...G.defaults } };
function app() {
  const elements = new Map();
  const initial = { size: 4, acid: 45, grain: 45, ink: 90, pressure: 65, tone: 4, paper: 'rough' };
  const el = id => {
    if (!elements.has(id)) elements.set(id, { value: initial[id] ?? '', checked: false, disabled: false, textContent: '', getContext: () => ({}) });
    return elements.get(id);
  };
  const session = { recipes: [recipe], selected: 0, locked: true };
  const context = vm.createContext({
    document: { getElementById: el, querySelectorAll: () => [] },
    requestAnimationFrame() {}, structuredClone, Blob, PlateCodec: require("../src/core/plate-codec.js"), PrintGenerator: G,
    window: { designSession: { save: () => session, validate: s => s.recipes.every(G.validRecipe), restore: s => { context.restored = s; } } }
  });
  vm.runInContext(source, context);
  return { context, el, run: s => vm.runInContext(s, context) };
}
test('virtual plate saves and restores engraving, source recipes and selection; undo restores previous source', async () => {
  const a = app(); a.context.recipe = recipe;
  a.run('depth[100]=.35;exposed[100]=.75;blocked[200]=1;elapsed=12;plateSources=[recipe]; download=(blob)=>{savedBlob=blob};');
  a.el('save').onclick();
  const saved = JSON.parse(await a.context.savedBlob.text());
  assert.equal(saved.plateSources[0].seed, 17);
  assert.equal(saved.designSession.recipes[0].mode, 'wind');
  a.run('depth.fill(0);exposed.fill(0);blocked.fill(0);elapsed=0;plateSources=[]');
  await a.el('file').onchange({ target: { files: [{ text: async () => JSON.stringify(saved) }], value: 'test' } });
  assert.equal(a.run('depth[100]'), saved.depth[100]);
  assert.equal(a.run('exposed[100]'), .75);
  assert.equal(a.run('blocked[200]'), 1);
  assert.equal(a.run('elapsed'), 12);
  assert.equal(a.run('plateSources[0].seed'), 17);
  assert.equal(a.context.restored.selected, 0);
  a.el('undo').onclick();
  assert.equal(a.run('plateSources.length'), 0);
  assert.equal(a.run('depth[100]'), 0);
});
test('etch deepens openings, respects stop-out, and undo recovers both layers', () => {
  const a = app();
  a.run('exposed[10000]=1; exposed[10001]=1; blocked[10001]=1; snapshot(); etch(1)');
  assert.ok(a.run('depth[10000]') > 0);
  assert.equal(a.run('depth[10001]'), 0);
  a.el('undo').onclick();
  assert.equal(a.run('depth[10000]'), 0);
  assert.equal(a.run('exposed[10000]'), 1);
});
test('invalid saved generation metadata leaves current plate untouched', async () => {
  const a = app();
  a.run('depth[100]=.5;download=(blob)=>{savedBlob=blob}'); a.el('save').onclick();
  const saved = JSON.parse(await a.context.savedBlob.text());
  saved.plateSources = [{ ...recipe, seed: -1 }];
  await a.el('file').onchange({ target: { files: [{ text: async () => JSON.stringify(saved) }], value: 'test' } });
  assert.match(a.el('status').textContent, /打开失败/);
  assert.equal(a.run('depth[100]'), .5);
});


test('3000px plate allocation and compact save restore dimensions through undo', async()=>{
 const a=app();a.run('snapshot();allocatePlate(3000);depth[N-1]=.6;download=(blob)=>{savedBlob=blob}');a.el('save').onclick();const saved=JSON.parse(await a.context.savedBlob.text());assert.equal(saved.version,2);assert.equal(saved.width,3000);assert.equal(saved.height,2200);a.el('undo').onclick();assert.equal(a.run('W'),900);await a.el('file').onchange({target:{files:[{text:async()=>JSON.stringify(saved)}],value:'test'}});assert.equal(a.run('N'),6600000);assert.ok(a.run('depth[N-1]')>.59);a.el('undo').onclick();assert.equal(a.run('W'),900);
});
