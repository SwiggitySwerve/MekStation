import { readFileSync } from 'fs';
import * as path from 'path';

import { calculateBattleValueForUnit } from '../battleValueCalculations';
import { calculateHeatTrackedWeapons } from '../battleValueHeatTracking';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../contractBVUnitAdapter';
import { getEquipmentEntry, resolveEquipmentBV } from '../equipmentBVResolver';

// MegaMek 48fcb2f64: ISUAC5Prototype.java:62-71; UACWeapon.java:65;
// HeatTrackingBVCalculator.java:178-180 doubles AC_ULTRA heat for BV only.
it.each([
  'ISUltraAC5Prototype',
  'IS Ultra AC/5 Prototype',
  'isultraac5prototype-registry',
])('%s applies the Ultra multiplier without changing firing heat', (id) => {
  expect(getEquipmentEntry(id)?.heat).toBe(1);
  expect(resolveEquipmentBV(id)).toEqual({
    battleValue: 112,
    heat: 2,
    resolved: true,
  });
  const weapon = resolveEquipmentBV(id);
  expect(
    calculateHeatTrackedWeapons(
      Array.from({ length: 3 }, () => ({
        bv: weapon.battleValue,
        heat: weapon.heat,
      })),
      3,
    ).reduce((sum, mount) => sum + mount.adjustedBV, 0),
  ).toBe(280);
});

it('retains the Starfire prototype oracle total below its heat cutoff', () => {
  const source: IContractBVSource = JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        'public/data/units/aerospace/Starfire SF-1X (Prototype).json',
      ),
      'utf8',
    ),
  );
  expect(
    calculateBattleValueForUnit(contractUnitToBVUnit(source))?.breakdown.final,
  ).toBe(927);
});
