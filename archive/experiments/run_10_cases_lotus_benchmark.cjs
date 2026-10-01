const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage3 = require('../src/core/stage3-contours.js');
const Stage4 = require('../src/core/stage4-hatching.js');
const Stage5 = require('../src/core/stage5-master-print.js');
const HatchOptimizer = require('../src/core/hatching/hatch-optimizer.js');
const LotusClient = require('../src/services/lotus-client.js');

const PYTHON_BIN = 'C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe';
const ARTIFACT_DIR = 'C:\\Users\\Jimin\\.gemini\\antigravity\\brain\\1be7113c-16fa-48fb-b3f3-09ea3fa01d81';
const OUT_DIR = path.resolve(__dirname, 'lotus_10_cases_outputs');
const GEOM_DIR = path.resolve(__dirname, 'lotus_geometry_10_cases');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(GEOM_DIR)) fs.mkdirSync(GEOM_DIR, { recursive: true });

const SAMPLES = [
  { id: 'case01_cat', desc: '波斯猫特写肖像 (微观毛发/五官结构/曲面形体)' },
  { id: 'case02_stupa', desc: '古塔佛塔建筑 (层叠飞檐/砖石雕琢/天空退避)' },
  { id: 'case03_lake', desc: '湖畔自然山水 (水面波光/远山林木/纸白呼吸)' },
  { id: 'case04_bell', desc: '钟楼阁顶立面 (坡屋顶排线/几何挺拔/明暗交界)' },
  { id: 'case05_pot', desc: '园林深檐芭蕉 (陶罐曲面/深檐飞挑/纸白空灵)' },
  { id: 'case06_wing', desc: '高空机翼与云海 (机械金属曲面/云层翻腾光影)' },
  { id: 'case07_teddy', desc: '毛绒玩偶静物 (织物绒毛/软体褶皱/暗调衬托)' },
  { id: 'case08_plate', desc: '餐盘美食静物 (陶瓷圆盘高光受光/食材细节)' },
  { id: 'case09_cabinet', desc: '博古架橱柜内景 (实木平直边框/器物空间进深)' },
  { id: 'case10_temple', desc: '古刹殿宇建筑 (斗拱挑檐/雕梁画栋/台阶阴影)' }
];

function loadImageGrayscale(imagePath) {
  const pyCode = `
import sys, json
from PIL import Image
im = Image.open(r"""${imagePath}""").convert("L")
w, h = im.size
pixels = list(im.get_flattened_data()) if hasattr(im, "get_flattened_data") else list(im.getdata())
print(json.dumps({"width": w, "height": h, "pixels": pixels}))
`;
  const out = execFileSync(PYTHON_BIN, ['-c', pyCode], { maxBuffer: 100 * 1024 * 1024 });
  return JSON.parse(out.toString());
}

function renderPathsToPNG(paths, width, height, outputPath) {
  const pathsJson = outputPath.replace(/\.png$/, '_tmp_paths.json');
  fs.writeFileSync(pathsJson, JSON.stringify(paths), 'utf8');
  const pyCode = `
import json
from PIL import Image, ImageDraw
w, h = ${width}, ${height}
scale = 2
im = Image.new("RGB", (w * scale, h * scale), (255, 255, 255))
draw = ImageDraw.Draw(im)
with open(r"""${pathsJson}""", "r", encoding="utf-8") as f:
    paths = json.load(f)
for p in paths:
    pts = [(pt[0] * scale, pt[1] * scale) for pt in p.get("points", [])]
    if len(pts) >= 2:
        pw = float(p.get("width", 0.35) or 0.35)
        w_line = max(1, int(round(pw * scale * 1.8)))
        draw.line(pts, fill=(20, 20, 20), width=w_line)
im = im.resize((w, h), Image.Resampling.LANCZOS)
im.save(r"""${outputPath}""", quality=95)
`;
  try {
    execFileSync(PYTHON_BIN, ['-c', pyCode]);
  } finally {
    if (fs.existsSync(pathsJson)) fs.unlinkSync(pathsJson);
  }
}

