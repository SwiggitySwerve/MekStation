/**
 * MVP Display
 *
 * Renders the post-battle Most-Valuable-Player card. Wraps the
 * orphaned `derivePostBattleReport` MVP-pick output with a small,
 * presentational component that surfaces the pilot, mech, and the
 * key combat stats (damage dealt, kills, damage taken).
 *
 * The picker logic lives inside `derivePostBattleReport`
 * (`mvpUnitId`) per `add-victory-and-post-battle-summary` task 8;
 * this component is purely presentational so the same MVP record
 * can be reused in campaign / replay surfaces later.
 *
 * @spec openspec/changes/add-victory-and-post-battle-summary/tasks.md § 8
 */

import React from 'react';

import type { IPostBattleReport } from '@/utils/gameplay/postBattleReport';

// =============================================================================
// Types
// =============================================================================

export interface MvpDisplayProps {
  /** Full report — we read mvpUnitId + the matching unit row. */
  readonly report: IPostBattleReport;
  /** Pilot name lookup keyed by unit id. Falls back to "Unknown Pilot". */
  readonly pilotNames?: Record<string, string>;
  /** Optional className for layout overrides. */
  readonly className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the MVP card or an empty-state when no winner-side unit
 * dealt damage (e.g., turn-limit draw or zero-damage concede).
 */
export function MvpDisplay({
  report,
  pilotNames = {},
  className = '',
}: MvpDisplayProps): React.ReactElement {
  const mvp = report.mvpUnitId
    ? report.units.find((u) => u.unitId === report.mvpUnitId)
    : null;

  if (!mvp) {
    return (
      <div
        className={`bg-surface-base border-border-theme-subtle rounded-lg border p-6 text-center ${className}`}
        data-testid="mvp-display-empty"
      >
        <h3 className="text-text-theme-secondary mb-2 text-sm font-medium tracking-wider uppercase">
          Match MVP
        </h3>
        <p className="text-text-theme-muted text-sm">
          No MVP — no damage dealt by the winning side.
        </p>
      </div>
    );
  }

  const pilot = pilotNames[mvp.unitId] ?? 'Unknown Pilot';

  return (
    <div
      className={`bg-surface-base border-accent rounded-lg border-2 p-6 shadow-lg ${className}`}
      data-testid="mvp-display"
    >
      <h3 className="text-accent mb-4 text-sm font-bold tracking-wider uppercase">
        Match MVP
      </h3>
      <div className="mb-4">
        <div
          className="text-text-theme-primary text-2xl font-bold"
          data-testid="mvp-pilot-name"
        >
          {pilot}
        </div>
        <div
          className="text-text-theme-secondary text-base"
          data-testid="mvp-unit-name"
        >
          {mvp.designation}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-4 text-center">
        <div>
          <dt className="text-text-theme-muted text-xs tracking-wider uppercase">
            Damage Dealt
          </dt>
          <dd
            className="text-text-theme-primary mt-1 text-xl font-semibold"
            data-testid="mvp-damage-dealt"
          >
            {mvp.damageDealt}
          </dd>
        </div>
        <div>
          <dt className="text-text-theme-muted text-xs tracking-wider uppercase">
            Kills
          </dt>
          <dd
            className="text-text-theme-primary mt-1 text-xl font-semibold"
            data-testid="mvp-kills"
          >
            {mvp.kills}
          </dd>
        </div>
        <div>
          <dt className="text-text-theme-muted text-xs tracking-wider uppercase">
            Damage Taken
          </dt>
          <dd
            className="text-text-theme-primary mt-1 text-xl font-semibold"
            data-testid="mvp-damage-taken"
          >
            {mvp.damageReceived}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default MvpDisplay;
