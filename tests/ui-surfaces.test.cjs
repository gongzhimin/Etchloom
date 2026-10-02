const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles', 'app.css'), 'utf8');

function ruleContaining(selector, marker) {
  let start = css.indexOf(`${selector} {`);
  while (start >= 0) {
    const end = css.indexOf('}', start) + 1;
    const rule = css.slice(start, end);
    if (rule.includes(marker)) return rule;
    start = css.indexOf(`${selector} {`, end);
  }
  assert.fail(`Missing CSS rule for ${selector} containing ${marker}`);
}

test('master workspace and plate area have light neutral bases', () => {
  assert.match(ruleContaining('#masterWorkspace.master-workspace-wrap', '--atelier-linen-base'), /background-color: var\(--atelier-linen-base\)/);
  assert.match(ruleContaining('.master-entry-content', '--atelier-paper-face'), /background: linear-gradient\([^;]*--atelier-paper-face/);
  assert.match(ruleContaining('.plate-main', 'background: var(--bg-app)'), /background: var\(--bg-app\)/);
  assert.doesNotMatch(ruleContaining('.plate-main', 'background: var(--bg-app)'), /oak-workbench/);
});

test('oak texture is confined to the copperplate frame', () => {
  const image = path.join(__dirname, '..', 'docs', 'images', 'oak-workbench.png');
  assert.ok(fs.statSync(image).size > 100_000);
  const frame = ruleContaining('.plate-canvas-frame', "url('../docs/images/oak-workbench.png')");
  assert.match(frame, /background-size: auto, cover/);
  assert.match(frame, /max-width: 100%/);
  assert.match(frame, /rgba\(255, 251, 243, 0\.55\)/);
  assert.match(frame, /border: 1px solid #ad9476/);
  assert.doesNotMatch(frame, /0 0 0 1px rgba\(255, 255, 255/);
  const plate = ruleContaining('.plate-canvas-frame canvas', '0 14px 24px');
  assert.match(plate, /border: 1px solid rgba\(74, 49, 34, 0\.68\)/);
  assert.doesNotMatch(plate, /0 0 0 3px rgba\(252, 247, 239/);
});

test('workbench caption separates status from description', () => {
  const rule = ruleContaining('.plate-caption', 'column-gap: 18px');
  assert.match(rule, /flex-wrap: wrap/);
  assert.match(rule, /row-gap: 4px/);
});

test('master hero viewport and result elements are strictly hidden when not ready', () => {
  assert.match(css, /\.master-hero-viewport\[hidden\][\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /body:not\(\[data-master-screen="ready"\]\)[\s\S]*?display:\s*none\s*!important/);
  // Ensure mobile media query does not forcefully override hidden with display: flex !important
  const mobileViewportIdx = css.indexOf('@media (max-width: 760px)');
  assert.ok(mobileViewportIdx > 0);
  const mobileSection = css.slice(mobileViewportIdx);
  const mobileHeroMatch = mobileSection.match(/\.master-hero-viewport\s*\{([^}]+)\}/);
  assert.ok(mobileHeroMatch, 'Mobile master-hero-viewport rule found');
  assert.doesNotMatch(mobileHeroMatch[1], /display:\s*flex\s*!important/, 'Mobile master-hero-viewport must not use display: flex !important');
});

