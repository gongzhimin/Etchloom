const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      // Ignore cache, dev docs and markdown files in distribution package
      if (entry === '.git' || entry === 'node_modules' || entry === '__pycache__' || entry.endsWith('.pyc') || entry === 'docs' || entry.endsWith('.md')) {
        continue;
      }
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function calculateDirSize(dir) {
  let totalBytes = 0;
  let fileCount = 0;

  function traverse(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        totalBytes += fs.statSync(fullPath).size;
        fileCount++;
      }
    }
  }

  traverse(dir);
  return { totalBytes, fileCount };
}

function prepareDesktop() {
  console.log('[Tauri Packager] Preparing clean desktop distribution package in dist/...');

  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // 1. Copy root index.html
  const indexSrc = path.join(ROOT_DIR, 'index.html');
  const indexDest = path.join(DIST_DIR, 'index.html');
  fs.copyFileSync(indexSrc, indexDest);

  // 2. Copy styles/
  copyRecursive(path.join(ROOT_DIR, 'styles'), path.join(DIST_DIR, 'styles'));

  // 3. Copy src/ (core, ui, orchestration, services/client)
  copyRecursive(path.join(ROOT_DIR, 'src'), path.join(DIST_DIR, 'src'));

  // 4. Copy only image assets referenced by the application at runtime.
  const imagesSrc = path.join(ROOT_DIR, 'docs', 'images');
  if (fs.existsSync(imagesSrc)) {
    const imagesDest = path.join(DIST_DIR, 'docs', 'images');
    fs.mkdirSync(imagesDest, { recursive: true });
    for (const name of ['etchloom-logo.svg', 'oak-workbench.png']) {
      fs.copyFileSync(path.join(imagesSrc, name), path.join(imagesDest, name));
    }
  }

  // 5. Copy models/ (Informative Drawings line extraction & MiDaS v2.1 depth estimation)
  const modelsSrc = path.join(ROOT_DIR, 'models');
  if (fs.existsSync(modelsSrc)) {
    const modelsDest = path.join(DIST_DIR, 'models');
    copyRecursive(modelsSrc, modelsDest);
  }

  const { totalBytes, fileCount } = calculateDirSize(DIST_DIR);
  const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
  const sizeKb = (totalBytes / 1024).toFixed(1);

  console.log(`[Tauri Packager] SUCCESS: Assembled ${fileCount} web runtime files into dist/`);
  console.log(`[Tauri Packager] Total Distribution Payload: ${sizeKb} KB (~${sizeMb} MB)`);
  console.log('[Tauri Packager] Zero dependencies and zero Python weight bundled.');
}

if (require.main === module) {
  prepareDesktop();
}

module.exports = { prepareDesktop };
