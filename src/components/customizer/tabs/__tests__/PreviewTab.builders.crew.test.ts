/**
 * The editor's authored crew seats reach the record-sheet payload through the
 * shared preview projection (canvas, PDF and print), with no injection.
 */
import { buildBattleMechPreviewProjection } from '@/components/customizer/preview/recordSheetPreview.logic';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { RecordSheetDataSchema } from '@/types/printing';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import type { PreviewUnitState } from '../PreviewTab.builders';

const state = (
  configuration: MechConfiguration,
  tonnage: number,
  crewSeats?: PreviewUnitState['crewSeats'],
): PreviewUnitState => ({
  name: 'Crew Fixture CF-1',
  chassis: 'Crew Fixture',
  model: 'CF-1',
  tonnage,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  year: 3100,
  configuration,
  engineType: EngineType.STANDARD,
  engineRating: tonnage * 3,
  gyroType: GyroType.STANDARD,
  internalStructureType: 'Standard',
  cockpitType: 'Standard',
  armorType: 'Standard',
  armorAllocation: {
    [MechLocation.HEAD]: 9,
    [MechLocation.CENTER_TORSO]: 20,
    centerTorsoRear: 6,
    [MechLocation.LEFT_TORSO]: 15,
    leftTorsoRear: 5,
    [MechLocation.RIGHT_TORSO]: 15,
    rightTorsoRear: 5,
    [MechLocation.LEFT_ARM]: 10,
    [MechLocation.RIGHT_ARM]: 10,
    [MechLocation.LEFT_LEG]: 14,
    [MechLocation.RIGHT_LEG]: 14,
    [MechLocation.FRONT_LEFT_LEG]: 11,
    [MechLocation.FRONT_RIGHT_LEG]: 12,
    [MechLocation.REAR_LEFT_LEG]: 13,
    [MechLocation.REAR_RIGHT_LEG]: 14,
    [MechLocation.CENTER_LEG]: 15,
  },
  heatSinkType: 'Single',
  heatSinkCount: 10,
  enhancement: null,
  jumpMP: 0,
  equipment: [],
  ...(crewSeats ? { crewSeats } : {}),
});
const seats = [
  { slotIndex: 0, name: 'Pilot Pat', gunnery: 3, piloting: 4 },
  { slotIndex: 1, name: 'Pilot Pat', gunnery: 2, piloting: 6 },
  { slotIndex: 2, name: 'Tech Tess', gunnery: 5, piloting: 7 },
];
const extract = (input: PreviewUnitState) =>
  new RecordSheetService().extractData(
    buildBattleMechPreviewProjection(input).unitConfig,
  );

describe('editor crew seats in the record-sheet payload', () => {
  it('prints an ordinary tripod roster with repeated names and unequal skills', () => {
    const data = extract(state(MechConfiguration.TRIPOD, 100, seats));
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);
    expect(data).toMatchObject({
      unitType: 'mech',
      mechType: 'tripod',
      crew: {
        crewType: 'TRIPOD',
        slots: [
          {
            slotIndex: 0,
            role: 'Pilot',
            pilot: { name: 'Pilot Pat', gunnery: 3, piloting: 4, wounds: 0 },
          },
          {
            slotIndex: 1,
            role: 'Gunner',
            pilot: { name: 'Pilot Pat', gunnery: 2, piloting: 6, wounds: 0 },
          },
        ],
      },
    });
  });

  it('prints the Tech Officer on a superheavy tripod', () => {
    const data = extract(state(MechConfiguration.TRIPOD, 105, seats));
    expect(data).toMatchObject({
      crew: { crewType: 'SUPERHEAVY_TRIPOD' },
    });
    expect(
      data.unitType === 'mech' && data.crew?.slots.map((s) => s.role),
    ).toEqual(['Pilot', 'Gunner', 'Tech Officer']);
  });

  it('prints a QuadVee roster with a blank unassigned seat', () => {
    const data = extract(state(MechConfiguration.QUADVEE, 30, [seats[1]]));
    expect(data).toMatchObject({
      mechType: 'quadvee',
      crew: {
        crewType: 'QUADVEE',
        slots: [
          { slotIndex: 0, role: 'Pilot' },
          { slotIndex: 1, role: 'Gunner', pilot: { name: 'Pilot Pat' } },
        ],
      },
    });
    expect(
      data.unitType === 'mech' && data.crew?.slots[0].pilot,
    ).toBeUndefined();
  });

  it('prints a QuadVee without authored seats as its two blank native seats', () => {
    const data = extract(state(MechConfiguration.QUADVEE, 30));
    expect(data).toMatchObject({
      mechType: 'quadvee',
      crew: {
        crewType: 'QUADVEE',
        slots: [
          { slotIndex: 0, role: 'Pilot' },
          { slotIndex: 1, role: 'Gunner' },
        ],
      },
    });
  });

  // TripodMek.java:115-117 + Mek.java:7167 (weight > 100): the native crew of a
  // tripod with no authored seats is blank, three seats only above 100 tons.
  it.each([
    [100, 'TRIPOD', 2],
    [105, 'SUPERHEAVY_TRIPOD', 3],
  ] as const)(
    'prints a %s t tripod without authored seats as %s with %s blank seats',
    (tonnage, crewType, seatCount) => {
      const data = extract(state(MechConfiguration.TRIPOD, tonnage));
      expect(data).toMatchObject({ mechType: 'tripod', crew: { crewType } });
      expect(data.unitType === 'mech' && data.crew?.slots).toHaveLength(
        seatCount,
      );
      expect(
        data.unitType === 'mech' && data.crew?.slots.some((s) => s.pilot),
      ).toBe(false);
    },
  );

  it('keeps the legacy payload for a biped that carries stored seats', () => {
    const data = extract(state(MechConfiguration.BIPED, 100, seats));
    expect(data).not.toHaveProperty('crew');
  });
});
