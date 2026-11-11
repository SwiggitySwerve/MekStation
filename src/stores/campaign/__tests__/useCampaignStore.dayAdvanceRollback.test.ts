/**
 * K13 PR2: a day that is not saved is rolled back, and a day that is saved is
 * exactly what it was before rollback existed.
 *
 * The day pipeline commits to stores as it runs (the roster's pilots, the
 * pilot vault's awards) and the store tail then writes the campaign, the
 * battle ledgers, the missions store and the activity log before it saves.
 * A save the host refuses, or a throw in that tail, used to leave all of it
 * in place, so a retry applied the day's patches a second time.
 *
 * The day itself is stubbed with processors that write the same stores the
 * built-in ones do, so the expectations below pin the store tail rather than
 * whatever the built-in processors currently compute.
 */

import type { IMission } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IPilot } from '@/types/pilot';

import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  DayPhase,
  getDayPipeline,
  _resetDayPipeline,
  type IDayProcessor,
} from '@/lib/campaign/dayPipeline';
import {
  registerBuiltinProcessors,
  _resetBuiltinRegistration,
} from '@/lib/campaign/processors';
import {
  installCampaignPersistenceWiring,
  uninstallCampaignPersistenceWiring,
} from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createHostCoopSession } from '@/types/campaign/CoopSession';
import { MissionStatus } from '@/types/campaign/enums';
import {
  CombatEndReason,
  COMBAT_OUTCOME_VERSION,
  type ICombatOutcome,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

jest.mock('@/components/shared/Toast', () => ({ toast: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toast } = require('@/components/shared/Toast') as {
  toast: jest.Mock;
};

const MATCH_ID = 'match-k13-rollback';
const DAY_MS = 24 * 60 * 60 * 1000;
const PILOT_ID = 'p1';
const VAULT_ID = 'v1';

// =============================================================================
// Stub server
// =============================================================================

interface IFakeServer {
  record: SerializedCampaign | null;
  /** 'fail' refuses every PUT; 'gate' holds PUTs until released, then refuses. */
  putMode: 'ok' | 'fail' | 'gate' | 'respond';
  /** What 'respond' answers every PUT with; 'network' makes fetch reject. */
  putResponse: { status: number; body: unknown } | 'network' | null;
  /** PUTs currently held by the gate. */
  heldPuts: number;
  releaseGate: () => void;
}

/** Resolves once the gate is holding a PUT, so a test can act mid-save. */
async function untilPutHeld(server: IFakeServer): Promise<void> {
  while (server.heldPuts === 0) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function stubServer(server: IFakeServer): void {
  let gate: Promise<void> = Promise.resolve();
  server.releaseGate = () => undefined;
  global.fetch = jest.fn(
    async (_url: unknown, init?: { method?: string; body?: string }) => {
      if (init?.method === 'PUT') {
        if (server.putMode === 'gate') {
          gate = new Promise<void>((resolve) => {
            server.releaseGate = resolve;
          });
          server.heldPuts += 1;
          await gate;
          server.heldPuts -= 1;
          return jsonResponse(500, { error: 'refused' });
        }
        if (server.putMode === 'fail') {
          return jsonResponse(500, { error: 'refused' });
        }
        if (server.putMode === 'respond' && server.putResponse) {
          if (server.putResponse === 'network') {
            throw new TypeError('network down');
          }
          return jsonResponse(
            server.putResponse.status,
            server.putResponse.body,
          );
        }
        const body = JSON.parse(init.body ?? '{}') as {
          envelope: SerializedCampaign;
          baseVersion: number;
        };
        const current = server.record?.version ?? 0;
        if (body.baseVersion !== current) {
          return jsonResponse(409, {
            kind: 'conflict',
            current: server.record,
          });
        }
        server.record = { ...body.envelope, version: current + 1 };
        return jsonResponse(200, server.record);
      }
      return server.record
        ? jsonResponse(200, server.record)
        : jsonResponse(404, {});
    },
  ) as unknown as typeof fetch;
}

// =============================================================================
// World
// =============================================================================

const pilotEntry = (): ICampaignRosterEntry =>
  ({
    pilotId: PILOT_ID,
    pilotName: 'Ace',
    status: 'Active',
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date('3025-01-01T00:00:00.000Z'),
  }) as unknown as ICampaignRosterEntry;

const vaultPilot = (): IPilot =>
  ({ id: VAULT_ID, name: 'Ace', awards: [] }) as unknown as IPilot;

const outcome = (matchId: string): ICombatOutcome => ({
  version: COMBAT_OUTCOME_VERSION,
  matchId,
  contractId: 'contract-k13',
  scenarioId: null,
  endReason: CombatEndReason.Destruction,
  report: {
    version: 1,
    matchId,
    winner: GameSide.Player,
    reason: 'destruction',
    turnCount: 1,
    units: [],
    mvpUnitId: null,
    log: [],
  },
  unitDeltas: [],
  capturedAt: '3025-06-15T12:00:00Z',
});

const newMission = (): IMission => ({
  id: 'mission-new',
  name: 'New Mission',
  status: MissionStatus.PENDING,
  type: 'mission',
  systemId: 'Unknown System',
  scenarioIds: [],
  createdAt: '3025-01-01T00:00:00.000Z',
  updatedAt: '3025-01-01T00:00:00.000Z',
});

function patchPilot(patch: Partial<ICampaignRosterEntry>): void {
  const roster = useCampaignRosterStore.getState();
  roster.applyPilotPatches(new Map([[PILOT_ID, patch]]));
}

const currentPilot = (): ICampaignRosterEntry =>
  useCampaignRosterStore
    .getState()
    .pilots.find((p) => p.pilotId === PILOT_ID) as ICampaignRosterEntry;

/** The day, as processors that write the stores the real ones write. */
const STUB_PROCESSORS: readonly IDayProcessor[] = [
  {
    id: 'k13-roster',
    phase: DayPhase.PERSONNEL,
    displayName: 'K13 roster',
    process(campaign) {
      patchPilot({ xp: currentPilot().xp + 10 });
      return {
        campaign,
        events: [
          {
            type: 'healing',
            description: 'healed',
            severity: 'info',
            data: { personId: PILOT_ID, personName: 'Ace' },
          },
        ],
      };
    },
  },
  {
    // Appends unconditionally, as the real award writer does for a grant.
    id: 'k13-vault',
    phase: DayPhase.PERSONNEL,
    displayName: 'K13 vault',
    process(campaign) {
      usePilotStore.setState((state) => ({
        pilots: state.pilots.map((p) => ({
          ...p,
          awards: [...(p.awards ?? []), { awardId: 'award-1' }],
        })) as typeof state.pilots,
      }));
      return { campaign, events: [] };
    },
  },
  {
    id: 'k13-outcome',
    phase: DayPhase.MISSIONS - 50,
    displayName: 'K13 outcome',
    process(campaign) {
      const c = campaign as typeof campaign & {
        pendingBattleOutcomes?: ICombatOutcome[];
        processedBattleIds?: string[];
        recentlyAppliedOutcomes?: ICombatOutcome[];
      };
      const pending = c.pendingBattleOutcomes ?? [];
      const target = pending.find((o) => o.matchId === 'm-1');
      const events = [];
      let next = campaign;
      if (target) {
        patchPilot({ campaignMissions: currentPilot().campaignMissions + 1 });
        events.push({
          type: 'post_battle_applied',
          description: 'applied',
          severity: 'info' as const,
          data: { matchId: 'm-1' },
        });
        next = {
          ...c,
          pendingBattleOutcomes: pending.filter((o) => o.matchId !== 'm-1'),
          processedBattleIds: [...(c.processedBattleIds ?? []), 'm-1'],
          recentlyAppliedOutcomes: [target],
        } as typeof campaign;
      }
      if (pending.some((o) => o.matchId === 'm-bad')) {
        events.push({
          type: 'post_battle_apply_failed',
          description: 'failed',
          severity: 'warning' as const,
          data: { matchId: 'm-bad', error: 'boom' },
        });
      }
      return { campaign: next, events };
    },
  },
  {
    id: 'k13-mission',
    phase: DayPhase.MISSIONS,
    displayName: 'K13 mission',
    process(campaign) {
      const missions = new Map(campaign.missions);
      missions.set('mission-new', newMission());
      return { campaign: { ...campaign, missions }, events: [] };
    },
  },
];

function installStubProcessors(extra: readonly IDayProcessor[] = []): void {
  registerBuiltinProcessors();
  const pipeline = getDayPipeline();
  pipeline.getProcessors().forEach((p) => pipeline.unregister(p.id));
  [...STUB_PROCESSORS, ...extra].forEach(pipeline.register);
}

function resetWorld(): void {
  jest.useRealTimers();
  jest.restoreAllMocks();
  uninstallCampaignPersistenceWiring();
  resetCampaignStore();
  useCampaignPersistenceStore.getState().reset();
  _resetCampaignSyncTransportsForTest();
  _resetDayPipeline();
  _resetBuiltinRegistration();
  useCampaignRosterStore.setState({ campaignId: null, units: [], pilots: [] });
  usePilotStore.setState({ pilots: [] });
  clientSafeStorage.removeItem('campaign-store');
  toast.mockClear();
}

const toastMessages = (): string[] =>
  toast.mock.calls.map((call) => (call[0] as { message: string }).message);

interface IWorld {
  readonly store: ReturnType<typeof getCampaignStore>;
  readonly server: IFakeServer;
  readonly id: string;
}

/**
 * A saved campaign with one rostered pilot, one vault pilot and two queued
 * outcomes ('m-1' applies, 'm-bad' fails to apply). `coop` makes it a host
 * campaign, whose save goes to the stubbed server.
 */
async function buildWorld(
  coop: boolean,
  extra: readonly IDayProcessor[] = [],
): Promise<IWorld> {
  const store = getCampaignStore();
  store
    .getState()
    .createCampaign(
      'K13 Rollback Co.',
      'mercenary',
      undefined,
      coop
        ? { coopSession: createHostCoopSession('ROOM13', MATCH_ID) }
        : undefined,
    );
  const id = store.getState().campaign!.id;
  useCampaignRosterStore.getState().initRoster(id);
  useCampaignRosterStore.getState().addPilot(pilotEntry());
  usePilotStore.setState({ pilots: [vaultPilot()] });
  store.setState({
    pendingBattleOutcomes: [outcome('m-1'), outcome('m-bad')],
  });
  const server: IFakeServer = {
    record: null,
    putMode: 'ok',
    putResponse: null,
    heldPuts: 0,
    releaseGate: () => undefined,
  };
  stubServer(server);
  installCampaignPersistenceWiring();
  if (coop) {
    useCampaignPersistenceStore.getState().markDirty();
    await useCampaignPersistenceStore.getState().saveCampaign();
  }
  await store.getState().saveCampaign();
  installStubProcessors(extra);
  toast.mockClear();
  return { store, server, id };
}

/** Every place the day writes, read as references so identity is checkable. */
function observe(world: IWorld) {
  const state = world.store.getState();
  return {
    campaign: state.campaign,
    pending: state.pendingBattleOutcomes,
    processed: state.processedBattleIds,
    reviewed: state.reviewedBattleIds,
    errors: state.outcomeApplyErrors,
    activityLog: state.activityLog,
    pilots: useCampaignRosterStore.getState().pilots,
    vault: usePilotStore.getState().pilots,
    missions: state.missionsStore?.getState().missions,
    cache: clientSafeStorage.getItem(`campaign-${world.id}`),
  };
}

// =============================================================================
// R5: the saved day is what it was before rollback existed
// =============================================================================

describe('K13 saved day (success path unchanged)', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  async function runSuccess(coop: boolean) {
    const world = await buildWorld(coop);
    const before = observe(world);
    const report = await world.store.getState().advanceDay();
    return { world, before, report };
  }

  it.each([
    ['single-player', false],
    ['co-op host with a saved record', true],
  ])(
    '(R5) %s: every store ends where the old tail left it',
    async (_n, coop) => {
      const { world, before, report } = await runSuccess(coop);
      const state = world.store.getState();

      expect(report).not.toBeNull();
      expect(state.campaign!.currentDate.getTime()).toBe(
        before.campaign!.currentDate.getTime() + DAY_MS,
      );
      expect(report!.date.getTime()).toBe(
        before.campaign!.currentDate.getTime(),
      );
      expect(currentPilot().xp).toBe(10);
      expect(currentPilot().campaignMissions).toBe(1);
      expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
      expect(state.pendingBattleOutcomes.map((o) => o.matchId)).toEqual([
        'm-bad',
      ]);
      expect(state.processedBattleIds).toEqual(['m-1']);
      expect(state.outcomeApplyErrors).toEqual({ 'm-bad': 'boom' });
      expect(
        state.missionsStore
          ?.getState()
          .getAllMissions()
          .map((m) => m.id),
      ).toEqual(['mission-new']);
      expect([...state.campaign!.missions.keys()]).toEqual(['mission-new']);
      expect(state.activityLog.map((e) => e.id)).toEqual([
        expect.stringMatching(/^act-medical-p1-/),
      ]);
      expect(state.dayAdvanceInFlight).toBe(false);
      // The outcome error toast appears once the day is saved; a co-op host
      // with no live transport then warns that guests may need to refetch.
      expect(toastMessages()).toEqual(
        coop
          ? [
              'Battle m-bad: boom',
              'Co-op day advance was saved but the live host connection is unavailable. Guests may need to refetch.',
            ]
          : ['Battle m-bad: boom'],
      );
      // The cache record is the saved campaign, advanced.
      const cached = JSON.parse(
        clientSafeStorage.getItem(`campaign-${world.id}`) as string,
      ) as { state: { currentDate: string; processedBattleIds: string[] } };
      expect(cached.state.currentDate).toBe(
        state.campaign!.currentDate.toISOString(),
      );
      expect(cached.state.processedBattleIds).toEqual(['m-1']);
      if (coop) {
        expect(world.server.record?.version).toBe(3);
      }
    },
  );
});

// =============================================================================
// R1-R3, R7: a day that is not saved is undone
// =============================================================================

describe('K13 rollback of an unsaved day', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(R1) a refused co-op save restores every store and the cache, and a retry applies the day once', async () => {
    const world = await buildWorld(true);
    const before = observe(world);
    world.server.putMode = 'fail';

    const report = await world.store.getState().advanceDay();

    expect(report).toBeNull();
    const after = observe(world);
    // The persistence layer puts its own copy of the campaign back after a
    // refused co-op save (and a fresh missions store with it), merging the
    // day's ledgers into that copy; the rollback puts the ledgers right in
    // the store and in that copy, and the roster, vault and log it left.
    const live = after.campaign as typeof after.campaign & {
      pendingBattleOutcomes: ICombatOutcome[];
      processedBattleIds: string[];
    };
    expect(live!.currentDate.getTime()).toBe(
      before.campaign!.currentDate.getTime(),
    );
    expect(live.processedBattleIds).toEqual([]);
    expect(live.pendingBattleOutcomes.map((o) => o.matchId)).toEqual([
      'm-1',
      'm-bad',
    ]);
    expect(after.pending).toBe(before.pending);
    expect(after.processed).toBe(before.processed);
    expect(after.reviewed).toEqual(before.reviewed);
    expect(after.errors).toBe(before.errors);
    expect(after.activityLog).toBe(before.activityLog);
    expect(after.pilots).toBe(before.pilots);
    expect(after.vault).toBe(before.vault);
    expect([...(after.missions?.keys() ?? [])]).toEqual([]);
    const cached = JSON.parse(after.cache as string) as {
      state: { currentDate: string; processedBattleIds: string[] };
    };
    expect(cached.state.currentDate).toBe(
      before.campaign!.currentDate.toISOString(),
    );
    expect(cached.state.processedBattleIds).toEqual([]);
    expect(world.store.getState().dayAdvanceInFlight).toBe(false);
    expect(toastMessages().join('\n')).toMatch(/not saved/i);
    expect(toastMessages().join('\n')).not.toMatch(/Battle m-bad/);

    world.server.putMode = 'ok';
    const retry = await world.store.getState().advanceDay();

    expect(retry).not.toBeNull();
    expect(currentPilot().xp).toBe(10);
    expect(currentPilot().campaignMissions).toBe(1);
    expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
    expect(world.store.getState().processedBattleIds).toEqual(['m-1']);
    expect(world.store.getState().campaign!.currentDate.getTime()).toBe(
      before.campaign!.currentDate.getTime() + DAY_MS,
    );
  });

  it('(R2) a throw in the store tail restores the same stores, returns null and does not throw', async () => {
    const world = await buildWorld(false);
    const before = observe(world);
    const append = world.store.getState().appendActivityLogEntry;
    world.store.setState({
      appendActivityLogEntry: () => {
        throw new Error('log write exploded');
      },
    });

    let report: unknown;
    expect(() => {
      report = world.store.getState().advanceDay();
    }).not.toThrow();

    expect(report).toBeNull();
    const after = observe(world);
    expect(after.campaign).toBe(before.campaign);
    expect(after.pending).toBe(before.pending);
    expect(after.processed).toBe(before.processed);
    expect(after.pilots).toBe(before.pilots);
    expect(after.vault).toBe(before.vault);
    expect([...(after.missions?.keys() ?? [])]).toEqual([]);
    expect(after.cache).toBe(before.cache);
    expect(world.store.getState().dayAdvanceInFlight).toBe(false);
    expect(toastMessages().join('\n')).toMatch(/log write exploded/);

    world.store.setState({ appendActivityLogEntry: append });
    expect(world.store.getState().advanceDay()).not.toBeNull();
    expect(currentPilot().xp).toBe(10);
    expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
  });

  it('(R3) an outcome applied in a failed day is queued again and applied once on the retry', async () => {
    const world = await buildWorld(true);
    world.server.putMode = 'fail';
    await world.store.getState().advanceDay();

    expect(
      world.store.getState().pendingBattleOutcomes.map((o) => o.matchId),
    ).toEqual(['m-1', 'm-bad']);
    expect(world.store.getState().processedBattleIds).toEqual([]);
    expect(currentPilot().campaignMissions).toBe(0);

    world.server.putMode = 'ok';
    await world.store.getState().advanceDay();

    expect(world.store.getState().processedBattleIds).toEqual(['m-1']);
    expect(currentPilot().campaignMissions).toBe(1);
    expect(
      toastMessages().filter((m) => m === 'Battle m-bad: boom'),
    ).toHaveLength(1);
  });

  it('(R7) awards written to the vault by a failed day are taken back, so the retry grants them once', async () => {
    const world = await buildWorld(true);
    world.server.putMode = 'fail';
    await world.store.getState().advanceDay();
    expect(usePilotStore.getState().pilots[0].awards).toHaveLength(0);

    world.server.putMode = 'ok';
    await world.store.getState().advanceDay();
    expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
  });

  it('(R7b) a vault entry replaced meanwhile (its own award save, an edit) gets its awards taken back and keeps the edit', async () => {
    const world = await buildWorld(true);
    world.server.putMode = 'gate';
    const pending = world.store.getState().advanceDay();
    await untilPutHeld(world.server);
    usePilotStore.setState((state) => ({
      pilots: state.pilots.map((p) => ({ ...p, name: 'Renamed' })),
    }));
    world.server.releaseGate();

    expect(await pending).toBeNull();
    expect(usePilotStore.getState().pilots[0].awards).toHaveLength(0);
    expect(usePilotStore.getState().pilots[0].name).toBe('Renamed');
  });

  it('(R8) a processor that throws inside the pipeline is still skipped, with no rollback', async () => {
    const throwing: IDayProcessor = {
      id: 'k13-throws',
      phase: DayPhase.EVENTS,
      displayName: 'K13 throws',
      process() {
        throw new Error('processor exploded');
      },
    };
    const world = await buildWorld(false, [throwing]);

    const report = world.store.getState().advanceDay();

    expect(report).not.toBeNull();
    expect(currentPilot().xp).toBe(10);
    expect(world.store.getState().processedBattleIds).toEqual(['m-1']);
    expect(toastMessages().join('\n')).not.toMatch(/not saved/i);
  });
});

