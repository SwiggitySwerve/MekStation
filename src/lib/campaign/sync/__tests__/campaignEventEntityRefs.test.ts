/**
 * Campaign journal entity lineage (task 5.3 — journal lineage only).
 *
 * Pins: per-type entity-ref derivation (campaign subject always; pilot,
 * contract, campaign-unit + canonical/saved source split by unitSource,
 * salvage recovery, co-op session on snapshots); and the identity chain at
 * the journal level — `readEntityHistory` for one campaign-unit id returns
 * exactly the ordered events that touched it, for its saved-design source
 * the adoption-and-recovery chain, and for a pilot its hire. UI-journey
 * resolution of saved custom units remains receipt-proven by CAMP-01G (the
 * 2026-08-12 camp-01g reviewed-head + exact-main receipts) and is cited,
 * not re-proven, here.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import {
  CAMPAIGN_ENTITY_TYPES,
  campaignEventEntityRefs,
} from '../campaignEventEntityRefs';
import {
  appendCampaignCommandBatch,
  type ICampaignJournalEnvelope,
} from '../JournalCampaignEventStore';

const NOW = '3025-01-03T00:00:00.000Z';

const customUnit = {
  unitId: 'unit-instance-1',
  designation: 'Atlas AS7-D (refit)',
  status: 'operational',
  unitRef: 'saved-design-9',
  unitSource: 'custom',
} as const;

const canonicalUnit = {
  unitId: 'unit-instance-2',
  designation: 'Locust LCT-1V',
  status: 'operational',
  unitRef: 'locust-lct-1v',
  unitSource: 'canonical',
} as const;

function event(
  sequence: number,
  type: ICampaignEvent['type'],
  payload: unknown,
): ICampaignEvent {
  return {
    sequence,
    campaignId: 'campaign-lineage',
    ts: NOW,
    authorPlayerId: 'pid-host',
    type,
    scope: 'campaign',
    payload,
  } as ICampaignEvent;
}

describe('campaignEventEntityRefs derivation', () => {
  it('always names the campaign as subject and nothing else for day/funds', () => {
    for (const e of [
      event(0, 'CampaignDayAdvanced', { newDay: 1 }),
      event(1, 'FundsChanged', { delta: 1, reason: 'r', balance: 1 }),
    ]) {
      expect(campaignEventEntityRefs('campaign-lineage', e)).toEqual([
        {
          entityType: CAMPAIGN_ENTITY_TYPES.campaign,
          entityId: 'campaign-lineage',
          role: 'subject',
        },
      ]);
    }
  });

  it('links pilot hires, contract acceptance, and the co-op session', () => {
    expect(
      campaignEventEntityRefs(
        'campaign-lineage',
        event(0, 'PilotHired', {
          pilot: { pilotId: 'pilot-7', name: 'Kai' },
          cost: 1,
        }),
      ),
    ).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.pilot,
      entityId: 'pilot-7',
      role: 'hired',
    });
    expect(
      campaignEventEntityRefs(
        'campaign-lineage',
        event(0, 'ContractAccepted', {
          contract: {
            contractId: 'contract-3',
            name: 'Raid',
            employerFactionId: 'davion',
          },
        }),
      ),
    ).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.contract,
      entityId: 'contract-3',
      role: 'accepted',
    });
    expect(
      campaignEventEntityRefs(
        'campaign-lineage',
        event(0, 'CampaignSnapshotPublished', {
          state: {},
          matchId: 'match-5',
          revision: 0,
        }),
      ),
    ).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.match,
      entityId: 'match-5',
      role: 'session',
    });
  });

  it('splits unit source lineage by unitSource and keeps roles from the change', () => {
    const custom = campaignEventEntityRefs(
      'campaign-lineage',
      event(0, 'RosterUnitChanged', { change: 'added', unit: customUnit }),
    );
    expect(custom).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.campaignUnit,
      entityId: 'unit-instance-1',
      role: 'added',
    });
    expect(custom).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.savedDesign,
      entityId: 'saved-design-9',
      role: 'source',
    });

    const canonical = campaignEventEntityRefs(
      'campaign-lineage',
      event(0, 'RosterUnitChanged', {
        change: 'repaired',
        unit: canonicalUnit,
      }),
    );
    expect(canonical).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.canonicalUnit,
      entityId: 'locust-lct-1v',
      role: 'source',
    });

    const noRef = campaignEventEntityRefs(
      'campaign-lineage',
      event(0, 'RosterUnitChanged', {
        change: 'removed',
        unit: { unitId: 'unit-3', designation: 'X', status: 'destroyed' },
      }),
    );
    expect(noRef.filter((ref) => ref.role === 'source')).toHaveLength(0);
  });

  it('links salvage-recovered units and omits the ref when nothing is recovered', () => {
    const recovered = campaignEventEntityRefs(
      'campaign-lineage',
      event(0, 'SalvageAllocated', {
        value: 1,
        poolRemaining: 0,
        recoveredUnit: customUnit,
      }),
    );
    expect(recovered).toContainEqual({
      entityType: CAMPAIGN_ENTITY_TYPES.campaignUnit,
      entityId: 'unit-instance-1',
      role: 'recovered',
    });
    expect(
      campaignEventEntityRefs(
        'campaign-lineage',
        event(0, 'SalvageAllocated', { value: 1, poolRemaining: 0 }),
      ),
    ).toHaveLength(1);
  });
});

describe('journal-level identity chains', () => {
  it('resolves the same durable unit, source, and pilot chains through readEntityHistory', async () => {
    const journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(
      () => NOW,
    );
    const script: readonly [string, ICampaignEvent][] = [
      [
        'cmd-hire',
        event(0, 'PilotHired', {
          pilot: { pilotId: 'pilot-7', name: 'Kai' },
          cost: 1,
        }),
      ],
      [
        'cmd-adopt',
        event(1, 'RosterUnitChanged', { change: 'added', unit: customUnit }),
      ],
      ['cmd-day', event(2, 'CampaignDayAdvanced', { newDay: 2 })],
      [
        'cmd-salvage',
        event(3, 'SalvageAllocated', {
          value: 1,
          poolRemaining: 0,
          recoveredUnit: { ...customUnit, status: 'damaged' },
        }),
      ],
      [
        'cmd-repair',
        event(4, 'RosterUnitChanged', { change: 'repaired', unit: customUnit }),
      ],
    ];
    for (const [commandId, one] of script) {
      const result = await appendCampaignCommandBatch(journal, {
        campaignId: 'campaign-lineage',
        commandId,
        events: [one],
        expectedPostStateDigest: null,
      });
      expect(result.kind).toBe('committed');
    }

    const query = {
      afterCommitPosition: 0,
      throughCommitPosition: 100,
      limit: 50,
    };
    const unitChain = await journal.readEntityHistory({
      ...query,
      entityType: CAMPAIGN_ENTITY_TYPES.campaignUnit,
      entityId: 'unit-instance-1',
    });
    expect(
      unitChain.map((row) => [
        row.payload.campaignEvent.sequence,
        row.eventType,
      ]),
    ).toEqual([
      [1, 'RosterUnitChanged'],
      [3, 'SalvageAllocated'],
      [4, 'RosterUnitChanged'],
    ]);

    const sourceChain = await journal.readEntityHistory({
      ...query,
      entityType: CAMPAIGN_ENTITY_TYPES.savedDesign,
      entityId: 'saved-design-9',
      role: 'source',
    });
    expect(
      sourceChain.map((row) => row.payload.campaignEvent.sequence),
    ).toEqual([1, 3, 4]);

    const pilotChain = await journal.readEntityHistory({
      ...query,
      entityType: CAMPAIGN_ENTITY_TYPES.pilot,
      entityId: 'pilot-7',
    });
    expect(pilotChain.map((row) => row.eventType)).toEqual(['PilotHired']);

    const campaignChain = await journal.readEntityHistory({
      ...query,
      entityType: CAMPAIGN_ENTITY_TYPES.campaign,
      entityId: 'campaign-lineage',
    });
    expect(campaignChain).toHaveLength(5);
  });
});
