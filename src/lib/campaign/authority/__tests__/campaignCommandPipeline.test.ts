/**
 * The source command pipeline (task 1.2, design D4/D10).
 *
 * Until now this ordering only existed inside `CampaignMatchHost`, so it
 * only ran while a multiplayer session happened to be open. A campaign
 * is not more or less authoritative depending on who else is connected,
 * so these rows pin the pipeline as its own thing — and pin the parts of
 * the ordering that stop being safe if rearranged for convenience.
 */

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { executeCampaignCommand } from '../campaignCommandPipeline';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-commands';
const AUTHOR = 'pid-solo';

const JOURNAL_AUTHORITY: CampaignAuthorityMode = { kind: 'journal' };

function spend(amount: number, intentId = 'intent-1'): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'repairs' },
  } as unknown as ICampaignIntent;
}

describe('campaign command pipeline', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;

  beforeEach(async () => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    // A real starting balance, imported the way a migrated campaign gets
    // one, so validation has something to check against.
    const imported = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: { ...createEmptyCampaignState(CAMPAIGN_ID), balance: 1_000_000 },
      sourceSnapshotRevision: 1,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
  });

  function run(intent: ICampaignIntent, commandId = 'cmd-1') {
    return executeCampaignCommand(
      { journal, authority: JOURNAL_AUTHORITY },
      {
        campaignId: CAMPAIGN_ID,
        intent,
        authorPlayerId: AUTHOR,
        commandId,
        ts: NOW,
      },
    );
  }

  it('commits a valid command and acknowledges the replayed state', async () => {
    const result = await run(spend(250_000));

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.events).toHaveLength(1);
    // The acknowledgement is the projection AFTER the commit, replayed
    // from the stream - not the pre-state plus the derived events. If it
    // were assumed, a broken reducer would report the state the source
    // INTENDED, which is exactly the state it failed to produce.
    expect(result.state.balance).toBe(750_000);
  });

  it('rejects a command the campaign cannot afford, writing nothing', async () => {
    const result = await run(spend(5_000_000));

    expect(result.kind).toBe('rejected');
    // A refusal must leave the stream exactly as it was: a rejected
    // command that still appended would be a mutation the campaign
    // explicitly said no to.
    const after = await run(spend(1));
    expect(after.kind).toBe('committed');
    if (after.kind !== 'committed') return;
    expect(after.state.balance).toBe(999_999);
  });

  it('validates against the stream rather than anything a caller supplies', async () => {
    // Two spends that each fit the ORIGINAL balance but not the running
    // one. The second must be judged against the state the first
    // produced, or a caller could drain a campaign by replaying its
    // opening position.
    const first = await run(spend(600_000), 'cmd-a');
    expect(first.kind).toBe('committed');

    const second = await run(spend(600_000, 'intent-2'), 'cmd-b');

    expect(second.kind).toBe('rejected');
  });

  it('treats a retried command as already done, not as a second spend', async () => {
    const first = await run(spend(100_000), 'cmd-retry');
    expect(first.kind).toBe('committed');

    const retry = await run(spend(100_000), 'cmd-retry');

    expect(retry.kind).toBe('duplicate');
    // And the money only left once.
    const probe = await run(spend(1), 'cmd-probe');
    expect(probe.kind).toBe('committed');
    if (probe.kind !== 'committed') return;
    expect(probe.state.balance).toBe(899_999);
  });

  it('refuses to run at all on a blocked campaign', async () => {
    const result = await executeCampaignCommand(
      {
        journal,
        authority: {
          kind: 'blocked',
          reason: 'journal-authority-without-stream',
        },
      },
      {
        campaignId: CAMPAIGN_ID,
        intent: spend(1),
        authorPlayerId: AUTHOR,
        commandId: 'cmd-blocked',
        ts: NOW,
      },
    );

    expect(result).toEqual({
      kind: 'blocked',
      reason: 'journal-authority-without-stream',
    });
  });

  it('says a snapshot campaign has not migrated rather than failing it', async () => {
    // Distinct from a fault: a snapshot-authority campaign is simply
    // still on the pre-cutover path, and a generic refusal would read as
    // something being wrong with it.
    const result = await executeCampaignCommand(
      { journal, authority: { kind: 'snapshot' } },
      {
        campaignId: CAMPAIGN_ID,
        intent: spend(1),
        authorPlayerId: AUTHOR,
        commandId: 'cmd-snapshot',
        ts: NOW,
      },
    );

    expect(result).toEqual({
      kind: 'blocked',
      reason: 'campaign-not-on-journal-authority',
    });
  });

  it('keeps every failure mode distinguishable', async () => {
    // A caller that saw one shape for all of these would retry the ones
    // that can never succeed and give up on the ones that would.
    const rejected = await run(spend(9_000_000), 'cmd-x');
    const blocked = await executeCampaignCommand(
      { journal, authority: { kind: 'snapshot' } },
      {
        campaignId: CAMPAIGN_ID,
        intent: spend(1),
        authorPlayerId: AUTHOR,
        commandId: 'cmd-y',
        ts: NOW,
      },
    );

    expect(rejected.kind).not.toBe(blocked.kind);
  });
});
