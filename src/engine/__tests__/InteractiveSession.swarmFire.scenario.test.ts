/**
 * Scenario tests for PR-L2 swarm-fire-while-attached (G4 — biggest BA combat gap).
 *
 * Exercises the End-phase swarm-fire trigger end-to-end against a real
 * IGameSession. Pre-seeds an attached swarm via the older
 * IBattleArmorCombatState.swarmingUnitId pointer (the production plumbing),
 * advances the End phase, and asserts a SwarmDamage event was appended
 * with the canonical Librarian damage value.
 *
 * The swarm-attach action handler itself is deferred to a later PR
 * (the spec's §3) -- this scenario test directly mutates the BA squad's
 * combatState.state.swarmingUnitId to seed the attached state, which is
 * the exact same mutation a successful SwarmAttack would perform.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 *   (Requirement: Swarm Fire While Attached)
 */

import type { IBASwarmFireSquadDef } from '@/lib/combat/baCombat';
import type { IResolveSwarmFireOptions } from '@/utils/gameplay/battlearmor/swarmFireResolver';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  type IGameSession,
  type IGameUnit,
  type ISwarmDamagePayload,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import { advanceInteractiveSessionPhase } from '../InteractiveSession.phases';

// =============================================================================
// Fixtures
// =============================================================================

function buildUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'ba-swarmer',
      name: 'BA Swarmer',
      side: GameSide.Player,
      unitRef: 'ba-ref',
      pilotRef: 'pilot-ba',
      gunnery: 4,
      piloting: 5,
      unitType: UnitType.BATTLE_ARMOR,
      battleArmorInit: {
        squadSize: 4,
        armorPointsPerTrooper: 5,
        hasMagneticClamp: true,
        hasVibroClaws: false,
        vibroClawCount: 0,
      },
    } as unknown as IGameUnit,
    {
      id: 'locust-host',
      name: 'Locust',
      side: GameSide.Opponent,
      unitRef: 'locust-ref',
      pilotRef: 'pilot-host',
      gunnery: 4,
      piloting: 5,
    } as IGameUnit,
  ];
}

/**
 * Advance the session through Initiative -> Movement -> WeaponAttack ->
 * PhysicalAttack -> Heat -> End so it sits on the End phase ready for one
 * more advancePhase() call (which then runs the End-phase block we instrumented).
 */
function advanceToEndPhase(session: IGameSession): IGameSession {
  let s = startGame(session, GameSide.Player);
  s = rollInitiative(s);
  s = advancePhase(s); // Initiative -> Movement
  s = advancePhase(s); // Movement -> WeaponAttack
  s = advancePhase(s); // WeaponAttack -> PhysicalAttack
  s = advancePhase(s); // PhysicalAttack -> Heat
  s = advancePhase(s); // Heat -> End
  return s;
}

/**
 * Attach the BA squad to the host by directly setting `swarmingUnitId` on
 * the squad's combatState. This is exactly the mutation a successful
 * SwarmAttack action would perform (per the older
 * add-battlearmor-combat-behavior swarm.ts `setSwarmTarget` helper).
 */
function attachSwarmer(
  session: IGameSession,
  squadId: string,
  hostId: string,
): IGameSession {
  const squad = session.currentState.units[squadId];
  const cs = squad.combatState;
  if (!cs || cs.kind !== 'squad') {
    throw new Error('test setup: squad has no combatState');
  }
  const attachedState = { ...cs.state, swarmingUnitId: hostId };
  // Mutate the live currentState -- mirrors how the engine fixture pattern
  // in InteractiveSession.indirectFire.scenario.test.ts seeds initial state.
  session.currentState.units[squadId] = {
    ...squad,
    combatState: { kind: 'squad', state: attachedState },
  };
  return session;
}

/**
 * Default swarm-fire options for a 4-trooper squad with 1 SmallLaser (3 dmg)
 * and no claws / no myomer -- the Librarian's canonical 12-damage case.
 */
function makeSwarmFireOptions(
  squadDef?: Partial<IBASwarmFireSquadDef>,
): IResolveSwarmFireOptions {
  return {
    getSquadDef: () => ({
      weapons: [{ weaponId: 'small-laser-1', damage: 3 }],
      vibroClaws: 0,
      myomerBoosterActive: false,
      ...squadDef,
    }),
    getHostLocationLabel: () => 'Center Torso',
  };
}

/**
 * Run the same phase-context shape `InteractiveSession.advancePhase()` builds,
 * but inline so the test can swap in a fake `isGameOver` (the real engine's
 * game-over predicate gates the End-phase advance and would prematurely end
 * a session with only 2 units that never took damage).
 */
