import type {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IFormattedEvent,
  IGameEvent,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import {
  formatCriticalEntry,
  formatDamageEntry,
  formatPilotHitEntry,
  formatUnitDestroyedEntry,
  humanLocation,
} from '@/components/gameplay/damageFeedback';
import { formatRuntimeMovementStateChangedEvent } from '@/components/gameplay/EventLogDisplay.runtimeMovement';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IEventLogFilter,
} from '@/types/gameplay';

export interface IFormattedEventWithGrouping extends IFormattedEvent {
  readonly indentLevel?: 0 | 1;
  readonly transferPrefix?: string;
}

export function getEventIcon(type: GameEventType): IFormattedEvent['icon'] {
  switch (type) {
    case GameEventType.MovementDeclared:
    case GameEventType.MovementInvalid:
    case GameEventType.MovementLocked:
    case GameEventType.FacingChanged:
    case GameEventType.RuntimeMovementStateChanged:
      return 'movement';
    case GameEventType.AttackDeclared:
    case GameEventType.AttackLocked:
    case GameEventType.AttacksRevealed:
    case GameEventType.AttackResolved:
    case GameEventType.PhysicalAttackDeclared:
    case GameEventType.PhysicalAttackResolved:
      return 'attack';
    case GameEventType.DamageApplied:
      return 'damage';
    case GameEventType.HeatGenerated:
    case GameEventType.HeatDissipated:
    case GameEventType.HeatEffectApplied:
      return 'heat';
    case GameEventType.CriticalHit:
    case GameEventType.AmmoExplosion:
      return 'critical';
    case GameEventType.PhaseChanged:
    case GameEventType.TurnStarted:
    case GameEventType.TurnEnded:
      return 'phase';
    default:
      return 'status';
  }
}

