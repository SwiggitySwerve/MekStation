import * as fs from 'fs';
import * as path from 'path';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
for (const u of idx.units) {
  if (!u.path) continue;
  if (!u.name || !u.name.toLowerCase().includes('celerity')) continue;
  const d = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', u.path), 'utf-8'));
  console.log(`${d.chassis} ${d.model || ''} | cockpit: ${d.cockpit} | gyro: ${d.gyro?.type}`);
}
