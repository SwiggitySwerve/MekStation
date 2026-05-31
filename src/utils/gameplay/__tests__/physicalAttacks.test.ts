import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { Facing, IComponentDamageState, IHexGrid } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  calculatePunchDamage,
  calculateKickDamage,
  calculateChargeDamageToTarget,
  calculateChargeDamageToAttacker,
  calculateDFADamageToTarget,
  calculateDFADamageToAttacker,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateSwordDamage,
  calculateMaceDamage,
  calculateRetractableBladeDamage,
  calculateWreckingBallDamage,
  calculateThrashDamage,
  calculateBrushOffAttackDamage,
  calculatePunchToHit,
  calculateKickToHit,
  calculateChargeToHit,
  calculateDFAToHit,
  calculatePushToHit,
  calculateTripToHit,
  calculateThrashToHit,
  calculateMeleeWeaponToHit,
  calculatePhysicalToHit,
  calculatePhysicalDamage,
  getPhysicalMissConsequences,
  resolveDfaMissFallPilotDamageAvoidance,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
  canTripPhysical,
  canThrashPhysical,
  canThrash,
  canTrip,
  computeChargeDisplacementOutcome,
  computeDfaDisplacementOutcome,
  computeDfaDisplacements,
  computePreferredDisplacement,
  computeValidDisplacement,
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  isTargetDirectlyAhead,
  getEffectiveWeight,
  applyUnderwaterModifier,
  determinePhysicalHitLocation,
  resolvePhysicalAttack,
  chooseBestPhysicalAttack,
  PUNCH_HIT_TABLE,
  KICK_HIT_TABLE,
  TSM_ACTIVATION_HEAT,
  IPhysicalAttackInput,
  isPhysicalAirborneVtolOrWigeTarget,
  isThrashAttackAutomaticSuccess,
  sourceContainsGroundedDropShip,
  canBreakGrapple,
  canBrushOff,
  canGrapple,
  getBreakGrappleAttackToHitModifiers,
  getBreakGrappleWeightClassModifier,
  getBrushOffAttackToHitModifiers,
  getGrappleAttackToHitModifiers,
  canJumpJetAttack,
  getJumpJetAttackDamage,
  getJumpJetAttackToHitModifiers,
  getThrashAttackDamageForWeight,
  getTripAttackBaseToHitAdjustment,
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

function makeInput(
  overrides: Partial<IPhysicalAttackInput> = {},
): IPhysicalAttackInput {
  return {
    attackerTonnage: 80,
    pilotingSkill: 5,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    attackType: 'punch',
    ...overrides,
  };
}

function makeDiceSequence(values: number[]) {
  let i = 0;
  return () => {
    if (i >= values.length) return values[values.length - 1];
    return values[i++];
  };
}

function makeDisplacementGrid(): IHexGrid {
  const hexes = new Map();
  hexes.set('0,0', {
    coord: { q: 0, r: 0 },
    occupantId: 'attacker',
    terrain: 'clear',
    elevation: 0,
  });
  hexes.set('1,0', {
    coord: { q: 1, r: 0 },
    occupantId: 'target',
    terrain: 'clear',
    elevation: 0,
  });
  hexes.set('1,1', {
    coord: { q: 1, r: 1 },
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  });
  hexes.set('2,0', {
    coord: { q: 2, r: 0 },
    occupantId: null,
    terrain: 'clear',
    elevation: 2,
  });
  hexes.set('0,1', {
    coord: { q: 0, r: 1 },
    occupantId: null,
    terrain: 'clear',
    elevation: 1,
  });
  return { config: { radius: 2 }, hexes };
}

function makeDropShipRadiusDisplacementGrid(
  primaryRadiusTwoTerrain = 'clear',
): IHexGrid {
  const hexes = new Map();
  const coords = [
    { q: 0, r: 0 },
    { q: 0, r: 1 },
    { q: 0, r: 2 },
    { q: -1, r: 2 },
    { q: -2, r: 2 },
    { q: -2, r: 1 },
    { q: 2, r: 0 },
    { q: 1, r: 1 },
    { q: -2, r: 0 },
    { q: -1, r: -1 },
    { q: 2, r: -2 },
    { q: 2, r: -1 },
    { q: 0, r: -2 },
    { q: 1, r: -2 },
  ];

  for (const coord of coords) {
    const key = `${coord.q},${coord.r}`;
    hexes.set(key, {
      coord,
      occupantId: coord.q === 0 && coord.r === 0 ? 'target' : null,
      terrain: key === '0,2' ? primaryRadiusTwoTerrain : 'clear',
      elevation: 0,
    });
  }

  return { config: { radius: 2 }, hexes };
}

function makeBlockedDfaDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  for (const key of ['1,1', '2,0', '0,1']) {
    const hex = hexes.get(key);
    if (hex) {
      hexes.set(key, { ...hex, occupantId: `blocker-${key}` });
    }
  }
  return { ...grid, hexes };
}

function makeBlockedChargeDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const hex = hexes.get('1,1');
  if (hex) {
    hexes.set('1,1', { ...hex, occupantId: 'charge-blocker' });
  }
  return { ...grid, hexes };
}

function makeDominoDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const blockedDestination = hexes.get('1,1');
  if (blockedDestination) {
    hexes.set('1,1', {
      ...blockedDestination,
      occupantId: 'domino-blocker',
    });
  }
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  });
  return { ...grid, hexes };
}

function makeFriendlyPreferredDisplacementGrid(): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const friendlyDestination = hexes.get('1,1');
  const alternateDestination = hexes.get('0,1');
  if (friendlyDestination) {
    hexes.set('1,1', {
      ...friendlyDestination,
      occupantId: 'target-friend',
    });
  }
  if (alternateDestination) {
    hexes.set('0,1', {
      ...alternateDestination,
      elevation: 0,
    });
  }
  hexes.set('1,2', {
    coord: { q: 1, r: 2 },
    occupantId: null,
    terrain: 'clear',
    elevation: 0,
  });
  return { ...grid, hexes };
}

function makeProhibitedChargeDisplacementGrid(
  terrain: string = 'impassable',
): IHexGrid {
  const grid = makeDisplacementGrid();
  const hexes = new Map(grid.hexes);
  const hex = hexes.get('1,1');
  if (hex) {
    hexes.set('1,1', { ...hex, terrain });
  }
  return { ...grid, hexes };
}

function terrainFeature(type: string, level: number): string {
  return JSON.stringify([{ type, level }]);
}

// =============================================================================
// Punch Damage Tests
// =============================================================================

