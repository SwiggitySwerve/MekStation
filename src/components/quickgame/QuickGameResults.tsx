/**
 * Quick Game Results Component
 * Displays game results with replay and play again options.
 * Features a tabbed interface for Summary, Units, Damage, and Timeline views.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { Button, Card } from '@/components/ui';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { projectUnitPerformance } from '@/utils/gameplay/combatStatistics';
import { DamageMatrix } from './DamageMatrix';
import { GameEventType, GamePhase } from '@/types/gameplay';
import type { IQuickGameUnit } from '@/types/quickgame/QuickGameInterfaces';

type ResultsTab = 'summary' | 'units' | 'damage' | 'timeline';

const RESULTS_TABS: readonly { id: ResultsTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'units', label: 'Units' },
  { id: 'damage', label: 'Damage' },
  { id: 'timeline', label: 'Timeline' },
];

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

interface ResultBannerProps {
  winner: 'player' | 'opponent' | 'draw';
  reason: string | null;
}

function ResultBanner({ winner, reason }: ResultBannerProps): React.ReactElement {
  const config = {
    player: {
      title: 'Victory!',
      color: 'from-emerald-600 to-emerald-800',
      textColor: 'text-emerald-100',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      ),
    },
    opponent: {
      title: 'Defeat',
      color: 'from-red-600 to-red-800',
      textColor: 'text-red-100',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    draw: {
      title: 'Draw',
      color: 'from-amber-600 to-amber-800',
      textColor: 'text-amber-100',
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  };

  const { title, color, textColor, icon } = config[winner];

  return (
    <div className={`bg-gradient-to-r ${color} rounded-xl p-8 text-center`}>
      <div className={`${textColor} mb-4 flex justify-center`}>{icon}</div>
      <h2 className={`text-3xl font-bold ${textColor} mb-2`}>{title}</h2>
      {reason && (
        <p className={`${textColor} opacity-80 capitalize`}>
          {reason.replace(/_/g, ' ')}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Battle Summary Component
// =============================================================================

function BattleSummary(): React.ReactElement {
  const { game } = useQuickGameStore();

  if (!game) return <></>;

  const playerUnitsDestroyed = game.playerForce.units.filter((u) => u.isDestroyed).length;
  const playerUnitsWithdrawn = game.playerForce.units.filter((u) => u.isWithdrawn).length;
  const opponentUnitsDestroyed = game.opponentForce?.units.filter((u) => u.isDestroyed).length ?? 0;

  const startTime = new Date(game.startedAt);
  const endTime = game.endedAt ? new Date(game.endedAt) : new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.floor(durationMs / 60000);

  return (
    <Card>
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-medium text-white">Battle Summary</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Losses</p>
            <p className="text-white">
              {playerUnitsDestroyed} destroyed
              {playerUnitsWithdrawn > 0 && `, ${playerUnitsWithdrawn} withdrawn`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Enemy Losses</p>
            <p className="text-white">{opponentUnitsDestroyed} destroyed</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Turns Played</p>
            <p className="text-white">{game.turn}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
            <p className="text-white">{durationMinutes} minutes</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function UnitStatusRow({ 
  unit, 
  forceType,
  events 
}: { 
  unit: IQuickGameUnit; 
  forceType: 'player' | 'opponent';
  events: readonly { type: string; turn: number; phase: GamePhase }[];
}): React.ReactElement {
  const performance = projectUnitPerformance(events as Parameters<typeof projectUnitPerformance>[0], unit.instanceId);
  
  let statusText: string;
  let statusColor: string;
  
  if (unit.isDestroyed) {
    statusText = 'Destroyed';
    statusColor = 'text-red-400';
  } else if (unit.isWithdrawn) {
    statusText = 'Withdrawn';
    statusColor = 'text-amber-400';
  } else {
    statusText = 'Survived';
    statusColor = 'text-emerald-400';
  }

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-700/50 last:border-b-0 hover:bg-gray-800/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {unit.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {unit.pilotName && (
            <span className="truncate">{unit.pilotName}</span>
          )}
          <span className={forceType === 'player' ? 'text-cyan-400' : 'text-red-400'}>
            {forceType === 'player' ? 'Player' : 'OpFor'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right text-xs text-gray-400">
          <p>{performance.damageDealt} dmg dealt</p>
          <p>{performance.kills} kills</p>
        </div>
        <span className={`font-medium ${statusColor}`}>{statusText}</span>
      </div>
    </div>
  );
}

function TimelineEventRow({ 
  event, 
  index 
}: { 
  event: { type: GameEventType; turn: number; phase: GamePhase; timestamp: string; actorId?: string };
  index: number;
}): React.ReactElement {
  const label = EVENT_LABELS[event.type] ?? event.type;
  const phaseLabel = PHASE_LABELS[event.phase];
  
  return (
    <div className="flex items-start gap-3 py-2 px-3 text-sm">
      <span className="text-gray-500 font-mono w-8 flex-shrink-0">#{index + 1}</span>
      <div className="flex-1 min-w-0">
        <span className="text-white">{label}</span>
        {event.actorId && (
          <span className="text-cyan-400 ml-2 truncate">({event.actorId})</span>
        )}
      </div>
      <div className="text-xs text-gray-400 text-right flex-shrink-0">
        <p>Turn {event.turn}</p>
        <p>{phaseLabel}</p>
      </div>
    </div>
  );
}

export function QuickGameResults(): React.ReactElement {
  const router = useRouter();
  const { game, playAgain, clearGame } = useQuickGameStore();
  const [activeTab, setActiveTab] = useState<ResultsTab>('summary');
  const tabListRef = useRef<HTMLDivElement>(null);
  
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as ResultsTab);
  }, []);

  const handleKeyDown = useTabKeyboardNavigation(RESULTS_TABS, activeTab, handleTabChange);

  if (!game) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-400">No game results to display.</p>
          <Button
            variant="primary"
            onClick={() => router.push('/gameplay/quick')}
            className="mt-4"
          >
            Start New Game
          </Button>
        </Card>
      </div>
    );
  }

  const handlePlayAgainSameUnits = () => {
    playAgain(false);
  };

  const handlePlayAgainNewUnits = () => {
    playAgain(true);
  };

  const handleExit = () => {
    clearGame();
    router.push('/gameplay/games');
  };

  const allUnits = [
    ...game.playerForce.units.map(u => ({ unit: u, forceType: 'player' as const })),
    ...(game.opponentForce?.units.map(u => ({ unit: u, forceType: 'opponent' as const })) ?? []),
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <div className="mb-6">
        <ResultBanner winner={game.winner ?? 'draw'} reason={game.victoryReason} />
      </div>

      <Card className="mb-6">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Battle results tabs"
          className="flex border-b border-gray-700"
          onKeyDown={handleKeyDown}
        >
          {RESULTS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex-1 px-4 py-3 text-sm font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
                ${activeTab === tab.id
                  ? 'text-white border-b-2 border-blue-500 bg-gray-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-summary"
          aria-labelledby="tab-summary"
          hidden={activeTab !== 'summary'}
          className="p-4"
        >
          <BattleSummary />
          
          {game.scenario && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Scenario</h4>
              <p className="text-white">{game.scenario.template.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {game.scenario.mapPreset.name} - {game.scenario.mapPreset.biome}
              </p>
            </div>
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-units"
          aria-labelledby="tab-units"
          hidden={activeTab !== 'units'}
        >
          {allUnits.length === 0 ? (
            <p className="p-4 text-gray-400 text-center">No units in this battle.</p>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {allUnits.map(({ unit, forceType }) => (
                <UnitStatusRow
                  key={unit.instanceId}
                  unit={unit}
                  forceType={forceType}
                  events={game.events}
                />
              ))}
            </div>
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-damage"
          aria-labelledby="tab-damage"
          hidden={activeTab !== 'damage'}
          className="p-4"
        >
          <DamageMatrix
            events={game.events}
            units={[...game.playerForce.units, ...(game.opponentForce?.units ?? [])]}
          />
        </div>

        <div
          role="tabpanel"
          id="tabpanel-timeline"
          aria-labelledby="tab-timeline"
          hidden={activeTab !== 'timeline'}
        >
          {game.events.length === 0 ? (
            <p className="p-4 text-gray-400 text-center">No events recorded.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-700/30">
              {game.events.map((event, index) => (
                <TimelineEventRow key={event.id} event={event} index={index} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={handlePlayAgainSameUnits}
          data-testid="play-again-same-btn"
        >
          Play Again (Same Units)
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handlePlayAgainNewUnits}
          data-testid="play-again-new-btn"
        >
          Play Again (New Force)
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleExit}
          data-testid="exit-btn"
        >
          Exit to Games
        </Button>
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        This was a quick game session. No data is persisted.
      </p>
    </div>
  );
}
