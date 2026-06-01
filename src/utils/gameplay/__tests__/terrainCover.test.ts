/**
 * terrainCover — partial-cover-from-terrain tests.
 *
 * `hexProvidesPartialCover` reads the source-pinned target-hex partial-cover
 * subset. Woods/smoke target terrain modifiers are intentionally kept out of
 * true partial cover so hit-location behavior stays rules-backed.
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
      TerrainType.Water,
      TerrainType.Swamp,
      TerrainType.Building,
    ]) {
      expect(hexProvidesPartialCover(hex(t))).toBe(true);
    }
  });

  it('returns false for open terrain and target terrain modifiers', () => {
    for (const t of [
      TerrainType.Clear,
      TerrainType.Pavement,
      TerrainType.Road,
      TerrainType.Rough,
      TerrainType.Rubble,
      TerrainType.LightWoods,
      TerrainType.Smoke,
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
