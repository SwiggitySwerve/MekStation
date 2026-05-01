/**
 * Tests for the contract fulfillment bus.
 *
 * @spec openspec/changes/wire-encounter-to-campaign-round-trip/specs/contract-types/spec.md
 */
import { describe, it, expect, beforeEach } from '@jest/globals';

import { MissionStatus } from '@/types/campaign/enums/MissionStatus';

import {
  _resetContractFulfilledBus,
  getContractFulfilledListenerCount,
  publishContractFulfilled,
  subscribeToContractFulfilled,
} from '../contractFulfillmentBus';

describe('contractFulfillmentBus', () => {
  beforeEach(() => {
    _resetContractFulfilledBus();
  });

  it('starts with zero listeners', () => {
    expect(getContractFulfilledListenerCount()).toBe(0);
  });

  it('delivers events synchronously to subscribers', () => {
    const seen: string[] = [];
    subscribeToContractFulfilled((event) => seen.push(event.contractId));
    publishContractFulfilled({
      contractId: 'c-1',
      newStatus: MissionStatus.SUCCESS,
      matchId: 'm-1',
      playerWon: true,
      publishedAt: '3025-06-15T00:00:00Z',
    });
    expect(seen).toEqual(['c-1']);
  });

  it('delivers to multiple subscribers', () => {
    const seenA: string[] = [];
    const seenB: string[] = [];
    subscribeToContractFulfilled((event) => seenA.push(event.contractId));
    subscribeToContractFulfilled((event) => seenB.push(event.contractId));
    publishContractFulfilled({
      contractId: 'c-99',
      newStatus: MissionStatus.PARTIAL,
      matchId: 'm-9',
      playerWon: false,
      publishedAt: '3025-06-15T00:00:00Z',
    });
    expect(seenA).toEqual(['c-99']);
    expect(seenB).toEqual(['c-99']);
  });

  it('unsubscribe stops delivery', () => {
    const seen: string[] = [];
    const unsub = subscribeToContractFulfilled((event) =>
      seen.push(event.contractId),
    );
    expect(getContractFulfilledListenerCount()).toBe(1);
    unsub();
    expect(getContractFulfilledListenerCount()).toBe(0);
    publishContractFulfilled({
      contractId: 'c-after-unsub',
      newStatus: MissionStatus.FAILED,
      matchId: 'm-after-unsub',
      playerWon: false,
      publishedAt: '3025-06-15T00:00:00Z',
    });
    expect(seen).toEqual([]);
  });

  it('isolates a buggy listener from other subscribers', () => {
    const seen: string[] = [];
    subscribeToContractFulfilled(() => {
      throw new Error('boom');
    });
    subscribeToContractFulfilled((event) => seen.push(event.contractId));
    expect(() =>
      publishContractFulfilled({
        contractId: 'c-buggy',
        newStatus: MissionStatus.SUCCESS,
        matchId: 'm-1',
        playerWon: true,
        publishedAt: '3025-06-15T00:00:00Z',
      }),
    ).not.toThrow();
    expect(seen).toEqual(['c-buggy']);
  });
});
