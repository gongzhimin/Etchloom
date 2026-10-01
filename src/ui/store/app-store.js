(function(root) {
  'use strict';

/**
 * AppStore: Unidirectional reactive state management for Etchloom v2.
 * Pure JavaScript, zero external dependencies.
 */
const DEFAULT_STATE = {
  locale: 'zh-CN',
  activeWorkflow: 'master', // 'master' | 'plate'
  recipe: {
    lineThreshold: 50,
    lineNoiseSuppression: 2,
    toneContrast: 1.0,
    toneBrightness: 0.0,
    flowSmoothing: 2,
    contourDetail: 1.0,
    contourSimplify: 1.0,
    density: 50,
    angle: 45,
    crossHatch: false,
    waviness: 0,
    needleWidth: 1.0,
    inkGain: 0,
    acidStrength: 0.45,
    grain: 0.45,
    ink: 0.90,
    pressure: 0.65,
    plateTone: 0.04,
    paper: 'rough'
  },
  sourceImage: null,
  geometry: null,
  stepFlow: {
    activeStepIndex: 0,
    zoomLevels: [1, 1, 1, 1, 1, 1, 1],
    fullscreenStep: null,
    loupeActive: false
  },
  artifacts: {
    stage0Source: null,
    stage1LineMap: null,
    stage2FlowField: null,
    stage3Contours: null,
    stage4Hatching: null,
    stage5Master: null,
    stage6Plate: null
  },
  runtime: {
    status: 'IDLE',
    currentStage: 0,
    progress: 0,
    metrics: {}
  }
};

class AppStore {
  /**
   * @param {Object} [initialState={}]
   */
  constructor(initialState = {}) {
    this.state = {
      ...DEFAULT_STATE,
      ...initialState,
      recipe: { ...DEFAULT_STATE.recipe, ...(initialState.recipe || {}) },
      stepFlow: { ...DEFAULT_STATE.stepFlow, ...(initialState.stepFlow || {}) },
      artifacts: { ...DEFAULT_STATE.artifacts, ...(initialState.artifacts || {}) },
      runtime: { ...DEFAULT_STATE.runtime, ...(initialState.runtime || {}) }
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  /**
   * Dispatches an action and notifies subscribers if state changed.
   * @param {Object} action 
   */
  dispatch(action) {
    if (!action || !action.type) return;
    const prevState = this.state;
    this.state = this.reduce(this.state, action);
    if (this.state !== prevState) {
      this.notify(action);
    }
  }

  /**
   * Subscribes a listener to state mutations.
   * @param {Function} listener (state: Object, action: Object) => void
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(action) {
    for (const listener of this.listeners) {
      try {
        listener(this.state, action);
      } catch (err) {
        console.error('AppStore subscriber error:', err);
      }
    }
  }

  reduce(state, action) {
    switch (action.type) {
      case 'SET_LOCALE':
        return { ...state, locale: action.locale };

      case 'SET_WORKFLOW':
        return { ...state, activeWorkflow: action.workflow };

      case 'SET_SOURCE_IMAGE':
        return { ...state, sourceImage: action.sourceImage };

      case 'SET_RECIPE_PARAM':
        return {
          ...state,
          recipe: { ...state.recipe, [action.key]: action.value }
        };

      case 'SET_RECIPE':
        return {
          ...state,
          recipe: { ...state.recipe, ...action.recipe }
        };

      case 'SET_STAGE_ARTIFACT':
        return {
          ...state,
          artifacts: { ...state.artifacts, [action.stageKey]: action.artifact }
        };

      case 'UPDATE_RUNTIME':
        return {
          ...state,
          runtime: { ...state.runtime, ...action.payload }
        };

      case 'FOCUS_STEP':
        return {
          ...state,
          stepFlow: { ...state.stepFlow, activeStepIndex: action.index }
        };

      case 'TOGGLE_LOUPE':
        return {
          ...state,
          stepFlow: { ...state.stepFlow, loupeActive: !state.stepFlow.loupeActive }
        };

      default:
        return state;
    }
  }
}

const api = {
  DEFAULT_STATE,
  AppStore
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof globalThis !== 'undefined') {
  globalThis.AppStore = AppStore;
}


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = typeof api !== 'undefined' ? api : (root.AppStoreModule || AppStore);
  }
  if (typeof root !== 'undefined') {
    if (typeof api !== 'undefined') {
      root.AppStoreModule = api;
    }
    if (typeof AppStore !== 'undefined') {
      root.AppStore = AppStore;
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
