import type { IUnitConfig } from '@/services/printing/RecordSheetService';
import type { IRecordSheetMechCrew } from '@/types/printing';

import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { getMechCrewRoles } from '@/types/pilot';
import { RecordSheetDataSchema } from '@/types/printing';

const unit: IUnitConfig = {
  id: 'explicit-crew',
  name: 'Crew fixture',
  chassis: 'Fixture',
  model: 'Test',
  tonnage: 150,
  techBase: 'Inner Sphere',
  rulesLevel: 'Advanced',
  era: '3150',
  configuration: 'Tripod',
  engine: { type: 'Fusion', rating: 300 },
  gyro: { type: 'Standard' },
  structure: { type: 'Standard' },
  armor: {
    type: 'Standard',
    allocation: {
      head: 9,
      centerTorso: 30,
      centerTorsoRear: 10,
      leftTorso: 20,
      leftTorsoRear: 8,
      rightTorso: 20,
      rightTorsoRear: 8,
      leftArm: 20,
      rightArm: 20,
      leftLeg: 30,
      rightLeg: 30,
      centerLeg: 30,
    },
  },
  heatSinks: { type: 'Single', count: 10 },
  movement: { walkMP: 3, runMP: 5, jumpMP: 0 },
  equipment: [],
};
const crew: IRecordSheetMechCrew = {
  crewType: 'SUPERHEAVY_TRIPOD',
  slots: [
    {
      slotIndex: 0,
      role: 'Pilot',
      pilot: { name: 'Same name', gunnery: 4, piloting: 2, wounds: 1 },
    },
    {
      slotIndex: 1,
      role: 'Gunner',
      pilot: { name: 'Same name', gunnery: 1, piloting: 5, wounds: 2 },
    },
    { slotIndex: 2, role: 'Tech Officer' },
  ],
};
const service = new RecordSheetService();

it.each([
  ['TRIPOD', 'Tripod', ['Pilot', 'Gunner']],
  ['SUPERHEAVY_TRIPOD', 'Tripod', ['Pilot', 'Gunner', 'Tech Officer']],
  ['QUADVEE', 'QuadVee', ['Pilot', 'Gunner']],
] as const)(
  'retains pinned %s identity through public extraction and schema',
  (crewType, configuration, roles) => {
    const supplied = { crewType, slots: crew.slots.slice(0, roles.length) };
    const data = service.extractData({
      ...unit,
      configuration,
      crew: supplied,
    });
    expect(getMechCrewRoles(crewType)).toEqual(roles);
    expect(data.crew).toEqual(supplied);
    const parsed = RecordSheetDataSchema.parse(data);
    if (parsed.unitType !== 'mech') throw new Error('Expected Mech payload');
    expect(parsed.crew).toEqual(supplied);
    expect(data).toEqual({
      ...service.extractData({ ...unit, configuration }),
      crew: supplied,
    });
  },
);

it('keeps an unassigned tech slot empty and designated abilities crew-global', () => {
  const data = service.extractData({ ...unit, crew }, [
    {
      abilityId: 'weapon_specialist',
      acquiredDate: '2026-01-01',
      designation: {
        kind: 'weapon_type',
        weaponTypeId: 'ppc',
        displayLabel: 'PPC',
      },
    },
  ]);
  expect(data.crew?.slots[2]).toEqual({ slotIndex: 2, role: 'Tech Officer' });
  expect(data.specialAbilities?.[0].headline).toBe('Weapon Specialist (PPC)');
  expect(JSON.parse(JSON.stringify(data.crew))).toEqual(crew);
  expect(crew.slots[0].pilot?.name).toBe(crew.slots[1].pilot?.name);
  expect(data.pilot).toBeUndefined();
});

it('retains a wholly unassigned roster without inventing occupants', () => {
  const empty = {
    ...crew,
    slots: crew.slots.map(({ slotIndex, role }) => ({ slotIndex, role })),
  };
  expect(service.extractData({ ...unit, crew: empty }).crew).toEqual(empty);
});

it.each([
  { ...crew, slots: crew.slots.slice(0, 2) },
  { ...crew, slots: [...crew.slots, crew.slots[2]] },
  { ...crew, slots: [...crew.slots].reverse() },
  {
    ...crew,
    slots: [{ ...crew.slots[0], slotIndex: 1 }, ...crew.slots.slice(1)],
  },
  {
    ...crew,
    slots: [{ ...crew.slots[0], slotIndex: -1 }, ...crew.slots.slice(1)],
  },
  {
    ...crew,
    slots: [{ ...crew.slots[0], slotIndex: 3 }, ...crew.slots.slice(1)],
  },
  {
    ...crew,
    slots: [{ ...crew.slots[0], slotIndex: 0.5 }, ...crew.slots.slice(1)],
  },
  {
    ...crew,
    slots: [{ ...crew.slots[0], role: 'Gunner' }, ...crew.slots.slice(1)],
  },
  {
    ...crew,
    slots: [{ ...crew.slots[0], role: 'Driver' }, ...crew.slots.slice(1)],
  },
  { ...crew, crewType: 'UNKNOWN' },
  { ...crew, specialAbilities: [] },
  {
    ...crew,
    slots: [
      { ...crew.slots[0], pilot: { ...crew.slots[0].pilot, edge: 1 } },
      ...crew.slots.slice(1),
    ],
  },
  {
    ...crew,
    slots: [{ ...crew.slots[0], specialAbilities: [] }, ...crew.slots.slice(1)],
  },
  {
    ...crew,
    slots: [
      { ...crew.slots[0], pilot: { ...crew.slots[0].pilot, name: 42 } },
      ...crew.slots.slice(1),
    ],
  },
  {
    ...crew,
    slots: [
      {
        ...crew.slots[0],
        pilot: { ...crew.slots[0].pilot, specialAbilities: [] },
      },
      ...crew.slots.slice(1),
    ],
  },
])(
  'rejects an invalid supplied roster rather than assigning slots (%j)',
  (invalid) => {
    const data = service.extractData(unit);
    expect(
      RecordSheetDataSchema.safeParse({ ...data, crew: invalid }).success,
    ).toBe(false);
    expect(() =>
      service.extractData({ ...unit, crew: invalid as IRecordSheetMechCrew }),
    ).toThrow();
  },
);

it('does not infer crew or alter legacy payloads from configuration or mass', () => {
  // QuadVee (QuadVee.java:164-166) and Tripod (TripodMek.java:115-117) always
  // have their native crew, so they get the blank roster (see
  // nativeMechCrewDefault.test.ts); only Biped stays without one.
  for (const configuration of ['Biped']) {
    expect(service.extractData({ ...unit, configuration })).not.toHaveProperty(
      'crew',
    );
  }
});
