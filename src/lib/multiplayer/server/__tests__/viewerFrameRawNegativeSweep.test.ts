/**
 * Raw-wire negative sweep: a player-projection frame leaks nothing
 * (umbrella task 11.4).
 *
 * Complements `viewerFrameAuthorityFieldLeak` (#1400: a removed field
 * is absent on live / replay / resync) and does NOT duplicate
 * `viewerSequenceConcealmentLeak` (inverted arithmetic on delivery
 * numbering). These rows scan the JSON the socket actually sends.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-sync/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (11.4)
 */

import type { IGameEvent } from '@/types/gameplay';
import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import {
  EventMessageSchema,
  nowIso,
  type IIntent,
} from '@/types/multiplayer/Protocol';

import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
  type IAuthorizedViewer,
  type IMembershipRecord,
  type IMembershipSource,
} from '../authorization/AuthorizedViewer';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MATCH_WIRE_PUBLICATION_BOUNDARY } from '../projection/ViewerPublicationBoundary';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

const SEQUENCE_KEY = /"sequence"\s*:/;
const PRIVATE_REASON_SENTINEL = 'GM-PRIVATE-REASON-SENTINEL-11-4';
const CONCEALED_EVENT_ID = 'evt-concealed-sentinel-11-4';
const PRIVATE_RECORD_REF_SENTINEL = 'f'.repeat(32);

/**
 * Id-shaped keys the match-wire protocol actually declares on a
 * player-visible Event / ReplayChunk. Anything id-shaped that is not
 * in this set is a leak of an internal identifier. Documented here so
 * the row cannot quietly grow an allowlist around a new authority key.
 */
const PUBLIC_ID_SHAPED_KEYS: ReadonlySet<string> = new Set([
  'matchId',
  'id',
  'gameId',
  'actorId',
  'unitId',
  'attackerId',
  'targetId',
  'weaponId',
  'ammoBinId',
  'binId',
  'defenderId',
  'incomingWeaponId',
  'amsWeaponId',
  'blockerUnitId',
  'objectId',
  'objectiveId',
  'encounterId',
  'intentId',
  'playerId',
  'pilotId',
  'spotterId',
  'campaignId',
  'contractId',
  'scenarioId',
  'fromSeq',
  'toSeq',
  'deliverySequence',
  'deliverySequences',
  'toDeliverySequence',
  'fromDeliverySequence',
]);

/**
 * Numeric keys that may coincidentally equal a hidden authority
 * sequence (delivery numbering, replay envelope bounds, turn/hex/dice
 * facts). A hidden sequence appearing under any OTHER key is a leak.
 */
const COINCIDENTAL_NUMERIC_KEYS: ReadonlySet<string> = new Set([
  'deliverySequence',
  'deliverySequences',
  'toDeliverySequence',
  'fromDeliverySequence',
  'fromSeq',
  'toSeq',
  'totalEvents',
  'turn',
  'q',
  'r',
  'mpUsed',
  'heatGenerated',
  'heat',
  'damage',
  'roll',
  'toHitNumber',
  'mapRadius',
  'turnLimit',
  'gunnery',
  'piloting',
  'walkMP',
  'runMP',
  'jumpMP',
]);

const FORBIDDEN_METADATA_KEYS: ReadonlySet<string> = new Set([
  'visibility',
  'sequence',
  'rowid',
  'rowId',
  '_id',
  'authorityId',
  'authoritySeq',
  'authoritySequence',
  'eventSeq',
  'logIndex',
  'commitPosition',
  'streamRevision',
  'commandId',
  'eventDigest',
  'previousStreamEventDigest',
  'canonicalizerVersion',
  'privateReason',
  'privateMetadata',
  'privateRecordRef',
  'hiddenNotes',
  'gmReason',
  'sequenceHint',
]);

interface IRawSocket extends IMatchSocket {
  readonly sent: string[];
}

