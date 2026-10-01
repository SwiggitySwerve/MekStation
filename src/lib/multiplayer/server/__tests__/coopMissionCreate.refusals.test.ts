import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import * as selector from '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits';
import { revokeCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import { getCampaignHostRegistry } from '../CampaignHostRegistry';
import { getMatchHostRegistry } from '../MatchHostRegistry';
import {
  acceptFixtureParticipation,
  archiveRouteFixture,
  expectedOpponents,
  FIXTURE_AT,
  fixtureIdentity,
  missionRequest,
  seedCoopCampaign,
  vesselRequest,
} from './coopMissionCreate.fixture';
import {
  MissionReplySchema,
  openRouteFixture,
  post,
} from './coopMissionCreate.harness';

jest.mock(
  '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits',
  () => ({
    __esModule: true,
    ...jest.requireActual<
      typeof import('@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits')
    >(
      '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits',
    ),
  }),
);

describe('co-op mission create refusals leave durable state unchanged', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>>;

  beforeEach(async () => {
    fixture = await openRouteFixture();
  });
  afterEach(async () => {
    archiveRouteFixture(fixture.root);
    await fixture.close();
    jest.restoreAllMocks();
  });

  it.each([
    'forged',
    'partial',
    'extra',
    'duplicate',
    'reference',
    'pilot',
    'position',
    'owner',
  ] as const)(
    'refuses %s opponent assertions before durable writes',
    async (kind) => {
      // Given
      const opponents = expectedOpponents(
        fixture.entry.campaignId,
        'mission-1',
        2,
      );
      const first = opponents[0];
      assert.ok(first);
      const assertions =
        kind === 'partial'
          ? [first]
          : kind === 'extra'
            ? [...opponents, { ...first, unitId: 'extra' }]
            : kind === 'duplicate'
              ? [first, first]
              : opponents.map((unit, index) =>
                  index !== 0
                    ? unit
                    : {
                        ...unit,
                        ...(kind === 'forged' ? { unitId: 'forged' } : {}),
                        ...(kind === 'reference'
                          ? {
                              unitRef:
                                'atlas-as7-d' === unit.unitRef
                                  ? 'locust-lct-1v'
                                  : 'atlas-as7-d',
                            }
                          : {}),
                        ...(kind === 'pilot' ? { gunnery: 0 } : {}),
                        ...(kind === 'position'
                          ? { startHex: { q: 0, r: 0 } }
                          : {}),
                        ...(kind === 'owner'
                          ? { ownerPlayerId: fixture.host.playerId }
                          : {}),
                      },
                );
      const before = fixture.census();
      // When
      const response = await post(
        {
          ...fixture.request,
          unitBootstrap: [...fixture.request.unitBootstrap, ...assertions],
        },
        fixture.host,
      );
      // Then
      expect(response.status).toBe(400);
      expect(fixture.census()).toEqual(before);
      expect(getMatchHostRegistry().size()).toBe(0);
    },
  );

  it('refuses an unresolved server-selected canonical reference before the first match write', async () => {
    // Given: real catalog adaptation, only the policy output is fault-injected.
    jest
      .spyOn(selector, 'selectOpponentUnits')
      .mockReturnValue([
        { unitRef: 'unknown-canonical-opponent' },
        { unitRef: 'atlas-as7-d' },
      ]);
    const before = fixture.census();
    // When
    const response = await post(fixture.request, fixture.host);
    // Then
    expect(response.status).toBe(400);
    expect(fixture.census()).toEqual(before);
  });

  it.each(['collision', 'unknown-player-ref', '12+12', '13+13'] as const)(
    'uses real accepted claims for the %s roster boundary',
    async (kind) => {
      // Given: both force contributions stay within the schema eight-unit limit.
      const campaignId = `p2b-boundary-${randomUUID()}`;
      const state = await seedCoopCampaign(campaignId, {
        counts: kind === '12+12' ? [6, 6] : kind === '13+13' ? [7, 6] : [1, 1],
        ...(kind === 'collision'
          ? {
              firstUnitId: expectedOpponents(campaignId, 'mission-1', 2)[0]
                ?.unitId,
            }
          : {}),
        ...(kind === 'unknown-player-ref'
          ? { firstUnitRef: 'unknown-canonical-player' }
          : {}),
      });
      const vessel = await post(vesselRequest(state), fixture.host);
      assert.equal(vessel.status, 201, JSON.stringify(vessel.body));
      const sessionId = z
        .object({ matchId: z.string() })
        .parse(vessel.body).matchId;
      const entry = getCampaignHostRegistry().get(sessionId);
      assert.ok(entry);
      acceptFixtureParticipation(entry, fixture.contributors);
      const request = missionRequest(entry);
      const before = fixture.census();
      // When
      const response = await post(request, fixture.host);
      // Then
      if (kind === '12+12') {
        expect(response.status).toBe(201);
        const roster = MissionReplySchema.parse(response.body).meta
          .unitBootstrap;
        expect(roster.filter((unit) => unit.side === 'player')).toHaveLength(
          12,
        );
        expect(roster.filter((unit) => unit.side === 'opponent')).toHaveLength(
          12,
        );
        expect(new Set(roster.map((unit) => unit.unitId)).size).toBe(24);
      } else {
        expect(response.status).toBe(400);
        expect(fixture.census()).toEqual(before);
      }
    },
  );

  it.each(['opponent', 'player-ref', 'config-ref'] as const)(
    'refuses a divergent persisted %s before recovery or launch announcement',
    async (kind) => {
      // Given
      const created = MissionReplySchema.parse(
        (await post(fixture.request, fixture.host)).body,
      );
      const recovery = jest.spyOn(getMatchHostRegistry(), 'getOrCreate');
      const announcement = jest.spyOn(
        fixture.entry.host,
        'announceMissionLaunched',
      );
      const before = fixture.census();
      // When
      const response = await post(
        {
          ...fixture.request,
          ...(kind === 'config-ref'
            ? {
                config: {
                  ...fixture.request.config,
                  encounterId: 'divergent-encounter',
                },
              }
            : {}),
          unitBootstrap:
            kind === 'opponent'
              ? [
                  ...fixture.request.unitBootstrap,
                  ...expectedOpponents(
                    fixture.entry.campaignId,
                    'mission-1',
                    2,
                  ).map((unit) => ({
                    ...unit,
                    unitRef: 'unknown-divergent-reference',
                  })),
                ]
              : fixture.request.unitBootstrap.map((unit) =>
                  kind === 'player-ref'
                    ? { ...unit, unitRef: 'unknown-divergent-player' }
                    : unit,
                ),
        },
        fixture.host,
      );
      // Then
      expect(response.status).toBe(kind === 'opponent' ? 400 : 409);
      expect(recovery).not.toHaveBeenCalled();
      expect(announcement).not.toHaveBeenCalled();
      expect(fixture.census()).toEqual(before);
      expect(
        MissionReplySchema.parse({
          matchId: created.matchId,
          missionMatchId: created.matchId,
          meta: await fixture.store.getMatchMeta(created.matchId),
        }),
      ).toEqual(created);
    },
  );

  it.each([
    ['branchId', 'another-branch'],
    ['revision', 0],
    ['effectiveGeneration', 999],
  ])(
    'refuses a stale %s when the mission has no receipt',
    async (field, value) => {
      // Given
      const before = fixture.census();
      const request = {
        ...fixture.request,
        coopCampaign: {
          ...fixture.request.coopCampaign,
          expectedHead: {
            ...fixture.request.coopCampaign.expectedHead,
            [field]: value,
          },
        },
      };
      // When
      const response = await post(request, fixture.host);
      // Then
      expect(response.status).toBe(409);
      expect(
        z.object({ code: z.string().min(1) }).safeParse(response.body).success,
      ).toBe(true);
      expect(fixture.census()).toEqual(before);
    },
  );

  it('rolls back metadata when an opening-event insert fails', async () => {
    // Given
    const fault = new Database(fixture.matchPath);
    try {
      fault.exec(`CREATE TRIGGER p1a_fail_opening
        BEFORE INSERT ON mp_match_events
        BEGIN SELECT RAISE(ABORT, 'p1a-opening-write-failure'); END`);
      const before = fixture.census();
      // When
      const response = await post(fixture.request, fixture.host);
      // Then
      expect(response.status).toBe(500);
      expect(fixture.census()).toEqual(before);
    } finally {
      fault.close();
    }
  });

  it('recovers an active receipt after its cached host failed to close durably', async () => {
    // Given
    const first = await post(fixture.request, fixture.host);
    expect(first.status).toBe(201);
    const created = MissionReplySchema.parse(first.body);
    const registry = getMatchHostRegistry();
    const closed = registry.get(created.matchId);
    assert.ok(closed);
    const fault = new Database(fixture.matchPath);
    try {
      fault.exec(`CREATE TRIGGER p1a_fail_close
        BEFORE UPDATE OF status ON mp_matches
        WHEN NEW.status = 'completed'
        BEGIN SELECT RAISE(ABORT, 'p1a-close-write-failure'); END`);
      // Native SQLite errors can originate in another Jest realm.
      await expect(closed.closeMatch()).rejects.toMatchObject({
        message: 'p1a-close-write-failure',
        code: 'SQLITE_CONSTRAINT_TRIGGER',
      });
      expect(closed.isClosed()).toBe(true);
      expect((await fixture.store.getMatchMeta(created.matchId)).status).toBe(
        'active',
      );
      fault.exec('DROP TRIGGER p1a_fail_close');
    } finally {
      fault.close();
    }
    const before = fixture.census();
    // When
    const retry = await post(fixture.request, fixture.host);
    // Then
    expect(retry.status).toBe(201);
    expect(MissionReplySchema.parse(retry.body).missionMatchId).toBe(
      created.matchId,
    );
    expect(registry.get(created.matchId)?.isClosed()).toBe(false);
    expect(fixture.census()).toEqual(before);
  });

  it('refuses a divergent retry without closing the successful combat match', async () => {
    // Given
    const first = await post(fixture.request, fixture.host);
    expect(first.status).toBe(201);
    const created = MissionReplySchema.parse(first.body);
    const before = fixture.census();
    const stored = await fixture.store.getMatchMeta(created.matchId);
    // When
    const conflict = await post(
      {
        ...fixture.request,
        config: { ...fixture.request.config, turnLimit: 21 },
      },
      fixture.host,
    );
    // Then
    expect(conflict.status).toBe(409);
    expect(fixture.census()).toEqual(before);
    expect(await fixture.store.getMatchMeta(created.matchId)).toEqual(stored);
    expect(stored.status).toBe('active');
  });

  it('refuses a nonmember even when a matching receipt already exists', async () => {
    // Given
    const first = await post(fixture.request, fixture.host);
    expect(first.status).toBe(201);
    const before = fixture.census();
    const stranger = fixtureIdentity();
    // When
    const response = await post(fixture.request, stranger);
    // Then
    expect(response.status).toBe(403);
    expect(fixture.census()).toEqual(before);
  });

  it('refuses a revoked initiator rather than returning its previous receipt', async () => {
    // Given
    const first = await post(fixture.request, fixture.host);
    expect(first.status).toBe(201);
    revokeCampaignSessionParticipant({
      campaignId: fixture.entry.campaignId,
      sessionId: fixture.entry.matchId,
      participantId: fixture.host.playerId,
      revokedAt: FIXTURE_AT,
    });
    const before = fixture.census();
    // When
    const response = await post(fixture.request, fixture.host);
    // Then
    expect(response.status).toBe(403);
    expect(fixture.census()).toEqual(before);
  });

  it.each(['claim', 'publish'] as const)(
    'refuses a new mission when accepted participation lacks %s',
    async (missing) => {
      // Given: the other authority fact is present, so it cannot mask this gap.
      acceptFixtureParticipation(
        fixture.entry,
        fixture.contributors.map((item) => ({
          ...item,
          [missing]: false,
        })),
        'mission-2',
      );
      const request = missionRequest(fixture.entry, 'mission-2');
      const before = fixture.census();
      // When
      const response = await post(request, fixture.host);
      // Then
      expect(response.status).toBe(400);
      expect(fixture.census()).toEqual(before);
    },
  );

  it('refuses a choice inconsistent with the accepted participation', async () => {
    // Given
    const before = fixture.census();
    const request = {
      ...fixture.request,
      coopCampaign: {
        ...fixture.request.coopCampaign,
        contributions: fixture.request.coopCampaign.contributions.map(
          (item) => ({
            ...item,
            choice: 'command-hq',
          }),
        ),
      },
    };
    // When
    const response = await post(request, fixture.host);
    // Then
    expect(response.status).toBe(400);
    expect(fixture.census()).toEqual(before);
  });

  it.each([
    ['foreign ref', { unitRef: 'locust-lct-1v' }],
    ['foreign unit', { unitId: 'not-in-roster' }],
    ['opponent-side teammate', { side: 'opponent' }],
    ['client owner', { ownerPlayerId: 'forged-owner' }],
  ])('refuses %s without creating another match', async (_name, fields) => {
    // Given
    const before = fixture.census();
    const request = {
      ...fixture.request,
      unitBootstrap: fixture.request.unitBootstrap.map((unit) =>
        unit.unitId === 'unit-host' ? { ...unit, ...fields } : unit,
      ),
    };
    // When
    const response = await post(request, fixture.host);
    // Then
    expect(response.status).toBe(400);
    expect(fixture.census()).toEqual(before);
  });

  it('refuses missing contribution choice at the strict request boundary', async () => {
    // Given
    const before = fixture.census();
    const request = {
      ...fixture.request,
      coopCampaign: {
        ...fixture.request.coopCampaign,
        contributions: [{ forceId: 'force-host', unitIds: ['unit-host'] }],
      },
    };
    // When
    const response = await post(request, fixture.host);
    // Then
    expect(response.status).toBe(400);
    expect(fixture.census()).toEqual(before);
  });

  it('refuses duplicate roster rows rather than assigning two runtime units', async () => {
    // Given
    const before = fixture.census();
    const request = {
      ...fixture.request,
      unitBootstrap: [
        ...fixture.request.unitBootstrap,
        fixture.request.unitBootstrap[0],
      ],
    };
    // When
    const response = await post(request, fixture.host);
    // Then
    expect(response.status).toBe(400);
    expect(fixture.census()).toEqual(before);
  });
});