// =============================================================================
// Which refusals roll back
//
// The persistence layer already draws this line for a co-op save: a TYPED
// live-write refusal (401/403 `kind: 'refused'` with a code - no credential
// the server accepts) is "NOT a conflict: nothing was newer on the server ...
// and the unsaved changes stay" (ICampaignSaveRefusal, runSave); everything
// else it rolls back itself ("Your local change was rolled back"). The day
// follows the same line, so the roster and ledgers never disagree with the
// campaign the persistence layer left in the store.
// =============================================================================

const typedRefusal = (
  status: 401 | 403,
  code: string,
  reason: string,
): { status: number; body: unknown } => ({
  status,
  body: { error: 'refused', kind: 'refused', code, reason, matchId: MATCH_ID },
});

describe('K13 a recoverable refusal keeps the day', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it.each([
    [
      'no host token (401)',
      typedRefusal(401, 'HOST_SESSION_REQUIRED', 'malformed'),
    ],
    [
      'an expired host token (401)',
      typedRefusal(401, 'HOST_SESSION_EXPIRED', 'expired'),
    ],
    [
      'a changed live session (403)',
      typedRefusal(403, 'HOST_SESSION_REQUIRED', 'live-session-changed'),
    ],
  ])(
    '(R10) %s: the day stays, stays pending, and saving after renewal persists it once',
    async (_name, refusal) => {
      const world = await buildWorld(true);
      const before = observe(world);
      world.server.putMode = 'respond';
      world.server.putResponse = refusal;

      const report = await world.store.getState().advanceDay();

      // Not committed, so no report; but nothing was undone.
      expect(report).toBeNull();
      const day = before.campaign!.currentDate.getTime() + DAY_MS;
      expect(world.store.getState().campaign!.currentDate.getTime()).toBe(day);
      expect(currentPilot().xp).toBe(10);
      expect(currentPilot().campaignMissions).toBe(1);
      expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
      expect(world.store.getState().processedBattleIds).toEqual(['m-1']);
      expect(
        world.store.getState().pendingBattleOutcomes.map((o) => o.matchId),
      ).toEqual(['m-bad']);
      expect([
        ...(world.store.getState().missionsStore?.getState().missions.keys() ??
          []),
      ]).toEqual(['mission-new']);
      expect(world.store.getState().activityLog).not.toBe(before.activityLog);
      expect(world.store.getState().dayAdvanceInFlight).toBe(false);
      const persistence = useCampaignPersistenceStore.getState();
      expect(persistence.saveState).toBe('error');
      expect(persistence.saveRefusal?.code).toBe(
        (refusal.body as { code: string }).code,
      );
      // The day's outcome error is announced; nothing says it was undone.
      expect(toastMessages()).toContain('Battle m-bad: boom');
      expect(toastMessages().join('\n')).not.toMatch(/not saved|restored/i);
      expect(world.server.record?.version).toBe(2);

      // The token is renewed; the save persists the day, applied once.
      world.server.putMode = 'ok';
      const saved = await useCampaignPersistenceStore.getState().saveCampaign();

      expect(saved.status).toBe('saved');
      expect(world.server.record?.body.currentDate).toBe(
        new Date(day).toISOString(),
      );
      expect(currentPilot().xp).toBe(10);
      expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
      expect(world.store.getState().processedBattleIds).toEqual(['m-1']);
    },
  );

  it('(R10b) a jump refused for want of a token is kept pending too', async () => {
    const world = await buildWorld(true);
    const destination = [
      'terra',
      'tharkad',
      'luthien',
      'new-avalon',
      'sian',
      'atreus',
      'outreach',
      'galatea',
      'hesperus-ii',
    ].find((systemId) => {
      const preview = world.store.getState().previewTravelToSystem(systemId);
      return preview?.status === 'ready' && preview.afterCampaign;
    });
    expect(destination).toBeDefined();
    const before = observe(world);
    world.server.putMode = 'respond';
    world.server.putResponse = typedRefusal(
      401,
      'HOST_SESSION_REQUIRED',
      'malformed',
    );

    expect(await world.store.getState().travelToSystem(destination!)).toBe(
      false,
    );

    expect(
      world.store.getState().campaign!.currentDate.getTime(),
    ).toBeGreaterThan(before.campaign!.currentDate.getTime());
    expect(world.store.getState().activityLog).not.toBe(before.activityLog);
    expect(toastMessages().join('\n')).not.toMatch(/not saved|restored/i);
  });
});

