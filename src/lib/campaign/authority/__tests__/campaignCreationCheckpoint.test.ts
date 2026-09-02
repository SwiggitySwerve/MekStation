/**
 * Creation acknowledges only after every authority piece commits.
 *
 * Each row provokes ONE stage into refusing and then reads the durable
 * stores to prove nothing after it ran - which is the only way to tell a
 * checkpoint that awaits its stages from one that merely lists them.
 * The stores are the shipped ones against a real temp-file SQLite, so a
 * "committed" here means a row exists, not that a mock was called.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Campaign Creation Has an Awaited Authority Checkpoint")
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { SerializedCampaignRosterState } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  claimCampaignSessionForce,
  readCampaignSessionForceHolder,
} from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';

import { createJournalNativeMarker } from '../campaignAuthorityMigration';
import {
  CAMPAIGN_CREATION_MISSION_ID,
  commitCampaignCreationCheckpoint,
  playerSlotPlaceholderId,
} from '../campaignCreationCheckpoint';
import { campaignCreationCheckpointPorts } from '../campaignCreationCheckpointPorts';

const SESSION_ID = 'match-1';
const GM_ID = 'pid_host';
const NOW = '3025-07-04T00:00:00.000Z';

/** The production ports, which this suite runs against a real database. */
function ports() {
  const resolved = campaignCreationCheckpointPorts();
  if (!resolved) throw new Error('expected durable checkpoint ports');
  return resolved;
}