function makeRawSocket(): IRawSocket {
  const sent: string[] = [];
  return {
    send(data: string) {
      sent.push(data);
    },
    close() {},
    readyState: 1,
    sent,
  } as IRawSocket;
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

function parseKind(raw: string): string | undefined {
  try {
    const parsed = JSON.parse(raw) as { kind?: unknown };
    return typeof parsed.kind === 'string' ? parsed.kind : undefined;
  } catch {
    return undefined;
  }
}

/** Event / ReplayChunk frames only — control envelopes are not projections. */
function projectionFrames(socket: IRawSocket): string[] {
  return socket.sent.filter((raw) => {
    const kind = parseKind(raw);
    return kind === 'Event' || kind === 'ReplayChunk';
  });
}

function allFrames(socket: IRawSocket): string[] {
  return [...socket.sent];
}

function deliveredEventIds(rawFrames: readonly string[]): string[] {
  const ids: string[] = [];
  for (const raw of rawFrames) {
    const parsed = JSON.parse(raw) as IServerMessage;
    if (parsed.kind === 'Event') {
      const id = (parsed.event as { id?: unknown } | undefined)?.id;
      if (typeof id === 'string') ids.push(id);
    }
    if (parsed.kind === 'ReplayChunk') {
      for (const event of parsed.events) {
        const id = (event as { id?: unknown }).id;
        if (typeof id === 'string') ids.push(id);
      }
    }
  }
  return ids;
}

function eventObjects(rawFrames: readonly string[]): unknown[] {
  const events: unknown[] = [];
  for (const raw of rawFrames) {
    const parsed = JSON.parse(raw) as IServerMessage;
    if (parsed.kind === 'Event') events.push(parsed.event);
    if (parsed.kind === 'ReplayChunk') {
      for (const event of parsed.events) events.push(event);
    }
  }
  return events;
}

function walkKeys(
  value: unknown,
  visit: (key: string, nested: unknown) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, visit);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, nested] of Object.entries(value)) {
    visit(key, nested);
    walkKeys(nested, visit);
  }
}

function isIdShaped(key: string): boolean {
  return /id$/i.test(key) || /seq/i.test(key) || key.startsWith('_');
}

/** Keys that would name an authority position rather than a game fact. */
function isPositionLikeKey(key: string): boolean {
  if (COINCIDENTAL_NUMERIC_KEYS.has(key)) return false;
  return (
    /seq/i.test(key) ||
    /authority/i.test(key) ||
    /rowid/i.test(key) ||
    /logIndex/i.test(key) ||
    key === 'index' ||
    /cursor/i.test(key)
  );
}

function collectNumbers(
  value: unknown,
): Array<{ readonly key: string; readonly n: number }> {
  const found: Array<{ key: string; n: number }> = [];
  walkKeys(value, (key, nested) => {
    if (typeof nested === 'number' && Number.isFinite(nested)) {
      found.push({ key, n: nested });
    }
    if (Array.isArray(nested)) {
      for (const item of nested) {
        if (typeof item === 'number' && Number.isFinite(item)) {
          found.push({ key, n: item });
        }
      }
    }
  });
  return found;
}

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-player',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: 'session-raw-sweep',
  matchId: 'match-raw-sweep',
  participantId: 'participant-player',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 1,
  active: true,
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-gm',
  participantId: 'participant-gm',
  role: 'gm',
  ownedForceIds: ['force-gm'],
};

class FakeMembershipSource implements IMembershipSource {
  public constructor(private readonly row: IMembershipRecord) {}

  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    if (
      principalId !== this.row.principalId ||
      campaignSessionId !== this.row.campaignSessionId
    ) {
      return null;
    }
    return this.row;
  }

  public async currentMembershipRevision(): Promise<number> {
    return this.row.membershipRevision;
  }
}

