/* TelemetrySink: Non-blocking performance metrics and observability collector for Etchloom v2.
 * Pure JavaScript, zero external dependencies.
 */
(function(root) {
  'use strict';

  class TelemetrySink {
    constructor() {
      this.listeners = new Set();
      this.currentMetrics = {
        totalElapsedMs: 0,
        stageTimings: {},
        stats: {},
        lastUpdated: Date.now()
      };
    }

    /**
     * Subscribe to telemetry samples.
     * @param {Function} listener - (sample: Object) => void
     * @returns {Function} unsubscribe
     */
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    /**
     * Record metrics for a specific pipeline stage.
     * @param {number} stageIndex - 0..6
     * @param {string} stageName
     * @param {number} durationMs
     * @param {Object} [extraStats={}]
     */
    recordStage(stageIndex, stageName, durationMs, extraStats = {}) {
      this.currentMetrics.stageTimings[stageIndex] = {
        name: stageName,
        durationMs: Number(durationMs.toFixed(2)),
        timestamp: Date.now()
      };

      if (extraStats && Object.keys(extraStats).length > 0) {
        this.currentMetrics.stats[stageIndex] = { ...extraStats };
      }

      this.currentMetrics.totalElapsedMs = Object.values(this.currentMetrics.stageTimings)
        .reduce((sum, s) => sum + s.durationMs, 0);
      this.currentMetrics.lastUpdated = Date.now();

      const sample = {
        type: 'TELEMETRY_SAMPLE',
        stageIndex,
        stageName,
        durationMs,
        extraStats,
        snapshot: this.getSnapshot()
      };

      for (const listener of this.listeners) {
        try {
          listener(sample);
        } catch (_) {}
      }
    }

    /**
     * Get snapshot of currently accumulated metrics.
     * @returns {Object}
     */
    getSnapshot() {
      return {
        totalElapsedMs: Number(this.currentMetrics.totalElapsedMs.toFixed(2)),
        stageTimings: { ...this.currentMetrics.stageTimings },
        stats: { ...this.currentMetrics.stats },
        lastUpdated: this.currentMetrics.lastUpdated
      };
    }

    /**
     * Reset metrics.
     */
    reset() {
      this.currentMetrics = {
        totalElapsedMs: 0,
        stageTimings: {},
        stats: {},
        lastUpdated: Date.now()
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelemetrySink;
  } else {
    root.TelemetrySink = TelemetrySink;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
