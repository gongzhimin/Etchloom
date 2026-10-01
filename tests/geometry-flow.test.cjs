const test = require('node:test');
const assert = require('node:assert/strict');

const Stage2 = require('../src/core/pipeline/stage2-tone-flow.js');
const Stage4 = require('../src/core/pipeline/stage4-hatching.js');

test('Lotus 3D Geometry Integration: Surface Normal Cross-Contour Tangents', async (t) => {
  await t.test('computes exact vertical cross-contour flow for vertical cylinder normal map', () => {
    const w = 40, h = 40;
    const n = w * h;
    const normals = new Float32Array(n * 3);

    // Vertical cylinder: normal varies horizontally across x (nx = (x - 20)/20, ny = 0, nz = sqrt(1 - nx^2))
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = Math.max(-0.95, Math.min(0.95, (x - 20) / 20));
        const ny = 0.0;
        const nz = Math.sqrt(Math.max(0.01, 1.0 - nx * nx));
        normals[idx * 3] = nx;
        normals[idx * 3 + 1] = ny;
        normals[idx * 3 + 2] = nz;
      }
    }

    const toneField = {
      width: w,
      height: h,
      tone: new Float32Array(n).fill(0.6),
      detailField: new Float32Array(n).fill(0.0)
    };

    const flowField = Stage2.computeFlowField(toneField, null, {
      normalMap: { width: w, height: h, normals }
    });

    // Cross-contour of vertical cylinder is vertical: T = (ny, -nx) = (0, -nx)
    // Therefore, abs(vy) should be dominant (close to 1.0) and abs(vx) should be small (close to 0.0)
    let validCount = 0;
    let sumVy = 0;
    for (let y = 10; y < 30; y++) {
      for (let x = 5; x < 15; x++) { // Region with strong normal slope
        const idx = y * w + x;
        sumVy += Math.abs(flowField.vy[idx]);
        validCount++;
      }
    }
    const avgVy = sumVy / validCount;
    assert.ok(avgVy > 0.85, `Vertical cylinder flow must follow vertical cross-contour (avg |vy| > 0.85, got ${avgVy.toFixed(3)})`);
  });

  await t.test('computes exact horizontal cross-contour flow for horizontal cylinder normal map', () => {
    const w = 40, h = 40;
    const n = w * h;
    const normals = new Float32Array(n * 3);

    // Horizontal cylinder: normal varies vertically across y (nx = 0, ny = (y - 20)/20, nz = sqrt(1 - ny^2))
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const nx = 0.0;
        const ny = Math.max(-0.95, Math.min(0.95, (y - 20) / 20));
        const nz = Math.sqrt(Math.max(0.01, 1.0 - ny * ny));
        normals[idx * 3] = nx;
        normals[idx * 3 + 1] = ny;
        normals[idx * 3 + 2] = nz;
      }
    }

    const toneField = {
      width: w,
      height: h,
      tone: new Float32Array(n).fill(0.6),
      detailField: new Float32Array(n).fill(0.0)
    };

    const flowField = Stage2.computeFlowField(toneField, null, {
      normalMap: { width: w, height: h, normals }
    });

    // Cross-contour of horizontal cylinder is horizontal: T = (ny, -nx) = (ny, 0)
    // Therefore, abs(vx) should be dominant (close to 1.0) and abs(vy) should be small (close to 0.0)
    let validCount = 0;
    let sumVx = 0;
    for (let y = 5; y < 15; y++) {
      for (let x = 10; x < 30; x++) {
        const idx = y * w + x;
        sumVx += Math.abs(flowField.vx[idx]);
        validCount++;
      }
    }
    const avgVx = sumVx / validCount;
    assert.ok(avgVx > 0.85, `Horizontal cylinder flow must follow horizontal cross-contour (avg |vx| > 0.85, got ${avgVx.toFixed(3)})`);
  });
});

test('Lotus 3D Geometry Integration: Atmospheric Distance Modulation (Stage 4)', async (t) => {
  await t.test('attenuates distant strokes and preserves near strokes with depthMap', () => {
    const w = 60, h = 60;
    const n = w * h;

    const tone = new Float32Array(n);
    const detailField = new Float32Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        tone[idx] = 0.55 + 0.25 * Math.sin(y * 0.15);
        detailField[idx] = 0.12 * Math.cos(x * 0.2);
      }
    }

    const toneField = {
      width: w,
      height: h,
      tone,
      detailField
    };

    const flowField = {
      width: w,
      height: h,
      vx: new Float32Array(n).fill(1.0),
      vy: new Float32Array(n).fill(0.0),
      coherence: new Float32Array(n).fill(0.9)
    };

    // Depth gradient: left side near (z = 0.0), right side far (z = 1.0)
    const depthData = new Float32Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        depthData[y * w + x] = x / (w - 1);
      }
    }

    const result = Stage4.runStage4(toneField, flowField, null, {
      depthMap: { width: w, height: h, data: depthData },
      hatch: 100,
      density: 50
    });

    assert.ok(Array.isArray(result), 'Stage 4 must return path array');
    assert.ok(result.length > 0, 'Must generate hatching paths');

    // Check width difference between near (left, x < 20) and far (right, x > 40)
    let nearWidths = [], farWidths = [];
    for (const p of result) {
      if (!p.points || p.points.length === 0) continue;
      const mid = p.points[Math.floor(p.points.length / 2)];
      if (mid[0] < 20) nearWidths.push(p.width);
      else if (mid[0] > 40) farWidths.push(p.width);
    }

    if (nearWidths.length > 0 && farWidths.length > 0) {
      const avgNear = nearWidths.reduce((a, b) => a + b, 0) / nearWidths.length;
      const avgFar = farWidths.reduce((a, b) => a + b, 0) / farWidths.length;
      assert.ok(avgNear > avgFar, `Near strokes (${avgNear.toFixed(3)}) must be thicker than far strokes (${avgFar.toFixed(3)})`);
    }
  });

  await t.test('runs seamlessly when depthMap and normalMap are null (graceful fallback)', () => {
    const w = 30, h = 30;
    const n = w * h;
    const toneField = { width: w, height: h, tone: new Float32Array(n).fill(0.5) };
    const flowField = { width: w, height: h, vx: new Float32Array(n).fill(1.0), vy: new Float32Array(n).fill(0.0) };

    const result = Stage4.runStage4(toneField, flowField, null, {});
    assert.ok(Array.isArray(result));
  });
});
