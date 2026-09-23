/**
 * Journal-only campaign effects survive a whole-envelope save (roadmap
 * unit U35e, owner decision OD-u35d-server-and-host-fix, server half).
 *
 * Rows (r1)-(r3) and (c1) are U35d's admission probe rows, carried here:
 * a journal-only command (SpendFunds, AdvanceDay, HirePilot) through the
 * command route, or a HirePilot through the co-op host door, then a
 * whole-envelope PUT of what the client holds at the pre-command version.
 * Row (c2) does the same for an accepted contract and the salvage pool
 * through the co-op door. Row (s) is a client's own edit saved at the
 * pre-command version after a committed command.
 *
 * Each row asserts the behavior: the stale PUT answers 409 with the server
 * record (the command rewrote the saved record and advanced its version)
 * and checkpoints nothing, so the command's effect survives in the
 * journal; and a PUT of the server record at its current version is
 * accepted and its checkpoint keeps the journal's pilots, contracts and
 * salvage pool. Every row records what it read before asserting
 * (U35E_ROWS_DIR). Seeding and the database are in the shared fixture.
 */

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import { computeCampaignStateDigest } from '@/lib/campaign/sync/JournalCampaignEventStore';

import {
  callId,
  createJournalNative,
  disjointCampaign,
  envelopeOf,
  eventTypes,
  flushMeasurements,
  intentOf,
  ledgerOf,
  openCoopHost,
  postCommand,
  putAtCurrentVersion,
  replayed,
  seatedCaller,
  storedRow,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

const measurements: Record<string, unknown> = {};

/** The 409 body's server record, or null when the answer carries none. */
function conflictRecord(json: Record<string, unknown>): {
  readonly version: number | null;
  readonly balance: number | null;
} {
  const current = json.current as SerializedCampaign | undefined;
  return {
    version: current?.version ?? null,
    balance: current?.body?.finances?.balance ?? null,
  };
}

/**
 * Runs `intent` through the command route on a fresh journal-native
 * campaign, then PUTs the client's unchanged campaign at the pre-command
 * version, then reloads the record and PUTs it at its own version, and
 * records the journal's ledger after each step.
 */
async function routeCommandThenSaves(
  row: string,
  campaignId: string,
  kind: 'SpendFunds' | 'AdvanceDay' | 'HirePilot',
  payload: unknown,
) {
  const { record, genesisBy } = await createJournalNative(campaignId);
  const wire = await seatedCaller(campaignId);
  const command = await postCommand(
    campaignId,
    {
      intent: intentOf(campaignId, `intent-${row}`, kind, payload),
      commandId: `cmd-${row}`,
    },
    wire,
  );
  const afterCommand = ledgerOf(await replayed(campaignId));
  const rowAfterCommand = storedRow(campaignId);
  const stalePut = await callId('PUT', campaignId, {
    envelope: envelopeOf(disjointCampaign(campaignId), record.version + 1),
    baseVersion: record.version,
  });
  const afterStalePut = ledgerOf(await replayed(campaignId));
  const reload = await callId('GET', campaignId);
  const currentPut = await putAtCurrentVersion(
    reload.json as unknown as SerializedCampaign,
  );
  const measured = {
    genesisBy,
    createdVersion: record.version,
    commandStatus: command.status,
    commandKind: command.json.kind ?? null,
    afterCommand,
    rowAfterCommand,
    stalePutStatus: stalePut.status,
    stalePutCurrent: conflictRecord(stalePut.json),
    afterStalePut,
    reloadVersion: (reload.json as { version?: number }).version ?? null,
    currentPutStatus: currentPut.status,
    rowAfterCurrentPut: storedRow(campaignId),
    afterCurrentPut: ledgerOf(await replayed(campaignId)),
    eventTypes: eventTypes(campaignId),
  };
  measurements[row] = measured;
  await flushMeasurements('effects', measurements);
  return measured;
}

/** A host-fold whole-envelope PUT of `record`'s campaign at its version. */
function hostFoldPut(
  record: SerializedCampaign,
  host: Awaited<ReturnType<typeof openCoopHost>>,
) {
  const projected = applyAuthoritativeStateToGuestCampaign(
    disjointCampaign(record.campaignId),
    host.getState(),
  );
  return callId('PUT', record.campaignId, {
    envelope: envelopeOf(projected, record.version + 1),
    baseVersion: record.version,
  });
}

describe('U35e journal-only campaign effects survive a whole-envelope save', () => {
  useTempCampaignDatabase('u35e-effects-');

  it('(r1) SpendFunds through the command route survives a stale and a current whole-envelope PUT', async () => {
    const m = await routeCommandThenSaves('r1', 'u35e-spend', 'SpendFunds', {
      amount: 12_345,
      reason: 'repairs',
    });
    expect(m.commandStatus).toBe(200);
    expect(m.afterStalePut.balance).toBe(m.afterCommand.balance);
    expect(m.stalePutStatus).toBe(409);
    expect(m.stalePutCurrent).toEqual({
      version: m.createdVersion + 1,
      balance: m.afterCommand.balance,
    });
    expect(m.currentPutStatus).toBe(200);
    expect(m.afterCurrentPut.balance).toBe(m.afterCommand.balance);
  });

  it('(r2) AdvanceDay through the command route survives a stale and a current whole-envelope PUT', async () => {
    const m = await routeCommandThenSaves('r2', 'u35e-day', 'AdvanceDay', {
      days: 3,
    });
    expect(m.commandStatus).toBe(200);
    expect(m.afterStalePut.day).toBe(m.afterCommand.day);
    expect(m.stalePutStatus).toBe(409);
    expect(m.stalePutCurrent.version).toBe(m.createdVersion + 1);
    expect(m.currentPutStatus).toBe(200);
    expect(m.afterCurrentPut.day).toBe(m.afterCommand.day);
  });

  it('(r3) HirePilot through the command route survives a stale and a current whole-envelope PUT', async () => {
    const m = await routeCommandThenSaves('r3', 'u35e-hire', 'HirePilot', {
      pilot: { pilotId: 'pilot-r3', name: 'Recruit' },
      cost: 12_000,
    });
    expect(m.commandStatus).toBe(200);
    expect(m.afterStalePut.pilots).toEqual(['pilot-r3']);
    expect(m.stalePutStatus).toBe(409);
    expect(m.stalePutCurrent).toEqual({
      version: m.createdVersion + 1,
      balance: m.afterCommand.balance,
    });
    expect(m.currentPutStatus).toBe(200);
    expect(m.afterCurrentPut.pilots).toEqual(['pilot-r3']);
    expect(m.afterCurrentPut.balance).toBe(m.afterCommand.balance);
  });

  it('(c1) HirePilot through the co-op host door survives the host fold save and the current save', async () => {
    const id = 'u35e-coop';
    const { record, genesisBy } = await createJournalNative(id);
    const host = await openCoopHost(record);
    const hire = await host.applyHostIntent(
      intentOf(id, 'intent-c1', 'HirePilot', {
        pilot: { pilotId: 'pilot-c1', name: 'Co-op Recruit' },
        cost: 12_000,
      }),
    );
    const afterHire = ledgerOf(await replayed(id));
    const rowAfterHire = storedRow(id);
    const stalePut = await hostFoldPut(record, host);
    const afterStalePut = ledgerOf(await replayed(id));
    const reload = await callId('GET', id);
    const currentPut = await putAtCurrentVersion(
      reload.json as unknown as SerializedCampaign,
    );
    const afterCurrentPut = ledgerOf(await replayed(id));
    const spend = await host.applyHostIntent(
      intentOf(id, 'intent-c1-spend', 'SpendFunds', {
        amount: 1_000,
        reason: 'repairs',
      }),
    );
    const journalAfterSpend = await replayed(id);
    measurements.c1 = {
      genesisBy,
      createdVersion: record.version,
      hireOk: hire.ok,
      afterHire,
      rowAfterHire,
      stalePutStatus: stalePut.status,
      stalePutCurrent: conflictRecord(stalePut.json),
      afterStalePut,
      currentPutStatus: currentPut.status,
      afterCurrentPut,
      spendOk: spend.ok,
      afterNextCoopCommand: ledgerOf(journalAfterSpend),
      hostAfterNextCoopCommand: ledgerOf(host.getState()),
      eventTypes: eventTypes(id),
    };
    await flushMeasurements('effects', measurements);

    expect(hire.ok).toBe(true);
    expect(afterStalePut.pilots).toEqual(['pilot-c1']);
    expect(stalePut.status).toBe(409);
    expect(conflictRecord(stalePut.json)).toEqual({
      version: record.version + 1,
      balance: afterHire.balance,
    });
    expect(currentPut.status).toBe(200);
    expect(afterCurrentPut.pilots).toEqual(['pilot-c1']);
    expect(spend.ok).toBe(true);
    // The live co-op host and the journal agree after the next command.
    expect(computeCampaignStateDigest(journalAfterSpend)).toBe(
      computeCampaignStateDigest(host.getState()),
    );
  });

  it('(c2) an accepted contract and the salvage pool through the co-op host door survive the host fold save', async () => {
    const id = 'u35e-coop-contract';
    const { record, genesisBy } = await createJournalNative(id);
    const host = await openCoopHost(record);
    const accept = await host.applyHostIntent(
      intentOf(id, 'intent-c2-accept', 'AcceptContract', {
        contract: {
          contractId: 'contract-c2',
          name: 'Garrison Duty',
          employerFactionId: 'faction-c2',
        },
      }),
    );
    const credit = await host.creditSalvagePool(50_000, 'battle-c2');
    const allocate = await host.applyHostIntent(
      intentOf(id, 'intent-c2-salvage', 'AllocateSalvage', { value: 20_000 }),
    );
    const afterCommands = ledgerOf(await replayed(id));
    const rowAfterCommands = storedRow(id);
    const stalePut = await hostFoldPut(record, host);
    const afterStalePut = ledgerOf(await replayed(id));
    const reload = await callId('GET', id);
    const currentPut = await putAtCurrentVersion(
      reload.json as unknown as SerializedCampaign,
    );
    const afterCurrentPut = ledgerOf(await replayed(id));
    measurements.c2 = {
      genesisBy,
      createdVersion: record.version,
      acceptOk: accept.ok,
      creditOk: credit.ok,
      allocateOk: allocate.ok,
      afterCommands,
      rowAfterCommands,
      stalePutStatus: stalePut.status,
      stalePutCurrent: conflictRecord(stalePut.json),
      afterStalePut,
      currentPutStatus: currentPut.status,
      afterCurrentPut,
      eventTypes: eventTypes(id),
    };
    await flushMeasurements('effects', measurements);

    expect([accept.ok, credit.ok, allocate.ok]).toEqual([true, true, true]);
    expect(afterStalePut.contracts).toEqual(['contract-c2']);
    expect(afterStalePut.salvagePool).toBe(30_000);
    expect(stalePut.status).toBe(409);
    expect(conflictRecord(stalePut.json).version).toBe(record.version + 3);
    expect(currentPut.status).toBe(200);
    expect(afterCurrentPut.contracts).toEqual(['contract-c2']);
    expect(afterCurrentPut.salvagePool).toBe(30_000);
  });

  it('(s) a whole-envelope PUT at the pre-command version after a committed command answers 409 with the server record', async () => {
    const id = 'u35e-stale';
    const { record, genesisBy } = await createJournalNative(id);
    const wire = await seatedCaller(id);
    const command = await postCommand(
      id,
      {
        intent: intentOf(id, 'intent-s', 'SpendFunds', {
          amount: 12_345,
          reason: 'repairs',
        }),
        commandId: 'cmd-s',
      },
      wire,
    );
    const afterCommand = ledgerOf(await replayed(id));
    const typesBeforePut = eventTypes(id);
    // The client's own edit, built on the record it held before the command.
    const edited = envelopeOf(disjointCampaign(id), record.version + 1);
    const put = await callId('PUT', id, {
      envelope: {
        ...edited,
        body: {
          ...edited.body,
          finances: {
            ...edited.body.finances,
            balance: record.body.finances.balance + 500,
          },
        },
      },
      baseVersion: record.version,
    });
    const afterPut = ledgerOf(await replayed(id));
    measurements.s = {
      genesisBy,
      createdVersion: record.version,
      commandStatus: command.status,
      afterCommand,
      putStatus: put.status,
      putKind: put.json.kind ?? null,
      putCurrent: conflictRecord(put.json),
      rowAfterPut: storedRow(id),
      afterPut,
      typesBeforePut,
      typesAfterPut: eventTypes(id),
    };
    await flushMeasurements('effects', measurements);

    expect(command.status).toBe(200);
    expect(afterPut.balance).toBe(afterCommand.balance);
    expect(put.status).toBe(409);
    expect(put.json.kind).toBe('conflict');
    expect(conflictRecord(put.json)).toEqual({
      version: record.version + 1,
      balance: afterCommand.balance,
    });
    expect(eventTypes(id)).toEqual(typesBeforePut);
  });
});
