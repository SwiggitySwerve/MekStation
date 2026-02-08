import * as fs from 'fs';
import * as path from 'path';

const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = 'public/data/units/battlemechs';
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

const specialWeapons = ['iatm', 'hag', 'improved heavy', 'plasma rifle', 'nova cews', 'improved medium heavy', 'improved small heavy', 'improved large heavy', 'streak lrm', 'atm', 'rotary', 'heavy gauss'];

function hasSpecialWeapon(d: any): boolean {
  const allSlots: string[] = [];
  for (const [, slots] of Object.entries(d.criticalSlots || {})) {
    for (const s of (slots as (string | null)[])) {
      if (s && typeof s === 'string') allSlots.push(s.toLowerCase());
    }
  }
  return specialWeapons.some(sw => allSlots.some(s => s.includes(sw)));
}

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

// Filter to undercalculated, rawOff-consistent, no special weapons
const pureDefGap: any[] = [];
for (const res of r.allResults) {
  if (res.percentDiff >= -1 || !res.breakdown) continue;
  const b = res.breakdown;
  const rawOff = b.offensiveBV / b.speedFactor;
  const expectedRawOff = b.weaponBV + b.ammoBV + res.tonnage;
  if (Math.abs(rawOff - expectedRawOff) / Math.max(1, expectedRawOff) >= 0.02) continue;

  const entry = index.units.find((e: any) => e.id === res.unitId);
  if (!entry?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
    if (hasSpecialWeapon(d)) continue;

    let cockpitMod = 1.0;
    const cockpit = (d.cockpit || 'STANDARD').toUpperCase();
    if (cockpit.includes('SMALL') || cockpit.includes('TORSO')) cockpitMod = 0.95;
    if (cockpit.includes('INTERFACE')) cockpitMod = 1.3;

    const neededBaseBV = res.indexBV / cockpitMod;
    const neededDefBV = neededBaseBV - b.offensiveBV;
    const neededBaseDef = neededDefBV / b.defensiveFactor;
    const baseDef = b.armorBV + b.structureBV + b.gyroBV + b.defensiveEquipBV - b.explosivePenalty;
    const gap = neededBaseDef - baseDef;

    pureDefGap.push({
      ...res,
      unitData: d,
      baseDef,
      gap,
      neededBaseDef,
      totalArmor: calcTotalArmor(d.armor.allocation),
    });
  } catch {}
}

console.log(`Pure defensive-gap units (no special weapons, rawOff OK): ${pureDefGap.length}`);
console.log(`Average gap: ${(pureDefGap.reduce((s: number, u: any) => s + u.gap, 0) / pureDefGap.length).toFixed(1)}`);
console.log(`Average abs diff: ${(pureDefGap.reduce((s: number, u: any) => s + Math.abs(u.difference), 0) / pureDefGap.length).toFixed(1)}`);

// Check if gap correlates with explosive penalty
const withExpl = pureDefGap.filter((u: any) => u.breakdown.explosivePenalty > 0);
const noExpl = pureDefGap.filter((u: any) => u.breakdown.explosivePenalty === 0);
console.log(`\nWith explosive penalty: ${withExpl.length} (avgGap=${(withExpl.reduce((s: number, u: any) => s + u.gap, 0) / withExpl.length).toFixed(1)})`);
console.log(`Without explosive penalty: ${noExpl.length} (avgGap=${(noExpl.reduce((s: number, u: any) => s + u.gap, 0) / noExpl.length).toFixed(1)})`);

// For units with explosive penalty, check if gap ≈ penalty
console.log(`\nUnits where gap is close to explosive penalty:`);
let penaltyFixCount = 0;
for (const u of withExpl) {
  const pen = u.breakdown.explosivePenalty;
  if (Math.abs(u.gap - pen) < 5) {
    penaltyFixCount++;
  }
}
console.log(`  Gap ≈ penalty (within 5): ${penaltyFixCount} of ${withExpl.length}`);

// For units WITHOUT explosive penalty, what is the gap?
// Check: does the gap correlate with defEquip?
const noExplNoEquip = noExpl.filter((u: any) => u.breakdown.defensiveEquipBV === 0);
const noExplHasEquip = noExpl.filter((u: any) => u.breakdown.defensiveEquipBV > 0);
console.log(`\nNo penalty, no defEquip: ${noExplNoEquip.length} (avgGap=${noExplNoEquip.length ? (noExplNoEquip.reduce((s: number, u: any) => s + u.gap, 0) / noExplNoEquip.length).toFixed(1) : 'N/A'})`);
console.log(`No penalty, has defEquip: ${noExplHasEquip.length} (avgGap=${noExplHasEquip.length ? (noExplHasEquip.reduce((s: number, u: any) => s + u.gap, 0) / noExplHasEquip.length).toFixed(1) : 'N/A'})`);

// Show 20 representative "pure" gap units with NO penalty, NO defEquip, sorted by gap
console.log(`\n=== "Purest" defensive gap units (no penalty, no defEquip, no special weapons) ===`);
const purePure = noExplNoEquip.sort((a: any, b: any) => b.gap - a.gap);
for (const u of purePure.slice(0, 20)) {
  const d = u.unitData;
  console.log(`${u.unitId}: ${d.tonnage}t ${d.techBase} ${d.engine.type} gap=${u.gap.toFixed(1)} diff=${u.difference} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  armorBV=${u.breakdown.armorBV.toFixed(1)} structBV=${u.breakdown.structureBV.toFixed(1)} gyroBV=${u.breakdown.gyroBV.toFixed(1)} defFactor=${u.breakdown.defensiveFactor.toFixed(2)} walk=${d.movement.walk} jump=${d.movement.jump || 0}`);
}

// Also check: by techBase
const byTech: Record<string, any[]> = {};
for (const u of purePure) {
  const tb = u.unitData.techBase;
  if (!byTech[tb]) byTech[tb] = [];
  byTech[tb].push(u);
}
console.log(`\nBy tech base (pure gap, no penalty, no defEquip):`);
for (const [tb, units] of Object.entries(byTech)) {
  console.log(`  ${tb}: ${units.length} (avgGap=${(units.reduce((s: number, u: any) => s + u.gap, 0) / units.length).toFixed(1)})`);
}
