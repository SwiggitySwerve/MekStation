/**
 * A player-facing frame must carry no server-only authority field.
 *
 * `gm-authority-redaction`, `Viewer Projection Occurs Before
 * Serialization`:
 *
 *   "WHEN the server prepares a player payload before `JSON.stringify`
 *    ... THEN the object SHALL already exclude GM-private reasons,
 *    hidden opponent facts, private identifiers, and non-viewer
 *    authority metadata"
 *
 * The publication boundary already runs per recipient before
 * `safeSend` serializes, so the ORDERING half of that requirement holds.
 * What did not exist was any step that actually REMOVES a field: the v1
 * catalog is all-public and passes the authoritative envelope through
 * byte-identical, so whatever the emitter put on an event reached every
 * viewer. `event.visibility` is exactly that - the fog classifier's own
 * concealment class, read only by `fogOfWar.ts` (server side, before the
 * send) and by the emission helper that stamps it. No client reads it.
 *
 * These rows do NOT claim the removal conceals anything. `visibility` is
 * a pure function of `type`, which the wire keeps, so a recipient can
 * recompute it; what is proved here is that the REMOVAL MECHANISM
 * reaches the wire on all three surfaces. The member with real
 * information content is `sequence`, still deferred.
 *
 * These rows are each other's controls. The first proves the field is
 * gone from what a player receives WHILE the authority log still has it,
 * so the removal happened at the wire rather than at the emitter. The
 * second proves nothing else was removed - a projector that stripped the
 * payload, or refused every frame, passes neither. The third covers
 * REPLAY, which is not a nicety: applying the removal to live frames
 * alone made a mid-match joiner hold different event objects than a
 * continuously-connected client on the same match, which
 * `mirrorConvergence` caught.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (11.1)
 */

import type { IGameEvent } from '@/types/gameplay';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { AUTHORITY_ONLY_EVENT_FIELDS } from '../projection/ViewerFrameProjector';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

function makeSocket(): IMatchSocket & { sent: IServerMessage[] } {
  const sent: IServerMessage[] = [];
  return {
    send(data: string) {
      sent.push(JSON.parse(data) as IServerMessage);
    },
    close() {},
    readyState: 1,
    sent,
  } as IMatchSocket & { sent: IServerMessage[] };
}

function makeUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  } as IGameUnit;
}

/** Every event object a socket actually received, in delivery order. */
function deliveredEvents(socket: {
  readonly sent: readonly IServerMessage[];
}): Record<string, unknown>[] {
  return socket.sent
    .filter((message) => message.kind === 'Event')
    .map(
      (message) => (message as { event: Record<string, unknown> }).event ?? {},
    );
}

/** The same object without the declared server-only authority fields. */
function withoutAuthorityFields(
  event: Record<string, unknown>,
): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if ((AUTHORITY_ONLY_EVENT_FIELDS as readonly string[]).includes(key)) {
      continue;
    }
    kept[key] = value;
  }
  return kept;
}

/** Creates an active two-seat match with fog on or off. */
async function makeHost(
  matchId: string,
  fogOfWar: boolean,
): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 12, turnLimit: 5, fogOfWar },
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 12,
    turnLimit: 5,
    random: new SeededRandom(7),
    grid: createMinimalGrid(12),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      makeUnit('u1', GameSide.Player),
      makeUnit('u2', GameSide.Opponent),
    ],
    diceSeed: 7,
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

/** Drives a few authoritative phase advances from the host seat. */
async function advance(
  host: ServerMatchHost,
  matchId: string,
  intentIds: readonly string[],
): Promise<void> {
  for (const intentId of intentIds) {
    await host.handleIntent({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intentId,
      intent: { kind: 'AdvancePhase' },
    } as unknown as IIntent);
  }
}

