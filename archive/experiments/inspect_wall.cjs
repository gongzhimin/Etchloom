const { execFileSync } = require('child_process');
const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage4 = require('../src/core/stage4-hatching.js');

const py = `from PIL import Image
import json
im = Image.open(r"E:\\Camer\\IMG_20240811_141854.jpg").convert("L").resize((800, 600))
print(json.dumps({"width": 800, "height": 600, "pixels": list(im.getdata())}))
`;
const imgData = JSON.parse(execFileSync('C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe', ['-c', py], { maxBuffer: 50 * 1024 * 1024 }));

async function check() {
  const lineMap = await Stage1.runStage1(imgData);
  const { toneField } = Stage2.runStage2(imgData, lineMap, { exposure: 50 });
  
  // Check the wall on the right: x: 600..750, y: 300..450
  let sumTone = 0, sumLine = 0, count = 0;
  for (let y = 300; y < 450; y++) {
    for (let x = 600; x < 750; x++) {
      const idx = y * 800 + x;
      sumTone += toneField.tone[idx];
      sumLine += lineMap.data[idx];
      count++;
    }
  }
  console.log('Right wall region (x: 600..750, y: 300..450):');
  console.log('Avg raw tone (0=white, 1=black):', (sumTone / count).toFixed(3));
  console.log('Avg lineMap data (0=line, 1=white):', (sumLine / count).toFixed(3));

  // Check the courtyard / steps (x: 300..500, y: 450..580)
  sumTone = 0; count = 0;
  for (let y = 450; y < 580; y++) {
    for (let x = 300; x < 500; x++) {
      const idx = y * 800 + x;
      sumTone += toneField.tone[idx];
      count++;
    }
  }
  console.log('\nCourtyard/steps region (x: 300..500, y: 450..580):');
  console.log('Avg raw tone (0=white, 1=black):', (sumTone / count).toFixed(3));
}
check().catch(console.error);
