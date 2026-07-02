import React, { useState } from 'react';

import { Button, Select } from '@/components/ui';

// The GM approve flow is a single-action screen: the decisive act is "preview a
// correction". The *type* of correction (merchant / repair / salvage / etc.) is a
// parameter of that one action, not eight competing primary buttons. So the type
// lives in a <select> and one high-contrast "Generate correction" control fires it.
// Approve + Take-manual-control remain separate state-derived controls.
type CorrectionType =
  | 'merchant'
  | 'merchant-conflict'
  | 'repair'
  | 'salvage'
  | 'unit-reload'
  | 'time'
  | 'time-conflict';

// Player-facing copy for each correction the GM can generate. No internal family
// tokens (e.g. `funds-transaction`, `time-advance`) leak into these labels.
const CORRECTION_OPTIONS: ReadonlyArray<{
  readonly value: CorrectionType;
  readonly label: string;
}> = [
  { value: 'merchant', label: 'Merchant charge reversal' },
  {
    value: 'merchant-conflict',
    label: 'Merchant charge reversal (conflicted)',
  },
  { value: 'repair', label: 'Repair completion fix' },
  { value: 'salvage', label: 'Salvage allocation fix' },
  { value: 'unit-reload', label: 'Unit reload reconciliation' },
  { value: 'time', label: 'Campaign time advance' },
  {
    value: 'time-conflict',
    label: 'Campaign time advance (external conflict)',
  },
];

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
  // Default to the merchant reversal so the single "Generate correction" click
  // (the capture flow + the basic e2e path) produces a merchant preview with no
  // extra selection step.
  const [correctionType, setCorrectionType] =
    useState<CorrectionType>('merchant');

  // Dispatch the one "Generate correction" action to the handler for the chosen
  // correction type. Each preview handler is unchanged — only the entry point is
  // unified.
  const handleGenerateCorrection = (): void => {
    switch (correctionType) {
      case 'merchant':
        onMerchantPreview(false);
        return;
      case 'merchant-conflict':
        onMerchantPreview(true);
        return;
      case 'repair':
        onRepairPreview();
        return;
      case 'salvage':
        onSalvagePreview();
        return;
      case 'unit-reload':
        onUnitReloadPreview();
        return;
      case 'time':
        onTimePreview(false);
        return;
      case 'time-conflict':
        onTimePreview(true);
        return;
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[16rem] flex-1">
        <Select
          label="Correction type"
          options={[...CORRECTION_OPTIONS]}
          value={correctionType}
          onChange={(event) =>
            setCorrectionType(event.target.value as CorrectionType)
          }
          data-testid="gm-ledger-correction-type"
        />
      </div>
      {/* Exactly ONE filled primary per state (doctrine / re-audit VD-02):
          before a preview exists, generating one is the decisive act; once a
          preview is ready (or requires takeover), the resolution action takes
          the filled treatment and the generator demotes to secondary. Dark
          text on the amber/emerald fills keeps the labels >= 4.5:1
          (re-audit A11Y-R3 — white-on-amber measured ~2:1). */}
      <Button
        type="button"
        variant={canApprove || canTakeManualControl ? 'secondary' : 'primary'}
        className={
          canApprove || canTakeManualControl ? '' : 'font-bold !text-slate-950'
        }
        onClick={handleGenerateCorrection}
        data-testid="gm-ledger-preview-btn"
      >
        Generate correction
      </Button>
      <Button
        type="button"
        variant={canApprove ? 'success' : 'secondary'}
        className={canApprove ? 'font-bold !text-slate-950' : ''}
        onClick={onApprove}
        disabled={!canApprove}
        data-testid="gm-ledger-approve-btn"
      >
        Approve cascade
      </Button>
      {/* Destructive takeover is deliberately LOW-salience: outline styling,
          separated to the row's end — never a third filled CTA competing with
          the happy path (re-audit IS-03). */}
      <Button
        type="button"
        variant="ghost"
        className="ml-auto border border-red-500/60 !text-red-300 hover:!bg-red-950/40"
        onClick={onManualTakeover}
        disabled={!canTakeManualControl}
        data-testid="gm-ledger-manual-btn"
      >
        Take manual control
      </Button>
    </div>
  );
}
