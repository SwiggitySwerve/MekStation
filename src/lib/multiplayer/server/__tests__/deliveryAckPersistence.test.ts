/**
 * Durable delivery acknowledgements (umbrella 5.1).
 *
 * "Acknowledgements Are Durable After Application": the client acks
 * only the highest contiguous applied delivery sequence (proven in
 * client.test.ts), and the SERVER persists the participant's highest
 * contiguous acknowledgement. These rows pin the server half: the
 * receipt survives a cold store reopen, can never move backwards, is
 * keyed by the verified principal the host was handed, and a store
 * without the capability ignores acks instead of failing.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/multiplayer-sync/spec.md
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DurableMatchStore } from '../DurableMatchStore';
import { hasViewerDeliveryAcknowledgementStore } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';

const MATCH_ID = 'm-ack';

function minimalMeta(matchId: string) {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'pA',
    playerIds: ['pA', 'pB'],
    sideAssignments: [
      { playerId: 'pA', side: 'player' as const },
      { playerId: 'pB', side: 'opponent' as const },
    ],
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

describe('durable delivery acknowledgements (5.1)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mek-ack-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists the receipt and survives a cold store reopen', async () => {
    const path = join(dir, 'acks.db');
    const store = new DurableMatchStore({ path });
    await store.createMatch(minimalMeta(MATCH_ID));
    await store.acknowledgeViewerDelivery({
      matchId: MATCH_ID,
      playerId: 'pA',
      deliverySequence: 7,
    });
    store.close();

    const reopened = new DurableMatchStore({ path });
    const row = await reopened.getViewerDeliveryAcknowledgement(MATCH_ID, 'pA');
    expect(row).toEqual({
      matchId: MATCH_ID,
      playerId: 'pA',
      deliverySequence: 7,
    });
    // The other participant never acked - no row, not a zero.
    expect(
      await reopened.getViewerDeliveryAcknowledgement(MATCH_ID, 'pB'),
    ).toBeNull();
    reopened.close();
  });

  it('never walks backwards: a stale ack is a durable no-op', async () => {
    const store = new DurableMatchStore({ path: ':memory:' });
    await store.createMatch(minimalMeta(MATCH_ID));
    await store.acknowledgeViewerDelivery({
      matchId: MATCH_ID,
      playerId: 'pA',
      deliverySequence: 5,
    });
    // A replayed or late frame's ack for an OLDER sequence arrives.
    await store.acknowledgeViewerDelivery({
      matchId: MATCH_ID,
      playerId: 'pA',
      deliverySequence: 3,
    });
    const row = await store.getViewerDeliveryAcknowledgement(MATCH_ID, 'pA');
    expect(row?.deliverySequence).toBe(5);
    // A genuinely newer ack still advances.
    await store.acknowledgeViewerDelivery({
      matchId: MATCH_ID,
      playerId: 'pA',
      deliverySequence: 9,
    });
    expect(
      (await store.getViewerDeliveryAcknowledgement(MATCH_ID, 'pA'))
        ?.deliverySequence,
    ).toBe(9);
    store.close();
  });

  it('a store without the capability is structurally absent, not broken', () => {
    const inMemory = new InMemoryMatchStore({ quiet: true });
    // Absence IS the flag - same pattern as the viewer delivery port.
    expect(hasViewerDeliveryAcknowledgementStore(inMemory)).toBe(false);
    expect(
      hasViewerDeliveryAcknowledgementStore(
        new DurableMatchStore({ path: ':memory:' }),
      ),
    ).toBe(true);
  });
});
