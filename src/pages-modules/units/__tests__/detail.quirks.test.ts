import { QUIRK_SUMMARY_UNITS } from '@/__tests__/fixtures/quirkSummaryUnits';
import { parseUnitFields } from '@/pages-modules/units/detail.parse';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';

function project(parsedData: Record<string, unknown>) {
  return parseUnitFields({
    id: 'saved-quirks',
    chassis: 'Saved',
    variant: 'Fixture',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    era: '3025',
    rulesLevel: RulesLevel.STANDARD,
    unitType: 'BattleMech',
    weightClass: WeightClass.MEDIUM,
    currentVersion: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    data: JSON.stringify(parsedData),
    parsedData,
  });
}

describe('saved detail weapon quirk projection', () => {
  it.each(QUIRK_SUMMARY_UNITS)(
    'retains the committed $label map ($family) without mutating saved data',
    ({ unit }) => {
      const source = { weaponQuirks: unit.weaponQuirks };
      const before = JSON.stringify(source);
      expect(project(source).weaponQuirks).toEqual(unit.weaponQuirks);
      expect(JSON.stringify(source)).toBe(before);
    },
  );

  it('retains exact unknown IDs, source key order, legacy names and repeats', () => {
    const weaponQuirks = {
      'RT:8:Unknown:Weapon': ['unknown_native', 'unknown_native'],
      'RT:2:Unknown:Weapon': ['other_unknown'],
      'Legacy Name': ['legacy_unknown'],
    };
    const result = project({ weaponQuirks, quirks: ['unit_unknown'] });
    expect(result.weaponQuirks).toEqual(weaponQuirks);
    expect(Object.keys(result.weaponQuirks ?? {})).toEqual(
      Object.keys(weaponQuirks),
    );
    expect(result.quirks).toEqual(['unit_unknown']);
  });

  it.each([
    undefined,
    null,
    [],
    'accurate',
    { 'NOS:0:PPC': 'accurate' },
    { 'NOS:0:PPC': [1] },
  ])('does not project malformed optional maps (%s)', (weaponQuirks) => {
    expect(project({ weaponQuirks }).weaponQuirks).toBeUndefined();
  });

  it('preserves valid empty maps and lists for the presentation owner', () => {
    expect(project({ weaponQuirks: {} }).weaponQuirks).toEqual({});
    expect(project({ weaponQuirks: { 'NOS:0:PPC': [] } }).weaponQuirks).toEqual(
      {
        'NOS:0:PPC': [],
      },
    );
  });
});
