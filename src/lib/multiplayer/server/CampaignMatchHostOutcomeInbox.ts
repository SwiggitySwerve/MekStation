import type { ICoopBattleConsequences } from '@/lib/campaign/coop/reconcileCoopBattle';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import {
  CampaignEventSequenceCollisionError,
  CampaignProjectionDivergenceError,
  type ICampaignEventStore,
  type ICampaignOutcomeVersionConflict,
} from '@/lib/campaign/sync/ICampaignEventStore';
import { computeCampaignStateDigest } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { ICampaignBatchCommitHost } from './campaignHostBatchCommit';
import type { UnsequencedCampaignEvent } from './CampaignMatchHostIntent';

import { validateCampaignIntent } from './CampaignMatchHostIntent';

export type CampaignOutcomeConsequenceResult =
  | { readonly kind: 'committed'; readonly events: readonly ICampaignEvent[] }
  | { readonly kind: 'duplicate'; readonly events: readonly ICampaignEvent[] }
  | ICampaignOutcomeVersionConflict
  | { readonly kind: 'rejected'; readonly reason: string };

interface ICampaignOutcomeInboxHost {
  readonly campaignId: string;
  readonly hostPlayerId: string;
  readonly eventStore: ICampaignEventStore;
  readonly getState: () => ICampaignAuthoritativeState;
  readonly setState: (state: ICampaignAuthoritativeState) => void;
  readonly nextSequence: () => Promise<number>;
  readonly reconstructState: () => Promise<ICampaignAuthoritativeState>;
  readonly markDivergence: () => void;
  readonly publish: (event: ICampaignEvent) => void;
}

/**
 * Adapt the batch-commit context to this module's vocabulary.
 *
 * The two describe the same host with different field names; building
 * the second by hand duplicated seven closures over the same state, and
 * a divergence between them would be invisible until one path wrote
 * state the other could not see.
 */
export function outcomeInboxHostFrom(
  base: ICampaignBatchCommitHost,
  hostPlayerId: string,
  eventStore: ICampaignEventStore,
): ICampaignOutcomeInboxHost {
  return {
    campaignId: base.campaignId,
    hostPlayerId,
    eventStore,
    getState: base.readState,
    setState: base.writeState,
    nextSequence: base.nextSequence,
    reconstructState: base.rebuildState,
    markDivergence: base.markDivergence,
    publish: base.publish,
  };
}

export async function commitCampaignOutcomeConsequences(
  host: ICampaignOutcomeInboxHost,
  consequences: ICoopBattleConsequences,
): Promise<CampaignOutcomeConsequenceResult> {
  const appendCombatOutcomeBatch = host.eventStore.appendCombatOutcomeBatch;
  if (!appendCombatOutcomeBatch) {
    return { kind: 'rejected', reason: 'outcome-inbox-unavailable' };
  }
  if (consequences.campaignId !== host.campaignId) {
    return { kind: 'rejected', reason: 'campaign-mismatch' };
  }

  const derived = deriveCombatOutcomeConsequences(host, consequences);
  if (derived.kind === 'rejected') return derived;
  if (derived.events.length === 0) {
    return { kind: 'rejected', reason: 'empty-outcome-consequences' };
  }

  const base = await host.nextSequence();
  const sequenced = derived.events.map((unsequenced, index) =>
    freezeCampaignEvent({
      ...unsequenced,
      sequence: base + index,
    } as ICampaignEvent),
  );
  const expected = applyAll(host.getState(), sequenced);
  const expectedDigest = computeCampaignStateDigest(expected);
  const outcomeVersion = consequences.outcomeVersion ?? 1;
  const appended = await appendCombatOutcomeBatch(host.campaignId, {
    outcomeId: consequences.matchId,
    outcomeVersion,
    commandId: `campaign-outcome:${host.campaignId}:${consequences.matchId}:${outcomeVersion}`,
    events: sequenced,
    expectedPostStateDigest: expectedDigest,
  });
  if (appended.kind === 'duplicate') return { kind: 'duplicate', events: [] };
  if (appended.kind === 'outcome-version-conflict') return appended;
  if (appended.kind !== 'committed') {
    throw new CampaignEventSequenceCollisionError(host.campaignId, base);
  }

  const applied = applyAll(host.getState(), sequenced);
  const appliedDigest = computeCampaignStateDigest(applied);
  if (appliedDigest !== expectedDigest) {
    host.markDivergence();
    host.setState(await host.reconstructState());
    throw new CampaignProjectionDivergenceError(
      host.campaignId,
      expectedDigest,
      appliedDigest,
    );
  }
  host.setState(applied);
  sequenced.forEach(host.publish);
  return { kind: 'committed', events: sequenced };
}

function applyAll(
  state: ICampaignAuthoritativeState,
  events: readonly ICampaignEvent[],
): ICampaignAuthoritativeState {
  return events.reduce(
    (current, event) => applyCampaignEvent(current, event),
    state,
  );
}

function deriveCombatOutcomeConsequences(
  host: Pick<
    ICampaignOutcomeInboxHost,
    'campaignId' | 'hostPlayerId' | 'getState'
  >,
  consequences: ICoopBattleConsequences,
):
  | {
      readonly kind: 'accepted';
      readonly events: readonly UnsequencedCampaignEvent[];
    }
  | { readonly kind: 'rejected'; readonly reason: string } {
  const events: UnsequencedCampaignEvent[] = [];
  const state = host.getState();
  const ts = nowIso();
  if (consequences.fundsDelta < 0) {
    const result = validateCampaignIntent(
      {
        kind: 'SpendFunds',
        campaignId: host.campaignId,
        intentId: `campaign-outcome:${consequences.matchId}`,
        payload: {
          amount: Math.abs(consequences.fundsDelta),
          reason: consequences.fundsReason,
        },
      },
      state,
      host.hostPlayerId,
      ts,
    );
    if (!result.ok) return { kind: 'rejected', reason: result.reason };
    events.push(...result.events);
  }
  const salvageCredit =
    consequences.salvageValue + Math.max(0, consequences.fundsDelta);
  if (salvageCredit > 0) {
    events.push({
      type: 'SalvageAllocated',
      campaignId: host.campaignId,
      authorPlayerId: host.hostPlayerId,
      ts,
      scope: 'campaign',
      payload: {
        value: salvageCredit,
        poolRemaining: state.salvagePool + salvageCredit,
      },
    });
  }
  for (const change of consequences.rosterChanges) {
    events.push({
      type: 'RosterUnitChanged',
      campaignId: host.campaignId,
      authorPlayerId: host.hostPlayerId,
      ts,
      scope: 'campaign',
      payload: {
        change: change.status === 'destroyed' ? 'removed' : 'repaired',
        unit: {
          unitId: change.unitId,
          designation: change.designation,
          status: change.status,
        },
      },
    });
  }
  return { kind: 'accepted', events };
}
