/**
 * Power amplifier rules: which engines need them, and which energy weapons
 * count towards them (MegaMek TestTank.getWeightPowerAmp: non-fusion,
 * non-fission engines; energy weapons except Clan chemical lasers and
 * vehicle flamers, which burn ammunition).
 */

import { EngineType } from '@/types/construction/EngineType';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import {
  isPowerAmplifierEnergyWeapon,
  requiresPowerAmplifiers,
} from '../powerAmplifier';

describe('requiresPowerAmplifiers', () => {
  it.each([EngineType.ICE, EngineType.FUEL_CELL])(
    'requires them on %s',
    (t) => {
      expect(requiresPowerAmplifiers(t)).toBe(true);
    },
  );

  it.each([EngineType.STANDARD, EngineType.XL_IS, EngineType.FISSION])(
    'does not require them on %s',
    (t) => {
      expect(requiresPowerAmplifiers(t)).toBe(false);
    },
  );
});

describe('isPowerAmplifierEnergyWeapon', () => {
  it('counts an ordinary energy weapon', () => {
    expect(
      isPowerAmplifierEnergyWeapon({
        category: EquipmentCategory.ENERGY_WEAPON,
      }),
    ).toBe(true);
  });

  it('skips an ammunition-fed energy weapon', () => {
    expect(
      isPowerAmplifierEnergyWeapon({
        category: EquipmentCategory.ENERGY_WEAPON,
        special: ['Causes 2 heat to target', 'Requires ammo'],
      }),
    ).toBe(false);
  });

  it('skips equipment that is not an energy weapon', () => {
    expect(
      isPowerAmplifierEnergyWeapon({
        category: EquipmentCategory.BALLISTIC_WEAPON,
      }),
    ).toBe(false);
  });
});
