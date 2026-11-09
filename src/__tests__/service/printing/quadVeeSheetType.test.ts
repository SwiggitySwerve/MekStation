/**
 * A QuadVee prints on the QuadVee template type with its native two blank seats
 * unless crew was authored (MML 62bf193 PrintMek.java:112-131,343-348;
 * MM 48fcb2f64 QuadVee.java:164-166), and its legs use the quad pip groups.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/record-sheet-export/spec.md
 */
import type { IUnitConfig } from '@/services/printing/RecordSheetService';

import { getMechType } from '@/services/printing/recordsheet/mechTypeUtils';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { SVGRecordSheetRenderer } from '@/services/printing/svgRecordSheetRenderer';

const unit: IUnitConfig = {
  id: 'quadvee-type',
  name: 'QuadVee type',
  chassis: 'Fixture',
  model: 'QV',
  tonnage: 60,
  techBase: 'Inner Sphere',
  rulesLevel: 'Standard',
  era: '3150',
  configuration: 'QuadVee',
  engine: { type: 'Fusion', rating: 240 },
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
      leftArm: 0,
      rightArm: 0,
      leftLeg: 0,
      rightLeg: 0,
      frontLeftLeg: 6,
      frontRightLeg: 7,
      rearLeftLeg: 8,
      rearRightLeg: 9,
    },
  },
  heatSinks: { type: 'Single', count: 10 },
  movement: { walkMP: 4, runMP: 6, jumpMP: 0 },
  equipment: [],
};
const service = new RecordSheetService();

describe('getMechType', () => {
  it.each([
    ['QuadVee', 'quadvee'],
    ['Quad', 'quad'],
    ['Tripod', 'tripod'],
    ['LAM', 'lam'],
    ['Biped', 'biped'],
  ])('%s is %s', (configuration, expected) => {
    expect(getMechType(configuration)).toBe(expected);
  });
});

describe('QuadVee record sheet payload', () => {
  it('uses the QuadVee type with a blank two-seat native roster when none was authored', () => {
    const data = service.extractData(unit);
    expect(data).toMatchObject({
      unitType: 'mech',
      mechType: 'quadvee',
      crew: {
        crewType: 'QUADVEE',
        slots: [
          { slotIndex: 0, role: 'Pilot' },
          { slotIndex: 1, role: 'Gunner' },
        ],
      },
    });
    expect(
      data.unitType === 'mech' && data.crew?.slots.some((s) => s.pilot),
    ).toBe(false);
  });

  it('keeps an authored roster instead of the blank one', () => {
    const data = service.extractData({
      ...unit,
      crew: {
        crewType: 'QUADVEE',
        slots: [
          { slotIndex: 0, role: 'Pilot' },
          {
            slotIndex: 1,
            role: 'Gunner',
            pilot: { name: 'Gil', gunnery: 2, piloting: 7, wounds: 0 },
          },
        ],
      },
    });
    expect(data.unitType === 'mech' && data.crew?.slots[1].pilot?.name).toBe(
      'Gil',
    );
  });

  it('prints the four quad legs, as for a Quad', () => {
    const legs = (configuration: string) => {
      const data = service.extractData({ ...unit, configuration });
      return data.unitType === 'mech'
        ? [
            data.armor.locations.map((l) => l.abbreviation),
            data.structure.locations.map((l) => l.abbreviation),
          ]
        : [];
    };
    expect(legs('QuadVee')).toEqual(legs('Quad'));
    expect(legs('QuadVee')[0]).toEqual(
      expect.arrayContaining(['FLL', 'FRL', 'RLL', 'RRL']),
    );
  });

  it('leaves Quad and Biped without an inferred roster (a Tripod gets its native one: nativeMechCrewDefault.test.ts)', () => {
    for (const configuration of ['Quad', 'Biped'])
      expect(
        service.extractData({ ...unit, configuration }),
      ).not.toHaveProperty('crew');
  });
});

describe('QuadVee pips', () => {
  const rect = '<rect x="0" y="0" width="60" height="60"/>';
  const template = `<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756">${[
    'FLL',
    'FRL',
    'RLL',
    'RRL',
  ]
    .flatMap((leg) => [`armorPips${leg}`, `isPips${leg}`])
    .map((id) => `<g id="${id}">${rect}</g>`)
    .join('')}</svg>`;

  async function legPips(mechType: 'quad' | 'quadvee') {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => template,
      headers: new Headers({ 'content-type': 'image/svg+xml' }),
    } as Response);
    const data = service.extractData(unit);
    if (data.unitType !== 'mech') throw new Error('Expected Mech payload');
    const renderer = new SVGRecordSheetRenderer();
    await renderer.loadTemplate('/record-sheets/templates_us/x.svg');
    await renderer.fillArmorPips(data.armor, mechType);
    await renderer.fillStructurePips(data.structure, unit.tonnage, mechType);
    const doc = new DOMParser().parseFromString(
      renderer.getSVGString(),
      'image/svg+xml',
    );
    const count = (id: string) =>
      doc.getElementById(id)?.querySelectorAll('.pip').length ?? -1;
    return {
      armor: ['FLL', 'FRL', 'RLL', 'RRL'].map((l) => count(`armorPips${l}`)),
      structure: ['FLL', 'FRL', 'RLL', 'RRL'].map((l) => count(`isPips${l}`)),
    };
  }
  afterEach(() => jest.restoreAllMocks());

  it('draws the leg armor and structure pips on the QuadVee type exactly as on the Quad type', async () => {
    const quad = await legPips('quad');
    expect(quad.armor).toEqual([6, 7, 8, 9]);
    expect(quad.structure.every((count) => count > 0)).toBe(true);
    expect(await legPips('quadvee')).toEqual(quad);
  });
});