export function getIconColor(icon: IFormattedEvent['icon']): string {
  switch (icon) {
    case 'movement':
      return 'text-green-600';
    case 'attack':
      return 'text-red-600';
    case 'damage':
      return 'text-orange-600';
    case 'heat':
      return 'text-yellow-600';
    case 'critical':
      return 'text-purple-600';
    case 'phase':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

export function formatEvent(
  event: IGameEvent,
  weaponLookup: Record<string, string> = {},
): IFormattedEvent {
  const icon = getEventIcon(event.type);
  let text = '';
  let unitId: string | undefined;
  let side: GameSide | undefined;

  switch (event.type) {
    case GameEventType.TurnStarted:
      text = `Turn ${event.turn} started`;
      break;
    case GameEventType.PhaseChanged: {
      const payload = event.payload as {
        fromPhase: GamePhase;
        toPhase: GamePhase;
      };
      text = `Phase: ${payload.toPhase.replace('_', ' ')}`;
      break;
    }
    case GameEventType.InitiativeRolled: {
      const payload = event.payload as {
        playerRoll: number;
        opponentRoll: number;
        winner: GameSide;
      };
      text = `Initiative: Player ${payload.playerRoll} vs Opponent ${payload.opponentRoll}. ${payload.winner} wins.`;
      break;
    }
    case GameEventType.MovementDeclared: {
      const payload = event.payload as {
        unitId: string;
        movementType: string;
        mpUsed: number;
      };
      unitId = payload.unitId;
      text = `Unit moved (${payload.movementType}, ${payload.mpUsed} MP)`;
      break;
    }
    case GameEventType.MovementInvalid: {
      const payload = event.payload as {
        unitId: string;
        reason: string;
        details?: string;
      };
      unitId = payload.unitId;
      text = `Movement blocked: ${payload.details ?? payload.reason}`;
      break;
    }
    case GameEventType.RuntimeMovementStateChanged: {
      const formatted = formatRuntimeMovementStateChangedEvent(event);
      text = formatted.text;
      unitId = formatted.unitId;
      break;
    }
    case GameEventType.AttackDeclared: {
      const payload = event.payload as {
        attackerId: string;
        targetId: string;
        weapons: readonly string[];
        toHitNumber: number;
      };
      unitId = payload.attackerId;
      text = `Attack declared: ${payload.weapons.length} weapon(s), TN ${payload.toHitNumber}`;
      break;
    }
    case GameEventType.AttackResolved: {
      const payload = event.payload as {
        attackerId: string;
        weaponId?: string;
        hit: boolean;
        roll: number;
        toHitNumber: number;
        damage?: number;
        location?: string;
        attackerArc?: 'front' | 'left' | 'right' | 'rear';
      };
      unitId = payload.attackerId;
      const weaponLabel = payload.weaponId
        ? (weaponLookup[payload.weaponId] ?? payload.weaponId)
        : 'Attack';
      const arcSuffix = payload.attackerArc
        ? ` [${payload.attackerArc} arc]`
        : '';
      if (payload.hit) {
        text = `${weaponLabel} HIT (${payload.roll} vs ${payload.toHitNumber}): ${payload.damage} damage to ${payload.location}${arcSuffix}`;
      } else {
        text = `${weaponLabel} MISSED (${payload.roll} vs ${payload.toHitNumber})${arcSuffix}`;
      }
      break;
    }
    case GameEventType.PhysicalAttackDeclared: {
      const payload = event.payload as IPhysicalAttackDeclaredPayload;
      unitId = payload.attackerId;
      const limbSuffix = payload.limb ? ` (${payload.limb})` : '';
      text = `Physical attack declared: ${payload.attackType}${limbSuffix} vs ${payload.targetId}, TN ${payload.toHitNumber}+`;
      break;
    }
    case GameEventType.PhysicalAttackResolved: {
      const payload = event.payload as IPhysicalAttackResolvedPayload;
      unitId = payload.attackerId;
      if (payload.hit) {
        const locationPart =
          payload.location && payload.damage !== undefined
            ? `: ${payload.damage} damage to ${payload.location}`
            : payload.damage !== undefined
              ? `: ${payload.damage} damage`
              : '';
        text = `Physical ${payload.attackType} HIT (${payload.roll} vs ${payload.toHitNumber})${locationPart}`;
      } else {
        text = `Physical ${payload.attackType} MISSED (${payload.roll} vs ${payload.toHitNumber})`;
      }
      break;
    }
    case GameEventType.DamageApplied: {
      const payload = event.payload as IDamageAppliedPayload;
      unitId = payload.unitId;
      text = formatDamageEntry(payload, (id) => id);
      break;
    }
    case GameEventType.HeatGenerated: {
      const payload = event.payload as {
        unitId: string;
        amount: number;
        newTotal: number;
      };
      unitId = payload.unitId;
      text = `Heat +${payload.amount} (total: ${payload.newTotal})`;
      break;
    }
    case GameEventType.HeatDissipated: {
      const payload = event.payload as {
        unitId: string;
        amount: number;
        newTotal: number;
      };
      unitId = payload.unitId;
      text = `Heat dissipated: ${Math.abs(payload.amount)} (total: ${payload.newTotal})`;
      break;
    }
    case GameEventType.CriticalHit: {
      const payload = event.payload as { unitId: string };
      unitId = payload.unitId;
      text = '⚠ Critical hit!';
      break;
    }
    case GameEventType.CriticalHitResolved: {
      const payload = event.payload as ICriticalHitResolvedPayload;
      unitId = payload.unitId;
      text = formatCriticalEntry(payload, (id) => id);
      break;
    }
    case GameEventType.UnitDestroyed: {
      const payload = event.payload as IUnitDestroyedPayload;
      unitId = payload.unitId;
      text = formatUnitDestroyedEntry(payload, (id) => id);
      break;
    }
    case GameEventType.PilotHit: {
      const payload = event.payload as IPilotHitPayload;
      unitId = payload.unitId;
      text = formatPilotHitEntry(payload, (id) => id);
      break;
    }
    case GameEventType.GameEnded: {
      const payload = event.payload as {
        winner: GameSide | 'draw';
        reason: string;
      };
      text = `Game ended: ${payload.winner === 'draw' ? 'Draw' : `${payload.winner} wins`} (${payload.reason})`;
      break;
    }
    // Wave 8 PR-K5: indirect-fire dispatch event renderers. Format-cases
    // for all 4 indirect-fire events ship together; SpotterLost is emitted
    // by PR-K6 but its formatter case lands here to avoid a churn follow-up.
    case GameEventType.IndirectFireSpotterSelected: {
      const payload = event.payload as {
        attackerId: string;
        spotterId: string;
        weaponId: string;
        toHitPenalty: number;
      };
      unitId = payload.attackerId;
      text = `Indirect fire: spotted by ${payload.spotterId} (+${payload.toHitPenalty} TN)`;
      break;
    }
    case GameEventType.IndirectFireNarcOverride: {
      const payload = event.payload as {
        attackerId: string;
        basis: 'narc' | 'inarc';
        toHitPenalty: number;
      };
      unitId = payload.attackerId;
      text = `Indirect fire: ${payload.basis} beacon override on target (+${payload.toHitPenalty} TN)`;
      break;
    }
    case GameEventType.IndirectFireForwardObserver: {
      const payload = event.payload as {
        attackerId: string;
        spotterId: string;
      };
      unitId = payload.attackerId;
      text = `Indirect fire: Forward Observer ${payload.spotterId} cancels walking penalty`;
      break;
    }
    case GameEventType.IndirectFireSpotterLost: {
      const payload = event.payload as {
        attackerId: string;
        spotterId: string;
        reason: string;
      };
      unitId = payload.attackerId;
      text = `Indirect fire: spotter ${payload.spotterId} lost — attack misses (${payload.reason})`;
      break;
    }
    default:
      text = event.type.replace(/_/g, ' ');
  }

  return {
    id: event.id,
    turn: event.turn,
    phase: event.phase,
    text,
    icon,
    side,
    unitId,
    timestamp: event.timestamp,
  };
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
        ? `→ overflow to ${humanLocation(payload.location)}`
        : `→ ${humanLocation(payload.location)}`;
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
          transferPrefix: '→ structure breach',
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
 * Tiers (high → low):
 *   critical — UnitDestroyed, AmmoExplosion, GameEnded (irreversible combat outcomes)
 *   high     — CriticalHit, CriticalHitResolved, HeatEffectApplied (pivotal mid-battle signals)
 *   normal   — AttackResolved, DamageApplied, PhysicalAttackResolved, PhaseChanged (standard combat loop)
 *   low      — MovementDeclared, MovementLocked, HeatGenerated, HeatDissipated, TurnStarted,
 *              TurnEnded, InitiativeRolled, FacingChanged (ambient bookkeeping)
 *
 * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
 *   "Feed prioritizes combat-critical events" scenario
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export function getEventPriority(event: IGameEvent): EventPriority {
  switch (event.type) {
    case GameEventType.UnitDestroyed:
    case GameEventType.AmmoExplosion:
    case GameEventType.GameEnded:
      return 'critical';
    case GameEventType.CriticalHit:
    case GameEventType.CriticalHitResolved:
    case GameEventType.HeatEffectApplied:
      return 'high';
    case GameEventType.AttackResolved:
    case GameEventType.AttackDeclared:
    case GameEventType.AttackLocked:
    case GameEventType.AttacksRevealed:
    case GameEventType.PhysicalAttackResolved:
    case GameEventType.PhysicalAttackDeclared:
    case GameEventType.DamageApplied:
    case GameEventType.PhaseChanged:
    case GameEventType.PilotHit:
      return 'normal';
    default:
      return 'low';
  }
}

export function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case GamePhase.Initiative:
      return 'Init';
    case GamePhase.Movement:
      return 'Move';
    case GamePhase.WeaponAttack:
      return 'Atk';
    case GamePhase.PhysicalAttack:
      return 'Phys';
    case GamePhase.Heat:
      return 'Heat';
    case GamePhase.End:
      return 'End';
    default: {
      const raw = String(phase);
      return raw.replace(/_/g, ' ');
    }
  }
}
