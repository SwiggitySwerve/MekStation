import React, { useEffect, useMemo, useRef } from "react";

import type { IGameEvent, IHexCoordinate, IUnitToken } from "@/types/gameplay";

import { hexToPixel } from "@/components/gameplay/HexMapDisplay/renderHelpers";
import { usePrefersReducedMotion } from "@/hooks/useReducedMotion";
import { useAnimationQueue } from "@/stores/useAnimationQueue";
import {
  GameEventType,
  type IAttackResolvedPayload,
  type IPhysicalAttackResolvedPayload,
} from "@/types/gameplay";
import {
  attackImpactDelayMs,
  resolveAttackEventEffect,
  type AttackEffectPayloadHints,
  type PhysicalAttackEffectPayload,
  type WeaponEffectDescriptor,
} from "@/utils/effects/weaponEffectMap";

import {
  AttackEffectDefs,
  AttackEffectStyles,
  ImpactFlash,
  LaserBeam,
  MissileTrail,
  ReducedMotionLine,
  Shockwave,
  Tracer,
  type EffectPoint,
} from "./primitives";

export interface AttackEffectsLayerProps {
  readonly events: readonly IGameEvent[];
  readonly tokens: readonly IUnitToken[];
  readonly mapId: string;
  readonly testId?: string;
}

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

type AttackLayerPayload = IAttackResolvedPayload &
  AttackEffectPayloadHints &
  AttackGeometryHints &
  ClusterVisualHints;

type PhysicalLayerPayload = IPhysicalAttackResolvedPayload &
  PhysicalAttackEffectPayload &
  AttackGeometryHints &
  ClusterVisualHints;

type SupportedAttackEvent =
  | {
      readonly event: IGameEvent;
      readonly payload: AttackLayerPayload;
      readonly physical: false;
    }
  | {
      readonly event: IGameEvent;
      readonly payload: PhysicalLayerPayload;
      readonly physical: true;
    };

interface AttackGeometry {
  readonly fromHex: IHexCoordinate;
  readonly toHex: IHexCoordinate;
  readonly start: EffectPoint;
  readonly target: EffectPoint;
  readonly overshoot: EffectPoint;
}

interface ProjectileBreakdown {
  readonly hitCount: number;
  readonly missCount: number;
}

