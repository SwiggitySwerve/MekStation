import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { getEquipmentEntry } from '../../equipmentBV';

// The converter now writes rifles as `<size>-rifle`
// (scripts/megameklab-conversion/enum_mappings.py:366); the committed catalog
// predates that and still says `rifle-cannon,-<size>`. Use the current spelling,
// as CAT-Q1b's conversion of the pinned mm-data does.
const converterSpelling = (id: string): string =>
  id.replace(/^rifle-cannon,-(heavy|medium|light)$/, '$1-rifle');

const bv = (file: string): number | undefined => {
  const source = JSON.parse(
    readFileSync(
      join(process.cwd(), 'public/data/units/vehicles', `${file}.json`),
      'utf8',
    ),
  ) as IContractBVSource;
  const unit = {
    ...source,
    equipment: source.equipment?.map((mount) => ({
      ...mount,
      id: converterSpelling(mount.id),
    })),
  };
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(unit));
  return result?.kind === 'vehicle' ? result.breakdown.final : undefined;
};

// Follow-up 93 for VEH-BV-RES (IDENTITY-BLOCKERS.md): converter slugs that name
// an existing pinned MegaMek 48fcb2f64 record but reached nothing, so the BV
// lost the weapon (and, through the ammo cap, its bins). Java totals: UL-16b.
it.each([
  // ISRifleMedium.java:72, 51 BV; its 6 BV bins were capped to 0 without it.
  ['Demon Medium Tank (Rifle)', 386],
  ['Auxiliary Defense Tank ADT-1', 192],
  // ISRifleHeavy.java:72, 91 BV.
  ['Estevez MBT', 293],
  ['Scorpion Light Tank (Rifle)', 338],
  // ISRifleLight.java:72, 21 BV.
  ['J. Edgar Light Hover Tank (Cell)', 398],
  // AmmoType.java:6043-6052, IS Heavy Flamer Ammo, 2 BV per bin.
  ['Bolla Stealth Tank Dominus', 898],
  // AmmoType.java:12270-12278, Taser Ammo, 5 BV per bin.
  ['Manteuffel Attack Tank E', 1256],
])('%s reaches Java’s BV (%d)', (file, java) => {
  expect(bv(file)).toBe(java);
});

it.each([
  ['light-rifle', 'rifle-cannon-light'],
  ['medium-rifle', 'rifle-cannon-medium'],
  ['heavy-rifle', 'rifle-cannon-heavy'],
  ['is-heavy-flamer-ammo:omni', 'is-heavy-flamer-ammo-registry'],
  ['taser-ammo:omni', 'taser-ammo-registry'],
])('resolves the converter slug %s to %s', (slug, id) => {
  expect(getEquipmentEntry(slug)?.id).toBe(id);
});
