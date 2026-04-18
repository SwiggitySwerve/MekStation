/**
 * Aerospace dispatch tests — polymorphic entry points used by the combat engine.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/combat-resolution/spec.md
 */

import { AerospaceArc } from '../../../../types/unit/AerospaceInterfaces';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import {
  dispatchHitLocation,
  dispatchMovement,
  dispatchResolveCriticalHits,
  dispatchResolveDamage,
  isAerospaceTarget,
  targetIsSmallCraft,
} from '../dispatch';
import { AerospaceAttackDirection, createAerospaceCombatState } from '../state';

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

describe('isAerospaceTarget', () => {
  it('true for AEROSPACE', () => {
    expect(isAerospaceTarget({ unitType: UnitType.AEROSPACE })).toBe(true);
  });
  it('true for CONVENTIONAL_FIGHTER', () => {
    expect(isAerospaceTarget({ unitType: UnitType.CONVENTIONAL_FIGHTER })).toBe(
      true,
    );
  });
  it('true for SMALL_CRAFT', () => {
    expect(isAerospaceTarget({ unitType: UnitType.SMALL_CRAFT })).toBe(true);
  });
  it('false for BATTLEMECH', () => {
    expect(isAerospaceTarget({ unitType: UnitType.BATTLEMECH })).toBe(false);
  });
});

describe('targetIsSmallCraft', () => {
  it('true only for SMALL_CRAFT', () => {
    expect(targetIsSmallCraft({ unitType: UnitType.SMALL_CRAFT })).toBe(true);
    expect(targetIsSmallCraft({ unitType: UnitType.AEROSPACE })).toBe(false);
  });
});

describe('dispatchResolveDamage', () => {
  it('aerospace target routes to aerospaceResolveDamage', () => {
    const result = dispatchResolveDamage(
      { unitType: UnitType.AEROSPACE },
      {
        unitId: 'asf-1',
        state: mkState(),
        arc: AerospaceArc.NOSE,
        damage: 5,
        diceRoller: () => 5,
      },
      () => ({ ground: true }),
    );
    // Aerospace result has `armorAbsorbed` property
    expect((result as { armorAbsorbed?: number }).armorAbsorbed).toBeDefined();
  });

  it('non-aerospace target calls onGround fallback', () => {
    const result = dispatchResolveDamage(
      { unitType: UnitType.BATTLEMECH },
      {
        unitId: 'mech-1',
        state: mkState(),
        arc: AerospaceArc.NOSE,
        damage: 5,
      },
      () => ({ ground: true }),
    );
    expect(result).toEqual({ ground: true });
  });
});

describe('dispatchResolveCriticalHits', () => {
  it('aerospace target routes to aerospace crit resolver', () => {
    const result = dispatchResolveCriticalHits(
      { unitType: UnitType.AEROSPACE },
      {
        unitId: 'asf-1',
        arc: AerospaceArc.NOSE,
        state: mkState(),
        diceRoller: () => 5,
      },
      () => ({ ground: true }),
    );
    expect((result as { rolled?: boolean }).rolled).toBe(true);
  });

  it('non-aerospace falls through', () => {
    const result = dispatchResolveCriticalHits(
      { unitType: UnitType.BATTLEMECH },
      {
        unitId: 'mech-1',
        arc: AerospaceArc.NOSE,
        state: mkState(),
      },
      () => ({ ground: true }),
    );
    expect(result).toEqual({ ground: true });
  });
});

describe('dispatchHitLocation', () => {
  it('aerospace target returns a hit location', () => {
    const r = dispatchHitLocation({
      target: { unitType: UnitType.AEROSPACE },
      direction: AerospaceAttackDirection.FRONT,
      options: { diceRoller: () => 3 },
    });
    expect(r).not.toBeNull();
    expect(r?.arc).toBeDefined();
  });

  it('Small Craft swaps wings to sides (via dispatch)', () => {
    const r = dispatchHitLocation({
      target: { unitType: UnitType.SMALL_CRAFT },
      direction: AerospaceAttackDirection.SIDE_LEFT,
      options: { diceRoller: () => 3 },
    });
    expect(r).not.toBeNull();
    // On small craft, LEFT_WING should be remapped to LEFT_SIDE by the table.
    expect(r?.arc).not.toBe(AerospaceArc.LEFT_WING);
    expect(r?.arc).not.toBe(AerospaceArc.RIGHT_WING);
  });

  it('non-aerospace returns null (caller uses mech table)', () => {
    const r = dispatchHitLocation({
      target: { unitType: UnitType.BATTLEMECH },
      direction: AerospaceAttackDirection.FRONT,
      options: { diceRoller: () => 3 },
    });
    expect(r).toBeNull();
  });
});

describe('dispatchMovement', () => {
  it('aerospace routes to aerospace movement', () => {
    const result = dispatchMovement(
      { unitType: UnitType.AEROSPACE },
      {
        unitId: 'asf-1',
        state: mkState(),
        from: { q: 0, r: 0 },
        to: { q: 3, r: 0 },
        currentHeadingDeg: 0,
        newHeadingDeg: 0,
        currentTurn: 1,
        board: { boardRadius: 20 },
      },
      () => ({ ground: true }),
    );
    expect((result as { legal?: boolean }).legal).toBe(true);
  });

  it('non-aerospace falls through', () => {
    const result = dispatchMovement(
      { unitType: UnitType.BATTLEMECH },
      {
        unitId: 'mech-1',
        state: mkState(),
        from: { q: 0, r: 0 },
        to: { q: 3, r: 0 },
        currentHeadingDeg: 0,
        newHeadingDeg: 0,
        currentTurn: 1,
        board: { boardRadius: 20 },
      },
      () => ({ ground: true }),
    );
    expect(result).toEqual({ ground: true });
  });
});
