import React, { useMemo } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';

import { Card } from '@/components/ui';

import {
  buildPersistedCampaignEventRows,
  GM_ACTOR_ID,
} from './GmCampaignInterventionControlPlane.helpers';
import { LedgerProjection } from './GmCampaignLedgerProjection';

interface GmCampaignPlayerLedgerViewProps {
  readonly campaign: ICampaign;
  readonly actorId?: string;
}

export function GmCampaignPlayerLedgerView({
  campaign,
  actorId = GM_ACTOR_ID,
}: GmCampaignPlayerLedgerViewProps): React.ReactElement {
  const playerRows = useMemo(
    () =>
      buildPersistedCampaignEventRows(
        campaign.gmInterventionEvents,
        campaign.timeCascadeEvents,
        campaign.updatedAt,
        actorId,
      ).playerRows,
    [
      actorId,
      campaign.gmInterventionEvents,
      campaign.timeCascadeEvents,
      campaign.updatedAt,
    ],
  );

  return (
    <section
      className="space-y-6"
      data-testid="gm-ledger-player-only-view"
      aria-label="Player campaign ledger"
    >
      <Card className="p-4" data-testid="gm-ledger-player-only-notice">
        <p className="text-text-theme-secondary text-xs uppercase">
          GM authority required
        </p>
        <p className="text-text-theme-primary mt-2 text-sm">
          GM controls are available only to the campaign owner or co-op host.
          This mirror shows player-visible ledger effects only.
        </p>
      </Card>

      <LedgerProjection
        title="Player Action Log"
        rows={playerRows}
        testId="gm-ledger-player-log"
      />
    </section>
  );
}
