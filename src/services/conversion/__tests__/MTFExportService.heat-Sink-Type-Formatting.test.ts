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

  describe('Heat Sink Type Formatting', () => {
    it('should format SINGLE heat sinks', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'SINGLE', count: 10 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:10 Single');
    });

    it('should format DOUBLE heat sinks', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'DOUBLE', count: 15 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:15 Double');
    });

    it('should format DOUBLE_IS heat sinks', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'DOUBLE_IS', count: 15 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:15 Double');
    });

    it('should format DOUBLE_CLAN heat sinks', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'DOUBLE_CLAN', count: 20 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:20 Double');
    });

    it('should default unknown heat sink types to Single', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'UNKNOWN', count: 10 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:10 Single');
    });
  });
});
