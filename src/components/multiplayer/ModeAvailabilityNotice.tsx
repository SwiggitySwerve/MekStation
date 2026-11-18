import type { MultiplayerMode } from '@/lib/multiplayer/modeAvailability';

import {
  getModeNotice,
  getVaultSharingNotice,
} from '@/lib/multiplayer/modeAvailability';

interface ModeAvailabilityNoticeProps {
  readonly mode: MultiplayerMode;
  readonly compact?: boolean;
  readonly sentenceId?: string;
  readonly inlineBadge?: boolean;
  readonly sentenceOnly?: boolean;
  readonly describedBy?: string;
  readonly purpose?: 'vault-sharing';
}

export function ModeAvailabilityNotice({
  mode,
  compact = false,
  sentenceId,
  inlineBadge = false,
  sentenceOnly = false,
  describedBy,
  purpose,
}: ModeAvailabilityNoticeProps): React.ReactElement | null {
  const notice =
    purpose === 'vault-sharing' ? getVaultSharingNotice() : getModeNotice(mode);
  if (!notice) return null;

  return (
    <span
      aria-describedby={describedBy}
      className={`text-text-theme-secondary min-w-0 whitespace-normal ${compact ? 'inline-flex' : 'my-2 block text-sm'}`}
    >
      {!sentenceOnly && (
        <span
          className={`border-border-theme text-text-theme-primary inline-block rounded border font-semibold normal-case ${inlineBadge ? 'px-1 text-[10px] leading-3' : 'px-1.5 py-0.5 text-xs'}`}
        >
          {notice.label}
        </span>
      )}
      {!compact && (
        <span id={sentenceId} className="mt-1 block">
          {notice.sentence}
        </span>
      )}
    </span>
  );
}
