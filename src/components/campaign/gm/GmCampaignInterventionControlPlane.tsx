import React, { useMemo, useState } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
} from '@/types/interventions';

import { Button, Card } from '@/components/ui';
import { ActionLedger } from '@/lib/interventions/ActionLedger';
import { registerGmCampaignInterventionImplementers } from '@/lib/interventions/GmCampaignInterventionImplementer';
import {
  approveGmCascadePreview,
  createGmCascadePreview,
} from '@/lib/interventions/GmCascadePreviewPipeline';
import { InterventionLedger } from '@/lib/interventions/InterventionLedger';

import {
  buildMerchantReversalCommand,
  GM_ACTOR_ID,
  MERCHANT_REVERSAL_ID,
  refreshLedgerRows,
  type GmCampaignPreview,
  type GmCampaignUpdate,
  type GmLedgerRow,
  type PlayerLedgerRow,
} from './GmCampaignInterventionControlPlane.helpers';
import {
  GmLedgerProjection,
  LedgerProjection,
} from './GmCampaignLedgerProjection';
import {
  GmPreviewPanel,
  ManualTakeoverPanel,
  type ManualTakeoverState,
} from './GmCampaignPreviewPanels';

interface GmCampaignInterventionControlPlaneProps {
  readonly campaign: ICampaign;
  readonly onApplyCampaignUpdate: (updates: GmCampaignUpdate) => void;
  readonly actorId?: string;
  readonly now?: () => string;
}