const MISS_OPACITY = 0.4;
const REDUCED_MOTION_LINE_DURATION_MS = 300;
const IMPACT_FLASH_DURATION_MS = 150;
const REDUCED_MOTION_IMPACT_FLASH_MS = 80;
const HEX_DIRECTIONS: readonly IHexCoordinate[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function AttackEffectsLayer({
  events,
  tokens,
  mapId,
  testId = "attack-effects-layer",
}: AttackEffectsLayerProps): React.ReactElement {
  const reducedMotion = usePrefersReducedMotion();
  const enqueueAnimation = useAnimationQueue((state) => state.enqueue);
  const completeAnimation = useAnimationQueue((state) => state.complete);
  const queuedEventIdsRef = useRef<Set<string>>(new Set());
  const queuedAnimationIdsRef = useRef<Set<string>>(new Set());
  const completionTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const tokenById = useMemo(() => {
    const byId = new Map<string, IUnitToken>();
    for (const token of tokens) byId.set(token.unitId, token);
    return byId;
  }, [tokens]);

  const effectEvents = useMemo(
    () =>
      events
        .map(toSupportedAttackEvent)
        .filter((event): event is SupportedAttackEvent => event !== null),
    [events],
  );

  useEffect(
    () => () => {
      completionTimersRef.current.forEach((timer) => clearTimeout(timer));
      completionTimersRef.current.clear();

      queuedAnimationIdsRef.current.forEach((animationId) =>
        completeAnimation(animationId),
      );
      queuedAnimationIdsRef.current.clear();
    },
    [completeAnimation],
  );

  useEffect(() => {
    for (const entry of effectEvents) {
      if (queuedEventIdsRef.current.has(entry.event.id)) continue;

      const effect = resolveAttackEventEffect(entry.event);
      if (!effect) continue;

      const geometry = resolveGeometry(entry.payload, tokenById);
      if (!geometry) continue;

      const breakdown = projectileBreakdown(
        entry.payload,
        effect.projectileCount,
      );
      const durationMs = queuedEffectDurationMs(
        effect,
        breakdown,
        reducedMotion,
      );
      const animationId = `attack-effect:${mapId}:${entry.event.id}`;

      queuedEventIdsRef.current.add(entry.event.id);
      queuedAnimationIdsRef.current.add(animationId);
      enqueueAnimation({
        id: animationId,
        mapId,
        kind: "effect",
        eventSequence: entry.event.sequence,
      });

      const timer = setTimeout(() => {
        completionTimersRef.current.delete(animationId);
        queuedAnimationIdsRef.current.delete(animationId);
        completeAnimation(animationId);
      }, durationMs);
      completionTimersRef.current.set(animationId, timer);
    }
  }, [
    completeAnimation,
    effectEvents,
    enqueueAnimation,
    mapId,
    reducedMotion,
    tokenById,
  ]);

  return (
    <g
      pointerEvents="none"
      style={{ pointerEvents: "none" }}
      data-testid={testId}
      data-map-id={mapId}
    >
      <AttackEffectStyles />
      <AttackEffectDefs />
      {effectEvents.map((entry) =>
        renderAttackEvent(entry, tokenById, reducedMotion),
      )}
    </g>
  );
}

function toSupportedAttackEvent(
  event: IGameEvent,
): SupportedAttackEvent | null {
  if (event.type === GameEventType.AttackResolved) {
    return {
      event,
      payload: event.payload as AttackLayerPayload,
      physical: false,
    };
  }
  if (event.type === GameEventType.PhysicalAttackResolved) {
    return {
      event,
      payload: event.payload as PhysicalLayerPayload,
      physical: true,
    };
  }
  return null;
}

function renderAttackEvent(
  entry: SupportedAttackEvent,
  tokenById: ReadonlyMap<string, IUnitToken>,
  reducedMotion: boolean,
): React.ReactElement | null {
  const effect = resolveAttackEventEffect(entry.event);
  if (!effect) return null;

  const geometry = resolveGeometry(entry.payload, tokenById);
  if (!geometry) return null;

  const breakdown = projectileBreakdown(entry.payload, effect.projectileCount);
  const eventId = entry.event.id;
  const flashDelay = attackImpactDelayMs(effect, reducedMotion);
  const hasImpact = breakdown.hitCount > 0;

  return (
    <g
      key={eventId}
      pointerEvents="none"
      data-testid={`attack-effect-event-${eventId}`}
      data-event-id={eventId}
      data-category={effect.category}
      data-primitive={effect.primitive}
      data-visual-subtype={effect.visualSubtype}
      data-projectile-count={effect.projectileCount}
      data-hit-projectiles={breakdown.hitCount}
      data-miss-projectiles={breakdown.missCount}
      data-stagger-ms={effect.staggerMs}
    >
      {reducedMotion ? (
        <ReducedMotionLine
          start={geometry.start}
          end={geometry.target}
          color={effect.color}
          opacity={entry.payload.hit ? 0.7 : MISS_OPACITY}
          testId={`attack-effect-reduced-line-${eventId}`}
        />
      ) : (
        <>
          {renderPrimaryEffects({
            eventId,
            effect,
            geometry,
            hitCount: breakdown.hitCount,
            missCount: breakdown.missCount,
          })}
        </>
      )}
      {hasImpact && (
        <ImpactFlash
          center={geometry.target}
          color={effect.impactColor}
          delayMs={flashDelay}
          reducedMotion={reducedMotion}
          testId={`attack-effect-impact-flash-${eventId}`}
        />
      )}
    </g>
  );
}

function renderPrimaryEffects(params: {
  readonly eventId: string;
  readonly effect: WeaponEffectDescriptor;
  readonly geometry: AttackGeometry;
  readonly hitCount: number;
  readonly missCount: number;
}): readonly React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  if (params.effect.category === "physical") {
    elements.push(
      ...renderPhysicalEffects({
        eventId: params.eventId,
        effect: params.effect,
        geometry: params.geometry,
        hitCount: params.hitCount,
        missCount: params.missCount,
      }),
    );
    return elements;
  }

  for (let index = 0; index < params.hitCount; index++) {
    elements.push(
      renderPrimitiveInstance({
        eventId: params.eventId,
        effect: params.effect,
        geometry: params.geometry,
        end: params.geometry.target,
        opacity: 1,
        outcome: "hit",
        projectileIndex: index,
      }),
    );
  }

  for (let index = 0; index < params.missCount; index++) {
    const projectileIndex = params.hitCount + index;
    elements.push(
      renderPrimitiveInstance({
        eventId: params.eventId,
        effect: params.effect,
        geometry: params.geometry,
        end: params.geometry.overshoot,
        opacity: MISS_OPACITY,
        outcome: "miss",
        projectileIndex,
      }),
    );
  }

  return elements;
}

