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
    it('disallows charge and DFA against targets in displacement conflicts', () => {
      expect(
        canCharge(
          makeInput({
            attackerId: 'attacker',
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetIsMakingDisplacementAttack: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDisplacementAttack',
      });
      expect(
        canDFA(
          makeInput({
            attackerId: 'attacker',
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetIsMakingDisplacementAttack: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDisplacementAttack',
      });
      expect(
        canCharge(
          makeInput({
            attackerId: 'attacker',
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetOfDisplacementAttack',
      });
      expect(
        canDFA(
          makeInput({
            attackerId: 'attacker',
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            targetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetOfDisplacementAttack',
      });
      expect(
        canCharge(
          makeInput({
            attackerId: 'attacker',
            attackType: 'charge',
            attackerRanThisTurn: true,
            targetedByDisplacementAttackerId: 'attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows prone charge attackers after the run gate passes', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerProne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerProne',
      });
    });

    it('disallows stuck charge attackers before movement-path gates', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerMovedBackwardThisTurn: true,
            attackerProne: true,
            attackerStuck: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerStuck',
      });
    });

    it('disallows jumping charge movement before run/backward/prone gates', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerJumpedThisTurn: true,
            attackerRanThisTurn: false,
            attackerMovedBackwardThisTurn: true,
            attackerProne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ChargeJumpMovement',
      });
    });

    it('disallows backward charge movement before prone-state validation', () => {
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            attackerMovedBackwardThisTurn: true,
            attackerProne: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'ChargeBackwardMovement',
      });
    });

    it('disallows push displacement conflicts except legal counter-pushes', () => {
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            targetIsMakingDisplacementAttack: true,
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetMakingDisplacementAttack',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            targetIsMakingDisplacementAttack: true,
            targetIsPushing: true,
            targetDisplacementAttackTargetId: 'other-target',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetPushingAnotherMek',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            attackerTargetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'AttackerTargetOfDisplacementAttack',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            targetedByDisplacementAttackerId: 'other-attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetOfDisplacementAttack',
      });
      expect(
        canPush(
          makeInput({
            attackerId: 'attacker',
            targetId: 'target',
            attackType: 'push',
            attackerTargetedByDisplacementAttackerId: 'target',
            targetIsMakingDisplacementAttack: true,
            targetIsPushing: true,
            targetDisplacementAttackTargetId: 'attacker',
            targetedByDisplacementAttackerId: 'attacker',
            targetDistance: 1,
          }),
        ),
      ).toMatchObject({
        allowed: true,
      });
    });

    it('disallows targets inside another building across supported physical attack families', () => {
      const buildingTarget = {
        targetOccupiedBuildingId: 'building-east',
        targetDistance: 1,
      } satisfies Partial<IPhysicalAttackInput>;

      expect(
        canPunch(
          makeInput({
            attackType: 'punch',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canKick(
          makeInput({
            attackType: 'kick',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canPush(
          makeInput({
            attackType: 'push',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canCharge(
          makeInput({
            attackType: 'charge',
            attackerRanThisTurn: true,
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canDFA(
          makeInput({
            attackType: 'dfa',
            attackerJumpedThisTurn: true,
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
      expect(
        canMeleeWeapon(
          makeInput({
            attackType: 'sword',
            ...buildingTarget,
          }),
        ),
      ).toMatchObject({
        allowed: false,
        reasonCode: 'TargetInsideBuilding',
      });
    });
  });
});
