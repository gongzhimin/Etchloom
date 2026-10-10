/* PipelineWorker: Dedicated Web Worker for Etchloom v2 Five-Stage Pipeline.
 * Offloads CPU-intensive DoG extraction, guided filtering, contour vectorization,
 * and RK2 streamline integration from the UI main thread.
 * Pure computation, zero DOM dependencies.
 */
'use strict';

// Load isomorphic pipeline modules
try {
  importScripts(
    '../../core/codecs/plate-codec.js',
    '../../core/pipeline/pipeline-types.js',
    '../../core/pipeline/stage1-informative.js',
    '../../core/pipeline/stage2-tone-flow.js',
    '../../core/pipeline/stage3-contours.js',
    '../../core/hatching/curves/hatch-tone.js',
    '../../core/hatching/curves/hatch-background.js',
    '../../core/hatching/fields/hatch-field.js',
    '../../core/hatching/fields/hatch-volume.js',
    '../../core/hatching/fields/hatch-geometry-flow.js',
    '../../core/hatching/rules/hatch-focus-protection.js',
    '../../core/hatching/rules/hatch-attention.js',
    '../../core/hatching/rules/hatch-material-rules.js',
    '../../core/hatching/rules/hatch-facade-rules.js',
    '../../core/hatching/fields/hatch-manhattan-flow.js',
    '../../core/hatching/rules/hatch-ink-budget.js',
    '../../core/hatching/rules/hatch-coherence-gate.js',
    '../../core/hatching/curves/hatch-distance.js',
    '../../core/hatching/curves/hatch-streamline.js',
    '../../core/hatching/curves/hatch-optimizer.js',
    '../../core/pipeline/stage4-hatching.js',
    '../../core/pipeline/stage5-master-print.js',
    '../../core/pipeline/pipeline-runner.js',
    '../cache/stage-cache.js'
  );
} catch (err) {
  // Classic worker environment load error
}

let activeAbortController = null;
let cachedWorkerContext = null;

self.onmessage = async function(e) {
  const data = e.data;
  if (!data || !data.type) return;

  if (data.type === 'SET_SOURCE') {
    cachedWorkerContext = data.context;
    self.postMessage({ type: 'SOURCE_SET', sourceVersion: data.sourceVersion });
    return;
  }

  if (data.type === 'ABORT') {
    if (activeAbortController) {
      activeAbortController.abort(data.reason || 'SUPERSEDED_BY_NEW_REQUEST');
      activeAbortController = null;
    }
    return;
  }

  if (data.type === 'RUN_INCREMENTAL') {
    const { requestId, previousOutputs, params, startStage } = data;
    const context = data.context || cachedWorkerContext;
    if (!context) {
      self.postMessage({ type: 'ERROR', requestId, message: 'Worker source context not initialized' });
      return;
    }
    if (data.context) {
      cachedWorkerContext = data.context;
    }
    if (activeAbortController) {
      activeAbortController.abort('SUPERSEDED_BY_NEW_REQUEST');
    }
    const abortController = new AbortController();
    activeAbortController = abortController;

    try {
      const Runner = typeof PipelineRunner !== 'undefined' ? PipelineRunner : self.PipelineRunner;
      if (!Runner) {
        throw new Error('PipelineRunner unavailable in Worker');
      }

      const outputs = await Runner.runIncremental(
        context,
        previousOutputs || {},
        params || {},
        startStage || 1,
        abortController.signal,
        (stage, progress, artifact) => {
          if (abortController.signal.aborted) return;
          self.postMessage({
            type: 'PROGRESS',
            requestId,
            stage,
            progress,
            artifact
          });
        }
      );

      if (abortController.signal.aborted) return;

      self.postMessage({
        type: 'COMPLETE',
        requestId,
        outputs
      });
    } catch (err) {
      if (err.name === 'AbortError' || abortController.signal.aborted) {
        self.postMessage({ type: 'ABORTED', requestId });
      } else {
        self.postMessage({ type: 'ERROR', requestId, message: err.message });
      }
    } finally {
      if (activeAbortController === abortController) {
        activeAbortController = null;
      }
    }
  }
};
