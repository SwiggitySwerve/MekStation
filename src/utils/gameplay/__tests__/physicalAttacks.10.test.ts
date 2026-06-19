import {
  ActuatorType,
  UnitType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  makeDiceSequence,
  calculateGrappleToHit,
  calculatePhysicalToHit,
  calculatePhysicalDamage,
  canGrapplePhysical,
  canJumpJetAttackPhysical,
  resolvePhysicalAttack,
  TSM_ACTIVATION_HEAT,
  canJumpJetAttack,
  getJumpJetAttackDamage,
  getJumpJetAttackToHitModifiers,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('runtime grapple attack', () => {
    const validGrappleInput = () =>
      makeInput({
        attackerId: 'attacker',
        targetId: 'target',
        attackType: 'grapple',
        optionalRules: ['tacops_grappling'],
        targetDistance: 1,
        targetInFrontArc: true,
      });

    it('allows source-backed normal TacOps grapple through physical restrictions', () => {
      expect(canGrapplePhysical(validGrappleInput())).toEqual({
        allowed: true,
      });
    });

    it('rejects runtime grapple declarations when TacOps grappling is disabled', () => {
      expect(
        canGrapplePhysical({
          ...validGrappleInput(),
          optionalRules: [],
        }),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TacOpsGrapplingDisabled',
      });
    });

    it('threads source-backed grapple modifiers into runtime to-hit', () => {
      const toHit = calculateGrappleToHit({
        ...validGrappleInput(),
        attackerUnitType: UnitType.BATTLEMECH,
        grappleSide: 'right',
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          actuators: { [ActuatorType.UPPER_ARM]: true },
        },
        rightArmAesFunctional: true,
        hasTSM: true,
        heat: TSM_ACTIVATION_HEAT,
        attackerWeightClass: 4,
        targetWeightClass: 5,
      });

      expect(toHit.allowed).toBe(true);
      expect(toHit.modifiers).toEqual([
        expect.objectContaining({
          name: 'Right upper arm actuator destroyed',
          value: 2,
          source: 'actuator',
        }),
        expect.objectContaining({
          name: 'AES modifier',
          value: -1,
          source: 'actuator',
        }),
        expect.objectContaining({
          name: 'TSM Active Bonus',
          value: -2,
          source: 'myomer',
        }),
        expect.objectContaining({
          name: 'Weight class difference',
          value: 1,
          source: 'weight-class',
        }),
      ]);
      expect(toHit.finalToHit).toBe(5);
    });

    it('resolves a successful grapple as zero-damage grapple state setup', () => {
      const result = resolvePhysicalAttack(
        validGrappleInput(),
        makeDiceSequence([6, 6]),
      );

      expect(result).toMatchObject({
        attackType: 'grapple',
        hit: true,
        targetDamage: 0,
        attackerDamage: 0,
        targetPSR: false,
        attackerPSR: false,
        targetDisplaced: false,
      });
      expect(result.hitLocation).toBeUndefined();
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

    it('wires jump jet attack through runtime restrictions, to-hit, damage, and resolution', () => {
      const input = makeInput({
        attackType: 'jump-jet-attack',
        optionalRules: ['tacops_jump_jet_attack'],
        limb: 'rightLeg',
        rightReadyJumpJetCount: 2,
        targetDistance: 1,
        standingAttackerHeightAboveTargetHeight: 1,
        targetDirectlyAheadOfFeet: true,
      });

      expect(canJumpJetAttackPhysical(input)).toEqual({ allowed: true });
      expect(calculatePhysicalToHit(input)).toMatchObject({
        allowed: true,
        baseToHit: 5,
        finalToHit: 7,
        modifiers: [expect.objectContaining({ name: 'Jump Jet', value: 2 })],
      });
      expect(calculatePhysicalDamage(input)).toMatchObject({
        targetDamage: 6,
        attackerDamage: 0,
        attackerPSR: false,
        targetPSR: false,
      });
      expect(
        resolvePhysicalAttack(input, makeDiceSequence([4, 4, 3])),
      ).toMatchObject({
        attackType: 'jump-jet-attack',
        hit: true,
        targetDamage: 6,
        attackerDamage: 0,
      });
    });

    it('rejects runtime jump jet attacks without the TacOps option before side effects', () => {
      expect(
        resolvePhysicalAttack(
          makeInput({
            attackType: 'jump-jet-attack',
            limb: 'rightLeg',
            rightReadyJumpJetCount: 2,
            targetDistance: 1,
            standingAttackerHeightAboveTargetHeight: 1,
            targetDirectlyAheadOfFeet: true,
          }),
          makeDiceSequence([6, 6, 6]),
        ),
      ).toMatchObject({
        hit: false,
        targetDamage: 0,
        attackerDamage: 0,
        restrictionReasonCode: 'TacOpsJumpJetAttackDisabled',
      });
    });
  });
});
