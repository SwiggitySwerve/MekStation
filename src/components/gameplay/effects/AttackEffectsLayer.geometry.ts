import type { IHexCoordinate, IUnitToken } from '@/types/gameplay';
import type {
  IAttackResolvedPayload,
  IPhysicalAttackResolvedPayload,
} from '@/types/gameplay';
import type {
  AttackEffectPayloadHints,
  PhysicalAttackEffectPayload,
} from '@/utils/effects/weaponEffectMap';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';

import type { EffectPoint } from './primitives';

interface AttackGeometryHints {
  readonly from?: IHexCoordinate;
  readonly to?: IHexCoordinate;
  readonly origin?: IHexCoordinate;
  readonly target?: IHexCoordinate;
}

interface ClusterVisualHints {
  readonly hitProjectiles?: number;
  readonly projectilesHit?: number;
  readonly missilesHit?: number;
  readonly clusterHitCount?: number;
  readonly missedProjectiles?: number;
  readonly projectilesMissed?: number;
  readonly missilesMissed?: number;
  readonly clusterMissCount?: number;
}

export type AttackLayerPayload = IAttackResolvedPayload &
  AttackEffectPayloadHints &
  AttackGeometryHints &
  ClusterVisualHints;

export type PhysicalLayerPayload = IPhysicalAttackResolvedPayload &
  PhysicalAttackEffectPayload &
  AttackGeometryHints &
  ClusterVisualHints;

export interface AttackGeometry {
  readonly fromHex: IHexCoordinate;
  readonly toHex: IHexCoordinate;
  readonly start: EffectPoint;
  readonly target: EffectPoint;
  readonly overshoot: EffectPoint;
}

export interface ProjectileBreakdown {
  readonly hitCount: number;
  readonly missCount: number;
}

const HEX_DIRECTIONS: readonly IHexCoordinate[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function resolveGeometry(
  payload: AttackLayerPayload | PhysicalLayerPayload,
  tokenById: ReadonlyMap<string, IUnitToken>,
): AttackGeometry | null {
  const fromHex =
    payload.from ??
    payload.origin ??
    tokenById.get(payload.attackerId)?.position;
  const toHex =
    payload.to ?? payload.target ?? tokenById.get(payload.targetId)?.position;
  if (!fromHex || !toHex) return null;

  const overshootHexCoord = overshootHex(fromHex, toHex);
  return {
    fromHex,
    toHex,
    start: hexToPixel(fromHex),
    target: hexToPixel(toHex),
    overshoot: hexToPixel(overshootHexCoord),
  };
}

function overshootHex(
  from: IHexCoordinate,
  to: IHexCoordinate,
): IHexCoordinate {
  if (from.q === to.q && from.r === to.r) return to;
  const start = hexToPixel(from);
  const target = hexToPixel(to);
  const dx = target.x - start.x;
  const dy = target.y - start.y;
  let bestDirection = HEX_DIRECTIONS[0];
  let bestDot = Number.NEGATIVE_INFINITY;

  for (const direction of HEX_DIRECTIONS) {
    const point = hexToPixel(direction);
    const dot = point.x * dx + point.y * dy;
    if (dot > bestDot) {
      bestDot = dot;
      bestDirection = direction;
    }
  }

  return {
    q: to.q + bestDirection.q,
    r: to.r + bestDirection.r,
  };
}

export function projectileBreakdown(
  payload: AttackLayerPayload | PhysicalLayerPayload,
  projectileCount: number,
): ProjectileBreakdown {
  if (!payload.hit) return { hitCount: 0, missCount: projectileCount };

  const explicitHitCount = firstIntegerInRange(
    [
      payload.hitProjectiles,
      payload.projectilesHit,
      payload.missilesHit,
      payload.clusterHitCount,
    ],
    projectileCount,
  );
  const hitCount = explicitHitCount ?? projectileCount;
  const explicitMissCount = firstIntegerInRange(
    [
      payload.missedProjectiles,
      payload.projectilesMissed,
      payload.missilesMissed,
      payload.clusterMissCount,
    ],
    projectileCount,
  );
  const missCount =
    explicitMissCount ?? Math.max(0, projectileCount - hitCount);

  return {
    hitCount,
    missCount,
  };
}

function firstIntegerInRange(
  values: readonly (number | undefined)[],
  max: number,
): number | null {
  for (const value of values) {
    if (value === undefined) continue;
    if (!Number.isFinite(value)) continue;
    return Math.max(0, Math.min(max, Math.floor(value)));
  }
  return null;
}
