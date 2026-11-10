import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import {
  classifyCriticalSlotNoticeIdentity,
  CRITICAL_SLOT_NOTICE_RULES,
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
  ['ISBallisticReinforced', 'armor_structure', 'o3'],
  ['ISHeatDissipating', 'armor_structure', 'o3'],
  ['ISImpactResistant', 'armor_structure', 'o3'],
  ['ISDoubleHeatSinkPrototype', 'heat_sinks', 'Celerity'],
  ['2 Compact Heat Sinks', 'heat_sinks', 'Celerity'],
  ['CASE II [IS]', 'case', 'PR-D'],
  ['Cargo:SIZE:1.0', 'cargo', 'PR-D'],
  ['ISMASS', 'other', 'PR-D'],
  ['Radical Heat Sink System', 'other', 'PR-D'],
  ['Tracks', 'other', 'o3'],
  ['Conversion Gear', 'other', 'o3'],
  ['ISSuperCooledMyomer', 'other', 'o3'],
  ['QuadVee Wheels', 'other', 'o3'],
  ['ISQuadTurret', 'other', 'o3'],
  ['Avionics', 'other', 'system-boundary'],
  ['Landing Gear', 'other', 'system-boundary'],
  ['ISHeadTurret', 'other', 'system-boundary'],
  ['LAM Fuel Tank', 'other', 'system-boundary'],
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
