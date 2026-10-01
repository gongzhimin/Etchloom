/* StageCache: Lightweight stage-level incremental caching for Etchloom v2.
 * Pure JavaScript, zero external dependencies, compatible with Node.js and Browser/Worker.
 */
(function(root) {
  'use strict';

  class StageCache {
    constructor() {
      this.entries = new Map(); // stageIndex -> { hash: string, output: any, timestamp: number }
    }

    /**
     * Compute a fast 32-bit DJB2 hash for a stage's parameter slice and its upstream hash.
     * @param {number} stageIndex
     * @param {Object} stageParams
     * @param {string} upstreamHash
     * @returns {string}
     */
    computeStageHash(stageIndex, stageParams, upstreamHash = '') {
      const serialized = stageParams ? JSON.stringify(stageParams) : '';
      let hash = 5381;
      const str = upstreamHash + '|' + stageIndex + ':' + serialized;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return (hash >>> 0).toString(36);
    }

    /**
     * Compare new hashes against cache and return the first invalidated stage (1..maxStage).
     * Returns maxStage + 1 if all stages hit the cache (zero computation needed).
     * @param {Record<number, string>} newHashes
     * @param {number} maxStage - default 5 (or 6 including plate)
     * @returns {number}
     */
    resolveInvalidation(newHashes, maxStage = 5) {
      for (let s = 1; s <= maxStage; s++) {
        const cached = this.entries.get(s);
        if (!cached || cached.hash !== newHashes[s]) {
          return s;
        }
      }
      return maxStage + 1;
    }

    /**
     * Retrieve cached stage artifact.
     * @param {number} stage
     * @returns {any|null}
     */
    get(stage) {
      const entry = this.entries.get(stage);
      return entry ? entry.output : null;
    }

    /**
     * Get the hash associated with a cached stage.
     * @param {number} stage
     * @returns {string|null}
     */
    getHash(stage) {
      const entry = this.entries.get(stage);
      return entry ? entry.hash : null;
    }

    /**
     * Check if a stage is present in the cache.
     * @param {number} stage
     * @returns {boolean}
     */
    has(stage) {
      return this.entries.has(stage);
    }

    /**
     * Store a stage's output and hash.
     * @param {number} stage
     * @param {string} hash
     * @param {any} output
     */
    put(stage, hash, output) {
      this.entries.set(stage, {
        hash,
        output,
        timestamp: Date.now()
      });
    }

    /**
     * Cascade-invalidate from a specified stage onwards.
     * @param {number} startStage
     * @param {number} maxStage
     */
    invalidateFrom(startStage, maxStage = 6) {
      for (let s = startStage; s <= maxStage; s++) {
        this.entries.delete(s);
      }
    }

    /**
     * Clear all cached stages.
     */
    clear() {
      this.entries.clear();
    }

    /**
     * Current cached stage count.
     */
    get size() {
      return this.entries.size;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StageCache;
  } else {
    root.StageCache = StageCache;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
