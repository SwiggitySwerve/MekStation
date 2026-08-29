/**
 * Per-match journal-authority admission (adopt-combat-event-journal-authority
 * task 4.2; design D4).
 *
 * New matches may enter journal authority only after shadow-equality
 * tripwire and privacy-gate wiring pass. Imported legacy streams keep
 * the schema-compatible path. Refusals never fail creation.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import type { IMatchMeta } from '../IMatchStore';

import { AuthorizedViewerResolver } from '../authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { DurableMatchStore } from '../DurableMatchStore';
import { IMPORTED_LEGACY_SOURCE_KIND } from '../importLegacyMatchEvents';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  admitJournalAuthority,
  getJournalAuthorityAdmissionRefusal,
  productionJournalAuthorityPrivacyGates,
  _resetJournalAuthorityAdmissionForTests,
  type IJournalAuthorityPrivacyGateWiring,
} from '../journalAuthorityAdmission';
import { digestRetainedMatchHistory } from '../matchAuthorityBaseline';
import * as matchJournalAuthority from '../matchJournalAuthority';
import {
  getProcessShadowMismatchCount,
  recordProcessShadowComparison,
  type IMatchJournalAuthorityBaseline,
} from '../matchJournalAuthority';
import { ViewerDeliveryCursors } from '../projection/ViewerDeliveryCursors';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

const MATCH_ID = 'match-journal-admission';

function twoSidedRoster(): IGameUnit[] {
  return [
    {
      id: 'lock-player',
      name: 'lock-player',
      side: GameSide.Player,
      unitRef: 'lock-player',
      pilotRef: 'lock-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'lock-opponent',
      name: 'lock-opponent',
      side: GameSide.Opponent,
      unitRef: 'lock-opponent',
      pilotRef: 'lock-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

function intent(intentId: string, matchId: string): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: { kind: 'AdvancePhase' },
  } as unknown as IIntent;
}

function makeMeta(matchId: string): IMatchMeta {
  const now = '2026-08-29T00:00:00.000Z';
  return {
    matchId,
    hostPlayerId: 'host-player',
    playerIds: ['host-player', 'guest-player'],
    sideAssignments: [
      { playerId: 'host-player', side: 'player' },
      { playerId: 'guest-player', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${matchId}-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: '3025-01-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {} as never,
  } as IGameEvent;
}

function wiredGates(
  store: InMemoryMatchStore,
): IJournalAuthorityPrivacyGateWiring {
  return productionJournalAuthorityPrivacyGates(
    new AuthorizedViewerResolver(new MatchSeatMembershipSource(store)),
    new ViewerDeliveryCursors(),
  );
}

function missingGates(): IJournalAuthorityPrivacyGateWiring {
  return {
    authorizedViewerResolver: null,
    authorizeHumanAction: null,
    viewerPublicationBoundary: null,
    viewerDeliveryCursors: null,
  };
}

function mismatchRecord() {
  return {
    intentId: 'tripwire',
    equal: false,
    eventCountLive: 1,
    eventCountShadow: 0,
    liveDigest: 'live',
    shadowDigest: 'shadow',
    reason: 'event-mismatch',
  } as const;
}

async function makeHost(options: {
  readonly matchId?: string;
  readonly journalAuthority?: boolean;
  readonly store?: InMemoryMatchStore;
  readonly privacyGates?: IJournalAuthorityPrivacyGateWiring;
}): Promise<{ host: ServerMatchHost; store: InMemoryMatchStore }> {
  const matchId = options.matchId ?? MATCH_ID;
  const store = options.store ?? new InMemoryMatchStore({ quiet: true });
  if ((await store.listMatches({})).every((row) => row.matchId !== matchId)) {
    await store.createMatch(makeMeta(matchId));
  }
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: twoSidedRoster(),
    diceSeed: 42,
    journalAuthority: options.journalAuthority,
    privacyGates: options.privacyGates,
  });
  const deadline = Date.now() + 1000;
  while ((await store.getEvents(matchId)).length < 2) {
    if (Date.now() > deadline) {
      throw new Error('initial events did not persist');
    }
    await Promise.resolve();
  }
  return { host, store };
}

function makeRecordingSocket(): IMatchSocket & { sent: unknown[] } {
  const sent: unknown[] = [];
  const socket = {
    send(data: string) {
      sent.push(JSON.parse(data) as unknown);
    },
    close() {},
    readyState: 1,
    sent,
  };
  return socket as IMatchSocket & { sent: unknown[] };
}

describe('journal authority admission', () => {
  afterEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._resetProcessShadowStatsForTests();
    _resetJournalAuthorityAdmissionForTests();
  });

  it('HAPPY ADMISSION: new match, mode enabled, gates wired writes the pre-command baseline', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
    const { host, store } = await makeHost({
      matchId: 'match-admit-happy',
      journalAuthority: true,
    });

    // Falsification: expect(host.isJournalAuthorityEnabled()).toBe(false)
    expect(host.isJournalAuthorityEnabled()).toBe(true);
    const baseline = store.getJournalAuthorityBaseline('match-admit-happy');
    expect(baseline).not.toBeNull();
    expect(baseline?.streamType).toBe('match');
    expect(baseline?.streamId).toBe('match-admit-happy');
    expect(baseline?.branchId).toBe('main');
    expect(baseline?.revision).toBe(1);
    expect(baseline?.effectiveGeneration).toBe(1);
    // The exact retained legacy head at admission, not an empty placeholder.
    expect(baseline?.digest).toBe(
      digestRetainedMatchHistory(host.getSessionForTests().events),
    );
    expect(getJournalAuthorityAdmissionRefusal('match-admit-happy')).toBeNull();

    await host.handleIntent(intent('lock-1', host.matchId));
    expect(
      await store.getJournalAuthorityStarted!(host.matchId),
    ).not.toBeNull();
  });

  it('ZERO COMPARISONS is not a blocker: equality evidence is the mode flip', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
    expect(getProcessShadowMismatchCount()).toBe(0);

    const decision = admitJournalAuthority({
      matchId: 'match-admit-zero',
      mode: 'enabled',
      requested: true,
      imported: false,
      processMismatchCount: 0,
      gates: wiredGates(new InMemoryMatchStore({ quiet: true })),
      existingBaseline: null,
    });

    // Falsification: treat zero comparisons as a mismatch refusal
    expect(decision.kind).toBe('admitted');
  });

  it('MISMATCH TRIPWIRE: any process mismatch refuses; creation stays legacy', async () => {
    recordProcessShadowComparison(mismatchRecord());
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const { host, store } = await makeHost({
      matchId: 'match-admit-mismatch',
      journalAuthority: true,
    });

    // MUTATION A: skip the mismatch tripwire — this row reds
    expect(host.isJournalAuthorityEnabled()).toBe(false);
    expect(
      store.getJournalAuthorityBaseline('match-admit-mismatch'),
    ).toBeNull();
    expect(getJournalAuthorityAdmissionRefusal('match-admit-mismatch')).toEqual(
      {
        matchId: 'match-admit-mismatch',
        reason: 'shadow-mismatch',
      },
    );
    expect(warn).toHaveBeenCalled();

    const socket = makeRecordingSocket();
    host.attachSocket(socket, 'host-player');
    await host.handleIntent(intent('lock-1', host.matchId));
    expect(await store.getJournalAuthorityStarted!(host.matchId)).toBeNull();
    expect(
      socket.sent.some(
        (frame) =>
          typeof frame === 'object' &&
          frame !== null &&
          JSON.stringify(frame).includes('shadow-mismatch'),
      ),
    ).toBe(false);
    warn.mockRestore();
  });

  it('MISSING GATE: incomplete wiring refuses; construction still yields a working legacy match', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const { host, store } = await makeHost({
      matchId: 'match-admit-gates',
      journalAuthority: true,
      privacyGates: missingGates(),
    });

    // Falsification: admit when viewerPublicationBoundary is null
    expect(host.isJournalAuthorityEnabled()).toBe(false);
    expect(
      getJournalAuthorityAdmissionRefusal('match-admit-gates')?.reason,
    ).toBe('missing-privacy-gates');
    expect(store.getJournalAuthorityBaseline('match-admit-gates')).toBeNull();
    expect(warn).toHaveBeenCalled();

    const before = (await store.getEvents(host.matchId)).length;
    const messages = await host.handleIntent(intent('lock-1', host.matchId));
    expect(messages.some((message) => message.kind === 'Error')).toBe(false);
    expect((await store.getEvents(host.matchId)).length).toBeGreaterThan(
      before,
    );
    expect(await store.getJournalAuthorityStarted!(host.matchId)).toBeNull();
    warn.mockRestore();
  });

  it('IMPORTED MATCH: never journal authority, baseline, or started fact', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'match-admit-imported';
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      await store.createMatch(makeMeta(matchId));
      const retained = [makeEvent(matchId, 5), makeEvent(matchId, 6)];
      const imported = store.importLegacyEvents({
        matchId,
        retained,
        baseline: {
          streamType: 'match',
          streamId: matchId,
          branchId: 'main',
          revision: 6,
          digest: 'imported-digest',
          effectiveGeneration: 1,
          source: 'legacy-baseline',
          firstRetainedRevision: 5,
          importedAt: '2026-08-29T00:00:00.000Z',
        },
        source: { formatId: 'mp-match-events', formatVersion: 1 },
        nowIso: () => '2026-08-29T00:00:00.000Z',
      });
      expect(imported.kind).toBe('imported');
      expect(store.getImportedEventSources(matchId)[0]?.sourceKind).toBe(
        IMPORTED_LEGACY_SOURCE_KIND,
      );

      const host = ServerMatchHost.create(matchId, store, {
        mapRadius: 4,
        turnLimit: 5,
        random: new SeededRandom(42),
        randomSeed: 42,
        grid: createMinimalGrid(4),
        playerUnits: [],
        opponentUnits: [],
        gameUnits: twoSidedRoster(),
        diceSeed: 42,
        journalAuthority: true,
      });

      // MUTATION B: let an imported match through — this row reds
      expect(host.isJournalAuthorityEnabled()).toBe(false);
      expect(store.getJournalAuthorityBaseline(matchId)).toBeNull();
      expect(getJournalAuthorityAdmissionRefusal(matchId)?.reason).toBe(
        'imported-legacy',
      );

      const deadline = Date.now() + 1000;
      while ((await store.getEvents(matchId)).length < 4) {
        if (Date.now() > deadline) break;
        await Promise.resolve();
      }
      await host.handleIntent(intent('lock-1', matchId));
      expect(await store.getJournalAuthorityStarted(matchId)).toBeNull();
    } finally {
      warn.mockRestore();
      store.close();
    }
  });

  it('WRITE-ONCE: a second insert fails; admission of an already-baselined match reuses', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    const matchId = 'match-admit-once';
    try {
      await store.createMatch(makeMeta(matchId));
      const genesis: IMatchJournalAuthorityBaseline = {
        streamType: 'match',
        streamId: matchId,
        branchId: 'main',
        revision: 0,
        digest: digestRetainedMatchHistory([]),
        effectiveGeneration: 1,
      };
      store.insertJournalAuthorityBaseline(genesis);
      expect(store.getJournalAuthorityBaseline(matchId)?.digest).toBe(
        genesis.digest,
      );

      // Falsification: INSERT OR REPLACE / UPDATE the digest
      expect(() =>
        store.insertJournalAuthorityBaseline({
          ...genesis,
          digest: 'should-not-land',
        }),
      ).toThrow('journal-authority-baseline already exists');
      expect(store.getJournalAuthorityBaseline(matchId)?.digest).toBe(
        genesis.digest,
      );

      const memory = new InMemoryMatchStore({ quiet: true });
      await memory.createMatch(makeMeta(matchId));
      const decision = admitJournalAuthority({
        matchId,
        mode: 'enabled',
        requested: true,
        imported: false,
        processMismatchCount: 0,
        gates: wiredGates(memory),
        existingBaseline: genesis,
      });
      expect(decision.kind).toBe('admitted');
      if (decision.kind === 'admitted') {
        expect(decision.reuse).toBe(true);
        expect(decision.baseline.digest).toBe(genesis.digest);
      }
    } finally {
      store.close();
    }
  });

  it('OFF INERT: requested journalAuthority still enables the test seam without a baseline', async () => {
    const { host, store } = await makeHost({
      matchId: 'match-admit-off',
      journalAuthority: true,
    });

    // Falsification: write a baseline while mode is off
    expect(matchJournalAuthority.getCombatJournalAuthorityMode()).toBe('off');
    expect(host.isJournalAuthorityEnabled()).toBe(true);
    expect(store.getJournalAuthorityBaseline('match-admit-off')).toBeNull();
    expect(getJournalAuthorityAdmissionRefusal('match-admit-off')).toBeNull();
  });

  it('SHADOW INERT: no admission and no baseline write', async () => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests('shadow');
    const { host, store } = await makeHost({
      matchId: 'match-admit-shadow',
    });

    // Falsification: persist a baseline in shadow mode
    expect(host.isJournalAuthorityEnabled()).toBe(false);
    expect(store.getJournalAuthorityBaseline('match-admit-shadow')).toBeNull();
    expect(
      getJournalAuthorityAdmissionRefusal('match-admit-shadow'),
    ).toBeNull();

    await host.handleIntent(intent('lock-1', host.matchId));
    expect(host.getLastShadowComparison()).not.toBeNull();
    expect(await store.getJournalAuthorityStarted!(host.matchId)).toBeNull();
  });
});
