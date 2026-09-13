'use strict';
const generator = PrintGenerator;
const cloneRecipe = r => JSON.parse(JSON.stringify(r));
const modeNames = { wind: '风迹', vortex: '回旋', islands: '群岛', fluid: '流体', maze: '迷宫', photo: '图片拟合' };
let uploadedImage=null;
const imageControls=document.createElement('div');
imageControls.innerHTML='<button id="uploadPhoto" class="primary">上传图片 · JPG / PNG</button><input id="photoFile" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" hidden><canvas id="sourcePreview" width="225" height="165" aria-label="拟合源图灰度预览" hidden style="margin-top:12px;box-shadow:none;cursor:default"></canvas><p id="photoInfo" class="source-note">图片仅在本机处理，按比例完整放入版面。</p>';
$('generatorControls').prepend(imageControls);
const controlIds = { density: 'genDensity', flow: 'genFlow', order: 'genOrder', space: 'genSpace', width: 'genWidth' };
const advanced = document.createElement('div');
advanced.className = 'legacy-controls';
advanced.innerHTML = `<label for="designFinish">图案风格</label><select id="designFinish"><option value="engraved">精刻 · 层次与纹饰</option><option value="raw">原始 · 算法轨迹</option></select><div id="mazeAlgorithmGroup"><label for="mazeAlgorithm">迷宫算法</label><select id="mazeAlgorithm"><option value="dfs">深度优先 · 长通道</option><option value="prim">随机 Prim · 多分枝</option></select></div>`;
for (const [key, name] of Object.entries({ swirl: '涡旋驱动力', viscosity: '黏度', duration: '演化时间', bias: '生长偏向', loops: '回路比例', warp: '网格弯曲', fidelity:'原图保真', randomness:'随机程度', detail:'细节尺度', contrast:'黑白层次' })) {
  const id = 'algo' + key;
  advanced.insertAdjacentHTML('beforeend', `<div id="${id}Group"><label for="${id}">${name} <output id="${id}Value"></output></label><input id="${id}" type="range" min="0" max="100" value="${generator.algorithmDefaults[key]}"></div>`);
  controlIds[key] = id;
}
$('generatorControls').querySelector('.sliders').after(advanced);
$('genMode').insertAdjacentHTML('afterbegin', '<option value="photo">图片 · 混合刻线拟合</option><option value="fluid">流体 · 速度场演化</option><option value="maze">迷宫 · 路径与回路</option>');
$('genMode').value = 'photo';
for(const element of [$('generatorControls').querySelector(':scope > h2'),$('generatorControls').querySelector('label[for="genMode"]'),$('genMode'),$('generatorControls').querySelector(':scope > .sliders'),$('generatorControls').querySelector('label[for="favorites"]'),$('favorites'),$('restoreFavorite'),$('favoriteDesign'),$('lockLayout')?.closest('label')])if(element)element.hidden=true;
$('generatorControls').querySelectorAll('.gen-intro').forEach(element=>element.hidden=true);
$('exportDesign').textContent='保存方案';$('importDesign').textContent='打开方案';
const plateWork = document.querySelector('.work');
const plateSections = [...document.querySelectorAll('aside > section:not(#generatorControls)')];
const panel = document.createElement('div');
panel.className = 'gen-panel';
panel.innerHTML = `<div class="gen-heading"><div><h2>图片刻线</h2><p id="modeDescription">上传图片，让随机刻线沿着它的明暗与轮廓生长。</p></div><span id="designSeed" class="seed-badge"></span></div>
<div class="studio design-stage"><canvas id="designCanvas" width="900" height="660" aria-label="选中图案的放大预览"></canvas></div>
<div class="caption"><span id="designInfo"></span><span>固定黑线 · 暖白纸底 / 制版方向</span></div>
<div class="recent"><span>最近的变奏</span><div id="candidates" class="candidates" aria-label="最近四次变奏"></div></div>
<div class="gen-footer"><span id="genMessage" class="gen-message" role="status" aria-live="polite">上传一张图片开始创作。</span><div class="row"><select id="transferMode" class="transfer-select" aria-label="转入制版方式" hidden><option value="replace">替换当前版面</option></select><button id="transferDesign" class="primary">进入制版 →</button></div></div>
<p class="notes">刻线转入铜版后，再通过腐蚀、墨量、压力和纸张得到最终印样。</p>`;
document.querySelector('main').appendChild(panel);
let recipes = [], results = [], selected = 0, favorites = [], updateTimer;

