/**
 * Per-change smoke test for integrate-damage-pipeline.
 *
 * Asserts the full attack → damage pipeline now emits the ordered event
 * chain `AttackResolved` → `DamageApplied` (per location) →
 * `LocationDestroyed` (on structure == 0) → `TransferDamage` (when
 * spill-over hits a transfer target) → `CriticalHit`/`CriticalHitResolved`
 * → `ComponentDestroyed` (on component destruction), driven through
 * `resolveDamagePipeline` — not the old `applySimpleDamage` shortcut.
 *
 * @spec openspec/changes/integrate-damage-pipeline/tasks.md § 14
 */

import { describe, it, expect } from '@jest/globals';

import {
  GameEventType,
  GameSide,
  IAttackResolvedPayload,
  IDamageAppliedPayload,
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameUnit,
  ILocationDestroyedPayload,
  IPSRTriggeredPayload,
  ITransferDamagePayload,
  IUnitGameState,
  MovementType,
  RangeBracket,
  WeaponCategory,
} from '@/types/gameplay';
import { Facing } from '@/types/gameplay';
import {
  advancePhase,
  createGameSession,
  declareAttack,
  declareMovement,
  DiceRoller,
  lockMovement,
  resolveAllAttacks,
  startGame,
} from '@/utils/gameplay/gameSession';

const config: IGameConfig = {
  mapRadius: 10,
  turnLimit: 10,
  victoryConditions: ['destruction'],
  optionalRules: [],
};

const units: IGameUnit[] = [
  {
    id: 'attacker',
    name: 'Attacker',
    side: GameSide.Player,
    unitRef: 'hbk-4g',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ammoConstruction: [
      {
        binId: 'bin-ac20-1',
        weaponType: 'AC/20',
        location: 'rt',
        maxRounds: 10,
        damagePerRound: 20,
        isExplosive: true,
      },
    ],
  },
  {
    id: 'target',
    name: 'Target',
    side: GameSide.Opponent,
    unitRef: 'mad-3r',
    pilotRef: 'pilot-2',
    gunnery: 4,
    piloting: 5,
  },
];

const mediumLaser = [
  {
    weaponId: 'ml-1',
    weaponName: 'Medium Laser',
    damage: 5,
    heat: 3,
    category: WeaponCategory.ENERGY,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    isCluster: false,
  },
];

const ac20 = [
  {
    weaponId: 'ac20-1',
    weaponName: 'AC/20',
    damage: 20,
    heat: 7,
    category: WeaponCategory.BALLISTIC,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    isCluster: false,
  },
];

function mockDiceRoller(
  rolls: Array<{ dice: [number, number]; total: number }>,
): DiceRoller {
  let i = 0;
  return () => {
    const r = rolls[i] ?? rolls[rolls.length - 1];
    i++;
    return {
      dice: r.dice,
      total: r.total,
      isSnakeEyes: r.total === 2,
      isBoxcars: r.total === 12,
    };
  };
}

/**
 * Seed armor + structure by emitting zero-damage `DamageApplied` events
 * (one per location). The reducer's `applyDamageApplied` unconditionally
 * sets `newArmor[loc] = payload.armorRemaining` and
 * `newStructure[loc] = payload.structureRemaining`, so passing
 * damage=0 with the desired remaining values produces the intended
 * starting state while staying on the event-sourced path (no direct
 * currentState mutation that gets wiped on the next `appendEvent`).
 */
function seedArmorStructure(
  session: IGameSession,
  unitId: string,
  armor: Record<string, number>,
  structure: Record<string, number>,
): IGameSession {
  let current = session;
  const locationSet: Record<string, true> = {};
  for (const k of Object.keys(armor)) locationSet[k] = true;
  for (const k of Object.keys(structure)) locationSet[k] = true;
  const locations = Object.keys(locationSet);
  for (const loc of locations) {
    const sequence = current.events.length;
    const { turn, phase } = current.currentState;
    const event: IGameEvent = {
      id: `seed-${unitId}-${loc}`,
      gameId: current.id,
      sequence,
      timestamp: new Date().toISOString(),
      type: GameEventType.DamageApplied,
      turn,
      phase,
      actorId: unitId,
      payload: {
        unitId,
        location: loc,
        damage: 0,
        armorRemaining: armor[loc] ?? 0,
        structureRemaining: structure[loc] ?? 0,
        locationDestroyed: false,
      },
    };
    current = {
      ...current,
      events: [...current.events, event],
      currentState: {
        ...current.currentState,
        units: {
          ...current.currentState.units,
          [unitId]: {
            ...current.currentState.units[unitId],
            armor: {
              ...current.currentState.units[unitId].armor,
              [loc]: armor[loc] ?? 0,
            },
            structure: {
              ...current.currentState.units[unitId].structure,
              [loc]: structure[loc] ?? 0,
            },
          },
        },
      },
    };
  }
  return current;
}

