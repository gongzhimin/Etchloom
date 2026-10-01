/* Standard Pipeline Types and Contracts for Etchloom v2 Five-Stage Printmaking Pipeline. */
(function(root){
  'use strict';

  const PipelineTypes = {
    createLineMap(width, height, data) {
      return { width, height, data: data || new Float32Array(width * height) };
    },
    createToneField(width, height, tone) {
      return { width, height, tone: tone || new Float32Array(width * height) };
    },
    createFlowField(width, height) {
      const n = width * height;
      return {
        width,
        height,
        vx: new Float32Array(n),
        vy: new Float32Array(n),
        coherence: new Float32Array(n)
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PipelineTypes;
  } else {
    root.PipelineTypes = PipelineTypes;
  }
})(globalThis);
