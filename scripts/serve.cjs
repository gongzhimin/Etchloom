// Dependency-free local preview used by `npm start`.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const publicFiles = new Set(['index.html']);
const publicDirectories = ['src/', 'styles/', 'docs/images/', 'models/'];
function isPublicPath(name) {
  const publicPath = name.replace(/\\/g, '/');
  return publicFiles.has(publicPath) || publicDirectories.some(dir => publicPath.startsWith(dir));
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm'
};
function createPreviewServer() {
  return http.createServer((req, res) => {
  let name;
  try {
    name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  } catch (_) {
    res.writeHead(400); res.end(); return;
  }
  if (!isPublicPath(name)) {
    res.writeHead(404); res.end(); return;
  }
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) || !mime[path.extname(file).toLowerCase()] || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file).toLowerCase()],
    'Cache-Control': 'no-store',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  });
  fs.createReadStream(file).pipe(res);
  });
}

if (require.main === module) {
  createPreviewServer().listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173'));
}

module.exports = { createPreviewServer };

