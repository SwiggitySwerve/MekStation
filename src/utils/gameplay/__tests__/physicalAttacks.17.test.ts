import {
  makeInput,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
  canBrushOffPhysical,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('source-backed physical legality gates', () => {
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

    it('disallows selected-arm physical attacks when that arm carries cargo', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            arm: 'right',
            rightArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            arm: 'left',
            rightArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({ allowed: true });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            rightArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
      expect(
        canBrushOffPhysical(
          makeInput({
            attackType: 'brush-off',
            limb: 'rightArm',
            targetIsINarcPod: true,
            rightArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
    });

    it('preserves push when one cargo arm is free and blocks it when both arms carry cargo', () => {
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            leftArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({ allowed: true });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            leftArmCarryingCargo: true,
            rightArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
    });

    it('blocks two-handed Zweihander declarations when either arm carries cargo', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            arm: 'right',
            twoHandedZweihander: true,
            pilotAbilities: ['zweihander'],
            leftArmCarryingCargo: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerCargoInteraction',
      });
    });
  });
});
