#!/usr/bin/env npx tsx
/**
 * Flag-free campaign journal-authority CLI (R2.authority-cutover CO3).
 *
 * WHY THIS IS A SCRIPT AND NOT INLINE IN THE SPEC. Playwright transpiles
 * e2e files with babel, and `JournalCampaignEventStore.ts` uses TypeScript
 * `declare` class fields, which that transform refuses ("'declare' fields
 * must first be transformed by @babel/plugin-transform-typescript").
 * Every module that reaches the campaign journal - the genesis append,
 * the migration state machine - imports it, so a spec cannot load them at
 * all. `npx tsx` compiles them without complaint, which is the runner
 * this repo already uses for TypeScript CLIs (`scripts/cleanup-broken-
 * encounters.ts`, `scripts/validate-parity.ts`, and the rest of the
 * `npx tsx scripts/*.ts` package scripts). The relative `../../src`
 * imports below follow that same precedent rather than the `@/` alias.
 *
 * WHAT IT DOES, and what it deliberately does not. `cutover` moves ONE
 * campaign onto journal authority with no flag anywhere. It has two
 * arms, because what is missing depends on what the campaign already
 * has, and both arms are production code:
 *
 *   - **The stream already exists** - which is the ordinary case for a
 *     co-op-hosted campaign, because `CampaignMatchHost` commits a
 *     `CampaignSnapshotPublished` baseline from its initial state on
 *     `open`, through the durable journal store `selectCampaignEventStore`
 *     hands it. Nothing is appended; the campaign is missing only its
 *     durable marker, so `writeCampaignMigrationMarker(
 *     createJournalNativeMarker(id))` is written exactly as
 *     `campaignAuthorityBlocked.test.ts` writes it.
 *   - **The stream is empty** - then a marker alone would resolve to
 *     `blocked` ("journal-authority-without-stream"), never to `journal`.
 *     `appendCampaignGenesis` writes the seq-0 genesis AND the marker; it
 *     is the same production function `maybeAppendCampaignGenesisOnCreate`
 *     calls, and it reads no flag of its own.
 *
 * That is the whole point of the slice: the e2e arm
 * (`MEKSTATION_E2E_CAMPAIGN_JOURNAL_AUTHORITY` plus
 * `NEXT_PUBLIC_E2E_MODE`) cannot fire in a real deployment, so a proof
 * standing on it would demonstrate a branch production can never execute.
 * Nothing here sets, reads, or needs either key, and `flags` reports both
 * switches so the caller can assert that rather than trust it.
 *
 * The database path must name an EXISTING file. `SQLiteService` creates
 * and migrates whatever it is pointed at, so a typo would manufacture an
 * empty database and every later "no rows" claim would be evidence of
 * absence conjured from nothing - the failure `sqliteEvidenceReader`'s
 * `fileMustExist` exists to stop. The existence check below is that guard
 * for a writable handle.
 *
 * Output is ONE line of JSON on stdout so the caller parses a result
 * instead of scraping a log.
 *
 * Usage:
 *   npx tsx scripts/e2e/campaign-journal-authority.ts \
 *     --database <path> --campaign <id> --command cutover|marker|flags
 */

import * as fs from 'fs';