describe('K13 an authoritative rejection rolls the day back', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  const conflictBody = (reason: string, record: unknown) => ({
    kind: 'conflict',
    reason,
    recoveryAction: 'resync',
    conflictingFields: [],
    currentVersion: 1,
    current: record,
  });

  const rejections: ReadonlyArray<
    readonly [
      string,
      (world: IWorld) => { status: number; body: unknown } | 'network',
    ]
  > = [
    [
      'a stale write (409 base-state-unavailable)',
      (world) => ({
        status: 409,
        body: conflictBody('base-state-unavailable', world.server.record),
      }),
    ],
    [
      'a non-host member write (409 live-coop-session)',
      (world) => ({
        status: 409,
        body: conflictBody('live-coop-session', world.server.record),
      }),
    ],
    [
      'blocked campaign authority (409 blocked)',
      () => ({
        status: 409,
        body: {
          error: 'campaign authority is blocked',
          kind: 'blocked',
          reason: 'journal-stream-missing',
        },
      }),
    ],
    [
      'a replica instance (403 refused, no code)',
      () => ({
        status: 403,
        body: {
          error: 'replica instance cannot accept local mutation',
          kind: 'refused',
          reason: 'replica-not-source',
        },
      }),
    ],
    [
      'a 401 with no typed refusal',
      () => ({ status: 401, body: { error: 'unauthorized' } }),
    ],
    [
      'an invalid campaign authority (422)',
      () => ({
        status: 422,
        body: {
          error: 'campaign authority is invalid',
          kind: 'failed',
          reason: 'unknown-role',
        },
      }),
    ],
    [
      'a server error (500)',
      () => ({ status: 500, body: { error: 'failed to persist campaign' } }),
    ],
    ['a network failure', () => 'network' as const],
  ];

  it.each(rejections)(
    '(R11) %s: rolled back, reported, and a retry applies the day once',
    async (_name, respond) => {
      const world = await buildWorld(true);
      const before = observe(world);
      world.server.putMode = 'respond';
      world.server.putResponse = respond(world);

      const report = await world.store.getState().advanceDay();

      expect(report).toBeNull();
      expect(world.store.getState().campaign!.currentDate.getTime()).toBe(
        before.campaign!.currentDate.getTime(),
      );
      expect(currentPilot().xp).toBe(0);
      expect(currentPilot().campaignMissions).toBe(0);
      expect(usePilotStore.getState().pilots[0].awards).toHaveLength(0);
      expect(world.store.getState().processedBattleIds).toEqual([]);
      expect(
        world.store.getState().pendingBattleOutcomes.map((o) => o.matchId),
      ).toEqual(['m-1', 'm-bad']);
      expect(toastMessages().join('\n')).toMatch(/not saved/i);
      expect(world.store.getState().dayAdvanceInFlight).toBe(false);

      world.server.putMode = 'ok';
      const retry = await world.store.getState().advanceDay();

      expect(retry).not.toBeNull();
      expect(currentPilot().xp).toBe(10);
      expect(usePilotStore.getState().pilots[0].awards).toHaveLength(1);
      expect(world.store.getState().processedBattleIds).toEqual(['m-1']);
    },
  );

  it('(R11b) after a rejection the campaign is not left marked as unsaved', async () => {
    const world = await buildWorld(true);
    installCampaignPersistenceWiring();
    world.server.putMode = 'fail';

    await world.store.getState().advanceDay();

    expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
  });
});

