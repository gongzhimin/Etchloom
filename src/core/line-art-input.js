/* Convert a monochrome model output into printable plate strokes without restyling it. */
(function(root){
  'use strict';
  function generate(image,options={}){
    const {width:w,height:h,pixels}=image,threshold=options.threshold??238,minInk=options.minInk??.07,paths=[],sx=900/w,sy=660/h;
    for(let y=0;y<h;y++){
      let start=-1,sum=0,count=0;
      const finish=x=>{if(start<0)return;const mean=sum/count,ink=Math.max(minInk,Math.min(1,(255-mean)/255));paths.push({points:[[start*sx,(y+.5)*sy],[Math.max(start+1,x)*sx,(y+.5)*sy]],width:Math.max(.18,sy*(.26+.74*ink)),role:'line-art',mark:'model-output',preserve:true});start=-1;sum=0;count=0;};
      for(let x=0;x<=w;x++){const value=x<w?pixels[y*w+x]:255;if(value<threshold){if(start<0)start=x;sum+=value;count++;}else finish(x);}
    }
    return{paths,layout:{width:w,height:h},stats:{algorithm:'line-art-direct',sourceRuns:paths.length,threshold}};
  }
  const api={generate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LineArtInput=api;
})(globalThis);
