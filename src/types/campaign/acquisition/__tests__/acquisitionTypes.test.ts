/**
 * Acquisition Types Tests
 *
 * Tests for AvailabilityRating enum, TN lookup tables, and acquisition interfaces.
 * Uses TDD approach: RED → GREEN → REFACTOR
 */

import {
  AvailabilityRating,
  REGULAR_PART_TN,
  CONSUMABLE_TN,
  AcquisitionStatus,
  IAcquisitionRequest,
  IAcquisitionResult,
  IShoppingList,
} from '../acquisitionTypes';

describe('AvailabilityRating', () => {
  it('should have exactly 7 values (A through X)', () => {
    const values = Object.values(AvailabilityRating);
    expect(values).toHaveLength(7);
  });

  it('should have value A', () => {
    expect(AvailabilityRating.A).toBe('A');
  });

  it('should have value B', () => {
    expect(AvailabilityRating.B).toBe('B');
  });

  it('should have value C', () => {
    expect(AvailabilityRating.C).toBe('C');
  });

  it('should have value D', () => {
    expect(AvailabilityRating.D).toBe('D');
  });

  it('should have value E', () => {
    expect(AvailabilityRating.E).toBe('E');
  });

  it('should have value F', () => {
    expect(AvailabilityRating.F).toBe('F');
  });

  it('should have value X', () => {
    expect(AvailabilityRating.X).toBe('X');
  });
});

describe('REGULAR_PART_TN', () => {
  it('should have TN 3 for rating A', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.A]).toBe(3);
  });

  it('should have TN 4 for rating B', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.B]).toBe(4);
  });

  it('should have TN 6 for rating C', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.C]).toBe(6);
  });

  it('should have TN 8 for rating D', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.D]).toBe(8);
  });

  it('should have TN 10 for rating E', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.E]).toBe(10);
  });

  it('should have TN 11 for rating F', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.F]).toBe(11);
  });

  it('should have TN 13 for rating X', () => {
    expect(REGULAR_PART_TN[AvailabilityRating.X]).toBe(13);
  });

  it('should have all 7 ratings', () => {
    expect(Object.keys(REGULAR_PART_TN)).toHaveLength(7);
  });
});

describe('CONSUMABLE_TN', () => {
  it('should have TN 2 for rating A', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.A]).toBe(2);
  });

  it('should have TN 3 for rating B', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.B]).toBe(3);
  });

  it('should have TN 4 for rating C', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.C]).toBe(4);
  });

  it('should have TN 6 for rating D', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.D]).toBe(6);
  });

  it('should have TN 8 for rating E', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.E]).toBe(8);
  });

  it('should have TN 10 for rating F', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.F]).toBe(10);
  });

  it('should have TN 13 for rating X', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.X]).toBe(13);
  });

  it('should have all 7 ratings', () => {
    expect(Object.keys(CONSUMABLE_TN)).toHaveLength(7);
  });

  it('should be easier than regular parts for most ratings', () => {
    expect(CONSUMABLE_TN[AvailabilityRating.A]).toBeLessThan(
      REGULAR_PART_TN[AvailabilityRating.A],
    );
    expect(CONSUMABLE_TN[AvailabilityRating.D]).toBeLessThan(
      REGULAR_PART_TN[AvailabilityRating.D],
    );
    expect(CONSUMABLE_TN[AvailabilityRating.F]).toBeLessThan(
      REGULAR_PART_TN[AvailabilityRating.F],
    );
  });
});

describe('AcquisitionStatus type', () => {
  it('should accept pending status', () => {
    const status: AcquisitionStatus = 'pending';
    expect(status).toBe('pending');
  });

  it('should accept rolling status', () => {
    const status: AcquisitionStatus = 'rolling';
    expect(status).toBe('rolling');
  });

  it('should accept in_transit status', () => {
    const status: AcquisitionStatus = 'in_transit';
    expect(status).toBe('in_transit');
  });

  it('should accept delivered status', () => {
    const status: AcquisitionStatus = 'delivered';
    expect(status).toBe('delivered');
  });

  it('should accept failed status', () => {
    const status: AcquisitionStatus = 'failed';
    expect(status).toBe('failed');
  });
});

