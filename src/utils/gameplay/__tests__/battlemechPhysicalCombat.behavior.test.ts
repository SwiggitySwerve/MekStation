import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  type IComponentDamageState,
  type IDamageAppliedPayload,
  type IGameSession,
  type IGameUnit,
  type IPhysicalAttackDeclaredPayload,
  type IPilotHitPayload,
  type IPhysicalAttackResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitDestroyedPayload,
  type IUnitFellPayload,
  type IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { DiceRoller } from '../diceTypes';

import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '../gameSession';
import {
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackContext,
} from '../gameSessionPhysical';
import { resolvePendingPSRs } from '../gameSessionPSR';
import { createHexGrid, placeUnit } from '../hexGrid';
import {
  chooseBestPhysicalAttack,
  getEligiblePhysicalAttacks,
  type PhysicalAttackType,
} from '../physicalAttacks';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

const STANDARD_ARMOR = {
  head: 9,
  center_torso: 31,
  left_torso: 22,
  right_torso: 22,
  left_arm: 17,
  right_arm: 17,
  left_leg: 21,
  right_leg: 21,
};

const STANDARD_STRUCTURE = {
  head: 3,
  center_torso: 21,
  left_torso: 14,
  right_torso: 14,
  left_arm: 11,
  right_arm: 11,
  left_leg: 14,
  right_leg: 14,
};

function unitState(
  id: string,
  side: GameSide,
  position = { q: 0, r: 0 },
  overrides: Partial<IUnitGameState> = {},
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery: 4,
    piloting: 5,
    armor: {},
    structure: {},
    startingInternalStructure: {},
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    damageThisPhase: 0,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    shutdown: false,
    ammoState: {},
    pendingPSRs: [],
    weaponsFiredThisTurn: [],
    jammedWeapons: [],
    narcedBy: [],
    tagDesignated: false,
    isRetreating: false,
    hasRetreated: false,
    ...overrides,
  };
}

function gameUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'attacker',
      name: 'Physical Attacker',
      side: GameSide.Player,
      unitRef: 'attacker-ref',
      pilotRef: 'attacker-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'target',
      name: 'Physical Target',
      side: GameSide.Opponent,
      unitRef: 'target-ref',
      pilotRef: 'target-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function physicalPhaseSession(
  extraUnits: readonly IGameUnit[] = [],
): IGameSession {
  let session = createGameSession(
    {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [...gameUnits(), ...extraUnits],
    { id: 'physical-validation' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player, scriptedD6([6, 1, 6, 1]));
  session = advancePhase(session);
  session = advancePhase(session);
  session = advancePhase(session);
  expect(session.currentState.phase).toBe(GamePhase.PhysicalAttack);
  return session;
}

function scriptedD6(values: readonly number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function scriptedDice(firstDice: readonly number[]): DiceRoller {
  let i = 0;
  return () => {
    const first = firstDice[Math.min(i++, firstDice.length - 1)];
    return {
      dice: [first, 1],
      total: first + 1,
      isSnakeEyes: first === 1,
      isBoxcars: first === 6,
    };
  };
}

function physicalContext(
  overrides: Partial<IPhysicalAttackContext> = {},
): IPhysicalAttackContext {
  return {
    attackerTonnage: 80,
    targetTonnage: 75,
    pilotingSkill: 5,
    ...overrides,
  };
}

function adjacentPhysicalGrid() {
  let grid = createHexGrid({ radius: 3 });
  grid = placeUnit(grid, { q: 0, r: 0 }, 'attacker');
  grid = placeUnit(grid, { q: 1, r: 0 }, 'target');
  return grid;
}

function sameHexPhysicalGrid(terrain = 'clear') {
  let grid = createHexGrid({ radius: 3 });
  grid = placeUnit(grid, { q: 0, r: 0 }, 'attacker');
  const hexes = new Map(grid.hexes);
  const hex = hexes.get('0,0');
  if (hex) {
    hexes.set('0,0', { ...hex, terrain });
  }
  return { ...grid, hexes };
}

function breakGrapplePhysicalGrid() {
  const grid = sameHexPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const dangerousHex = hexes.get('1,0');
  if (dangerousHex) {
    hexes.set('1,0', { ...dangerousHex, terrain: 'magma' });
  }
  return { ...grid, hexes };
}

function blockedDfaDisplacementGrid() {
  let grid = adjacentPhysicalGrid();
  [
    { q: 1, r: 1 },
    { q: 0, r: 1 },
    { q: 2, r: 0 },
    { q: 1, r: -1 },
    { q: 2, r: -1 },
  ].forEach((coord, index) => {
    grid = placeUnit(grid, coord, `blocker-${index}`);
  });
  const hexes = new Map(grid.hexes);
  for (const key of ['1,1', '0,1', '2,0', '0,0', '1,-1', '2,-1']) {
    const hex = hexes.get(key);
    if (hex) {
      hexes.set(key, { ...hex, terrain: 'impassable' });
    }
  }
  grid = { ...grid, hexes };
  return grid;
}

function blockedChargeDisplacementGrid() {
  let grid = placeUnit(
    adjacentPhysicalGrid(),
    { q: 1, r: 1 },
    'charge-blocker',
  );
  grid = placeUnit(grid, { q: 1, r: 2 }, 'charge-domino-blocker');
  return grid;
}

function dominoChargeDisplacementGrid() {
  return placeUnit(adjacentPhysicalGrid(), { q: 1, r: 1 }, 'domino-blocker');
}

function friendlyDfaMissDisplacementGrid() {
  return placeUnit(adjacentPhysicalGrid(), { q: 1, r: 1 }, 'target-friend');
}

function elevatedChargeDisplacementGrid() {
  const grid = adjacentPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const destination = hexes.get('1,1');
  if (destination) {
    hexes.set('1,1', { ...destination, elevation: 3 });
  }
  return { ...grid, hexes };
}

function prohibitedChargeDisplacementGrid(terrain: string = 'impassable') {
  const grid = adjacentPhysicalGrid();
  const hexes = new Map(grid.hexes);
  const destination = hexes.get('1,1');
  if (destination) {
    hexes.set('1,1', { ...destination, terrain });
  }
  return { ...grid, hexes };
}

function withUnitState(
  session: IGameSession,
  unitId: string,
  overrides: Partial<IUnitGameState>,
): IGameSession {
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units: {
        ...session.currentState.units,
        [unitId]: {
          ...session.currentState.units[unitId],
          ...overrides,
        },
      },
    },
  };
}

function withPhysicalPositions(
  session: IGameSession,
  attackerOverrides: Partial<IUnitGameState> = {},
  targetOverrides: Partial<IUnitGameState> = {},
): IGameSession {
  let positioned = withUnitState(session, 'attacker', {
    position: { q: 0, r: 0 },
    facing: Facing.Southeast,
    ...attackerOverrides,
  });
  positioned = withUnitState(positioned, 'target', {
    position: { q: 1, r: 0 },
    ...targetOverrides,
  });
  return positioned;
}

function withoutUnitState(session: IGameSession, unitId: string): IGameSession {
  const { [unitId]: _removed, ...units } = session.currentState.units;
  return {
    ...session,
    currentState: {
      ...session.currentState,
      units,
    },
  };
}

function declareAdjacentPhysicalAttack(
  attackType: PhysicalAttackType,
  context: IPhysicalAttackContext,
  attackerOverrides: Partial<IUnitGameState> = {},
  targetOverrides: Partial<IUnitGameState> = {},
): IGameSession {
  const session = withPhysicalPositions(
    physicalPhaseSession(),
    attackerOverrides,
    targetOverrides,
  );
  const declared = declarePhysicalAttack(
    session,
    'attacker',
    'target',
    attackType,
    context,
  );

  // Declaration appends an event and rebuilds state from the event log; keep
  // the resolver fixture positions aligned with the declaration fixture.
  return withPhysicalPositions(declared, attackerOverrides, targetOverrides);
}

describe('BattleMech physical combat behavior validation lane', () => {
  it('projects every runtime-supported physical action with rule modifiers', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });
    const meleeWeapons: readonly PhysicalAttackType[] = [
      'hatchet',
      'sword',
      'mace',
      'lance',
      'retractable-blade',
      'flail',
      'wrecking-ball',
    ];

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      targetMovementModifier: 2,
      attackerMovementModifier: 1,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      meleeWeaponsEquipped: meleeWeapons,
      optionalRules: ['tacops_trip_attack', 'tacops_grappling'],
      pushDestinationValid: true,
    });

    expect(
      options.map((option) => `${option.attackType}:${option.limb ?? '-'}`),
    ).toEqual([
      'punch:leftArm',
      'punch:rightArm',
      'kick:leftLeg',
      'kick:rightLeg',
      'charge:-',
      'dfa:-',
      'push:-',
      'grapple:-',
      'trip:-',
      'hatchet:leftArm',
      'hatchet:rightArm',
      'sword:leftArm',
      'sword:rightArm',
      'mace:leftArm',
      'mace:rightArm',
      'lance:leftArm',
      'lance:rightArm',
      'retractable-blade:leftArm',
      'retractable-blade:rightArm',
      'flail:leftArm',
      'flail:rightArm',
      'wrecking-ball:-',
    ]);
    expect(
      options.every((option) => option.restrictionsFailed.length === 0),
    ).toBe(true);

    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );
    expect(byType.get('kick')?.toHit.finalToHit).toBe(5);
    expect(byType.get('charge')?.toHit.finalToHit).toBe(8);
    expect(byType.get('dfa')?.toHit.finalToHit).toBe(7);
    expect(byType.get('grapple')?.toHit.finalToHit).toBe(7);
    expect(byType.get('sword')?.toHit.finalToHit).toBe(5);
    expect(byType.get('mace')?.toHit.finalToHit).toBe(8);
    expect(byType.get('lance')?.toHit.finalToHit).toBe(8);
    expect(byType.get('retractable-blade')?.toHit.finalToHit).toBe(5);
    expect(byType.get('flail')?.toHit.finalToHit).toBe(7);
    expect(byType.get('wrecking-ball')?.toHit.finalToHit).toBe(8);
    expect(byType.get('sword')?.damage.targetDamage).toBe(9);
    expect(byType.get('mace')?.damage.targetDamage).toBe(20);
    expect(byType.get('lance')?.damage.targetDamage).toBe(16);
    expect(byType.get('retractable-blade')?.damage.targetDamage).toBe(8);
    expect(byType.get('flail')?.damage.targetDamage).toBe(9);
    expect(byType.get('wrecking-ball')?.damage.targetDamage).toBe(8);
  });

  it('applies attacker spotting to every physical to-hit family', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isSpotting: true,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerMovementModifier: 1,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      meleeWeaponsEquipped: ['sword'],
      pushDestinationValid: true,
    });
    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );

    for (const attackType of [
      'punch',
      'kick',
      'charge',
      'dfa',
      'push',
      'sword',
    ] as const) {
      expect(byType.get(attackType)?.toHit.modifiers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Attacker spotting',
            value: 1,
            source: 'other',
          }),
        ]),
      );
    }
    expect(byType.get('punch')?.toHit.finalToHit).toBe(6);
    expect(byType.get('charge')?.toHit.finalToHit).toBe(7);
  });

  it('projects break-grapple only for the current grappled target', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        grappledUnitId: 'target',
        isGrappleAttacker: true,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 0, r: 0 },
      {
        grappledUnitId: 'attacker',
        isGrappleAttacker: false,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      optionalRules: ['tacops_grappling'],
    });
    const breakGrapple = options.find(
      (option) => option.attackType === 'break-grapple',
    );

    expect(breakGrapple).toBeDefined();
    expect(breakGrapple?.restrictionsFailed).toEqual([]);
    expect(breakGrapple?.toHit).toMatchObject({
      automaticHit: true,
      finalToHit: 0,
    });
  });

  it('projects optional jump jet attack when TacOps state and selected-leg jump jets are supplied', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      optionalRules: ['tacops_jump_jet_attack'],
      rightReadyJumpJetCount: 2,
      standingAttackerHeightAboveTargetHeight: 1,
    });
    const jumpJetAttack = options.find(
      (option) => option.attackType === 'jump-jet-attack',
    );

    expect(jumpJetAttack).toMatchObject({
      attackType: 'jump-jet-attack',
      limb: 'rightLeg',
      restrictionsFailed: [],
      toHit: { finalToHit: 7 },
      damage: { targetDamage: 6, attackerDamage: 0 },
    });
  });

  it('projects source-backed brush-off against swarming infantry with miss self-damage risk', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isSwarming: true,
        unitType: UnitType.INFANTRY,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
    });
    const brushOff = options.find(
      (option) => option.attackType === 'brush-off',
    );

    expect(brushOff).toMatchObject({
      attackType: 'brush-off',
      limb: 'rightArm',
      restrictionsFailed: [],
      toHit: { finalToHit: 9 },
      damage: { targetDamage: 8, attackerDamage: 0 },
      selfRisk: { damageToAttacker: 8, onMiss: 'None' },
    });
  });

  it('projects source-backed optional TacOps grapple as zero-damage state attack', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      optionalRules: ['tacops_grappling'],
      targetMovementModifier: 2,
    });
    const grapple = options.find((option) => option.attackType === 'grapple');

    expect(grapple).toMatchObject({
      attackType: 'grapple',
      restrictionsFailed: [],
      toHit: { finalToHit: 7 },
      damage: { targetDamage: 0, attackerDamage: 0 },
      selfRisk: { damageToAttacker: 0, onMiss: null },
    });
  });

  it('projects source-backed talon damage on kick and DFA rows', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        leftLegHasTalons: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });
    const leftKick = options.find(
      (option) => option.attackType === 'kick' && option.limb === 'leftLeg',
    );
    const rightKick = options.find(
      (option) => option.attackType === 'kick' && option.limb === 'rightLeg',
    );
    const dfa = options.find((option) => option.attackType === 'dfa');

    expect(leftKick?.damage.targetDamage).toBe(24);
    expect(rightKick?.damage.targetDamage).toBe(16);
    expect(dfa?.damage.targetDamage).toBe(36);
  });

  it('projects source-backed quad front-leg talon damage from arm-location state', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isQuad: true,
        rightArmHasTalons: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });
    const leftKick = options.find(
      (option) => option.attackType === 'kick' && option.limb === 'leftLeg',
    );
    const rightKick = options.find(
      (option) => option.attackType === 'kick' && option.limb === 'rightLeg',
    );
    const dfa = options.find((option) => option.attackType === 'dfa');

    expect(leftKick?.damage.targetDamage).toBe(16);
    expect(rightKick?.damage.targetDamage).toBe(24);
    expect(dfa?.damage.targetDamage).toBe(36);
  });

  it('projects source-backed claw modifiers on matching punch rows', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        leftArmHasClaw: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 55,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });
    const leftPunch = options.find(
      (option) => option.attackType === 'punch' && option.limb === 'leftArm',
    );
    const rightPunch = options.find(
      (option) => option.attackType === 'punch' && option.limb === 'rightArm',
    );

    expect(leftPunch?.damage.targetDamage).toBe(8);
    expect(leftPunch?.toHit.finalToHit).toBe(6);
    expect(rightPunch?.damage.targetDamage).toBe(6);
    expect(rightPunch?.toHit.finalToHit).toBe(5);
  });

  it('projects PLAYTEST_3 claw to-hit relief while keeping claw punch damage', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        leftArmHasClaw: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 55,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      optionalRules: ['PLAYTEST_3'],
      pushDestinationValid: true,
    });
    const leftPunch = options.find(
      (option) => option.attackType === 'punch' && option.limb === 'leftArm',
    );

    expect(leftPunch?.damage.targetDamage).toBe(8);
    expect(leftPunch?.toHit.finalToHit).toBe(5);
    expect(leftPunch?.toHit.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Using Claws',
        value: 0,
        source: 'physical-equipment',
      }),
    );
  });

  it('projects missing-limb restrictions on punch and kick rows', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        destroyedLocations: ['right_arm', 'left_leg'],
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });
    const optionByKey = new Map(
      options.map((option) => [
        `${option.attackType}:${option.limb ?? '-'}`,
        option,
      ]),
    );

    expect(optionByKey.get('punch:leftArm')?.restrictionsFailed).not.toContain(
      'LimbMissing',
    );
    expect(optionByKey.get('punch:rightArm')?.restrictionsFailed).toContain(
      'LimbMissing',
    );
    expect(optionByKey.get('kick:leftLeg')?.restrictionsFailed).toContain(
      'LimbMissing',
    );
    expect(optionByKey.get('kick:rightLeg')?.restrictionsFailed).toContain(
      'LimbMissing',
    );
  });

  it('projects passenger physical targets as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isPassenger: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetPassenger'),
      ),
    ).toBe(true);
  });

  it('removes ejected units from physical target eligibility', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        hasEjected: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(0);
  });

  it('removes retreated units from physical target eligibility', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        hasRetreated: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(0);
  });

  it('projects swarming physical targets as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isSwarming: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetSwarming'),
      ),
    ).toBe(true);
  });

  it('projects targets making DFA as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isMakingDFA: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetMakingDFA'),
      ),
    ).toBe(true);
  });

  it('projects charge and DFA displacement conflicts as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isMakingDisplacementAttack: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });
    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );

    expect(options).toHaveLength(8);
    expect(byType.get('charge')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('dfa')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('kick')?.restrictionsFailed).not.toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('push')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
  });

  it('projects push displacement conflicts with counter-push ownership', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        targetedByDisplacementAttackerId: 'other-attacker',
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isMakingDisplacementAttack: true,
        isPushing: true,
        displacementAttackTargetId: 'third-unit',
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });
    const byType = new Map(
      options.map((option) => [option.attackType, option]),
    );

    expect(options).toHaveLength(8);
    expect(byType.get('push')?.restrictionsFailed).toContain(
      'TargetPushingAnotherMek',
    );
    expect(byType.get('charge')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
    expect(byType.get('dfa')?.restrictionsFailed).toContain(
      'TargetMakingDisplacementAttack',
    );
  });

  it('projects targets inside another building as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        occupiedBuildingId: 'building-east',
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetInsideBuilding'),
      ),
    ).toBe(true);
  });

  it('projects airborne targets as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isAirborne: true,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('TargetAirborne'),
      ),
    ).toBe(true);
  });

  it('projects reachable airborne VTOL targets as DFA candidates', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Jump,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        isAirborne: true,
        unitType: UnitType.VTOL,
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
      attackerJumpMP: 3,
      elevationDifference: 4,
    });
    const dfa = options.find((option) => option.attackType === 'dfa');
    const kick = options.find((option) => option.attackType === 'kick');

    expect(dfa?.restrictionsFailed).toEqual([]);
    expect(kick?.restrictionsFailed).toContain('TargetAirborne');
  });

  it('projects mechanical jump booster DFA attempts as restricted', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Jump,
        usedMechanicalJumpBoosterThisTurn: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
    });
    const dfa = options.find((option) => option.attackType === 'dfa');

    expect(dfa?.restrictionsFailed).toContain('MechanicalJumpBooster');
  });

  it('projects evading attackers as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isEvading: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('AttackerEvading'),
      ),
    ).toBe(true);
  });

  it('projects cargo-interacting attackers as restricted physical options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        isLoadingOrUnloadingCargo: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('AttackerCargoInteraction'),
      ),
    ).toBe(true);
  });

  it('projects different-board physical targets as restricted options', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        boardId: 'board-alpha',
        facing: Facing.Southeast,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      {
        boardId: 'board-beta',
      },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
      attackerJumpedThisTurn: true,
      pushDestinationValid: true,
    });

    expect(options).toHaveLength(8);
    expect(
      options.every((option) =>
        option.restrictionsFailed.includes('DifferentBoard'),
      ),
    ).toBe(true);
  });

  it('surfaces distinct physical restriction reasons instead of hiding them', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      weaponsFiredFromLeftArm: ['left-medium-laser'],
      limbsUsedThisTurn: ['rightLeg'],
      attackerRanThisTurn: false,
      attackerJumpedThisTurn: false,
      meleeWeaponsEquipped: ['hatchet'],
      pushDestinationValid: false,
    });

    const reasonByRow = new Map(
      options.map((option) => [
        `${option.attackType}:${option.limb ?? '-'}`,
        option.restrictionsFailed,
      ]),
    );

    expect(reasonByRow.get('punch:leftArm')).toEqual(['WeaponFiredThisTurn']);
    expect(reasonByRow.get('kick:rightLeg')).toEqual(['SameLimbUsedThisTurn']);
    expect(reasonByRow.get('charge:-')).toEqual(['NoRunThisTurn']);
    expect(reasonByRow.get('dfa:-')).toEqual(['NoJumpThisTurn']);
    expect(reasonByRow.get('push:-')).toEqual(['WeaponFiredThisTurn']);
    expect(reasonByRow.get('hatchet:leftArm')).toEqual(['WeaponFiredThisTurn']);
    expect(reasonByRow.get('hatchet:rightArm')).toEqual([]);
  });

  it('surfaces backward charge movement as an eligibility restriction', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['ChargeBackwardMovement']);
  });

  it('surfaces jump charge movement as an eligibility restriction', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        facing: Facing.Southeast,
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 5,
      },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
    });

    expect(
      options.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['ChargeJumpMovement']);
  });

  it('surfaces side-adjacent push targets as not directly ahead', () => {
    const attacker = unitState('attacker', GameSide.Player);
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });

    expect(
      options.find((option) => option.attackType === 'push')
        ?.restrictionsFailed,
    ).toEqual(['TargetNotDirectlyAhead']);
  });

  it('surfaces non-Mek unit types in push eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.BATTLE_ARMOR },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });

    expect(
      options.find((option) => option.attackType === 'push')
        ?.restrictionsFailed,
    ).toEqual(['TargetNotMek']);
  });

  it('surfaces airborne push attackers in eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { facing: Facing.Southeast, isAirborne: true },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      pushDestinationValid: true,
    });

    expect(
      options.find((option) => option.attackType === 'push')
        ?.restrictionsFailed,
    ).toEqual(['AttackerAirborne']);
  });

  it('surfaces standing-Mek target gates in charge eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });
    const nonMekTarget = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.BATTLE_ARMOR },
    );

    const nonMekTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      nonMekTarget,
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
      },
    );

    expect(
      nonMekTargetOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetNotMek']);

    const gunEmplacementTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        { unitType: 'Gun Emplacement' },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
      },
    );

    expect(
      gunEmplacementTargetOptions.find(
        (option) => option.attackType === 'charge',
      )?.restrictionsFailed,
    ).toEqual(['TargetNotMek']);

    const proneTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }, { prone: true }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
      },
    );

    expect(
      proneTargetOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetProne']);

    const elevatedTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
        elevationDifference: 2,
      },
    );

    expect(
      elevatedTargetOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['ElevationMismatch']);

    const targetStillMovingOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerRanThisTurn: true,
        targetMovementComplete: false,
      },
    );

    expect(
      targetStillMovingOptions.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetMovementIncomplete']);
  });

  it('surfaces DFA target movement gates in eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });

    const targetStillMovingOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState('target', GameSide.Opponent, { q: 1, r: 0 }),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
        targetMovementComplete: false,
      },
    );

    expect(
      targetStillMovingOptions.find((option) => option.attackType === 'dfa')
        ?.restrictionsFailed,
    ).toEqual(['TargetMovementIncomplete']);

    const immobileTargetOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        { shutdown: true },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
        targetMovementComplete: false,
      },
    );

    expect(
      immobileTargetOptions.find((option) => option.attackType === 'dfa')
        ?.restrictionsFailed,
    ).toEqual([]);
  });

  it('surfaces DFA target-class to-hit modifiers in eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });

    const infantryOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        {
          unitType: UnitType.INFANTRY,
        },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
      },
    );
    const battleArmorOptions = getEligiblePhysicalAttacks(
      attacker,
      unitState(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        {
          unitType: UnitType.BATTLE_ARMOR,
        },
      ),
      {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetTonnage: 75,
        attackerJumpedThisTurn: true,
      },
    );

    expect(
      infantryOptions.find((option) => option.attackType === 'dfa')?.toHit
        .finalToHit,
    ).toBe(8);
    expect(
      battleArmorOptions.find((option) => option.attackType === 'dfa')?.toHit
        .finalToHit,
    ).toBe(6);
  });

  it('surfaces DFA piloting skill differential in eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { piloting: 3 },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'dfa')?.toHit.finalToHit,
    ).toBe(7);
  });

  it('surfaces non-Mek charge target-class gates in eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { unitType: UnitType.VEHICLE },
    );
    const infantryTarget = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.INFANTRY },
    );

    const options = getEligiblePhysicalAttacks(attacker, infantryTarget, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerRanThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'charge')
        ?.restrictionsFailed,
    ).toEqual(['TargetInfantryOrProtoMek']);
  });

  it('surfaces infantry-family attacker gates in DFA eligibility projection', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      { unitType: UnitType.BATTLE_ARMOR },
    );
    const target = unitState('target', GameSide.Opponent, { q: 1, r: 0 });

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'dfa')?.restrictionsFailed,
    ).toEqual(['AttackerInfantry']);
  });

  it('surfaces DropShip target gates in DFA eligibility projection', () => {
    const attacker = unitState('attacker', GameSide.Player, { q: 0, r: 0 });
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 1, r: 0 },
      { unitType: UnitType.DROPSHIP },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 75,
      attackerJumpedThisTurn: true,
    });

    expect(
      options.find((option) => option.attackType === 'dfa')?.restrictionsFailed,
    ).toEqual(['TargetDropShip']);
  });

  it('projects source-backed thrash eligibility and rejects any prior weapon fire', () => {
    const attacker = unitState(
      'attacker',
      GameSide.Player,
      { q: 0, r: 0 },
      {
        prone: true,
      },
    );
    const target = unitState(
      'target',
      GameSide.Opponent,
      { q: 0, r: 0 },
      { unitType: UnitType.INFANTRY },
    );

    const options = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 5,
      weaponsFiredThisTurn: [],
      thrashBlockingTerrains: [],
    });
    const thrash = options.find((option) => option.attackType === 'thrash');

    expect(thrash).toMatchObject({
      restrictionsFailed: [],
      damage: {
        targetDamage: 27,
        attackerPSR: true,
        targetPSR: false,
      },
      selfRisk: {
        pilotingSkillRoll: {
          trigger: 'ThrashCompleted',
          required: true,
        },
      },
      toHit: {
        finalToHit: 0,
        automaticHit: true,
      },
    });

    const afterWeaponFire = getEligiblePhysicalAttacks(attacker, target, {
      attackerTonnage: 80,
      attackerPilotingSkill: 5,
      targetTonnage: 5,
      weaponsFiredThisTurn: ['center-torso-medium-laser'],
      thrashBlockingTerrains: [],
    });

    expect(
      afterWeaponFire.find((option) => option.attackType === 'thrash')
        ?.restrictionsFailed,
    ).toEqual(['WeaponFiredThisTurn']);
  });

  it('lets AI choose a lance when leg attacks are blocked', () => {
    const componentDamage = {
      ...DEFAULT_COMPONENT_DAMAGE,
      actuators: { [ActuatorType.HIP]: true },
    };

    expect(
      chooseBestPhysicalAttack(80, 5, componentDamage, {
        attackerProne: true,
        hasMeleeWeapon: 'lance',
      }),
    ).toBe('lance');
  });

  it('rejects blocked push declarations without scheduling a physical attack', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession()),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: false }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'DestinationBlocked',
    });
  });

  it('caps non-Melee Master units at one accepted physical attack declaration per turn', () => {
    let session = withPhysicalPositions(physicalPhaseSession());
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'punch',
      physicalContext({ limb: 'rightArm' }),
    );
    session = withPhysicalPositions(session);
    session = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'kick',
      physicalContext({ limb: 'rightLeg' }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'PhysicalAttackLimitReached',
    });
  });

  it('lets Melee Master declare two physical attacks but rejects the third', () => {
    const meleeMasterContext = physicalContext({
      pilotAbilities: ['melee_master'],
    });
    const meleeMasterState = { abilities: ['melee_master'] };
    let session = withPhysicalPositions(
      physicalPhaseSession(),
      meleeMasterState,
    );
    session = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...meleeMasterContext,
      limb: 'rightArm',
    });
    session = withPhysicalPositions(session, meleeMasterState);
    session = declarePhysicalAttack(session, 'attacker', 'target', 'kick', {
      ...meleeMasterContext,
      limb: 'rightLeg',
    });
    session = withPhysicalPositions(session, meleeMasterState);
    session = declarePhysicalAttack(session, 'attacker', 'target', 'push', {
      ...meleeMasterContext,
      pushDestinationValid: true,
    });

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const declaredPayloads = declarations.map(
      (event) => event.payload as IPhysicalAttackDeclaredPayload,
    );
    const rejection = session.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const rejectionPayload =
      rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declaredPayloads).toMatchObject([
      { attackType: 'punch', limb: 'rightArm' },
      { attackType: 'kick', limb: 'rightLeg' },
    ]);
    expect(rejectionPayload.location).toBe('PhysicalAttackLimitReached');
  });

  it('rejects a Melee Master second declaration that reuses the same limb', () => {
    const meleeMasterContext = physicalContext({
      pilotAbilities: ['melee_master'],
    });
    let session = withPhysicalPositions(physicalPhaseSession(), {
      abilities: ['melee_master'],
    });
    session = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...meleeMasterContext,
      limb: 'rightArm',
    });
    session = withPhysicalPositions(session, { abilities: ['melee_master'] });
    session = declarePhysicalAttack(session, 'attacker', 'target', 'punch', {
      ...meleeMasterContext,
      limb: 'rightArm',
    });

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(1);
    expect(payload.location).toBe('SameLimbUsedThisTurn');
  });

  it('rejects push declarations against prone targets before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { prone: true }),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetProne',
    });
  });

  it('rejects charge declarations with prone attackers, prone targets, or explicit non-Mek targets before scheduling resolution', () => {
    const proneAttacker = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        prone: true,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const proneAttackerPayload = proneAttacker.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      proneAttacker.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(proneAttackerPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerProne',
    });

    const proneTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        { prone: true },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const proneTargetPayload = proneTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      proneTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(proneTargetPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetProne',
    });

    const nonMekTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        { unitType: UnitType.PROTOMECH },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const nonMekTargetPayload = nonMekTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      nonMekTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(nonMekTargetPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });

    const gunEmplacementTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
        },
        { unitType: 'Gun Emplacement' },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const gunEmplacementTargetPayload = gunEmplacementTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      gunEmplacementTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(gunEmplacementTargetPayload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });
    expect(gunEmplacementTargetPayload.automaticHit).toBeUndefined();
  });

  it('rejects charge declarations after backward movement before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        movedBackwardThisTurn: true,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeBackwardMovement',
    });
  });

  it('rejects charge declarations after jump movement before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 5,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({ hexesMoved: 5 }),
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeJumpMovement',
    });
  });

  it('rejects non-Mek charge declarations against infantry or ProtoMech targets', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          unitType: UnitType.VEHICLE,
        },
        { unitType: UnitType.PROTOMECH },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetInfantryOrProtoMek',
    });
  });

  it('rejects charge declarations when target elevation does not overlap the attacker', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({
        attackerRanThisTurn: true,
        hexesMoved: 5,
        elevationDifference: 2,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ElevationMismatch',
    });
  });

  it('rejects charge declarations against targets that have not completed movement', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
      }),
      'attacker',
      'target',
      'charge',
      physicalContext({
        attackerRanThisTurn: true,
        hexesMoved: 5,
        targetMovementComplete: false,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMovementIncomplete',
    });
  });

  it('rejects DFA declarations against targets that have not completed movement', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      }),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
        targetMovementComplete: false,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMovementIncomplete',
    });
  });

  it('allows DFA declarations against immobile targets that have not completed movement', () => {
    const declared = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        { shutdown: true },
      ),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
        targetMovementComplete: false,
      }),
    );

    expect(
      declared.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(1);
    expect(
      declared.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toHaveLength(0);
  });

  it('rejects DFA declarations by infantry-family attackers before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        unitType: UnitType.INFANTRY,
      }),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerInfantry',
    });
  });

  it('rejects DFA declarations against DropShip targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        { unitType: UnitType.DROPSHIP },
      ),
      'attacker',
      'target',
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
    );
    const rejection = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(
      rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetDropShip',
    });
  });

  it('rejects push declarations after arm-mounted weapons fired', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession()),
      'attacker',
      'target',
      'push',
      physicalContext({
        pushDestinationValid: true,
        weaponsFiredFromArm: ['right-arm-medium-laser'],
      }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'WeaponFiredThisTurn',
    });
  });

  it('derives push arm-fire rejection from hydrated attacker weapon locations', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        weaponsFiredThisTurn: ['medium-laser-0'],
        weaponLocationById: { 'medium-laser-0': 'LEFT_ARM' },
      }),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'WeaponFiredThisTurn',
    });
  });

  it('does not reject push declarations after hydrated torso-mounted weapon fire', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        weaponsFiredThisTurn: ['medium-laser-0'],
        weaponLocationById: { 'medium-laser-0': 'CENTER_TORSO' },
      }),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );

    expect(declarations).toHaveLength(1);
    expect(rejection).toBeUndefined();
  });

  it('declares and resolves source-backed jump jet attacks through the event-sourced physical path', () => {
    const context = physicalContext({
      optionalRules: ['tacops_jump_jet_attack'],
      limb: 'rightLeg',
      rightReadyJumpJetCount: 2,
      standingAttackerHeightAboveTargetHeight: 1,
    });
    const declared = declareAdjacentPhysicalAttack('jump-jet-attack', context);
    const declaration = declared.events.find(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload;

    expect(declaration).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'jump-jet-attack',
      limb: 'rightLeg',
      toHitNumber: 7,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const resolution = resolved.events.findLast(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damage = resolved.events.find(
      (event) => event.type === GameEventType.DamageApplied,
    )?.payload as IDamageAppliedPayload;

    expect(resolution).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'jump-jet-attack',
      roll: 12,
      toHitNumber: 7,
      hit: true,
      damage: 6,
    });
    expect(damage).toMatchObject({
      unitId: 'target',
      damage: 6,
    });
  });

  it('rejects jump jet attacks after hydrated selected-leg weapon fire', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        weaponsFiredThisTurn: ['medium-laser-0'],
        weaponLocationById: { 'medium-laser-0': 'RIGHT_LEG' },
      }),
      'attacker',
      'target',
      'jump-jet-attack',
      physicalContext({
        optionalRules: ['tacops_jump_jet_attack'],
        limb: 'rightLeg',
        rightReadyJumpJetCount: 2,
        standingAttackerHeightAboveTargetHeight: 1,
      }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'jump-jet-attack',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LegWeaponFiredThisTurn',
    });
  });

  it('rejects push declarations when either attacker arm is missing', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { destroyedLocations: ['right_arm'] },
        {},
      ),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = session.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const rejection = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = rejection?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LimbMissing',
    });
  });

  it('rejects punch and kick declarations when source-required limbs are missing', () => {
    const missingArm = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { destroyedLocations: ['right_arm'] },
        {},
      ),
      'attacker',
      'target',
      'punch',
      physicalContext({ limb: 'rightArm' }),
    );
    const missingArmPayload = missingArm.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      missingArm.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(missingArmPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LimbMissing',
    });

    const missingLeg = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { destroyedLocations: ['left_leg'] },
        {},
      ),
      'attacker',
      'target',
      'kick',
      physicalContext({ limb: 'rightLeg' }),
    );
    const missingLegPayload = missingLeg.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      missingLeg.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(missingLegPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'LimbMissing',
    });
  });

  it('rejects push declarations when attacker or target is explicitly non-Mek', () => {
    const nonMekAttacker = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { unitType: UnitType.VEHICLE },
        {},
      ),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const nonMekAttackerPayload = nonMekAttacker.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      nonMekAttacker.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(nonMekAttackerPayload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerNotMek',
    });

    const nonMekTarget = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { unitType: UnitType.PROTOMECH },
      ),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const nonMekTargetPayload = nonMekTarget.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      nonMekTarget.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(nonMekTargetPayload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotMek',
    });
  });

  it('rejects quad BattleMech push declarations before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { isQuad: true }, {}),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const payload = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerQuad',
    });
  });

  it('rejects airborne push attackers before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { isAirborne: true }, {}),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const payload = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerAirborne',
    });
  });

  it('rejects rear-flipped-arm push declarations before scheduling resolution', () => {
    const session = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { armsFlipped: true }, {}),
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );
    const payload = session.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(
      session.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toHaveLength(0);
    expect(payload).toMatchObject({
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ArmsFlipped',
    });
  });

  it('rejects non-adjacent physical declarations before scheduling resolution', () => {
    let session = withUnitState(physicalPhaseSession(), 'attacker', {
      position: { q: 0, r: 0 },
    });
    session = withUnitState(session, 'target', {
      position: { q: 2, r: 0 },
    });
    const rejected = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotAdjacent',
    });
  });

  it('rejects missing physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      physicalPhaseSession(),
      'attacker',
      'missing-target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'missing-target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMissing',
    });
  });

  it('rejects explicit non-unit physical target declarations before scheduling resolution', () => {
    const cases = [
      {
        attackType: 'kick',
        targetObjectType: 'hexClear',
        expectedLocation: 'InvalidPhysicalTarget',
      },
      {
        attackType: 'push',
        targetObjectType: 'building',
        expectedLocation: 'TargetBuilding',
      },
      {
        attackType: 'charge',
        targetObjectType: 'building',
        expectedLocation: 'InvalidPhysicalTarget',
      },
      {
        attackType: 'dfa',
        targetObjectType: 'fuelTank',
        expectedLocation: 'InvalidPhysicalTarget',
      },
    ] as const;

    for (const { attackType, expectedLocation, targetObjectType } of cases) {
      const rejected = declarePhysicalAttack(
        physicalPhaseSession(),
        'attacker',
        `${targetObjectType}-target`,
        attackType,
        physicalContext({ targetObjectType }),
      );
      const declarations = rejected.events.filter(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      );
      const payload = rejected.events.find(
        (event) => event.type === GameEventType.PhysicalAttackResolved,
      )?.payload as IPhysicalAttackResolvedPayload;

      expect(declarations).toHaveLength(0);
      expect(payload).toMatchObject({
        attackerId: 'attacker',
        targetId: `${targetObjectType}-target`,
        attackType,
        roll: 0,
        toHitNumber: Infinity,
        hit: false,
        location: expectedLocation,
      });
    }
  });

  it('resolves stale physical declarations against missing targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withoutUnitState(declared, 'target'),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMissing',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale physical declarations against explicit non-unit target context as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'charge',
      physicalContext({ attackerRanThisTurn: true, hexesMoved: 5 }),
      { movementThisTurn: MovementType.Run, hexesMovedThisTurn: 5 },
    );
    const resolved = resolveAllPhysicalAttacks(
      withoutUnitState(declared, 'target'),
      new Map([
        [
          'attacker',
          physicalContext({
            attackerRanThisTurn: true,
            hexesMoved: 5,
            targetObjectType: 'building',
          }),
        ],
      ]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'InvalidPhysicalTarget',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects destroyed physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { destroyed: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetDestroyed',
    });
  });

  it('resolves stale physical declarations against destroyed targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { destroyed: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetDestroyed',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects retreated physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { hasRetreated: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetRetreated',
    });
  });

  it('resolves stale physical declarations against retreated targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { hasRetreated: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetRetreated',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects ejected physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { hasEjected: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetEjected',
    });
  });

  it('resolves stale physical declarations against ejected targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { hasEjected: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetEjected',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects passenger physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isPassenger: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetPassenger',
    });
  });

  it('resolves stale physical declarations against passenger targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isPassenger: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetPassenger',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects swarming physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isSwarming: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetSwarming',
    });
  });

  it('resolves stale physical declarations against swarming targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isSwarming: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetSwarming',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects targets making DFA before scheduling physical resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isMakingDFA: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMakingDFA',
    });
  });

  it('rejects charge targets making displacement attacks before scheduling physical resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { isMakingDisplacementAttack: true },
      ),
      'attacker',
      'target',
      'charge',
      physicalContext({ attackerRanThisTurn: true }),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMakingDisplacementAttack',
    });
  });

  it('resolves stale DFA declarations against targets owned by another displacement attacker as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({ attackerJumpedThisTurn: true }),
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        targetedByDisplacementAttackerId: 'other-attacker',
      }),
      new Map([
        ['attacker', physicalContext({ attackerJumpedThisTurn: true })],
      ]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetOfDisplacementAttack',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale DFA declarations against DropShip targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({ attackerJumpedThisTurn: true }),
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { unitType: UnitType.DROPSHIP }),
      new Map([
        ['attacker', physicalContext({ attackerJumpedThisTurn: true })],
      ]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetDropShip',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects push targets making non-push displacement attacks before scheduling physical resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { isMakingDisplacementAttack: true },
      ),
      'attacker',
      'target',
      'push',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMakingDisplacementAttack',
    });
  });

  it('resolves stale push declarations by attackers targeted by another displacement attacker as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'push',
      physicalContext(),
      {},
      {},
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        targetedByDisplacementAttackerId: 'other-attacker',
      }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerTargetOfDisplacementAttack',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale physical declarations against targets making DFA as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isMakingDFA: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetMakingDFA',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects physical targets inside another building before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { occupiedBuildingId: 'building-east' },
      ),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetInsideBuilding',
    });
  });

  it('resolves stale physical declarations against targets inside another building as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        occupiedBuildingId: 'building-east',
      }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetInsideBuilding',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects airborne physical targets before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {}, { isAirborne: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetAirborne',
    });
  });

  it('resolves stale physical declarations against airborne targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', { isAirborne: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetAirborne',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects unreachable airborne VTOL DFA declarations before scheduling resolution', () => {
    const context = physicalContext({
      attackerJumpedThisTurn: true,
      attackerJumpMP: 3,
      elevationDifference: 5,
    });
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {
          movementThisTurn: MovementType.Jump,
          hexesMovedThisTurn: 4,
        },
        {
          isAirborne: true,
          unitType: UnitType.VTOL,
        },
      ),
      'attacker',
      'target',
      'dfa',
      context,
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ElevationMismatch',
    });
  });

  it('resolves stale DFA declarations against unreachable airborne VTOL targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        attackerJumpMP: 3,
        elevationDifference: 3,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        isAirborne: true,
        unitType: UnitType.VTOL,
      }),
      new Map([
        [
          'attacker',
          physicalContext({
            attackerJumpedThisTurn: true,
            attackerJumpMP: 3,
            elevationDifference: 5,
          }),
        ],
      ]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ElevationMismatch',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale DFA declarations against unreachable airborne WIGE targets from motion type', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        attackerJumpMP: 3,
        elevationDifference: 3,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
    );
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'target', {
        isAirborne: true,
        unitType: UnitType.VEHICLE,
        motionType: GroundMotionType.WIGE,
      }),
      new Map([
        [
          'attacker',
          physicalContext({
            attackerJumpedThisTurn: true,
            attackerJumpMP: 3,
            elevationDifference: 5,
          }),
        ],
      ]),
      scriptedDice([6, 6, 3]),
    );

    const payload = resolved.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ElevationMismatch',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects mechanical jump booster DFA declarations from hydrated movement state', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
        usedMechanicalJumpBoosterThisTurn: true,
      }),
      'attacker',
      'target',
      'dfa',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'MechanicalJumpBooster',
    });
  });

  it('resolves stale DFA declarations against mechanical jump booster state as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('dfa', physicalContext(), {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    });
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        usedMechanicalJumpBoosterThisTurn: true,
      }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'dfa',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'MechanicalJumpBooster',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects evading physical attackers before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), { isEvading: true }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerEvading',
    });
  });

  it('resolves stale physical declarations by evading attackers as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', { isEvading: true }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerEvading',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects cargo-interacting physical attackers before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(physicalPhaseSession(), {
        isLoadingOrUnloadingCargo: true,
      }),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerCargoInteraction',
    });
  });

  it('resolves stale physical declarations by cargo-interacting attackers as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        isLoadingOrUnloadingCargo: true,
      }),
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'AttackerCargoInteraction',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects different-board physical declarations before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        { boardId: 'board-alpha' },
        { boardId: 'board-beta' },
      ),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'DifferentBoard',
    });
  });

  it('resolves stale physical declarations against different-board targets as invalid events', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const separated = withUnitState(
      withUnitState(declared, 'attacker', { boardId: 'board-alpha' }),
      'target',
      { boardId: 'board-beta' },
    );
    const resolved = resolveAllPhysicalAttacks(
      separated,
      new Map([['attacker', physicalContext()]]),
      scriptedDice([6, 6, 3]),
    );

    const resolvedEvents = resolved.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = resolvedEvents.at(-1)
      ?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedEvents).toHaveLength(1);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'DifferentBoard',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('rejects self-targeted physical declarations before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      physicalPhaseSession(),
      'attacker',
      'attacker',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'attacker',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'SelfTarget',
    });
  });

  it('rejects friendly physical declarations before scheduling resolution', () => {
    const rejected = declarePhysicalAttack(
      withPhysicalPositions(
        physicalPhaseSession(),
        {},
        { side: GameSide.Player },
      ),
      'attacker',
      'target',
      'kick',
      physicalContext(),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'kick',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'FriendlyTarget',
    });
  });

  it('rejects side-adjacent push declarations before scheduling resolution', () => {
    let session = withUnitState(physicalPhaseSession(), 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.North,
    });
    session = withUnitState(session, 'target', {
      position: { q: 1, r: 0 },
    });
    const rejected = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'push',
      physicalContext({ pushDestinationValid: true }),
    );

    const declarations = rejected.events.filter(
      (event) => event.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = rejected.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(declarations).toHaveLength(0);
    expect(payload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'target',
      attackType: 'push',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotDirectlyAhead',
    });
  });

  it('resolves stale charge declarations after backward movement as invalid events', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    });
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', { movedBackwardThisTurn: true }),
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const payload = resolved.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeBackwardMovement',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('resolves stale charge declarations after jump movement as invalid events', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    });
    const resolved = resolveAllPhysicalAttacks(
      withUnitState(declared, 'attacker', {
        movementThisTurn: MovementType.Jump,
      }),
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const payload = resolved.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'ChargeJumpMovement',
    });
    expect(
      resolved.events.some(
        (event) => event.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('ignores helper-only physical weapon modifier ids before declaration', () => {
    const session = physicalPhaseSession();
    const afterHelperOnly = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'talons',
      physicalContext(),
    );

    expect(afterHelperOnly).toBe(session);
    expect(
      afterHelperOnly.events.filter(
        (event) =>
          event.type === GameEventType.PhysicalAttackDeclared ||
          event.type === GameEventType.PhysicalAttackResolved,
      ),
    ).toHaveLength(0);
  });

  it('preserves charge movement and target movement modifiers during resolution', () => {
    const declared = declareAdjacentPhysicalAttack(
      'charge',
      physicalContext({
        hexesMoved: 5,
        attackerRanThisTurn: true,
        attackerMovementModifier: 1,
        targetMovementModifier: 2,
      }),
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([
        [
          'attacker',
          physicalContext({
            hexesMoved: 5,
            attackerRanThisTurn: true,
            attackerMovementModifier: 1,
            targetMovementModifier: 2,
          }),
        ],
      ]),
      scriptedDice([3, 4]),
    );

    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.toHitNumber).toBe(8);
    expect(payload.roll).toBe(7);
    expect(payload.hit).toBe(false);
    expect(
      resolved.events.some(
        (entry) => entry.type === GameEventType.DamageApplied,
      ),
    ).toBe(false);
  });

  it('hydrates target evasion into event-sourced physical declaration and resolution', () => {
    const declared = declareAdjacentPhysicalAttack(
      'kick',
      physicalContext(),
      {},
      { isEvading: true },
    );

    const declaration = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    );
    const declaredPayload =
      declaration?.payload as IPhysicalAttackDeclaredPayload;

    expect(declaredPayload).toMatchObject({
      attackType: 'kick',
      toHitNumber: 4,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', physicalContext()]]),
      scriptedDice([3]),
    );
    const resolution = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const resolvedPayload =
      resolution?.payload as IPhysicalAttackResolvedPayload;

    expect(resolvedPayload).toMatchObject({
      attackType: 'kick',
      roll: 6,
      toHitNumber: 4,
      hit: true,
    });
  });

  it('preserves DFA Battle Armor target-class to-hit modifiers during resolution', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      { unitType: UnitType.BATTLE_ARMOR },
    );

    const event = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = event?.payload as IPhysicalAttackDeclaredPayload;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      toHitNumber: 6,
    });
  });

  it('preserves DFA piloting skill differential during declaration', () => {
    const declared = declareAdjacentPhysicalAttack(
      'dfa',
      physicalContext({
        pilotingSkill: 5,
        attackerJumpedThisTurn: true,
        hexesMoved: 4,
      }),
      {
        movementThisTurn: MovementType.Jump,
        hexesMovedThisTurn: 4,
      },
      { piloting: 3 },
    );

    const event = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    );
    const payload = event?.payload as IPhysicalAttackDeclaredPayload;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      toHitNumber: 7,
    });
  });

  it('emits event-sourced push displacement with attacker follow-through', () => {
    const context = physicalContext({ pushDestinationValid: true });
    const declared = declareAdjacentPhysicalAttack('push', context, {
      facing: Facing.Southeast,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'push',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'push',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 2,
      r: 0,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced optional TacOps trip as zero damage with a target PSR', () => {
    const context = physicalContext({
      optionalRules: ['tacops_trip_attack'],
    });
    const declared = declareAdjacentPhysicalAttack('trip', context, {
      facing: Facing.Southeast,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.DamageApplied,
    );
    const psrPayload = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'target',
    )?.payload as IPSRTriggeredPayload | undefined;

    expect(payload).toMatchObject({
      attackType: 'trip',
      toHitNumber: 4,
      hit: true,
      damage: 0,
    });
    expect(payload.location).toBeUndefined();
    expect(payload.displacements).toBeUndefined();
    expect(damageEvents).toHaveLength(0);
    expect(psrPayload).toMatchObject({
      unitId: 'target',
      reason: 'Tripped',
      additionalModifier: 0,
      triggerSource: 'trip',
    });
    expect(psrPayload?.reasonCode).toBeUndefined();
  });

  it('emits event-sourced thrash as automatic same-hex infantry damage with attacker PSR', () => {
    const context = physicalContext();
    const session = withPhysicalPositions(
      physicalPhaseSession(),
      { prone: true },
      { position: { q: 0, r: 0 }, unitType: UnitType.INFANTRY },
    );
    const declared = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'thrash',
      context,
    );
    const positioned = withPhysicalPositions(
      declared,
      { prone: true },
      { position: { q: 0, r: 0 }, unitType: UnitType.INFANTRY },
    );

    const resolved = resolveAllPhysicalAttacks(
      positioned,
      new Map([['attacker', context]]),
      scriptedDice([3, 3]),
      sameHexPhysicalGrid(),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.DamageApplied,
    );
    const psrPayload = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'attacker',
    )?.payload as IPSRTriggeredPayload | undefined;

    expect(payload).toMatchObject({
      attackType: 'thrash',
      toHitNumber: 0,
      roll: 0,
      hit: true,
      damage: 27,
      automaticHit: true,
      automaticHitReason: 'Thrash attacks always hit.',
    });
    expect(damageEvents).toHaveLength(1);
    expect(psrPayload).toMatchObject({
      unitId: 'attacker',
      reason: 'Thrashing attack',
      additionalModifier: 0,
      triggerSource: 'thrash_attacker_hit',
    });
  });

  it('emits event-sourced brush-off as swarming-infantry damage and dislodgement on hit', () => {
    const context = physicalContext({ pilotingSkill: 1 });
    const declared = declareAdjacentPhysicalAttack(
      'brush-off',
      context,
      {},
      { isSwarming: true, unitType: UnitType.INFANTRY },
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damage = resolved.events.find(
      (entry) => entry.type === GameEventType.DamageApplied,
    )?.payload as IDamageAppliedPayload;

    expect(payload).toMatchObject({
      attackType: 'brush-off',
      roll: 12,
      toHitNumber: 5,
      hit: true,
      damage: 8,
    });
    expect(damage).toMatchObject({
      unitId: 'target',
    });
    expect(resolved.currentState.units.target.isSwarming).toBe(false);
  });

  it('emits event-sourced brush-off miss self-damage without dislodging the swarmer', () => {
    const context = physicalContext();
    const declared = declareAdjacentPhysicalAttack(
      'brush-off',
      context,
      {},
      { isSwarming: true, unitType: UnitType.INFANTRY },
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload);

    expect(payload).toMatchObject({
      attackType: 'brush-off',
      roll: 2,
      toHitNumber: 9,
      hit: false,
    });
    expect(damageEvents).toEqual([
      expect.objectContaining({
        unitId: 'attacker',
        damage: 8,
      }),
    ]);
    expect(damageEvents.some((entry) => entry.unitId === 'target')).toBe(false);
  });

  it('emits event-sourced grapple state and attacker relocation on hit', () => {
    const context = physicalContext({
      pilotingSkill: 1,
      optionalRules: ['tacops_grappling'],
    });
    const declared = declareAdjacentPhysicalAttack('grapple', context, {
      facing: Facing.Southeast,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'grapple',
      roll: 12,
      toHitNumber: 1,
      hit: true,
      damage: 0,
    });
    const grappleTargetPosition = resolved.currentState.units.target.position;
    expect(resolved.currentState.units.attacker).toMatchObject({
      grappledUnitId: 'target',
      isGrappleAttacker: true,
      grappledThisRound: true,
      grappleSide: 'both',
      position: grappleTargetPosition,
    });
    const oppositeAttackerFacing = ((resolved.currentState.units.attacker
      .facing +
      3) %
      6) as IUnitGameState['facing'];
    expect(resolved.currentState.units.target).toMatchObject({
      grappledUnitId: 'attacker',
      isGrappleAttacker: false,
      grappledThisRound: true,
      grappleSide: 'both',
      facing: oppositeAttackerFacing,
    });
  });

  it('emits event-sourced break-grapple state clearing and displacement on hit', () => {
    const context = physicalContext({
      optionalRules: ['tacops_grappling'],
      attackerGrappledTargetId: 'target',
      targetGrappledTargetId: 'attacker',
      attackerIsGrappleAttacker: true,
      targetIsGrappleAttacker: false,
    });
    const grappleState = {
      position: { q: 0, r: 0 },
      grappledThisRound: true,
      grappleSide: 'both' as const,
    };
    let session = withUnitState(physicalPhaseSession(), 'attacker', {
      ...grappleState,
      facing: Facing.North,
      grappledUnitId: 'target',
      isGrappleAttacker: true,
    });
    session = withUnitState(session, 'target', {
      ...grappleState,
      facing: Facing.North,
      grappledUnitId: 'attacker',
      isGrappleAttacker: false,
    });
    let declared = declarePhysicalAttack(
      session,
      'attacker',
      'target',
      'break-grapple',
      context,
    );
    declared = withUnitState(
      declared,
      'attacker',
      session.currentState.units.attacker,
    );
    declared = withUnitState(
      declared,
      'target',
      session.currentState.units.target,
    );

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6]),
      breakGrapplePhysicalGrid(),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'break-grapple',
      roll: 0,
      toHitNumber: 0,
      hit: true,
      damage: 0,
      automaticHit: true,
      automaticHitReason: 'original attacker',
      displacements: [
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 0, r: -1 },
          reason: 'break-grapple',
        },
      ],
    });
    expect(resolved.currentState.units.attacker).toMatchObject({
      position: { q: 0, r: -1 },
      grappledUnitId: undefined,
      isGrappleAttacker: undefined,
      grappledThisRound: false,
      grappleSide: undefined,
    });
    expect(resolved.currentState.units.target).toMatchObject({
      grappledUnitId: undefined,
      isGrappleAttacker: undefined,
      grappledThisRound: false,
      grappleSide: undefined,
    });
  });

  it('emits event-sourced charge displacement with attacker follow-through', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: true,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced charge domino displacement when the destination is occupied', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'domino-blocker',
          name: 'Domino Blocker',
          side: GameSide.Opponent,
          unitRef: 'domino-blocker-ref',
          pilotRef: 'domino-blocker-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      {
        facing: Facing.South,
      },
    );
    let declared = declarePhysicalAttack(
      positioned,
      'attacker',
      'target',
      'charge',
      context,
    );
    declared = withUnitState(declared, 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    declared = withUnitState(declared, 'target', {
      position: { q: 1, r: 0 },
    });
    declared = withUnitState(declared, 'domino-blocker', {
      position: { q: 1, r: 1 },
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      dominoChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 1, r: 2 },
        reason: 'domino',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(resolved.currentState.units['domino-blocker'].position).toEqual({
      q: 1,
      r: 2,
    });
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    const dominoPsr = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'domino-blocker',
    )?.payload as IPSRTriggeredPayload | undefined;
    expect(dominoPsr).toMatchObject({
      unitId: 'domino-blocker',
      reason: 'Domino effect',
      reasonCode: PSRTrigger.DominoEffect,
      additionalModifier: 0,
      basePilotingSkill: 5,
    });
    expect(
      resolved.currentState.units['domino-blocker'].pendingPSRs,
    ).toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
  });

  it('applies event-sourced domino step-out CFR decisions without forced DominoEffect PSRs', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
      blockerStepOutDecision: {
        blockerUnitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        response: 'move',
        psrPassed: true,
        context: {
          sideEntered: true,
          blockerJumped: false,
          legalStepOptions: [
            { kind: 'forward', to: { q: 2, r: 0 } },
            { kind: 'backward', to: { q: 0, r: 2 } },
          ],
        },
        path: [{ q: 2, r: 0 }],
      },
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'domino-blocker',
          name: 'Domino Blocker',
          side: GameSide.Opponent,
          unitRef: 'domino-blocker-ref',
          pilotRef: 'domino-blocker-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      {
        facing: Facing.South,
      },
    );
    let declared = declarePhysicalAttack(
      positioned,
      'attacker',
      'target',
      'charge',
      context,
    );
    declared = withUnitState(declared, 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    declared = withUnitState(declared, 'target', {
      position: { q: 1, r: 0 },
    });
    declared = withUnitState(declared, 'domino-blocker', {
      position: { q: 1, r: 1 },
      facing: Facing.Northeast,
      movementThisTurn: MovementType.Walk,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      dominoChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'domino-blocker',
        from: { q: 1, r: 1 },
        to: { q: 2, r: 0 },
        reason: 'domino_step_out',
      },
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'charge',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge',
      },
    ]);
    expect(resolved.currentState.units['domino-blocker'].position).toEqual({
      q: 2,
      r: 0,
    });
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(
      resolved.currentState.units['domino-blocker'].pendingPSRs,
    ).not.toContainEqual(
      expect.objectContaining({ reasonCode: PSRTrigger.DominoEffect }),
    );
    expect(
      resolved.events.some(
        (entry) =>
          entry.type === GameEventType.PSRTriggered &&
          (entry.payload as IPSRTriggeredPayload).unitId === 'domino-blocker' &&
          (entry.payload as IPSRTriggeredPayload).reasonCode ===
            PSRTrigger.DominoEffect,
      ),
    ).toBe(false);
  });

  it('emits event-sourced charge damage without displacement when blocked', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      blockedChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload);
    const chargedPsrs = resolved.events
      .filter((entry) => entry.type === GameEventType.PSRTriggered)
      .map((entry) => entry.payload as IPSRTriggeredPayload)
      .filter((entry) => entry.reasonCode === PSRTrigger.Charged);
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).cause ===
          'impossible_displacement',
    );

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: true,
    });
    expect(payload.damage).toBeGreaterThan(0);
    expect(payload.displacements).toBeUndefined();
    expect(
      damageEvents.filter((entry) => entry.unitId === 'target'),
    ).toHaveLength(Math.ceil((payload.damage ?? 0) / 5));
    expect(
      damageEvents.filter((entry) => entry.unitId === 'attacker').length,
    ).toBeGreaterThan(0);
    expect(chargedPsrs).toHaveLength(0);
    expect(destroyed).toBeUndefined();
  });

  it('emits event-sourced charge damage without displacement when the target climb is too high', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      elevatedChargeDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const damageEvents = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload);
    const chargedPsrs = resolved.events
      .filter((entry) => entry.type === GameEventType.PSRTriggered)
      .map((entry) => entry.payload as IPSRTriggeredPayload)
      .filter((entry) => entry.reasonCode === PSRTrigger.Charged);
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).cause ===
          'impossible_displacement',
    );

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: true,
    });
    expect(payload.damage).toBeGreaterThan(0);
    expect(payload.displacements).toBeUndefined();
    expect(
      damageEvents.filter((entry) => entry.unitId === 'target'),
    ).toHaveLength(Math.ceil((payload.damage ?? 0) / 5));
    expect(chargedPsrs).toHaveLength(0);
    expect(destroyed).toBeUndefined();
  });

  it.each([
    ['impassable terrain', 'impassable'],
    [
      'overgrown woods terrain',
      JSON.stringify([{ type: 'heavy_woods', level: 3 }]),
    ],
  ])(
    'emits event-sourced charge damage without displacement into %s',
    (_label, terrain) => {
      const context = physicalContext({
        attackerTonnage: 20,
        hexesMoved: 5,
        attackerRanThisTurn: true,
      });
      const declared = declareAdjacentPhysicalAttack(
        'charge',
        context,
        {
          facing: Facing.South,
        },
        {
          armor: STANDARD_ARMOR,
          structure: STANDARD_STRUCTURE,
        },
      );

      const resolved = resolveAllPhysicalAttacks(
        declared,
        new Map([['attacker', context]]),
        scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
        prohibitedChargeDisplacementGrid(terrain),
      );
      const event = resolved.events.find(
        (entry) => entry.type === GameEventType.PhysicalAttackResolved,
      );
      const payload = event?.payload as IPhysicalAttackResolvedPayload;
      const chargedPsrs = resolved.events
        .filter((entry) => entry.type === GameEventType.PSRTriggered)
        .map((entry) => entry.payload as IPSRTriggeredPayload)
        .filter((entry) => entry.reasonCode === PSRTrigger.Charged);
      const destroyed = resolved.events.find(
        (entry) =>
          entry.type === GameEventType.UnitDestroyed &&
          (entry.payload as IUnitDestroyedPayload).cause ===
            'impossible_displacement',
      );

      expect(payload).toMatchObject({
        attackType: 'charge',
        hit: true,
      });
      expect(payload.damage).toBeGreaterThan(0);
      expect(payload.displacements).toBeUndefined();
      expect(chargedPsrs).toHaveLength(0);
      expect(destroyed).toBeUndefined();
    },
  );

  it('emits event-sourced charge-miss domino displacement from an occupied side hex', () => {
    const context = physicalContext({
      hexesMoved: 5,
      attackerRanThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('charge', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'charge',
      hit: false,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'charge_miss',
      },
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        reason: 'domino',
      },
    ]);
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(resolved.currentState.units.target.position).toEqual({
      q: 2,
      r: 0,
    });
  });

  it('emits event-sourced DFA hit displacement with attacker follow-through', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
      armor: STANDARD_ARMOR,
      structure: STANDARD_STRUCTURE,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const attackerPsr = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'attacker',
    );
    const targetPsr = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.PSRTriggered &&
        (entry.payload as IPSRTriggeredPayload).unitId === 'target',
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const psrPayload = attackerPsr?.payload as IPSRTriggeredPayload | undefined;
    const targetPsrPayload = targetPsr?.payload as
      | IPSRTriggeredPayload
      | undefined;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(psrPayload).toMatchObject({
      unitId: 'attacker',
      reason: 'Executed DFA',
      additionalModifier: 4,
      triggerSource: 'dfa_attacker_hit',
      reasonCode: PSRTrigger.DFATarget,
    });
    expect(targetPsrPayload).toMatchObject({
      unitId: 'target',
      reason: 'Hit by DFA',
      additionalModifier: 2,
      triggerSource: PSRTrigger.DFATarget,
      reasonCode: PSRTrigger.DFATarget,
    });
  });

  it('hydrates grounded DropShip source context for event-sourced DFA hit displacement', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'grounded-dropship',
          name: 'Grounded DropShip',
          side: GameSide.Opponent,
          unitRef: 'grounded-dropship-ref',
          pilotRef: 'grounded-dropship-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      {
        facing: Facing.South,
        armor: STANDARD_ARMOR,
        structure: STANDARD_STRUCTURE,
      },
    );
    let declared = declarePhysicalAttack(
      positioned,
      'attacker',
      'target',
      'dfa',
      context,
    );
    declared = withUnitState(declared, 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    declared = withUnitState(declared, 'target', {
      position: { q: 1, r: 0 },
    });
    declared = withUnitState(declared, 'grounded-dropship', {
      position: { q: 1, r: 0 },
      unitType: UnitType.DROPSHIP,
      isAirborne: false,
      pilotConscious: false,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      hit: true,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 2 },
        reason: 'dfa',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 2,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced DFA miss displacement for target and attacker', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      adjacentPhysicalGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const fell = resolved.events.find(
      (entry) => entry.type === GameEventType.UnitFell,
    );
    const pilotHit = resolved.events.find(
      (entry) => entry.type === GameEventType.PilotHit,
    );
    const psrEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.PSRTriggered,
    );
    const fallDamage = resolved.events
      .filter((entry) => entry.type === GameEventType.DamageApplied)
      .map((entry) => entry.payload as IDamageAppliedPayload)
      .filter((entry) => entry.unitId === 'attacker');
    const payload = event?.payload as IPhysicalAttackResolvedPayload;
    const fallPayload = fell?.payload as IUnitFellPayload | undefined;
    const pilotHitPayload = pilotHit?.payload as IPilotHitPayload | undefined;

    expect(payload).toMatchObject({
      attackType: 'dfa',
      hit: false,
    });
    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 1, r: 1 },
        reason: 'dfa_miss',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa_miss',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 1,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
    expect(fallDamage.reduce((sum, entry) => sum + entry.damage, 0)).toBe(24);
    expect(fallPayload).toMatchObject({
      unitId: 'attacker',
      fallDamage: 24,
      newFacing: Facing.North,
      pilotDamage: 1,
      location: 'dfa_miss',
      reason: 'Missed DFA',
      reasonCode: PSRTrigger.DFAMiss,
    });
    expect(pilotHitPayload).toMatchObject({
      unitId: 'attacker',
      wounds: 1,
      totalWounds: 1,
      source: 'fall',
      consciousnessCheckRequired: true,
      consciousnessCheckPassed: false,
    });
    expect(resolved.currentState.units.attacker).toMatchObject({
      prone: true,
      facing: Facing.North,
      pendingPSRs: [],
      pilotWounds: 1,
      pilotConscious: false,
    });
    expect(psrEvents).toHaveLength(0);
  });

  it('avoids friendly occupied DFA miss displacement destinations before falling in', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const positioned = withPhysicalPositions(
      physicalPhaseSession([
        {
          id: 'target-friend',
          name: 'Target Friend',
          side: GameSide.Opponent,
          unitRef: 'target-friend-ref',
          pilotRef: 'target-friend-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ]),
      {
        facing: Facing.South,
      },
    );
    let declared = declarePhysicalAttack(
      positioned,
      'attacker',
      'target',
      'dfa',
      context,
    );
    declared = withUnitState(declared, 'attacker', {
      position: { q: 0, r: 0 },
      facing: Facing.South,
    });
    declared = withUnitState(declared, 'target', {
      position: { q: 1, r: 0 },
    });
    declared = withUnitState(declared, 'target-friend', {
      position: { q: 1, r: 1 },
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      friendlyDfaMissDisplacementGrid(),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload.displacements).toEqual([
      {
        unitId: 'target',
        from: { q: 1, r: 0 },
        to: { q: 0, r: 1 },
        reason: 'dfa_miss',
      },
      {
        unitId: 'attacker',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        reason: 'dfa_miss',
      },
    ]);
    expect(resolved.currentState.units.target.position).toEqual({
      q: 0,
      r: 1,
    });
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('passes missed-DFA fall pilot-damage avoidance without a PilotHit', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
      armor: STANDARD_ARMOR,
      structure: STANDARD_STRUCTURE,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 6]),
      adjacentPhysicalGrid(),
    );
    const fell = resolved.events.find(
      (entry) => entry.type === GameEventType.UnitFell,
    );
    const pilotHit = resolved.events.find(
      (entry) => entry.type === GameEventType.PilotHit,
    );
    const fallPayload = fell?.payload as IUnitFellPayload | undefined;

    expect(fallPayload).toMatchObject({
      unitId: 'attacker',
      fallDamage: 24,
      newFacing: Facing.North,
      pilotDamage: 0,
      location: 'dfa_miss',
      reason: 'Missed DFA',
      reasonCode: PSRTrigger.DFAMiss,
    });
    expect(pilotHit).toBeUndefined();
    expect(resolved.currentState.units.attacker).toMatchObject({
      prone: true,
      facing: Facing.North,
      pilotWounds: 0,
      pilotConscious: true,
    });
  });

  it.each(['dermal_armor', 'tsm_implant'] as const)(
    'applies %s missed-DFA fall pilot-damage immunity without rolling avoidance',
    (abilityId) => {
      const context = physicalContext({
        hexesMoved: 4,
        attackerJumpedThisTurn: true,
        pilotAbilities: [abilityId],
      });
      const declared = declareAdjacentPhysicalAttack('dfa', context, {
        facing: Facing.South,
        armor: STANDARD_ARMOR,
        structure: STANDARD_STRUCTURE,
      });

      const resolved = resolveAllPhysicalAttacks(
        declared,
        new Map([['attacker', context]]),
        scriptedDice([1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
        adjacentPhysicalGrid(),
      );
      const fell = resolved.events.find(
        (entry) => entry.type === GameEventType.UnitFell,
      );
      const pilotHit = resolved.events.find(
        (entry) => entry.type === GameEventType.PilotHit,
      );
      const fallPayload = fell?.payload as IUnitFellPayload | undefined;

      expect(fallPayload).toMatchObject({
        unitId: 'attacker',
        pilotDamage: 0,
        location: 'dfa_miss',
        reasonCode: PSRTrigger.DFAMiss,
      });
      expect(pilotHit).toBeUndefined();
      expect(resolved.currentState.units.attacker).toMatchObject({
        pilotWounds: 0,
        pilotConscious: true,
      });
    },
  );

  it('emits event-sourced DFA target destruction on impossible hit displacement', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3, 3, 3, 3, 3, 3]),
      blockedDfaDisplacementGrid(),
    );
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).unitId === 'target',
    );
    const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'target',
      cause: 'impossible_displacement',
      killerUnitId: 'attacker',
    });
    expect(resolved.currentState.units.target.destroyed).toBe(true);
    expect(resolved.currentState.units.attacker.position).toEqual({
      q: 1,
      r: 0,
    });
  });

  it('emits event-sourced DFA attacker destruction on impossible miss displacement', () => {
    const context = physicalContext({
      hexesMoved: 4,
      attackerJumpedThisTurn: true,
    });
    const declared = declareAdjacentPhysicalAttack('dfa', context, {
      facing: Facing.South,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([1, 1]),
      blockedDfaDisplacementGrid(),
    );
    const destroyed = resolved.events.find(
      (entry) =>
        entry.type === GameEventType.UnitDestroyed &&
        (entry.payload as IUnitDestroyedPayload).unitId === 'attacker',
    );
    const psrEvents = resolved.events.filter(
      (entry) => entry.type === GameEventType.PSRTriggered,
    );
    const resolvedAttack = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const resolvedPayload = resolvedAttack?.payload as
      | IPhysicalAttackResolvedPayload
      | undefined;
    const payload = destroyed?.payload as IUnitDestroyedPayload | undefined;

    expect(payload).toMatchObject({
      unitId: 'attacker',
      cause: 'impossible_displacement',
    });
    expect(payload?.killerUnitId).toBeUndefined();
    expect(resolvedPayload?.displacements).toBeUndefined();
    expect(psrEvents).toHaveLength(0);
    expect(resolved.currentState.units.attacker.destroyed).toBe(true);
  });

  it('threads active TSM through session physical resolution', () => {
    const context = physicalContext({ hasTSM: true });
    const declared = declareAdjacentPhysicalAttack('kick', context, {
      heat: 9,
      hasTSM: true,
    });

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'kick',
      roll: 12,
      toHitNumber: 3,
      hit: true,
      damage: 32,
    });
  });

  it('threads underwater state through session physical resolution', () => {
    const context = physicalContext({ isUnderwater: true });
    const declared = declareAdjacentPhysicalAttack('kick', context);

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'kick',
      roll: 12,
      toHitNumber: 3,
      hit: true,
      damage: 8,
    });
  });

  it('threads Frogman attacker water depth through session physical resolution', () => {
    const context = physicalContext({
      pilotAbilities: ['tm_frogman'],
      attackerWaterDepth: 2,
    });
    const declared = declareAdjacentPhysicalAttack('kick', context);

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const event = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    );
    const payload = event?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'kick',
      roll: 12,
      toHitNumber: 2,
      hit: true,
    });
  });

  it('threads explicit two-handed Zweihander declaration through session punch resolution', () => {
    const context = physicalContext({
      pilotAbilities: ['zweihander'],
      twoHandedZweihander: true,
    });
    const declared = declareAdjacentPhysicalAttack('punch', context);
    const declaredPayload = declared.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackDeclared,
    )?.payload as IPhysicalAttackDeclaredPayload;

    expect(declaredPayload.twoHandedZweihander).toBe(true);

    const resolved = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', context]]),
      scriptedDice([6, 6, 3]),
    );
    const payload = resolved.events.find(
      (entry) => entry.type === GameEventType.PhysicalAttackResolved,
    )?.payload as IPhysicalAttackResolvedPayload;

    expect(payload).toMatchObject({
      attackType: 'punch',
      hit: true,
      damage: 16,
    });
  });

  it('turns a missed kick PSR into a fall and clears targetability state', () => {
    const declared = declareAdjacentPhysicalAttack('kick', physicalContext());
    const withMissPsr = resolveAllPhysicalAttacks(
      declared,
      new Map([['attacker', physicalContext()]]),
      scriptedDice([1, 1]),
    );

    const psrEvent = withMissPsr.events.find(
      (entry) => entry.type === GameEventType.PSRTriggered,
    );
    const psrPayload = psrEvent?.payload as IPSRTriggeredPayload;
    expect(psrPayload.reasonCode).toBe(PSRTrigger.KickMiss);
    expect(withMissPsr.currentState.units.attacker.pendingPSRs).toHaveLength(1);

    const afterFailedPSR = resolvePendingPSRs(
      withMissPsr,
      scriptedDice([1, 1, 1]),
    );

    expect(afterFailedPSR.currentState.units.attacker.prone).toBe(true);
    expect(afterFailedPSR.currentState.units.attacker.pendingPSRs).toEqual([]);
    expect(
      afterFailedPSR.events.some(
        (entry) => entry.type === GameEventType.UnitFell,
      ),
    ).toBe(true);
    expect(
      afterFailedPSR.events.some(
        (entry) => entry.type === GameEventType.PilotHit,
      ),
    ).toBe(true);
    const pilotHit = afterFailedPSR.events.find(
      (entry) => entry.type === GameEventType.PilotHit,
    );
    expect((pilotHit?.payload as IPilotHitPayload).source).toBe('fall');
  });
});