let uiJob=0,generationPromise=null;
const progressUI=document.createElement('div');progressUI.innerHTML='<progress id="genProgress" max="100" value="0" style="width:100%"></progress><button id="cancelGeneration" hidden>取消生成</button><p id="generationMetrics" class="source-note"></p>';
$('generatorControls').append(progressUI);
const generationClient=new GenerationClient((value,label)=>{$('genProgress').value=value;message(label+' · '+value+'%');});
function setBusy(busy){for(const id of ['generateFour','transferDesign','exportDesign','favoriteDesign','restoreFavorite','varyDesign','save'])$(id).disabled=busy||(!currentResult()&&id!=='restoreFavorite'&&id!=='save');document.querySelectorAll('.candidate').forEach(b=>b.disabled=busy);$('cancelGeneration').hidden=!busy;window.refinement?.busy(busy||!currentResult());}
async function runGeneration(draft,nextSelected,indices=draft.map((_,i)=>i)){
  const job=++uiJob;setBusy(true);$('genProgress').value=0;
  generationPromise=(async()=>{try{
    const reply=await generationClient.run(indices.map(i=>draft[i]));if(job!==uiJob)return false;
    const next=indices.length===draft.length?[]:results.slice();reply.results.forEach((result,k)=>{result.recipe=draft[indices[k]];next[indices[k]]=result;});
    recipes=draft;results=next;selected=nextSelected;syncControls();paintCandidates();$('genProgress').value=100;
    $('generationMetrics').textContent=(reply.elapsed/1000).toFixed(2)+' s · 工作内存估算 '+(reply.estimatedBytes/1048576).toFixed(1)+' MB（非进程峰值）';message('生成完成。可继续编辑或转入制版。');return true;
  }catch(error){if(job===uiJob){if(currentRecipe())syncControls();message(error.name==='AbortError'?'已取消，保留上一次结果。':error.message);}return false;
  }finally{if(job===uiJob){setBusy(false);generationPromise=null;}}})();
  return generationPromise;
}
$('cancelGeneration').onclick=()=>{generationClient.cancel();};

