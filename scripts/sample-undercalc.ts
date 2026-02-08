import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// Get undercalculated minor-disc units (-1% to -5%)
const underCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0
).sort((a: any, b: any) => a.percentDiff - b.percentDiff);

console.log(`Total undercalculated minor-disc: ${underCalc.length}`);

// Pick diverse sample: different tonnages, tech bases, gap sizes
const samples: any[] = [];
const seen = new Set<string>();

// Get units by gap band
for (const band of [[-4, -3], [-3, -2], [-2, -1.5], [-1.5, -1]] as const) {
  const pool = underCalc.filter((r: any) => r.percentDiff >= band[0] && r.percentDiff < band[1]);
  // Pick IS and Clan from each band
  for (const tb of ['INNER_SPHERE', 'CLAN']) {
    const tbPool = pool.filter((r: any) => {
      const entry = index.units.find((u: any) => u.id === r.unitId);
      if (!entry?.path) return false;
      try {
        const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
        return u.techBase === tb;
      } catch { return false; }
    });
    if (tbPool.length > 0 && !seen.has(`${band[0]}-${tb}`)) {
      samples.push(tbPool[0]);
      seen.add(`${band[0]}-${tb}`);
    }
  }
}

// For each sample, show full breakdown
for (const r of samples) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  
  const b = r.breakdown || {};
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${r.unitId} (${u.techBase}, ${u.tonnage}t)`);
  console.log(`  Index BV: ${r.indexBV}  Calc BV: ${r.calculatedBV}  Gap: ${r.difference} (${r.percentDiff.toFixed(2)}%)`);
  console.log(`  Defensive BV: ${b.defensiveBV?.toFixed(2)}`);
  console.log(`    armorBV: ${b.armorBV?.toFixed(2)}, structBV: ${b.structureBV?.toFixed(2)}, gyroBV: ${b.gyroBV?.toFixed(2)}`);
  console.log(`    defEquipBV: ${b.defensiveEquipBV?.toFixed(2)}, explosivePen: ${b.explosivePenalty?.toFixed(2)}`);
  console.log(`    defensiveFactor: ${b.defensiveFactor?.toFixed(4)}`);
  console.log(`  Offensive BV: ${b.offensiveBV?.toFixed(2)}`);
  console.log(`    weaponBV: ${b.weaponBV?.toFixed(2)}, ammoBV: ${b.ammoBV?.toFixed(2)}`);
  console.log(`    physicalBV: ${b.physicalWeaponBV?.toFixed(2) || 'N/A'}, weightBonus: ${b.weightBonus?.toFixed(2) || 'N/A'}`);
  console.log(`    offEquipBV: ${b.offensiveEquipBV?.toFixed(2) || 'N/A'}`);
  console.log(`    speedFactor: ${b.speedFactor?.toFixed(4)}`);
  console.log(`  Cockpit modifier: ${b.cockpitModifier?.toFixed(2) || 'N/A'}`);
  console.log(`  Engine: ${u.engine?.type} ${u.engine?.rating}`);
  console.log(`  Movement: walk=${u.movement?.walk} jump=${u.movement?.jump || 0}`);
  console.log(`  Issues: ${JSON.stringify(r.issues || [])}`);
  
  // Show what BV breakdown we'd need to match
  const neededDelta = r.indexBV - r.calculatedBV;
  console.log(`  Need +${neededDelta.toFixed(1)} BV to match`);
  
  // Check if defensive or offensive side is short
  // If cockpit modifier is 1.0, total = def + off
  const cockpitMod = b.cockpitModifier || 1.0;
  const currentBase = (b.defensiveBV + b.offensiveBV);
  const neededBase = r.indexBV / cockpitMod;
  console.log(`  Base (def+off): ${currentBase.toFixed(2)}, need: ${neededBase.toFixed(2)}, delta: ${(neededBase - currentBase).toFixed(2)}`);
  
  // Check crits for anything interesting
  const allSlots: string[] = [];
  for (const [loc, slots] of Object.entries(u.criticalSlots || {})) {
    if (Array.isArray(slots)) {
      for (const s of slots) {
        if (s && typeof s === 'string') allSlots.push(s);
      }
    }
  }
  const uniqueSlots = [...new Set(allSlots)].sort();
  console.log(`  Unique equipment: ${uniqueSlots.filter(s => !s.includes('Actuator') && !s.includes('Engine') && !s.includes('Gyro') && !s.includes('Life Support') && !s.includes('Sensors') && !s.includes('Cockpit') && !s.includes('Endo') && !s.includes('Ferro')).join(', ')}`);
}
