/**
 * Scenario tests for PR-L3 BA leg-attack against Mek + Vehicle targets
 * (G5 + G6 — first production callers of `vehicleFiringArc.ts` and
 * `vehicleCriticalHitResolution.ts`).
 *
 * Exercises the leg-attack pipeline end-to-end:
 *   - the pure damage formula (`calculateLegAttackDamage`)
 *   - the Mek-path resolver (`resolveMekLegAttack`) with d6 leg-side
 *     mapping, destroyed-leg fallback, and the both-legs-destroyed
 *     clean-miss case
 *   - the Vehicle-path resolver (`resolveVehicleLegAttack`) wired to
 *     `calculateFiringArc` (G5)
 *   - the vehicle-crit pipeline (`applyVehicleLegAttackCrit`) wired to
 *     `applyVehicleCritEffect` (G6)
 *   - the action handler (`applyInteractiveSessionLegAttack`) emitting
 *     `LegAttackResolved` events on a real `IGameSession`
 *   - the spec modifier table (HARDENED -2; HUMAN_TRO_MEK SPA +1)
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Leg Attack)
 */

import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { type IBALegAttackSquadDef } from '@/lib/combat/baCombat';
import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  type IGameSession,
  type IGameUnit,
  type ILegAttackResolvedPayload,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  applyVehicleLegAttackCrit,
  resolveMekLegAttack,
  resolveVehicleLegAttack,
} from '@/utils/gameplay/battlearmor/legAttackResolver';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createVehicleCombatState } from '@/utils/gameplay/vehicleDamage';

import { applyInteractiveSessionLegAttack } from '../InteractiveSession.actions';

