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
  assert.ok(result.paths.filter(p=>p.role==='contour'||p.role==='filament').some(p=>p.points.length>12));
  assert.ok(G.validRecipe(JSON.parse(JSON.stringify(r))));
  for(const p of result.paths)for(const [x,y]of p.points)assert.ok(x>=24&&x<=876&&y>=24&&y<=636);
});
test('thin high-contrast whiskers become tapered filaments below silhouette weight',()=>{
  const width=900,height=660,image={width,height,pixels:Array.from({length:width*height},(_,i)=>{
    const x=i%width,y=Math.floor(i/width),face=((x-380)/170)**2+((y-330)/210)**2<1;
    const whisker=x>510&&x<840&&[[-.18,270],[0,330],[.18,390]].some(([slope,origin])=>Math.abs(y-(origin+slope*(x-510)))<1.2);
    return whisker?10:face?95:245;
  })};
  const r=recipe(image);Object.assign(r.params,{detail:100,fidelity:100,density:0});const result=G.generate(r),filaments=result.paths.filter(p=>p.role==='filament'),contours=result.paths.filter(p=>p.role==='contour');
  assert.ok(filaments.length>=3);assert.ok(filaments.every(p=>p.taper&&['fine-filament','ridge-filament'].includes(p.mark)));
  assert.ok(filaments.filter(p=>p.mark==='ridge-filament').every(p=>p.taper==='tip'&&p.root==='start'&&p.sourceWidth>=3));
  assert.ok(Math.max(...filaments.map(p=>p.width))<Math.min(...contours.map(p=>p.width))*.6);
});
test('multi-scale ridges retain low-contrast filaments but reject a single silhouette edge',()=>{
  const width=900,height=660,field=fn=>Float32Array.from({length:width*height},(_,i)=>fn(i%width,Math.floor(i/width)));
  const line=G.filamentRidges(field((x,y)=>x>80&&x<820&&Math.abs(y-330)<1.5?150/255:225/255),width,height,{detail:100});
  const edge=G.filamentRidges(field(x=>x<450?70/255:225/255),width,height,{detail:100});
  assert.equal(line.length,1);assert.ok(line[0].points.length>700);assert.equal(line[0].mark,'ridge-filament');
  assert.equal(edge.length,0);
});
test('ridge filament roots face the attached dark region and taper toward the free tip',()=>{
  const width=900,height=660,tone=Float32Array.from({length:width*height},(_,i)=>{const x=i%width,y=Math.floor(i/width),face=((x-380)/170)**2+((y-330)/210)**2<1,line=x>510&&x<840&&Math.abs(y-330)<1.2;return(line?10:face?95:245)/255;});
  const filament=G.filamentRidges(tone,width,height,{detail:100}).sort((a,b)=>b.points.length-a.points.length)[0];
  assert.ok(filament.points.length>250);assert.ok(filament.points[0][0]<filament.points.at(-1)[0]);assert.equal(filament.taper,'tip');assert.equal(filament.root,'start');
});
test('tip taper renders the root stronger than the free endpoint',()=>{
  const widths=[],context={canvas:{width:900,height:660},save(){},restore(){},clearRect(){},fillRect(){},scale(){},beginPath(){},moveTo(){},lineTo(){},stroke(){widths.push(this.lineWidth);}};
  G.draw(context,{paths:[{points:Array.from({length:40},(_,i)=>[100+i*5,200]),width:1,taper:'tip'}]});
  assert.ok(widths.length>2);assert.ok(widths[0]>widths.at(-1)*1.8);
});
