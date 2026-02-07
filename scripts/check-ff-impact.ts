import * as fs from 'fs';
import * as path from 'path';
const oldR = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Find units that were previously exact or within1% and see their armor type
const exactUnits = oldR.allResults.filter((x: any) => x.status === 'exact' || x.status === 'within1');
const byArmorType: Record<string, number> = {};
const ffExact: string[] = [];
for (const u of exactUnits) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const at = d.armor?.type || 'STANDARD';
    byArmorType[at] = (byArmorType[at] || 0) + 1;
    if (at.includes('FERRO') && !at.includes('LAMELLOR')) {
      if (u.status === 'exact') ffExact.push(u.unitId);
    }
  } catch {}
}
console.log('=== ARMOR TYPE DISTRIBUTION (within 1%) ===');
for (const [at, count] of Object.entries(byArmorType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${at}: ${count}`);
}
console.log(`\nFF units that were EXACT: ${ffExact.length}`);
for (const uid of ffExact.slice(0, 10)) {
  const u = oldR.allResults.find((x: any) => x.unitId === uid);
  const ie = idx.units.find((e: any) => e.id === uid);
  const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
  let totalArmor = 0;
  for (const [, val] of Object.entries(d.armor.allocation)) {
    if (typeof val === 'number') totalArmor += val as number;
    else { const v = val as any; totalArmor += (v.front || 0) + (v.rear || 0); }
  }
  const isClanFF = d.armor.type.includes('CLAN');
  const ffMult = isClanFF ? 1.2 : 1.12;
  const armorBVDiff = totalArmor * 2.5 * (ffMult - 1.0);
  const defFactor = u.breakdown?.defensiveFactor || 1.0;
  const expectedOvercalc = Math.round(armorBVDiff * defFactor);
  console.log(`  ${uid}: ${d.armor.type} armor=${totalArmor} defF=${defFactor} expected_overcalc=+${expectedOvercalc} ref=${u.indexBV}`);
}
