/**
 * Event Log Display Component
 * Shows chronological game events with filtering.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  GamePhase,
  GameSide,
  GameEventType,
  IGameEvent,
  IEventLogFilter,
  IFormattedEvent,
} from '@/types/gameplay';

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
      const payload = event.payload as { fromPhase: GamePhase; toPhase: GamePhase };
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
      };
      unitId = payload.attackerId;
      if (payload.hit) {
        text = `Attack HIT (${payload.roll} vs ${payload.toHitNumber}): ${payload.damage} damage to ${payload.location}`;
      } else {
        text = `Attack MISSED (${payload.roll} vs ${payload.toHitNumber})`;
      }
      break;
    }
    case GameEventType.DamageApplied: {
      const payload = event.payload as {
        unitId: string;
        location: string;
        damage: number;
        locationDestroyed: boolean;
      };
      unitId = payload.unitId;
      text = `${payload.damage} damage to ${payload.location}${payload.locationDestroyed ? ' (DESTROYED)' : ''}`;
      break;
    }
    case GameEventType.HeatGenerated: {
      const payload = event.payload as { unitId: string; amount: number; newTotal: number };
      unitId = payload.unitId;
      text = `Heat +${payload.amount} (total: ${payload.newTotal})`;
      break;
    }
    case GameEventType.HeatDissipated: {
      const payload = event.payload as { unitId: string; amount: number; newTotal: number };
      unitId = payload.unitId;
      text = `Heat dissipated: ${Math.abs(payload.amount)} (total: ${payload.newTotal})`;
      break;
    }
    case GameEventType.CriticalHit: {
      const payload = event.payload as { unitId: string };
      unitId = payload.unitId;
      text = 'Critical hit!';
      break;
    }
    case GameEventType.UnitDestroyed: {
      const payload = event.payload as { unitId: string; cause: string };
      unitId = payload.unitId;
      text = `UNIT DESTROYED (${payload.cause})`;
      break;
    }
    case GameEventType.PilotHit: {
      const payload = event.payload as { unitId: string; wounds: number; totalWounds: number };
      unitId = payload.unitId;
      text = `Pilot hit: ${payload.wounds} wound(s) (${payload.totalWounds} total)`;
      break;
    }
    case GameEventType.GameEnded: {
      const payload = event.payload as { winner: GameSide | 'draw'; reason: string };
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
  filter: IEventLogFilter
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
      if (payload.unitId !== filter.unitId && payload.attackerId !== filter.unitId) {
        return false;
      }
    }
    return true;
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

interface EventRowProps {
  event: IFormattedEvent;
}

function EventRow({ event }: EventRowProps): React.ReactElement {
  const iconColor = getIconColor(event.icon);

  return (
    <div className="flex items-start gap-2 py-1 px-2 hover:bg-gray-50 text-sm">
      <span className={`${iconColor} font-bold w-4`}>
        {event.icon === 'movement' && '→'}
        {event.icon === 'attack' && '⚔'}
        {event.icon === 'damage' && '💥'}
        {event.icon === 'heat' && '🔥'}
        {event.icon === 'critical' && '⚠'}
        {event.icon === 'phase' && '◆'}
        {event.icon === 'status' && '•'}
      </span>
      <span className="text-gray-500 text-xs w-8">T{event.turn}</span>
      <span className="flex-1">{event.text}</span>
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
  onFilterChange,
  collapsed = false,
  onCollapsedChange,
  maxHeight = 200,
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

  // Filter and format events
  const formattedEvents = useMemo(() => {
    const filtered = filterEvents(events, filter);
    return filtered.map(formatEvent).reverse(); // Newest first
  }, [events, filter]);

  return (
    <div className={`bg-white border-t border-gray-300 ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-sm">Event Log ({events.length})</span>
        <span className="text-gray-500">{isCollapsed ? '▼' : '▲'}</span>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div
          className="overflow-y-auto border-t border-gray-200"
          style={{ maxHeight }}
        >
          {formattedEvents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No events yet</div>
          ) : (
            formattedEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default EventLogDisplay;
