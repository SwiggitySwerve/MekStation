/**
 * Reactivity tests for `state.bvBreakdown` on the Battle Armor store.
 *
 * The spec delta (`add-battlearmor-battle-value`) requires every BA squad to
 * carry an `IBABreakdown` populated by the calculator, and for the breakdown
 * to update live as the user edits BV inputs. The store is the source of
 * truth — these tests verify the reactive derivation fires whenever any BV
 * input changes (squad size, armor, manipulators, equipment, etc.).
 *
 * @spec openspec/changes/add-battlearmor-battle-value/specs/battle-armor-unit-system/spec.md
 *       Requirement: BA BV Breakdown on Unit State
 */

import { StoreApi } from 'zustand';

import { BAArmorType } from '@/types/unit/BattleArmorInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';

import {
  createDefaultBattleArmorState,
  type BattleArmorStore,
  type CreateBattleArmorOptions,
} from '../battleArmorState';
import { createBattleArmorStore } from '../useBattleArmorStore';

// =============================================================================
// Helpers
// =============================================================================

const DEFAULT_OPTIONS: CreateBattleArmorOptions = {
  name: 'Test BA',
  chassis: 'Test',
  model: 'BA-1',
  chassisType: BattleArmorChassisType.BIPED,
  weightClass: BattleArmorWeightClass.MEDIUM,
  squadSize: 5,
};

function makeStore(
  overrides?: Partial<CreateBattleArmorOptions>,
): StoreApi<BattleArmorStore> {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };
  const state = createDefaultBattleArmorState(opts);
  return createBattleArmorStore(state);
}

/**
 * Read `state.bvBreakdown` and assert it is populated. The field is
 * optional at the type level for back-compat but the factory always seeds
 * it, so this helper gives tests a non-nullable view.
 */
function bv(store: StoreApi<BattleArmorStore>) {
  const breakdown = store.getState().bvBreakdown;
  if (!breakdown) {
    throw new Error(
      'expected store to have populated bvBreakdown (factory seeds it)',
    );
  }
  return breakdown;
}

// =============================================================================
// Shape
// =============================================================================

describe('useBattleArmorStore - bvBreakdown shape', () => {
  it('exposes perTrooper.defensive / perTrooper.offensive / squadTotal / pilotMultiplier / final on state', () => {
    const store = makeStore();
    const bd = bv(store);

    expect(bd.perTrooper).toBeDefined();
    expect(bd.perTrooper.defensive).toBeDefined();
    expect(bd.perTrooper.offensive).toBeDefined();
    expect(typeof bd.squadTotal).toBe('number');
    expect(typeof bd.pilotMultiplier).toBe('number');
    expect(typeof bd.final).toBe('number');
  });

  it('seeds a non-zero BV from the default state (armor + manipulators)', () => {
    const store = makeStore();
    const bd = bv(store);

    // Default BA has 5 armor points × 2.5 × 1.0 = 12.5 armorBV — non-zero.
    expect(bd.perTrooper.defensive.armorBV).toBeGreaterThan(0);
    expect(bd.final).toBeGreaterThan(0);
  });
});

// =============================================================================
// Reactivity — squad size (the spec-delta call-out)
// =============================================================================

describe('useBattleArmorStore - bvBreakdown reactivity on squadSize change', () => {
  it('recomputes squadTotal live when squadSize changes', () => {
    const store = makeStore({ squadSize: 4 });
    const before = bv(store);

    expect(before.squadSize).toBe(4);
    const trooperBV = before.perTrooper.total;
    expect(before.squadTotal).toBeCloseTo(trooperBV * 4, 10);

    store.getState().setSquadSize(6);

    const after = bv(store);
    expect(after.squadSize).toBe(6);
    expect(after.squadTotal).toBeCloseTo(trooperBV * 6, 10);
    expect(after.squadTotal).toBeGreaterThan(before.squadTotal);
  });
});

// =============================================================================
// Reactivity — other BV inputs (smoke-level coverage to prove the wrapper
// catches more than just squadSize)
// =============================================================================

describe('useBattleArmorStore - bvBreakdown reactivity on other inputs', () => {
  it('armorPerTrooper change updates perTrooper.defensive.armorBV', () => {
    const store = makeStore();
    const before = bv(store).perTrooper.defensive.armorBV;

    store.getState().setArmorPerTrooper(10);

    const after = bv(store).perTrooper.defensive.armorBV;
    expect(after).toBeGreaterThan(before);
  });

  it('baArmorType change updates perTrooper.defensive.armorBV (Stealth ×1.5)', () => {
    const store = makeStore();
    const before = bv(store).perTrooper.defensive.armorBV;

    store.getState().setBaArmorType(BAArmorType.STEALTH_BASIC);

    const after = bv(store).perTrooper.defensive.armorBV;
    expect(after).toBeCloseTo(before * 1.5, 10);
  });

  it('groundMP change updates perTrooper.defensive.moveBV', () => {
    const store = makeStore();
    const before = bv(store).perTrooper.defensive.moveBV;

    store.getState().setGroundMP(3);

    const after = bv(store).perTrooper.defensive.moveBV;
    expect(after).toBeGreaterThan(before);
  });

  it('jumpMP change updates perTrooper.defensive.jumpBV', () => {
    const store = makeStore();
    const before = bv(store).perTrooper.defensive.jumpBV;

    // Jump MP 6 > current Jump MP 3 → jumpBV should rise.
    store.getState().setJumpMP(6);

    const after = bv(store).perTrooper.defensive.jumpBV;
    expect(after).toBeGreaterThan(before);
  });

  it('manipulator change updates perTrooper.offensive.manipulatorBV', () => {
    const store = makeStore();
    // Default is BATTLE × 2 = 1 + 1 = 2 manipulator BV.
    const before = bv(store).perTrooper.offensive.manipulatorBV;
    expect(before).toBe(2);

    store.getState().setLeftManipulator(ManipulatorType.HEAVY_BATTLE);
    store.getState().setRightManipulator(ManipulatorType.HEAVY_BATTLE);

    const after = bv(store).perTrooper.offensive.manipulatorBV;
    // HEAVY_BATTLE maps to HEAVY_CLAW (2) × 2 = 4 manipulator BV.
    expect(after).toBe(4);
  });

  it('weightClass change updates perTrooper.defensive.moveBV', () => {
    const store = makeStore({ weightClass: BattleArmorWeightClass.MEDIUM });
    const before = bv(store).perTrooper.defensive.moveBV;

    store.getState().setWeightClass(BattleArmorWeightClass.ASSAULT);

    const after = bv(store).perTrooper.defensive.moveBV;
    // Assault class multiplier (1.5) > Medium (0.75) → moveBV should rise.
    expect(after).toBeGreaterThan(before);
  });
});

// =============================================================================
// Final BV propagation
// =============================================================================

describe('useBattleArmorStore - final BV propagates when any input changes', () => {
  it('final BV increases when squadSize grows', () => {
    const store = makeStore({ squadSize: 4 });
    const before = bv(store).final;

    store.getState().setSquadSize(6);

    const after = bv(store).final;
    expect(after).toBeGreaterThan(before);
  });

  it('final BV increases when armor increases', () => {
    const store = makeStore();
    const before = bv(store).final;

    store.getState().setArmorPerTrooper(15);

    const after = bv(store).final;
    expect(after).toBeGreaterThan(before);
  });
});
