const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('../src/core/generator.js');
const recipe = (mode = 'wind', seed = 123456) => ({ version: 1, mode, seed, layoutSeed: seed, variation: 0, params: { ...G.defaults } });

test('same recipe reproduces every point and width after JSON round trip', () => {
  const r = recipe();
  assert.deepEqual(G.generate(r), G.generate(JSON.parse(JSON.stringify(r))));
});
test('variation changes engraving but keeps composition exactly', () => {
  const a = recipe('vortex'), b = { ...a, variation: 1 };
  const one = G.generate(a), two = G.generate(b);
  assert.deepEqual(one.layout, two.layout);
  assert.notDeepEqual(one.paths, two.paths);
});
test('three modes and extreme controls produce finite, useful, bounded strokes', () => {
  for (const mode of ['wind', 'vortex', 'islands']) for (const seed of [1, 17, 4294967295]) for (const extreme of [null, 0, 100]) {
    const r = recipe(mode, seed);
    if (extreme !== null) for (const k of Object.keys(r.params)) r.params[k] = extreme;
    const result = G.generate(r);
    assert.ok(result.paths.length >= 3, `${mode}/${seed}/${extreme}: missing composition`);
    for (const path of result.paths) {
      assert.ok(path.points.length >= 16);
      assert.ok(path.width > 0 && Number.isFinite(path.width));
      for (const [x, y] of path.points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 45 && x <= 855 && y >= 45 && y <= 615);
    }
  }
});
test('mode changes geometry and saved recipes reject invalid numeric input', () => {
  assert.notDeepEqual(G.generate(recipe('wind')).paths, G.generate(recipe('islands')).paths);
  for (const bad of [null, {}, { ...recipe(), seed: -1 }, { ...recipe(), params: { ...G.defaults, flow: NaN } }]) assert.equal(Boolean(G.validRecipe(bad)), false);
});
test('more whitespace reduces occupied envelope; denser setting adds strokes', () => {
  const low = recipe(), high = recipe();
  low.params.space = 0; high.params.space = 100;
  const extent = r => G.generate(r).paths.flatMap(p => p.points).reduce((a, [x,y]) => [Math.min(a[0],x),Math.min(a[1],y),Math.max(a[2],x),Math.max(a[3],y)], [900,660,0,0]);
  const a = extent(low), b = extent(high);
  assert.ok((b[2]-b[0])*(b[3]-b[1]) < (a[2]-a[0])*(a[3]-a[1]));
  low.params = { ...G.defaults, density: 0 }; high.params = { ...G.defaults, density: 100 };
  assert.ok(G.generate(high).paths.length > G.generate(low).paths.length);
});
test('maze spanning trees connect all cells, have reciprocal passages, and loops add cycles', () => {
  for (const algorithm of ['dfs', 'prim']) for (const loops of [0, 100]) {
    const r = recipe('maze'); r.params = { ...r.params, mazeAlgorithm: algorithm, loops };
    const result = G.generate(r), { cols, rows, passages } = result.graph;
    const seen = new Set([0]), queue = [0]; let directedEdges = 0;
    for (let index = 0; index < queue.length; index++) {
      const i = queue[index];
      for (const [bit, reverse, offset] of [[1,2,1],[2,1,-1],[4,8,cols],[8,4,-cols]]) {
        if (!(passages[i] & bit)) continue;
        const j = i + offset;
        assert.ok(j >= 0 && j < cols*rows);
        assert.ok(passages[j] & reverse);
        directedEdges++;
        if (!seen.has(j)) { seen.add(j); queue.push(j); }
      }
    }
    assert.equal(seen.size, cols*rows);
    assert.equal(directedEdges/2, result.stats.edges);
    if (!loops) assert.equal(result.stats.cycles, 0); else assert.ok(result.stats.cycles > 0);
    assert.deepEqual(result, G.generate(JSON.parse(JSON.stringify(r))));
  }
});
test('fluid is reproducible, responds to viscosity and duration, and yields finite bounded traces', () => {
  const r = recipe('fluid'), a = G.generate(r);
  assert.deepEqual(a, G.generate(JSON.parse(JSON.stringify(r))));
  assert.ok(a.paths.length > 100);
  const b = G.generate({ ...r, params: { ...r.params, viscosity: 100 } });
  assert.notDeepEqual(a.paths, b.paths);
  const c = G.generate({ ...r, params: { ...r.params, duration: 0 } });
  assert.ok(c.stats.steps < a.stats.steps);
  for (const path of a.paths) for (const [x,y] of path.points) assert.ok(Number.isFinite(x) && Number.isFinite(y) && x>=0 && x<=900 && y>=0 && y<=660);
});
test('engraved finishes reproduce, keep geometry on paper, and retain the maze graph', () => {
  for(const mode of ['fluid','maze']) {
    const r=recipe(mode);r.params.finish='engraved';
    const result=G.generate(r);
    assert.deepEqual(result,G.generate(JSON.parse(JSON.stringify(r))));
    for(const path of result.paths)for(const [x,y] of path.points) assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>0&&x<900&&y>0&&y<660);
    const raw=G.generate({...r,params:{...r.params,finish:'raw'}});
    assert.notDeepEqual(result.paths,raw.paths);
    if(mode==='maze')assert.deepEqual(result.graph,raw.graph);
    else assert.ok(result.paths.some(p=>p.taper));
  }
});
test('physical stroke calibration scales rendered needle width without moving geometry',()=>{const widths=[],context={canvas:{width:900,height:660},save(){},restore(){},clearRect(){},fillRect(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){widths.push(this.lineWidth);},set fillStyle(v){},set strokeStyle(v){},set lineCap(v){},set lineJoin(v){},lineWidth:1};const result={paths:[{points:[[10,10],[50,50]],width:.5}]};G.draw(context,result,false,1);G.draw(context,result,false,2);assert.equal(widths.length,2);assert.equal(widths[1],widths[0]*2);});
