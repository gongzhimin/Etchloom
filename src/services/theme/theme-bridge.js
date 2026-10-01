(function(root) {
  'use strict';

  /**
   * ThemeBridge Service (主题桥接服务)
   * Resolves active CSS variable tokens at runtime to bridge styling with
   * Canvas and SVG render engines. Provides deterministic fallbacks for
   * Node.js, headless testing, and environments where CSS is not yet parsed.
   */

  const DEFAULT_RENDER_THEME = Object.freeze({
    paperGround: '#faf7f0',       // Archival cotton rag paper
    plateGround: '#1e2220',       // Classical dark engraving plate
    inkPrimary: '#1a1918',        // Traditional carbon black printmaking ink
    contourGold: '#c8b67e',       // Atmospheric perspective contour gold nuance
    hatchSage: '#b4c0ab',         // Surface curvature hatching sage nuance
    masterPaper: '#fcfbf8',       // Ivory white master vector ground
    copperGround: '#b87333',      // Physical polished copperplate tone
    cardPlaceholder: '#faf8f5',   // Warm linen card background
    textPrimary: '#2a2b2a',       // Primary charcoal typography
    borderSubtle: '#eae5dc'       // Subtle border color
  });

  const TOKEN_CSS_MAP = Object.freeze({
    paperGround: '--render-paper-ground',
    plateGround: '--render-plate-ground',
    inkPrimary: '--render-ink-primary',
    contourGold: '--render-contour-gold',
    hatchSage: '--render-hatch-sage',
    masterPaper: '--render-master-paper',
    copperGround: '--render-copper-ground',
    cardPlaceholder: '--bg-app',
    textPrimary: '--text-primary',
    borderSubtle: '--border-subtle'
  });

  /**
   * Reads a single CSS variable value from document.documentElement.
   * @param {string} varName - CSS variable name, e.g. '--render-paper-ground'
   * @param {string} [fallback='']
   * @returns {string} Trimmed CSS variable value or fallback
   */
  function getThemeToken(varName, fallback = '') {
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && window.getComputedStyle && document.documentElement) {
      try {
        const val = window.getComputedStyle(document.documentElement).getPropertyValue(varName)?.trim();
        if (val) return val;
      } catch (_) {
        // Fallback for unexpected context
      }
    }
    return fallback;
  }

  /**
   * Retrieves current render theme color tokens for Canvas and SVG renderers.
   * Bridges CSS theme styling with imperative Canvas/SVG rendering.
   * @returns {Object} Key-value map of render colors
   */
  function getRenderTheme() {
    const theme = {};
    for (const [key, cssVar] of Object.entries(TOKEN_CSS_MAP)) {
      theme[key] = getThemeToken(cssVar, DEFAULT_RENDER_THEME[key]);
    }
    return theme;
  }

  const ThemeBridge = {
    getThemeToken,
    getRenderTheme,
    DEFAULT_RENDER_THEME
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeBridge;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.ThemeBridge = ThemeBridge;
  }
  if (typeof root !== 'undefined') {
    root.ThemeBridge = ThemeBridge;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
