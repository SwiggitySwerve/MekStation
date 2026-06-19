import { useEffect, useRef } from 'react';

import type {
  IQuickGameInstance,
  IQuickGameScenarioConfig,
} from '@/types/quickgame';

import { Button, Card, Select } from '@/components/ui';
import { Faction, FACTION_NAMES } from '@/constants/scenario/rats';
import { useQuickGameSelector } from '@/stores/useQuickGameStore';
import { BiomeType } from '@/types/scenario';

type ScenarioConfigUpdate = Partial<IQuickGameScenarioConfig>;
type SetScenarioConfig = (config: ScenarioConfigUpdate) => void;

const FACTION_OPTIONS = Object.values(Faction).map((f) => ({
  value: f,
  label: FACTION_NAMES[f],
}));

const BIOME_OPTIONS = Object.values(BiomeType).map((b) => ({
  value: b,
  label: b.charAt(0).toUpperCase() + b.slice(1).replace('_', ' '),
}));

// Per `polish-wave-6.2-gaps` (gaps #4 + #6): scenario archetype + AI tier
// selectors. Both default to the pre-6.2 implicit value so users that
// skip the controls get unchanged behavior.
const SCENARIO_TYPE_OPTIONS = [
  { value: 'Annihilation', label: 'Annihilation â€” destroy all enemies' },
  { value: 'CTF', label: 'Capture the Flag â€” seize objectives' },
  { value: 'Defend', label: 'Defend â€” survive until the timer' },
  { value: 'Breakthrough', label: 'Breakthrough â€” exit the far edge' },
];

const AI_TIER_OPTIONS = [
  { value: 'Green', label: 'Green â€” gunnery 5 / piloting 6' },
  { value: 'Regular', label: 'Regular â€” gunnery 4 / piloting 5' },
  { value: 'Veteran', label: 'Veteran â€” gunnery 3 / piloting 4' },
  { value: 'Elite', label: 'Elite â€” gunnery 2 / piloting 3' },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  0.5: 'Very Easy',
  0.75: 'Easy',
  1.0: 'Normal',
  1.25: 'Challenging',
  1.5: 'Hard',
  1.75: 'Very Hard',
  2.0: 'Extreme',
};

interface ScenarioControlProps {
  readonly config: IQuickGameScenarioConfig | undefined;
  readonly setScenarioConfig: SetScenarioConfig;
}

