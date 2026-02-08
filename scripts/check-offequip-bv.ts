#!/usr/bin/env npx tsx
/**
 * Check if offensive equipment BV is being captured for undercalculated units.
 * Look for C3i, C3 master/slave, TAG, partial wing, etc. that might add BV.
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});

const offEquipPatterns = [
  { pattern: /c3i|c3 improved|isc3iunit|c3slave|c3master|c3boosted|c3m|c3s/i, name: 'C3' },
  { pattern: /tag|light\s*tag|clan\s*light\s*tag/i, name: 'TAG' },
  { pattern: /vibroblade|vibroblades/i, name: 'Vibroblade' },
  { pattern: /lance|retractable/i, name: 'Lance/Retractable' },
  { pattern: /shield/i, name: 'Shield' },
  { pattern: /spike/i, name: 'Spikes' },
  { pattern: /backhoe|chainsaw|combine|dual\s*saw|flail|mining\s*drill|pile\s*driver|rock\s*cutter|spot\s*welder|wrecking\s*ball/i, name: 'Industrial' },
  { pattern: /blue.?shield/i, name: 'Blue Shield' },
];

interface EquipFinding {
  unitId: string;
  gap: number;
  equipType: string;
  critSlots: string[];
}

const findings: EquipFinding[] = [];

for (const r of undercalc) {
  const iu = index.units.find((u: any) => u.id === r.unitId);
  if (!iu) continue;

  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    if (!unit.criticalSlots) continue;

    for (const [, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots) {
        if (!s || typeof s !== 'string') continue;
        const clean = (s as string).replace(/\s*\(omnipod\)/gi, '').trim();
        for (const { pattern, name } of offEquipPatterns) {
          if (pattern.test(clean)) {
            findings.push({
              unitId: r.unitId,
              gap: r.indexBV - r.calculatedBV,
              equipType: name,
              critSlots: [clean],
            });
            break;
          }
        }
      }
    }
  } catch {}
}

// Deduplicate by unit + equip type
const uniqueFindings = new Map<string, EquipFinding>();
for (const f of findings) {
  const key = `${f.unitId}|${f.equipType}`;
  if (uniqueFindings.has(key)) {
    uniqueFindings.get(key)!.critSlots.push(...f.critSlots);
  } else {
    uniqueFindings.set(key, { ...f });
  }
}

// Group by equipment type
const byType = new Map<string, EquipFinding[]>();
for (const f of uniqueFindings.values()) {
  if (!byType.has(f.equipType)) byType.set(f.equipType, []);
  byType.get(f.equipType)!.push(f);
}

console.log(`=== Offensive Equipment in Undercalculated Units ===`);
console.log(`Total undercalculated: ${undercalc.length}\n`);

for (const [type, units] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const avgGap = units.reduce((s, u) => s + u.gap, 0) / units.length;
  console.log(`${type}: ${units.length} units (avg gap: ${avgGap.toFixed(0)})`);
  for (const u of units.sort((a, b) => b.gap - a.gap).slice(0, 5)) {
    console.log(`  ${u.unitId.padEnd(40).slice(0, 40)} gap=${u.gap}  [${[...new Set(u.critSlots)].slice(0, 3).join(', ')}]`);
  }
}

// How many undercalculated units have NO offensive equipment at all?
const unitIdsWithEquip = new Set([...uniqueFindings.values()].map(f => f.unitId));
const withoutEquip = undercalc.filter((r: any) => !unitIdsWithEquip.has(r.unitId));
console.log(`\nUndercalculated with no special equipment: ${withoutEquip.length} / ${undercalc.length}`);
