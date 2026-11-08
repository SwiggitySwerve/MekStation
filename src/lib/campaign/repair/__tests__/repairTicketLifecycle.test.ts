import type { IRepairTicket } from '@/types/campaign/RepairTicket';

import { createInitialCombatState } from '@/types/campaign/UnitCombatState';

import { applyCompletedRepair } from '../repairTicketLifecycle';

const updatedAt = '3025-03-01T00:00:00.000Z';
const state = {
  ...createInitialCombatState({
    unitId: 'unit-alpha',
    armorPerLocation: { CT: 4, LT: 2 },
    structurePerLocation: { CT: 0, LT: 3 },
    ammoPerBin: { bin: 2 },
  }),
  combatReady: false,
  destroyedLocations: ['CT', 'RA'],
  heatEnd: 12,
  destroyedComponents: [
    {
      location: 'LT',
      slot: 0,
      componentType: 'weapon',
      name: 'Laser',
      destroyedAt: 'match-1',
    },
    {
      location: 'RA',
      slot: 0,
      componentType: 'weapon',
      name: 'Laser',
      destroyedAt: 'match-1',
    },
  ],
};
const maxState = {
  unitId: state.unitId,
  maxArmorPerLocation: { CT: 10 },
  maxStructurePerLocation: { CT: 6 },
  maxAmmoPerBin: { bin: 12 },
};
function ticket(overrides: Partial<IRepairTicket> = {}): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: state.unitId,
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 100,
    expectedHours: 4,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: updatedAt,
    status: 'queued',
    ...overrides,
  };
}

describe('applyCompletedRepair characterization', () => {
  it('caps armor and preserves unrelated damage and the input', () => {
    const repaired = applyCompletedRepair(state, ticket(), maxState, updatedAt);
    expect(repaired).toEqual({
      ...state,
      currentArmorPerLocation: { CT: 10, LT: 2 },
      lastUpdated: updatedAt,
    });
    expect(state.currentArmorPerLocation.CT).toBe(4);
  });
  it('restores structure, removes only its destroyed location, and refreshes combatReady', () => {
    expect(
      applyCompletedRepair(
        state,
        ticket({ kind: 'structure' }),
        maxState,
        updatedAt,
      ),
    ).toEqual({
      ...state,
      currentStructurePerLocation: { CT: 6, LT: 3 },
      destroyedLocations: ['RA'],
      combatReady: true,
      lastUpdated: updatedAt,
    });
  });
  it('caps ammo and replaces only a component at the specified location', () => {
    expect(
      applyCompletedRepair(
        state,
        ticket({ kind: 'ammo', ammoBinId: 'bin' }),
        maxState,
        updatedAt,
      ).ammoRemaining,
    ).toEqual({ bin: 12 });
    expect(
      applyCompletedRepair(
        state,
        ticket({ kind: 'component', componentName: 'Laser', location: 'LT' }),
        maxState,
        updatedAt,
      ).destroyedComponents,
    ).toEqual([state.destroyedComponents[1]]);
  });
  it('clears heat without changing other damage', () => {
    expect(
      applyCompletedRepair(
        state,
        ticket({ kind: 'heat-recovery' }),
        maxState,
        updatedAt,
      ),
    ).toEqual({ ...state, heatEnd: 0, lastUpdated: updatedAt });
  });
  it('preserves missing-max fallbacks and incomplete ticket behavior', () => {
    expect(
      applyCompletedRepair(
        state,
        ticket({ pointsToRestore: 2 }),
        undefined,
        updatedAt,
      ).currentArmorPerLocation.CT,
    ).toBe(6);
    expect(
      applyCompletedRepair(
        state,
        ticket({ kind: 'ammo', ammoBinId: 'bin', pointsToRestore: undefined }),
        maxState,
        updatedAt,
      ).ammoRemaining.bin,
    ).toBe(12);
    for (const incomplete of [
      ticket({ location: undefined }),
      ticket({ kind: 'ammo' }),
      ticket({ kind: 'component' }),
    ]) {
      expect(
        applyCompletedRepair(state, incomplete, maxState, updatedAt),
      ).toEqual({ ...state, lastUpdated: updatedAt });
    }
  });
});
