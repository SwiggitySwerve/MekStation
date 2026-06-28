/**
 * CreateMatchForm — render the create-match form on the multiplayer hub.
 *
 * Wave 5 of Phase 4 (capstone integration). Pure controlled-form
 * component. The page owns the submit side-effect (POST + navigate)
 * and threads it through `onSubmit`.
 *
 * Layouts come from the same enumeration the server uses
 * (`TeamLayout`); we don't hard-code the list so adding a new layout
 * upstream automatically widens the dropdown.
 */

import { useState } from 'react';

import type {
  IMatchCustomRosterSeatInput,
  MatchRosterPresetId,
} from '@/lib/multiplayer/matchRosterPresets';
import type { IMatchUnitBootstrapEntry } from '@/lib/multiplayer/server/IMatchStore';
import type { TeamLayout } from '@/types/multiplayer/Lobby';

import {
  buildCustomRosterSeatRows,
  buildMatchUnitBootstrapForCustomRoster,
  buildMatchUnitBootstrapForPreset,
  DEFAULT_MATCH_ROSTER_PRESET_ID,
  MATCH_ROSTER_PRESETS,
  MATCH_ROSTER_UNIT_OPTIONS,
} from '@/lib/multiplayer/matchRosterPresets';

// =============================================================================
// Props
// =============================================================================

export interface ICreateMatchFormValue {
  readonly layout: TeamLayout;
  readonly displayName: string;
  readonly mapRadius: number;
  readonly turnLimit: number;
  readonly fogOfWar: boolean;
  readonly rosterMode: MatchRosterMode;
  readonly rosterPresetId: MatchRosterPresetId;
  readonly unitBootstrap: readonly IMatchUnitBootstrapEntry[];
}

