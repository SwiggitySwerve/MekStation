import {
  makeInput,
  calculatePhysicalToHit,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('source-backed physical legality gates', () => {
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
  });
});
