import { useEffect, useState } from 'react';

import { Button, Card, Badge } from '@/components/ui';
import { WIZARD_REPRESENTATIVE_UNITS } from '@/lib/campaign/wizard/representativeUnits';
import { getCustomUnitService } from '@/services/units';
import { UNIT_TEMPLATES } from '@/simulation/generator';

import type { RosterStepProps } from './CreateCampaignPage.types';
import type { SavedDesignOption } from './savedCustomUnitCampaignAdapter';

import { getAssignedUnitIdForPilot } from './CreateCampaignPage.utils';
import { validateSavedBattleMechIndex } from './savedCustomUnitCampaignAdapter';

const EXPECTED_WIZARD_TEMPLATE_COUNT = 4;

function getWizardTemplateOptions() {
  if (
    UNIT_TEMPLATES.length !== EXPECTED_WIZARD_TEMPLATE_COUNT ||
    WIZARD_REPRESENTATIVE_UNITS.length !== EXPECTED_WIZARD_TEMPLATE_COUNT ||
    UNIT_TEMPLATES.length !== WIZARD_REPRESENTATIVE_UNITS.length
  ) {
    throw new Error(
      'Campaign wizard templates and representative units must stay aligned by weight class order.',
    );
  }

  return UNIT_TEMPLATES.map((template, index) => ({
    template,
    representativeUnit: WIZARD_REPRESENTATIVE_UNITS[index],
  }));
}

const WIZARD_TEMPLATE_OPTIONS = getWizardTemplateOptions();

