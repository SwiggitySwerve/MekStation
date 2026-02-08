import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
for (const u of valid) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    const hasHAG = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
      Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('hag') && !s.toLowerCase().includes('hagel')));
    if (!hasHAG) continue;
    const hagEquip = (unit.equipment || []).filter((eq: any) => eq.id.toLowerCase().includes('hag'));
    console.log(`${u.unitId} (${u.percentDiff.toFixed(1)}%)`);
    for (const eq of hagEquip) {
      const res = resolveEquipmentBV(eq.id);
      const norm = normalizeEquipmentId(eq.id);
      console.log(`  equip: ${eq.id} → norm=${norm} bv=${res.battleValue} resolved=${res.resolved}`);
    }
    // Check crit-based HAG
    for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
      if (!Array.isArray(slots)) continue;
      for (const s of slots as string[]) {
        if (s && typeof s === 'string' && s.toLowerCase().includes('hag') && !s.toLowerCase().includes('hagel') && !s.toLowerCase().includes('ammo')) {
          const res = resolveEquipmentBV(s);
          console.log(`  crit: [${loc}] ${s} → bv=${res.battleValue} resolved=${res.resolved}`);
          break; // Just show first slot per location
        }
      }
    }
    console.log('');
  } catch {}
}
