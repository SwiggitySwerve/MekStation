/**
 * Tests for `getPSRReasonCategory`, the bucket helper that partitions
 * the `PSRTrigger` taxonomy into movement / damage / heat / recovery.
 *
 * @spec openspec/changes/structure-psr-reason-as-discriminated-code/specs/piloting-skill-rolls/spec.md
 *   Requirement: PSR Reason Category Bucket Helper
 */
import { PSRTrigger, PSRReasonCategory, getPSRReasonCategory } from '../types';

describe('getPSRReasonCategory', () => {
  describe('spot checks (one per bucket)', () => {
    it('maps Kicked to movement', () => {
      expect(getPSRReasonCategory(PSRTrigger.Kicked)).toBe('movement');
    });

    it('maps PhaseDamage20Plus to damage', () => {
      expect(getPSRReasonCategory(PSRTrigger.PhaseDamage20Plus)).toBe('damage');
    });

    it('maps Shutdown (heat-induced) to heat', () => {
      expect(getPSRReasonCategory(PSRTrigger.Shutdown)).toBe('heat');
    });

    it('maps StandingUp to recovery', () => {
      expect(getPSRReasonCategory(PSRTrigger.StandingUp)).toBe('recovery');
    });
  });

  describe('exhaustive partitioning over all canonical codes', () => {
    const allTriggers = Object.values(PSRTrigger) as readonly PSRTrigger[];

    it('enumerates the canonical PSRTrigger codes', () => {
      // If a code is added in a follow-on change, this assertion fails first
      // and forces a category decision plus spec / enum reconciliation.
      expect(allTriggers).toHaveLength(29);
    });

    it('every PSRTrigger value maps to exactly one of the four buckets', () => {
      const valid: readonly PSRReasonCategory[] = [
        'movement',
        'damage',
        'heat',
        'recovery',
      ];
      for (const trigger of allTriggers) {
        const bucket = getPSRReasonCategory(trigger);
        expect(valid).toContain(bucket);
      }
    });

    it('all four buckets are non-empty', () => {
      const buckets: Record<PSRReasonCategory, number> = {
        movement: 0,
        damage: 0,
        heat: 0,
        recovery: 0,
      };
      for (const trigger of allTriggers) {
        buckets[getPSRReasonCategory(trigger)] += 1;
      }
      expect(buckets.movement).toBeGreaterThan(0);
      expect(buckets.damage).toBeGreaterThan(0);
      expect(buckets.heat).toBeGreaterThan(0);
      expect(buckets.recovery).toBeGreaterThan(0);
    });

    it('matches the canonical partition documented in the spec', () => {
      // 19 movement + 8 damage + 1 heat + 1 recovery = 29.
      const buckets: Record<PSRReasonCategory, number> = {
        movement: 0,
        damage: 0,
        heat: 0,
        recovery: 0,
      };
      for (const trigger of allTriggers) {
        buckets[getPSRReasonCategory(trigger)] += 1;
      }
      expect(buckets.damage).toBe(8);
      expect(buckets.movement).toBe(19);
      expect(buckets.heat).toBe(1);
      expect(buckets.recovery).toBe(1);
    });
  });

  describe('per-code expectations from the spec table', () => {
    const damageCodes: readonly PSRTrigger[] = [
      PSRTrigger.PhaseDamage20Plus,
      PSRTrigger.LegDamage,
      PSRTrigger.HipActuatorDestroyed,
      PSRTrigger.GyroHit,
      PSRTrigger.EngineHit,
      PSRTrigger.UpperLegActuatorHit,
      PSRTrigger.LowerLegActuatorHit,
      PSRTrigger.FootActuatorHit,
    ];
    const movementCodes: readonly PSRTrigger[] = [
      PSRTrigger.Kicked,
      PSRTrigger.Charged,
      PSRTrigger.DFATarget,
      PSRTrigger.Pushed,
      PSRTrigger.KickMiss,
      PSRTrigger.ChargeMiss,
      PSRTrigger.DFAMiss,
      PSRTrigger.EnteringRubble,
      PSRTrigger.RunningRoughTerrain,
      PSRTrigger.MovingOnIce,
      PSRTrigger.EnteringWater,
      PSRTrigger.ExitingWater,
      PSRTrigger.Skidding,
      PSRTrigger.AirMekLanding,
      PSRTrigger.RunningDamagedHip,
      PSRTrigger.RunningDamagedGyro,
      PSRTrigger.BuildingCollapse,
      PSRTrigger.MASCFailure,
      PSRTrigger.SuperchargerFailure,
    ];

    it.each(damageCodes)('%s maps to damage', (code) => {
      expect(getPSRReasonCategory(code)).toBe('damage');
    });

    it.each(movementCodes)('%s maps to movement', (code) => {
      expect(getPSRReasonCategory(code)).toBe('movement');
    });
  });
});
