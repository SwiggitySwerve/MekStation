import { readFileSync } from 'fs';
import { join } from 'path';

import {
  isKnownLimitation,
  getLimitationPatternCategory,
  getLimitationCategory,
  getLimitationExplanation,
  filterKnownLimitations,
  partitionViolations,
  type IViolation,
} from '../core/knownLimitations';
import { getCombatValidationUnresolvedRefs } from '../runner/CombatValidationGapInventory';

describe('knownLimitations', () => {
  describe('legacy ledger documentation', () => {
    it('keeps represented physical weapon catalog rows separate from modifier lifecycle boundaries', () => {
      const ledger = readFileSync(
        join(process.cwd(), 'src/simulation/known-limitations.md'),
        'utf8',
      );

      expect(ledger).toContain(
        'Claws and Talons are represented physical-weapon catalog entries',
      );
      expect(ledger).not.toContain('featureSupport.physicalWeapons.claws');
      expect(ledger).not.toContain('featureSupport.physicalWeapons.talons');
      expect(ledger).toContain('ruleSupport.physicalDamageModifiers.claws');
      expect(ledger).toContain('ruleSupport.physicalDamageModifiers.talons');
      expect(ledger).toContain(
        'ruleSupport.physicalDamageModifiers.claw-equipment-lifecycle',
      );
      expect(ledger).toContain(
        'ruleSupport.physicalDamageModifiers.talon-equipment-lifecycle',
      );
    });

    it('keeps named remaining gap refs aligned with the unresolved inventory', () => {
      const ledger = readFileSync(
        join(process.cwd(), 'src/simulation/known-limitations.md'),
        'utf8',
      );
      const unresolvedRefs = new Set(getCombatValidationUnresolvedRefs());
      const historicalOrSplitRefs = [
        'featureSupport.ammunitionCompatibility.unsupported-rotary-ac-10-20-ammo',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-secondary-fallout',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-terrain-building-environment-fallout',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-step-out-cfr',
        'ruleSupport.physicalLegalityGates.shared.displacement-domino-dropship-secondary-hex',
        'ruleSupport.terrainEnvironment.minefield-variant-side-paths',
        'ruleSupport.terrainEnvironment.minefield-non-conventional-type-semantics',
        'ruleSupport.terrainEnvironment.terrain-los-side-paths',
        'ruleSupport.terrainEnvironment.terrain-los-grounded-dropship-cover-providers',
        'damageAndDeath.criticalComponents.equipment',
        'damageAndDeath.criticalSlotEffects.equipment',
      ];
      const exactLedgerGapRefs: readonly string[] = [];

      expect(
        historicalOrSplitRefs.filter((ref) => unresolvedRefs.has(ref)),
      ).toEqual([]);
      expect(
        historicalOrSplitRefs.filter((ref) => !ledger.includes(ref)),
      ).toEqual([]);
      expect(
        exactLedgerGapRefs.filter((ref) => !unresolvedRefs.has(ref)),
      ).toEqual([]);
      expect(exactLedgerGapRefs.filter((ref) => !ledger.includes(ref))).toEqual(
        [],
      );
      expect(ledger).not.toContain('ruleSupport.terrainEnvironment.mines');
      expect(ledger).not.toContain(
        'maneuvering-ace-controlled-sideslip-producer-application',
      );
      expect(ledger).not.toContain(
        'maneuvering-ace-out-of-control-producer-application',
      );
      expect(ledger).toContain('EmpMinefieldEffectApplied');
      expect(ledger).toContain('CFR_DOMINO_EFFECT');
      expect(ledger).toContain('forced domino fallback');
      expect(ledger).toContain('blockerStepOutDecision');
      expect(ledger).toContain('domino_step_out');
    });
  });
});
