/**
 * MTF Export Service Tests
 *
 * Tests for exporting ISerializedUnit objects to MTF (MegaMek Text Format) strings.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 * @spec openspec/specs/serialization-formats/spec.md
 */

// CRITICAL: Unmock these modules to ensure we test the real implementation
// ParityValidationService.test.ts mocks MTFExportService, so we must explicitly unmock it here
jest.unmock('@/services/conversion/MTFExportService');
jest.unmock('@/services/conversion/MTFParserService');

import {
  MTFExportService,
  getMTFExportService,
} from '@/services/conversion/MTFExportService';
import { getMTFParserService } from '@/services/conversion/MTFParserService';
import {
  ISerializedUnit,
  ISerializedFluff,
} from '@/types/unit/UnitSerialization';

import { createMinimalUnit } from './MTFExportService.test-helpers';

describe('MTFExportService', () => {
  let service: MTFExportService;

  beforeEach(() => {
    service = getMTFExportService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  // ============================================================================
  // ============================================================================
  // formatConfig() - Configuration Formatting
  // ============================================================================
  // ============================================================================
  // formatTechBase() - Tech Base Formatting
  // ============================================================================
  // ============================================================================
  // formatRulesLevel() - Rules Level Formatting
  // ============================================================================
  // ============================================================================
  // formatEngineType() - Engine Type Formatting
  // ============================================================================
  // ============================================================================
  // Structure Type Formatting
  // ============================================================================
  // ============================================================================
  // Heat Sink Type Formatting
  // ============================================================================
  // ============================================================================
  // Armor Type Formatting
  // ============================================================================
  // ============================================================================
  // Armor Values Formatting
  // ============================================================================
  // ============================================================================
  // formatEquipmentName() - Equipment Name Formatting
  // ============================================================================
  // ============================================================================
  // Critical Slots Formatting
  // ============================================================================
  // ============================================================================
  // Quirks Formatting
  // ============================================================================
  // ============================================================================
  // writeFluff() - Fluff Sections
  // ============================================================================
  // ============================================================================
  // Round-Trip Testing
  // ============================================================================
  // ============================================================================
  // Edge Cases
  // ============================================================================
  // ============================================================================
  // OmniMech Export Tests
  // ============================================================================
  // ============================================================================
  // OmniMech Round-Trip Tests
  // ============================================================================
  // ============================================================================
  // OmniMech Variant Workflow Tests
  // ============================================================================

  describe('Quirks Formatting', () => {
    it('should include quirks section when present', () => {
      const unit = createMinimalUnit({
        quirks: ['battle_fists_la', 'battle_fists_ra'],
      });
      const result = service.export(unit);

      expect(result.content).toContain('quirk:battle_fists_la');
      expect(result.content).toContain('quirk:battle_fists_ra');
    });

    it('should omit quirks section when empty', () => {
      const unit = createMinimalUnit({ quirks: [] });
      const result = service.export(unit);

      expect(result.content).not.toContain('quirk:');
    });

    it('should omit quirks section when undefined', () => {
      const unit = createMinimalUnit() as ISerializedUnit & {
        quirks?: string[];
      };
      delete unit.quirks;
      const result = service.export(unit);

      expect(result.content).not.toContain('quirk:');
    });

    it('should output multiple quirks', () => {
      const unit = createMinimalUnit({
        quirks: ['improved_targeting_short', 'stable', 'difficult_maintain'],
      });
      const result = service.export(unit);

      expect(result.content).toContain('quirk:improved_targeting_short');
      expect(result.content).toContain('quirk:stable');
      expect(result.content).toContain('quirk:difficult_maintain');
    });
  });
});
