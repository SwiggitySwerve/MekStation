/**
 * A launch materializes from the authority's head, or refuses with it.
 *
 * The head is READ from the branch store in every row - never a literal -
 * because the failure this guards against is a materializer that keeps
 * answering `root` after a candidate is activated and fields the wrong
 * lineage while looking correct. The stream, its genesis branch and its
 * effective head are all built through the shipped paths against a real
 * temp-file SQLite, and ownership comes from the same claim rows the
 * creation checkpoint writes.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Scenario Materialization Uses Authoritative Owned Forces")
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  SerializedCampaign,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import {
  CAMPAIGN_CREATION_MISSION_ID,
  playerSlotPlaceholderId,
} from '@/lib/campaign/authority/campaignCreationCheckpoint';
import {
  appendCampaignGenesis,
  authoritativeStateFromSerializedCampaign,
} from '@/lib/campaign/authority/campaignSourceGenesis';
import {
  materializeOwnedPlayerForces,
  ownedPlayerForceUnits,
  type OwnedMissionContext,
} from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { validateExpectedBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  claimCampaignSessionForce,
  listCampaignSessionForceClaims,
  readCampaignSessionForceHolder,
  readCampaignSessionForcesHeldBy,
} from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import {
  bindCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { getUnitRepository } from '@/services/units/UnitRepository';

const SESSION_ID = 'match-1';
const MISSION_ID = 'mission-1';
const NOW = '3025-07-04T00:00:00.000Z';

/**
 * The shared fixture gives both forces the same unit ids, which the
 * authoritative projection rejects as a double claim - remap so each
 * force owns one distinct unit, which is also what two tactical slots
 * owning separate forces looks like.
 */
