import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { calculateAerospaceBV, type IAerospaceBVInput } from '../aerospaceBV';

/**
 * MegaMek 48fcb2f64: BVCalculator.java:518-646,1159-1193;
 * AeroBVCalculator.java:118-138,159-179. Pinned mm-data 50f7efef0.
 * @spec establish-all-unit-data-parity: Aerospace Defensive BV
 * @spec establish-all-unit-data-parity: Aerospace BV Dispatch
 */
describe('aerospace defensive equipment and final sum parity', () => {
  it.each([
    ['Boeing Jump Bomber', 20, 9, 16, 'STANDARD', [], 0, 63.8, 64],
    [
      'Saroyan Jump Bomber',
      25,
      8,
      24,
      'STEALTH',
      ['istag', 'is-vehicular-stealth', 'isguardianecmsuite'],
      61,
      191.8,
      192,
    ],
  ] as const)(
    '%s matches pinned Java through contract dispatch',
    (
      id,
      tonnage,
      structuralIntegrity,
      armor,
      armorType,
      ids,
      equipmentBV,
      defense,
      final,
    ) => {
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({
          id,
          unitType: 'Conventional Fighter',
          tonnage,
          structuralIntegrity,
          movement: { safeThrust: 8, maxThrust: 12 },
          armor: { type: armorType, byArc: { NOSE: armor } },
          equipment: ids.map((id) => ({ id, location: 'AFT' })),
        }),
      );
      if (result?.kind !== 'aerospace')
        throw new Error('Expected aerospace BV');
      expect(result.breakdown.final).toBe(final);
      expect(result.breakdown.defensiveEquipmentBV).toBe(equipmentBV);
      expect(result.breakdown.defensive).toBeCloseTo(defense, 10);
      expect(result.breakdown.offensive).toBe(0);
      expect(result.breakdown.subTypeMultiplier).toBe(1);
    },
  );

  const base: IAerospaceBVInput = {
    subType: AerospaceSubType.AEROSPACE_FIGHTER,
    tonnage: 50,
    structuralIntegrity: 5,
    safeThrust: 5,
    maxThrust: 8,
    armorType: 'standard',
    totalArmorPoints: 40,
    equipment: [],
  };

  it.each([
    ['ISGuardianECMSuite', 61],
    ['CLActiveProbe', 12],
    ['ISChaffPod', 19],
    ['ISAntiMissileSystem', 32],
    ['ISLaserAntiMissileSystem', 45],
    ['m-pod', 5],
    ['b-pod', 2],
  ])('%s contributes once to defense before type scaling', (id, bv) => {
    const result = calculateAerospaceBV({
      ...base,
      equipment: [{ id: String(id), location: 'Nose' }],
    });
    expect(result.defensiveEquipmentBV).toBe(bv);
    expect(result.defensive).toBeCloseTo((110 + Number(bv)) * 1.2, 10);
    expect(result.offensive).toBe(0);
  });

  it('caps AMS ammunition at installed ballistic AMS BV and preserves multiplicity', () => {
    const equipment = [
      { id: 'ams', location: 'Nose' },
      ...Array.from({ length: 4 }, () => ({ id: 'ams-ammo', location: 'Aft' })),
    ];
    expect(
      calculateAerospaceBV({ ...base, equipment }).defensiveEquipmentBV,
    ).toBe(64);
    const orphan = calculateAerospaceBV({
      ...base,
      equipment: equipment.slice(1),
    });
    expect(orphan.defensiveEquipmentBV).toBe(0);
    expect(orphan.offensive).toBe(0);
    const laser = calculateAerospaceBV({
      ...base,
      equipment: [{ id: 'laser-ams', location: 'Nose' }, ...equipment.slice(1)],
    });
    expect(laser.defensiveEquipmentBV).toBe(45);
  });

  it('excludes defensive ammunition from the explicit offensive ammo list', () => {
    const result = calculateAerospaceBV({
      ...base,
      equipment: [{ id: 'ams', location: 'Nose' }],
      ammo: [{ id: 'ams-ammo', weaponType: 'ams', bv: 11 }],
    });
    expect(result.ammoBV).toBe(0);
    expect(result.offensive).toBe(0);
  });

  it('preserves weapon offense, pilot adjustment and explicit defensive additions', () => {
    const equipment = [{ id: 'medium-laser', location: 'Nose' }];
    const control = calculateAerospaceBV({
      ...base,
      equipment,
      pilotGunnery: 3,
      pilotPiloting: 4,
    });
    const result = calculateAerospaceBV({
      ...base,
      equipment: [
        ...equipment,
        { id: 'guardian-ecm', location: 'Aft' },
        { id: 'guardian-ecm', location: 'Aft' },
      ],
      defensiveEquipmentBV: 10,
      pilotGunnery: 3,
      pilotPiloting: 4,
    });
    expect(result.defensiveEquipmentBV).toBe(132);
    expect(result.arcContributions).toEqual(control.arcContributions);
    expect(result.offensive).toBe(control.offensive);
    expect(result.pilotMultiplier).toBe(control.pilotMultiplier);
    expect(result.final).toBe(
      Math.round(
        (result.defensive + result.offensive) * result.pilotMultiplier,
      ),
    );
  });
});
