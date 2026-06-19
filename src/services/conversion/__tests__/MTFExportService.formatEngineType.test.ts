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

  describe('formatEngineType()', () => {
    it('should format FUSION engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'FUSION', rating: 200 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fusion Engine');
    });

    it('should format STANDARD engine as Fusion', () => {
      const unit = createMinimalUnit({
        engine: { type: 'STANDARD', rating: 200 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fusion Engine');
    });

    it('should format XL engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'XL', rating: 300 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:300 XL Fusion Engine');
    });

    it('should format XL_IS engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'XL_IS', rating: 300 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:300 XL Fusion Engine');
    });

    it('should format XL_CLAN engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'XL_CLAN', rating: 300 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:300 XL Fusion Engine (Clan)');
    });

    it('should format LIGHT engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'LIGHT', rating: 250 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:250 Light Fusion Engine');
    });

    it('should format COMPACT engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'COMPACT', rating: 150 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:150 Compact Fusion Engine');
    });

    it('should format XXL engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'XXL', rating: 400 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:400 XXL Fusion Engine');
    });

    it('should format ICE engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'ICE', rating: 100 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:100 ICE Engine');
    });

    it('should format FUEL_CELL engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'FUEL_CELL', rating: 180 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:180 Fuel Cell Engine');
    });

    it('should format FISSION engine', () => {
      const unit = createMinimalUnit({
        engine: { type: 'FISSION', rating: 200 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fission Engine');
    });

    it('should default unknown engine types to Fusion', () => {
      const unit = createMinimalUnit({
        engine: { type: 'UNKNOWN', rating: 200 },
      });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fusion Engine');
    });
  });
});