function disjointCampaign(): ICampaign {
  const campaign = buildPopulatedCampaign();
  const forces = [
    ...Array.from(campaign.forces.values()),
    {
      ...Array.from(campaign.forces.values())[0],
      id: 'force-sub-2',
      name: 'Bravo Lance',
    },
  ];
  return {
    ...campaign,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
}

function rosterFor(campaign: ICampaign): SerializedCampaignRosterState {
  const unitIds = Array.from(campaign.forces.values()).flatMap(
    (f) => f.unitIds,
  );
  return {
    campaignId: campaign.id,
    units: unitIds.map((unitId, index) => ({
      unitId,
      unitRef: `catalog-ref-${index}`,
      unitSource: 'canonical' as const,
      unitName: `Unit ${index}`,
      chassisVariant: `V-${index}`,
      pilotId: `pilot-${index}`,
      readiness: 'Ready' as const,
    })),
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  };
}

interface IWorld {
  readonly campaign: ICampaign;
  readonly envelope: SerializedCampaign;
  readonly forceIds: readonly string[];
  readonly branchId: string;
  readonly generation: number;
  readonly revision: number;
}

/** The real ports: every read goes to a shipped store. */
function ports() {
  return {
    validateHead: (
      campaignId: string,
      currentRevision: number,
      expected: Parameters<typeof validateExpectedBranchHead>[3],
    ) =>
      validateExpectedBranchHead(
        new SQLiteEventHistoryBranchStore(getSQLiteService().getDatabase()),
        { streamType: CAMPAIGN_STREAM_TYPE, streamId: campaignId },
        currentRevision,
        expected,
      ),
    readForcesHeldBy: readCampaignSessionForcesHeldBy,
    readForceHolder: readCampaignSessionForceHolder,
    readCampaign,
    resolveCustomUnit: (unitRef: string) =>
      getUnitRepository().getById(unitRef),
  };
}

/**
 * Persist the campaign, append its genesis (which creates the journal
 * stream head), backfill the genesis branch, and claim one force per
 * tactical slot the way the creation checkpoint does.
 */
async function buildWorld(): Promise<IWorld> {
  const campaign = disjointCampaign();
  const envelope = buildSerializedCampaign(
    campaign,
    'device-1',
    0,
    rosterFor(campaign),
  );
  expect(saveCampaign(envelope, 0).kind).toBe('ok');

  const db = getSQLiteService().getDatabase();
  const genesis = await appendCampaignGenesis(
    new SQLiteEventJournal(db, () => NOW),
    () => undefined,
    { envelope, occurredAt: NOW },
  );
  expect(genesis.kind).toBe('genesis-appended');

  const branchStore = new SQLiteEventHistoryBranchStore(db);
  branchStore.backfillGenesisBranches();
  const head = branchStore.requireEffectiveHead({
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: campaign.id,
  });

  const forceIds = Array.from(campaign.forces.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  forceIds.slice(0, 2).forEach((forceId, index) => {
    claimCampaignSessionForce({
      campaignId: campaign.id,
      sessionId: SESSION_ID,
      missionId: CAMPAIGN_CREATION_MISSION_ID,
      forceId,
      participantId: playerSlotPlaceholderId(index === 0 ? 1 : 2),
      claimedAt: NOW,
    });
  });

  return {
    campaign,
    envelope,
    forceIds,
    branchId: head.branchId,
    generation: head.effectiveGeneration,
    revision: 1,
  };
}

function materialize(world: IWorld, overrides: Record<string, unknown> = {}) {
  return materializeOwnedPlayerForces(ports(), {
    campaignId: world.campaign.id,
    sessionId: SESSION_ID,
    missionId: MISSION_ID,
    currentRevision: world.revision,
    expectedHead: {
      branchId: world.branchId,
      revision: world.revision,
      effectiveGeneration: world.generation,
    },
    materializedAt: NOW,
    ...overrides,
  });
}

describe('authoritative owned-force materialization', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'owned-force-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'owned.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('materializes both slots at the head the branch store actually holds', async () => {
    const world = await buildWorld();

    const result = materialize(world);

    expect(result.kind).toBe('materialized');
    if (result.kind !== 'materialized') return;
    // The branch id is compared to the store's own answer, never to a
    // literal - a hard-coded 'root' would pass here forever.
    expect(result.head.branchId).toBe(world.branchId);
    expect(result.head.effectiveGeneration).toBe(world.generation);
    expect(result.head.revision).toBe(world.revision);
    expect(result.slots.map((slot) => slot.slot)).toEqual([1, 2]);
    expect(result.slots[0]?.forceId).toBe(world.forceIds[0]);
    expect(result.slots[1]?.forceId).toBe(world.forceIds[1]);
    expect(result.slots[0]?.ownerParticipantId).toBe(
      playerSlotPlaceholderId(1),
    );
    expect(result.slots[1]?.ownerParticipantId).toBe(
      playerSlotPlaceholderId(2),
    );
  });

  it('flattens both slots into the player side in slot order, pilots intact', async () => {
    const world = await buildWorld();

    const result = materialize(world);
    if (result.kind !== 'materialized') throw new Error('expected slots');

    expect(ownedPlayerForceUnits(result.slots)).toEqual([
      { unitRef: 'catalog-ref-0', pilotRef: 'pilot-0' },
      { unitRef: 'catalog-ref-1', pilotRef: 'pilot-1' },
    ]);
  });

  it('refuses a stale revision with the current head and a recovery action', async () => {
    const world = await buildWorld();

    const result = materialize(world, {
      expectedHead: {
        branchId: world.branchId,
        revision: world.revision - 1,
        effectiveGeneration: world.generation,
      },
    });

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.code).toBe('STALE_REVISION');
    expect(result.activeHead.revision).toBe(world.revision);
    expect(result.activeHead.branchId).toBe(world.branchId);
    expect(result.resyncAction).toBe('resync-to-active-head');
  });

  it('refuses a branch the stream never had', async () => {
    const world = await buildWorld();

    const result = materialize(world, {
      expectedHead: {
        branchId: 'branch-from-another-world',
        revision: world.revision,
        effectiveGeneration: world.generation,
      },
    });

    expect(result).toMatchObject({ kind: 'refused', code: 'STALE_BRANCH' });
  });

  it('refuses when a slot force is held by another participant for this mission', async () => {
    const world = await buildWorld();
    claimCampaignSessionForce({
      campaignId: world.campaign.id,
      sessionId: SESSION_ID,
      missionId: MISSION_ID,
      forceId: world.forceIds[0] ?? '',
      participantId: 'pid_other_player',
      claimedAt: NOW,
    });

    const result = materialize(world);

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.code).toBe('STALE_OWNERSHIP');
    expect(result.reason).toContain('pid_other_player');
    // The head still comes back so the client can resync rather than retry.
    expect(result.activeHead.branchId).toBe(world.branchId);
  });

  it('lets a per-mission claim by the slot override its creation claim', async () => {
    const world = await buildWorld();
    // Slot 1 takes the spare force for this mission only. The spare is
    // unclaimed, so this exercises the override and nothing else.
    claimCampaignSessionForce({
      campaignId: world.campaign.id,
      sessionId: SESSION_ID,
      missionId: MISSION_ID,
      forceId: world.forceIds[2] ?? '',
      participantId: playerSlotPlaceholderId(1),
      claimedAt: NOW,
    });

    const result = materialize(world);

    if (result.kind !== 'materialized') throw new Error('expected slots');
    expect(result.slots[0]?.forceId).toBe(world.forceIds[2]);
    // Slot 2's creation claim is untouched by slot 1's per-mission move.
    expect(result.slots[1]?.forceId).toBe(world.forceIds[1]);
  });

  it('refuses when one slot claims the other slot force for the mission', async () => {
    const world = await buildWorld();
    // Slot 1 grabs slot 2's creation force. This is NOT an override -
    // two tactical slots cannot field the same force, and materializing
    // it would silently take slot 2 out of its own mission.
    claimCampaignSessionForce({
      campaignId: world.campaign.id,
      sessionId: SESSION_ID,
      missionId: MISSION_ID,
      forceId: world.forceIds[1] ?? '',
      participantId: playerSlotPlaceholderId(1),
      claimedAt: NOW,
    });

    const result = materialize(world);

    expect(result.kind).toBe('refused');
    if (result.kind !== 'refused') return;
    expect(result.code).toBe('STALE_OWNERSHIP');
    expect(result.reason).toContain(playerSlotPlaceholderId(1));
  });

  it('refuses when a tactical slot owns no force at all', async () => {
    const world = await buildWorld();
    const db = getSQLiteService().getDatabase();
    db.prepare(
      `DELETE FROM campaign_session_force_claim
        WHERE participant_id = ?`,
    ).run(playerSlotPlaceholderId(2));

    const result = materialize(world);

    expect(result).toMatchObject({ kind: 'refused', code: 'UNOWNED_SLOT' });
  });

  it('refuses a force naming a unit the campaign record cannot resolve', async () => {
    const world = await buildWorld();
    // Re-save with slot 2's unit missing from the roster projection.
    const roster = rosterFor(world.campaign);
    const resaved = saveCampaign(
      buildSerializedCampaign(world.campaign, 'device-1', 1, {
        ...roster,
        units: roster.units.slice(0, 1),
      }),
      1,
    );
    expect(resaved.kind).toBe('ok');

    const result = materialize(world);

    expect(result).toMatchObject({
      kind: 'refused',
      code: 'UNRESOLVED_SLOT_UNIT',
    });
  });

  it('refuses a custom design the vault cannot resolve rather than substituting', async () => {
    const world = await buildWorld();
    const roster = rosterFor(world.campaign);
    const resaved = saveCampaign(
      buildSerializedCampaign(world.campaign, 'device-1', 1, {
        ...roster,
        units: roster.units.map((unit, index) =>
          index === 0
            ? {
                ...unit,
                unitSource: 'custom' as const,
                unitRef: 'custom-never-saved',
              }
            : unit,
        ),
      }),
      1,
    );
    expect(resaved.kind).toBe('ok');

    const result = materialize(world);

    expect(result).toMatchObject({
      kind: 'refused',
      code: 'UNRESOLVED_SLOT_UNIT',
    });
  });
});

