/**
 * Tests for the graph-aware id-templating stamper (design D4 + D11).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 */

import type {
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import type { CampaignPackPayload, EncounterPackPayload } from '../packSchemas';

import {
  PackIdResidueError,
  canonicalizePackPayload,
  stampPackIds,
} from '../packStamping';

// =============================================================================
// Fixtures
// =============================================================================

/** A campaign pack envelope with two roster-projection missions (proves missionNumber ordering) and cross-store refs set on both (proves stripping). */
function buildCampaignPackFixture(): CampaignPackPayload {
  const campaign = buildPopulatedCampaign();
  const rosterProjection: SerializedCampaignRosterState = {
    campaignId: campaign.id,
    units: [],
    pilots: [
      {
        pilotId: 'pilot-1',
        pilotName: 'Test Pilot',
        status: CampaignPilotStatus.Active,
        wounds: 0,
        recoveryTime: 0,
        xp: 0,
        campaignXpEarned: 0,
        campaignKills: 0,
        campaignMissions: 0,
        hireDate: '3025-01-01T00:00:00.000Z',
        primaryRole: CampaignPersonnelRole.PILOT,
        rankIndex: 0,
      },
    ],
    missions: [
      {
        id: 'mission-second-created',
        missionNumber: 2,
        name: 'Defend New Avalon',
        result: 'pending',
        campaignId: campaign.id,
        deployedUnitIds: ['unit-a'],
        encounterId: 'encounter-42',
        gameSessionId: 'session-42',
      },
      {
        id: 'mission-first-created',
        missionNumber: 1,
        name: 'Raid on Hesperus II',
        result: 'victory',
        campaignId: campaign.id,
        deployedUnitIds: ['unit-a', 'unit-b'],
        encounterId: 'encounter-7',
        gameSessionId: 'session-7',
      },
    ],
    activeMissionId: 'mission-second-created',
    missionCount: 2,
  };
  const envelope: SerializedCampaign = buildSerializedCampaign(
    campaign,
    'device-1',
    1,
    rosterProjection,
  );
  return envelope as unknown as CampaignPackPayload;
}

/** An encounter pack payload with two units on distinct sides (proves deployed unit ids are untouched by the matchId remap). */
function buildEncounterPackFixture(): EncounterPackPayload {
  return {
    matchId: 'e2e-recovery-fixture',
    events: [
      {
        id: 'event-0',
        gameId: 'e2e-recovery-fixture',
        sequence: 0,
        timestamp: '3025-01-01T00:00:00.000Z',
        type: 'game_created',
        turn: 0,
        phase: 'initiative',
        payload: {
          config: { mapRadius: 7, turnLimit: 30, seed: 987654 },
          units: [
            {
              id: 'player-1-atlas',
              name: 'Atlas',
              side: 'player',
              unitRef: 'atlas',
            },
            {
              id: 'opponent-1-atlas',
              name: 'Atlas',
              side: 'opponent',
              unitRef: 'atlas',
            },
          ],
        },
      },
      {
        id: 'event-1',
        gameId: 'e2e-recovery-fixture',
        sequence: 1,
        timestamp: '3025-01-01T00:00:01.000Z',
        type: 'game_started',
        turn: 1,
        phase: 'initiative',
        payload: { firstSide: 'player' },
      },
    ],
    matchesRow: { status: 'active', lastActivity: '3025-01-01T00:01:00.000Z' },
  } as unknown as EncounterPackPayload;
}

// =============================================================================
// stampPackIds — campaign packs
// =============================================================================

describe('stampPackIds (campaign)', () => {
  it('(a) two stamps of one payload yield distinct ids', () => {
    const fixture = buildCampaignPackFixture();
    const first = stampPackIds(fixture, {
      packId: 'navigation',
      workerIndex: 0,
    });
    const second = stampPackIds(fixture, {
      packId: 'navigation',
      workerIndex: 0,
    });
    expect(first.ids.campaignId).not.toBe(second.ids.campaignId);
  });

  it('(b) the stamped graph is internally consistent (envelope/body/rosterProjection ids all equal)', () => {
    const fixture = buildCampaignPackFixture();
    const { payload, ids } = stampPackIds(fixture, {
      packId: 'navigation',
      workerIndex: 3,
    });
    expect(payload.campaignId).toBe(ids.campaignId);
    expect(payload.body.id).toBe(ids.campaignId);
    expect(payload.body.rosterProjection?.campaignId).toBe(ids.campaignId);
    for (const mission of payload.body.rosterProjection?.missions ?? []) {
      expect(mission.campaignId).toBe(ids.campaignId);
    }
  });

  it('(c) an id planted in a field the schema does not enumerate trips the residue scan, naming the path', () => {
    const fixture = buildCampaignPackFixture() as CampaignPackPayload & {
      body: { debugCampaignIdCopy?: string };
    };
    // An additive, schema-passthrough-tolerated field carrying the
    // pre-stamp campaignId — the targeted remap does not know this
    // field exists, so only the zero-residue scan can catch it.
    fixture.body.debugCampaignIdCopy = fixture.campaignId;

    expect(() =>
      stampPackIds(fixture, { packId: 'navigation', workerIndex: 0 }),
    ).toThrow(PackIdResidueError);
    try {
      stampPackIds(fixture, { packId: 'navigation', workerIndex: 0 });
      throw new Error('expected stampPackIds to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(PackIdResidueError);
      expect((error as PackIdResidueError).residuePath).toContain(
        'debugCampaignIdCopy',
      );
    }
  });

  it('rewrites the row-external campaign id to the `${packId}-w${workerIndex}-<uuid>` template', () => {
    const fixture = buildCampaignPackFixture();
    const { ids } = stampPackIds(fixture, {
      packId: 'navigation-briefing',
      workerIndex: 2,
    });
    expect(ids.campaignId).toMatch(/^navigation-briefing-w2-[0-9a-z-]+$/);
  });
});

// =============================================================================
// stampPackIds — encounter packs
// =============================================================================

describe('stampPackIds (encounter)', () => {
  it('(d) deployed session unit ids are untouched', () => {
    const fixture = buildEncounterPackFixture();
    const { payload } = stampPackIds(fixture, {
      packId: 'combat',
      workerIndex: 0,
    });
    const gameCreated = payload.events[0] as unknown as {
      payload: { units: Array<{ id: string }> };
    };
    expect(gameCreated.payload.units.map((unit) => unit.id)).toEqual([
      'player-1-atlas',
      'opponent-1-atlas',
    ]);
  });

  it('remaps matchId at the top level and every event.gameId consistently', () => {
    const fixture = buildEncounterPackFixture();
    const { payload, ids } = stampPackIds(fixture, {
      packId: 'combat',
      workerIndex: 1,
    });
    expect(payload.matchId).toBe(ids.matchId);
    for (const event of payload.events) {
      expect((event as unknown as { gameId: string }).gameId).toBe(ids.matchId);
    }
  });

  it('two stamps of the same matchlog payload yield distinct match ids', () => {
    const fixture = buildEncounterPackFixture();
    const first = stampPackIds(fixture, { packId: 'combat', workerIndex: 0 });
    const second = stampPackIds(fixture, { packId: 'combat', workerIndex: 0 });
    expect(first.ids.matchId).not.toBe(second.ids.matchId);
  });
});

// =============================================================================
// canonicalizePackPayload — campaign packs
// =============================================================================

describe('canonicalizePackPayload (campaign)', () => {
  it('(e) canonicalizing the same captured payload twice yields byte-identical output', () => {
    const fixture = buildCampaignPackFixture();
    const first = canonicalizePackPayload(fixture, {
      packId: 'navigation-briefing',
    });
    const second = canonicalizePackPayload(fixture, {
      packId: 'navigation-briefing',
    });
    expect(JSON.stringify(first.payload)).toBe(JSON.stringify(second.payload));
  });

  it('(f) the canonicalized payload carries no wall-clock-shaped id in the remapped families and strips encounterId/gameSessionId', () => {
    const fixture = buildCampaignPackFixture();
    const { payload, ids } = canonicalizePackPayload(fixture, {
      packId: 'navigation-briefing',
    });

    expect(payload.campaignId).toBe(ids.campaignId);
    expect(payload.campaignId).toMatch(/^pack:navigation-briefing:campaign$/);
    expect(payload.body.id).not.toMatch(/^campaign-\d+-[a-z0-9]+$/);

    for (const mission of payload.body.rosterProjection?.missions ?? []) {
      expect(mission.id).not.toMatch(/^mission-\d+-[a-z0-9]+$/);
      expect(mission.encounterId).toBeUndefined();
      expect(mission.gameSessionId).toBeUndefined();
    }
  });

  it('canonicalizes roster-projection mission ids in missionNumber order, remapping activeMissionId too', () => {
    const fixture = buildCampaignPackFixture();
    const { payload } = canonicalizePackPayload(fixture, {
      packId: 'navigation-briefing',
    });
    const missions = payload.body.rosterProjection?.missions ?? [];

    const first = missions.find((m) => m.name === 'Raid on Hesperus II');
    const second = missions.find((m) => m.name === 'Defend New Avalon');
    expect(first?.id).toBe('pack:navigation-briefing:mission:01');
    expect(second?.id).toBe('pack:navigation-briefing:mission:02');
    // activeMissionId pointed at the second-created (missionNumber 2)
    // roster mission record in the fixture — it must follow the remap.
    expect(payload.body.rosterProjection?.activeMissionId).toBe(
      'pack:navigation-briefing:mission:02',
    );
  });

  it('(g) stamping a canonicalized payload remaps cleanly FROM the canonical template ids', () => {
    const fixture = buildCampaignPackFixture();
    const canonicalized = canonicalizePackPayload(fixture, {
      packId: 'navigation-briefing',
    });
    expect(canonicalized.payload.campaignId).toBe(
      'pack:navigation-briefing:campaign',
    );

    const stamped = stampPackIds(canonicalized.payload, {
      packId: 'navigation-briefing',
      workerIndex: 4,
    });

    expect(stamped.payload.campaignId).toBe(stamped.ids.campaignId);
    expect(stamped.payload.body.id).toBe(stamped.ids.campaignId);
    expect(stamped.payload.body.rosterProjection?.campaignId).toBe(
      stamped.ids.campaignId,
    );
    // No trace of the canonical template id survives after stamping —
    // proves the residue scan is satisfied by the composed pipeline too.
    expect(JSON.stringify(stamped.payload)).not.toContain(
      'pack:navigation-briefing:campaign',
    );
  });
});

// =============================================================================
// canonicalizePackPayload — encounter packs
// =============================================================================

describe('canonicalizePackPayload (encounter)', () => {
  it('canonicalizes the matchId family to a deterministic pack-scoped template id', () => {
    const fixture = buildEncounterPackFixture();
    const { payload, ids } = canonicalizePackPayload(fixture, {
      packId: 'combat-midbattle',
    });
    expect(ids.matchId).toBe('pack:combat-midbattle:match');
    expect(payload.matchId).toBe(ids.matchId);
    for (const event of payload.events) {
      expect((event as unknown as { gameId: string }).gameId).toBe(ids.matchId);
    }
  });

  it('leaves deployed session unit ids untouched by canonicalization', () => {
    const fixture = buildEncounterPackFixture();
    const { payload } = canonicalizePackPayload(fixture, {
      packId: 'combat-midbattle',
    });
    const gameCreated = payload.events[0] as unknown as {
      payload: { units: Array<{ id: string }> };
    };
    expect(gameCreated.payload.units.map((unit) => unit.id)).toEqual([
      'player-1-atlas',
      'opponent-1-atlas',
    ]);
  });

  it('composes: stamping a canonicalized encounter payload remaps cleanly from the canonical matchId', () => {
    const fixture = buildEncounterPackFixture();
    const canonicalized = canonicalizePackPayload(fixture, {
      packId: 'combat-midbattle',
    });
    const stamped = stampPackIds(canonicalized.payload, {
      packId: 'combat-midbattle',
      workerIndex: 1,
    });
    expect(stamped.payload.matchId).toBe(stamped.ids.matchId);
    expect(JSON.stringify(stamped.payload)).not.toContain(
      'pack:combat-midbattle:match',
    );
  });

  it('two canonicalizations of the same capture are byte-identical (determinism)', () => {
    const fixture = buildEncounterPackFixture();
    const first = canonicalizePackPayload(fixture, {
      packId: 'combat-midbattle',
    });
    const second = canonicalizePackPayload(fixture, {
      packId: 'combat-midbattle',
    });
    expect(JSON.stringify(first.payload)).toBe(JSON.stringify(second.payload));
  });
});
