/**
 * ProtoMech family adapter — unit tests.
 *
 * Covers `selectProtoMechTemplate` (all 3 keys) and `bindProtoMech`
 * (`PipCounts` for biped, quad, glider).
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import type {
  IProtoMechRecordSheetData,
  IProtoMechUnit,
  IRecordSheetHeader,
} from '@/types/printing';

import { bindProtoMech, computeProtoMechPipCounts } from '../bindings';
import { selectProtoMechTemplate } from '../selectTemplate';

function header(tonnage = 9): IRecordSheetHeader {
  return {
    unitName: 'Roc',
    chassis: 'Roc',
    model: 'Standard',
    tonnage,
    techBase: 'Clan',
    rulesLevel: 'Standard',
    era: 'Clan Invasion',
    role: 'Striker',
    battleValue: 213,
    cost: 500_000,
  };
}

function proto(
  armor: Partial<IProtoMechUnit['armorByLocation']>,
): IProtoMechUnit {
  return {
    index: 1,
    armorByLocation: {
      Head: { current: 0, maximum: 0 },
      Torso: { current: 0, maximum: 0 },
      'Left Arm': { current: 0, maximum: 0 },
      'Right Arm': { current: 0, maximum: 0 },
      Legs: { current: 0, maximum: 0 },
      'Main Gun': { current: 0, maximum: 0 },
      ...armor,
    },
  };
}

function protomech(
  overrides: Partial<IProtoMechRecordSheetData> = {},
): IProtoMechRecordSheetData {
  return {
    unitType: 'protomech',
    header: header(),
    pointSize: 5,
    protos: [
      proto({
        Head: { current: 2, maximum: 2 },
        Torso: { current: 14, maximum: 14 },
        'Left Arm': { current: 4, maximum: 4 },
        'Right Arm': { current: 4, maximum: 4 },
        Legs: { current: 8, maximum: 8 },
      }),
    ],
    hasUMU: false,
    isGlider: false,
    walkMP: 4,
    jumpMP: 0,
    equipment: [],
    ...overrides,
  };
}

describe('selectProtoMechTemplate', () => {
  it('maps a biped ProtoMech to protomek_biped', () => {
    expect(selectProtoMechTemplate(protomech())).toBe('protomek_biped');
  });

  it('maps a quad ProtoMech to protomek_quad', () => {
    expect(selectProtoMechTemplate(protomech({ isQuad: true }))).toBe(
      'protomek_quad',
    );
  });

  it('maps a glider ProtoMech to protomek_glider', () => {
    expect(selectProtoMechTemplate(protomech({ isGlider: true }))).toBe(
      'protomek_glider',
    );
  });

  it('prioritises quad over glider when both flags are set', () => {
    expect(
      selectProtoMechTemplate(protomech({ isQuad: true, isGlider: true })),
    ).toBe('protomek_quad');
  });
});

describe('bindProtoMech — PipCounts', () => {
  it('computes biped armor + derived structure per location', () => {
    const counts = computeProtoMechPipCounts(protomech());
    // 9t biped: head IS 2, torso IS = tonnage 9, leg IS 5, arm IS = head IS 2.
    expect(counts.HD).toEqual({ armor: 2, structure: 2 });
    expect(counts.T).toEqual({ armor: 14, structure: 9 });
    expect(counts.L).toEqual({ armor: 8, structure: 5 });
    expect(counts.LA).toEqual({ armor: 4, structure: 2 });
    expect(counts.RA).toEqual({ armor: 4, structure: 2 });
  });

  it('omits arm locations for a quad ProtoMech', () => {
    const counts = computeProtoMechPipCounts(protomech({ isQuad: true }));
    expect(counts.LA).toBeUndefined();
    expect(counts.RA).toBeUndefined();
    // Quad legs are sturdier — 9t quad leg IS is 9.
    expect(counts.L.structure).toBe(9);
  });

  it('computes glider armor + structure (biped-shaped, with arms)', () => {
    const counts = computeProtoMechPipCounts(protomech({ isGlider: true }));
    expect(counts.LA).toBeDefined();
    expect(counts.RA).toBeDefined();
    expect(counts.T.armor).toBe(14);
  });

  it('includes the Main Gun location when a main gun is equipped', () => {
    const withGun = protomech({
      mainGun: 'ProtoMech AC/4',
      protos: [
        proto({
          Head: { current: 2, maximum: 2 },
          Torso: { current: 14, maximum: 14 },
          Legs: { current: 8, maximum: 8 },
          'Main Gun': { current: 3, maximum: 3 },
        }),
      ],
    });
    const counts = computeProtoMechPipCounts(withGun);
    // 9t: main gun IS is 1 (<=9t).
    expect(counts.MG).toEqual({ armor: 3, structure: 1 });
  });

  it('uses main gun IS 2 for ProtoMechs heavier than 9 tons', () => {
    const heavy = protomech({
      header: header(12),
      mainGun: 'ProtoMech AC/8',
      protos: [proto({ 'Main Gun': { current: 5, maximum: 5 } })],
    });
    expect(computeProtoMechPipCounts(heavy).MG?.structure).toBe(2);
  });

  it('binds text only to catalogued template IDs', () => {
    const { texts } = bindProtoMech(protomech());
    expect(texts.type).toBe('Roc Standard');
    expect(texts.tonnage).toBe('9');
    expect(texts.mpWalk).toBe('4');
  });

  it('emits armor and structure pip fills per location', () => {
    const { pips } = bindProtoMech(protomech());
    const byGroup = Object.fromEntries(pips.map((p) => [p.groupId, p.count]));
    expect(byGroup.armorPipsHD).toBe(2);
    expect(byGroup.armorPipsT).toBe(14);
    expect(byGroup.structurePipsT).toBe(9);
    expect(byGroup.structurePipsHD).toBe(2);
  });
});
