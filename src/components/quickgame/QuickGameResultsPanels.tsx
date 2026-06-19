import type { IDamageAssessment } from '@/services/game-resolution/DamageCalculator';
import type { IGameEvent } from '@/types/gameplay';
import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import type {
  QuickGameResultsViewModel,
  QuickGameUnitRow,
} from './quickGameResults.derived';
import type { ResultsTab } from './quickGameResults.helpers';

import { DamageMatrix } from './DamageMatrix';
import { QuickGameReplayPanel } from './QuickGameReplayPanel';
import {
  BattleSummary,
  TimelineEventRow,
  UnitStatusRow,
} from './QuickGameResultsSections';

export function ResultsTabPanels({
  activeTab,
  gameId,
  scenario,
  events,
  viewModel,
  keyMoments,
}: {
  readonly activeTab: ResultsTab;
  readonly gameId: string;
  readonly scenario: {
    readonly template: { readonly name: string };
    readonly mapPreset: {
      readonly name: string;
      readonly biome: string;
    };
  } | null;
  readonly events: readonly IGameEvent[];
  readonly viewModel: QuickGameResultsViewModel;
  readonly keyMoments: readonly IKeyMoment[];
}): React.ReactElement {
  return (
    <>
      <SummaryPanel
        activeTab={activeTab}
        scenario={scenario}
        viewModel={viewModel}
        keyMoments={keyMoments}
      />
      <UnitsPanel
        activeTab={activeTab}
        units={viewModel.allUnits}
        events={events}
        damageAssessments={viewModel.unitDamageMap}
      />
      <DamagePanel
        activeTab={activeTab}
        events={events}
        units={viewModel.damageUnits}
      />
      <TimelinePanel activeTab={activeTab} events={events} />
      <ReplayPanel activeTab={activeTab} events={events} gameId={gameId} />
    </>
  );
}

function SummaryPanel({
  activeTab,
  scenario,
  viewModel,
  keyMoments,
}: {
  readonly activeTab: ResultsTab;
  readonly scenario: {
    readonly template: { readonly name: string };
    readonly mapPreset: {
      readonly name: string;
      readonly biome: string;
    };
  } | null;
  readonly viewModel: QuickGameResultsViewModel;
  readonly keyMoments: readonly IKeyMoment[];
}): React.ReactElement {
  return (
    <div
      role="tabpanel"
      id="tabpanel-summary"
      aria-labelledby="tab-summary"
      hidden={activeTab !== 'summary'}
      className="p-4"
    >
      <BattleSummary
        outcome={viewModel.outcome}
        combatStats={viewModel.combatStats}
        keyMoments={keyMoments}
      />
      {scenario && <ScenarioSummary scenario={scenario} />}
    </div>
  );
}

function ScenarioSummary({
  scenario,
}: {
  readonly scenario: {
    readonly template: { readonly name: string };
    readonly mapPreset: {
      readonly name: string;
      readonly biome: string;
    };
  };
}): React.ReactElement {
  return (
    <div className="mt-4 rounded-lg bg-gray-800/50 p-4">
      <h4 className="mb-2 text-sm font-medium text-gray-300">Scenario</h4>
      <p className="text-white">{scenario.template.name}</p>
      <p className="mt-1 text-xs text-gray-500">
        {scenario.mapPreset.name} - {scenario.mapPreset.biome}
      </p>
    </div>
  );
}

function UnitsPanel({
  activeTab,
  units,
  events,
  damageAssessments,
}: {
  readonly activeTab: ResultsTab;
  readonly units: readonly QuickGameUnitRow[];
  readonly events: readonly IGameEvent[];
  readonly damageAssessments: ReadonlyMap<string, IDamageAssessment>;
}): React.ReactElement {
  return (
    <div
      role="tabpanel"
      id="tabpanel-units"
      aria-labelledby="tab-units"
      hidden={activeTab !== 'units'}
    >
      {units.length === 0 ? (
        <p className="p-4 text-center text-gray-400">
          No units in this battle.
        </p>
      ) : (
        <div className="divide-y divide-gray-700/50">
          {units.map(({ unit, forceType }) => (
            <UnitStatusRow
              key={unit.instanceId}
              unit={unit}
              forceType={forceType}
              events={events}
              damageAssessment={damageAssessments.get(unit.instanceId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DamagePanel({
  activeTab,
  events,
  units,
}: {
  readonly activeTab: ResultsTab;
  readonly events: readonly IGameEvent[];
  readonly units: QuickGameResultsViewModel['damageUnits'];
}): React.ReactElement {
  return (
    <div
      role="tabpanel"
      id="tabpanel-damage"
      aria-labelledby="tab-damage"
      hidden={activeTab !== 'damage'}
      className="p-4"
    >
      <DamageMatrix events={events} units={units} />
    </div>
  );
}

function TimelinePanel({
  activeTab,
  events,
}: {
  readonly activeTab: ResultsTab;
  readonly events: readonly IGameEvent[];
}): React.ReactElement {
  return (
    <div
      role="tabpanel"
      id="tabpanel-timeline"
      aria-labelledby="tab-timeline"
      hidden={activeTab !== 'timeline'}
    >
      {events.length === 0 ? (
        <p className="p-4 text-center text-gray-400">No events recorded.</p>
      ) : (
        <div className="max-h-96 divide-y divide-gray-700/30 overflow-y-auto">
          {events.map((event, index) => (
            <TimelineEventRow key={event.id} event={event} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplayPanel({
  activeTab,
  events,
  gameId,
}: {
  readonly activeTab: ResultsTab;
  readonly events: readonly IGameEvent[];
  readonly gameId: string;
}): React.ReactElement {
  return (
    <div
      role="tabpanel"
      id="tabpanel-replay"
      aria-labelledby="tab-replay"
      hidden={activeTab !== 'replay'}
    >
      {activeTab === 'replay' && (
        <QuickGameReplayPanel events={events} gameId={gameId} />
      )}
    </div>
  );
}
