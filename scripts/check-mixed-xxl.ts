import * as fs from 'fs';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json','utf8'));
for (const u of idx.units) {
  if (!u.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync('public/data/units/battlemechs/' + u.path, 'utf8'));
    if (d.techBase === 'MIXED' && d.engine?.type?.toUpperCase().includes('XXL')) {
      console.log(`${u.id}: engine=${d.engine.type} rating=${d.engine.rating}`);
    }
  } catch {}
}
