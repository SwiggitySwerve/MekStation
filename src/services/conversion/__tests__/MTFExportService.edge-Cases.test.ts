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

  describe('Edge Cases', () => {
    it('should handle unit with no equipment', () => {
      const unit = createMinimalUnit({ equipment: [] });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Weapons:0');
    });

    it('should handle unit with maximum equipment', () => {
      const maxEquipment = Array(50)
        .fill(null)
        .map(() => ({ id: 'medium-laser', location: 'CENTER_TORSO' }));
      const unit = createMinimalUnit({ equipment: maxEquipment });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Weapons:50');
    });

    it('should handle very long equipment names', () => {
      const unit = createMinimalUnit({
        equipment: [
          {
            id: 'super-long-experimental-weapon-name-that-goes-on-forever',
            location: 'RIGHT_ARM',
          },
        ],
      });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain(
        'Super Long Experimental Weapon Name That Goes On Forever',
      );
    });

    it('should handle zero movement', () => {
      const unit = createMinimalUnit({ movement: { walk: 0, jump: 0 } });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('walk mp:0');
      expect(result.content).toContain('jump mp:0');
    });

    it('should handle high movement values', () => {
      const unit = createMinimalUnit({ movement: { walk: 10, jump: 8 } });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('walk mp:10');
      expect(result.content).toContain('jump mp:8');
    });

    it('should handle minimum tonnage', () => {
      const unit = createMinimalUnit({ tonnage: 10 });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('mass:10');
    });

    it('should handle maximum tonnage', () => {
      const unit = createMinimalUnit({ tonnage: 100 });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('mass:100');
    });

    it('should handle assault mech tonnage (200 for superheavy)', () => {
      const unit = createMinimalUnit({ tonnage: 200 });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('mass:200');
    });

    it('should handle empty armor allocation', () => {
      const unit = createMinimalUnit({
        armor: {
          type: 'STANDARD',
          allocation: {},
        },
      });
      const result = service.export(unit);

      expect(result.success).toBe(true);
    });

    it('should handle zero heat sinks', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'SINGLE', count: 0 },
      });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('heat sinks:0 Single');
    });

    it('should handle very high heat sink count', () => {
      const unit = createMinimalUnit({
        heatSinks: { type: 'DOUBLE', count: 50 },
      });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('heat sinks:50 Double');
    });

    it('should handle special characters in chassis name', () => {
      const unit = createMinimalUnit({ chassis: "Mech's-Name (Test)" });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain("chassis:Mech's-Name (Test)");
    });

    it('should handle special characters in model name', () => {
      const unit = createMinimalUnit({ model: 'TST-1A/B' });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('model:TST-1A/B');
    });
  });
});
