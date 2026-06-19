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
  });
});
