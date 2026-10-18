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

// Controllable drift around the real reducer. The divergence row arms it
// to corrupt the SECOND CampaignDayAdvanced application — the host's
// verify/apply pass (the derive pass is the first) — which is exactly the
// corruption D10 exists to catch: the expected digest is clean, the live
// application drifts, and only a journal rebuild restores truth. Every
// later pass, including the rebuild's replay, stays faithful.
let armDayAdvanceApplyDrift = false;
let dayAdvanceApplications = 0;
// P2CG1B: the same drift, armed for a ParticipantRemoved commit instead.
let armRemovalApplyDrift = false;
let removalApplications = 0;
jest.mock('@/lib/campaign/sync/applyCampaignEvent', () => {
  const actual = jest.requireActual('@/lib/campaign/sync/applyCampaignEvent');
  return {
    ...actual,
    applyCampaignEvent: (state: never, event: { type: string }) => {
      const next = actual.applyCampaignEvent(state, event);
      if (armRemovalApplyDrift && event.type === 'ParticipantRemoved') {
        removalApplications += 1;
        if (removalApplications === 2) {
          armRemovalApplyDrift = false;
          return {
            ...next,
            balance: (next as { balance: number }).balance + 1,
          };
        }
      }
      if (armDayAdvanceApplyDrift && event.type === 'CampaignDayAdvanced') {
        dayAdvanceApplications += 1;
        if (dayAdvanceApplications === 2) {
          armDayAdvanceApplyDrift = false;
          return {
            ...next,
            balance: (next as { balance: number }).balance + 1,
          };
        }
      }
      return next;
    },
  };
});
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';

import { CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED } from '@/lib/campaign/sync/ICampaignEventStore';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { EVENT_JOURNAL_MIGRATION } from '@/services/persistence/SQLiteService.eventJournal.migration';

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

  it('replays a stable client intent without a second journal batch or broadcast', async () => {
    const intent = {
      intentId: 'intent-advance-once',
      campaignId: 'campaign-pipeline',
      kind: 'AdvanceDay' as const,
      payload: { days: 1 },
    };

    const first = await host.applyHostIntent(intent as never);
    const retry = await host.applyHostIntent(intent as never);

    expect(retry).toEqual(first);
    expect(host.getState().day).toBe(1);
    expect(await journalRows()).toHaveLength(2);
    expect(broadcasts).toEqual([
      '0:CampaignSnapshotPublished',
      '1:CampaignDayAdvanced',
    ]);
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
    armDayAdvanceApplyDrift = true;
    dayAdvanceApplications = 0;
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

/**
 * P2CG1B: operation controls through the locked host door over a REAL
 * file-backed SQLite journal. The commit under test is the generic,
 * non-progression RemoveParticipant command, and every durability claim is
 * read through a second connection to the file (or after closing and
 * reopening it), never through the host's own projection.
 */
describe('CampaignMatchHost controlled commits over a file-backed SQLite journal (P2CG1B)', () => {
  const CAMPAIGN = 'campaign-sqlite';
  let directory: string;
  let file: string;
  let db: Database.Database;
  let store: JournalCampaignEventStore;
  let host: CampaignMatchHost;
  let log: string[];

  beforeEach(async () => {
    directory = mkdtempSync(path.join(tmpdir(), 'campaign-host-p2cg1b-'));
    file = path.join(directory, 'campaign.sqlite');
    db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(EVENT_JOURNAL_MIGRATION.up);
    store = new JournalCampaignEventStore(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(db, () => NOW),
    );
    host = new CampaignMatchHost({
      campaignId: CAMPAIGN,
      hostPlayerId: 'pid-host',
      eventStore: store,
      initialState: initialState(CAMPAIGN),
    });
    log = [];
    host.subscribe((event) => log.push(`publish:${event.type}`));
    await host.open();
    log.length = 0;
  });
  afterEach(() => {
    armRemovalApplyDrift = false;
    removalApplications = 0;
    if (db.open) db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  function removal(intentId: string) {
    return {
      intentId,
      campaignId: CAMPAIGN,
      kind: 'RemoveParticipant' as const,
      payload: { participantId: 'pid-guest', reason: 'left the table' },
    };
  }

  function commandIdOf(intentId: string): string {
    return `campaign-intent:${CAMPAIGN}:${intentId}`;
  }

  /** The durable rows for one command, read through an independent connection. */
  function durableRemoval(commandId: string): readonly string[] {
    const other = new Database(file);
    try {
      return (
        other
          .prepare(
            'SELECT event_type AS eventType FROM event_journal_events WHERE command_id = ? ORDER BY command_index',
          )
          .all(commandId) as Array<{ readonly eventType: string }>
      ).map((row) => row.eventType);
    } finally {
      other.close();
    }
  }

  function lockDepth(): number {
    return (host as unknown as { readonly lockDepth: number }).lockDepth;
  }

  it('a late guard refusal returns typed with no append, projection move or subscriber call; the same operation then commits once', async () => {
    const before = host.getState();
    const guardSaw: boolean[] = [];

    const refused = await host.applyHostIntentWithControls!(
      removal('intent-remove-late'),
      {
        guard: (handle) => {
          guardSaw.push(handle.inTransaction);
          return { kind: 'refused', reason: 'not-converged' };
        },
        onCommitted: () => log.push('notify'),
        afterRelease: () => log.push('cleanup'),
      },
    );

    expect(refused).toEqual({
      kind: 'refused',
      refusal: { kind: 'refused', reason: 'not-converged' },
    });
    expect(guardSaw).toEqual([true]);
    expect(host.getState()).toBe(before);
    expect(log).toEqual(['cleanup']);
    expect(durableRemoval(commandIdOf('intent-remove-late'))).toEqual([]);

    const accepted = await host.applyHostIntentWithControls!(
      removal('intent-remove-late'),
      {
        guard: () => null,
        onCommitted: () => log.push('notify'),
        afterRelease: () => log.push('cleanup'),
      },
    );
    expect(accepted).toMatchObject({
      kind: 'committed',
      events: [{ type: 'ParticipantRemoved' }],
    });
    expect(log).toEqual([
      'cleanup',
      'notify',
      'publish:ParticipantRemoved',
      'cleanup',
    ]);
    expect(durableRemoval(commandIdOf('intent-remove-late'))).toEqual([
      'ParticipantRemoved',
    ]);
  });

  it('a guard on a store without the capability refuses before the first event, on the plain batch store and on the per-event fallback', async () => {
    const plainBatch = new InMemoryCampaignEventStore();
    const inner = new InMemoryCampaignEventStore();
    const perEventOnly: ICampaignEventStore = {
      appendEvent: (campaignId, event) => inner.appendEvent(campaignId, event),
      getEvents: (campaignId, fromSeq) => inner.getEvents(campaignId, fromSeq),
      highestSequence: (campaignId) => inner.highestSequence(campaignId),
    };
    for (const eventStore of [plainBatch, perEventOnly]) {
      const memoryHost = new CampaignMatchHost({
        campaignId: CAMPAIGN,
        hostPlayerId: 'pid-host',
        eventStore,
        initialState: initialState(CAMPAIGN),
      });
      await memoryHost.open();
      const headBefore = await eventStore.highestSequence(CAMPAIGN);
      let guardCalls = 0;
      const cleanups: string[] = [];

      const outcome = await memoryHost.applyHostIntentWithControls!(
        removal('intent-remove-incapable'),
        {
          guard: () => {
            guardCalls += 1;
            return null;
          },
          afterRelease: () => cleanups.push('cleanup'),
        },
      );

      expect(outcome).toEqual({
        kind: 'refused',
        refusal: {
          kind: 'refused',
          reason: CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED,
        },
      });
      expect(guardCalls).toBe(0);
      expect(cleanups).toEqual(['cleanup']);
      expect(await eventStore.highestSequence(CAMPAIGN)).toBe(headBefore);
    }
  });

  it('a genuine removal notifies after the native commit and before publication; cleanup runs after the lock releases; the receipt survives a reopen', async () => {
    const commandId = commandIdOf('intent-remove-1');
    let depthAtCleanup = -1;

    const outcome = await host.applyHostIntentWithControls!(
      removal('intent-remove-1'),
      {
        onCommitted: (batch) => {
          log.push(`notify:${batch.commandId}`);
          log.push(`owner-in-transaction:${String(db.inTransaction)}`);
          log.push(`durable:${durableRemoval(batch.commandId).join(',')}`);
        },
        afterRelease: () => {
          depthAtCleanup = lockDepth();
          log.push('cleanup');
        },
      },
    );

    expect(outcome).toMatchObject({
      kind: 'committed',
      events: [{ type: 'ParticipantRemoved' }],
    });
    expect(log).toEqual([
      `notify:${commandId}`,
      'owner-in-transaction:false',
      'durable:ParticipantRemoved',
      'publish:ParticipantRemoved',
      'cleanup',
    ]);
    expect(depthAtCleanup).toBe(0);

    db.close();
    const reopened = new Database(file);
    try {
      expect(
        reopened
          .prepare(
            'SELECT event_count AS eventCount FROM event_journal_batches WHERE command_id = ?',
          )
          .get(commandId),
      ).toEqual({ eventCount: 1 });
    } finally {
      reopened.close();
    }
  });

  it.each([
    ['verification drift', 'drift'],
    ['verification drift with a failed rebuild', 'drift-rebuild'],
    ['a failed subscriber', 'subscriber'],
    ['a failed commit notification', 'notify'],
    ['a failed cleanup callback', 'cleanup'],
  ])(
    'after a genuine removal commit, %s keeps the durable removal, drains the other steps and reports committed-unsettled',
    async (_label, failure) => {
      const commandId = commandIdOf(`intent-remove-${failure}`);
      const injected = new Error(`injected ${failure} failure`);
      const reached: string[] = [];
      if (failure.startsWith('drift')) {
        armRemovalApplyDrift = true;
        removalApplications = 0;
      }
      if (failure === 'drift-rebuild') {
        jest.spyOn(store, 'getEvents').mockRejectedValueOnce(injected);
      }
      if (failure === 'subscriber') {
        host.subscribe(() => {
          throw injected;
        });
        host.subscribe((event) =>
          reached.push(`late-subscriber:${event.type}`),
        );
      }

      const outcome = await host.applyHostIntentWithControls!(
        removal(`intent-remove-${failure}`),
        {
          onCommitted: () => {
            reached.push('notify');
            if (failure === 'notify') throw injected;
          },
          afterRelease: () => {
            reached.push('cleanup');
            if (failure === 'cleanup') throw injected;
          },
        },
      );

      expect(outcome.kind).toBe('committed-unsettled');
      if (outcome.kind !== 'committed-unsettled') return;
      expect(outcome.commandId).toBe(commandId);
      expect(outcome.events.map((event) => event.type)).toEqual([
        'ParticipantRemoved',
      ]);
      expect(durableRemoval(commandId)).toEqual(['ParticipantRemoved']);
      expect(reached).toContain('notify');
      expect(reached).toContain('cleanup');
      if (failure === 'drift') {
        expect(outcome.errors).toEqual([
          expect.any(CampaignProjectionDivergenceError),
        ]);
      } else if (failure === 'drift-rebuild') {
        expect(outcome.errors).toEqual([
          expect.any(CampaignProjectionDivergenceError),
          injected,
        ]);
      } else {
        expect(outcome.errors).toEqual([injected]);
      }
      if (failure.startsWith('drift')) {
        expect(host.hasDetectedDivergence()).toBe(true);
        expect(log).toEqual([]);
      } else {
        expect(log).toEqual(['publish:ParticipantRemoved']);
      }
      if (failure === 'subscriber') {
        expect(reached).toContain('late-subscriber:ParticipantRemoved');
      }
      if (failure !== 'drift-rebuild') {
        expect(host.getState()).toEqual(
          await host.getEventLog().reconstructState(),
        );
      }
    },
  );

  it('a precommit extension failure rolls back: no removal row, no notification, commit-uncertain with the original error, cleanup still runs', async () => {
    const commandId = commandIdOf('intent-remove-rollback');
    const failure = new Error('saved-record rewrite failed');
    store.rewriteRecordAfterCommand = () => {
      throw failure;
    };
    const before = host.getState();

    const outcome = await host.applyHostIntentWithControls!(
      removal('intent-remove-rollback'),
      {
        onCommitted: () => log.push('notify'),
        afterRelease: () => log.push('cleanup'),
      },
    );

    expect(outcome).toEqual({
      kind: 'commit-uncertain',
      commandId,
      error: failure,
    });
    expect(log).toEqual(['cleanup']);
    expect(host.getState()).toBe(before);
    // The owner's genuine readback resolves the uncertainty: nothing landed.
    expect(await store.getCommandReceipt(CAMPAIGN, commandId)).toBeNull();
    expect(durableRemoval(commandId)).toEqual([]);
  });

  it('an uncertain outcome is resolved only by genuine readback, which finds the committed removal', async () => {
    const commandId = commandIdOf('intent-remove-uncertain');
    const lost = new Error('connection lost after COMMIT');
    const real = store.appendControlledCommandBatch!;
    jest
      .spyOn(store, 'appendControlledCommandBatch')
      .mockImplementationOnce(async (campaignId, input, controls) => {
        await real(campaignId, input, controls);
        throw lost;
      });
    const before = host.getState();

    const outcome = await host.applyHostIntentWithControls!(
      removal('intent-remove-uncertain'),
      { afterRelease: () => log.push('cleanup') },
    );

    // Not a refusal and not zero-append: the host cannot know, so it says so.
    expect(outcome).toEqual({
      kind: 'commit-uncertain',
      commandId,
      error: lost,
    });
    expect(host.getState()).toBe(before);
    expect(log).toEqual(['cleanup']);
    const readback = await store.getCommandReceipt(CAMPAIGN, commandId);
    expect(readback?.events.map((event) => event.type)).toEqual([
      'ParticipantRemoved',
    ]);
    expect(durableRemoval(commandId)).toEqual(['ParticipantRemoved']);
  });

  it('an exact duplicate removal answers from the original receipt: one journal effect, no second application, broadcast or notification, and the next door still runs', async () => {
    const commandId = commandIdOf('intent-remove-dup');
    const controls = {
      onCommitted: (batch: { readonly commandId: string }) =>
        log.push(`notify:${batch.commandId}`),
      afterRelease: () => log.push('cleanup'),
    };

    const first = await host.applyHostIntentWithControls!(
      removal('intent-remove-dup'),
      controls,
    );
    const stateAfterFirst = host.getState();
    const retry = await host.applyHostIntentWithControls!(
      removal('intent-remove-dup'),
      controls,
    );

    expect(first.kind).toBe('committed');
    if (first.kind !== 'committed') return;
    expect(retry).toEqual({
      kind: 'answered',
      result: { ok: true, events: first.events },
    });
    expect(host.getState()).toBe(stateAfterFirst);
    expect(log).toEqual([
      `notify:${commandId}`,
      'publish:ParticipantRemoved',
      'cleanup',
      'cleanup',
    ]);
    expect(durableRemoval(commandId)).toEqual(['ParticipantRemoved']);

    const next = await host.applyHostIntent({
      intentId: 'intent-after-dup',
      campaignId: CAMPAIGN,
      kind: 'AdvanceDay',
      payload: { days: 1 },
    } as never);
    expect(next.ok).toBe(true);
    expect(host.getState().day).toBe(1);
  });
  it('P2CG1R: the not-committed hook reaches the adapter unchanged and runs inside the open append on a real post-guard conflict', async () => {
    const commandId = commandIdOf('intent-remove-conflict');
    const real = store.appendControlledCommandBatch!;
    const forwarded: unknown[] = [];
    jest
      .spyOn(store, 'appendControlledCommandBatch')
      .mockImplementationOnce((campaignId, input, controls) => {
        forwarded.push(Reflect.get(controls, 'onNotCommitted'));
        // Aimed one revision ahead: the real SQL revision check refuses
        // inside the append, after the guard admitted.
        return real(
          campaignId,
          { ...input, expectedRevision: (input.expectedRevision ?? 0) + 1 },
          controls,
        );
      });
    const onNotCommitted = () =>
      log.push(
        `not-committed:in-transaction=${String(db.inTransaction)}:depth=${lockDepth()}`,
      );
    const controls = {
      guard: () => {
        log.push('guard');
        return null;
      },
      onCommitted: () => log.push('notify'),
      onNotCommitted,
      afterRelease: () => log.push('cleanup'),
    };
    const before = host.getState();

    const outcome = await host.applyHostIntentWithControls!(
      removal('intent-remove-conflict'),
      controls,
    );

    expect(outcome.kind).toBe('lost-race');
    expect(forwarded).toEqual([onNotCommitted]);
    expect(forwarded[0]).toBe(onNotCommitted);
    expect(log).toEqual([
      'guard',
      'not-committed:in-transaction=true:depth=1',
      'cleanup',
    ]);
    expect(host.getState()).toBe(before);
    expect(durableRemoval(commandId)).toEqual([]);

    // The same operation then commits once and never signals not-committed.
    log.length = 0;
    const accepted = await host.applyHostIntentWithControls!(
      removal('intent-remove-conflict'),
      controls,
    );
    expect(accepted.kind).toBe('committed');
    expect(log).toEqual([
      'guard',
      'notify',
      'publish:ParticipantRemoved',
      'cleanup',
    ]);
  });

  it('P2CG1R: hook-only controls on a store without the capability refuse before the first event', async () => {
    const plainBatch = new InMemoryCampaignEventStore();
    const inner = new InMemoryCampaignEventStore();
    const perEventOnly: ICampaignEventStore = {
      appendEvent: (campaignId, event) => inner.appendEvent(campaignId, event),
      getEvents: (campaignId, fromSeq) => inner.getEvents(campaignId, fromSeq),
      highestSequence: (campaignId) => inner.highestSequence(campaignId),
    };
    for (const eventStore of [plainBatch, perEventOnly]) {
      const memoryHost = new CampaignMatchHost({
        campaignId: CAMPAIGN,
        hostPlayerId: 'pid-host',
        eventStore,
        initialState: initialState(CAMPAIGN),
      });
      await memoryHost.open();
      const headBefore = await eventStore.highestSequence(CAMPAIGN);
      const signals: string[] = [];
      const hookOnly = {
        onNotCommitted: () => signals.push('not-committed'),
        afterRelease: () => signals.push('cleanup'),
      };

      const outcome = await memoryHost.applyHostIntentWithControls!(
        removal('intent-remove-hook-only'),
        hookOnly,
      );

      expect(outcome).toEqual({
        kind: 'refused',
        refusal: {
          kind: 'refused',
          reason: CAMPAIGN_APPEND_CONTROLS_UNSUPPORTED,
        },
      });
      expect(signals).toEqual(['cleanup']);
      expect(await eventStore.highestSequence(CAMPAIGN)).toBe(headBefore);
    }
  });
});
