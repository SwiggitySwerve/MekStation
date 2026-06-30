import React from 'react';

import { Button } from '@/components/ui';

interface GmCampaignInterventionActionsProps {
  readonly canApprove: boolean;
  readonly canTakeManualControl: boolean;
  readonly onMerchantPreview: (conflicted: boolean) => void;
  readonly onApprove: () => void;
  readonly onRepairPreview: () => void;
  readonly onSalvagePreview: () => void;
  readonly onUnitReloadPreview: () => void;
  readonly onTimePreview: (conflicted: boolean) => void;
  readonly onManualTakeover: () => void;
}

export function GmCampaignInterventionActions({
  canApprove,
  canTakeManualControl,
  onMerchantPreview,
  onApprove,
  onRepairPreview,
  onSalvagePreview,
  onUnitReloadPreview,
  onTimePreview,
  onManualTakeover,
}: GmCampaignInterventionActionsProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant="primary"
        onClick={() => onMerchantPreview(false)}
        data-testid="gm-ledger-preview-btn"
      >
        Preview merchant reversal
      </Button>
      <Button
        type="button"
        variant="success"
        onClick={onApprove}
        disabled={!canApprove}
        data-testid="gm-ledger-approve-btn"
      >
        Approve cascade
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onMerchantPreview(true)}
        data-testid="gm-ledger-conflict-preview-btn"
      >
        Preview conflicted cascade
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={onRepairPreview}
        data-testid="gm-ledger-repair-preview-btn"
      >
        Preview repair fix
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={onSalvagePreview}
        data-testid="gm-ledger-salvage-preview-btn"
      >
        Preview salvage fix
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={onUnitReloadPreview}
        data-testid="gm-ledger-unit-reload-preview-btn"
      >
        Preview unit reload
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={() => onTimePreview(false)}
        data-testid="gm-ledger-time-preview-btn"
      >
        Preview time cascade
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => onTimePreview(true)}
        data-testid="gm-ledger-time-conflict-preview-btn"
      >
        Preview external time conflict
      </Button>
      <Button
        type="button"
        variant="danger"
        onClick={onManualTakeover}
        disabled={!canTakeManualControl}
        data-testid="gm-ledger-manual-btn"
      >
        Take manual control
      </Button>
    </div>
  );
}
