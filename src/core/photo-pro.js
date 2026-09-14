/* Photo refinement pipeline. No DOM; usable in a worker and in node tests. */
(function(root){
  'use strict';
  const defaults={exposure:50,blackPoint:0,whitePoint:100,shadows:20,cleanup:55,sketch:45,contour:85,hatch:100,maze:0,cross:65,contourSeed:1,hatchSeed:1,mazeSeed:1};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
  function valid(pro){
    if(!pro||pro.version!==1)return false;
    for(const k of Object.keys(defaults)){const v=pro[k]??defaults[k];if(!Number.isFinite(v)||v<0||v>(k.endsWith('Seed')?4294967295:100))return false;}
    if((pro.blackPoint??0)>=(pro.whitePoint??100))return false;
    return !pro.edits||(Array.isArray(pro.edits)&&pro.edits.length<=300&&pro.edits.every(e=>['white','direction','cross','protect'].includes(e.type)&&[e.x,e.y,e.radius,e.angle].every(Number.isFinite)&&e.x>=0&&e.x<=900&&e.y>=0&&e.y<=660&&e.radius>=1&&e.radius<=150&&(!e.frozen||(Array.isArray(e.frozen)&&e.frozen.length<=20000&&e.frozen.every(validPath)))));
  }
  function validPath(p){return p&&Number.isFinite(p.width)&&p.width>0&&p.width<30&&Array.isArray(p.points)&&p.points.length>=2&&p.points.length<=20000&&p.points.every(q=>Array.isArray(q)&&q.length===2&&q.every(Number.isFinite)&&q[0]>=0&&q[0]<=900&&q[1]>=0&&q[1]<=660);}
  function value(v,pro){
    const p={...defaults,...pro},black=p.blackPoint/100,white=p.whitePoint/100;
    const adjusted=Math.max(0,Math.min(1,(v/255-black)/(white-black)));
    const lit=Math.pow(adjusted,Math.pow(2,(50-p.exposure)/35));
    // Lift deep shadows without changing white or reversing the luminance order.
    return Math.round(255*Math.min(1,lit+(p.shadows/100)*.30*(1-lit)**3));
  }
  function toneImage(image,pro){return {...image,pixels:image.pixels.map(v=>value(v,pro))};}
  function autoLevels(image){const hist=new Uint32Array(256);for(const v of image.pixels)hist[v]++;const quantile=f=>{let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=image.pixels.length*f)return i;}return 255;};const lo=quantile(.02),hi=quantile(.98);return hi-lo<5?{blackPoint:0,whitePoint:100}:{blackPoint:Math.floor(lo/255*100),whitePoint:Math.min(100,Math.ceil(hi/255*100))};}
  function blur(image,radius){
    const {width:w,height:h}=image,src=image.pixels,out=new Array(w*h);
    const integral=new Float64Array((w+1)*(h+1));
    for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=src[y*w+x];integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+row;}}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const l=Math.max(0,x-radius),r=Math.min(w,x+radius+1),t=Math.max(0,y-radius),b=Math.min(h,y+radius+1);
      out[y*w+x]=Math.round((integral[b*(w+1)+r]-integral[t*(w+1)+r]-integral[b*(w+1)+l]+integral[t*(w+1)+l])/((r-l)*(b-t)));
    }return {width:w,height:h,pixels:out};
  }
  function noiseEstimate(image){
    const {width:w,height:h,pixels}=image,samples=[];for(let y=2;y<h-2;y+=3)for(let x=2;x<w-2;x+=3){const i=y*w+x,residual=Math.abs(pixels[i]*4-pixels[i-1]-pixels[i+1]-pixels[i-w]-pixels[i+w])/4;samples.push(residual);}if(!samples.length)return 0;samples.sort((a,b)=>a-b);return Math.min(1,samples[Math.floor(samples.length*.5)]/32);
  }
  function cleanImage(image,amount=55,estimated=noiseEstimate(image)){
    amount=Math.max(0,Math.min(100,amount));if(amount===0)return{...image,pixels:image.pixels.slice(),noiseLevel:estimated,cleanupStrength:0};
    const {width:w,height:h}=image,n=w*h,adaptive=amount/100*(.42+Math.min(1,estimated)*.58),iterations=Math.max(1,Math.round(adaptive*6)),threshold=9+amount*.19;let src=Float32Array.from(image.pixels);
    for(let pass=0;pass<iterations;pass++){const out=src.slice();for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,c=src[i];let flow=0;for(const j of [i-1,i+1,i-w,i+w]){const d=src[j]-c,conduct=1/(1+(d/threshold)**2);flow+=conduct*d;}out[i]=Math.max(0,Math.min(255,c+flow*.2));}src=out;}
    return{...image,pixels:Array.from(src,v=>Math.round(v)),noiseLevel:estimated,cleanupStrength:adaptive};
  }
  function sketchStructure(image,amount=45){
    amount=Math.max(0,Math.min(100,amount));if(amount===0)return{...image,pixels:image.pixels.slice(),sketchStrength:0};
    const {width:w,height:h}=image,n=image.pixels.length,fine=blur(image,1).pixels,broad=blur(image,4).pixels,mix=amount/100,response=new Float32Array(n),flowed=new Float32Array(n),tangent=new Float32Array(n),candidate=new Uint8Array(n),strong=new Uint8Array(n),keep=new Uint8Array(n),out=new Array(n),low=2.8-mix*1.2,high=11-mix*3;
    for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){const i=y*w+x,dog=Math.max(0,broad[i]-fine[i]),gx=(broad[i+1]-broad[i-1])*.5,gy=(broad[i+w]-broad[i-w])*.5,gradient=Math.hypot(gx,gy);response[i]=Math.max(dog,gradient*.42);tangent[i]=Math.atan2(gy,gx)+Math.PI/2;}
    // Approximate Flow-XDoG by integrating response along the local edge
    // tangent. Weak samples between two coherent neighbors inherit support,
    // while isolated noise has no stable direction in which to accumulate.
    for(let y=3;y<h-3;y++)for(let x=3;x<w-3;x++){const i=y*w+x,a=tangent[i];let sum=response[i]*2,weight=2;for(const distance of [1,2,3])for(const sign of [-1,1]){const sx=Math.round(x+Math.cos(a)*distance*sign),sy=Math.round(y+Math.sin(a)*distance*sign),j=sy*w+sx,alignment=Math.abs(Math.cos(tangent[j]-a));if(alignment>.55){sum+=response[j]*alignment;weight+=alignment;}}flowed[i]=Math.max(response[i],sum/weight);candidate[i]=flowed[i]>low;strong[i]=flowed[i]>Math.max(low*2.15,high*.42);}
    // Direction-aware hysteresis keeps low responses only when they connect to
    // a decisive stroke. This is the edge-flow equivalent of drawing through
    // a faint highlight without admitting the entire photographic texture.
    const queue=[];for(let i=0;i<n;i++)if(strong[i]){keep[i]=1;queue.push(i);}for(let head=0;head<queue.length;head++){const i=queue[head],x=i%w,y=Math.floor(i/w),a=tangent[i];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<2||nx>=w-2||ny<2||ny>=h-2)continue;const j=ny*w+nx;if(keep[j]||!candidate[j])continue;const step=Math.atan2(dy,dx),along=Math.abs(Math.cos(step-a)),coherent=Math.abs(Math.cos(tangent[j]-a));if(along>.42&&coherent>.48){keep[j]=1;queue.push(j);}}}
    for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;if(!keep[i])continue;let neighbors=0;for(const o of [-w-1,-w,-w+1,-1,1,w-1,w,w+1])neighbors+=keep[i+o];if(neighbors<2&&!strong[i])keep[i]=0;}
    for(let i=0;i<n;i++){const t=keep[i]?Math.max(0,Math.min(1,(flowed[i]-low)/(high-low))):0,ink=t*t*(3-2*t),shadow=Math.max(0,(82-broad[i])/82)*22*mix;out[i]=Math.round(Math.max(0,255-ink*(185+45*mix)-shadow));}return{...image,pixels:out,sketchStrength:mix,flowLinked:queue.length};
  }
  function vectorizeSketch(sketch,tone){
    const {width:w,height:h}=sketch,n=w*h,mask=new Uint8Array(n);for(let i=0;i<n;i++)if(sketch.pixels[i]<218)mask[i]=1;
    // Zhang-Suen thinning turns the rendered sketch band into a single-pixel
    // drawing skeleton before graph tracing.
    for(let iteration=0;iteration<28;iteration++){let changed=0;for(let phase=0;phase<2;phase++){const remove=[];for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!mask[i])continue;const p=[mask[i-w],mask[i-w+1],mask[i+1],mask[i+w+1],mask[i+w],mask[i+w-1],mask[i-1],mask[i-w-1]],count=p.reduce((a,b)=>a+b,0);if(count<2||count>6)continue;let transitions=0;for(let k=0;k<8;k++)if(!p[k]&&p[(k+1)%8])transitions++;if(transitions!==1)continue;const first=phase===0?p[0]*p[2]*p[4]:p[0]*p[2]*p[6],second=phase===0?p[2]*p[4]*p[6]:p[0]*p[4]*p[6];if(!first&&!second)remove.push(i);}for(const i of remove)mask[i]=0;changed+=remove.length;}if(!changed)break;}
    const directions=[-w,-w+1,1,w+1,w,w-1,-1,-w-1],opposite=[4,5,6,7,0,1,2,3],used=new Uint8Array(n),neighbors=i=>{const out=[];for(let d=0;d<8;d++)if(mask[i+directions[d]])out.push(d);return out;},markEdge=(i,d)=>{used[i]|=1<<d;used[i+directions[d]]|=1<<opposite[d];};
    // Junctions split a traced outline into short graph edges. Label the whole
    // connected skeleton so those short edges retain the scale of the object
    // boundary they belong to instead of being demoted to incidental detail.
    const component=new Int32Array(n);component.fill(-1);const componentScale=[];for(let start=0;start<n;start++){if(!mask[start]||component[start]>=0)continue;const id=componentScale.length,stack=[start];component[start]=id;let count=0,minX=w,maxX=0,minY=h,maxY=0;while(stack.length){const i=stack.pop(),x=i%w,y=Math.floor(i/w);count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const d of neighbors(i)){const next=i+directions[d];if(component[next]<0){component[next]=id;stack.push(next);}}}componentScale.push({count,span:Math.hypot(maxX-minX,maxY-minY)*900/w});}
    function walk(start,d){const points=[[start%w,Math.floor(start/w)]];let current=start,dir=d;for(let steps=0;steps<4000;steps++){markEdge(current,dir);const next=current+directions[dir];points.push([next%w,Math.floor(next/w)]);const options=neighbors(next).filter(nd=>!(used[next]&(1<<nd)));if(options.length!==1)break;current=next;dir=options[0];}return points;}
    const raw=[];for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;if(!mask[i]||neighbors(i).length===2)continue;for(const d of neighbors(i))if(!(used[i]&(1<<d)))raw.push({points:walk(i,d),component:component[i]});}for(let i=0;i<n;i++)if(mask[i])for(const d of neighbors(i))if(!(used[i]&(1<<d)))raw.push({points:walk(i,d),component:component[i]});
    const paths=[];for(const traced of raw){const points=traced.points;if(points.length<5)continue;const sampled=points.filter((_,i)=>i%2===0||i===points.length-1),scaled=sampled.map(q=>[q[0]*900/w,q[1]*660/h]),length=scaled.slice(1).reduce((sum,q,i)=>sum+Math.hypot(q[0]-scaled[i][0],q[1]-scaled[i][1]),0);if(length<7)continue;const contrast=scaled.reduce((sum,q)=>sum+localContrast(tone,q[0],q[1]),0)/scaled.length,closed=Math.hypot(scaled[0][0]-scaled.at(-1)[0],scaled[0][1]-scaled.at(-1)[1])<5,scale=componentScale[traced.component]||{count:0,span:0},semantic=contourSemantic(scaled,tone),main=semantic==='silhouette'||(semantic==='occlusion'&&length>32)||(length>58&&contrast>.045)||(closed&&length>28),structural=semantic==='form'||semantic==='occlusion'||length>17||scale.span>72||scale.count>34,level=main?'main':structural?'structure':'detail',width=semantic==='silhouette'?2:semantic==='occlusion'?1.55:level==='main'?1.8:semantic==='form'?1.05:level==='structure'?.92:.55;paths.push({points:scaled,width,role:'contour',mark:'sketch-'+semantic,semantic,level,preserve:true,taper:semantic==='texture'});}
    return paths;
  }
  function contourSemantic(points,tone){
    let left=0,right=0,count=0,contrast=0;const stride=Math.max(1,Math.floor(points.length/24));for(let i=1;i<points.length-1;i+=stride){const before=points[Math.max(0,i-stride)],after=points[Math.min(points.length-1,i+stride)],dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy);if(length<.1)continue;const nx=-dy/length,ny=dx/length,q=points[i],a=sample(tone,q[0]+nx*5,q[1]+ny*5),b=sample(tone,q[0]-nx*5,q[1]-ny*5);left+=a;right+=b;contrast+=Math.abs(a-b);count++;}if(!count)return'texture';left/=count;right/=count;contrast/=count;const light=Math.max(left,right),dark=Math.min(left,right);if(light>236&&dark<228&&contrast>13)return'silhouette';if(contrast>25&&light<246)return'occlusion';if(contrast>8||points.length>18)return'form';return'texture';
  }
  function sample(image,x,y){return image.pixels[Math.min(image.height-1,Math.max(0,Math.floor(y*image.height/660)))*image.width+Math.min(image.width-1,Math.max(0,Math.floor(x*image.width/900)))];}
  function hash(x,y,seed){let n=(Math.imul((x|0)+101,374761393)^Math.imul((y|0)+47,668265263)^seed)>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return(n>>>0)/4294967295;}
  function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function regionAngle(image,x,y,cross,seed){
    const tileX=Math.floor(x/105),tileY=Math.floor(y/92),step=Math.max(2,Math.round(image.width/112));
    const sx=x*image.width/900,sy=y*image.height/660,px=sx*900/image.width,py=sy*660/image.height;
    const gx=sample(image,px+step*900/image.width,py)-sample(image,px-step*900/image.width,py);
    const gy=sample(image,px,py+step*660/image.height)-sample(image,px,py-step*660/image.height);
    const global=-.68+(hash(tileX,tileY,seed)-.5)*.28;
    let tangent=Math.atan2(gy,gx)+Math.PI/2;if(Math.cos(tangent-global)<0)tangent+=Math.PI;
    const structure=Math.min(.55,Math.hypot(gx,gy)/85),base=global+angleDelta(global,tangent)*structure;
    return base+(cross?Math.PI*.43:0);
  }
  function localContrast(image,x,y){let lo=255,hi=0;for(const [dx,dy]of [[-4,0],[4,0],[0,-4],[0,4],[0,0]]){const v=sample(image,x+dx,y+dy);lo=Math.min(lo,v);hi=Math.max(hi,v);}return(hi-lo)/255;}
  function structureKind(image,x,y){const contrast=localContrast(image,x,y);if(contrast<.045)return'plane';if(contrast>.24)return'fragment';return'curve';}
  function engravingGrammar(input,image,seed,params={}){
    const out=[],stats={bundles:0,lostContours:0,deepLayer:0,brightGaps:0,planes:0,curves:0,fragments:0};
    const filamentCell=4,filamentGrid=new Map(),addFilament=(q,radius)=>{const key=Math.floor(q[1]/filamentCell)*512+Math.floor(q[0]/filamentCell);if(!filamentGrid.has(key))filamentGrid.set(key,[]);filamentGrid.get(key).push([q[0],q[1],radius]);};for(const path of input)if(path.role==='filament'||path.preserve)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],radius=path.role==='filament'?3.5:path.level==='main'?7:path.level==='structure'?5:3,steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(filamentCell/2)));for(let k=0;k<=steps;k++)addFilament([a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps],radius);}
    const nearFilament=q=>{const gx=Math.floor(q[0]/filamentCell),gy=Math.floor(q[1]/filamentCell);for(let y=gy-2;y<=gy+2;y++)for(let x=gx-2;x<=gx+2;x++){const bucket=filamentGrid.get(y*512+x);if(bucket&&bucket.some(p=>(p[0]-q[0])**2+(p[1]-q[1])**2<p[2]*p[2]))return true;}return false;};
    for(let pathIndex=0;pathIndex<input.length;pathIndex++){
      const path=input[pathIndex];
      if(path.preserve){out.push(path);continue;}
      if(path.role==='contour'||path.role==='contour-coarse'||path.role==='filament'){
        let points=[];const finish=()=>{if(points.length>1)out.push({...path,points});points=[];};
        for(let i=0;i<path.points.length;i++){
          const q=path.points[i],contrast=localContrast(image,q[0],q[1]),keep=contrast>.075||hash(pathIndex,Math.floor(i/11),seed)>.32;
          if(keep)points.push(q);else{finish();stats.lostContours++;}
        }finish();continue;
      }
      if(path.role!=='hatch'&&path.role!=='cross'){out.push(path);continue;}
      const centerPoint=path.points[Math.floor(path.points.length/2)],kind=structureKind(image,centerPoint[0],centerPoint[1]),kindScale=kind==='plane'?1.55:kind==='fragment'?.62:1;
      const chunk=Math.max(8,Math.round((30-(params.detail??65)*.12)*kindScale));
      for(let start=0;start<path.points.length-1;start+=chunk){
        const source=path.points.slice(start,Math.min(path.points.length,start+chunk+1));if(source.length<3)continue;
        const first=source[0],last=source[source.length-1],cx=(first[0]+last[0])/2,cy=(first[1]+last[1])/2,dark=1-sample(image,cx,cy)/255;
        if(path.role==='cross'&&(dark<.48||hash(pathIndex,start,seed)>Math.min(1,(dark-.42)*2.2)))continue;
        const current=Math.atan2(last[1]-first[1],last[0]-first[0]),target=regionAngle(image,cx,cy,path.role==='cross',seed),stability=kind==='plane'?.82:kind==='fragment'?.42:.62,angle=current+angleDelta(current,target)*stability;
        const length=Math.max(5,Math.hypot(last[0]-first[0],last[1]-first[1]))*(.82+hash(pathIndex,start+3,seed)*.24),normal=angle+Math.PI/2;
        const points=source.map((q,i)=>{const t=i/(source.length-1)-.5,wobble=(hash(pathIndex*37+i,start,seed)-.5)*.7;return[Math.max(24,Math.min(876,cx+Math.cos(angle)*length*t+Math.cos(normal)*wobble)),Math.max(24,Math.min(636,cy+Math.sin(angle)*length*t+Math.sin(normal)*wobble))];});
        const separated=fragments({...path,points,taper:true,bundle:true,structure:kind},q=>localContrast(image,q[0],q[1])<.19&&!nearFilament(q));
        if(separated.length)out.push(...separated);else if(kind==='fragment'&&!points.some(nearFilament))out.push({...path,points,taper:true,bundle:true,structure:kind});
        stats.brightGaps+=Math.max(0,separated.length-1);stats.bundles+=separated.length;stats[kind==='plane'?'planes':kind==='curve'?'curves':'fragments']+=separated.length;
        if(path.role==='hatch'&&dark>.78&&hash(pathIndex,start+19,seed)<.16){
          const a=angle+Math.PI*.24,n=a+Math.PI/2,l=length*.62,deep=points.map((q,i)=>{const t=i/(points.length-1)-.5;return[Math.max(24,Math.min(876,cx+Math.cos(a)*l*t+Math.cos(n)*(hash(i,start,seed)-.5)*.5)),Math.max(24,Math.min(636,cy+Math.sin(a)*l*t+Math.sin(n)*(hash(i,start,seed)-.5)*.5))];});
          for(const segment of fragments({...path,points:deep,width:path.width*.62,role:'cross',layer:3,bundle:true,structure:kind},q=>localContrast(image,q[0],q[1])<.19))out.push(segment);stats.deepLayer++;
        }
      }
    }return{paths:out,stats};
  }
  function microDetails(image,seed,params={}){
    const {width:w,height:h,pixels}=image,detail=params.detail??65,candidates=[],step=w>=450?2:1,scale1=blur(image,1).pixels,scale3=blur(image,3).pixels;
    const at=(a,x,y)=>a[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
    for(let y=2;y<h-2;y+=step)for(let x=2;x<w-2;x+=step){
      const gradient=a=>[(at(a,x+1,y-1)+2*at(a,x+1,y)+at(a,x+1,y+1)-at(a,x-1,y-1)-2*at(a,x-1,y)-at(a,x-1,y+1))/1020,(at(a,x-1,y+1)+2*at(a,x,y+1)+at(a,x+1,y+1)-at(a,x-1,y-1)-2*at(a,x,y-1)-at(a,x+1,y-1))/1020],g1=gradient(scale1),g3=gradient(scale3),m1=Math.hypot(...g1),m3=Math.hypot(...g3),alignment=m1*m3?Math.abs((g1[0]*g3[0]+g1[1]*g3[1])/(m1*m3)):0;
      const fine=Math.abs(at(pixels,x,y)*4-at(pixels,x-1,y)-at(pixels,x+1,y)-at(pixels,x,y-1)-at(pixels,x,y+1))/1020,persistence=Math.min(m1,m3)*(.35+.65*alignment),gridDistance=Math.min(x%8,8-x%8,y%8,8-y%8),gridPenalty=gridDistance<1.1&&m3<m1*.48?.45:1,score=(persistence*.95+fine*.18*alignment)*gridPenalty,gx=g1[0],gy=g1[1],threshold=.018+(100-detail)*.00032;
      if(score>threshold&&hash(x,y,seed)<Math.min(1,(score-threshold)*9+.08))candidates.push({x,y,gx,gy,score});
    }
    candidates.sort((a,b)=>b.score-a.score);const limit=1000+Math.round(detail*42),paths=[];
    for(const [i,q]of candidates.slice(0,limit).entries()){
      const x=q.x*900/w,y=q.y*660/h,a=Math.atan2(q.gy,q.gx)+Math.PI/2,length=2.5+detail*.055+Math.min(7,q.score*18),jitter=(hash(i,17,seed)-.5)*.35,n=a+Math.PI/2;
      const bound=([px,py])=>[Math.max(24,Math.min(876,px)),Math.max(24,Math.min(636,py))];
      paths.push({points:[bound([x-Math.cos(a)*length/2+Math.cos(n)*jitter,y-Math.sin(a)*length/2+Math.sin(n)*jitter]),bound([x,y]),bound([x+Math.cos(a)*length/2-Math.cos(n)*jitter,y+Math.sin(a)*length/2-Math.sin(n)*jitter])],width:.16+Math.min(.62,q.score*.9),role:'hatch',mark:'micro-detail',taper:true});
    }return paths;
  }
  function suppressNear(paths,references,radius=3.5){
    if(!references.length)return paths;const cell=Math.max(2,radius),grid=new Map(),add=q=>{const key=Math.floor(q[1]/cell)*1024+Math.floor(q[0]/cell);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(q);};for(const path of references)for(let i=1;i<path.points.length;i++){const a=path.points[i-1],b=path.points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(cell/2)));for(let k=0;k<=steps;k++)add([a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps]);}
    const near=q=>{const gx=Math.floor(q[0]/cell),gy=Math.floor(q[1]/cell);for(let y=gy-1;y<=gy+1;y++)for(let x=gx-1;x<=gx+1;x++){const bucket=grid.get(y*1024+x);if(bucket&&bucket.some(p=>(p[0]-q[0])**2+(p[1]-q[1])**2<radius*radius))return true;}return false;};
    return paths.filter(path=>!path.points.some(near));
  }
  function backgroundField(image,seed,params={}){
    const border=[];for(let x=0;x<900;x+=8){border.push(sample(image,x,25),sample(image,x,635));}for(let y=25;y<636;y+=8){border.push(sample(image,25,y),sample(image,875,y));}
    const mean=border.reduce((a,b)=>a+b,0)/border.length,variance=border.reduce((a,b)=>a+(b-mean)**2,0)/border.length;
    if(mean>244&&variance<100)return[];
    const angle=-.67+(hash(3,5,seed)-.5)*.14,spacing=12-(params.detail??65)*.045,paths=[];
    for(let offset=-620;offset<920;offset+=spacing){let points=[];const finish=()=>{if(points.length>4)paths.push({points,width:.22+Math.max(0,210-mean)*.0015,role:'hatch',mark:'background',taper:true});points=[];};
      for(let t=-80;t<1100;t+=4){const x=t,y=offset+Math.tan(angle)*t,v=sample(image,x,y),quiet=localContrast(image,x,y)<.09,similar=Math.abs(v-mean)<42;
        if(x>=25&&x<=875&&y>=25&&y<=635&&quiet&&similar&&v<248)points.push([x,y]);else finish();
      }finish();
    }return paths;
  }
  function darkMasses(image,seed,params={}){
    const paths=[];for(let y=28;y<634;y+=7)for(let x=28;x<874;x+=7){const dark=1-sample(image,x,y)/255;if(dark<.82||hash(x,y,seed)>(dark-.78)*1.35)continue;const a=regionAngle(image,x,y,false,seed)+((hash(y,x,seed)-.5)*.65),length=2.5+(dark-.82)*20;
      const point=t=>[Math.max(24,Math.min(876,x+Math.cos(a)*length*t)),Math.max(24,Math.min(636,y+Math.sin(a)*length*t))];
      paths.push({points:[point(-.5),point(.5)],width:.8+(dark-.82)*8,role:'hatch',mark:'dark-mass'});
    }return paths;
  }
  function imageMaze(image,seed){
    const rng=random(seed),paths=[],regions=[];
    // Adaptive tiles: subdivide dark or textured regions into finer local mazes.
    function tile(x,y,w,h,level){
      let sum=0,min=255,max=0;
      for(let j=0;j<5;j++)for(let i=0;i<5;i++){const v=sample(image,x+(i+.5)*w/5,y+(j+.5)*h/5);sum+=v;min=Math.min(min,v);max=Math.max(max,v);}
      const dark=1-sum/(25*255);
      if(level<2&&(dark>.45||max-min>80)){tile(x,y,w/2,h/2,level+1);tile(x+w/2,y,w/2,h/2,level+1);tile(x,y+h/2,w/2,h/2,level+1);tile(x+w/2,y+h/2,w/2,h/2,level+1);return;}
      if(dark<.08&&max-min<50)return;
      const cols=6,rows=6,n=36,passages=new Uint8Array(n),seen=new Uint8Array(n),tones=new Float32Array(n),edges=[];
      for(let i=0;i<n;i++)tones[i]=sample(image,x+(i%cols+.5)*w/cols,y+(Math.floor(i/cols)+.5)*h/rows)/255;
      const adjacent=i=>{const result=[];for(const [dx,dy,bit,back] of [[1,0,1,2],[-1,0,2,1],[0,1,4,8],[0,-1,8,4]]){const xx=i%cols+dx,yy=Math.floor(i/cols)+dy;if(xx>=0&&xx<cols&&yy>=0&&yy<rows){const j=yy*cols+xx;if(tones[j]<.92&&Math.abs(tones[j]-tones[i])<.18)result.push([j,bit,back]);}}return result;};
      for(let start=0;start<n;start++){
        if(seen[start]||tones[start]>.92)continue;seen[start]=1;const stack=[start];
        while(stack.length){const i=stack[stack.length-1],options=adjacent(i).filter(([j])=>!seen[j]);if(!options.length){stack.pop();continue;}const [j,bit,back]=options[Math.floor(rng()*options.length)];passages[i]|=bit;passages[j]|=back;seen[j]=1;edges.push([i,j]);stack.push(j);}
      }
      for(let i=0;i<n;i++)for(const [j,bit,back]of adjacent(i))if(j>i&&!(passages[i]&bit)&&rng()<tones[i]*.42){passages[i]|=bit;passages[j]|=back;edges.push([i,j]);}
      function wall(a,b,d){if(d<.08)return;paths.push({points:[a,b],width:.2+d*.65,role:'maze'});}
      for(let i=0;i<n;i++){
        const gx=i%cols,gy=Math.floor(i/cols),xx=x+gx*w/cols,yy=y+gy*h/rows,d=1-tones[i];
        if(!(passages[i]&1))wall([xx+w/cols,yy],[xx+w/cols,yy+h/rows],d);
        if(!(passages[i]&4))wall([xx,yy+h/rows],[xx+w/cols,yy+h/rows],d);
        if(gx===0)wall([xx,yy],[xx,yy+h/rows],d);if(gy===0)wall([xx,yy],[xx+w/cols,yy],d);
      }
      regions.push({tones:Array.from(tones),edges,cols,rows});
    }
    for(let y=30;y<630;y+=100)for(let x=30;x<870;x+=120)tile(x,y,120,100,0);
    return {paths,regions};
  }
  function fragments(path,predicate){
    const result=[];let points=[];
    function finish(){if(points.length>1)result.push({...path,points});points=[];}
    // Densify long maze edges so a small brush cannot be skipped.
    for(let i=1;i<path.points.length;i++){
      const a=path.points[i-1],b=path.points[i],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.5));
      for(let k=0;k<steps;k++){const q=[a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps];if(predicate(q))points.push(q);else finish();}
    }
    const end=path.points[path.points.length-1];if(predicate(end))points.push(end);finish();return result;
  }
  function touches(path,e){return path.points.some(q=>Math.hypot(q[0]-e.x,q[1]-e.y)<e.radius)||path.points.slice(1).some((b,i)=>{const a=path.points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((e.x-a[0])*dx+(e.y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(a[0]+t*dx-e.x,a[1]+t*dy-e.y)<e.radius;});}
  function applyEdits(base,edits=[]){
    let paths=base;
    for(const e of edits){
      const inside=q=>Math.hypot(q[0]-e.x,q[1]-e.y)<e.radius,next=[];
      for(const path of paths){
        if(!touches(path,e)){next.push(path);continue;}
        if(e.type==='white'||e.type==='protect'){next.push(...fragments(path,q=>!inside(q)));continue;}
        if(e.type==='direction'){
          const points=path.points.map(q=>{if(!inside(q))return q;const dx=q[0]-e.x,dy=q[1]-e.y,d=Math.hypot(dx,dy),blend=(1-d/e.radius)**2;
            const projection=dx*Math.cos(e.angle)+dy*Math.sin(e.angle);
            return [q[0]+(e.x+Math.cos(e.angle)*projection-q[0])*blend*.85,q[1]+(e.y+Math.sin(e.angle)*projection-q[1])*blend*.85];});
          next.push({...path,points});
        }else{
          next.push(path);for(const segment of fragments(path,inside))next.push({...segment,width:segment.width*.65,points:segment.points.map(q=>[e.x-(q[1]-e.y),e.y+(q[0]-e.x)]).filter(q=>q[0]>=0&&q[0]<=900&&q[1]>=0&&q[1]<=660)});
        }
      }
      if(e.type==='protect'&&e.frozen)next.push(...e.frozen);paths=next.filter(p=>p.points.length>1);
    }return paths;
  }
  function freeze(paths,e){return paths.filter(p=>touches(p,e)).flatMap(p=>fragments(p,q=>Math.hypot(q[0]-e.x,q[1]-e.y)<e.radius));}
  function generate(recipe,baseGenerate,progress=()=>{}){
    const p={...defaults,...recipe.pro},adjusted=toneImage(recipe.image,p),noiseLevel=noiseEstimate(adjusted),image=cleanImage(adjusted,p.cleanup,noiseLevel),structureImage=sketchStructure(image,p.sketch);progress(10,'明暗校正、净化与结构素描');
    const base=baseGenerate({...recipe,pro:undefined,image,seed:(recipe.seed^p.hatchSeed)>>>0}),sketchPaths=p.sketch>0?vectorizeSketch(structureImage,image):[];
    progress(55,'轮廓与排线');
    const budget=Math.max(1,(p.hatch+p.maze)/100);const paths=[],contourRandom=random(p.contourSeed);
    for(const path of base.paths){const isFilament=path.role==='filament',isContour=path.role==='contour';if(p.sketch>0&&isContour)continue;const weight=((isFilament||isContour)?p.contour:p.hatch/budget)/100*(path.role==='cross'?p.cross/100:1)*((isFilament||isContour)?.92+contourRandom()*.16:1);if(weight>0)paths.push({...path,width:path.width*weight});}
    for(const path of sketchPaths)paths.push({...path,width:path.width*p.contour/100});
    // Coarse contour scale fills structural gaps while fine edges retain small features.
    if(p.sketch===0&&p.contour>0&&recipe.image.width>=450){
      const coarseImage=blur(image,Math.max(1,Math.round(image.width/300))),coarse=baseGenerate({...recipe,pro:undefined,image:coarseImage,structureImage:sketchStructure(coarseImage,p.sketch),seed:(p.contourSeed^recipe.seed)>>>0,params:{...recipe.params,density:0,fidelity:100,detail:45}});
      for(const path of coarse.paths)if(path.role==='contour')paths.push({...path,width:path.width*p.contour/100*.35,role:'contour-coarse'});
    }
    const styleSeed=(recipe.seed^recipe.variation^p.hatchSeed)>>>0,grammar=engravingGrammar(paths,image,styleSeed,recipe.params),detailWeight=(p.hatch*.65+p.contour*.35)/100;
    const micro=suppressNear(microDetails(image,styleSeed^0x51f15e,recipe.params),grammar.paths.filter(path=>path.role==='filament'||path.preserve));for(const path of micro)grammar.paths.push({...path,width:path.width*detailWeight});
    const background=backgroundField(image,styleSeed^0xa11ce,recipe.params);for(const path of background)grammar.paths.push({...path,width:path.width*p.hatch/100});
    const masses=darkMasses(image,styleSeed^0xda4c,recipe.params);for(const path of masses)grammar.paths.push({...path,width:path.width*p.hatch/100});
    progress(75,'图片迷宫');let mazeRegions=0;
    if(p.maze>0){const maze=imageMaze(image,(p.mazeSeed^recipe.seed^recipe.variation)>>>0);mazeRegions=maze.regions.length;for(const path of maze.paths)grammar.paths.push({...path,width:path.width*p.maze/100/budget});}
    progress(90,'局部编辑');
    const edited=applyEdits(grammar.paths,p.edits);
    return {...base,paths:edited,recipe:clone(recipe),stats:{...base.stats,...grammar.stats,sketchPaths:sketchPaths.length,sketchMain:sketchPaths.filter(path=>path.level==='main').length,sketchStructure:sketchPaths.filter(path=>path.level==='structure').length,sketchDetails:sketchPaths.filter(path=>path.level==='detail').length,silhouettes:sketchPaths.filter(path=>path.semantic==='silhouette').length,occlusions:sketchPaths.filter(path=>path.semantic==='occlusion').length,formLines:sketchPaths.filter(path=>path.semantic==='form').length,textureLines:sketchPaths.filter(path=>path.semantic==='texture').length,microDetails:micro.length,background:background.length,darkMasses:masses.length,mazeRegions,noiseLevel,cleanupStrength:image.cleanupStrength,sketchStrength:structureImage.sketchStrength,flowLinked:structureImage.flowLinked||0,edits:(p.edits||[]).length,pro:true}};
  }
  const api={defaults,valid,value,toneImage,autoLevels,noiseEstimate,cleanImage,sketchStructure,vectorizeSketch,contourSemantic,imageMaze,structureKind,engravingGrammar,microDetails,suppressNear,backgroundField,darkMasses,generate,applyEdits,freeze,fragments};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhotoPro=api;
})(globalThis);
