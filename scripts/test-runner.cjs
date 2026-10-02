const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = path.resolve(__dirname, '..', 'tests');
const testFiles = fs.readdirSync(testsDir)
  .filter(f => f.endsWith('.test.cjs'))
  .map(f => path.join('tests', f));

const result = spawnSync(process.execPath, ['--no-warnings', '--test', ...testFiles], {
  stdio: 'inherit',
  env: process.env
});

process.exit(result.status ?? 0);
