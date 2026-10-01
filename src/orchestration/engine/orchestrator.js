(function(root) {
  'use strict';

/**
 * Central Orchestration Hub (M4: 调度编排中枢)
 * Ties together StageCache, TaskScheduler, TelemetrySink, PipelineRunner, VirtualPlateEngine, and Exporter.
 * Pure JavaScript, universal for Node.js, Web Worker, and Browser Main Thread.
 */
const _StageCache = typeof require !== 'undefined' ? require('../cache/stage-cache.js') : globalThis.StageCache;
const StageCache = _StageCache.StageCache || _StageCache;

const _TaskScheduler = typeof require !== 'undefined' ? require('../scheduler/task-scheduler.js') : globalThis.TaskScheduler;
const TaskScheduler = _TaskScheduler.TaskScheduler || _TaskScheduler;

const _TelemetrySink = typeof require !== 'undefined' ? require('../telemetry/telemetry-sink.js') : globalThis.TelemetrySink;
const TelemetrySink = _TelemetrySink.TelemetrySink || _TelemetrySink;

const _PipelineRunner = typeof require !== 'undefined' ? require('../../core/pipeline/pipeline-runner.js') : globalThis.PipelineRunner;
const PipelineRunner = _PipelineRunner.PipelineRunner || _PipelineRunner;

const { VirtualPlateEngine } = typeof require !== 'undefined' ? require('../../core/plate/engine/virtual-plate-engine.js') : globalThis;
const Exporter = typeof require !== 'undefined' ? require('../export/exporter.js') : globalThis.Exporter;

class Orchestrator {
  /**
   * @param {Object} [config={}]
   * @param {number} [config.debounceMs=60] TaskScheduler debounce delay
   * @param {number} [config.plateWidth=900] Virtual plate initial width
   */
  constructor(config = {}) {
    this.stageCache = new StageCache();
    this.scheduler = new TaskScheduler(config.debounceMs ?? 60);
    this.telemetry = new TelemetrySink(event => this._emit('TELEMETRY_SAMPLE', event));
    this.plateEngine = new VirtualPlateEngine(config.plateWidth ?? 900);
    this.listeners = new Set();
    this.lastResult = null;
  }

  /**
   * Subscribes an event listener to orchestrator lifecycle events.
   * @param {Function} listener (event: Object) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit(type, payload = {}) {
    const event = { type, timestamp: Date.now(), ...payload };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Orchestrator listener error:', err);
      }
    }
  }

  /**
   * Computes stage hashes for the given recipe state.
   * @param {Object} recipeState 
   * @returns {Object} Hashes keyed by stage number 1..5
   */
  computeStageHashes(recipeState) {
    const p = recipeState.params || recipeState;
    const s1Params = { sourceImage: recipeState.sourceImage, lineThreshold: p.lineThreshold, lineNoiseSuppression: p.lineNoiseSuppression };
    const s2Params = { toneContrast: p.toneContrast, toneBrightness: p.toneBrightness, flowSmoothing: p.flowSmoothing };
    const s3Params = { contourDetail: p.contourDetail, contourSimplify: p.contourSimplify };
    const s4Params = { density: p.density, angle: p.angle, crossHatch: p.crossHatch, waviness: p.waviness };
    const s5Params = { needleWidth: p.needleWidth, inkGain: p.inkGain };

    const h1 = this.stageCache.computeStageHash(1, s1Params, '');
    const h2 = this.stageCache.computeStageHash(2, s2Params, h1);
    const h3 = this.stageCache.computeStageHash(3, s3Params, h2);
    const h4 = this.stageCache.computeStageHash(4, s4Params, h3);
    const h5 = this.stageCache.computeStageHash(5, s5Params, h4);

    return { 1: h1, 2: h2, 3: h3, 4: h4, 5: h5 };
  }

  /**
   * Schedules execution of a recipe with automatic debouncing, cancellation, and incremental caching.
   * 
   * @param {Object} recipeState 
   * @param {Object} [options={}]
   * @returns {Promise<Object>} Execution result
   */
  scheduleRecipe(recipeState, options = {}) {
    return this.scheduler.schedule(async (signal) => {
      const startTime = Date.now();
      const hashes = this.computeStageHashes(recipeState);
      const startStage = this.stageCache.resolveInvalidation(hashes);

      // If all stages are fully cached (startStage === 6), return cached master paths
      if (startStage > 5 && this.stageCache.get(5)) {
        return {
          fromCache: true,
          masterPaths: this.stageCache.get(5).masterPaths,
          completedStages: 5
        };
      }

      // Collect cached inputs
      const cachedInputs = {};
      for (let s = 1; s < startStage; s++) {
        cachedInputs[s] = this.stageCache.get(s);
      }

      this._emit('PIPELINE_STARTED', { startStage, recipeState });

      // Run incremental pipeline
      const result = await PipelineRunner.run(recipeState, {
        startStage,
        cachedInputs,
        signal,
        onProgress: (stage, progress, artifact) => {
          this._emit('STAGE_PROGRESS', { stage, progress, artifact });
        }
      });

      if (signal.aborted) {
        return { aborted: true };
      }

      // Invalidate downstream and update stage cache with new stage outputs
      this.stageCache.invalidateFrom(startStage);
      for (let s = startStage; s <= 5; s++) {
        const stageArtifact = result['stage' + s] || (result.stages && result.stages[s]);
        if (stageArtifact) {
          this.stageCache.put(s, hashes[s], stageArtifact);
          this._emit('STAGE_COMPLETED', {
            stage: s,
            artifact: stageArtifact
          });
        }
      }

      const masterPaths = result.masterResult?.paths || result.masterPaths || [];
      const totalElapsed = Date.now() - startTime;
      this.telemetry.recordStage(5, 'PipelineTotal', totalElapsed, {
        startStage,
        strokesCount: masterPaths.length
      });

      this.lastResult = { ...result, masterPaths };
      this._emit('PIPELINE_COMPLETED', {
        result: this.lastResult,
        elapsedMs: totalElapsed
      });

      return this.lastResult;
    });
  }

  /**
   * Transfers master vector paths onto the virtual plate.
   * @param {Array} paths 
   * @param {'needle'|'dry'} [tool='needle'] 
   * @param {number} [size=2] 
   */
  transferToPlate(paths, tool = 'needle', size = 2) {
    const targetPaths = paths || this.lastResult?.masterPaths;
    if (targetPaths) {
      this.plateEngine.snapshot();
      this.plateEngine.applyMasterPaths(targetPaths, tool, size);
      this._emit('PLATE_UPDATED', { action: 'APPLY_MASTER_PATHS' });
    }
  }

  /**
   * Exports assets in SVG, G-Code, or JSON.
   * @param {'SVG'|'GCODE'|'RECIPE_JSON'} format 
   * @param {Object} [options={}] 
   * @returns {{ filename: string, mimeType: string, data: string, byteSize: number }}
   */
  exportAsset(format, options = {}) {
    const masterPaths = options.masterPaths || this.lastResult?.masterPaths;
    const recipe = options.recipe || this.lastResult?.recipe;
    return Exporter.exportPayload({
      format,
      masterPaths,
      recipe,
      options
    });
  }
}

const api = { Orchestrator };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Orchestrator = Orchestrator;
}


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = typeof api !== 'undefined' ? api : (root.Orchestrator || Orchestrator);
  }
  if (typeof root !== 'undefined') {
    if (typeof api !== 'undefined') {
      root.Orchestrator = api;
    }
    if (typeof Orchestrator !== 'undefined') {
      root.Orchestrator = Orchestrator;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
