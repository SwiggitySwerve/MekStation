import * as fs from 'fs';
import * as path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const cc: Record<string, number> = {};
for (const u of idx.units) {
  if (!u.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', u.path), 'utf-8'));
    const c = d.cockpit || 'MISSING';
    cc[c] = (cc[c] || 0) + 1;
  } catch {}
}
for (const [k, v] of Object.entries(cc).sort((a: [string, number], b: [string, number]) => b[1] - a[1])) {
  console.log(`${k}: ${v}`);
}
