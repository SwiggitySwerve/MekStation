const fs = require('fs');
const path = require('path');

const coverage = JSON.parse(
  fs.readFileSync('coverage/coverage-summary.json', 'utf8'),
);

const results = [];
for (const [file, data] of Object.entries(coverage)) {
  if (file === 'total') continue;

  // Normalize path
  const relPath = file.replace(/.*[\\\/]src[\\\/]/, 'src/').replace(/\\/g, '/');

  // Skip test files
  if (
    relPath.includes('__tests__') ||
    relPath.includes('.test.') ||
    relPath.includes('.stories.')
  )
    continue;
  if (relPath.includes('node_modules')) continue;

  const stmtPct = data.statements.pct;
  const lines = data.statements.total;

  // Files with 1-59% coverage and >20 lines
  if (lines > 20 && stmtPct > 0 && stmtPct < 60) {
    results.push({
      file: relPath,
      stmts: stmtPct,
      branches: data.branches.pct,
      funcs: data.functions.pct,
      lines: lines,
    });
  }
}

results.sort((a, b) => a.stmts - b.stmts || b.lines - a.lines);

console.log('FILE|STMTS|BRANCH|FUNCS|LINES');
results.slice(0, 50).forEach((r) => {
  console.log(`${r.file}|${r.stmts}|${r.branches}|${r.funcs}|${r.lines}`);
});