const storageKey = 'kejian-design-favorites-v1';
function freshSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function readParams() { return { ...Object.fromEntries(Object.entries(controlIds).map(([key, id]) => [key, Number($(id).value)])), mazeAlgorithm: $('mazeAlgorithm').value, finish: $('designFinish').value }; }
function message(text) { $('genMessage').textContent = text; }
function currentRecipe() { return recipes[selected]; }
function currentResult() { return results[selected]; }
function syncControls() {
  const r = currentRecipe(); if (!r) return;
  $('genMode').value = r.mode;
  for (const [key, id] of Object.entries(controlIds)) { $(id).value = r.params[key] ?? generator.algorithmDefaults[key]; $(id + 'Value').value = $(id).value + '%'; }
  $('mazeAlgorithm').value = r.params.mazeAlgorithm || 'dfs'; $('designFinish').value=r.params.finish || 'raw'; $('designFinish').hidden=!['fluid','maze'].includes(r.mode); advanced.querySelector('label[for=designFinish]').hidden=$('designFinish').hidden;
  for (const key of Object.keys(generator.algorithmDefaults)) $('algo'+key+'Group').hidden = !((r.mode === 'fluid' ? ['swirl','viscosity','duration'] : r.mode === 'maze' ? ['bias','loops','warp'] : r.mode === 'photo' ? ['fidelity','randomness','detail','contrast'] : []).includes(key));
  $('mazeAlgorithmGroup').hidden = r.mode !== 'maze';
  for (const id of ['genFlow','genOrder']) $(id).parentElement.hidden = ['fluid','maze','photo'].includes(r.mode);
  if(r.mode==='photo'){uploadedImage=r.image;paintSource(r.image);}
  $('sourcePreview').hidden=r.mode!=='photo';
  $('lockLayout').disabled=r.mode==='photo';
  if(r.mode==='photo'){$('lockLayout').checked=true;$('photoInfo').textContent=`拟合源图 · ${r.image.width} × ${r.image.height} 分析 · 本机处理`;}
  $('generatorControls').querySelector('.gen-intro').textContent = r.mode === 'maze' ? '锁定网格位置与形变。疏密控制网格数量，留白控制页边距。变奏重新开辟通道。回路为 0 时，任意两格间只有一条路径。' : r.mode === 'fluid' ? '锁定涡旋源位置。疏密控制粒子数量，留白控制中央无刻线区。变奏改变粒子起点和驱动力相位。' : '调节参数保留种子。锁定时保留线群位置；关闭后，参数也参与构图变化。“生成四张”始终探索新构图。';
  if(r.params.finish==='engraved'&&r.mode==='fluid') $('generatorControls').querySelector('.gen-intro').textContent='疏密控制细线间距，线宽控制浓淡。锁定涡旋源位置后，演化时间与黏度仍可改变线条走势。';
  if(r.params.finish==='engraved'&&r.mode==='maze') $('generatorControls').querySelector('.gen-intro').textContent='疏密控制迷宫细节，留白控制纹章大小。中央花纹和外缘刻度也会写入铜版。变奏重新生长环内路径。';
  if(r.mode==='photo')$('generatorControls').querySelector('.gen-intro').textContent='图片构图固定，变奏只改变刻线。保真控制边缘约束，疏密控制排线间距；图片很浅时可减少留白或调整黑白层次。';
  window.refinement?.sync(r);
  panel.querySelector('.notes').textContent = '算法结果会成为防蚀层开口，开始腐蚀后才形成刻深。可以继续手工加工、叠加其他图案或返回选稿；铜版会保留。';
  if(r.mode==='photo')panel.querySelector('.notes').textContent='新上传图片按 900 × 660 分析，独立细轮廓叠加明暗排线；旧方案保留原分析精度。原图与图案都是制版方向，压印会左右反转。方案文件包含分析用灰度图，可离线恢复。';
}
function showWorkspace(generating) {
  if (generating) stop();
  panel.hidden = !generating; plateWork.hidden = generating;
  $('generatorControls').hidden = !generating;
  plateSections.forEach(s => s.hidden = generating);
  $('showGenerator').classList.toggle('active', generating);
  $('showPlate').classList.toggle('active', !generating);
}
$('showGenerator').onclick = () => showWorkspace(true);
$('showPlate').onclick = () => showWorkspace(false);
function paintSelected() {
  const r = currentRecipe(), result = currentResult(); if (!r || !result) return;
  generator.draw($('designCanvas').getContext('2d'), result);
  $('designSeed').textContent = 'SEED ' + r.seed + ' / V' + r.variation;
  const detail = r.mode === 'maze' ? `${result.stats.cells} 个网格 · ${result.stats.cycles} 个回路` : r.mode === 'fluid' ? `${result.stats.steps} 步演化 · ${result.paths.length} 处刻线细节` : `${result.paths.length} 条刻线`;
  if(r.mode==='photo') $('photoInfo').textContent=`${r.image.width} × ${r.image.height} 分析 · ${result.stats.contours||0} 段细轮廓 · 旧图升级需重新上传`; $('designInfo').textContent = `${modeNames[r.mode]} · ${detail} · 方案 ${selected + 1}`;
  $('modeDescription').textContent = {
    wind: '让线条舒展、起伏，在疏密之间形成轻盈的明暗。先选构图，再慢慢调整它的节奏。',
    photo:'随机刻线沿着图片的明暗与轮廓生长。',
    vortex: '线条围绕偏心的中心盘旋，局部相遇、转向，留下环流之间的空隙。',
    islands: '几处独立线群被纸面的空白分开，在聚集与间隔之间建立平衡。',
    fluid: '精刻风格从演化后的流体中提取细密曲线，以间距、收尖与留白形成浓淡。原始风格保留粒子的运动轨迹。改变演化时间与黏度，可以重塑内部纹理。',
    maze: '精刻风格将迷宫展开成环形纹章，中心叠加玫瑰曲线，外缘辅以细线与刻度。长通道、分枝与回路决定纹章内部的节奏；原始风格保留方形网格。'
  }[r.mode] || '上传图片，让随机刻线沿着它的明暗与轮廓生长。';
  window.refinement?.paint(r,result);
  document.querySelectorAll('.candidate').forEach((b, i) => { b.classList.toggle('active', i === selected); b.setAttribute('aria-pressed', String(i === selected)); });
}
function paintCandidates() {
  const container = $('candidates'); container.replaceChildren();
  results.forEach((result, i) => {
    const b = document.createElement('button'); b.className = 'candidate';
    b.setAttribute('aria-label', `选择方案 ${i + 1}，${modeNames[recipes[i].mode]}`);
    const c = document.createElement('canvas'); c.width = 360; c.height = 264;
    const title = document.createElement('span'); title.textContent = `变奏 ${i + 1} · ${result.paths.length} 条线`;
    b.append(c, title); b.onclick = async () => { await flushUpdate(); selected = i; syncControls(); paintSelected(); message('已回到这个变奏。'); };
    container.append(b); generator.draw(c.getContext('2d'), result);
  });
  paintSelected();
}
async function regenerateSelected() {
  clearTimeout(updateTimer); updateTimer = null;
  const current=currentRecipe(); if(!current)return; const r=cloneRecipe(current);
  r.params=readParams(); if(r.mode==='photo'&&window.refinement)r.pro=window.refinement.recipe();
  if (!$('lockLayout').checked) {
    let hash = r.seed;
    for (const value of JSON.stringify(r.params)) hash = Math.imul(hash ^ value.charCodeAt(0), 16777619) >>> 0;
    r.layoutSeed = hash;
  }
  const draft=recipes.slice();draft[selected]=r;await runGeneration(draft,selected,[selected]);

}
async function flushUpdate() { if(updateTimer)await regenerateSelected(); else if(generationPromise)await generationPromise; }
for (const [key, id] of Object.entries(controlIds)) {
  $(id).oninput = () => { $(id + 'Value').value = $(id).value + '%'; clearTimeout(updateTimer); updateTimer = setTimeout(regenerateSelected, 140); };
}
async function generateFour() {
  clearTimeout(updateTimer); updateTimer = null;
  if(!uploadedImage){message('请先上传一张 JPG 或 PNG 图片。');return false;}
  const params=readParams(),base=currentRecipe(),seed=base?.seed??freshSeed();
  const recipe=base?{...cloneRecipe(base),variation:(base.variation+1)>>>0,params:{...params},image:uploadedImage,pro:window.refinement?.recipe(false)}:{version:1,mode:'photo',seed,layoutSeed:seed,variation:0,params:{...params},image:uploadedImage,pro:window.refinement?.recipe(true)};
  const draft=recipes.slice(),next=results.slice();
  if(draft.length>=4){draft.shift();next.shift();}
  draft.push(recipe);results=next;const index=draft.length-1;
  return await runGeneration(draft,index,[index]);

}
$('generateFour').textContent='生成新变奏';
$('generateFour').onclick = generateFour;
$('genMode').onchange = ()=>{$('genMode').value='photo';};
$('mazeAlgorithm').onchange = regenerateSelected; $('designFinish').onchange = regenerateSelected;
$('varyDesign').onclick = async () => {
  await flushUpdate(); const r = cloneRecipe(currentRecipe()); r.variation = (r.variation + 1) >>> 0;
  const draft=recipes.slice();draft[selected]=r;await runGeneration(draft,selected,[selected]);
};
$('varyDesign').hidden=true;
async function restoreRecipe(r) {
  if (!generator.validRecipe(r)) throw new Error('方案格式不正确');
  if(r.mode!=='photo')throw new Error('新版工作台只打开图片刻线方案');
  clearTimeout(updateTimer); updateTimer = null;
  if(!await runGeneration([cloneRecipe(r)],0))return false;
  $('lockLayout').checked = true; syncControls(); paintCandidates();return true;
}
function refreshFavorites() {
  $('favorites').replaceChildren();
  if (!favorites.length) $('favorites').add(new Option('尚无收藏', ''));
  favorites.forEach((r, i) => $('favorites').add(new Option(`${i + 1}. ${modeNames[r.mode]} / ${r.seed} / V${r.variation}`, String(i))));
  $('restoreFavorite').disabled = !favorites.length;
}
try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) favorites = saved.filter(generator.validRecipe).slice(-40); } catch { /* File origins may disallow storage; exports remain available. */ }
refreshFavorites();
$('favoriteDesign').onclick = async () => {
  await flushUpdate(); const r = cloneRecipe(currentRecipe());
  if (favorites.some(item => JSON.stringify(item) === JSON.stringify(r))) { message('这张方案已经收藏。'); return; }
  favorites.push(r); if (favorites.length > 40) favorites.shift(); refreshFavorites(); $('favorites').value = String(favorites.length - 1);
  try { localStorage.setItem(storageKey, JSON.stringify(favorites)); message('已收藏。可导出方案文件作长期备份。'); }
  catch { message('已暂存到本次会话；浏览器无法保存收藏，请导出方案文件。'); }
};
$('restoreFavorite').onclick = async () => { const r = favorites[Number($('favorites').value)]; if (r) { if(await restoreRecipe(r))message('已恢复收藏的种子、参数与构图。'); } };
$('exportDesign').onclick = async () => { await flushUpdate(); download(new Blob([JSON.stringify({ type: 'kejian-design', recipe: currentRecipe() }, null, 2)], { type: 'application/json' }), `刻间-方案-${currentRecipe().seed}.json`); message('方案已导出。'); };
$('importDesign').onclick = () => $('designFile').click();
$('designFile').onchange = async e => {
  try {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 6000000) throw new Error('方案文件过大');
    const data = JSON.parse(await file.text());
    if (data.type !== 'kejian-design') throw new Error('请选择导出的图案方案文件');
    if(await restoreRecipe(data.recipe))message('方案已恢复。');
  } catch (err) { message('打开失败：' + err.message); }
  e.target.value = '';
};
$('transferDesign').onclick = async () => {
  await flushUpdate(); const replace = true;
  if (replace && $('irreversible').checked && !confirm('不可逆模式下，替换将清除当前铜版且无法撤销。确定替换？')) return;
  stop(); snapshot();
  if (replace) { const width=Number($('plateSize')?.value||900);if(width!==W)allocatePlate(width);depth.fill(0); exposed.fill(0); blocked.fill(0); elapsed = 0; plateSources = []; }
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const context = mask.getContext('2d'); generator.draw(context, currentResult(), false, window.printStrokeScale||1);
  const pixels = context.getImageData(0, 0, W, H).data;
  for (let i = 0; i < N; i++) if (pixels[i * 4 + 3]) {
    exposed[i] = Math.max(exposed[i], pixels[i * 4 + 3] / 255); blocked[i] = 0;
  }
  plateSources.push(cloneRecipe(currentRecipe()));
  setView('plate'); dirty = true; showWorkspace(false);
  $('status').textContent = '图案已划开防蚀层 · 点击“开始腐蚀”形成刻深';
};
// Plate files retain the working selection and all recipes applied to the plate.
window.designSession = {
  save() { return { recipes: recipes.map(cloneRecipe), selected, locked: $('lockLayout').checked }; },
  validate(data) { return data && Array.isArray(data.recipes) && data.recipes.length >= 1 && data.recipes.length <= 4 && data.recipes.every(generator.validRecipe) && Number.isInteger(data.selected) && data.selected >= 0 && data.selected < data.recipes.length; },
  async restore(data) {
    if (!this.validate(data)) return;
    clearTimeout(updateTimer); updateTimer = null;
    await runGeneration(data.recipes.map(cloneRecipe),data.selected); $('lockLayout').checked = data.locked !== false;
    syncControls(); paintCandidates();
  }
};
function paintSource(source){
  const c=$('sourcePreview');c.width=source.width;c.height=source.height;const context=c.getContext('2d'),im=context.createImageData(source.width,source.height);
  source.pixels.forEach((v,i)=>{im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=v;im.data[i*4+3]=255;});context.putImageData(im,0,0);
}
$('uploadPhoto').onclick=()=>$('photoFile').click();
$('photoFile').onchange=async e=>{
  let bitmap;
  try{
    const file=e.target.files[0];if(!file)return;
    if(!['image/jpeg','image/png'].includes(file.type))throw Error('请选择 JPG 或 PNG 图片');
    if(file.size>20*1024*1024)throw Error('图片请控制在 20 MB 以内');
    $('uploadPhoto').disabled=true;message('正在读取图片并生成刻线…');
    bitmap=await createImageBitmap(file);
    if(window.refinement){uploadedImage=await window.refinement.setOriginal(bitmap);}else{
    const c=document.createElement('canvas');c.width=900;c.height=660;const context=c.getContext('2d');
    context.fillStyle='#fff';context.fillRect(0,0,900,660);
    const ratio=Math.min(828/bitmap.width,588/bitmap.height),dw=bitmap.width*ratio,dh=bitmap.height*ratio;
    context.drawImage(bitmap,(900-dw)/2,(660-dh)/2,dw,dh);
    const rgba=context.getImageData(0,0,900,660).data,pixels=[];
    for(let i=0;i<rgba.length;i+=4)pixels.push(Math.round(.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2]));
    uploadedImage={width:900,height:660,pixels};}
    $('photoInfo').textContent=`已载入 ${bitmap.width} × ${bitmap.height} 图片 · 本机处理 · 透明区域按白纸处理`;
    recipes=[];results=[];selected=0;$('genMode').value='photo';if(await generateFour())message(results.some(r=>r.paths.length)?'刻线稿已生成。可调参数、生成变奏或进入制版。':'图片很浅，当前没有可刻线区域。请调整明暗或使用“自动展开明暗”。');
  }catch(error){message('图片读取失败：'+error.message);}
  finally{bitmap?.close();$('uploadPhoto').disabled=false;e.target.value='';}
};
setTimeout(()=>{showWorkspace(true);const c=$('designCanvas'),cx=c.getContext('2d');cx.fillStyle='#f1ead6';cx.fillRect(0,0,c.width,c.height);setBusy(false);},0);
