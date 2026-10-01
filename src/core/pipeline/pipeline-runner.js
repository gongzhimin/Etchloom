/* PipelineRunner: Pure stateless incremental executor for the Five-Stage Printmaking Pipeline.
 * Zero DOM dependencies, works in Node.js, Web Worker, and Browser.
 */
(function(root) {
  'use strict';

  function resolveModule(name, fallbackVar) {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { return require('./' + name + '.js'); } catch (_) {}
    }
    return root[fallbackVar] || null;
  }

  const Stage1 = resolveModule('stage1-informative', 'Stage1Informative');
  const Stage2 = resolveModule('stage2-tone-flow', 'Stage2ToneFlow');
  const Stage3 = resolveModule('stage3-contours', 'Stage3Contours');
  const Stage4 = resolveModule('stage4-hatching', 'Stage4Hatching');
  const Stage5 = resolveModule('stage5-master-print', 'Stage5MasterPrint');

  class PipelineRunner {
    /**
     * Incrementally executes stages 1 through 5.
     * Reuses cached previousOutputs for stages < startStage.
     * @param {Object} context - { sourceImage, geometry?: { depthMap, normalMap } }
     * @param {Object} previousOutputs - { stage1?, stage2?, stage3?, stage4?, stage5? }
     * @param {Object} params - Recipe parameters slice
     * @param {number} [startStage=1] - 1..5
     * @param {AbortSignal} [signal=null] - Preemptive cancellation signal
     * @param {Function} [onProgress=null] - (stageIndex, percent, output) => void
     * @returns {Promise<Object>} Completed pipeline bundle
     */
    static async runIncremental(context, previousOutputs = {}, params = {}, startStage = 1, signal = null, onProgress = null) {
      if (!context || !context.sourceImage) {
        throw new Error('PipelineRunner: context.sourceImage is required');
      }

      const { sourceImage, geometry = null } = context;
      const outputs = { ...previousOutputs };

      // Helper to check abort signal
      const checkAbort = (stageIndex) => {
        if (signal && signal.aborted) {
          const err = new Error(signal.reason || 'PIPELINE_ABORTED');
          err.name = 'AbortError';
          err.stageIndex = stageIndex;
          throw err;
        }
      };
      // Give pending input events a turn between synchronous stages so a new
      // request can abort before the next expensive stage begins.
      const yieldBetweenStages = () => new Promise(resolve => setTimeout(resolve, 0));

      // ---------------------------------------------------------------------
      // Stage 1: 灰度线描感知 (Informative Line Extraction)
      // ---------------------------------------------------------------------
      if (startStage <= 1) {
        checkAbort(1);
        if (Stage1 && Stage1.runStage1) {
          outputs.stage1 = await Stage1.runStage1(sourceImage, params);
        } else if (sourceImage.lineMap) {
          outputs.stage1 = {
            width: sourceImage.width,
            height: sourceImage.height,
            data: sourceImage.lineMap
          };
        } else {
          throw new Error('PipelineRunner: Stage 1 module unavailable');
        }
        if (onProgress) onProgress(1, 20, outputs.stage1);
      }

      // ---------------------------------------------------------------------
      // Stage 2: 3D 几何等高流场 (Tone & 3D Surface Flow Field)
      // ---------------------------------------------------------------------
      if (startStage <= 2) {
        await yieldBetweenStages();
        checkAbort(2);
        if (!outputs.stage1) throw new Error('PipelineRunner: stage1 output missing for Stage 2');
        if (Stage2 && Stage2.runStage2) {
          // Pass geometry (depthMap, normalMap) if present
          const stage2Params = geometry ? { ...params, depthMap: geometry.depthMap, normalMap: geometry.normalMap } : params;
          const s2Result = Stage2.runStage2(sourceImage, outputs.stage1, stage2Params);
          outputs.stage2 = {
            toneField: s2Result.toneField,
            flowField: s2Result.flowField
          };
        } else {
          throw new Error('PipelineRunner: Stage 2 module unavailable');
        }
        if (onProgress) onProgress(2, 40, outputs.stage2);
      }

      // ---------------------------------------------------------------------
      // Stage 3: 轮廓与景深调制 (Aerial Perspective Contours)
      // ---------------------------------------------------------------------
      if (startStage <= 3) {
        await yieldBetweenStages();
        checkAbort(3);
        if (!outputs.stage1 || !outputs.stage2) throw new Error('PipelineRunner: upstream outputs missing for Stage 3');
        if (Stage3 && Stage3.runStage3) {
          const stage3Params = geometry ? { ...params, depthMap: geometry.depthMap } : params;
          const s3Result = Stage3.runStage3(outputs.stage1, outputs.stage2.toneField, stage3Params);
          outputs.stage3 = {
            vectorContours: s3Result.vectorContours,
            contourMask: s3Result.contourMask
          };
        } else {
          throw new Error('PipelineRunner: Stage 3 module unavailable');
        }
        if (onProgress) onProgress(3, 60, outputs.stage3);
      }

      // ---------------------------------------------------------------------
      // Stage 4: 曲率门控空间排线 (Curvature-Gated Spatial Hatching)
      // ---------------------------------------------------------------------
      if (startStage <= 4) {
        await yieldBetweenStages();
        checkAbort(4);
        if (!outputs.stage2 || !outputs.stage3) throw new Error('PipelineRunner: upstream outputs missing for Stage 4');
        if (Stage4 && Stage4.runStage4) {
          const stage4Params = geometry ? { ...params, depthMap: geometry.depthMap, normalMap: geometry.normalMap } : params;
          const hatchingPaths = Stage4.runStage4(
            outputs.stage2.toneField,
            outputs.stage2.flowField,
            outputs.stage3.contourMask,
            stage4Params
          );
          outputs.stage4 = { hatchingPaths };
        } else {
          throw new Error('PipelineRunner: Stage 4 module unavailable');
        }
        if (onProgress) onProgress(4, 80, outputs.stage4);
      }

      // ---------------------------------------------------------------------
      // Stage 5: 母版矢量合成 (Master Print Synthesis)
      // ---------------------------------------------------------------------
      if (startStage <= 5) {
        await yieldBetweenStages();
        checkAbort(5);
        if (!outputs.stage3 || !outputs.stage4) throw new Error('PipelineRunner: upstream outputs missing for Stage 5');
        if (Stage5 && Stage5.runStage5) {
          const masterResult = Stage5.runStage5(
            outputs.stage3.vectorContours,
            outputs.stage4.hatchingPaths,
            outputs.stage2.toneField,
            outputs.stage2.flowField,
            params
          );
          outputs.stage5 = masterResult;
          outputs.masterResult = masterResult;
        } else {
          throw new Error('PipelineRunner: Stage 5 module unavailable');
        }
        if (onProgress) onProgress(5, 100, outputs.stage5);
      }

      return outputs;
    }

    /**
     * Unified run method.
     */
    static async run(context, options = {}) {
      return this.runIncremental(
        context,
        options.cachedInputs || {},
        options.params || context.params || {},
        options.startStage || 1,
        options.signal || null,
        options.onProgress || null
      );
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PipelineRunner;
  } else {
    root.PipelineRunner = PipelineRunner;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
