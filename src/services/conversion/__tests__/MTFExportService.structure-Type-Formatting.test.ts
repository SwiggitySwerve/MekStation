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

  describe('Structure Type Formatting', () => {
    it('should format STANDARD structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'STANDARD' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Standard');
    });

    it('should format ENDO_STEEL structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_STEEL' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Endo Steel');
    });

    it('should format ENDO_STEEL_IS structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_STEEL_IS' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Endo Steel');
    });

    it('should format ENDO_STEEL_CLAN structure', () => {
      const unit = createMinimalUnit({
        structure: { type: 'ENDO_STEEL_CLAN' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Clan Endo Steel');
    });

    it('should format ENDO_COMPOSITE structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_COMPOSITE' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Endo-Composite');
    });

    it('should format REINFORCED structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'REINFORCED' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Reinforced');
    });

    it('should format COMPOSITE structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'COMPOSITE' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Composite');
    });

    it('should format INDUSTRIAL structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'INDUSTRIAL' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Industrial');
    });

    it('should default unknown structure types to IS Standard', () => {
      const unit = createMinimalUnit({ structure: { type: 'UNKNOWN' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Standard');
    });
  });
});
