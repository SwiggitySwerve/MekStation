import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import {
  calculateAerospaceDefensiveBV,
  type IAerospaceBVInput,
} from '../aerospaceBV';

function dispatch(unit: ReturnType<typeof contractUnitToBVUnit>) {
  const result = calculateBattleValueForUnit(unit);
  if (result?.kind !== 'aerospace') throw new Error('Expected aerospace BV');
  return result.breakdown;
}

const firebird = {
  id: 'Firebird FR-1',
  unitType: 'Aerospace',
  techBase: 'INNER_SPHERE',
  tonnage: 45,
  structuralIntegrity: 5,
  movement: { safeThrust: 5, maxThrust: 8 },
  armor: { type: 'PRIMITIVE', byArc: { NOSE: 37 } },
  equipment: [
    ['autocannon-2', 'NOSE'],
    ['lrm-10', 'LEFT_WING'],
    ['lrm-10', 'RIGHT_WING'],
    ['is-ammo-ac-2', 'FUSELAGE'],
    ['is-ammo-lrm-10', 'FUSELAGE'],
    ['is-ammo-lrm-10', 'FUSELAGE'],
  ].map(([id, location]) => ({ id, location })),
};

const base: IAerospaceBVInput = {
  techBase: 'INNER_SPHERE',
  subType: AerospaceSubType.AEROSPACE_FIGHTER,
  tonnage: 45,
  structuralIntegrity: 5,
  safeThrust: 5,
  maxThrust: 8,
  armorType: 'standard',
  totalArmorPoints: 37,
  equipment: [],
};

