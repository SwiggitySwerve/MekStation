import type { UnitData } from '../validate-bv-types';

import { mechBVTerms } from '../../src/utils/construction/mechBV/bvTrace';
import { buildMechBVWeapons } from '../../src/utils/construction/mechBV/weaponInputs';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'apollo-precision',
  chassis: 'Test',
  model: 'Apollo',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9, CENTER_TORSO: 20 } },
  heatSinks: { type: 'DOUBLE', count: 20 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// Pinned MegaMek 48fcb2f64 BVCalculator.java:860-876 retains the double product.
it.each([
  ['mrm-10', 56, 64.4],
  ['mrm-20', 112, 128.8],
  ['mrm-30', 168, 193.2],
  ['mrm-40', 224, 257.6],
] as const)(
  'retains fractional Apollo BV for %s through the shared Mech owner',
  (id, base, linked) => {
    const source = { ...unit, equipment: [{ id, location: 'RIGHT_TORSO' }] };
    expect(calculateUnitBV(source).breakdown?.weaponBV).toBe(base);
    const b = calculateUnitBV({
      ...source,
      criticalSlots: { RIGHT_TORSO: ['ISMRM' + id.slice(4), 'ISApollo'] },
    }).breakdown;
    expect(b?.weaponBV).toBeCloseTo(linked, 10);
    expect(b?.offensiveBV).toBeCloseTo((linked + 50) * 1.12, 10);
  },
);

it('does not round separate linked mounts before adding them', () => {
  const b = calculateUnitBV({
    ...unit,
    equipment: [
      { id: 'mrm-10', location: 'RIGHT_TORSO' },
      { id: 'mrm-20', location: 'LEFT_TORSO' },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['ISMRM10', 'ISApollo'],
      LEFT_TORSO: ['ISMRM20', 'ISApollo'],
    },
  }).breakdown;
  expect(b?.weaponBV).toBeCloseTo(193.2, 10);
});

it('captures raw cap inputs before Apollo changes the weapon-stage BV', () => {
  const source = {
    ...unit,
    equipment: [{ id: 'mrm-20', location: 'RIGHT_TORSO' }],
    criticalSlots: { RIGHT_TORSO: ['ISMRM20', 'ISApollo'] },
  };
  const built = buildMechBVWeapons(source, scanCrits(source), []);
  expect(built.ammoCapWeapons).toEqual([{ id: 'mrm-20', bv: 112 }]);
  expect(built.weapons[0].bv).toBeCloseTo(128.8, 10);
});

// BVCalculator.java:1189-1242 uses listed BV for caps; :845-847 and
// :869-875 apply drone/Apollo only in processWeapon (pin 48fcb2f64).
// Binding-ammo synthetic component cases; not valid construction designs.
it.each([
  {
    name: 'Apollo',
    id: 'mrm-20',
    slots: ['ISMRM20', 'ISApollo'],
    ammo: 'IS MRM 20 Ammo',
    bins: 9,
    group: 'MRM:20',
    cap: 112,
    weaponBV: 128.8,
  },
  {
    name: 'drone',
    id: 'lrm-5',
    slots: ['ISLRM5', 'ISDroneOperatingSystem'],
    ammo: 'IS Ammo LRM-5',
    bins: 8,
    group: 'LRM:5',
    cap: 45,
    weaponBV: 36,
  },
])('uses raw weapon BV for a binding $name ammunition cap', (example) => {
  const result = calculateUnitBV({
    ...unit,
    equipment: [{ id: example.id, location: 'RIGHT_TORSO' }],
    criticalSlots: {
      RIGHT_TORSO: [
        ...example.slots,
        ...Array<string>(example.bins).fill(example.ammo),
      ],
    },
  }).breakdown;
  expect(result?.ammoPools?.cap[example.group]).toBe(example.cap);
  expect(result?.ammoBV).toBe(example.cap);
  expect(result?.weaponBV).toBeCloseTo(example.weaponBV, 10);
});

// Pinned BVCalculator.java:1230 excludes F_ONE_SHOT in assembleAmmo.
it.each(['srm-6-os', 'srm-6-i-os', 'CLSRM6 (IOS)'])(
  'emits no ammunition cap for one-shot launcher %s',
  (id) => {
    const result = calculateUnitBV({
      ...unit,
      equipment: [{ id, location: 'HEAD' }],
      criticalSlots: { HEAD: ['ISDroneOperatingSystem'] },
    }).breakdown;
    if (!result) throw new Error('Expected a Mech BV breakdown');
    expect(result.ammoPools?.cap).not.toHaveProperty('SRM:6');
    expect(mechBVTerms(result)).not.toHaveProperty(['ammo.cap.SRM:6']);
    expect(result.ammoBV).toBe(0);
    expect(result.weaponBV).toBeGreaterThan(0);
  },
);

it('retains only the normal launcher cap in a mixed normal/OS/IOS group', () => {
  const result = calculateUnitBV({
    ...unit,
    equipment: ['srm-6', 'srm-6-os', 'srm-6-i-os'].map((id) => ({
      id,
      location: 'RIGHT_TORSO',
    })),
  }).breakdown;
  if (!result) throw new Error('Expected a Mech BV breakdown');
  expect(result.ammoPools?.cap['SRM:6']).toBe(59);
  expect(mechBVTerms(result)).toHaveProperty(['ammo.cap.SRM:6'], 59);
});