// =============================================================================
// Fixtures
// =============================================================================

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'ba-leg',
      name: 'BA Leg Attacker',
      side: GameSide.Player,
      unitRef: 'ba-ref',
      pilotRef: 'pilot-ba',
      gunnery: 4,
      piloting: 5,
      unitType: UnitType.BATTLE_ARMOR,
      battleArmorInit: {
        squadSize: 4,
        armorPointsPerTrooper: 5,
        hasMagneticClamp: false,
        hasVibroClaws: false,
        vibroClawCount: 0,
      },
    } as unknown as IGameUnit,
    {
      id: 'atlas-target',
      name: 'Atlas',
      side: GameSide.Opponent,
      unitRef: 'atlas-ref',
      pilotRef: 'pilot-atlas',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
    {
      id: 'tank-target',
      name: 'Demolisher',
      side: GameSide.Opponent,
      unitRef: 'tank-ref',
      pilotRef: 'pilot-tank',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

/**
 * Advance the session to the PhysicalAttack phase so leg attacks are
 * stamped with the appropriate phase value on their emitted events.
 */
function advanceToPhysicalAttack(session: IGameSession): IGameSession {
  let s = startGame(session, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Initiative -> Movement
  s = advancePhase(s); // Movement -> WeaponAttack
  s = advancePhase(s); // WeaponAttack -> PhysicalAttack
  return s;
}

function freshSession(): IGameSession {
  return createGameSession(
    {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    } as never,
    buildUnits(),
  );
}

function scriptedRoller(values: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i += 1;
    return v;
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

// Pull the live `IBASquadCombatState` out of the seeded session by adapting
// the older `IBattleArmorCombatState` envelope -- mirrors the swarm-fire
// scenario test's adaptOldSquadState pattern.
function getSquadState(session: IGameSession, squadId: string) {
  const unit = session.currentState.units[squadId];
  const cs = unit.combatState;
  if (!cs || cs.kind !== 'squad') {
    throw new Error('test setup: squad has no combatState');
  }
  const old = cs.state;
  return {
    troopers: old.troopers.map((t, i) => ({
      index: i + 1,
      alive: t.alive && t.armorRemaining > 0,
      armorRemaining: t.armorRemaining,
      equipmentDestroyed: [...t.equipmentDestroyed],
    })),
    swarmingUnitId: undefined,
    swarmedByUnitIds: [],
    mountedOn: undefined,
    mimeticActiveThisTurn: false,
    stealthActiveThisTurn: false,
  };
}

// =============================================================================
// Tests — Mek target path
// =============================================================================

describe('PR-L3 leg attack against Mek targets', () => {
  it('emits LegAttackResolved with hit:true on a leg with both legs intact', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    // d6=1 → left leg, both intact, base damage = 4.
    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const events = next.events.filter(
      (e) => e.type === GameEventType.LegAttackResolved,
    );
    expect(events).toHaveLength(1);
    const payload = events[0].payload as ILegAttackResolvedPayload;
    expect(payload.unitId).toBe('ba-leg');
    expect(payload.targetUnitId).toBe('atlas-target');
    expect(payload.hit).toBe(true);
    expect(payload.damage).toBe(4);
    expect(payload.hitLocation).toBe('Left Leg');
    expect(payload.critModifier).toBe(0);
    expect(payload.survivingTroopers).toBe(4);
    expect(events[0].phase).toBe(GamePhase.PhysicalAttack);
  });

  it('destroyed rolled leg → resolver fallback to the OTHER leg (right leg destroyed → hit Left)', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    // d6=5 → right leg rolled, but right leg destroyed → fallback to left.
    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef({ vibroClaws: 1 }),
      legDestroyed: (side) => side === 'right',
      diceRoller: scriptedRoller([5]),
    });

    expect(resolution.rolledLegSide).toBe('right');
    expect(resolution.hit).toBe(true);
    expect(resolution.hitLocation).toBe('Left Leg');
    expect(resolution.damage).toBe(5); // 4 + 1 vibroclaw

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.hit).toBe(true);
    expect(payload.hitLocation).toBe('Left Leg');
    expect(payload.damage).toBe(5);
  });

  it('both legs destroyed → clean miss (hit:false, damage:0, action still consumed)', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef({ vibroClaws: 4, myomerBoosterActive: true }),
      legDestroyed: () => true,
      diceRoller: scriptedRoller([1]),
    });
    expect(resolution.hit).toBe(false);
    expect(resolution.damage).toBe(0);

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    // The miss STILL emits an event -- the squad's attack action is consumed.
    const events = next.events.filter(
      (e) => e.type === GameEventType.LegAttackResolved,
    );
    expect(events).toHaveLength(1);
    const payload = events[0].payload as ILegAttackResolvedPayload;
    expect(payload.hit).toBe(false);
    expect(payload.damage).toBe(0);
    // hitLocation stamps the rolled-then-rejected leg so replay can show it.
    expect(payload.hitLocation).toBe('Left Leg');
  });

  it('HARDENED target leg → critModifier -2 on emitted event', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      hardenedArmor: true,
      diceRoller: scriptedRoller([2]),
    });
    expect(resolution.critModifier).toBe(-2);

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.critModifier).toBe(-2);
  });

  it('HUMAN_TRO_MEK SPA on attacker → critModifier +1 on emitted event', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      humanTroMekSpa: true,
      diceRoller: scriptedRoller([1]),
    });

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.critModifier).toBe(1);
  });

  it('HARDENED + HUMAN_TRO_MEK stack additively → critModifier -1', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      hardenedArmor: true,
      humanTroMekSpa: true,
      diceRoller: scriptedRoller([1]),
    });

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.critModifier).toBe(-1);
  });

  it('myomer + vibroclaws + 4 troopers → 16 damage on emitted event', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef({ vibroClaws: 4, myomerBoosterActive: true }),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.damage).toBe(16);
  });
});

// =============================================================================
// Tests — Vehicle target path (G5 + G6 first prod callers)
// =============================================================================

