/* Stage 4: Flow-Constrained High-Precision Adaptive Hatching Mesh.
 * Modular Facade integrating:
 * - Sub-Module 2.1: HatchField (Cross-Field)
 * - Sub-Module 2.2: HatchDistance (Exact SDF & Margin)
 * - Sub-Module 2.3: HatchStreamline (Jobard-Lefer Evenly-Spaced Streamlines)
 * - Sub-Module 2.4: HatchOptimizer (Burin Dynamics & Path Export)
 */
(function(root) {
  'use strict';

  function resolveModule(name, fallbackVar) {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { return require('../hatching/fields/' + name + '.js'); } catch (_) {}
      try { return require('../hatching/rules/' + name + '.js'); } catch (_) {}
      try { return require('../hatching/curves/' + name + '.js'); } catch (_) {}
    }
    return root[fallbackVar] || null;
  }

  const HatchTone = resolveModule('hatch-tone', 'HatchTone');
  const HatchBackground = resolveModule('hatch-background', 'HatchBackground');
  const HatchField = resolveModule('hatch-field', 'HatchField');
  const HatchVolume = resolveModule('hatch-volume', 'HatchVolume');
  const HatchGeometryFlow = resolveModule('hatch-geometry-flow', 'HatchGeometryFlow');
  const HatchFocusProtection = resolveModule('hatch-focus-protection', 'HatchFocusProtection');
  const HatchAttention = resolveModule('hatch-attention', 'HatchAttention');
  const HatchMaterialRules = resolveModule('hatch-material-rules', 'HatchMaterialRules');
  const HatchFacadeRules = resolveModule('hatch-facade-rules', 'HatchFacadeRules');
  const HatchManhattanFlow = resolveModule('hatch-manhattan-flow', 'HatchManhattanFlow');
  const HatchInkBudget = resolveModule('hatch-ink-budget', 'HatchInkBudget');
  const HatchCoherenceGate = resolveModule('hatch-coherence-gate', 'HatchCoherenceGate');
  const HatchDistance = resolveModule('hatch-distance', 'HatchDistance');
  const HatchStreamline = resolveModule('hatch-streamline', 'HatchStreamline');
  const HatchOptimizer = resolveModule('hatch-optimizer', 'HatchOptimizer');

  // Bilinear interpolation for flow field sampling (kept for backward compatibility)
  function sampleFieldBilinear(field, x, y) {
    if (!field || !field.vx) return { vx: 1, vy: 0, coh: 0 };
    const w = field.width, h = field.height;
    const fx = Math.max(0, Math.min(w - 2, x));
    const fy = Math.max(0, Math.min(h - 2, y));
    const x0 = Math.floor(fx), x1 = x0 + 1;
    const y0 = Math.floor(fy), y1 = y0 + 1;
    const wx = fx - x0, wy = fy - y0;

    const i00 = y0 * w + x0, i10 = y0 * w + x1;
    const i01 = y1 * w + x0, i11 = y1 * w + x1;

    let vx0 = field.vx[i00], vy0 = field.vy[i00];
    let vx1 = field.vx[i10], vy1 = field.vy[i10];
    if (vx0 * vx1 + vy0 * vy1 < 0) { vx1 = -vx1; vy1 = -vy1; }

    let vx2 = field.vx[i01], vy2 = field.vy[i01];
    if (vx0 * vx2 + vy0 * vy2 < 0) { vx2 = -vx2; vy2 = -vy2; }

    let vx3 = field.vx[i11], vy3 = field.vy[i11];
    if (vx0 * vx3 + vy0 * vy3 < 0) { vx3 = -vx3; vy3 = -vy3; }

    const topX = (1 - wx) * vx0 + wx * vx1;
    const topY = (1 - wx) * vy0 + wx * vy1;
    const botX = (1 - wx) * vx2 + wx * vx3;
    const botY = (1 - wx) * vy2 + wx * vy3;

    const vx = (1 - wy) * topX + wy * botX;
    const vy = (1 - wy) * topY + wy * botY;
    const len = Math.hypot(vx, vy);

    const coh = field.coherence ? (
      (1 - wy) * ((1 - wx) * field.coherence[i00] + wx * field.coherence[i10]) +
      wy * ((1 - wx) * field.coherence[i01] + wx * field.coherence[i11])
    ) : 1;

    if (len > 0.0001) return { vx: vx / len, vy: vy / len, coh };
    return { vx: field.vx[i00], vy: field.vy[i00], coh: field.coherence ? field.coherence[i00] : 1 };
  }

  function runStage4(toneField, flowField, contourMask, params = {}) {
    const { width: w, height: h, tone, detailField } = toneField;
    const n = w * h;
    const densityParam = (params.density ?? 55) / 100;
    const hatchWeight = (params.hatch ?? 100) / 100;
    const crossWeight = (params.cross ?? 65) / 100;

    // 0. Non-linear Tone Remapping with Knee-Point Highlight Reserve
    let effectiveTone = tone;
    let tiers = null;
    if (HatchTone) {
      const whiteKnee = params.whiteKnee ?? 0.30;
      const remapped = HatchTone.remapToneAndTiers(tone, w, h, { ...params, whiteKnee });
      effectiveTone = remapped.printTone;
      tiers = remapped.tiers;
    }

    // 0.1 Background Breathing (prevent full-canvas flooding)
    let isForeground = null;
    if (HatchVolume) {
      isForeground = HatchVolume.computeSpatialStratification(toneField, params.lineMap);
    }
    if (HatchBackground) {
      effectiveTone = HatchBackground.modulateBackgroundBreathing(effectiveTone, isForeground, w, h, params);
    }

    // 0.2 Semantic Focus Protection (Plaques, Calligraphy, Eyes)
    if (HatchFocusProtection && params.lineMap) {
      const focusRes = HatchFocusProtection.applySemanticFocusProtection(
        params.lineMap,
        { tone: effectiveTone },
        null,
        params
      );
      effectiveTone = focusRes.protectedTone;
    }

    // 0.3 Universal Spatial Ink Budget Conservation (Zero double-dip hatching)
    let suppressCrossHatch = false;
    if (HatchInkBudget) {
      effectiveTone = HatchInkBudget.computeHatchBudget(
        { width: w, height: h, tone: effectiveTone, detailField },
        params.lineMap,
        params.vectorContours || [],
        { ...params, normalMap: params.normalMap || flowField?.normalMap }
      );
    } else if (HatchAttention && params.lineMap) {
      const inhibitionField = HatchAttention.computeLineAttentionInhibition(params.lineMap, params);
      const modTone = new Float32Array(effectiveTone);
      for (let i = 0; i < n; i++) {
        const inh = inhibitionField[i];
        if (inh >= 0.38) modTone[i] = 0.0;
        else if (inh > 0.0) modTone[i] *= Math.max(0.0, 1.0 - inh * 2.2);
      }
      effectiveTone = modTone;
    }

    // 0.4 Universal Flow Coherence & Planar Surface Gate (Zero swirls on flat planes/skies/walls)
    if (HatchCoherenceGate && flowField) {
      const { gatedBudget } = HatchCoherenceGate.gateByCoherenceAndFlatness(
        effectiveTone,
        flowField,
        { width: w, height: h, tone: effectiveTone, detailField },
        contourMask,
        params
      );
      effectiveTone = gatedBudget;
    } else if (HatchFacadeRules && params.lineMap) {
      const facadeMask = HatchFacadeRules.detectPlanarFacades(
        { width: w, height: h, tone: effectiveTone, detailField },
        params.lineMap,
        params
      );
      if (facadeMask) {
        const modTone = new Float32Array(effectiveTone);
        for (let i = 0; i < n; i++) if (facadeMask[i] === 1) modTone[i] = 0.0;
        effectiveTone = modTone;
      }
    }

    // Universal cross-hatching suppression based on contour complexity
    const totalContourPoints = (params.vectorContours || []).reduce((acc, c) => acc + (c.points ? c.points.length : 0), 0);
    if ((params.vectorContours && params.vectorContours.length > 4500) || totalContourPoints > 20000) {
      suppressCrossHatch = true;
    }

    // 0.5 Atmospheric Distance Attenuation & Far-Background Suppression (Lotus Depth Integration)
    const depthData = params.depthMap?.data || params.depth;
    if (depthData) {
      const depthModTone = new Float32Array(effectiveTone);
      for (let i = 0; i < n; i++) {
        const z = depthData[i];
        // Deep background fade: if z > 0.88, cut off hatching unless deeply shaded
        if (z > 0.88 && depthModTone[i] < 0.72) {
          depthModTone[i] = 0.0;
        } else if (z > 0.35) {
          // Continuous distance fade
          depthModTone[i] *= (1.0 - (z - 0.35) * 0.40);
        }
      }
      effectiveTone = depthModTone;
    }

    const effectiveToneField = { width: w, height: h, tone: effectiveTone, detailField };

    // 1. Compute Structure-Aligned CrossField
    let crossField;
    if (params.lineMap && HatchGeometryFlow) {
      crossField = HatchGeometryFlow.computeStructureAlignedFlow(
        effectiveToneField,
        params.lineMap,
        params.vectorContours || [],
        params
      );
    } else if (params.lineMap && HatchVolume) {
      crossField = HatchVolume.computeVolumetricField(effectiveToneField, params.lineMap, params);
    } else if (flowField && flowField.ux && flowField.vx) {
      crossField = flowField;
    } else if (flowField && flowField.vx && flowField.vy) {
      // Adapt existing flowField into crossField with conjugate cross angle
      const crossOffset = Math.PI * 0.38; // ~68 degrees
      const vxCross = new Float32Array(n);
      const vyCross = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = Math.atan2(flowField.vy[i], flowField.vx[i]) + crossOffset;
        vxCross[i] = Math.cos(a);
        vyCross[i] = Math.sin(a);
      }
      crossField = {
        width: w, height: h,
        ux: flowField.vx, uy: flowField.vy,
        vx: vxCross, vy: vyCross,
        coherence: flowField.coherence || new Float32Array(n).fill(1)
      };
    } else {
      crossField = HatchField.computeCrossField(effectiveToneField, params.lineMap, params);
    }

    // Regularize flow when dominant axes exist
    if (HatchManhattanFlow && params.regularizeFlow !== false) {
      crossField = HatchManhattanFlow.regularizeArchitecturalFlow(crossField, params.dominantAngles, params);
    }

    // 2. Compute Exact Euclidean Distance Transform (SDF) for Boundary Collision
    const sdf = (contourMask && HatchDistance) ? HatchDistance.computeSDF(contourMask, w, h) : null;

    // 3. Spacing parameters dynamically modulated by user density setting
    const minSpacing = Math.max(1.5, 2.6 - densityParam * 1.0);
    const maxSpacing = Math.max(4.5, 9.0 - densityParam * 2.8);
    const kissingMargin = Math.max(1.4, 2.2 * (w / 900));

    // Universal paper-white cutoff: default to 0.24 for luminous paper reserve
    const highlightCutoff = params.highlightCutoff ?? 0.24;

    // 4. Generate Deterministic Streamlines via Jobard-Lefer Seed Queue
    const streamlines = HatchStreamline
      ? HatchStreamline.generateStreamlines(crossField, effectiveToneField, sdf, {
          ...params,
          minSpacing,
          maxSpacing,
          kissingMargin,
          highlightCutoff, // Paper white preservation
          crossThreshold: params.crossThreshold ?? 0.85, // Strictly deep dark core only
          cross: suppressCrossHatch ? 0 : (params.cross ?? 65),
          stepSize: Math.max(0.85, Math.min(1.35, w * 0.0012))
        })
      : [];

    // 5. Apply Burin Pressure Dynamics (Attack - Sustain - Release)
    const shapedPaths = HatchOptimizer
      ? HatchOptimizer.applyBurinDynamics(streamlines, effectiveToneField, {
          ...params,
          hatch: params.hatch ?? 100
        })
      : streamlines;

    // 6. Micro-Engraving Detail Layer (flicks in rich micro-texture zones)
    const extraPaths = [];
    if (detailField && HatchField) {
      const stepSize = Math.max(0.85, Math.min(1.35, w * 0.0012));
      const microStep = Math.max(4, Math.round(14 - densityParam * 8));

      for (let y = microStep; y < h - microStep; y += microStep) {
        for (let x = microStep; x < w - microStep; x += microStep) {
          const idx = y * w + x;
          const detailVal = Math.abs(detailField[idx]);
          if (detailVal < 0.038 || effectiveTone[idx] < 0.20 || suppressCrossHatch) continue;

          // Avoid placing flicks within kissing margin of contours
          if (sdf && HatchDistance && HatchDistance.isMarginBreached(sdf, w, h, x, y, kissingMargin)) continue;

          const [tx, ty] = HatchField.sampleTangent(crossField, 'primary', x, y);
          const flickLen = (2.2 + detailVal * 7.5) * stepSize;
          const p1 = [x - tx * flickLen * 0.5, y - ty * flickLen * 0.5];
          const p2 = [x + tx * flickLen * 0.5, y + ty * flickLen * 0.5];

          if (p1[0] >= 3 && p1[0] < w - 3 && p1[1] >= 3 && p1[1] < h - 3 &&
              p2[0] >= 3 && p2[0] < w - 3 && p2[1] >= 3 && p2[1] < h - 3) {
            extraPaths.push({
              role: 'hatch',
              mark: 'micro-flick',
              points: [p1, p2],
              width: (0.12 + detailVal * 0.28) * hatchWeight,
              taper: true
            });
          }
        }
      }
    }

    const out = [...shapedPaths, ...extraPaths];
    if (depthData) {
      for (let pIdx = 0; pIdx < out.length; pIdx++) {
        const p = out[pIdx];
        if (!p.points || p.points.length === 0) continue;
        const mid = p.points[Math.floor(p.points.length / 2)];
        const midX = mid[0] ?? mid.x ?? 0;
        const midY = mid[1] ?? mid.y ?? 0;
        const mx = Math.max(0, Math.min(w - 1, Math.round(midX)));
        const my = Math.max(0, Math.min(h - 1, Math.round(midY)));
        const z = depthData[my * w + mx] ?? 0;
        if (Number.isFinite(p.width) && Number.isFinite(z)) {
          p.width *= Math.max(0.65, 1.0 - z * 0.35);
        }
      }
    }
    out.effectiveToneField = effectiveToneField;
    return out;
  }

  const api = { runStage4, sampleFieldBilinear };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Stage4Hatching = api;
})(globalThis);
