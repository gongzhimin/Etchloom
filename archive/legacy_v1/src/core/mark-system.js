/* Etchloom V2: tone is translated into a small, coherent vocabulary of marks. */
(function(root){
  'use strict';
  const WIDTH=900,HEIGHT=660;
  const clamp=v=>Math.max(0,Math.min(1,v));
  function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
  function blur(image,r=3){const {width:w,height:h,pixels}=image,out=new Float32Array(w*h),sum=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=pixels[y*w+x];sum[(y+1)*(w+1)+x+1]=sum[y*(w+1)+x+1]+row;}}for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=Math.max(0,x-r),rr=Math.min(w,x+r+1),t=Math.max(0,y-r),b=Math.min(h,y+r+1);out[y*w+x]=(sum[b*(w+1)+rr]-sum[t*(w+1)+rr]-sum[b*(w+1)+l]+sum[t*(w+1)+l])/((rr-l)*(b-t));}return out;}
  function analyze(image){
    const {width:w,height:h}=image,tone=blur(image,Math.max(2,Math.round(w/300))),n=w*h,tier=new Uint8Array(n),cx=new Float32Array(n),cy=new Float32Array(n);
    for(let i=0;i<n;i++){const dark=1-tone[i]/255;tier[i]=dark<.10?0:dark<.27?1:dark<.48?2:dark<.72?3:4;}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=tone[i+1]-tone[i-1],gy=tone[i+w]-tone[i-w],a=Math.atan2(gy,gx)+Math.PI/2;cx[i]=Math.cos(2*a);cy[i]=Math.sin(2*a);}
    for(let pass=0;pass<5;pass++){const ax=cx.slice(),ay=cy.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;cx[i]=(ax[i]*4+ax[i-1]+ax[i+1]+ax[i-w]+ax[i+w])/8;cy[i]=(ay[i]*4+ay[i-1]+ay[i+1]+ay[i-w]+ay[i+w])/8;}}
    return{width:w,height:h,tone,tier,cx,cy};
  }
  function generate(image,seed=1,params={}){
    const a=analyze(image),rng=random(seed),paths=[],density=clamp((params.hatch??100)/100),cross=clamp((params.cross??65)/100),randomness=clamp((params.randomness??18)/100),sx=a.width/WIDTH,sy=a.height/HEIGHT;
    const index=(x,y)=>Math.max(0,Math.min(a.height-1,Math.round(y*sy)))*a.width+Math.max(0,Math.min(a.width-1,Math.round(x*sx)));
    const tier=(x,y)=>a.tier[index(x,y)],direction=(x,y,layer)=>{const i=index(x,y),local=.5*Math.atan2(a.cy[i],a.cx[i]),fallback=-.62+layer*.08,confidence=clamp(Math.hypot(a.cx[i],a.cy[i]));let angle=fallback+Math.atan2(Math.sin(local-fallback),Math.cos(local-fallback))*confidence*.82;if(layer>1)angle+=Math.PI*(.43+(layer-2)*.09);return angle;};
    function trace(x,y,sign,threshold,layer){const points=[];let previous=direction(x,y,layer);for(let k=0;k<260;k++){let angle=direction(x,y,layer);if(Math.cos(angle-previous)<0)angle+=Math.PI;angle+=Math.sin(x*.021+y*.017+seed)*randomness*.045;x+=Math.cos(angle)*2.6*sign;y+=Math.sin(angle)*2.6*sign;previous=angle;if(x<20||x>880||y<20||y>640||tier(x,y)<threshold)break;points.push([x,y]);}return points;}
    const layers=[{threshold:1,spacing:22,layer:0,width:.34},{threshold:2,spacing:15,layer:0,width:.38},{threshold:3,spacing:12,layer:1,width:.42},{threshold:3,spacing:17,layer:2,width:.31},{threshold:4,spacing:10,layer:1,width:.46},{threshold:4,spacing:13,layer:3,width:.34}];
    for(const spec of layers){if(spec.layer>1&&cross<=0)continue;const spacing=spec.spacing/(.55+density*.65),offset=rng()*spacing;for(let y=22+offset;y<638;y+=spacing)for(let x=22+(rng()-.5)*spacing;x<878;x+=spacing*1.25){if(tier(x,y)<spec.threshold||rng()>.72*(spec.layer>1?cross:1))continue;const left=trace(x,y,-1,spec.threshold,spec.layer),right=trace(x,y,1,spec.threshold,spec.layer),points=left.reverse().concat([[x,y]],right);if(points.length<10)continue;paths.push({points,width:spec.width,role:spec.layer>1?'cross':'hatch',mark:'tone-tier-'+spec.threshold,toneTier:spec.threshold,layer:spec.layer,taper:true});}}
    // Deep shadow is a printable black mass assembled from broad, short cuts.
    for(let y=25;y<635;y+=6)for(let x=25;x<875;x+=6){if(tier(x,y)!==4||rng()>.48*density)continue;const angle=direction(x,y,1),length=3+rng()*5;paths.push({points:[[x-Math.cos(angle)*length,y-Math.sin(angle)*length],[x+Math.cos(angle)*length,y+Math.sin(angle)*length]],width:1.05,role:'mass',mark:'black-mass',toneTier:4});}
    return{paths,stats:{algorithm:'mark-system-v2',toneTiers:Array.from(a.tier.reduce((bins,v)=>(bins[v]++,bins),new Uint32Array(5))),hatch:paths.filter(p=>p.role==='hatch').length,cross:paths.filter(p=>p.role==='cross').length,blackMass:paths.filter(p=>p.role==='mass').length}};
  }
  const api={analyze,generate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MarkSystem=api;
})(globalThis);