function endPhaseContext(
  ref: { session: IGameSession },
  swarmFireOptions: IResolveSwarmFireOptions,
) {
  return {
    getSession: () => ref.session,
    setSession: (s: IGameSession) => {
      ref.session = s;
    },
    d6RollerForResolvers: () => undefined,
    diceRollerForResolvers: () => undefined,
    physicalContextByUnit: () => new Map(),
    waterDepthAt: () => 0,
    environmentHeatEffectAt: () => 0,
    // Force NOT game-over so the End-phase swarm-fire block executes.
    isGameOver: () => false,
    swarmFireOptions,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PR-L2 swarm-fire-while-attached -- End-phase trigger', () => {
  it('emits SwarmDamage = 12 for a 4-trooper squad with 1 SmallLaser', () => {
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    let session = advanceToEndPhase(fresh);
    session = attachSwarmer(session, 'ba-swarmer', 'locust-host');

    const ref = { session };
    advanceInteractiveSessionPhase(
      endPhaseContext(ref, makeSwarmFireOptions()),
    );

    const swarmEvents = ref.session.events.filter(
      (e) => e.type === GameEventType.SwarmDamage,
    );
    expect(swarmEvents).toHaveLength(1);
    const payload = swarmEvents[0].payload as ISwarmDamagePayload;
    expect(payload.unitId).toBe('ba-swarmer');
    expect(payload.targetUnitId).toBe('locust-host');
    expect(payload.damage).toBe(12);
    expect(payload.locationLabel).toBe('Center Torso');
  });

  it('emits SwarmDamage = 22 with vibroclaws + myomer booster', () => {
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    let session = advanceToEndPhase(fresh);
    session = attachSwarmer(session, 'ba-swarmer', 'locust-host');

    const ref = { session };
    advanceInteractiveSessionPhase(
      endPhaseContext(
        ref,
        makeSwarmFireOptions({ vibroClaws: 2, myomerBoosterActive: true }),
      ),
    );

    const swarmEvents = ref.session.events.filter(
      (e) => e.type === GameEventType.SwarmDamage,
    );
    expect(swarmEvents).toHaveLength(1);
    const payload = swarmEvents[0].payload as ISwarmDamagePayload;
    // 12 (weapons) + 2 (vibroclaws) + 8 (4 troopers x 2 myomer) = 22
    expect(payload.damage).toBe(22);
  });

  it('emits NO SwarmDamage when no swarmer is attached', () => {
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    const session = advanceToEndPhase(fresh);
    // Do NOT attach -- squad has no swarmingUnitId.

    const ref = { session };
    advanceInteractiveSessionPhase(
      endPhaseContext(ref, makeSwarmFireOptions()),
    );

    const swarmEvents = ref.session.events.filter(
      (e) => e.type === GameEventType.SwarmDamage,
    );
    expect(swarmEvents).toHaveLength(0);
  });

  it('emits NO SwarmDamage when swarmFireOptions is omitted (legacy callers)', () => {
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    let session = advanceToEndPhase(fresh);
    session = attachSwarmer(session, 'ba-swarmer', 'locust-host');

    const ref = { session };
    // Build a context that intentionally omits swarmFireOptions.
    advanceInteractiveSessionPhase({
      getSession: () => ref.session,
      setSession: (s: IGameSession) => {
        ref.session = s;
      },
      d6RollerForResolvers: () => undefined,
      diceRollerForResolvers: () => undefined,
      physicalContextByUnit: () => new Map(),
      waterDepthAt: () => 0,
      environmentHeatEffectAt: () => 0,
      isGameOver: () => false,
    });

    const swarmEvents = ref.session.events.filter(
      (e) => e.type === GameEventType.SwarmDamage,
    );
    expect(swarmEvents).toHaveLength(0);
  });

  it('preserves the session ammo + heat state (swarm fire never consumes ammo or generates heat)', () => {
    // BA has no heat track and swarm fire is an auto-hit free attack -- no
    // ammo / heat side effects.  This regression locks that contract.
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    let session = advanceToEndPhase(fresh);
    session = attachSwarmer(session, 'ba-swarmer', 'locust-host');

    const heatBefore = session.currentState.units['ba-swarmer'].heat;
    const ammoStateBefore = session.currentState.units['ba-swarmer'].ammoState;
    const ammoStateBeforeKeys = Object.keys(ammoStateBefore ?? {}).sort();

    const ref = { session };
    advanceInteractiveSessionPhase(
      endPhaseContext(ref, makeSwarmFireOptions()),
    );

    const heatAfter = ref.session.currentState.units['ba-swarmer'].heat;
    const ammoStateAfter =
      ref.session.currentState.units['ba-swarmer'].ammoState;
    const ammoStateAfterKeys = Object.keys(ammoStateAfter ?? {}).sort();

    expect(heatAfter).toBe(heatBefore);
    expect(ammoStateAfterKeys).toEqual(ammoStateBeforeKeys);
  });

  it('skips destroyed squads (no event emitted when attacker is destroyed)', () => {
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    let session = advanceToEndPhase(fresh);
    session = attachSwarmer(session, 'ba-swarmer', 'locust-host');

    // Mark the squad destroyed.
    session.currentState.units['ba-swarmer'] = {
      ...session.currentState.units['ba-swarmer'],
      destroyed: true,
    };

    const ref = { session };
    advanceInteractiveSessionPhase(
      endPhaseContext(ref, makeSwarmFireOptions()),
    );

    const swarmEvents = ref.session.events.filter(
      (e) => e.type === GameEventType.SwarmDamage,
    );
    expect(swarmEvents).toHaveLength(0);
  });

  it('stamps the End phase + correct turn on the emitted SwarmDamage event', () => {
    const fresh = createGameSession(
      {
        mapRadius: 10,
        turnLimit: 0,
        victoryConditions: ['elimination'],
        optionalRules: [],
      } as never,
      buildUnits(),
    );
    let session = advanceToEndPhase(fresh);
    session = attachSwarmer(session, 'ba-swarmer', 'locust-host');

    const expectedTurn = session.currentState.turn;

    const ref = { session };
    advanceInteractiveSessionPhase(
      endPhaseContext(ref, makeSwarmFireOptions()),
    );

    const swarmEvents = ref.session.events.filter(
      (e) => e.type === GameEventType.SwarmDamage,
    );
    expect(swarmEvents).toHaveLength(1);
    expect(swarmEvents[0].phase).toBe(GamePhase.End);
    expect(swarmEvents[0].turn).toBe(expectedTurn);
  });
});
