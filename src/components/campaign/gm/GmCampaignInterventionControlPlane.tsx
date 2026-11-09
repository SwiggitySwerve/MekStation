import React, { useMemo, useState } from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  GmCascadeApprovalPreparation,
  IGmCampaignInterventionDomainPayload,
  IGmCampaignInterventionState,
  IGmCampaignPublicEffect,
  IGmCascadePreparedApproval,
  IGmPrivateMetadata,
  IGmTimeCascadeInterventionDomainPayload,
  IGmTimeCascadeInterventionState,
  IGmTimeCascadePublicEffect,
} from '@/types/interventions';

import { ActionLedger } from '@/lib/interventions/ActionLedger';
import { registerGmCampaignInterventionImplementers } from '@/lib/interventions/GmCampaignInterventionImplementer';
import {
  createGmCascadePreview,
  prepareGmCascadeApproval,
  recordGmCascadeApproval,
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
  mergeLedgerRows,
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
import { GmPreviewPanel, ManualTakeoverPanel } from './GmCampaignPreviewPanels';
import { useGmControlPlane, viewGmControl } from './gmControlPlaneState';

interface GmCampaignInterventionControlPlaneProps {
  readonly campaign: ICampaign;
  /**
   * Applies an approval's campaign update. Resolving to a string reports that
   * the update was refused and nothing was applied (the string is the reason);
   * resolving to anything else reports it applied.
   */
  readonly onApplyCampaignUpdate: (
    updates: GmCampaignUpdate,
  ) => void | Promise<string | null | void>;
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
  // Preview, approve and manual takeover are one token-guarded state (K11):
  // a stale or duplicate control action is refused by `dispatch`.
  const [{ control }, dispatch] = useGmControlPlane();
  const view = viewGmControl(control);
  const preview = control.kind === 'idle' ? null : control.preview;
  // This session's ledger rows; the shown rows merge them with the persisted
  // rows by intervention id, so saved history never drops out of view.
  const [sessionPlayerRows, setSessionPlayerRows] = useState<
    readonly PlayerLedgerRow[]
  >([]);
  const [sessionGmRows, setSessionGmRows] = useState<readonly GmLedgerRow[]>(
    [],
  );
  const playerRows = useMemo(
    () => mergeLedgerRows(persistedRows.playerRows, sessionPlayerRows),
    [persistedRows, sessionPlayerRows],
  );
  const gmRows = useMemo(
    () => mergeLedgerRows(persistedRows.gmRows, sessionGmRows),
    [persistedRows, sessionGmRows],
  );
  const rosterEntries = useCampaignRosterStore((state) => state.pilots);
  const applyPilotPatches = useCampaignRosterStore(
    (state) => state.applyPilotPatches,
  );

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

  const refreshSessionRows = (): void =>
    refreshLedgerRows(actionLedger, setSessionPlayerRows, setSessionGmRows);

  /** Records an approval whose update was applied (S14: never before). */
  const recordApplied = <TState,>(
    ledger: InterventionLedger<TState>,
    approval: GmLedgerPreview,
    prepared: IGmCascadePreparedApproval<TState>,
  ): void => {
    recordGmCascadeApproval({
      ledger,
      actionLedger,
      preview: approval,
      prepared,
    });
    refreshSessionRows();
  };

  /**
   * Runs one prepared approval under the preview's token. A blocked
   * preparation is reported; otherwise `approve-started` must be accepted
   * (a duplicate or stale approve is refused here, before anything is
   * applied), the update goes to `onApplyCampaignUpdate`, and only once it
   * applied does `record` run. A refusal, or a throw anywhere after the
   * start, is answered under the same token, so nothing escapes the click.
   */
  const runApproval = async <TState extends GmCampaignUpdate>(
    token: number,
    prepared: GmCascadeApprovalPreparation<TState>,
    record: (applied: IGmCascadePreparedApproval<TState>) => void,
  ): Promise<void> => {
    if (prepared.status === 'blocked') {
      dispatch({ type: 'approve-blocked', token, reason: prepared.reason });
      return;
    }
    if (!dispatch({ type: 'approve-started', token })) return;
    try {
      const refusal = await onApplyCampaignUpdate(prepared.state);
      if (typeof refusal === 'string') {
        dispatch({ type: 'approve-refused', token, reason: refusal });
        return;
      }
      record(prepared);
      dispatch({ type: 'approve-applied', token });
    } catch (error) {
      dispatch({
        type: 'approve-failed',
        token,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /**
   * Approves the current preview under a fresh intervention id (the preview's
   * id, the time in base 36 and six random base-36 characters), so each
   * approval is its own ledger record and row. The approval is prepared
   * without touching any ledger and run through `runApproval`; a time
   * cascade's roster patches are made only once its update applied.
   */
  const handleApprove = async (): Promise<void> => {
    if (control.kind !== 'previewed' && control.kind !== 'refused') return;
    const { token } = control;
    const approvedAt = now();
    const approval = {
      ...control.preview,
      interventionId: `${control.preview.interventionId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    };
    if (approval.domain === 'time') {
      await runApproval(
        token,
        prepareGmCascadeApproval<
          IGmTimeCascadeInterventionState,
          IGmPrivateMetadata,
          IGmTimeCascadePublicEffect,
          IGmTimeCascadeInterventionDomainPayload
        >({
          ledger: timeLedger,
          actionLedger,
          preview: approval as GmTimeCascadePreview,
          state: campaign as IGmTimeCascadeInterventionState,
          approvedAt,
          createdAt: approvedAt,
        }),
        (prepared) => {
          const timePayload = prepared.record.domainPayload as
            | IGmTimeCascadeInterventionDomainPayload
            | undefined;
          applyPilotPatches(
            buildRosterRecoveryPatchesFromExternalEffects(
              timePayload?.projectedEffects.flatMap(
                (effect) => effect.externalEffects,
              ) ?? [],
            ),
          );
          recordApplied(timeLedger, approval, prepared);
        },
      );
      return;
    }

    await runApproval(
      token,
      prepareGmCascadeApproval<
        IGmCampaignInterventionState,
        IGmPrivateMetadata,
        IGmCampaignPublicEffect,
        IGmCampaignInterventionDomainPayload
      >({
        ledger: campaignLedger,
        actionLedger,
        preview: approval as GmCampaignPreview,
        state: campaign as IGmCampaignInterventionState,
        approvedAt,
        createdAt: approvedAt,
      }),
      (prepared) => recordApplied(campaignLedger, approval, prepared),
    );
  };

  /**
   * Records one manual takeover for a conflicted preview. The dispatch is the
   * guard: once it is accepted the preview is in `manual`, so a repeat click
   * is refused before anything is appended.
   */
  const handleManualTakeover = (): void => {
    if (control.kind !== 'previewed' || !control.preview.privateMetadata) {
      return;
    }
    const { token, preview } = control;
    const accepted = dispatch({
      type: 'manual-recorded',
      token,
      conflicts: preview.conflicts.map((conflict) => conflict.message),
    });
    if (!accepted) return;
    const createdAt = now();
    const targetLedger =
      preview.domain === 'time' ? timeLedger : campaignLedger;
    const manualRecord = targetLedger.appendApprovedRecord({
      // The canned preview id repeats across previews; the token does not.
      id: `${preview.interventionId}:manual:${token}`,
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
      publicEffect: buildManualPublicEffect(preview, campaign),
      domainPayload: preview.domainPayload,
      createdAt,
      approvedAt: createdAt,
    });

    actionLedger.appendGmInterventionRecord(manualRecord);
    refreshSessionRows();
  };

  const setNextPreview = (nextPreview: GmLedgerPreview): void => {
    dispatch({ type: 'preview-generated', preview: nextPreview });
  };

  return (
    <section
      className="space-y-6"
      data-testid="gm-ledger-control-plane"
      aria-label="GM campaign ledger"
    >
      <GmCampaignLedgerStatusCards
        balanceLabel={campaign.finances.balance.format()}
        approvalStatus={view.status}
      />

      <GmCampaignInterventionActions
        canGenerate={view.canGenerate}
        canApprove={view.canApprove}
        canTakeManualControl={view.canTakeManualControl}
        onMerchantPreview={handleMerchantPreview}
        onApprove={handleApprove}
        onRepairPreview={handleRepairPreview}
        onSalvagePreview={handleSalvagePreview}
        onUnitReloadPreview={handleUnitReloadPreview}
        onTimePreview={handleTimePreview}
        onManualTakeover={handleManualTakeover}
      />

      {preview ? (
        <GmPreviewPanel
          preview={preview}
          approvalReason={view.reason}
          approvedApplied={view.approvedApplied}
        />
      ) : null}

      {view.manualTakeover ? (
        <ManualTakeoverPanel manualTakeover={view.manualTakeover} />
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
