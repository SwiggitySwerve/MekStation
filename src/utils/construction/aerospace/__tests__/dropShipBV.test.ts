import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceDefensiveBV } from '../aerospaceBVCalculator';

/** @spec establish-all-unit-data-parity: DropShip defensive BV dispatch */
describe('DropShip defensive BV slice (MegaMek 48fcb2f64)', () => {
  const union = {
    unitType: UnitType.DROPSHIP,
    structuralIntegrity: 11,
    totalArmorPoints: 644,
    armorType: 'aerospace',
    equipment: [],
  };

  it('exposes Union (2708) defense without claiming the unported 3972 total', () => {
    const result = calculateBattleValueForUnit(union);
    expect(result?.kind).toBe('dropship');
    expect(result?.breakdown).toMatchObject({
      calculationScope: 'defensive-only',
      armorBV: 1610,
      siBV: 22,
      defensive: 1632,
      explosivePenalties: 0,
      defensiveFactor: 1,
    });
    expect(result?.breakdown.final).toBeUndefined();
  });

  it('accepts contract JSON and carries only defensive facts, including hull mounts', () => {
    const adapted = contractUnitToBVUnit({
      id: 'union-2708',
      unitType: 'DropShip',
      tonnage: 3600,
      structuralIntegrity: 11,
      movement: { safeThrust: 3, maxThrust: 5 },
      armor: {
        type: 'AEROSPACE',
        byArc: { NOSE: 180, LEFT_SIDE: 180, RIGHT_SIDE: 180, AFT: 104 },
      },
      equipment: [{ id: 'ISGuardianECMSuite', location: 'HULL' }],
    });
    expect(adapted).toEqual({
      ...union,
      equipment: [{ equipmentId: 'ISGuardianECMSuite', location: 'HULL' }],
    });
    expect(calculateBattleValueForUnit(adapted)?.breakdown).toMatchObject({
      defensiveEquipmentBV: 61,
      defensive: 1693,
    });
  });

  it('reuses mounted AMS ammunition caps and excludes weapons from defense', () => {
    expect(
      calculateBattleValueForUnit({
        ...union,
        equipment: [
          { equipmentId: 'ISAntiMissileSystem', location: 'Nose' },
          { equipmentId: 'ams-ammo', location: 'Nose' },
          { equipmentId: 'ams-ammo', location: 'Nose' },
          { equipmentId: 'medium-laser', location: 'Aft' },
        ],
      })?.breakdown,
    ).toMatchObject({ defensiveEquipmentBV: 54, defensive: 1686 });
  });

  it('accepts domain arc mounts and ignores pilot skills until the final stage exists', () => {
    const unit = {
      ...union,
      equipment: [{ equipmentId: 'ISGuardianECMSuite', arc: 'FL' }],
    };
    expect(
      calculateBattleValueForUnit(unit, { gunnery: 0, piloting: 0 }),
    ).toEqual(calculateBattleValueForUnit(unit));
    expect(calculateBattleValueForUnit(unit)?.breakdown).toMatchObject({
      defensive: 1693,
    });
  });

  it('inherits stealth and armor multipliers but no explosive stage or minimum', () => {
    const input = {
      subType: UnitType.DROPSHIP as const,
      structuralIntegrity: 0,
      totalArmorPoints: 0,
      armorType: 'standard',
      equipment: [],
      explosivePenalties: 99,
    };
    expect(calculateAerospaceDefensiveBV(input).defensive).toBe(0);
    expect(
      calculateAerospaceDefensiveBV({
        ...input,
        totalArmorPoints: 40,
        structuralIntegrity: 5,
        armorType: 'stealth',
      }).defensive,
    ).toBe(143);
    expect(
      calculateAerospaceDefensiveBV({
        ...input,
        totalArmorPoints: 40,
        structuralIntegrity: 5,
        armorType: 'reactive',
      }).defensive,
    ).toBe(160);
  });

  it('rejects non-finite domain facts instead of returning a successful NaN result', () => {
    expect(() =>
      calculateBattleValueForUnit({ ...union, structuralIntegrity: NaN }),
    ).toThrow('finite SI and total armor');
  });

  it('rejects absent required contract defense facts while preserving zero', () => {
    const source = {
      id: 'empty',
      unitType: 'DropShip',
      tonnage: 3600,
      movement: {},
      structuralIntegrity: 0,
      armor: { type: 'AEROSPACE', byArc: { NOSE: 0 } },
    };
    expect(
      calculateBattleValueForUnit(contractUnitToBVUnit(source))?.breakdown,
    ).toMatchObject({ defensive: 0 });
    expect(() =>
      contractUnitToBVUnit({ ...source, structuralIntegrity: undefined }),
    ).toThrow('structuralIntegrity');
    expect(() =>
      contractUnitToBVUnit({ ...source, armor: { type: 'AEROSPACE' } }),
    ).toThrow('armor.byArc');
  });
});
