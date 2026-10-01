/* Diagnose the actual inline plate engine without changing application state. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const values = {size:4,acid:45,grain:45,ink:90,pressure:65,tone:0,paper:'smooth'};
const elements = new Map();
const el = id => { if (!elements.has(id)) elements.set(id, {value:values[id]??'',checked:false,getContext:()=>({})}); return elements.get(id); };
const c = vm.createContext({document:{getElementById:el,querySelectorAll:()=>[]},requestAnimationFrame(){},structuredClone,window:{}});
const run = s => vm.runInContext(s,c);
run(source);
run(`allocatePlate(320,240);
for(let y=30;y<105;y++)for(let x=30;x<290;x++){
 const i=y*W+x;
 if(x%12<2)depth[i]=.12;
 if(x>165&&(x+y)%14<2)depth[i]=.24;
}
for(let y=130;y<200;y++)for(let x=30;x<290;x++)depth[y*W+x]=.02+.35*(x-30)/260;
`);
const original = run('depth.slice()');
function render(settings={}) {
 for(const [k,v] of Object.entries({...values,...settings}))el(k).value=v;
 let out;
 c.target={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:im=>out=im.data};
 run('render(target,"print")');return out;
}
function diff(a,b){let changed=0,max=0,total=0;for(let i=0;i<a.length;i+=4){let d=Math.max(...[0,1,2].map(k=>Math.abs(a[i+k]-b[i+k])));if(d)changed++;max=Math.max(max,d);total+=d;}return{changedPixels:changed,maxChannelDifference:max,meanMaxChannelDifference:total/(a.length/4)};}
const cases=[
 ['Pressure 0 / Ink 90', {pressure:0}],
 ['Pressure 100 / Ink 90',{pressure:100}],
 ['Pressure 0 / Ink 144',{pressure:0,ink:144}],
 ['Pressure 100 / Ink 30',{pressure:100,ink:30}],
 ['Smooth / Tone 0',{}],
 ['Smooth / Tone 20',{tone:20}],
 ['Rough / Seed 17',{paper:'rough'}],
 ['Rough / Seed 18',{paper:'rough',seed:18}],
];
const images=cases.map(([label,settings])=>{run(`seed=${settings.seed||17}`);return render(settings);});
run('seed=17');const smooth17=render();run('seed=18');const smooth18=render();
const report={
 engine:'Unmodified index.html render() and etch(), executed in a Node VM with Canvas ImageData sink',
 pressureInkEquivalence:diff(images[2],images[3]),
 smoothSuccessiveImpressions:diff(smooth17,smooth18),
 roughSuccessiveImpressions:diff(images[6],images[7]),
 plateChangedByPrinting:original.some((v,i)=>v!==run('depth')[i]),
 zeroPressureCenterRGB:Array.from(images[0].slice((60*320+67)*4,(60*320+67)*4+3)),
 toneOnBlankPaperRGB:{before:Array.from(images[4].slice((115*320+160)*4,(115*320+160)*4+3)),after:Array.from(images[5].slice((115*320+160)*4,(115*320+160)*4+3))},
};
function erosion(w){run(`allocatePlate(${w},${w});exposed[Math.floor(H/2)*W+Math.floor(W/2)]=1;`);el('grain').value=0;el('acid').value=45;run('for(let k=0;k<100;k++)etch(.1)');return run(`(()=>{const y=Math.floor(H/2),cx=Math.floor(W/2);let sum=0,moment=0;for(let x=0;x<W;x++){const d=depth[y*W+x];sum+=d;moment+=d*(x-cx)**2;}return{pixels:W,rmsSpreadPixels:Math.sqrt(moment/sum),rmsSpreadAt254mm:Math.sqrt(moment/sum)*254/W};})()`);}
report.resolutionDependentEtching=[erosion(100),erosion(400)];
function png(w,h,rgba){
 const crc=b=>{let n=0xffffffff;for(const v of b){n^=v;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return(n^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const tag=Buffer.from(type),b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);tag.copy(b,4);data.copy(b,8);b.writeUInt32BE(crc(Buffer.concat([tag,data])),data.length+8);return b;};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(raw,y*(w*4+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const outdir=path.join(root,'docs','audits','print-process');fs.mkdirSync(outdir,{recursive:true});
images.forEach((im,i)=>fs.writeFileSync(path.join(outdir,`case-${i+1}.png`),png(320,240,im)));
const sheet=new Uint8ClampedArray(1280*480*4);images.forEach((im,k)=>{for(let y=0;y<240;y++)sheet.set(im.subarray(y*320*4,(y+1)*320*4),((Math.floor(k/4)*240+y)*1280+(k%4)*320)*4);});
fs.writeFileSync(path.join(outdir,'comparison.png'),png(1280,480,sheet));
fs.writeFileSync(path.join(outdir,'results.json'),JSON.stringify({cases:cases.map(x=>x[0]),...report},null,2));
fs.writeFileSync(path.join(outdir,'index.html'),`<!doctype html><meta charset="utf-8"><title>Etchloom print process audit</title><style>body{font:16px system-ui;background:#eee;padding:20px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0}img{width:100%}pre{white-space:pre-wrap}</style><h1>Actual render() parameter comparisons</h1><p>Fixed depth plate: fine lines, crosshatching and a depth ramp. No application code modified.</p><main>${cases.map(([label],i)=>`<figure><img src="case-${i+1}.png"><figcaption>${i+1}. ${label}</figcaption></figure>`).join('')}</main><pre>${JSON.stringify(report,null,2)}</pre>`);
console.log(JSON.stringify(report,null,2));
