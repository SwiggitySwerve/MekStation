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

  describe('export()', () => {
    it('should successfully export a minimal unit', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should include license header', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.content).toContain(
        '# MegaMek Data (C) 2025 by The MegaMek Team',
      );
      expect(result.content).toContain('CC BY-NC-SA 4.0');
      expect(result.content).toContain('# MechWarrior, BattleMech');
    });

    it('should include chassis and model', () => {
      const unit = createMinimalUnit({ chassis: 'Atlas', model: 'AS7-D' });
      const result = service.export(unit);

      expect(result.content).toContain('chassis:Atlas');
      expect(result.content).toContain('model:AS7-D');
    });

    it('should include mul id if present', () => {
      const unit = createMinimalUnit() as ISerializedUnit & { mulId: number };
      unit.mulId = 12345;
      const result = service.export(unit);

      expect(result.content).toContain('mul id:12345');
    });

    it('should include role if present', () => {
      const unit = createMinimalUnit() as ISerializedUnit & { role: string };
      unit.role = 'Brawler';
      const result = service.export(unit);

      expect(result.content).toContain('role:Brawler');
    });

    it('should include source if present', () => {
      const unit = createMinimalUnit() as ISerializedUnit & { source: string };
      unit.source = 'TRO:3025';
      const result = service.export(unit);

      expect(result.content).toContain('source:TRO:3025');
    });

    it('should include era and year', () => {
      const unit = createMinimalUnit({ year: 3050 });
      const result = service.export(unit);

      expect(result.content).toContain('era:3050');
    });

    it('should include tonnage', () => {
      const unit = createMinimalUnit({ tonnage: 75 });
      const result = service.export(unit);

      expect(result.content).toContain('mass:75');
    });

    it('should include myomer', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.content).toContain('myomer:Standard');
    });

    it('should include walk and jump MP', () => {
      const unit = createMinimalUnit({ movement: { walk: 5, jump: 3 } });
      const result = service.export(unit);

      expect(result.content).toContain('walk mp:5');
      expect(result.content).toContain('jump mp:3');
    });

    it('should handle export errors gracefully', () => {
      // Create a unit with problematic data that might cause an error
      // @ts-expect-error - testing with null to validate error handling
      const badUnit: ISerializedUnit = null;
      const result = service.export(badUnit);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Export error:');
    });
  });
});
