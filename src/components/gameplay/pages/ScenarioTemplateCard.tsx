import type { ReactElement } from 'react';

import { Badge, Card } from '@/components/ui';
import {
  TerrainPreset,
  VictoryConditionType,
  type IMapConfiguration,
  type IScenarioTemplate,
  type IVictoryCondition,
} from '@/types/encounter';

interface ScenarioTemplateCardProps {
  template: IScenarioTemplate;
}

function formatTerrainPreset(terrain: TerrainPreset): string {
  return terrain
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatVictoryCondition(condition: IVictoryCondition): string {
  switch (condition.type) {
    case VictoryConditionType.Cripple:
      return `Cripple enemy force at ${condition.threshold ?? 50}%`;
    case VictoryConditionType.Retreat:
      return 'Force enemy retreat';
    case VictoryConditionType.TurnLimit:
      return condition.turnLimit
        ? `${condition.turnLimit} turn limit`
        : 'Turn limit';
    case VictoryConditionType.Custom:
      return condition.description?.trim() || 'Custom objective';
    case VictoryConditionType.DestroyAll:
    default:
      return 'Destroy all enemies';
  }
}

function formatVictoryConditions(
  conditions: readonly IVictoryCondition[],
): string {
  return conditions.map(formatVictoryCondition).join(' + ');
}

function formatMapDefault(mapConfig: IMapConfiguration): string {
  const width = mapConfig.radius * 2 + 1;
  return `Radius ${mapConfig.radius} (${width}x${width}), ${formatTerrainPreset(
    mapConfig.terrain,
  )}`;
}

function formatSuggestedBvRange(template: IScenarioTemplate): string {
  return `${template.suggestedBVRange.min.toLocaleString()} - ${template.suggestedBVRange.max.toLocaleString()} BV`;
}

export function ScenarioTemplateCard({
  template,
}: ScenarioTemplateCardProps): ReactElement {
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
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div data-testid="scenario-template-objective">
            <span className="text-text-theme-muted block text-xs">
              Default Objective
            </span>
            <span className="text-text-theme-primary">
              {formatVictoryConditions(template.defaultVictoryConditions)}
            </span>
          </div>
          <div data-testid="scenario-template-map-default">
            <span className="text-text-theme-muted block text-xs">
              Battlefield
            </span>
            <span className="text-text-theme-primary">
              {formatMapDefault(template.defaultMapConfig)}
            </span>
          </div>
          <div data-testid="scenario-template-unit-target">
            <span className="text-text-theme-muted block text-xs">
              Force Target
            </span>
            <span className="text-text-theme-primary">
              {template.suggestedUnitCount}{' '}
              {template.suggestedUnitCount === 1 ? 'unit' : 'units'} per side
            </span>
          </div>
          <div data-testid="scenario-template-bv-band">
            <span className="text-text-theme-muted block text-xs">BV Band</span>
            <span className="text-text-theme-primary">
              {formatSuggestedBvRange(template)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
