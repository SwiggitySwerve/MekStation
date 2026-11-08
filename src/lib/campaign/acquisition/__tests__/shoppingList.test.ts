/**
 * Shopping List Queue Management Tests
 *
 * TDD approach: RED → GREEN → REFACTOR
 * Tests cover all queue operations and immutability guarantees.
 */

import {
  IAcquisitionRequest,
  AvailabilityRating,
} from '@/types/campaign/acquisition/acquisitionTypes';

import {
  createShoppingList,
  addRequest,
  removeRequest,
  updateRequest,
  findRequest,
  getPendingRequests,
  getInTransitRequests,
  getDeliveredRequests,
  normalizeShoppingList,
  canAttemptAcquisition,
  ACQUISITION_RETRY_WAIT_DAYS,
} from '../shoppingList';

describe('Shopping List Queue Management', () => {
  // Helper to create test requests
  const createTestRequest = (
    overrides?: Partial<IAcquisitionRequest>,
  ): IAcquisitionRequest => ({
    id: 'req-1',
    partId: 'part-1',
    partName: 'Test Part',
    quantity: 1,
    availability: AvailabilityRating.D,
    isConsumable: false,
    status: 'pending',
    attempts: 0,
    ...overrides,
  });

  describe('createShoppingList', () => {
    it('uses seven campaign days across DST for retry eligibility', () => {
      expect(ACQUISITION_RETRY_WAIT_DAYS).toBe(7);
      const request = createTestRequest({
        attempts: 2,
        lastAttemptDate: new Date(2026, 9, 28, 12).toISOString(),
      });
      expect(canAttemptAcquisition(request, new Date(2026, 10, 3, 12))).toBe(
        false,
      );
      expect(canAttemptAcquisition(request, new Date(2026, 10, 4, 12))).toBe(
        true,
      );
      expect(
        canAttemptAcquisition(
          { ...request, status: 'delivered' },
          new Date(2026, 10, 4, 12),
        ),
      ).toBe(false);
    });

    it('normalizes legacy duplicates deterministically and idempotently without losing rows', () => {
      const date = new Date('3025-01-15T00:00:00.000Z');
      const list = {
        items: [
          createTestRequest({ id: 'same', status: 'failed', attempts: 2 }),
          createTestRequest({ id: 'same', status: 'delivered', quantity: 3 }),
          createTestRequest({ id: 'same-legacy-1' }),
          createTestRequest({ id: 'same', status: 'in_transit', quantity: 4 }),
        ],
      };
      const inventory = [
        {
          inventoryId: 'acquisition-same',
          partId: 'part-1',
          partName: 'Test Part',
          quantity: 3,
          source: 'acquisition' as const,
          acquiredAt: date.toISOString(),
        },
      ];
      const normalized = normalizeShoppingList(list, date, inventory);
      expect(normalized?.items).toHaveLength(4);
      expect(new Set(normalized?.items.map((item) => item.id)).size).toBe(4);
      expect(normalized?.items[1]).toEqual(list.items[1]);
      expect(normalized?.items[0]).toMatchObject({
        status: 'pending',
        attempts: 2,
        lastAttemptDate: date.toISOString(),
      });
      expect(normalized?.items.map((item) => item.quantity)).toEqual([
        1, 3, 1, 4,
      ]);
      expect(normalizeShoppingList(list, date, inventory)).toEqual(normalized);
      expect(
        normalizeShoppingList(normalized, new Date('3025-02-01'), inventory),
      ).toEqual(normalized);
      expect(list.items[0].status).toBe('failed');
    });
    it('should return an empty shopping list', () => {
      const list = createShoppingList();
      expect(list.items).toEqual([]);
      expect(list.items.length).toBe(0);
    });

    it('should return a new list each time', () => {
      const list1 = createShoppingList();
      const list2 = createShoppingList();
      expect(list1).not.toBe(list2);
      expect(list1.items).not.toBe(list2.items);
    });
  });

  describe('addRequest', () => {
    it('rejects duplicate IDs instead of introducing an ambiguous update target', () => {
      const request = createTestRequest();
      const list = addRequest(createShoppingList(), request);
      expect(() => addRequest(list, request)).toThrow(
        'Acquisition request ID already exists',
      );
      expect(list.items).toEqual([request]);
    });
    it('should add a request to an empty list', () => {
      const list = createShoppingList();
      const request = createTestRequest();
      const updated = addRequest(list, request);

      expect(updated.items.length).toBe(1);
      expect(updated.items[0]).toEqual(request);
    });

    it('should add multiple requests in sequence', () => {
      let list = createShoppingList();
      const req1 = createTestRequest({ id: 'req-1' });
      const req2 = createTestRequest({ id: 'req-2' });
      const req3 = createTestRequest({ id: 'req-3' });

      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      expect(list.items.length).toBe(3);
      expect(list.items[0].id).toBe('req-1');
      expect(list.items[1].id).toBe('req-2');
      expect(list.items[2].id).toBe('req-3');
    });

    it('should maintain immutability (original list unchanged)', () => {
      const list = createShoppingList();
      const request = createTestRequest();
      const updated = addRequest(list, request);

      expect(list.items.length).toBe(0);
      expect(updated.items.length).toBe(1);
      expect(list).not.toBe(updated);
    });

    it('should preserve existing items when adding new request', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      const req2 = createTestRequest({ id: 'req-2' });
      let list = createShoppingList();

      list = addRequest(list, req1);
      const updated = addRequest(list, req2);

      expect(updated.items.length).toBe(2);
      expect(updated.items[0]).toEqual(req1);
      expect(updated.items[1]).toEqual(req2);
    });
  });

  describe('removeRequest', () => {
    it('should remove a request by ID', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      const req2 = createTestRequest({ id: 'req-2' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);

      const updated = removeRequest(list, 'req-1');

      expect(updated.items.length).toBe(1);
      expect(updated.items[0].id).toBe('req-2');
    });

    it('should not remove if ID does not exist', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const updated = removeRequest(list, 'nonexistent');

      expect(updated.items.length).toBe(1);
      expect(updated.items[0].id).toBe('req-1');
    });

    it('should maintain immutability (original list unchanged)', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const updated = removeRequest(list, 'req-1');

      expect(list.items.length).toBe(1);
      expect(updated.items.length).toBe(0);
      expect(list).not.toBe(updated);
    });

    it('should remove correct request when multiple exist', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      const req2 = createTestRequest({ id: 'req-2' });
      const req3 = createTestRequest({ id: 'req-3' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      const updated = removeRequest(list, 'req-2');

      expect(updated.items.length).toBe(2);
      expect(updated.items[0].id).toBe('req-1');
      expect(updated.items[1].id).toBe('req-3');
    });
  });

  describe('updateRequest', () => {
    it('should update a request by ID with partial updates', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const updated = updateRequest(list, 'req-1', { status: 'in_transit' });

      expect(updated.items[0].status).toBe('in_transit');
      expect(updated.items[0].id).toBe('req-1');
    });

    it('should update multiple fields', () => {
      const req1 = createTestRequest({
        id: 'req-1',
        attempts: 0,
        status: 'pending',
      });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const updated = updateRequest(list, 'req-1', {
        attempts: 1,
        status: 'rolling',
        lastAttemptDate: '2025-01-26',
      });

      expect(updated.items[0].attempts).toBe(1);
      expect(updated.items[0].status).toBe('rolling');
      expect(updated.items[0].lastAttemptDate).toBe('2025-01-26');
    });

    it('should not update if ID does not exist', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const updated = updateRequest(list, 'nonexistent', {
        status: 'in_transit',
      });

      expect(updated.items[0].status).toBe('pending');
    });

    it('should maintain immutability (original list unchanged)', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const updated = updateRequest(list, 'req-1', { status: 'in_transit' });

      expect(list.items[0].status).toBe('pending');
      expect(updated.items[0].status).toBe('in_transit');
      expect(list).not.toBe(updated);
    });

    it('should preserve other items when updating one', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'pending' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);

      const updated = updateRequest(list, 'req-1', { status: 'in_transit' });

      expect(updated.items.length).toBe(2);
      expect(updated.items[0].status).toBe('in_transit');
      expect(updated.items[1].status).toBe('pending');
    });
  });

  describe('findRequest', () => {
    it('should find a request by ID', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const found = findRequest(list, 'req-1');

      expect(found).toEqual(req1);
    });

    it('should return undefined if request not found', () => {
      const req1 = createTestRequest({ id: 'req-1' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const found = findRequest(list, 'nonexistent');

      expect(found).toBeUndefined();
    });

    it('should find correct request when multiple exist', () => {
      const req1 = createTestRequest({ id: 'req-1', partName: 'Part A' });
      const req2 = createTestRequest({ id: 'req-2', partName: 'Part B' });
      const req3 = createTestRequest({ id: 'req-3', partName: 'Part C' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      const found = findRequest(list, 'req-2');

      expect(found?.partName).toBe('Part B');
    });

    it('should return undefined on empty list', () => {
      const list = createShoppingList();
      const found = findRequest(list, 'req-1');

      expect(found).toBeUndefined();
    });
  });

  describe('getPendingRequests', () => {
    it('should return only pending requests', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'in_transit' });
      const req3 = createTestRequest({ id: 'req-3', status: 'pending' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      const pending = getPendingRequests(list);

      expect(pending.length).toBe(2);
      expect(pending[0].id).toBe('req-1');
      expect(pending[1].id).toBe('req-3');
    });

    it('should return empty array if no pending requests', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'in_transit' });
      const req2 = createTestRequest({ id: 'req-2', status: 'delivered' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);

      const pending = getPendingRequests(list);

      expect(pending.length).toBe(0);
    });

    it('should return empty array on empty list', () => {
      const list = createShoppingList();
      const pending = getPendingRequests(list);

      expect(pending.length).toBe(0);
    });

    it('should return readonly array', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      let list = createShoppingList();
      list = addRequest(list, req1);

      const pending = getPendingRequests(list);

      expect(Array.isArray(pending)).toBe(true);
    });
  });

  describe('getInTransitRequests', () => {
    it('should return only in_transit requests', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'in_transit' });
      const req3 = createTestRequest({ id: 'req-3', status: 'in_transit' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      const inTransit = getInTransitRequests(list);

      expect(inTransit.length).toBe(2);
      expect(inTransit[0].id).toBe('req-2');
      expect(inTransit[1].id).toBe('req-3');
    });

    it('should return empty array if no in_transit requests', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'delivered' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);

      const inTransit = getInTransitRequests(list);

      expect(inTransit.length).toBe(0);
    });

    it('should return empty array on empty list', () => {
      const list = createShoppingList();
      const inTransit = getInTransitRequests(list);

      expect(inTransit.length).toBe(0);
    });
  });

  describe('getDeliveredRequests', () => {
    it('should return only delivered requests', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'delivered' });
      const req3 = createTestRequest({ id: 'req-3', status: 'delivered' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      const delivered = getDeliveredRequests(list);

      expect(delivered.length).toBe(2);
      expect(delivered[0].id).toBe('req-2');
      expect(delivered[1].id).toBe('req-3');
    });

    it('should return empty array if no delivered requests', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'in_transit' });
      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);

      const delivered = getDeliveredRequests(list);

      expect(delivered.length).toBe(0);
    });

    it('should return empty array on empty list', () => {
      const list = createShoppingList();
      const delivered = getDeliveredRequests(list);

      expect(delivered.length).toBe(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple operations in sequence', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'pending' });
      const req3 = createTestRequest({ id: 'req-3', status: 'pending' });

      let list = createShoppingList();
      list = addRequest(list, req1);
      list = addRequest(list, req2);
      list = addRequest(list, req3);

      list = updateRequest(list, 'req-1', { status: 'in_transit' });
      list = removeRequest(list, 'req-3');
      list = updateRequest(list, 'req-2', { status: 'delivered' });

      expect(list.items.length).toBe(2);
      expect(getPendingRequests(list).length).toBe(0);
      expect(getInTransitRequests(list).length).toBe(1);
      expect(getDeliveredRequests(list).length).toBe(1);
    });

    it('should maintain immutability through operation chain', () => {
      const req1 = createTestRequest({ id: 'req-1', status: 'pending' });
      const req2 = createTestRequest({ id: 'req-2', status: 'pending' });

      let list1 = createShoppingList();
      list1 = addRequest(list1, req1);
      list1 = addRequest(list1, req2);

      const list2 = updateRequest(list1, 'req-1', { status: 'in_transit' });

      expect(list1.items[0].status).toBe('pending');
      expect(list2.items[0].status).toBe('in_transit');
    });

    it('should correctly filter after multiple updates', () => {
      let list = createShoppingList();
      const requests = [
        createTestRequest({ id: 'req-1', status: 'pending' }),
        createTestRequest({ id: 'req-2', status: 'pending' }),
        createTestRequest({ id: 'req-3', status: 'pending' }),
      ];

      for (const req of requests) {
        list = addRequest(list, req);
      }

      list = updateRequest(list, 'req-1', { status: 'in_transit' });
      list = updateRequest(list, 'req-2', { status: 'delivered' });

      expect(getPendingRequests(list).length).toBe(1);
      expect(getInTransitRequests(list).length).toBe(1);
      expect(getDeliveredRequests(list).length).toBe(1);
    });
  });
});
