/**
 * Quick Game Setup Component
 * Handles unit selection and scenario configuration steps.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useEffect, useRef } from 'react';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { QuickGameStep, IQuickGameUnitRequest } from '@/types/quickgame';
import { Button, Card, Select } from '@/components/ui';
import { Faction, FACTION_NAMES } from '@/constants/scenario/rats';
import { BiomeType } from '@/types/scenario';

// =============================================================================
// Unit Selection Step
// =============================================================================

function UnitSelectionStep(): React.ReactElement {
  const { game, addUnit, removeUnit, updateUnitSkills, nextStep } = useQuickGameStore();

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
      maxArmor: { head: 9, ct: 47, lt: 32, rt: 32, la: 34, ra: 34, ll: 41, rl: 41 },
      maxStructure: { head: 3, ct: 31, lt: 21, rt: 21, la: 17, ra: 17, ll: 21, rl: 21 },
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
      maxArmor: { head: 9, ct: 30, lt: 24, rt: 24, la: 24, ra: 24, ll: 25, rl: 25 },
      maxStructure: { head: 3, ct: 23, lt: 16, rt: 16, la: 12, ra: 12, ll: 16, rl: 16 },
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
      maxArmor: { head: 9, ct: 25, lt: 18, rt: 18, la: 16, ra: 16, ll: 22, rl: 22 },
      maxStructure: { head: 3, ct: 18, lt: 13, rt: 13, la: 9, ra: 9, ll: 13, rl: 13 },
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
      maxStructure: { head: 3, ct: 6, lt: 5, rt: 5, la: 3, ra: 3, ll: 4, rl: 4 },
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
      maxArmor: { head: 9, ct: 26, lt: 18, rt: 18, la: 16, ra: 16, ll: 20, rl: 20 },
      maxStructure: { head: 3, ct: 16, lt: 12, rt: 12, la: 8, ra: 8, ll: 12, rl: 12 },
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
      maxArmor: { head: 9, ct: 23, lt: 18, rt: 18, la: 16, ra: 16, ll: 16, rl: 16 },
      maxStructure: { head: 3, ct: 18, lt: 13, rt: 13, la: 9, ra: 9, ll: 13, rl: 13 },
    },
  ];

  const handleAddUnit = (unit: IQuickGameUnitRequest) => {
    addUnit(unit);
  };

  const playerUnits = game?.playerForce.units ?? [];

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Select Your Units</h2>
        <p className="text-gray-400 text-sm">
          Add units to your force. The opponent will be generated to match your total Battle Value.
        </p>
      </div>

      {/* Current force */}
      <Card className="mb-6">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Your Force</h3>
            <div className="text-sm text-gray-400">
              <span className="text-cyan-400 font-medium">{game?.playerForce.totalBV.toLocaleString()}</span> BV
              {' / '}
              <span>{game?.playerForce.totalTonnage}</span> tons
            </div>
          </div>
        </div>

        <div className="p-4">
          {playerUnits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No units added yet. Add units from the list below.
            </p>
          ) : (
            <div className="space-y-3">
              {playerUnits.map((unit) => (
                <div
                  key={unit.instanceId}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-white font-medium">{unit.name}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
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
                      className="bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600"
                    >
                      <option value="3/4">Elite (3/4)</option>
                      <option value="4/5">Regular (4/5)</option>
                      <option value="5/6">Green (5/6)</option>
                    </select>
                    <button
                      onClick={() => removeUnit(unit.instanceId)}
                      className="text-red-400 hover:text-red-300 p-1"
                      aria-label="Remove unit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
        <div className="p-4 border-b border-gray-700">
          <h3 className="font-medium text-white">Available Units</h3>
          <p className="text-xs text-gray-500 mt-1">
            Select units to add to your force (demo units shown)
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {demoUnits.map((unit) => (
            <button
              key={unit.sourceUnitId}
              onClick={() => handleAddUnit(unit)}
              className="flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 rounded-lg text-left transition-colors border border-gray-700 hover:border-cyan-500/50"
            >
              <div>
                <p className="text-white font-medium text-sm">{unit.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span>{unit.tonnage}t</span>
                  <span>{unit.bv.toLocaleString()} BV</span>
                </div>
              </div>
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
  const { game, setScenarioConfig, generateScenario, previousStep, nextStep, isLoading } =
    useQuickGameStore();
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
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Configure Scenario</h2>
        <p className="text-gray-400 text-sm">
          Set the difficulty and parameters for your battle.
        </p>
      </div>

      <Card className="mb-6">
        <div className="p-4 space-y-6">
          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Difficulty
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={config?.difficulty ?? 1.0}
                onChange={(e) => setScenarioConfig({ difficulty: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Easy</span>
                <span className="text-cyan-400 font-medium">
                  {difficultyLabels[config?.difficulty ?? 1.0] ?? 'Normal'} ({((config?.difficulty ?? 1.0) * 100).toFixed(0)}% BV)
                </span>
                <span>Hard</span>
              </div>
            </div>
          </div>

          {/* Enemy Faction */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enemy Faction
            </label>
            <Select
              value={config?.enemyFaction ?? Faction.PIRATES}
              onChange={(e) => setScenarioConfig({ enemyFaction: e.target.value })}
              options={factionOptions}
            />
          </div>

          {/* Biome */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Biome (optional)
            </label>
            <Select
              value={config?.biome ?? ''}
              onChange={(e) => setScenarioConfig({ biome: e.target.value || undefined })}
              options={[{ value: '', label: 'Random' }, ...biomeOptions]}
            />
          </div>

          {/* Modifiers */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Battle Modifiers
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="4"
                step="1"
                value={config?.modifierCount ?? 2}
                onChange={(e) => setScenarioConfig({ modifierCount: parseInt(e.target.value) })}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-gray-400 text-sm w-8 text-right">
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
              <p className="text-xs text-gray-500 mt-0.5">
                Include modifiers that work against you
              </p>
            </div>
            <button
              role="switch"
              aria-checked={config?.allowNegativeModifiers ?? true}
              onClick={() =>
                setScenarioConfig({
                  allowNegativeModifiers: !(config?.allowNegativeModifiers ?? true),
                })
              }
              className={`relative w-11 h-6 rounded-full transition-colors ${
                config?.allowNegativeModifiers ?? true ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  config?.allowNegativeModifiers ?? true ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Force summary */}
      <Card className="mb-6 bg-gray-800/50">
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Force Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Your Force</p>
              <p className="text-white">
                {game?.playerForce.units.length} units, {game?.playerForce.totalBV.toLocaleString()} BV
              </p>
            </div>
            <div>
              <p className="text-gray-500">Expected Opposition</p>
              <p className="text-white">
                ~{Math.round((game?.playerForce.totalBV ?? 0) * (config?.difficulty ?? 1.0)).toLocaleString()} BV
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
    return <div className="text-gray-400 text-center py-8">No game in progress</div>;
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
