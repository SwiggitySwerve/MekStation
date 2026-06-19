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

  describe('writeFluff()', () => {
    it('should include overview when present', () => {
      const fluff: ISerializedFluff = {
        overview: 'This is a test mech overview.',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain(
        'overview:This is a test mech overview.',
      );
    });

    it('should include capabilities when present', () => {
      const fluff: ISerializedFluff = {
        capabilities: 'Fast and maneuverable.',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain('capabilities:Fast and maneuverable.');
    });

    it('should include deployment when present', () => {
      const fluff: ISerializedFluff = {
        deployment: 'Common in militia forces.',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain('deployment:Common in militia forces.');
    });

    it('should include history when present', () => {
      const fluff: ISerializedFluff = {
        history: 'Developed during the Succession Wars.',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain(
        'history:Developed during the Succession Wars.',
      );
    });

    it('should include manufacturer when present', () => {
      const fluff: ISerializedFluff = {
        manufacturer: 'Acme BattleMech Industries',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain(
        'manufacturer:Acme BattleMech Industries',
      );
    });

    it('should include primaryFactory when present', () => {
      const fluff: ISerializedFluff = {
        primaryFactory: 'Hesperus II',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain('primaryfactory:Hesperus II');
    });

    it('should include systemManufacturer when present', () => {
      const fluff: ISerializedFluff = {
        systemManufacturer: {
          Engine: 'Vlar 300',
          Armor: 'Durallex Light',
          Communications: 'Tek BattleCom',
        },
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain('systemmanufacturer:Engine:Vlar 300');
      expect(result.content).toContain(
        'systemmanufacturer:Armor:Durallex Light',
      );
      expect(result.content).toContain(
        'systemmanufacturer:Communications:Tek BattleCom',
      );
    });

    it('should include all fluff sections together', () => {
      const fluff: ISerializedFluff = {
        overview: 'A versatile medium BattleMech.',
        capabilities: 'Well-balanced firepower and armor.',
        deployment: 'Used throughout the Inner Sphere.',
        history: 'One of the most successful designs.',
        manufacturer: 'Bergan Industries',
        primaryFactory: 'New Avalon',
        systemManufacturer: {
          Engine: 'Omni 250',
          Armor: 'Starshield A',
        },
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain(
        'overview:A versatile medium BattleMech.',
      );
      expect(result.content).toContain(
        'capabilities:Well-balanced firepower and armor.',
      );
      expect(result.content).toContain(
        'deployment:Used throughout the Inner Sphere.',
      );
      expect(result.content).toContain(
        'history:One of the most successful designs.',
      );
      expect(result.content).toContain('manufacturer:Bergan Industries');
      expect(result.content).toContain('primaryfactory:New Avalon');
      expect(result.content).toContain('systemmanufacturer:Engine:Omni 250');
      expect(result.content).toContain('systemmanufacturer:Armor:Starshield A');
    });

    it('should omit fluff section when undefined', () => {
      const unit = createMinimalUnit() as ISerializedUnit & {
        fluff?: ISerializedFluff;
      };
      delete unit.fluff;
      const result = service.export(unit);

      expect(result.content).not.toContain('overview:');
      expect(result.content).not.toContain('capabilities:');
      expect(result.content).not.toContain('deployment:');
      expect(result.content).not.toContain('history:');
      expect(result.content).not.toContain('manufacturer:');
      expect(result.content).not.toContain('primaryfactory:');
      expect(result.content).not.toContain('systemmanufacturer:');
    });

    it('should handle empty fluff object', () => {
      const fluff: ISerializedFluff = {};
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.success).toBe(true);
    });

    it('should handle fluff with special characters', () => {
      const fluff: ISerializedFluff = {
        overview: "The Atlas is the Inner Sphere's most iconic assault 'Mech.",
        manufacturer: 'Defiance Industries (A Division of GM)',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain(
        "overview:The Atlas is the Inner Sphere's most iconic assault 'Mech.",
      );
      expect(result.content).toContain(
        'manufacturer:Defiance Industries (A Division of GM)',
      );
    });
  });
});
