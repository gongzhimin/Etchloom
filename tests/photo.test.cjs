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