function DifficultyControl({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  const difficulty = config?.difficulty ?? 1.0;

  return (
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
          value={difficulty}
          onChange={(e) =>
            setScenarioConfig({ difficulty: parseFloat(e.target.value) })
          }
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Easy</span>
          <span className="font-medium text-cyan-400">
            {DIFFICULTY_LABELS[difficulty] ?? 'Normal'} (
            {(difficulty * 100).toFixed(0)}% BV)
          </span>
          <span>Hard</span>
        </div>
      </div>
    </div>
  );
}

function FactionControl({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-300">
        Enemy Faction
      </label>
      <Select
        value={config?.enemyFaction ?? Faction.PIRATES}
        onChange={(e) => setScenarioConfig({ enemyFaction: e.target.value })}
        options={FACTION_OPTIONS}
      />
    </div>
  );
}

function BiomeControl({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-300">
        Biome (optional)
      </label>
      <Select
        value={config?.biome ?? ''}
        onChange={(e) =>
          setScenarioConfig({ biome: e.target.value || undefined })
        }
        options={[{ value: '', label: 'Random' }, ...BIOME_OPTIONS]}
      />
    </div>
  );
}

function ScenarioTypeControl({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-medium text-gray-300"
        htmlFor="quick-game-scenario-select"
      >
        Scenario Type
      </label>
      <Select
        id="quick-game-scenario-select"
        data-testid="quick-game-scenario-select"
        value={config?.scenarioType ?? 'Annihilation'}
        onChange={(e) =>
          setScenarioConfig({
            scenarioType: e.target
              .value as IQuickGameScenarioConfig['scenarioType'],
          })
        }
        options={SCENARIO_TYPE_OPTIONS}
      />
    </div>
  );
}

function AiTierControl({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  return (
    <div>
      <label
        className="mb-2 block text-sm font-medium text-gray-300"
        htmlFor="quick-game-ai-tier-select"
      >
        AI Tier
      </label>
      <Select
        id="quick-game-ai-tier-select"
        data-testid="quick-game-ai-tier-select"
        value={config?.aiTier ?? 'Regular'}
        onChange={(e) =>
          setScenarioConfig({
            aiTier: e.target.value as IQuickGameScenarioConfig['aiTier'],
          })
        }
        options={AI_TIER_OPTIONS}
      />
    </div>
  );
}

function BattleModifiersControl({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  return (
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
  );
}

function NegativeModifiersToggle({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  const allowNegativeModifiers = config?.allowNegativeModifiers ?? true;

  return (
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
        aria-checked={allowNegativeModifiers}
        onClick={() =>
          setScenarioConfig({
            allowNegativeModifiers: !allowNegativeModifiers,
          })
        }
        className={`relative h-6 w-11 rounded-full transition-colors ${
          allowNegativeModifiers ? 'bg-cyan-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            allowNegativeModifiers ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

function ScenarioControlsCard({
  config,
  setScenarioConfig,
}: ScenarioControlProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <div className="space-y-6 p-4">
        <DifficultyControl
          config={config}
          setScenarioConfig={setScenarioConfig}
        />
        <FactionControl config={config} setScenarioConfig={setScenarioConfig} />
        <BiomeControl config={config} setScenarioConfig={setScenarioConfig} />
        <ScenarioTypeControl
          config={config}
          setScenarioConfig={setScenarioConfig}
        />
        <AiTierControl config={config} setScenarioConfig={setScenarioConfig} />
        <BattleModifiersControl
          config={config}
          setScenarioConfig={setScenarioConfig}
        />
        <NegativeModifiersToggle
          config={config}
          setScenarioConfig={setScenarioConfig}
        />
      </div>
    </Card>
  );
}

function ForceSummaryCard({
  game,
  difficulty,
}: {
  readonly game: IQuickGameInstance | null;
  readonly difficulty: number;
}): React.ReactElement {
  return (
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
                (game?.playerForce.totalBV ?? 0) * difficulty,
              ).toLocaleString()}{' '}
              BV
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ScenarioConfigStep(): React.ReactElement {
  const game = useQuickGameSelector((state) => state.game);
  const setScenarioConfig = useQuickGameSelector(
    (state) => state.setScenarioConfig,
  );
  const generateScenario = useQuickGameSelector(
    (state) => state.generateScenario,
  );
  const previousStep = useQuickGameSelector((state) => state.previousStep);
  const nextStep = useQuickGameSelector((state) => state.nextStep);
  const isLoading = useQuickGameSelector((state) => state.isLoading);
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

  const difficulty = config?.difficulty ?? 1.0;

  // Per `polish-wave-6.2-gaps` (gaps #4 + #6): scenario archetype + AI tier
  // selectors. Both default to the pre-6.2 implicit value so users that
  // skip the controls get unchanged behavior.
  const scenarioTypeOptions = [
    { value: 'Annihilation', label: 'Annihilation — destroy all enemies' },
    { value: 'CTF', label: 'Capture the Flag — seize objectives' },
    { value: 'Defend', label: 'Defend — survive until the timer' },
    { value: 'Breakthrough', label: 'Breakthrough — exit the far edge' },
  ];

  const aiTierOptions = [
    { value: 'Green', label: 'Green — gunnery 5 / piloting 6' },
    { value: 'Regular', label: 'Regular — gunnery 4 / piloting 5' },
    { value: 'Veteran', label: 'Veteran — gunnery 3 / piloting 4' },
    { value: 'Elite', label: 'Elite — gunnery 2 / piloting 3' },
  ];

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

      <ScenarioControlsCard
        config={config}
        setScenarioConfig={setScenarioConfig}
      />

      <ForceSummaryCard game={game} difficulty={difficulty} />

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
