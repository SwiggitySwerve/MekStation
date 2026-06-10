/**
 * terrainCover - partial-cover-from-terrain tests.
 *
 * `hexProvidesPartialCover` reads the source-pinned target-hex partial-cover
 * subset. Woods/smoke target terrain modifiers are intentionally kept out of
 * true partial cover so hit-location behavior stays rules-backed.
 *
 * @spec openspec/changes/complete-partial-cover-rules/specs/to-hit-resolution/spec.md
 */

import type { IHex, IHexGrid } from '@/types/gameplay';

import { CoverLevel, TerrainType, TokenUnitType } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import {
  gameUnitUsesMekHorizontalCover,
  gameUnitUsesMekWaterCover,
  getHexCoverInfo,
  getTargetCoverInfo,
  hexProvidesPartialCover,
  terrainTagOffersCover,
  tokenUsesMekHorizontalCover,
  tokenUsesMekWaterCover,
} from '../terrainCover';

/** Build an `IHex` with the given terrain at the origin. */
function hex(terrain: string): IHex {
  return {
    coord: { q: 0, r: 0 },
    occupantId: null,
    terrain,
    elevation: 0,
  };
}

function makeHex(
  q: number,
  r: number,
  terrain: string = TerrainType.Clear,
  elevation: number = 0,
): IHex {
  return { coord: { q, r }, occupantId: null, terrain, elevation };
}

function gridWith(hexes: readonly IHex[]): IHexGrid {
  return {
    config: { radius: 2 },
    hexes: new Map(hexes.map((h) => [`${h.coord.q},${h.coord.r}`, h])),
  };
}

describe('hexProvidesPartialCover', () => {
  it('returns true for source-pinned target-hex partial-cover terrain', () => {
    for (const t of [TerrainType.Water, TerrainType.Building]) {
      expect(hexProvidesPartialCover(hex(t))).toBe(true);
    }
  });

  it('returns false for open terrain and target terrain modifiers', () => {
    // Audit 2026-06-09 C-7: Swamp moved here — MegaMek grants no swamp partial
    // cover (LosEffects has no swamp cover source), so swamp must not produce
    // the +1 cover modifier or the leg-hit conversion.
    for (const t of [
      TerrainType.Clear,
      TerrainType.Pavement,
      TerrainType.Road,
      TerrainType.Rough,
      TerrainType.Rubble,
      TerrainType.Swamp,
      TerrainType.LightWoods,
      TerrainType.Smoke,
    ]) {
      expect(hexProvidesPartialCover(hex(t))).toBe(false);
    }
  });

  it('reports no cover metadata for a swamp target hex (audit 2026-06-09 C-7)', () => {
    // Shared gate for both the to-hit +1 and the hit-location leg-hit
    // conversion: weaponAttack and InteractiveSession both route through
    // getHexCoverInfo / hexProvidesPartialCover.
    expect(getHexCoverInfo(hex(TerrainType.Swamp))).toMatchObject({
      coverLevel: CoverLevel.None,
      partialCover: false,
      modifier: 0,
    });
  });

  it('returns false for full-cover terrain (Partial means partial, not full)', () => {
    // Heavy woods is Full cover - not Partial - so this helper reports false.
    expect(hexProvidesPartialCover(hex(TerrainType.HeavyWoods))).toBe(false);
  });

  it('returns false for an unrecognised terrain string', () => {
    expect(hexProvidesPartialCover(hex('asteroid_field'))).toBe(false);
  });

  it('returns false for an undefined hex', () => {
    expect(hexProvidesPartialCover(undefined)).toBe(false);
  });

  it('reads encoded multi-feature terrain when deriving target partial cover', () => {
    const tag = terrainStringFromFeatures([
      { type: TerrainType.LightWoods, level: 1 },
      { type: TerrainType.Building, level: 1 },
    ]);

    expect(hexProvidesPartialCover(hex(tag))).toBe(true);
    expect(getHexCoverInfo(hex(tag))).toMatchObject({
      terrain: TerrainType.Building,
      partialCover: true,
      modifier: 1,
      reason: 'Target in building partial cover (+1)',
    });
  });

  it('does not grant water partial cover for deep water or ineligible targets', () => {
    const deepWater = terrainStringFromFeatures([
      { type: TerrainType.Water, level: 2 },
    ]);

    expect(hexProvidesPartialCover(hex(deepWater))).toBe(false);
    expect(
      hexProvidesPartialCover(hex(TerrainType.Water), {
        targetHexWaterCoverEligible: false,
      }),
    ).toBe(false);
  });

  it('treats encoded full-cover terrain as cover for AI movement scoring', () => {
    const tag = terrainStringFromFeatures([
      { type: TerrainType.Rough, level: 1 },
      { type: TerrainType.HeavyWoods, level: 1 },
    ]);

    expect(hexProvidesPartialCover(hex(tag))).toBe(false);
    expect(terrainTagOffersCover(tag)).toBe(true);
  });
});