export function GmCampaignInterventionControlPlane({
  campaign,
  onApplyCampaignUpdate,
  actorId = GM_ACTOR_ID,
  now = () => new Date().toISOString(),
}: GmCampaignInterventionControlPlaneProps): React.ReactElement {
  const ledger = useMemo(() => {
    const next = new InterventionLedger<IGmCampaignInterventionState>();
    registerGmCampaignInterventionImplementers(next);
    return next;
  }, []);
  const actionLedger = useMemo(() => new ActionLedger(), []);
  const [preview, setPreview] = useState<GmCampaignPreview | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>(
    'No approved GM corrections yet.',
  );
  const [approvalReason, setApprovalReason] = useState<string | null>(null);
  const [playerRows, setPlayerRows] = useState<readonly PlayerLedgerRow[]>([]);
  const [gmRows, setGmRows] = useState<readonly GmLedgerRow[]>([]);
  const [manualTakeover, setManualTakeover] =
    useState<ManualTakeoverState | null>(null);

  const canApprove = preview?.status === 'ready';
  const canTakeManualControl = preview?.status === 'requires-manual-takeover';

  const handlePreview = (conflicted: boolean): void => {
    const nextPreview = createGmCascadePreview({
      ledger,
      command: buildMerchantReversalCommand({
        actorId,
        campaign,
        conflicted,
      }),
      state: campaign as IGmCampaignInterventionState,
      authority: {
        actorId,
        role: 'gm',
        gameId: `campaign:${campaign.id}:gm-ledger`,
        campaignId: campaign.id,
        ownedStateRefs: [`campaign:${campaign.id}`],
      },
      interventionId: conflicted
        ? `${MERCHANT_REVERSAL_ID}-manual-preview`
        : MERCHANT_REVERSAL_ID,
      now,
    }) as GmCampaignPreview;

    setPreview(nextPreview);
    setManualTakeover(null);
    setApprovalReason(null);
    setApprovalStatus(
      nextPreview.status === 'ready'
        ? 'Ready for GM approval.'
        : `Preview status: ${nextPreview.status}`,
    );
  };

  const handleApprove = (): void => {
    if (!preview) return;
    const approvedAt = now();
    const result = approveGmCascadePreview<
      IGmCampaignInterventionState,
      IGmPrivateMetadata,
      IGmCampaignPublicEffect,
      IGmCampaignInterventionDomainPayload
    >({
      ledger,
      actionLedger,
      preview,
      state: campaign as IGmCampaignInterventionState,
      approvedAt,
      createdAt: approvedAt,
    });

    if (result.status !== 'approved') {
      setApprovalStatus('Approval blocked.');
      setApprovalReason(result.reason ?? 'The preview could not be approved.');
      return;
    }

    onApplyCampaignUpdate({
      finances: result.state.finances,
      gmInterventionEvents: result.state.gmInterventionEvents,
    });
    setApprovalStatus('Approved and applied to campaign state.');
    setApprovalReason(null);
    refreshLedgerRows(actionLedger, setPlayerRows, setGmRows);
  };

  const handleManualTakeover = (): void => {
    if (!preview || !preview.privateMetadata) return;
    const createdAt = now();
    const manualPublicEffect: IGmCampaignPublicEffect = {
      summary: 'GM manual review opened. No campaign state changed.',
      family: 'funds-transaction',
      changedStateRefs: [],
    };
    const manualRecord = ledger.appendApprovedRecord({
      id: `${preview.interventionId}:manual`,
      domain: preview.domain,
      kind: preview.kind,
      status: 'manual',
      actorId: preview.actorId,
      targetRefs: preview.targetRefs,
      causedBy: preview.causedBy,
      supersedes: preview.supersedes,
      privateMetadata: {
        ...preview.privateMetadata,
        manualTakeoverNotes:
          'Manual takeover selected because projected effects conflict with merchant cascade state.',
      },
      publicEffect: manualPublicEffect,
      domainPayload: preview.domainPayload,
      createdAt,
      approvedAt: createdAt,
    });

    actionLedger.appendGmInterventionRecord(manualRecord);
    setManualTakeover({
      reason: 'Manual takeover selected; no campaign state changed.',
      conflicts: preview.conflicts.map((conflict) => conflict.message),
    });
    setApprovalStatus('Manual takeover recorded.');
    setApprovalReason(null);
    refreshLedgerRows(actionLedger, setPlayerRows, setGmRows);
  };

  return (
    <section
      className="space-y-6"
      data-testid="gm-ledger-control-plane"
      aria-label="GM campaign ledger"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4" data-testid="gm-ledger-balance">
          <p className="text-text-theme-secondary text-xs uppercase">
            Campaign balance
          </p>
          <p className="text-text-theme-primary mt-1 text-2xl font-semibold">
            {campaign.finances.balance.format()}
          </p>
        </Card>
        <Card className="p-4" data-testid="gm-ledger-preview-status">
          <p className="text-text-theme-secondary text-xs uppercase">Preview</p>
          <p className="text-text-theme-primary mt-1 text-lg font-semibold">
            {preview?.status ?? 'Not generated'}
          </p>
          {approvalReason ? (
            <p className="mt-1 text-sm text-amber-300">{approvalReason}</p>
          ) : null}
        </Card>
        <Card className="p-4" data-testid="gm-ledger-approval-status">
          <p className="text-text-theme-secondary text-xs uppercase">
            Approval
          </p>
          <p className="text-text-theme-primary mt-1 text-lg font-semibold">
            {approvalStatus}
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={() => handlePreview(false)}
          data-testid="gm-ledger-preview-btn"
        >
          Preview merchant reversal
        </Button>
        <Button
          type="button"
          variant="success"
          onClick={handleApprove}
          disabled={!canApprove}
          data-testid="gm-ledger-approve-btn"
        >
          Approve cascade
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handlePreview(true)}
          data-testid="gm-ledger-conflict-preview-btn"
        >
          Preview conflicted cascade
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleManualTakeover}
          disabled={!canTakeManualControl}
          data-testid="gm-ledger-manual-btn"
        >
          Take manual control
        </Button>
      </div>

      {preview ? <GmPreviewPanel preview={preview} /> : null}

      {manualTakeover ? (
        <ManualTakeoverPanel manualTakeover={manualTakeover} />
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LedgerProjection
          title="Player Action Log"
          rows={playerRows}
          testId="gm-ledger-player-log"
        />
        <GmLedgerProjection rows={gmRows} />
      </div>
    </section>
  );
}
