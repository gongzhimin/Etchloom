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

  const tmpPy = path.join(__dirname, 'tmp_load2.py');
  fs.writeFileSync(tmpPy, pyCode, 'utf8');
  try {
    const out = execFileSync(pythonBin, [tmpPy], { maxBuffer: 100 * 1024 * 1024 });
    return JSON.parse(out.toString());
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
}

async function runTestOn(fileName) {
  const fullPath = path.join('E:\\Camer', fileName);
  if (!fs.existsSync(fullPath)) return;
  console.log(`\n========================================`);
  console.log(`[Testing] ${fileName}`);
  const img = loadImageViaPython(fullPath, 900);
  console.log(`Resolution: ${img.width}x${img.height}`);

  const t0 = Date.now();
  const lineMap = await Stage1.runStage1(img);
  const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50, detailBoost: 70 });
  const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, { contour: 85 });
  const hatching = Stage4.runStage4(toneField, flowField, contourMask, { hatch: 100, density: 60, cross: 65 });
  const master = Stage5.runStage5(vectorContours, hatching, toneField, flowField);

  let highCoh = 0;
  for (let i = 0; i < flowField.coherence.length; i++) {
    if (flowField.coherence[i] > 0.2) highCoh++;
  }

  const microFlicks = hatching.filter(p => p.mark === 'micro-flick').length;
  const regularHatch = hatching.filter(p => p.role === 'hatch' && p.mark !== 'micro-flick').length;
  const crosses = hatching.filter(p => p.role === 'cross').length;

  console.log(`Elapsed: ${Date.now() - t0}ms`);
  console.log(`Coherent Structure Ratio (>0.2): ${(highCoh / flowField.coherence.length * 100).toFixed(1)}%`);
  console.log(`Contours: ${vectorContours.length}`);
  console.log(`Regular Hatching Streamlines: ${regularHatch}`);
  console.log(`Micro-Engraving Texture Flicks: ${microFlicks}`);
  console.log(`Cross Hatchings: ${crosses}`);
  console.log(`Total Master Paths: ${master.stats.totalPaths}`);
}

async function main() {
  const camerDir = 'E:\\Camer';
  const files = fs.readdirSync(camerDir).filter(f => f.endsWith('.jpg')).slice(0, 3);
  for (const f of files) {
    await runTestOn(f);
  }
}

main().catch(console.error);
