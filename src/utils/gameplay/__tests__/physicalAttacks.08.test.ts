import {
  ActuatorType,
  UnitType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  makeDiceSequence,
  makeBreakGrappleGrid,
  calculateBreakGrappleToHit,
  canBreakGrapplePhysical,
  computeBreakGrappleDisplacementOutcome,
  resolvePhysicalAttack,
  canBreakGrapple,
  getBreakGrappleAttackToHitModifiers,
  getBreakGrappleWeightClassModifier,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
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

  describe('runtime break-grapple attack', () => {
    const validBreakGrappleInput = () =>
      makeInput({
        attackerId: 'attacker',
        targetId: 'target',
        attackType: 'break-grapple',
        optionalRules: ['tacops_grappling'],
        commonPhysicalImpossibleReasonCode: 'LockedInGrapple',
        attackerGrappledTargetId: 'target',
        targetGrappledTargetId: 'attacker',
        attackerUnitType: UnitType.BATTLEMECH,
        targetUnitType: UnitType.BATTLEMECH,
        targetDistance: 0,
      });

    it('allows source-backed break-grapple through runtime physical restrictions', () => {
      expect(canBreakGrapplePhysical(validBreakGrappleInput())).toEqual({
        allowed: true,
      });
    });

    it('rejects chain-whip and non-matching grapple state before runtime side effects', () => {
      expect(
        canBreakGrapplePhysical({
          ...validBreakGrappleInput(),
          attackerChainWhipGrappled: true,
        }),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ChainWhipGrappled',
      });

      expect(
        canBreakGrapplePhysical({
          ...validBreakGrappleInput(),
          attackerGrappledTargetId: 'other-target',
        }),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'NotGrappledToTarget',
      });
    });

    it('resolves original-attacker break-grapple as automatic zero-damage success', () => {
      const result = resolvePhysicalAttack(
        {
          ...validBreakGrappleInput(),
          attackerIsGrappleAttacker: true,
        },
        makeDiceSequence([1, 1]),
      );

      expect(result).toMatchObject({
        attackType: 'break-grapple',
        roll: 0,
        toHitNumber: 0,
        hit: true,
        targetDamage: 0,
        attackerDamage: 0,
        automaticHit: true,
        automaticHitReason: 'original attacker',
      });
      expect(result.hitLocation).toBeUndefined();
    });

    it('threads source-backed break-grapple actuator, AES, and weight modifiers into runtime to-hit', () => {
      const toHit = calculateBreakGrappleToHit({
        ...validBreakGrappleInput(),
        attackerIsGrappleAttacker: false,
        componentDamage: {
          ...DEFAULT_COMPONENT_DAMAGE,
          actuators: { [ActuatorType.SHOULDER]: true },
        },
        leftArmAesFunctional: true,
        rightArmAesFunctional: true,
        attackerWeightClass: 4,
        targetWeightClass: 5,
      });

      expect(toHit.allowed).toBe(true);
      expect(toHit.modifiers).toEqual([
        expect.objectContaining({
          name: 'Left shoulder actuator destroyed',
          value: 2,
          source: 'actuator',
        }),
        expect.objectContaining({
          name: 'Right shoulder actuator destroyed',
          value: 2,
          source: 'actuator',
        }),
        expect.objectContaining({
          name: 'AES modifier',
          value: -1,
          source: 'actuator',
        }),
        expect.objectContaining({
          name: 'Weight class difference',
          value: 1,
          source: 'weight-class',
        }),
      ]);
      expect(toHit.finalToHit).toBe(9);
    });

    it('chooses source-backed least- and most-dangerous adjacent displacement hexes', () => {
      expect(
        computeBreakGrappleDisplacementOutcome({
          grid: makeBreakGrappleGrid(),
          attackerId: 'attacker',
          targetId: 'target',
          attackerPosition: { q: 0, r: 0 },
          targetPosition: { q: 0, r: 0 },
          attackerIsGrappleAttacker: true,
        }).displacements,
      ).toEqual([
        {
          unitId: 'attacker',
          from: { q: 0, r: 0 },
          to: { q: 0, r: -1 },
          reason: 'break-grapple',
        },
      ]);

      expect(
        computeBreakGrappleDisplacementOutcome({
          grid: makeBreakGrappleGrid(),
          attackerId: 'attacker',
          targetId: 'target',
          attackerPosition: { q: 0, r: 0 },
          targetPosition: { q: 0, r: 0 },
          attackerIsGrappleAttacker: false,
        }).displacements,
      ).toEqual([
        {
          unitId: 'target',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          reason: 'break-grapple',
        },
      ]);
    });
  });
});
