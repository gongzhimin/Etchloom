const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { prepareDesktop } = require('../scripts/prepare-desktop.cjs');

test('Desktop Packaging: prepare-desktop creates minimal, complete dist bundle', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');

  prepareDesktop();

  assert.ok(fs.existsSync(distDir), 'dist/ directory must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'index.html')), 'dist/index.html must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'styles', 'app.css')), 'dist/styles/app.css must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'src', 'main.js')), 'dist/src/main.js must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'docs', 'images', 'etchloom-logo.svg')), 'dist logo must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'docs', 'images', 'oak-workbench.png')), 'dist workbench texture must exist');
  assert.strictEqual(fs.existsSync(path.join(distDir, 'docs', 'images', 'legacy')), false, 'historical screenshots must not be bundled');
  assert.strictEqual(fs.existsSync(path.join(distDir, 'docs', 'images', 'etchloom-two-stage-layout.svg')), false, 'README diagrams must not be bundled');

  // Verify models and ONNX Runtime are bundled for 100% offline standalone execution
  assert.ok(fs.existsSync(path.join(distDir, 'models')), 'dist/models must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'informative-drawings.onnx')), 'informative-drawings.onnx must exist in dist/models');
  assert.ok(fs.statSync(path.join(distDir, 'models', 'informative-drawings.onnx')).size > 1000000, 'informative-drawings.onnx must be non-empty');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'midas-small.onnx')), 'midas-small.onnx must exist in dist/models');
  assert.ok(fs.statSync(path.join(distDir, 'models', 'midas-small.onnx')).size > 1000000, 'midas-small.onnx must be non-empty');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'ort.min.js')), 'ort.min.js must exist in dist/models for offline execution');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'ort-wasm-simd-threaded.wasm')), 'ort-wasm-simd-threaded.wasm must exist in dist/models for offline execution');

  // Verify heavy files are NOT included
  assert.strictEqual(fs.existsSync(path.join(distDir, 'services')), false, 'services/ must not be in dist');
  assert.strictEqual(fs.existsSync(path.join(distDir, 'tests')), false, 'tests/ must not be in dist');
  assert.strictEqual(fs.existsSync(path.join(distDir, 'archive')), false, 'archive/ must not be in dist');

  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('src="./src/main.js"') || indexHtml.includes('src="src/main.js"'), 'index.html must reference main.js correctly');
  assert.ok(indexHtml.includes('href="styles/app.css"'), 'index.html must reference app.css correctly');
});

test('Desktop Packaging: Tauri configuration and icon assets are present and valid', () => {
  const rootDir = path.resolve(__dirname, '..');
  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
  const iconsDir = path.join(rootDir, 'src-tauri', 'icons');

  assert.ok(fs.existsSync(tauriConfPath), 'tauri.conf.json must exist');
  assert.ok(fs.existsSync(cargoTomlPath), 'Cargo.toml must exist');

  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  assert.strictEqual(tauriConf.productName, 'Etchloom');
  assert.strictEqual(tauriConf.build.frontendDist, '../dist');

  const expectedIcons = ['32x32.png', '128x128.png', '128x128@2x.png', 'icon_512.png', 'icon.ico'];
  for (const icon of expectedIcons) {
    const iconPath = path.join(iconsDir, icon);
    assert.ok(fs.existsSync(iconPath), `Icon ${icon} must exist`);
    assert.ok(fs.statSync(iconPath).size > 0, `Icon ${icon} must not be empty`);
  }
});

test('Mobile Packaging: prepare-desktop --android omits WebGPU JSEP to optimize APK size while keeping full-precision models', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');

  prepareDesktop({ android: true });

  assert.ok(fs.existsSync(distDir), 'dist/ directory must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'informative-drawings.onnx')), 'informative-drawings.onnx must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'midas-small.onnx')), 'midas-small.onnx must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'ort.min.js')), 'ort.min.js must exist');
  assert.ok(fs.existsSync(path.join(distDir, 'models', 'ort-wasm-simd-threaded.wasm')), 'ort-wasm-simd-threaded.wasm must exist');
  assert.strictEqual(fs.existsSync(path.join(distDir, 'models', 'ort-wasm-simd-threaded.jsep.wasm')), false, 'jsep.wasm must not be included in android apk');

  // Restore desktop bundle for subsequent steps
  prepareDesktop();
});

