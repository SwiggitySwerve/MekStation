import Link from 'next/link';

import type {
  IEncounter,
  IEncounterValidationResult,
  IScenarioTemplate,
} from '@/types/encounter';

import {
  SkeletonFormSection,
  SkeletonText,
} from '@/components/common/SkeletonLoader';
import { Card, PageLayout } from '@/components/ui';
import { VictoryConditionType } from '@/types/encounter';

function getVictoryConditionLabel(type: VictoryConditionType): string {
  switch (type) {
    case VictoryConditionType.DestroyAll:
      return 'Destroy All Enemies';
    case VictoryConditionType.Cripple:
      return 'Cripple Enemy Force';
    case VictoryConditionType.Retreat:
      return 'Force Enemy Retreat';
    case VictoryConditionType.TurnLimit:
      return 'Turn Limit';
    case VictoryConditionType.Custom:
      return 'Custom Objective';
    default:
      return type;
  }
}

export function EncounterDetailLoadingState(): React.ReactElement {
  return (
    <PageLayout
      title="Loading..."
      backLink="/gameplay/encounters"
      backLabel="Back to Encounters"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonFormSection title="Forces">
          <div className="mb-4">
            <SkeletonText width="w-24" className="mb-2" />
            <div className="bg-surface-raised/50 space-y-2 rounded-lg p-3">
              <SkeletonText width="w-32" />
              <SkeletonText width="w-48" />
            </div>
          </div>
          <div>
            <SkeletonText width="w-28" className="mb-2" />
            <div className="bg-surface-raised/50 space-y-2 rounded-lg p-3">
              <SkeletonText width="w-32" />
              <SkeletonText width="w-48" />
            </div>
          </div>
        </SkeletonFormSection>

        <SkeletonFormSection title="Battle Settings">
          <div className="space-y-4">
            <div>
              <SkeletonText width="w-16" className="mb-2" />
              <SkeletonText width="w-40" />
            </div>
            <div>
              <SkeletonText width="w-24" className="mb-2" />
              <SkeletonText width="w-32" />
              <SkeletonText width="w-48" />
            </div>
          </div>
        </SkeletonFormSection>
      </div>
    </PageLayout>
  );
}

export function EncounterDetailNotFoundState(): React.ReactElement {
  return (
    <PageLayout title="Encounter Not Found" backLink="/gameplay/encounters">
      <Card>
        <p className="text-text-theme-secondary">
          The requested encounter could not be found.
        </p>
        <Link
          href="/gameplay/encounters"
          className="text-accent mt-4 inline-block hover:underline"
        >
          Return to Encounters
        </Link>
      </Card>
    </PageLayout>
  );
}

interface EncounterValidationCardProps {
  validation: IEncounterValidationResult | null;
}