function queuedEffectDurationMs(
  effect: WeaponEffectDescriptor,
  breakdown: ProjectileBreakdown,
  reducedMotion: boolean,
): number {
  if (reducedMotion) {
    return Math.max(
      REDUCED_MOTION_LINE_DURATION_MS,
      breakdown.hitCount > 0 ? REDUCED_MOTION_IMPACT_FLASH_MS : 0,
    );
  }

  return (
    attackImpactDelayMs(effect, false) +
    (breakdown.hitCount > 0 ? IMPACT_FLASH_DURATION_MS : 0)
  );
}

function renderPhysicalEffects(params: {
  readonly eventId: string;
  readonly effect: WeaponEffectDescriptor;
  readonly geometry: AttackGeometry;
  readonly hitCount: number;
  readonly missCount: number;
}): readonly React.ReactElement[] {
  const elements: React.ReactElement[] = [];
  const targetCenter =
    params.hitCount > 0 ? params.geometry.target : params.geometry.overshoot;
  const outcome = params.hitCount > 0 ? "hit" : "miss";
  const opacity = params.hitCount > 0 ? 1 : MISS_OPACITY;

  if (params.effect.originShockwave) {
    elements.push(
      <Shockwave
        key={`${params.eventId}-physical-origin`}
        center={params.geometry.start}
        color={params.effect.color}
        opacity={opacity}
        durationMs={params.effect.durationMs}
        strokeWidth={params.effect.ringStrokeWidth}
        testId={`attack-effect-shockwave-${params.eventId}-origin`}
      />,
    );
  }

  elements.push(
    <Shockwave
      key={`${params.eventId}-physical-${outcome}`}
      center={targetCenter}
      color={params.effect.color}
      opacity={opacity}
      durationMs={params.effect.durationMs}
      strokeWidth={params.effect.ringStrokeWidth}
      testId={`attack-effect-shockwave-${params.eventId}-${outcome}`}
    />,
  );

  if (params.effect.showArc) {
    elements.push(
      <LaserBeam
        key={`${params.eventId}-physical-arc`}
        start={params.geometry.start}
        end={targetCenter}
        color={params.effect.color}
        opacity={opacity * 0.28}
        durationMs={params.effect.durationMs}
        testId={`attack-effect-physical-arc-${params.eventId}-${outcome}`}
      />,
    );
  }

  return elements;
}

function renderPrimitiveInstance(params: {
  readonly eventId: string;
  readonly effect: WeaponEffectDescriptor;
  readonly geometry: AttackGeometry;
  readonly end: EffectPoint;
  readonly opacity: number;
  readonly outcome: "hit" | "miss";
  readonly projectileIndex: number;
}): React.ReactElement {
  const testId = `attack-effect-${params.effect.primitive}-${params.eventId}-${params.outcome}-${params.projectileIndex}`;
  const key = `${params.eventId}-${params.outcome}-${params.projectileIndex}`;
  const common = {
    start: params.geometry.start,
    end: params.end,
    color: params.effect.color,
    opacity: params.opacity,
    durationMs: params.effect.durationMs,
    projectileIndex: params.projectileIndex,
    projectileCount: params.effect.projectileCount,
    staggerMs: params.effect.staggerMs,
    testId,
    reducedMotion: false,
  } as const;

  return (
    <g
      key={key}
      pointerEvents="none"
      data-testid={`attack-effect-instance-${params.eventId}-${params.outcome}-${params.projectileIndex}`}
      data-outcome={params.outcome}
      data-category={params.effect.category}
      data-primitive={params.effect.primitive}
      data-start-x={params.geometry.start.x}
      data-start-y={params.geometry.start.y}
      data-end-x={params.end.x}
      data-end-y={params.end.y}
    >
      {params.effect.primitive === "missile" && <MissileTrail {...common} />}
      {params.effect.primitive === "tracer" && <Tracer {...common} />}
      {params.effect.primitive === "laser" && <LaserBeam {...common} />}
    </g>
  );
}

function resolveGeometry(
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

function projectileBreakdown(
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

export default AttackEffectsLayer;