function SavedDesignsGroup({
  loadSavedDesignIndex,
  onAdd,
}: {
  loadSavedDesignIndex: () => Promise<readonly unknown[]>;
  onAdd: (name: string, tonnage: number, unitRef: string) => void;
}): React.ReactElement {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    options: readonly SavedDesignOption[];
    rejected: number;
  }>({ status: 'loading', options: [], rejected: 0 });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading', options: [], rejected: 0 });
    void loadSavedDesignIndex()
      .then((rows) => {
        if (!live) return;
        const mapped = validateSavedBattleMechIndex(rows);
        setState({
          status: 'ready',
          options: mapped.options,
          rejected: mapped.rejected.length,
        });
      })
      .catch(() => {
        if (live) setState({ status: 'error', options: [], rejected: 0 });
      });
    return () => {
      live = false;
    };
  }, [tick, loadSavedDesignIndex]);
  const { status, options, rejected } = state;
  const statusMessage =
    status === 'loading'
      ? 'Loading saved designs'
      : status === 'error'
        ? 'Saved designs unavailable'
        : options.length === 0
          ? 'No saved designs'
          : rejected > 0
            ? `${rejected} saved designs unavailable`
            : `${options.length} saved designs ready`;
  return (
    <div className="mb-4">
      <h3
        className="text-text-theme-primary mb-2 text-sm font-medium"
        data-camp01-fixture-alias="Saved Designs"
        data-camp01-fixture-id="camp01-picker-saved-design"
      >
        Saved Designs
      </h3>
      <p className="text-text-theme-muted mb-2 text-xs" role="status">
        {statusMessage}
      </p>
      {status === 'error' ? (
        <Button
          variant="secondary"
          size="sm"
          aria-label="Retry saved designs"
          onClick={() => setTick((value) => value + 1)}
        >
          Retry
        </Button>
      ) : null}
      {status === 'ready' && options.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-label={`Add saved design ${option.name}`}
              data-testid={`add-saved-design-${option.id}`}
              onClick={() => onAdd(option.name, option.tonnage, option.id)}
              className="border-border-theme-subtle bg-surface-deep hover:border-accent/50 flex items-center gap-3 rounded-lg border p-3 text-left"
            >
              <span className="text-accent text-sm font-bold">
                {option.tonnage}t
              </span>
              <span className="text-text-theme-primary text-sm font-medium">
                {option.name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RosterStep({
  selectedUnits,
  selectedPilots,
  pilotAssignments,
  onAddTemplateUnit,
  onRemoveUnit,
  onAddPilot,
  onRemovePilot,
  onAssignPilot,
  loadSavedDesignIndex = () => getCustomUnitService().list(),
}: RosterStepProps): React.ReactElement {
  return (
    <Card className="mx-auto max-w-2xl">
      <h2 className="text-text-theme-primary mb-2 text-xl font-semibold">
        Configure Roster
      </h2>
      <p className="text-text-theme-secondary mb-6">
        Select BattleMechs and assign pilots for your campaign
      </p>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-text-theme-primary text-sm font-medium">
            Units ({selectedUnits.length})
          </h3>
        </div>

        <h3
          className="text-text-theme-primary mb-2 text-sm font-medium"
          data-camp01-fixture-alias="Stock Templates"
          data-camp01-fixture-id="camp01-picker-stock-template"
        >
          Stock Templates
        </h3>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {WIZARD_TEMPLATE_OPTIONS.map(({ template, representativeUnit }) => (
            <button
              key={representativeUnit.unitRef}
              type="button"
              aria-label={`Add stock template ${representativeUnit.unitName}`}
              onClick={() =>
                onAddTemplateUnit(
                  representativeUnit.unitName,
                  template.tonnage,
                  representativeUnit.unitRef,
                )
              }
              className="border-border-theme-subtle bg-surface-deep hover:border-accent/50 hover:bg-surface-raised/50 flex items-center gap-3 rounded-lg border p-3 text-left transition-all"
              data-testid={`add-unit-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="bg-accent/10 text-accent flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold">
                {template.tonnage}t
              </div>
              <div>
                <div className="text-text-theme-primary text-sm font-medium">
                  {representativeUnit.weightClass} -{' '}
                  {representativeUnit.unitName}
                </div>
                <div className="text-text-theme-muted text-xs">
                  Walk {template.walkMP} / Jump {template.jumpMP}
                </div>
              </div>
            </button>
          ))}
        </div>

        <SavedDesignsGroup
          loadSavedDesignIndex={loadSavedDesignIndex}
          onAdd={(name, tonnage, unitRef) =>
            onAddTemplateUnit(name, tonnage, unitRef, 'custom')
          }
        />

        {selectedUnits.length > 0 && (
          <div className="space-y-2">
            {selectedUnits.map((unit) => (
              <div
                key={unit.id}
                className="bg-surface-deep border-border-theme-subtle flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                data-testid={`roster-unit-${unit.id}`}
                data-unit-ref={unit.unitRef ?? ''}
                data-unit-source={unit.unitSource ?? ''}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="emerald" size="sm">
                    {unit.tonnage}t
                  </Badge>
                  <span className="text-text-theme-primary text-sm font-medium">
                    {unit.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Assign pilot to ${unit.name}`}
                    value={pilotAssignments[unit.id] ?? ''}
                    onChange={(event) =>
                      onAssignPilot(unit.id, event.target.value)
                    }
                    className="bg-surface-raised border-border-theme-subtle text-text-theme-primary rounded border px-2 py-1 text-xs"
                  >
                    <option value="">No pilot</option>
                    {selectedPilots.map((pilot) => (
                      <option key={pilot.id} value={pilot.id}>
                        {pilot.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`Remove ${unit.name} from roster`}
                    onClick={() => onRemoveUnit(unit.id)}
                    className="text-text-theme-muted p-1 transition-colors hover:text-red-400"
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

        {selectedUnits.length === 0 && (
          <p className="text-text-theme-muted py-4 text-center text-sm">
            Click a unit type above to add it to your roster
          </p>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-text-theme-primary text-sm font-medium">
            Pilots ({selectedPilots.length})
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddPilot}
            data-testid="add-pilot-btn"
          >
            Add Pilot
          </Button>
        </div>

        {selectedPilots.length > 0 ? (
          <div className="space-y-2">
            {selectedPilots.map((pilot) => {
              const assignedUnitId = getAssignedUnitIdForPilot(
                pilotAssignments,
                pilot.id,
              );
              const unitName = assignedUnitId
                ? selectedUnits.find((unit) => unit.id === assignedUnitId)?.name
                : undefined;

              return (
                <div
                  key={pilot.id}
                  className="bg-surface-deep border-border-theme-subtle flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <span className="text-text-theme-primary text-sm font-medium">
                        {pilot.name}
                      </span>
                      {unitName && (
                        <span className="text-text-theme-muted ml-2 text-xs">
                          -&gt; {unitName}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${pilot.name} from roster`}
                    onClick={() => onRemovePilot(pilot.id)}
                    className="text-text-theme-muted p-1 transition-colors hover:text-red-400"
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
              );
            })}
          </div>
        ) : (
          <p className="text-text-theme-muted py-4 text-center text-sm">
            Add pilots to crew your BattleMechs
          </p>
        )}
      </div>
    </Card>
  );
}
