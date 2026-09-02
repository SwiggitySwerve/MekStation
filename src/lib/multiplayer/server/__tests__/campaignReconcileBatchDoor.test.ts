/**
 * The reconcile path commits its three doors as ONE atomic batch, and
 * records the battle before it can be re-entered (finding #78).
 *
 * TWO defects, one seam. With no combat-outcome inbox on the store -
 * production's shape until the 5.7 cutover - `reconcileCoopBattle` walks
 * three separate host doors: funds, salvage, roster. Each door takes the
 * host's write lock on its own, so the walk is three critical sections
 * with two gaps in the middle, and the socket binding's dedup guard read
 * `hasReconciledBattle` and wrote `recordReconciledBattle` on opposite
 * sides of the whole `await`.
 *
 * 1. Two ReconcileBattle frames for one battle both passed the guard and
 *    both walked. The funds door carries an intentId and deduped; the
 *    salvage and roster doors carry no identity and re-committed - five
 *    events where the battle produced three.
 * 2. A writer racing the walk landed BETWEEN funds and salvage, so a
 *    mirror observed a ledger with the battle's payout applied and its
 *    salvage missing.
 *
 * The fix is one batch door on the host plus a record that lands before
 * the first await - and is CLEARED when the walk fails, so a reconcile
 * that was rejected stays retryable rather than being permanently
 * swallowed by its own dedup guard.
 *
 * NOT CLAIMED: the salvage and roster doors do not become idempotent.
 * The WALK becomes atomic; a direct caller of `creditSalvagePool` twice
 * still credits twice. Exclusion is per host OBJECT, so a second host
 * instance or the HTTP command route still races. The inbox path is
 * untouched.
 */

import { EventEmitter } from 'node:events';

import type { ICoopBattleConsequences } from '@/lib/campaign/coop/reconcileCoopBattle';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';
import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';
import { CampaignMatchHost } from '../CampaignMatchHost';

const CAMPAIGN_ID = 'campaign-1';
const HOST_ID = 'host-player-1';
const MATCH_ID = 'campaign-sync-match-1';
const BATTLE_ID = 'combat-match-1';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(): void {
    this.readyState = 3;
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown>): void {
    this.emit('message', JSON.stringify(message));
  }
}

const quietLogger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };

/**
 * Drain the microtask queue. Sized like the sibling reconcile suite: one
 * lock acquisition costs a promise hop, and a walk takes several.
 */
async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    await Promise.resolve();
  }
}

function stateWith(balance: number): ICampaignAuthoritativeState {
  return {
    ...createEmptyCampaignState(CAMPAIGN_ID),
    balance,
    salvagePool: 0,
    rosterUnits: {
      'unit-1': {
        unitId: 'unit-1',
        designation: 'Atlas AS7-D',
        status: 'operational',
      },
    },
  };
}

function consequences(
  battleMatchId: string,
  fundsDelta: number,
): ICoopBattleConsequences {
  return {
    campaignId: CAMPAIGN_ID,
    matchId: battleMatchId,
    fundsDelta,
    fundsReason: `Co-op mission resolution (${battleMatchId})`,
    salvageValue: 50_000,
    rosterChanges: [
      { unitId: 'unit-1', designation: 'Atlas AS7-D', status: 'destroyed' },
    ],
  };
}

function reconcileFrame(
  battleMatchId: string,
  fundsDelta: number,
): Record<string, unknown> {
  return {
    kind: 'CampaignHostIntent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: HOST_ID,
    intent: {
      kind: 'ReconcileBattle',
      campaignId: CAMPAIGN_ID,
      intentId: `coop-recon-${battleMatchId}`,
      payload: consequences(battleMatchId, fundsDelta),
    },
  };
}

function spend(amount: number, intentId: string): ICampaignIntent {
  return {
    campaignId: CAMPAIGN_ID,
    intentId,
    kind: 'SpendFunds',
    payload: { amount, reason: 'ammunition' },
  } as unknown as ICampaignIntent;
}

/** A host with its own subscriber buffer, baseline snapshot discarded. */
async function makeHost(): Promise<{
  host: CampaignMatchHost;
  received: ICampaignEvent[];
}> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: stateWith(1_000_000),
  });
  const received: ICampaignEvent[] = [];
  host.subscribe((event) => received.push(event));
  await host.open();
  return { host, received };
}

/** A registry + a bound, joined host socket, with the host's own buffer. */
async function makeBoundHostSocket(): Promise<{
  registry: CampaignHostRegistry;
  socket: MockWireSocket;
  received: ICampaignEvent[];
}> {
  const registry = new CampaignHostRegistry();
  await registry.register(MATCH_ID, {
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    roomCode: 'ABC234',
    state: stateWith(1_000_000),
  });
  const socket = new MockWireSocket();
  await bindCampaignSyncConnection({
    socket,
    registry,
    matchId: MATCH_ID,
    verifiedPlayerId: HOST_ID,
    logger: quietLogger,
    replicaStore: null,
  });
  socket.inbound({
    kind: 'CampaignJoin',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: HOST_ID,
    role: 'host',
    roomCode: 'ABC234',
  });
  await flushAsyncHandlers();
  const received: ICampaignEvent[] = [];
  registry.get(MATCH_ID)!.host.subscribe((event) => received.push(event));
  return { registry, socket, received };
}

