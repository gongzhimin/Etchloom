// Reproducible synthetic benchmark. Run separately from the browser.
const fs=require('node:fs'),path=require('node:path'),G=require('../src/core/generator'),P=require('../src/core/photo-pro');
const image={width:900,height:660,pixels:Array.from({length:900*660},(_,i)=>{const x=i%900,y=Math.floor(i/900);return x>300&&x<570&&y>140&&y<550?Math.round(35+165*(x-300)/270):255;})};
const r={version:1,mode:'photo',seed:77,layoutSeed:77,variation:0,params:{...G.defaults,detail:90,density:72,fidelity:90,randomness:18},image,pro:{version:1,...P.defaults,maze:45}};
const started=performance.now(),result=G.generate(r);
const report={fixture:'synthetic gradient vessel; not a user photograph',node:process.version,analysis:[900,660],seed:77,paths:result.paths.length,layers:{bundles:result.stats.bundles,microDetails:result.stats.microDetails,background:result.stats.background,darkMasses:result.stats.darkMasses,brightGaps:result.stats.brightGaps},elapsedMs:Math.round(performance.now()-started),processPeakRSSMiB:Number((process.resourceUsage().maxRSS/1024).toFixed(1)),note:'Node process peak RSS; not browser memory. Browser UI reports a working-set estimate.'};
fs.writeFileSync(path.join(__dirname,'..','BENCHMARK.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