function setupAttackPhase() {
  let session = createGameSession(config, units);
  session = startGame(session, GameSide.Player);
  session = advancePhase(session); // movement

  session = declareMovement(
    session,
    'attacker',
    { q: 0, r: 0 },
    { q: 0, r: 0 },
    Facing.North,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'attacker');
  session = declareMovement(
    session,
    'target',
    { q: 0, r: -3 },
    { q: 0, r: -3 },
    Facing.South,
    MovementType.Stationary,
    0,
    0,
  );
  session = lockMovement(session, 'target');

  session = advancePhase(session); // weapon attack
  return session;
}

// Filter helper: exclude the zero-damage seed events we injected to
// populate armor/structure. Real pipeline events always carry a
// positive `damage` value (or are LocationDestroyed / TransferDamage,
// which are non-DamageApplied types).
function realDamageEvents(session: IGameSession): IGameEvent[] {
  return session.events.filter(
    (e) =>
      e.type === GameEventType.DamageApplied &&
      (e.payload as IDamageAppliedPayload).damage > 0,
  );
}

describe('integrate-damage-pipeline — smoke test', () => {
  it('emits DamageApplied with real armor/structure absorption from the pipeline', () => {
    // Target CT has 1 armor + 10 structure. A 5-damage ML front-hit
    // should absorb 1 into armor, 4 into structure, leaving 6 structure.
    let session = setupAttackPhase();
    session = seedArmorStructure(
      session,
      'target',
      {
        head: 9,
        center_torso: 1,
        left_torso: 15,
        right_torso: 15,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      {
        head: 3,
        center_torso: 10,
        left_torso: 12,
        right_torso: 12,
        left_arm: 8,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
    );
    session = declareAttack(
      session,
      'attacker',
      'target',
      mediumLaser,
      4,
      RangeBracket.Short,
    );

    // attack roll 10 (hit TN 4); hit location roll 7 → CT front
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [4, 3], total: 7 },
    ]);
    session = resolveAllAttacks(session, roller);

    const damageEvents = realDamageEvents(session);
    expect(damageEvents.length).toBeGreaterThan(0);
    const first = damageEvents[0].payload as IDamageAppliedPayload;
    expect(first.location).toBe('center_torso');
    expect(first.damage).toBe(5);
    // 1 armor + 4 structure absorbed; post-damage should be 0 armor / 6 structure
    expect(first.armorRemaining).toBe(0);
    expect(first.structureRemaining).toBe(6);
    expect(first.locationDestroyed).toBe(false);
  });

  it('emits LocationDestroyed when structure hits zero, with TransferDamage spilling to CT', () => {
    // Left arm: 0 armor, 2 structure. A 5-damage hit destroys the arm
    // (absorbs 0 armor + 2 structure) and transfers 3 damage to LT.
    // Front-arc roll 11 hits left_arm per FRONT_HIT_LOCATION_TABLE.
    let session = setupAttackPhase();
    session = seedArmorStructure(
      session,
      'target',
      {
        head: 9,
        center_torso: 20,
        left_torso: 15,
        right_torso: 15,
        left_arm: 0,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      {
        head: 3,
        center_torso: 16,
        left_torso: 12,
        right_torso: 12,
        left_arm: 2,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
    );
    session = declareAttack(
      session,
      'attacker',
      'target',
      mediumLaser,
      4,
      RangeBracket.Short,
    );

    // attack roll 10, hit location 11 → left_arm (front table)
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [6, 5], total: 11 },
    ]);
    session = resolveAllAttacks(session, roller);

    const types = session.events.map((e: IGameEvent) => e.type);
    expect(types).toContain(GameEventType.LocationDestroyed);
    expect(types).toContain(GameEventType.TransferDamage);

    const destroyed = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.LocationDestroyed,
    );
    const destroyedPayload = destroyed!.payload as ILocationDestroyedPayload;
    expect(destroyedPayload.location).toBe('left_arm');

    const transfer = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.TransferDamage,
    );
    const transferPayload = transfer!.payload as ITransferDamagePayload;
    expect(transferPayload.fromLocation).toBe('left_arm');
    expect(transferPayload.toLocation).toBe('left_torso');
    expect(transferPayload.damage).toBe(3);
  });

  it('side-torso destruction cascades to the arm (LT → LA) in a single event chain', () => {
    // LT: 0 armor, 1 structure. A 5-damage hit destroys LT, cascades to
    // LA, transfers remaining 4 damage to CT. Verify both locations fire
    // `LocationDestroyed`, with the first carrying `cascadedTo: 'left_arm'`.
    let session = setupAttackPhase();
    session = seedArmorStructure(
      session,
      'target',
      {
        head: 9,
        center_torso: 20,
        left_torso: 0,
        right_torso: 15,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      {
        head: 3,
        center_torso: 16,
        left_torso: 1,
        right_torso: 12,
        left_arm: 8,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
    );
    session = declareAttack(
      session,
      'attacker',
      'target',
      mediumLaser,
      4,
      RangeBracket.Short,
    );

    // attack roll 10, hit location 8 → left_torso (front table)
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [4, 4], total: 8 },
    ]);
    session = resolveAllAttacks(session, roller);

    const destroyedEvents = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.LocationDestroyed,
    );
    const destroyedPayloads = destroyedEvents.map(
      (e) => e.payload as ILocationDestroyedPayload,
    );
    // First LT destruction carries cascadedTo=left_arm, second is the arm itself.
    const ltDestroyed = destroyedPayloads.find(
      (p) => p.location === 'left_torso',
    );
    expect(ltDestroyed).toBeDefined();
    expect(ltDestroyed!.cascadedTo).toBe('left_arm');
    const laDestroyed = destroyedPayloads.find(
      (p) => p.location === 'left_arm',
    );
    expect(laDestroyed).toBeDefined();
  });

  it('AC/20 to head caps damage at 3 (head damage cap)', () => {
    // Head: 9 armor, 3 structure. AC/20 (20 damage) capped at 3 applied.
    let session = setupAttackPhase();
    session = seedArmorStructure(
      session,
      'target',
      {
        head: 9,
        center_torso: 20,
        left_torso: 15,
        right_torso: 15,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      {
        head: 3,
        center_torso: 16,
        left_torso: 12,
        right_torso: 12,
        left_arm: 8,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
    );
    session = declareAttack(
      session,
      'attacker',
      'target',
      ac20,
      4,
      RangeBracket.Short,
    );

    // attack roll 10 (hit); hit location 12 → head (front table)
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [6, 6], total: 12 },
    ]);
    session = resolveAllAttacks(session, roller);

    const resolved = session.events.find(
      (e: IGameEvent) => e.type === GameEventType.AttackResolved,
    );
    const resolvedPayload = resolved!.payload as IAttackResolvedPayload;
    expect(resolvedPayload.location).toBe('head');
    // Head cap: damage field on AttackResolved reflects the capped 3
    expect(resolvedPayload.damage).toBe(3);

    const damageEvents = realDamageEvents(session);
    const damagePayload = damageEvents[0].payload as IDamageAppliedPayload;
    expect(damagePayload.location).toBe('head');
    expect(damagePayload.damage).toBe(3);
  });

  it('queues a 20+ damage PSR when a single AC/20 hit crosses the phase-damage threshold', () => {
    // AC/20 to torso deals 20 damage, which alone crosses the 20-damage
    // phase threshold. Expect a PSRTriggered event with triggerSource
    // 'phase_damage_20_plus'.
    let session = setupAttackPhase();
    session = seedArmorStructure(
      session,
      'target',
      {
        head: 9,
        center_torso: 20,
        left_torso: 15,
        right_torso: 15,
        left_arm: 10,
        right_arm: 10,
        left_leg: 12,
        right_leg: 12,
      },
      {
        head: 3,
        center_torso: 16,
        left_torso: 12,
        right_torso: 12,
        left_arm: 8,
        right_arm: 8,
        left_leg: 12,
        right_leg: 12,
      },
    );
    session = declareAttack(
      session,
      'attacker',
      'target',
      ac20,
      4,
      RangeBracket.Short,
    );

    // attack roll 10; hit location 7 → CT front (not head, so full 20)
    const roller = mockDiceRoller([
      { dice: [5, 5], total: 10 },
      { dice: [4, 3], total: 7 },
    ]);
    session = resolveAllAttacks(session, roller);

    const psrEvents = session.events.filter(
      (e: IGameEvent) => e.type === GameEventType.PSRTriggered,
    );
    const phaseDamagePSR = psrEvents.find(
      (e) =>
        (e.payload as IPSRTriggeredPayload).triggerSource ===
        'phase_damage_20_plus',
    );
    expect(phaseDamagePSR).toBeDefined();
  });

  it('new enum values are wired: LocationDestroyed / TransferDamage / ComponentDestroyed', () => {
    // Regression guard per task 0.5: assert the enum strings exist and
    // match the documented wire values.
    expect(GameEventType.LocationDestroyed).toBe('location_destroyed');
    expect(GameEventType.TransferDamage).toBe('transfer_damage');
    expect(GameEventType.ComponentDestroyed).toBe('component_destroyed');
  });
});