describe('reconcile batch door — finding #78', () => {
  it('R1: a duplicate ReconcileBattle frame commits nothing twice', async () => {
    const { socket, received } = await makeBoundHostSocket();

    // Back to back with NO drain between them: `emit` is synchronous, so
    // the second handler starts while the first is suspended on its
    // walk. That is exactly the shape a client retry produces, and the
    // shape the guard has to survive - draining between the frames tests
    // a sequence the defect never had trouble with.
    socket.inbound(reconcileFrame(BATTLE_ID, -25_000));
    socket.inbound(reconcileFrame(BATTLE_ID, -25_000));
    await flushAsyncHandlers();

    expect(received.map((event) => [event.sequence, event.type])).toEqual([
      [1, 'FundsChanged'],
      [2, 'SalvageAllocated'],
      [3, 'RosterUnitChanged'],
    ]);
  });

  it('R2: a writer racing the walk cannot land between funds and salvage', async () => {
    const { host, received } = await makeHost();

    // Started but not awaited, then a second writer immediately behind
    // it - the socket shape where a GM intent arrives while the
    // post-battle walk is in flight.
    const walk = reconcileCoopBattle(host, consequences(BATTLE_ID, -25_000));
    const racer = host.applyHostIntent(spend(10_000, 'racer-intent-1'));
    const [walkResult, racerResult] = await Promise.all([walk, racer]);

    expect(walkResult.ok).toBe(true);
    expect(racerResult.ok).toBe(true);
    // Literal sequences, not expect.any(Number): the whole claim is
    // WHERE the racer landed, and a matcher that accepts any number
    // cannot tell contiguous from interleaved.
    expect(received.map((event) => [event.sequence, event.type])).toEqual([
      [0, 'CampaignSnapshotPublished'],
      [1, 'FundsChanged'],
      [2, 'SalvageAllocated'],
      [3, 'RosterUnitChanged'],
      [4, 'FundsChanged'],
    ]);
  });

  it('R3: the batch door does not deadlock on the doors it wraps', async () => {
    const { host } = await makeHost();

    // A deadlocked batch never settles, so a macrotask timer is a sound
    // referee: microtasks drain before timers, and the healthy walk is
    // all microtasks. A batch door that handed its body the LOCKING
    // doors would queue each one behind the batch's own acquisition and
    // hang here forever.
    const settled = await Promise.race([
      host.runBatchExclusive(async (doors) => {
        const funds = await doors.applyHostIntent(
          spend(25_000, 'batch-door-funds'),
        );
        const salvage = await doors.creditSalvagePool(50_000, 'batch-door');
        const roster = await doors.applyRosterUnitChange(
          CAMPAIGN_ID,
          'removed',
          {
            unitId: 'unit-1',
            designation: 'Atlas AS7-D',
            status: 'destroyed',
          },
          'batch-door-roster',
        );
        return [funds.ok, salvage.ok, roster.ok];
      }),
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('deadlocked'), 0);
      }),
    ]);

    expect(settled).toEqual([true, true, true]);
  });

  it('R4: a failed walk leaves the battle un-recorded so a retry is admitted', async () => {
    const { registry, socket, received } = await makeBoundHostSocket();
    const entry = registry.get(MATCH_ID)!;

    // A debit the campaign cannot afford: the funds door rejects, the
    // walk stops, and NOTHING commits.
    socket.inbound(reconcileFrame(BATTLE_ID, -5_000_000));
    await flushAsyncHandlers();

    expect(received).toHaveLength(0);
    expect(entry.hasReconciledBattle(BATTLE_ID)).toBe(false);

    // The same battle, now affordable. A guard that recorded the failed
    // attempt would swallow this retry and the battle would never
    // reconcile at all.
    socket.inbound(reconcileFrame(BATTLE_ID, -25_000));
    await flushAsyncHandlers();

    expect(received.map((event) => [event.sequence, event.type])).toEqual([
      [1, 'FundsChanged'],
      [2, 'SalvageAllocated'],
      [3, 'RosterUnitChanged'],
    ]);
    expect(entry.hasReconciledBattle(BATTLE_ID)).toBe(true);
  });

  it('R5: a thrown walk leaves the battle un-recorded so a retry is admitted', async () => {
    const { registry, socket, received } = await makeBoundHostSocket();
    const entry = registry.get(MATCH_ID)!;

    // The walk itself throws - not a typed not-ok. R4 covers a rejected
    // funds door; this row is the other failure shape: an exception
    // escaping reconcileCoopBattle. The record is written before the
    // await, so a handler that only clears on `!result.ok` leaves the
    // battle marked reconciled and swallows the reconnect's retry.
    const thrownWalk = jest
      .spyOn(entry.host, 'runBatchExclusive')
      .mockRejectedValueOnce(new Error('walk-threw'));

    socket.inbound(reconcileFrame(BATTLE_ID, -25_000));
    await flushAsyncHandlers();

    expect(received).toHaveLength(0);
    expect(entry.hasReconciledBattle(BATTLE_ID)).toBe(false);

    thrownWalk.mockRestore();

    // Dispatch-failed closed the first socket. The retry is a new
    // connection to the same host entry - the production reconnect.
    const retry = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: retry,
      registry,
      matchId: MATCH_ID,
      verifiedPlayerId: HOST_ID,
      logger: quietLogger,
      replicaStore: null,
    });
    retry.inbound({
      kind: 'CampaignJoin',
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: HOST_ID,
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    retry.inbound(reconcileFrame(BATTLE_ID, -25_000));
    await flushAsyncHandlers();

    expect(received.map((event) => [event.sequence, event.type])).toEqual([
      [1, 'FundsChanged'],
      [2, 'SalvageAllocated'],
      [3, 'RosterUnitChanged'],
    ]);
    expect(entry.hasReconciledBattle(BATTLE_ID)).toBe(true);
  });
});
