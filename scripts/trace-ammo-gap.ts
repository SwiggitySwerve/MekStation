#!/usr/bin/env npx tsx
/**
 * Trace unresolved ammo across all units to quantify the BV gap from missing ammo.
 * For each unit, collect all ammo crit slots, check which ones resolve, and
 * compare the resolved ammoBV vs what the validator reports.
 */
import * as fs from 'fs';
import * as path from 'path';

const index = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

// Import the resolver to test resolution
import { resolveAmmoBV } from '../src/utils/construction/equipmentBVResolver';

// Build the same ammo lookup the validator uses
const ammoDir = path.resolve('public/data/equipment/official/ammo');
const ammoLookup = new Map<string, { bv: number; weaponType: string }>();
try {
  for (const f of fs.readdirSync(ammoDir)) {
    if (!f.endsWith('.json')) continue;
    const d = JSON.parse(fs.readFileSync(path.join(ammoDir, f), 'utf8'));
    for (const item of (d.items || [])) {
      const norm = item.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      ammoLookup.set(norm, { bv: item.battleValue, weaponType: item.category || '' });
    }
  }
} catch {}

function normalizeEquipmentId(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Count ammo slots per unit and check how many resolve
interface AmmoSlotInfo {
  raw: string;
  normalized: string;
  resolved: boolean;
  bv: number;
}

interface UnitAmmoInfo {
  unitId: string;
  totalAmmoSlots: number;
  resolvedSlots: number;
  unresolvedSlots: number;
  unresolvedNames: string[];
  resolvedBV: number;
  reportedAmmoBV: number;
  difference: number;
  bvGap: number; // indexBV - calculatedBV
}

const allUnresolved = new Map<string, number>();
const unitAmmoInfos: UnitAmmoInfo[] = [];

for (const iu of index.units) {
  const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    if (!unit.criticalSlots) continue;

    const r = report.allResults.find((x: any) => x.unitId === iu.id);
    if (!r) continue;

    const ammoSlots: AmmoSlotInfo[] = [];

    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      if (!Array.isArray(slots)) continue;
      for (const slot of slots) {
        if (!slot || typeof slot !== 'string') continue;
        const clean = (slot as string).replace(/\s*\(omnipod\)/gi, '').trim();
        const lo = clean.toLowerCase();
        if (!lo.includes('ammo') || lo.includes('ammo feed')) continue;

        // Try resolveAmmoBV from the equipment resolver
        const ar = resolveAmmoBV(clean);
        const resolved = ar.resolved && ar.battleValue > 0;
        ammoSlots.push({
          raw: clean,
          normalized: normalizeEquipmentId(clean),
          resolved,
          bv: resolved ? ar.battleValue : 0
        });

        if (!resolved) {
          const cnt = allUnresolved.get(clean) || 0;
          allUnresolved.set(clean, cnt + 1);
        }
      }
    }

    if (ammoSlots.length > 0) {
      const resolvedSlots = ammoSlots.filter(s => s.resolved).length;
      const resolvedBV = ammoSlots.reduce((sum, s) => sum + s.bv, 0);
      const reportedAmmoBV = r.breakdown?.ammoBV ?? 0;

      unitAmmoInfos.push({
        unitId: iu.id,
        totalAmmoSlots: ammoSlots.length,
        resolvedSlots,
        unresolvedSlots: ammoSlots.length - resolvedSlots,
        unresolvedNames: [...new Set(ammoSlots.filter(s => !s.resolved).map(s => s.raw))],
        resolvedBV,
        reportedAmmoBV,
        difference: reportedAmmoBV - resolvedBV,
        bvGap: r.indexBV - r.calculatedBV
      });
    }
  } catch {}
}

// Summary stats
const withUnresolved = unitAmmoInfos.filter(u => u.unresolvedSlots > 0);
const withAmmo = unitAmmoInfos.length;
const totalUnresSlots = withUnresolved.reduce((s, u) => s + u.unresolvedSlots, 0);
const totalAmmoSlots = unitAmmoInfos.reduce((s, u) => s + u.totalAmmoSlots, 0);

console.log(`=== Ammo Resolution Summary ===`);
console.log(`Units with ammo: ${withAmmo}`);
console.log(`Total ammo slots: ${totalAmmoSlots}`);
console.log(`Units with unresolved ammo: ${withUnresolved.length} (${(withUnresolved.length / withAmmo * 100).toFixed(1)}%)`);
console.log(`Total unresolved ammo slots: ${totalUnresSlots} (${(totalUnresSlots / totalAmmoSlots * 100).toFixed(1)}%)`);

// Check correlation: do units with unresolved ammo have larger BV gaps?
const undercalc = report.allResults.filter((r: any) => {
  const pct = Math.abs(r.percentDiff);
  return pct > 1 && pct <= 5 && r.difference < 0;
});
const undercalcIds = new Set(undercalc.map((r: any) => r.unitId));

const unresolvedInUndercalc = withUnresolved.filter(u => undercalcIds.has(u.unitId));
const resolvedInUndercalc = unitAmmoInfos.filter(u => u.unresolvedSlots === 0 && undercalcIds.has(u.unitId));

console.log(`\n=== Correlation with undercalculated units (${undercalcIds.size} total) ===`);
console.log(`Undercalculated units with unresolved ammo: ${unresolvedInUndercalc.length}`);
console.log(`Undercalculated units with fully resolved ammo: ${resolvedInUndercalc.length}`);

// How many undercalculated units have NO ammo at all?
const noAmmoUndercalc = undercalc.filter((r: any) => !unitAmmoInfos.find(u => u.unitId === r.unitId));
console.log(`Undercalculated units with no ammo slots: ${noAmmoUndercalc.length}`);

// Top unresolved ammo types
console.log(`\n=== Top 30 Unresolved Ammo Types ===`);
const sorted = [...allUnresolved.entries()].sort((a, b) => b[1] - a[1]);
for (const [name, count] of sorted.slice(0, 30)) {
  console.log(`  ${String(count).padStart(4)}x  ${name}`);
}

// Show units with most unresolved ammo and large BV gap
console.log(`\n=== Units with unresolved ammo AND undercalculation (top 30 by gap) ===`);
const unresolvedUndercalcSorted = unresolvedInUndercalc
  .sort((a, b) => b.bvGap - a.bvGap)
  .slice(0, 30);
for (const u of unresolvedUndercalcSorted) {
  console.log(`  ${u.unitId.padEnd(40).slice(0, 40)} gap=${String(u.bvGap).padStart(5)} unresolved=${u.unresolvedSlots} [${u.unresolvedNames.join(', ')}]`);
}
