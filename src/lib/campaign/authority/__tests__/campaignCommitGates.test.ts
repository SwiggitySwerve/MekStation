/**
 * Campaign commit gates before the journal-authority flip (roadmap unit
 * U35a, under OD-mvp-hard-cutover).
 *
 * Four rows, each against real SQLite on a temp file with no
 * MEKSTATION_E2E_* key in the environment:
 *
 * - (b) F-1: a marker read or write that fails AFTER the journal took the
 *   batch is logged, and the command is still acknowledged as committed.
 *   The batch is durable at that point; answering an error would send the
 *   client to retry something that already happened.
 * - (c) A FundsChanged carries the absolute balance, so a non-campaign
 *   scope would let a restricted viewer infer the hidden change from the
 *   next visible balance. The scope resolver refuses it with a typed error.
 * - (f3) F-3 pin: an AcceptContract through executeCampaignCommand on a
 *   journal-native campaign stamps firstJournalAuthorityCommandId.
 * - (adopt) Adopting a legacy campaign produces a journal-native campaign:
 *   the genesis snapshot plus a journal-native marker, not a shadowing one.
 *   The adopt route feeds the hook's `enabled` switch from the production
 *   flag (still false), so the row sets that switch itself.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type { IContract } from '@/types/campaign/Mission';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import idHandler from '@/pages/api/campaigns/[id]';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { AtBContractType } from '@/types/campaign/contracts/contractTypes';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';
import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';
import { logger } from '@/utils/logger';

import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';
import type { CampaignAuthorityMode } from '../campaignAuthorityMode';

import {
  CampaignFundsScopeError,
  resolveCampaignEventScope,
} from '../../sync/campaignEventScope';
import {
  CAMPAIGN_STREAM_TYPE,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import { executeCampaignCommand } from '../campaignCommandPipeline';
import { durableCampaignMarkerIo } from '../campaignCutoverMarkerIo';
import { maybeAdoptLegacyCampaign } from '../campaignLegacyAdoption';
import { appendCampaignGenesis } from '../campaignSourceGenesis';
import { resolveCampaignAuthorityFromStores } from '../resolveCampaignAuthorityFromStores';

type Mocks = ReturnType<typeof createMocks<NextApiRequest, NextApiResponse>>;

const NOW = '3025-07-04T00:00:00.000Z';
const AUTHOR = 'pid-host';
const OFFER_ID = 'contract-u35a';

/** Invokes the live item route and resolves once the handler returns. */
function callId(
  method: RequestMethod,
  id: string,
  body?: Body,
): Promise<Mocks> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id },
    body,
  });
  return idHandler(req, res).then(() => ({ req, res }));
}

/**
 * Builds an envelope the genesis projection accepts: the shared fixture's
 * forces double-claim unit ids, so each force gets one unit of its own and
 * the roster projection names those units with a catalog ref.
 */
