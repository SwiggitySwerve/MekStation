/**
 * Shared fixture for the U35e suites (journal-only campaign effects survive
 * a whole-envelope save). Real SQLite on a temp file, the live item route
 * and the live command route through node-mocks-http, the co-op host over
 * the store the production selector builds, and no MEKSTATION_E2E_* key in
 * the environment.
 *
 * A campaign is made journal-native by the route create: under journal
 * authority the create appends the genesis itself; otherwise the genesis
 * seam the route calls (appendCampaignGenesis plus the marker) is invoked
 * directly, as the U35b and U35c suites do, so the rows do not depend on
 * the journal flag.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignAuthoritativeState,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IVaultIdentity } from '@/types/vault';

import {
  appendCampaignGenesis,
  authoritativeStateFromSerializedCampaign,
} from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { replayCampaignEvents } from '@/lib/campaign/sync/applyCampaignEvent';
import {
  CAMPAIGN_STREAM_TYPE,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { selectCampaignEventStore } from '@/lib/multiplayer/server/getCampaignEventStore';
import idHandler from '@/pages/api/campaigns/[id]';
import commandsHandler from '@/pages/api/campaigns/[id]/commands';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

export const NOW = '3025-07-04T00:00:00.000Z';

/** A route answer: the status and the JSON body. */
export interface IRouteAnswer {
  readonly status: number;
  readonly json: Record<string, unknown>;
}

/**
 * Registers beforeEach/afterEach hooks that give every row a fresh SQLite
 * file under a temp directory (prefix `prefix`), with every MEKSTATION_E2E_*
 * key removed, and remove the directory afterwards.
 */
export function useTempCampaignDatabase(prefix: string): void {
  let dir = '';
  beforeEach(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('MEKSTATION_E2E_')) delete process.env[key];
    }
    dir = await mkdtemp(path.join(tmpdir(), prefix));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'u35e.db') }).initialize();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });
}

/** Invokes the live item route and returns its status and JSON body. */
export async function callId(
  method: RequestMethod,
  id: string,
  body?: Body,
): Promise<IRouteAnswer> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id },
    body,
  });
  await idHandler(req, res);
  return {
    status: res._getStatusCode(),
    json: res._getJSONData() as Record<string, unknown>,
  };
}

/** Posts one command to the live command route as the bearer `wire`. */
export async function postCommand(
  id: string,
  body: Body,
  wire: string,
): Promise<IRouteAnswer> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST' as RequestMethod,
    query: { id },
    body,
    headers: { authorization: `Bearer ${wire}` },
  });
  await commandsHandler(req, res);
  return {
    status: res._getStatusCode(),
    json: res._getJSONData() as Record<string, unknown>,
  };
}

/**
 * Mints one self-issued bearer token, binds it as a player seat of
 * `campaignId` (the command route admits seated callers only) and returns
 * its wire form.
 */
export async function seatedCaller(campaignId: string): Promise<string> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${campaignId}`,
    displayName: 'U35e Row',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-09-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity);
  bindCampaignSessionParticipant({
    campaignId,
    sessionId: `session-${campaignId}`,
    participantId: token.playerId,
    seat: 'player',
    boundAt: '2026-09-23T00:00:00.000Z',
  });
  return encodeTokenForWire(token);
}

/**
 * The shared populated fixture under `campaignId`, with one unit per force
 * (its forces double-claim unit ids, which the genesis projection refuses).
 */
export function disjointCampaign(campaignId: string): ICampaign {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  return {
    ...campaign,
    id: campaignId,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
}

/** Serializes `campaign` at `version` with a roster naming its units. */
export function envelopeOf(
  campaign: ICampaign,
  version: number,
): SerializedCampaign {
  const forces = Array.from(campaign.forces.values());
  return buildSerializedCampaign(campaign, 'device-u35e', version, {
    campaignId: campaign.id,
    units: forces.map((_, index) => ({
      unitId: `unit-${index}`,
      unitRef: `catalog-ref-${index}`,
      unitSource: 'canonical' as const,
      unitName: `Unit ${index}`,
      chassisVariant: `V-${index}`,
      readiness: 'Ready' as const,
    })),
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
}

/** A journal over the test database, stamping every batch with NOW. */
export function journal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
  return new SQLiteEventJournal(getSQLiteService().getDatabase(), () => NOW);
}

/** The campaign stream's committed event types in revision order. */
export function eventTypes(campaignId: string): string[] {
  return (
    getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT event_type AS type FROM event_journal_events
          WHERE stream_type = ? AND stream_id = ?
          ORDER BY stream_revision`,
      )
      .all(CAMPAIGN_STREAM_TYPE, campaignId) as { type: string }[]
  ).map((row) => row.type);
}

