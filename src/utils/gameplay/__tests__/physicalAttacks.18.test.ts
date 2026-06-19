import {
  ActuatorType,
  GameSide,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  makePhysicalProjectionUnit,
  canPunch,
  canKick,
  canCharge,
  canDFA,
  canMeleeWeapon,
  canPush,
  getEligiblePhysicalAttacks,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('source-backed physical legality gates', () => {
    it('projects per-arm carried-cargo restrictions in eligible physical options', () => {
      const attacker = makePhysicalProjectionUnit(
        'attacker',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          rightArmCarryingCargo: true,
        },
      );
      const target = makePhysicalProjectionUnit(
        'target',
        GameSide.Opponent,
        { q: 1, r: 0 },
        {
          iNarcPods: [
            {
              teamId: 'opponent',
              podType: 'homing',
            },
          ],
        },
      );

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        targetIsINarcPod: true,
      });

      expect(
        options.find(
          (option) =>
            option.attackType === 'punch' && option.limb === 'rightArm',
        )?.restrictionsFailed,
      ).toContain('AttackerCargoInteraction');
      expect(
        options.find(
          (option) =>
            option.attackType === 'punch' && option.limb === 'leftArm',
        )?.restrictionsFailed,
      ).not.toContain('AttackerCargoInteraction');
      expect(
        options.find((option) => option.attackType === 'brush-off')
          ?.restrictionsFailed,
      ).toContain('AttackerCargoInteraction');
    });

    it('projects arm-mounted melee weapons as selected-arm option rows', () => {
      const attacker = makePhysicalProjectionUnit(
        'attacker',
        GameSide.Player,
        { q: 0, r: 0 },
        {
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuatorsByLocation: {
              right_arm: { [ActuatorType.LOWER_ARM]: true },
            },
          },
        },
      );
      const target = makePhysicalProjectionUnit('target', GameSide.Opponent, {
        q: 1,
        r: 0,
      });

      const options = getEligiblePhysicalAttacks(attacker, target, {
        attackerTonnage: 80,
        attackerPilotingSkill: 5,
        meleeWeaponsEquipped: ['sword', 'wrecking-ball'],
      });

      expect(
        options.find(
          (option) =>
            option.attackType === 'sword' && option.limb === 'leftArm',
        )?.restrictionsFailed,
      ).toEqual([]);
      expect(
        options.find(
          (option) =>
            option.attackType === 'sword' && option.limb === 'rightArm',
        )?.restrictionsFailed,
      ).toContain('MissingActuator');
      expect(
        options.find((option) => option.attackType === 'wrecking-ball')?.limb,
      ).toBeUndefined();
    });

    it('disallows different-board targets across supported physical attack families', () => {
      const boardMismatch = {
        attackerBoardId: 'board-alpha',
        targetBoardId: 'board-beta',
        targetDistance: 1,
      };

      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            ...boardMismatch,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'DifferentBoard',
      });
    });

    it('allows same-board physical targets when board identity is explicit', () => {
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            attackerBoardId: 'board-alpha',
            targetBoardId: 'board-alpha',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows self-targeted physical attacks before adjacency checks', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'SelfTarget',
      });

      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsSelf: true,
            targetDistance: 0,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'SelfTarget',
      });
    });

    it('disallows friendly physical targets across supported physical attack families', () => {
      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            targetIsFriendly: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'FriendlyTarget',
      });
    });
  });
});
