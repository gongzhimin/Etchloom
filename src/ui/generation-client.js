'use strict';
class GenerationClient{
  constructor(onProgress){this.onProgress=onProgress;this.serial=0;this.worker=null;this.pending=null;this.timer=null;}
  cancel(){
    this.serial++;if(this.worker)this.worker.terminate();this.worker=null;if(this.timer)clearTimeout(this.timer);this.timer=null;
    if(this.pending){this.pending.reject(new DOMException('已取消生成','AbortError'));this.pending=null;}
  }
  async run(recipes){
    this.cancel();const id=this.serial;
    // Workers run from the local HTTP origin; no image data leaves the device.
    const url=new URL('src/workers/generation-worker.js',document.baseURI);
    if(url.protocol==='file:')return new Promise((resolve,reject)=>{
      this.pending={resolve,reject};const started=performance.now(),results=[];let index=0;
      const step=()=>{if(id!==this.serial)return;try{
        if(index>=recipes.length){const sourceBytes=recipes.reduce((sum,r)=>sum+(r.image?r.image.pixels.length*8:0),0),pointBytes=results.reduce((sum,r)=>sum+r.paths.reduce((s,p)=>s+p.points.length*32,0),0);this.pending=null;this.timer=null;resolve({id,type:'result',results,elapsed:performance.now()-started,estimatedBytes:sourceBytes*5+pointBytes*2});return;}
        this.onProgress?.(Math.round(index/recipes.length*100),`生成 ${index+1} / ${recipes.length}`);globalThis.generationProgress=(value,label)=>this.onProgress?.(Math.round((index+value/100)/recipes.length*100),label);const result=PrintGenerator.generate(recipes[index]);delete result.recipe;results.push(result);index++;this.timer=setTimeout(step,0);
      }catch(error){this.pending=null;this.timer=null;reject(error);}};
      this.timer=setTimeout(step,0);
    });
    this.worker=new Worker(url);
    return new Promise((resolve,reject)=>{
      this.pending={resolve,reject};
      this.worker.onmessage=event=>{
        const data=event.data;if(data.id!==this.serial)return;
        if(data.type==='progress'){this.onProgress?.(data.value,data.label);return;}
        this.worker.terminate();this.worker=null;this.pending=null;
        if(data.type==='error')reject(new Error(data.message));else resolve(data);
      };
      this.worker.onerror=()=>{this.worker?.terminate();this.worker=null;this.pending=null;reject(new Error('后台生成无法启动，请用本地预览地址打开（npm start）。'));};
      this.worker.postMessage({id,recipes});
    });
  }
}
window.GenerationClient=GenerationClient;
