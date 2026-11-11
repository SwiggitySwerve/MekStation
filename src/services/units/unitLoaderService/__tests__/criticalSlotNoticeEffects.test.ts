import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import {
  classifyCriticalSlotNoticeIdentity,
  CRITICAL_SLOT_NOTICE_RULES,
  CriticalSlotRecoveryResponsibility,
} from '../criticalSlotNoticeEffects';
import { groupCriticalSlotNoticeEntries } from '../criticalSlotNoticeGroups';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

it('names the five recovery buckets explicitly', () => {
  expect(Object.values(CriticalSlotRecoveryResponsibility)).toEqual([
    'o3a',
    'o3b',
    'o3b-s',
    'Celerity',
    'PR-D',
  ]);
});

it.each([
  ['Conversion Gear', 'o3b-s'],
  ['Avionics', 'o3b-s'],
  ['Landing Gear', 'o3b-s'],
  ['ISHeadTurret', 'o3b'],
  ['LAM Fuel Tank', 'o3b'],
])(
  'pins the approved boundary bucket for %s',
  (lookupToken, responsibility) => {
    const result = classifyCriticalSlotNoticeIdentity({ lookupToken });
    expect(result.kind).toBe('other');
    expect(result.ruleId).toBe('08-other');
    expect(result.effect.responsibility).toBe(responsibility);
  },
);

it('names the missing LAM Fuel Tank definition prerequisite', () => {
  expect(
    classifyCriticalSlotNoticeIdentity({ lookupToken: 'LAM Fuel Tank' }).effect,
  ).toHaveProperty(
    'prerequisite',
    'Missing equipment definition for LAM Fuel Tank (C3/C2 metadata/resolution).',
  );
});

it.each([
  [
    '6-dark-age/standard/Scarecrow UCU-F4',
    20,
    { electronics: 9, case: 1, mobility: 3, armor_structure: 7 },
  ],
  [
    '6-dark-age/standard/Celerity CLR-03-O',
    17,
    { electronics: 2, mobility: 1, armor_structure: 14 },
  ],
  [
    '6-dark-age/standard/Uni ATAE-70 ArtilleryMech',
    21,
    { cargo: 6, other: 15 },
  ],
  [
    '2-star-league/advanced/King Crab KGC-000',
    16,
    { case: 2, armor_structure: 14 },
  ],
] as const)(
  'groups exactly the loader residual for %s',
  (file, count, expected) => {
    const source = parseUnit(
      JSON.parse(
        readFileSync(
          join(process.cwd(), 'public/data/units/battlemechs', `${file}.json`),
          'utf8',
        ),
      ),
    );
    const entries = new UnitLoaderService().mapToUnitState(
      source,
      true,
    ).unrecoveredCriticalSlots!;
    const groups = groupCriticalSlotNoticeEntries(entries, source);
    const flattened = groups.flatMap((group) =>
      group.kinds.flatMap((kind) => kind.entries),
    );
    expect(flattened).toHaveLength(count);
    expect(new Set(flattened)).toEqual(new Set(entries));
    expect(
      Object.fromEntries(
        groups.flatMap((group) =>
          group.kinds.map((kind) => [kind.kind, kind.entries.length]),
        ),
      ),
    ).toEqual(expected);
    expect(groups.map((group) => group.title)).toEqual(
      'armor_structure' in expected
        ? ['Other critical-slot entries', 'Placement markers only']
        : ['Other critical-slot entries'],
    );
  },
);

it.each([
  ['ISBallisticReinforced', 'armor_structure', 'o3a'],
  ['ISHeatDissipating', 'armor_structure', 'o3a'],
  ['ISImpactResistant', 'armor_structure', 'o3a'],
  ['ISDoubleHeatSinkPrototype', 'heat_sinks', 'Celerity'],
  ['2 Compact Heat Sinks', 'heat_sinks', 'Celerity'],
  ['CASE II [IS]', 'case', 'PR-D'],
  ['Cargo:SIZE:1.0', 'cargo', 'PR-D'],
  ['ISMASS', 'other', 'PR-D'],
  ['Radical Heat Sink System', 'other', 'PR-D'],
  ['Tracks', 'other', 'o3b'],
  ['Conversion Gear', 'other', 'o3b-s'],
  ['ISSuperCooledMyomer', 'other', 'o3b'],
  ['QuadVee Wheels', 'other', 'o3b'],
  ['ISQuadTurret', 'other', 'o3b'],
  ['Avionics', 'other', 'o3b-s'],
  ['Landing Gear', 'other', 'o3b-s'],
  ['ISHeadTurret', 'other', 'o3b'],
  ['LAM Fuel Tank', 'other', 'o3b'],
  ['ISThumper', 'other', 'weapon-control'],
] as const)(
  'classifies %s once for the notice and recovery attribution',
  (lookupToken, kind, responsibility) => {
    const result = classifyCriticalSlotNoticeIdentity({ lookupToken });
    expect(result.kind).toBe(kind);
    expect(result.effect.responsibility).toBe(responsibility);
    expect(result.effect.consequence).not.toBe('');
  },
);

it('requires a unit and an executable test citation for every consequence line', () => {
  for (const rule of CRITICAL_SLOT_NOTICE_RULES) {
    for (const effect of rule.effects) {
      expect(effect.consequence.trim()).not.toBe('');
      expect(effect.evidence.unit.trim()).not.toBe('');
      expect(effect.evidence.testFile).toMatch(/\.test\.tsx?$/);
      const test = readFileSync(
        join(process.cwd(), effect.evidence.testFile),
        'utf8',
      );
      expect(effect.evidence.testName.trim()).not.toBe('');
      expect(test).toContain(effect.evidence.testName);
      expect(test).toContain(effect.evidence.unit);
    }
  }
});

it('never drops unknown entries or implies their effect is established', () => {
  const result = classifyCriticalSlotNoticeIdentity({
    lookupToken: 'Unknown future item',
  });
  expect(result.kind).toBe('other');
  expect(result.effect.responsibility).toBe('unassigned');
  expect(result.effect.consequence).toContain(
    'effect on the unit not established',
  );
});

it.each([
  ['Industrial Triple Strength Myomer', 'TSM'],
  ['ISPrototypeJumpJet', 'Jump Jet'],
  ['ISPrototypeImprovedJumpJet', 'Improved Jump Jet'],
])(
  'does not borrow a proven consequence for unmeasured subtype %s',
  (lookupToken, equipmentName) => {
    const result = classifyCriticalSlotNoticeIdentity({
      lookupToken,
      equipmentName,
    });

    expect(result.kind).toBe('mobility');
    expect(result.effect.id).toBe('mobility-unestablished');
    expect(result.effect.consequence).toContain(
      'effect on the unit not established',
    );
  },
);

it.each([
  ['ISMASC', 'masc'],
  ['CLTSM', 'tsm'],
  ['Supercharger', 'supercharger'],
  ['CLPartialWing', 'partial-wing'],
  ['ISUMU', 'umu'],
  ['Improved Jump Jet', 'improved-jets'],
  ['Jump Jet', 'standard-jets'],
  ['Tracks', 'tracks'],
  ['Conversion Gear', 'conversion'],
])('binds %s to its own proven effect, %s', (lookupToken, expected) => {
  expect(classifyCriticalSlotNoticeIdentity({ lookupToken }).effect.id).toBe(
    expected,
  );
});
