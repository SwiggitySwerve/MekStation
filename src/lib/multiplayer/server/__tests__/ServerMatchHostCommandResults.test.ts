import type { ICommandCommitResult } from '@/types/command-screen';
import type { IGameEvent } from '@/types/gameplay';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  extractPlayerSafeCommandResults,
  buildPlayerSafeCommandResultEvent,
} from '@/lib/command-screen';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';
import { nowIso, type IIntent } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  readonly payload: string;
  readonly parsed: IServerMessage;
}

function makeSocket(): IMatchSocket & { readonly sent: IRecordedSend[] } {
  const sent: IRecordedSend[] = [];
  let closed = false;
  return {
    send(data: string) {
      sent.push({
        payload: data,
        parsed: JSON.parse(data) as IServerMessage,
      });
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    sent,
  } as IMatchSocket & { readonly sent: IRecordedSend[] };
}

async function makeHost(fogOfWar = false): Promise<{
  readonly host: ServerMatchHost;
  readonly store: InMemoryMatchStore;
  readonly matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-command-result';
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
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
    config: { mapRadius: 4, turnLimit: 5, fogOfWar },
  });

  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [],
  });

  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

function makeGmCorrectionResult(): ICommandCommitResult<
  { readonly summary: string; readonly changedStateRefs: readonly string[] },
  { readonly hiddenRationale: string; readonly hiddenEncounterNote: string }
> {
  return {
    commandId: 'gm.tactical.correct-heat',
    previewId: 'preview-heat',
    domain: 'combat',
    status: 'committed',
    authority: 'host-gm',
    subjectRefs: [{ id: 'atlas-1', type: 'unit', label: 'Atlas' }],
    publicEffect: {
      summary: 'Atlas heat corrected to 8.',
      changedStateRefs: ['unit:atlas-1:heat'],
    },
    privateMetadata: {
      hiddenRationale: 'Hidden GM adjudication reason.',
      hiddenEncounterNote: 'Secret ambush state remains private.',
    },
    resultingState: {
      label: 'Heat corrected',
      entityRefs: [{ id: 'atlas-1', type: 'unit', label: 'Atlas' }],
      fields: { heat: 8 },
    },
    ledgerRef: 'ledger-gm-heat',
    diagnosticEvent: 'command_gm_intervention_committed',
    committedAt: '2026-06-30T12:00:00.000Z',
  };
}

function eventMessages(socket: { readonly sent: readonly IRecordedSend[] }) {
  return socket.sent
    .map((send) => send.parsed)
    .filter(
      (message): message is Extract<IServerMessage, { kind: 'Event' }> =>
        message.kind === 'Event',
    );
}

describe('ServerMatchHost command-result publication', () => {
  it('persists, broadcasts, and replays host GM results as player-safe public events', async () => {
    const { host, store, matchId } = await makeHost(true);
    const hostSocket = makeSocket();
    const guestSocket = makeSocket();
    host.attachSocket(hostSocket, 'host-player');
    host.attachSocket(guestSocket, 'guest-player');

    const message = await host.publishHostCommandResult({
      actorId: 'host-player',
      source: 'host-gm-intervention',
      result: makeGmCorrectionResult(),
      timestamp: '2026-06-30T12:00:01.000Z',
    });
    const event = message.event as IGameEvent;

    expect(event.type).toBe(GameEventType.CommandResultPublished);
    expect(event.visibility).toBe('public');
    expect(host.highestSeq()).toBe(event.sequence);
    expect(host.getSessionForTests().events.at(-1)?.id).toBe(event.id);

    const persisted = await store.getEvents(matchId, event.sequence);
    expect(persisted.map((entry) => entry.id)).toContain(event.id);
    expect(extractPlayerSafeCommandResults(persisted)).toHaveLength(1);

    const hostEvents = eventMessages(hostSocket);
    const guestEvents = eventMessages(guestSocket);
    expect(hostEvents).toHaveLength(1);
    expect(guestEvents).toHaveLength(1);
    expect(JSON.stringify(hostEvents)).not.toContain('Hidden GM');
    expect(JSON.stringify(guestEvents)).not.toContain('Secret ambush');
    expect(JSON.stringify(guestEvents)).not.toContain('privateMetadata');

    const replaySocket = makeSocket();
    await host.sendReplay(replaySocket, event.sequence, 'guest-player');
    const replayed = replaySocket.sent
      .map((send) => send.parsed)
      .flatMap((parsed) => (parsed.kind === 'ReplayChunk' ? parsed.events : []))
      .filter(
        (entry): entry is IGameEvent =>
          (entry as IGameEvent).type === GameEventType.CommandResultPublished,
      );
    expect(replayed.map((entry) => entry.id)).toEqual([event.id]);
    expect(JSON.stringify(replayed)).not.toContain('Hidden GM');
  });

  it('advances the host cursor so later engine intents do not re-broadcast the GM result', async () => {
    const { host, store, matchId } = await makeHost();
    const socket = makeSocket();
    host.attachSocket(socket, 'host-player');

    const commandMessage = await host.publishHostCommandResult({
      actorId: 'host-player',
      source: 'host-gm-intervention',
      result: makeGmCorrectionResult(),
      timestamp: '2026-06-30T12:00:01.000Z',
    });
    const commandEvent = commandMessage.event as IGameEvent;

    const intent: IIntent = {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'host-player',
      intent: { kind: 'Concede', side: GameSide.Player },
    };
    await host.handleIntent(intent);

    const sentCommandEvents = eventMessages(socket).filter(
      (message) =>
        (message.event as IGameEvent).type ===
        GameEventType.CommandResultPublished,
    );
    expect(sentCommandEvents).toHaveLength(1);

    const persisted = await store.getEvents(matchId, 0);
    expect(
      persisted.filter(
        (event) => event.type === GameEventType.CommandResultPublished,
      ),
    ).toHaveLength(1);
    const gameEnded = persisted.find(
      (event) => event.type === GameEventType.GameEnded,
    );
    expect(gameEnded?.sequence).toBeGreaterThan(commandEvent.sequence);
  });

  it('builds command-result events with public fog visibility by default', () => {
    const event = buildPlayerSafeCommandResultEvent({
      gameId: 'game-1',
      sequence: 3,
      turn: 1,
      phase: GamePhase.Movement,
      actorId: 'host-player',
      source: 'host-gm-intervention',
      result: makeGmCorrectionResult(),
      timestamp: '2026-06-30T12:00:01.000Z',
    });

    expect(event.visibility).toBe('public');
  });
});
