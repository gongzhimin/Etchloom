const {test}=require('node:test');
const assert=require('node:assert/strict');
const G=require('../src/core/generator.js');
const source=fn=>({width:225,height:165,pixels:Array.from({length:37125},(_,i)=>fn(i%225,Math.floor(i/225)))});
const recipe=image=>({version:1,mode:'photo',seed:23,layoutSeed:23,variation:0,params:{...G.defaults},image});
test('white photograph remains blank and dark regions receive more engraving',()=>{
  assert.equal(G.generate(recipe(source(()=>255))).paths.length,0);
  const r=recipe(source((x,y)=>x<112?35:210));const result=G.generate(r);
  let dark=0,light=0;for(const path of result.paths)for(const [x] of path.points)x<448?dark++:light++;
  assert.ok(dark>light*1.3);
  assert.ok(result.stats.cross>0);
});
test('image recipe roundtrip and variations preserve source, fit bounds and alter strokes',()=>{
  const r=recipe(source((x,y)=>Math.round(30+190*x/225)));
  const a=G.generate(r);assert.deepEqual(a,G.generate(JSON.parse(JSON.stringify(r))));
  const b=G.generate({...r,variation:1});assert.notDeepEqual(a.paths,b.paths);assert.deepEqual(a.recipe.image,b.recipe.image);
  for(const path of a.paths)for(const [x,y] of path.points)assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&x>=24&&x<=876&&y>=24&&y<=636);
});
test('invalid source images and nonfinite fitting controls are rejected',()=>{
  const r=recipe(source(()=>100));assert.ok(G.validRecipe(r));
  assert.ok(!G.validRecipe({...r,image:{...r.image,width:224}}));
  assert.ok(!G.validRecipe({...r,image:{...r.image,pixels:[1,2]}}));
  assert.ok(!G.validRecipe({...r,params:{...r.params,fidelity:NaN}}));
});
test('full-resolution fine structures survive as independent contour strokes',()=>{
  const image={width:900,height:660,pixels:Array.from({length:594000},(_,i)=>{
    const x=i%900,y=Math.floor(i/900);
    return x>200&&x<700&&y>200&&y<460&&((x%18<2)||(y%23<2))?40:255;
  })};
  const r=recipe(image);r.params.detail=85;
  const result=G.generate(r);
  assert.ok(result.stats.contours>30);
  assert.ok(result.paths.filter(p=>p.role==='contour').some(p=>p.points.length>12));
  assert.ok(G.validRecipe(JSON.parse(JSON.stringify(r))));
  for(const p of result.paths)for(const [x,y]of p.points)assert.ok(x>=24&&x<=876&&y>=24&&y<=636);
});
test('woodcut and classical engraving produce fundamentally distinct artistic paradigms',()=>{
  const src=source((x,y)=>Math.min(255,Math.round(25+210*((x-112)**2+(y-82)**2)/(112**2+82**2))));
  const rEngraving=recipe(src);rEngraving.params.style='engraving';
  const rWoodcut=recipe(src);rWoodcut.params.style='woodcut';
  const resEng=G.generate(rEngraving);
  const resWood=G.generate(rWoodcut);
  assert.ok(resEng.stats.cross>0);
  assert.equal(resWood.stats.cross,0);
  const avgWidthEng=resEng.paths.reduce((s,p)=>s+p.width,0)/resEng.paths.length;
  const avgWidthWood=resWood.paths.reduce((s,p)=>s+p.width,0)/resWood.paths.length;
  assert.ok(avgWidthWood>avgWidthEng*2.2,`Woodcut avg width ${avgWidthWood} should be >2.2x engraving avg width ${avgWidthEng}`);
  assert.ok(resWood.paths.every(p=>p.points.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)&&x>=24&&x<=876&&y>=24&&y<=636)));
});
test('1800x1320 ultra-HD analysis recipe generates high-precision micro details', () => {
  const w = 1800, h = 1320;
  const pixels = new Array(w * h);
  for (let y = 0; y < h; y++) {
    const yw = y * w;
    for (let x = 0; x < w; x++) {
      const dx = x - 900, dy = y - 660;
      const dist = Math.sqrt(dx * dx + dy * dy);
      pixels[yw + x] = dist < 80 ? 20 : (dist < 200 ? Math.round(50 + 150 * (dist - 80) / 120) : 240);
    }
  }
  const r = recipe({ width: w, height: h, pixels });
  r.params.fidelity = 90;
  r.params.detail = 85;
  assert.ok(G.validRecipe(r));
  const result = G.generate(r);
  assert.ok(result.paths.length > 50);
  assert.ok(result.stats.contours > 10);
  for (const p of result.paths) {
    for (const [x, y] of p.points) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && x >= 24 && x <= 876 && y >= 24 && y <= 636);
    }
  }
});
test('intermediate pipeline stages are computed accurately and support all 7 stages', () => {
  const PhotoPro = require('../src/core/photo-pro.js');
  const img = source((x, y) => (x > 80 && x < 150 && y > 60 && y < 110 ? 30 : 220));
  const stages = PhotoPro.computeStages(img, { detail: 70 });
  assert.ok(stages);
  assert.equal(stages.width, 225);
  assert.equal(stages.height, 165);
  assert.equal(stages.grayPixels.length, 225 * 165);
  assert.equal(stages.smoothPixels.length, 225 * 165);
  assert.equal(stages.tensorField.vx.length, 225 * 165);
  assert.equal(stages.ridgePixels.length, 225 * 165);
  assert.ok(stages.ridgePixels.some(v => v > 0));

  // Mock canvas context for non-browser environment
  const mockContext = {
    canvas: { width: 900, height: 660 },
    save() {}, restore() {}, clearRect() {}, fillRect() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    drawImage() {}, putImageData() {}, scale() {}
  };
  const r = recipe(img);
  const result = G.generate(r);
  for (const s of ['full', 'gray', 'smooth', 'tensor', 'ridge', 'contour', 'hatch']) {
    PhotoPro.renderStage(mockContext, r, result, s, { onionSkin: 0.3 });
  }
});



