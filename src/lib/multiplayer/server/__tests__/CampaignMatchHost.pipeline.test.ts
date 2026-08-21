/**
 * CampaignMatchHost D10 command→append pipeline (task 1.2).
 *
 * Pins, over a journal-backed batch-capable store: the baseline and every
 * intent commit as ONE atomic journal command per batch (a hire's funds
 * debit + roster entry share a command id) with the expected post-state
 * digest on the terminal event; rejected intents journal nothing; the
 * stream reprojects to exactly the host's live state; and a verify-after-
 * apply divergence publishes no success, rebuilds the projection from the
 * journal, records the diagnostic, and leaves the committed batch intact.
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { CampaignProjectionDivergenceError } from '@/lib/campaign/sync/ICampaignEventStore';

// Controllable one-shot drift around the real reducer, so the divergence
// row can make exactly one application pass disagree while every other
// pass — including the journal rebuild — stays faithful.
let driftNextDayAdvance = false;
jest.mock('@/lib/campaign/sync/applyCampaignEvent', () => {
  const actual = jest.requireActual('@/lib/campaign/sync/applyCampaignEvent');
  return {
    ...actual,
    applyCampaignEvent: (state: never, event: { type: string }) => {
      const next = actual.applyCampaignEvent(state, event);
      if (driftNextDayAdvance && event.type === 'CampaignDayAdvanced') {
        driftNextDayAdvance = false;
        return { ...next, balance: (next as { balance: number }).balance + 1 };
      }
      return next;
    },
  };
});
import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import { CampaignMatchHost } from '../CampaignMatchHost';

const NOW = '3025-01-03T00:00:00.000Z';

function initialState(campaignId: string): ICampaignAuthoritativeState {
  return {
    campaignId,
    day: 0,
    balance: 1_000_000,
    rosterUnits: {},
    pilots: {},
    contracts: {},
    factionStanding: {},
    salvagePool: 0,
  };
}

describe('CampaignMatchHost over a batch-capable journal store', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;
  let store: JournalCampaignEventStore;
  let host: CampaignMatchHost;
  let broadcasts: string[];

  beforeEach(async () => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    store = new JournalCampaignEventStore(journal);
    host = new CampaignMatchHost({
      campaignId: 'campaign-pipeline',
      hostPlayerId: 'pid-host',
      eventStore: store,
      initialState: initialState('campaign-pipeline'),
    });
    broadcasts = [];
    host.subscribe((event) =>
      broadcasts.push(`${event.sequence}:${event.type}`),
    );
    await host.open();
  });

  async function journalRows() {
    return journal.readStream({
      streamType: 'campaign',
      streamId: 'campaign-pipeline',
      branchId: 'root',
      afterRevision: 0,
      limit: 50,
    });
  }

  it('commits a multi-event hire as one atomic journal command with the digest on the terminal event', async () => {
    const result = await host.applyHostIntent({
      intentId: 'intent-hire-1',
      campaignId: 'campaign-pipeline',
      kind: 'HirePilot',
      payload: { pilot: { pilotId: 'pilot-1', name: 'Kai' }, cost: 150_000 },
    } as never);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.map((event) => event.type)).toEqual([
      'FundsChanged',
      'PilotHired',
    ]);

    const rows = await journalRows();
    // Baseline (1 event) + hire batch (2 events).
    expect(rows).toHaveLength(3);
    const hireRows = rows.slice(1);
    expect(new Set(hireRows.map((row) => row.commandId)).size).toBe(1);
    expect(hireRows[0].payload.expectedPostStateDigest).toBeNull();
    expect(hireRows[1].payload.expectedPostStateDigest).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(broadcasts).toEqual([
      '0:CampaignSnapshotPublished',
      '1:FundsChanged',
      '2:PilotHired',
    ]);
  });

  it('journals nothing for a rejected intent', async () => {
    const before = (await journalRows()).length;
    const result = await host.applyHostIntent({
      intentId: 'intent-overspend',
      campaignId: 'campaign-pipeline',
      kind: 'SpendFunds',
      payload: { amount: 99_000_000, reason: 'impossible' },
    } as never);

    expect(result.ok).toBe(false);
    expect((await journalRows()).length).toBe(before);
  });

  it('reprojects the stream to exactly the live authoritative state', async () => {
    await host.applyHostIntent({
      intentId: 'intent-hire-2',
      campaignId: 'campaign-pipeline',
      kind: 'HirePilot',
      payload: {
        pilot: { pilotId: 'pilot-2', name: 'Natasha' },
        cost: 100_000,
      },
    } as never);
    await host.applyHostIntent({
      intentId: 'intent-day',
      campaignId: 'campaign-pipeline',
      kind: 'AdvanceDay',
      payload: { days: 3 },
    } as never);

    expect(await host.getEventLog().reconstructState()).toEqual(
      host.getState(),
    );
  });

  it('on verify-after-apply divergence: no broadcast, journal-rebuilt state, batch retained', async () => {
    driftNextDayAdvance = true;
    const broadcastsBefore = broadcasts.length;
    await expect(
      host.applyHostIntent({
        intentId: 'intent-diverge',
        campaignId: 'campaign-pipeline',
        kind: 'AdvanceDay',
        payload: { days: 1 },
      } as never),
    ).rejects.toThrow(CampaignProjectionDivergenceError);

    expect(host.hasDetectedDivergence()).toBe(true);
    expect(broadcasts.length).toBe(broadcastsBefore);
    // The committed batch is retained in the durable log...
    const rows = await journalRows();
    expect(rows[rows.length - 1].eventType).toBe('CampaignDayAdvanced');
    // ...and the live projection equals the clean journal replay.
    expect(host.getState()).toEqual(
      await host.getEventLog().reconstructState(),
    );
  });
});
