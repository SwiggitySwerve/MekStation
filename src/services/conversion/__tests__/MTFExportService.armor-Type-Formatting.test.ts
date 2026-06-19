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

  describe('Armor Type Formatting', () => {
    it('should format STANDARD armor', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.content).toContain('armor:Standard(Inner Sphere)');
    });

    it('should format FERRO_FIBROUS armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Ferro-Fibrous');
    });

    it('should format FERRO_FIBROUS_IS armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS_IS' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Ferro-Fibrous');
    });

    it('should format FERRO_FIBROUS_CLAN armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS_CLAN' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Ferro-Fibrous(Clan)');
    });

    it('should format LIGHT_FERRO armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'LIGHT_FERRO' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Light Ferro-Fibrous');
    });

    it('should format HEAVY_FERRO armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'HEAVY_FERRO' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Heavy Ferro-Fibrous');
    });

    it('should format STEALTH armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'STEALTH' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Stealth');
    });

    it('should format REACTIVE armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'REACTIVE' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Reactive');
    });

    it('should format REFLECTIVE armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'REFLECTIVE' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Reflective');
    });

    it('should format HARDENED armor', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'HARDENED' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Hardened');
    });

    it('should default unknown armor types to Standard', () => {
      const unit = createMinimalUnit({
        armor: { ...createMinimalUnit().armor, type: 'UNKNOWN' },
      });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Standard(Inner Sphere)');
    });
  });
});
