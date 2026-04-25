/**
 * Sprite selector — resolves the correct silhouette for a given unit.
 *
 * Decision flow:
 *   1. Archetype comes from (in priority order):
 *        explicit `token.chassisArchetype`
 *        →  `token.isLAM` → 'lam'
 *        →  `token.isQuad` → 'quad'
 *        →  default 'humanoid' (Scenario: Missing archetype falls back to humanoid)
 *   2. Weight bucket comes from `token.weightClass` via `weightClassToBucket`.
 *   3. Sprite bundle is assembled from the (archetype, weight) key and returned.
 *
 * Why on a token-shaped input: the render layer already works off `IUnitToken`,
 * so threading a full construction-domain `Unit` through would pull unrelated
 * types into the presentation layer. This keeps the sprite selector dependency
 * set tiny.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Homemade Silhouette Sprite Catalog
 */

import type { IUnitToken } from '@/types/gameplay';
import type {
  ChassisArchetype,
  ISpriteBundle,
  SpriteWeightBucket,
} from '@/types/gameplay';

import { weightClassToBucket } from '@/types/gameplay';
import { spriteId } from '@/utils/sprites/spriteCatalog';
import {
  SPRITE_ANCHOR_X,
  SPRITE_ANCHOR_Y,
  SPRITE_VIEWBOX,
} from '@/utils/sprites/spriteCatalog';

/**
 * Token-shape subset that feeds the selector. Accepting a wide `Pick`
 * (instead of the full `IUnitToken`) keeps tests lightweight — callers
 * only need to construct the four fields that matter here.
 */
export type SpriteSelectorInput = Pick<
  IUnitToken,
  'weightClass' | 'chassisArchetype' | 'isQuad' | 'isLAM'
>;

/**
 * Derive the archetype, honouring explicit override first, then LAM, then
 * quad, then humanoid.
 *
 * @why Explicit override wins so callers that already know the archetype
 *      can skip the `isQuad`/`isLAM` plumbing. The LAM-before-quad order
 *      matters because a hypothetical quad-LAM isn't in the spec — but if
 *      both flags land truthy we treat LAM as the stronger signal (LAMs
 *      transform; quadhood rarely co-exists with it in canon anyway).
 */
function resolveArchetype(input: SpriteSelectorInput): ChassisArchetype {
  if (input.chassisArchetype) return input.chassisArchetype;
  if (input.isLAM) return 'lam';
  if (input.isQuad) return 'quad';
  return 'humanoid';
}

/**
 * Resolve the sprite bundle for a token.
 *
 * The returned `assetUrl` points to the real file under
 * `public/sprites/mechs/` so URL-based consumers (future Storybook art
 * reviews, CDN workflows) keep working. The runtime React renderer uses
 * the inline SVG from `spriteCatalog`, but the URL is stable contract.
 */
export function selectSprite(input: SpriteSelectorInput): ISpriteBundle {
  const archetype = resolveArchetype(input);
  const weight: SpriteWeightBucket = weightClassToBucket(input.weightClass);
  const id = spriteId(archetype, weight);
  return {
    spriteId: id,
    assetUrl: `/sprites/mechs/${id}.svg`,
    viewBox: SPRITE_VIEWBOX,
    anchor: { x: SPRITE_ANCHOR_X, y: SPRITE_ANCHOR_Y },
    weight,
    archetype,
  };
}

/**
 * Enumerate every (archetype × weight) combination the catalog covers.
 * Used by tests to assert 100% coverage and by Storybook art reviews to
 * render the full matrix.
 */
export const ALL_SPRITE_COMBOS: ReadonlyArray<{
  archetype: ChassisArchetype;
  weight: SpriteWeightBucket;
}> = Object.freeze([
  { archetype: 'humanoid', weight: 'light' },
  { archetype: 'humanoid', weight: 'medium' },
  { archetype: 'humanoid', weight: 'heavy' },
  { archetype: 'humanoid', weight: 'assault' },
  { archetype: 'quad', weight: 'light' },
  { archetype: 'quad', weight: 'medium' },
  { archetype: 'quad', weight: 'heavy' },
  { archetype: 'quad', weight: 'assault' },
  { archetype: 'lam', weight: 'light' },
  { archetype: 'lam', weight: 'medium' },
  { archetype: 'lam', weight: 'heavy' },
  { archetype: 'lam', weight: 'assault' },
]);