function envelopeFor(campaignId: string, version: number): SerializedCampaign {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  const disjoint = {
    ...campaign,
    id: campaignId,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
  return buildSerializedCampaign(disjoint, 'device-u35a', version, {
    campaignId,
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

/** A persisted contract offer the durable AcceptContract path can accept. */
function offer(id: string): IContract {
  return {
    id,
    name: `Garrison duty (${id})`,
    status: MissionStatus.ACTIVE,
    type: 'contract',
    systemId: 'galatea',
    scenarioIds: [],
    createdAt: NOW,
    updatedAt: NOW,
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

/** A journal over the test database, stamping every batch with NOW. */
function journal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
  return new SQLiteEventJournal(getSQLiteService().getDatabase(), () => NOW);
}

/** Counts the campaign stream's committed journal events, optionally by type. */
function eventCount(campaignId: string, eventType?: string): number {
  const db = getSQLiteService().getDatabase();
  const row = (
    eventType === undefined
      ? db
          .prepare(
            `SELECT COUNT(*) AS count FROM event_journal_events
              WHERE stream_type = ? AND stream_id = ?`,
          )
          .get(CAMPAIGN_STREAM_TYPE, campaignId)
      : db
          .prepare(
            `SELECT COUNT(*) AS count FROM event_journal_events
              WHERE stream_type = ? AND stream_id = ? AND event_type = ?`,
          )
          .get(CAMPAIGN_STREAM_TYPE, campaignId, eventType)
  ) as { readonly count: number };
  return row.count;
}

/** Counts effective event_history_branches rows of the campaign stream. */
function effectiveBranchRows(campaignId: string): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT COUNT(*) AS count FROM event_history_branches b
         JOIN event_history_effective_heads h
           ON h.stream_type = b.stream_type AND h.stream_id = b.stream_id
          AND h.branch_id = b.branch_id
        WHERE b.stream_type = 'campaign' AND b.stream_id = ?
          AND b.status = 'effective'`,
    )
    .get(campaignId) as { readonly count: number };
  return row.count;
}

/** The stored cutover marker; throws when the row is absent or corrupt. */
function storedMarker(campaignId: string): ICampaignCutoverMarker {
  const read = readCampaignMigrationMarker(campaignId);
  if (read.kind !== 'ok') throw new Error(`marker ${read.kind}`);
  return read.marker;
}

/** Resolves authority exactly as the command and item routes do. */
function authorityOf(campaignId: string): Promise<CampaignAuthorityMode> {
  return resolveCampaignAuthorityFromStores(
    { readMarker: readCampaignMigrationMarker, journal },
    campaignId,
  );
}

/**
 * Creates the campaign through the live item route (PUT at baseVersion 0)
 * and makes it journal-native through the genesis seam that route calls
 * when journal authority is on, so the row does not depend on the flag.
 */
async function createJournalNativeCampaign(
  envelope: SerializedCampaign,
): Promise<SerializedCampaign> {
  const created = await callId('PUT', envelope.campaignId, {
    envelope,
    baseVersion: 0,
  });
  expect(created.res._getStatusCode()).toBe(200);
  const record = created.res._getJSONData() as SerializedCampaign;
  if (readCampaignMigrationMarker(envelope.campaignId).kind !== 'ok') {
    const genesis = await appendCampaignGenesis(
      journal(),
      writeCampaignMigrationMarker,
      { envelope: record, occurredAt: NOW },
    );
    expect(genesis.kind).toBe('genesis-appended');
  }
  return record;
}

describe('U35a campaign commit gates', () => {
  let dir: string;

  beforeEach(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('MEKSTATION_E2E_')) delete process.env[key];
    }
    dir = await mkdtemp(path.join(tmpdir(), 'u35a-gates-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'u35a.db') }).initialize();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it.each(['write', 'read'] as const)(
    '(b) a marker-io %s failure after a committed batch is logged and the commit is acknowledged',
    async (failing) => {
      const id = `u35a-marker-${failing}`;
      await createJournalNativeCampaign(envelopeFor(id, 0));
      const authority = await authorityOf(id);
      expect(authority).toEqual({ kind: 'journal' });
      const eventsBefore = eventCount(id);
      const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const fail = jest
        .spyOn(durableCampaignMarkerIo, failing)
        .mockImplementation(() => {
          throw new Error(`injected marker-io ${failing} failure`);
        });

      let outcome: unknown;
      try {
        outcome = await executeCampaignCommand(
          { journal: journal(), authority },
          {
            campaignId: id,
            intent: {
              campaignId: id,
              intentId: `intent-${failing}`,
              kind: 'SpendFunds',
              payload: { amount: 1_000, reason: 'repairs' },
            } as ICampaignIntent,
            authorPlayerId: AUTHOR,
            commandId: `cmd-${failing}`,
            ts: NOW,
          },
        );
      } catch (error) {
        outcome = error;
      }
      const failCalls = fail.mock.calls.length;
      const warnCalls = warn.mock.calls.map((call) => String(call[0]));
      fail.mockRestore();

      // The batch is in the journal whatever the marker io did.
      expect(eventCount(id)).toBe(eventsBefore + 1);
      // F-1: the commit is acknowledged, never turned into an error.
      expect(outcome instanceof Error ? outcome.message : null).toBeNull();
      expect((outcome as { kind: string }).kind).toBe('committed');
      expect(failCalls).toBe(1);
      // ...and the failure is logged, naming the campaign and the command.
      expect(warnCalls).toHaveLength(1);
      expect(warnCalls[0]).toContain(id);
      expect(warnCalls[0]).toContain(`cmd-${failing}`);
      // The stamp the failed io could not write is not there.
      expect(storedMarker(id).firstJournalAuthorityCommandId).toBeNull();
    },
  );

  it('(c) a balance-bearing FundsChanged refuses a scope other than campaign with a typed error', () => {
    /** Runs the resolver and reports what it returned or threw. */
    const attempt = (
      scope: Parameters<typeof resolveCampaignEventScope>[1],
    ): { readonly returned: string } | { readonly thrown: unknown } => {
      try {
        return { returned: resolveCampaignEventScope('FundsChanged', scope) };
      } catch (error) {
        return { thrown: error };
      }
    };

    const gm = attempt('gm');
    expect(gm).not.toEqual({ returned: 'gm' });
    expect('thrown' in gm ? gm.thrown : null).toBeInstanceOf(
      CampaignFundsScopeError,
    );
    expect('thrown' in gm ? gm.thrown : null).toMatchObject({
      name: 'CampaignFundsScopeError',
      code: 'FUNDS_SCOPE_NOT_CAMPAIGN',
      type: 'FundsChanged',
      scope: 'gm',
    });
    for (const scope of ['team:lance-1', 'player:pid-guest'] as const) {
      const other = attempt(scope);
      expect('thrown' in other ? other.thrown : null).toBeInstanceOf(
        CampaignFundsScopeError,
      );
    }
    // The campaign scope, stated or defaulted, still resolves.
    expect(attempt('campaign')).toEqual({ returned: 'campaign' });
    expect(attempt(undefined)).toEqual({ returned: 'campaign' });
  });

  it('(f3) an AcceptContract through executeCampaignCommand on a journal-native campaign stamps firstJournalAuthorityCommandId', async () => {
    const id = 'u35a-accept';
    const base = envelopeFor(id, 0);
    await createJournalNativeCampaign({
      ...base,
      body: {
        ...base.body,
        contractMarket: { offers: [offer(OFFER_ID)], declinedOfferIds: [] },
      },
    });
    expect(storedMarker(id)).toMatchObject({
      state: 'journal',
      importedBaseline: null,
      firstJournalAuthorityCommandId: null,
    });
    const authority = await authorityOf(id);
    expect(authority).toEqual({ kind: 'journal' });

    const result = await executeCampaignCommand(
      { journal: journal(), authority },
      {
        campaignId: id,
        intent: {
          campaignId: id,
          intentId: `intent-${OFFER_ID}`,
          kind: 'AcceptContract',
          payload: {
            contract: {
              contractId: OFFER_ID,
              name: 'named by the caller',
              employerFactionId: 'house-davion',
            },
          },
        },
        authorPlayerId: AUTHOR,
        commandId: 'cmd-u35a-accept',
        ts: NOW,
      },
    );

    expect(result.kind).toBe('committed');
    expect(eventCount(id, 'ContractAccepted')).toBe(1);
    expect(storedMarker(id).firstJournalAuthorityCommandId).toBe(
      'cmd-u35a-accept',
    );
  });

  it('(adopt) adopting a legacy campaign appends the genesis snapshot and writes a journal-native marker', async () => {
    const id = 'u35a-adopt';
    // A browser copy that has been played elsewhere: version 7.
    const envelope = envelopeFor(id, 7);

    const result = await maybeAdoptLegacyCampaign({
      // The hook's own switch; the adopt route feeds it the production flag.
      enabled: true,
      envelope,
      importedAt: NOW,
      journal,
      markerIo: durableCampaignMarkerIo,
    });

    const marker = storedMarker(id);
    expect(marker.state).toBe('journal');
    expect(marker.importedBaseline).toBeNull();
    expect(marker.firstJournalAuthorityCommandId).toBeNull();
    expect(result.kind).toBe('adopted');
    const events = await new JournalCampaignEventStore(journal()).getEvents(
      id,
      0,
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      sequence: 0,
      type: 'CampaignSnapshotPublished',
      authorPlayerId: 'system',
    });
    expect(effectiveBranchRows(id)).toBe(1);
    expect(await authorityOf(id)).toEqual({ kind: 'journal' });
  });
});
