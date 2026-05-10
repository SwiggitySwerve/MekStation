import React from 'react';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { GameEventType } from '@/types/gameplay';
import {
  attackImpactDelayMs,
  type WeaponEffectDescriptor,
} from '@/utils/effects/weaponEffectMap';

import {
  projectileBreakdown,
  resolveGeometry,
  type AttackGeometry,
  type AttackLayerPayload,
  type PhysicalLayerPayload,
  type ProjectileBreakdown,
} from './AttackEffectsLayer.geometry';
import {
  ImpactFlash,
  LaserBeam,
  MissileTrail,
  ReducedMotionLine,
  Shockwave,
  Tracer,
  type EffectPoint,
} from './primitives';

export { projectileBreakdown, resolveGeometry };

export type SupportedAttackEvent =
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

const MISS_OPACITY = 0.4;
const REDUCED_MOTION_LINE_DURATION_MS = 300;
const IMPACT_FLASH_DURATION_MS = 150;
const REDUCED_MOTION_IMPACT_FLASH_MS = 80;

export function toSupportedAttackEvent(
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

export function renderAttackEvent(
  entry: SupportedAttackEvent,
  tokenById: ReadonlyMap<string, IUnitToken>,
  reducedMotion: boolean,
  effect: WeaponEffectDescriptor | null,
): React.ReactElement | null {
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
  if (params.effect.category === 'physical') {
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
        outcome: 'hit',
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
        outcome: 'miss',
        projectileIndex,
      }),
    );
  }

  return elements;
}

export function queuedEffectDurationMs(
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
  const outcome = params.hitCount > 0 ? 'hit' : 'miss';
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
  readonly outcome: 'hit' | 'miss';
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
      {params.effect.primitive === 'missile' && <MissileTrail {...common} />}
      {params.effect.primitive === 'tracer' && <Tracer {...common} />}
      {params.effect.primitive === 'laser' && <LaserBeam {...common} />}
    </g>
  );
}
