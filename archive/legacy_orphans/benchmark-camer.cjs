const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage3 = require('../src/core/stage3-contours.js');
const Stage4 = require('../src/core/stage4-hatching.js');
const Stage5 = require('../src/core/stage5-master-print.js');

function loadImageViaPython(imagePath, targetWidth = 900) {
  const pythonBin = 'C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe';
  const pyCode = [
    'import sys, json',
    'from PIL import Image',
    `im = Image.open(r"""${imagePath}""").convert("RGB")`,
    'w, h = im.size',
    `target_w = ${targetWidth}`,
    'target_h = int(h * target_w / w)',
    'im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)',
    'gray = im.convert("L")',
    'pixels = list(gray.getdata())',
    'print(json.dumps({"width": target_w, "height": target_h, "pixels": pixels}))'
  ].join('\n');

  const tmpPy = path.join(__dirname, 'tmp_load.py');
  fs.writeFileSync(tmpPy, pyCode, 'utf8');
  try {
    const out = execFileSync(pythonBin, [tmpPy], { maxBuffer: 100 * 1024 * 1024 });
    return JSON.parse(out.toString());
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
}

async function benchmark() {
  const photoPath = 'E:\\Camer\\IMG_20240618_084155.jpg';
  console.log(`[Benchmark] Loading photo: ${photoPath}...`);
  const img = loadImageViaPython(photoPath, 900);
  console.log(`[Benchmark] Loaded: ${img.width}x${img.height} (${img.pixels.length} pixels)`);

  const t0 = Date.now();
  console.log(`[Stage 1] LineMap extraction...`);
  const lineMap = await Stage1.runStage1(img);

  console.log(`[Stage 2] Tone & Flow Field computation...`);
  const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50 });

  let sumCoh = 0, highCoh = 0;
  for (let i = 0; i < flowField.coherence.length; i++) {
    sumCoh += flowField.coherence[i];
    if (flowField.coherence[i] > 0.4) highCoh++;
  }
  console.log(`[Stage 2 Stats] Avg Coherence: ${(sumCoh / flowField.coherence.length).toFixed(4)}, High Coherence Ratio: ${(highCoh / flowField.coherence.length * 100).toFixed(2)}%`);

  console.log(`[Stage 3] Vector Contours...`);
  const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, { contour: 85 });
  console.log(`[Stage 3 Stats] Contours: ${vectorContours.length}`);

  console.log(`[Stage 4] Hatching Mesh...`);
  const hatching = Stage4.runStage4(toneField, flowField, contourMask, { hatch: 100, density: 50, cross: 60 });
  console.log(`[Stage 4 Stats] Hatching paths generated: ${hatching.length}`);

  console.log(`[Stage 5] Master Print assembly...`);
  const master = Stage5.runStage5(vectorContours, hatching, toneField, flowField);
  console.log(`[Stage 5 Stats] Total paths: ${master.stats.totalPaths} in ${Date.now() - t0}ms`);
}

benchmark().catch(err => {
  console.error(err);
  process.exit(1);
});