describe('physicalAttacks', () => {
  describe('physical displacement helpers', () => {
    it('chooses valid displacement nearest the requested direction', () => {
      expect(
        computeValidDisplacement(
          makeDisplacementGrid(),
          'target',
          { q: 1, r: 0 },
          Facing.South,
        ),
      ).toEqual({ q: 1, r: 1 });
    });

    it('searches the radius-two ring when a grounded DropShip occupies the source hex', () => {
      const grid = makeDropShipRadiusDisplacementGrid();

      expect(
        computeValidDisplacement(grid, 'target', { q: 0, r: 0 }, Facing.South),
      ).toEqual({ q: 0, r: 1 });
      expect(
        computeValidDisplacement(grid, 'target', { q: 0, r: 0 }, Facing.South, {
          sourceContainsGroundedDropShip: true,
        }),
      ).toEqual({ q: 0, r: 2 });
    });

    it('detects same-board grounded DropShip source context for displaced units', () => {
      const target = {
        id: 'target',
        position: { q: 1, r: 0 },
        boardId: 'ground-map',
      };

      expect(
        sourceContainsGroundedDropShip(
          [
            target,
            {
              id: 'grounded-dropship',
              unitType: UnitType.DROPSHIP,
              isAirborne: false,
              boardId: 'ground-map',
              position: { q: 1, r: 0 },
            },
          ],
          target,
        ),
      ).toBe(true);
      expect(
        sourceContainsGroundedDropShip(
          [
            target,
            {
              id: 'airborne-dropship',
              unitType: UnitType.DROPSHIP,
              isAirborne: true,
              boardId: 'ground-map',
              position: { q: 1, r: 0 },
            },
          ],
          target,
        ),
      ).toBe(false);
      expect(
        sourceContainsGroundedDropShip(
          [
            target,
            {
              id: 'other-board-dropship',
              unitType: UnitType.DROPSHIP,
              isAirborne: false,
              boardId: 'space-map',
              position: { q: 1, r: 0 },
            },
          ],
          target,
        ),
      ).toBe(false);
    });

    it('walks the grounded DropShip radius-two ring before trying the next displacement offset', () => {
      expect(
        computeValidDisplacement(
          makeDropShipRadiusDisplacementGrid('impassable'),
          'target',
          { q: 0, r: 0 },
          Facing.South,
          { sourceContainsGroundedDropShip: true },
        ),
      ).toEqual({ q: -1, r: 2 });
    });

    it('prefers same-elevation displacement before higher side hexes', () => {
      expect(
        computePreferredDisplacement(
          makeDisplacementGrid(),
          'target',
          { q: 1, r: 0 },
          Facing.South,
        ),
      ).toEqual({ q: 1, r: 1 });
    });

    it('treats BattleMech displacement above two elevation levels as invalid', () => {
      const grid = makeDisplacementGrid();
      const hexes = new Map(grid.hexes);
      const blockedClimb = hexes.get('1,1');
      if (blockedClimb) {
        hexes.set('1,1', {
          ...blockedClimb,
          elevation: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE + 1,
        });
      }

      expect(
        computeChargeDisplacementOutcome({
          grid: { ...grid, hexes },
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([]);
    });

    it('treats explicit impassable BattleMech displacement terrain as invalid', () => {
      const grid = makeProhibitedChargeDisplacementGrid();

      expect(
        computeValidDisplacement(grid, 'target', { q: 1, r: 0 }, Facing.South),
      ).toEqual({ q: 0, r: 1 });
      expect(
        computeChargeDisplacementOutcome({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([]);
    });

    it('treats overgrown BattleMech displacement terrain above level two as invalid', () => {
      for (const terrain of [
        terrainFeature('heavy_woods', 3),
        terrainFeature('jungle', 3),
        'woods:3',
        'ultra_woods',
      ]) {
        const grid = makeProhibitedChargeDisplacementGrid(terrain);

        expect(
          computeValidDisplacement(
            grid,
            'target',
            { q: 1, r: 0 },
            Facing.South,
          ),
        ).toEqual({ q: 0, r: 1 });
        expect(
          computeChargeDisplacementOutcome({
            grid,
            attackerId: 'attacker',
            attackerPosition: { q: 0, r: 0 },
            attackerFacing: Facing.South,
            targetId: 'target',
            targetPosition: { q: 1, r: 0 },
          }).displacements,
        ).toEqual([]);
      }

      expect(
        computeChargeDisplacementOutcome({
          grid: makeProhibitedChargeDisplacementGrid(
            terrainFeature('heavy_woods', 2),
          ),
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([
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
    });

    it('checks push target feet-facing instead of adjacency alone', () => {
      expect(
        isTargetDirectlyAhead({ q: 0, r: 0 }, Facing.Southeast, { q: 1, r: 0 }),
      ).toBe(true);
      expect(
        isTargetDirectlyAhead({ q: 0, r: 0 }, Facing.South, { q: 1, r: 0 }),
      ).toBe(false);
    });

    it('keeps successful charge units in place when target displacement is blocked', () => {
      expect(
        computeChargeDisplacementOutcome({
          grid: makeBlockedChargeDisplacementGrid(),
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([]);
    });

    it('cascades occupied displacement destinations as source-backed domino chains', () => {
      const grid = makeDominoDisplacementGrid();

      expect(
        computeValidDisplacement(grid, 'target', { q: 1, r: 0 }, Facing.South),
      ).toEqual({ q: 1, r: 1 });
      expect(
        computeChargeDisplacementOutcome({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
        }).displacements,
      ).toEqual([
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
    });

    it('models source-backed DFA hit and miss displacement order', () => {
      const grid = makeDisplacementGrid();

      expect(
        computeDfaDisplacements({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
          hit: true,
        }),
      ).toEqual([
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

      expect(
        computeDfaDisplacements({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
          hit: false,
        }),
      ).toEqual([
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
    });

    it('prefers non-friendly DFA miss displacement before falling back to occupied friendly hexes', () => {
      const grid = makeFriendlyPreferredDisplacementGrid();

      expect(
        computePreferredDisplacement(
          grid,
          'target',
          { q: 1, r: 0 },
          Facing.South,
        ),
      ).toEqual({ q: 1, r: 1 });
      expect(
        computePreferredDisplacement(
          grid,
          'target',
          { q: 1, r: 0 },
          Facing.South,
          { friendlyUnitIds: ['target-friend'] },
        ),
      ).toEqual({ q: 0, r: 1 });
      expect(
        computeDfaDisplacementOutcome({
          grid,
          attackerId: 'attacker',
          attackerPosition: { q: 0, r: 0 },
          attackerFacing: Facing.South,
          targetId: 'target',
          targetPosition: { q: 1, r: 0 },
          hit: false,
          targetFriendlyUnitIds: ['target-friend'],
        }).displacements,
      ).toEqual([
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
    });

    it('identifies source-backed DFA impossible-displacement destruction', () => {
      const grid = makeBlockedDfaDisplacementGrid();
      const base = {
        grid,
        attackerId: 'attacker',
        attackerPosition: { q: 0, r: 0 },
        attackerFacing: Facing.South,
        targetId: 'target',
        targetPosition: { q: 1, r: 0 },
      };

      expect(computeDfaDisplacementOutcome({ ...base, hit: true })).toEqual({
        displacements: [
          {
            unitId: 'attacker',
            from: { q: 0, r: 0 },
            to: { q: 1, r: 0 },
            reason: 'dfa',
          },
        ],
        impossibleDisplacementDestroyedUnitId: 'target',
      });

      expect(computeDfaDisplacementOutcome({ ...base, hit: false })).toEqual({
        displacements: [],
        impossibleDisplacementDestroyedUnitId: 'attacker',
      });
    });
  });

  describe('calculatePunchDamage', () => {
    it('should compute ceil(weight/10) for 80-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 80 }))).toBe(8);
    });

    it('should compute ceil(weight/10) for 50-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 50 }))).toBe(5);
    });

    it('should compute ceil(weight/10) for 75-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 75 }))).toBe(8);
    });

    it('should compute ceil(weight/10) for 20-ton mech', () => {
      expect(calculatePunchDamage(makeInput({ attackerTonnage: 20 }))).toBe(2);
    });

    it('applies source-backed claw damage to the selected punching arm', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 55,
            arm: 'left',
            leftArmHasClaw: true,
          }),
        ),
      ).toBe(8);
    });

    it('does not apply claw damage when the selected punching arm lacks claws', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 55,
            arm: 'left',
            rightArmHasClaw: true,
          }),
        ),
      ).toBe(6);
    });

    it('applies arm actuator damage after the claw punch base', () => {
      expect(
        calculatePunchDamage(
          makeInput({
            attackerTonnage: 55,
            arm: 'left',
            leftArmHasClaw: true,
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              actuators: { [ActuatorType.UPPER_ARM]: true },
            },
          }),
        ),
      ).toBe(4);
    });

    it('should halve damage with upper arm actuator destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        }),
      );
      expect(damage).toBe(4); // floor(8/2)
    });

    it('should halve damage with lower arm actuator destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(damage).toBe(4);
    });

    it('should quarter damage with both upper and lower arm destroyed', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.UPPER_ARM]: true,
              [ActuatorType.LOWER_ARM]: true,
            },
          },
        }),
      );
      // 8 -> floor(8/2)=4 -> floor(4/2)=2
      expect(damage).toBe(2);
    });

    it('applies Melee Specialist but not Battle Fists to punch damage', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          arm: 'right',
          pilotAbilities: ['melee-specialist'],
          unitQuirks: ['battle_fists_ra'],
        }),
      );

      expect(damage).toBe(9);
    });

    it('does not apply Melee Master as a flat punch damage bonus', () => {
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 80,
          arm: 'right',
          pilotAbilities: ['melee-master'],
        }),
      );

      expect(damage).toBe(8);
    });
  });

  // =============================================================================
  // Kick Damage Tests
  // =============================================================================

  describe('calculateKickDamage', () => {
    it('should compute floor(weight/5) for 80-ton mech', () => {
      expect(calculateKickDamage(makeInput({ attackerTonnage: 80 }))).toBe(16);
    });

    it('should compute floor(weight/5) for 50-ton mech', () => {
      expect(calculateKickDamage(makeInput({ attackerTonnage: 50 }))).toBe(10);
    });

    it('should compute floor(weight/5) for 73-ton mech', () => {
      // floor(73/5) = 14
      expect(calculateKickDamage(makeInput({ attackerTonnage: 73 }))).toBe(14);
    });

    it('applies source-backed talon damage to the selected kicking leg', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            limb: 'leftLeg',
            leftLegHasTalons: true,
          }),
        ),
      ).toBe(15);
    });

    it('does not apply talon damage when the selected leg lacks working talons', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            limb: 'leftLeg',
            rightLegHasTalons: true,
          }),
        ),
      ).toBe(10);
    });

    it('requires a working foot actuator for talon kick damage', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            limb: 'leftLeg',
            leftLegHasTalons: true,
            leftFootActuatorPresent: false,
          }),
        ),
      ).toBe(10);
    });

    it('maps quad kick talons through the matching arm-location front leg', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            attackerIsQuad: true,
            limb: 'rightLeg',
            rightArmHasTalons: true,
          }),
        ),
      ).toBe(15);
    });

    it('requires the quad arm-location foot actuator for front-leg talon kick damage', () => {
      expect(
        calculateKickDamage(
          makeInput({
            attackerTonnage: 50,
            attackType: 'kick',
            attackerIsQuad: true,
            limb: 'rightLeg',
            rightArmHasTalons: true,
            rightArmFootActuatorPresent: false,
          }),
        ),
      ).toBe(10);
    });
  });

  // =============================================================================
  // Charge Damage Tests
  // =============================================================================

  describe('calculateChargeDamageToTarget', () => {
    it('should compute ceil(weight/10) × (hexesMoved - 1) for 60t, 5 hexes', () => {
      // ceil(60/10) × (5-1) = 6 × 4 = 24
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 5 }),
      );
      expect(damage).toBe(24);
    });

    it('should return 0 for 0 hexes moved', () => {
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 0 }),
      );
      expect(damage).toBe(0);
    });

    it('should return 0 for 1 hex moved', () => {
      const damage = calculateChargeDamageToTarget(
        makeInput({ attackerTonnage: 60, attackType: 'charge', hexesMoved: 1 }),
      );
      expect(damage).toBe(0);
    });
  });

  describe('calculateChargeDamageToAttacker', () => {
    it('should compute ceil(targetTonnage/10) for 75-ton target', () => {
      // ceil(75/10) = 8
      const damage = calculateChargeDamageToAttacker(
        makeInput({ attackType: 'charge', targetTonnage: 75 }),
      );
      expect(damage).toBe(8);
    });
  });

  // =============================================================================
  // DFA Damage Tests
  // =============================================================================

  describe('calculateDFADamageToTarget', () => {
    it('should compute ceil(weight/10) × 3 for 70-ton mech', () => {
      // ceil(70/10) × 3 = 7 × 3 = 21
      const damage = calculateDFADamageToTarget(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(damage).toBe(21);
    });

    it('should compute ceil(weight/10) × 3 for 80-ton mech', () => {
      // ceil(80/10) × 3 = 8 × 3 = 24
      expect(
        calculateDFADamageToTarget(
          makeInput({ attackerTonnage: 80, attackType: 'dfa' }),
        ),
      ).toBe(24);
    });

    it('applies source-backed talon damage when either DFA leg has working talons', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            leftLegHasTalons: true,
          }),
        ),
      ).toBe(31);
    });

    it('does not apply DFA talon damage without a working foot actuator', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            leftLegHasTalons: true,
            leftFootActuatorPresent: false,
          }),
        ),
      ).toBe(21);
    });

    it('applies source-backed quad DFA talon damage from arm-location front legs', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            attackerIsQuad: true,
            rightArmHasTalons: true,
          }),
        ),
      ).toBe(31);
    });

    it('honors MegaMek non-biped DFA right-arm talon gate for arm-location talons', () => {
      expect(
        calculateDFADamageToTarget(
          makeInput({
            attackerTonnage: 70,
            attackType: 'dfa',
            attackerIsQuad: true,
            leftArmHasTalons: true,
          }),
        ),
      ).toBe(21);
    });
  });

  describe('calculateDFADamageToAttacker', () => {
    it('should compute ceil(weight/5) per leg (split) for 70-ton mech', () => {
      // Total = ceil(70/5) = 14, per leg = ceil(14/2) = 7
      const perLeg = calculateDFADamageToAttacker(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(perLeg).toBe(7);
    });

    it('should round up for odd total', () => {
      // 50t: ceil(50/5)=10, per leg = 5
      expect(
        calculateDFADamageToAttacker(
          makeInput({ attackerTonnage: 50, attackType: 'dfa' }),
        ),
      ).toBe(5);
    });
  });

  describe('resolveDfaMissFallPilotDamageAvoidance', () => {
    it('applies the source-backed fall-height modifier and wounds on failure', () => {
      const rolls = [2, 3];
      const result = resolveDfaMissFallPilotDamageAvoidance(
        5,
        2,
        () => rolls.shift() ?? 1,
      );

      expect(result).toMatchObject({
        targetNumber: 6,
        roll: 5,
        dice: [2, 3],
        passed: false,
        pilotDamage: 1,
      });
    });

    it('avoids missed-DFA fall pilot damage on a successful roll', () => {
      const rolls = [3, 3];
      const result = resolveDfaMissFallPilotDamageAvoidance(
        5,
        2,
        () => rolls.shift() ?? 1,
      );

      expect(result).toMatchObject({
        targetNumber: 6,
        roll: 6,
        dice: [3, 3],
        passed: true,
        pilotDamage: 0,
      });
    });

    it('honors source-backed Manei Domini fall-pilot-damage immunity', () => {
      const result = resolveDfaMissFallPilotDamageAvoidance(5, 2, () => 1, [
        'dermal_armor',
      ]);

      expect(result).toMatchObject({
        targetNumber: 6,
        dice: [],
        passed: true,
        pilotDamage: 0,
      });
    });
  });

  // =============================================================================
  // Melee Weapon Damage Tests
  // =============================================================================

  describe('calculateHatchetDamage', () => {
    it('should compute floor(weight/5) for 70-ton mech', () => {
      // floor(70/5) = 14
      expect(
        calculateHatchetDamage(
          makeInput({ attackerTonnage: 70, attackType: 'hatchet' }),
        ),
      ).toBe(14);
    });
  });

  describe('calculateSwordDamage', () => {
    it('should compute ceil(weight/10) + 1 for 70-ton mech', () => {
      // ceil(70/10) + 1 = 7 + 1 = 8
      expect(
        calculateSwordDamage(
          makeInput({ attackerTonnage: 70, attackType: 'sword' }),
        ),
      ).toBe(8);
    });

    it('should round sword damage up for non-even tonnage', () => {
      // MegaMek ClubAttackAction uses ceil(weight / 10) + 1.
      expect(
        calculateSwordDamage(
          makeInput({ attackerTonnage: 65, attackType: 'sword' }),
        ),
      ).toBe(8);
    });
  });

  describe('calculateMaceDamage', () => {
    it('should compute ceil(weight/4) for 70-ton mech', () => {
      // MegaMek ClubAttackAction uses ceil(weight / 4).
      expect(
        calculateMaceDamage(
          makeInput({ attackerTonnage: 70, attackType: 'mace' }),
        ),
      ).toBe(18);
    });

    it('should round mace damage up for non-even tonnage', () => {
      expect(
        calculateMaceDamage(
          makeInput({ attackerTonnage: 65, attackType: 'mace' }),
        ),
      ).toBe(17);
    });
  });

  describe('calculateRetractableBladeDamage', () => {
    it('computes ceil(weight/10) for a 70-ton mech', () => {
      expect(
        calculateRetractableBladeDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'retractable-blade',
          }),
        ),
      ).toBe(7);
    });

    it('rounds retractable blade damage up for non-even tonnage', () => {
      expect(
        calculateRetractableBladeDamage(
          makeInput({
            attackerTonnage: 65,
            attackType: 'retractable-blade',
          }),
        ),
      ).toBe(7);
    });
  });

  describe('source-backed constant physical weapon damage', () => {
    it('computes constant flail and wrecking ball damage', () => {
      expect(calculateFlailDamage(makeInput({ attackType: 'flail' }))).toBe(9);
      expect(
        calculateWreckingBallDamage(makeInput({ attackType: 'wrecking-ball' })),
      ).toBe(8);
    });

    it('does not double flail or wrecking ball damage with active TSM', () => {
      const activeTsm = {
        hasTSM: true,
        heat: 9,
      };

      expect(
        calculateFlailDamage(makeInput({ ...activeTsm, attackType: 'flail' })),
      ).toBe(9);
      expect(
        calculateWreckingBallDamage(
          makeInput({ ...activeTsm, attackType: 'wrecking-ball' }),
        ),
      ).toBe(8);
    });

    it('applies Melee Specialist and underwater modifiers to constant weapons', () => {
      expect(
        calculateFlailDamage(
          makeInput({
            attackType: 'flail',
            pilotAbilities: ['melee-specialist'],
            isUnderwater: true,
          }),
        ),
      ).toBe(5);
      expect(
        calculateWreckingBallDamage(
          makeInput({
            attackType: 'wrecking-ball',
            pilotAbilities: ['melee-specialist'],
            isUnderwater: true,
          }),
        ),
      ).toBe(4);
    });

    it('does not apply Melee Master as flat constant weapon damage', () => {
      expect(
        calculateFlailDamage(
          makeInput({
            attackType: 'flail',
            pilotAbilities: ['melee-master'],
            isUnderwater: true,
          }),
        ),
      ).toBe(4);
    });
  });

  // =============================================================================
  // TSM Tests
  // =============================================================================

  describe('TSM double damage', () => {
    it('should double punch damage with TSM at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 9,
      });
      // Effective weight = 100, ceil(100/10) = 10
      expect(calculatePunchDamage(input)).toBe(10);
    });

    it('should double kick damage with TSM at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 9,
      });
      // Effective weight = 100, floor(100/5) = 20
      expect(calculateKickDamage(input)).toBe(20);
    });

    it('should NOT double damage below heat 9', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: true,
        heat: 8,
      });
      expect(calculatePunchDamage(input)).toBe(5); // ceil(50/10) = 5
    });

    it('should NOT double damage without TSM even at heat 9+', () => {
      const input = makeInput({
        attackerTonnage: 50,
        hasTSM: false,
        heat: 12,
      });
      expect(calculatePunchDamage(input)).toBe(5);
    });

    it('should double hatchet damage with TSM at heat 9+', () => {
      // 70t with TSM at heat 9: effective 140, floor(140/5) = 28
      expect(
        calculateHatchetDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'hatchet',
            hasTSM: true,
            heat: 10,
          }),
        ),
      ).toBe(28);
    });

    it('should double sword damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, ceil(140/10) + 1 = 14 + 1 = 15
      expect(
        calculateSwordDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'sword',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(15);
    });

    it('should double mace damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, ceil(140 / 4) = 35
      expect(
        calculateMaceDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'mace',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(35);
    });

    it('should double retractable blade damage with TSM at heat 9+', () => {
      // 70t TSM: effective 140, ceil(140 / 10) = 14
      expect(
        calculateRetractableBladeDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'retractable-blade',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(14);
    });

    it('should not double flail or wrecking ball damage with TSM at heat 9+', () => {
      expect(
        calculateFlailDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'flail',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(9);
      expect(
        calculateWreckingBallDamage(
          makeInput({
            attackerTonnage: 70,
            attackType: 'wrecking-ball',
            hasTSM: true,
            heat: 9,
          }),
        ),
      ).toBe(8);
    });
  });

  describe('getEffectiveWeight', () => {
    it('should return normal weight without TSM', () => {
      expect(getEffectiveWeight(50, 15, false)).toBe(50);
    });

    it('should double weight with TSM at 9+', () => {
      expect(getEffectiveWeight(50, 9, true)).toBe(100);
    });

    it('should return normal weight with TSM below 9', () => {
      expect(getEffectiveWeight(50, 8, true)).toBe(50);
    });
  });

  // =============================================================================
  // Underwater Halving Tests
  // =============================================================================

  describe('underwater halving', () => {
    it('should halve punch damage underwater', () => {
      const damage = calculatePunchDamage(
        makeInput({ attackerTonnage: 80, isUnderwater: true }),
      );
      expect(damage).toBe(4); // floor(8/2)
    });

    it('should halve kick damage underwater', () => {
      const damage = calculateKickDamage(
        makeInput({ attackerTonnage: 80, isUnderwater: true }),
      );
      expect(damage).toBe(8); // floor(16/2)
    });

    it('should round down odd values', () => {
      const damage = calculatePunchDamage(
        makeInput({ attackerTonnage: 75, isUnderwater: true }),
      );
      // ceil(75/10) = 8, floor(8/2) = 4
      expect(damage).toBe(4);
    });
  });

  describe('applyUnderwaterModifier', () => {
    it('should halve damage when underwater', () => {
      expect(applyUnderwaterModifier(10, true)).toBe(5);
    });

    it('should not modify when not underwater', () => {
      expect(applyUnderwaterModifier(10, false)).toBe(10);
    });

    it('should floor odd halved values', () => {
      expect(applyUnderwaterModifier(7, true)).toBe(3);
    });
  });

  // =============================================================================
  // Restriction Tests
  // =============================================================================

  describe('canPunch', () => {
    it('should allow punch with intact arm', () => {
      expect(canPunch(makeInput()).allowed).toBe(true);
    });

    it('should disallow punch with shoulder destroyed', () => {
      const result = canPunch(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Shoulder');
    });

    it('should disallow punch if arm fired weapon', () => {
      const result = canPunch(makeInput({ weaponsFiredFromArm: ['ml-1'] }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('fired');
    });

    it('disallows punch with the selected arm missing', () => {
      expect(
        canPunch(
          makeInput({
            limb: 'leftArm',
            attackerDestroyedLocations: ['left_arm'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });

      expect(
        canPunch(
          makeInput({
            arm: 'right',
            attackerDestroyedLocations: ['right_arm'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });
    });

    it('disallows punch when No Arms quirk is present', () => {
      const result = canPunch(makeInput({ unitQuirks: ['no_arms'] }));

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'NoArmsQuirk',
      });
    });

    it('does not apply Low Arms without a source-backed combat resolver', () => {
      const result = canPunch(
        makeInput({ unitQuirks: ['low_arms'], elevationDifference: 1 }),
      );

      expect(result).toMatchObject({
        allowed: true,
      });
    });
  });

  describe('canKick', () => {
    it('should allow kick when standing', () => {
      expect(canKick(makeInput({ attackType: 'kick' })).allowed).toBe(true);
    });

    it('should disallow kick when prone', () => {
      const result = canKick(
        makeInput({ attackType: 'kick', attackerProne: true }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('prone');
    });

    it('should disallow kick with hip destroyed', () => {
      const result = canKick(
        makeInput({
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HIP]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Hip');
    });

    it('disallows kick when either leg is missing', () => {
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            limb: 'leftLeg',
            attackerDestroyedLocations: ['left_leg'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });

      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            limb: 'rightLeg',
            attackerDestroyedLocations: ['left_leg'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });
    });
  });

  describe('canTrip', () => {
    const validTripInput = {
      tacOpsTripAttackEnabled: true,
      attackerIsMek: true,
      targetIsMek: true,
      targetDistance: 1,
      targetInFrontArc: true,
      sameElevation: true,
      leftLegPresent: true,
      rightLegPresent: true,
      leftTripLimbUsable: true,
      rightTripLimbUsable: true,
    };

    it('allows source-backed adjacent Mek trip attempts and exposes the base to-hit relief', () => {
      expect(canTrip(validTripInput)).toEqual({ allowed: true });
      expect(getTripAttackBaseToHitAdjustment()).toBe(-1);
    });

    it.each([
      [
        'disabled optional rule',
        { tacOpsTripAttackEnabled: false },
        'TacOpsTripDisabled',
      ],
      [
        'already grappled attacker',
        { attackerAlreadyGrappled: true },
        'AttackerAlreadyGrappled',
      ],
      ['friendly target', { targetIsFriendly: true }, 'FriendlyTarget'],
      ['non-Mek attacker', { attackerIsMek: false }, 'AttackerNotMek'],
      ['non-Mek target', { targetIsMek: false }, 'TargetNotMek'],
      [
        'airborne attacker',
        { attackerIsAirborneVTOLorWIGE: true },
        'AttackerAirborne',
      ],
      ['missing leg', { leftLegPresent: false }, 'LegMissing'],
      ['distant target', { targetDistance: 2 }, 'TargetNotAdjacent'],
      [
        'rear or side target',
        { targetInFrontArc: false },
        'TargetNotInFrontArc',
      ],
      ['prone attacker', { attackerProne: true }, 'AttackerProne'],
      ['prone target', { targetProne: true }, 'TargetProne'],
      ['elevation mismatch', { sameElevation: false }, 'ElevationMismatch'],
      [
        'both trip limbs unavailable',
        { leftTripLimbUsable: false, rightTripLimbUsable: false },
        'TripLimbUnavailable',
      ],
    ])('rejects %s', (_label, overrides, reasonCode) => {
      expect(canTrip({ ...validTripInput, ...overrides })).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it('maps source-backed trip gates into runtime physical restrictions and to-hit math', () => {
      const input = makeInput({
        attackType: 'trip',
        optionalRules: ['tacops_trip_attack'],
        targetDistance: 1,
        targetInFrontArc: true,
        elevationDifference: 0,
      });

      expect(canTripPhysical(input)).toEqual({ allowed: true });
      expect(calculateTripToHit(input)).toMatchObject({
        allowed: true,
        baseToHit: 4,
        finalToHit: 4,
      });
    });

    it('rejects runtime trip attacks when the optional rule is not enabled', () => {
      expect(
        calculateTripToHit(
          makeInput({
            attackType: 'trip',
            targetDistance: 1,
            targetInFrontArc: true,
            elevationDifference: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        finalToHit: Infinity,
        restrictionReasonCode: 'TacOpsTripDisabled',
      });
    });
  });

  describe('canThrash', () => {
    const validThrashInput = {
      attackerIsMek: true,
      attackerProne: true,
      targetIsInfantry: true,
      targetDistance: 0,
      sameElevation: true,
      blockingTerrains: [],
      hasWorkingArmOrLeg: true,
    };

    it('allows source-backed prone Mek same-hex infantry thrash and exposes automatic success damage math', () => {
      expect(canThrash(validThrashInput)).toEqual({ allowed: true });
      expect(isThrashAttackAutomaticSuccess()).toBe(true);
      expect(getThrashAttackDamageForWeight(55)).toBe(18);
      expect(getThrashAttackDamageForWeight(100)).toBe(33);
    });

    it.each([
      ['friendly target', { targetIsFriendly: true }, 'FriendlyTarget'],
      ['non-Mek attacker', { attackerIsMek: false }, 'AttackerNotMek'],
      ['standing attacker', { attackerProne: false }, 'AttackerNotProne'],
      ['non-infantry target', { targetIsInfantry: false }, 'TargetNotInfantry'],
      ['swarming infantry', { targetIsSwarming: true }, 'TargetSwarming'],
      ['different hex', { targetDistance: 1 }, 'TargetNotSameHex'],
      ['elevation mismatch', { sameElevation: false }, 'ElevationMismatch'],
      [
        'building or hex target',
        { targetIsBuildingFuelTankOrHex: true },
        'InvalidExplicitTarget',
      ],
      [
        'weapon fired this turn',
        { weaponFiredThisTurn: true },
        'WeaponFiredThisTurn',
      ],
      [
        'no working arm or leg',
        { hasWorkingArmOrLeg: false },
        'ThrashLimbUnavailable',
      ],
    ])('rejects %s', (_label, overrides, reasonCode) => {
      expect(canThrash({ ...validThrashInput, ...overrides })).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it.each([
      'woods',
      'jungle',
      'rough',
      'rubble',
      'fuel-tank',
      'building',
    ] as const)('rejects %s terrain as not clear or pavement', (terrain) => {
      expect(
        canThrash({
          ...validThrashInput,
          blockingTerrains: [terrain],
        }),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TerrainNotClearOrPavement',
      });
    });

    it('maps source-backed thrash gates into runtime restrictions and automatic-hit to-hit math', () => {
      const input = makeInput({
        attackType: 'thrash',
        attackerProne: true,
        attackerUnitType: 'BattleMech',
        targetUnitType: 'Infantry',
        targetDistance: 0,
        elevationDifference: 0,
        thrashBlockingTerrains: [],
      });

      expect(canThrashPhysical(input)).toEqual({ allowed: true });
      expect(calculateThrashToHit(input)).toMatchObject({
        allowed: true,
        baseToHit: 0,
        finalToHit: 0,
        automaticHit: true,
        automaticHitReason: 'Thrash attacks always hit.',
      });
      expect(calculateThrashDamage(input)).toBe(27);
    });

    it('rejects runtime thrash attacks when a prone Mek is not in clear same-hex infantry conditions', () => {
      expect(
        canThrashPhysical(
          makeInput({
            attackType: 'thrash',
            attackerProne: false,
            attackerUnitType: 'BattleMech',
            targetUnitType: 'Infantry',
            targetDistance: 0,
            elevationDifference: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerNotProne',
      });

      expect(
        canThrashPhysical(
          makeInput({
            attackType: 'thrash',
            attackerProne: true,
            attackerUnitType: 'BattleMech',
            targetUnitType: 'Infantry',
            targetDistance: 0,
            elevationDifference: 0,
            thrashBlockingTerrains: ['woods'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TerrainNotClearOrPavement',
      });
    });
  });

  describe('canBrushOff', () => {
    const validBrushOffInput = {
      attackerIsMek: true,
      selectedArm: 'right',
      targetIsSwarmingInfantryOnAttacker: true,
      shoulderWorking: true,
    } as const;

    it('allows source-backed swarming-infantry and iNarc pod brush-off targets', () => {
      expect(canBrushOff(validBrushOffInput)).toEqual({ allowed: true });
      expect(
        canBrushOff({
          ...validBrushOffInput,
          targetIsSwarmingInfantryOnAttacker: false,
          targetIsINarcPod: true,
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      ['non-Mek attacker', { attackerIsMek: false }, 'AttackerNotMek'],
      [
        'missing arm selection',
        { selectedArm: undefined },
        'InvalidArmSelection',
      ],
      ['both arms selected', { selectedArm: 'both' }, 'InvalidArmSelection'],
      [
        'non-swarming non-iNarc target',
        { targetIsSwarmingInfantryOnAttacker: false },
        'InvalidTarget',
      ],
      ['quad attacker', { attackerIsQuad: true }, 'AttackerQuad'],
      ['flipped arms', { armsFlipped: true }, 'ArmsFlipped'],
      ['missing selected arm', { selectedArmMissing: true }, 'ArmMissing'],
      ['no/minimal arms quirk', { noMinimalArmsQuirk: true }, 'NoArmsQuirk'],
      ['destroyed shoulder', { shoulderWorking: false }, 'ShoulderDestroyed'],
      [
        'selected arm fired weapons',
        { armWeaponFiredThisTurn: true },
        'ArmWeaponFiredThisTurn',
      ],
      ['DFA target', { targetMakingDfa: true }, 'TargetMakingDfa'],
      ['prone attacker', { attackerProne: true }, 'AttackerProne'],
      [
        'building or hex target',
        { targetIsBuildingFuelTankOrHex: true },
        'InvalidExplicitTarget',
      ],
    ] as const)('rejects %s', (_label, overrides, reasonCode) => {
      expect(
        canBrushOff({ ...validBrushOffInput, ...overrides }),
      ).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it('exposes source-backed dedicated brush-off to-hit modifiers', () => {
      expect(
        getBrushOffAttackToHitModifiers({
          upperArmWorking: false,
          lowerArmWorking: false,
          armAesFunctional: true,
          handWorking: false,
          defenderHasMagneticClaws: true,
        }),
      ).toEqual({
        possible: true,
        modifiers: [
          expect.objectContaining({
            value: 4,
            reasonCode: 'BrushOffSwarmingInfantry',
          }),
          expect.objectContaining({
            value: 2,
            reasonCode: 'UpperArmActuatorDestroyed',
          }),
          expect.objectContaining({
            value: 2,
            reasonCode: 'LowerArmActuatorMissingOrDestroyed',
          }),
          expect.objectContaining({ value: -1, reasonCode: 'ArmAES' }),
          expect.objectContaining({
            value: 1,
            reasonCode: 'HandActuatorDestroyed',
          }),
          expect.objectContaining({
            value: 1,
            reasonCode: 'DefenderMagneticClaws',
          }),
        ],
      });
    });

    it('uses the source-backed hand/claw modifier precedence', () => {
      expect(
        getBrushOffAttackToHitModifiers({
          handActuatorPresent: false,
          lowerArmWorking: true,
        }).modifiers,
      ).toContainEqual(
        expect.objectContaining({ reasonCode: 'HandActuatorMissing' }),
      );
      expect(
        getBrushOffAttackToHitModifiers({ hasClaws: true }).modifiers,
      ).toContainEqual(expect.objectContaining({ reasonCode: 'UsingClaws' }));
    });

    it('exposes torso-mounted cockpit sensor branches', () => {
      expect(
        getBrushOffAttackToHitModifiers({
          torsoMountedCockpit: true,
          headSensorHits: 2,
        }).modifiers,
      ).toContainEqual(
        expect.objectContaining({
          value: 4,
          reasonCode: 'TorsoMountedCockpitHeadSensorsDestroyed',
        }),
      );
      expect(
        getBrushOffAttackToHitModifiers({
          torsoMountedCockpit: true,
          headSensorHits: 2,
          centerTorsoSensorHits: 1,
        }),
      ).toMatchObject({
        possible: false,
        impossibleReasonCode: 'TorsoMountedCockpitSensorsDestroyed',
      });
    });

    it('uses punch-equivalent damage for brush-off hit and miss damage', () => {
      const input = makeInput({ attackerTonnage: 80, arm: 'right' });
      expect(calculateBrushOffAttackDamage(input)).toBe(
        calculatePunchDamage(input),
      );
      expect(
        calculateBrushOffAttackDamage(
          makeInput({
            attackerTonnage: 80,
            arm: 'right',
            componentDamage: {
              ...DEFAULT_COMPONENT_DAMAGE,
              actuators: { [ActuatorType.UPPER_ARM]: true },
            },
          }),
        ),
      ).toBe(4);
    });
  });

  describe('canBreakGrapple', () => {
    const validBreakGrappleInput = {
      tacOpsGrapplingEnabled: true,
      attackerIsMek: true,
      commonImpossibleReasonCode: 'LockedInGrapple',
      grappledTargetMatches: true,
    } as const;

    it('allows source-backed Mek and ProtoMek break-grapple attempts locked in grapple', () => {
      expect(canBreakGrapple(validBreakGrappleInput)).toEqual({
        allowed: true,
      });
      expect(
        canBreakGrapple({
          ...validBreakGrappleInput,
          attackerIsMek: false,
          attackerIsProtoMek: true,
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      [
        'disabled optional rule',
        { tacOpsGrapplingEnabled: false },
        'TacOpsGrapplingDisabled',
      ],
      [
        'airborne attacker',
        { attackerIsAirborneVTOLorWIGE: true },
        'AttackerAirborne',
      ],
      [
        'common impossible state other than locked grapple',
        { commonImpossibleReasonCode: 'Other' },
        'CommonImpossible',
      ],
      [
        'chain-whip grapple',
        { attackerChainWhipGrappled: true },
        'ChainWhipGrappled',
      ],
      [
        'non-Mek or ProtoMek attacker',
        { attackerIsMek: false },
        'AttackerNotMekOrProtoMek',
      ],
      [
        'target not matching grapple state',
        { grappledTargetMatches: false },
        'NotGrappledToTarget',
      ],
    ] as const)('rejects %s', (_label, overrides, reasonCode) => {
      expect(
        canBreakGrapple({ ...validBreakGrappleInput, ...overrides }),
      ).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it('exposes source-backed original-attacker automatic success', () => {
      expect(
        getBreakGrappleAttackToHitModifiers({
          originalGrappleAttacker: true,
          attackerIsMek: true,
          leftShoulderWorking: false,
          targetUnitKind: 'mek',
          attackerWeightClass: 2,
          targetWeightClass: 5,
        }),
      ).toEqual({
        automaticSuccess: true,
        automaticSuccessReason: 'original attacker',
        automaticSuccessReasonCode: 'OriginalGrappleAttacker',
        modifiers: [],
      });
    });

    it('exposes source-backed break-grapple actuator, AES, and weight modifiers', () => {
      expect(
        getBreakGrappleAttackToHitModifiers({
          attackerIsMek: true,
          leftShoulderWorking: false,
          leftUpperArmWorking: false,
          leftLowerArmWorking: false,
          leftHandWorking: false,
          rightShoulderWorking: false,
          rightUpperArmWorking: false,
          rightLowerArmWorking: false,
          rightHandWorking: false,
          bothArmAesFunctional: true,
          attackerUnitKind: 'mek',
          targetUnitKind: 'mek',
          attackerWeightClass: 2,
          targetWeightClass: 5,
        }).modifiers,
      ).toEqual([
        expect.objectContaining({
          value: 2,
          reasonCode: 'LeftShoulderActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'LeftUpperArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'LeftLowerArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 1,
          reasonCode: 'LeftHandActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightShoulderActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightUpperArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightLowerArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 1,
          reasonCode: 'RightHandActuatorDestroyed',
        }),
        expect.objectContaining({ value: -1, reasonCode: 'ArmAES' }),
        expect.objectContaining({
          value: 3,
          reasonCode: 'WeightClassDifference',
        }),
      ]);
    });

    it('uses MegaMek grapple weight-class branches for ProtoMeks', () => {
      expect(
        getBreakGrappleWeightClassModifier({
          attackerUnitKind: 'mek',
          targetUnitKind: 'protoMek',
          attackerWeightClass: 4,
          targetWeightClass: 1,
        }),
      ).toBe(-4);
      expect(
        getBreakGrappleWeightClassModifier({
          attackerUnitKind: 'protoMek',
          targetUnitKind: 'mek',
          attackerWeightClass: 1,
          targetWeightClass: 5,
        }),
      ).toBe(5);
      expect(
        getBreakGrappleWeightClassModifier({
          attackerUnitKind: 'protoMek',
          targetUnitKind: 'protoMek',
          attackerWeightClass: 1,
          targetWeightClass: 2,
        }),
      ).toBe(0);
    });
  });

  describe('canGrapple', () => {
    const validGrappleInput = {
      tacOpsGrapplingEnabled: true,
      attackerIsBipedMek: true,
      targetIsMek: true,
      leftArmPresent: true,
      rightArmPresent: true,
      leftShoulderWorking: true,
      rightShoulderWorking: true,
      targetDistance: 1,
      elevationDifference: 0,
      maxElevationChange: 2,
      targetInFrontArc: true,
    } as const;

    it('allows source-backed BipedMek and ProtoMek grapple attempts', () => {
      expect(canGrapple(validGrappleInput)).toEqual({ allowed: true });
      expect(
        canGrapple({
          ...validGrappleInput,
          attackerIsBipedMek: false,
          attackerIsProtoMek: true,
          targetIsMek: false,
          targetIsProtoMek: true,
        }),
      ).toEqual({ allowed: true });
    });

    it('allows source-backed counter-grapples to relax range, front-arc, and weapon-fire gates', () => {
      expect(
        canGrapple({
          ...validGrappleInput,
          counterGrapple: true,
          commonImpossibleReasonCode: 'LockedInGrapple',
          targetDistance: 3,
          targetInFrontArc: false,
          weaponFiredThisTurn: true,
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      [
        'disabled optional rule',
        { tacOpsGrapplingEnabled: false },
        'TacOpsGrapplingDisabled',
      ],
      [
        'airborne attacker',
        { attackerIsAirborneVTOLorWIGE: true },
        'AttackerAirborne',
      ],
      [
        'common impossible state other than locked grapple',
        { commonImpossibleReasonCode: 'Other' },
        'CommonImpossible',
      ],
      [
        'friendly target while friendly fire is disabled',
        { targetIsFriendly: true },
        'FriendlyTarget',
      ],
      [
        'non-BipedMek or ProtoMek attacker',
        { attackerIsBipedMek: false, attackerIsProtoMek: false },
        'AttackerNotBipedMekOrProtoMek',
      ],
      [
        'non-Mek or ProtoMek target',
        { targetIsMek: false, targetIsProtoMek: false },
        'TargetNotMekOrProtoMek',
      ],
      ['No Arms quirk', { noMinimalArmsQuirk: true }, 'NoArmsQuirk'],
      [
        'missing selected arm',
        { grappleSide: 'left', leftArmPresent: false },
        'ArmMissing',
      ],
      [
        'destroyed selected shoulder',
        { grappleSide: 'right', rightShoulderWorking: false },
        'ShoulderMissingOrDestroyed',
      ],
      ['non-adjacent target', { targetDistance: 2 }, 'TargetNotAdjacent'],
      [
        'target elevation outside attacker elevation change',
        { elevationDifference: 3 },
        'ElevationMismatch',
      ],
      [
        'target outside front arc',
        { targetInFrontArc: false },
        'TargetNotInFrontArc',
      ],
      ['prone attacker', { attackerProne: true }, 'AttackerProne'],
      ['prone target', { targetProne: true }, 'TargetProne'],
      [
        'weapon fired before non-counter grapple',
        { weaponFiredThisTurn: true },
        'WeaponFiredThisTurn',
      ],
      [
        'already-grappled target state',
        {
          attackerGrappledTargetMatches: false,
          targetIsGrappleAttacker: true,
        },
        'AlreadyGrappled',
      ],
    ] as const)('rejects %s', (_label, overrides, reasonCode) => {
      expect(canGrapple({ ...validGrappleInput, ...overrides })).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it('exposes source-backed both-arm actuator, AES, and weight modifiers', () => {
      expect(
        getGrappleAttackToHitModifiers({
          attackerIsMek: true,
          leftUpperArmWorking: false,
          leftLowerArmWorking: false,
          leftHandWorking: false,
          rightUpperArmWorking: false,
          rightLowerArmWorking: false,
          rightHandWorking: false,
          leftArmAesFunctional: true,
          rightArmAesFunctional: true,
          attackerUnitKind: 'mek',
          targetUnitKind: 'mek',
          attackerWeightClass: 2,
          targetWeightClass: 5,
        }).modifiers,
      ).toEqual([
        expect.objectContaining({
          value: 2,
          reasonCode: 'LeftUpperArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'LeftLowerArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 1,
          reasonCode: 'LeftHandActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightUpperArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightLowerArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 1,
          reasonCode: 'RightHandActuatorDestroyed',
        }),
        expect.objectContaining({ value: -1, reasonCode: 'ArmAES' }),
        expect.objectContaining({
          value: 3,
          reasonCode: 'WeightClassDifference',
        }),
      ]);
    });

    it('exposes source-backed single-arm AES and TSM modifiers', () => {
      expect(
        getGrappleAttackToHitModifiers({
          grappleSide: 'right',
          attackerIsMek: true,
          rightUpperArmWorking: false,
          rightLowerArmWorking: false,
          rightHandWorking: false,
          rightArmAesFunctional: true,
          attackerHasActiveTsm: true,
        }).modifiers,
      ).toEqual([
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightUpperArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 2,
          reasonCode: 'RightLowerArmActuatorDestroyed',
        }),
        expect.objectContaining({
          value: 1,
          reasonCode: 'RightHandActuatorDestroyed',
        }),
        expect.objectContaining({ value: -1, reasonCode: 'ArmAES' }),
        expect.objectContaining({ value: -2, reasonCode: 'TSMActiveBonus' }),
      ]);
    });

    it('uses MegaMek grapple weight-class branches for ProtoMeks', () => {
      expect(
        getGrappleAttackToHitModifiers({
          attackerUnitKind: 'mek',
          targetUnitKind: 'protoMek',
          attackerWeightClass: 4,
          targetWeightClass: 1,
        }).modifiers,
      ).toEqual([
        expect.objectContaining({
          value: -4,
          reasonCode: 'WeightClassDifference',
        }),
      ]);
      expect(
        getGrappleAttackToHitModifiers({
          attackerUnitKind: 'protoMek',
          targetUnitKind: 'mek',
          attackerWeightClass: 1,
          targetWeightClass: 5,
        }).modifiers,
      ).toEqual([
        expect.objectContaining({
          value: 5,
          reasonCode: 'WeightClassDifference',
        }),
      ]);
      expect(
        getGrappleAttackToHitModifiers({
          attackerUnitKind: 'protoMek',
          targetUnitKind: 'protoMek',
          attackerWeightClass: 1,
          targetWeightClass: 2,
        }).modifiers,
      ).toEqual([]);
    });
  });

  describe('canJumpJetAttack', () => {
    const validJumpJetAttackInput = {
      tacOpsJumpJetAttackEnabled: true,
      selectedLeg: 'left',
      attackerIsMek: true,
      leftLegPresent: true,
      leftReadyJumpJetCount: 2,
      targetDistance: 1,
      standingAttackerHeightAboveTargetHeight: 1,
      targetDirectlyAheadOfFeet: true,
    } as const;

    it('allows source-backed standing and prone jump jet attacks', () => {
      expect(canJumpJetAttack(validJumpJetAttackInput)).toEqual({
        allowed: true,
      });
      expect(
        canJumpJetAttack({
          ...validJumpJetAttackInput,
          selectedLeg: 'both',
          attackerProne: true,
          rightLegPresent: true,
          rightReadyJumpJetCount: 1,
          standingAttackerHeightAboveTargetHeight: undefined,
          targetDirectlyAheadOfFeet: undefined,
          proneTargetElevationInRange: true,
          targetDirectlyBehindFeet: true,
        }),
      ).toEqual({ allowed: true });
    });

    it.each([
      [
        'disabled optional rule',
        { tacOpsJumpJetAttackEnabled: false },
        'TacOpsJumpJetAttackDisabled',
      ],
      [
        'common impossible state',
        { commonImpossible: true },
        'CommonImpossible',
      ],
      [
        'LAM outside Mek mode',
        { attackerIsLandAirMek: true, attackerIsMekMode: false },
        'LandAirMekNotMekMode',
      ],
      [
        'missing leg selection',
        { selectedLeg: undefined },
        'InvalidLegSelection',
      ],
      ['non-Mek attacker', { attackerIsMek: false }, 'AttackerNotMek'],
      [
        'standing both-leg attack',
        {
          selectedLeg: 'both',
          rightLegPresent: true,
          rightReadyJumpJetCount: 1,
        },
        'BothLegsRequiresProne',
      ],
      ['missing selected leg', { leftLegPresent: false }, 'LegMissing'],
      [
        'selected leg jump jets destroyed',
        { leftReadyJumpJetCount: 0 },
        'JumpJetsMissingOrDestroyed',
      ],
      [
        'attacker already jumped',
        { attackerMovedJump: true },
        'AttackerJumpedThisTurn',
      ],
      [
        'selected leg weapon fired',
        { leftLegWeaponFiredThisTurn: true },
        'LegWeaponFiredThisTurn',
      ],
      ['non-adjacent target', { targetDistance: 2 }, 'TargetNotAdjacent'],
      [
        'standing target elevation mismatch',
        { standingAttackerHeightAboveTargetHeight: 0 },
        'TargetElevationNotInRange',
      ],
      [
        'standing target not ahead',
        { targetDirectlyAheadOfFeet: false },
        'TargetNotDirectlyAheadOfFeet',
      ],
      [
        'prone target elevation mismatch',
        {
          attackerProne: true,
          standingAttackerHeightAboveTargetHeight: undefined,
          targetDirectlyAheadOfFeet: undefined,
          proneTargetElevationInRange: false,
        },
        'TargetElevationNotInRange',
      ],
      [
        'prone target not behind',
        {
          attackerProne: true,
          standingAttackerHeightAboveTargetHeight: undefined,
          targetDirectlyAheadOfFeet: undefined,
          proneTargetElevationInRange: true,
          targetDirectlyBehindFeet: false,
        },
        'TargetNotDirectlyBehindFeet',
      ],
    ] as const)('rejects %s', (_label, overrides, reasonCode) => {
      expect(
        canJumpJetAttack({ ...validJumpJetAttackInput, ...overrides }),
      ).toMatchObject({
        allowed: false,
        reasonCode,
      });
    });

    it('uses source-backed selected-leg jump jet damage and wet-location zero damage', () => {
      expect(
        getJumpJetAttackDamage({
          selectedLeg: 'both',
          leftReadyJumpJetCount: 2,
          rightReadyJumpJetCount: 1,
        }),
      ).toBe(9);
      expect(
        getJumpJetAttackDamage({
          selectedLeg: 'left',
          leftReadyJumpJetCount: 3,
          leftLegWet: true,
        }),
      ).toBe(0);
    });

    it('exposes source-backed jump jet to-hit branches', () => {
      expect(getJumpJetAttackToHitModifiers()).toEqual({
        automaticSuccess: false,
        modifiers: [
          expect.objectContaining({ value: 2, reasonCode: 'JumpJetAttack' }),
        ],
      });
      expect(
        getJumpJetAttackToHitModifiers({ attackerProne: true }).modifiers,
      ).toContainEqual(
        expect.objectContaining({ value: 2, reasonCode: 'AttackerProne' }),
      );
      expect(
        getJumpJetAttackToHitModifiers({
          targetIsBuildingFuelTankOrGunEmplacement: true,
        }),
      ).toEqual({
        automaticSuccess: true,
        automaticSuccessReason: 'Targeting adjacent building.',
        automaticSuccessReasonCode: 'AdjacentBuilding',
        modifiers: [],
      });
    });
  });

  describe('canMeleeWeapon', () => {
    it('should allow melee with intact arm', () => {
      expect(canMeleeWeapon(makeInput({ attackType: 'hatchet' })).allowed).toBe(
        true,
      );
    });

    it('should disallow if lower arm destroyed', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'hatchet',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('should disallow if hand destroyed', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'sword',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('should disallow if arm fired weapon', () => {
      const result = canMeleeWeapon(
        makeInput({ attackType: 'hatchet', weaponsFiredFromArm: ['ppc-1'] }),
      );
      expect(result.allowed).toBe(false);
    });

    it('disallows arm-mounted melee weapons when No Arms quirk is present', () => {
      const result = canMeleeWeapon(
        makeInput({ attackType: 'hatchet', unitQuirks: ['no_arms'] }),
      );

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'NoArmsQuirk',
      });
    });

    it('disallows retractable blade attacks when the blade is not extended', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'retractable-blade',
          retractableBladeExtended: false,
        }),
      );

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'RetractableBladeNotExtended',
      });
    });

    it('allows flails and lances without a working hand actuator', () => {
      const componentDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HAND]: true },
      };

      expect(
        canMeleeWeapon(makeInput({ attackType: 'flail', componentDamage }))
          .allowed,
      ).toBe(true);
      expect(
        canMeleeWeapon(makeInput({ attackType: 'lance', componentDamage }))
          .allowed,
      ).toBe(true);
    });

    it('treats wrecking balls as torso-mounted physical weapons', () => {
      const result = canMeleeWeapon(
        makeInput({
          attackType: 'wrecking-ball',
          unitQuirks: ['no_arms'],
          weaponsFiredFromArm: ['right-arm-ppc'],
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.SHOULDER]: true,
              [ActuatorType.LOWER_ARM]: true,
              [ActuatorType.HAND]: true,
            },
          },
        }),
      );

      expect(result.allowed).toBe(true);
    });

    it('disallows flails but allows wrecking balls on quad BattleMechs', () => {
      expect(
        canMeleeWeapon(
          makeInput({ attackType: 'flail', attackerIsQuad: true }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerQuad',
      });
      expect(
        canMeleeWeapon(
          makeInput({ attackType: 'wrecking-ball', attackerIsQuad: true }),
        ).allowed,
      ).toBe(true);
    });
  });

  describe('source-backed physical legality gates', () => {
    it('disallows missing physical targets before other target checks', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetExists: false,
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMissing',
      });

      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetExists: false,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMissing',
      });
    });

    it('disallows destroyed physical targets before self and friendly checks', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetDestroyed: true,
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetDestroyed',
      });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetDestroyed: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetDestroyed',
      });

      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetDestroyed: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetDestroyed',
      });

      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetDestroyed: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetDestroyed',
      });
    });

    it('disallows ejected physical targets before self and friendly checks', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetEjected: true,
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetEjected',
      });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetEjected: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetEjected',
      });

      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetEjected: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetEjected',
      });

      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetEjected: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetEjected',
      });
    });

    it('disallows retreated physical targets before self and friendly checks', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetRetreated: true,
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetRetreated',
      });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetRetreated: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetRetreated',
      });

      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetRetreated: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetRetreated',
      });

      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetRetreated: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetRetreated',
      });
    });

    it('disallows passenger physical targets across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsPassenger: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPassenger',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            targetIsPassenger: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPassenger',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsPassenger: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPassenger',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsPassenger: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPassenger',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsPassenger: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPassenger',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetIsPassenger: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPassenger',
      });
    });

    it('disallows swarming physical targets across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsSwarming: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetSwarming',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            targetIsSwarming: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetSwarming',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsSwarming: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetSwarming',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsSwarming: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetSwarming',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsSwarming: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetSwarming',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetIsSwarming: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetSwarming',
      });
    });

    it('disallows targets making DFA across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsMakingDFA: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDFA',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            targetIsMakingDFA: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDFA',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsMakingDFA: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDFA',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsMakingDFA: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDFA',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsMakingDFA: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDFA',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetIsMakingDFA: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDFA',
      });
    });

    it('disallows charge and DFA against targets in displacement conflicts', () => {
      expect(
        canCharge(
          makeInput({
            attackerId: 'attacker',
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsMakingDisplacementAttack: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDisplacementAttack',
      });
      expect(
        canDFA(
          makeInput({
            attackerId: 'attacker',
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsMakingDisplacementAttack: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDisplacementAttack',
      });
      expect(
        canCharge(
          makeInput({
            attackerId: 'attacker',
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetOfDisplacementAttack',
      });
      expect(
        canDFA(
          makeInput({
            attackerId: 'attacker',
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetOfDisplacementAttack',
      });
      expect(
        canCharge(
          makeInput({
            attackerId: 'attacker',
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetedByDisplacementAttackerId: 'attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows prone charge attackers after the run gate passes', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerProne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerProne',
      });
    });

    it('disallows jumping charge movement before run/backward/prone gates', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerJumpedThisTurn: true,
            attackerRanThisTurn: false,
            attackerMovedBackwardThisTurn: true,
            attackerProne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ChargeJumpMovement',
      });
    });

    it('disallows backward charge movement before prone-state validation', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerMovedBackwardThisTurn: true,
            attackerProne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ChargeBackwardMovement',
      });
    });

    it('disallows push displacement conflicts except legal counter-pushes', () => {
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            targetIsMakingDisplacementAttack: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDisplacementAttack',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            targetIsMakingDisplacementAttack: true,
            targetIsPushing: true,
            targetDisplacementAttackTargetId: 'other-target',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPushingAnotherMek',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            attackerTargetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerTargetOfDisplacementAttack',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            targetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetOfDisplacementAttack',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            attackerTargetedByDisplacementAttackerId: 'target',
            targetIsMakingDisplacementAttack: true,
            targetIsPushing: true,
            targetDisplacementAttackTargetId: 'attacker',
            targetedByDisplacementAttackerId: 'attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows targets inside another building across supported physical attack families', () => {
      const buildingTarget = {
        targetOccupiedBuildingId: 'building-east',
        targetDistance: 1,
      } satisfies Partial<IPhysicalAttackInput>;

      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
    });

    it('allows physical targets inside the same building', () => {
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            attackerOccupiedBuildingId: 'building-east',
            targetOccupiedBuildingId: 'building-east',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows invalid physical hex targets across supported attack families', () => {
      const invalidHexTarget = {
        targetObjectType: 'hexClear',
        targetDistance: 1,
      } satisfies Partial<IPhysicalAttackInput>;

      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            ...invalidHexTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'InvalidPhysicalTarget',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            ...invalidHexTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'InvalidPhysicalTarget',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            ...invalidHexTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'InvalidPhysicalTarget',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            ...invalidHexTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'InvalidPhysicalTarget',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            ...invalidHexTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'InvalidPhysicalTarget',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            ...invalidHexTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'InvalidPhysicalTarget',
      });
    });

    it('disallows push targets that are buildings or fuel tanks', () => {
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetObjectType: 'building',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetBuilding',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetObjectType: 'fuelTank',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetBuilding',
      });
    });

    it('disallows charge and DFA against explicit building or fuel-tank targets', () => {
      for (const targetObjectType of ['building', 'fuelTank'] as const) {
        expect(
          canCharge(
            makeInput({
              attackType: 'charge',
              attackerRanThisTurn: true,
              targetObjectType,
              targetDistance: 1,
            }),
          ),
        ).toMatchObject({
          allowed: false,
          reasonCode: 'InvalidPhysicalTarget',
        });

        expect(
          canDFA(
            makeInput({
              attackType: 'dfa',
              attackerJumpedThisTurn: true,
              targetObjectType,
              targetDistance: 1,
            }),
          ),
        ).toMatchObject({
          allowed: false,
          reasonCode: 'InvalidPhysicalTarget',
        });
      }
    });

    it('treats explicit gun emplacements as automatic-success physical targets where source-backed', () => {
      for (const attackType of [
        'punch',
        'kick',
        'dfa',
        'hatchet',
        'sword',
        'mace',
        'lance',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ] as const) {
        const result = calculatePhysicalToHit(
          makeInput({
            attackType,
            attackerJumpedThisTurn: attackType === 'dfa' ? true : undefined,
            targetObjectType: 'gunEmplacement',
            targetDistance: 1,
          }),
        );

        expect(result).toMatchObject({
          allowed: true,
          finalToHit: 0,
          automaticHit: true,
          automaticHitReason: 'Targeting adjacent gun emplacement.',
        });
      }
    });

    it('keeps gun emplacements out of BattleMech push and charge target classes', () => {
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetObjectType: 'gunEmplacement',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotMek',
      });

      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetObjectType: 'gunEmplacement',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotMek',
      });
    });

    it('disallows airborne physical targets across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsAirborne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetAirborne',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            targetIsAirborne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetAirborne',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsAirborne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetAirborne',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsAirborne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetAirborne',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsAirborne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetAirborne',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetIsAirborne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetAirborne',
      });
    });

    it('disallows evading attackers across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            attackerEvading: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerEvading',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            attackerEvading: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerEvading',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerEvading: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerEvading',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerEvading: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerEvading',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerEvading: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerEvading',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            attackerEvading: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerEvading',
      });
    });

    it('disallows cargo-interacting attackers across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            attackerLoadingOrUnloadingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            attackerLoadingOrUnloadingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerLoadingOrUnloadingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerLoadingOrUnloadingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerLoadingOrUnloadingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            attackerLoadingOrUnloadingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
    });

    it('disallows different-board targets across supported physical attack families', () => {
      const boardMismatch = {
        attackerBoardId: 'board-alpha',
        targetBoardId: 'board-beta',
        targetDistance: 1,
      };

      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
    });

    it('allows same-board physical targets when board identity is explicit', () => {
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            attackerBoardId: 'board-alpha',
            targetBoardId: 'board-alpha',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows self-targeted physical attacks before adjacency checks', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'SelfTarget',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'SelfTarget',
      });
    });

    it('disallows friendly physical targets across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
    });

    it('disallows non-adjacent targets across supported physical attack families', () => {
      expect(
        canPunch(makeInput({ attackType: 'punch', targetDistance: 2 })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotAdjacent',
      });
      expect(
        canKick(makeInput({ attackType: 'kick', targetDistance: 2 })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotAdjacent',
      });
      expect(
        canPush(makeInput({ attackType: 'push', targetDistance: 2 })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotAdjacent',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetDistance: 2,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotAdjacent',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerUnitType: 'BattleMech',
            targetUnitType: 'Battle Armor',
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotMek',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerUnitType: 'Vehicle',
            targetUnitType: 'ProtoMech',
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInfantryOrProtoMek',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetProne: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetProne',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            elevationDifference: 2,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ElevationMismatch',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            elevationDifference: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetMovementComplete: false,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMovementIncomplete',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetMovementComplete: false,
            targetImmobile: true,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetMovementComplete: false,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMovementIncomplete',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetMovementComplete: false,
            targetImmobile: true,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetDistance: 2,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotAdjacent',
      });
      expect(
        canMeleeWeapon(makeInput({ attackType: 'sword', targetDistance: 2 })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotAdjacent',
      });
    });

    it('disallows push with No Arms, elevation mismatch, prone state, or fired arm weapons', () => {
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerUnitType: 'Vehicle',
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerNotMek',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerIsQuad: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerQuad',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerIsAirborne: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerAirborne',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerArmsFlipped: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ArmsFlipped',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetUnitType: 'ProtoMech',
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotMek',
      });

      expect(
        canPush(makeInput({ attackType: 'push', unitQuirks: ['no_arms'] })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'NoArmsQuirk',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            attackerDestroyedLocations: ['left_arm'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'LimbMissing',
      });

      expect(
        canPush(makeInput({ attackType: 'push', elevationDifference: 1 })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ElevationMismatch',
      });

      expect(
        canPush(makeInput({ attackType: 'push', attackerProne: true })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerProne',
      });

      expect(
        canPush(makeInput({ attackType: 'push', targetProne: true })),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetProne',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            weaponsFiredFromArm: ['right-arm-medium-laser'],
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'WeaponFiredThisTurn',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            pushTargetDirectlyAhead: false,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetNotDirectlyAhead',
      });
    });

    it('disallows DFA by a prone attacker even when the unit jumped', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerProne: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerProne',
      });
    });

    it('disallows DFA using mechanical jump boosters', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerUsedMechanicalJumpBooster: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'MechanicalJumpBooster',
      });
    });

    it('disallows DFA by infantry-family attackers', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerUnitType: 'Battle Armor',
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerInfantry',
      });
    });

    it('disallows DFA against DropShip targets', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetUnitType: UnitType.DROPSHIP,
            targetMovementComplete: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetDropShip',
      });
    });

    it('allows DFA against reachable airborne VTOL/WIGE targets', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerHeight: 1,
            attackerJumpMP: 3,
            elevationDifference: 4,
            targetIsAirborne: true,
            targetIsAirborneVTOLorWIGE: true,
            targetMovementComplete: true,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('recognizes airborne WIGE targets from vehicle motion type', () => {
      expect(
        isPhysicalAirborneVtolOrWigeTarget(
          UnitType.VEHICLE,
          GroundMotionType.WIGE,
          true,
        ),
      ).toBe(true);
      expect(
        isPhysicalAirborneVtolOrWigeTarget(
          UnitType.VEHICLE,
          GroundMotionType.WIGE,
          false,
        ),
      ).toBe(false);
    });

    it('disallows DFA when airborne VTOL/WIGE elevation is beyond jump MP', () => {
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            attackerHeight: 1,
            attackerJumpMP: 3,
            elevationDifference: 5,
            targetIsAirborne: true,
            targetIsAirborneVTOLorWIGE: true,
            targetMovementComplete: true,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ElevationMismatch',
      });
    });
  });

  // =============================================================================
  // To-Hit Calculation Tests
  // =============================================================================

  describe('calculatePunchToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculatePunchToHit(makeInput({ pilotingSkill: 5 }));
      expect(result.baseToHit).toBe(5);
      expect(result.finalToHit).toBe(5);
      expect(result.allowed).toBe(true);
    });

    it('applies Melee Specialist as a physical attack to-hit modifier', () => {
      const result = calculatePunchToHit(
        makeInput({ pilotingSkill: 5, pilotAbilities: ['melee-specialist'] }),
      );

      expect(result.finalToHit).toBe(4);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Melee Specialist',
          value: -1,
          source: 'spa',
        }),
      );
    });

    it('applies matching Battle Fists as a punch to-hit modifier', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'right',
          unitQuirks: ['battle_fists_ra'],
        }),
      );

      expect(result.finalToHit).toBe(4);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Battle Fists',
          value: -1,
          source: 'quirk',
        }),
      );
    });

    it('does not apply Battle Fists without a working matching hand actuator', () => {
      expect(
        calculatePunchToHit(
          makeInput({
            pilotingSkill: 5,
            arm: 'right',
            unitQuirks: ['battle_fists_ra'],
            handActuatorPresent: false,
          }),
        ).finalToHit,
      ).toBe(5);
      expect(
        calculatePunchToHit(
          makeInput({
            pilotingSkill: 5,
            arm: 'right',
            unitQuirks: ['battle_fists_la'],
          }),
        ).finalToHit,
      ).toBe(5);
    });

    it('should add +2 for upper arm destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_ARM]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(7);
    });

    it('should add +2 for lower arm destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(7);
    });

    it('should add +1 for hand destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('adds the source-backed claw punch modifier for the selected arm', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'left',
          leftArmHasClaw: true,
        }),
      );

      expect(result.finalToHit).toBe(6);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Using Claws',
          value: 1,
          source: 'physical-equipment',
        }),
      );
    });

    it('removes only the claw punch to-hit modifier when PLAYTEST_3 is enabled', () => {
      const toHit = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'left',
          leftArmHasClaw: true,
          optionalRules: ['PLAYTEST_3'],
        }),
      );
      const damage = calculatePunchDamage(
        makeInput({
          attackerTonnage: 55,
          arm: 'left',
          leftArmHasClaw: true,
          optionalRules: ['PLAYTEST_3'],
        }),
      );

      expect(toHit.finalToHit).toBe(5);
      expect(toHit.modifiers).toContainEqual(
        expect.objectContaining({
          name: 'Using Claws',
          value: 0,
          source: 'physical-equipment',
        }),
      );
      expect(damage).toBe(8);
    });

    it('uses claws instead of a destroyed hand actuator modifier', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          arm: 'right',
          rightArmHasClaw: true,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HAND]: true },
          },
        }),
      );

      expect(result.finalToHit).toBe(6);
      expect(result.modifiers).toContainEqual(
        expect.objectContaining({ name: 'Using Claws', value: 1 }),
      );
      expect(result.modifiers).not.toContainEqual(
        expect.objectContaining({ name: 'Hand actuator destroyed' }),
      );
    });

    it('should stack multiple actuator mods', () => {
      const result = calculatePunchToHit(
        makeInput({
          pilotingSkill: 5,
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: {
              [ActuatorType.UPPER_ARM]: true,
              [ActuatorType.LOWER_ARM]: true,
              [ActuatorType.HAND]: true,
            },
          },
        }),
      );
      expect(result.finalToHit).toBe(10); // 5 + 2 + 2 + 1
    });

    it('should return not-allowed when shoulder destroyed', () => {
      const result = calculatePunchToHit(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
      expect(result.finalToHit).toBe(Infinity);
    });
  });

  describe('calculateKickToHit', () => {
    it('should use piloting - 2 as base', () => {
      const result = calculateKickToHit(
        makeInput({ pilotingSkill: 5, attackType: 'kick' }),
      );
      expect(result.baseToHit).toBe(3);
      expect(result.finalToHit).toBe(3);
    });

    it('should add leg actuator modifiers', () => {
      const result = calculateKickToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.UPPER_LEG]: true },
          },
        }),
      );
      expect(result.finalToHit).toBe(5); // 3 + 2
    });

    it('should not allow when hip destroyed', () => {
      const result = calculateKickToHit(
        makeInput({
          attackType: 'kick',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.HIP]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('calculateChargeToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculateChargeToHit(
        makeInput({ pilotingSkill: 5, attackType: 'charge' }),
      );
      expect(result.baseToHit).toBe(5);
      expect(result.allowed).toBe(true);
    });
  });

  describe('calculateDFAToHit', () => {
    it('should use piloting skill as base', () => {
      const result = calculateDFAToHit(
        makeInput({ pilotingSkill: 4, attackType: 'dfa' }),
      );
      expect(result.baseToHit).toBe(4);
      expect(result.allowed).toBe(true);
    });

    it('applies source-backed DFA target-class modifiers', () => {
      const infantry = calculateDFAToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'dfa',
          targetUnitType: UnitType.INFANTRY,
        }),
      );
      const battleArmor = calculateDFAToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'dfa',
          targetUnitType: UnitType.BATTLE_ARMOR,
        }),
      );

      expect(infantry.finalToHit).toBe(8);
      expect(infantry.modifiers).toContainEqual({
        name: 'Infantry target',
        value: 3,
        source: 'target-class',
      });
      expect(battleArmor.finalToHit).toBe(6);
      expect(battleArmor.modifiers).toContainEqual({
        name: 'Battle Armor target',
        value: 1,
        source: 'target-class',
      });
    });

    it('applies source-backed DFA piloting skill differential', () => {
      const result = calculateDFAToHit(
        makeInput({
          pilotingSkill: 5,
          attackType: 'dfa',
          targetPilotingSkill: 3,
        }),
      );

      expect(result.finalToHit).toBe(7);
      expect(result.modifiers).toContainEqual({
        name: 'Piloting skill differential',
        value: 2,
        source: 'pilot-skill',
      });
    });
  });

  describe('calculatePushToHit', () => {
    it('should use piloting - 1 as base', () => {
      const result = calculatePushToHit(
        makeInput({ pilotingSkill: 5, attackType: 'push' }),
      );
      expect(result.baseToHit).toBe(4);
      expect(result.finalToHit).toBe(4);
    });
  });

  describe('calculateMeleeWeaponToHit', () => {
    it('should apply -1 for hatchet', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'hatchet' }),
      );
      expect(result.finalToHit).toBe(4);
    });

    it('should apply -2 for sword', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'sword' }),
      );
      expect(result.finalToHit).toBe(3);
    });

    it('should apply +1 for mace', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'mace' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should apply +1 for lance', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'lance' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should apply -2 for retractable blade', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'retractable-blade' }),
      );
      expect(result.finalToHit).toBe(3);
    });

    it('should apply 0 for flail', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'flail' }),
      );
      expect(result.finalToHit).toBe(5);
    });

    it('should apply +1 for wrecking ball', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({ pilotingSkill: 5, attackType: 'wrecking-ball' }),
      );
      expect(result.finalToHit).toBe(6);
    });

    it('should not allow if lower arm destroyed', () => {
      const result = calculateMeleeWeaponToHit(
        makeInput({
          attackType: 'hatchet',
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.LOWER_ARM]: true },
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('calculatePhysicalToHit (dispatch)', () => {
    it('should dispatch punch', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'punch', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(5);
    });

    it('should dispatch kick', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'kick', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(3);
    });

    it('should dispatch push', () => {
      const result = calculatePhysicalToHit(
        makeInput({ attackType: 'push', pilotingSkill: 5 }),
      );
      expect(result.baseToHit).toBe(4);
    });

    it('applies source-backed Frogman to every physical to-hit path in depth-2 water', () => {
      const attackTypes = [
        'punch',
        'kick',
        'charge',
        'dfa',
        'push',
        'hatchet',
        'sword',
        'mace',
        'lance',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ] as const satisfies readonly IPhysicalAttackInput['attackType'][];

      for (const attackType of attackTypes) {
        const result = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
            pilotAbilities: ['tm_frogman'],
            attackerWaterDepth: 2,
            attackerUnitType: 'BattleMech',
          }),
        );

        expect(result.allowed).toBe(true);
        expect(result.modifiers).toContainEqual(
          expect.objectContaining({
            name: 'Frogman',
            value: -1,
            source: 'spa',
          }),
        );
      }
    });

    it('applies source-backed target evasion to every physical to-hit path', () => {
      const attackTypes = [
        'punch',
        'kick',
        'charge',
        'dfa',
        'push',
        'hatchet',
        'sword',
        'mace',
        'lance',
        'retractable-blade',
        'flail',
        'wrecking-ball',
      ] as const satisfies readonly IPhysicalAttackInput['attackType'][];

      for (const attackType of attackTypes) {
        const baseline = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
          }),
        );
        const evadingTarget = calculatePhysicalToHit(
          makeInput({
            attackType,
            pilotingSkill: 5,
            targetEvading: true,
          }),
        );

        expect(evadingTarget.allowed).toBe(true);
        expect(evadingTarget.finalToHit).toBe(baseline.finalToHit + 1);
        expect(evadingTarget.modifiers).toContainEqual({
          name: 'Target Evasion',
          value: 1,
          source: 'movement',
        });
      }
    });

    it('applies explicit Skilled Evasion target bonuses to physical to-hit', () => {
      const baseline = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
        }),
      );
      const evadingTarget = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
          targetEvading: true,
          targetEvasionBonus: 3,
        }),
      );

      expect(evadingTarget.allowed).toBe(true);
      expect(evadingTarget.finalToHit).toBe(baseline.finalToHit + 3);
      expect(evadingTarget.modifiers).toContainEqual({
        name: 'Target Evasion',
        value: 3,
        source: 'movement',
      });
    });

    it('suppresses explicit zero Skilled Evasion target bonuses for physical to-hit', () => {
      const result = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
          targetEvading: true,
          targetEvasionBonus: 0,
        }),
      );

      expect(result.finalToHit).toBe(3);
      expect(result.modifiers).not.toContainEqual(
        expect.objectContaining({
          name: 'Target Evasion',
        }),
      );
    });

    it('suppresses source-backed target evasion against prone physical targets', () => {
      const result = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotingSkill: 5,
          targetEvading: true,
          targetProne: true,
        }),
      );

      expect(result.finalToHit).toBe(3);
      expect(result.modifiers).not.toContainEqual(
        expect.objectContaining({
          name: 'Target Evasion',
        }),
      );
    });

    it('does not apply Frogman in shallow water or to explicit non-Mek attackers', () => {
      const shallow = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotAbilities: ['tm_frogman'],
          attackerWaterDepth: 1,
          attackerUnitType: 'BattleMech',
        }),
      );
      const nonMek = calculatePhysicalToHit(
        makeInput({
          attackType: 'kick',
          pilotAbilities: ['tm_frogman'],
          attackerWaterDepth: 2,
          attackerUnitType: 'Tank',
        }),
      );

      expect(shallow.modifiers).not.toContainEqual(
        expect.objectContaining({ name: 'Frogman' }),
      );
      expect(nonMek.modifiers).not.toContainEqual(
        expect.objectContaining({ name: 'Frogman' }),
      );
    });
  });

  // =============================================================================
  // Damage Result Tests
  // =============================================================================

  describe('calculatePhysicalDamage', () => {
    it('should return correct punch damage result', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 80, attackType: 'punch' }),
      );
      expect(result.targetDamage).toBe(8);
      expect(result.attackerDamage).toBe(0);
      expect(result.targetPSR).toBe(false);
      expect(result.hitTable).toBe('punch');
    });

    it('should return correct kick damage result with PSR', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 80, attackType: 'kick' }),
      );
      expect(result.targetDamage).toBe(16);
      expect(result.targetPSR).toBe(true);
      expect(result.hitTable).toBe('kick');
    });

    it('should return charge damage to both units', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 60,
          attackType: 'charge',
          hexesMoved: 5,
          targetTonnage: 75,
        }),
      );
      expect(result.targetDamage).toBe(24);
      expect(result.attackerDamage).toBe(8); // ceil(75/10)
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(2);
    });

    it('should return DFA damage with leg damage', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 70, attackType: 'dfa' }),
      );
      expect(result.targetDamage).toBe(21);
      expect(result.attackerLegDamagePerLeg).toBe(7);
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
      expect(result.hitTable).toBe('punch');
    });

    it('should return 0 damage and displacement for push', () => {
      const result = calculatePhysicalDamage(makeInput({ attackType: 'push' }));
      expect(result.targetDamage).toBe(0);
      expect(result.targetPSR).toBe(true);
      expect(result.targetDisplaced).toBe(true);
    });

    it('should return melee weapon damage with punch table', () => {
      const result = calculatePhysicalDamage(
        makeInput({ attackerTonnage: 70, attackType: 'hatchet' }),
      );
      expect(result.targetDamage).toBe(14);
      expect(result.hitTable).toBe('punch');
    });

    it('should return retractable blade damage with punch table', () => {
      const result = calculatePhysicalDamage(
        makeInput({
          attackerTonnage: 70,
          attackType: 'retractable-blade',
        }),
      );
      expect(result.targetDamage).toBe(7);
      expect(result.hitTable).toBe('punch');
    });

    it('should return flail and wrecking ball damage with punch table', () => {
      expect(
        calculatePhysicalDamage(makeInput({ attackType: 'flail' })),
      ).toMatchObject({
        targetDamage: 9,
        hitTable: 'punch',
      });
      expect(
        calculatePhysicalDamage(makeInput({ attackType: 'wrecking-ball' })),
      ).toMatchObject({
        targetDamage: 8,
        hitTable: 'punch',
      });
    });
  });

  // =============================================================================
  // Miss Consequences Tests
  // =============================================================================

  describe('getPhysicalMissConsequences', () => {
    it('kick miss triggers attacker PSR', () => {
      const result = getPhysicalMissConsequences('kick');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('DFA miss triggers attacker PSR +4', () => {
      const result = getPhysicalMissConsequences('dfa');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
    });

    it('punch miss has no consequence', () => {
      expect(getPhysicalMissConsequences('punch').attackerPSR).toBe(false);
    });

    it('push miss has no consequence', () => {
      expect(getPhysicalMissConsequences('push').attackerPSR).toBe(false);
    });

    it('charge miss moves the attacker without a normal PSR', () => {
      const result = getPhysicalMissConsequences('charge');
      expect(result.attackerPSR).toBe(false);
      expect(result.attackerPSRModifier).toBe(0);
    });
  });

  // =============================================================================
  // Hit Location Tables Tests
  // =============================================================================

  describe('hit location tables', () => {
    it('punch table maps 1-6 correctly', () => {
      expect(PUNCH_HIT_TABLE[1]).toBe('left_arm');
      expect(PUNCH_HIT_TABLE[2]).toBe('left_torso');
      expect(PUNCH_HIT_TABLE[3]).toBe('center_torso');
      expect(PUNCH_HIT_TABLE[4]).toBe('right_torso');
      expect(PUNCH_HIT_TABLE[5]).toBe('right_arm');
      expect(PUNCH_HIT_TABLE[6]).toBe('head');
    });

    it('kick table maps 1-3 to right leg, 4-6 to left leg', () => {
      expect(KICK_HIT_TABLE[1]).toBe('right_leg');
      expect(KICK_HIT_TABLE[2]).toBe('right_leg');
      expect(KICK_HIT_TABLE[3]).toBe('right_leg');
      expect(KICK_HIT_TABLE[4]).toBe('left_leg');
      expect(KICK_HIT_TABLE[5]).toBe('left_leg');
      expect(KICK_HIT_TABLE[6]).toBe('left_leg');
    });
  });

  describe('determinePhysicalHitLocation', () => {
    it('should use punch table for punch hit', () => {
      const roller = makeDiceSequence([3]); // CT
      expect(determinePhysicalHitLocation('punch', roller)).toBe(
        'center_torso',
      );
    });

    it('should use kick table for kick hit', () => {
      const roller = makeDiceSequence([1]); // right_leg
      expect(determinePhysicalHitLocation('kick', roller)).toBe('right_leg');
    });

    it('should clamp roll to 1-6', () => {
      const roller = makeDiceSequence([0]); // should clamp to 1
      expect(determinePhysicalHitLocation('punch', roller)).toBe('left_arm');
    });
  });

  // =============================================================================
  // Full Resolution Tests
  // =============================================================================

  describe('resolvePhysicalAttack', () => {
    it('should resolve a hitting punch', () => {
      // dice: 4+3=7 (to-hit), 3 (location = CT)
      const roller = makeDiceSequence([4, 3, 3]);
      const result = resolvePhysicalAttack(
        makeInput({ pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.roll).toBe(7);
      expect(result.targetDamage).toBe(8);
      expect(result.hitLocation).toBe('center_torso');
    });

    it('resolves gun-emplacement automatic success without rolling to-hit dice', () => {
      const roller = makeDiceSequence([6]);
      const result = resolvePhysicalAttack(
        makeInput({
          pilotingSkill: 5,
          targetObjectType: 'gunEmplacement',
          targetDistance: 1,
        }),
        roller,
      );

      expect(result).toMatchObject({
        hit: true,
        roll: 0,
        toHitNumber: 0,
        targetDamage: 8,
        hitLocation: 'head',
        automaticHit: true,
        automaticHitReason: 'Targeting adjacent gun emplacement.',
      });
    });

    it('should resolve a missing punch', () => {
      // dice: 1+2=3 (to-hit, miss)
      const roller = makeDiceSequence([1, 2]);
      const result = resolvePhysicalAttack(
        makeInput({ pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.targetDamage).toBe(0);
      expect(result.hitLocation).toBeUndefined();
      expect(result.attackerPSR).toBe(false);
    });

    it('should trigger attacker PSR on kick miss', () => {
      // dice: 1+1=2 (miss vs TN 3)
      const roller = makeDiceSequence([1, 1]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'kick', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('should trigger attacker PSR +4 on DFA miss', () => {
      // dice: 1+1=2 (miss)
      const roller = makeDiceSequence([1, 1]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'dfa', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
    });

    it('should not be allowed with shoulder destroyed', () => {
      const roller = makeDiceSequence([6, 6]);
      const result = resolvePhysicalAttack(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.toHitNumber).toBe(Infinity);
    });

    it('should resolve kick with target PSR on hit', () => {
      // dice: 6+6=12 (hit), 4 (location = left_leg)
      const roller = makeDiceSequence([6, 6, 4]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'kick',
          attackerTonnage: 80,
          pilotingSkill: 5,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(16);
      expect(result.targetPSR).toBe(true);
      expect(result.hitLocation).toBe('left_leg');
    });

    it('should resolve push with displacement and no damage', () => {
      // dice: 5+4=9 (hit vs TN 4)
      const roller = makeDiceSequence([5, 4]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'push', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(0);
      expect(result.targetDisplaced).toBe(true);
      expect(result.targetPSR).toBe(true);
    });

    it('resolves optional TacOps trip as zero damage with a target PSR', () => {
      const roller = makeDiceSequence([5, 4]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'trip',
          pilotingSkill: 5,
          optionalRules: ['tacops_trip_attack'],
          targetDistance: 1,
          targetInFrontArc: true,
          elevationDifference: 0,
        }),
        roller,
      );

      expect(result.hit).toBe(true);
      expect(result.toHitNumber).toBe(4);
      expect(result.targetDamage).toBe(0);
      expect(result.hitLocation).toBeUndefined();
      expect(result.targetDisplaced).toBe(false);
      expect(result.targetPSR).toBe(true);
    });

    it('resolves source-backed thrash as automatic infantry damage with attacker PSR', () => {
      const roller = makeDiceSequence([3]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'thrash',
          attackerTonnage: 80,
          attackerProne: true,
          attackerUnitType: 'BattleMech',
          targetUnitType: 'Infantry',
          targetDistance: 0,
          elevationDifference: 0,
          thrashBlockingTerrains: [],
        }),
        roller,
      );

      expect(result.hit).toBe(true);
      expect(result.toHitNumber).toBe(0);
      expect(result.roll).toBe(0);
      expect(result.automaticHit).toBe(true);
      expect(result.automaticHitReason).toBe('Thrash attacks always hit.');
      expect(result.targetDamage).toBe(27);
      expect(result.hitLocation).toBe('center_torso');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
      expect(result.targetPSR).toBe(false);
    });

    it('should resolve charge with damage to both', () => {
      // dice: 4+4=8 (hit), 2 (location = LT)
      const roller = makeDiceSequence([4, 4, 2]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'charge',
          attackerTonnage: 60,
          pilotingSkill: 5,
          hexesMoved: 5,
          targetTonnage: 75,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(24);
      expect(result.attackerDamage).toBe(8);
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(2);
    });

    it('should resolve DFA with leg damage to attacker', () => {
      // dice: 5+5=10 (hit), 6 (location = head)
      const roller = makeDiceSequence([5, 5, 6]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'dfa',
          attackerTonnage: 70,
          pilotingSkill: 5,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(21);
      expect(result.attackerLegDamagePerLeg).toBe(7);
      expect(result.hitLocation).toBe('head');
    });
  });

  // =============================================================================
  // AI Decision Logic Tests
  // =============================================================================

  describe('chooseBestPhysicalAttack', () => {
    it('should prefer kick over punch (higher damage)', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE);
      expect(result).toBe('kick'); // 16 vs 8
    });

    it('should return null if all attacks restricted', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: {
          [ActuatorType.SHOULDER]: true,
          [ActuatorType.HIP]: true,
        },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        attackerProne: true,
      });
      expect(result).toBeNull();
    });

    it('should prefer DFA when jumping', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        isJumping: true,
      });
      // DFA = ceil(80/10)×3 = 24 > kick = 16
      expect(result).toBe('dfa');
    });

    it('should prefer charge with many hexes moved', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        canReachForCharge: true,
        hexesMoved: 6,
      });
      // Charge = ceil(80/10)×(6-1) = 8×5 = 40 > kick = 16
      expect(result).toBe('charge');
    });

    it('should consider melee weapon', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        hasMeleeWeapon: 'mace',
      });
      // Mace for 80t = ceil(80/4) = 20 > kick = 16
      expect(result).toBe('mace');
    });

    it('should fall back to punch if kick unavailable', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        attackerProne: true,
      });
      // Prone prevents kick, hip destroyed prevents kick
      // Only punch available
      expect(result).toBe('punch');
    });

    it('considers matching claw punch damage when choosing the best attack', () => {
      const compDamage = {
        ...DEFAULT_COMPONENT_DAMAGE,
        actuators: { [ActuatorType.HIP]: true },
      };
      const result = chooseBestPhysicalAttack(80, 5, compDamage, {
        leftArmHasClaw: true,
        rightArmHasClaw: false,
      });

      expect(result).toBe('punch');
    });

    it('should return null when the attacker is evading', () => {
      const result = chooseBestPhysicalAttack(80, 5, DEFAULT_COMPONENT_DAMAGE, {
        attackerEvading: true,
        canReachForCharge: true,
        hexesMoved: 6,
        isJumping: true,
        hasMeleeWeapon: 'mace',
      });
      expect(result).toBeNull();
    });
  });

  // =============================================================================
  // Constants Tests
  // =============================================================================

  describe('TSM_ACTIVATION_HEAT', () => {
    it('should be 9', () => {
      expect(TSM_ACTIVATION_HEAT).toBe(9);
    });
  });

  // =============================================================================
  // Phase Activation Tests (gameSession integration)
  // =============================================================================

  describe('phase sequence (via gameSession)', () => {
    // Import inline to avoid circular deps
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getNextPhase } = require('../gameSession');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GamePhase: GP } = require('@/types/gameplay');

    it('should have PhysicalAttack between WeaponAttack and Heat', () => {
      expect(getNextPhase(GP.WeaponAttack)).toBe(GP.PhysicalAttack);
      expect(getNextPhase(GP.PhysicalAttack)).toBe(GP.Heat);
    });

    it('should have correct full phase order', () => {
      expect(getNextPhase(GP.Initiative)).toBe(GP.Movement);
      expect(getNextPhase(GP.Movement)).toBe(GP.WeaponAttack);
      expect(getNextPhase(GP.WeaponAttack)).toBe(GP.PhysicalAttack);
      expect(getNextPhase(GP.PhysicalAttack)).toBe(GP.Heat);
      expect(getNextPhase(GP.Heat)).toBe(GP.End);
      expect(getNextPhase(GP.End)).toBe(GP.Initiative);
    });
  });

  // =============================================================================
  // Event Reducer Tests (gameState integration)
  // =============================================================================

  describe('event reducers (via gameState)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { applyEvent, createInitialGameState } = require('../gameState');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      GameEventType: GE,
      GamePhase: GP,
      LockState: LS,
    } = require('@/types/gameplay');

    function makeState() {
      const state = createInitialGameState('test-game');
      return {
        ...state,
        units: {
          'unit-1': {
            id: 'unit-1',
            side: 'player',
            position: { q: 0, r: 0 },
            facing: 'N',
            heat: 0,
            movementThisTurn: 'stationary',
            hexesMovedThisTurn: 0,
            armor: {},
            structure: {},
            destroyedLocations: [],
            destroyedEquipment: [],
            ammo: {},
            pilotWounds: 0,
            pilotConscious: true,
            destroyed: false,
            lockState: LS.Pending,
            damageThisPhase: 0,
          },
          'unit-2': {
            id: 'unit-2',
            side: 'opponent',
            position: { q: 1, r: 0 },
            facing: 'S',
            heat: 0,
            movementThisTurn: 'stationary',
            hexesMovedThisTurn: 0,
            armor: {},
            structure: {},
            destroyedLocations: [],
            destroyedEquipment: [],
            ammo: {},
            pilotWounds: 0,
            pilotConscious: true,
            destroyed: false,
            lockState: LS.Pending,
            damageThisPhase: 0,
          },
        },
      };
    }

    it('PhysicalAttackDeclared should set attacker to Planning', () => {
      const state = makeState();
      const event = {
        id: 'evt-1',
        gameId: 'test-game',
        sequence: 1,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackDeclared,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          toHitNumber: 5,
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-1'].lockState).toBe(LS.Planning);
    });

    it('PhysicalAttackResolved (hit) should accumulate damageThisPhase on target', () => {
      const state = makeState();
      const event = {
        id: 'evt-2',
        gameId: 'test-game',
        sequence: 2,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          roll: 8,
          toHitNumber: 5,
          hit: true,
          damage: 8,
          location: 'center_torso',
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].damageThisPhase).toBe(8);
    });

    it('PhysicalAttackResolved should replay physical displacement payloads', () => {
      const state = makeState();
      const event = {
        id: 'evt-2b',
        gameId: 'test-game',
        sequence: 3,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'push',
          roll: 8,
          toHitNumber: 4,
          hit: true,
          damage: 0,
          displacements: [
            {
              unitId: 'unit-2',
              from: { q: 1, r: 0 },
              to: { q: 1, r: 1 },
              reason: 'push',
            },
            {
              unitId: 'unit-1',
              from: { q: 0, r: 0 },
              to: { q: 1, r: 0 },
              reason: 'push',
            },
          ],
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].position).toEqual({ q: 1, r: 1 });
      expect(newState.units['unit-1'].position).toEqual({ q: 1, r: 0 });
    });

    it('PhysicalAttackResolved (miss) should not change state', () => {
      const state = makeState();
      const event = {
        id: 'evt-3',
        gameId: 'test-game',
        sequence: 3,
        timestamp: new Date().toISOString(),
        type: GE.PhysicalAttackResolved,
        turn: 1,
        phase: GP.PhysicalAttack,
        actorId: 'unit-1',
        payload: {
          attackerId: 'unit-1',
          targetId: 'unit-2',
          attackType: 'punch',
          roll: 3,
          toHitNumber: 5,
          hit: false,
        },
      };
      const newState = applyEvent(state, event);
      expect(newState.units['unit-2'].damageThisPhase).toBe(0);
    });
  });
});
