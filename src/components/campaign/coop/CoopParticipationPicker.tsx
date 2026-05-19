/**
 * CoopParticipationPicker — the pre-launch participation choice (CO2).
 *
 * Before a co-op mission launches, each player chooses a
 * `CoopParticipationChoice` of `deploy` or `command-hq` (design D2).
 * This component presents that choice for one player and surfaces the
 * launch-blocking rule: a launch where NO player chose `deploy` has no
 * one to fight it and is blocked (design D2 / spec scenario "Mission
 * with no deploying player is blocked").
 *
 * The component is presentational — the choice is owned by the caller.
 * It renders the two options and, when given the OTHER player's choice,
 * shows whether the current selection would block the launch.
 *
 * @spec openspec/changes/add-coop-campaign-play/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-coop-campaign-play/design.md (D2)
 */

import React from 'react';

import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

// =============================================================================
// Props
// =============================================================================

export interface CoopParticipationPickerProps {
  /** Display name of the player making the choice. */
  readonly playerName: string;
  /** The player's current participation choice. */
  readonly value: CoopParticipationChoice;
  /** Called when the player changes their choice. */
  readonly onChange: (choice: CoopParticipationChoice) => void;
  /**
   * The OTHER player's choice, when known. Used to surface the
   * launch-blocking warning: if both players are in `command-hq` the
   * mission cannot launch.
   */
  readonly otherPlayerChoice?: CoopParticipationChoice;
  /** Optional class override. */
  readonly className?: string;
}

// =============================================================================
// Option metadata
// =============================================================================

interface IOption {
  readonly choice: CoopParticipationChoice;
  readonly label: string;
  readonly description: string;
}

const OPTIONS: readonly IOption[] = [
  {
    choice: 'deploy',
    label: 'Deploy onto the map',
    description:
      'Your force enters the encounter and you command it on the tactical map.',
  },
  {
    choice: 'command-hq',
    label: 'Remain in Command HQ',
    description:
      'You skip the map this mission and keep full access to campaign management while the battle runs.',
  },
];

// =============================================================================
// Component
// =============================================================================

/**
 * The per-player participation picker for a co-op mission launch.
 */
export function CoopParticipationPicker({
  playerName,
  value,
  onChange,
  otherPlayerChoice,
  className = '',
}: CoopParticipationPickerProps): React.ReactElement {
  // A launch is blocked when BOTH players chose `command-hq` — there is
  // no one to fight the mission (design D2).
  const wouldBlockLaunch =
    value === 'command-hq' && otherPlayerChoice === 'command-hq';

  return (
    <section
      data-testid="coop-participation-picker"
      className={`rounded-xl border border-slate-700 bg-slate-900/60 p-4 ${className}`}
    >
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
        {playerName} — Mission Participation
      </h3>

      <div className="space-y-2">
        {OPTIONS.map((option) => {
          const selected = option.choice === value;
          return (
            <button
              key={option.choice}
              type="button"
              data-testid={`participation-${option.choice}`}
              aria-pressed={selected}
              onClick={() => onChange(option.choice)}
              className={
                selected
                  ? 'w-full rounded-lg border border-sky-500/60 bg-sky-600/20 p-3 text-left'
                  : 'w-full rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-left hover:border-slate-600'
              }
            >
              <div
                className={
                  selected
                    ? 'text-sm font-semibold text-sky-200'
                    : 'text-sm font-semibold text-slate-300'
                }
              >
                {option.label}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      {wouldBlockLaunch && (
        <p
          data-testid="participation-block-warning"
          className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
        >
          Both commanders are in Command HQ — at least one must deploy or the
          mission cannot launch.
        </p>
      )}
    </section>
  );
}

export default CoopParticipationPicker;