describe('viewer frame authority-only fields', () => {
  it('delivers no server-only authority field to either player under fog', async () => {
    const matchId = 'm-authority-field';
    const host = await makeHost(matchId, true);
    const player = makeSocket();
    const opponent = makeSocket();
    host.attachSocket(player, 'pid_host');
    host.attachSocket(opponent, 'pid_opp');

    await advance(host, matchId, ['i1', 'i2', 'i3']);

    const playerEvents = deliveredEvents(player);
    const opponentEvents = deliveredEvents(opponent);

    // A projector that refused everything would deliver nothing, and
    // "no frame carries the field" would then be vacuously true.
    expect(playerEvents.length).toBeGreaterThan(0);
    expect(opponentEvents.length).toBeGreaterThan(0);

    for (const event of [...playerEvents, ...opponentEvents]) {
      for (const field of AUTHORITY_ONLY_EVENT_FIELDS) {
        expect(Object.keys(event)).not.toContain(field);
      }
      // NAMED, not read from the production constant. Every other
      // assertion in this file iterates AUTHORITY_ONLY_EVENT_FIELDS, so
      // emptying that list would make them all pass vacuously while
      // production stopped removing anything. This row goes red instead.
      expect(Object.keys(event)).not.toContain('visibility');
      expect(Object.keys(event)).not.toContain('sequence');
    }

    // CONTROL. The authority log still records the field, so the frames
    // above lost it at the wire rather than never having had it.
    const stored = await host.getEventsFromSeq(0);
    expect(
      stored.some(
        (event) => (event as { visibility?: unknown }).visibility !== undefined,
      ),
    ).toBe(true);
    expect(stored.some((event) => typeof event.sequence === 'number')).toBe(
      true,
    );
  });

  it('removes only the declared fields and leaves the rest byte-identical', async () => {
    const matchId = 'm-authority-parity';
    const host = await makeHost(matchId, false);
    const player = makeSocket();
    host.attachSocket(player, 'pid_host');

    await advance(host, matchId, ['j1', 'j2']);

    const delivered = deliveredEvents(player);
    expect(delivered.length).toBeGreaterThan(0);

    // Fog is OFF here, so the only transformation between the authority
    // log and the wire is the projector. Anything else it touched shows
    // up as a diff.
    const stored = new Map(
      (await host.getEventsFromSeq(0)).map((event: IGameEvent) => [
        event.id,
        JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
      ]),
    );
    for (const event of delivered) {
      const authoritative = stored.get(event.id as string);
      expect(authoritative).toBeDefined();
      expect(event).toEqual(withoutAuthorityFields(authoritative ?? {}));
    }
  });

  it('replays no server-only authority field to a mid-match joiner', async () => {
    const matchId = 'm-authority-replay';
    const host = await makeHost(matchId, false);

    // The match runs on without the second player, then they join and
    // the server streams everything so far.
    const early = makeSocket();
    host.attachSocket(early, 'pid_host');
    await advance(host, matchId, ['k1', 'k2']);

    const joiner = makeSocket();
    host.attachSocket(joiner, 'pid_opp');
    await host.sendReplay(joiner, 0, 'pid_opp');

    const replayed: Record<string, unknown>[] = [];
    for (const message of joiner.sent) {
      if (message.kind !== 'ReplayChunk') continue;
      for (const event of message.events) {
        replayed.push(event as Record<string, unknown>);
      }
    }

    // A replay that delivered nothing would make the loop vacuous.
    expect(replayed.length).toBeGreaterThan(0);
    for (const event of replayed) {
      for (const field of AUTHORITY_ONLY_EVENT_FIELDS) {
        expect(Object.keys(event)).not.toContain(field);
      }
      // Named again, for the same reason: the replay surface must not be
      // provable only by a list that could be emptied.
      expect(Object.keys(event)).not.toContain('visibility');
      expect(Object.keys(event)).not.toContain('sequence');
    }

    // ...and the joiner holds exactly what the live stream delivers, so
    // the two surfaces cannot describe the same match differently.
    expect(replayed).toEqual(
      (await host.getEventsFromSeq(0)).map((event: IGameEvent) =>
        withoutAuthorityFields(
          JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
        ),
      ),
    );
  });
});
