'use strict';
importScripts(
  '../core/pipeline-types.js',
  '../core/stage1-informative.js',
  '../core/stage2-tone-flow.js',
  '../core/stage3-contours.js',
  '../core/hatching/hatch-tone.js',
  '../core/hatching/hatch-background.js',
  '../core/hatching/hatch-field.js',
  '../core/hatching/hatch-volume.js',
  '../core/hatching/hatch-geometry-flow.js',
  '../core/hatching/hatch-focus-protection.js',
  '../core/hatching/hatch-attention.js',
  '../core/hatching/hatch-material-rules.js',
  '../core/hatching/hatch-facade-rules.js',
  '../core/hatching/hatch-manhattan-flow.js',
  '../core/hatching/hatch-ink-budget.js',
  '../core/hatching/hatch-coherence-gate.js',
  '../core/hatching/hatch-distance.js',
  '../core/hatching/hatch-streamline.js',
  '../core/hatching/hatch-optimizer.js',
  '../core/stage4-hatching.js',
  '../core/stage5-master-print.js',
  '../core/photo-pro.js',
  '../core/pipeline-runner.js',
  '../core/generator.js'
);

self.onmessage = async event => {
  const data = event.data || {};
  const { id } = data;

  try {
    // 1. M4 Modern Incremental Pipeline Execution
    if (data.type === 'RUN_PIPELINE') {
      const started = performance.now();
      const { context, previousOutputs, params, startStage } = data;

      const outputs = await PipelineRunner.runIncremental(
        context,
        previousOutputs || {},
        params || {},
        startStage || 1,
        null,
        (stageIndex, percent, output) => {
          self.postMessage({
            id,
            type: 'STAGE_PROGRESS',
            stageIndex,
            percent,
            artifact: output
          });
        }
      );

      self.postMessage({
        id,
        type: 'PIPELINE_COMPLETED',
        outputs,
        elapsed: performance.now() - started
      });
      return;
    }

    // 2. Legacy Batch Generation (Backward-compatible)
    const { recipes } = data;
    if (recipes && Array.isArray(recipes)) {
      const started = performance.now(), results = [];
      recipes.forEach((recipe, index) => {
        self.generationProgress = (value, label) => self.postMessage({
          id,
          type: 'progress',
          value: Math.round((index + value / 100) / recipes.length * 100),
          label
        });
        self.postMessage({
          id,
          type: 'progress',
          value: Math.round(index / recipes.length * 100),
          label: `生成 ${index + 1} / ${recipes.length}`
        });
        const result = PrintGenerator.generate(recipe);
        delete result.recipe;
        results.push(result);
      });
      const sourceBytes = recipes.reduce((sum, r) => sum + (r.image ? r.image.pixels.length * 8 : 0), 0);
      const pointBytes = results.reduce((sum, r) => sum + r.paths.reduce((s, p) => s + p.points.length * 32, 0), 0);
      self.postMessage({
        id,
        type: 'result',
        results,
        elapsed: performance.now() - started,
        estimatedBytes: sourceBytes * 5 + pointBytes * 2
      });
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error.message });
  }
};
