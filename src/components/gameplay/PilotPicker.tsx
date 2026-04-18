/**
 * PilotPicker
 *
 * Per-unit pilot picker for the pre-battle skirmish setup screen. Lists
 * persistent pilots from `usePilotStore`, surfaces gunnery / piloting
 * + special abilities, and lets the user assign or swap a pilot for any
 * unit slot. If a pilot is already on a different unit (same side or
 * the opposing side), assigning them MOVES them rather than duplicating.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/tasks.md § 3 (Per-side Pilot Picker)
 */

import { useMemo } from 'react';

import type { IPilot } from '@/types/pilot';
import type { ISkirmishUnitSelection } from '@/utils/gameplay/preBattleSessionBuilder';

import { Badge, Card } from '@/components/ui';

// =============================================================================
// Public Props
// =============================================================================

export interface PilotPickerProps {
  /** Visual identifier (Player vs Opponent) — drives accent color. */
  side: 'player' | 'opponent';
  /** Display title (e.g. "Player Pilot Assignments"). */
  title: string;
  /** All pilots loaded from the pilot store. */
  pilots: readonly IPilot[];
  /** Units the user has picked for this side. */
  units: readonly ISkirmishUnitSelection[];
  /**
   * Pilots currently assigned across BOTH sides. Used so the dropdown
   * can flag duplicates ("already on Phoenix Hawk PXH-1") and the
   * caller can move rather than duplicate.
   */
  assignedPilotIds: ReadonlySet<string>;
  /** Assign a pilot to a specific unit slot. */
  onAssignPilot: (unitId: string, pilot: IPilot | null) => void;
}

// =============================================================================
// Component
// =============================================================================

export function PilotPicker({
  side,
  title,
  pilots,
  units,
  assignedPilotIds,
  onAssignPilot,
}: PilotPickerProps): React.ReactElement {
  const isOpponent = side === 'opponent';
  const accentClass = isOpponent
    ? 'border-red-500/30 text-red-400'
    : 'border-cyan-500/30 text-cyan-400';

  // Sort pilots by gunnery (best first) for ergonomic picking.
  const sortedPilots = useMemo(() => {
    return [...pilots].sort((a, b) => {
      if (a.skills.gunnery !== b.skills.gunnery) {
        return a.skills.gunnery - b.skills.gunnery;
      }
      return a.skills.piloting - b.skills.piloting;
    });
  }, [pilots]);

  return (
    <Card
      className={`mb-6 border ${accentClass}`}
      data-testid={`${side}-pilot-picker`}
    >
      <div className="border-border-theme-subtle border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-medium ${accentClass}`}>{title}</h3>
          <Badge variant={isOpponent ? 'red' : 'cyan'}>
            {units.filter((u) => u.pilot).length} / {units.length} assigned
          </Badge>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {units.length === 0 ? (
          <p
            className="text-text-theme-muted text-sm italic"
            data-testid={`${side}-pilot-picker-empty`}
          >
            Pick units first, then assign pilots.
          </p>
        ) : (
          units.map((unit) => {
            const selectedPilotId = unit.pilot?.pilotId ?? '';
            return (
              <div
                key={unit.unitId}
                className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3"
                data-testid={`${side}-pilot-slot-${unit.unitId}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-text-theme-primary text-sm font-medium">
                    {unit.designation}
                  </p>
                  {unit.pilot ? (
                    <span
                      className="text-xs text-emerald-400"
                      data-testid={`${side}-pilot-assigned-${unit.unitId}`}
                    >
                      G {unit.pilot.gunnery} / P {unit.pilot.piloting}
                    </span>
                  ) : (
                    <span
                      className="text-xs text-amber-400"
                      data-testid={`${side}-pilot-unassigned-${unit.unitId}`}
                    >
                      No pilot
                    </span>
                  )}
                </div>

                <select
                  value={selectedPilotId}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (!next) {
                      onAssignPilot(unit.unitId, null);
                      return;
                    }
                    const pilot = sortedPilots.find((p) => p.id === next);
                    if (pilot) {
                      onAssignPilot(unit.unitId, pilot);
                    }
                  }}
                  className="bg-surface-theme text-text-theme-primary border-border-theme w-full rounded border px-2 py-1 text-sm"
                  data-testid={`${side}-pilot-select-${unit.unitId}`}
                  aria-label={`Pilot for ${unit.designation}`}
                >
                  <option value="">— No pilot —</option>
                  {sortedPilots.map((pilot) => {
                    const isElsewhere =
                      assignedPilotIds.has(pilot.id) &&
                      pilot.id !== selectedPilotId;
                    const label = `${pilot.callsign ?? pilot.name} · G${pilot.skills.gunnery}/P${pilot.skills.piloting}${
                      pilot.abilities.length > 0
                        ? ` · ${pilot.abilities.length} SPA${pilot.abilities.length === 1 ? '' : 's'}`
                        : ''
                    }${isElsewhere ? ' (move)' : ''}`;
                    return (
                      <option
                        key={pilot.id}
                        value={pilot.id}
                        data-testid={`${side}-pilot-option-${unit.unitId}-${pilot.id}`}
                      >
                        {label}
                      </option>
                    );
                  })}
                </select>

                {sortedPilots.length === 0 && (
                  <p
                    className="text-text-theme-muted mt-2 text-xs"
                    data-testid={`${side}-no-pilots-msg`}
                  >
                    No pilots in roster — create one in the Pilot Roster page
                    first.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
