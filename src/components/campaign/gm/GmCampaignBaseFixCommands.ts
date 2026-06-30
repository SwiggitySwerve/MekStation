import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  IGmCampaignInterventionCommandPayload,
  IInterventionLedgerCommand,
} from '@/types/interventions';

export const REPAIR_COMPLETION_ID = 'gm-ledger-repair-completion';
export const SALVAGE_PROCESSED_ID = 'gm-ledger-salvage-processed';
export const UNIT_RELOAD_RECONCILIATION_ID =
  'gm-ledger-unit-reload-reconciliation';

export function buildRepairCompletionCommand({
  actorId,
  campaign,
}: {
  readonly actorId: string;
  readonly campaign: ICampaign;
}): IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload> {
  const ticketId = campaign.repairQueue?.[0]?.ticketId ?? 'missing-ticket';

  return {
    domain: 'repair',
    kind: 'fix',
    actorId,
    targetRefs: [
      `campaign:${campaign.id}:repairQueue`,
      `campaign:${campaign.id}:repairQueue:${ticketId}`,
    ],
    payload: {
      correction: {
        family: 'repair-ticket',
        ticketId,
        patch: {
          status: 'completed',
          remainingHours: 0,
        },
      },
      privateMetadata: {
        reason:
          'Hidden repair correction: the table already resolved the work but the queue did not update.',
        defaultOutcome:
          'Without this GM action the repair ticket remains open and may block deployment.',
        hiddenNotes:
          'The maintenance crew favor can stay private until the players learn why it finished early.',
      },
      publicSummary: `Repair ticket ${ticketId} corrected by the GM.`,
    },
  };
}

export function buildSalvageProcessedCommand({
  actorId,
  campaign,
}: {
  readonly actorId: string;
  readonly campaign: ICampaign;
}): IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload> {
  const matchId =
    Object.keys(campaign.salvageAllocations ?? {})[0] ??
    'missing-salvage-allocation';

  return {
    domain: 'salvage',
    kind: 'fix',
    actorId,
    targetRefs: [
      `campaign:${campaign.id}:salvageAllocations`,
      `campaign:${campaign.id}:salvageAllocations:${matchId}`,
    ],
    payload: {
      correction: {
        family: 'salvage-allocation',
        matchId,
        patch: {
          processed: true,
        },
      },
      privateMetadata: {
        reason:
          'Hidden salvage correction: the table awarded this salvage but the allocation stayed unresolved.',
        defaultOutcome:
          'Without this GM action the salvage allocation remains pending and can be processed twice.',
        hiddenNotes:
          'Employer salvage pressure remains GM-only until the contract epilogue.',
      },
      publicSummary: `Salvage allocation ${matchId} corrected by the GM.`,
    },
  };
}

export function buildUnitReloadReconciliationCommand({
  actorId,
  campaign,
  now,
}: {
  readonly actorId: string;
  readonly campaign: ICampaign;
  readonly now: () => string;
}): IInterventionLedgerCommand<IGmCampaignInterventionCommandPayload> {
  const unitId =
    Object.keys(campaign.unitCombatStates ?? {})[0] ??
    Object.keys(campaign.unitConfigurations ?? {})[0] ??
    'missing-unit';

  return {
    domain: 'post-combat',
    kind: 'reload',
    actorId,
    targetRefs: [
      `campaign:${campaign.id}:unit:${unitId}`,
      `campaign:${campaign.id}:unitCombatStates:${unitId}`,
      `campaign:${campaign.id}:unitConfigurations:${unitId}`,
    ],
    payload: {
      correction: {
        family: 'base-unit-state',
        unitId,
        combatStatePatch: {
          combatReady: true,
          lastUpdated: now(),
        },
      },
      privateMetadata: {
        reason:
          'Hidden unit reload reconciliation: a campaign customizer update was not reflected in the loaded encounter state.',
        defaultOutcome:
          'Without this GM action the stale unit state continues to drive readiness and follow-up deployment checks.',
        hiddenNotes:
          'The GM may still need manual takeover if the live encounter has conflicting damage or pending actions.',
      },
      publicSummary: `Unit ${unitId} reload reconciliation recorded by the GM.`,
    },
  };
}
