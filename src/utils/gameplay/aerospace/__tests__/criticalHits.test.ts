/**
 * Aerospace critical-hit tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 5)
 */

import { AerospaceArc } from '../../../../types/unit/AerospaceInterfaces';
import {
  categoriseCritRollDeterministic,
  resolveAerospaceCriticalHit,
} from '../criticalHits';
import { AerospaceEventType } from '../events';
import { createAerospaceCombatState } from '../state';

function mkState() {
  return createAerospaceCombatState({
    maxSI: 6,
    armorByArc: { nose: 10, leftWing: 10, rightWing: 10, aft: 10 },
    heatSinks: 10,
    fuelPoints: 20,
    safeThrust: 6,
    maxThrust: 9,
  });
}

describe('categoriseCritRollDeterministic', () => {
  const table: Array<[number, boolean, string]> = [
    [2, false, 'none'],
    [3, false, 'crewStunned'],
    [4, false, 'cargo'],
    [4, true, 'fuel'],
    [5, false, 'cargo'],
    [5, true, 'fuel'],
    [6, false, 'avionics'],
    [7, false, 'avionics'],
    [8, false, 'engine'],
    [9, false, 'engine'],
    [10, false, 'controlSurfaces'],
    [11, false, 'controlSurfaces'],
    [12, false, 'catastrophic'],
  ];

  it.each(table)('total %i (cargoOrFuel=%s) → %s', (total, c, cat) => {
    expect(categoriseCritRollDeterministic(total, c)).toBe(cat);
  });
});

describe('resolveAerospaceCriticalHit — effects per category', () => {
  it('catastrophic (12) destroys unit and emits both events', () => {
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: mkState(),
      diceRoller: () => 6,
    });
    expect(r.category).toBe('catastrophic');
    expect(r.state.destroyed).toBe(true);
    expect(r.state.currentSI).toBe(0);
    expect(
      r.events.find((e) => e.type === AerospaceEventType.UNIT_DESTROYED),
    ).toBeDefined();
    expect(
      r.events.find((e) => e.type === AerospaceEventType.COMPONENT_DESTROYED),
    ).toBeDefined();
  });

  it('engine hit (2d6=8) adds +5 heat', () => {
    // 4+4=8 → engine; tiebreak (4) is even → cargoOrFuel=false (irrelevant here)
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: mkState(),
      diceRoller: () => 4,
    });
    expect(r.category).toBe('engine');
    expect(r.state.heat).toBe(5);
  });

  it('control surfaces (2d6=10) adds +1 thrust penalty', () => {
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: mkState(),
      diceRoller: () => 5,
    });
    expect(r.category).toBe('controlSurfaces');
    expect(r.state.thrustPenalty).toBe(1);
  });

  it('crew stunned (2d6=3) sets flag; uses 1+2 roll', () => {
    // Use a roller that returns a 1 then a 2 then (tiebreak) doesn't matter.
    const seq = [1, 2, 5];
    let i = 0;
    const roller = () => seq[i++] ?? 3;
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: mkState(),
      diceRoller: roller,
    });
    expect(r.category).toBe('crewStunned');
    expect(r.state.crewStunned).toBe(true);
  });

  it('avionics (2d6=6) sets avionicsDamaged', () => {
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: mkState(),
      diceRoller: () => 3,
    });
    expect(r.category).toBe('avionics');
    expect(r.state.avionicsDamaged).toBe(true);
  });

  it('fuel hit (2d6=4 with odd tiebreak) bleeds 5 fuel', () => {
    // 1+3=4 → cargo/fuel band. Tiebreak next roll is odd → fuel.
    const seq = [1, 3, 3]; // tiebreak 3 is odd
    let i = 0;
    const roller = () => seq[i++] ?? 3;
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: mkState(),
      diceRoller: roller,
    });
    expect(r.category).toBe('fuel');
    expect(r.state.fuelRemaining).toBe(15);
  });

  it('cargo hit (2d6=4 with even tiebreak) leaves state unchanged', () => {
    const seq = [1, 3, 4]; // tiebreak 4 is even → cargo
    let i = 0;
    const roller = () => seq[i++] ?? 4;
    const beforeState = mkState();
    const r = resolveAerospaceCriticalHit({
      unitId: 'asf-1',
      arc: AerospaceArc.NOSE,
      state: beforeState,
      diceRoller: roller,
    });
    expect(r.category).toBe('cargo');
    expect(r.state.fuelRemaining).toBe(beforeState.fuelRemaining);
  });
});
