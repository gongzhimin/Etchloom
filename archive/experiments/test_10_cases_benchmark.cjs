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

const ARTIFACT_DIR = 'C:\\Users\\Jimin\\.gemini\\antigravity\\brain\\1be7113c-16fa-48fb-b3f3-09ea3fa01d81';

async function runBenchmark() {
  const samples = [
    { name: 'case01_cat', file: 'E:\\Camer\\IMG_20240728_193807.jpg', desc: '波斯猫特写肖像 (微观毛发/五官结构/纯净留白)' },
    { name: 'case02_stupa', file: 'E:\\Camer\\IMG_20240623_075608.jpg', desc: '古塔佛塔建筑 (层叠飞檐/砖石雕琢/天空退避)' },
    { name: 'case03_lake', file: 'E:\\Camer\\IMG_20240803_163120.jpg', desc: '湖畔自然山水 (水面波光/远山林木/纸白呼吸)' },
    { name: 'case04_bell', file: 'E:\\Camer\\IMG_20240622_070432.jpg', desc: '钟楼阁顶立面 (坡屋顶排线/几何挺拔/明暗交界)' },
    { name: 'case05_pot', file: 'E:\\Camer\\IMG_20240811_150336.jpg', desc: '园林深檐芭蕉 (深檐飞挑/芭蕉舒展/纸白空灵)' },
    { name: 'case06_wing', file: 'E:\\Camer\\IMG_20240720_085724.jpg', desc: '高空机翼与云海 (机械金属曲面/云层翻腾光影)' },
    { name: 'case07_teddy', file: 'E:\\Camer\\IMG_20240728_220404.jpg', desc: '毛绒玩偶静物 (织物绒毛/软体褶皱/暗调衬托)' },
    { name: 'case08_plate', file: 'E:\\Camer\\IMG_20240730_080825.jpg', desc: '餐盘美食静物 (陶瓷圆盘高光受光/食材细节)' },
    { name: 'case09_cabinet', file: 'E:\\Camer\\IMG_20240803_180300.jpg', desc: '博古架橱柜内景 (实木平直边框/器物空间进深)' },
    { name: 'case10_temple', file: 'E:\\Camer\\IMG_20240811_141854.jpg', desc: '古刹殿宇建筑 (斗拱挑檐/雕梁画栋/台阶阴影)' }
  ];

  const results = [];
  const outDir = path.join(__dirname, 'ten_cases_outputs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const s of samples) {
    console.log(`\n========================================`);
    console.log(`[Processing] ${s.name}: ${s.desc}`);
    const t0 = Date.now();
    const img = loadImageViaPython(s.file, 800);

    const lineMap = await Stage1.runStage1(img);
    const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50, detailBoost: 70 });
    const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, {
      contour: 85,
      highThreshold: 0.85,
      lowThreshold: 0.92,
      minPoints: 2
    });
    const hatching = Stage4.runStage4(toneField, flowField, contourMask, {
      lineMap,
      vectorContours,
      hatch: 100,
      density: 50,
      cross: 50,
      crossThreshold: 0.85,
      highlightCutoff: 0.22
    });
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

    // 1. Export standard SVG vector graphic
    const svgContent = HatchOptimizer.exportToSVG(master.paths, img.width, img.height);
    fs.writeFileSync(path.join(outDir, `${s.name}_vector.svg`), svgContent, 'utf8');
    fs.writeFileSync(path.join(ARTIFACT_DIR, `${s.name}_vector.svg`), svgContent, 'utf8');

    // Export raster images for UI preview: Original, Informative Drawings, Printmaking
    const pathsJson = path.join(outDir, `${s.name}_paths.json`);
    fs.writeFileSync(pathsJson, JSON.stringify(master.paths), 'utf8');

    const lineMapJson = path.join(outDir, `${s.name}_line.json`);
    fs.writeFileSync(lineMapJson, JSON.stringify(Array.from(lineMap.data)), 'utf8');

    const pyDraw = [
      'import sys, json',
      'from PIL import Image, ImageDraw',
      `paths_json = r"""${pathsJson}"""`,
      `line_json = r"""${lineMapJson}"""`,
      `src_file = r"""${s.file}"""`,
      `w, h = ${img.width}, ${img.height}`,
      `out_dir = r"""${outDir}"""`,
      `art_dir = r"""${ARTIFACT_DIR}"""`,
      `name = r"""${s.name}"""`,
      '',
      '# 1. Save original scaled image',
      'orig_im = Image.open(src_file).convert("RGB").resize((w, h), Image.Resampling.LANCZOS)',
      'orig_im.save(f"{out_dir}/{name}_orig.png")',
      'orig_im.save(f"{art_dir}/{name}_orig.png")',
      '',
      '# 2. Save Informative Drawings result',
      'with open(line_json, "r") as f: ldata = json.load(f)',
      'line_bytes = bytes([int(max(0, min(255, val * 255))) for val in ldata])',
      'line_im = Image.frombytes("L", (w, h), line_bytes)',
      'line_im.save(f"{out_dir}/{name}_informative.png")',
      'line_im.save(f"{art_dir}/{name}_informative.png")',
      '',
      '# 3. Save Final Printmaking result',
      'with open(paths_json, "r", encoding="utf-8") as f:',
      '    paths = json.load(f)',
      'print_im = Image.new("RGB", (w, h), (255, 255, 255))',
      'draw = ImageDraw.Draw(print_im)',
      'for p in paths:',
      '    pts = [(pt[0], pt[1]) for pt in p.get("points", [])]',
      '    if len(pts) >= 2:',
      '        w_line = max(1, int(round((p.get("width", 0.3) or 0.3) * 1.5)))',
      '        draw.line(pts, fill=(20, 20, 20), width=w_line)',
      'print_im.save(f"{out_dir}/{name}_print.png", quality=95)',
      'print_im.save(f"{art_dir}/{name}_print.png", quality=95)'
    ].join('\n');

    const tmpDrawPy = path.join(outDir, `tmp_draw_${s.name}.py`);
    fs.writeFileSync(tmpDrawPy, pyDraw, 'utf8');
    try {
      execFileSync('C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe', [tmpDrawPy]);
    } finally {
      if (fs.existsSync(tmpDrawPy)) fs.unlinkSync(tmpDrawPy);
      if (fs.existsSync(pathsJson)) fs.unlinkSync(pathsJson);
      if (fs.existsSync(lineMapJson)) fs.unlinkSync(lineMapJson);
    }

    results.push({
      id: s.name,
      title: s.desc.split(' ')[0],
      desc: s.desc,
      paths: master.paths.length,
      contours: vectorContours.length,
      hatch: regularHatch,
      cross: crossHatch,
      coverage: coverage.toFixed(1) + '%',
      elapsed: elapsed + 'ms'
    });
  }

  console.log(`\n========================================`);
  console.log(`[10 组全新多样性真实场景测试量化总表]`);
  console.table(results);

  const reportJson = path.join(outDir, 'benchmark_10_cases_summary.json');
  fs.writeFileSync(reportJson, JSON.stringify(results, null, 2), 'utf8');
}

runBenchmark().catch(console.error);
