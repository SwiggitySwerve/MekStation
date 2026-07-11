/**
 * Maintenance and repair invariant tests (spec "Maintenance and Repair
 * Invariants Across a Fast-Forwarded Run").
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */
import { describe, expect, it } from '@jest/globals';

import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import {
  assertDailyRepairHoursBounded,
  assertNoDuplicateRepairTickets,
  assertRepairQueueIdempotentAcrossRerun,
  assertRepairsWithinMaxCaps,
} from '../maintenance';

function makeTicket(overrides: Partial<IRepairTicket> = {}): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-1',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 10,
    expectedHours: 4,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: '3025-06-15T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

function makePartsItem(
  overrides: Partial<IPartsInventoryItem> = {},
): IPartsInventoryItem {
  return {
    inventoryId: 'lot-1',
    partId: 'standard-armor-plate',
    partName: 'Standard Armor Plate',
    quantity: 5,
    source: 'salvage',
    acquiredAt: '3025-06-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('assertDailyRepairHoursBounded', () => {
  it('passes when the total progress applied that day is within the 8-hour budget', () => {
    const before = [
      makeTicket({ ticketId: 't1', expectedHours: 4, status: 'queued' }),
      makeTicket({ ticketId: 't2', expectedHours: 4, status: 'queued' }),
    ];
    const after = [
      makeTicket({
        ticketId: 't1',
        expectedHours: 4,
        status: 'completed',
        remainingHours: 0,
      }),
      makeTicket({
        ticketId: 't2',
        expectedHours: 4,
        status: 'completed',
        remainingHours: 0,
      }),
    ];
    // 4 + 4 = 8 hours applied — exactly at budget.
    expect(() => assertDailyRepairHoursBounded(before, after)).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where more than 8 hours of progress landed in one day', () => {
    const before = [
      makeTicket({ ticketId: 't1', expectedHours: 6, status: 'queued' }),
      makeTicket({ ticketId: 't2', expectedHours: 6, status: 'queued' }),
    ];
    const after = [
      // Both fully completed in the SAME day — 12 hours of progress,
      // which the real processor's remainingHours pool could never
      // produce (it caps at 8 total), but a corrupted fixture can.
      makeTicket({
        ticketId: 't1',
        expectedHours: 6,
        status: 'completed',
        remainingHours: 0,
      }),
      makeTicket({
        ticketId: 't2',
        expectedHours: 6,
        status: 'completed',
        remainingHours: 0,
      }),
    ];
    expect(() => assertDailyRepairHoursBounded(before, after)).toThrow(
      /exceeds the daily budget/,
    );
  });

  it('ignores newly-created tickets with no `before` match', () => {
    const before: IRepairTicket[] = [];
    const after = [makeTicket({ ticketId: 't-new', status: 'queued' })];
    expect(() => assertDailyRepairHoursBounded(before, after)).not.toThrow();
  });
});

describe('assertRepairsWithinMaxCaps', () => {
  const maxStates: Record<string, IUnitMaxState> = {
    'unit-1': {
      unitId: 'unit-1',
      maxArmorPerLocation: { CT: 20 },
      maxStructurePerLocation: { CT: 10 },
      maxAmmoPerBin: { 'bin-1': 20 },
    },
  };

  function makeState(
    overrides: Partial<IUnitCombatState> = {},
  ): IUnitCombatState {
    return {
      unitId: 'unit-1',
      currentArmorPerLocation: { CT: 20 },
      currentStructurePerLocation: { CT: 10 },
      destroyedLocations: [],
      destroyedComponents: [],
      heatEnd: 0,
      ammoRemaining: { 'bin-1': 20 },
      combatReady: true,
      lastCombatOutcomeId: null,
      lastUpdated: null,
      ...overrides,
    };
  }

  it('passes when every value is at or below its declared max', () => {
    const states = { 'unit-1': makeState() };
    expect(() => assertRepairsWithinMaxCaps(states, maxStates)).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where armor exceeds the max cap', () => {
    const states = {
      'unit-1': makeState({ currentArmorPerLocation: { CT: 25 } }),
    };
    expect(() => assertRepairsWithinMaxCaps(states, maxStates)).toThrow(
      /armor 25 exceeds max 20/,
    );
  });

  it('fails loud on a deliberately-violated fixture where structure exceeds the max cap', () => {
    const states = {
      'unit-1': makeState({ currentStructurePerLocation: { CT: 15 } }),
    };
    expect(() => assertRepairsWithinMaxCaps(states, maxStates)).toThrow(
      /structure 15 exceeds max 10/,
    );
  });

  it('fails loud on a deliberately-violated fixture where ammo exceeds the max cap', () => {
    const states = {
      'unit-1': makeState({ ammoRemaining: { 'bin-1': 30 } }),
    };
    expect(() => assertRepairsWithinMaxCaps(states, maxStates)).toThrow(
      /ammo bin bin-1 rounds 30 exceeds max 20/,
    );
  });

  it('skips units with no declared max state', () => {
    const states = { 'unit-unknown': makeState({ unitId: 'unit-unknown' }) };
    expect(() => assertRepairsWithinMaxCaps(states, maxStates)).not.toThrow();
  });
});

