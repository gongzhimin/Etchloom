'use strict';
(()=>{
  let originalId=null;
  const controls=document.createElement('section');controls.id='photoRefinement';controls.hidden=true;
  const specs={exposure:['曝光',50],blackPoint:['黑点',0],whitePoint:['白点',100],shadows:['阴影压缩',20],contour:['轮廓层',85],hatch:['流线层',100],maze:['迷宫层',0],cross:['交叉排线',65]};
  controls.innerHTML='<h2>刻线设计</h2><div id="simpleControls" class="simple-controls"><label for="simpleDetail">细节 <output id="simpleDetailValue">65</output></label><input id="simpleDetail" type="range" min="0" max="100" value="65"><label for="simpleTone">明暗 <output id="simpleToneValue">50</output></label><input id="simpleTone" type="range" min="0" max="100" value="50"><label for="simpleContour">轮廓 <output id="simpleContourValue">85</output></label><input id="simpleContour" type="range" min="0" max="100" value="85"><label for="simpleHatch">排线 <output id="simpleHatchValue">100</output></label><input id="simpleHatch" type="range" min="0" max="100" value="100"><label for="simpleTexture">几何纹理 <output id="simpleTextureValue">0</output></label><input id="simpleTexture" type="range" min="0" max="100" value="0"></div><details id="photoAdvanced"><summary>高级设置</summary><div id="proSliders"></div><button id="autoLevels">自动展开明暗</button><div id="proSeeds"></div></details><details><summary>构图与分析</summary><label for="analysisSize">分析精度</label><select id="analysisSize"><option value="225">225 × 165 · 草稿</option><option value="450">450 × 330 · 标准</option><option value="900" selected>900 × 660 · 细节</option></select><label for="cropZoom">裁切放大 <output id="cropZoomValue">100%</output></label><input id="cropZoom" type="range" min="100" max="300" value="100"><label for="cropX">水平平移</label><input id="cropX" type="range" min="-100" max="100" value="0"><label for="cropY">垂直平移</label><input id="cropY" type="range" min="-100" max="100" value="0"><button id="applyCrop">应用构图</button><p id="cropNote" class="source-note"></p></details>';
  imageControls.after(controls);const generateRow=$('generateFour').parentElement;controls.after(generateRow);const schemeActions=document.createElement('div');schemeActions.className='row scheme-actions';generateRow.after(schemeActions);schemeActions.append($('exportDesign'),$('importDesign'));const autoButton=$('autoLevels');autoButton.onclick=()=>{const r=currentRecipe();if(!r?.image)return;const levels=PhotoPro.autoLevels(r.image);for(const [key,v]of Object.entries(levels))$('pro-'+key).value=v;syncSimple();schedule();};
  for(const [key,[label,value]]of Object.entries(specs))controls.querySelector('#proSliders').insertAdjacentHTML('beforeend',`<label for="pro-${key}">${label} <output id="pro-${key}-value">${value}</output></label><input id="pro-${key}" type="range" min="0" max="100" value="${value}">`);
  for(const key of ['contourSeed','hatchSeed','mazeSeed'])controls.querySelector('#proSeeds').insertAdjacentHTML('beforeend',`<label for="pro-${key}">${{contourSeed:'轮廓',hatchSeed:'流线',mazeSeed:'迷宫'}[key]}种子</label><input id="pro-${key}" type="number" min="0" max="4294967295" step="1" value="1">`);
  const simpleMap={simpleTone:'pro-exposure',simpleContour:'pro-contour',simpleHatch:'pro-hatch',simpleTexture:'pro-maze'};
  function syncSimple(){for(const [simple,full]of Object.entries(simpleMap)){$(simple).value=$(full).value;$(simple+'Value').value=$(full).value;}$('simpleDetail').value=$('algodetail').value;$('simpleDetailValue').value=$('algodetail').value;}
  for(const [simple,full]of Object.entries(simpleMap))$(simple).oninput=()=>{$(simple+'Value').value=$(simple).value;$(full).value=$(simple).value;$(full+'-value').value=$(simple).value;schedule();};
  $('simpleDetail').oninput=()=>{$('simpleDetailValue').value=$('simpleDetail').value;$('algodetail').value=$('simpleDetail').value;$('algodetailValue').value=$('simpleDetail').value+'%';$('genDensity').value=Math.round(35+Number($('simpleDetail').value)*.42);schedule();};
  const compare=document.createElement('div');compare.id='photoCompare';compare.hidden=true;
  compare.innerHTML='<div class="editor-tools"><label for="localTool">局部修整</label><select id="localTool"><option value="inspect">查看</option><option value="direction">引导方向</option><option value="white">留白</option><option value="protect">保护</option></select><label for="localRadius">范围</label><input id="localRadius" type="range" min="8" max="120" value="35"><button id="undoLocal">撤销</button><button id="clearLocal">清除修整</button><label><input id="showComparison" type="checkbox" checked>并排原图</label></div><p class="source-note">在刻线稿上拖动。保护会固定满意区域，后续变奏只改变其他位置。</p><div class="loupes"><figure><canvas id="sourceLoupe" width="240" height="240"></canvas><figcaption>原图局部 × 2</figcaption></figure><figure><canvas id="designLoupe" width="240" height="240"></canvas><figcaption>刻线局部 × 2</figcaption></figure></div>';
  panel.querySelector('.design-stage').before(compare);
  const pair=document.createElement('div');pair.className='comparison-pair';const designStage=panel.querySelector('.design-stage');designStage.before(pair);
  const sourceStage=document.createElement('div');sourceStage.className='studio source-stage';sourceStage.hidden=true;sourceStage.innerHTML='<canvas id="compareSource" width="900" height="660" aria-label="原图对照"></canvas>';
  pair.append(sourceStage,designStage);
  pair.after(panel.querySelector('.recent'));
  const exportPanel=document.createElement('details');exportPanel.className='export-panel';exportPanel.innerHTML='<summary>尺寸与导出</summary><div class="editor-tools"><label for="plateSize">铜版长边</label><select id="plateSize"><option value="900">900 px · 快速试印</option><option value="1500">1500 px · 精细</option><option value="3000">3000 px · 大幅面</option></select><label for="paperMM">纸张宽度 mm</label><input id="paperMM" type="number" min="50" max="1000" value="254"><label for="needleMM">目标针宽 mm</label><input id="needleMM" type="number" min="0.05" max="0.5" step="0.01" value="0.15"><label for="inkGain">增墨补偿 <output id="inkGainValue">100%</output></label><input id="inkGain" type="range" min="70" max="150" value="100"><button id="exportDesignPNG">导出 PNG</button><button id="exportDesignSVG">导出 SVG</button></div><p id="physicalInfo" class="source-note"></p>';
  panel.append(exportPanel);
  let original=null,analysisCache=new Map(),editHistory=[],lastRecipe=null,isBusy=false;
  function settings(fresh=false){
    const p={version:1};for(const key of Object.keys(PhotoPro.defaults))p[key]=Number($('pro-'+key).value);
    if(!Number.isFinite(p.blackPoint)||p.blackPoint>=p.whitePoint)throw Error('白点必须高于黑点。');
    p.edits=fresh?[]:cloneRecipe(currentRecipe()?.pro?.edits||[]);return p;
  }
  function schedule(){clearTimeout(updateTimer);updateTimer=setTimeout(()=>regenerateSelected(),220);}
  for(const key of Object.keys(specs))$('pro-'+key).oninput=()=>{
    $('pro-'+key+'-value').value=$('pro-'+key).value;
    if(key==='blackPoint'&&Number($('pro-blackPoint').value)>=Number($('pro-whitePoint').value))$('pro-whitePoint').value=Math.min(100,Number($('pro-blackPoint').value)+1);
    if(key==='whitePoint'&&Number($('pro-whitePoint').value)<=Number($('pro-blackPoint').value))$('pro-blackPoint').value=Math.max(0,Number($('pro-whitePoint').value)-1);
    if(Number($('pro-blackPoint').value)>=Number($('pro-whitePoint').value)){$('pro-blackPoint').value=99;$('pro-whitePoint').value=100;}
    schedule();
  };
  for(const key of ['contourSeed','hatchSeed','mazeSeed'])$('pro-'+key).onchange=()=>{const n=Number($('pro-'+key).value);$('pro-'+key).value=Number.isFinite(n)?Math.max(0,Math.min(4294967295,Math.floor(n))):1;schedule();};
  function analyze(){
    if(!original)throw Error('裁切或提高分析精度需要重新上传原图。已有分析图和刻线仍可继续编辑。');
    const width=Number($('analysisSize').value),height=Math.round(width*660/900),zoom=Number($('cropZoom').value)/100,panX=Number($('cropX').value)/100,panY=Number($('cropY').value)/100;
    const key=[width,zoom,panX,panY].join('/');if(analysisCache.has(key))return analysisCache.get(key);
    const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
    const ratio=Math.min(width*.92/original.width,height*.89/original.height)*zoom,dw=original.width*ratio,dh=original.height*ratio;
    ctx.drawImage(original,(width-dw)/2+panX*width*.45,(height-dh)/2+panY*height*.45,dw,dh);
    const rgba=ctx.getImageData(0,0,width,height).data,pixels=new Array(width*height);
    for(let i=0;i<pixels.length;i++)pixels[i]=Math.round(rgba[i*4]*.2126+rgba[i*4+1]*.7152+rgba[i*4+2]*.0722);
    const image={width,height,pixels,originId:originalId};if(analysisCache.size>=3)analysisCache.delete(analysisCache.keys().next().value);analysisCache.set(key,image);return image;
  }
  $('cropZoom').oninput=()=>$('cropZoomValue').value=$('cropZoom').value+'%';
  $('applyCrop').onclick=async()=>{try{if(currentRecipe()?.image?.originId!==originalId)throw Error('当前方案与暂存原图不同，请重新上传原图再裁切。');uploadedImage=analyze();editHistory=[];await generateFour();}catch(e){message(e.message);}};
  $('showComparison').onchange=()=>{sourceStage.hidden=!$('showComparison').checked;pair.classList.toggle('split',!sourceStage.hidden);};
  function repaintSource(r){const c=$('compareSource'),ctx=c.getContext('2d');ctx.clearRect(0,0,900,660);ctx.drawImage($('sourcePreview'),0,0,900,660);}
  function localPoint(e){const r=$('designCanvas').getBoundingClientRect();return{x:Math.max(0,Math.min(900,(e.clientX-r.left)*900/r.width)),y:Math.max(0,Math.min(660,(e.clientY-r.top)*660/r.height))};}
  let gesture=null;
  const c=$('designCanvas');
  const editSurface=document.createElement('div');editSurface.className='edit-surface';c.before(editSurface);editSurface.append(c);
  const overlay=document.createElement('canvas');overlay.id='editOverlay';overlay.width=900;overlay.height=660;overlay.setAttribute('aria-hidden','true');editSurface.append(overlay);
  function paintGuide(p){const ctx=overlay.getContext('2d'),radius=Number($('localRadius').value);ctx.clearRect(0,0,900,660);if($('localTool').value==='inspect')return;ctx.save();ctx.strokeStyle='#b99c54';ctx.lineWidth=1.25;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.stroke();if(gesture&&$('localTool').value==='direction'){ctx.setLineDash([]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(gesture.start.x,gesture.start.y);ctx.lineTo(p.x,p.y);ctx.stroke();}ctx.restore();}
  c.onpointerdown=e=>{if(currentRecipe()?.mode!=='photo'||isBusy||$('localTool').value==='inspect')return;const p=localPoint(e);gesture={start:p,points:[p]};c.setPointerCapture(e.pointerId);};
  c.onpointermove=e=>{
    if(currentRecipe()?.mode!=='photo')return;const p=localPoint(e);
    paintGuide(p);
    for(const [target,source]of [['sourceLoupe',$('compareSource')],['designLoupe',c]]){const ctx=$(target).getContext('2d');ctx.fillStyle='#f2eddd';ctx.fillRect(0,0,240,240);ctx.drawImage(source,p.x-60,p.y-60,120,120,0,0,240,240);}
    if(gesture&&Math.hypot(p.x-gesture.points.at(-1).x,p.y-gesture.points.at(-1).y)>Number($('localRadius').value)*.5)gesture.points.push(p);
  };
  c.onpointerup=async e=>{
    if(!gesture)return;const g=gesture;gesture=null;overlay.getContext('2d').clearRect(0,0,900,660);const end=localPoint(e),angle=Math.atan2(end.y-g.start.y,end.x-g.start.x),radius=Number($('localRadius').value),type=$('localTool').value;
    const r=cloneRecipe(currentRecipe());r.pro=settings();editHistory.push(cloneRecipe(r.pro.edits));if(editHistory.length>12)editHistory.shift();
    for(const q of g.points){if(r.pro.edits.length>=300){message('局部编辑已达 300 笔，请清除部分编辑后继续。');break;}const edit={type,x:q.x,y:q.y,radius,angle};if(type==='protect')edit.frozen=PhotoPro.freeze(currentResult().paths,edit);r.pro.edits.push(edit);}
    const draft=recipes.slice();draft[selected]=r;await runGeneration(draft,selected,[selected]);
  };
  c.onpointercancel=()=>{gesture=null;overlay.getContext('2d').clearRect(0,0,900,660);};
  c.onpointerleave=()=>{if(!gesture)overlay.getContext('2d').clearRect(0,0,900,660);};
  async function setEdits(edits){const r=cloneRecipe(currentRecipe());r.pro=settings();r.pro.edits=edits;const draft=recipes.slice();draft[selected]=r;await runGeneration(draft,selected,[selected]);}
  $('undoLocal').onclick=()=>{if(editHistory.length)setEdits(editHistory.pop());};
  $('clearLocal').onclick=()=>{editHistory.push(cloneRecipe(currentRecipe()?.pro?.edits||[]));setEdits([]);};
  function dimensions(){const mm=Math.max(50,Math.min(1000,Number($('paperMM').value)||254)),needle=Math.max(.05,Math.min(.5,Number($('needleMM').value)||.15)),gain=Math.max(.7,Math.min(1.5,Number($('inkGain').value)/100||1));$('paperMM').value=mm;$('needleMM').value=needle;$('inkGainValue').value=Math.round(gain*100)+'%';const width=Number($('plateSize').value);window.printStrokeScale=needle*900/mm/.55*gain;$('physicalInfo').textContent=`${width} × ${Math.round(width*660/900)} 像素 · ${(width/mm*25.4).toFixed(0)} DPI · ${needle.toFixed(2)} mm 针宽 · 补偿 ${Math.round(gain*100)}%`;
    window.printPaperMM=mm;
  }
  $('paperMM').onchange=$('needleMM').onchange=$('plateSize').onchange=$('inkGain').oninput=dimensions;dimensions();
  $('exportDesignPNG').onclick=async()=>{await flushUpdate();const c=document.createElement('canvas');c.width=3000;c.height=2200;generator.draw(c.getContext('2d'),currentResult(),true,window.printStrokeScale||1);c.toBlob(async blob=>{if(blob)download(await PlateCodec.pngDpi(blob,3000,Number($('paperMM').value)),'Etchloom-engraving-3000.png');});};
  $('exportDesignSVG').onclick=async()=>{await flushUpdate();const mm=Number($('paperMM').value),scale=window.printStrokeScale||1;const paths=currentResult().paths.map(p=>`<path fill="none" stroke="#292d27" stroke-width="${(p.width*scale).toFixed(3)}" stroke-linecap="round" stroke-linejoin="round" d="M${p.points.map(q=>q.map(v=>v.toFixed(3)).join(',')).join('L')}"/>`).join('');download(new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${mm}mm" height="${mm*660/900}mm" viewBox="0 0 900 660">${paths}</svg>`],{type:'image/svg+xml'}),'Etchloom-engraving.svg');};
  window.refinement={
    recipe:settings,
    async setOriginal(bitmap){if(original)original.close();originalId=crypto.randomUUID();original=await createImageBitmap(bitmap);analysisCache.clear();editHistory=[];for(const [id,value]of [['cropZoom',100],['cropX',0],['cropY',0]])$(id).value=value;return analyze();},
    sync(r){controls.hidden=r.mode!=='photo';compare.hidden=r.mode!=='photo';sourceStage.hidden=r.mode!=='photo'||!$('showComparison').checked;pair.classList.toggle('split',!sourceStage.hidden);
      if(r.mode==='photo'){for(const key of Object.keys(PhotoPro.defaults)){const v=r.pro?.[key]??PhotoPro.defaults[key];$('pro-'+key).value=v;if($('pro-'+key+'-value'))$('pro-'+key+'-value').value=v;}syncSimple();$('cropNote').textContent=original?'原图仅保留在当前会话，可重新裁切；刷新后需重新上传。':'恢复的是分析图，重新裁切需要上传原图。';}
      if(lastRecipe!==r.seed){editHistory=[];lastRecipe=r.seed;}
    },
    paint(r,result){if(r.mode==='photo'){repaintSource(r);$('photoInfo').textContent=`${r.image.width} × ${r.image.height} · ${result.stats.bundles||0} 组线束 · ${result.stats.microDetails||0} 处微细节 · ${result.stats.contours||0} 段轮廓`;}}
    ,busy(b){isBusy=b;for(const id of ['undoLocal','clearLocal','applyCrop','exportDesignPNG','exportDesignSVG'])$(id).disabled=b;}
  };
})();
