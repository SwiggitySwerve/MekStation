/**
 * Tests for spriteSelector — resolution for every weight × archetype combo.
 *
 * Covers:
 *   - Every (4 weight × 3 archetype) combination returns a unique bundle.
 *   - `isQuad` forces quad archetype; `isLAM` forces lam archetype.
 *   - No archetype flags → humanoid (spec scenario "Missing archetype falls
 *     back to humanoid").
 *   - Explicit `chassisArchetype` wins over flags.
 *   - Weight collapse: ULTRALIGHT → light, SUPERHEAVY → assault.
 *   - Missing weightClass → medium default.
 *   - `assetUrl` always points under `/sprites/mechs/`.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 */

import type { ChassisArchetype, SpriteWeightBucket } from '@/types/gameplay';

import { WeightClass } from '@/types/enums/WeightClass';

import { ALL_SPRITE_COMBOS, selectSprite } from '../spriteSelector';

// =============================================================================
// Helpers
// =============================================================================

const WEIGHT_BY_BUCKET: Record<SpriteWeightBucket, WeightClass> = {
  light: WeightClass.LIGHT,
  medium: WeightClass.MEDIUM,
  heavy: WeightClass.HEAVY,
  assault: WeightClass.ASSAULT,
};

function inputFor(archetype: ChassisArchetype, bucket: SpriteWeightBucket) {
  return {
    weightClass: WEIGHT_BY_BUCKET[bucket],
    isQuad: archetype === 'quad',
    isLAM: archetype === 'lam',
  };
}

// =============================================================================
// Complete coverage — every weight × archetype combo
// =============================================================================

describe('selectSprite — full catalog coverage', () => {
  it('returns exactly one bundle per combination with correct spriteId', () => {
    for (const { archetype, weight } of ALL_SPRITE_COMBOS) {
      const bundle = selectSprite(inputFor(archetype, weight));
      expect(bundle.archetype).toBe(archetype);
      expect(bundle.weight).toBe(weight);
      expect(bundle.spriteId).toBe(`${archetype}-${weight}`);
    }
  });

  it('returns a unique spriteId for every combo (no collisions)', () => {
    const ids = ALL_SPRITE_COMBOS.map(
      ({ archetype, weight }) =>
        selectSprite(inputFor(archetype, weight)).spriteId,
    );
    expect(new Set(ids).size).toBe(12);
  });

  it('assetUrl lives under /sprites/mechs/ and matches spriteId', () => {
    for (const { archetype, weight } of ALL_SPRITE_COMBOS) {
      const bundle = selectSprite(inputFor(archetype, weight));
      expect(bundle.assetUrl).toBe(`/sprites/mechs/${bundle.spriteId}.svg`);
    }
  });
});

// =============================================================================
// Archetype override + fallback behavior
// =============================================================================

describe('selectSprite — archetype resolution', () => {
  it('isQuad → quad archetype', () => {
    const bundle = selectSprite({
      weightClass: WeightClass.MEDIUM,
      isQuad: true,
    });
    expect(bundle.archetype).toBe('quad');
  });

  it('isLAM → lam archetype', () => {
    const bundle = selectSprite({
      weightClass: WeightClass.HEAVY,
      isLAM: true,
    });
    expect(bundle.archetype).toBe('lam');
  });

  it('no archetype flags → humanoid fallback', () => {
    const bundle = selectSprite({ weightClass: WeightClass.LIGHT });
    expect(bundle.archetype).toBe('humanoid');
  });

  it('explicit chassisArchetype wins over flags', () => {
    const bundle = selectSprite({
      weightClass: WeightClass.MEDIUM,
      chassisArchetype: 'humanoid',
      isQuad: true,
      isLAM: true,
    });
    expect(bundle.archetype).toBe('humanoid');
  });

  it('LAM flag wins over quad when both are set (no archetype override)', () => {
    const bundle = selectSprite({
      weightClass: WeightClass.MEDIUM,
      isQuad: true,
      isLAM: true,
    });
    expect(bundle.archetype).toBe('lam');
  });
});

// =============================================================================
// Weight bucket collapse
// =============================================================================

describe('selectSprite — weight bucket collapse', () => {
  it('ULTRALIGHT → light bucket', () => {
    const bundle = selectSprite({ weightClass: WeightClass.ULTRALIGHT });
    expect(bundle.weight).toBe('light');
  });

  it('SUPERHEAVY → assault bucket', () => {
    const bundle = selectSprite({ weightClass: WeightClass.SUPERHEAVY });
    expect(bundle.weight).toBe('assault');
  });

  it('undefined weightClass → medium default', () => {
    const bundle = selectSprite({});
    expect(bundle.weight).toBe('medium');
    expect(bundle.archetype).toBe('humanoid');
    expect(bundle.spriteId).toBe('humanoid-medium');
  });
});

// =============================================================================
// Viewbox / anchor contract
// =============================================================================

describe('selectSprite — metadata contract', () => {
  it('viewBox is "0 0 200 200" for every sprite', () => {
    for (const { archetype, weight } of ALL_SPRITE_COMBOS) {
      const bundle = selectSprite(inputFor(archetype, weight));
      expect(bundle.viewBox).toBe('0 0 200 200');
    }
  });

  it('anchor is centered at (100, 100)', () => {
    const bundle = selectSprite({ weightClass: WeightClass.MEDIUM });
    expect(bundle.anchor).toEqual({ x: 100, y: 100 });
  });
});
