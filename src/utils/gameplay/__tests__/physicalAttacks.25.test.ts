import {
  ActuatorType,
  DEFAULT_COMPONENT_DAMAGE,
  makeInput,
  makeDiceSequence,
  resolvePhysicalAttack,
} from './physicalAttacks.test-helpers';

describe('physicalAttacks', () => {
  describe('resolvePhysicalAttack', () => {
    it('should resolve a hitting punch', () => {
      // dice: 4+3=7 (to-hit), 3 (location = CT)
      const roller = makeDiceSequence([4, 3, 3]);
      const result = resolvePhysicalAttack(
        makeInput({ pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.roll).toBe(7);
      expect(result.targetDamage).toBe(8);
      expect(result.hitLocation).toBe('center_torso');
    });

    it('resolves gun-emplacement automatic success without rolling to-hit dice', () => {
      const roller = makeDiceSequence([6]);
      const result = resolvePhysicalAttack(
        makeInput({
          pilotingSkill: 5,
          targetObjectType: 'gunEmplacement',
          targetDistance: 1,
        }),
        roller,
      );

      expect(result).toMatchObject({
        hit: true,
        roll: 0,
        toHitNumber: 0,
        targetDamage: 8,
        hitLocation: 'head',
        automaticHit: true,
        automaticHitReason: 'Targeting adjacent gun emplacement.',
      });
    });

    it('should resolve a missing punch', () => {
      // dice: 1+2=3 (to-hit, miss)
      const roller = makeDiceSequence([1, 2]);
      const result = resolvePhysicalAttack(
        makeInput({ pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.targetDamage).toBe(0);
      expect(result.hitLocation).toBeUndefined();
      expect(result.attackerPSR).toBe(false);
    });

    it('resolves explicit Zweihander punch damage and miss self-risk', () => {
      const hit = resolvePhysicalAttack(
        makeInput({
          attackerTonnage: 80,
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
        }),
        makeDiceSequence([4, 3, 3]),
      );
      expect(hit).toMatchObject({
        hit: true,
        targetDamage: 16,
        attackerPSR: false,
      });

      const miss = resolvePhysicalAttack(
        makeInput({
          pilotingSkill: 5,
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
        }),
        makeDiceSequence([1, 2]),
      );
      expect(miss).toMatchObject({
        hit: false,
        targetDamage: 0,
        attackerPSR: true,
        attackerPSRModifier: 0,
      });
    });

    it('rejects invalid explicit Zweihander punch declarations before damage or miss self-risk', () => {
      const result = resolvePhysicalAttack(
        makeInput({
          attackerTonnage: 80,
          pilotAbilities: ['zweihander'],
          twoHandedZweihander: true,
          attackerProne: true,
        }),
        makeDiceSequence([6, 6, 6]),
      );

      expect(result).toMatchObject({
        hit: false,
        toHitNumber: Infinity,
        targetDamage: 0,
        attackerPSR: false,
      });
      expect(result.roll).toBe(0);
      expect(result.hitLocation).toBeUndefined();
    });

    it('should trigger attacker PSR on kick miss', () => {
      // dice: 1+1=2 (miss vs TN 3)
      const roller = makeDiceSequence([1, 1]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'kick', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
    });

    it('should trigger attacker PSR +4 on DFA miss', () => {
      // dice: 1+1=2 (miss)
      const roller = makeDiceSequence([1, 1]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'dfa', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(4);
    });

    it('should not be allowed with shoulder destroyed', () => {
      const roller = makeDiceSequence([6, 6]);
      const result = resolvePhysicalAttack(
        makeInput({
          componentDamage: {
            ...DEFAULT_COMPONENT_DAMAGE,
            actuators: { [ActuatorType.SHOULDER]: true },
          },
        }),
        roller,
      );
      expect(result.hit).toBe(false);
      expect(result.toHitNumber).toBe(Infinity);
    });

    it('should resolve kick with target PSR on hit', () => {
      // dice: 6+6=12 (hit), 4 (location = left_leg)
      const roller = makeDiceSequence([6, 6, 4]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'kick',
          attackerTonnage: 80,
          pilotingSkill: 5,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(16);
      expect(result.targetPSR).toBe(true);
      expect(result.hitLocation).toBe('left_leg');
    });

    it('should resolve push with displacement and no damage', () => {
      // dice: 5+4=9 (hit vs TN 4)
      const roller = makeDiceSequence([5, 4]);
      const result = resolvePhysicalAttack(
        makeInput({ attackType: 'push', pilotingSkill: 5 }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(0);
      expect(result.targetDisplaced).toBe(true);
      expect(result.targetPSR).toBe(true);
    });

    it('resolves optional TacOps trip as zero damage with a target PSR', () => {
      const roller = makeDiceSequence([5, 4]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'trip',
          pilotingSkill: 5,
          optionalRules: ['tacops_trip_attack'],
          targetDistance: 1,
          targetInFrontArc: true,
          elevationDifference: 0,
        }),
        roller,
      );

      expect(result.hit).toBe(true);
      expect(result.toHitNumber).toBe(4);
      expect(result.targetDamage).toBe(0);
      expect(result.hitLocation).toBeUndefined();
      expect(result.targetDisplaced).toBe(false);
      expect(result.targetPSR).toBe(true);
    });

    it('resolves source-backed thrash as automatic infantry damage with attacker PSR', () => {
      const roller = makeDiceSequence([3]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'thrash',
          attackerTonnage: 80,
          attackerProne: true,
          attackerUnitType: 'BattleMech',
          targetUnitType: 'Infantry',
          targetDistance: 0,
          elevationDifference: 0,
          thrashBlockingTerrains: [],
        }),
        roller,
      );

      expect(result.hit).toBe(true);
      expect(result.toHitNumber).toBe(0);
      expect(result.roll).toBe(0);
      expect(result.automaticHit).toBe(true);
      expect(result.automaticHitReason).toBe('Thrash attacks always hit.');
      expect(result.targetDamage).toBe(27);
      expect(result.hitLocation).toBe('center_torso');
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(0);
      expect(result.targetPSR).toBe(false);
    });

    it('should resolve charge with damage to both', () => {
      // dice: 4+4=8 (hit), 2 (location = LT)
      const roller = makeDiceSequence([4, 4, 2]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'charge',
          attackerTonnage: 60,
          pilotingSkill: 5,
          hexesMoved: 5,
          targetTonnage: 75,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(24);
      expect(result.attackerDamage).toBe(8);
      expect(result.targetPSR).toBe(true);
      expect(result.attackerPSR).toBe(true);
      expect(result.attackerPSRModifier).toBe(2);
    });

    it('should resolve DFA with leg damage to attacker', () => {
      // dice: 5+5=10 (hit), 6 (location = head)
      const roller = makeDiceSequence([5, 5, 6]);
      const result = resolvePhysicalAttack(
        makeInput({
          attackType: 'dfa',
          attackerTonnage: 70,
          pilotingSkill: 5,
        }),
        roller,
      );
      expect(result.hit).toBe(true);
      expect(result.targetDamage).toBe(21);
      expect(result.attackerLegDamagePerLeg).toBe(7);
      expect(result.hitLocation).toBe('head');
    });
  });
});
