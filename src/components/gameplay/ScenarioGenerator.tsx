/**
 * Scenario Generator Component
 * UI for generating scenarios with configurable difficulty and modifiers.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */
import { useState, useCallback } from 'react';
import { Card, Button, Select } from '@/components/ui';
import { scenarioGenerator } from '@/services/generators';
import { Faction, FACTION_NAMES } from '@/constants/scenario/rats';
import { Era } from '@/types/temporal/Era';
import {
  BiomeType,
  type IGeneratedScenario,
  type IScenarioTemplate,
  OpForSkillLevel,
  ScenarioObjectiveType,
} from '@/types/scenario';

// =============================================================================
// Types
// =============================================================================

export interface ScenarioGeneratorProps {
  /** Player force BV (required for OpFor scaling) */
  playerBV: number;
  /** Player force unit count */
  playerUnitCount: number;
  /** Callback when scenario is generated */
  onGenerate: (scenario: IGeneratedScenario) => void;
  /** Optional: pre-selected scenario type */
  defaultScenarioType?: ScenarioObjectiveType;
  /** Show as compact panel or full form */
  variant?: 'panel' | 'modal';
}

interface GeneratorConfig {
  scenarioType: ScenarioObjectiveType | '';
  faction: Faction;
  era: Era;
  biome: BiomeType | '';
  difficulty: number;
  skillLevel: OpForSkillLevel;
  maxModifiers: number;
  allowNegativeModifiers: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SCENARIO_TYPE_OPTIONS = [
  { value: '', label: 'Random (Any Type)' },
  { value: ScenarioObjectiveType.Destroy, label: 'Standup Fight' },
  { value: ScenarioObjectiveType.Capture, label: 'Base Assault' },
  { value: ScenarioObjectiveType.Defend, label: 'Defensive Hold' },
  { value: ScenarioObjectiveType.Escort, label: 'Convoy Escort' },
  { value: ScenarioObjectiveType.Recon, label: 'Reconnaissance' },
  { value: ScenarioObjectiveType.Breakthrough, label: 'Breakthrough' },
];

const FACTION_OPTIONS = Object.entries(FACTION_NAMES).map(([value, label]) => ({
  value,
  label,
}));

const ERA_OPTIONS = [
  { value: Era.LATE_SUCCESSION_WARS, label: 'Late Succession Wars (2901-3019)' },
  { value: Era.RENAISSANCE, label: 'Renaissance (3020-3049)' },
  { value: Era.CLAN_INVASION, label: 'Clan Invasion (3050-3061)' },
  { value: Era.CIVIL_WAR, label: 'Civil War (3062-3067)' },
  { value: Era.JIHAD, label: 'Jihad (3068-3081)' },
  { value: Era.DARK_AGE, label: 'Dark Age (3082-3150)' },
  { value: Era.IL_CLAN, label: 'ilClan (3151+)' },
];

const BIOME_OPTIONS = [
  { value: '', label: 'Random (Based on Scenario)' },
  { value: BiomeType.Plains, label: 'Plains' },
  { value: BiomeType.Forest, label: 'Forest' },
  { value: BiomeType.Urban, label: 'Urban' },
  { value: BiomeType.Desert, label: 'Desert' },
  { value: BiomeType.Badlands, label: 'Badlands' },
  { value: BiomeType.Arctic, label: 'Arctic' },
  { value: BiomeType.Swamp, label: 'Swamp' },
  { value: BiomeType.Jungle, label: 'Jungle' },
  { value: BiomeType.Mountains, label: 'Mountains' },
  { value: BiomeType.Volcanic, label: 'Volcanic' },
];

const DIFFICULTY_OPTIONS = [
  { value: '0.5', label: 'Easy (50% BV)' },
  { value: '0.75', label: 'Normal-Easy (75% BV)' },
  { value: '1.0', label: 'Normal (100% BV)' },
  { value: '1.25', label: 'Hard (125% BV)' },
  { value: '1.5', label: 'Very Hard (150% BV)' },
  { value: '2.0', label: 'Extreme (200% BV)' },
];

const SKILL_LEVEL_OPTIONS = [
  { value: OpForSkillLevel.Green, label: 'Green (5/6)' },
  { value: OpForSkillLevel.Regular, label: 'Regular (4/5)' },
  { value: OpForSkillLevel.Veteran, label: 'Veteran (3/4)' },
  { value: OpForSkillLevel.Elite, label: 'Elite (2/3)' },
  { value: OpForSkillLevel.Legendary, label: 'Legendary (1/2)' },
  { value: OpForSkillLevel.Mixed, label: 'Mixed (Varied)' },
];

const MODIFIER_COUNT_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1', label: '1 Modifier' },
  { value: '2', label: '2 Modifiers' },
  { value: '3', label: '3 Modifiers' },
];

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
  const updateConfig = useCallback(<K extends keyof GeneratorConfig>(
    field: K,
    value: GeneratorConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setPreview(null); // Clear preview when config changes
  }, []);

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
      setError(err instanceof Error ? err.message : 'Failed to generate scenario');
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
        <h3 className="text-lg font-medium text-text-theme-primary mb-4">
          Generate Scenario
        </h3>

        <div className={`grid gap-4 ${isCompact ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {/* Scenario Type */}
          <Select
            label="Scenario Type"
            options={SCENARIO_TYPE_OPTIONS}
            value={config.scenarioType}
            onChange={(e) => updateConfig('scenarioType', e.target.value as ScenarioObjectiveType | '')}
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
            onChange={(e) => updateConfig('biome', e.target.value as BiomeType | '')}
            data-testid="biome-select"
          />

          {/* Difficulty */}
          <Select
            label="Difficulty (BV Multiplier)"
            options={DIFFICULTY_OPTIONS}
            value={config.difficulty.toString()}
            onChange={(e) => updateConfig('difficulty', parseFloat(e.target.value))}
            data-testid="difficulty-select"
          />

          {/* Skill Level */}
          <Select
            label="Enemy Skill Level"
            options={SKILL_LEVEL_OPTIONS}
            value={config.skillLevel}
            onChange={(e) => updateConfig('skillLevel', e.target.value as OpForSkillLevel)}
            data-testid="skill-level-select"
          />

          {/* Modifier Count */}
          <Select
            label="Battle Modifiers"
            options={MODIFIER_COUNT_OPTIONS}
            value={config.maxModifiers.toString()}
            onChange={(e) => updateConfig('maxModifiers', parseInt(e.target.value, 10))}
            data-testid="modifiers-select"
          />

          {/* Allow Negative Modifiers */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowNegative"
              checked={config.allowNegativeModifiers}
              onChange={(e) => updateConfig('allowNegativeModifiers', e.target.checked)}
              className="w-4 h-4 rounded border-border-theme bg-surface-raised text-accent focus:ring-accent"
              data-testid="allow-negative-checkbox"
            />
            <label htmlFor="allowNegative" className="text-sm text-text-theme-secondary">
              Include negative modifiers
            </label>
          </div>
        </div>

        {/* Player Force Info */}
        <div className="mt-4 p-3 rounded-lg bg-surface-raised/50 border border-border-theme-subtle">
          <div className="text-sm text-text-theme-secondary">
            Player Force: <span className="text-text-theme-primary font-medium">{playerUnitCount} units</span> |{' '}
            <span className="text-text-theme-primary font-medium">{playerBV.toLocaleString()} BV</span>
          </div>
          <div className="text-sm text-text-theme-muted">
            Target OpFor BV: ~{Math.round(playerBV * config.difficulty).toLocaleString()}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
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

// =============================================================================
// Preview Component
// =============================================================================

interface ScenarioPreviewProps {
  scenario: IGeneratedScenario;
  onAccept: () => void;
  onRegenerate: () => void;
}

function ScenarioPreview({
  scenario,
  onAccept,
  onRegenerate,
}: ScenarioPreviewProps): React.ReactElement {
  const { template, mapPreset, opFor, modifiers, turnLimit } = scenario;

  return (
    <Card data-testid="scenario-preview">
      <h3 className="text-lg font-medium text-text-theme-primary mb-4">
        Generated Scenario Preview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario Info */}
        <div>
          <h4 className="text-sm font-medium text-text-theme-secondary mb-2">Scenario</h4>
          <div className="p-3 rounded-lg bg-surface-raised border border-border-theme-subtle">
            <div className="font-medium text-text-theme-primary">{template.name}</div>
            <div className="text-sm text-text-theme-muted mt-1">{template.description}</div>
            {turnLimit > 0 && (
              <div className="text-sm text-accent mt-2">Turn Limit: {turnLimit}</div>
            )}
          </div>

          {/* Victory Conditions */}
          <h4 className="text-sm font-medium text-text-theme-secondary mt-4 mb-2">Victory Conditions</h4>
          <ul className="space-y-1">
            {template.victoryConditions.map((vc, i) => (
              <li key={i} className="text-sm text-text-theme-primary flex items-start gap-2">
                <span className="text-accent">•</span>
                {vc.name}
                {vc.primary && <span className="text-xs text-accent">(Primary)</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Map Info */}
        <div>
          <h4 className="text-sm font-medium text-text-theme-secondary mb-2">Map</h4>
          <div className="p-3 rounded-lg bg-surface-raised border border-border-theme-subtle">
            <div className="font-medium text-text-theme-primary">{mapPreset.name}</div>
            <div className="text-sm text-text-theme-muted mt-1">
              Biome: {mapPreset.biome} | Radius: {mapPreset.radius} hexes
            </div>
          </div>

          {/* Modifiers */}
          {modifiers.length > 0 && (
            <>
              <h4 className="text-sm font-medium text-text-theme-secondary mt-4 mb-2">Battle Modifiers</h4>
              <ul className="space-y-1">
                {modifiers.map((mod) => (
                  <li key={mod.id} className="text-sm flex items-start gap-2">
                    <span className={
                      mod.effect === 'positive' ? 'text-green-400' :
                      mod.effect === 'negative' ? 'text-red-400' :
                      'text-yellow-400'
                    }>•</span>
                    <span className="text-text-theme-primary">{mod.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* OpFor Summary */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-text-theme-secondary mb-2">
          Generated Opposition Force
        </h4>
        <div className="p-3 rounded-lg bg-surface-raised border border-border-theme-subtle">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium text-text-theme-primary">
                {opFor.units.length} units
              </span>
              <span className="text-text-theme-muted mx-2">|</span>
              <span className="text-text-theme-primary">
                {opFor.totalBV.toLocaleString()} BV
              </span>
              <span className="text-sm text-text-theme-muted ml-2">
                (Target: {opFor.targetBV.toLocaleString()})
              </span>
            </div>
            <div className="text-sm text-text-theme-muted">
              {opFor.metadata.lanceCount} lance{opFor.metadata.lanceCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Unit List */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {opFor.units.slice(0, 8).map((unit, i) => (
              <div key={i} className="text-xs text-text-theme-muted">
                <span className="text-text-theme-primary">{unit.designation}</span>
                <span className="block">{unit.pilot.gunnery}/{unit.pilot.piloting} - {unit.bv} BV</span>
              </div>
            ))}
            {opFor.units.length > 8 && (
              <div className="text-xs text-text-theme-muted">
                +{opFor.units.length - 8} more...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onRegenerate} data-testid="regenerate-btn">
          Regenerate
        </Button>
        <Button variant="primary" onClick={onAccept} data-testid="accept-scenario-btn">
          Use This Scenario
        </Button>
      </div>
    </Card>
  );
}

export default ScenarioGenerator;
