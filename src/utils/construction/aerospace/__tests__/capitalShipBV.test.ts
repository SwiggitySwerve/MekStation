import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceDefensiveBV } from '../aerospaceBVCalculator';

/** @spec establish-all-unit-data-parity: Capital ship defensive BV dispatch */
describe('capital defensive BV (MegaMek 48fcb2f64)', () => {
  it.each([
    ['Comitatus (2995)', UnitType.JUMPSHIP, 84, 1, 2142, 5919],
    ['Aegis (2582)', UnitType.WARSHIP, 586, 75, 12920, 187814],
    ['Crucible', UnitType.SPACE_STATION, 60, 1, 1064, 2004],
  ] as const)(
    '%s exposes Java defense with final BV unavailable',
    (_name, unitType, armor, si, defense, javaTotal) => {
      // Native Comitatus equipment subtotal: 12 Clan AMS (384) + ammo (352).
      // Supplying native facts isolates arithmetic from catalog/converter gaps;
      // the external 185-row comparison uses unmodified converted equipment.
      const unit = {
        unitType,
        totalArmorPoints: armor,
        structuralIntegrity: si,
        defensiveEquipmentBV: unitType === UnitType.JUMPSHIP ? 736 : 0,
      };
      const result = calculateBattleValueForUnit(unit);
      expect(result?.kind).toBe('capital-ship');
      expect(result?.breakdown).toMatchObject({
        calculationScope: 'defensive-only',
        armorBV: armor * 25,
        siBV: si * 20,
        defensive: defense,
        defensiveFactor: 1,
        explosivePenalties: 0,
      });
      if (result?.kind !== 'capital-ship')
        throw new Error('Capital dispatch missing');
      expect(result.breakdown.offensive).toBeUndefined();
      expect(result?.breakdown.final).toBeUndefined();
      expect(result?.breakdown.final).not.toBe(javaTotal);
    },
  );

  it.each([
    UnitType.JUMPSHIP,
    UnitType.WARSHIP,
    UnitType.SPACE_STATION,
  ] as const)('%s preserves zero and requires SI and arc armor', (unitType) => {
    const source = {
      id: 'empty',
      unitType,
      tonnage: 1,
      structuralIntegrity: 0,
      movement: {},
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
    expect(() =>
      calculateBattleValueForUnit({
        unitType,
        structuralIntegrity: NaN,
        totalArmorPoints: 0,
      }),
    ).toThrow('finite SI and total armor');
  });

  it('preserves hull and broadside equipment, excludes weapons, and caps AMS ammo', () => {
    const source = {
      id: 'mounts',
      unitType: UnitType.WARSHIP,
      tonnage: 100000,
      structuralIntegrity: 0,
      movement: {},
      armor: { type: 'FERRO_CARBIDE', byArc: { NOSE: 0 } },
      equipment: [
        { id: 'ISGuardianECMSuite', location: 'HULL' },
        { id: 'ISAntiMissileSystem', location: 'LEFT_BROADSIDE' },
        ...Array.from({ length: 5 }, () => ({
          id: 'ams-ammo',
          location: 'RIGHT_BROADSIDE',
        })),
        { id: 'medium-laser', location: 'NOSE' },
      ],
    };
    const adapted = contractUnitToBVUnit(source);
    expect(adapted.equipment?.map((e) => e.location)).toEqual(
      source.equipment.map((e) => e.location),
    );
    expect(calculateBattleValueForUnit(adapted)?.breakdown).toMatchObject({
      defensiveEquipmentBV: 125,
      defensive: 100,
    });
    expect(
      calculateBattleValueForUnit(adapted, { gunnery: 0, piloting: 0 }),
    ).toEqual(calculateBattleValueForUnit(adapted));
  });

  it.each([
    [UnitType.JUMPSHIP, 0.75],
    [UnitType.WARSHIP, 0.8],
    [UnitType.SPACE_STATION, 0.7],
  ] as const)(
    '%s overrides the entire aircraft type stage',
    (subType, modifier) => {
      const input = {
        subType,
        structuralIntegrity: 5,
        totalArmorPoints: 40,
        armorType: 'stealth',
        equipment: [],
        explosivePenalties: 9999,
      };
      expect(calculateAerospaceDefensiveBV(input)).toMatchObject({
        armorBV: 1000,
        siBV: 100,
        defensive: 1100 * modifier,
        explosivePenalties: 0,
      });
      expect(
        calculateAerospaceDefensiveBV({ ...input, armorType: 'reactive' })
          .defensive,
      ).toBe(1600 * modifier);
      for (const armorType of [
        'ferro-carbide',
        'lamellor-ferro-carbide',
        'improved-ferro-aluminum',
      ]) {
        expect(
          calculateAerospaceDefensiveBV({ ...input, armorType }).defensive,
        ).toBe(1100 * modifier);
      }
    },
  );
});
