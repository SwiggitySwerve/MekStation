/**
 * Quick Game Timeline Component
 * Displays events from the current quick game session.
 * Simplified version - full replay integration is TODO.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { Card } from '@/components/ui';
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

function getEventColor(type: GameEventType): string {
  switch (type) {
    case GameEventType.GameStarted:
    case GameEventType.GameEnded:
      return 'bg-cyan-500';
    case GameEventType.TurnStarted:
    case GameEventType.TurnEnded:
      return 'bg-amber-500';
    case GameEventType.AttackResolved:
    case GameEventType.DamageApplied:
      return 'bg-red-500';
    case GameEventType.UnitDestroyed:
      return 'bg-red-700';
    case GameEventType.CriticalHit:
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// =============================================================================
// Main Component
// =============================================================================

export function QuickGameTimeline(): React.ReactElement {
  const { game } = useQuickGameStore();

  if (!game) {
    return (
      <div className="p-4 text-center text-gray-400">
        No game in progress
      </div>
    );
  }

  const events = game.events;

  if (events.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-gray-400 text-center">No events recorded yet</p>
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
            {events.map((event, index) => (
              <div
                key={event.id}
                className="p-3 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Event indicator */}
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getEventColor(event.type)}`}
                  />

                  {/* Event content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white truncate">
                        {EVENT_LABELS[event.type] ?? event.type}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
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
                          <span className="text-xs text-cyan-400 truncate">
                            {event.actorId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sequence number */}
                  <span className="text-xs text-gray-600 flex-shrink-0">
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
