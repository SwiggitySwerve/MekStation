import type { MultiplayerMode } from '@/lib/multiplayer/modeAvailability';

import { getModeNotice } from '@/lib/multiplayer/modeAvailability';

interface ModeAvailabilityNoticeProps {
  readonly mode: MultiplayerMode;
  readonly compact?: boolean;
  readonly sentenceId?: string;
}

export function ModeAvailabilityNotice({
  mode,
  compact = false,
  sentenceId,
}: ModeAvailabilityNoticeProps): React.ReactElement | null {
  const notice = getModeNotice(mode);
  if (!notice) return null;

  return (
    <span
      className={`text-text-theme-secondary min-w-0 whitespace-normal ${compact ? 'inline-flex' : 'my-2 block text-sm'}`}
    >
      <span className="border-border-theme text-text-theme-primary inline-block rounded border px-1.5 py-0.5 text-xs font-semibold normal-case">
        {notice.label}
      </span>
      {!compact && (
        <span id={sentenceId} className="mt-1 block">
          {notice.sentence}
        </span>
      )}
    </span>
  );
}