describe('IAcquisitionRequest', () => {
  it('should have all required fields', () => {
    const request: IAcquisitionRequest = {
      id: 'req-001',
      partId: 'part-123',
      partName: 'Autocannon/10',
      quantity: 1,
      availability: AvailabilityRating.D,
      isConsumable: false,
      status: 'pending',
      attempts: 0,
    };

    expect(request.id).toBe('req-001');
    expect(request.partId).toBe('part-123');
    expect(request.partName).toBe('Autocannon/10');
    expect(request.quantity).toBe(1);
    expect(request.availability).toBe(AvailabilityRating.D);
    expect(request.isConsumable).toBe(false);
    expect(request.status).toBe('pending');
    expect(request.attempts).toBe(0);
  });

  it('should support optional orderedDate field', () => {
    const request: IAcquisitionRequest = {
      id: 'req-001',
      partId: 'part-123',
      partName: 'Autocannon/10',
      quantity: 1,
      availability: AvailabilityRating.D,
      isConsumable: false,
      status: 'rolling',
      attempts: 1,
      orderedDate: '2026-01-26T10:00:00Z',
    };

    expect(request.orderedDate).toBe('2026-01-26T10:00:00Z');
  });

  it('should support optional deliveryDate field', () => {
    const request: IAcquisitionRequest = {
      id: 'req-001',
      partId: 'part-123',
      partName: 'Autocannon/10',
      quantity: 1,
      availability: AvailabilityRating.D,
      isConsumable: false,
      status: 'delivered',
      attempts: 1,
      deliveryDate: '2026-02-26T10:00:00Z',
    };

    expect(request.deliveryDate).toBe('2026-02-26T10:00:00Z');
  });

  it('should support optional lastAttemptDate field', () => {
    const request: IAcquisitionRequest = {
      id: 'req-001',
      partId: 'part-123',
      partName: 'Autocannon/10',
      quantity: 1,
      availability: AvailabilityRating.D,
      isConsumable: false,
      status: 'pending',
      attempts: 1,
      lastAttemptDate: '2026-01-26T10:00:00Z',
    };

    expect(request.lastAttemptDate).toBe('2026-01-26T10:00:00Z');
  });

  it('should support consumable parts', () => {
    const request: IAcquisitionRequest = {
      id: 'req-002',
      partId: 'ammo-ac10',
      partName: 'AC/10 Ammo',
      quantity: 10,
      availability: AvailabilityRating.B,
      isConsumable: true,
      status: 'pending',
      attempts: 0,
    };

    expect(request.isConsumable).toBe(true);
    expect(request.quantity).toBe(10);
  });
});

describe('IAcquisitionResult', () => {
  it('should have all required fields for successful roll', () => {
    const result: IAcquisitionResult = {
      requestId: 'req-001',
      success: true,
      roll: 10,
      targetNumber: 8,
      margin: 2,
      transitDays: 30,
      modifiers: [{ name: 'Planetary', value: -1 }],
    };

    expect(result.requestId).toBe('req-001');
    expect(result.success).toBe(true);
    expect(result.roll).toBe(10);
    expect(result.targetNumber).toBe(8);
    expect(result.margin).toBe(2);
    expect(result.transitDays).toBe(30);
    expect(result.modifiers).toHaveLength(1);
  });

  it('should have zero transit days for failed roll', () => {
    const result: IAcquisitionResult = {
      requestId: 'req-001',
      success: false,
      roll: 5,
      targetNumber: 8,
      margin: -3,
      transitDays: 0,
      modifiers: [],
    };

    expect(result.success).toBe(false);
    expect(result.transitDays).toBe(0);
  });

  it('should support multiple modifiers', () => {
    const result: IAcquisitionResult = {
      requestId: 'req-001',
      success: true,
      roll: 12,
      targetNumber: 8,
      margin: 4,
      transitDays: 20,
      modifiers: [
        { name: 'Planetary', value: -1 },
        { name: 'Clan Parts', value: 2 },
        { name: 'Reputation', value: -1 },
      ],
    };

    expect(result.modifiers).toHaveLength(3);
  });
});

describe('IShoppingList', () => {
  it('should contain array of acquisition requests', () => {
    const list: IShoppingList = {
      items: [
        {
          id: 'req-001',
          partId: 'part-123',
          partName: 'Autocannon/10',
          quantity: 1,
          availability: AvailabilityRating.D,
          isConsumable: false,
          status: 'pending',
          attempts: 0,
        },
        {
          id: 'req-002',
          partId: 'ammo-ac10',
          partName: 'AC/10 Ammo',
          quantity: 10,
          availability: AvailabilityRating.B,
          isConsumable: true,
          status: 'pending',
          attempts: 0,
        },
      ],
    };

    expect(list.items).toHaveLength(2);
    expect(list.items[0].partName).toBe('Autocannon/10');
    expect(list.items[1].partName).toBe('AC/10 Ammo');
  });

  it('should support empty shopping list', () => {
    const list: IShoppingList = {
      items: [],
    };

    expect(list.items).toHaveLength(0);
  });
});
