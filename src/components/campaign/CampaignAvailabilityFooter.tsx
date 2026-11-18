import type { ICoopSession } from '@/types/campaign/CoopSession';

import { ModeAvailabilityNotice } from '@/components/multiplayer/ModeAvailabilityNotice';

export function campaignAvailabilitySentenceId(campaignId: string): string {
  return `campaign-${campaignId}-availability`;
}

/** Mobile disclosure follows the campaign's primary content. */
export function CampaignAvailabilityFooter({
  campaignId,
  coopSession,
}: {
  readonly campaignId: string;
  readonly coopSession?: ICoopSession;
}): React.ReactElement | null {
  if (!coopSession) return null;
  return (
    <div className="sm:hidden">
      <ModeAvailabilityNotice
        mode="coop"
        sentenceOnly
        sentenceId={campaignAvailabilitySentenceId(campaignId)}
      />
    </div>
  );
}