/** Persist a campaign and hand back its id plus its forces in slot order. */
function persistCampaign(roster?: SerializedCampaignRosterState): {
  campaign: ICampaign;
  forceIds: readonly string[];
} {
  const campaign = buildPopulatedCampaign();
  const saved = saveCampaign(
    buildSerializedCampaign(campaign, 'device-1', 0, roster),
    0,
  );
  expect(saved.kind).toBe('ok');
  return {
    campaign,
    forceIds: Array.from(campaign.forces.keys()).sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function commit(campaignId: string, overrides: Record<string, unknown> = {}) {
  return commitCampaignCreationCheckpoint(ports(), {
    campaignId,
    sessionId: SESSION_ID,
    gmParticipantId: GM_ID,
    journalAuthorityEnabled: false,
    committedAt: NOW,
    ...overrides,
  });
}

function holderOf(campaignId: string, forceId: string): string | null {
  return readCampaignSessionForceHolder({
    campaignId,
    sessionId: SESSION_ID,
    missionId: CAMPAIGN_CREATION_MISSION_ID,
    forceId,
  });
}

describe('campaign creation authority checkpoint', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'creation-checkpoint-'));
    resetSQLiteService();
    resetUnitRepository();
    getSQLiteService({ path: path.join(dir, 'checkpoint.db') }).initialize();
  });

  afterEach(async () => {
    resetUnitRepository();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('commits the GM seat and both slot placeholders before reporting success', async () => {
    const { campaign, forceIds } = persistCampaign();

    const result = await commit(campaign.id);

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.genesisBranch).toBe('skipped');
    expect(result.slots).toEqual([
      {
        slot: 1,
        placeholderParticipantId: playerSlotPlaceholderId(1),
        forceId: forceIds[0],
      },
      {
        slot: 2,
        placeholderParticipantId: playerSlotPlaceholderId(2),
        forceId: forceIds[1],
      },
    ]);
    expect(
      activeCampaignSessionMembership(campaign.id, SESSION_ID, GM_ID)?.seat,
    ).toBe('gm');
    expect(holderOf(campaign.id, forceIds[0] ?? '')).toBe(
      playerSlotPlaceholderId(1),
    );
    expect(holderOf(campaign.id, forceIds[1] ?? '')).toBe(
      playerSlotPlaceholderId(2),
    );
  });

  it('refuses at campaign-record and commits nothing downstream', async () => {
    const result = await commit('campaign-never-persisted');

    expect(result).toEqual({
      kind: 'failed',
      stage: 'campaign-record',
      reason: 'authoritative campaign record is not_found',
    });
    expect(
      listActiveCampaignSessionParticipants(
        'campaign-never-persisted',
        SESSION_ID,
      ),
    ).toEqual([]);
  });

  it('refuses at genesis-branch when journal authority has no marker', async () => {
    const { campaign, forceIds } = persistCampaign();

    const result = await commit(campaign.id, {
      journalAuthorityEnabled: true,
    });

    expect(result).toEqual({
      kind: 'failed',
      stage: 'genesis-branch',
      reason: 'genesis branch is not committed',
    });
    expect(
      activeCampaignSessionMembership(campaign.id, SESSION_ID, GM_ID),
    ).toBeNull();
    expect(holderOf(campaign.id, forceIds[0] ?? '')).toBeNull();
  });

  it('accepts the committed genesis branch under journal authority', async () => {
    const { campaign } = persistCampaign();
    writeCampaignMigrationMarker(createJournalNativeMarker(campaign.id));
    expect(readCampaignMigrationMarker(campaign.id).kind).toBe('ok');

    const result = await commit(campaign.id, {
      journalAuthorityEnabled: true,
    });

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.genesisBranch).toBe('committed');
  });

  it('refuses at gm-membership when another identity holds the seat', async () => {
    const { campaign, forceIds } = persistCampaign();
    bindCampaignSessionParticipant({
      campaignId: campaign.id,
      sessionId: SESSION_ID,
      participantId: 'pid_other_gm',
      seat: 'gm',
      boundAt: NOW,
    });

    const result = await commit(campaign.id);

    expect(result).toEqual({
      kind: 'failed',
      stage: 'gm-membership',
      reason: 'gm seat refused: gm-seat-taken',
    });
    expect(holderOf(campaign.id, forceIds[0] ?? '')).toBeNull();
  });

  it('refuses at player-slots when both tactical slots name the same force', async () => {
    const { campaign, forceIds } = persistCampaign();
    const shared = forceIds[0] ?? '';

    const result = await commit(campaign.id, {
      playerSlotForceIds: { 1: shared, 2: shared },
    });

    expect(result).toEqual({
      kind: 'failed',
      stage: 'player-slots',
      reason: `both tactical slots were assigned force ${shared}`,
    });
    expect(holderOf(campaign.id, shared)).toBeNull();
  });

  it('refuses at force-ownership when the force is already held', async () => {
    const { campaign, forceIds } = persistCampaign();
    claimCampaignSessionForce({
      campaignId: campaign.id,
      sessionId: SESSION_ID,
      missionId: CAMPAIGN_CREATION_MISSION_ID,
      forceId: forceIds[0] ?? '',
      participantId: 'pid_squatter',
      claimedAt: NOW,
    });

    const result = await commit(campaign.id);

    expect(result).toEqual({
      kind: 'failed',
      stage: 'force-ownership',
      reason: `force ${forceIds[0]} is held by pid_squatter`,
    });
  });

  it('refuses at unit-references when an adopted custom design cannot resolve', async () => {
    const { campaign } = persistCampaign();
    const roster: SerializedCampaignRosterState = {
      campaignId: campaign.id,
      units: [
        {
          unitId: 'roster-unit-1',
          unitRef: 'custom-never-saved',
          unitSource: 'custom',
          unitName: 'Atlas AS7-CUSTOM',
          chassisVariant: 'AS7-CUSTOM',
          readiness: 'Ready',
        },
      ],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    };
    const resaved = saveCampaign(
      buildSerializedCampaign(campaign, 'device-1', 1, roster),
      1,
    );
    expect(resaved.kind).toBe('ok');

    const result = await commit(campaign.id);

    expect(result).toEqual({
      kind: 'failed',
      stage: 'unit-references',
      reason: 'roster unit roster-unit-1 is custom-unit-record-absent',
    });
  });

  it('adopts a resolvable custom design as part of the checkpoint', async () => {
    const created = getUnitRepository().create({
      chassis: 'Atlas',
      variant: 'AS7-CUSTOM',
      data: {
        chassis: 'Atlas',
        model: 'AS7-CUSTOM',
        unitType: 'BattleMech',
        configuration: 'Biped',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Clan Invasion',
        year: 3051,
        tonnage: 95,
        engine: { type: 'XL', rating: 285 },
        gyro: { type: 'Compact' },
        structure: { type: 'Endo Steel' },
        armor: { type: 'Ferro-Fibrous', allocation: { Head: 9 } },
        equipment: [],
        criticalSlots: { Head: ['Cockpit'] },
      },
    });
    if (!created.success) throw new Error('fixture create failed');
    const { campaign } = persistCampaign({
      campaignId: 'placeholder',
      units: [],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
    const resaved = saveCampaign(
      buildSerializedCampaign(campaign, 'device-1', 1, {
        campaignId: campaign.id,
        units: [
          {
            unitId: 'roster-unit-1',
            unitRef: created.data.id,
            unitSource: 'custom',
            unitName: 'Atlas AS7-CUSTOM',
            chassisVariant: 'AS7-CUSTOM',
            readiness: 'Ready',
          },
        ],
        pilots: [],
        missions: [],
        activeMissionId: null,
        missionCount: 0,
      }),
      1,
    );
    expect(resaved.kind).toBe('ok');

    const result = await commit(campaign.id);

    expect(result.kind).toBe('committed');
    if (result.kind !== 'committed') return;
    expect(result.adoptedUnits).toHaveLength(1);
    expect(result.adoptedUnits[0]?.customization?.engine.rating).toBe(285);
    expect(result.adoptedUnits[0]?.adoptedAt).toBe(NOW);
  });

  it('is idempotent when creation retries', async () => {
    const { campaign, forceIds } = persistCampaign();

    const first = await commit(campaign.id);
    const second = await commit(campaign.id);

    expect(first.kind).toBe('committed');
    expect(second.kind).toBe('committed');
    expect(
      listActiveCampaignSessionParticipants(campaign.id, SESSION_ID),
    ).toHaveLength(1);
    expect(holderOf(campaign.id, forceIds[0] ?? '')).toBe(
      playerSlotPlaceholderId(1),
    );
  });
});
