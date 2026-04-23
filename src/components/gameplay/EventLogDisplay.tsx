/**
 * Event Log Display Component
 * Shows chronological game events with filtering.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';

import type {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
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
import {
  GamePhase,
  GameSide,
  GameEventType,
  IGameEvent,
  IEventLogFilter,
  IFormattedEvent,
} from '@/types/gameplay';

/**
 * Per `add-damage-feedback-ui` task 4.3 + 7.2: the event log needs to
 * render indented transfer-chain steps under the damage entry that
 * caused them, AND group all `DamageApplied` entries for a single
 * attack under the parent `AttackResolved` row. We extend the base
 * `IFormattedEvent` with two optional fields the row renderer uses
 * for layout:
 *
 * - `indentLevel` — 0 for the parent row, 1 for each chained transfer
 *   step. Drives left-padding + the leading `→` glyph.
 * - `transferPrefix` — short callout prepended to the text for
 *   transfer-chain rows (e.g., `"→ overflow to LT"`). Lives alongside
 *   the original text so the existing formatter output is preserved.
 *
 * These fields are local to the event log — they intentionally do not
 * bleed into `IFormattedEvent` consumers outside this file.
 */
interface IFormattedEventWithGrouping extends IFormattedEvent {
  readonly indentLevel?: 0 | 1;
  readonly transferPrefix?: string;
}

// =============================================================================
// Types
// =============================================================================

