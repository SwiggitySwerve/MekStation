/**
 * Tests for the scenario-pack zod schemas (design D3).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 */

import type {
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CURRENT_CAMPAIGN_SCHEMA_VERSION } from '@/lib/campaign/persistence/campaignMigration';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

// Test-only cross-package guard import (design D5's one sanctioned
// exception: "no src→e2e import in library code" — the library itself
// never imports `e2e/`, only this test file does, to prove the pack
// subsystem vocabulary stays aligned with the flow-audit registry's.
// eslint-disable-next-line import/no-relative-parent-imports -- guard-only cross-package import, see design D5
import { FLOW_MANIFEST } from '../../../../e2e/flows/manifest';
import {
  MANIFEST_VERSION,
  PACK_SUBSYSTEMS,
  campaignPackSchema,
  encounterPackSchema,
  manifestEntrySchema,
} from '../packSchemas';

// =============================================================================
// Fixtures
// =============================================================================

/** A fully-populated, schema-valid roster projection paired with `buildPopulatedCampaign()`. */
function buildRosterProjectionFixture(
  campaignId: string,
): SerializedCampaignRosterState {
  return {
    campaignId,
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
        id: 'mission-rp-1',
        missionNumber: 1,
        name: 'Raid on Hesperus II',
        result: 'pending',
        campaignId,
        deployedUnitIds: ['unit-a'],
      },
    ],
    activeMissionId: null,
    missionCount: 1,
  };
}

/** A complete, schema-valid campaign pack envelope. */
function buildValidCampaignPack(): SerializedCampaign {
  const campaign = buildPopulatedCampaign();
  const rosterProjection = buildRosterProjectionFixture(campaign.id);
  return buildSerializedCampaign(campaign, 'device-1', 1, rosterProjection);
}

/** A complete, schema-valid encounter (match-log) pack payload. */
function buildValidEncounterPack(): unknown {
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
          config: { mapRadius: 7, turnLimit: 30, seed: 12345 },
          units: [],
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
  };
}

// =============================================================================
// Campaign pack schema
// =============================================================================

