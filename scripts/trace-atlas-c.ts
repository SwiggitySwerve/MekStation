import { normalizeEquipmentId, resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';
import { calculateOffensiveBVWithHeatTracking } from '../src/utils/construction/battleValueCalculations';
import * as fs from 'fs';
import * as path from 'path';

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(full));
    else if (entry.name.endsWith('.json') && entry.name !== 'index.json') results.push(full);
  }
  return results;
}

const files = findJsonFiles('public/data/units/battlemechs');
let unit: any = null;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (d.id === 'atlas-c') { unit = d; break; }
}
if (!unit) { console.log('NOT FOUND'); process.exit(1); }

// Simulate the validation script's helpers
function normalizeEquipId(s: string): string {
  return s.toLowerCase().replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').replace(/[^a-z0-9]/g, '');
}

function isClanEquipAtLocation(equipId: string, location: string, criticalSlots?: Record<string, (string | null)[]>): boolean {
  if (!criticalSlots) return false;
  const locKey = location.split(',')[0].toUpperCase();
  const locVariants = [locKey, location];
  const eqNorm = normalizeEquipId(equipId);

  for (const lk of locVariants) {
    const slots = criticalSlots[lk];
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (!slot || typeof slot !== 'string') continue;
      const clean = slot.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(R\)/g, '').trim();
      if (!/^CL/i.test(clean)) continue;
      const slotNorm = clean.toLowerCase().replace(/^(cl|clan)\s*/i, '').replace(/[^a-z0-9]/g, '');
      if (slotNorm === eqNorm || slotNorm.includes(eqNorm) || eqNorm.includes(slotNorm)) return true;
    }
  }
  return false;
}

function resolveWeaponForUnit(id: string, techBase: string, isClanEquip?: boolean): { battleValue: number; heat: number; resolved: boolean; source: string } {
  const lo = id.toLowerCase().replace(/^\d+-/, '');
  const isResult = resolveEquipmentBV(id);

  if (techBase === 'CLAN' || isClanEquip || (techBase === 'MIXED' && (lo.startsWith('clan-') || lo.startsWith('cl-') || lo.startsWith('cl ')))) {
    const normalizedIS = normalizeEquipmentId(lo);
    const candidates: string[] = [];
    if (!normalizedIS.startsWith('clan-')) candidates.push('clan-' + normalizedIS);
    if (!lo.startsWith('clan-') && lo !== normalizedIS) candidates.push('clan-' + lo);

    for (const cid of candidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) {
        if (!isResult.resolved || cr.battleValue > isResult.battleValue) return { ...cr, source: `clan:${cid}` };
        if (isResult.battleValue === cr.battleValue) return { ...cr, source: `clan(=is):${cid}` };
      }
    }
  }

  if (isResult.resolved && isResult.battleValue > 0) return { ...isResult, source: 'is' };

  if (techBase === 'MIXED' && (!isResult.resolved || isResult.battleValue === 0)) {
    const normalizedMixed = normalizeEquipmentId(lo);
    const clanCandidates: string[] = [];
    if (!normalizedMixed.startsWith('clan-')) clanCandidates.push('clan-' + normalizedMixed);
    if (!lo.startsWith('clan-') && lo !== normalizedMixed) clanCandidates.push('clan-' + lo);
    for (const cid of clanCandidates) {
      const cr = resolveEquipmentBV(cid);
      if (cr.resolved && cr.battleValue > 0) return { ...cr, source: `mixed-fallback:${cid}` };
    }
  }

  return { ...isResult, source: 'fallthrough' };
}

type WeaponEntry = { id: string; name: string; heat: number; bv: number; rear?: boolean; hasAES?: boolean; isDirectFire?: boolean; location: string; artemisType?: 'iv' | 'v'; };
const weapons: WeaponEntry[] = [];

console.log('=== Atlas C Weapon Resolution ===');
console.log('Tech base:', unit.techBase);

for (const eq of unit.equipment) {
  const resolveId = eq.id;
  const lo = resolveId.toLowerCase();

  // Skip non-weapons (same logic as validate-bv.ts)
  if (lo.includes('ammo')) { console.log(`  SKIP ammo: ${eq.id}`); continue; }
  if (lo.includes('heatsink') || lo.includes('heat-sink')) { console.log(`  SKIP HS: ${eq.id}`); continue; }

  const clanDetected = unit.techBase === 'MIXED' && isClanEquipAtLocation(resolveId, eq.location, unit.criticalSlots);
  const res = resolveWeaponForUnit(resolveId, unit.techBase, clanDetected);

  const wid = eq.id.toLowerCase();
  const isDirectFire = !wid.includes('lrm') && !wid.includes('srm') && !wid.includes('mrm') && !wid.includes('atm') && !wid.includes('mml') && !wid.includes('narc') && !wid.includes('inarc') && !wid.includes('lrt') && !wid.includes('srt');

  weapons.push({
    id: eq.id, name: wid, heat: res.heat, bv: res.battleValue,
    rear: false, hasAES: false, isDirectFire,
    location: eq.location,
  });
  console.log(`  ${eq.id} @ ${eq.location}: clan=${clanDetected} → bv=${res.battleValue} heat=${res.heat} df=${isDirectFire} source=${res.source}`);
}

const totalRawBV = weapons.reduce((s, w) => s + w.bv, 0);
console.log(`\nTotal raw weapon BV (sum): ${totalRawBV}`);

// Call actual offensive BV calc
const offResult = calculateOffensiveBVWithHeatTracking({
  weapons, ammo: [], tonnage: 100,
  walkMP: 3, runMP: 5, jumpMP: 0, umuMP: 0, heatDissipation: 26,
  hasTargetingComputer: false, hasTSM: false,
  hasStealthArmor: false, hasNullSig: false,
  hasVoidSig: false, hasChameleonShield: false,
  physicalWeaponBV: 0,
  offensiveEquipmentBV: 0,
  hasImprovedJJ: false,
  isXXLEngine: false,
  coolantPods: 0,
  heatSinkCount: 17,
  jumpHeatMP: 0,
  aesArms: 0,
  aesLegs: 0,
});

console.log(`\nOffensive result:`);
console.log(`  rawWeaponBV: ${offResult.rawWeaponBV}`);
console.log(`  weaponBV: ${offResult.weaponBV}`);
console.log(`  halvedWeaponBV: ${offResult.halvedWeaponBV}`);
console.log(`  halvedWeaponCount: ${offResult.halvedWeaponCount}`);
console.log(`  heatEfficiency: ${offResult.heatEfficiency}`);
console.log(`  speedFactor: ${offResult.speedFactor}`);
console.log(`  ammoBV: ${offResult.ammoBV}`);
console.log(`  totalOffensiveBV: ${offResult.totalOffensiveBV}`);

console.log(`\nExpected (validation): rawWeaponBV=811, weaponBV=799.5, halvedWeaponBV=11.5`);