export interface EventLogDisplayProps {
  /** All game events */
  events: readonly IGameEvent[];
  /** Current filter settings */
  filter?: IEventLogFilter;
  /** Callback when filter changes */
  onFilterChange?: (filter: IEventLogFilter) => void;
  /** Is log collapsed? */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Maximum height in pixels (for scrolling) */
  maxHeight?: number;
  /**
   * Per `add-interactive-combat-core-ui` § 11.3: map of unit id →
   * short designation (e.g., "ATL-7K") so each event row can render
   * the acting unit's designation inline instead of an opaque id.
   * Optional — when omitted rows fall back to the raw unit id, and
   * events without a unit id render only phase + summary.
   */
  actorLookup?: Record<string, string>;
  /** Optional className for styling */
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get icon type for an event.
 */
function getEventIcon(type: GameEventType): IFormattedEvent['icon'] {
  switch (type) {
    case GameEventType.MovementDeclared:
    case GameEventType.MovementLocked:
    case GameEventType.FacingChanged:
      return 'movement';
    case GameEventType.AttackDeclared:
    case GameEventType.AttackLocked:
    case GameEventType.AttacksRevealed:
    case GameEventType.AttackResolved:
    // Per `add-physical-attack-phase-ui` tasks 8.1 + 8.3: physical
    // attack declaration / resolution share the "attack" icon so
    // players see a single chronologically-consistent attack trail
    // in the event log regardless of weapon vs. melee path.
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

/**
 * Get color classes for event icon.
 */
function getIconColor(icon: IFormattedEvent['icon']): string {
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

/**
 * Format an event for display.
 */
function formatEvent(event: IGameEvent): IFormattedEvent {
  const icon = getEventIcon(event.type);
  let text = '';
  let unitId: string | undefined;
  let side: GameSide | undefined;

  // Format based on event type
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
        hit: boolean;
        roll: number;
        toHitNumber: number;
        damage?: number;
        location?: string;
        attackerArc?: 'front' | 'left' | 'right' | 'rear';
      };
      unitId = payload.attackerId;
      // Per `wire-firing-arc-resolution` task 8.1: surface the computed arc
      // (front/left/right/rear) in the event log so players can see which
      // hit-location table + armor side was consulted. Fall back to an
      // empty suffix for legacy events that predate arc wiring.
      const arcSuffix = payload.attackerArc
        ? ` [${payload.attackerArc} arc]`
        : '';
      if (payload.hit) {
        text = `Attack HIT (${payload.roll} vs ${payload.toHitNumber}): ${payload.damage} damage to ${payload.location}${arcSuffix}`;
      } else {
        text = `Attack MISSED (${payload.roll} vs ${payload.toHitNumber})${arcSuffix}`;
      }
      break;
    }
    // Per `add-physical-attack-phase-ui` task 8.1: `PhysicalAttackDeclared`
    // surfaces one event-log entry per declaration so the player's log
    // trail matches the sub-panel "Declared" collapse (task 5.3).
    case GameEventType.PhysicalAttackDeclared: {
      const payload = event.payload as IPhysicalAttackDeclaredPayload;
      unitId = payload.attackerId;
      const limbSuffix = payload.limb ? ` (${payload.limb})` : '';
      text = `Physical attack declared: ${payload.attackType}${limbSuffix} vs ${payload.targetId}, TN ${payload.toHitNumber}+`;
      break;
    }
    // Per `add-physical-attack-phase-ui` tasks 8.1 + 8.3: a
    // `PhysicalAttackResolved` event produces one log row per attack
    // (hit / miss + location + damage + any self-damage). `UnitFell`
    // is emitted separately by the engine and rendered via its own
    // default branch — we don't re-derive falls here (task 8.3).
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
      // Reuse the canonical damage-feedback formatter so the event log,
      // action panel, and post-battle screens emit identical wording.
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
      // Canonical critical-hit wording (⚠ glyph + component) shared
      // with the action panel and post-battle screens.
      text = formatCriticalEntry(payload, (id) => id);
      break;
    }
    case GameEventType.UnitDestroyed: {
      const payload = event.payload as IUnitDestroyedPayload;
      unitId = payload.unitId;
      // Canonical destruction wording (✕ glyph + cause).
      text = formatUnitDestroyedEntry(payload, (id) => id);
      break;
    }
    case GameEventType.PilotHit: {
      const payload = event.payload as IPilotHitPayload;
      unitId = payload.unitId;
      // Canonical pilot-hit wording (⚠/✕ + wound count).
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

/**
 * Filter events based on criteria.
 */
function filterEvents(
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

/**
 * Per `add-damage-feedback-ui` task 4.3 + 7.2: decorate formatted
 * events with indent + transfer-prefix metadata so the event log
 * renders a transfer chain nested under the damage entry that caused
 * it, AND nests every per-weapon `DamageApplied` under the parent
 * `AttackResolved` row that produced the cluster.
 *
 * Walks the chronological stream once (oldest-first) and tags the
 * second-and-later `DamageApplied` / `CriticalHitResolved` /
 * `PilotHit` entries that share an `attackId` with an earlier event.
 * The FIRST entry in a chain stays at `indentLevel: 0` (parent row);
 * all follow-ups get `indentLevel: 1` + a short `transferPrefix`
 * describing the step.
 */
function annotateGroupedEvents(
  events: readonly IGameEvent[],
  formatted: readonly IFormattedEvent[],
): readonly IFormattedEventWithGrouping[] {
  // Track whether an attackId has already produced a parent row. The
  // "parent" is either the `AttackResolved` itself, OR — for orphan
  // damage streams lacking a parent AttackResolved — the very first
  // `DamageApplied` we see for that attackId.
  const seenParent = new Map<string, boolean>();
  const lastDamageLocation = new Map<string, string>();

  const result: IFormattedEventWithGrouping[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const fmt = formatted[i];
    const base: IFormattedEventWithGrouping = fmt;

    // Parent declaration for cluster attacks → future DamageApplied
    // entries sharing this attackId will nest under it.
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
        // First hit in this attackId with no upstream AttackResolved —
        // keep it as the parent row (level 0) and mark the attack as
        // seen so siblings nest under it.
        seenParent.set(attackId, true);
        lastDamageLocation.set(attackId, payload.location);
        result.push(base);
        continue;
      }
      // Sibling hit — nest under the parent. If a prior
      // DamageApplied in the same attack already landed, call this
      // out as a transfer step (armor → structure overflow or
      // location→location overflow).
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
      // These events don't carry attackId today. Keep them flat but
      // nest behind the most recent in-progress attack if one is
      // open. We approximate this by checking if the immediately
      // preceding event is part of an attack chain. Cheaper than
      // threading attackId through every crit payload.
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

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Per `add-interactive-combat-core-ui` § 11.3: short phase label
 * shown next to each event row. We title-case the enum and collapse
 * multi-word phases (e.g., `weapon_attack` → "Weapon Attack") so the
 * inline chip stays legible at the default 13–14px event log font.
 */
function getPhaseLabel(phase: GamePhase): string {
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
      // Defensive branch — if a new GamePhase enum member is added
      // upstream we still render something readable instead of
      // blowing up at runtime.
      const raw = String(phase);
      return raw.replace(/_/g, ' ');
    }
  }
}

interface EventRowProps {
  event: IFormattedEventWithGrouping;
  actorLookup?: Record<string, string>;
}

function EventRow({ event, actorLookup }: EventRowProps): React.ReactElement {
  const iconColor = getIconColor(event.icon);
  // § 11.3: actor resolves to the unit's short designation when we
  // have one; falls back to the raw id so nothing disappears. Events
  // without an attached unit id render no actor column at all.
  const actor = event.unitId
    ? (actorLookup?.[event.unitId] ?? event.unitId)
    : undefined;

  // Per `add-damage-feedback-ui` task 4.3 + 7.2: transfer-chain / child
  // entries render at `indentLevel: 1` with a left pad + a subdued
  // text treatment so the parent→child relationship reads at a glance
  // in the dense event log. Level 0 rows render unchanged.
  const isNested = event.indentLevel === 1;

  return (
    <div
      className={`flex items-start gap-2 px-2 py-1 text-sm hover:bg-gray-50 ${
        isNested ? 'pl-8 text-gray-600 italic' : ''
      }`}
      data-testid="event-row"
      data-event-id={event.id}
      data-indent-level={event.indentLevel ?? 0}
    >
      <span
        className={`${iconColor} w-4 font-bold`}
        data-testid="event-icon"
        data-icon-type={event.icon}
      >
        {event.icon === 'movement' && '→'}
        {event.icon === 'attack' && '⚔'}
        {event.icon === 'damage' && '💥'}
        {event.icon === 'heat' && '🔥'}
        {event.icon === 'critical' && '⚠'}
        {event.icon === 'phase' && '◆'}
        {event.icon === 'status' && '•'}
      </span>
      <span className="w-8 text-xs text-gray-500" data-testid="event-turn">
        T{event.turn}
      </span>
      <span
        className="w-12 rounded bg-gray-100 px-1 text-center text-[10px] font-semibold tracking-wide text-gray-600 uppercase"
        data-testid="event-phase"
        data-phase={event.phase}
      >
        {getPhaseLabel(event.phase)}
      </span>
      {actor && (
        <span
          className="w-20 truncate text-xs font-medium text-gray-700"
          data-testid="event-actor"
          data-unit-id={event.unitId}
          title={actor}
        >
          {actor}
        </span>
      )}
      <span className="flex-1" data-testid="event-text">
        {event.transferPrefix && (
          <span
            className="mr-1 text-gray-500"
            data-testid="event-transfer-prefix"
          >
            {event.transferPrefix}
          </span>
        )}
        {event.text}
      </span>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Event log display with filtering and collapse.
 */
export function EventLogDisplay({
  events,
  filter = {},
  onFilterChange: _onFilterChange,
  collapsed = false,
  onCollapsedChange,
  maxHeight = 200,
  actorLookup,
  className = '',
}: EventLogDisplayProps): React.ReactElement {
  const [localCollapsed, setLocalCollapsed] = useState(collapsed);
  const isCollapsed = onCollapsedChange ? collapsed : localCollapsed;

  const toggleCollapse = useCallback(() => {
    if (onCollapsedChange) {
      onCollapsedChange(!isCollapsed);
    } else {
      setLocalCollapsed(!isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  // Filter and format events. We annotate BEFORE reversing so the
  // grouping walk (which needs chronological order to know which
  // entry is the "parent" for an attackId) sees events oldest-first.
  // After annotation we reverse for display (newest-first).
  const formattedEvents = useMemo<
    readonly IFormattedEventWithGrouping[]
  >(() => {
    const filtered = filterEvents(events, filter);
    const formatted = filtered.map(formatEvent);
    const grouped = annotateGroupedEvents(filtered, formatted);
    return [...grouped].reverse();
  }, [events, filter]);

  return (
    <div
      className={`border-t border-gray-300 bg-white ${className}`}
      data-testid="event-log"
    >
      {/* Header */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-2 transition-colors hover:bg-gray-100"
        data-testid="event-log-toggle"
      >
        <span className="text-sm font-medium" data-testid="event-log-count">
          Event Log ({events.length})
        </span>
        <span className="text-gray-500">{isCollapsed ? '▼' : '▲'}</span>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div
          className="overflow-y-auto border-t border-gray-200"
          style={{ maxHeight }}
          data-testid="event-log-content"
        >
          {formattedEvents.length === 0 ? (
            <div
              className="p-4 text-center text-sm text-gray-500"
              data-testid="event-log-empty"
            >
              No events yet
            </div>
          ) : (
            formattedEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                actorLookup={actorLookup}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default EventLogDisplay;
