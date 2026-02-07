const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json','utf8'));

function findJsonFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const unitDir = 'public/data/units/battlemechs';
const files = findJsonFiles(unitDir);

for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    const crits = JSON.stringify(d.criticalSlots || {});
    if (!crits.toLowerCase().includes('partialwing') && !crits.toLowerCase().includes('partial wing')) continue;
    const hasJJ = (d.movement.jump || 0) > 0;
    const result = r.allResults.find(x => x.unitId === d.id);
    const diffStr = result ? result.percentDiff.toFixed(1) + '%' : 'N/A';
    if (!hasJJ) {
      console.log('PW+NoJJ:', d.chassis, d.model, 'jump=' + (d.movement.jump||0), 'diff=' + diffStr);
    }
  } catch {}
}
