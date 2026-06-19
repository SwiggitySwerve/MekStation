import {
  makeInput,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('source-backed physical legality gates', () => {
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
  });
});