type SignedContext = Extract<OwnedMissionContext, { kind: 'signed' }>;

function signedContext(world: IWorld, count = 2): SignedContext {
  const identities = ['pid-z-host', 'pid-a-guest', 'pid-m-third'];
  const records = world.forceIds.slice(0, count).map((forceId, index) => {
    const force = world.campaign.forces.get(forceId);
    const playerId = identities[index];
    if (!force || !playerId)
      throw new Error('Missing signed fixture contributor');
    expect(
      bindCampaignSessionParticipant({
        campaignId: world.campaign.id,
        sessionId: SESSION_ID,
        participantId: playerId,
        seat: index === 0 ? 'gm' : 'player',
        boundAt: NOW,
      }).kind,
    ).toBe('bound');
    expect(
      claimCampaignSessionForce({
        campaignId: world.campaign.id,
        sessionId: SESSION_ID,
        missionId: MISSION_ID,
        forceId,
        participantId: playerId,
        claimedAt: NOW,
      }).kind,
    ).toBe('claimed');
    return {
      matchId: SESSION_ID,
      missionId: MISSION_ID,
      playerId,
      role: index === 0 ? ('host' as const) : ('guest' as const),
      choice: 'deploy' as const,
      force,
    };
  });
  return {
    kind: 'signed',
    records,
    claims: listCampaignSessionForceClaims(
      world.campaign.id,
      SESSION_ID,
    ).filter((claim) => claim.missionId === MISSION_ID),
    members: listActiveCampaignSessionParticipants(
      world.campaign.id,
      SESSION_ID,
    ),
    state: authoritativeStateFromSerializedCampaign(world.envelope),
  };
}

function materializeSigned(world: IWorld, context: OwnedMissionContext) {
  return materializeOwnedPlayerForces(
    { ...ports(), readMissionContext: () => context },
    {
      campaignId: world.campaign.id,
      sessionId: SESSION_ID,
      missionId: MISSION_ID,
      currentRevision: world.revision,
      materializedAt: NOW,
      expectedHead: {
        branchId: world.branchId,
        revision: world.revision,
        effectiveGeneration: world.generation,
      },
    },
  );
}

describe('signed mission ownership projection', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'signed-owned-force-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'owned.db') }).initialize();
  });
  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true });
  });

  it('orders signed owners, retaining exact adopted references and pilot assignments', async () => {
    const world = await buildWorld();
    const context = signedContext(world);

    const result = materializeSigned(world, context);

    if (result.kind !== 'materialized') throw new Error(result.code);
    expect(
      result.slots.map((slot) => ({
        slot: slot.slot,
        owner: slot.ownerParticipantId,
        refs: slot.units.map((unit) => [unit.reference.unitRef, unit.pilotRef]),
      })),
    ).toEqual([
      { slot: 1, owner: 'pid-a-guest', refs: [['catalog-ref-1', 'pilot-1']] },
      { slot: 2, owner: 'pid-z-host', refs: [['catalog-ref-0', 'pilot-0']] },
    ]);
    expect(ownedPlayerForceUnits(result.slots)).toEqual([
      { unitRef: 'catalog-ref-1', pilotRef: 'pilot-1' },
      { unitRef: 'catalog-ref-0', pilotRef: 'pilot-0' },
    ]);
  });

  it('does not resolve or field HQ units, even when their source cannot resolve', async () => {
    const world = await buildWorld();
    const context = signedContext(world);
    const records = context.records.map((record) => ({
      ...record,
      choice: record.role === 'host' ? ('command-hq' as const) : record.choice,
    }));
    const roster = rosterFor(world.campaign);
    expect(
      saveCampaign(
        buildSerializedCampaign(world.campaign, 'device-1', 1, {
          ...roster,
          units: roster.units.slice(1),
        }),
        1,
      ).kind,
    ).toBe('ok');

    const result = materializeSigned(world, { ...context, records });

    if (result.kind !== 'materialized') throw new Error(result.code);
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0]).toMatchObject({
      slot: 1,
      ownerParticipantId: 'pid-a-guest',
    });
  });

  it('refuses an all-HQ mission without promoting a contributor', async () => {
    const world = await buildWorld();
    const context = signedContext(world);

    const result = materializeSigned(world, {
      ...context,
      records: context.records.map((record) => ({
        ...record,
        choice: 'command-hq',
      })),
    });

    expect(result).toMatchObject({ kind: 'refused', code: 'UNOWNED_SLOT' });
  });

  it('refuses three deploying contributors instead of silently dropping one', async () => {
    const world = await buildWorld();
    const context = signedContext(world, 3);

    const result = materializeSigned(world, context);

    expect(result).toMatchObject({ kind: 'refused', code: 'STALE_OWNERSHIP' });
  });

  const invalidContexts: readonly {
    name: string;
    change: (context: SignedContext) => SignedContext;
    code: string;
  }[] = [
    {
      name: 'missing accepted participation',
      change: (context) => ({ ...context, records: [] }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'missing durable claim',
      change: (context) => ({ ...context, claims: context.claims.slice(1) }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'extra claim',
      change: (context) => ({
        ...context,
        claims: [
          ...context.claims,
          {
            missionId: MISSION_ID,
            forceId: 'extra',
            participantId: 'pid-other',
          },
        ],
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'foreign mission claim',
      change: (context) => ({
        ...context,
        claims: context.claims.map((claim) => ({
          ...claim,
          missionId: 'foreign',
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'foreign campaign',
      change: (context) => ({
        ...context,
        state: { ...context.state, campaignId: 'foreign' },
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'foreign accepted session',
      change: (context) => ({
        ...context,
        records: context.records.map((record) => ({
          ...record,
          matchId: 'foreign',
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'foreign accepted mission',
      change: (context) => ({
        ...context,
        records: context.records.map((record) => ({
          ...record,
          missionId: 'foreign',
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'nonmember contributor',
      change: (context) => ({ ...context, members: context.members.slice(1) }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'revoked contributor',
      change: (context) => ({
        ...context,
        members: context.members.map((member) => ({
          ...member,
          revokedAt: NOW,
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'foreign member binding',
      change: (context) => ({
        ...context,
        members: context.members.map((member) => ({
          ...member,
          sessionId: 'foreign',
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'conflicting claim owner',
      change: (context) => ({
        ...context,
        claims: context.claims.map((claim) => ({
          ...claim,
          participantId: 'pid-other',
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'duplicate contributor',
      change: (context) => ({
        ...context,
        records: context.records.map((record) => ({
          ...record,
          playerId: 'pid-z-host',
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'unknown force',
      change: (context) => ({
        ...context,
        records: context.records.map((record) => ({
          ...record,
          force: { ...record.force, id: 'unknown' },
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'duplicate contributed unit',
      change: (context) => ({
        ...context,
        records: context.records.map((record) => ({
          ...record,
          force: {
            ...record.force,
            unitIds: [...record.force.unitIds, ...record.force.unitIds],
          },
        })),
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'changed force membership',
      change: (context) => ({
        ...context,
        state: { ...context.state, forceUnits: {} },
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'unrepresented active player',
      change: (context) => ({
        ...context,
        members: [
          ...context.members,
          {
            campaignId: context.state.campaignId,
            sessionId: SESSION_ID,
            participantId: 'pid-new',
            seat: 'player',
            boundAt: NOW,
            revokedAt: null,
          },
        ],
      }),
      code: 'STALE_OWNERSHIP',
    },
    {
      name: 'missing current unit',
      change: (context) => ({
        ...context,
        state: { ...context.state, rosterUnits: {} },
      }),
      code: 'UNRESOLVED_SLOT_UNIT',
    },
    {
      name: 'destroyed current units',
      change: (context) => ({
        ...context,
        state: {
          ...context.state,
          rosterUnits: Object.fromEntries(
            Object.entries(context.state.rosterUnits).map(([id, unit]) => [
              id,
              { ...unit, status: 'destroyed' },
            ]),
          ),
        },
      }),
      code: 'UNRESOLVED_SLOT_UNIT',
    },
    {
      name: 'changed source identity',
      change: (context) => ({
        ...context,
        state: {
          ...context.state,
          rosterUnits: Object.fromEntries(
            Object.entries(context.state.rosterUnits).map(([id, unit]) => [
              id,
              { ...unit, unitSource: 'custom' },
            ]),
          ),
        },
      }),
      code: 'UNRESOLVED_SLOT_UNIT',
    },
    {
      name: 'changed pinned source version',
      change: (context) => ({
        ...context,
        state: {
          ...context.state,
          rosterUnits: Object.fromEntries(
            Object.entries(context.state.rosterUnits).map(([id, unit]) => [
              id,
              { ...unit, sourceVersion: 99 },
            ]),
          ),
        },
      }),
      code: 'UNRESOLVED_SLOT_UNIT',
    },
  ];
  it.each(invalidContexts)(
    'refuses $name in a server-bound context',
    async ({ change, code }) => {
      const world = await buildWorld();
      const context = change(signedContext(world));
      const db = getSQLiteService().getDatabase();
      const before = db.prepare('SELECT total_changes() AS n').get();

      const result = materializeSigned(world, context);

      expect(result).toMatchObject({ kind: 'refused', code });
      expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(before);
    },
  );

  it('never falls back to creation slots when signed context is unavailable', async () => {
    const world = await buildWorld();

    const result = materializeSigned(world, { kind: 'unavailable' });

    expect(result).toMatchObject({ kind: 'refused', code: 'STALE_OWNERSHIP' });
  });

  it('retains the legacy slot path when the server explicitly finds no signed context', async () => {
    const world = await buildWorld();

    const result = materializeSigned(world, { kind: 'legacy' });

    expect(result).toEqual(materialize(world));
  });
});
