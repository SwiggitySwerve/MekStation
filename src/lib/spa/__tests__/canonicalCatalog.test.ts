/**
 * Tests for the unified SPA catalog and lookup helpers.
 */

import {
  CANONICAL_SPA_LIST,
  areSPAIdsValid,
  canonicalizeSPAIds,
  getAllSPAs,
  getFlaws,
  getOriginOnlySPAs,
  getPurchasableSPAs,
  getSPADefinition,
  getSPAsByCategory,
  getSPAsBySource,
  getSPAsForPipeline,
  resolveSPAId,
} from '../';

describe('canonical SPA catalog shape', () => {
  it('contains at least 85 canonical entries', () => {
    expect(CANONICAL_SPA_LIST.length).toBeGreaterThanOrEqual(85);
  });

  it('every entry has a snake_case id', () => {
    for (const spa of CANONICAL_SPA_LIST) {
      expect(spa.id).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('every entry has displayName, description, category, and source', () => {
    for (const spa of CANONICAL_SPA_LIST) {
      expect(spa.displayName.length).toBeGreaterThan(0);
      expect(spa.description.length).toBeGreaterThan(0);
      expect(spa.category).toBeTruthy();
      expect(spa.source).toBeTruthy();
    }
  });

  it('ids are unique', () => {
    const ids = CANONICAL_SPA_LIST.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes canonical examples from every major category', () => {
    const getById = (id: string) => CANONICAL_SPA_LIST.find((s) => s.id === id);
    // Piloting
    expect(getById('maneuvering_ace')).toBeDefined();
    expect(getById('jumping_jack')).toBeDefined();
    // Gunnery
    expect(getById('weapon_specialist')).toBeDefined();
    expect(getById('sandblaster')).toBeDefined();
    expect(getById('blood_stalker')).toBeDefined();
    // Manei Domini bioware
    expect(getById('vdni')).toBeDefined();
    expect(getById('tsm_implant')).toBeDefined();
    // Edge
    expect(getById('edge_when_headhit')).toBeDefined();
    expect(getById('edge_when_aero_nuke_crit')).toBeDefined();
    // aToW
    expect(getById('atow_combat_sense')).toBeDefined();
    expect(getById('atow_combat_paralysis')).toBeDefined();
  });

  it('flaws have negative or null xpCost and isFlaw=true', () => {
    for (const spa of CANONICAL_SPA_LIST) {
      if (spa.isFlaw) {
        expect(spa.xpCost === null || spa.xpCost < 0).toBe(true);
      }
    }
  });

  it('bioware entries are origin-only and have null xpCost', () => {
    const bioware = CANONICAL_SPA_LIST.filter((s) => s.category === 'bioware');
    expect(bioware.length).toBeGreaterThan(0);
    for (const spa of bioware) {
      expect(spa.isOriginOnly).toBe(true);
      expect(spa.xpCost).toBeNull();
    }
  });

  it('abilities that require designation carry a designationType', () => {
    for (const spa of CANONICAL_SPA_LIST) {
      if (spa.requiresDesignation) {
        expect(spa.designationType).toBeDefined();
      }
    }
  });
});

describe('getSPADefinition', () => {
  it('looks up a definition by canonical id', () => {
    const def = getSPADefinition('weapon_specialist');
    expect(def).not.toBeNull();
    expect(def?.displayName).toBe('Weapon Specialist');
    expect(def?.category).toBe('gunnery');
  });

  it('returns null for unknown ids', () => {
    expect(getSPADefinition('does_not_exist')).toBeNull();
  });

  it('resolves legacy System A id (natural_aptitude → aptitude_gunnery)', () => {
    const def = getSPADefinition('natural_aptitude');
    expect(def?.id).toBe('aptitude_gunnery');
  });

  it('resolves legacy System B id (weapon-specialist → weapon_specialist)', () => {
    const def = getSPADefinition('weapon-specialist');
    expect(def?.id).toBe('weapon_specialist');
  });

  it('resolves legacy kebab-case ids for edge-case names', () => {
    expect(getSPADefinition('iron-man')?.id).toBe('iron_man');
    expect(getSPADefinition('tactical-genius')?.id).toBe('tactical_genius');
    expect(getSPADefinition('heavy-lifter')?.id).toBe('hvy_lifter');
  });
});

describe('resolveSPAId', () => {
  it('returns the canonical id unchanged when input is canonical', () => {
    expect(resolveSPAId('iron_man')).toBe('iron_man');
  });

  it('maps System A legacy ids', () => {
    expect(resolveSPAId('fast_learner')).toBe('aptitude_gunnery');
  });

  it('returns null for unknown ids', () => {
    expect(resolveSPAId('nonsense')).toBeNull();
  });
});

describe('filters', () => {
  it('getAllSPAs returns the full list', () => {
    expect(getAllSPAs().length).toBe(CANONICAL_SPA_LIST.length);
  });

  it('getSPAsByCategory returns only the requested category', () => {
    const gunnery = getSPAsByCategory('gunnery');
    expect(gunnery.length).toBeGreaterThan(0);
    expect(gunnery.every((s) => s.category === 'gunnery')).toBe(true);
  });

  it('getSPAsBySource returns only the requested source', () => {
    const camOps = getSPAsBySource('CamOps');
    expect(camOps.length).toBeGreaterThan(0);
    expect(camOps.every((s) => s.source === 'CamOps')).toBe(true);
  });

  it('getSPAsForPipeline returns only SPAs touching that pipeline', () => {
    const toHit = getSPAsForPipeline('to-hit');
    expect(toHit.length).toBeGreaterThan(0);
    expect(toHit.every((s) => s.pipelines.includes('to-hit'))).toBe(true);
  });

  it('getPurchasableSPAs excludes flaws and null-cost abilities', () => {
    const purchasable = getPurchasableSPAs();
    expect(purchasable.every((s) => s.xpCost !== null && !s.isFlaw)).toBe(true);
  });

  it('getFlaws returns only flaws', () => {
    const flaws = getFlaws();
    expect(flaws.length).toBeGreaterThan(0);
    expect(flaws.every((s) => s.isFlaw)).toBe(true);
  });

  it('getOriginOnlySPAs returns only origin-only abilities', () => {
    const origin = getOriginOnlySPAs();
    expect(origin.every((s) => s.isOriginOnly)).toBe(true);
  });
});

describe('id canonicalization helpers', () => {
  it('areSPAIdsValid accepts mixed canonical + legacy ids', () => {
    expect(areSPAIdsValid(['weapon_specialist', 'iron-man'])).toBe(true);
  });

  it('areSPAIdsValid rejects any unknown id in the list', () => {
    expect(areSPAIdsValid(['weapon_specialist', 'nope'])).toBe(false);
  });

  it('canonicalizeSPAIds maps legacy ids to canonical form and drops unknowns', () => {
    expect(
      canonicalizeSPAIds(['iron-man', 'nonsense', 'weapon_specialist']),
    ).toEqual(['iron_man', 'weapon_specialist']);
  });
});