import { createJournalNativeMarker } from '../../src/lib/campaign/authority/campaignAuthorityMigration';
import { appendCampaignGenesis } from '../../src/lib/campaign/authority/campaignSourceGenesis';
import {
  CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV,
  isCampaignJournalAuthorityEnabled,
} from '../../src/lib/campaign/sync/campaignJournalAuthorityEnabled';
import {
  CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../src/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '../../src/lib/events/journal/SQLiteEventJournal';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '../../src/services/campaignPersistence/CampaignMigrationMarkerStore';
import { readCampaign } from '../../src/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '../../src/services/persistence/SQLiteService';

type Command = 'cutover' | 'marker' | 'flags' | 'stream';

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** The two switches, as a real Node process that loaded them sees them. */
function flags(): Record<string, unknown> {
  return {
    ok: true,
    cutoverFlag: CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
    effective: isCampaignJournalAuthorityEnabled(),
    e2eEnvKey: CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV,
    e2eEnvValue: process.env[CAMPAIGN_JOURNAL_AUTHORITY_E2E_ENV] ?? null,
  };
}

/** Open the shared file, run the work, and always let the handle go. */
async function onDatabase<T>(
  databasePath: string,
  work: () => Promise<T>,
): Promise<T> {
  if (!fs.existsSync(databasePath)) {
    throw new Error(`database does not exist: ${databasePath}`);
  }
  resetSQLiteService();
  getSQLiteService({ path: databasePath }).initialize();
  try {
    return await work();
  } finally {
    resetSQLiteService();
  }
}

/**
 * Put one campaign on journal authority.
 *
 * Which arm runs is reported rather than assumed, so a receipt records
 * whether the stream was already seeded by the co-op host or had to be
 * given a genesis here. Either way the marker is the journal-native one
 * and no flag is consulted.
 */
async function cutover(
  databasePath: string,
  campaignId: string,
): Promise<Record<string, unknown>> {
  return onDatabase(databasePath, async () => {
    const stored = readCampaign(campaignId);
    if (stored.kind !== 'ok') {
      throw new Error(`campaign ${campaignId} is ${stored.kind} on disk`);
    }
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => new Date().toISOString(),
    );
    const highestSequence = await new JournalCampaignEventStore(
      journal,
    ).highestSequence(campaignId);
    if (highestSequence < 0) {
      const result = await appendCampaignGenesis(
        journal,
        writeCampaignMigrationMarker,
        { envelope: stored.record, occurredAt: new Date().toISOString() },
      );
      if (result.kind !== 'genesis-appended') {
        throw new Error(`genesis refused: ${result.kind}`);
      }
      return {
        ok: true,
        path: 'genesis',
        highestSequence,
        stateDigest: result.stateDigest,
        marker: result.marker,
        ...flags(),
      };
    }
    // The stream is already there, so only the durable marker is
    // missing. Writing a genesis on top would be refused by the
    // journal's own sequence guard anyway - and should be: this campaign
    // already has a baseline, and a second one would be a fabricated
    // history.
    const marker = createJournalNativeMarker(campaignId);
    writeCampaignMigrationMarker(marker);
    return {
      ok: true,
      path: 'marker',
      highestSequence,
      marker,
      ...flags(),
    };
  });
}

/**
 * The journal's own highest campaign sequence, read straight from the
 * shared file. Ground truth for "the history is still there" - `/head`
 * cannot answer it, because that route reads the event-history BRANCH
 * record and a plain journal append creates none.
 */
async function stream(
  databasePath: string,
  campaignId: string,
): Promise<Record<string, unknown>> {
  return onDatabase(databasePath, async () => {
    const journal = new SQLiteEventJournal<ICampaignJournalEnvelope>(
      getSQLiteService().getDatabase(),
      () => new Date().toISOString(),
    );
    const store = new JournalCampaignEventStore(journal);
    return {
      ok: true,
      highestSequence: await store.highestSequence(campaignId),
    };
  });
}

/** The durable marker, or null when the campaign has no row. */
async function marker(
  databasePath: string,
  campaignId: string,
): Promise<Record<string, unknown>> {
  return onDatabase(databasePath, async () => {
    const read = readCampaignMigrationMarker(campaignId);
    return {
      ok: true,
      read: read.kind,
      marker: read.kind === 'ok' ? read.marker : null,
    };
  });
}

async function main(): Promise<void> {
  const command = (readArg('command') ?? 'flags') as Command;
  if (command === 'flags') {
    process.stdout.write(`${JSON.stringify(flags())}\n`);
    return;
  }
  const databasePath = readArg('database');
  const campaignId = readArg('campaign');
  if (!databasePath || !campaignId) {
    throw new Error('--database and --campaign are required');
  }
  const result =
    command === 'cutover'
      ? await cutover(databasePath, campaignId)
      : command === 'stream'
        ? await stream(databasePath, campaignId)
        : await marker(databasePath, campaignId);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main().catch((error: unknown) => {
  process.stdout.write(
    `${JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })}\n`,
  );
  process.exitCode = 1;
});
