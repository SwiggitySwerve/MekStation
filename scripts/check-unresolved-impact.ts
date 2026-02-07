#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const basePath = './public/data/units/battlemechs';
const data = JSON.parse(fs.readFileSync('./validation-output/bv-validation-report.json', 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf8'));

// Check what BV the unresolved weapons SHOULD have
// by looking up MegaMek values

const MISSING_WEAPON_BV: Record<string, { bv: number, heat: number, source: string }> = {
  // Clan Plasma Cannon: MegaMek CLPlasmaCannon.java bv=170 heat=7
  'plasma-cannon': { bv: 170, heat: 7, source: 'CLPlasmaCannon.java' },
  // Clan ER Medium Pulse Laser: already in catalog as 'clan-er-medium-pulse-laser' BV=117
  'er-medium-pulse-laser': { bv: 117, heat: 6, source: 'catalog: clan-er-medium-pulse-laser' },
  // Clan ER Large Pulse Laser: already in catalog as 'clan-er-large-pulse-laser' BV=272
  'er-large-pulse-laser': { bv: 272, heat: 13, source: 'catalog: clan-er-large-pulse-laser' },
  // Clan ER Small Pulse Laser: already in catalog as 'clan-er-small-pulse-laser' BV=36
  'er-small-pulse-laser': { bv: 36, heat: 3, source: 'catalog: clan-er-small-pulse-laser' },
  // Silver Bullet Gauss: MegaMek ISSB bv=198
  'silver-bullet-gauss-rifle': { bv: 198, heat: 1, source: 'MegaMek estimate' },
  // Blazer Cannon / Binary Laser: BV=222
  'blazer-cannon': { bv: 222, heat: 16, source: 'MegaMek ISBinaryLaserCannon' },
  'binary-laser-blazer-cannon': { bv: 222, heat: 16, source: 'same as blazer' },
  // Particle Cannon (Enhanced PPC variant, Clan): bv=???
  'particle-cannon': { bv: 0, heat: 0, source: 'unknown - needs investigation' },
  // Improved Large Laser: TM errata BV=163
  'improved-large-laser': { bv: 163, heat: 12, source: 'estimate' },
  // Medium Chem Laser (Clan): already in catalog as 'clan-medium-chemical-laser' BV=37
  'medium-chem-laser': { bv: 37, heat: 2, source: 'catalog: clan-medium-chemical-laser' },
  // Sniper (artillery cannon): bv=50 heat=2
  'sniper': { bv: 50, heat: 2, source: 'estimate' },
  // Enhanced PPC: MegaMek CLEnhancedPPC bv=???
  'enhanced-ppc': { bv: 0, heat: 0, source: 'needs lookup' },
  // Fluid Gun: low BV weapon
  'fluid-gun': { bv: 6, heat: 0, source: 'estimate' },
};

// Calculate the impact of unresolved weapons on BV
console.log('=== IMPACT ANALYSIS: Unresolved Weapons on Undercalculating Units ===\n');

const undercalcUnits = data.allResults.filter((r: any) =>
  r.status === 'within5' && r.percentDiff < -1
);

let unitsWithUnresolved = 0;
let totalMissingBV = 0;
let totalUnits = 0;

interface UnitImpact {
  unitId: string;
  indexBV: number;
  calcBV: number;
  pctDiff: number;
  missingWeapons: string[];
  estimatedMissingBV: number;
}

const impacts: UnitImpact[] = [];

for (const result of undercalcUnits) {
  const entry = index.units.find((u: any) => u.id === result.unitId);
  if (!entry) continue;
  const unitPath = path.join(basePath, entry.path);
  if (!fs.existsSync(unitPath)) continue;

  const unitData = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
  const equipment = unitData.equipment || [];
  totalUnits++;

  const missingWeapons: string[] = [];
  let missingBV = 0;

  for (const eq of equipment) {
    const resolved = resolveEquipmentBV(eq.id);
    if (!resolved.resolved || resolved.battleValue === 0) {
      const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
      // Skip non-weapon equipment
      if (lo.includes('ammo') || lo.includes('heat-sink') || lo.includes('jump-jet') ||
          lo.includes('case') || lo.includes('tsm') || lo.includes('masc') ||
          lo.includes('endo') || lo.includes('ferro') || lo.includes('myomer') ||
          lo.includes('shield') || lo.includes('coolant') || lo.includes('actuator') ||
          lo.includes('supercharger') || lo.includes('targeting-computer')) continue;

      missingWeapons.push(eq.id);
      const known = MISSING_WEAPON_BV[lo];
      if (known) {
        missingBV += known.bv;
      }
    }
  }

  if (missingWeapons.length > 0) {
    unitsWithUnresolved++;
    totalMissingBV += missingBV;
    impacts.push({
      unitId: result.unitId,
      indexBV: result.indexBV,
      calcBV: result.calculatedBV,
      pctDiff: result.percentDiff,
      missingWeapons,
      estimatedMissingBV: missingBV,
    });
  }
}

console.log(`Undercalculating units total: ${totalUnits}`);
console.log(`Units with unresolved weapons: ${unitsWithUnresolved} (${(unitsWithUnresolved / totalUnits * 100).toFixed(1)}%)`);
console.log(`Estimated total missing BV: ${totalMissingBV}\n`);

console.log('Top 15 impacted units:');
impacts.sort((a, b) => b.estimatedMissingBV - a.estimatedMissingBV);
for (const imp of impacts.slice(0, 15)) {
  console.log(`  ${imp.unitId}: index=${imp.indexBV}, calc=${imp.calcBV}, diff=${imp.pctDiff.toFixed(2)}%`);
  console.log(`    Missing: ${imp.missingWeapons.join(', ')}`);
  console.log(`    Est. missing BV: ${imp.estimatedMissingBV}`);
}

// Check: do ER pulse lasers without 'clan-' prefix explain any of this?
console.log('\n\n=== ER PULSE LASER PREFIX ISSUE ===');
console.log('These weapons exist in catalog with clan- prefix but units reference them without:');
const erPulseTests = [
  { unit: 'er-medium-pulse-laser', catalog: 'clan-er-medium-pulse-laser' },
  { unit: 'er-large-pulse-laser', catalog: 'clan-er-large-pulse-laser' },
  { unit: 'er-small-pulse-laser', catalog: 'clan-er-small-pulse-laser' },
];
for (const test of erPulseTests) {
  const resolved = resolveEquipmentBV(test.catalog);
  console.log(`  ${test.unit} -> should be ${test.catalog} (BV=${resolved.battleValue}, heat=${resolved.heat})`);
  const badResolve = resolveEquipmentBV(test.unit);
  console.log(`    Resolves as: BV=${badResolve.battleValue}, resolved=${badResolve.resolved}`);
}
