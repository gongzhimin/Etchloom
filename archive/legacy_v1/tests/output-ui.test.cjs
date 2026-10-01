const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('output keeps source aspect ratio and scales frames without cropping controls',()=>{
  const elements=new Map();function element(){const e={style:{},value:'4096',width:540,height:396,append(){},before(){},setAttribute(){},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:900,height:660}},closest(){return this}};e.context={canvas:e,strokes:[],clearRect(){this.strokes=[]},fillRect(){},drawImage(){},save(){},restore(){},scale(){},beginPath(){this.points=[]},moveTo(...v){this.points.push(v)},lineTo(...v){this.points.push(v)},stroke(){this.strokes.push(this.points)},strokeRect(...v){this.strokes.push(v)}};e.getContext=()=>e.context;return e;}
  const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)};
  let recipe={image:{originId:'same-upload',width:900,height:660,contentBounds:{left:230,top:30,right:670,bottom:630}},pro:{frameStyle:'double',frameMargin:5}},created=[];
  const context={PhotoPro:require('../src/core/photo-pro.js'),$,document:{createElement(){const e=element();created.push(e);return e},querySelector:()=>element()},window:{refinement:{paint(){}}},currentRecipe:()=>recipe,currentResult:()=>({paths:[]}),generator:{draw(){}},flushUpdate:async()=>{},Math,JSON};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/ui/output-ui.js'),'utf8'),context);
  const preview=created.find(e=>e.id==='plateOutputPreview');assert.equal(preview.context.strokes.length,2);
  assert.ok(!created.some(e=>String(e.innerHTML).includes('cropInputPreview')));
  const before=context.window.plateOutput.dimensions();assert.equal(before.height,4096);assert.equal(before.width,Math.round(4096*440/600));assert.equal(preview.context.strokes.length,2);
  recipe=JSON.parse(JSON.stringify(recipe));recipe.pro.frameMargin=12;context.window.refinement.paint();assert.deepEqual(context.window.plateOutput.dimensions(),before);assert.equal(preview.context.strokes.length,2);
  $('outputFrameWidth').value='0.25';$('outputFrameGap').value='1.2';
  const geometry=context.window.plateOutput.frameGeometry,small=geometry(300,400,recipe.pro),large=geometry(3000,4000,recipe.pro);
  assert.equal(large.line,small.line*10);assert.equal(large.padding,small.padding*10);
  small.insets.forEach((v,i)=>assert.ok(Math.abs(large.insets[i]-v*10)<1e-8));
  assert.ok(small.insets[0]-small.insets[1]-small.line>0);
  assert.ok(small.padding-small.insets[0]-small.line/2>0);
  $('outputFrameGap').value='2.4';const wider=geometry(300,400,recipe.pro);assert.equal(wider.line,small.line);assert.ok(wider.insets[0]-wider.insets[1]>small.insets[0]-small.insets[1]);
  $('outputFrameWidth').value='0.5';assert.equal(geometry(300,400,recipe.pro).line,small.line*2);
  recipe.pro.frameStyle='fine';recipe.pro.frameIrregularity=0;context.window.refinement.paint();assert.equal(preview.context.strokes.length,1);const straight=JSON.stringify(preview.context.strokes);
  recipe.pro.frameIrregularity=40;context.window.refinement.paint();assert.notEqual(JSON.stringify(preview.context.strokes),straight);const hand=JSON.stringify(preview.context.strokes);context.window.refinement.paint();assert.equal(JSON.stringify(preview.context.strokes),hand);
  recipe.pro.frameStyle='rough';context.window.refinement.paint();assert.ok(preview.context.strokes.length>4);
  const reference=JSON.parse(JSON.stringify(preview.context.strokes));preview.width*=2;preview.height*=2;context.window.plateOutput.draw(preview.context,true);reference.forEach((path,i)=>path.forEach((p,j)=>p.forEach((v,k)=>assert.ok(Math.abs(preview.context.strokes[i][j][k]-v*2)<1e-7))));
  recipe.pro.frameStyle='none';context.window.refinement.paint();assert.equal(preview.context.strokes.length,0);
  recipe.image.contentBounds={left:50,top:100,right:850,bottom:550};const landscape=context.window.plateOutput.dimensions();assert.equal(landscape.width,4096);assert.equal(landscape.height,2304);
  recipe.image.originalWidth=3000;recipe.image.originalHeight=4000;
  recipe.image.contentBounds={left:100,top:100,right:500,bottom:500};
  const portrait=context.window.plateOutput.dimensions();assert.equal(portrait.width,3072);assert.equal(portrait.height,4096);
  context.window.refinement.paint();assert.equal(preview.width,405);assert.equal(preview.height,540);
  recipe.image.originalWidth=6000;recipe.image.originalHeight=4000;const wide=context.window.plateOutput.dimensions();assert.equal(wide.width,4096);assert.equal(wide.height,2731);
  // Test 16:9 photo input
  recipe.image.originalWidth=1920;recipe.image.originalHeight=1080;
  const ratio169=context.window.plateOutput.dimensions();assert.equal(ratio169.width,4096);assert.equal(ratio169.height,2304);
  // Test 9:16 vertical photo input
  recipe.image.originalWidth=1080;recipe.image.originalHeight=1920;
  const ratio916=context.window.plateOutput.dimensions();assert.equal(ratio916.width,2304);assert.equal(ratio916.height,4096);
  // Test 2:1 panoramic photo input
  recipe.image.originalWidth=2000;recipe.image.originalHeight=1000;
  const ratio21=context.window.plateOutput.dimensions();assert.equal(ratio21.width,4096);assert.equal(ratio21.height,2048);
  // Test custom side
  $('outputLongSide').value='custom';$('customOutputSide').value='2000';
  const customSize=context.window.plateOutput.dimensions();assert.equal(customSize.width,2000);assert.equal(customSize.height,1000);
});
