import React from 'react';

import { Card } from '@/components/ui';

interface GmCampaignLedgerStatusCardsProps {
  readonly balanceLabel: string;
  readonly previewStatus: string;
  readonly approvalStatus: string;
  readonly approvalReason: string | null;
}

export function GmCampaignLedgerStatusCards({
  balanceLabel,
  previewStatus,
  approvalStatus,
  approvalReason,
}: GmCampaignLedgerStatusCardsProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-4" data-testid="gm-ledger-balance">
        <p className="text-text-theme-secondary text-xs uppercase">
          Campaign balance
        </p>
        <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
          {balanceLabel}
        </p>
      </Card>
      <Card className="p-4" data-testid="gm-ledger-preview-status">
        <p className="text-text-theme-secondary text-xs uppercase">Preview</p>
        <p className="text-text-theme-primary mt-1 text-lg font-semibold">
          {previewStatus}
        </p>
        {approvalReason ? (
          <p className="mt-1 text-sm text-amber-300">{approvalReason}</p>
        ) : null}
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
