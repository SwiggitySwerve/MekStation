import type {
  IForceReference,
  IMapConfiguration,
  IScenarioTemplate,
  IVictoryCondition,
} from '@/types/encounter';
import type { IForce } from '@/types/force';

import { Badge, Card } from '@/components/ui';
import { TerrainPreset, VictoryConditionType } from '@/types/encounter';

interface ForceCardProps {
  title: string;
  forceRef: IForceReference;
  force: IForce | undefined;
  side: 'player' | 'opponent';
}

export function ForceCard({
  title,
  forceRef,
  force,
  side,
}: ForceCardProps): React.ReactElement {
  const isOpponent = side === 'opponent';
  const accentColor = isOpponent ? 'red' : 'cyan';

  return (
    <Card
      className={`border-${accentColor}-500/30`}
      data-testid={`${side}-force-card`}
    >
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h3
            className={`font-medium ${isOpponent ? 'text-red-400' : 'text-cyan-400'}`}
          >
            {title}
          </h3>
          <Badge variant={isOpponent ? 'red' : 'cyan'}>
            {forceRef.unitCount} {forceRef.unitCount === 1 ? 'unit' : 'units'}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <p
            className="text-text-theme-primary font-medium"
            data-testid={`${side}-force-name`}
          >
            {forceRef.forceName}
          </p>
          <p
            className="text-text-theme-muted mt-1 text-sm"
            data-testid={`${side}-force-bv`}
          >
            {forceRef.totalBV.toLocaleString()} Battle Value
          </p>
        </div>

        {force && force.assignments.length > 0 ? (
          <div className="space-y-2" data-testid={`${side}-unit-list`}>
            {force.assignments
              .filter((assignment) => assignment.unitId)
              .map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-surface-raised border-border-theme-subtle flex items-center justify-between rounded-lg border p-2"
                >
                  <div className="text-text-theme-primary text-sm">
                    Slot {assignment.slot}
                    {assignment.pilotId && (
                      <span className="text-text-theme-muted ml-2 text-xs">
                        (pilot assigned)
                      </span>
                    )}
                  </div>
                  <div className="text-text-theme-muted text-xs">
                    {assignment.position}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-text-theme-muted text-sm">
            {forceRef.unitCount} units assigned
          </p>
        )}
      </div>
    </Card>
  );
}

interface BVComparisonProps {
  playerBV: number;
  opponentBV: number;
}

export function BVComparison({
  playerBV,
  opponentBV,
}: BVComparisonProps): React.ReactElement {
  const totalBV = playerBV + opponentBV;
  const playerPercent = totalBV > 0 ? (playerBV / totalBV) * 100 : 50;

  return (
    <Card className="bg-surface-raised/50" data-testid="bv-comparison">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Force Balance
        </h3>
        <div className="relative h-4 overflow-hidden rounded-full bg-gray-700">
          <div
            className="absolute inset-y-0 left-0 bg-cyan-500 transition-all duration-500"
            style={{ width: `${playerPercent}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-cyan-400">
            Player: {playerBV.toLocaleString()} BV
          </span>
          <span className="text-red-400">
            Opponent: {opponentBV.toLocaleString()} BV
          </span>
        </div>
        {totalBV > 0 && (
          <p className="text-text-theme-muted mt-2 text-center text-xs">
            Ratio:{' '}
            {playerBV > 0 ? ((opponentBV / playerBV) * 100).toFixed(0) : '∞'}%
            opponent vs player
          </p>
        )}
      </div>
    </Card>
  );
}

interface BattlefieldCardProps {
  mapConfig: IMapConfiguration;
}

export function BattlefieldCard({
  mapConfig,
}: BattlefieldCardProps): React.ReactElement {
  return (
    <Card className="mb-6" data-testid="map-info-card">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Battlefield
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-text-theme-muted">Map Size</p>
            <p className="text-text-theme-primary">
              {mapConfig.radius * 2 + 1}x{mapConfig.radius * 2 + 1} hex grid
            </p>
          </div>
          <div>
            <p className="text-text-theme-muted">Terrain</p>
            <p className="text-text-theme-primary capitalize">
              {mapConfig.terrain.replace('_', ' ')}
            </p>
          </div>
          <div>
            <p className="text-text-theme-muted">Deployment</p>
            <p className="text-text-theme-primary capitalize">
              {mapConfig.playerDeploymentZone} vs{' '}
              {mapConfig.opponentDeploymentZone}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Per `add-skirmish-setup-ui` tasks 4 + 5: interactive editor for the
 * battlefield's hex radius and terrain preset. Surfaces the existing
 * encounter `mapConfig` as a controlled form and emits changes via
 * `onChange` so the parent can persist via `useEncounterStore.updateEncounter`.
 *
 * Discrete radius options are 5 / 8 / 12 / 17 (canonical sizes per the
 * roadmap; default 8 = 17×17 hex grid). Terrain presets are loaded
 * from the `TerrainPreset` enum so adding a new preset there
 * automatically surfaces here.
 */
interface MapConfigEditorProps {
  mapConfig: IMapConfiguration;
  onChange: (next: Partial<IMapConfiguration>) => void;
  disabled?: boolean;
}

export const MAP_RADIUS_OPTIONS = [5, 8, 12, 17] as const;

export function MapConfigEditor({
  mapConfig,
  onChange,
  disabled = false,
}: MapConfigEditorProps): React.ReactElement {
  const hexCount = (radius: number) => 1 + 3 * radius * (radius + 1);

  return (
    <Card className="mb-6" data-testid="map-config-editor">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Battlefield Configuration
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="map-radius-select"
              className="text-text-theme-muted mb-1 block text-xs"
            >
              Hex Radius
            </label>
            <select
              id="map-radius-select"
              data-testid="map-radius-select"
              className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
              value={mapConfig.radius}
              disabled={disabled}
              onChange={(e) => onChange({ radius: Number(e.target.value) })}
            >
              {MAP_RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} ({hexCount(r)} hexes)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="terrain-preset-select"
              className="text-text-theme-muted mb-1 block text-xs"
            >
              Terrain Preset
            </label>
            <select
              id="terrain-preset-select"
              data-testid="terrain-preset-select"
              className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
              value={mapConfig.terrain}
              disabled={disabled}
              onChange={(e) =>
                onChange({ terrain: e.target.value as TerrainPreset })
              }
            >
              {Object.values(TerrainPreset).map((preset) => (
                <option key={preset} value={preset}>
                  {preset
                    .replace('_', ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}

type PrimaryVictoryConditionType =
  | VictoryConditionType.DestroyAll
  | VictoryConditionType.Cripple
  | VictoryConditionType.Retreat
  | VictoryConditionType.Custom;

interface ScenarioRulesEditorProps {
  victoryConditions: readonly IVictoryCondition[];
  optionalRules: readonly string[];
  onChange: (next: {
    readonly victoryConditions?: readonly IVictoryCondition[];
    readonly optionalRules?: readonly string[];
  }) => void;
  disabled?: boolean;
}

interface ScenarioRuleOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export const SCENARIO_OPTIONAL_RULES: readonly ScenarioRuleOption[] = [
  {
    id: 'tacops_los1',
    label: 'TacOps LOS diagram',
    description: 'Use the represented TacOps line-of-sight diagram branch.',
  },
  {
    id: 'tacops_leg_damage',
    label: 'TacOps leg damage',
    description: 'Carry the TacOps leg-damage flag into movement validation.',
  },
  {
    id: 'tacops_trip_attack',
    label: 'TacOps trip attacks',
    description: 'Allow represented trip attack eligibility checks.',
  },
  {
    id: 'tacops_grappling',
    label: 'TacOps grappling',
    description: 'Allow represented grappling attack eligibility checks.',
  },
];

const PRIMARY_VICTORY_OPTIONS: readonly {
  readonly type: PrimaryVictoryConditionType;
  readonly label: string;
}[] = [
  { type: VictoryConditionType.DestroyAll, label: 'Destroy all enemies' },
  { type: VictoryConditionType.Cripple, label: 'Cripple enemy force' },
  { type: VictoryConditionType.Retreat, label: 'Force enemy retreat' },
  { type: VictoryConditionType.Custom, label: 'Custom objective' },
];

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function primaryVictoryCondition(
  conditions: readonly IVictoryCondition[],
): IVictoryCondition {
  return (
    conditions.find(
      (condition) => condition.type !== VictoryConditionType.TurnLimit,
    ) ?? {
      type: VictoryConditionType.DestroyAll,
    }
  );
}

function turnLimitFrom(conditions: readonly IVictoryCondition[]): number {
  return (
    conditions.find(
      (condition) => condition.type === VictoryConditionType.TurnLimit,
    )?.turnLimit ?? 0
  );
}

function buildVictoryConditions({
  primaryType,
  threshold,
  turnLimit,
  customDescription,
}: {
  readonly primaryType: PrimaryVictoryConditionType;
  readonly threshold: number;
  readonly turnLimit: number;
  readonly customDescription: string;
}): readonly IVictoryCondition[] {
  const next: IVictoryCondition[] = [];

  switch (primaryType) {
    case VictoryConditionType.Cripple:
      next.push({
        type: VictoryConditionType.Cripple,
        threshold: clampInteger(threshold, 1, 100),
      });
      break;
    case VictoryConditionType.Retreat:
      next.push({ type: VictoryConditionType.Retreat });
      break;
    case VictoryConditionType.Custom:
      next.push({
        type: VictoryConditionType.Custom,
        description: customDescription.trim() || 'Custom objective',
      });
      break;
    case VictoryConditionType.DestroyAll:
    default:
      next.push({ type: VictoryConditionType.DestroyAll });
      break;
  }

  if (turnLimit > 0) {
    next.push({
      type: VictoryConditionType.TurnLimit,
      turnLimit: clampInteger(turnLimit, 1, 99),
    });
  }

  return next;
}

function normalizedPrimaryType(
  condition: IVictoryCondition,
): PrimaryVictoryConditionType {
  if (
    condition.type === VictoryConditionType.Cripple ||
    condition.type === VictoryConditionType.Retreat ||
    condition.type === VictoryConditionType.Custom
  ) {
    return condition.type;
  }
  return VictoryConditionType.DestroyAll;
}

export function ScenarioRulesEditor({
  victoryConditions,
  optionalRules,
  onChange,
  disabled = false,
}: ScenarioRulesEditorProps): React.ReactElement {
  const primary = primaryVictoryCondition(victoryConditions);
  const primaryType = normalizedPrimaryType(primary);
  const threshold = primary.threshold ?? 50;
  const turnLimit = turnLimitFrom(victoryConditions);
  const customDescription = primary.description ?? '';

  const emitVictoryConditions = (
    patch: Partial<{
      readonly primaryType: PrimaryVictoryConditionType;
      readonly threshold: number;
      readonly turnLimit: number;
      readonly customDescription: string;
    }>,
  ) => {
    onChange({
      victoryConditions: buildVictoryConditions({
        primaryType: patch.primaryType ?? primaryType,
        threshold: patch.threshold ?? threshold,
        turnLimit: patch.turnLimit ?? turnLimit,
        customDescription: patch.customDescription ?? customDescription,
      }),
    });
  };

  const toggleOptionalRule = (ruleId: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...optionalRules, ruleId]))
      : optionalRules.filter((rule) => rule !== ruleId);
    onChange({ optionalRules: next });
  };

  return (
    <Card className="mb-6" data-testid="scenario-rules-editor">
      <div className="p-4">
        <h3 className="text-text-theme-secondary mb-3 text-sm font-medium">
          Scenario Rules
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="victory-condition-select"
              className="text-text-theme-muted mb-1 block text-xs"
            >
              Primary Objective
            </label>
            <select
              id="victory-condition-select"
              data-testid="victory-condition-select"
              className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
              value={primaryType}
              disabled={disabled}
              onChange={(event) =>
                emitVictoryConditions({
                  primaryType: event.target
                    .value as PrimaryVictoryConditionType,
                })
              }
            >
              {PRIMARY_VICTORY_OPTIONS.map((option) => (
                <option key={option.type} value={option.type}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="turn-limit-input"
              className="text-text-theme-muted mb-1 block text-xs"
            >
              Max Turns
            </label>
            <input
              id="turn-limit-input"
              data-testid="turn-limit-input"
              type="number"
              min={0}
              max={99}
              className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
              value={turnLimit}
              disabled={disabled}
              onChange={(event) =>
                emitVictoryConditions({
                  turnLimit: clampInteger(Number(event.target.value), 0, 99),
                })
              }
            />
          </div>

          {primaryType === VictoryConditionType.Cripple ? (
            <div>
              <label
                htmlFor="cripple-threshold-input"
                className="text-text-theme-muted mb-1 block text-xs"
              >
                Cripple Threshold %
              </label>
              <input
                id="cripple-threshold-input"
                data-testid="cripple-threshold-input"
                type="number"
                min={1}
                max={100}
                className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
                value={threshold}
                disabled={disabled}
                onChange={(event) =>
                  emitVictoryConditions({
                    threshold: clampInteger(Number(event.target.value), 1, 100),
                  })
                }
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="custom-objective-input"
                className="text-text-theme-muted mb-1 block text-xs"
              >
                Objective Notes
              </label>
              <input
                id="custom-objective-input"
                data-testid="custom-objective-input"
                type="text"
                className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
                value={
                  primaryType === VictoryConditionType.Custom
                    ? customDescription
                    : ''
                }
                disabled={
                  disabled || primaryType !== VictoryConditionType.Custom
                }
                placeholder="Escort, extraction, holdout..."
                onChange={(event) =>
                  emitVictoryConditions({
                    customDescription: event.target.value,
                  })
                }
              />
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {SCENARIO_OPTIONAL_RULES.map((rule) => (
            <label
              key={rule.id}
              className="border-border-theme-subtle bg-surface-raised/40 flex items-start gap-3 rounded border p-3"
            >
              <input
                type="checkbox"
                className="mt-1"
                data-testid={`optional-rule-${rule.id}`}
                checked={optionalRules.includes(rule.id)}
                disabled={disabled}
                onChange={(event) =>
                  toggleOptionalRule(rule.id, event.target.checked)
                }
              />
              <span>
                <span className="text-text-theme-primary block text-sm font-medium">
                  {rule.label}
                </span>
                <span className="text-text-theme-muted block text-xs">
                  {rule.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}

interface ScenarioTemplateCardProps {
  template: IScenarioTemplate;
}

export function ScenarioTemplateCard({
  template,
}: ScenarioTemplateCardProps): React.ReactElement {
  return (
    <Card
      className="border-accent/20 bg-accent/5 mb-6"
      data-testid="scenario-template-card"
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-accent text-sm font-medium">
              Scenario: {template.name}
            </h3>
            <p className="text-text-theme-muted mt-1 text-sm">
              {template.description}
            </p>
          </div>
          <Badge variant="cyan">{template.type}</Badge>
        </div>
      </div>
    </Card>
  );
}

/** BV imbalance threshold above which a warning is shown (spec § 8). */

export { ModeSelection } from './ModeSelection';
export { SkirmishLauncher } from './SkirmishLauncher';
