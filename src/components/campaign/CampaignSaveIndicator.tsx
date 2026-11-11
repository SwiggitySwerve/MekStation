import Link from 'next/link';

import { Badge } from '@/components/ui';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CAMPAIGN_SAVE_CARD_ID, describeSaveState } from './campaignSaveStatus';

/** Shared navigation status; the dashboard card owns recovery actions. */
export function CampaignSaveIndicator({
  campaignId,
}: {
  campaignId: string;
}): React.ReactElement {
  const heldCampaignId = useCampaignPersistenceStore((s) => s.campaignId);
  const saveState = useCampaignPersistenceStore((s) => s.saveState);
  const dirty = useCampaignPersistenceStore((s) => s.dirty);
  const recoveredPendingWrite = useCampaignPersistenceStore(
    (s) => s.recoveredPendingWrite,
  );
  const saveConflict = useCampaignPersistenceStore((s) => s.saveConflict);
  const status = describeSaveState({
    saveState,
    dirty,
    recoveredPendingWrite,
    saveConflict,
  });

  return (
    <div
      role="status"
      aria-label="Campaign save status"
      aria-live="polite"
      aria-atomic="true"
    >
      {heldCampaignId === campaignId && status.showInNavigation && (
        <Link
          href={`/gameplay/campaigns/${campaignId}#${CAMPAIGN_SAVE_CARD_ID}`}
          className="text-text-theme-secondary focus-visible:ring-accent flex min-h-11 items-center gap-2 rounded px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Campaign save: ${status.label}. ${status.unsentDetail ?? ''} View save details.`}
        >
          <Badge variant={status.variant} size="sm">
            {status.label}
          </Badge>
          {status.unsentDetail && <span>Changes unsent</span>}
        </Link>
      )}
    </div>
  );
}
