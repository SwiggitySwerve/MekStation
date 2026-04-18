/**
 * applyDesignation — Wave 2b unit tests for the combat-side gate.
 *
 * Covers every variant of `ISPADesignation` plus the deferred-target +
 * non-designated-target predicates.
 *
 * @spec openspec/changes/add-spa-designation-persistence/tasks.md
 */

import type { ISPADesignation } from '@/types/pilot/SPADesignation';

import {
  applyDesignation,
  isNonDesignatedTarget,
} from '@/lib/spa/designation/applyDesignation';

describe('applyDesignation — empty / null', () => {
  it('returns false when designation is null/undefined', () => {
    expect(applyDesignation(null, { weaponTypeId: 'ppc' })).toBe(false);
    expect(applyDesignation(undefined, { weaponTypeId: 'ppc' })).toBe(false);
  });
});

describe('applyDesignation — weapon_type', () => {
  const d: ISPADesignation = {
    kind: 'weapon_type',
    weaponTypeId: 'medium_laser',
    displayLabel: 'Medium Laser',
  };

  it('matches when canonical weapon ids agree', () => {
    expect(applyDesignation(d, { weaponTypeId: 'medium_laser' })).toBe(true);
  });

  it('matches when the context spells the weapon with spaces', () => {
    expect(applyDesignation(d, { weaponTypeId: 'Medium Laser' })).toBe(true);
  });

  it('matches when the context spells the weapon with hyphens', () => {
    expect(applyDesignation(d, { weaponTypeId: 'medium-laser' })).toBe(true);
  });

  it('does not match a different weapon', () => {
    expect(applyDesignation(d, { weaponTypeId: 'ppc' })).toBe(false);
  });

  it('returns false when context lacks a weapon id', () => {
    expect(applyDesignation(d, {})).toBe(false);
  });
});

describe('applyDesignation — weapon_category', () => {
  const d: ISPADesignation = {
    kind: 'weapon_category',
    category: 'energy',
    displayLabel: 'Energy',
  };

  it('matches when categories agree (case-insensitive)', () => {
    expect(applyDesignation(d, { weaponCategory: 'energy' })).toBe(true);
    expect(applyDesignation(d, { weaponCategory: 'Energy' })).toBe(true);
  });

  it('does not match a different category', () => {
    expect(applyDesignation(d, { weaponCategory: 'ballistic' })).toBe(false);
  });
});

describe('applyDesignation — range_bracket', () => {
  const d: ISPADesignation = {
    kind: 'range_bracket',
    bracket: 'medium',
    displayLabel: 'Medium',
  };

  it('matches when brackets agree', () => {
    expect(applyDesignation(d, { rangeBracket: 'medium' })).toBe(true);
  });

  it('does not match a different bracket', () => {
    expect(applyDesignation(d, { rangeBracket: 'long' })).toBe(false);
  });
});

describe('applyDesignation — target', () => {
  it('matches when the target unit ids agree', () => {
    const d: ISPADesignation = {
      kind: 'target',
      targetUnitId: 'unit-42',
      displayLabel: 'Atlas',
    };
    expect(applyDesignation(d, { targetUnitId: 'unit-42' })).toBe(true);
  });

  it('does NOT match when designation has empty (deferred) targetUnitId', () => {
    const d: ISPADesignation = {
      kind: 'target',
      targetUnitId: '',
      displayLabel: 'To be assigned',
    };
    expect(applyDesignation(d, { targetUnitId: 'unit-42' })).toBe(false);
  });

  it('does not match a different unit', () => {
    const d: ISPADesignation = {
      kind: 'target',
      targetUnitId: 'unit-42',
      displayLabel: 'Atlas',
    };
    expect(applyDesignation(d, { targetUnitId: 'unit-99' })).toBe(false);
  });
});

describe('applyDesignation — terrain', () => {
  const d: ISPADesignation = {
    kind: 'terrain',
    terrainTypeId: 'woods',
    displayLabel: 'Woods',
  };

  it('matches when terrain ids agree (case-insensitive)', () => {
    expect(applyDesignation(d, { terrainTypeId: 'WOODS' })).toBe(true);
  });

  it('does not match a different terrain', () => {
    expect(applyDesignation(d, { terrainTypeId: 'urban' })).toBe(false);
  });
});

describe('applyDesignation — skill', () => {
  it('always returns false (reserved for future SPAs)', () => {
    const d: ISPADesignation = {
      kind: 'skill',
      skillId: 'gunnery',
      displayLabel: 'Gunnery',
    };
    expect(applyDesignation(d, {})).toBe(false);
  });
});

describe('isNonDesignatedTarget', () => {
  it('returns true for a real binding against a different unit', () => {
    const d: ISPADesignation = {
      kind: 'target',
      targetUnitId: 'unit-42',
      displayLabel: 'Atlas',
    };
    expect(isNonDesignatedTarget(d, { targetUnitId: 'unit-99' })).toBe(true);
  });

  it('returns false for the matching unit', () => {
    const d: ISPADesignation = {
      kind: 'target',
      targetUnitId: 'unit-42',
      displayLabel: 'Atlas',
    };
    expect(isNonDesignatedTarget(d, { targetUnitId: 'unit-42' })).toBe(false);
  });

  it('returns false when the designation is deferred (empty unit id)', () => {
    const d: ISPADesignation = {
      kind: 'target',
      targetUnitId: '',
      displayLabel: 'To be assigned',
    };
    expect(isNonDesignatedTarget(d, { targetUnitId: 'unit-99' })).toBe(false);
  });

  it('returns false for non-target designations', () => {
    const d: ISPADesignation = {
      kind: 'weapon_type',
      weaponTypeId: 'ppc',
      displayLabel: 'PPC',
    };
    expect(isNonDesignatedTarget(d, { targetUnitId: 'unit-99' })).toBe(false);
  });
});
