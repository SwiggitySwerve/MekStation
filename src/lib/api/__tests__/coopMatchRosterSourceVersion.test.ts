/**
 * The co-op match-creation body accepts the roster units production writes.
 *
 * CampaignCoopEntryPanel posts `buildCampaignAuthoritativeState`'s output as
 * `coopCampaign.state`, and that builder copies each roster unit's pinned
 * `sourceVersion`, which the campaign creation page sets on every unit it
 * adds. The schema rows parse that body with the exported
 * `CreateMultiplayerMatchBodySchema`; the route rows post it through the
 * `POST /api/multiplayer/matches` handler over a temp SQLite database with
 * campaign journal authority on (checked in `beforeEach`), as production
 * runs, so each host campaign is saved and its genesis appended to the
 * SQLite event journal before the post, then read the host the route
 * registered. An unknown extra roster field and a `sourceVersion` that is
 * not a positive integer stay refused.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import { _resetRateLimitBucketsForTests } from '@/lib/api/security';
import { CreateMultiplayerMatchBodySchema } from '@/lib/api/securitySchemas';
import { appendCampaignGenesis } from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildCampaignAuthoritativeState } from '@/lib/campaign/coop/campaignAuthoritativeState';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { isCampaignJournalAuthorityEnabled } from '@/lib/campaign/sync/campaignJournalAuthorityEnabled';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { _resetDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import handler from '@/pages/api/multiplayer/matches';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

jest.mock('@/lib/multiplayer/server/auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    ok: true,
    playerId: 'pid_host',
    publicKey: 'host-public-key',
    token: {
      playerId: 'pid_host',
      issuedAt: '2026-09-25T00:00:00.000Z',
      expiresAt: '2026-09-25T01:00:00.000Z',
      publicKey: 'host-public-key',
      signature: 'host-signature',
    },
  }),
}));

/** The pinned library version every roster unit in these rows carries. */
const SOURCE_VERSION = 3;

/** When each seeded host campaign's genesis snapshot is dated. */
const GENESIS_AT = '2026-09-25T00:00:00.000Z';

/** The roster unit the refusal rows alter, and its path in the body. */
const ALTERED_UNIT_ID = 'unit-0';
const ALTERED_UNIT_PATH = [
  'coopCampaign',
  'state',
  'rosterUnits',
  ALTERED_UNIT_ID,
] as const;

interface ICreateMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: IMatchMeta;
}

interface IErrorResponse {
  readonly error: string;
  readonly details?: readonly { path: string; message: string }[];
}

type ResponseBody = ICreateMatchResponse | IErrorResponse;

interface IHarness {
  readonly req: NextApiRequest;
  readonly res: NextApiResponse<ResponseBody>;
  readonly result: { statusCode: number; body: ResponseBody | undefined };
}

/**
 * A plain Next request/response pair for a POST carrying `body`; the
 * response records the status and JSON the handler sends. Same shape as the
 * sibling route suites under src/__tests__/unit/api.
 */
function mockReqRes(body: unknown): IHarness {
  const result: { statusCode: number; body: ResponseBody | undefined } = {
    statusCode: 0,
    body: undefined,
  };
  const req = {
    method: 'POST',
    headers: { host: 'test.local' },
    query: {},
    body,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: ResponseBody) {
      result.body = payload;
      return this;
    },
    setHeader() {
      return this;
    },
  } as unknown as NextApiResponse<ResponseBody>;
  return { req, res, result };
}

/**
 * The shared populated campaign with each force re-mapped to its own unit
 * (`unit-<index>`), because the co-op builder refuses a unit claimed by two
 * forces.
 */
function disjointCampaign(): ICampaign {
  const campaign = buildPopulatedCampaign();
  const forces = new Map(
    Array.from(campaign.forces.values()).map((force, index) => [
      force.id,
      { ...force, unitIds: [`unit-${index}`] },
    ]),
  );
  return { ...campaign, forces };
}

/**
 * One canonical roster projection per force unit. Each carries
 * `sourceVersion` when one is given and omits the key when it is not.
 */
function rosterUnits(
  campaign: ICampaign,
  sourceVersion: number | undefined,
): readonly IRosterUnitProjection[] {
  return Array.from(campaign.forces.values())
    .flatMap((force) => force.unitIds)
    .map(
      (unitId, index): IRosterUnitProjection => ({
        unitId,
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
        ...(sourceVersion === undefined ? {} : { sourceVersion }),
        unitName: `Unit ${index}`,
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      }),
    );
}

