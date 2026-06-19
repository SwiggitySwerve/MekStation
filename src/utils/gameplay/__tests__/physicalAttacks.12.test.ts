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
  });
});
