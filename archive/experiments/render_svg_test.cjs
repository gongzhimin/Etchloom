const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage3 = require('../src/core/stage3-contours.js');
const Stage4 = require('../src/core/stage4-hatching.js');
const Stage5 = require('../src/core/stage5-master-print.js');
const HatchOptimizer = require('../src/core/hatching/hatch-optimizer.js');

function loadImageViaPython(imagePath, targetWidth = 800) {
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
    'pixels = list(gray.get_flattened_data()) if hasattr(gray, "get_flattened_data") else list(gray.getdata())',
    'print(json.dumps({"width": target_w, "height": target_h, "pixels": pixels}))'
  ].join('\n');

  const tmpPy = path.join(__dirname, 'tmp_render.py');
  fs.writeFileSync(tmpPy, pyCode, 'utf8');
  try {
    const out = execFileSync(pythonBin, [tmpPy], { maxBuffer: 100 * 1024 * 1024 });
    return JSON.parse(out.toString());
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
}

async function renderAll() {
  const tests = [
    { name: 'cat', file: 'cat.jpg', cutoff: 0.22 },
    { name: 'flower', file: 'flower.jpg', cutoff: 0.18 },
    { name: 'vase', file: 'vase.jpg', cutoff: 0.18 }
  ];

  for (const t of tests) {
    const inputPath = path.join(__dirname, 'stroke_patches_tests', 'input', t.file);
    const img = loadImageViaPython(inputPath, 800);
    console.log(`\nRendering ${t.name}: ${img.width}x${img.height}`);

    const lineMap = await Stage1.runStage1(img);
    console.log(`[Stage 1] LineMap source: ${lineMap.source}`);
    const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50, detailBoost: 70 });
    const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, { contour: 85, contourThreshold: 0.65 });
    const hatching = Stage4.runStage4(toneField, flowField, contourMask, { lineMap, hatch: 100, density: 55, cross: 60, highlightCutoff: t.cutoff });
    const master = Stage5.runStage5(vectorContours, hatching, toneField, flowField);

    const svg = HatchOptimizer.exportToSVG(master.paths, img.width, img.height, { strokeScale: 1.2 });
    fs.writeFileSync(path.join(__dirname, `${t.name}_vector_hatch.svg`), svg, 'utf8');

    // Draw to PNG
    const pyDraw = [
      'import sys, json',
      'from PIL import Image, ImageDraw',
      `paths_json = r"""${path.join(__dirname, `${t.name}_paths.json`)}"""`,
      `w, h = ${img.width}, ${img.height}`,
      'im = Image.new("RGB", (w, h), (255, 255, 255))',
      'draw = ImageDraw.Draw(im)',
      'with open(paths_json, "r", encoding="utf-8") as f:',
      '    paths = json.load(f)',
      'for p in paths:',
      '    pts = [(pt[0], pt[1]) for pt in p.get("points", [])]',
      '    if len(pts) >= 2:',
      '        w_line = max(1, int(round((p.get("width", 0.3) or 0.3) * 1.5)))',
      '        draw.line(pts, fill=(25, 25, 25), width=w_line)',
      `out_png = r"""${path.join(__dirname, `${t.name}_vector_hatch.png`)}"""`,
      'im.save(out_png, quality=95)',
      'print("Saved:", out_png)'
    ].join('\n');

    const pathsJson = path.join(__dirname, `${t.name}_paths.json`);
    fs.writeFileSync(pathsJson, JSON.stringify(master.paths), 'utf8');
    const tmpDrawPy = path.join(__dirname, 'tmp_draw.py');
    fs.writeFileSync(tmpDrawPy, pyDraw, 'utf8');
    try {
      const pythonBin = 'C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe';
      execFileSync(pythonBin, [tmpDrawPy], { stdio: 'inherit' });
    } finally {
      if (fs.existsSync(tmpDrawPy)) fs.unlinkSync(tmpDrawPy);
      if (fs.existsSync(pathsJson)) fs.unlinkSync(pathsJson);
    }
  }
}

renderAll().catch(console.error);
