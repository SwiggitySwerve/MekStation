import {
  makeInput,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
  type IPhysicalAttackInput,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('source-backed physical legality gates', () => {
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
  });
});
