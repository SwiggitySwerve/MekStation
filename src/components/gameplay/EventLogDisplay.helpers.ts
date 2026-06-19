import type {
  IDamageAppliedPayload,
  IFormattedEvent,
  IGameEvent,
} from '@/types/gameplay';

import { humanLocation } from '@/components/gameplay/damageFeedback';
import {
  GameEventType,
  GamePhase,
  type IEventLogFilter,
} from '@/types/gameplay';

export {
  formatEvent,
  getEventIcon,
  getIconColor,
} from './EventLogDisplay.formatters';

export interface IFormattedEventWithGrouping extends IFormattedEvent {
  readonly indentLevel?: 0 | 1;
  readonly transferPrefix?: string;
}

export function filterEvents(
  events: readonly IGameEvent[],
  filter: IEventLogFilter,
): readonly IGameEvent[] {
  return events.filter((event) => {
    if (filter.turn !== undefined && event.turn !== filter.turn) {
      return false;
    }
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      if (!filter.eventTypes.includes(event.type)) {
        return false;
      }
    }
    if (filter.unitId) {
      const payload = event.payload as { unitId?: string; attackerId?: string };
      if (
        payload.unitId !== filter.unitId &&
        payload.attackerId !== filter.unitId
      ) {
        return false;
      }
    }
    return true;
  });
}

export function annotateGroupedEvents(
  events: readonly IGameEvent[],
  formatted: readonly IFormattedEvent[],
): readonly IFormattedEventWithGrouping[] {
  const seenParent = new Map<string, boolean>();
  const lastDamageLocation = new Map<string, string>();

  const result: IFormattedEventWithGrouping[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const fmt = formatted[i];
    const base: IFormattedEventWithGrouping = fmt;

    if (ev.type === GameEventType.AttackResolved) {
      const payload = ev.payload as {
        attackId?: string;
        attackerId?: string;
      };
      const attackId = payload.attackId ?? payload.attackerId;
      if (attackId) {
        seenParent.set(attackId, true);
      }
      result.push(base);
      continue;
    }

    if (ev.type === GameEventType.DamageApplied) {
      const payload = ev.payload as IDamageAppliedPayload;
      const attackId = payload.attackId;
      if (!attackId) {
        result.push(base);
        continue;
      }
      const hasParent = seenParent.get(attackId) === true;
      if (!hasParent) {
        seenParent.set(attackId, true);
        lastDamageLocation.set(attackId, payload.location);
        result.push(base);
        continue;
      }
      const prevLocation = lastDamageLocation.get(attackId);
      lastDamageLocation.set(attackId, payload.location);
      const transferPrefix = prevLocation
        ? `â†’ overflow to ${humanLocation(payload.location)}`
        : `â†’ ${humanLocation(payload.location)}`;
      result.push({
        ...base,
        indentLevel: 1,
        transferPrefix,
      });
      continue;
    }

    if (
      ev.type === GameEventType.CriticalHit ||
      ev.type === GameEventType.CriticalHitResolved ||
      ev.type === GameEventType.PilotHit
    ) {
      const prev = events[i - 1];
      const prevIsInAttack =
        prev &&
        (prev.type === GameEventType.DamageApplied ||
          prev.type === GameEventType.AttackResolved);
      if (prevIsInAttack) {
        result.push({
          ...base,
          indentLevel: 1,
          transferPrefix: 'â†’ structure breach',
        });
        continue;
      }
    }

    result.push(base);
  }

  return result;
}

