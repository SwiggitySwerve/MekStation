import type {
  ILoadout,
  ISelectedPilot,
  ISelectedUnit,
  LobbySide,
} from '@/types/gameplay/GameLobbyInterfaces';
import type { IPilot } from '@/types/pilot';

interface LoadoutCardProps {
  readonly side: LobbySide;
  readonly title: string;
  readonly loadout: ILoadout;
  readonly ready: boolean;
  readonly editable: boolean;
  readonly availableUnits: readonly ISelectedUnit[];
  readonly pilots: readonly IPilot[];
  readonly assignedPilotIds: ReadonlySet<string>;
  readonly onChange: (loadout: ILoadout) => void;
}

export function LoadoutCard({
  side,
  title,
  loadout,
  ready,
  editable,
  availableUnits,
  pilots,
  assignedPilotIds,
  onChange,
}: LoadoutCardProps): React.ReactElement {
  const selectedUnitIds = new Set(loadout.units.map((unit) => unit.unitId));
  const remainingUnits = availableUnits.filter(
    (unit) => !selectedUnitIds.has(unit.unitId),
  );
  const canAdd = editable && loadout.units.length < 4;

  return (
    <section
      aria-label={`${title} loadout`}
      className="rounded-lg border border-slate-800 bg-slate-950 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <ReadyBadge ready={ready} />
      </div>

      {loadout.units.length === 0 ? (
        <p className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-400">
          No mechs selected
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {loadout.units.map((unit) => {
            const selectedPilotId =
              loadout.pilots.find((pilot) => pilot.unitId === unit.unitId)
                ?.pilotId ?? '';
            return (
              <li
                key={unit.unitId}
                className="rounded-md border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-100">
                      {unit.designation}
                    </p>
                    <p className="text-xs text-slate-400">
                      {unit.tonnage}T / {unit.bv.toLocaleString()} BV
                    </p>
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => removeUnit(loadout, unit.unitId, onChange)}
                      className="rounded border border-rose-800 px-2 py-1 text-xs text-rose-200 hover:bg-rose-950"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label className="mt-3 block text-sm">
                  <span className="text-slate-300">Pilot</span>
                  <select
                    aria-label={`${title} pilot for ${unit.designation}`}
                    value={selectedPilotId}
                    disabled={!editable}
                    onChange={(event) =>
                      assignPilot(
                        loadout,
                        unit.unitId,
                        pilots,
                        event.target.value,
                        onChange,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
                  >
                    <option value="">No pilot</option>
                    {pilots.map((pilot) => {
                      const label =
                        pilot.callsign ?? pilot.name ?? `Pilot ${pilot.id}`;
                      const assignedElsewhere =
                        assignedPilotIds.has(pilot.id) &&
                        pilot.id !== selectedPilotId;
                      return (
                        <option key={pilot.id} value={pilot.id}>
                          {label} G{pilot.skills.gunnery}/P
                          {pilot.skills.piloting}
                          {assignedElsewhere ? ' (move)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <label className="mt-4 block text-sm">
        <span className="text-slate-300">Add mech</span>
        <select
          aria-label={`Add unit to ${title} loadout`}
          disabled={!canAdd}
          value=""
          onChange={(event) => {
            const unit = availableUnits.find(
              (candidate) => candidate.unitId === event.target.value,
            );
            if (unit) {
              onChange({
                ...loadout,
                units: [...loadout.units, unit],
              });
            }
          }}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
        >
          <option value="">
            {editable ? 'Choose a mech' : 'Remote loadout is read only'}
          </option>
          {remainingUnits.map((unit) => (
            <option key={unit.unitId} value={unit.unitId}>
              {unit.designation} ({unit.tonnage}T)
            </option>
          ))}
        </select>
      </label>

      <p className="mt-3 text-xs text-slate-500">
        {side === 'host' ? 'Player side' : 'Opponent side'}
      </p>
    </section>
  );
}

export function ReadyBadge({
  ready,
}: {
  readonly ready: boolean;
}): React.ReactElement {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${
        ready
          ? 'bg-emerald-800 text-emerald-100'
          : 'bg-slate-800 text-slate-300'
      }`}
    >
      {ready ? 'Ready' : 'Not ready'}
    </span>
  );
}

function removeUnit(
  loadout: ILoadout,
  unitId: string,
  onChange: (loadout: ILoadout) => void,
): void {
  onChange({
    units: loadout.units.filter((unit) => unit.unitId !== unitId),
    pilots: loadout.pilots.filter((pilot) => pilot.unitId !== unitId),
  });
}

function assignPilot(
  loadout: ILoadout,
  unitId: string,
  pilots: readonly IPilot[],
  pilotId: string,
  onChange: (loadout: ILoadout) => void,
): void {
  const otherPilots = loadout.pilots.filter((pilot) => {
    return pilot.unitId !== unitId && pilot.pilotId !== pilotId;
  });

  if (!pilotId) {
    onChange({ ...loadout, pilots: otherPilots });
    return;
  }

  const pilot = pilots.find((candidate) => candidate.id === pilotId);
  if (!pilot) return;

  const selectedPilot: ISelectedPilot = {
    pilotId: pilot.id,
    unitId,
    callsign: pilot.callsign ?? pilot.name,
    gunnery: pilot.skills.gunnery,
    piloting: pilot.skills.piloting,
  };

  onChange({
    ...loadout,
    pilots: [...otherPilots, selectedPilot],
  });
}
