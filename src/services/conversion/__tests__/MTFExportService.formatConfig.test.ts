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

  describe('formatConfig()', () => {
    it('should format BIPED configuration', () => {
      const unit = createMinimalUnit({ configuration: 'BIPED' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:Biped');
    });

    it('should format QUAD configuration', () => {
      const unit = createMinimalUnit({ configuration: 'QUAD' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:Quad');
    });

    it('should format TRIPOD configuration', () => {
      const unit = createMinimalUnit({ configuration: 'TRIPOD' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:Tripod');
    });

    it('should format LAM configuration', () => {
      const unit = createMinimalUnit({ configuration: 'LAM' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:LAM');
    });

    it('should format QUADVEE configuration', () => {
      const unit = createMinimalUnit({ configuration: 'QUADVEE' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:QuadVee');
    });

    it('should pass through unknown configurations', () => {
      const unit = createMinimalUnit({ configuration: 'UNKNOWN_CONFIG' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:UNKNOWN_CONFIG');
    });
  });
});
