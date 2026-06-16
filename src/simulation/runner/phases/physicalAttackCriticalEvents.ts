import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import { createGameEvent } from './utils';

export function emitPhysicalCriticalEvents(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId?: string;
  targetId: string;
  critEvents: readonly CriticalHitEvent[];
  targetPilotingSkill?: number;
}): void {
  const {
    attackerId,
    critEvents,
    events,
    gameId,
    targetId,
    targetPilotingSkill,
    turn,
  } = options;
  const actorId = attackerId ?? targetId;

  for (const event of critEvents) {
    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHit,
          turn,
          GamePhase.PhysicalAttack,
          {
            unitId: targetId,
            location: payload.location,
            sourceUnitId: actorId,
            component: payload.componentType,
            count: 1,
          },
          actorId,
        ),
      );
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.CriticalHitResolved,
          turn,
          GamePhase.PhysicalAttack,
          {
            unitId: payload.unitId,
            location: payload.location,
            slotIndex: payload.slotIndex,
            componentType: payload.componentType,
            componentName: payload.componentName,
            ...(payload.ammoBinId !== undefined
              ? { ammoBinId: payload.ammoBinId }
              : {}),
            effect: payload.effect,
            destroyed: payload.destroyed,
            ...(payload.missing !== undefined
              ? { missing: payload.missing }
              : {}),
            ...(payload.breached !== undefined
              ? { breached: payload.breached }
              : {}),
            ...(payload.edgePointsRemaining !== undefined
              ? { edgePointsRemaining: payload.edgePointsRemaining }
              : {}),
          },
          actorId,
        ),
      );

      if (payload.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.ComponentDestroyed,
            turn,
            GamePhase.PhysicalAttack,
            {
              unitId: payload.unitId,
              location: payload.location,
              componentType: payload.componentType,
              slotIndex: payload.slotIndex,
              componentName: payload.componentName,
              ...(payload.ammoBinId !== undefined
                ? { ammoBinId: payload.ammoBinId }
                : {}),
            },
            actorId,
          ),
        );
      }
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PSRTriggered,
          turn,
          GamePhase.PhysicalAttack,
          {
            unitId: payload.unitId,
            reason: payload.reason,
            additionalModifier: payload.additionalModifier,
            triggerSource: payload.triggerSource,
            ...(targetPilotingSkill !== undefined
              ? { basePilotingSkill: targetPilotingSkill }
              : {}),
            ...(payload.reasonCode !== undefined
              ? { reasonCode: payload.reasonCode }
              : {}),
          },
          actorId,
        ),
      );
      continue;
    }

    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.PilotHit,
          turn,
          GamePhase.PhysicalAttack,
          {
            unitId: payload.unitId,
            wounds: payload.wounds,
            totalWounds: payload.totalWounds,
            source: payload.source,
            consciousnessCheckRequired: payload.consciousnessCheckRequired,
            consciousnessCheckPassed: payload.consciousnessCheckPassed,
            ...(payload.edgeReroll !== undefined
              ? { edgeReroll: payload.edgeReroll }
              : {}),
            ...(payload.edgeSuperseded !== undefined
              ? { edgeSuperseded: payload.edgeSuperseded }
              : {}),
            ...(payload.edgeTrigger !== undefined
              ? { edgeTrigger: payload.edgeTrigger }
              : {}),
            ...(payload.edgePointsRemaining !== undefined
              ? { edgePointsRemaining: payload.edgePointsRemaining }
              : {}),
          },
          actorId,
        ),
      );
    }
  }
}
