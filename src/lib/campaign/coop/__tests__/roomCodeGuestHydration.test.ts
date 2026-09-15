/**
 * Genesis-seeded guest hydration (task 3.5 empty-state trap).
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';
import type { IContract } from '@/types/campaign/Mission';

import {
  buildCampaignSourcePrivateEnvelope,
  computeCampaignSourceBodyDigest,
  replayCampaignSourceContracts,
} from '@/lib/campaign/authority/campaignSourcePrivateEnvelope';
import { buildScopedCampaignSnapshot } from '@/lib/campaign/delivery/buildScopedCampaignSnapshot';
import { foldCampaignGrantDeliveryItems } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import { appendCampaignCommandBatch } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { AtBContractType } from '@/types/campaign/contracts/contractTypes';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';

import {
  EVENT_TS,
  PARTICIPANT_PLAYER,
  closeCampaignDeliveryHarness,
  issueTestGrant,
  mintGrantPrincipal,
  openCampaignDeliveryHarness,
} from '../../delivery/__tests__/grantProjectionHarness';
import {
  buildRoomCodeGuestHydration,
  composeRoomCodeGuestState,
  grantCursorFromReplicaCursor,
  genesisStateFromHostLog,
  roomCodeGuestClientSnapshotEvent,
} from '../roomCodeGuestHydration';

const CAMPAIGN_ID = 'campaign-hydrate';
const TS = '2026-08-22T16:30:00.000Z';

/** Host-log genesis snapshot used as the empty-state-trap fixture. */
function genesis(balance: number): ICampaignEvent {
  return {
    type: 'CampaignSnapshotPublished',
    sequence: 0,
    campaignId: CAMPAIGN_ID,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance,
        rosterUnits: {
          'unit-1': {
            unitId: 'unit-1',
            designation: 'Atlas',
            status: 'operational',
          },
        },
      },
    },
  };
}

describe('composeRoomCodeGuestState', () => {
  it('keeps genesis funds when the projector skipped the stored baseline', () => {
    const state = composeRoomCodeGuestState(
      CAMPAIGN_ID,
      [genesis(1_000_000)],
      [],
    );
    expect(state.balance).toBe(1_000_000);
    expect(state.rosterUnits['unit-1']?.designation).toBe('Atlas');
    expect(genesisStateFromHostLog([genesis(1_000_000)])?.balance).toBe(
      1_000_000,
    );
  });

  it('folds in-scope incrementals onto genesis', () => {
    const items: readonly ICampaignGrantDeliveryItem[] = [
      {
        deliverySequence: 1,
        event: {
          type: 'CampaignDayAdvanced',
          campaignId: CAMPAIGN_ID,
          ts: TS,
          authorPlayerId: 'pid_host',
          scope: 'campaign',
          payload: { newDay: 4 },
        },
      },
    ];
    const state = composeRoomCodeGuestState(
      CAMPAIGN_ID,
      [genesis(500_000)],
      items,
    );
    expect(state.balance).toBe(500_000);
    expect(state.day).toBe(4);
  });

  it('maps replica cursor 1 back to projector afterSequence 0', () => {
    expect(
      grantCursorFromReplicaCursor({
        deliveryEpochId: 'epoch-a',
        afterSequence: 1,
      }),
    ).toEqual({ deliveryEpochId: 'epoch-a', afterSequence: 0 });
  });

  it('folds replica hydration items to the composed guest state', () => {
    const items: readonly ICampaignGrantDeliveryItem[] = [
      {
        deliverySequence: 1,
        event: {
          type: 'CampaignDayAdvanced',
          campaignId: CAMPAIGN_ID,
          ts: TS,
          authorPlayerId: 'pid_host',
          scope: 'campaign',
          payload: { newDay: 4 },
        },
      },
    ];
    const hydration = buildRoomCodeGuestHydration(
      CAMPAIGN_ID,
      [genesis(500_000)],
      items,
      'epoch-a',
      TS,
      'pid_host',
    );
    expect(
      foldCampaignGrantDeliveryItems(CAMPAIGN_ID, hydration.replicaItems),
    ).toEqual(hydration.state);
    expect(hydration.state.day).toBe(4);
    expect(hydration.state.balance).toBe(500_000);
  });
});
/**
 * Source-only leak row for the ROOM-CODE hydration surface (design D12,
 * task 6.3). The grant-projection leak row proves `envelopeOf` withholds
 * the private sibling from a delivery ITEM. This row proves the room-code
 * guest's recomposed hydration snapshot -- a second, downstream surface
 * that re-folds those items and republishes a campaign-scope
 * `CampaignSnapshotPublished` -- inherits that same boundary rather than
 * owning one of its own. It runs the real path
 * `handleRoomCodeGuestJoin.hydrateFirstJoin` runs:
 * `buildScopedCampaignSnapshot` over a real SQLite journal, then
 * `buildRoomCodeGuestHydration` over the page it returns.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/tasks.md (6.3)
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D12)
 */
