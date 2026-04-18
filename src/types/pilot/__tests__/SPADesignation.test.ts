/**
 * ISPADesignation — Wave 2b unit tests for the typed discriminated union,
 * zod schema, type guards, and the legacy stub migrator.
 *
 * @spec openspec/changes/add-spa-designation-persistence/tasks.md
 */

import {
  catalogDesignationToKind,
  getDesignationLabel,
  isRangeBracketDesignation,
  isSkillDesignation,
  isTargetDesignation,
  isTerrainDesignation,
  isWeaponCategoryDesignation,
  isWeaponTypeDesignation,
  legacyDesignationToTyped,
  SPA_DESIGNATION_KINDS,
  SPA_DESIGNATION_SCHEMA,
  type ISPADesignation,
} from '@/types/pilot/SPADesignation';

describe('SPA_DESIGNATION_KINDS', () => {
  it('mirrors every catalog SPADesignationType', () => {
    expect(SPA_DESIGNATION_KINDS).toEqual([
      'weapon_type',
      'weapon_category',
      'range_bracket',
      'target',
      'terrain',
      'skill',
    ]);
  });
});

describe('catalogDesignationToKind', () => {
  it('passes through identity for every catalog slug', () => {
    for (const k of SPA_DESIGNATION_KINDS) {
      expect(catalogDesignationToKind(k)).toBe(k);
    }
  });
});

describe('Type guards', () => {
  const wpn: ISPADesignation = {
    kind: 'weapon_type',
    weaponTypeId: 'ppc',
    displayLabel: 'PPC',
  };
  const cat: ISPADesignation = {
    kind: 'weapon_category',
    category: 'energy',
    displayLabel: 'Energy',
  };
  const rng: ISPADesignation = {
    kind: 'range_bracket',
    bracket: 'medium',
    displayLabel: 'Medium',
  };
  const tgt: ISPADesignation = {
    kind: 'target',
    targetUnitId: 'unit-42',
    displayLabel: 'Atlas AS7-D',
  };
  const ter: ISPADesignation = {
    kind: 'terrain',
    terrainTypeId: 'woods',
    displayLabel: 'Woods',
  };
  const skl: ISPADesignation = {
    kind: 'skill',
    skillId: 'gunnery',
    displayLabel: 'Gunnery',
  };

  it('narrows correctly for each variant', () => {
    expect(isWeaponTypeDesignation(wpn)).toBe(true);
    expect(isWeaponCategoryDesignation(cat)).toBe(true);
    expect(isRangeBracketDesignation(rng)).toBe(true);
    expect(isTargetDesignation(tgt)).toBe(true);
    expect(isTerrainDesignation(ter)).toBe(true);
    expect(isSkillDesignation(skl)).toBe(true);

    // Cross-kind rejection
    expect(isWeaponTypeDesignation(cat)).toBe(false);
    expect(isTargetDesignation(rng)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isWeaponTypeDesignation(null)).toBe(false);
    expect(isTargetDesignation(undefined)).toBe(false);
  });
});

describe('getDesignationLabel', () => {
  it('returns the displayLabel field', () => {
    expect(
      getDesignationLabel({
        kind: 'weapon_type',
        weaponTypeId: 'medium_laser',
        displayLabel: 'Medium Laser',
      }),
    ).toBe('Medium Laser');
  });
});

describe('SPA_DESIGNATION_SCHEMA', () => {
  it('accepts each canonical variant', () => {
    const samples: ISPADesignation[] = [
      { kind: 'weapon_type', weaponTypeId: 'ppc', displayLabel: 'PPC' },
      {
        kind: 'weapon_category',
        category: 'energy',
        displayLabel: 'Energy',
      },
      { kind: 'range_bracket', bracket: 'long', displayLabel: 'Long' },
      // Empty targetUnitId is allowed (deferred binding placeholder).
      { kind: 'target', targetUnitId: '', displayLabel: 'To be assigned' },
      { kind: 'terrain', terrainTypeId: 'woods', displayLabel: 'Woods' },
      { kind: 'skill', skillId: 'gunnery', displayLabel: 'Gunnery' },
    ];

    for (const s of samples) {
      const result = SPA_DESIGNATION_SCHEMA.safeParse(s);
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown discriminator', () => {
    const bad = SPA_DESIGNATION_SCHEMA.safeParse({
      kind: 'made-up-kind',
      foo: 'bar',
    });
    expect(bad.success).toBe(false);
  });

  it('rejects a missing required field', () => {
    const bad = SPA_DESIGNATION_SCHEMA.safeParse({
      kind: 'weapon_type',
      // displayLabel missing
      weaponTypeId: 'ppc',
    });
    expect(bad.success).toBe(false);
  });

  it('rejects an out-of-enum range bracket', () => {
    const bad = SPA_DESIGNATION_SCHEMA.safeParse({
      kind: 'range_bracket',
      bracket: 'forever',
      displayLabel: 'Forever',
    });
    expect(bad.success).toBe(false);
  });
});

describe('legacyDesignationToTyped', () => {
  it('returns null for null/undefined/unknown stubs', () => {
    expect(legacyDesignationToTyped(null)).toBeNull();
    expect(legacyDesignationToTyped(undefined)).toBeNull();
    expect(
      legacyDesignationToTyped({ kind: 'unknown', value: 'whatever' }),
    ).toBeNull();
    expect(legacyDesignationToTyped({ kind: '', value: 'PPC' })).toBeNull();
    expect(
      legacyDesignationToTyped({ kind: 'weapon_type', value: '' }),
    ).toBeNull();
  });

  it('converts a weapon_type stub into the typed variant', () => {
    const out = legacyDesignationToTyped({
      kind: 'weapon_type',
      value: 'Medium Laser',
    });
    expect(out).toEqual({
      kind: 'weapon_type',
      weaponTypeId: 'medium_laser',
      displayLabel: 'Medium Laser',
    });
  });

  it('normalizes the legacy "Melee" weapon_category to "physical"', () => {
    const out = legacyDesignationToTyped({
      kind: 'weapon_category',
      value: 'Melee',
    });
    expect(isWeaponCategoryDesignation(out)).toBe(true);
    if (isWeaponCategoryDesignation(out)) {
      expect(out.category).toBe('physical');
    }
  });

  it('falls back to "short" for unknown range brackets', () => {
    const out = legacyDesignationToTyped({
      kind: 'range_bracket',
      value: 'unknown-bracket',
    });
    expect(isRangeBracketDesignation(out)).toBe(true);
    if (isRangeBracketDesignation(out)) {
      expect(out.bracket).toBe('short');
    }
  });

  it('preserves a target unit id verbatim', () => {
    const out = legacyDesignationToTyped({
      kind: 'target',
      value: 'unit-42',
    });
    expect(out).toEqual({
      kind: 'target',
      targetUnitId: 'unit-42',
      displayLabel: 'unit-42',
    });
  });

  it('lowercases terrain and skill values', () => {
    expect(
      legacyDesignationToTyped({ kind: 'terrain', value: 'Woods' }),
    ).toEqual({
      kind: 'terrain',
      terrainTypeId: 'woods',
      displayLabel: 'Woods',
    });
    expect(
      legacyDesignationToTyped({ kind: 'skill', value: 'Gunnery' }),
    ).toEqual({
      kind: 'skill',
      skillId: 'gunnery',
      displayLabel: 'Gunnery',
    });
  });
});