// =============================================================================
// R4: what someone else wrote meanwhile is not undone
// =============================================================================

describe('K13 rollback leaves other writers alone', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(R4a) a roster the persistence layer restored from the server record is kept', async () => {
    const world = await buildWorld(true);
    world.server.putMode = 'gate';
    const pending = world.store.getState().advanceDay();
    await untilPutHeld(world.server);
    // The refusal's own rollback replaces the roster with the record's.
    useCampaignRosterStore.setState({
      pilots: [{ ...pilotEntry(), xp: 99 }],
    });
    world.server.releaseGate();

    expect(await pending).toBeNull();
    expect(currentPilot().xp).toBe(99);
    expect(world.store.getState().processedBattleIds).toEqual([]);
  });

  it('(R4b) a roster write made while the save was out survives the rollback', async () => {
    const world = await buildWorld(true);
    world.server.putMode = 'gate';
    const pending = world.store.getState().advanceDay();
    await untilPutHeld(world.server);
    patchPilot({ wounds: 2 });
    world.server.releaseGate();

    expect(await pending).toBeNull();
    expect(currentPilot().wounds).toBe(2);
    // The rest of the day was still undone.
    expect(world.store.getState().processedBattleIds).toEqual([]);
    expect(usePilotStore.getState().pilots[0].awards).toHaveLength(0);
  });
});

