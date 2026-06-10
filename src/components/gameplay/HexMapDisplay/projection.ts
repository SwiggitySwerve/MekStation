import type {
  IHexCoordinate,
  IHexTerrain,
  ITerrainFeature,
  IUnitToken,
  MapIsometricRotationStep,
  MapProjectionMode,
} from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';

/**
 * SVG transform applied to the whole render layer. Rules and hit targets stay
 * axial/top-down; this only changes the visual presentation.
 */
export function getMapProjectionTransform(
  mode: MapProjectionMode,
  rotationStep: MapIsometricRotationStep = 0,
): string | undefined {
  if (mode === 'topDown') return undefined;
  // Audit 2026-06-09 C-15: compose rotate BEFORE shear. SVG applies the
  // RIGHTMOST transform-list entry to points first, so `matrix(shear)
  // rotate(θ)` rotates the axial layout and then shears it — matching the
  // depth/occlusion model (isometricDepthKey/rotateAxialCamera), which
  // rotates hex coordinates first and projects afterwards. The previous
  // `rotate(θ) matrix(shear)` order sheared first and visibly distorted the
  // map at rotation steps 2-4 while the paint order assumed the rotated grid.
  return `matrix(1 0 0.28 0.72 0 0) rotate(${rotationStep * 60})`;
}

export function isIsometricProjection(mode: MapProjectionMode): boolean {
  return mode === 'isometric2d' || mode === 'isometricPreview';
}

/**
 * Project a top-down pixel point through the SAME transform the render
 * layer applies via `getMapProjectionTransform` (audit 2026-06-09 G:
 * camera centering must share the layer's projection math).
 *
 * SVG applies the RIGHTMOST transform-list entry first, so
 * `matrix(1 0 0.28 0.72 0 0) rotate(θ)` rotates the point by θ and
 * THEN shears it: x' = xr + 0.28·yr, y' = 0.72·yr. Top-down mode is
 * the identity. Keep this in lockstep with `getMapProjectionTransform`
 * above — they are two views of one projection.
 */
export function projectMapPoint(
  point: { readonly x: number; readonly y: number },
  mode: MapProjectionMode,
  rotationStep: MapIsometricRotationStep = 0,
): { x: number; y: number } {
  if (mode === 'topDown') return { x: point.x, y: point.y };
  // SVG rotate(θ) maps (x, y) → (x·cosθ − y·sinθ, x·sinθ + y·cosθ).
  const theta = (rotationStep * 60 * Math.PI) / 180;
  const rotatedX = point.x * Math.cos(theta) - point.y * Math.sin(theta);
  const rotatedY = point.x * Math.sin(theta) + point.y * Math.cos(theta);
  return { x: rotatedX + 0.28 * rotatedY, y: 0.72 * rotatedY };
}

export function rotateAxialCamera(
  hex: IHexCoordinate,
  rotationStep: number,
): IHexCoordinate {
  let x = hex.q;
  let z = hex.r;
  let y = -x - z;
  for (let i = 0; i < rotationStep; i++) {
    const nextX = -z;
    const nextY = -x;
    const nextZ = -y;
    x = nextX;
    y = nextY;
    z = nextZ;
  }
  return { q: x, r: z };
}

export function isometricDepthKey(
  hex: IHexCoordinate,
  terrainLookup: ReadonlyMap<string, IHexTerrain>,
  rotationStep: number,
): number {
  const rotated = rotateAxialCamera(hex, rotationStep);
  const terrain = terrainLookup.get(coordToKey(hex));
  const elevation = terrain
    ? getIsometricTerrainEffectiveHeight({
        elevation: terrain.elevation,
        terrainFeatures: terrain.features,
      })
    : 0;
  return (rotated.r * 2 + rotated.q) * 100 + elevation;
}

export interface IsometricTerrainOcclusionInfo {
  readonly unitId: string;
  readonly occluderHex: IHexCoordinate;
  readonly occluderElevation: number;
  readonly unitElevation: number;
  readonly rotationStep: number;
  readonly reason: string;
}

export interface IsometricTerrainOccluderInfo {
  readonly occluderHex: IHexCoordinate;
  readonly occluderElevation: number;
  readonly rotationStep: number;
  readonly occludedUnitIds: readonly string[];
  readonly reasons: readonly string[];
}

function displayPositionForToken(token: IUnitToken): IHexCoordinate {
  if (token.fogStatus === 'lastKnown' && token.lastKnownPosition) {
    return token.lastKnownPosition;
  }
  return token.position;
}

function formatSignedElevation(elevation: number): string {
  return elevation >= 0 ? `+${elevation}` : `${elevation}`;
}

function maxBuildingLevel(terrainFeatures: readonly ITerrainFeature[]): number {
  return Math.max(
    0,
    ...terrainFeatures
      .filter((feature) => feature.type === TerrainType.Building)
      .map((feature) => feature.level),
  );
}