function composeComparison(origPath, infPath, normPath, basePrintPath, lotusPrintPath, outPath) {
  const pyCode = `
from PIL import Image, ImageDraw, ImageFont
import os

images = [
    ("1. Original Photo", Image.open(r"""${origPath}""").convert("RGB")),
    ("2. Informative Drawing", Image.open(r"""${infPath}""").convert("RGB")),
    ("3. Lotus 3D Normals", Image.open(r"""${normPath}""").convert("RGB")),
    ("4. Baseline Print (2D Flow)", Image.open(r"""${basePrintPath}""").convert("RGB")),
    ("5. Lotus 3D Enhanced Print", Image.open(r"""${lotusPrintPath}""").convert("RGB"))
]

# Standardize height
target_h = 420
resized = []
for title, img in images:
    w, h = img.size
    new_w = int(w * target_h / h)
    res = img.resize((new_w, target_h), Image.Resampling.LANCZOS)
    resized.append((title, res))

total_w = sum(img.width for _, img in resized) + 40
banner_h = 36
canvas = Image.new("RGB", (total_w, target_h + banner_h), (245, 245, 245))
draw = ImageDraw.Draw(canvas)

x_cur = 0
for title, img in resized:
    canvas.paste(img, (x_cur, banner_h))
    draw.text((x_cur + 8, 10), title, fill=(20, 20, 20))
    x_cur += img.width + 8

canvas.save(r"""${outPath}""", quality=95)
`;
  execFileSync(PYTHON_BIN, ['-c', pyCode]);
}

