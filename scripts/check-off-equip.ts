import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

// For undercalculated minor-disc units, catalog ALL equipment and find patterns
const underCalc = report.allResults.filter((r: any) =>
  r.percentDiff < -1.0 && r.percentDiff > -5.0 && r.breakdown
);

console.log(`Undercalculated minor-disc: ${underCalc.length}\n`);

// Collect all equipment across gap units
const equipCounts: Record<string, { count: number; totalGap: number; units: string[] }> = {};

for (const r of underCalc) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const gap = Math.abs(r.difference);

    // Collect equipment IDs
    for (const eq of u.equipment) {
      const id = eq.id.toLowerCase();
      if (!equipCounts[id]) equipCounts[id] = { count: 0, totalGap: 0, units: [] };
      equipCounts[id].count++;
      equipCounts[id].totalGap += gap;
      if (equipCounts[id].units.length < 3) equipCounts[id].units.push(r.unitId);
    }

    // Also check crit slots for items NOT in equipment array
    if (u.criticalSlots) {
      const equipIds = new Set(u.equipment.map((e: any) => e.id.toLowerCase()));
      for (const [loc, slots] of Object.entries(u.criticalSlots)) {
        if (!Array.isArray(slots)) continue;
        for (const slot of slots) {
          if (!slot || typeof slot !== 'string') continue;
          const slo = slot.toLowerCase();
          // Skip standard structure, skip weapons already in equipment
          if (slo.includes('endo') || slo.includes('ferro') || slo.includes('heat sink') || slo === '-empty-'
            || slo.includes('fusion') || slo.includes('gyro') || slo.includes('life support')
            || slo.includes('sensors') || slo.includes('cockpit') || slo.includes('shoulder')
            || slo.includes('upper arm') || slo.includes('lower arm') || slo.includes('hand')
            || slo.includes('hip') || slo.includes('upper leg') || slo.includes('lower leg')
            || slo.includes('foot') || slo.includes('engine') || slo === 'is double heat sink'
            || slo === 'cl double heat sink' || slo === 'clan double heat sink'
            || slo.includes('laser heat sink') || slo.includes('armor') || slo.includes('ammo')
            || slo.includes('case') || slo.includes('structure')) continue;
          // Check if this crit item has a corresponding equipment entry
          const critNorm = slo.replace(/\s+/g, '-');
          const hasMatch = Array.from(equipIds).some(eid =>
            eid.includes(critNorm) || critNorm.includes(eid.replace(/-/g, ''))
            || slo.includes(eid.replace(/-/g, ' '))
          );
          if (!hasMatch) {
            const key = 'CRIT:' + slo;
            if (!equipCounts[key]) equipCounts[key] = { count: 0, totalGap: 0, units: [] };
            equipCounts[key].count++;
            equipCounts[key].totalGap += gap;
            if (equipCounts[key].units.length < 3) equipCounts[key].units.push(r.unitId);
          }
        }
      }
    }
  } catch {}
}

// Sort by count and show top equipment
const sorted = Object.entries(equipCounts).sort((a, b) => b[1].count - a[1].count);
console.log('=== TOP EQUIPMENT IN UNDERCALCULATED UNITS ===');
console.log('Equipment'.padEnd(50) + ' Count  AvgGap  Units');
for (const [id, data] of sorted.slice(0, 40)) {
  console.log(
    `${id.padEnd(50)} ${String(data.count).padStart(5)} ${(data.totalGap / data.count).toFixed(1).padStart(7)}  ${data.units.slice(0, 2).join(', ')}`
  );
}

// Check units with NO special equipment (pure energy, no ECM, no TC, nothing)
console.log('\n\n=== PUREST UNITS (energy-only, no special equip) ===');
for (const r of underCalc) {
  const entry = index.units.find((u: any) => u.id === r.unitId);
  if (!entry?.path) continue;
  try {
    const u = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    const b = r.breakdown;
    if (b.ammoBV > 0) continue;

    const isEnergyOnly = u.equipment.every((eq: any) => {
      const id = eq.id.toLowerCase();
      return id.includes('laser') || id.includes('ppc') || id.includes('flamer')
        || id.includes('plasma') || id.includes('pulse');
    });
    if (!isEnergyOnly || u.equipment.length === 0) continue;

    const rawGap = (r.indexBV - b.defensiveBV) / b.speedFactor - b.offensiveBV / b.speedFactor;
    console.log(`${r.unitId.padEnd(45)} gap=${String(r.difference).padStart(5)} rawGap=${rawGap.toFixed(1).padStart(6)} wBV=${b.weaponBV} ton=${u.tonnage} equip=${u.equipment.map((e: any) => e.id).join(', ')}`);
  } catch {}
}
