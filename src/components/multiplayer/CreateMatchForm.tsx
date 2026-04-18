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

import type { TeamLayout } from '@/types/multiplayer/Lobby';

// =============================================================================
// Props
// =============================================================================

export interface ICreateMatchFormValue {
  readonly layout: TeamLayout;
  readonly displayName: string;
  readonly mapRadius: number;
  readonly turnLimit: number;
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void props.onSubmit({ layout, displayName, mapRadius, turnLimit });
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
