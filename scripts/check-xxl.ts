import * as fs from 'fs';
import * as path from 'path';
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const over = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2);
for (const u of over) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const eng = (unit.engine?.type || '').toUpperCase();
    if (eng.includes('XXL')) {
      console.log(`${u.unitId}: engine=${unit.engine.type} tech=${unit.techBase} +${u.percentDiff.toFixed(1)}%`);
    }
  } catch {}
}
