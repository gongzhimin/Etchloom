const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage3 = require('../src/core/stage3-contours.js');
const Stage4 = require('../src/core/stage4-hatching.js');
const Stage5 = require('../src/core/stage5-master-print.js');
const HatchFacadeRules = require('../src/core/hatching/hatch-facade-rules.js');

const pythonBin = 'C:\\Users\\Jimin\\miniconda3\\envs\\midi_gen\\python.exe';
function loadImage(file, targetWidth = 800) {
  const pyCode = `import sys, json
from PIL import Image
im = Image.open(r"""${file}""").convert("RGB")
w, h = im.size
target_w = ${targetWidth}
target_h = int(h * target_w / w)
im = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
gray = im.convert("L")
pixels = list(gray.get_flattened_data()) if hasattr(gray, "get_flattened_data") else list(gray.getdata())
print(json.dumps({"width": target_w, "height": target_h, "pixels": pixels}))
`;
  const tmpPy = path.join(__dirname, 'tmp_u_load.py');
  fs.writeFileSync(tmpPy, pyCode, 'utf8');
  try {
    return JSON.parse(execFileSync(pythonBin, [tmpPy], { maxBuffer: 100 * 1024 * 1024 }));
  } finally {
    if (fs.existsSync(tmpPy)) fs.unlinkSync(tmpPy);
  }
}

const samples = [
  { name: 'case01_cat', file: 'E:\\Camer\\IMG_20240728_193807.jpg', desc: '波斯猫特写肖像' },
  { name: 'case02_stupa', file: 'E:\\Camer\\IMG_20240623_075608.jpg', desc: '古塔佛塔建筑' },
  { name: 'case03_lake', file: 'E:\\Camer\\IMG_20240803_163120.jpg', desc: '湖畔自然山水' },
  { name: 'case04_bell', file: 'E:\\Camer\\IMG_20240622_070432.jpg', desc: '钟楼阁顶立面' },
  { name: 'case05_garden', file: 'E:\\Camer\\IMG_20240811_150336.jpg', desc: '园林深檐芭蕉' },
  { name: 'case06_wing', file: 'E:\\Camer\\IMG_20240720_085724.jpg', desc: '高空机翼与云海' },
  { name: 'case07_teddy', file: 'E:\\Camer\\IMG_20240728_220404.jpg', desc: '毛绒玩偶静物' },
  { name: 'case08_plate', file: 'E:\\Camer\\IMG_20240730_080825.jpg', desc: '餐盘美食静物' },
  { name: 'case09_cabinet', file: 'E:\\Camer\\IMG_20240803_180300.jpg', desc: '博古架橱柜内景' },
  { name: 'case10_temple', file: 'E:\\Camer\\IMG_20240811_141854.jpg', desc: '古刹殿宇建筑' }
];

async function runAll() {
  console.log('--- UNIVERSAL CATEGORY-AGNOSTIC TEST (Zero materialType) ---');
  const results = [];

  for (const s of samples) {
    const img = loadImage(s.file, 800);
    const lineMap = await Stage1.runStage1(img);
    const { toneField, flowField } = Stage2.runStage2(img, lineMap, { exposure: 50, detailBoost: 70 });
    const { vectorContours, contourMask } = Stage3.runStage3(lineMap, toneField, {
      contour: 85, highThreshold: 0.85, lowThreshold: 0.92, minPoints: 2
    });

    // Zero manual materialType passed! Completely automatic!
    const hatching = Stage4.runStage4(toneField, flowField, contourMask, {
      lineMap,
      vectorContours,
      hatch: 100,
      density: 50,
      cross: 50,
      facadeExemption: true // Enable planar surface protection universally!
    });

    const master = Stage5.runStage5(vectorContours, hatching, toneField, flowField, {
      suppressDarkMass: true // Universal dark mass discipline
    });

    const regularHatch = hatching.filter(p => p.role === 'hatch').length;
    const crossHatch = hatching.filter(p => p.role === 'cross').length;

    results.push({
      id: s.name,
      desc: s.desc,
      contours: vectorContours.length,
      hatch: regularHatch,
      cross: crossHatch,
      total: master.paths.length
    });
  }

  console.table(results);
}

runAll().catch(console.error);