/** The journal's replayed projection of the campaign stream. */
export async function replayed(
  campaignId: string,
): Promise<ICampaignAuthoritativeState> {
  return replayCampaignEvents(
    campaignId,
    await new JournalCampaignEventStore(journal()).getEvents(campaignId, 0),
  );
}

/** The ledger fields a row compares, from a state or a replayed journal. */
export function ledgerOf(state: ICampaignAuthoritativeState): {
  readonly balance: number;
  readonly day: number;
  readonly pilots: string[];
  readonly contracts: string[];
  readonly salvagePool: number;
} {
  return {
    balance: state.balance,
    day: state.day,
    pilots: Object.keys(state.pilots),
    contracts: Object.keys(state.contracts),
    salvagePool: state.salvagePool,
  };
}

/** The stored row's version, balance and date, or nulls when absent. */
export function storedRow(campaignId: string): {
  readonly version: number | null;
  readonly balance: number | null;
  readonly currentDate: string | null;
} {
  const read = readCampaign(campaignId);
  return read.kind === 'ok'
    ? {
        version: read.record.version,
        balance: read.record.body.finances.balance,
        currentDate: read.record.body.currentDate,
      }
    : { version: null, balance: null, currentDate: null };
}

/**
 * Creates `campaignId` through the PUT route and makes it journal-native:
 * under journal authority the create appends the genesis and the marker
 * itself; otherwise the genesis seam is invoked on the created record.
 */
export async function createJournalNative(campaignId: string): Promise<{
  readonly record: SerializedCampaign;
  readonly genesisBy: string;
}> {
  const created = await callId('PUT', campaignId, {
    envelope: envelopeOf(disjointCampaign(campaignId), 0),
    baseVersion: 0,
  });
  if (created.status !== 200) {
    throw new Error(`create answered ${created.status}`);
  }
  const record = created.json as unknown as SerializedCampaign;
  if (readCampaignMigrationMarker(campaignId).kind === 'ok') {
    return { record, genesisBy: 'the PUT create (flag true)' };
  }
  const genesis = await appendCampaignGenesis(
    journal(),
    writeCampaignMigrationMarker,
    { envelope: record, occurredAt: NOW },
  );
  if (genesis.kind !== 'genesis-appended') throw new Error(genesis.kind);
  return { record, genesisBy: 'appendCampaignGenesis seam (flag false)' };
}

/**
 * Opens a co-op host on `record` the way CampaignHostRegistry.register
 * builds one: the store the production selector returns and the
 * parity-pinned projection of the stored record as its initial state.
 */
export async function openCoopHost(
  record: SerializedCampaign,
): Promise<CampaignMatchHost> {
  const host = new CampaignMatchHost({
    campaignId: record.campaignId,
    hostPlayerId: 'host',
    eventStore: selectCampaignEventStore().store,
    initialState: authoritativeStateFromSerializedCampaign(record),
  });
  await host.open();
  return host;
}

/** A host intent on `campaignId` with a row-scoped intent id. */
export function intentOf(
  campaignId: string,
  intentId: string,
  kind: ICampaignIntent['kind'],
  payload: unknown,
): ICampaignIntent {
  return { campaignId, intentId, kind, payload } as ICampaignIntent;
}

/**
 * PUTs `record` back at its own version, as a client that took the server
 * record and saved it does.
 */
export function putAtCurrentVersion(
  record: SerializedCampaign,
): Promise<IRouteAnswer> {
  return callId('PUT', record.campaignId, {
    envelope: { ...record, version: record.version + 1 },
    baseVersion: record.version,
  });
}

/** Writes `values` to `<U35E_ROWS_DIR>/<name>.json` when the dir is set. */
export async function flushMeasurements(
  name: string,
  values: Record<string, unknown>,
): Promise<void> {
  const dir = process.env.U35E_ROWS_DIR;
  if (dir) {
    await writeFile(
      path.join(dir, `${name}.json`),
      JSON.stringify(values, null, 2),
    );
  }
}
