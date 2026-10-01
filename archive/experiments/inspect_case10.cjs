const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage3 = require('../src/core/stage3-contours.js');
const Stage4 = require('../src/core/stage4-hatching.js');
const Stage5 = require('../src/core/stage5-master-print.js');

const pythonBin = 'C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe';
const pyCode = `import sys, json
from PIL import Image
im = Image.open(r"E:\\Camer\\IMG_20240811_141854.jpg").convert("RGB")
w, h = im.size
target_w = 800
target_h = int(h * target_w / w)
im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
gray = im.convert("L")
pixels = list(gray.getdata())
print(json.dumps({"width": target_w, "height": target_h, "pixels": pixels}))
`;

const tmpPy = path.join(__dirname, 'tmp_inspect_load.py');
fs.writeFileSync(tmpPy, pyCode, 'utf8');
let imgData;
try {
  imgData = JSON.parse(execFileSync(pythonBin, [tmpPy], { maxBuffer: 100 * 1024 * 1024 }));
} finally {
  if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
}

async function inspect() {
  const lineMap = await Stage1.runStage1(imgData);
  const { toneField, flowField } = Stage2.runStage2(imgData, lineMap, { exposure: 50, detailBoost: 70 });
  const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, {
    contour: 85, highThreshold: 0.85, lowThreshold: 0.92, minPoints: 2
  });
  const hatching = Stage4.runStage4(toneField, flowField, contourMask, {
    lineMap, vectorContours, hatch: 100, density: 50, cross: 50, crossThreshold: 0.85, highlightCutoff: 0.22, materialType: 'architecture'
  });
  const master = Stage5.runStage5(vectorContours, hatching, toneField, flowField);

  console.log('--- Master paths breakdown ---');
  const roleCounts = {};
  const markCounts = {};
  for (const p of master.paths) {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
    markCounts[p.mark || 'none'] = (markCounts[p.mark || 'none'] || 0) + 1;
  }
  console.log('Roles:', roleCounts);
  console.log('Marks:', markCounts);

  console.log('\n--- Hatching paths breakdown ---');
  console.log('Total hatching paths:', hatching.length);
  const hMarks = {};
  for (const p of hatching) {
    hMarks[p.mark || 'streamline'] = (hMarks[p.mark || 'streamline'] || 0) + 1;
  }
  console.log('Hatching marks:', hMarks);

  // Analyze locations of streamline hatches vs micro-flicks
  const streamlines = hatching.filter(p => !p.mark || p.mark === 'streamline' || p.role === 'hatch' && p.mark !== 'micro-flick');
  const flicks = hatching.filter(p => p.mark === 'micro-flick');
  console.log('True streamlines:', streamlines.length, 'Micro-flicks:', flicks.length);

  // Where are the streamlines located vertically (y coordinate)?
  // Image height is:
  console.log('Image dimensions:', imgData.width, 'x', imgData.height);
  const yBuckets = [0, 0, 0, 0, 0]; // 5 vertical bands
  for (const p of streamlines) {
    const yAvg = p.points.reduce((sum, pt) => sum + pt[1], 0) / p.points.length;
    const b = Math.min(4, Math.floor((yAvg / imgData.height) * 5));
    yBuckets[b]++;
  }
  console.log('Streamline vertical distribution (Top -> Bottom across 5 zones):', yBuckets);

  // Render separate layers to inspect
  const outDir = path.join(__dirname, 'inspect_case10_layers');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'contours.json'), JSON.stringify(vectorContours));
  fs.writeFileSync(path.join(outDir, 'hatching.json'), JSON.stringify(hatching));
  fs.writeFileSync(path.join(outDir, 'master.json'), JSON.stringify(master.paths));

  const pyRender = `import json
from PIL import Image, ImageDraw

w, h = ${imgData.width}, ${imgData.height}
out_dir = r"${outDir}"

def render(paths, filename):
    im = Image.new("RGB", (w, h), (255, 255, 255))
    draw = ImageDraw.Draw(im)
    for p in paths:
        pts = [(pt[0], pt[1]) for pt in p.get("points", [])]
        if len(pts) >= 2:
            width = max(1, int(round((p.get("width", 0.3) or 0.3) * 1.5)))
            draw.line(pts, fill=(20, 20, 20), width=width)
    im.save(f"{out_dir}/{filename}.png")

with open(f"{out_dir}/contours.json") as f: render(json.load(f), "1_contours_only")
with open(f"{out_dir}/hatching.json") as f: render(json.load(f), "2_hatching_only")
with open(f"{out_dir}/master.json") as f: render(json.load(f), "3_full_master")
`;
  fs.writeFileSync(path.join(outDir, 'render.py'), pyRender);
  execFileSync(pythonBin, [path.join(outDir, 'render.py')]);
  console.log('Layer breakdown images rendered to', outDir);
}

inspect().catch(console.error);