export function getIsometricTerrainEffectiveHeight({
  elevation,
  terrainFeatures,
}: {
  readonly elevation: number;
  readonly terrainFeatures: readonly ITerrainFeature[];
}): number {
  return elevation + maxBuildingLevel(terrainFeatures);
}

function isTerrainInFrontOfUnit(
  unitHex: IHexCoordinate,
  terrainHex: IHexCoordinate,
  rotationStep: number,
): boolean {
  const unitRotated = rotateAxialCamera(unitHex, rotationStep);
  const terrainRotated = rotateAxialCamera(terrainHex, rotationStep);
  const unitDepth = unitRotated.r * 2 + unitRotated.q;
  const terrainDepth = terrainRotated.r * 2 + terrainRotated.q;
  const depthDelta = terrainDepth - unitDepth;
  if (depthDelta <= 0 || depthDelta > 3) return false;
  return Math.abs(terrainRotated.q - unitRotated.q) <= 1;
}

export function deriveIsometricTerrainOccludedUnitIds({
  tokens,
  terrainLookup,
  rotationStep,
}: {
  readonly tokens: readonly IUnitToken[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly rotationStep: number;
}): ReadonlySet<string> {
  return new Set(
    deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep,
    }).map((info) => info.unitId),
  );
}

export function deriveIsometricTerrainOcclusionInfo({
  tokens,
  terrainLookup,
  rotationStep,
}: {
  readonly tokens: readonly IUnitToken[];
  readonly terrainLookup: ReadonlyMap<string, IHexTerrain>;
  readonly rotationStep: number;
}): readonly IsometricTerrainOcclusionInfo[] {
  const info: IsometricTerrainOcclusionInfo[] = [];

  for (const token of tokens) {
    if (token.fogStatus === 'hidden') continue;
    const position = displayPositionForToken(token);
    const unitElevation =
      terrainLookup.get(coordToKey(position))?.elevation ?? 0;

    terrainLookup.forEach((terrain) => {
      const occluderElevation = getIsometricTerrainEffectiveHeight({
        elevation: terrain.elevation,
        terrainFeatures: terrain.features,
      });
      if (occluderElevation - unitElevation < 2) return;
      if (hexDistance(position, terrain.coordinate) > 2) return;
      if (isTerrainInFrontOfUnit(position, terrain.coordinate, rotationStep)) {
        info.push({
          unitId: token.unitId,
          occluderHex: terrain.coordinate,
          occluderElevation,
          unitElevation,
          rotationStep,
          reason: `Elevated terrain ${formatSignedElevation(occluderElevation)} at (${terrain.coordinate.q}, ${terrain.coordinate.r}) may hide unit at elevation ${formatSignedElevation(unitElevation)}`,
        });
      }
    });
  }

  return info;
}

export function deriveIsometricTerrainOccluderInfo(
  terrainOcclusionInfo: readonly IsometricTerrainOcclusionInfo[],
): ReadonlyMap<string, IsometricTerrainOccluderInfo> {
  const lookup = new Map<
    string,
    {
      occluderHex: IHexCoordinate;
      occluderElevation: number;
      rotationStep: number;
      occludedUnitIds: string[];
      reasons: string[];
    }
  >();

  for (const info of terrainOcclusionInfo) {
    const key = coordToKey(info.occluderHex);
    let occluder = lookup.get(key);
    if (!occluder) {
      occluder = {
        occluderHex: info.occluderHex,
        occluderElevation: info.occluderElevation,
        rotationStep: info.rotationStep,
        occludedUnitIds: [],
        reasons: [],
      };
      lookup.set(key, occluder);
    }
    if (!occluder.occludedUnitIds.includes(info.unitId)) {
      occluder.occludedUnitIds.push(info.unitId);
    }
    if (!occluder.reasons.includes(info.reason)) {
      occluder.reasons.push(info.reason);
    }
  }

  return new Map(
    Array.from(lookup.entries()).map(([key, value]) => [
      key,
      {
        occluderHex: value.occluderHex,
        occluderElevation: value.occluderElevation,
        rotationStep: value.rotationStep,
        occludedUnitIds: value.occludedUnitIds,
        reasons: value.reasons,
      },
    ]),
  );
}

export function deriveIsometricTerrainOcclusionInfoByUnit(
  terrainOcclusionInfo: readonly IsometricTerrainOcclusionInfo[],
): ReadonlyMap<string, readonly IsometricTerrainOcclusionInfo[]> {
  const lookup = new Map<string, IsometricTerrainOcclusionInfo[]>();

  for (const info of terrainOcclusionInfo) {
    const unitInfo = lookup.get(info.unitId) ?? [];
    unitInfo.push(info);
    lookup.set(info.unitId, unitInfo);
  }

  return new Map(
    Array.from(lookup.entries()).map(([unitId, unitInfo]) => [
      unitId,
      unitInfo,
    ]),
  );
}