describe('PR-L3 leg attack against Vehicle targets (G5 + G6 orphan helpers wired)', () => {
  it('calls calculateFiringArc and stamps the resolved arc on the event (G5)', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    // Attacker directly north of target, target facing North → front arc.
    const resolution = resolveVehicleLegAttack({
      squad,
      squadDef: makeSquadDef(),
      attackerPos: { q: 0, r: -2 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });
    expect(resolution.hit).toBe(true);
    expect(resolution.hitLocation).toBe('front');

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'tank-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.hit).toBe(true);
    expect(payload.hitLocation).toBe('front');
    expect(payload.targetUnitId).toBe('tank-target');
    expect(payload.damage).toBe(4);
  });

  it('rear-arc resolution stamps "rear" on the event payload', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveVehicleLegAttack({
      squad,
      squadDef: makeSquadDef({ vibroClaws: 2 }),
      // Target facing North, attacker south → rear arc.
      attackerPos: { q: 0, r: 2 },
      targetPos: { q: 0, r: 0 },
      targetFacing: Facing.North,
    });

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'tank-target',
      resolution,
      survivingTroopers: 4,
    });

    const payload = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!.payload as ILegAttackResolvedPayload;
    expect(payload.hitLocation).toBe('rear');
    expect(payload.damage).toBe(6); // 4 + 2 vibroclaws
  });

  it('vehicle crit pipeline (G6) — applyVehicleLegAttackCrit invokes applyVehicleCritEffect end-to-end', () => {
    // This test exercises BOTH orphan helpers through the leg-attack path.
    const vehicleState = createVehicleCombatState({
      unitId: 'tank-target',
      motionType: GroundMotionType.TRACKED,
      originalCruiseMP: 4,
      armor: {
        [VehicleLocation.FRONT]: 10,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      structure: {
        [VehicleLocation.FRONT]: 5,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    });

    // 2d6 roll of 5+6 = 11 → engine_hit (no modifier).
    const critResult = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: false,
      critModifier: 0,
      diceRoller: scriptedRoller([5, 6]),
    });
    expect(critResult.applied.kind).toBe('engine_hit');
    expect(critResult.state.motive.engineHits).toBe(1);
    expect(critResult.state.destroyed).toBe(false);
  });

  it('vehicle crit with HUMAN_TRO_MEK +1 promotes 11 → 12 → ammo_explosion (vehicle destroyed)', () => {
    const vehicleState = createVehicleCombatState({
      unitId: 'tank-target',
      motionType: GroundMotionType.TRACKED,
      originalCruiseMP: 4,
      armor: {
        [VehicleLocation.FRONT]: 10,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      structure: {
        [VehicleLocation.FRONT]: 5,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    });

    // 11 + 1 = 12 → ammo_explosion when ammo present.
    const critResult = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: true,
      critModifier: 1,
      diceRoller: scriptedRoller([5, 6]),
    });
    expect(critResult.applied.kind).toBe('ammo_explosion');
    expect(critResult.ammoExplosion).toBe(true);
    expect(critResult.state.destroyed).toBe(true);
  });

  it('vehicle crit with HARDENED -2 demotes 7 → 5 → no crit', () => {
    const vehicleState = createVehicleCombatState({
      unitId: 'tank-target',
      motionType: GroundMotionType.TRACKED,
      originalCruiseMP: 4,
      armor: {
        [VehicleLocation.FRONT]: 10,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      structure: {
        [VehicleLocation.FRONT]: 5,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    });

    const critResult = applyVehicleLegAttackCrit({
      vehicleState,
      engineType: EngineType.ICE,
      hasAmmoInSlot: false,
      critModifier: -2,
      diceRoller: scriptedRoller([3, 4]),
    });
    expect(critResult.applied.kind).toBe('none');
  });
});

// =============================================================================
// Tests — Negative cases & idempotency
// =============================================================================

describe('PR-L3 leg attack — negative cases', () => {
  it('emits NO event when the squad id is unknown', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });

    const beforeCount = session.events.length;
    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'no-such-squad',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });
    expect(next.events.length).toBe(beforeCount);
    expect(
      next.events.filter((e) => e.type === GameEventType.LegAttackResolved),
    ).toHaveLength(0);
  });

  it('emits NO event when the target id is unknown', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });

    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'no-such-target',
      resolution,
      survivingTroopers: 4,
    });
    expect(
      next.events.filter((e) => e.type === GameEventType.LegAttackResolved),
    ).toHaveLength(0);
  });

  it('stamps the current turn + phase on the emitted event', () => {
    const session = advanceToPhysicalAttack(freshSession());
    const squad = getSquadState(session, 'ba-leg');

    const resolution = resolveMekLegAttack({
      squad,
      squadDef: makeSquadDef(),
      legDestroyed: () => false,
      diceRoller: scriptedRoller([1]),
    });

    const expectedTurn = session.currentState.turn;
    const next = applyInteractiveSessionLegAttack({
      session,
      squadId: 'ba-leg',
      targetUnitId: 'atlas-target',
      resolution,
      survivingTroopers: 4,
    });

    const event = next.events.find(
      (e) => e.type === GameEventType.LegAttackResolved,
    )!;
    expect(event.turn).toBe(expectedTurn);
    expect(event.phase).toBe(GamePhase.PhysicalAttack);
  });
});