describe('getTargetCoverInfo', () => {
  it('grants target partial cover behind an adjacent level-1 hill', () => {
    const cover = getTargetCoverInfo(
      gridWith([
        makeHex(0, 0),
        makeHex(1, 0, TerrainType.Clear, 1),
        makeHex(2, 0),
      ]),
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    );

    expect(cover).toMatchObject({
      partialCover: true,
      modifier: 1,
      reason: expect.stringContaining('elevation +1'),
    });
  });

  it('grants target partial cover behind an adjacent level-1 building', () => {
    const building = terrainStringFromFeatures([
      { type: TerrainType.Building, level: 1 },
    ]);
    const cover = getTargetCoverInfo(
      gridWith([makeHex(0, 0), makeHex(1, 0, building), makeHex(2, 0)]),
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    );

    expect(cover).toMatchObject({
      terrain: TerrainType.Building,
      partialCover: true,
      modifier: 1,
      reason: expect.stringContaining('building partial cover'),
    });
  });

  it('does not grant horizontal cover when the attacker is above the target', () => {
    const cover = getTargetCoverInfo(
      gridWith([
        makeHex(0, 0, TerrainType.Clear, 2),
        makeHex(1, 0, TerrainType.Clear, 1),
        makeHex(2, 0),
      ]),
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    );

    expect(cover).toMatchObject({
      partialCover: false,
      modifier: 0,
    });
  });

  it('does not grant horizontal cover when the target class is not eligible', () => {
    const cover = getTargetCoverInfo(
      gridWith([
        makeHex(0, 0),
        makeHex(1, 0, TerrainType.Clear, 1),
        makeHex(2, 0),
      ]),
      { q: 0, r: 0 },
      { q: 2, r: 0 },
      { horizontalCoverEligible: false },
    );

    expect(cover).toMatchObject({
      partialCover: false,
      modifier: 0,
    });
  });

  it('keeps target-hex terrain cover when the target hex already grants it', () => {
    const cover = getTargetCoverInfo(
      gridWith([
        makeHex(0, 0),
        makeHex(1, 0, TerrainType.Clear, 1),
        makeHex(2, 0, TerrainType.Water),
      ]),
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    );

    expect(cover).toMatchObject({
      terrain: TerrainType.Water,
      partialCover: true,
      modifier: 1,
      reason: 'Target in water partial cover (+1)',
    });
  });

  it('keeps target-hex woods as target terrain instead of true partial cover', () => {
    const cover = getTargetCoverInfo(
      gridWith([
        makeHex(0, 0),
        makeHex(1, 0),
        makeHex(2, 0, TerrainType.LightWoods),
      ]),
      { q: 0, r: 0 },
      { q: 2, r: 0 },
    );

    expect(cover).toMatchObject({
      coverLevel: CoverLevel.None,
      partialCover: false,
      modifier: 0,
    });
  });
});

describe('horizontal-cover unit eligibility', () => {
  it('treats BattleMech-style units as horizontal-cover and water-cover eligible', () => {
    expect(
      gameUnitUsesMekHorizontalCover({ unitType: UnitType.BATTLEMECH }),
    ).toBe(true);
    expect(gameUnitUsesMekWaterCover({ unitType: UnitType.BATTLEMECH })).toBe(
      true,
    );
    expect(
      gameUnitUsesMekHorizontalCover({ unitType: UnitType.OMNIMECH }),
    ).toBe(true);
    expect(gameUnitUsesMekHorizontalCover({ unitType: undefined })).toBe(true);
    expect(gameUnitUsesMekWaterCover({ unitType: undefined })).toBe(true);
    expect(gameUnitUsesMekHorizontalCover({ unitType: UnitType.VEHICLE })).toBe(
      false,
    );
    expect(gameUnitUsesMekWaterCover({ unitType: UnitType.VEHICLE })).toBe(
      false,
    );
    expect(
      gameUnitUsesMekHorizontalCover({ unitType: UnitType.BATTLE_ARMOR }),
    ).toBe(false);
    expect(gameUnitUsesMekWaterCover({ unitType: UnitType.BATTLE_ARMOR })).toBe(
      false,
    );
  });

  it('uses token discriminants for UI-side target eligibility', () => {
    expect(tokenUsesMekHorizontalCover({ unitType: TokenUnitType.Mech })).toBe(
      true,
    );
    expect(tokenUsesMekWaterCover({ unitType: TokenUnitType.Mech })).toBe(true);
    expect(
      tokenUsesMekHorizontalCover({ unitType: TokenUnitType.Vehicle }),
    ).toBe(false);
    expect(tokenUsesMekWaterCover({ unitType: TokenUnitType.Vehicle })).toBe(
      false,
    );
  });
});