export function EncounterValidationCard({
  validation,
}: EncounterValidationCardProps): React.ReactElement | null {
  if (!validation || (validation.valid && validation.warnings.length === 0)) {
    return null;
  }

  return (
    <Card className="mb-6 border-yellow-600/30 bg-yellow-900/10">
      {validation.errors.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-red-400">
            Configuration Required
          </h3>
          <ul className="space-y-1">
            {validation.errors.map((errorText, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-red-300"
              >
                <span className="mt-0.5 text-red-400">•</span>
                {errorText}
              </li>
            ))}
          </ul>
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-yellow-400">Warnings</h3>
          <ul className="space-y-1">
            {validation.warnings.map((warningText, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-yellow-300"
              >
                <span className="mt-0.5 text-yellow-400">•</span>
                {warningText}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

interface EncounterForcesCardProps {
  encounter: IEncounter;
  encounterId: string;
}

export function EncounterForcesCard({
  encounter,
  encounterId,
}: EncounterForcesCardProps): React.ReactElement {
  return (
    <Card data-testid="forces-card">
      <h2 className="text-text-theme-primary mb-4 text-lg font-medium">
        Forces
      </h2>

      <div className="mb-4" data-testid="player-force-section">
        <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
          Player Force
        </h3>
        {encounter.playerForce ? (
          <div
            className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
            data-testid="player-force-info"
          >
            <div
              className="text-text-theme-primary font-medium"
              data-testid="player-force-name"
            >
              {encounter.playerForce.forceName || 'Selected'}
            </div>
            <div
              className="text-text-theme-muted mt-1 text-sm"
              data-testid="player-force-stats"
            >
              {encounter.playerForce.unitCount} units •{' '}
              {encounter.playerForce.totalBV.toLocaleString()} BV
            </div>
          </div>
        ) : (
          <div
            className="border-border-theme-subtle rounded-lg border-2 border-dashed p-3"
            data-testid="player-force-empty"
          >
            <p className="text-text-theme-muted text-sm">
              No player force selected
            </p>
            <Link
              href={`/gameplay/encounters/${encounterId}/select-force?type=player`}
              className="text-accent mt-2 inline-block text-sm hover:underline"
              data-testid="select-player-force-link"
            >
              Select Player Force
            </Link>
          </div>
        )}
      </div>

      <div data-testid="opponent-force-section">
        <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
          Opponent Force
        </h3>
        {encounter.opponentForce ? (
          <div
            className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
            data-testid="opponent-force-info"
          >
            <div
              className="text-text-theme-primary font-medium"
              data-testid="opponent-force-name"
            >
              {encounter.opponentForce.forceName || 'Selected'}
            </div>
            <div
              className="text-text-theme-muted mt-1 text-sm"
              data-testid="opponent-force-stats"
            >
              {encounter.opponentForce.unitCount} units •{' '}
              {encounter.opponentForce.totalBV.toLocaleString()} BV
            </div>
          </div>
        ) : encounter.opForConfig ? (
          <div
            className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
            data-testid="opfor-config-info"
          >
            <div className="text-text-theme-primary font-medium">
              Generated OpFor
            </div>
            <div className="text-text-theme-muted mt-1 text-sm">
              Target BV:{' '}
              {encounter.opForConfig.targetBV?.toLocaleString() ||
                `${encounter.opForConfig.targetBVPercent}% of player`}
            </div>
          </div>
        ) : (
          <div
            className="border-border-theme-subtle rounded-lg border-2 border-dashed p-3"
            data-testid="opponent-force-empty"
          >
            <p className="text-text-theme-muted text-sm">
              No opponent configured
            </p>
            <Link
              href={`/gameplay/encounters/${encounterId}/select-force?type=opponent`}
              className="text-accent mt-2 inline-block text-sm hover:underline"
              data-testid="select-opponent-force-link"
            >
              Select Opponent Force
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

interface EncounterBattleSettingsCardProps {
  encounter: IEncounter;
  template: IScenarioTemplate | null;
}

export function EncounterBattleSettingsCard({
  encounter,
  template,
}: EncounterBattleSettingsCardProps): React.ReactElement {
  return (
    <Card data-testid="battle-settings-card">
      <h2 className="text-text-theme-primary mb-4 text-lg font-medium">
        Battle Settings
      </h2>

      {template && (
        <div
          className="bg-accent/10 border-accent/20 mb-4 rounded-lg border p-3"
          data-testid="encounter-template"
        >
          <div className="text-accent text-sm">
            Using Template: {template.name}
          </div>
        </div>
      )}

      <div className="mb-4" data-testid="map-config-section">
        <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
          Map
        </h3>
        <div className="text-text-theme-primary text-sm" data-testid="map-size">
          {encounter.mapConfig.radius * 2 + 1}x
          {encounter.mapConfig.radius * 2 + 1} hex grid
        </div>
        <div
          className="text-text-theme-muted text-sm"
          data-testid="map-terrain"
        >
          Terrain: {encounter.mapConfig.terrain}
        </div>
        <div
          className="text-text-theme-muted text-sm"
          data-testid="deployment-zones"
        >
          Player deploys: {encounter.mapConfig.playerDeploymentZone} | Opponent:{' '}
          {encounter.mapConfig.opponentDeploymentZone}
        </div>
      </div>

      <div data-testid="victory-conditions-section">
        <h3 className="text-text-theme-secondary mb-2 text-sm font-medium">
          Victory Conditions
        </h3>
        {encounter.victoryConditions.length > 0 ? (
          <ul className="space-y-1" data-testid="victory-conditions-list">
            {encounter.victoryConditions.map((victoryCondition, index) => (
              <li
                key={index}
                className="text-text-theme-primary flex items-center gap-2 text-sm"
                data-testid={`victory-condition-${index}`}
              >
                <span className="text-accent">•</span>
                {getVictoryConditionLabel(victoryCondition.type)}
                {victoryCondition.turnLimit &&
                  ` (${victoryCondition.turnLimit} turns)`}
                {victoryCondition.threshold &&
                  ` (${victoryCondition.threshold}%)`}
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="text-text-theme-muted text-sm"
            data-testid="no-victory-conditions"
          >
            No victory conditions set
          </p>
        )}
      </div>
    </Card>
  );
}