/**
 * The body CampaignCoopEntryPanel.tsx:228-238 posts for `campaign` and
 * `units`, with the panel's config (:187-191), passed through a JSON round
 * trip as the route receives it.
 */
function panelBody(
  campaign: ICampaign,
  units: readonly IRosterUnitProjection[],
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify({
      config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
      layout: '1v1',
      hostSeatKind: 'spectator',
      displayName: 'Host',
      coopCampaign: {
        campaignId: campaign.id,
        state: buildCampaignAuthoritativeState(campaign, units),
        arbitrationMode: 'host-review',
      },
    }),
  ) as Record<string, unknown>;
}

/**
 * A copy of `body` whose roster unit ALTERED_UNIT_ID has `fields` merged
 * over it; the input body is not modified.
 */
function withAlteredUnit(
  body: Record<string, unknown>,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(body)) as {
    coopCampaign: { state: { rosterUnits: Record<string, object> } };
  };
  const units = copy.coopCampaign.state.rosterUnits;
  units[ALTERED_UNIT_ID] = { ...units[ALTERED_UNIT_ID], ...fields };
  return copy as unknown as Record<string, unknown>;
}

/**
 * The zod issues CreateMultiplayerMatchBodySchema raises for `body`, each
 * reduced to its code, path and (for unrecognized_keys) keys; an empty list
 * when the body parses.
 */
function bodyIssues(body: unknown): readonly Record<string, unknown>[] {
  const result = CreateMultiplayerMatchBodySchema.safeParse(body);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    code: issue.code,
    path: issue.path,
    ...('keys' in issue ? { keys: issue.keys } : {}),
  }));
}

/**
 * The route's answer reduced to its status and, when the handler answered
 * with an error body, that body's `error` and `details` (both undefined on a
 * created match).
 */
function outcome(result: IHarness['result']): {
  status: number;
  error: string | undefined;
  details: IErrorResponse['details'];
} {
  const body = result.body as Partial<IErrorResponse> | undefined;
  return {
    status: result.statusCode,
    error: body?.error,
    details: body?.details,
  };
}

/** The sourceVersion of each roster unit in a campaign state, by unit id. */
function sourceVersions(state: {
  readonly rosterUnits: Readonly<Record<string, { sourceVersion?: number }>>;
}): Record<string, number | undefined> {
  return Object.fromEntries(
    Object.entries(state.rosterUnits).map(([unitId, unit]) => [
      unitId,
      unit.sourceVersion,
    ]),
  );
}

describe('CreateMultiplayerMatchBodySchema: co-op roster units', () => {
  const campaign = disjointCampaign();

  it('accepts the body the co-op entry panel builds from units carrying sourceVersion', () => {
    const body = panelBody(campaign, rosterUnits(campaign, SOURCE_VERSION));

    expect(bodyIssues(body)).toEqual([]);
    const parsed = CreateMultiplayerMatchBodySchema.parse(body);
    expect(sourceVersions(parsed.coopCampaign!.state)).toEqual({
      'unit-0': SOURCE_VERSION,
      'unit-1': SOURCE_VERSION,
    });
  });

  it('accepts the same body when no roster unit carries sourceVersion', () => {
    const body = panelBody(campaign, rosterUnits(campaign, undefined));

    expect(bodyIssues(body)).toEqual([]);
  });

  it('still refuses an unknown extra field on a roster unit', () => {
    const body = withAlteredUnit(
      panelBody(campaign, rosterUnits(campaign, SOURCE_VERSION)),
      { hullColor: 'red' },
    );

    expect(bodyIssues(body)).toContainEqual({
      code: 'unrecognized_keys',
      path: [...ALTERED_UNIT_PATH],
      keys: expect.arrayContaining(['hullColor']),
    });
  });

  it.each([['3'], [0], [-1], [1.5]])(
    'refuses sourceVersion %p at the sourceVersion path',
    (sourceVersion) => {
      const body = withAlteredUnit(
        panelBody(campaign, rosterUnits(campaign, SOURCE_VERSION)),
        { sourceVersion },
      );

      const issues = bodyIssues(body);
      expect(issues.map((issue) => issue.path)).toEqual([
        [...ALTERED_UNIT_PATH, 'sourceVersion'],
      ]);
    },
  );
});

