import { useEffect, useRef } from 'react';

import { Button, Card, Select } from '@/components/ui';
import { Faction, FACTION_NAMES } from '@/constants/scenario/rats';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { BiomeType } from '@/types/scenario';

export function ScenarioConfigStep(): React.ReactElement {
  const {
    game,
    setScenarioConfig,
    generateScenario,
    previousStep,
    nextStep,
    isLoading,
  } = useQuickGameStore();
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && game?.scenario) {
      nextStep();
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, game?.scenario, nextStep]);

  const config = game?.scenarioConfig;

  const handleGenerate = () => {
    generateScenario();
  };

  const factionOptions = Object.values(Faction).map((f) => ({
    value: f,
    label: FACTION_NAMES[f],
  }));

  const biomeOptions = Object.values(BiomeType).map((b) => ({
    value: b,
    label: b.charAt(0).toUpperCase() + b.slice(1).replace('_', ' '),
  }));

  const difficultyLabels: Record<number, string> = {
    0.5: 'Very Easy',
    0.75: 'Easy',
    1.0: 'Normal',
    1.25: 'Challenging',
    1.5: 'Hard',
    1.75: 'Very Hard',
    2.0: 'Extreme',
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-white">
          Configure Scenario
        </h2>
        <p className="text-sm text-gray-400">
          Set the difficulty and parameters for your battle.
        </p>
      </div>

      <Card className="mb-6">
        <div className="space-y-6 p-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Difficulty
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={config?.difficulty ?? 1.0}
                onChange={(e) =>
                  setScenarioConfig({ difficulty: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Easy</span>
                <span className="font-medium text-cyan-400">
                  {difficultyLabels[config?.difficulty ?? 1.0] ?? 'Normal'} (
                  {((config?.difficulty ?? 1.0) * 100).toFixed(0)}% BV)
                </span>
                <span>Hard</span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Enemy Faction
            </label>
            <Select
              value={config?.enemyFaction ?? Faction.PIRATES}
              onChange={(e) =>
                setScenarioConfig({ enemyFaction: e.target.value })
              }
              options={factionOptions}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Biome (optional)
            </label>
            <Select
              value={config?.biome ?? ''}
              onChange={(e) =>
                setScenarioConfig({ biome: e.target.value || undefined })
              }
              options={[{ value: '', label: 'Random' }, ...biomeOptions]}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Battle Modifiers
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={config?.modifierCount ?? 2}
                onChange={(e) =>
                  setScenarioConfig({ modifierCount: parseInt(e.target.value) })
                }
                className="flex-1 accent-cyan-500"
              />
              <span className="w-8 text-right text-sm text-gray-400">
                {config?.modifierCount ?? 2}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-300">
                Allow Negative Modifiers
              </label>
              <p className="mt-0.5 text-xs text-gray-500">
                Include modifiers that work against you
              </p>
            </div>
            <button
              role="switch"
              aria-checked={config?.allowNegativeModifiers ?? true}
              onClick={() =>
                setScenarioConfig({
                  allowNegativeModifiers: !(
                    config?.allowNegativeModifiers ?? true
                  ),
                })
              }
              className={`relative h-6 w-11 rounded-full transition-colors ${
                (config?.allowNegativeModifiers ?? true)
                  ? 'bg-cyan-500'
                  : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  (config?.allowNegativeModifiers ?? true)
                    ? 'translate-x-5'
                    : ''
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      <Card className="mb-6 bg-gray-800/50">
        <div className="p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-300">
            Force Summary
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Your Force</p>
              <p className="text-white">
                {game?.playerForce.units.length} units,{' '}
                {game?.playerForce.totalBV.toLocaleString()} BV
              </p>
            </div>
            <div>
              <p className="text-gray-500">Expected Opposition</p>
              <p className="text-white">
                ~
                {Math.round(
                  (game?.playerForce.totalBV ?? 0) *
                    (config?.difficulty ?? 1.0),
                ).toLocaleString()}{' '}
                BV
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" onClick={previousStep}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleGenerate}
          disabled={isLoading}
          data-testid="generate-scenario-btn"
        >
          {isLoading ? 'Generating...' : 'Generate Scenario'}
        </Button>
      </div>
    </div>
  );
}
