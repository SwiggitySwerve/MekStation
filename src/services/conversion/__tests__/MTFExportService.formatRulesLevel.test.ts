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

  describe('formatRulesLevel()', () => {
    it('should format INTRODUCTORY rules level as 1', () => {
      const unit = createMinimalUnit({ rulesLevel: 'INTRODUCTORY' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:1');
    });

    it('should format STANDARD rules level as 2', () => {
      const unit = createMinimalUnit({ rulesLevel: 'STANDARD' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:2');
    });

    it('should format ADVANCED rules level as 3', () => {
      const unit = createMinimalUnit({ rulesLevel: 'ADVANCED' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:3');
    });

    it('should format EXPERIMENTAL rules level as 4', () => {
      const unit = createMinimalUnit({ rulesLevel: 'EXPERIMENTAL' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:4');
    });

    it('should default unknown rules levels to 2', () => {
      const unit = createMinimalUnit({ rulesLevel: 'UNKNOWN' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:2');
    });
  });
});
