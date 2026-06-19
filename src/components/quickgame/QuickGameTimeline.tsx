/**
 * Quick Game Timeline Component
 * Displays events from the current quick game session.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { Card } from '@/components/ui';
import { useQuickGameSelector } from '@/stores/useQuickGameStore';
import { GameEventType, GamePhase } from '@/types/gameplay';

// =============================================================================
// Event Display Helpers
// =============================================================================

const EVENT_LABELS: Partial<Record<GameEventType, string>> = {
  [GameEventType.GameCreated]: 'Game Created',
  [GameEventType.GameStarted]: 'Game Started',
  [GameEventType.GameEnded]: 'Game Ended',
  [GameEventType.TurnStarted]: 'Turn Started',
  [GameEventType.TurnEnded]: 'Turn Ended',
  [GameEventType.PhaseChanged]: 'Phase Changed',
  [GameEventType.InitiativeRolled]: 'Initiative Rolled',
  [GameEventType.MovementDeclared]: 'Movement',
  [GameEventType.AttackDeclared]: 'Attack Declared',
  [GameEventType.AMSInterception]: 'AMS Interception',
  [GameEventType.DesignatorMarkerApplied]: 'Designator Marker',
  [GameEventType.AttackResolved]: 'Attack Resolved',
  [GameEventType.DamageApplied]: 'Damage Applied',
  [GameEventType.UnitDestroyed]: 'Unit Destroyed',
  [GameEventType.CriticalHit]: 'Critical Hit',
};

const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.Initiative]: 'Initiative',
  [GamePhase.Movement]: 'Movement',
  [GamePhase.WeaponAttack]: 'Weapon Attack',
  [GamePhase.PhysicalAttack]: 'Physical Attack',
  [GamePhase.Heat]: 'Heat',
  [GamePhase.End]: 'End',
};

const CYAN_EVENT_TYPES = new Set<GameEventType>([
  GameEventType.GameStarted,
  GameEventType.GameEnded,
]);

const AMBER_EVENT_TYPES = new Set<GameEventType>([
  GameEventType.TurnStarted,
  GameEventType.TurnEnded,
]);

const RED_EVENT_TYPES = new Set<GameEventType>([
  GameEventType.AttackResolved,
  GameEventType.AMSInterception,
  GameEventType.DesignatorMarkerApplied,
  GameEventType.DamageApplied,
]);

function getEventColor(type: GameEventType): string {
  if (CYAN_EVENT_TYPES.has(type)) return 'bg-cyan-500';
  if (AMBER_EVENT_TYPES.has(type)) return 'bg-amber-500';
  if (RED_EVENT_TYPES.has(type)) return 'bg-red-500';
  if (type === GameEventType.UnitDestroyed) return 'bg-red-700';
  if (type === GameEventType.CriticalHit) return 'bg-orange-500';
  return 'bg-gray-500';
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// =============================================================================
// Main Component
// =============================================================================

export function QuickGameTimeline(): React.ReactElement {
  const game = useQuickGameSelector((state) => state.game);

  if (!game) {
    return (
      <div className="p-4 text-center text-gray-400">No game in progress</div>
    );
  }

  const events = game.events;

  if (events.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-gray-400">No events recorded yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Session Timeline</h3>
        <span className="text-sm text-gray-400">{events.length} events</span>
      </div>

      <Card>
        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-gray-700">
            {events.map((event, _index) => (
              <div
                key={event.id}
                className="p-3 transition-colors hover:bg-gray-800/50"
              >
                <div className="flex items-start gap-3">
                  {/* Event indicator */}
                  <div
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getEventColor(event.type)}`}
                  />

                  {/* Event content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {EVENT_LABELS[event.type] ?? event.type}
                      </p>
                      <span className="flex-shrink-0 text-xs text-gray-500">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Turn {event.turn}
                      </span>
                      <span className="text-xs text-gray-600">|</span>
                      <span className="text-xs text-gray-400">
                        {PHASE_LABELS[event.phase]}
                      </span>
                      {event.actorId && (
                        <>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="truncate text-xs text-cyan-400">
                            {event.actorId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sequence number */}
                  <span className="flex-shrink-0 text-xs text-gray-600">
                    #{event.sequence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
