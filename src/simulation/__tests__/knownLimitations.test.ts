import {
  isKnownLimitation,
  getLimitationCategory,
  getLimitationExplanation,
  filterKnownLimitations,
  partitionViolations,
  type IViolation,
} from '../core/knownLimitations';

describe('knownLimitations', () => {
  describe('isKnownLimitation', () => {
    describe('physical attacks', () => {
      it('should identify physical attack violations', () => {
        const violation: IViolation = {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify melee combat violations', () => {
        const violation: IViolation = {
          invariant: 'checkMeleeCombat',
          severity: 'warning',
          message: 'Melee combat phase has no actions',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify punch/kick violations', () => {
        const violation: IViolation = {
          invariant: 'checkCombatActions',
          severity: 'warning',
          message: 'Unit should have punch option available',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify death-from-above violations', () => {
        const violation: IViolation = {
          invariant: 'checkJumpAttack',
          severity: 'warning',
          message: 'Death from above attack not implemented',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('ammo consumption', () => {
      it('should identify ammo tracking violations', () => {
        const violation: IViolation = {
          invariant: 'checkAmmoConsumption',
          severity: 'error',
          message: 'Unit fired weapon with 0 ammo remaining',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify ammo depletion violations', () => {
        const violation: IViolation = {
          invariant: 'checkWeaponFiring',
          severity: 'warning',
          message: 'Ammo not decremented after firing',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify reload violations', () => {
        const violation: IViolation = {
          invariant: 'checkReloadAction',
          severity: 'warning',
          message: 'Reload action not available',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('heat shutdown', () => {
      it('should identify shutdown threshold violations', () => {
        const violation: IViolation = {
          invariant: 'checkHeatEffects',
          severity: 'error',
          message: 'Unit should shut down at 30 heat',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify shutdown recovery violations', () => {
        const violation: IViolation = {
          invariant: 'checkShutdownRecovery',
          severity: 'warning',
          message: 'Shutdown recovery roll not performed',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify heat-induced ammo explosion violations', () => {
        const violation: IViolation = {
          invariant: 'checkHeatEffects',
          severity: 'error',
          message: 'Heat-induced ammo explosion not triggered at 24+ heat',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('terrain movement', () => {
      it('should identify terrain cost violations', () => {
        const violation: IViolation = {
          invariant: 'checkMovementCost',
          severity: 'warning',
          message: 'Terrain movement cost incorrect for water hexes',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify rubble cost violations', () => {
        const violation: IViolation = {
          invariant: 'checkTerrainModifiers',
          severity: 'info',
          message: 'Rubble cost should vary by level',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('piloting checks', () => {
      it('should identify fall check violations', () => {
        const violation: IViolation = {
          invariant: 'checkPilotingSkill',
          severity: 'error',
          message: 'Piloting check not performed after leg damage',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify consciousness check violations', () => {
        const violation: IViolation = {
          invariant: 'checkPilotStatus',
          severity: 'warning',
          message: 'Consciousness check not triggered',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify ejection violations', () => {
        const violation: IViolation = {
          invariant: 'checkPilotActions',
          severity: 'info',
          message: 'Ejection not available',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('critical effects', () => {
      it('should identify destroyed weapon violations', () => {
        const violation: IViolation = {
          invariant: 'checkWeaponStatus',
          severity: 'error',
          message: 'Destroyed weapon still fires',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify actuator damage violations', () => {
        const violation: IViolation = {
          invariant: 'checkCriticalEffects',
          severity: 'warning',
          message: 'Actuator damage not affecting movement',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify sensor critical violations', () => {
        const violation: IViolation = {
          invariant: 'checkTargeting',
          severity: 'warning',
          message: 'Sensor critical not affecting to-hit',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('line of sight', () => {
      it('should identify LOS blocking violations', () => {
        const violation: IViolation = {
          invariant: 'checkLineOfSight',
          severity: 'error',
          message: 'LOS blocked by intervening terrain',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify partial cover violations', () => {
        const violation: IViolation = {
          invariant: 'checkCoverModifiers',
          severity: 'warning',
          message: 'Partial cover not calculated',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('special abilities', () => {
      it('should identify SPA effect violations', () => {
        const violation: IViolation = {
          invariant: 'checkPilotAbilities',
          severity: 'warning',
          message: 'SPA effect not applied to to-hit roll',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify gunnery specialist violations', () => {
        const violation: IViolation = {
          invariant: 'checkToHitModifiers',
          severity: 'info',
          message: 'Gunnery Specialist bonus not applied',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('vehicle and aerospace', () => {
      it('should identify vehicle movement violations', () => {
        const violation: IViolation = {
          invariant: 'checkVehicleMovement',
          severity: 'error',
          message: 'Vehicle movement rules not applied',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify VTOL altitude violations', () => {
        const violation: IViolation = {
          invariant: 'checkVTOLPosition',
          severity: 'warning',
          message: 'VTOL altitude not tracked',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('campaign progression', () => {
      it('should identify XP award violations', () => {
        const violation: IViolation = {
          invariant: 'checkPostBattleRewards',
          severity: 'info',
          message: 'XP not awarded after battle',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });

      it('should identify skill progression violations', () => {
        const violation: IViolation = {
          invariant: 'checkPilotAdvancement',
          severity: 'info',
          message: 'Pilot skill not improving',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('MTF parsing', () => {
      it('should identify MTF import violations', () => {
        const violation: IViolation = {
          invariant: 'checkUnitImport',
          severity: 'error',
          message: 'MTF file parsing failed',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });

    describe('actual bugs (should NOT be excluded)', () => {
      it('should not exclude state corruption violations', () => {
        const violation: IViolation = {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Unit position is null but unit is active',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(false);
      });

      it('should not exclude logic error violations', () => {
        const violation: IViolation = {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Damage calculation resulted in negative armor',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(false);
      });

      it('should not exclude invalid state transitions', () => {
        const violation: IViolation = {
          invariant: 'checkPhaseTransition',
          severity: 'error',
          message: 'Invalid phase transition from Movement to End',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(false);
      });

      it('should not exclude range validation errors', () => {
        const violation: IViolation = {
          invariant: 'checkWeaponRange',
          severity: 'error',
          message: 'Weapon fired beyond maximum range',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle empty message', () => {
        const violation: IViolation = {
          invariant: 'checkSomething',
          severity: 'error',
          message: '',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(false);
      });

      it('should handle empty invariant', () => {
        const violation: IViolation = {
          invariant: '',
          severity: 'error',
          message: 'Some violation',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(false);
      });

      it('should be case-insensitive', () => {
        const violation: IViolation = {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'PHYSICAL ATTACK NOT AVAILABLE',
          context: {},
        };

        expect(isKnownLimitation(violation)).toBe(true);
      });
    });
  });

  describe('getLimitationCategory', () => {
    it('should return correct category for physical attacks', () => {
      const violation: IViolation = {
        invariant: 'checkPhysicalAttack',
        severity: 'warning',
        message: 'Physical attack not available',
        context: {},
      };

      expect(getLimitationCategory(violation)).toBe('physicalAttacks');
    });

    it('should return correct category for ammo consumption', () => {
      const violation: IViolation = {
        invariant: 'checkAmmo',
        severity: 'error',
        message: 'Ammo consumption not tracked',
        context: {},
      };

      expect(getLimitationCategory(violation)).toBe('ammoConsumption');
    });

    it('should return null for actual bugs', () => {
      const violation: IViolation = {
        invariant: 'checkStateConsistency',
        severity: 'error',
        message: 'Invalid state detected',
        context: {},
      };

      expect(getLimitationCategory(violation)).toBeNull();
    });
  });

  describe('getLimitationExplanation', () => {
    it('should return explanation for known limitation', () => {
      const violation: IViolation = {
        invariant: 'checkPhysicalAttack',
        severity: 'warning',
        message: 'Physical attack not available',
        context: {},
      };

      const explanation = getLimitationExplanation(violation);
      expect(explanation).toContain('Physical attacks');
      expect(explanation).toContain('known-limitations.md');
    });

    it('should return null for actual bugs', () => {
      const violation: IViolation = {
        invariant: 'checkStateConsistency',
        severity: 'error',
        message: 'Invalid state detected',
        context: {},
      };

      expect(getLimitationExplanation(violation)).toBeNull();
    });
  });

  describe('filterKnownLimitations', () => {
    it('should filter out known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].invariant).toBe('checkStateConsistency');
    });

    it('should return empty array when all are known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toHaveLength(0);
    });

    it('should return all violations when none are known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Negative armor value',
          context: {},
        },
      ];

      const filtered = filterKnownLimitations(violations);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('partitionViolations', () => {
    it('should partition violations correctly', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
        {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Negative armor value',
          context: {},
        },
      ];

      const { knownLimitations, potentialBugs } = partitionViolations(violations);

      expect(knownLimitations).toHaveLength(2);
      expect(potentialBugs).toHaveLength(2);

      expect(knownLimitations[0].invariant).toBe('checkPhysicalAttack');
      expect(knownLimitations[1].invariant).toBe('checkAmmo');

      expect(potentialBugs[0].invariant).toBe('checkStateConsistency');
      expect(potentialBugs[1].invariant).toBe('checkDamageCalculation');
    });

    it('should handle empty input', () => {
      const { knownLimitations, potentialBugs } = partitionViolations([]);

      expect(knownLimitations).toHaveLength(0);
      expect(potentialBugs).toHaveLength(0);
    });

    it('should handle all known limitations', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkPhysicalAttack',
          severity: 'warning',
          message: 'Physical attack not available',
          context: {},
        },
        {
          invariant: 'checkAmmo',
          severity: 'warning',
          message: 'Ammo not tracked',
          context: {},
        },
      ];

      const { knownLimitations, potentialBugs } = partitionViolations(violations);

      expect(knownLimitations).toHaveLength(2);
      expect(potentialBugs).toHaveLength(0);
    });

    it('should handle all potential bugs', () => {
      const violations: IViolation[] = [
        {
          invariant: 'checkStateConsistency',
          severity: 'error',
          message: 'Invalid state detected',
          context: {},
        },
        {
          invariant: 'checkDamageCalculation',
          severity: 'error',
          message: 'Negative armor value',
          context: {},
        },
      ];

      const { knownLimitations, potentialBugs } = partitionViolations(violations);

      expect(knownLimitations).toHaveLength(0);
      expect(potentialBugs).toHaveLength(2);
    });
  });
});
