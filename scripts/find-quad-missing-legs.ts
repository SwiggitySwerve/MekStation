import * as fs from 'fs';
import * as path from 'path';

function findJson(dir: string): string[] {
  const results: string[] = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) results.push(...findJson(full));
    else if (f.name.endsWith('.json') && f.name !== 'index.json') results.push(full);
  }
  return results;
}

const base = 'public/data/units/battlemechs';
const files = findJson(base);
let missing = 0;
const issues: string[] = [];

for (const f of files) {
  const u = JSON.parse(fs.readFileSync(f, 'utf-8'));
  if (u.configuration !== 'Quad') continue;
  const keys = Object.keys(u.criticalSlots || {});
  const hasRearLegs = keys.some(k => k.toUpperCase().includes('REAR') && k.toUpperCase().includes('LEG'));
  if (!hasRearLegs) {
    missing++;
    issues.push(`${u.chassis} ${u.model} (${u.id})`);
  }
}

console.log('Quad mechs missing rear leg entries:', missing);
for (const i of issues) console.log(' ', i);
