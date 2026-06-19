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

  describe('Armor Values Formatting', () => {
    it('should write armor values for all locations', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.content).toContain('LA armor:12');
      expect(result.content).toContain('RA armor:12');
      expect(result.content).toContain('LL armor:16');
      expect(result.content).toContain('RL armor:16');
      expect(result.content).toContain('HD armor:9');
    });

    it('should write front and rear armor for torsos', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.content).toContain('CT armor:20');
      expect(result.content).toContain('RTC armor:10');
      expect(result.content).toContain('LT armor:16');
      expect(result.content).toContain('RTL armor:8');
      expect(result.content).toContain('RT armor:16');
      expect(result.content).toContain('RTR armor:8');
    });

    it('should handle simple number armor values', () => {
      const unit = createMinimalUnit({
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 9,
            LEFT_ARM: 12,
            RIGHT_ARM: 12,
          },
        },
      });
      const result = service.export(unit);

      expect(result.content).toContain('HD armor:9');
      expect(result.content).toContain('LA armor:12');
      expect(result.content).toContain('RA armor:12');
    });

    it('should handle front/rear armor objects', () => {
      const unit = createMinimalUnit({
        armor: {
          type: 'STANDARD',
          allocation: {
            CENTER_TORSO: { front: 25, rear: 12 },
            LEFT_TORSO: { front: 20, rear: 10 },
            RIGHT_TORSO: { front: 20, rear: 10 },
          },
        },
      });
      const result = service.export(unit);

      expect(result.content).toContain('CT armor:25');
      expect(result.content).toContain('RTC armor:12');
      expect(result.content).toContain('LT armor:20');
      expect(result.content).toContain('RTL armor:10');
      expect(result.content).toContain('RT armor:20');
      expect(result.content).toContain('RTR armor:10');
    });
  });
});
