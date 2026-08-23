/**
 * Replica apply-once semantics (design D7, task 3.3).
 *
 * Duplicate, gap, and collision must fail closed or no-op without
 * mutating replica state. Foreign epoch is the same fail-closed family.
 */

import type { ICampaignGrantDeliveryItem } from '../campaignDeliveryTypes';

import {
  applyCampaignGrantDelivery,
  campaignGrantDeliveryIdentity,
  emptyCampaignGrantReplicaState,
} from '../applyCampaignGrantDelivery';

const EPOCH_A = 'a'.repeat(32);
const EPOCH_B = 'b'.repeat(32);

/** Builds a FundsChanged delivery item with a unique reason marker. */
function item(sequence: number, reason: string): ICampaignGrantDeliveryItem {
  return {
    deliverySequence: sequence,
    event: {
      type: 'FundsChanged',
      campaignId: 'campaign-apply',
      ts: '2026-08-22T16:30:00.000Z',
      authorPlayerId: 'pid-host',
      scope: 'campaign',
      payload: { delta: 0, reason, balance: 1 },
    },
  };
}

describe('applyCampaignGrantDelivery', () => {
  it('applies the first contiguous sequence and records its identity', () => {
    const first = item(1, 'ONE');
    const result = applyCampaignGrantDelivery(
      emptyCampaignGrantReplicaState(),
      {
        deliveryEpochId: EPOCH_A,
        item: first,
      },
    );
    expect(result.kind).toBe('applied');
    if (result.kind !== 'applied') return;
    expect(result.state.lastAppliedSequence).toBe(1);
    expect(result.state.applied).toEqual([first]);
    expect(result.state.lastAppliedIdentity).toBe(
      campaignGrantDeliveryIdentity(first.event),
    );
  });

  it('treats re-delivery of an applied sequence as a no-op', () => {
    const first = item(1, 'ONE');
    const applied = applyCampaignGrantDelivery(
      emptyCampaignGrantReplicaState(),
      { deliveryEpochId: EPOCH_A, item: first },
    );
    expect(applied.kind).toBe('applied');
    if (applied.kind !== 'applied') return;
    const snapshot = applied.state;
    const duplicate = applyCampaignGrantDelivery(snapshot, {
      deliveryEpochId: EPOCH_A,
      item: first,
    });
    expect(duplicate.kind).toBe('duplicate');
    if (duplicate.kind !== 'duplicate') return;
    expect(duplicate.state).toBe(snapshot);
    expect(duplicate.state.applied).toHaveLength(1);
  });

  it('fails closed on a gap and names a re-request from the last verified cursor', () => {
    const first = item(1, 'ONE');
    const applied = applyCampaignGrantDelivery(
      emptyCampaignGrantReplicaState(),
      { deliveryEpochId: EPOCH_A, item: first },
    );
    expect(applied.kind).toBe('applied');
    if (applied.kind !== 'applied') return;
    const snapshot = applied.state;
    const gap = applyCampaignGrantDelivery(snapshot, {
      deliveryEpochId: EPOCH_A,
      item: item(3, 'THREE'),
    });
    expect(gap).toEqual({
      kind: 'gap',
      reason: 'delivery-gap',
      lastVerifiedCursor: {
        deliveryEpochId: EPOCH_A,
        afterSequence: 1,
      },
      state: snapshot,
    });
    expect(gap.state.applied).toEqual([first]);
  });

  it('fails closed on a collision and does not replace replica state', () => {
    const first = item(1, 'ONE');
    const applied = applyCampaignGrantDelivery(
      emptyCampaignGrantReplicaState(),
      { deliveryEpochId: EPOCH_A, item: first },
    );
    expect(applied.kind).toBe('applied');
    if (applied.kind !== 'applied') return;
    const snapshot = applied.state;
    const collision = applyCampaignGrantDelivery(snapshot, {
      deliveryEpochId: EPOCH_A,
      item: item(1, 'OTHER-IDENTITY'),
    });
    expect(collision).toEqual({
      kind: 'collision',
      reason: 'delivery-collision',
      lastVerifiedCursor: {
        deliveryEpochId: EPOCH_A,
        afterSequence: 1,
      },
      state: snapshot,
    });
    expect(collision.state.applied[0]?.event.payload).toEqual({
      delta: 0,
      reason: 'ONE',
      balance: 1,
    });
  });

  it('fails closed on a foreign epoch without applying the item', () => {
    const first = item(1, 'ONE');
    const applied = applyCampaignGrantDelivery(
      emptyCampaignGrantReplicaState(),
      { deliveryEpochId: EPOCH_A, item: first },
    );
    expect(applied.kind).toBe('applied');
    if (applied.kind !== 'applied') return;
    const snapshot = applied.state;
    const foreign = applyCampaignGrantDelivery(snapshot, {
      deliveryEpochId: EPOCH_B,
      item: item(2, 'TWO'),
    });
    expect(foreign.kind).toBe('foreign-epoch');
    if (foreign.kind !== 'foreign-epoch') return;
    expect(foreign.reason).toBe('delivery-foreign-epoch');
    expect(foreign.lastVerifiedCursor).toEqual({
      deliveryEpochId: EPOCH_A,
      afterSequence: 1,
    });
    expect(foreign.state).toBe(snapshot);
  });

  it('does not silently mutate state for duplicate, gap, or collision', () => {
    const first = item(1, 'ONE');
    const applied = applyCampaignGrantDelivery(
      emptyCampaignGrantReplicaState(),
      { deliveryEpochId: EPOCH_A, item: first },
    );
    expect(applied.kind).toBe('applied');
    if (applied.kind !== 'applied') return;
    const before = JSON.stringify(applied.state);
    applyCampaignGrantDelivery(applied.state, {
      deliveryEpochId: EPOCH_A,
      item: first,
    });
    applyCampaignGrantDelivery(applied.state, {
      deliveryEpochId: EPOCH_A,
      item: item(4, 'GAP'),
    });
    applyCampaignGrantDelivery(applied.state, {
      deliveryEpochId: EPOCH_A,
      item: item(1, 'COLLIDE'),
    });
    expect(JSON.stringify(applied.state)).toBe(before);
    expect(applied.state.applied).toHaveLength(1);
  });
});