describe('campaignPackSchema', () => {
  it('accepts a fully-populated, valid campaign pack envelope', () => {
    const result = campaignPackSchema.safeParse(buildValidCampaignPack());
    expect(result.success).toBe(true);
  });

  it('accepts an unknown additive top-level and body key (forward tolerance)', () => {
    const pack = buildValidCampaignPack() as unknown as Record<string, unknown>;
    pack.futureTopLevelField = 'additive';
    (pack.body as Record<string, unknown>).futureBodyField = { nested: true };
    const result = campaignPackSchema.safeParse(pack);
    expect(result.success).toBe(true);
  });

  it('rejects a drifted body shape, naming the offending path', () => {
    const pack = buildValidCampaignPack() as unknown as {
      body: Record<string, unknown>;
    };
    delete pack.body.name;
    const result = campaignPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('body.name');
  });

  it('rejects a payload missing finances.transactions, naming the path', () => {
    const pack = buildValidCampaignPack() as unknown as {
      body: { finances: Record<string, unknown> };
    };
    delete pack.body.finances.transactions;
    const result = campaignPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('body.finances.transactions');
  });

  it('rejects an unparseable currentDate, naming the path', () => {
    const pack = buildValidCampaignPack() as unknown as {
      body: Record<string, unknown>;
    };
    pack.body.currentDate = 'not-a-real-date';
    const result = campaignPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('body.currentDate');
  });

  it('rejects a schemaVersion newer than CURRENT_CAMPAIGN_SCHEMA_VERSION', () => {
    const pack = buildValidCampaignPack() as unknown as Record<string, unknown>;
    pack.schemaVersion = CURRENT_CAMPAIGN_SCHEMA_VERSION + 1;
    const result = campaignPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('schemaVersion');
  });

  it('accepts a schemaVersion at or below the current version', () => {
    const pack = buildValidCampaignPack() as unknown as Record<string, unknown>;
    pack.schemaVersion = 0;
    const result = campaignPackSchema.safeParse(pack);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Encounter (match-log) pack schema
// =============================================================================

describe('encounterPackSchema', () => {
  it('accepts a valid GameCreated-first, seeded match log', () => {
    const result = encounterPackSchema.safeParse(buildValidEncounterPack());
    expect(result.success).toBe(true);
  });

  it('rejects an unseeded match log, naming the seed path', () => {
    const pack = buildValidEncounterPack() as {
      events: Array<{ payload: { config: Record<string, unknown> } }>;
    };
    delete pack.events[0].payload.config.seed;
    const result = encounterPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('events.0.payload.config.seed');
  });

  it('rejects a match log whose first-by-sequence event is not game_created', () => {
    const pack = buildValidEncounterPack() as {
      events: Array<{ type: string }>;
    };
    pack.events[0].type = 'game_started';
    const result = encounterPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('events.0.type');
  });

  it('rejects misordered (non-strictly-increasing) event sequences', () => {
    const pack = buildValidEncounterPack() as {
      events: Array<{ sequence: number }>;
    };
    pack.events[1].sequence = 0;
    const result = encounterPackSchema.safeParse(pack);
    expect(result.success).toBe(false);
    expect(
      result.success ? [] : result.error.issues.map((i) => i.path.join('.')),
    ).toContain('events.1.sequence');
  });
});

// =============================================================================
// Manifest entry schema
// =============================================================================

describe('manifestEntrySchema', () => {
  const baseCampaignEntry = {
    id: 'navigation-briefing',
    kind: 'campaign' as const,
    subsystems: ['navigation'] as const,
    viewports: ['desktop'],
    targetRoute: '/gameplay/campaigns/{id}',
    parityAnchorJourney: 'flow:campaign-create-to-launch@contract-accepted',
    payloadPath:
      'e2e/scenario-packs/campaign/navigation-briefing.campaign.json',
    provenance: {
      genesisSource: 'flow:campaign-create-to-launch@contract-accepted',
      mintedAt: '2026-07-10T00:00:00.000Z',
      baseCommit: '428f63aa9',
    },
    pins: { schemaVersion: CURRENT_CAMPAIGN_SCHEMA_VERSION },
    postLoadActions: [],
  };

  it('accepts a valid campaign manifest entry', () => {
    const result = manifestEntrySchema.safeParse(baseCampaignEntry);
    expect(result.success).toBe(true);
  });

  it('accepts a valid encounter manifest entry', () => {
    const encounterEntry = {
      ...baseCampaignEntry,
      id: 'combat-midbattle',
      kind: 'encounter' as const,
      parityAnchorJourney: 'anchor:seam-fresh-construction-no-instant-defeat',
      pins: { matchLogDbVersion: 2 },
    };
    const result = manifestEntrySchema.safeParse(encounterEntry);
    expect(result.success).toBe(true);
  });

  it('rejects a campaign entry carrying encounter-shaped pins', () => {
    const badEntry = { ...baseCampaignEntry, pins: { matchLogDbVersion: 2 } };
    const result = manifestEntrySchema.safeParse(badEntry);
    expect(result.success).toBe(false);
  });

  it('rejects a non-kebab-case id', () => {
    const badEntry = { ...baseCampaignEntry, id: 'Navigation_Briefing' };
    const result = manifestEntrySchema.safeParse(badEntry);
    expect(result.success).toBe(false);
  });

  it('rejects a malformed parityAnchorJourney binding', () => {
    const badEntry = {
      ...baseCampaignEntry,
      parityAnchorJourney: 'just-a-string',
    };
    const result = manifestEntrySchema.safeParse(badEntry);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown additive key (manifest entries are strict, unlike pack payloads)', () => {
    const badEntry = { ...baseCampaignEntry, unexpectedField: 'nope' };
    const result = manifestEntrySchema.safeParse(badEntry);
    expect(result.success).toBe(false);
  });

  it('exports a stable MANIFEST_VERSION constant', () => {
    expect(typeof MANIFEST_VERSION).toBe('number');
    expect(MANIFEST_VERSION).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Subsystem-vocabulary guard (spec: "Subsystem vocabulary stays closed and aligned")
//
// `src/` library code never imports from `e2e/` (design D5) — this
// guard test is the one sanctioned exception, and only as a read-only
// cross-check against `e2e/flows/manifest.ts`'s registered flows.
// =============================================================================

describe('PACK_SUBSYSTEMS vocabulary guard', () => {
  it('matches the flow-audit registry FlowSubsystem vocabulary exactly', () => {
    const registeredSubsystems = new Set(
      FLOW_MANIFEST.flatMap((flow) => flow.subsystems),
    );
    expect(Array.from(registeredSubsystems).sort()).toEqual(
      Array.from(PACK_SUBSYSTEMS).sort(),
    );
    expect(new Set(PACK_SUBSYSTEMS).size).toBe(PACK_SUBSYSTEMS.length);
  });
});
