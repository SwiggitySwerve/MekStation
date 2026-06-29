import type { ReactElement } from 'react';

import { Card } from '@/components/ui';
import {
  VictoryConditionType,
  type IVictoryCondition,
} from '@/types/encounter';

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
}: ScenarioRulesEditorProps): ReactElement {
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
