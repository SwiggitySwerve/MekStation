/**
 * A Tripod or QuadVee without an explicit roster extracts its native blank
 * roster, from one default (MM 48fcb2f64 TripodMek.java:115-117 and
 * QuadVee.java:164-166; MML 62bf193 PrintMek.java:343-348 picks the single,
 * dual or triple Warrior Data panel by slot count, named or not).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/record-sheet-export/spec.md
 */
import type { IUnitConfig } from '@/services/printing/RecordSheetService';

import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { RecordSheetDataSchema } from '@/types/printing';

const unit: IUnitConfig = {
  id: 'native-crew-default',
  name: 'Native crew default',
  chassis: 'Fixture',
  model: 'NC',
  tonnage: 60,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  era: '3150',
  configuration: 'Tripod',
  engine: { type: 'Fusion', rating: 180 },
  gyro: { type: 'Standard' },
  structure: { type: 'Standard' },
  armor: {
    type: 'Standard',
    allocation: {
      head: 9,
      centerTorso: 20,
      centerTorsoRear: 6,
      leftTorso: 15,
      leftTorsoRear: 5,
      rightTorso: 15,
      rightTorsoRear: 5,
      leftArm: 10,
      rightArm: 10,
      leftLeg: 12,
      rightLeg: 12,
      centerLeg: 12,
      frontLeftLeg: 12,
      frontRightLeg: 12,
      rearLeftLeg: 12,
      rearRightLeg: 12,
    },
  },
  heatSinks: { type: 'Single', count: 10 },
  movement: { walkMP: 3, runMP: 5, jumpMP: 0 },
  equipment: [],
};
const service = new RecordSheetService();
const roles = (configuration: string, tonnage: number) => {
  const data = service.extractData({ ...unit, configuration, tonnage });
  return data.unitType === 'mech'
    ? {
        crewType: data.crew?.crewType,
        roles: data.crew?.slots.map((slot) => slot.role),
        assigned: data.crew?.slots.some((slot) => slot.pilot),
      }
    : undefined;
};

describe('seat-less Tripod native roster (TripodMek.java:115-117, Mek.java:7167)', () => {
  // isSuperHeavy() is weight > 100, so exactly 100 tons is an ordinary tripod.
  it.each([
    [20, 'TRIPOD', ['Pilot', 'Gunner']],
    [100, 'TRIPOD', ['Pilot', 'Gunner']],
    [101, 'SUPERHEAVY_TRIPOD', ['Pilot', 'Gunner', 'Tech Officer']],
    [105, 'SUPERHEAVY_TRIPOD', ['Pilot', 'Gunner', 'Tech Officer']],
    [125, 'SUPERHEAVY_TRIPOD', ['Pilot', 'Gunner', 'Tech Officer']],
  ])(
    '%s tons gets %s with every seat unassigned',
    (tonnage, crewType, seats) => {
      expect(roles('Tripod', tonnage)).toEqual({
        crewType,
        roles: seats,
        assigned: false,
      });
    },
  );

  it('is a valid payload and keeps the tripod mech type', () => {
    const data = service.extractData(unit);
    expect(RecordSheetDataSchema.safeParse(data).success).toBe(true);
    expect(data).toMatchObject({ mechType: 'tripod' });
  });

  it('keeps an explicit roster instead of the blank default', () => {
    const data = service.extractData({
      ...unit,
      crew: {
        crewType: 'TRIPOD',
        slots: [
          {
            slotIndex: 0,
            role: 'Pilot',
            pilot: { name: 'Kerr', gunnery: 3, piloting: 4, wounds: 0 },
          },
          { slotIndex: 1, role: 'Gunner' },
        ],
      },
    });
    expect(
      data.unitType === 'mech' && data.crew?.slots.map((s) => s.pilot?.name),
    ).toEqual(['Kerr', undefined]);
  });
});

describe('one native default for Tripod and QuadVee', () => {
  it('gives a QuadVee its two native seats at any tonnage', () => {
    for (const tonnage of [20, 100, 105])
      expect(roles('QuadVee', tonnage)).toEqual({
        crewType: 'QUADVEE',
        roles: ['Pilot', 'Gunner'],
        assigned: false,
      });
  });

  it.each(['Biped', 'Quad', 'LAM'])(
    'infers no roster for %s',
    (configuration) => {
      expect(
        service.extractData({ ...unit, configuration }),
      ).not.toHaveProperty('crew');
    },
  );
});
