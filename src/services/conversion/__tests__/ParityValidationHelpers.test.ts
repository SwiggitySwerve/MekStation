/**
 * ParityValidationHelpers Tests
 *
 * Tier 1 invariant tests for the helpers backing the parity-validation
 * pipeline. These functions normalize MTF text for like-with-like comparison
 * and detect / categorize discrepancies into typed `IDiscrepancy` records.
 *
 * Tests assert the normalisation contract (blank lines, comments, CR/LF) and
 * the categorisation contract (which mismatch -> which `DiscrepancyCategory`),
 * both of which the parity-report writer downstream depends on.
 */

import {
  compareAndCategorize,
  getRelativePath,
  normalizeContent,
} from '../ParityValidationHelpers';
import { DiscrepancyCategory } from '../types/ParityValidation';

describe('ParityValidationHelpers', () => {
  // ============================================================================
  // normalizeContent() — drops blanks/comments/whitespace for line-by-line diff
  // ============================================================================
  describe('normalizeContent()', () => {
    it('strips blank lines and trims whitespace', () => {
      const input = '  chassis:Atlas  \n\n   model:AS7-D\n';
      expect(normalizeContent(input)).toEqual(['chassis:Atlas', 'model:AS7-D']);
    });

    it('strips comment lines starting with #', () => {
      const input = '# header comment\nchassis:Atlas\n# another comment\n';
      expect(normalizeContent(input)).toEqual(['chassis:Atlas']);
    });

    it('handles CRLF line endings', () => {
      const input = 'chassis:Atlas\r\nmodel:AS7-D\r\n';
      expect(normalizeContent(input)).toEqual(['chassis:Atlas', 'model:AS7-D']);
    });

    it('returns an empty array for an empty or comments-only string', () => {
      expect(normalizeContent('')).toEqual([]);
      expect(normalizeContent('# only a comment\n# another\n')).toEqual([]);
    });
  });

  // ============================================================================
  // getRelativePath() — strips the meks/ prefix or falls back to basename
  // ============================================================================
  describe('getRelativePath()', () => {
    it('returns the path under meks/ when present (forward slashes)', () => {
      expect(
        getRelativePath(
          'E:/Projects/mm-data/data/mekfiles/meks/3025/Atlas.mtf',
        ),
      ).toBe('3025/Atlas.mtf');
    });

    it('falls back to the basename when meks/ is not in the path', () => {
      expect(getRelativePath('/some/random/path/Atlas.mtf')).toBe('Atlas.mtf');
    });
  });

  // ============================================================================
  // compareAndCategorize() — the heart of the parity report categoriser
  // ============================================================================
  describe('compareAndCategorize()', () => {
    const baseLines = [
      'chassis:Atlas',
      'model:AS7-D',
      'Config:Biped',
      'techbase:Inner Sphere',
      'mass:100',
      'engine:300 Fusion Engine',
      'walk mp:3',
      'jump mp:0',
    ];

    it('returns no issues when original and generated match exactly', () => {
      const issues = compareAndCategorize(baseLines, baseLines);
      expect(issues).toEqual([]);
    });

    it('reports a HeaderMismatch when chassis differs', () => {
      const generated = [...baseLines];
      generated[0] = 'chassis:NotAtlas';
      const issues = compareAndCategorize(baseLines, generated);

      const chassisIssue = issues.find((i) => i.field === 'chassis');
      expect(chassisIssue).toBeDefined();
      expect(chassisIssue?.category).toBe(DiscrepancyCategory.HeaderMismatch);
      expect(chassisIssue?.expected).toBe('Atlas');
      expect(chassisIssue?.actual).toBe('NotAtlas');
    });

    it('reports a MovementMismatch when walk MP differs', () => {
      const generated = [...baseLines];
      generated[6] = 'walk mp:4';
      const issues = compareAndCategorize(baseLines, generated);

      const walkIssue = issues.find((i) => i.field === 'walk mp');
      expect(walkIssue?.category).toBe(DiscrepancyCategory.MovementMismatch);
    });

    it('does NOT flag engine when only the (IS)/(Clan)/Fusion/Engine wording differs', () => {
      // Per the helper's normalizeEngineString, these tokens are stripped
      const original = [...baseLines, 'engine:300 XL Fusion Engine (IS)'];
      const generated = [...baseLines, 'engine:300 XL Engine'];
      const issues = compareAndCategorize(original, generated);
      // The duplicate "engine" line in the original should not appear as a
      // mismatch because both normalise to the same thing
      expect(issues.find((i) => i.field === 'engine')).toBeUndefined();
    });

    it('reports an ArmorMismatch when LA armor differs', () => {
      const original = [...baseLines, 'LA armor:34'];
      const generated = [...baseLines, 'LA armor:30'];
      const issues = compareAndCategorize(original, generated);
      const armorIssue = issues.find((i) => i.field === 'LA armor');
      expect(armorIssue?.category).toBe(DiscrepancyCategory.ArmorMismatch);
    });

    it('does NOT flag armor when only the location-prefix syntax differs', () => {
      // normalizeArmorValue takes the LAST colon-separated segment
      const original = [...baseLines, 'LA armor:34'];
      const generated = [...baseLines, 'LA armor:label:34'];
      const issues = compareAndCategorize(original, generated);
      expect(issues.find((i) => i.field === 'LA armor')).toBeUndefined();
    });

    it('reports missing and extra actuator slot mismatches', () => {
      const original = [
        ...baseLines,
        'Left Arm:',
        'Shoulder',
        'Upper Arm Actuator',
        '-Empty-',
        'Medium Laser',
      ];
      const generated = [
        ...baseLines,
        'Left Arm:',
        '-Empty-',
        'Upper Arm Actuator',
        'Hand Actuator',
        'Medium Laser',
      ];

      const issues = compareAndCategorize(original, generated);

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: DiscrepancyCategory.MissingActuator,
            location: 'LEFT_ARM',
            index: 0,
            expected: 'Shoulder',
            actual: '-Empty-',
          }),
          expect.objectContaining({
            category: DiscrepancyCategory.ExtraActuator,
            location: 'LEFT_ARM',
            index: 2,
            expected: '-Empty-',
            actual: 'Hand Actuator',
          }),
        ]),
      );
    });

    it('reports non-actuator slot and slot-count mismatches', () => {
      const original = [
        ...baseLines,
        'Right Arm:',
        'Medium Laser',
        'Heat Sink',
      ];
      const generated = [...baseLines, 'Right Arm:', 'Small Laser'];

      const issues = compareAndCategorize(original, generated);

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: DiscrepancyCategory.SlotCountMismatch,
            location: 'RIGHT_ARM',
            expected: '2 slots',
            actual: '1 slots',
          }),
          expect.objectContaining({
            category: DiscrepancyCategory.SlotMismatch,
            location: 'RIGHT_ARM',
            index: 0,
            expected: 'Medium Laser',
            actual: 'Small Laser',
          }),
        ]),
      );
    });

    it('reports a QuirkMismatch for an extra quirk in the generated file', () => {
      const original = ['chassis:Atlas', 'quirk:rugged_1'];
      const generated = [
        'chassis:Atlas',
        'quirk:rugged_1',
        'quirk:command_mech',
      ];
      const issues = compareAndCategorize(original, generated);
      const quirkIssue = issues.find(
        (i) =>
          i.category === DiscrepancyCategory.QuirkMismatch &&
          i.actual === 'command_mech',
      );
      expect(quirkIssue).toBeDefined();
    });

    it('reports a QuirkMismatch for a missing quirk in the generated file', () => {
      const original = [
        'chassis:Atlas',
        'quirk:rugged_1',
        'quirk:command_mech',
      ];
      const generated = ['chassis:Atlas', 'quirk:rugged_1'];
      const issues = compareAndCategorize(original, generated);
      const quirkIssue = issues.find(
        (i) =>
          i.category === DiscrepancyCategory.QuirkMismatch &&
          i.expected === 'command_mech',
      );
      expect(quirkIssue).toBeDefined();
    });

    it('normalises techbase tokens before comparing (IS / Inner Sphere are equal)', () => {
      const original = ['techbase:Inner Sphere'];
      const generated = ['techbase:IS'];
      const issues = compareAndCategorize(original, generated);
      expect(issues.find((i) => i.field === 'techbase')).toBeUndefined();
    });
  });
});
