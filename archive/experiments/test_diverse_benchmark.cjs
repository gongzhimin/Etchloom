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

  const tmpPy = path.join(__dirname, 'tmp_bench_load.py');
  fs.writeFileSync(tmpPy, pyCode, 'utf8');
  try {
    const out = execFileSync(pythonBin, [tmpPy], { maxBuffer: 100 * 1024 * 1024 });
    return JSON.parse(out.toString());
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
}

async function runBenchmark() {
  const samples = [
    { name: '1_cat', file: path.join(__dirname, 'stroke_patches_tests/input/cat.jpg'), desc: '室内宠物猫 (毛发/地板/箱子)' },
    { name: '2_flower', file: path.join(__dirname, 'stroke_patches_tests/input/flower.jpg'), desc: '微距花卉 (花瓣/密集叶片)' },
    { name: '3_vase', file: path.join(__dirname, 'stroke_patches_tests/input/vase.jpg'), desc: '室内静物 (玻璃纸文字/反光/键盘)' },
    { name: '4_graduate', file: 'E:\\Camer\\IMG_20240623_131218.jpg', desc: '户外人物肖像 (学士服/五官/背景树木标牌)' },
    { name: '5_pot_hand', file: 'E:\\Camer\\IMG_20240618_084155.jpg', desc: '近景手持陶罐 (手部皮肤/陶罐肌理/背景杂物)' },
    { name: '6_architecture', file: 'E:\\Camer\\IMG_20240811_144154.jpg', desc: '古建园林 (飞檐脊兽/白墙/云层天空)' }
  ];

  const results = [];
  const outDir = path.join(__dirname, 'diverse_bench_outputs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const s of samples) {
    console.log(`\n========================================`);
    console.log(`[Processing] ${s.name}: ${s.desc}`);
    const t0 = Date.now();
    const img = loadImageViaPython(s.file, 800);

    const lineMap = await Stage1.runStage1(img);
    const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50, detailBoost: 70 });
    const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, { contour: 85, contourThreshold: 0.65 });
    const hatching = Stage4.runStage4(toneField, flowField, contourMask, { lineMap, hatch: 100, density: 55, cross: 60, highlightCutoff: 0.18 });
    const master = Stage5.runStage5(vectorContours, hatching, toneField, flowField);

    const elapsed = Date.now() - t0;

    // Rasterize to compute coverage statistics
    const raster = new Uint8Array(img.width * img.height);
    for (const p of master.paths) {
      if (!p.points) continue;
      for (const pt of p.points) {
        const x = Math.floor(pt[0]), y = Math.floor(pt[1]);
        if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
          raster[y * img.width + x] = 1;
        }
      }
    }

    let inkPixels = 0;
    for (let i = 0; i < raster.length; i++) if (raster[i]) inkPixels++;

    const coverage = (inkPixels / raster.length) * 100;
    const regularHatch = hatching.filter(p => p.role === 'hatch').length;
    const crossHatch = hatching.filter(p => p.role === 'cross').length;

    console.log(`Elapsed: ${elapsed}ms | Contours: ${vectorContours.length} | Hatch: ${regularHatch} | Cross: ${crossHatch} | Total: ${master.paths.length}`);
    console.log(`Pixel Coverage: ${coverage.toFixed(1)}% | LineMap Source: ${lineMap.source}`);

    // Export PNG
    const outPng = path.join(outDir, `${s.name}.png`);
    const pathsJson = path.join(outDir, `${s.name}_paths.json`);
    fs.writeFileSync(pathsJson, JSON.stringify(master.paths), 'utf8');

    const pyDraw = [
      'import sys, json',
      'from PIL import Image, ImageDraw',
      `paths_json = r"""${pathsJson}"""`,
      `w, h = ${img.width}, ${img.height}`,
      'im = Image.new("RGB", (w, h), (255, 255, 255))',
      'draw = ImageDraw.Draw(im)',
      'with open(paths_json, "r", encoding="utf-8") as f:',
      '    paths = json.load(f)',
      'for p in paths:',
      '    pts = [(pt[0], pt[1]) for pt in p.get("points", [])]',
      '    if len(pts) >= 2:',
      '        w_line = max(1, int(round((p.get("width", 0.3) or 0.3) * 1.5)))',
      '        draw.line(pts, fill=(20, 20, 20), width=w_line)',
      `out_png = r"""${outPng}"""`,
      'im.save(out_png, quality=95)'
    ].join('\n');

    const tmpDrawPy = path.join(outDir, `tmp_draw_${s.name}.py`);
    fs.writeFileSync(tmpDrawPy, pyDraw, 'utf8');
    try {
      execFileSync('C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe', [tmpDrawPy]);
    } finally {
      if (fs.existsSync(tmpDrawPy)) fs.unlinkSync(tmpDrawPy);
      if (fs.existsSync(pathsJson)) fs.unlinkSync(pathsJson);
    }

    results.push({
      name: s.name,
      desc: s.desc,
      paths: master.paths.length,
      contours: vectorContours.length,
      hatch: regularHatch,
      cross: crossHatch,
      coverage: coverage.toFixed(1) + '%'
    });
  }

  console.log(`\n========================================`);
  console.log(`[Summary Benchmark Statistics]`);
  console.table(results);
}

runBenchmark().catch(console.error);
