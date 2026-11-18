/**
 * Legacy Combat State Flags Banner (T1)
 *
 * Older saves recorded battle damage under session unit ids. The load-time
 * migration moves what it can prove onto roster units; anything it could
 * not attribute is listed here until the player dismisses it. The original
 * states are kept on this device, outside the campaign save.
 *
 * Pure presentational — the dashboard wires the live campaign to it.
 */

import type {
  ILegacyCombatStateFlag,
  LegacyCombatStateFlagReason,
} from '@/types/campaign/LegacyCombatStateMigration';

import { Button } from '@/components/ui';

const REASON_TEXT: Record<LegacyCombatStateFlagReason, string> = {
  'not-fully-explained':
    'its recorded battles no longer explain the stored damage',
  'ambiguous-roster-unit': 'it could belong to more than one roster unit',
  'conflicting-pilot':
    'the unit that could hold it now has a different pilot than the one who fought',
  'roster-unit-has-state': 'the roster unit already has damage recorded',
  'shares-roster-unit-with-flagged-entry':
    'it shares a roster unit with another unresolved entry',
};

export interface LegacyCombatStateFlagsBannerProps {
  readonly flags: readonly ILegacyCombatStateFlag[] | undefined;
  readonly onDismiss: () => void;
}

export function LegacyCombatStateFlagsBanner({
  flags,
  onDismiss,
}: LegacyCombatStateFlagsBannerProps): React.ReactElement | null {
  if (!flags || flags.length === 0) return null;
  return (
    <div
      className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
      data-testid="legacy-combat-state-flags"
      role="status"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="text-text-theme-primary">
          <p className="text-sm font-semibold">
            {flags.length} unit damage record{flags.length === 1 ? '' : 's'}{' '}
            from an older save could not be matched to a roster unit
          </p>
          <ul className="text-text-theme-secondary mt-1 text-xs">
            {flags.map((flag) => (
              <li
                key={flag.sessionUnitId}
                data-testid={`legacy-combat-state-flag-${flag.sessionUnitId}`}
              >
                <span className="font-mono">{flag.sessionUnitId}</span>:{' '}
                {REASON_TEXT[flag.reason]}
                {flag.candidateRosterUnitIds.length > 0 &&
                  ` (possible units: ${flag.candidateRosterUnitIds.join(', ')})`}
              </li>
            ))}
          </ul>
          <p className="text-text-theme-secondary mt-1 text-xs">
            Check these units&apos; damage by hand. The original records are
            kept on this device.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDismiss}
          data-testid="legacy-combat-state-flags-dismiss"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
