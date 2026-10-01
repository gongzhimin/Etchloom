const { test } = require('node:test');
const assert = require('node:assert/strict');
const Exporter = require('../src/orchestration/export/exporter.js');

test('Exporter: Layered SVG generation', () => {
  const samplePaths = [
    { type: 'contour', points: [[10, 10], [20, 20], [30, 15]], width: 1.5 },
    { type: 'hatching', points: [[50, 50], [60, 60]], width: 0.8 }
  ];

  const svg = Exporter.exportSVG(samplePaths, { width: 900, height: 660 });

  assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="660"'));
  assert.ok(svg.includes('<g id="contours">'));
  assert.ok(svg.includes('<g id="hatchings">'));
  assert.ok(svg.includes('M 10.00 10.00 L 20.00 20.00 L 30.00 15.00'));
  assert.ok(svg.includes('M 50.00 50.00 L 60.00 60.00'));
  assert.ok(svg.includes('</svg>'));
});

test('Exporter: CNC G-Code generation', () => {
  const samplePaths = [
    { points: [[10.5, 20.5], [30.5, 40.5]] }
  ];

  const gcode = Exporter.exportGCode(samplePaths, {
    feedRate: 1500,
    travelHeight: 3.0,
    engraveDepth: -0.2
  });

  assert.ok(gcode.includes('G21 ; millimeters'));
  assert.ok(gcode.includes('G90 ; absolute positioning'));
  assert.ok(gcode.includes('G28 ; home all axes'));
  assert.ok(gcode.includes('G00 Z3.00'));
  assert.ok(gcode.includes('G00 X10.50 Y20.50'));
  assert.ok(gcode.includes('G01 Z-0.20 F1500'));
  assert.ok(gcode.includes('G01 X30.50 Y40.50'));
  assert.ok(gcode.includes('M02 ; program end'));
  assert.ok(!gcode.includes('NaN'));
});

test('Exporter: Recipe JSON serialization', () => {
  const recipe = { version: 2, mode: 'wind', params: { density: 50 } };
  const json = Exporter.exportRecipeJSON(recipe);
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.params.density, 50);
});

test('Exporter: exportPayload dispatcher', () => {
  const samplePaths = [{ points: [[0, 0], [10, 10]] }];
  const svgPayload = Exporter.exportPayload({ format: 'SVG', masterPaths: samplePaths });
  assert.match(svgPayload.filename, /^etchloom-master-\d+\.svg$/);
  assert.equal(svgPayload.mimeType, 'image/svg+xml');
  assert.ok(svgPayload.byteSize > 0);

  const gcodePayload = Exporter.exportPayload({ format: 'GCODE', masterPaths: samplePaths });
  assert.match(gcodePayload.filename, /^etchloom-master-\d+\.gcode$/);
  assert.equal(gcodePayload.mimeType, 'text/x-gcode');

  const jsonPayload = Exporter.exportPayload({ format: 'RECIPE_JSON', recipe: { id: 1 } });
  assert.match(jsonPayload.filename, /^etchloom-recipe-\d+\.json$/);
  assert.equal(jsonPayload.mimeType, 'application/json');
});
