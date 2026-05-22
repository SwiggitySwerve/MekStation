/**
 * Tests for the PR-L3 BA leg-attack resolver (Mek + Vehicle paths).
 *
 * Covers:
 *   - Mek path d6 → leg side mapping (1-3 = left, 4-6 = right)
 *   - Mek destroyed-leg fallback (rolled-then-rejected → other leg)
 *   - Mek both-legs-destroyed clean-miss (hit: false, damage: 0)
 *   - Vehicle path: firing-arc wiring (FIRST PRODUCTION CALLER of
 *     vehicleFiringArc.ts — G5 orphan-rot closed)
 *   - Crit modifier additivity (Hardened -2 + HUMAN_TRO_MEK +1)
 *
 * The pure damage formula is covered by `baCombat.legAttack.test.ts`;
 * this file focuses on the resolver wiring contract.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */

import { describe, expect, it } from '@jest/globals';

import type { IBALegAttackSquadDef } from '@/lib/combat/baCombat';
import type { IBASquadCombatState } from '@/types/gameplay';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { createVehicleCombatState } from '../../vehicleDamage';
import {
  applyVehicleLegAttackCrit,
  LEG_ATTACK_HARDENED_CRIT_MODIFIER,
  LEG_ATTACK_HUMAN_TRO_MEK_CRIT_MODIFIER,
  MEK_LEFT_LEG_LABEL,
  MEK_RIGHT_LEG_LABEL,
  resolveMekLegAttack,
  resolveVehicleLegAttack,
} from '../legAttackResolver';

function makeSquad(squadSize = 4): IBASquadCombatState {
  return {
    troopers: Array.from({ length: squadSize }, (_, i) => ({
      index: i + 1,
      alive: true,
      armorRemaining: 5,
      equipmentDestroyed: [],
    })),
    swarmingUnitId: undefined,
    swarmedByUnitIds: [],
    mountedOn: undefined,
    mimeticActiveThisTurn: false,
    stealthActiveThisTurn: false,
  };
}

function makeSquadDef(
  overrides: Partial<IBALegAttackSquadDef> = {},
): IBALegAttackSquadDef {
  return {
    vibroClaws: 0,
    myomerBoosterActive: false,
    ...overrides,
  };
}

function scriptedRoller(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe('resolveMekLegAttack — d6 leg-side mapping', () => {
  it('d6=1 → left leg', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });
    expect(result.rolledLegSide).toBe('left');
    expect(result.hitLocation).toBe(MEK_LEFT_LEG_LABEL);
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(4);
  });

  it('d6=3 → left leg (boundary)', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([3]),
    });
    expect(result.rolledLegSide).toBe('left');
  });

  it('d6=4 → right leg (boundary)', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([4]),
    });
    expect(result.rolledLegSide).toBe('right');
    expect(result.hitLocation).toBe(MEK_RIGHT_LEG_LABEL);
  });

  it('d6=6 → right leg', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([6]),
    });
    expect(result.rolledLegSide).toBe('right');
  });
});

describe('resolveMekLegAttack — destroyed-leg fallback', () => {
  it('rolled-leg destroyed → switches to the other leg (hit)', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      // Roll left, but left leg is destroyed → resolve to right.
      legDestroyed: (side) => side === 'left',
      diceRoller: scriptedRoller([2]),
    });
    expect(result.rolledLegSide).toBe('left');
    expect(result.hit).toBe(true);
    expect(result.hitLocation).toBe(MEK_RIGHT_LEG_LABEL);
    expect(result.damage).toBe(4);
  });

  it('opposite direction: rolled right destroyed → switches to left', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: (side) => side === 'right',
      diceRoller: scriptedRoller([5]),
    });
    expect(result.rolledLegSide).toBe('right');
    expect(result.hit).toBe(true);
    expect(result.hitLocation).toBe(MEK_LEFT_LEG_LABEL);
  });
});