// =============================================================================
// M5: the snapshot is the roster the day started from
// =============================================================================

interface IControlledHost {
  readonly transport: ICampaignSyncTransport;
  readonly commit: () => void;
}

function controlledHost(server: IFakeServer): IControlledHost {
  const handlers = new Set<(message: unknown) => void>();
  const sent: { campaignId: string }[] = [];
  return {
    commit: () => {
      const ts = new Date().toISOString();
      const record = server.record as SerializedCampaign;
      server.record = {
        ...record,
        version: record.version + 1,
        body: {
          ...record.body,
          currentDate: new Date(
            Date.parse(record.body.currentDate) + DAY_MS,
          ).toISOString(),
        },
      };
      const message = {
        kind: 'CampaignEvent',
        matchId: MATCH_ID,
        ts,
        event: {
          sequence: 3,
          campaignId: sent[sent.length - 1].campaignId,
          ts,
          authorPlayerId: 'host-player',
          type: 'CampaignDayAdvanced',
          scope: 'campaign',
          payload: { newDay: 1 },
        },
      };
      [...handlers].forEach((handler) => handler(message));
    },
    transport: {
      matchId: MATCH_ID,
      playerId: 'host-player',
      role: 'host',
      sendProposal: jest.fn(),
      sendDecision: jest.fn(),
      sendParticipation: jest.fn(),
      sendHostIntent: (intent) => {
        sent.push(intent as unknown as { campaignId: string });
      },
      onFrame: (handler) => {
        handlers.add(handler as (message: unknown) => void);
        return () => {
          handlers.delete(handler as (message: unknown) => void);
        };
      },
      onError: () => () => undefined,
      close: jest.fn(),
      lastSeq: () => -1,
    },
  };
}

