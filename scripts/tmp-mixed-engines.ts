import * as fs from 'fs';
import * as path from 'path';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json','utf8'));
const types = new Map<string, number>();
for (const u of idx.units) {
  if (!u.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', u.path),'utf8'));
    if (d.techBase === 'MIXED') {
      const key = d.engine.type;
      types.set(key, (types.get(key)||0)+1);
    }
  } catch {}
}
for (const [k,v] of [...types.entries()].sort((a,b)=>b[1]-a[1])) console.log(`${v} "${k}"`);