describe('room-code guest hydration source-only private envelope', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  const LEAK_CAMPAIGN_ID = 'campaign-room-code-private-leak';

  /**
   * Every value here is source-only under D12 and appears nowhere in the
   * compact `ICampaignAcceptedContract` the wire carries, so any of them
   * showing up in the hydrated bytes is a leak and not a coincidence.
   */
  const PRIVATE_MARKERS: readonly string[] = [
    'house-liao',
    'Integrated',
    AtBMoraleLevel.OVERWHELMING,
    AtBContractType.GARRISON_DUTY,
    'offer-remaining',
    '1250000',
    'sourcePrivate',
  ];

  /** A full contract; source-only in its entirety. */
  function privateContract(id: string): IContract {
    return {
      id,
      name: 'Garrison Duty on Galatea',
      status: MissionStatus.ACTIVE,
      type: 'contract',
      systemId: 'galatea',
      scenarioIds: [],
      createdAt: EVENT_TS,
      updatedAt: EVENT_TS,
      employerId: 'house-davion',
      targetId: 'house-liao',
      paymentTerms: createPaymentTerms({
        basePayment: new Money(1_250_000),
        successPayment: new Money(500_000),
        partialPayment: new Money(250_000),
        failurePayment: new Money(0),
        salvagePercent: 35,
        transportPayment: new Money(100_000),
        supportPayment: new Money(75_000),
      }),
      salvageRights: 'Integrated',
      commandRights: 'Independent',
      moraleLevel: AtBMoraleLevel.OVERWHELMING,
      atbContractType: AtBContractType.GARRISON_DUTY,
    } as IContract;
  }

  /** The compact wire fact, byte-for-byte what the guest may see. */
  const COMPACT_CONTRACT = {
    contractId: 'offer-taken',
    name: 'Garrison Duty on Galatea',
    employerFactionId: 'house-davion',
  } as const;

  /** Host-log genesis for the leak campaign; the hydration seed. */
  function leakGenesis(): ICampaignEvent {
    return {
      type: 'CampaignSnapshotPublished',
      sequence: 0,
      campaignId: LEAK_CAMPAIGN_ID,
      ts: EVENT_TS,
      authorPlayerId: 'pid_host',
      scope: 'campaign',
      payload: { state: createEmptyCampaignState(LEAK_CAMPAIGN_ID) },
    };
  }

  /** Commits an acceptance whose full detail rides the private sibling. */
  async function commitAcceptedContract(): Promise<void> {
    const result = await appendCampaignCommandBatch(harness.journal, {
      campaignId: LEAK_CAMPAIGN_ID,
      commandId: 'cmd-room-code-private-leak-accept',
      events: [
        {
          sequence: 0,
          campaignId: LEAK_CAMPAIGN_ID,
          ts: EVENT_TS,
          authorPlayerId: 'pid_host',
          type: 'ContractAccepted',
          scope: 'campaign',
          payload: { contract: { ...COMPACT_CONTRACT } },
        } as ICampaignEvent,
      ],
      expectedPostStateDigest: null,
      sourcePrivate: buildCampaignSourcePrivateEnvelope({
        baseline: {
          sourceRecordBody: JSON.stringify({ id: LEAK_CAMPAIGN_ID }),
          sourceRowVersion: 3,
          rootPublicRevision: 1,
        },
        acceptedContract: privateContract('offer-taken'),
        remainingMarket: {
          offers: [privateContract('offer-remaining')],
          declinedOfferIds: [],
        },
      }),
    });
    if (result.kind !== 'committed') {
      throw new Error('expected committed append, got ' + result.kind);
    }
  }

  it('withholds the private contract and market from the recomposed guest snapshot', async () => {
    const grant = issueTestGrant(harness, {
      campaignId: LEAK_CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await commitAcceptedContract();

    const built = await buildScopedCampaignSnapshot(harness.deps, {
      principal: mintGrantPrincipal(PARTICIPANT_PLAYER),
      grantId: grant.grantId,
      nowIso: EVENT_TS,
    });
    expect(built.kind).toBe('snapshot');
    if (built.kind !== 'snapshot') return;

    const hydration = buildRoomCodeGuestHydration(
      LEAK_CAMPAIGN_ID,
      [leakGenesis()],
      built.page.items,
      built.page.deliveryEpochId,
      EVENT_TS,
      'pid_host',
    );
    const clientSnapshot = roomCodeGuestClientSnapshotEvent({
      campaignId: LEAK_CAMPAIGN_ID,
      matchId: 'match-room-code',
      state: hydration.state,
      ts: EVENT_TS,
      authorPlayerId: 'pid_host',
      revision: hydration.projectorHead,
    });

    // POSITIVE shape assertion, not a missing-key check: the hydrated
    // ledger entry must be EXACTLY the three-field compact contract.
    // `toEqual` fails on any extra key, so a private field folded in
    // through the projection cannot pass by being merely unnamed here.
    expect(hydration.state.contracts).toEqual({
      'offer-taken': { ...COMPACT_CONTRACT },
    });
    // The replica item the guest actually receives, whole.
    const accepted = hydration.replicaItems.filter(function (item) {
      return item.event.type === 'ContractAccepted';
    });
    expect(accepted).toHaveLength(1);
    expect(accepted[0]).toEqual({
      deliverySequence: 2,
      event: {
        type: 'ContractAccepted',
        campaignId: LEAK_CAMPAIGN_ID,
        ts: EVENT_TS,
        authorPlayerId: 'pid_host',
        scope: 'campaign',
        payload: { contract: { ...COMPACT_CONTRACT } },
      },
    });

    // Byte scan across every surface the guest sees: the replica backfill
    // page, the recomposed snapshot state, and the client snapshot frame.
    const surfaces: readonly string[] = [
      JSON.stringify(hydration.replicaItems),
      JSON.stringify(hydration.state),
      JSON.stringify(clientSnapshot),
    ];
    for (const wire of surfaces) {
      for (const marker of PRIVATE_MARKERS) {
        expect(wire).not.toContain(marker);
      }
    }
    // The compact fact is still delivered in full -- this row proves
    // withholding, not an empty hydration.
    expect(surfaces[1]).toContain('offer-taken');
    expect(surfaces[1]).toContain('house-davion');

    // The source side still binds: the private payload is on the stored
    // row, its captured baseline digest verifies, and the contract-only
    // replay recovers every fact the guest was denied.
    const rows = await harness.journal.readStream({
      streamType: 'campaign',
      streamId: LEAK_CAMPAIGN_ID,
      branchId: 'root',
      afterRevision: 0,
      limit: 10,
    });
    expect(Object.hasOwn(rows[0].payload, 'sourcePrivate')).toBe(true);
    const projection = replayCampaignSourceContracts(rows);
    expect(projection.baseline.sourceBodyDigest).toBe(
      computeCampaignSourceBodyDigest(projection.baseline.sourceRecordBody),
    );
    expect(projection.acceptedContracts).toHaveLength(1);
    expect(projection.acceptedContracts[0]?.targetId).toBe('house-liao');
    expect(projection.acceptedContracts[0]?.salvageRights).toBe('Integrated');
    expect(projection.remainingMarket.offers[0]?.id).toBe('offer-remaining');
  });
});
