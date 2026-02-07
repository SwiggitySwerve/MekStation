/**
 * Trace ammo-to-weapon pairing for the 5 units with ammoBV=0.
 */
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const unitIds = [
  'enfield-end-6j-ec',
  'hatchetman-hct-3f-austin',
  'black-hawk-t',
  'fenris-j',
];

for (const uid of unitIds) {
  const unit = loadUnit(uid);
  if (!unit) { console.log(`${uid}: NOT FOUND`); continue; }

  console.log(`\n=== ${uid} ===`);
  console.log('Equipment:');
  for (const eq of unit.equipment || []) {
    const norm = normalizeEquipmentId(eq.id);
    console.log(`  ${eq.id.padEnd(40)} → normalized: ${norm}`);
  }

  console.log('Ammo in crits:');
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots as string[]) {
      if (s && s.toLowerCase().includes('ammo') && !s.toLowerCase().includes('ammo feed')) {
        console.log(`  ${loc}: ${s}`);
      }
    }
  }

  // Show expected ammo weaponType vs weapon normalizedId
  console.log('Weapon-ammo pairing check:');

  // For each weapon, show what normalizeEquipmentId returns
  const weaponTypes = new Set<string>();
  for (const eq of unit.equipment || []) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heatsink') || lo.includes('heat-sink') || lo.includes('targeting-computer')) continue;
    const norm = normalizeEquipmentId(eq.id);
    weaponTypes.add(norm);
  }
  console.log('  Weapon normalized types:', [...weaponTypes]);

  // Expected ammo weapon types from the catalog
  const expectedAmmoTypes = [
    { ammo: 'lb-10-x-cluster-ammo', expectedWt: 'lb-10-x-ac' },
    { ammo: 'lb-10-x-ammo', expectedWt: 'lb-10-x-ac' },
    { ammo: 'uac-10-ammo', expectedWt: 'uac-10' },
    { ammo: 'clan-medium-chemical-laser-ammo', expectedWt: 'medium-chemical-laser' },
    { ammo: 'heavy-mg-ammo', expectedWt: 'heavy-machine-gun' },
  ];
  for (const { ammo, expectedWt } of expectedAmmoTypes) {
    const normWt = normalizeEquipmentId(expectedWt);
    const hasMatch = weaponTypes.has(normWt) || weaponTypes.has(expectedWt);
    if (uid === 'hatchetman-hct-3f-austin' && ammo.includes('lb')) {
      console.log(`  Ammo wt="${expectedWt}" → norm="${normWt}", match in weapons: ${hasMatch}`);
    } else if (uid === 'enfield-end-6j-ec' && ammo.includes('uac')) {
      console.log(`  Ammo wt="${expectedWt}" → norm="${normWt}", match in weapons: ${hasMatch}`);
    } else if (uid === 'black-hawk-t' && ammo.includes('chem')) {
      console.log(`  Ammo wt="${expectedWt}" → norm="${normWt}", match in weapons: ${hasMatch}`);
    } else if (uid === 'fenris-j' && ammo.includes('mg')) {
      console.log(`  Ammo wt="${expectedWt}" → norm="${normWt}", match in weapons: ${hasMatch}`);
    }
  }
}
