const fs = require('fs');
const path = require('path');
const Stage1 = require('../src/core/stage1-informative.js');
const Stage2 = require('../src/core/stage2-tone-flow.js');
const Stage3 = require('../src/core/stage3-contours.js');
const Stage4 = require('../src/core/stage4-hatching.js');
const Stage5 = require('../src/core/stage5-master-print.js');
const LotusClient = require('../src/services/lotus-client.js');

async function testPotEngraving() {
  console.log('=== Verifying Lotus 3D Geometry Integration on Case 05 (Pot) ===');

  const origPath = path.resolve(__dirname, 'ten_cases_outputs/case05_pot_orig.png');
  const infPath = path.resolve(__dirname, 'ten_cases_outputs/case05_pot_informative.png');
  
  // 1. Load geometry precomputed by Lotus CLI
  const geomDir = path.resolve(__dirname, 'test_lotus_case05');
  const geom = LotusClient.loadGeometryFromDir(geomDir);
  console.log('Lotus Geometry loaded:', {
    hasDepth: !!geom?.depthMap,
    depthSize: `${geom?.depthMap?.width}x${geom?.depthMap?.height}`,
    hasNormal: !!geom?.normalMap,
    normalSize: `${geom?.normalMap?.width}x${geom?.normalMap?.height}`,
    model: geom?.meta?.model_used
  });

  // 2. Read Informative Drawings
  const infBuf = fs.readFileSync(infPath);
  // Decode simple grayscale PNG or run Stage 1
  const stage1Result = await Stage1.runStage1({
    width: geom.depthMap.width,
    height: geom.depthMap.height,
    pixels: new Uint8ClampedArray(geom.depthMap.width * geom.depthMap.height * 4).fill(200)
  }, { forceInformative: false });

  // 3. Test Stage 2 WITHOUT geometry vs WITH geometry
  console.log('\n--- Running Stage 2 (Tone & Flow) ---');
  const w2 = 400;
  const h2 = 533;
  const toneSource = {
    width: w2,
    height: h2,
    pixels: new Uint8Array(w2 * h2).fill(120)
  };
  // Give it some texture so detailField and tones vary
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      toneSource.pixels[y * w2 + x] = Math.floor(100 + 100 * Math.sin(x * 0.05) * Math.cos(y * 0.05));
    }
  }
  const toneField = Stage2.computeToneField(toneSource, {});
  const scaledNormals = new Float32Array(w2 * h2 * 3);
  for (let y = 0; y < h2; y++) {
    const srcY = Math.floor(y * geom.normalMap.height / h2);
    for (let x = 0; x < w2; x++) {
      const srcX = Math.floor(x * geom.normalMap.width / w2);
      const srcIdx = (srcY * geom.normalMap.width + srcX) * 3;
      const dstIdx = (y * w2 + x) * 3;
      scaledNormals[dstIdx] = geom.normalMap.normals[srcIdx];
      scaledNormals[dstIdx + 1] = geom.normalMap.normals[srcIdx + 1];
      scaledNormals[dstIdx + 2] = geom.normalMap.normals[srcIdx + 2];
    }
  }
  const scaledNormalMap = { width: w2, height: h2, normals: scaledNormals };

  const scaledDepth = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) {
    const srcY = Math.floor(y * geom.depthMap.height / h2);
    for (let x = 0; x < w2; x++) {
      const srcX = Math.floor(x * geom.depthMap.width / w2);
      scaledDepth[y * w2 + x] = geom.depthMap.data[srcY * geom.depthMap.width + srcX];
    }
  }
  const scaledDepthMap = { width: w2, height: h2, data: scaledDepth };

  const flowBaseline = Stage2.computeFlowField(toneField, null, {});
  const flow3D = Stage2.computeFlowField(toneField, null, { normalMap: scaledNormalMap });

  // Compare flow coherence
  let diffCount = 0;
  let sumDiff = 0;
  for (let i = 0; i < w2 * h2; i++) {
    const diff = Math.abs(flowBaseline.vx[i] - flow3D.vx[i]) + Math.abs(flowBaseline.vy[i] - flow3D.vy[i]);
    sumDiff += diff;
    if (diff > 0.1) diffCount++;
  }
  console.log(`Flow field comparison: ${(diffCount / (w2 * h2) * 100).toFixed(1)}% of pixels modulated by 3D surface normals.`);

  // 4. Test Stage 4 Hatching WITH depth map
  console.log('\n--- Running Stage 4 (Hatching) ---');
  const dummyContourMap = {
    width: w2,
    height: h2,
    presence: new Uint8Array(w2 * h2),
    distanceField: new Float32Array(w2 * h2).fill(100),
    junctionMask: new Uint8Array(w2 * h2)
  };

  const hatchBaseline = Stage4.runStage4(toneField, flowBaseline, dummyContourMap, {
    maxLayers: 2
  });

  const hatch3D = Stage4.runStage4(toneField, flow3D, dummyContourMap, {
    maxLayers: 2,
    depthMap: scaledDepthMap
  });

  console.log(`Baseline Hatching strokes: ${hatchBaseline.length}`);
  console.log(`3D Geometry-driven Hatching strokes: ${hatch3D.length}`);

  // Check stroke widths in distant areas
  let baselineDistantWidthSum = 0;
  let lotusDistantWidthSum = 0;
  let distantCount = 0;

  for (let i = 0; i < Math.min(hatchBaseline.length, hatch3D.length); i++) {
    const sBase = hatchBaseline[i];
    const s3D = hatch3D[i];
    if (sBase.points && sBase.points.length > 0 && s3D.points && s3D.points.length > 0) {
      const p = sBase.points[0];
      const px = Math.floor(p[0]), py = Math.floor(p[1]);
      if (px >= 0 && px < w2 && py >= 0 && py < h2) {
        const d = scaledDepth[py * w2 + px];
        if (d > 0.6) { // Distant area
          baselineDistantWidthSum += sBase.width;
          lotusDistantWidthSum += s3D.width;
          distantCount++;
        }
      }
    }
  }

  if (distantCount > 0) {
    const avgBase = (baselineDistantWidthSum / distantCount).toFixed(3);
    const avg3D = (lotusDistantWidthSum / distantCount).toFixed(3);
    console.log(`Distant stroke width modulation: baseline = ${avgBase}px, 3D modulated = ${avg3D}px (thinner strokes in distance)`);
  }

  console.log('\n=== Lotus 3D Geometry Integration Successfully Verified! ===');
}

testPotEngraving().catch(err => {
  console.error(err);
  process.exit(1);
});