async function brandedViewer(
  row: IMembershipRecord,
): Promise<IAuthorizedViewer> {
  const resolver = new AuthorizedViewerResolver(new FakeMembershipSource(row));
  return resolver.resolve(
    mintVerifiedPrincipal(row.principalId),
    row.campaignSessionId,
  );
}

async function makeFogHost(matchId: string): Promise<ServerMatchHost> {
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
    config: { mapRadius: 12, turnLimit: 5, fogOfWar: true },
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

async function advance(host: ServerMatchHost, matchId: string): Promise<void> {
  for (const intentId of ['i1', 'i2', 'i3', 'i4']) {
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

function concealedActorOnlyEvent(
  matchId: string,
  sequence: number,
): IGameEvent {
  return {
    id: CONCEALED_EVENT_ID,
    gameId: matchId,
    sequence,
    timestamp: '2026-06-30T12:00:00.000Z',
    type: GameEventType.MovementDeclared,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: 'u2',
    visibility: 'actor-only',
    payload: {
      unitId: 'u2',
      from: { q: -2, r: 5 },
      to: { q: -1, r: 5 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
      privateReason: PRIVATE_REASON_SENTINEL,
    },
  } as unknown as IGameEvent;
}

async function broadcast(
  host: ServerMatchHost,
  matchId: string,
  event: IGameEvent,
): Promise<void> {
  const fn = (
    host as unknown as {
      broadcastEvent(message: IEventMessage): Promise<void>;
    }
  ).broadcastEvent.bind(host);
  await fn({
    kind: 'Event',
    matchId,
    ts: nowIso(),
    event,
  });
}

interface IDrivenMatch {
  readonly host: ServerMatchHost;
  readonly matchId: string;
  readonly player: IRawSocket;
  readonly opponent: IRawSocket;
  readonly stored: readonly IGameEvent[];
  readonly hiddenFromPlayer: readonly IGameEvent[];
}

async function driveFogMatch(matchId: string): Promise<IDrivenMatch> {
  const host = await makeFogHost(matchId);
  const player = makeRawSocket();
  const opponent = makeRawSocket();
  host.attachSocket(player, 'pid_host');
  host.attachSocket(opponent, 'pid_opp');
  await advance(host, matchId);
  const stored = await host.getEventsFromSeq(0);
  const playerIds = new Set(deliveredEventIds(projectionFrames(player)));
  const hiddenFromPlayer = stored.filter((event) => !playerIds.has(event.id));
  return { host, matchId, player, opponent, stored, hiddenFromPlayer };
}

describe('viewer frame raw-wire negative sweep', () => {
  describe('(a) authority sequence', () => {
    it('puts no "sequence": key on player Event, ReplayChunk, or resync event objects', async () => {
      const { host, player, opponent } = await driveFogMatch('m-raw-seq-live');

      const livePlayer = projectionFrames(player);
      const liveOpponent = projectionFrames(opponent);
      expect(livePlayer.length).toBeGreaterThan(0);
      expect(liveOpponent.length).toBeGreaterThan(0);
      for (const raw of [...livePlayer, ...liveOpponent]) {
        expect(raw).not.toMatch(SEQUENCE_KEY);
      }

      const joiner = makeRawSocket();
      host.attachSocket(joiner, 'pid_opp');
      await host.sendReplay(joiner, 0, 'pid_opp');
      const replayFrames = projectionFrames(joiner);
      expect(replayFrames.some((raw) => parseKind(raw) === 'ReplayChunk')).toBe(
        true,
      );
      for (const raw of replayFrames) {
        expect(raw).not.toMatch(SEQUENCE_KEY);
      }

      const resync = makeRawSocket();
      host.attachSocket(resync, 'pid_host');
      await host.handleSessionJoin(resync, 'pid_host');
      const resyncFrames = projectionFrames(resync);
      expect(resyncFrames.length).toBeGreaterThan(0);
      for (const raw of resyncFrames) {
        expect(raw).not.toMatch(SEQUENCE_KEY);
      }
    });

    it('keeps "sequence": on a GM projection of a real host event', async () => {
      const { stored } = await driveFogMatch('m-raw-seq-gm');
      const authority = stored.find(
        (event) => typeof event.sequence === 'number',
      );
      expect(authority).toBeDefined();

      const envelope: IEventMessage = {
        kind: 'Event',
        matchId: 'm-raw-seq-gm',
        ts: nowIso(),
        event: authority,
      };
      const gm = await brandedViewer(GM_ROW);
      const playerViewer = await brandedViewer(PLAYER_ROW);
      const gmGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
        gm,
        envelope,
      );
      const playerGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
        playerViewer,
        envelope,
      );
      expect(gmGuarded.kind).toBe('send');
      expect(playerGuarded.kind).toBe('send');
      if (gmGuarded.kind !== 'send' || playerGuarded.kind !== 'send') return;

      const gmRaw = JSON.stringify(gmGuarded.value);
      const playerRaw = JSON.stringify(playerGuarded.value);
      expect(gmRaw).toMatch(SEQUENCE_KEY);
      expect(playerRaw).not.toMatch(SEQUENCE_KEY);
    });
  });

  describe('(b) private ids', () => {
    it('carries only protocol-declared id-shaped keys on player frames', async () => {
      const { player, opponent, host } = await driveFogMatch('m-raw-ids');
      const joiner = makeRawSocket();
      host.attachSocket(joiner, 'pid_opp');
      await host.sendReplay(joiner, 0, 'pid_opp');

      const rawFrames = [
        ...projectionFrames(player),
        ...projectionFrames(opponent),
        ...projectionFrames(joiner),
      ];
      expect(rawFrames.length).toBeGreaterThan(0);

      const unexpected = new Set<string>();
      for (const raw of rawFrames) {
        walkKeys(JSON.parse(raw), (key) => {
          if (FORBIDDEN_METADATA_KEYS.has(key)) unexpected.add(key);
          if (isIdShaped(key) && !PUBLIC_ID_SHAPED_KEYS.has(key)) {
            unexpected.add(key);
          }
        });
      }
      expect(Array.from(unexpected).sort()).toEqual([]);
    });

    it('removes a planted private-record opaque ref from a player-safe fact while retaining it for the GM', async () => {
      const { stored } = await driveFogMatch('m-raw-private-record-ref');
      const authority = stored.find(
        (event) => typeof event.sequence === 'number',
      );
      expect(authority).toBeDefined();
      if (authority === undefined) return;
      const authorityPayload =
        typeof authority.payload === 'object' &&
        authority.payload !== null &&
        !Array.isArray(authority.payload)
          ? authority.payload
          : {};

      const envelope: IEventMessage = {
        kind: 'Event',
        matchId: 'm-raw-private-record-ref',
        ts: nowIso(),
        event: {
          ...authority,
          privateRecordRef: PRIVATE_RECORD_REF_SENTINEL,
          payload: {
            ...authorityPayload,
            privateRecordRef: PRIVATE_RECORD_REF_SENTINEL,
          },
        },
      };
      const gm = await brandedViewer(GM_ROW);
      const player = await brandedViewer(PLAYER_ROW);
      const gmGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
        gm,
        envelope,
      );
      const playerGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
        player,
        envelope,
      );

      expect(gmGuarded.kind).toBe('send');
      expect(playerGuarded.kind).toBe('send');
      if (gmGuarded.kind !== 'send' || playerGuarded.kind !== 'send') return;

      const gmRaw = JSON.stringify(gmGuarded.value);
      const playerRaw = JSON.stringify(playerGuarded.value);
      expect(gmRaw).toContain(PRIVATE_RECORD_REF_SENTINEL);
      expect(playerRaw).not.toContain(PRIVATE_RECORD_REF_SENTINEL);
      expect(playerRaw).not.toContain('privateRecordRef');
    });
  });

  describe('(c) hidden metadata / GM-private reasons', () => {
    it('does not put a concealed event type, id, reason, or payload literal on player frames', async () => {
      const { host, matchId, player, opponent, hiddenFromPlayer } =
        await driveFogMatch('m-raw-hidden');

      expect(hiddenFromPlayer.length).toBeGreaterThan(0);

      await broadcast(
        host,
        matchId,
        concealedActorOnlyEvent(matchId, host.highestSeq() + 1),
      );

      const playerJoined = allFrames(player).join('\n');
      const opponentJoined = allFrames(opponent).join('\n');

      expect(playerJoined).not.toContain(CONCEALED_EVENT_ID);
      expect(playerJoined).not.toContain(PRIVATE_REASON_SENTINEL);
      expect(playerJoined).not.toContain('privateReason');
      expect(opponentJoined).toContain(CONCEALED_EVENT_ID);
      expect(opponentJoined).toContain(PRIVATE_REASON_SENTINEL);

      const visibleTypes = new Set(
        eventObjects(projectionFrames(player)).map((event) => {
          const type = (event as { type?: unknown }).type;
          return typeof type === 'string' ? type : '';
        }),
      );
      for (const hidden of hiddenFromPlayer) {
        expect(playerJoined).not.toContain(hidden.id);
        const payload = hidden.payload as Record<string, unknown> | undefined;
        if (payload && typeof payload === 'object') {
          for (const value of Object.values(payload)) {
            if (typeof value === 'string' && value.length >= 8) {
              if (visibleTypes.has(value)) continue;
              expect(playerJoined).not.toContain(value);
            }
          }
        }
        if (!visibleTypes.has(hidden.type) && hidden.type.length >= 8) {
          expect(playerJoined).not.toContain(hidden.type);
        }
      }
    });
  });

  describe('(d) inferable concealment', () => {
    it('does not reconstruct a hidden authority position from any numeric field', async () => {
      const { player, opponent, host, stored } =
        await driveFogMatch('m-raw-infer');

      const livePlayerIds = deliveredEventIds(projectionFrames(player));
      const liveOpponentIds = deliveredEventIds(projectionFrames(opponent));
      expect(livePlayerIds).not.toEqual(liveOpponentIds);

      const resync = makeRawSocket();
      host.attachSocket(resync, 'pid_host');
      await host.handleSessionJoin(resync, 'pid_host');

      const resyncIds = new Set(deliveredEventIds(projectionFrames(resync)));
      expect(resyncIds.size).toBeGreaterThan(0);
      const hiddenOnResync = stored.filter((event) => !resyncIds.has(event.id));
      expect(hiddenOnResync.length).toBeGreaterThan(0);

      const hiddenSequences = new Set(
        hiddenOnResync
          .map((event) => event.sequence)
          .filter((sequence) => typeof sequence === 'number'),
      );
      expect(hiddenSequences.size).toBeGreaterThan(0);

      const surfaces = [...allFrames(player), ...allFrames(resync)];
      const leaks: string[] = [];
      for (const raw of surfaces) {
        const parsed = JSON.parse(raw) as unknown;
        for (const { key, n } of collectNumbers(parsed)) {
          if (!hiddenSequences.has(n)) continue;
          if (!isPositionLikeKey(key)) continue;
          leaks.push(`${key}=${n}`);
        }
      }
      expect(leaks).toEqual([]);

      for (const raw of allFrames(resync)) {
        if (
          parseKind(raw) !== 'ReplayStart' &&
          parseKind(raw) !== 'ReplayEnd'
        ) {
          continue;
        }
        const parsed = JSON.parse(raw) as {
          fromSeq?: number;
          toSeq?: number;
        };
        if (typeof parsed.fromSeq === 'number') {
          expect(hiddenSequences.has(parsed.fromSeq)).toBe(false);
        }
        if (typeof parsed.toSeq === 'number') {
          expect(hiddenSequences.has(parsed.toSeq)).toBe(false);
        }
      }

      let fromSeq: number | undefined;
      let toSeq: number | undefined;
      let totalEvents: number | undefined;
      for (const raw of allFrames(resync)) {
        const parsed = JSON.parse(raw) as {
          kind?: string;
          fromSeq?: number;
          toSeq?: number;
          totalEvents?: number;
        };
        if (parsed.kind === 'ReplayStart') {
          fromSeq = parsed.fromSeq;
          totalEvents = parsed.totalEvents;
        }
        if (parsed.kind === 'ReplayEnd') toSeq = parsed.toSeq;
      }
      expect(fromSeq).toBeUndefined();
      expect(toSeq).toBeUndefined();
      expect(typeof totalEvents).toBe('number');
    });

    it('FINDING: ReplayStart/End authority span does not let a player count withheld events', async () => {
      const { host } = await driveFogMatch('m-raw-infer-span');
      const resync = makeRawSocket();
      host.attachSocket(resync, 'pid_host');
      await host.handleSessionJoin(resync, 'pid_host');

      let fromSeq: number | undefined;
      let toSeq: number | undefined;
      let fromDeliverySequence: number | undefined;
      let toDeliverySequence: number | undefined;
      let totalEvents: number | undefined;
      for (const raw of allFrames(resync)) {
        const parsed = JSON.parse(raw) as {
          kind?: string;
          fromSeq?: number;
          toSeq?: number;
          fromDeliverySequence?: number;
          toDeliverySequence?: number;
          totalEvents?: number;
        };
        if (parsed.kind === 'ReplayStart') {
          fromSeq = parsed.fromSeq;
          fromDeliverySequence = parsed.fromDeliverySequence;
          totalEvents = parsed.totalEvents;
        }
        if (parsed.kind === 'ReplayEnd') {
          toSeq = parsed.toSeq;
          toDeliverySequence = parsed.toDeliverySequence;
        }
      }
      expect(fromSeq).toBeUndefined();
      expect(toSeq).toBeUndefined();
      expect(typeof fromDeliverySequence).toBe('number');
      expect(typeof toDeliverySequence).toBe('number');
      expect(typeof totalEvents).toBe('number');
      if (
        typeof fromDeliverySequence !== 'number' ||
        typeof toDeliverySequence !== 'number' ||
        typeof totalEvents !== 'number'
      ) {
        return;
      }
      expect(toDeliverySequence - fromDeliverySequence + 1 - totalEvents).toBe(
        0,
      );
    });

    it('characterizes the replay-span finding: delivery span equals items delivered; hidden count unrecoverable', async () => {
      const { host, stored } = await driveFogMatch('m-raw-infer-span-char');
      const resync = makeRawSocket();
      host.attachSocket(resync, 'pid_host');
      await host.handleSessionJoin(resync, 'pid_host');

      const resyncIds = new Set(deliveredEventIds(projectionFrames(resync)));
      const hiddenOnResync = stored.filter((event) => !resyncIds.has(event.id));
      expect(hiddenOnResync.length).toBeGreaterThan(0);

      let fromSeq: number | undefined;
      let toSeq: number | undefined;
      let fromDeliverySequence: number | undefined;
      let toDeliverySequence: number | undefined;
      let totalEvents: number | undefined;
      for (const raw of allFrames(resync)) {
        const parsed = JSON.parse(raw) as {
          kind?: string;
          fromSeq?: number;
          toSeq?: number;
          fromDeliverySequence?: number;
          toDeliverySequence?: number;
          totalEvents?: number;
        };
        if (parsed.kind === 'ReplayStart') {
          fromSeq = parsed.fromSeq;
          fromDeliverySequence = parsed.fromDeliverySequence;
          totalEvents = parsed.totalEvents;
        }
        if (parsed.kind === 'ReplayEnd') {
          toSeq = parsed.toSeq;
          toDeliverySequence = parsed.toDeliverySequence;
        }
      }
      expect(fromSeq).toBeUndefined();
      expect(toSeq).toBeUndefined();
      expect(typeof fromDeliverySequence).toBe('number');
      expect(typeof toDeliverySequence).toBe('number');
      expect(typeof totalEvents).toBe('number');
      if (
        typeof fromDeliverySequence !== 'number' ||
        typeof toDeliverySequence !== 'number' ||
        typeof totalEvents !== 'number'
      ) {
        return;
      }
      expect(toDeliverySequence - fromDeliverySequence + 1).toBe(totalEvents);
    });

    it('keeps ReplayStart.fromSeq and ReplayEnd.toSeq on a GM projection', async () => {
      const { stored, matchId } = await driveFogMatch('m-raw-env-gm');
      const authority = stored.filter(
        (event) => typeof event.sequence === 'number',
      );
      expect(authority.length).toBeGreaterThan(1);
      const lastSequence = authority[authority.length - 1].sequence;
      const frames = {
        start: {
          kind: 'ReplayStart' as const,
          matchId,
          ts: nowIso(),
          fromSeq: 0,
          totalEvents: authority.length,
        },
        chunks: [
          {
            kind: 'ReplayChunk' as const,
            matchId,
            ts: nowIso(),
            events: authority as unknown[],
          },
        ],
        end: {
          kind: 'ReplayEnd' as const,
          matchId,
          ts: nowIso(),
          toSeq: lastSequence,
        },
      };
      const gm = await brandedViewer(GM_ROW);
      const playerViewer = await brandedViewer(PLAYER_ROW);
      const gmGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
        gm,
        frames,
      );
      const playerGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
        playerViewer,
        frames,
      );
      expect(gmGuarded.kind).toBe('send');
      expect(playerGuarded.kind).toBe('send');
      if (gmGuarded.kind !== 'send' || playerGuarded.kind !== 'send') return;

      expect(gmGuarded.frames.start.kind).toBe('ReplayStart');
      expect(gmGuarded.frames.end.kind).toBe('ReplayEnd');
      if (
        gmGuarded.frames.start.kind !== 'ReplayStart' ||
        gmGuarded.frames.end.kind !== 'ReplayEnd'
      ) {
        return;
      }
      expect(gmGuarded.frames.start.fromSeq).toBe(0);
      expect(gmGuarded.frames.end.toSeq).toBe(lastSequence);

      expect(playerGuarded.frames.start.kind).toBe('ReplayStart');
      expect(playerGuarded.frames.end.kind).toBe('ReplayEnd');
      if (
        playerGuarded.frames.start.kind !== 'ReplayStart' ||
        playerGuarded.frames.end.kind !== 'ReplayEnd'
      ) {
        return;
      }
      expect(playerGuarded.frames.start.fromSeq).toBeUndefined();
      expect(playerGuarded.frames.end.toSeq).toBeUndefined();
    });
  });

  describe('(e) schema completeness', () => {
    it.failing(
      'FINDING: player-facing EventMessageSchema does not admit event.sequence',
      () => {
        const parsed = EventMessageSchema.safeParse({
          kind: 'Event',
          matchId: 'm-raw-schema',
          ts: nowIso(),
          event: {
            id: 'evt-schema',
            type: 'phase_changed',
            sequence: 7,
          },
          deliverySequence: 0,
        });
        expect(parsed.success).toBe(false);
      },
    );

    it('characterizes the schema finding: z.unknown() currently admits event.sequence', () => {
      const parsed = EventMessageSchema.safeParse({
        kind: 'Event',
        matchId: 'm-raw-schema',
        ts: nowIso(),
        event: {
          id: 'evt-schema',
          type: 'phase_changed',
          sequence: 7,
        },
        deliverySequence: 0,
      });
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      expect(parsed.data.event).toEqual(
        expect.objectContaining({ sequence: 7 }),
      );
    });
  });
});
