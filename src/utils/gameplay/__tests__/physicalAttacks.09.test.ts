import {
  canGrapple,
  getGrappleAttackToHitModifiers,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
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
});
