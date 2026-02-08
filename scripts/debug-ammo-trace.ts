#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

// Rebuild the ammo lookup exactly as validate-bv.ts does
function normalizeWeaponKey(id: string): string {
  let s = id.toLowerCase().replace(/^clan-/, '').replace(/^\d+-/, '');
  const aliases: [RegExp, string][] = [
    [/^(?:is)?hag-?(\d+)$/, 'hag-$1'],
    [/^hyper-?assault-?gauss-?rifle-?(\d+)$/, 'hag-$1'],
  ];
  for (const [re, rep] of aliases) { if (re.test(s)) return s.replace(re, rep); }
  return s;
}

function extractWeaponTypeFromAmmoId(ammoId: string): string {
  let s = ammoId.replace(/-ammo$/, '').replace(/ammo$/, '').replace(/^ammo-/, '').replace(/^clan-ammo-/, '').replace(/^clan-/, '');
  s = s.replace(/-(standard|er|he|iiw|imp|cluster|ap|precision|fragmentation|inferno|swarm|tandem-charge|thunder|explosive|ecm|haywire|nemesis|pods)$/, '');
  s = s.replace(/-half$/, '').replace(/-full$/, '');
  return normalizeWeaponKey(s);
}

const ammoLookup = new Map<string, { bv: number; weaponType: string }>();

// Load from catalog
try {
  const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/data/equipment/official/ammunition.json'), 'utf-8'));
  for (const item of d.items || []) {
    const wt = item.compatibleWeaponIds?.[0]
      ? normalizeWeaponKey(item.compatibleWeaponIds[0])
      : extractWeaponTypeFromAmmoId(item.id);
    ammoLookup.set(item.id, { bv: item.battleValue, weaponType: wt });
    const canon = item.id.replace(/[^a-z0-9]/g, '');
    if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv: item.battleValue, weaponType: wt });
  }
} catch { /* ignore */ }

// Hardcoded entries
const hc: Array<[string, number, string]> = [
  ['hag-20-ammo', 33, 'hag-20'], ['hag-30-ammo', 50, 'hag-30'], ['hag-40-ammo', 67, 'hag-40'],
];
for (const [id, bv, wt] of hc) {
  if (!ammoLookup.has(id)) ammoLookup.set(id, { bv, weaponType: wt });
  const canon = id.replace(/[^a-z0-9]/g, '');
  if (!ammoLookup.has(canon)) ammoLookup.set(canon, { bv, weaponType: wt });
}

// Check what's now in the lookup
console.log('hag-40-ammo:', ammoLookup.get('hag-40-ammo'));
console.log('hag40ammo:', ammoLookup.get('hag40ammo'));
console.log('hag-30-ammo:', ammoLookup.get('hag-30-ammo'));
console.log('hag30ammo:', ammoLookup.get('hag30ammo'));

// Now trace through the full resolveAmmoByPattern for "HAG/40 Ammo"
const name = 'HAG/40 Ammo';
const clean = name.replace(/\s*\(omnipod\)/gi, '').replace(/\s*\((?:Clan|IS)\)\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\s*(?:Artemis(?:\s*V)?|Narc)-?[Cc]apable/gi, '').replace(/\|.*/g, '').trim();
const norm = normalizeEquipmentId(clean);
console.log('\nFor "HAG/40 Ammo":');
console.log(`  clean="${clean}" norm="${norm}"`);
console.log(`  lookup.get(norm)=`, ammoLookup.get(norm));
console.log(`  lookup.get(norm+"-ammo")=`, ammoLookup.get(norm + '-ammo'));

const lo = clean.toLowerCase();
const stripped = lo.replace(/\s*\((?:clan|is)\)\s*/g, '').replace(/\s*-\s*(?:full|half|proto)\s*$/g, '').replace(/\s*\(\d+\)\s*$/g, '').trim();
console.log(`  stripped="${stripped}"`);

// Try the regex
const m = stripped.match(/^hag[/-](\d+)\s*ammo$/);
console.log(`  hag regex match:`, m);
if (m) {
  const id = `hag-${m[1]}-ammo`;
  console.log(`  Generated ID: "${id}"`);
  console.log(`  lookup.get("${id}"):`, ammoLookup.get(id));
}

// Check the canon key path
const canonKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
console.log(`  canonKey="${canonKey}"`);
console.log(`  lookup.get(canonKey):`, ammoLookup.get(canonKey));