describe('pinned aerospace source residuals (MegaMek 48fcb2f64)', () => {
  it.each([
    [firebird, 30, 87, 334.28, 421],
    [
      {
        ...firebird,
        id: 'Transit TR-9',
        tonnage: 50,
        structuralIntegrity: 6,
        movement: { safeThrust: 6, maxThrust: 9 },
        armor: { type: 'FERRO_ALUMINUM', byArc: { NOSE: 170 } },
        equipment: [
          ['autocannon-20', 'NOSE'],
          ['medium-laser', 'NOSE'],
          ['medium-laser', 'NOSE'],
          ['medium-laser', 'LEFT_WING'],
          ['medium-laser', 'RIGHT_WING'],
          ...Array.from({ length: 3 }, () => ['is-ammo-ac-20', 'FUSELAGE']),
        ].map(([id, location]) => ({ id, location })),
      },
      15,
      506.4,
      642,
      1148,
    ],
    [
      {
        ...firebird,
        id: 'Lightning LTN-G15b',
        tonnage: 50,
        structuralIntegrity: 6,
        movement: { safeThrust: 6, maxThrust: 9 },
        armor: { type: 'FERRO_ALUMINUM', byArc: { NOSE: 224 } },
        equipment: [
          ['isgaussrifle', 'NOSE'],
          ['medium-laser', 'NOSE'],
          ['ismediumpulselaser', 'LEFT_WING'],
          ['medium-laser', 'LEFT_WING'],
          ['ismediumpulselaser', 'RIGHT_WING'],
          ['medium-laser', 'RIGHT_WING'],
          ['medium-laser', 'AFT'],
          ['is-gauss-ammo', 'FUSELAGE'],
          ['is-gauss-ammo', 'FUSELAGE'],
        ].map(([id, location]) => ({ id, location })),
      },
      1,
      685.2,
      985.5,
      1671,
    ],
  ] as const)(
    'pinned unit %# matches both aggregates and total',
    (source, penalty, defense, offense, total) => {
      const result = dispatch(contractUnitToBVUnit(source));
      expect(result.explosivePenalties).toBe(penalty);
      expect(result.defensive).toBeCloseTo(defense, 8);
      expect(result.offensive).toBeCloseTo(offense, 8);
      expect(result.final).toBe(total);
    },
  );

  it.each([
    ['CLAN', undefined],
    ['CLAN', 'Clan Level 2'],
    ['MIXED', 'Mixed (Clan Chassis) Experimental'],
  ] as const)(
    '%s Clan chassis protects explosives without a CASE mount',
    (techBase, sourceTechType) => {
      const result = dispatch(
        contractUnitToBVUnit({
          ...firebird,
          techBase,
          sourceTechType,
        }),
      );
      expect(result.explosivePenalties).toBe(0);
      expect(result.defensive).toBe(123);
    },
  );

  it.each(['ISCASE', 'ISCASEII'])(
    '%s anywhere on the aircraft protects every explosive type',
    (id) => {
      const result = dispatch(
        contractUnitToBVUnit({
          ...firebird,
          equipment: [...firebird.equipment, { id, location: 'AFT' }],
        }),
      );
      expect(result.explosivePenalties).toBe(0);
      expect(result.defensive).toBe(123);
    },
  );

  it('mixed IS chassis keeps its penalty, including Clan-manufactured ammunition', () => {
    const result = dispatch(
      contractUnitToBVUnit({
        ...firebird,
        techBase: 'MIXED',
        sourceTechType: 'Mixed (IS Chassis) Experimental',
        equipment: [{ id: 'clan-streak-srm-4-ammo', location: 'FUSELAGE' }],
      }),
    );
    expect(result.explosivePenalties).toBe(15);
    expect(result.defensive).toBe(105);
  });

  it.each([
    { equipment: [] },
    { equipment: [{ id: 'is-ammo-lrm-10', location: 'Fuselage' }] },
  ])('floors the unmodified defensive pool at one', ({ equipment }) => {
    expect(
      calculateAerospaceDefensiveBV({
        ...base,
        structuralIntegrity: 0,
        totalArmorPoints: 0,
        equipment,
      }).defensive,
    ).toBe(1.2);
  });

  it('counts Gauss mounts separately, excludes safe Gauss ammunition and respects explicit totals', () => {
    const equipment = ['isgaussrifle', 'isgaussrifle', 'is-gauss-ammo'].map(
      (id) => ({ id, location: 'Nose' }),
    );
    expect(
      calculateAerospaceDefensiveBV({ ...base, equipment }).explosivePenalties,
    ).toBe(2);
    expect(
      calculateAerospaceDefensiveBV({
        ...base,
        equipment,
        explosivePenalties: 7,
      }).explosivePenalties,
    ).toBe(7);
    expect(
      calculateAerospaceDefensiveBV({ ...base, techBase: undefined, equipment })
        .explosivePenalties,
    ).toBe(0);
  });

  it('charges the PPC capacitor and its linked same-location PPC, but not an unlinked PPC', () => {
    const equipment = ['ppc', 'ppc-capacitor', 'ppc'].map((id) => ({
      id,
      location: 'Nose',
    }));
    expect(
      calculateAerospaceDefensiveBV({ ...base, equipment }).explosivePenalties,
    ).toBe(2);
    expect(
      calculateAerospaceDefensiveBV({
        ...base,
        equipment: equipment.filter((e) => e.id === 'ppc'),
      }).explosivePenalties,
    ).toBe(0);
  });

  it.each([
    [3100, 1],
    [3101, 2],
  ])(
    'Clan ER PPC capacitor eligibility in %i follows the native year boundary',
    (year, expected) => {
      const result = dispatch(
        contractUnitToBVUnit({
          ...firebird,
          year,
          equipment: ['clan-er-ppc', 'ppc-capacitor'].map((id) => ({
            id,
            location: 'NOSE',
          })),
        }),
      );
      expect(result.explosivePenalties).toBe(expected);
    },
  );

  it.each([
    ['hyper-velocity-auto-cannon-10', 1],
    ['improved-heavy-medium-laser', 1],
    ['tsemp-cannon', 1],
    ['autocannon-20', 0],
    ['rac-5', 0],
    ['ap-gauss-rifle', 0],
    ['is-ammo-lrm-10:0', 0],
  ] as const)('%s follows the native explosive class', (id, expected) => {
    expect(
      calculateAerospaceDefensiveBV({
        ...base,
        equipment: [{ id, location: 'Nose' }],
      }).explosivePenalties,
    ).toBe(expected);
  });

  // Actual HULL mounts from mm-data 50f7efef0. Other mounts are omitted to
  // isolate the adapter failure, rather than assert whole-unit BV parity.
  it.each([
    ['Ares Attack Craft Mark IX', 200, 11, 7, 'beagleactiveprobe'],
    ['Zhen Niao', 140, 8, 5, 'isguardianecmsuite'],
    ['NL-45 Gunboat', 190, 8, 5, 'clactiveprobe'],
    ['Wurger Assault Craft', 160, 9, 6, 'beagleactiveprobe'],
    ['Mowang Courier (Clandestine)', 100, 6, 3, 'isangelecmsuite'],
    ['S7-P Scarab', 100, 6, 3, 'isboobytrap'],
  ] as const)(
    '%s transports its hull mount into a computable BV',
    (id, tonnage, structuralIntegrity, safeThrust, equipmentId) => {
      const unit = contractUnitToBVUnit({
        id,
        unitType: 'Small Craft',
        tonnage,
        structuralIntegrity,
        movement: { safeThrust, maxThrust: Math.ceil(safeThrust * 1.5) },
        armor: { type: 'AEROSPACE', byArc: { NOSE: 16 } },
        equipment: [{ id: equipmentId, location: 'HULL' }],
      });
      expect(unit.equipment).toEqual([{ equipmentId, location: 'Fuselage' }]);
      const result = dispatch(unit);
      expect(Number.isFinite(result.final)).toBe(true);
      expect(result.final).toBeGreaterThan(0);
    },
  );
});
