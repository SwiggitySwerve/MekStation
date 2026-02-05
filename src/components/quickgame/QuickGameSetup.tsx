/**
 * Quick Game Setup Component
 * Handles unit selection and scenario configuration steps.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useEffect, useRef } from 'react';

import { Button, Card, Select } from '@/components/ui';
import { Faction, FACTION_NAMES } from '@/constants/scenario/rats';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { QuickGameStep, IQuickGameUnitRequest } from '@/types/quickgame';
import { BiomeType } from '@/types/scenario';

// =============================================================================
// Unit Selection Step
// =============================================================================

function UnitSelectionStep(): React.ReactElement {
  const { game, addUnit, removeUnit, updateUnitSkills, nextStep } =
    useQuickGameStore();

  // Demo unit data - in production would come from compendium/vault
  const demoUnits: IQuickGameUnitRequest[] = [
    {
      sourceUnitId: 'atlas-as7-d',
      name: 'Atlas AS7-D',
      chassis: 'Atlas',
      variant: 'AS7-D',
      bv: 1897,
      tonnage: 100,
      gunnery: 4,
      piloting: 5,
      maxArmor: {
        head: 9,
        ct: 47,
        lt: 32,
        rt: 32,
        la: 34,
        ra: 34,
        ll: 41,
        rl: 41,
      },
      maxStructure: {
        head: 3,
        ct: 31,
        lt: 21,
        rt: 21,
        la: 17,
        ra: 17,
        ll: 21,
        rl: 21,
      },
    },
    {
      sourceUnitId: 'marauder-mad-3r',
      name: 'Marauder MAD-3R',
      chassis: 'Marauder',
      variant: 'MAD-3R',
      bv: 1220,
      tonnage: 75,
      gunnery: 4,
      piloting: 5,
      maxArmor: {
        head: 9,
        ct: 30,
        lt: 24,
        rt: 24,
        la: 24,
        ra: 24,
        ll: 25,
        rl: 25,
      },
      maxStructure: {
        head: 3,
        ct: 23,
        lt: 16,
        rt: 16,
        la: 12,
        ra: 12,
        ll: 16,
        rl: 16,
      },
    },
    {
      sourceUnitId: 'wolverine-wvr-6r',
      name: 'Wolverine WVR-6R',
      chassis: 'Wolverine',
      variant: 'WVR-6R',
      bv: 1101,
      tonnage: 55,
      gunnery: 4,
      piloting: 5,
      maxArmor: {
        head: 9,
        ct: 25,
        lt: 18,
        rt: 18,
        la: 16,
        ra: 16,
        ll: 22,
        rl: 22,
      },
      maxStructure: {
        head: 3,
        ct: 18,
        lt: 13,
        rt: 13,
        la: 9,
        ra: 9,
        ll: 13,
        rl: 13,
      },
    },
    {
      sourceUnitId: 'locust-lcn-1v',
      name: 'Locust LCT-1V',
      chassis: 'Locust',
      variant: 'LCT-1V',
      bv: 432,
      tonnage: 20,
      gunnery: 4,
      piloting: 5,
      maxArmor: { head: 4, ct: 8, lt: 6, rt: 6, la: 4, ra: 4, ll: 4, rl: 4 },
      maxStructure: {
        head: 3,
        ct: 6,
        lt: 5,
        rt: 5,
        la: 3,
        ra: 3,
        ll: 4,
        rl: 4,
      },
    },
    {
      sourceUnitId: 'hunchback-hbk-4g',
      name: 'Hunchback HBK-4G',
      chassis: 'Hunchback',
      variant: 'HBK-4G',
      bv: 1067,
      tonnage: 50,
      gunnery: 4,
      piloting: 5,
      maxArmor: {
        head: 9,
        ct: 26,
        lt: 18,
        rt: 18,
        la: 16,
        ra: 16,
        ll: 20,
        rl: 20,
      },
      maxStructure: {
        head: 3,
        ct: 16,
        lt: 12,
        rt: 12,
        la: 8,
        ra: 8,
        ll: 12,
        rl: 12,
      },
    },
    {
      sourceUnitId: 'shadow-hawk-shd-2h',
      name: 'Shadow Hawk SHD-2H',
      chassis: 'Shadow Hawk',
      variant: 'SHD-2H',
      bv: 1064,
      tonnage: 55,
      gunnery: 4,
      piloting: 5,
      maxArmor: {
        head: 9,
        ct: 23,
        lt: 18,
        rt: 18,
        la: 16,
        ra: 16,
        ll: 16,
        rl: 16,
      },
      maxStructure: {
        head: 3,
        ct: 18,
        lt: 13,
        rt: 13,
        la: 9,
        ra: 9,
        ll: 13,
        rl: 13,
      },
    },
  ];

  const handleAddUnit = (unit: IQuickGameUnitRequest) => {
    addUnit(unit);
  };

  const playerUnits = game?.playerForce.units ?? [];

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold text-white">
          Select Your Units
        </h2>
        <p className="text-sm text-gray-400">
          Add units to your force. The opponent will be generated to match your
          total Battle Value.
        </p>
      </div>

      {/* Current force */}
      <Card className="mb-6">
        <div className="border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Your Force</h3>
            <div className="text-sm text-gray-400">
              <span className="font-medium text-cyan-400">
                {game?.playerForce.totalBV.toLocaleString()}
              </span>{' '}
              BV
              {' / '}
              <span>{game?.playerForce.totalTonnage}</span> tons
            </div>
          </div>
        </div>

        <div className="p-4">
          {playerUnits.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No units added yet. Add units from the list below.
            </p>
          ) : (
            <div className="space-y-3">
              {playerUnits.map((unit) => (
                <div
                  key={unit.instanceId}
                  className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-white">{unit.name}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                      <span>{unit.tonnage}t</span>
                      <span>{unit.bv.toLocaleString()} BV</span>
                      <span>
                        Skill: {unit.gunnery}/{unit.piloting}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={`${unit.gunnery}/${unit.piloting}`}
                      onChange={(e) => {
                        const [g, p] = e.target.value.split('/').map(Number);
                        updateUnitSkills(unit.instanceId, g, p);
                      }}
                      className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-300"
                    >
                      <option value="3/4">Elite (3/4)</option>
                      <option value="4/5">Regular (4/5)</option>
                      <option value="5/6">Green (5/6)</option>
                    </select>
                    <button
                      onClick={() => removeUnit(unit.instanceId)}
                      className="p-1 text-red-400 hover:text-red-300"
                      aria-label="Remove unit"
                    >
                      <svg
                        className="h-4 w-4"
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
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Add unit section */}
      <Card className="mb-6">
        <div className="border-b border-gray-700 p-4">
          <h3 className="font-medium text-white">Available Units</h3>
          <p className="mt-1 text-xs text-gray-500">
            Select units to add to your force (demo units shown)
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          {demoUnits.map((unit) => (
            <button
              key={unit.sourceUnitId}
              onClick={() => handleAddUnit(unit)}
              className="hover:bg-gray-750 flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3 text-left transition-colors hover:border-cyan-500/50"
            >
              <div>
                <p className="text-sm font-medium text-white">{unit.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                  <span>{unit.tonnage}t</span>
                  <span>{unit.bv.toLocaleString()} BV</span>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          ))}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={nextStep}
          disabled={playerUnits.length === 0}
          data-testid="next-step-btn"
        >
          Continue to Configuration
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Scenario Configuration Step
// =============================================================================

function ScenarioConfigStep(): React.ReactElement {
  const {
    game,
    setScenarioConfig,
    generateScenario,
    previousStep,
    nextStep,
    isLoading,
  } = useQuickGameStore();
  const wasLoadingRef = useRef(false);

  // Advance to next step after scenario generation completes
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && game?.scenario) {
      nextStep();
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, game?.scenario, nextStep]);

  const config = game?.scenarioConfig;

  const handleGenerate = () => {
    generateScenario();
    // nextStep() is called via useEffect after scenario generation completes
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
          {/* Difficulty */}
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

          {/* Enemy Faction */}
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

          {/* Biome */}
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

          {/* Modifiers */}
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

          {/* Allow negative modifiers */}
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

      {/* Force summary */}
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

      {/* Navigation */}
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

// =============================================================================
// Main Setup Component
// =============================================================================

export function QuickGameSetup(): React.ReactElement {
  const { game } = useQuickGameStore();

  if (!game) {
    return (
      <div className="py-8 text-center text-gray-400">No game in progress</div>
    );
  }

  switch (game.step) {
    case QuickGameStep.SelectUnits:
      return <UnitSelectionStep />;
    case QuickGameStep.ConfigureScenario:
      return <ScenarioConfigStep />;
    default:
      return <UnitSelectionStep />;
  }
}
