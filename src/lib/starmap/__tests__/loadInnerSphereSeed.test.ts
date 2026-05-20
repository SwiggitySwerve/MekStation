/**
 * Inner Sphere seed-dataset tests.
 *
 * Per `wire-starmap-into-campaign` (Wave 6.4): the seed dataset is the
 * MVP starmap data source. These tests are the single guardrail that
 * keeps `src/lib/starmap/seed/inner-sphere-seed.json` honest — any future
 * commit that breaks the shape, drops a canonical capital, or adds a
 * duplicate id surfaces here rather than in the canvas at runtime.
 *
 * @spec openspec/changes/wire-starmap-into-campaign/specs/starmap-interface/spec.md
 */

import { KNOWN_FACTIONS } from '@/types/starmap/StarSystem';

import { findSystemById, loadInnerSphereSeed } from '../loadInnerSphereSeed';

describe('loadInnerSphereSeed — seed dataset shape', () => {
  it('returns at least 40 valid entries', () => {
    const { systems } = loadInnerSphereSeed();
    expect(systems.length).toBeGreaterThanOrEqual(40);
  });

  it('every entry has a unique kebab-case id', () => {
    const { systems } = loadInnerSphereSeed();
    const ids = new Set<string>();
    for (const s of systems) {
      expect(s.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
    expect(ids.size).toBe(systems.length);
  });

  it('every entry has a faction in KNOWN_FACTIONS', () => {
    const { systems } = loadInnerSphereSeed();
    const knownSet = new Set<string>(KNOWN_FACTIONS);
    for (const s of systems) {
      expect(knownSet.has(s.faction)).toBe(true);
    }
  });

  it('every entry has finite numeric position', () => {
    const { systems } = loadInnerSphereSeed();
    for (const s of systems) {
      expect(Number.isFinite(s.position.x)).toBe(true);
      expect(Number.isFinite(s.position.y)).toBe(true);
    }
  });

  it('includes the five Successor State capitals + Terra at the origin', () => {
    const { systems } = loadInnerSphereSeed();
    const byId = new Map(systems.map((s) => [s.id, s] as const));

    // Terra at the origin — canonical anchor for the Inner Sphere
    // coordinate convention.
    expect(byId.get('terra')).toBeDefined();
    expect(byId.get('terra')?.position).toEqual({ x: 0, y: 0 });

    // The five Successor State capitals must all be present so the
    // operator gets a recognizable BattleTech-universe map.
    for (const cap of ['tharkad', 'new-avalon', 'sian', 'luthien', 'atreus']) {
      expect(byId.get(cap)).toBeDefined();
    }
  });

  it('includes at least one Clan invasion-route world', () => {
    const { systems } = loadInnerSphereSeed();
    // Per the spec rationale: a curated Clan invasion route covers
    // Tukayyid / Strana Mechty / Huntress / Arc-Royal / Tamar / Black
    // Brian / Skye / Dieron. At least one of the explicit Clan worlds
    // must be present (the MVP can drop any one of them but not all).
    const clanWorlds = ['tukayyid', 'strana-mechty', 'huntress', 'tamar'];
    const matched = clanWorlds.filter((id) => systems.some((s) => s.id === id));
    expect(matched.length).toBeGreaterThan(0);
  });

  it('exposes the seed meta with version + spec pointer', () => {
    const { meta } = loadInnerSphereSeed();
    expect(typeof meta.version).toBe('number');
    expect(meta.snapshotYear).toBe(3025);
    expect(meta.spec).toContain('wire-starmap-into-campaign');
  });
});

describe('findSystemById', () => {
  it('returns the system when the id is known', () => {
    const s = findSystemById('luthien');
    expect(s).toBeDefined();
    expect(s?.name).toBe('Luthien');
    expect(s?.faction).toBe('Kurita');
  });

  it('returns undefined for an unknown id', () => {
    expect(findSystemById('not-a-real-system')).toBeUndefined();
    expect(findSystemById('')).toBeUndefined();
  });
});
