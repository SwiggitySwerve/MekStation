/**
 * Legacy Combat State Flags Banner (T1)
 *
 * Lists battle damage that was not applied to any unit:
 * - `combat-state`: damage an older save recorded under a battle-session id;
 *   legacy damage is never attributed (owner ruling PARITY-PLAN §186.4);
 * - `unapplied-delta`: damage from a battle whose save does not record which
 *   roster unit fought, or whose launch could not tell.
 * Where the copy is: nothing is claimed while an unapplied delta's
 * quarantine write is pending; once confirmed, "this device" only when the
 * flag's recorded device (`quarantinedOnDeviceId`) is this one, otherwise
 * "the device where this was found". Each entry is dismissed on its own.
 *
 * Pure presentational — the dashboard wires the live campaign to it.
 */

import type {
  ILegacyCombatStateFlag,
  LegacyCombatStateFlagReason,
} from '@/types/campaign/LegacyCombatStateMigration';

import { Button } from '@/components/ui';
import { legacyCombatStateFlagKey } from '@/types/campaign/LegacyCombatStateMigration';

const REASON_TEXT: Record<LegacyCombatStateFlagReason, string> = {
  'legacy-not-attributed': 'this save does not record which roster unit fought',
  'ambiguous-roster-unit': 'it could belong to more than one roster unit',
};

export interface LegacyCombatStateFlagsBannerProps {
  readonly flags: readonly ILegacyCombatStateFlag[] | undefined;
  /** This device's id (`getDeviceId()`). */
  readonly currentDeviceId: string;
  /** `matchId|sessionUnitId` of unapplied deltas whose copy is not confirmed yet. */
  readonly pendingQuarantineKeys: ReadonlySet<string>;
  readonly onDismiss: (flag: ILegacyCombatStateFlag) => void;
}

function describeFlag(
  flag: ILegacyCombatStateFlag,
  pendingQuarantineKeys: ReadonlySet<string>,
  currentDeviceId: string,
): string {
  // An older save's entry says why in its lead; a battle's delta says why after it.
  const lead =
    flag.kind === 'combat-state'
      ? `Damage recorded for ${flag.sessionUnitId} in an older save was not applied to any unit`
      : `Damage to ${flag.sessionUnitId} from battle ${flag.matchIds.join(', ')} was not applied to any unit: ${REASON_TEXT[flag.reason]}`;
  const candidates =
    flag.candidateRosterUnitIds.length > 0
      ? ` (possible units: ${flag.candidateRosterUnitIds.join(', ')})`
      : '';
  const pending =
    flag.kind === 'unapplied-delta' &&
    flag.matchIds.some((matchId) =>
      pendingQuarantineKeys.has(`${matchId}|${flag.sessionUnitId}`),
    );
  const copy = pending
    ? ''
    : flag.quarantinedOnDeviceId === currentDeviceId
      ? ' A copy is kept on this device.'
      : ' A copy is kept on the device where this was found.';
  return `${lead}${candidates}.${copy}`;
}

export function LegacyCombatStateFlagsBanner({
  flags,
  currentDeviceId,
  pendingQuarantineKeys,
  onDismiss,
}: LegacyCombatStateFlagsBannerProps): React.ReactElement | null {
  if (!flags || flags.length === 0) return null;
  return (
    <div
      className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
      data-testid="legacy-combat-state-flags"
      role="status"
    >
      <p className="text-text-theme-primary text-sm font-semibold">
        {flags.length} damage record{flags.length === 1 ? ' was' : 's were'} not
        applied to any unit
      </p>
      <ul className="mt-2 space-y-2">
        {flags.map((flag) => {
          const key = legacyCombatStateFlagKey(flag);
          return (
            <li key={key} className="flex items-start justify-between gap-4">
              <p
                className="text-text-theme-secondary text-xs"
                data-testid={`legacy-combat-state-flag-${
                  flag.kind === 'combat-state' ? flag.sessionUnitId : key
                }`}
              >
                {describeFlag(flag, pendingQuarantineKeys, currentDeviceId)}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDismiss(flag)}
                data-testid={`legacy-combat-state-flag-dismiss-${key}`}
              >
                Dismiss
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-text-theme-secondary mt-2 text-xs">
        Check these units&apos; damage by hand.
      </p>
    </div>
  );
}
