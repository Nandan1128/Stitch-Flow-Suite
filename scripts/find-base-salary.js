const fs = require('fs');
const path = require('path');

const IGNORES = ['node_modules', '.git', 'dist', 'build', 'out', 'coverage'];

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORES.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      searchDir(full);
      continue;
    }
    if (!full.match(/\.(js|ts|jsx|tsx|json|md|html)$/i)) continue;
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.includes('base_salary')) {
        console.log(`${full}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}

const root = path.resolve(__dirname, '..');
console.log('Searching for "base_salary" in', root);
searchDir(root);
console.log('Search complete.');