describe('POST /api/multiplayer/matches: co-op roster units', () => {
  let dir: string;

  beforeEach(async () => {
    expect(isCampaignJournalAuthorityEnabled()).toBe(true);
    dir = await mkdtemp(path.join(tmpdir(), 'coop-roster-source-version-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'matches.db') }).initialize();
    _resetDefaultMatchStore();
    _resetCampaignHostRegistry();
    _resetRateLimitBucketsForTests();
  });

  afterEach(async () => {
    _resetCampaignHostRegistry();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /**
   * Persist the host campaign with `units` as its roster projection, the
   * save the panel awaits before it posts the match, then append that
   * envelope's genesis to the SQLite event journal and write its marker
   * (the append the campaign PUT route makes on a create under journal
   * authority, seeded as multiplayerCoopCreationCheckpoint.test.ts seeds
   * it), so the creation checkpoint's genesis-branch stage finds its
   * marker. Returns the campaign and its roster.
   */
  async function persistHostCampaign(
    units: (campaign: ICampaign) => readonly IRosterUnitProjection[],
  ): Promise<{ campaign: ICampaign; units: readonly IRosterUnitProjection[] }> {
    const campaign = disjointCampaign();
    const roster = units(campaign);
    const envelope = buildSerializedCampaign(campaign, 'device-1', 0, {
      campaignId: campaign.id,
      units: [...roster],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    const saved = saveCampaign(envelope, 0);
    expect(saved.kind).toBe('ok');
    const genesis = await appendCampaignGenesis(
      new SQLiteEventJournal(
        getSQLiteService().getDatabase(),
        () => GENESIS_AT,
      ),
      writeCampaignMigrationMarker,
      { envelope, occurredAt: GENESIS_AT },
    );
    expect(genesis.kind).toBe('genesis-appended');
    return { campaign, units: roster };
  }

  /** Post `body` through the route handler and return the harness. */
  async function post(body: unknown): Promise<IHarness> {
    const harness = mockReqRes(body);
    await handler(harness.req, harness.res);
    return harness;
  }

  it('registers the co-op match when roster units carry sourceVersion', async () => {
    const { campaign, units } = await persistHostCampaign((c) =>
      rosterUnits(c, SOURCE_VERSION),
    );

    const { result } = await post(panelBody(campaign, units));

    expect(outcome(result)).toEqual({
      status: 201,
      error: undefined,
      details: undefined,
    });
    const created = result.body as ICreateMatchResponse;
    const entry = getCampaignHostRegistry().get(created.matchId);
    expect(entry).not.toBeNull();
    expect(entry?.host.getState().campaignId).toBe(campaign.id);
    expect(sourceVersions(entry!.host.getState())).toEqual({
      'unit-0': SOURCE_VERSION,
      'unit-1': SOURCE_VERSION,
    });
    expect(sourceVersions(created.meta.coopCampaign!.state)).toEqual({
      'unit-0': SOURCE_VERSION,
      'unit-1': SOURCE_VERSION,
    });
  });

  it('registers the co-op match when no roster unit carries sourceVersion', async () => {
    const { campaign, units } = await persistHostCampaign((c) =>
      rosterUnits(c, undefined),
    );

    const { result } = await post(panelBody(campaign, units));

    expect(outcome(result)).toEqual({
      status: 201,
      error: undefined,
      details: undefined,
    });
    const created = result.body as ICreateMatchResponse;
    expect(getCampaignHostRegistry().get(created.matchId)).not.toBeNull();
  });

  it('answers 400 and registers no host for an unknown extra roster field', async () => {
    const { campaign, units } = await persistHostCampaign((c) =>
      rosterUnits(c, SOURCE_VERSION),
    );

    const { result } = await post(
      withAlteredUnit(panelBody(campaign, units), { hullColor: 'red' }),
    );

    const answer = outcome(result);
    expect(answer.status).toBe(400);
    expect(answer.error).toBe('Malformed body');
    expect(answer.details).toContainEqual({
      path: ALTERED_UNIT_PATH.join('.'),
      message: expect.stringContaining('hullColor'),
    });
    expect(getCampaignHostRegistry().size()).toBe(0);
  });
});
