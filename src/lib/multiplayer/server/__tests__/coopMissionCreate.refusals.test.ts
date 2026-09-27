import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { revokeCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import { getMatchHostRegistry } from '../MatchHostRegistry';
import {
  acceptFixtureParticipation,
  FIXTURE_AT,
  fixtureIdentity,
  missionRequest,
} from './coopMissionCreate.fixture';
import {
  MissionReplySchema,
  openRouteFixture,
  post,
} from './coopMissionCreate.harness';

describe('co-op mission create refusals leave durable state unchanged', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>>;

  beforeEach(async () => {
    fixture = await openRouteFixture();
  });
  afterEach(async () => {
    await fixture.close();
  });

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
