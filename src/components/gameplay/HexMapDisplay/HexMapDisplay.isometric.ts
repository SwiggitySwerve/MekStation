import type { IHexCoordinate, IHexTerrain, IUnitToken } from '@/types/gameplay';

import { HEX_COLORS } from '@/constants/hexMap';
import { TERRAIN_COLORS, WATER_DEPTH_COLORS } from '@/constants/terrain';
import { TerrainType } from '@/types/gameplay';
import { coordToKey } from '@/utils/gameplay/hexMath';

import {
  buildIsometricExtrusionFacePoints,
  getCameraFacingExtrusionFaces,
  ISOMETRIC_ELEVATION_UNIT,
  type IsometricExtrusionFace,
} from './HexMapDisplay.isometricGeometry';
import {
  getIsometricTerrainEffectiveHeight,
  isometricDepthKey,
} from './projection';
import { getPrimaryTerrainFeature, hexToPixel } from './renderHelpers';

export { getCameraFacingExtrusionFaces, ISOMETRIC_ELEVATION_UNIT };

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
      readonly kind: 'hexExtrusionFace';
      readonly key: string;
      readonly depthKey: number;
      readonly ownerHex: IHexCoordinate;
      readonly face: IsometricExtrusionFace;
      readonly points: string;
      readonly fill: string;
      readonly elevationHeight: number;
      readonly effectiveHeight: number;
      readonly terrainElevation: number;
      readonly rotationStep: number;
    }
  | {
      readonly kind: 'token';
      readonly key: string;
      readonly depthKey: number;
      readonly token: IUnitToken;
      readonly foregroundBoost: boolean;
    };

function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const r = trimmed.charAt(1);
    const g = trimmed.charAt(2);
    const b = trimmed.charAt(3);
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function darkenHexColor(color: string, shade: number): string {
  const normalized = normalizeHexColor(color) ?? HEX_COLORS.hexFill;
  const hex = normalized.slice(1);
  const channels = [0, 2, 4].map((offset) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(parseInt(hex.slice(offset, offset + 2), 16) * shade),
      ),
    ),
  );
  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function getTerrainBaseColor(terrain: IHexTerrain | undefined): string {
  const primaryTerrain = getPrimaryTerrainFeature(terrain);
  if (!primaryTerrain) return HEX_COLORS.hexFill;
  if (primaryTerrain.type === TerrainType.Water) {
    return (
      WATER_DEPTH_COLORS[Math.min(primaryTerrain.level, 3)] ??
      WATER_DEPTH_COLORS[1]
    );
  }
  return TERRAIN_COLORS[primaryTerrain.type] ?? HEX_COLORS.hexFill;
}

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
    const terrain = terrainLookup.get(coordToKey(hex));
    const effectiveHeight = terrain
      ? getIsometricTerrainEffectiveHeight({
          elevation: terrain.elevation,
          terrainFeatures: terrain.features,
        })
      : 0;
    const hexDepthKey =
      isometricDepthKey(hex, terrainLookup, rotationStep) *
      ISOMETRIC_DEPTH_SCALE;
    if (effectiveHeight > 0) {
      const center = hexToPixel(hex);
      const terrainBaseColor = getTerrainBaseColor(terrain);
      const faces = getCameraFacingExtrusionFaces(rotationStep);
      faces.forEach((face, faceIndex) => {
        items.push({
          kind: 'hexExtrusionFace',
          key: `hex-extrusion-${coordToKey(hex)}-${face.id}`,
          depthKey: hexDepthKey - (faces.length - faceIndex),
          ownerHex: hex,
          face,
          points: buildIsometricExtrusionFacePoints({
            ...center,
            face,
            height: effectiveHeight * ISOMETRIC_ELEVATION_UNIT,
          }),
          fill: darkenHexColor(terrainBaseColor, face.shade),
          elevationHeight: effectiveHeight * ISOMETRIC_ELEVATION_UNIT,
          effectiveHeight,
          terrainElevation: terrain?.elevation ?? 0,
          rotationStep,
        });
      });
    }
    items.push({
      kind: 'hex',
      key: `hex-${coordToKey(hex)}`,
      depthKey: hexDepthKey,
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