describe('K13 rollback through the co-op host path', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(M5) a failed local save puts back the roster the host refresh adopted, not the one from before it', async () => {
    const world = await buildWorld(true);
    const host = controlledHost(world.server);
    registerCampaignSyncTransport(host.transport);
    // A live-only edit the saved record does not have: the refresh drops it.
    patchPilot({ xp: 5 });

    const pending = world.store.getState().advanceDay();
    host.commit();
    world.server.putMode = 'fail';
    const report = await pending;

    expect(report).toBeNull();
    // The record the host committed has xp 0; that is the day's starting roster.
    expect(currentPilot().xp).toBe(0);
    expect(currentPilot().campaignMissions).toBe(0);
  });
});

// =============================================================================
// R6: travel
// =============================================================================

describe('K13 travel rollback', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(R6) a refused co-op save puts the campaign and activity log back', async () => {
    const world = await buildWorld(true);
    const destination = [
      'terra',
      'tharkad',
      'luthien',
      'new-avalon',
      'sian',
      'atreus',
      'outreach',
      'galatea',
      'hesperus-ii',
    ].find((systemId) => {
      const preview = world.store.getState().previewTravelToSystem(systemId);
      return preview?.status === 'ready' && preview.afterCampaign;
    });
    expect(destination).toBeDefined();
    const before = observe(world);
    world.server.putMode = 'fail';

    const committed = await world.store.getState().travelToSystem(destination!);

    expect(committed).toBe(false);
    const after = observe(world);
    expect(after.campaign!.currentDate.getTime()).toBe(
      before.campaign!.currentDate.getTime(),
    );
    expect(after.campaign!.currentSystemId).toBe(
      before.campaign!.currentSystemId,
    );
    expect(after.activityLog).toBe(before.activityLog);
    const cached = JSON.parse(after.cache as string) as {
      state: { currentDate: string };
    };
    expect(cached.state.currentDate).toBe(
      before.campaign!.currentDate.toISOString(),
    );
    expect(world.store.getState().dayAdvanceInFlight).toBe(false);
    expect(toastMessages().join('\n')).toMatch(/jump was not saved/i);
  });
});

// =============================================================================
// The roster restore helper
// =============================================================================

describe('K13 replacePilotsForCampaign', () => {
  beforeEach(resetWorld);
  afterEach(resetWorld);

  it('(R9) refuses another campaign and duplicate pilots, as replaceUnitsForCampaign does', () => {
    const roster = useCampaignRosterStore.getState();
    roster.initRoster('campaign-a');
    const a = pilotEntry();
    const b = { ...pilotEntry(), pilotId: 'p2' };

    expect(roster.replacePilotsForCampaign('campaign-b', [a])).toBe(false);
    expect(roster.replacePilotsForCampaign('campaign-a', [a, a])).toBe(false);
    expect(useCampaignRosterStore.getState().pilots).toEqual([]);

    const pilots = [a, b];
    expect(roster.replacePilotsForCampaign('campaign-a', pilots)).toBe(true);
    expect(useCampaignRosterStore.getState().pilots).toBe(pilots);
  });
});