describe('assertNoDuplicateRepairTickets', () => {
  it('passes when every ticketId is unique', () => {
    const queue = [
      makeTicket({ ticketId: 't1' }),
      makeTicket({ ticketId: 't2' }),
    ];
    expect(() => assertNoDuplicateRepairTickets(queue)).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture with a duplicate ticketId', () => {
    const queue = [
      makeTicket({ ticketId: 't1' }),
      makeTicket({ ticketId: 't1' }),
    ];
    expect(() => assertNoDuplicateRepairTickets(queue)).toThrow(/t1 \(x2\)/);
  });
});

describe('assertRepairQueueIdempotentAcrossRerun', () => {
  it('passes when re-running the same pass changed nothing', () => {
    const snapshot = {
      repairQueue: [
        makeTicket({ ticketId: 't1', status: 'completed', remainingHours: 0 }),
      ],
      partsInventory: [makePartsItem({ quantity: 3 })],
    };
    expect(() =>
      assertRepairQueueIdempotentAcrossRerun(snapshot, snapshot),
    ).not.toThrow();
  });

  it("fails loud on a deliberately-violated fixture where a completed ticket's parts were consumed again on re-run", () => {
    const before = {
      repairQueue: [
        makeTicket({ ticketId: 't1', status: 'completed', remainingHours: 0 }),
      ],
      partsInventory: [makePartsItem({ quantity: 3 })],
    };
    const after = {
      repairQueue: [
        makeTicket({ ticketId: 't1', status: 'completed', remainingHours: 0 }),
      ],
      partsInventory: [makePartsItem({ quantity: 2 })], // consumed again
    };
    expect(() => assertRepairQueueIdempotentAcrossRerun(before, after)).toThrow(
      /quantity changed on re-run/,
    );
  });

  it("fails loud on a deliberately-violated fixture where a ticket's status/hours drifted on re-run", () => {
    const before = {
      repairQueue: [
        makeTicket({
          ticketId: 't1',
          status: 'in-progress',
          remainingHours: 2,
        }),
      ],
      partsInventory: [] as IPartsInventoryItem[],
    };
    const after = {
      repairQueue: [
        makeTicket({ ticketId: 't1', status: 'completed', remainingHours: 0 }),
      ],
      partsInventory: [] as IPartsInventoryItem[],
    };
    expect(() => assertRepairQueueIdempotentAcrossRerun(before, after)).toThrow(
      /changed on re-run/,
    );
  });

  it('fails loud on a deliberately-violated fixture where a new ticket appeared on re-run', () => {
    const before = {
      repairQueue: [] as IRepairTicket[],
      partsInventory: [] as IPartsInventoryItem[],
    };
    const after = {
      repairQueue: [makeTicket({ ticketId: 't-unexpected' })],
      partsInventory: [] as IPartsInventoryItem[],
    };
    expect(() => assertRepairQueueIdempotentAcrossRerun(before, after)).toThrow(
      /appeared on the re-run/,
    );
  });
});
