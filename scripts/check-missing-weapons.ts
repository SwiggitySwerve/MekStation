/**
 * Check if undercalculated units have weapons in crit slots
 * that are NOT in the equipment list.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under = valid.filter((x: any) => x.percentDiff < -1);

// Known non-weapon crit slot prefixes
const nonWeaponPatterns = [
  'heat sink', 'double heat sink', 'engine', 'fusion', 'gyro', 'cockpit',
  'life support', 'sensor', 'shoulder', 'upper arm', 'lower arm', 'hand',
  'upper leg', 'lower leg', 'foot', 'hip',
  'endo', 'ferro', 'case', 'ammo', 'jump jet', 'improved jump jet',
  'targeting computer', 'masc', 'supercharger', 'tsm', 'triple strength',
  'ecm', 'guardian', 'angel', 'watchdog', 'nova cews', 'novacews',
  'probe', 'beagle', 'bloodhound', 'active probe',
  'shield', 'null sig', 'void sig', 'chameleon', 'stealth',
  'artemis', 'apollo', 'coolant', 'partial wing',
  'lift hoist', 'ejection', 'actuator', 'aes', 'c3',
  'narc', 'tag', 'pod', 'command console', 'drone',
  'armor', 'structure', 'harjel', 'radical heat',
  'modular armor', 'blue shield', 'armored',
];

function isWeaponCritSlot(slotName: string): boolean {
  const lo = slotName.toLowerCase().replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(armored\)/gi, '').trim();
  if (!lo || lo === 'null' || lo === '-empty-') return false;
  for (const p of nonWeaponPatterns) {
    if (lo.includes(p)) return false;
  }
  // Also skip entries ending in (R) which are rear-mounted variants of weapons
  return true;
}

function normalizeForComparison(s: string): string {
  return s.toLowerCase()
    .replace(/\s*\(omnipod\)/gi, '')
    .replace(/\s*\(r\)/gi, '')
    .replace(/^(is|cl|clan)/i, '')
    .replace(/[^a-z0-9]/g, '');
}

let unitsMissingWeapons = 0;
let totalMissingWeapons = 0;
const missingExamples: string[] = [];

for (const u of under) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  let unit: any;
  try { unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { continue; }
  if (!unit.criticalSlots) continue;

  // Build set of equipment IDs (normalized)
  const equipIds = new Set<string>();
  for (const eq of unit.equipment || []) {
    const norm = normalizeForComparison(eq.id);
    equipIds.add(norm);
    // Also add without numeric prefix
    const stripped = eq.id.replace(/^\d+-/, '');
    equipIds.add(normalizeForComparison(stripped));
  }

  // Scan crit slots for weapons
  const critWeapons = new Map<string, { count: number; locations: string[] }>();
  for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    let prev = '';
    for (const s of slots) {
      if (!s || typeof s !== 'string') { prev = ''; continue; }
      if (!isWeaponCritSlot(s)) { prev = ''; continue; }
      const clean = s.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\(r\)/gi, '').trim();
      // Dedup multi-slot weapons (consecutive identical)
      if (clean === prev) continue;
      prev = clean;

      const norm = normalizeForComparison(clean);
      if (!critWeapons.has(norm)) critWeapons.set(norm, { count: 0, locations: [] });
      const entry = critWeapons.get(norm)!;
      entry.count++;
      if (!entry.locations.includes(loc)) entry.locations.push(loc);
    }
  }

  // Check if any crit weapons are NOT in equipment list
  const missing: string[] = [];
  for (const [norm, info] of critWeapons) {
    let found = false;
    for (const eid of equipIds) {
      if (eid === norm || eid.includes(norm) || norm.includes(eid)) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(`${norm}(${info.count}x in ${info.locations.join(',')})`);
    }
  }

  if (missing.length > 0) {
    unitsMissingWeapons++;
    totalMissingWeapons += missing.length;
    if (missingExamples.length < 30) {
      missingExamples.push(`${u.unitId} (gap=${u.difference}, ${u.percentDiff?.toFixed(1)}%): ${missing.join(', ')}`);
    }
  }
}

console.log(`Units with weapons in crits but NOT in equipment: ${unitsMissingWeapons}/${under.length}`);
console.log(`Total missing weapon types: ${totalMissingWeapons}`);

if (missingExamples.length > 0) {
  console.log('\nExamples:');
  for (const e of missingExamples) console.log(`  ${e}`);
}

// Also check: how many units have FEWER weapons in equipment than in crits?
console.log('\n=== WEAPON COUNT: EQUIPMENT vs CRITS ===');
let equipMore = 0, critsMore = 0, same = 0;
for (const u of under.slice(0, 100)) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  let unit: any;
  try { unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { continue; }

  // Count weapons in equipment list
  let equipWeaponCount = 0;
  for (const eq of unit.equipment || []) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case') || lo.includes('endo') || lo.includes('ferro') ||
        lo.includes('targeting-computer') || lo.includes('tsm') || lo.includes('ecm') || lo.includes('probe') ||
        lo.includes('shield') || lo.includes('pod') || lo.includes('masc') || lo.includes('supercharger') ||
        lo.includes('jump') || lo.includes('null-sig') || lo.includes('void-sig') || lo.includes('chameleon') ||
        lo.includes('stealth') || lo.includes('artemis') || lo.includes('apollo') || lo.includes('narc') ||
        lo.includes('tag') || lo.includes('c3') || lo.includes('coolant') || lo.includes('partial-wing') ||
        lo.includes('lift-hoist') || lo.includes('actuator') || lo.includes('aes') || lo.includes('amu') ||
        lo.includes('anti-missile') || lo.includes('ams')) continue;
    const qtyMatch = eq.id.match(/^(\d+)-/);
    const qty = (qtyMatch && parseInt(qtyMatch[1], 10) > 1) ? parseInt(qtyMatch[1], 10) : 1;
    equipWeaponCount += qty;
  }

  const b = u.breakdown;
  const critWeaponCount = b?.weaponCount || 0;

  if (equipWeaponCount > critWeaponCount) equipMore++;
  else if (critWeaponCount > equipWeaponCount) critsMore++;
  else same++;
}
console.log(`Equipment has more weapons: ${equipMore}`);
console.log(`Crits-based count higher: ${critsMore}`);
console.log(`Same count: ${same}`);
