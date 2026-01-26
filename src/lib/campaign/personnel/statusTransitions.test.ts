/**
 * Status transition validation tests
 * Verifies transition rules and side effects
 */

import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import {
  validateStatusTransition,
  getTransitionSideEffects,
} from './statusTransitions';

describe('Status Transition Validation', () => {
  describe('validateStatusTransition()', () => {
    describe('Invalid transitions', () => {
      it('should reject KIA → ACTIVE', () => {
        const result = validateStatusTransition(PersonnelStatus.KIA, PersonnelStatus.ACTIVE);
        expect(result.valid).toBe(false);
        expect(result.reason).toBeDefined();
      });

      it('should reject ACCIDENTAL_DEATH → ACTIVE', () => {
        const result = validateStatusTransition(
          PersonnelStatus.ACCIDENTAL_DEATH,
          PersonnelStatus.ACTIVE
        );
        expect(result.valid).toBe(false);
      });

      it('should reject MISSING_PRESUMED_DEAD → RETIRED', () => {
        const result = validateStatusTransition(
          PersonnelStatus.MISSING_PRESUMED_DEAD,
          PersonnelStatus.RETIRED
        );
        expect(result.valid).toBe(false);
      });

      it('should reject any dead status → any non-dead status', () => {
        const deadStatuses = [
          PersonnelStatus.KIA,
          PersonnelStatus.DISEASE,
          PersonnelStatus.SUICIDE,
        ];
        const nonDeadStatuses = [
          PersonnelStatus.ACTIVE,
          PersonnelStatus.RETIRED,
          PersonnelStatus.ON_LEAVE,
        ];

        deadStatuses.forEach((deadStatus) => {
          nonDeadStatuses.forEach((nonDeadStatus) => {
            const result = validateStatusTransition(deadStatus, nonDeadStatus);
            expect(result.valid).toBe(false);
          });
        });
      });
    });

    describe('Valid transitions', () => {
      it('should allow ACTIVE → KIA', () => {
        const result = validateStatusTransition(PersonnelStatus.ACTIVE, PersonnelStatus.KIA);
        expect(result.valid).toBe(true);
      });

      it('should allow ACTIVE → RETIRED', () => {
        const result = validateStatusTransition(PersonnelStatus.ACTIVE, PersonnelStatus.RETIRED);
        expect(result.valid).toBe(true);
      });

      it('should allow ACTIVE → MIA', () => {
        const result = validateStatusTransition(PersonnelStatus.ACTIVE, PersonnelStatus.MIA);
        expect(result.valid).toBe(true);
      });

      it('should allow ACTIVE → any status', () => {
        const allStatuses = Object.values(PersonnelStatus);
        allStatuses.forEach((status) => {
          const result = validateStatusTransition(PersonnelStatus.ACTIVE, status);
          expect(result.valid).toBe(true);
        });
      });

      it('should allow RETIRED → ACTIVE', () => {
        const result = validateStatusTransition(PersonnelStatus.RETIRED, PersonnelStatus.ACTIVE);
        expect(result.valid).toBe(true);
      });

      it('should allow RESIGNED → ACTIVE', () => {
        const result = validateStatusTransition(PersonnelStatus.RESIGNED, PersonnelStatus.ACTIVE);
        expect(result.valid).toBe(true);
      });

      it('should allow MIA → ACTIVE', () => {
        const result = validateStatusTransition(PersonnelStatus.MIA, PersonnelStatus.ACTIVE);
        expect(result.valid).toBe(true);
      });

      it('should allow WOUNDED → ACTIVE', () => {
        const result = validateStatusTransition(PersonnelStatus.WOUNDED, PersonnelStatus.ACTIVE);
        expect(result.valid).toBe(true);
      });

      it('should allow dead → dead (same status)', () => {
        const result = validateStatusTransition(PersonnelStatus.KIA, PersonnelStatus.KIA);
        expect(result.valid).toBe(true);
      });

      it('should allow RETIRED → RETIRED (same status)', () => {
        const result = validateStatusTransition(PersonnelStatus.RETIRED, PersonnelStatus.RETIRED);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getTransitionSideEffects()', () => {
    describe('Death transitions', () => {
      it('should set death date when transitioning to KIA', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.KIA);
        expect(effects).toContainEqual(expect.objectContaining({ type: 'set_death_date' }));
      });

      it('should clear unit assignment when transitioning to death', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.KIA);
        expect(effects).toContainEqual({ type: 'clear_unit_assignment' });
      });

      it('should clear doctor assignment when transitioning to death', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.KIA);
        expect(effects).toContainEqual({ type: 'clear_doctor_assignment' });
      });

      it('should clear tech jobs when transitioning to death', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.KIA);
        expect(effects).toContainEqual({ type: 'clear_tech_jobs' });
      });

      it('should set death date for all death statuses', () => {
        const deathStatuses = [
          PersonnelStatus.KIA,
          PersonnelStatus.DISEASE,
          PersonnelStatus.SUICIDE,
          PersonnelStatus.ACCIDENTAL_DEATH,
        ];

        deathStatuses.forEach((deathStatus) => {
          const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, deathStatus);
          expect(effects).toContainEqual(expect.objectContaining({ type: 'set_death_date' }));
        });
      });
    });

    describe('Departure transitions', () => {
      it('should set retirement date when transitioning to RETIRED', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.RETIRED);
        expect(effects).toContainEqual(
          expect.objectContaining({ type: 'set_retirement_date' })
        );
      });

      it('should release commander flag when transitioning to RETIRED', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.RETIRED);
        expect(effects).toContainEqual({ type: 'release_commander_flag' });
      });

      it('should set retirement date for all departed statuses', () => {
        const departedStatuses = [
          PersonnelStatus.RETIRED,
          PersonnelStatus.RESIGNED,
          PersonnelStatus.FIRED,
          PersonnelStatus.LEFT,
        ];

        departedStatuses.forEach((departedStatus) => {
          const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, departedStatus);
          expect(effects).toContainEqual(
            expect.objectContaining({ type: 'set_retirement_date' })
          );
        });
      });

      it('should release commander flag for all departed statuses', () => {
        const departedStatuses = [
          PersonnelStatus.RETIRED,
          PersonnelStatus.RESIGNED,
          PersonnelStatus.FIRED,
        ];

        departedStatuses.forEach((departedStatus) => {
          const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, departedStatus);
          expect(effects).toContainEqual({ type: 'release_commander_flag' });
        });
      });
    });

    describe('Return to active transitions', () => {
      it('should clear retirement date when transitioning from RETIRED to ACTIVE', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.RETIRED, PersonnelStatus.ACTIVE);
        expect(effects).toContainEqual({ type: 'clear_retirement_date' });
      });

      it('should clear retirement date when transitioning from RESIGNED to ACTIVE', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.RESIGNED, PersonnelStatus.ACTIVE);
        expect(effects).toContainEqual({ type: 'clear_retirement_date' });
      });

      it('should clear retirement date for all departed → ACTIVE transitions', () => {
        const departedStatuses = [
          PersonnelStatus.RETIRED,
          PersonnelStatus.RESIGNED,
          PersonnelStatus.FIRED,
          PersonnelStatus.LEFT,
        ];

        departedStatuses.forEach((departedStatus) => {
          const effects = getTransitionSideEffects(departedStatus, PersonnelStatus.ACTIVE);
          expect(effects).toContainEqual({ type: 'clear_retirement_date' });
        });
      });
    });

    describe('No side effects', () => {
      it('should have no side effects for ACTIVE → ON_LEAVE', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.ON_LEAVE);
        expect(effects).toHaveLength(0);
      });

      it('should have no side effects for ON_LEAVE → ACTIVE', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ON_LEAVE, PersonnelStatus.ACTIVE);
        expect(effects).toHaveLength(0);
      });

      it('should have no side effects for ACTIVE → MIA', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.MIA);
        expect(effects).toHaveLength(0);
      });

      it('should have no side effects for same status transition', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.ACTIVE);
        expect(effects).toHaveLength(0);
      });
    });

    describe('Complex transitions', () => {
      it('should have multiple side effects for ACTIVE → KIA', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.KIA);
        expect(effects.length).toBeGreaterThan(1);
        expect(effects).toContainEqual(expect.objectContaining({ type: 'set_death_date' }));
        expect(effects).toContainEqual({ type: 'clear_unit_assignment' });
        expect(effects).toContainEqual({ type: 'clear_doctor_assignment' });
        expect(effects).toContainEqual({ type: 'clear_tech_jobs' });
      });

      it('should have multiple side effects for ACTIVE → RETIRED', () => {
        const effects = getTransitionSideEffects(PersonnelStatus.ACTIVE, PersonnelStatus.RETIRED);
        expect(effects.length).toBeGreaterThan(1);
        expect(effects).toContainEqual(
          expect.objectContaining({ type: 'set_retirement_date' })
        );
        expect(effects).toContainEqual({ type: 'release_commander_flag' });
      });
    });
  });
});
