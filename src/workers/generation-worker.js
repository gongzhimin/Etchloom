'use strict';
importScripts('../core/photo-pro.js','../core/generator.js');
self.onmessage=event=>{
  const {id,recipes}=event.data;
  try{
    const started=performance.now(),results=[];
    recipes.forEach((recipe,index)=>{
      self.generationProgress=(value,label)=>self.postMessage({id,type:'progress',value:Math.round((index+value/100)/recipes.length*100),label});
      self.postMessage({id,type:'progress',value:Math.round(index/recipes.length*100),label:`生成 ${index+1} / ${recipes.length}`});
      const result=PrintGenerator.generate(recipe);delete result.recipe;results.push(result);
    });
    // Accounted working-set estimate, not a browser process peak measurement.
    const sourceBytes=recipes.reduce((sum,r)=>sum+(r.image?r.image.pixels.length*8:0),0);
    const pointBytes=results.reduce((sum,r)=>sum+r.paths.reduce((s,p)=>s+p.points.length*32,0),0);
    self.postMessage({id,type:'result',results,elapsed:performance.now()-started,estimatedBytes:sourceBytes*5+pointBytes*2});
  }catch(error){self.postMessage({id,type:'error',message:error.message});}
};
