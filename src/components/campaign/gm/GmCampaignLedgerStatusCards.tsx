import React from 'react';

import { Card } from '@/components/ui';

// Standing CONTEXT-FRAME for the GM approve screen: only the two facts that are
// always meaningful stay as cards — the campaign balance the corrections act on,
// and the running approval summary. Preview status + approval-blocked reason are
// transient (only meaningful mid-preview) and now live inside the preview panel.
interface GmCampaignLedgerStatusCardsProps {
  readonly balanceLabel: string;
  readonly approvalStatus: string;
}

export function GmCampaignLedgerStatusCards({
  balanceLabel,
  approvalStatus,
}: GmCampaignLedgerStatusCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="p-4" data-testid="gm-ledger-balance">
        <p className="text-text-theme-secondary text-xs uppercase">
          Campaign balance
        </p>
        <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
          {balanceLabel}
        </p>
      </Card>
      <Card className="p-4" data-testid="gm-ledger-approval-status">
        <p className="text-text-theme-secondary text-xs uppercase">Approval</p>
        <p className="text-text-theme-primary mt-1 text-lg font-semibold">
          {approvalStatus}
        </p>
      </Card>
    </div>
  );
}
