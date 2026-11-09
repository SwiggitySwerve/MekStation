/** @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md */
import fs from 'fs';
import path from 'path';

import {
  AEROSPACE_ARC_OPTIONS,
  AEROSPACE_ARMOR_ARCS,
  getAerospaceArmorArcs,
} from '@/components/customizer/aerospace/aerospaceLocationLabels';
import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import * as aerospaceExtractor from '@/services/printing/recordsheet/dataExtractors.aerospace';
import * as aerospaceBindings from '@/services/printing/svgRecordSheetRenderer/aerospace/bindings';
import { renderAerospaceSVG } from '@/services/printing/svgRecordSheetRenderer/aerospaceRenderer';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import {
  AEROSPACE_ARC_LABELS,
  getAerospaceArcs,
} from '@/types/construction/aerospaceArcLabels';
import {
  AerospaceLocation,
  SmallCraftLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';
import { AerospaceArcArmorSchema } from '@/types/printing/RecordSheetSchemas';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import {
  catalog,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

jest.mock('@/services/printing/recordsheet/dataExtractors.aerospace', () => {
  const actual = jest.requireActual<typeof aerospaceExtractor>(
    '@/services/printing/recordsheet/dataExtractors.aerospace',
  );
  return {
    ...actual,
    extractAerospaceData: jest.fn(actual.extractAerospaceData),
  };
});
jest.mock(
  '@/services/printing/svgRecordSheetRenderer/aerospace/bindings',
  () => {
    const actual = jest.requireActual<typeof aerospaceBindings>(
      '@/services/printing/svgRecordSheetRenderer/aerospace/bindings',
    );
    return { ...actual, bindAerospace: jest.fn(actual.bindAerospace) };
  },
);

const { extractAerospaceData } = jest.requireActual<typeof aerospaceExtractor>(
  '@/services/printing/recordsheet/dataExtractors.aerospace',
);
const { bindAerospace } = jest.requireActual<typeof aerospaceBindings>(
  '@/services/printing/svgRecordSheetRenderer/aerospace/bindings',
);

const entries = catalog('aerospace');
type Arcs = ReturnType<typeof extractAerospaceData>['armorArcs'];

function load(id: string) {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing catalog fixture: ${id}`);
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/aerospace', entry.path),
        'utf8',
      ),
    ),
  );
  return { entry, source };
}

/** The catalog is left/right symmetric, so splice distinct arc values in. */
function distinct(id: string) {
  const { entry, source } = load(id);
  const byArc = Object.fromEntries(
    Object.keys(source.armor?.byArc ?? {}).map((key, index) => [
      key,
      10 + index * 3,
    ]),
  );
  return { entry, source: { ...source, armor: { ...source.armor, byArc } } };
}

const identity = (rows: { field: string }[]) =>
  rows
    .map(({ field }) => field)
    .filter(
      (field) =>
        field.startsWith('armor.') ||
        field.startsWith('pips.') ||
        field.startsWith('pipGroup.') ||
        field.startsWith('text.') ||
        [
          'barRating',
          'binding.armorType',
          'binding.heat',
          'binding.SI',
          'SI',
        ].includes(field),
    )
    .sort();
const run = (entry: { id: string; path: string }, source: unknown) => {
  const row = verifyCatalogUnit('aerospace', entry, () =>
    JSON.stringify(source),
  );
  expect(row.rejection).toBeUndefined();
  return identity(row.differences);
};
const fields = (id: string) => {
  const { entry, source } = distinct(id);
  return run(entry, source);
};

/** One fixture per hull family named in row 4.3. */
const hulls = [
  ['aerospace fighter', 'aeshna-heavy-drone-fighter'],
  ['aerospace fighter with typeByArc', 'sangihe-shrike-thrush-nanook'],
  ['conventional fighter', 'bluehawk-combat-support-fighter-msf-42'],
  ['fixed-wing support with BAR and a zero arc', 'boomerang-spotter-plane'],
  ['aerodyne small craft', 'astrolux-staryacht-lc-100'],
  ['spheroid small craft', 'battle-taxi-nl-42'],
] as const;

const extractor = jest.mocked(aerospaceExtractor.extractAerospaceData);
const binder = jest.mocked(aerospaceBindings.bindAerospace);

function mutateArcs(mutate: (arcs: Arcs) => Arcs) {
  extractor.mockImplementation((unit, spa) => {
    const data = extractAerospaceData(unit, spa);
    return { ...data, armorArcs: mutate(data.armorArcs) };
  });
}
function mutateBindings(
  mutate: (
    bindings: ReturnType<typeof bindAerospace>,
  ) => ReturnType<typeof bindAerospace>,
) {
  binder.mockImplementation((data) => mutate(bindAerospace(data)));
}
const swapArcs = (a: string, b: string) =>
  mutateArcs((arcs) => {
    const left = arcs.find((x) => x.arc === a);
    const right = arcs.find((x) => x.arc === b);
    return arcs.map((x) =>
      x === left
        ? { ...x, current: right?.current ?? -1 }
        : x === right
          ? { ...x, current: left?.current ?? -1 }
          : x,
    );
  });
const swapPipCodes = (a: 'LWG' | 'RWG' | 'NOS' | 'AFT', b: typeof a) =>
  mutateBindings((bindings) => ({
    ...bindings,
    pipCounts: {
      ...bindings.pipCounts,
      [a]: bindings.pipCounts[b],
      [b]: bindings.pipCounts[a],
    },
  }));
const renameGroups = (renames: Record<string, string>) =>
  mutateBindings((bindings) => ({
    ...bindings,
    pips: bindings.pips.map((p) => ({
      ...p,
      groupId: renames[p.groupId] ?? p.groupId,
    })),
  }));

describe('Aerospace catalog location identity acceptance', () => {
  beforeAll(initializeEquipment);
  beforeEach(() => {
    extractor.mockImplementation(extractAerospaceData);
    binder.mockImplementation(bindAerospace);
  });

  it.each(hulls)('accepts the real arcs of the %s (%s)', (_label, id) => {
    const { entry, source } = load(id);
    expect(run(entry, source)).toEqual([]);
  });

  it.each(hulls)('accepts asymmetric arcs of the %s (%s)', (_label, id) => {
    expect(fields(id)).toEqual([]);
  });

  it('prints Left Side/Right Side for small craft and wings for fighters', () => {
    const labels = (id: string) =>
      extractAerospaceData(
        buildAerospaceUnitObject(
          mapAerospaceDefinitionToState(
            (() => {
              const { source } = load(id);
              if (!isDefinitionForFamily('aerospace', source))
                throw new Error('Wrong catalog family');
              return source;
            })(),
          ),
        ),
      ).armorArcs.map((a) => a.arc);
    expect(labels('astrolux-staryacht-lc-100')).toEqual([
      'Nose',
      'Left Side',
      'Right Side',
      'Aft',
    ]);
    expect(labels('aeshna-heavy-drone-fighter')).toEqual([
      'Nose',
      'Left Wing',
      'Right Wing',
      'Aft',
    ]);
  });

  it('rejects left/right wing armor swaps even when the total is unchanged', () => {
    swapArcs('Left Wing', 'Right Wing');
    expect(fields('aeshna-heavy-drone-fighter')).toEqual(
      [
        'armor.LEFT_WING',
        'armor.RIGHT_WING',
        'pips.LWG',
        'pips.RWG',
        'pipGroup.LWG',
        'pipGroup.RWG',
        'text.LWG',
        'text.RWG',
      ].sort(),
    );
  });

  it('rejects left/right side swaps on a small craft', () => {
    swapArcs('Left Side', 'Right Side');
    expect(fields('astrolux-staryacht-lc-100')).toEqual(
      [
        'armor.LEFT_SIDE',
        'armor.RIGHT_SIDE',
        'pips.LWG',
        'pips.RWG',
        'pipGroup.LWG',
        'pipGroup.RWG',
        'text.LWG',
        'text.RWG',
      ].sort(),
    );
  });

  it('rejects nose/aft swaps', () => {
    swapArcs('Nose', 'Aft');
    expect(fields('bluehawk-combat-support-fighter-msf-42')).toEqual(
      [
        'armor.NOSE',
        'armor.AFT',
        'pips.NOS',
        'pips.AFT',
        'pipGroup.NOS',
        'pipGroup.AFT',
        'text.NOS',
        'text.AFT',
      ].sort(),
    );
  });

  it('rejects a missing arc', () => {
    mutateArcs((arcs) => arcs.filter((a) => a.arc !== 'Aft'));
    expect(fields('aeshna-heavy-drone-fighter')).toEqual(
      [
        'armor.AFT',
        'armor.arcs',
        'pips.AFT',
        'pipGroup.AFT',
        'text.AFT',
      ].sort(),
    );
  });

  it('rejects a duplicated arc', () => {
    mutateArcs((arcs) => [...arcs, arcs[0]]);
    expect(fields('aeshna-heavy-drone-fighter')).toEqual(['armor.arcs']);
  });

  it('rejects wing labels on a small craft', () => {
    mutateArcs((arcs) =>
      arcs.map((a) =>
        a.arc === 'Left Side'
          ? { ...a, arc: 'Left Wing' as const }
          : a.arc === 'Right Side'
            ? { ...a, arc: 'Right Wing' as const }
            : a,
      ),
    );
    expect(fields('battle-taxi-nl-42')).toEqual(
      ['armor.LEFT_SIDE', 'armor.RIGHT_SIDE', 'armor.arcs'].sort(),
    );
  });

  it('rejects swapped left/right pip counts (arc code table)', () => {
    swapPipCodes('LWG', 'RWG');
    expect(fields('aeshna-heavy-drone-fighter')).toEqual([
      'pips.LWG',
      'pips.RWG',
    ]);
  });

  it('rejects swapped small-craft LS/RS pip groups', () => {
    mutateBindings((bindings) => ({
      ...bindings,
      pips: bindings.pips.map((p) =>
        p.groupId === 'armorPipsLS'
          ? { ...p, groupId: 'armorPipsRS' }
          : p.groupId === 'armorPipsRS'
            ? { ...p, groupId: 'armorPipsLS' }
            : p,
      ),
    }));
    expect(fields('astrolux-staryacht-lc-100')).toEqual([
      'pipGroup.LWG',
      'pipGroup.RWG',
    ]);
  });

  it('rejects a small craft bound to the fighter wing slots', () => {
    renameGroups({ armorPipsLS: 'armorPipsLWG', armorPipsRS: 'armorPipsRWG' });
    expect(fields('battle-taxi-nl-42')).toEqual(
      [
        'pipGroup.LWG',
        'pipGroup.RWG',
        'pipGroup.LWG.unused',
        'pipGroup.RWG.unused',
      ].sort(),
    );
  });

  it('rejects swapped small-craft armor texts', () => {
    mutateBindings((bindings) => ({
      ...bindings,
      texts: {
        ...bindings.texts,
        textArmor_LS: bindings.texts.textArmor_RS,
        textArmor_RS: bindings.texts.textArmor_LS,
      },
    }));
    expect(fields('astrolux-staryacht-lc-100')).toEqual([
      'text.LWG',
      'text.RWG',
    ]);
  });

  it('rejects a wrong structural integrity', () => {
    mutateBindings((bindings) => ({
      ...bindings,
      pips: bindings.pips.map((p) =>
        p.groupId === 'siPips' ? { ...p, count: p.count + 1 } : p,
      ),
    }));
    expect(fields('aeshna-heavy-drone-fighter')).toEqual(['binding.SI']);
  });

  it('rejects a heat pip group on a conventional fighter', () => {
    mutateBindings((bindings) => ({
      ...bindings,
      pips: [
        ...bindings.pips,
        { groupId: 'heatSinkPips', count: 3, className: 'pip heat-sink' },
      ],
    }));
    expect(fields('bluehawk-combat-support-fighter-msf-42')).toEqual([
      'binding.heat',
    ]);
  });

  it('rejects a lost BAR rating on a fixed-wing support craft', () => {
    extractor.mockImplementation((unit, spa) => ({
      ...extractAerospaceData(unit, spa),
      barRating: undefined,
    }));
    expect(fields('boomerang-spotter-plane')).toEqual(
      ['barRating', 'binding.armorType'].sort(),
    );
  });

  it('rejects a BAR rating printed on an aerospace fighter', () => {
    extractor.mockImplementation((unit, spa) => ({
      ...extractAerospaceData(unit, spa),
      barRating: 5,
    }));
    expect(fields('aeshna-heavy-drone-fighter')).toEqual(['barRating']);
  });

  it('rejects a BAR support craft armor type that omits the rating', () => {
    mutateBindings((bindings) => ({
      ...bindings,
      texts: { ...bindings.texts, armorType: 'Standard' },
    }));
    expect(fields('boomerang-spotter-plane')).toEqual(['binding.armorType']);
  });

  it('rejects a restored N/N maximum on every arc', () => {
    mutateArcs((arcs) => arcs.map((a) => ({ ...a, maximum: a.current })));
    expect(fields('aeshna-heavy-drone-fighter')).toEqual(['armor.maximum']);
  });
});

describe('Aerospace arc label owner', () => {
  it('matches the pinned small craft and the persisted fighter arc names', () => {
    expect(getAerospaceArcs(true).map((a) => a.label)).toEqual([
      SmallCraftLocation.NOSE,
      SmallCraftLocation.LEFT_SIDE,
      SmallCraftLocation.RIGHT_SIDE,
      SmallCraftLocation.AFT,
    ]);
    expect(getAerospaceArcs(false).map((a) => a.label)).toEqual([
      AerospaceLocation.NOSE,
      AerospaceLocation.LEFT_WING,
      AerospaceLocation.RIGHT_WING,
      AerospaceLocation.AFT,
    ]);
  });

  it('keeps the persisted store keys for both hulls', () => {
    const keys = (smallCraft: boolean) =>
      getAerospaceArcs(smallCraft).map((a) => a.arc);
    expect(keys(true)).toEqual(keys(false));
    expect(keys(true)).toEqual([
      AerospaceLocation.NOSE,
      AerospaceLocation.LEFT_WING,
      AerospaceLocation.RIGHT_WING,
      AerospaceLocation.AFT,
    ]);
  });

  it('lists exactly the labels the sheet schema accepts', () => {
    const schemaArcs = AerospaceArcArmorSchema.shape.arc.options;
    expect([...schemaArcs].sort()).toEqual(
      [...AEROSPACE_ARC_LABELS].map(String).sort(),
    );
    for (const smallCraft of [true, false])
      for (const { label } of getAerospaceArcs(smallCraft))
        expect(schemaArcs).toContain(label);
  });
});

/**
 * The customizer's arc labels derive from the same owner as the sheet. The
 * expected arrays are the serialized output before the owner was shared, so
 * the editor stays byte-identical.
 */
describe('Customizer aerospace arc labels', () => {
  const fighterArcs = [
    { arc: 'Nose', label: 'Nose' },
    { arc: 'Left Wing', label: 'Left Wing' },
    { arc: 'Right Wing', label: 'Right Wing' },
    { arc: 'Aft', label: 'Aft' },
  ];
  const smallCraftArcs = [
    { arc: 'Nose', label: 'Nose' },
    { arc: 'Left Wing', label: 'Left Side' },
    { arc: 'Right Wing', label: 'Right Side' },
    { arc: 'Aft', label: 'Aft' },
  ];

  it('serializes exactly as before the owner was shared', () => {
    expect(JSON.stringify(AEROSPACE_ARMOR_ARCS)).toBe(
      JSON.stringify(fighterArcs),
    );
    expect(JSON.stringify(AEROSPACE_ARC_OPTIONS)).toBe(
      JSON.stringify([
        ...fighterArcs.map(({ arc, label }) => ({ value: arc, label })),
        { value: 'Fuselage', label: 'Fuselage' },
      ]),
    );
    expect(
      JSON.stringify(getAerospaceArmorArcs(AerospaceSubType.AEROSPACE_FIGHTER)),
    ).toBe(JSON.stringify(fighterArcs));
    expect(
      JSON.stringify(
        getAerospaceArmorArcs(AerospaceSubType.CONVENTIONAL_FIGHTER),
      ),
    ).toBe(JSON.stringify(fighterArcs));
    expect(
      JSON.stringify(getAerospaceArmorArcs(AerospaceSubType.SMALL_CRAFT)),
    ).toBe(JSON.stringify(smallCraftArcs));
  });

  it.each([
    [AerospaceSubType.AEROSPACE_FIGHTER, false],
    [AerospaceSubType.CONVENTIONAL_FIGHTER, false],
    [AerospaceSubType.SMALL_CRAFT, true],
  ])('shows the sheet label for %s', (subType, smallCraft) => {
    expect(getAerospaceArmorArcs(subType)).toEqual(
      getAerospaceArcs(smallCraft),
    );
  });
});

describe('Aerospace skeleton fallback armor text', () => {
  it('prints each arc with its value only, no cap and no armor fill bar', () => {
    const { source } = load('astrolux-staryacht-lc-100');
    if (!isDefinitionForFamily('aerospace', source))
      throw new Error('Wrong catalog family');
    const svg = renderAerospaceSVG(
      extractAerospaceData(
        buildAerospaceUnitObject(mapAerospaceDefinitionToState(source)),
      ),
    );
    expect(svg).toContain(
      `>Left Side ${source.armor?.byArc?.LEFT_SIDE}</text>`,
    );
    expect(svg).not.toMatch(/>(Nose|Left Side|Right Side|Aft) \d+\/\d+</);
    // Only the SI and fuel bars keep a fill rect.
    expect(svg.match(/height="8" fill="#2d4a6e"/g)).toHaveLength(2);
  });
});
