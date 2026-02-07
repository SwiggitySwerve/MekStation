import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

const targets = [
  'ryoken-iii-c', 'ryoken-iii-d', 'turkina-z', 'pariah-septicemia-a-z',
  'savage-coyote-z', 'uller-c', 'roadrunner-rd-1r', 'barghest-bgs-3t',
  'koshi-a', 'centurion-cn9-d', 'commando-com-9s', 'grasshopper-ghr-7x',
];

for (const id of targets) {
  const res = r.allResults.find((x: any) => x.unitId === id);
  if (!res?.breakdown) { console.log(`${id}: NOT FOUND`); continue; }
  const b = res.breakdown;
  const entry = index.units.find((e: any) => e.id === id);
  if (!entry?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));

  const baseDef = b.armorBV + b.structureBV + b.gyroBV + b.defensiveEquipBV - b.explosivePenalty;

  let cockpitMod = 1.0;
  const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
  if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
  if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;
  const neededBaseBV = res.indexBV / cockpitMod;
  const neededDefBV = neededBaseBV - b.offensiveBV;
  const neededBaseDef = neededDefBV / b.defensiveFactor;
  const gap = neededBaseDef - baseDef;

  console.log(`\n=== ${id} (${d.tonnage}t ${d.techBase} ${d.engine.type}) ===`);
  console.log(`  idx=${res.indexBV} calc=${res.calculatedBV} diff=${res.difference} (${res.percentDiff.toFixed(1)}%)`);
  console.log(`  armorBV=${b.armorBV.toFixed(1)} structBV=${b.structureBV.toFixed(1)} gyroBV=${b.gyroBV.toFixed(1)} defEquip=${b.defensiveEquipBV.toFixed(1)} explPen=${b.explosivePenalty}`);
  console.log(`  defFactor=${b.defensiveFactor.toFixed(2)} baseDef=${baseDef.toFixed(1)} gap=${gap.toFixed(1)}`);

  // Show ALL crit slots for non-standard items
  const allSlots: string[] = [];
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    for (const s of (slots as (string | null)[])) {
      if (s && typeof s === 'string') {
        const lo = s.toLowerCase();
        if (!lo.includes('engine') && !lo.includes('gyro') && !lo.includes('shoulder') &&
            !lo.includes('actuator') && !lo.includes('hip') && !lo.includes('life support') &&
            !lo.includes('sensors') && !lo.includes('cockpit') && !lo.includes('-empty-') &&
            lo !== 'null') {
          allSlots.push(`${loc}: ${s}`);
        }
      }
    }
  }
  // Deduplicate and show
  const slotCounts = new Map<string, number>();
  for (const s of allSlots) {
    const key = s.replace(/\s*\(omnipod\)/gi, '').trim();
    slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
  }
  console.log(`  Crit equipment:`);
  for (const [name, count] of [...slotCounts.entries()].sort()) {
    console.log(`    ${count}x ${name}`);
  }
}