async function runAll() {
  console.log(`=== 开始运行全部 10 个测试用例：Lotus 3D 几何增强版画评测 ===\n`);
  const summary = [];

  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    const caseId = s.id;
    console.log(`[${i + 1}/10] 正在处理: ${caseId} (${s.desc})...`);

    const origPath = path.resolve(__dirname, `ten_cases_outputs/${caseId}_orig.png`);
    const infPath = path.resolve(__dirname, `ten_cases_outputs/${caseId}_informative.png`);
    const basePrintPath = path.resolve(__dirname, `ten_cases_outputs/${caseId}_print.png`);
    const caseGeomDir = path.join(GEOM_DIR, caseId);

    // 1. 生成或加载 Lotus 3D 几何特征
    let geom = LotusClient.loadGeometryFromDir(caseGeomDir);
    if (!geom || !geom.depthMap || !geom.normalMap) {
      console.log(`  -> 提取 3D 几何特征 (深度 + 表面法线)...`);
      geom = LotusClient.estimateGeometry(origPath, {
        outputDir: caseGeomDir,
        fallback: true
      });
    }

    const { depthMap, normalMap } = geom;
    const w = depthMap.width;
    const h = depthMap.height;

    // 2. 准备源图与线稿
    const grayImg = loadImageGrayscale(origPath);
    const infImg = loadImageGrayscale(infPath);
    const lineMap = {
      width: infImg.width,
      height: infImg.height,
      data: new Float32Array(infImg.pixels.map(p => p / 255.0)),
      source: 'informative'
    };

    // 3. Stage 2: 计算 3D 法线驱动调子流场
    const { toneField, flowField: flow3D } = Stage2.runStage2(grayImg, lineMap, {
      exposure: 50,
      detailBoost: 70,
      normalMap: normalMap
    });

    // 计算基准 2D 流场以比对流场差异
    const { flowField: flowBase } = Stage2.runStage2(grayImg, lineMap, {
      exposure: 50,
      detailBoost: 70
    });

    let flowDiffCount = 0;
    for (let idx = 0; idx < w * h; idx++) {
      const diff = Math.abs(flowBase.vx[idx] - flow3D.vx[idx]) + Math.abs(flowBase.vy[idx] - flow3D.vy[idx]);
      if (diff > 0.15) flowDiffCount++;
    }
    const flowModulatedPct = ((flowDiffCount / (w * h)) * 100).toFixed(1);

    // 4. Stage 3: 提取轮廓线并施加 3D 景深线宽调制 (近浓远淡)
    const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, {
      contour: 85,
      highThreshold: 0.85,
      lowThreshold: 0.92,
      minPoints: 2,
      depthMap: depthMap
    });

    // 5. Stage 4: 生成 3D 曲率门控与等高排线
    const hatching3D = Stage4.runStage4(toneField, flow3D, contourMask, {
      lineMap,
      vectorContours,
      depthMap,
      normalMap,
      hatch: 100,
      density: 50,
      cross: 50,
      crossThreshold: 0.85,
      highlightCutoff: 0.22
    });

    // 6. Stage 5: 大师合成
    const master3D = Stage5.runStage5(vectorContours, hatching3D, toneField, flow3D);

    // 7. 导出 SVG 与最终印刷图片
    const svgContent = HatchOptimizer.exportToSVG(master3D.paths, w, h);
    const outSvg = path.join(OUT_DIR, `${caseId}_vector_3d.svg`);
    const outPng = path.join(OUT_DIR, `${caseId}_print_3d.png`);
    fs.writeFileSync(outSvg, svgContent, 'utf8');
    renderPathsToPNG(master3D.paths, w, h, outPng);

    // 拷贝到用户可见 Artifact 目录
    const artSvg = path.join(ARTIFACT_DIR, `${caseId}_vector_3d.svg`);
    const artPng = path.join(ARTIFACT_DIR, `${caseId}_print_3d.png`);
    fs.copyFileSync(outSvg, artSvg);
    fs.copyFileSync(outPng, artPng);

    // 拷贝几何图到 Artifact 目录
    const normVisSrc = path.join(caseGeomDir, 'normal_vis.png');
    const depthVisSrc = path.join(caseGeomDir, 'depth_vis.png');
    const artNormVis = path.join(ARTIFACT_DIR, `${caseId}_normal_vis.png`);
    const artDepthVis = path.join(ARTIFACT_DIR, `${caseId}_depth_vis.png`);
    if (fs.existsSync(normVisSrc)) fs.copyFileSync(normVisSrc, artNormVis);
    if (fs.existsSync(depthVisSrc)) fs.copyFileSync(depthVisSrc, artDepthVis);

    // 8. 合成五列横向对比大图
    const compPng = path.join(OUT_DIR, `${caseId}_comparison.png`);
    const artCompPng = path.join(ARTIFACT_DIR, `${caseId}_comparison.png`);
    composeComparison(origPath, infPath, normVisSrc, basePrintPath, outPng, compPng);
    fs.copyFileSync(compPng, artCompPng);

    const contoursCount = vectorContours.length;
    const hatchCount = hatching3D.filter(p => p.role === 'hatch').length;
    const crossCount = hatching3D.filter(p => p.role === 'cross').length;
    const totalCount = master3D.paths.length;

    console.log(`  -> 完成! 轮廓: ${contoursCount} | 排线: ${hatchCount} | 交叉: ${crossCount} | 总路径: ${totalCount}`);
    console.log(`  -> 3D 流场纠偏比率: ${flowModulatedPct}%`);

    summary.push({
      id: caseId,
      desc: s.desc,
      paths: totalCount,
      contours: contoursCount,
      hatch: hatchCount,
      cross: crossCount,
      flowModulation: `${flowModulatedPct}%`,
      comparisonPng: `${caseId}_comparison.png`,
      vectorSvg: `${caseId}_vector_3d.svg`
    });
  }

  const summaryPath = path.join(OUT_DIR, 'benchmark_10_cases_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n========================================`);
  console.log(`[10 组用例全部执行完成！对比结果表如下]`);
  console.table(summary.map(s => ({
    用例: s.id,
    描述: s.desc.split(' ')[0],
    总描线数: s.paths,
    排线条数: s.hatch,
    '3D流场纠偏率': s.flowModulation
  })));
}

runAll().catch(err => {
  console.error('[Error running benchmark]:', err);
  process.exit(1);
});
