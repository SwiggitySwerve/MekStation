import { Button, Card, Badge } from '@/components/ui';
import { UNIT_TEMPLATES } from '@/simulation/generator';

import type { RosterStepProps } from './CreateCampaignPage.types';

import { getAssignedUnitIdForPilot } from './CreateCampaignPage.utils';

export function RosterStep({
  selectedUnits,
  selectedPilots,
  pilotAssignments,
  onAddTemplateUnit,
  onRemoveUnit,
  onAddPilot,
  onRemovePilot,
  onAssignPilot,
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

        <div className="mb-4 grid grid-cols-2 gap-2">
          {UNIT_TEMPLATES.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => onAddTemplateUnit(template.name, template.tonnage)}
              className="border-border-theme-subtle bg-surface-deep hover:border-accent/50 hover:bg-surface-raised/50 flex items-center gap-3 rounded-lg border p-3 text-left transition-all"
              data-testid={`add-unit-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="bg-accent/10 text-accent flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold">
                {template.tonnage}t
              </div>
              <div>
                <div className="text-text-theme-primary text-sm font-medium">
                  {template.name}
                </div>
                <div className="text-text-theme-muted text-xs">
                  Walk {template.walkMP} / Jump {template.jumpMP}
                </div>
              </div>
            </button>
          ))}
        </div>

        {selectedUnits.length > 0 && (
          <div className="space-y-2">
            {selectedUnits.map((unit) => (
              <div
                key={unit.id}
                className="bg-surface-deep border-border-theme-subtle flex items-center justify-between rounded-lg border p-3"
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
