/**
 * Command-based conflict handling end to end (umbrella task 8.4).
 *
 * The decision itself is proven pure next door; these rows prove the
 * pipeline feeds it honestly and acts on it:
 *  - the base is RECONSTRUCTED by replaying to the revision the client
 *    named, so `touchedFields` is what the command does to ITS base, not
 *    what it would do to the head;
 *  - a disjoint stale command is revalidated against the current head and
 *    commits there, keeping the intervening fact;
 *  - a same-field stale command is refused with the current branch,
 *    revision, and recovery action, and APPENDS NOTHING - asserted by
 *    counting the stream, not by trusting the return value;
 *  - the lost-race exit reports the head AFTER the failed append, and
 *    carries the same three things the pre-append refusal does, so the
 *    rejection contract has one shape rather than two.
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';

import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { readCampaignJournalEvents } from '../../sync/campaignJournalReads';
import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';
import { CAMPAIGN_CONFLICT_REBASE_ACTION } from '../campaignConflictDecision';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-conflict';
const AUTHOR = 'pid-solo';
const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };

/** Baseline revision: the imported snapshot is the only event. */
const BASELINE_REVISION = 1;

function spend(amount: number, intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

function advanceDay(intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'AdvanceDay',
    payload: {},
  } as unknown as ICampaignIntent;
}

describe('campaign command conflict handling', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
  });

  function run(
    intent: ICampaignIntent,
    commandId: string,
    stale?: {
      readonly expectedRevision?: number;
      readonly declaredFields?: readonly string[];
    },
    against: IEventJournal<ICampaignJournalEnvelope> = journal,
  ) {
    return executeCampaignCommand(
      { journal: against, authority: JOURNAL_AUTHORITY },
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: AUTHOR,
        commandId,
        ts: NOW,
        ...stale,
      },
    );
  }

  /** Every committed campaign fact, for counting what a refusal wrote. */
  function committed(): Promise<readonly ICampaignEvent[]> {
    return readCampaignJournalEvents(journal, CAMPAIGN_ID);
  }

  it('serializes a stale command whose fields are disjoint from the intervening fact', async () => {
    // Someone else advances the day while this client holds the baseline.
    expect((await run(advanceDay('i-day'), 'cmd-day')).kind).toBe('committed');

    const result = await run(spend(250_000, 'i-spend'), 'cmd-spend', {
      expectedRevision: BASELINE_REVISION,
      declaredFields: ['balance'],
    });

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    // Serialized at the CURRENT head: the spend applied and the
    // intervening day advance survived it.
    expect(result.state.balance).toBe(750_000);
    expect(result.state.day).toBe(1);
  });

  it('refuses a same-field stale command and appends nothing', async () => {
    expect((await run(spend(100_000, 'i-first'), 'cmd-first')).kind).toBe(
      'committed',
    );
    const before = (await committed()).length;

    const result = await run(spend(250_000, 'i-stale'), 'cmd-stale', {
      expectedRevision: BASELINE_REVISION,
      declaredFields: ['balance'],
    });

    expect(result).toMatchObject({
      kind: 'conflict',
      reason: 'same-field-stale',
      head: { branchId: ROOT_EVENT_BRANCH_ID, revision: before },
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
      conflictingFields: ['balance'],
    });
    // The prohibition, counted rather than trusted.
    expect((await committed()).length).toBe(before);
  });

  it('refuses a stale command that declares no field set', async () => {
    expect((await run(advanceDay('i-day2'), 'cmd-day2')).kind).toBe(
      'committed',
    );

    await expect(
      run(spend(250_000, 'i-bare'), 'cmd-bare', {
        expectedRevision: BASELINE_REVISION,
      }),
    ).resolves.toMatchObject({
      kind: 'conflict',
      reason: 'undeclared-field-set',
      recoveryAction: CAMPAIGN_CONFLICT_REBASE_ACTION,
    });
  });

  it('refuses a declaration the server did not derive', async () => {
    expect((await run(advanceDay('i-day3'), 'cmd-day3')).kind).toBe(
      'committed',
    );

    await expect(
      run(spend(250_000, 'i-liar'), 'cmd-liar', {
        expectedRevision: BASELINE_REVISION,
        // Disjoint from the intervening day advance, so a decision that
        // trusted this claim would serialize the command.
        declaredFields: ['rosterUnits[unit-a]'],
      }),
    ).resolves.toMatchObject({
      kind: 'conflict',
      reason: 'declared-field-set-mismatch',
      recoveryAction: CAMPAIGN_CONFLICT_REBASE_ACTION,
    });
  });

  it('refuses a base revision the stream never had', async () => {
    await expect(
      run(spend(1_000, 'i-ahead'), 'cmd-ahead', {
        expectedRevision: 99,
        declaredFields: ['balance'],
      }),
    ).resolves.toMatchObject({
      kind: 'conflict',
      reason: 'base-revision-unknown',
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
    });
  });

  it('reports the head AFTER a lost race, not the one it replayed', async () => {
    // A journal that lets someone else commit between this command's
    // replay and its append - the race the revision guard exists for.
    let raced = false;
    const racing: IEventJournal<ICampaignJournalEnvelope> = {
      append: async (input) => {
        if (!raced) {
          raced = true;
          await run(advanceDay('i-race'), 'cmd-race');
        }
        return journal.append(input);
      },
      readStream: (query) => journal.readStream(query),
      readEntityHistory: (query) => journal.readEntityHistory(query),
      readEventHistory: (query) => journal.readEventHistory(query),
      captureHighWater: () => journal.captureHighWater(),
      readCommitted: (query) => journal.readCommitted(query),
      getCommandReceipt: (commandId) => journal.getCommandReceipt(commandId),
    };

    const result = await run(
      spend(250_000, 'i-lost'),
      'cmd-lost',
      undefined,
      racing,
    );

    const headAfter = (await committed()).length;
    expect(result).toMatchObject({
      kind: 'conflict',
      reason: 'lost-race',
      // The pre-race head was one lower; reporting it would send the
      // client back to a revision that no longer exists.
      head: { branchId: ROOT_EVENT_BRANCH_ID, revision: headAfter },
      recoveryAction: EXPECTED_HEAD_RESYNC_ACTION,
    });
    expect(headAfter).toBe(BASELINE_REVISION + 1);
  });
});