/**
 * Returns a display priority for an event so the feed can sort or
 * badge critical rows when collapsed.
 *
 * Tiers (high â†’ low):
 *   critical â€” UnitDestroyed, AmmoExplosion, GameEnded (irreversible combat outcomes)
 *   high     â€” CriticalHit, CriticalHitResolved, HeatEffectApplied (pivotal mid-battle signals)
 *   normal   â€” AttackResolved, DamageApplied, PhysicalAttackResolved, PhaseChanged (standard combat loop)
 *   low      â€” MovementDeclared, MovementLocked, HeatGenerated, HeatDissipated, TurnStarted,
 *              TurnEnded, InitiativeRolled, FacingChanged (ambient bookkeeping)
 *
 * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
 *   "Feed prioritizes combat-critical events" scenario
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

const EVENT_PRIORITY_BY_TYPE: Partial<Record<GameEventType, EventPriority>> = {
  [GameEventType.UnitDestroyed]: 'critical',
  [GameEventType.AmmoExplosion]: 'critical',
  [GameEventType.GameEnded]: 'critical',
  [GameEventType.CriticalHit]: 'high',
  [GameEventType.CriticalHitResolved]: 'high',
  [GameEventType.HeatEffectApplied]: 'high',
  [GameEventType.AttackResolved]: 'normal',
  [GameEventType.AttackDeclared]: 'normal',
  [GameEventType.AttackLocked]: 'normal',
  [GameEventType.AttacksRevealed]: 'normal',
  [GameEventType.PhysicalAttackResolved]: 'normal',
  [GameEventType.PhysicalAttackDeclared]: 'normal',
  [GameEventType.DamageApplied]: 'normal',
  [GameEventType.PhaseChanged]: 'normal',
  [GameEventType.PilotHit]: 'normal',
};

export function getEventPriority(event: IGameEvent): EventPriority {
  return EVENT_PRIORITY_BY_TYPE[event.type] ?? 'low';
}

interface IPhaseUiLabels {
  readonly shortLabel: string;
  readonly displayName: string;
  readonly railLabel: string;
  readonly announcementLabel: string;
  readonly missingAction: string;
}

const PHASE_UI_LABELS: Partial<Record<GamePhase, IPhaseUiLabels>> = {
  [GamePhase.Initiative]: {
    shortLabel: 'Init',
    displayName: 'Initiative',
    railLabel: 'Initiative',
    announcementLabel: 'Initiative phase',
    missingAction: 'initiative roll',
  },
  [GamePhase.Movement]: {
    shortLabel: 'Move',
    displayName: 'Movement Phase',
    railLabel: 'Movement',
    announcementLabel: 'Movement phase',
    missingAction: 'movement',
  },
  [GamePhase.WeaponAttack]: {
    shortLabel: 'Atk',
    displayName: 'Weapon Attack Phase',
    railLabel: 'Weapon Attack',
    announcementLabel: 'Weapon attack phase',
    missingAction: 'weapon fire',
  },
  [GamePhase.PhysicalAttack]: {
    shortLabel: 'Phys',
    displayName: 'Physical Attack Phase',
    railLabel: 'Physical Attack',
    announcementLabel: 'Physical attack phase',
    missingAction: 'physical attack declaration',
  },
  [GamePhase.Heat]: {
    shortLabel: 'Heat',
    displayName: 'Heat Phase',
    railLabel: 'Heat',
    announcementLabel: 'Heat phase',
    missingAction: 'heat resolution',
  },
  [GamePhase.End]: {
    shortLabel: 'End',
    displayName: 'End Phase',
    railLabel: 'End',
    announcementLabel: 'End phase',
    missingAction: 'end-of-turn action',
  },
};

export function getPhaseLabel(phase: GamePhase): string {
  return PHASE_UI_LABELS[phase]?.shortLabel ?? String(phase).replace(/_/g, ' ');
}

export function getPhaseDisplayName(phase: GamePhase): string {
  return PHASE_UI_LABELS[phase]?.displayName ?? 'Unknown Phase';
}

export function getPhaseRailLabel(phase: GamePhase): string {
  return PHASE_UI_LABELS[phase]?.railLabel ?? 'Phase';
}

export function getPhaseAnnouncementLabel(phase: GamePhase): string {
  return PHASE_UI_LABELS[phase]?.announcementLabel ?? 'Phase change';
}

export function getPhaseMissingActionLabel(phase: GamePhase): string {
  return PHASE_UI_LABELS[phase]?.missingAction ?? 'action';
}
