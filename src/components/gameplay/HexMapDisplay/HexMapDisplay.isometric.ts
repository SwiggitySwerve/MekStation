import type { IHexCoordinate, IHexTerrain, IUnitToken } from '@/types/gameplay';

import { coordToKey } from '@/utils/gameplay/hexMath';

import { isometricDepthKey } from './projection';

const ISOMETRIC_TOKEN_DEPTH_OFFSET = 5;
const ISOMETRIC_DEPTH_SCALE = 10;
const ISOMETRIC_FOREGROUND_DEPTH_BOOST = 1_000_000;

export type IsometricSceneItem =
  | {
      readonly kind: 'hex';
      readonly key: string;
      readonly depthKey: number;
      readonly hex: IHexCoordinate;
    }
  | {
      readonly kind: 'token';
      readonly key: string;
      readonly depthKey: number;
      readonly token: IUnitToken;
      readonly foregroundBoost: boolean;
    };

export function buildIsometricSceneItems({
  isIsometricView,
  renderedHexes,
  tokens,
  terrainLookup,
  rotationStep,
  foregroundUnitIds,
}: {
  readonly isIsometricView: boolean;
  readonly renderedHexes: readonly IHexCoordinate[];
  readonly tokens: readonly IUnitToken[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly rotationStep: number;
  readonly foregroundUnitIds: ReadonlySet<string>;
}): readonly IsometricSceneItem[] {
  if (!isIsometricView) return [];

  const items: IsometricSceneItem[] = [];
  for (const hex of renderedHexes) {
    items.push({
      kind: 'hex',
      key: `hex-${coordToKey(hex)}`,
      depthKey:
        isometricDepthKey(hex, terrainLookup, rotationStep) *
        ISOMETRIC_DEPTH_SCALE,
      hex,
    });
  }

  for (const token of tokens) {
    const displayPosition =
      token.fogStatus === 'lastKnown' && token.lastKnownPosition
        ? token.lastKnownPosition
        : token.position;
    const foregroundBoost = foregroundUnitIds.has(token.unitId);
    const depthKey =
      isometricDepthKey(displayPosition, terrainLookup, rotationStep) *
        ISOMETRIC_DEPTH_SCALE +
      ISOMETRIC_TOKEN_DEPTH_OFFSET +
      (foregroundBoost ? ISOMETRIC_FOREGROUND_DEPTH_BOOST : 0);
    items.push({
      kind: 'token',
      key: `token-${token.unitId}`,
      depthKey,
      token,
      foregroundBoost,
    });
  }

  return items.sort((a, b) => {
    if (a.depthKey !== b.depthKey) return a.depthKey - b.depthKey;
    return a.key.localeCompare(b.key);
  });
}
