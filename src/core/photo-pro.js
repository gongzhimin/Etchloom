/* Photo refinement pipeline. No DOM; usable in a worker and in node tests. */
(function(root){
  'use strict';
  const defaults={exposure:50,blackPoint:0,whitePoint:100,shadows:20,contour:85,hatch:100,maze:0,cross:65,contourSeed:1,hatchSeed:1,mazeSeed:1,style:'engraving',curvature:75};
  const clone=x=>JSON.parse(JSON.stringify(x));
  function random(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
  function valid(pro){
    if(!pro||pro.version!==1)return false;
    for(const k of Object.keys(defaults)){
      if(k==='style'){const s=pro[k]??defaults[k];if(!['engraving','woodcut'].includes(s))return false;continue;}
      const v=pro[k]??defaults[k];if(!Number.isFinite(v)||v<0||v>(k.endsWith('Seed')?4294967295:100))return false;
    }
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
  function boxBlurFloat(src,w,h,r){
    const out=new Float32Array(w*h),integral=new Float64Array((w+1)*(h+1));
    for(let y=0;y<h;y++){let row=0,yw=y*w;for(let x=0;x<w;x++){row+=src[yw+x];integral[(y+1)*(w+1)+x+1]=integral[y*(w+1)+x+1]+row;}}
    for(let y=0;y<h;y++){const t=Math.max(0,y-r),b=Math.min(h,y+r+1);for(let x=0;x<w;x++){const l=Math.max(0,x-r),rt=Math.min(w,x+r+1);out[y*w+x]=(integral[b*(w+1)+rt]-integral[t*(w+1)+rt]-integral[b*(w+1)+l]+integral[t*(w+1)+l])/((rt-l)*(b-t));}}
    return out;
  }
  const tensorCache=new WeakMap();
  function computeTensorField(image){
    if(image&&typeof image==='object'&&tensorCache.has(image)){
      const cached=tensorCache.get(image);
      if(cached.width===image.width&&cached.height===image.height)return cached;
    }
    const {width:w,height:h}=image,n=w*h,smoothed=blur(image,Math.max(1,Math.round(w/300))).pixels;
    const jxx=new Float32Array(n),jxy=new Float32Array(n),jyy=new Float32Array(n);
    for(let y=1;y<h-1;y++){const yw=y*w;for(let x=1;x<w-1;x++){const i=yw+x,gx=(smoothed[i+1]-smoothed[i-1])*.5,gy=(smoothed[i+w]-smoothed[i-w])*.5;jxx[i]=gx*gx;jxy[i]=gx*gy;jyy[i]=gy*gy;}}
    const r=Math.max(2,Math.round(w/150)),sJxx=boxBlurFloat(jxx,w,h,r),sJxy=boxBlurFloat(jxy,w,h,r),sJyy=boxBlurFloat(jyy,w,h,r);
    const vx=new Float32Array(n),vy=new Float32Array(n),coherence=new Float32Array(n);
    for(let i=0;i<n;i++){
      const txx=sJxx[i],txy=sJxy[i],tyy=sJyy[i],diff=txx-tyy,trace=txx+tyy,det=txx*tyy-txy*txy;
      const disc=Math.max(0,trace*trace-4*det),coh=trace>.0001?Math.sqrt(disc)/(trace+.0001):0;coherence[i]=coh;
      const norm=Math.hypot(2*txy,diff);if(norm>.0001){vx[i]=-diff/norm*(.15+.85*coh);vy[i]=-2*txy/norm*(.15+.85*coh);}
    }
    let curVx=vx,curVy=vy;
    for(let pass=0;pass<2;pass++){
      const nVx=new Float32Array(n),nVy=new Float32Array(n);
      for(let y=1;y<h-1;y++){const yw=y*w;for(let x=1;x<w-1;x++){
        const i=yw+x,blend=1-coherence[i]*.75;
        const sx=curVx[i]+(curVx[i-1]+curVx[i+1]+curVx[i-w]+curVx[i+w])*.25*blend;
        const sy=curVy[i]+(curVy[i-1]+curVy[i+1]+curVy[i-w]+curVy[i+w])*.25*blend;
        const len=Math.hypot(sx,sy);if(len>.0001){nVx[i]=sx/len;nVy[i]=sy/len;}else{nVx[i]=Math.cos(-1.36);nVy[i]=Math.sin(-1.36);}
      }}curVx=nVx;curVy=nVy;
    }
    const field={width:w,height:h,vx:curVx,vy:curVy,coherence};
    if(image&&typeof image==='object')tensorCache.set(image,field);
    return field;
  }
  function sampleField(field,x,y){
    const w=field.width,h=field.height,px=Math.max(0,Math.min(w-1,(x*w/900)|0)),py=Math.max(0,Math.min(h-1,(y*h/660)|0)),i=py*w+px;
    return{vx:field.vx[i],vy:field.vy[i],coherence:field.coherence[i]};
  }
  function sample(image,x,y){return image.pixels[Math.min(image.height-1,Math.max(0,Math.floor(y*image.height/660)))*image.width+Math.min(image.width-1,Math.max(0,Math.floor(x*image.width/900)))];}
  function hash(x,y,seed){let n=(Math.imul((x|0)+101,374761393)^Math.imul((y|0)+47,668265263)^seed)>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return(n>>>0)/4294967295;}
  function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
  function regionAngle(image,x,y,cross,seed){
    const field=computeTensorField(image),{vx,vy,coherence}=sampleField(field,x,y),tensorAngle=.5*Math.atan2(vy,vx);
    const tileX=Math.floor(x/105),tileY=Math.floor(y/92),drift=(hash(tileX,tileY,seed)-.5)*.18*(1-coherence*.85);
    return tensorAngle+drift+(cross?Math.PI*.45:0);
  }
  function localContrast(image,x,y){let lo=255,hi=0;for(const [dx,dy]of [[-4,0],[4,0],[0,-4],[0,4],[0,0]]){const v=sample(image,x+dx,y+dy);lo=Math.min(lo,v);hi=Math.max(hi,v);}return(hi-lo)/255;}
  function structureKind(image,x,y){const contrast=localContrast(image,x,y);if(contrast<.045)return'plane';if(contrast>.24)return'fragment';return'curve';}
  function engravingGrammar(input,image,seed,params={}){
    if(params.style==='woodcut'){
      return {paths:input,stats:{bundles:input.length,lostContours:0,deepLayer:0,brightGaps:0,planes:input.length,curves:0,fragments:0}};
    }
    const out=[],stats={bundles:0,lostContours:0,deepLayer:0,brightGaps:0,planes:0,curves:0,fragments:0};
    for(let pathIndex=0;pathIndex<input.length;pathIndex++){
      const path=input[pathIndex];
      if(path.role==='contour'||path.role==='contour-coarse'){
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
        const separated=fragments({...path,points,taper:true,bundle:true,structure:kind},q=>localContrast(image,q[0],q[1])<.19);
        if(separated.length)out.push(...separated);else if(kind==='fragment')out.push({...path,points,taper:true,bundle:true,structure:kind});
        stats.brightGaps+=Math.max(0,separated.length-1);stats.bundles+=separated.length;stats[kind==='plane'?'planes':kind==='curve'?'curves':'fragments']+=separated.length;
        if(path.role==='hatch'&&dark>.78&&hash(pathIndex,start+19,seed)<.16){
          const a=angle+Math.PI*.24,n=a+Math.PI/2,l=length*.62,deep=points.map((q,i)=>{const t=i/(points.length-1)-.5;return[Math.max(24,Math.min(876,cx+Math.cos(a)*l*t+Math.cos(n)*(hash(i,start,seed)-.5)*.5)),Math.max(24,Math.min(636,cy+Math.sin(a)*l*t+Math.sin(n)*(hash(i,start,seed)-.5)*.5))];});
          for(const segment of fragments({...path,points:deep,width:path.width*.62,role:'cross',layer:3,bundle:true,structure:kind},q=>localContrast(image,q[0],q[1])<.19))out.push(segment);stats.deepLayer++;
        }
      }
    }return{paths:out,stats};
  }
  function microDetails(image,seed,params={}){
    const {width:w,height:h,pixels}=image,detail=params.detail??65,candidates=[],step=w>=450?2:1;
    const at=(x,y)=>pixels[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
    for(let y=2;y<h-2;y+=step)for(let x=2;x<w-2;x+=step){
      const gx=(at(x+1,y-1)+2*at(x+1,y)+at(x+1,y+1)-at(x-1,y-1)-2*at(x-1,y)-at(x-1,y+1))/1020;
      const gy=(at(x-1,y+1)+2*at(x,y+1)+at(x+1,y+1)-at(x-1,y-1)-2*at(x,y-1)-at(x+1,y-1))/1020;
      const fine=Math.abs(at(x,y)*4-at(x-1,y)-at(x+1,y)-at(x,y-1)-at(x,y+1))/1020,score=Math.hypot(gx,gy)*.8+fine*.75,threshold=.025+(100-detail)*.00045;
      if(score>threshold&&hash(x,y,seed)<Math.min(1,(score-threshold)*9+.08))candidates.push({x,y,gx,gy,score});
    }
    candidates.sort((a,b)=>b.score-a.score);const limit=1000+Math.round(detail*42),paths=[];
    for(const [i,q]of candidates.slice(0,limit).entries()){
      const x=q.x*900/w,y=q.y*660/h,a=Math.atan2(q.gy,q.gx)+Math.PI/2,length=2.5+detail*.055+Math.min(7,q.score*18),jitter=(hash(i,17,seed)-.5)*.35,n=a+Math.PI/2;
      const bound=([px,py])=>[Math.max(24,Math.min(876,px)),Math.max(24,Math.min(636,py))];
      paths.push({points:[bound([x-Math.cos(a)*length/2+Math.cos(n)*jitter,y-Math.sin(a)*length/2+Math.sin(n)*jitter]),bound([x,y]),bound([x+Math.cos(a)*length/2-Math.cos(n)*jitter,y+Math.sin(a)*length/2-Math.sin(n)*jitter])],width:.16+Math.min(.62,q.score*.9),role:'hatch',mark:'micro-detail',taper:true});
    }return paths;
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
    const p={...defaults,...recipe.pro},image=toneImage(recipe.image,p);progress(10,'明暗校正');
    const base=baseGenerate({...recipe,pro:undefined,image,seed:(recipe.seed^p.hatchSeed)>>>0});
    progress(55,'轮廓与排线');
    const budget=Math.max(1,(p.hatch+p.maze)/100);const paths=[],contourRandom=random(p.contourSeed);
    for(const path of base.paths){const isContour=path.role==='contour';const weight=(isContour?p.contour:p.hatch/budget)/100*(path.role==='cross'?p.cross/100:1)*(isContour?.92+contourRandom()*.16:1);if(weight>0)paths.push({...path,width:path.width*weight});}
    // Coarse contour scale fills structural gaps while fine edges retain small features.
    if(p.contour>0&&recipe.image.width>=450){
      const coarse=baseGenerate({...recipe,pro:undefined,image:blur(image,Math.max(1,Math.round(image.width/300))),seed:(p.contourSeed^recipe.seed)>>>0,params:{...recipe.params,density:0,fidelity:100,detail:45}});
      for(const path of coarse.paths)if(path.role==='contour')paths.push({...path,width:path.width*p.contour/100*.35,role:'contour-coarse'});
    }
    const styleSeed=(recipe.seed^recipe.variation^p.hatchSeed)>>>0,grammar=engravingGrammar(paths,image,styleSeed,recipe.params),detailWeight=(p.hatch*.65+p.contour*.35)/100;
    const isWoodcut=recipe.params?.style==='woodcut';
    const micro=isWoodcut?[]:microDetails(image,styleSeed^0x51f15e,recipe.params);for(const path of micro)grammar.paths.push({...path,width:path.width*detailWeight});
    const background=isWoodcut?[]:backgroundField(image,styleSeed^0xa11ce,recipe.params);for(const path of background)grammar.paths.push({...path,width:path.width*p.hatch/100});
    const masses=isWoodcut?[]:darkMasses(image,styleSeed^0xda4c,recipe.params);for(const path of masses)grammar.paths.push({...path,width:path.width*p.hatch/100});
    progress(75,'图片迷宫');let mazeRegions=0;
    if(p.maze>0){const maze=imageMaze(image,(p.mazeSeed^recipe.seed^recipe.variation)>>>0);mazeRegions=maze.regions.length;for(const path of maze.paths)grammar.paths.push({...path,width:path.width*p.maze/100/budget});}
    progress(90,'局部编辑');
    const edited=applyEdits(grammar.paths,p.edits);
    return {...base,paths:edited,recipe:clone(recipe),stats:{...base.stats,...grammar.stats,microDetails:micro.length,background:background.length,darkMasses:masses.length,mazeRegions,edits:(p.edits||[]).length,pro:true}};
  }
  const stageCache = new WeakMap();
  function computeStages(image, params = {}) {
    if (!image || !Array.isArray(image.pixels)) return null;
    const detail = params.detail ?? 65;
    if (stageCache.has(image)) {
      const cached = stageCache.get(image);
      if (cached && cached.detail === detail) return cached;
    }
    const { width: w, height: h, pixels } = image, n = w * h;
    const grayPixels = pixels;
    let tone = Float32Array.from(pixels, v => v / 255);
    const smoothPasses = Math.round((100 - detail) / 24);
    for (let pass = 0; pass < smoothPasses; pass++) {
      const next = tone.slice();
      for (let y = 1; y < h - 1; y++) {
        const yw = y * w;
        for (let x = 1; x < w - 1; x++) {
          const i = yw + x, c = tone[i];
          let sum = c * 4, weightSum = 4;
          for (const o of [-1, 1, -w, w]) {
            const val = tone[i + o], diff = Math.abs(val - c);
            const wEdge = diff < 0.12 ? 1 - diff * 5 : 0.05;
            sum += val * wEdge;
            weightSum += wEdge;
          }
          next[i] = sum / weightSum;
        }
      }
      tone = next;
    }
    const smoothPixels = new Uint8Array(n);
    for (let i = 0; i < n; i++) smoothPixels[i] = Math.round(tone[i] * 255);

    const field = computeTensorField(image);

    const edge = new Float32Array(n), normal = new Uint8Array(n);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = (tone[i + 1] - tone[i - 1]) * 0.5, gy = (tone[i + w] - tone[i - w]) * 0.5;
      edge[i] = Math.hypot(gx, gy);
      const a = (Math.atan2(gy, gx) * 180 / Math.PI + 180) % 180;
      normal[i] = a < 22.5 || a >= 157.5 ? 0 : a < 67.5 ? 1 : a < 112.5 ? 2 : 3;
    }
    const ridgePixels = new Uint8Array(n);
    const low = 0.012 + (100 - detail) * 0.0004, high = low * 2.2;
    const offsets = [1, w + 1, w, w - 1];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, o = offsets[normal[i]], e = edge[i];
      if (e > low && e >= edge[i - o] && e > edge[i + o]) {
        ridgePixels[i] = e > high ? 2 : 1;
      }
    }

    const stages = { width: w, height: h, detail, grayPixels, smoothPixels, tensorField: field, ridgePixels };
    stageCache.set(image, stages);
    return stages;
  }
  function renderStage(context, recipe, result, stageId = 'full', options = {}) {
    if (!context || !context.canvas) return;
    const canvas = context.canvas, w = canvas.width, h = canvas.height;
    const onionSkin = Math.max(0, Math.min(1, options.onionSkin || 0));
    const strokeScale = options.strokeScale || 1;
    const stages = recipe?.image ? computeStages(recipe.image, recipe.params) : null;
    const generator = (typeof module !== 'undefined' && module.exports) ? require('./generator.js') : root.PrintGenerator;

    function makeOffscreen(srcPixels, pw, ph, colorFn) {
      if (typeof document === 'undefined') return null;
      const off = document.createElement('canvas');
      off.width = pw; off.height = ph;
      const offCtx = off.getContext('2d');
      const im = offCtx.createImageData(pw, ph), d = im.data;
      for (let i = 0; i < srcPixels.length; i++) {
        const v = srcPixels[i];
        if (colorFn) {
          const [cr, cg, cb, ca] = colorFn(v, i);
          d[i * 4] = cr; d[i * 4 + 1] = cg; d[i * 4 + 2] = cb; d[i * 4 + 3] = ca;
        } else {
          d[i * 4] = Math.round(v * 0.96 + 8);
          d[i * 4 + 1] = Math.round(v * 0.93 + 6);
          d[i * 4 + 2] = Math.round(v * 0.86 + 4);
          d[i * 4 + 3] = 255;
        }
      }
      offCtx.putImageData(im, 0, 0);
      return off;
    }

    context.save();
    context.clearRect(0, 0, w, h);

    if (onionSkin > 0 && stages) {
      const baseOff = makeOffscreen(stages.grayPixels, stages.width, stages.height);
      if (baseOff) {
        context.save();
        context.globalAlpha = onionSkin;
        context.drawImage(baseOff, 0, 0, w, h);
        context.restore();
      }
    }

    const stageAlpha = onionSkin > 0 ? Math.max(0.25, 1.0 - onionSkin * 0.65) : 1.0;
    context.globalAlpha = stageAlpha;

    switch (stageId) {
      case 'gray': {
        if (stages) {
          const off = makeOffscreen(stages.grayPixels, stages.width, stages.height);
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'smooth': {
        if (stages) {
          const off = makeOffscreen(stages.smoothPixels, stages.width, stages.height);
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'tensor': {
        if (stages && stages.tensorField) {
          if (onionSkin === 0) {
            context.fillStyle = '#1c201c';
            context.fillRect(0, 0, w, h);
          }
          const field = stages.tensorField, fw = field.width, fh = field.height;
          const step = Math.max(10, Math.round(14 * (w / 900)));
          const lenBase = 8 * (w / 900);
          for (let y = step * 0.5; y < h; y += step) {
            for (let x = step * 0.5; x < w; x += step) {
              const px = Math.max(0, Math.min(fw - 1, (x * fw / w) | 0));
              const py = Math.max(0, Math.min(fh - 1, (y * fh / h) | 0));
              const idx = py * fw + px;
              const vx = field.vx[idx], vy = field.vy[idx], coh = field.coherence[idx];
              if (coh < 0.035) continue;
              const angle = 0.5 * Math.atan2(vy, vx);
              const curLen = (lenBase + coh * 14 * (w / 900)) * (0.8 + coh * 0.5);
              const dx = Math.cos(angle) * curLen * 0.5, dy = Math.sin(angle) * curLen * 0.5;
              context.beginPath();
              context.moveTo(x - dx, y - dy);
              context.lineTo(x + dx, y + dy);
              if (coh > 0.45) {
                context.strokeStyle = `rgba(243, 198, 35, ${Math.min(1, 0.45 + coh * 0.55)})`;
                context.lineWidth = Math.max(1.0, 1.8 * (w / 900));
              } else if (coh > 0.18) {
                context.strokeStyle = `rgba(214, 180, 85, ${0.35 + coh * 0.5})`;
                context.lineWidth = Math.max(0.8, 1.3 * (w / 900));
              } else {
                context.strokeStyle = `rgba(145, 160, 138, ${0.25 + coh * 0.4})`;
                context.lineWidth = Math.max(0.6, 0.9 * (w / 900));
              }
              context.stroke();
            }
          }
        }
        break;
      }
      case 'ridge': {
        if (stages) {
          if (onionSkin === 0) {
            context.fillStyle = '#181b19';
            context.fillRect(0, 0, w, h);
          }
          const off = makeOffscreen(stages.ridgePixels, stages.width, stages.height, v => {
            if (v === 2) return [245, 215, 110, 255];
            if (v === 1) return [231, 76, 60, 230];
            return [0, 0, 0, 0];
          });
          if (off) context.drawImage(off, 0, 0, w, h);
        }
        break;
      }
      case 'contour': {
        const contourPaths = (result?.paths || []).filter(p => p.role === 'contour' || p.role === 'contour-coarse');
        generator.draw(context, { paths: contourPaths }, onionSkin === 0, strokeScale);
        break;
      }
      case 'hatch': {
        const hatchPaths = (result?.paths || []).filter(p => (p.role === 'hatch' && p.mark !== 'micro-detail') || p.role === 'cross');
        generator.draw(context, { paths: hatchPaths }, onionSkin === 0, strokeScale);
        break;
      }
      case 'full':
      default: {
        generator.draw(context, result, onionSkin === 0, strokeScale);
        break;
      }
    }
    context.restore();
  }
  const api={defaults,valid,value,toneImage,autoLevels,imageMaze,structureKind,engravingGrammar,microDetails,backgroundField,darkMasses,generate,applyEdits,freeze,fragments,computeTensorField,sampleField,regionAngle,computeStages,renderStage};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhotoPro=api;
})(globalThis);

