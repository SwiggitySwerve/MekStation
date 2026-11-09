/** @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md */
import fs from 'fs';
import path from 'path';

import { buildBattleArmorUnitObject } from '@/components/customizer/battlearmor/buildBattleArmorUnitObject';
import { resetMmDataAssetService } from '@/services/assets/MmDataAssetService';
import * as battleArmorExtractor from '@/services/printing/recordsheet/dataExtractors.battleArmor';
import * as battleArmorBindings from '@/services/printing/svgRecordSheetRenderer/battlearmor/bindings';
import { renderBattleArmorTemplated } from '@/services/printing/svgRecordSheetRenderer/renderTemplated';
import { mapBattleArmorDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { UnitContract } from '@/types/contracts';

import {
  catalog,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

jest.mock('@/services/printing/recordsheet/dataExtractors.battleArmor', () => {
  const actual = jest.requireActual<typeof battleArmorExtractor>(
    '@/services/printing/recordsheet/dataExtractors.battleArmor',
  );
  return {
    ...actual,
    extractBattleArmorData: jest.fn(actual.extractBattleArmorData),
  };
});
jest.mock(
  '@/services/printing/svgRecordSheetRenderer/battlearmor/bindings',
  () => {
    const actual = jest.requireActual<typeof battleArmorBindings>(
      '@/services/printing/svgRecordSheetRenderer/battlearmor/bindings',
    );
    return { ...actual, bindBattleArmor: jest.fn(actual.bindBattleArmor) };
  },
);

const { extractBattleArmorData } = jest.requireActual<
  typeof battleArmorExtractor
>('@/services/printing/recordsheet/dataExtractors.battleArmor');
const { bindBattleArmor } = jest.requireActual<typeof battleArmorBindings>(
  '@/services/printing/svgRecordSheetRenderer/battlearmor/bindings',
);

const entries = catalog('battlearmor');
type Troopers = ReturnType<typeof extractBattleArmorData>['troopers'];

function load(id: string) {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing catalog fixture: ${id}`);
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/battlearmor', entry.path),
        'utf8',
      ),
    ),
  );
  return { entry, source };
}

const IDENTITY = [
  'squadSize',
  'troopers.index',
  'troopers.column',
  'armor',
  'maximumArmor',
  'skills',
  'squadLabel',
  'movementLine',
  'suits.hidden',
  'template',
];
const fields = (id: string) => {
  const { entry } = load(id);
  const row = verifyCatalogUnit('battlearmor', entry);
  expect(row.rejection).toBeUndefined();
  return row.differences
    .map(({ field }) => field)
    .filter((field) => IDENTITY.includes(field))
    .sort();
};

/** One fixture per squad size and per movement mode named in row 4.3. */
const squads = [
  ['single suit', 'clan-interface-armor-sqd1'],
  ['un of three', 'elemental-battle-armor-headhuntersqd3'],
  ['squad of four', 'achileus-light-battle-armor-wobsqd4'],
  ['point of five', 'achileus-light-battle-armor-wobsqd5'],
  ['level I of six', 'achileus-light-battle-armor-wobsqd6'],
  ['VTOL', 'kobold-battle-armor-iic-sqd4'],
  ['UMU', 'sea-fox-amphibious-armor-sqd4'],
  ['jump mode with no jump MP', 'ailette-rescue-pal-sqd4'],
  ['ground mode with jump MP', 'tengu-heavy-battle-armor-svspsqd4'],
] as const;

const extractor = jest.mocked(battleArmorExtractor.extractBattleArmorData);
const binder = jest.mocked(battleArmorBindings.bindBattleArmor);

function mutateTroopers(mutate: (troopers: Troopers) => Troopers) {
  extractor.mockImplementation((unit, spa) => {
    const data = extractBattleArmorData(unit, spa);
    return { ...data, troopers: mutate(data.troopers) };
  });
}
function mutateBindings(
  mutate: (
    bindings: ReturnType<typeof bindBattleArmor>,
  ) => ReturnType<typeof bindBattleArmor>,
) {
  binder.mockImplementation((data) => mutate(bindBattleArmor(data)));
}
const withTexts = (texts: Record<string, string | undefined>) =>
  mutateBindings((bindings) => {
    const merged: Record<string, string> = { ...bindings.texts };
    for (const [key, value] of Object.entries(texts))
      if (value === undefined) delete merged[key];
      else merged[key] = value;
    return { ...bindings, texts: merged };
  });
const withHidden = (hiddenIds: readonly string[]) =>
  mutateBindings((bindings) => ({ ...bindings, hiddenIds }));

// Every describe starts from the real implementations; a mutant never leaks.
beforeEach(() => {
  extractor.mockImplementation(extractBattleArmorData);
  binder.mockImplementation(bindBattleArmor);
});

describe('Battle armor catalog trooper identity acceptance', () => {
  beforeAll(initializeEquipment);

  it.each(squads)('accepts the %s (%s)', (_label, id) => {
    expect(fields(id)).toEqual([]);
  });

  it('corrupts exactly one trooper: the last one', () => {
    mutateTroopers((troopers) =>
      troopers.map((t, i) =>
        i === troopers.length - 1 ? { ...t, armorPips: t.armorPips + 1 } : t,
      ),
    );
    expect(fields('achileus-light-battle-armor-wobsqd6')).toEqual(['armor']);
  });

  it('rejects a trooper with no armor', () => {
    mutateTroopers((troopers) =>
      troopers.map((t, i) => (i === 1 ? { ...t, armorPips: 0 } : t)),
    );
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual(['armor']);
  });

  it('rejects a dropped trooper', () => {
    mutateTroopers((troopers) => troopers.slice(0, -1));
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual(
      [
        'squadSize',
        'troopers.index',
        'troopers.column',
        'armor',
        'maximumArmor',
        'suits.hidden',
      ].sort(),
    );
  });

  it('rejects a duplicated trooper', () => {
    mutateTroopers((troopers) => [...troopers, troopers[0]]);
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual(
      [
        'squadSize',
        'troopers.index',
        'troopers.column',
        'armor',
        'maximumArmor',
        'suits.hidden',
      ].sort(),
    );
  });

  it('rejects renumbered troopers', () => {
    mutateTroopers((troopers) =>
      troopers.map((t) => ({ ...t, index: t.index + 1 })),
    );
    expect(fields('achileus-light-battle-armor-wobsqd5')).toEqual([
      'troopers.index',
    ]);
  });

  it('rejects a wrong original-armor maximum on one trooper', () => {
    mutateTroopers((troopers) =>
      troopers.map((t, i) => (i === 0 ? { ...t, maximumArmorPips: 99 } : t)),
    );
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual([
      'maximumArmor',
    ]);
  });

  it('rejects a wrong squad size field', () => {
    extractor.mockImplementation((unit, spa) => ({
      ...extractBattleArmorData(unit, spa),
      squadSize: 5,
    }));
    // The squad designation follows the squad size, so it moves with it.
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual(
      ['squadLabel', 'squadSize'].sort(),
    );
  });

  it('rejects swapped trooper columns', () => {
    mutateBindings((bindings) => {
      const [first, second, ...rest] = bindings.pipCounts.troopers;
      const pipCounts = {
        troopers: [
          { ...first, column: second.column },
          { ...second, column: first.column },
          ...rest,
        ],
      };
      return { ...bindings, pips: pipCounts, pipCounts };
    });
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual([
      'troopers.column',
    ]);
  });

  it.each([
    'clan-interface-armor-sqd1',
    'elemental-battle-armor-headhuntersqd3',
    'achileus-light-battle-armor-wobsqd4',
    'achileus-light-battle-armor-wobsqd5',
    'achileus-light-battle-armor-wobsqd6',
  ])('rejects the chassis name as the squad header of %s', (id) => {
    withTexts({ squad: 'BATTLE ARMOR: Achileus Light 1' });
    expect(fields(id)).toEqual(['squadLabel']);
  });

  it('rejects the wrong squad name for the squad size', () => {
    withTexts({ squad: 'BATTLE ARMOR: SQUAD 1' });
    expect(fields('achileus-light-battle-armor-wobsqd5')).toEqual([
      'squadLabel',
    ]);
  });

  it('rejects swapped skill texts', () => {
    mutateBindings((bindings) => ({
      ...bindings,
      texts: {
        ...bindings.texts,
        gunnerySkill0: bindings.texts.pilotingSkill0,
        pilotingSkill0: bindings.texts.gunnerySkill0,
      },
    }));
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual(['skills']);
  });

  it('rejects a jump line on a VTOL squad', () => {
    withTexts({ movement_mode_2: 'Jump MP:' });
    expect(fields('kobold-battle-armor-iic-sqd4')).toEqual(['movementLine']);
  });

  it('rejects a jump line on a UMU squad', () => {
    withTexts({ movement_mode_2: 'Jump MP:', mp_2: '3' });
    expect(fields('sea-fox-amphibious-armor-sqd4')).toEqual(['movementLine']);
  });

  it('rejects a movement line on a ground-mode squad that has jump MP', () => {
    withTexts({ movement_mode_2: 'Jump MP:', mp_2: '2' });
    expect(fields('tengu-heavy-battle-armor-svspsqd4')).toEqual([
      'movementLine',
    ]);
  });

  it('rejects a missing line on a jump-mode squad with no jump MP', () => {
    withTexts({ movement_mode_2: undefined, mp_2: undefined });
    expect(fields('ailette-rescue-pal-sqd4')).toEqual(['movementLine']);
  });

  it('rejects unused suit frames left visible', () => {
    withHidden([]);
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual([
      'suits.hidden',
    ]);
  });

  it('rejects the wrong suit frames hidden', () => {
    withHidden(['suit0', 'suit5']);
    expect(fields('achileus-light-battle-armor-wobsqd4')).toEqual([
      'suits.hidden',
    ]);
  });

  it('rejects a suit frame hidden on a full squad of six', () => {
    withHidden(['suit5']);
    expect(fields('achileus-light-battle-armor-wobsqd6')).toEqual([
      'suits.hidden',
    ]);
  });
});

/** A canonical-shaped squad template: six suit groups, each with a pip region. */
function squadTemplate(): string {
  const suits = Array.from(
    { length: 6 },
    (_, i) =>
      `<g id="suit${i}"><rect id="pips_${i}" x="0" y="${i * 20}" width="190" height="12"/></g>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="576" height="756" viewBox="0 0 576 756">
  <text id="squad"></text><text id="mp_2"></text><text id="movement_mode_2"></text>${suits}
</svg>`;
}

describe('Battle armor templated render hides unused suit frames', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    resetMmDataAssetService();
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => squadTemplate(),
      headers: new Headers({ 'content-type': 'image/svg+xml' }),
    })) as unknown as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const hiddenSuits = async (id: string) => {
    const { source } = load(id);
    const state = mapBattleArmorDefinitionToState(source);
    const data = extractBattleArmorData(
      buildBattleArmorUnitObject({ ...state, source: state }),
    );
    if (data.unitType !== 'battlearmor') throw new Error('not battle armor');
    const svg = await renderBattleArmorTemplated(data);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return Array.from({ length: 6 }, (_, i) => `suit${i}`).filter(
      (suit) =>
        doc.getElementById(suit)?.getAttribute('visibility') === 'hidden',
    );
  };

  it.each([
    [
      'clan-interface-armor-sqd1',
      ['suit1', 'suit2', 'suit3', 'suit4', 'suit5'],
    ],
    ['elemental-battle-armor-headhuntersqd3', ['suit3', 'suit4', 'suit5']],
    ['achileus-light-battle-armor-wobsqd4', ['suit4', 'suit5']],
    ['achileus-light-battle-armor-wobsqd5', ['suit5']],
    ['achileus-light-battle-armor-wobsqd6', []],
  ])('hides the right suits for %s', async (id, expected) => {
    expect(await hiddenSuits(id)).toEqual(expected);
  });
});

describe('Battle armor sheet for editor-built squads', () => {
  const sheet = (id: string) => {
    const { source } = load(id);
    const state = mapBattleArmorDefinitionToState(source);
    const data = extractBattleArmorData(
      buildBattleArmorUnitObject({ ...state, source: state }),
    );
    return { data, bindings: bindBattleArmor(data) };
  };

  it('hides every suit past the squad and none inside it', () => {
    expect(sheet('clan-interface-armor-sqd1').bindings.hiddenIds).toEqual([
      'suit1',
      'suit2',
      'suit3',
      'suit4',
      'suit5',
    ]);
    expect(
      sheet('achileus-light-battle-armor-wobsqd6').bindings.hiddenIds,
    ).toEqual([]);
  });

  it('carries the movement mode into the sheet data', () => {
    expect(sheet('kobold-battle-armor-iic-sqd4').data.movementMode).toBe(
      'vtol',
    );
    expect(sheet('sea-fox-amphibious-armor-sqd4').data.movementMode).toBe(
      'umu',
    );
    expect(sheet('ailette-rescue-pal-sqd4').data.movementMode).toBe('jump');
    expect(sheet('tengu-heavy-battle-armor-svspsqd4').data.movementMode).toBe(
      'ground',
    );
  });

  it('prints the VTOL line from the jump MP, as the pin does', () => {
    const { bindings } = sheet('kobold-battle-armor-iic-sqd4');
    expect(bindings.texts.movement_mode_2).toBe('VTOL MP:');
    expect(bindings.texts.mp_2).toBe('6');
  });
});
