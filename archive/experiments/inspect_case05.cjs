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
im = Image.open(r"E:\\Camer\\IMG_20240811_150336.jpg").convert("RGB")
w, h = im.size
target_w = 600
target_h = int(h * target_w / w)
im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
gray = im.convert("L")
pixels = list(gray.get_flattened_data()) if hasattr(gray, "get_flattened_data") else list(gray.getdata())
print(json.dumps({"width": target_w, "height": target_h, "pixels": pixels}))
`;

const tmpPy = path.join(__dirname, 'tmp_inspect05.py');
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

  console.log('Image dimensions:', imgData.width, 'x', imgData.height);
  console.log('Total vector contours:', vectorContours.length);

  // Check current hatching with default (ceramic)
  const hatchingOld = Stage4.runStage4(toneField, flowField, contourMask, {
    lineMap, vectorContours, hatch: 100, density: 50, cross: 50, materialType: 'ceramic'
  });
  console.log('Hatching count with materialType ceramic:', hatchingOld.length);

  // Check hatching if treated as architecture / garden
  const hatchingArch = Stage4.runStage4(toneField, flowField, contourMask, {
    lineMap, vectorContours, hatch: 100, density: 50, cross: 50, materialType: 'architecture', highlightCutoff: 0.35
  });
  console.log('Hatching count with materialType architecture:', hatchingArch.length);

  // Render both to inspect
  const outDir = path.join(__dirname, 'inspect_case05_layers');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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
with open(f"{out_dir}/hatch_ceramic.json") as f: render(json.load(f), "2_hatch_ceramic")
with open(f"{out_dir}/hatch_arch.json") as f: render(json.load(f), "3_hatch_arch")
`;

  fs.writeFileSync(path.join(outDir, 'contours.json'), JSON.stringify(vectorContours));
  fs.writeFileSync(path.join(outDir, 'hatch_ceramic.json'), JSON.stringify(hatchingOld));
  fs.writeFileSync(path.join(outDir, 'hatch_arch.json'), JSON.stringify(hatchingArch));

  fs.writeFileSync(path.join(outDir, 'render.py'), pyRender);
  execFileSync(pythonBin, [path.join(outDir, 'render.py')]);
  console.log('Rendered layers to', outDir);
}

inspect().catch(console.error);
