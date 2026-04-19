/**
 * Infantry morale-check tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Morale Rule
 */

import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';
import { InfantryEventType } from '../events';
import { clearPinnedAtPhaseStart, rollInfantryMorale } from '../morale';
import { InfantryMorale, createInfantryCombatState } from '../state';

/** Fixed-value roller for deterministic tests. */
const fixedRoller = (value: number) => () => value;

describe('rollInfantryMorale', () => {
  function pendingState() {
    const s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    return { ...s, survivingTroopers: 5, moraleCheckPending: true };
  }

  it('roll ≥ 8 → pass, morale stays NORMAL, no pinned/routed flag', () => {
    const s = pendingState();
    // dice 4+4 = 8 ≥ TN 8 → pass
    const r = rollInfantryMorale({
      unitId: 'pl-1',
      state: s,
      diceRoller: fixedRoller(4),
    });
    expect(r.outcome).toBe('pass');
    expect(r.state.pinned).toBe(false);
    expect(r.state.routed).toBe(false);
    expect(r.state.moraleCheckPending).toBe(false);
  });

  it('roll = TN − 1 (7) → pinned, fires InfantryPinned', () => {
    const s = pendingState();
    // dice 3+4 = 7, TN 8 → margin 1 → pinned
    let call = 0;
    const roller = () => (call++ === 0 ? 3 : 4);
    const r = rollInfantryMorale({
      unitId: 'pl-1',
      state: s,
      diceRoller: roller,
    });
    expect(r.outcome).toBe('pinned');
    expect(r.state.pinned).toBe(true);
    expect(r.state.morale).toBe(InfantryMorale.PINNED);
    expect(
      r.events.find((e) => e.type === InfantryEventType.INFANTRY_PINNED),
    ).toBeDefined();
    expect(
      r.events.find((e) => e.type === InfantryEventType.INFANTRY_MORALE_CHECK),
    ).toBeDefined();
  });

  it('roll ≤ TN − 2 (6) → routed, fires InfantryRouted, disables field gun', () => {
    const s = {
      ...pendingState(),
      fieldGunCrew: 2,
      fieldGunAmmo: 5,
      fieldGunOperational: true,
    };
    // dice 3+3 = 6, TN 8 → margin 2 → routed
    const r = rollInfantryMorale({
      unitId: 'pl-1',
      state: s,
      diceRoller: fixedRoller(3),
    });
    expect(r.outcome).toBe('routed');
    expect(r.state.routed).toBe(true);
    expect(r.state.morale).toBe(InfantryMorale.ROUTED);
    expect(r.state.fieldGunOperational).toBe(false);
    expect(
      r.events.find((e) => e.type === InfantryEventType.INFANTRY_ROUTED),
    ).toBeDefined();
  });

  it('leader modifier +2 turns a roll-of-6 (would route) into pass', () => {
    const s = pendingState();
    // dice 3+3 = 6, +2 = 8 → pass
    const r = rollInfantryMorale({
      unitId: 'pl-1',
      state: s,
      leaderModifier: 2,
      diceRoller: fixedRoller(3),
    });
    expect(r.outcome).toBe('pass');
  });

  it('no check pending → pass with no events', () => {
    const s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const r = rollInfantryMorale({
      unitId: 'pl-1',
      state: s,
      diceRoller: fixedRoller(1),
    });
    expect(r.outcome).toBe('pass');
    expect(r.events.length).toBe(0);
  });

  it('already routed: clears pending flag, returns routed without rolling', () => {
    const s = { ...pendingState(), routed: true };
    const r = rollInfantryMorale({
      unitId: 'pl-1',
      state: s,
      diceRoller: fixedRoller(6), // would pass if rolled
    });
    expect(r.outcome).toBe('routed');
    expect(r.state.moraleCheckPending).toBe(false);
  });
});

describe('clearPinnedAtPhaseStart', () => {
  it('clears pinned flag, resets morale to NORMAL', () => {
    const s0 = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const s = {
      ...s0,
      pinned: true,
      morale: InfantryMorale.PINNED,
    };
    const out = clearPinnedAtPhaseStart(s);
    expect(out.pinned).toBe(false);
    expect(out.morale).toBe(InfantryMorale.NORMAL);
  });

  it('leaves routed platoon in ROUTED morale', () => {
    const s0 = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    const s = {
      ...s0,
      pinned: true,
      routed: true,
      morale: InfantryMorale.ROUTED,
    };
    const out = clearPinnedAtPhaseStart(s);
    expect(out.pinned).toBe(false);
    expect(out.morale).toBe(InfantryMorale.ROUTED);
  });

  it('no-op if not pinned', () => {
    const s = createInfantryCombatState({
      startingTroopers: 28,
      armorKit: InfantryArmorKit.NONE,
      hasAntiMechTraining: false,
    });
    expect(clearPinnedAtPhaseStart(s)).toBe(s);
  });
});
