/**
 * Quick Game Review Component
 * Displays scenario summary and allows starting the game.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { Button, Card } from '@/components/ui';
import { FACTION_NAMES, Faction } from '@/constants/scenario/rats';
import { useQuickGameStore } from '@/stores/useQuickGameStore';

// =============================================================================
// Force Display Component
// =============================================================================

interface ForceDisplayProps {
  title: string;
  force: {
    name: string;
    units: readonly {
      instanceId: string;
      name: string;
      chassis: string;
      variant: string;
      bv: number;
      tonnage: number;
      gunnery: number;
      piloting: number;
      pilotName?: string;
    }[];
    totalBV: number;
    totalTonnage: number;
  };
  isOpponent?: boolean;
}

function ForceDisplay({
  title,
  force,
  isOpponent,
}: ForceDisplayProps): React.ReactElement {
  return (
    <Card className={isOpponent ? 'border-red-500/30' : 'border-cyan-500/30'}>
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h3
            className={`font-medium ${isOpponent ? 'text-red-400' : 'text-cyan-400'}`}
          >
            {title}
          </h3>
          <div className="text-sm text-gray-400">
            <span
              className={`font-medium ${isOpponent ? 'text-red-400' : 'text-cyan-400'}`}
            >
              {force.totalBV.toLocaleString()}
            </span>{' '}
            BV / {force.totalTonnage} tons
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {force.units.map((unit) => (
            <div
              key={unit.instanceId}
              className="flex items-center justify-between rounded bg-gray-800 p-2"
            >
              <div>
                <p className="text-sm text-white">{unit.name}</p>
                <p className="text-xs text-gray-500">
                  {unit.pilotName && `${unit.pilotName} - `}
                  {unit.gunnery}/{unit.piloting}
                </p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>{unit.tonnage}t</p>
                <p>{unit.bv.toLocaleString()} BV</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Modifier Display
// =============================================================================

function ModifierDisplay(): React.ReactElement {
  const { game } = useQuickGameStore();
  const modifiers = game?.scenario?.modifiers ?? [];

  if (modifiers.length === 0) {
    return (
      <Card className="bg-gray-800/50">
        <div className="p-4 text-center text-sm text-gray-500">
          No battle modifiers active
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="border-b border-gray-700 p-4">
        <h3 className="font-medium text-white">Battle Modifiers</h3>
      </div>
      <div className="space-y-2 p-4">
        {modifiers.map((modifier) => (
          <div
            key={modifier.id}
            className={`rounded p-3 ${
              modifier.effect === 'positive'
                ? 'border border-emerald-700/50 bg-emerald-900/30'
                : modifier.effect === 'negative'
                  ? 'border border-red-700/50 bg-red-900/30'
                  : 'border border-gray-700 bg-gray-800'
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded ${
                  modifier.effect === 'positive'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : modifier.effect === 'negative'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-gray-600 text-gray-400'
                }`}
              >
                {modifier.effect === 'positive' ? (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : modifier.effect === 'negative' ? (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {modifier.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {modifier.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Review Component
// =============================================================================

export function QuickGameReview(): React.ReactElement {
  const { game, previousStep, startGame, isLoading } = useQuickGameStore();

  if (!game || !game.scenario || !game.opponentForce) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-400">Scenario not generated yet.</p>
          <Button variant="secondary" onClick={previousStep} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const scenario = game.scenario;
  const faction = game.scenarioConfig.enemyFaction as Faction;

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-white">
          Review Scenario
        </h2>
        <p className="text-sm text-gray-400">
          Review the generated battle scenario before starting.
        </p>
      </div>

      {/* Scenario overview */}
      <Card className="mb-6 border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                {scenario.template.name}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {scenario.template.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Turn Limit</p>
              <p className="font-medium text-white">
                {scenario.turnLimit === 0
                  ? 'Unlimited'
                  : `${scenario.turnLimit} turns`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Map</p>
              <p className="text-white">{scenario.mapPreset.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {scenario.mapPreset.biome}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Objective</p>
              <p className="text-white capitalize">
                {scenario.template.objectiveType.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Enemy Faction</p>
              <p className="text-white">{FACTION_NAMES[faction] ?? faction}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Forces comparison */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <ForceDisplay title="Your Force" force={game.playerForce} />
        <ForceDisplay
          title="Opposition"
          force={game.opponentForce}
          isOpponent
        />
      </div>

      {/* BV comparison */}
      <Card className="mb-6 bg-gray-800/50">
        <div className="p-4">
          <h3 className="mb-3 text-sm font-medium text-gray-300">
            Force Balance
          </h3>
          <div className="relative h-4 overflow-hidden rounded-full bg-gray-700">
            <div
              className="absolute inset-y-0 left-0 bg-cyan-500"
              style={{
                width: `${(game.playerForce.totalBV / (game.playerForce.totalBV + game.opponentForce.totalBV)) * 100}%`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-cyan-400">
              Player: {game.playerForce.totalBV.toLocaleString()} BV
            </span>
            <span className="text-red-400">
              Opposition: {game.opponentForce.totalBV.toLocaleString()} BV
            </span>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Difficulty:{' '}
            {game.playerForce.totalBV > 0
              ? (
                  (game.opponentForce.totalBV / game.playerForce.totalBV) *
                  100
                ).toFixed(0)
              : 0}
            %
          </p>
        </div>
      </Card>

      {/* Modifiers */}
      <div className="mb-6">
        <ModifierDisplay />
      </div>

      {/* Victory conditions */}
      <Card className="mb-6">
        <div className="border-b border-gray-700 p-4">
          <h3 className="font-medium text-white">Victory Conditions</h3>
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            {scenario.template.victoryConditions.map((condition, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-gray-300">{condition.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="secondary" onClick={previousStep}>
          Back to Configuration
        </Button>
        <Button
          variant="primary"
          onClick={startGame}
          disabled={isLoading}
          data-testid="start-game-btn"
        >
          Start Battle
        </Button>
      </div>
    </div>
  );
}