export interface ICreateMatchFormProps {
  readonly onSubmit: (value: ICreateMatchFormValue) => void | Promise<void>;
  readonly busy?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Layouts exposed in the hub dropdown. Mirrors `TeamLayoutSchema` —
 * keep in lockstep when adding a new variant upstream. Listed in
 * play-frequency order (most common first).
 */
const LAYOUT_OPTIONS: ReadonlyArray<{ value: TeamLayout; label: string }> = [
  { value: '1v1', label: '1 vs 1' },
  { value: '2v2', label: '2 vs 2' },
  { value: '3v3', label: '3 vs 3' },
  { value: '4v4', label: '4 vs 4' },
  { value: 'ffa-2', label: 'Free-for-all (2)' },
  { value: 'ffa-3', label: 'Free-for-all (3)' },
  { value: 'ffa-4', label: 'Free-for-all (4)' },
  { value: 'ffa-5', label: 'Free-for-all (5)' },
  { value: 'ffa-6', label: 'Free-for-all (6)' },
  { value: 'ffa-7', label: 'Free-for-all (7)' },
  { value: 'ffa-8', label: 'Free-for-all (8)' },
];

type MatchRosterMode = 'preset' | 'custom';

type CustomRosterInputs = Record<string, Partial<IMatchCustomRosterSeatInput>>;

const SKILL_OPTIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// =============================================================================
// Component
// =============================================================================

export function CreateMatchForm(
  props: ICreateMatchFormProps,
): React.ReactElement {
  const [layout, setLayout] = useState<TeamLayout>('1v1');
  const [displayName, setDisplayName] = useState<string>('MechWarrior');
  const [mapRadius, setMapRadius] = useState<number>(8);
  const [turnLimit, setTurnLimit] = useState<number>(20);
  const [fogOfWar, setFogOfWar] = useState<boolean>(false);
  const [rosterMode, setRosterMode] = useState<MatchRosterMode>('preset');
  const [rosterPresetId, setRosterPresetId] = useState<MatchRosterPresetId>(
    DEFAULT_MATCH_ROSTER_PRESET_ID,
  );
  const [customRosterInputs, setCustomRosterInputs] =
    useState<CustomRosterInputs>({});
  const customRosterRows = buildCustomRosterSeatRows(
    layout,
    customRosterInputs,
  );

  const updateCustomRosterSeat = (
    slotId: string,
    patch: Partial<IMatchCustomRosterSeatInput>,
  ): void => {
    setCustomRosterInputs((current) => ({
      ...current,
      [slotId]: {
        ...current[slotId],
        ...patch,
      },
    }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void props.onSubmit({
          layout,
          displayName,
          mapRadius,
          turnLimit,
          fogOfWar,
          rosterMode,
          rosterPresetId,
          unitBootstrap:
            rosterMode === 'custom'
              ? buildMatchUnitBootstrapForCustomRoster(
                  layout,
                  customRosterInputs,
                  mapRadius,
                )
              : buildMatchUnitBootstrapForPreset(
                  layout,
                  rosterPresetId,
                  mapRadius,
                ),
        });
      }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="cm-displayName"
          className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
        >
          Display name
        </label>
        <input
          id="cm-displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={64}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          required
        />
      </div>
      <div>
        <label
          htmlFor="cm-layout"
          className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
        >
          Team layout
        </label>
        <select
          id="cm-layout"
          value={layout}
          onChange={(e) => setLayout(e.target.value as TeamLayout)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-3 rounded border border-slate-700 bg-slate-950/70 p-3">
        <legend className="px-1 text-xs font-medium tracking-wide text-slate-300 uppercase">
          Unit roster
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <input
              type="radio"
              name="cm-rosterMode"
              value="preset"
              checked={rosterMode === 'preset'}
              onChange={() => setRosterMode('preset')}
              className="h-4 w-4 border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Preset</span>
          </label>
          <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
            <input
              type="radio"
              name="cm-rosterMode"
              value="custom"
              checked={rosterMode === 'custom'}
              onChange={() => setRosterMode('custom')}
              className="h-4 w-4 border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Custom</span>
          </label>
        </div>
        {rosterMode === 'preset' ? (
          <div>
            <label
              htmlFor="cm-rosterPreset"
              className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
            >
              Unit roster preset
            </label>
            <select
              id="cm-rosterPreset"
              value={rosterPresetId}
              onChange={(e) =>
                setRosterPresetId(e.target.value as MatchRosterPresetId)
              }
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              {MATCH_ROSTER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            {customRosterRows.map((row) => (
              <div
                key={row.slotId}
                className="rounded border border-slate-800 bg-slate-900/70 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-slate-100">
                    {row.sideLabel} #{row.seatNumber}
                  </div>
                  <div className="text-xs text-slate-400">
                    {row.side === 'player' ? 'Player side' : 'Opponent side'}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`cm-custom-${row.slotId}-unit`}
                      className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
                    >
                      {row.sideLabel} #{row.seatNumber} unit
                    </label>
                    <select
                      id={`cm-custom-${row.slotId}-unit`}
                      value={row.unitRef}
                      onChange={(e) =>
                        updateCustomRosterSeat(row.slotId, {
                          unitRef: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      {MATCH_ROSTER_UNIT_OPTIONS.map((option) => (
                        <option key={option.unitRef} value={option.unitRef}>
                          {option.unitName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`cm-custom-${row.slotId}-pilot`}
                      className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
                    >
                      {row.sideLabel} #{row.seatNumber} pilot
                    </label>
                    <input
                      id={`cm-custom-${row.slotId}-pilot`}
                      type="text"
                      value={row.pilotName}
                      onChange={(e) =>
                        updateCustomRosterSeat(row.slotId, {
                          pilotName: e.target.value,
                        })
                      }
                      maxLength={64}
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`cm-custom-${row.slotId}-gunnery`}
                      className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
                    >
                      {row.sideLabel} #{row.seatNumber} gunnery
                    </label>
                    <select
                      id={`cm-custom-${row.slotId}-gunnery`}
                      value={row.gunnery}
                      onChange={(e) =>
                        updateCustomRosterSeat(row.slotId, {
                          gunnery: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      {SKILL_OPTIONS.map((skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`cm-custom-${row.slotId}-piloting`}
                      className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
                    >
                      {row.sideLabel} #{row.seatNumber} piloting
                    </label>
                    <select
                      id={`cm-custom-${row.slotId}-piloting`}
                      value={row.piloting}
                      onChange={(e) =>
                        updateCustomRosterSeat(row.slotId, {
                          piloting: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    >
                      {SKILL_OPTIONS.map((skill) => (
                        <option key={skill} value={skill}>
                          {skill}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="cm-mapRadius"
            className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
          >
            Map radius
          </label>
          <input
            id="cm-mapRadius"
            type="number"
            min={4}
            max={20}
            value={mapRadius}
            onChange={(e) => setMapRadius(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="cm-turnLimit"
            className="block text-xs font-medium tracking-wide text-slate-300 uppercase"
          >
            Turn limit
          </label>
          <input
            id="cm-turnLimit"
            type="number"
            min={5}
            max={50}
            value={turnLimit}
            onChange={(e) => setTurnLimit(Number(e.target.value))}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      <label className="flex items-start gap-3 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100">
        <input
          type="checkbox"
          checked={fogOfWar}
          onChange={(e) => setFogOfWar(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-600 focus:ring-emerald-500"
        />
        <span>Double-blind (fog of war)</span>
      </label>
      <button
        type="submit"
        disabled={props.busy}
        className={`w-full rounded px-4 py-2 text-sm font-medium text-white ${
          props.busy
            ? 'cursor-not-allowed bg-slate-700'
            : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {props.busy ? 'Creating…' : 'Create match'}
      </button>
    </form>
  );
}
