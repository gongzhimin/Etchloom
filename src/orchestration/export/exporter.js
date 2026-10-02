(function(root) {
  'use strict';

/**
 * Industrial Multi-Format Exporter (M4 工业导出器)
 * Generates layered SVG, standard CNC G-code, JSON recipes, and metadata.
 * Pure Node.js / Browser universal, zero DOM dependencies.
 */
/**
 * Exports paths to a clean, layered SVG.
 * 
 * @param {Array|Object} masterPaths Array of paths or { contours: [], hatchings: [] }
 * @param {Object} [options={}]
 * @param {number} [options.width=900]
 * @param {number} [options.height=660]
 * @param {string} [options.strokeColor='#111111']
 * @returns {string} SVG XML content
 */
function exportSVG(masterPaths, options = {}) {
  const width = options.width || 900;
  const height = options.height || 660;
  const strokeColor = options.strokeColor || '#111111';

  let contours = [];
  let hatchings = [];

  if (Array.isArray(masterPaths)) {
    for (const p of masterPaths) {
      if (p.role === 'contour' || p.type === 'contour') {
        contours.push(p);
      } else {
        hatchings.push(p);
      }
    }
  } else if (masterPaths && typeof masterPaths === 'object') {
    contours = masterPaths.contours || [];
    hatchings = masterPaths.hatchings || [];
    if (!contours.length && !hatchings.length && Array.isArray(masterPaths.paths)) {
      hatchings = masterPaths.paths;
    }
  }

  const renderPaths = (pathList, defaultWidth = 1.0) => {
    return pathList.map(p => {
      const pts = p.points || p;
      if (!Array.isArray(pts) || pts.length < 2) return '';
      const w = (p.width ?? defaultWidth).toFixed(2);
      const d = pts.map((pt, idx) => {
        const x = (pt[0] ?? pt.x).toFixed(2);
        const y = (pt[1] ?? pt.y).toFixed(2);
        return idx === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      }).join(' ');
      return `      <path d="${d}" stroke-width="${w}" />`;
    }).filter(Boolean).join('\n');
  };

  const contoursXml = renderPaths(contours, 1.2);
  const hatchingsXml = renderPaths(hatchings, 0.8);

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    path { fill: none; stroke: ${strokeColor}; stroke-linecap: round; stroke-linejoin: round; }
  </style>
  <g id="etchloom-layers">
    <g id="contours">
${contoursXml}
    </g>
    <g id="hatchings">
${hatchingsXml}
    </g>
  </g>
</svg>`;
}

/**
 * Exports paths to standard CNC / Pen Plotter G-Code.
 * Uses standard G00 (rapid travel), G01 (linear cut), G28 (home/reference), and M02.
 * 
 * @param {Array|Object} masterPaths 
 * @param {Object} [options={}]
 * @param {number} [options.feedRate=1200] Cut feed rate (mm/min)
 * @param {number} [options.travelHeight=2.0] Tool travel clearance height (mm)
 * @param {number} [options.engraveDepth=0.0] Cut engrave depth (mm)
 * @param {number} [options.scale=1.0] Coordinate scaling factor
 * @returns {string} Standard G-Code text
 */
function exportGCode(masterPaths, options = {}) {
  const feedRate = options.feedRate ?? options.gcodeSpeed ?? 1200;
  const zTravel = options.travelHeight ?? options.gcodeZTravel ?? 2.0;
  const zCut = options.engraveDepth ?? options.gcodeZEngrave ?? 0.0;
  const scale = options.scale ?? 1.0;

  const paths = Array.isArray(masterPaths)
    ? masterPaths
    : [...(masterPaths?.contours || []), ...(masterPaths?.hatchings || masterPaths?.paths || [])];

  const lines = [
    '; Etchloom CNC Master Engraving G-Code',
    'G21 ; millimeters',
    'G90 ; absolute positioning',
    'G28 ; home all axes',
    `G00 Z${zTravel.toFixed(2)} ; lift tool to travel clearance`
  ];

  for (const path of paths) {
    const pts = path.points || path;
    if (!Array.isArray(pts) || pts.length < 2) continue;

    const startX = ((pts[0][0] ?? pts[0].x) * scale).toFixed(2);
    const startY = ((pts[0][1] ?? pts[0].y) * scale).toFixed(2);

    lines.push(`G00 X${startX} Y${startY}`);
    lines.push(`G01 Z${zCut.toFixed(2)} F${feedRate}`);

    for (let i = 1; i < pts.length; i++) {
      const x = ((pts[i][0] ?? pts[i].x) * scale).toFixed(2);
      const y = ((pts[i][1] ?? pts[i].y) * scale).toFixed(2);
      lines.push(`G01 X${x} Y${y}`);
    }

    lines.push(`G00 Z${zTravel.toFixed(2)}`);
  }

  lines.push('G28 ; home axes');
  lines.push('M02 ; program end');
  return lines.join('\n');
}

/**
 * Exports recipe configuration to JSON format.
 * 
 * @param {Object} recipe 
 * @returns {string}
 */
function exportRecipeJSON(recipe) {
  return JSON.stringify(recipe, null, 2);
}

/**
 * Unified export dispatcher.
 * 
 * @param {Object} request
 * @param {'SVG'|'GCODE'|'RECIPE_JSON'} request.format
 * @param {Array|Object} [request.masterPaths]
 * @param {Object} [request.recipe]
 * @param {Object} [request.options]
 * @returns {{ filename: string, mimeType: string, data: string, byteSize: number }}
 */
function getByteLength(str) {
  if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
    return Buffer.byteLength(str, 'utf8');
  }
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return str.length;
}

function exportPayload(request) {
  const { format, masterPaths, recipe, options = {} } = request;
  const timestamp = Date.now();

  switch (format) {
    case 'SVG': {
      const data = exportSVG(masterPaths, options);
      return {
        filename: `etchloom-master-${timestamp}.svg`,
        mimeType: 'image/svg+xml',
        data,
        byteSize: getByteLength(data)
      };
    }
    case 'GCODE': {
      const data = exportGCode(masterPaths, options);
      return {
        filename: `etchloom-master-${timestamp}.gcode`,
        mimeType: 'text/x-gcode',
        data,
        byteSize: getByteLength(data)
      };
    }
    case 'RECIPE_JSON': {
      const data = exportRecipeJSON(recipe || {});
      return {
        filename: `etchloom-recipe-${timestamp}.json`,
        mimeType: 'application/json',
        data,
        byteSize: getByteLength(data)
      };
    }
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

  const api = {
    exportSVG,
    exportGCode,
    exportRecipeJSON,
    exportPayload
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Exporter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