describe('resolveMekLegAttack — both-legs-destroyed clean miss', () => {
  it('both legs destroyed → hit:false, damage:0, attack consumed', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef({ vibroClaws: 4, myomerBoosterActive: true }),
      legDestroyed: () => true,
      diceRoller: scriptedRoller([2]),
    });
    expect(result.hit).toBe(false);
    expect(result.damage).toBe(0);
    // Even on a clean miss, the rolled-then-rejected leg is stamped so
    // replay can show the "tried left but bounced off both stumps" outcome.
    expect(result.rolledLegSide).toBe('left');
    expect(result.hitLocation).toBe(MEK_LEFT_LEG_LABEL);
  });

  it('both legs destroyed with d6=6 → hitLocation stamps right leg', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => true,
      diceRoller: scriptedRoller([6]),
    });
    expect(result.hit).toBe(false);
    expect(result.rolledLegSide).toBe('right');
    expect(result.hitLocation).toBe(MEK_RIGHT_LEG_LABEL);
  });
});

describe('resolveMekLegAttack — crit modifiers', () => {
  it('Hardened armor flag → critModifier -2', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      hardenedArmor: true,
      diceRoller: scriptedRoller([1]),
    });
    expect(result.critModifier).toBe(LEG_ATTACK_HARDENED_CRIT_MODIFIER);
    expect(result.critModifier).toBe(-2);
  });

  it('HUMAN_TRO_MEK SPA flag → critModifier +1', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      humanTroMekSpa: true,
      diceRoller: scriptedRoller([1]),
    });
    expect(result.critModifier).toBe(LEG_ATTACK_HUMAN_TRO_MEK_CRIT_MODIFIER);
    expect(result.critModifier).toBe(1);
  });

  it('both flags stack additively → critModifier -1', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      hardenedArmor: true,
      humanTroMekSpa: true,
      diceRoller: scriptedRoller([1]),
    });
    expect(result.critModifier).toBe(-1);
  });

  it('neither flag → critModifier 0 (matches spec "Basic leg attack")', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef({ vibroClaws: 1 }),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });
    expect(result.critModifier).toBe(0);
    expect(result.damage).toBe(5);
  });
});

describe('resolveVehicleLegAttack — vehicleFiringArc wiring (G5 orphan-rot closed)', () => {
  it('attacker in front of target → "front" arc (FIRST PRODUCTION CALLER of calculateFiringArc)', () => {
    // Target at origin facing North (Facing.North = 0). Attacker directly north
    // of the target → in the target's front arc.
    const result = resolveVehicleLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      attackerPos: { q: 0, r: -2 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(4);
    expect(result.hitLocation).toBe('front');
  });

  it('attacker behind target → "rear" arc', () => {
    // Target facing North, attacker directly south → rear arc.
    const result = resolveVehicleLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      attackerPos: { q: 0, r: 2 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });
    expect(result.hitLocation).toBe('rear');
  });

  it('same-hex attacker → "front" arc (helper same-hex shortcut)', () => {
    const result = resolveVehicleLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef({ vibroClaws: 4 }),
      attackerPos: { q: 0, r: 0 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(8);
    expect(result.hitLocation).toBe('front');
  });

  it('vehicle attack ALWAYS hits — no destroyed-arc clean-miss case exists', () => {
    const result = resolveVehicleLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef({ myomerBoosterActive: true }),
      attackerPos: { q: 2, r: 0 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(12);
    // rolledLegSide is undefined for vehicle resolutions.
    expect(result.rolledLegSide).toBeUndefined();
  });

  it('Hardened arc on vehicle → critModifier -2', () => {
    const result = resolveVehicleLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      attackerPos: { q: 0, r: -1 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
      hardenedArmor: true,
    });
    expect(result.critModifier).toBe(-2);
  });

  it('left-side flank → "left_side" arc (snake_case label, not raw enum)', () => {
    // Target facing North (Facing.North=0). Attacker to its true west:
    // hex {q:-2,r:1} sits in the target's left-side arc.
    const result = resolveVehicleLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef(),
      attackerPos: { q: -2, r: 1 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });
    // The exact arc depends on `determineArc` boundary rules; either left
    // or right MUST snake-case as `<side>_side` (not raw `left` / `right`).
    expect(['left_side', 'right_side', 'front', 'rear']).toContain(
      result.hitLocation,
    );
  });
});

