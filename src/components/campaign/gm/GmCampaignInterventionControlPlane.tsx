import React, { useEffect, useMemo, useState } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignPublicEffect,
  IGmPrivateMetadata,
  IGmTimeCascadeInterventionDomainPayload,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadePublicEffect,
} from '@/types/interventions';

import { ActionLedger } from '@/lib/interventions/ActionLedger';
import { registerGmCampaignInterventionImplementers } from '@/lib/interventions/GmCampaignInterventionImplementer';
import {
  approveGmCascadePreview,
  createGmCascadePreview,
} from '@/lib/interventions/GmCascadePreviewPipeline';
import { buildRosterRecoveryPatchesFromExternalEffects } from '@/lib/interventions/GmRosterRecoveryProjection';
import { registerGmTimeCascadeInterventionImplementer } from '@/lib/interventions/GmTimeCascadeInterventionImplementer';
import { InterventionLedger } from '@/lib/interventions/InterventionLedger';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import {
  buildRepairCompletionCommand,
  buildSalvageProcessedCommand,
  buildUnitReloadReconciliationCommand,
  REPAIR_COMPLETION_ID,
  SALVAGE_PROCESSED_ID,
  UNIT_RELOAD_RECONCILIATION_ID,
} from './GmCampaignBaseFixCommands';
import { GmCampaignInterventionActions } from './GmCampaignInterventionActions';
import {
  buildMerchantReversalCommand,
  buildTimeCascadeCommand,
  GM_ACTOR_ID,
  MERCHANT_REVERSAL_ID,
  TIME_CASCADE_ID,
  TIME_CASCADE_MANUAL_ID,
  buildPersistedCampaignEventRows,
  refreshLedgerRows,
  type GmCampaignPreview,
  type GmCampaignUpdate,
  type GmLedgerPreview,
  type GmLedgerPublicEffect,
  type GmLedgerRow,
  type GmTimeCascadePreview,
  type PlayerLedgerRow,
} from './GmCampaignInterventionControlPlane.helpers';
import {
  GmLedgerProjection,
  LedgerProjection,
} from './GmCampaignLedgerProjection';
import { GmCampaignLedgerStatusCards } from './GmCampaignLedgerStatusCards';
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
  const campaignLedger = useMemo(() => {
    const next = new InterventionLedger<IGmCampaignInterventionState>();
    registerGmCampaignInterventionImplementers(next);
    return next;
  }, []);
  const timeLedger = useMemo(() => {
    const next = new InterventionLedger<IGmTimeCascadeInterventionState>();
    registerGmTimeCascadeInterventionImplementer(next);
    return next;
  }, []);
  const actionLedger = useMemo(() => new ActionLedger(), []);
  const persistedRows = useMemo(
    () =>
      buildPersistedCampaignEventRows(
        campaign.gmInterventionEvents,
        campaign.timeCascadeEvents,
        campaign.updatedAt,
        actorId,
      ),
    [
      actorId,
      campaign.gmInterventionEvents,
      campaign.timeCascadeEvents,
      campaign.updatedAt,
    ],
  );
  const [preview, setPreview] = useState<GmLedgerPreview | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string>(
    'No approved GM corrections yet.',
  );
  const [approvalReason, setApprovalReason] = useState<string | null>(null);
  const [playerRows, setPlayerRows] = useState<readonly PlayerLedgerRow[]>(
    () => persistedRows.playerRows,
  );
  const [gmRows, setGmRows] = useState<readonly GmLedgerRow[]>(
    () => persistedRows.gmRows,
  );
  const [manualTakeover, setManualTakeover] =
    useState<ManualTakeoverState | null>(null);
  const rosterEntries = useCampaignRosterStore((state) => state.pilots);
  const applyPilotPatches = useCampaignRosterStore(
    (state) => state.applyPilotPatches,
  );

  useEffect(() => {
    if (actionLedger.getRecords().length > 0) return;
    setPlayerRows(persistedRows.playerRows);
    setGmRows(persistedRows.gmRows);
  }, [actionLedger, persistedRows]);

  const canApprove = preview?.status === 'ready';
  const canTakeManualControl = preview?.status === 'requires-manual-takeover';

  const handleMerchantPreview = (conflicted: boolean): void => {
    const nextPreview = createGmCascadePreview({
      ledger: campaignLedger,
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

    setNextPreview(nextPreview);
  };

  const handleRepairPreview = (): void => {
    const nextPreview = createGmCascadePreview({
      ledger: campaignLedger,
      command: buildRepairCompletionCommand({
        actorId,
        campaign,
      }),
      state: campaign as IGmCampaignInterventionState,
      authority: {
        actorId,
        role: 'gm',
        gameId: `campaign:${campaign.id}:gm-ledger`,
        campaignId: campaign.id,
        ownedStateRefs: [`campaign:${campaign.id}`],
      },
      interventionId: REPAIR_COMPLETION_ID,
      now,
    }) as GmCampaignPreview;

    setNextPreview(nextPreview);
  };

  const handleSalvagePreview = (): void => {
    const nextPreview = createGmCascadePreview({
      ledger: campaignLedger,
      command: buildSalvageProcessedCommand({
        actorId,
        campaign,
      }),
      state: campaign as IGmCampaignInterventionState,
      authority: {
        actorId,
        role: 'gm',
        gameId: `campaign:${campaign.id}:gm-ledger`,
        campaignId: campaign.id,
        ownedStateRefs: [`campaign:${campaign.id}`],
      },
      interventionId: SALVAGE_PROCESSED_ID,
      now,
    }) as GmCampaignPreview;

    setNextPreview(nextPreview);
  };

  const handleUnitReloadPreview = (): void => {
    const nextPreview = createGmCascadePreview({
      ledger: campaignLedger,
      command: buildUnitReloadReconciliationCommand({
        actorId,
        campaign,
        now,
      }),
      state: campaign as IGmCampaignInterventionState,
      authority: {
        actorId,
        role: 'gm',
        gameId: `campaign:${campaign.id}:gm-ledger`,
        campaignId: campaign.id,
        ownedStateRefs: [`campaign:${campaign.id}`],
      },
      interventionId: UNIT_RELOAD_RECONCILIATION_ID,
      now,
    }) as GmCampaignPreview;

    setNextPreview(nextPreview);
  };

  const handleTimePreview = (conflicted: boolean): void => {
    const nextPreview = createGmCascadePreview({
      ledger: timeLedger,
      command: buildTimeCascadeCommand({
        actorId,
        campaign,
        conflicted,
        now,
        rosterEntries,
      }),
      state: campaign as IGmTimeCascadeInterventionState,
      authority: {
        actorId,
        role: 'gm',
        gameId: `campaign:${campaign.id}:gm-ledger`,
        campaignId: campaign.id,
        ownedStateRefs: [`campaign:${campaign.id}`],
      },
      interventionId: conflicted ? TIME_CASCADE_MANUAL_ID : TIME_CASCADE_ID,
      now,
    }) as GmLedgerPreview;

    setNextPreview(nextPreview);
  };

  const handleApprove = (): void => {
    if (!preview) return;
    const approvedAt = now();
    if (preview.domain === 'time') {
      const result = approveGmCascadePreview<
        IGmTimeCascadeInterventionState,
        IGmPrivateMetadata,
        IGmTimeCascadePublicEffect,
        IGmTimeCascadeInterventionDomainPayload
      >({
        ledger: timeLedger,
        actionLedger,
        preview: preview as GmTimeCascadePreview,
        state: campaign as IGmTimeCascadeInterventionState,
        approvedAt,
        createdAt: approvedAt,
      });

      if (result.status !== 'approved') {
        setApprovalStatus('Approval blocked.');
        setApprovalReason(
          result.reason ?? 'The time-cascade preview could not be approved.',
        );
        return;
      }

      const timePayload = result.record?.domainPayload as
        | IGmTimeCascadeInterventionDomainPayload
        | undefined;
      const rosterPatches = buildRosterRecoveryPatchesFromExternalEffects(
        timePayload?.projectedEffects.flatMap(
          (effect) => effect.externalEffects,
        ) ?? [],
      );
      applyPilotPatches(rosterPatches);
      onApplyCampaignUpdate(result.state);
      setApprovalStatus('Approved and applied to campaign state.');
      setApprovalReason(null);
      refreshLedgerRows(actionLedger, setPlayerRows, setGmRows);
      return;
    }

    const result = approveGmCascadePreview<
      IGmCampaignInterventionState,
      IGmPrivateMetadata,
      IGmCampaignPublicEffect,
      IGmCampaignInterventionDomainPayload
    >({
      ledger: campaignLedger,
      actionLedger,
      preview: preview as GmCampaignPreview,
      state: campaign as IGmCampaignInterventionState,
      approvedAt,
      createdAt: approvedAt,
    });

    if (result.status !== 'approved') {
      setApprovalStatus('Approval blocked.');
      setApprovalReason(result.reason ?? 'The preview could not be approved.');
      return;
    }

    onApplyCampaignUpdate(result.state);
    setApprovalStatus('Approved and applied to campaign state.');
    setApprovalReason(null);
    refreshLedgerRows(actionLedger, setPlayerRows, setGmRows);
  };

  const handleManualTakeover = (): void => {
    if (!preview || !preview.privateMetadata) return;
    const createdAt = now();
    const manualPublicEffect = buildManualPublicEffect(preview, campaign);
    const targetLedger =
      preview.domain === 'time' ? timeLedger : campaignLedger;
    const manualRecord = targetLedger.appendApprovedRecord({
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
          'Manual takeover selected because projected effects conflict with the current cascade state.',
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

  const setNextPreview = (nextPreview: GmLedgerPreview): void => {
    setPreview(nextPreview);
    setManualTakeover(null);
    setApprovalReason(null);
    setApprovalStatus(
      nextPreview.status === 'ready'
        ? 'Ready for GM approval.'
        : `Preview status: ${nextPreview.status}`,
    );
  };

  return (
    <section
      className="space-y-6"
      data-testid="gm-ledger-control-plane"
      aria-label="GM campaign ledger"
    >
      <GmCampaignLedgerStatusCards
        balanceLabel={campaign.finances.balance.format()}
        approvalStatus={approvalStatus}
      />

      <GmCampaignInterventionActions
        canApprove={canApprove}
        canTakeManualControl={canTakeManualControl}
        onMerchantPreview={handleMerchantPreview}
        onApprove={handleApprove}
        onRepairPreview={handleRepairPreview}
        onSalvagePreview={handleSalvagePreview}
        onUnitReloadPreview={handleUnitReloadPreview}
        onTimePreview={handleTimePreview}
        onManualTakeover={handleManualTakeover}
      />

      {preview ? (
        <GmPreviewPanel preview={preview} approvalReason={approvalReason} />
      ) : null}

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

function buildManualPublicEffect(
  preview: GmLedgerPreview,
  campaign: ICampaign,
): GmLedgerPublicEffect {
  if (preview.domain === 'time') {
    const currentDate = campaign.currentDate.toISOString();
    return {
      summary: 'GM manual review opened. No campaign state changed.',
      family: 'time-advance',
      days: 0,
      fromDate: currentDate,
      toDate: currentDate,
      fromSystemId: campaign.currentSystemId,
      toSystemId: campaign.currentSystemId,
      changedStateRefs: [],
    };
  }

  return {
    summary: 'GM manual review opened. No campaign state changed.',
    family: 'funds-transaction',
    changedStateRefs: [],
  };
}
