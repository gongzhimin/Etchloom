const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const SVG_PATH = path.join(ROOT_DIR, 'docs', 'images', 'etchloom-logo.svg');
const ICONS_DIR = path.join(ROOT_DIR, 'src-tauri', 'icons');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function generateIcons() {
  ensureDir(ICONS_DIR);
  const chromePath = findChrome();
  if (!chromePath) {
    console.error('Neither Chrome nor Edge was found for rendering icons.');
    return;
  }

  const svgContent = fs.readFileSync(SVG_PATH, 'utf8');
  const tempHtml = path.join(__dirname, 'temp-icon.html');
  const temp512 = path.join(ICONS_DIR, 'icon_512.png');

  const sizes = [
    { name: 'icon_512.png', size: 512 },
    { name: '128x128@2x.png', size: 256 },
    { name: '128x128.png', size: 128 },
    { name: '32x32.png', size: 32 }
  ];

  for (const item of sizes) {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: ${item.size}px;
  height: ${item.size}px;
  overflow: hidden;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
svg {
  width: ${item.size}px;
  height: ${item.size}px;
}
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

    fs.writeFileSync(tempHtml, html, 'utf8');
    const outPath = path.join(ICONS_DIR, item.name);
    try {
      execFileSync(chromePath, [
        '--headless=new',
        '--disable-gpu',
        '--default-background-color=00000000',
        `--window-size=${item.size},${item.size}`,
        `--screenshot=${outPath}`,
        `file://${tempHtml.replace(/\\/g, '/')}`
      ], { stdio: 'ignore' });
      console.log(`[Icon Generator] Created ${item.name} (${item.size}x${item.size})`);
    } catch (e) {
      console.error(`Failed to generate ${item.name}:`, e.message);
    }
  }

  // Remove temp HTML
  if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);

  // Now create icon.ico: an ICO file starts with a 6-byte header, then 16-byte directory entry per image, followed by PNG data.
  // Modern Windows (.ico) supports embedding PNG directly inside the ICO container!
  createIcoFromPngs([
    { size: 32, path: path.join(ICONS_DIR, '32x32.png') },
    { size: 128, path: path.join(ICONS_DIR, '128x128.png') },
    { size: 256, path: path.join(ICONS_DIR, '128x128@2x.png') }
  ], path.join(ICONS_DIR, 'icon.ico'));

  // Also copy 512 as icon.png
  if (fs.existsSync(temp512)) {
    fs.copyFileSync(temp512, path.join(ICONS_DIR, 'icon.png'));
  }

  console.log('[Icon Generator] All icons successfully generated in src-tauri/icons/');
}

function createIcoFromPngs(images, outputPath) {
  // ICO Header: Reserved (2 bytes, 0), Type (2 bytes, 1 for ICO), Count (2 bytes)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  const imageBuffers = [];
  let currentOffset = 6 + images.length * 16;

  for (const img of images) {
    const buf = fs.readFileSync(img.path);
    imageBuffers.push(buf);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0); // width: 0 means 256
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1); // height: 0 means 256
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buf.length, 8); // size of image data
    entry.writeUInt32LE(currentOffset, 12); // offset

    entries.push(entry);
    currentOffset += buf.length;
  }

  const icoBuffer = Buffer.concat([header, ...entries, ...imageBuffers]);
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`[Icon Generator] Created icon.ico (${(icoBuffer.length / 1024).toFixed(1)} KB)`);
}

if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };
