/**
 * terrainCover — partial-cover-from-terrain tests.
 *
 * `hexProvidesPartialCover` reads the canonical `TERRAIN_PROPERTIES` cover
 * mapping. These tests pin which terrain types grant partial cover and that
 * unrecognised / absent terrain never over-reports cover.
 *
 * @spec openspec/changes/complete-partial-cover-rules/specs/to-hit-resolution/spec.md
 */

import type { IHex } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import { hexProvidesPartialCover } from '../terrainCover';

/** Build an `IHex` with the given terrain at the origin. */
function hex(terrain: string): IHex {
  return {
    coord: { q: 0, r: 0 },
    occupantId: null,
    terrain,
    elevation: 0,
  };
}

describe('hexProvidesPartialCover', () => {
  it('returns true for terrain whose canonical cover level is Partial', () => {
    for (const t of [
      TerrainType.LightWoods,
      TerrainType.Water,
      TerrainType.Swamp,
      TerrainType.Building,
      TerrainType.Smoke,
    ]) {
      expect(hexProvidesPartialCover(hex(t))).toBe(true);
    }
  });

  it('returns false for open terrain (cover level None)', () => {
    for (const t of [
      TerrainType.Clear,
      TerrainType.Pavement,
      TerrainType.Road,
      TerrainType.Rough,
      TerrainType.Rubble,
    ]) {
      expect(hexProvidesPartialCover(hex(t))).toBe(false);
    }
  });

  it('returns false for full-cover terrain (Partial means partial, not full)', () => {
    // Heavy woods is Full cover — not Partial — so this helper reports false.
    expect(hexProvidesPartialCover(hex(TerrainType.HeavyWoods))).toBe(false);
  });

  it('returns false for an unrecognised terrain string', () => {
    expect(hexProvidesPartialCover(hex('asteroid_field'))).toBe(false);
  });

  it('returns false for an undefined hex', () => {
    expect(hexProvidesPartialCover(undefined)).toBe(false);
  });
});