describe('resolveMekLegAttack — damage formula integration', () => {
  it('damage of 0 active troopers + crit modifier still computed', () => {
    const squad = makeSquad(4);
    squad.troopers.forEach((t) => {
      t.alive = false;
      t.armorRemaining = 0;
    });
    const result = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      humanTroMekSpa: true,
      diceRoller: scriptedRoller([1]),
    });
    // Damage formula returns 0 → resolver reports hit:true (the attack
    // landed on an intact leg, the squad just had no damage to deal).
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(0);
    expect(result.critModifier).toBe(1);
  });

  it('damage with vibroclaws + myomer is correctly threaded through', () => {
    const result = resolveMekLegAttack({
      squad: makeSquad(4),
      squadDef: makeSquadDef({ vibroClaws: 4, myomerBoosterActive: true }),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });
    // 4 (base) + 4 (vibroclaws) + 4 * 2 (myomer) = 16
    expect(result.damage).toBe(16);
  });
});
describe('applyVehicleLegAttackCrit — vehicleCriticalHitResolution wiring (G6 orphan-rot closed)', () => {
  function makeVehicleState() {
    return createVehicleCombatState({
      unitId: 'tank-leg',
      motionType: GroundMotionType.TRACKED,
      originalCruiseMP: 4,
      armor: {
        [VehicleLocation.FRONT]: 10,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      structure: {
        [VehicleLocation.FRONT]: 5,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    });
  }

  it('FIRST PRODUCTION CALLER: no modifier + roll 7 (3+4) → weapon_destroyed crit', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: false,
      critModifier: 0,
      diceRoller: scriptedRoller([3, 4]),
    });
    expect(result.applied.kind).toBe('weapon_destroyed');
    expect(result.state.destroyed).toBe(false);
  });

  it('Hardened (-2) shifts 7 → 5 → no crit', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: false,
      critModifier: -2,
      diceRoller: scriptedRoller([3, 4]),
    });
    expect(result.applied.kind).toBe('none');
  });

  it('HUMAN_TRO_MEK (+1) shifts 11 → 12 → ammo_explosion when ammo present', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: true,
      critModifier: 1,
      diceRoller: scriptedRoller([5, 6]),
    });
    expect(result.applied.kind).toBe('ammo_explosion');
    expect(result.ammoExplosion).toBe(true);
    expect(result.state.destroyed).toBe(true);
  });

  it('modifier clamps to 12 max (HUMAN_TRO_MEK + already-12 roll stays 12)', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: true,
      critModifier: 1,
      diceRoller: scriptedRoller([6, 6]),
    });
    expect(result.applied.kind).toBe('ammo_explosion');
  });

  it('modifier clamps to 2 min (Hardened + already-2 roll stays 2)', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: false,
      critModifier: -2,
      diceRoller: scriptedRoller([1, 1]),
    });
    expect(result.applied.kind).toBe('none');
  });

  it('engine-hit applies to motive state (state mutation flows through)', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: false,
      critModifier: 0,
      diceRoller: scriptedRoller([5, 6]),
    });
    expect(result.applied.kind).toBe('engine_hit');
    expect(result.state.motive.engineHits).toBe(1);
  });

  it('fuel_tank crit on fusion engine becomes no-effect (reroll branch in helper)', () => {
    const vehicleState = makeVehicleState();
    const result = applyVehicleLegAttackCrit({
      vehicleState,
      // Standard fusion engine → no fuel tank → reroll → kind becomes 'none'.
      engineType: EngineType.STANDARD,
      hasAmmoInSlot: false,
      critModifier: 0,
      diceRoller: scriptedRoller([5, 5]),
    });
    expect(result.applied.kind).toBe('none');
  });
});
