import {
  makeInput,
  calculateThrashDamage,
  calculateTripToHit,
  calculateThrashToHit,
  canTripPhysical,
  canThrashPhysical,
  canThrash,
  canTrip,
  isThrashAttackAutomaticSuccess,
  getThrashAttackDamageForWeight,
  getTripAttackBaseToHitAdjustment,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
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
});
