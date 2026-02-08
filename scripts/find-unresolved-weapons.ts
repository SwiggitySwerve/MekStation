#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const basePath = 'public/data/units/battlemechs';

const unresolved = new Map<string, number>();
const nonWeaponKeywords = ['heatsink','heat-sink','endo','ferro','case','artemis','targeting-computer','targeting computer','ecm','bap','probe','c3','masc','tsm','jump-jet','jump jet','harjel','umu','shield','sword','hatchet','mace','a-pod','b-pod','m-pod','apod','bpod','mpod','blue-shield','null-signature','chameleon','coolant-pod','coolantpod','supercharger','drone','improved-sensors','beagle','angel-ecm','guardian-ecm','light-active-probe','bloodhound','apollo','tag','machine-gun-array','light-machine-gun-array','heavy-machine-gun-array','mga','lmga','hmga','lift-hoist','lifthoist','retractable-blade','remote-sensor','partial-wing','partialwing','searchlight','tracks','cargo','spikes','minesweeper'];

for (const iu of indexData.units) {
  const unitPath = path.join(basePath, iu.path);
  if (!fs.existsSync(unitPath)) continue;
  const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  for (const eq of ud.equipment || []) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo')) continue;
    let isNonWeapon = false;
    for (const kw of nonWeaponKeywords) {
      if (lo.includes(kw)) { isNonWeapon = true; break; }
    }
    if (isNonWeapon) continue;

    const stripped = eq.id.replace(/^\d+-/, '');
    const result = resolveEquipmentBV(stripped);
    if (!result.resolved || result.battleValue === 0) {
      const norm = normalizeEquipmentId(stripped);
      unresolved.set(norm, (unresolved.get(norm) || 0) + 1);
    }
  }
}

console.log('=== UNRESOLVED WEAPON IDs (frequency) ===');
const sorted = [...unresolved.entries()].sort((a, b) => b[1] - a[1]);
for (const [id, count] of sorted.slice(0, 40)) {
  console.log(`  ${count}x "${id}"`);
}
