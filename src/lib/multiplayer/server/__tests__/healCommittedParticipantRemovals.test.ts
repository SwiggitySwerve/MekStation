/**
 * The heal pass reads only the log its entry has not read yet (roadmap unit
 * U89) and still heals every committed removal whose durable revoke failed:
 *
 * - (before) a removal the entry's heal already read, whose revoke failed on
 *   the command path AND on that heal, is healed by a later pass whose read
 *   starts after it.
 * - (after) a removal committed after the entry's remembered sequence with no
 *   revoke at all (a crash between append and revoke) is healed by the next
 *   pass's read.
 *
 * In-memory host, a stub membership whose revoke can be made to throw, and
 * the socket binder; each authenticated GM join runs one heal pass.
 */

import { EventEmitter } from 'node:events';

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { CampaignEventLog } from '@/lib/campaign/sync/campaignEventLog';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';

const MATCH = 'match-campaign';
const CAMPAIGN = 'campaign-sync';

/** A socket the binder writes JSON frames to. */
class MockWireSocket extends EventEmitter {
  readonly sent: IServerMessage[] = [];
  readyState = 1;
  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }
  close(): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
  }
  inbound(message: Record<string, unknown>): void {
    this.emit('message', JSON.stringify(message));
  }
}

/** Lets the binder's handler promise chains settle. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

/** A membership port over sets; `failRevokes` revokes of `pid_guest` throw first. */
function stubMembership(failRevokes: number) {
  const active = new Set(['pid_guest']);
  const revoked = new Set<string>();
  let failures = failRevokes;
  return {
    revokeAttempts: 0,
    isActive: (_c: string, _s: string, participantId: string) =>
      active.has(participantId),
    isRevoked: (_c: string, _s: string, participantId: string) =>
      revoked.has(participantId),
    bind(input: { participantId: string }) {
      active.add(input.participantId);
      return { kind: 'bound' as const };
    },
    revoke(input: { participantId: string }) {
      this.revokeAttempts += 1;
      if (failures > 0) {
        failures -= 1;
        throw new Error('simulated durable revoke interruption');
      }
      active.delete(input.participantId);
      revoked.add(input.participantId);
      return true;
    },
  };
}

/** A registry with one campaign host and a retained guest. */
async function liveEntry() {
  const registry = new CampaignHostRegistry();
  await registry.register(MATCH, {
    campaignId: CAMPAIGN,
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    state: { ...createEmptyCampaignState(CAMPAIGN), balance: 1_000_000 },
  });
  const entry = registry.get(MATCH);
  if (entry === null) throw new Error('no entry');
  expect((await entry.syncSession.joinMember(() => {}, 'pid_guest')).ok).toBe(
    true,
  );
  return { registry, entry };
}

/** Binds a GM socket and sends its CampaignJoin (one heal pass). */
async function gmJoin(
  registry: CampaignHostRegistry,
  membership: ReturnType<typeof stubMembership>,
): Promise<MockWireSocket> {
  const socket = new MockWireSocket();
  await bindCampaignSyncConnection({
    socket,
    registry,
    matchId: MATCH,
    verifiedPlayerId: 'pid_host',
    logger: { error: jest.fn(), log: jest.fn(), warn: jest.fn() },
    membership,
    replicaStore: null,
  });
  socket.inbound({
    kind: 'CampaignJoin',
    matchId: MATCH,
    ts: nowIso(),
    playerId: 'pid_host',
    role: 'host',
    roomCode: 'ABC234',
  });
  await settle();
  return socket;
}

/** The RemoveParticipant intent for `pid_guest`. */
const removeGuest = (intentId: string) => ({
  kind: 'RemoveParticipant' as const,
  campaignId: CAMPAIGN,
  intentId,
  payload: { participantId: 'pid_guest' },
});

describe('heal pass over the entry log it has not read', () => {
  let reads: number[] = [];

  beforeEach(() => {
    reads = [];
    const original = CampaignEventLog.prototype.getCampaignEvents;
    jest
      .spyOn(CampaignEventLog.prototype, 'getCampaignEvents')
      .mockImplementation(function (this: CampaignEventLog, fromSeq = 0) {
        reads.push(fromSeq);
        return original.call(this, fromSeq);
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it('(before) heals a removal read by an earlier pass whose revoke failed, from a read that starts after it', async () => {
    const { registry, entry } = await liveEntry();
    const membership = stubMembership(2);
    const gm = await gmJoin(registry, membership);

    // Committed, then the command path's revoke throws (failure 1).
    gm.inbound({
      kind: 'CampaignHostIntent',
      matchId: MATCH,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: removeGuest('remove-before'),
    });
    await settle();
    const removal = (await entry.host.getEventLog().getCampaignEvents(0)).at(
      -1,
    );
    expect(removal).toMatchObject({
      type: 'ParticipantRemoved',
      payload: { participantId: 'pid_guest' },
    });
    if (removal === undefined) return;

    // This pass reads the removal and its revoke throws again (failure 2).
    await gmJoin(registry, membership);
    expect(membership.isRevoked(CAMPAIGN, MATCH, 'pid_guest')).toBe(false);

    reads = [];
    await gmJoin(registry, membership);
    const healRead = reads[0];

    expect(healRead).toBeGreaterThan(removal.sequence);
    expect(membership.revokeAttempts).toBe(3);
    expect(membership.isRevoked(CAMPAIGN, MATCH, 'pid_guest')).toBe(true);
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual(
      expect.objectContaining({ ok: true }),
    );
  });

  it('(after) heals a removal committed after the remembered sequence with no revoke at all', async () => {
    const { registry, entry } = await liveEntry();
    const membership = stubMembership(0);
    await gmJoin(registry, membership);
    const remembered = await entry.host.getEventLog().nextSequence();

    // Appended without the binder: no revoke ran, as after a crash.
    expect(
      (await entry.host.applyHostIntent(removeGuest('remove-after'))).ok,
    ).toBe(true);
    expect(membership.isRevoked(CAMPAIGN, MATCH, 'pid_guest')).toBe(false);

    reads = [];
    await gmJoin(registry, membership);

    expect(reads[0]).toBe(remembered);
    expect(membership.isRevoked(CAMPAIGN, MATCH, 'pid_guest')).toBe(true);
    expect(await entry.syncSession.evaluateScenarioLaunch()).toEqual(
      expect.objectContaining({ ok: true }),
    );
  });
});
