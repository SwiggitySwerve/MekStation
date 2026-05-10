import React, { useEffect, useMemo, useRef } from 'react';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { resolveAttackEventEffect } from '@/utils/effects/weaponEffectMap';

import {
  projectileBreakdown,
  queuedEffectDurationMs,
  renderAttackEvent,
  resolveGeometry,
  toSupportedAttackEvent,
  type SupportedAttackEvent,
} from './AttackEffectsLayer.helpers';
import { AttackEffectDefs, AttackEffectStyles } from './primitives';

export interface AttackEffectsLayerProps {
  readonly events: readonly IGameEvent[];
  readonly tokens: readonly IUnitToken[];
  readonly mapId: string;
  readonly testId?: string;
}

export function AttackEffectsLayer({
  events,
  tokens,
  mapId,
  testId = 'attack-effects-layer',
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
        kind: 'effect',
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
      style={{ pointerEvents: 'none' }}
      data-testid={testId}
      data-map-id={mapId}
    >
      <AttackEffectStyles />
      <AttackEffectDefs />
      {effectEvents.map((entry) =>
        renderAttackEvent(
          entry,
          tokenById,
          reducedMotion,
          resolveAttackEventEffect(entry.event),
        ),
      )}
    </g>
  );
}

export default AttackEffectsLayer;
