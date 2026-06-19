import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

export function SelectedUnitsList({
  side,
  selectedUnits,
  onRemove,
}: {
  readonly side: 'player' | 'opponent';
  readonly selectedUnits: readonly ISkirmishUnitSelection[];
  readonly onRemove: (unitId: string) => void;
}): React.ReactElement {
  if (selectedUnits.length === 0) {
    return (
      <p
        className="text-text-theme-muted text-sm italic"
        data-testid={`${side}-empty-roster-msg`}
      >
        No units selected. Pick from the catalog below.
      </p>
    );
  }

  return (
    <ul className="mb-4 space-y-2" data-testid={`${side}-selected-units`}>
      {selectedUnits.map((unit) => (
        <SelectedUnitRow
          key={unit.unitId}
          side={side}
          unit={unit}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}

function SelectedUnitRow({
  side,
  unit,
  onRemove,
}: {
  readonly side: 'player' | 'opponent';
  readonly unit: ISkirmishUnitSelection;
  readonly onRemove: (unitId: string) => void;
}): React.ReactElement {
  return (
    <li
      className="bg-surface-raised border-border-theme-subtle flex items-center justify-between rounded-lg border p-2"
      data-testid={`${side}-selected-unit-${unit.unitId}`}
    >
      <div>
        <p className="text-text-theme-primary text-sm font-medium">
          {unit.designation}
        </p>
        <p className="text-text-theme-muted text-xs">
          {unit.tonnage}T · {unit.bv.toLocaleString()} BV
          {unit.pilot ? <PilotSummary unit={unit} /> : <PilotNeeded />}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(unit.unitId)}
        className="text-text-theme-muted text-xs hover:text-red-400"
        data-testid={`${side}-remove-${unit.unitId}`}
        aria-label={`Remove ${unit.designation}`}
      >
        Remove
      </button>
    </li>
  );
}

function PilotSummary({
  unit,
}: {
  readonly unit: ISkirmishUnitSelection;
}): React.ReactElement | null {
  if (!unit.pilot) return null;

  return (
    <span className="ml-2 text-emerald-400">
      · {unit.pilot.callsign} {unit.pilot.gunnery}/{unit.pilot.piloting}
    </span>
  );
}

function PilotNeeded(): React.ReactElement {
  return <span className="ml-2 text-amber-400">· pilot needed</span>;
}
