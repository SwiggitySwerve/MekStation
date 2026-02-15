/**
 * Scenario Generator Component
 * UI for generating scenarios with configurable difficulty and modifiers.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */
import { useState, useCallback } from 'react';

import { Card, Button, Select } from '@/components/ui';
import { Faction } from '@/constants/scenario/rats';
import { scenarioGenerator } from '@/services/generators';
import {
  BiomeType,
  type IGeneratedScenario,
  OpForSkillLevel,
  ScenarioObjectiveType,
} from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

import {
  GeneratorConfig,
  SCENARIO_TYPE_OPTIONS,
  FACTION_OPTIONS,
  ERA_OPTIONS,
  BIOME_OPTIONS,
  DIFFICULTY_OPTIONS,
  SKILL_LEVEL_OPTIONS,
  MODIFIER_COUNT_OPTIONS,
} from './scenarioGenerator.helpers';
import { ScenarioPreview } from './ScenarioPreview';

// =============================================================================
// Types
// =============================================================================

export interface ScenarioGeneratorProps {
  playerBV: number;
  playerUnitCount: number;
  onGenerate: (scenario: IGeneratedScenario) => void;
  defaultScenarioType?: ScenarioObjectiveType;
  variant?: 'panel' | 'modal';
}

// =============================================================================
// Component
// =============================================================================

export function ScenarioGenerator({
  playerBV,
  playerUnitCount,
  onGenerate,
  defaultScenarioType,
  variant = 'panel',
}: ScenarioGeneratorProps): React.ReactElement {
  const [config, setConfig] = useState<GeneratorConfig>({
    scenarioType: defaultScenarioType || '',
    faction: Faction.PIRATES,
    era: Era.CLAN_INVASION,
    biome: '',
    difficulty: 1.0,
    skillLevel: OpForSkillLevel.Regular,
    maxModifiers: 2,
    allowNegativeModifiers: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState<IGeneratedScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update config field
  const updateConfig = useCallback(
    <K extends keyof GeneratorConfig>(field: K, value: GeneratorConfig[K]) => {
      setConfig((prev) => ({ ...prev, [field]: value }));
      setPreview(null); // Clear preview when config changes
    },
    [],
  );

  // Generate scenario
  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setError(null);

    try {
      const scenario = scenarioGenerator.generate({
        playerBV,
        playerUnitCount,
        scenarioType: config.scenarioType || undefined,
        faction: config.faction,
        era: config.era,
        biome: config.biome || undefined,
        difficulty: config.difficulty,
        maxModifiers: config.maxModifiers,
        allowNegativeModifiers: config.allowNegativeModifiers,
      });

      setPreview(scenario);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate scenario',
      );
    } finally {
      setIsGenerating(false);
    }
  }, [playerBV, playerUnitCount, config]);

  // Accept generated scenario
  const handleAccept = useCallback(() => {
    if (preview) {
      onGenerate(preview);
      setPreview(null);
    }
  }, [preview, onGenerate]);

  // Regenerate with same settings
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const isCompact = variant === 'panel';

  return (
    <div className={isCompact ? '' : 'space-y-6'}>
      {/* Configuration Form */}
      <Card className={isCompact ? 'p-4' : ''}>
        <h3 className="text-text-theme-primary mb-4 text-lg font-medium">
          Generate Scenario
        </h3>

        <div
          className={`grid gap-4 ${isCompact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
        >
          {/* Scenario Type */}
          <Select
            label="Scenario Type"
            options={SCENARIO_TYPE_OPTIONS}
            value={config.scenarioType}
            onChange={(e) =>
              updateConfig(
                'scenarioType',
                e.target.value as ScenarioObjectiveType | '',
              )
            }
            data-testid="scenario-type-select"
          />

          {/* Enemy Faction */}
          <Select
            label="Enemy Faction"
            options={FACTION_OPTIONS}
            value={config.faction}
            onChange={(e) => updateConfig('faction', e.target.value as Faction)}
            data-testid="faction-select"
          />

          {/* Era */}
          <Select
            label="Era"
            options={ERA_OPTIONS}
            value={config.era}
            onChange={(e) => updateConfig('era', e.target.value as Era)}
            data-testid="era-select"
          />

          {/* Biome */}
          <Select
            label="Terrain Biome"
            options={BIOME_OPTIONS}
            value={config.biome}
            onChange={(e) =>
              updateConfig('biome', e.target.value as BiomeType | '')
            }
            data-testid="biome-select"
          />

          {/* Difficulty */}
          <Select
            label="Difficulty (BV Multiplier)"
            options={DIFFICULTY_OPTIONS}
            value={config.difficulty.toString()}
            onChange={(e) =>
              updateConfig('difficulty', parseFloat(e.target.value))
            }
            data-testid="difficulty-select"
          />

          {/* Skill Level */}
          <Select
            label="Enemy Skill Level"
            options={SKILL_LEVEL_OPTIONS}
            value={config.skillLevel}
            onChange={(e) =>
              updateConfig('skillLevel', e.target.value as OpForSkillLevel)
            }
            data-testid="skill-level-select"
          />

          {/* Modifier Count */}
          <Select
            label="Battle Modifiers"
            options={MODIFIER_COUNT_OPTIONS}
            value={config.maxModifiers.toString()}
            onChange={(e) =>
              updateConfig('maxModifiers', parseInt(e.target.value, 10))
            }
            data-testid="modifiers-select"
          />

          {/* Allow Negative Modifiers */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowNegative"
              checked={config.allowNegativeModifiers}
              onChange={(e) =>
                updateConfig('allowNegativeModifiers', e.target.checked)
              }
              className="border-border-theme bg-surface-raised text-accent focus:ring-accent h-4 w-4 rounded"
              data-testid="allow-negative-checkbox"
            />
            <label
              htmlFor="allowNegative"
              className="text-text-theme-secondary text-sm"
            >
              Include negative modifiers
            </label>
          </div>
        </div>

        {/* Player Force Info */}
        <div className="bg-surface-raised/50 border-border-theme-subtle mt-4 rounded-lg border p-3">
          <div className="text-text-theme-secondary text-sm">
            Player Force:{' '}
            <span className="text-text-theme-primary font-medium">
              {playerUnitCount} units
            </span>{' '}
            |{' '}
            <span className="text-text-theme-primary font-medium">
              {playerBV.toLocaleString()} BV
            </span>
          </div>
          <div className="text-text-theme-muted text-sm">
            Target OpFor BV: ~
            {Math.round(playerBV * config.difficulty).toLocaleString()}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating || playerBV <= 0}
            data-testid="generate-scenario-btn"
          >
            {isGenerating ? 'Generating...' : 'Generate Scenario'}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {preview && (
        <ScenarioPreview
          scenario={preview}
          onAccept={handleAccept}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  );
}

export default ScenarioGenerator;
