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

  describe('Critical Slots Formatting', () => {
    it('should output all locations in correct order', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      const lines = result.content!.split('\n');
      const locationHeaders = lines.filter((line) =>
        [
          'Left Arm:',
          'Right Arm:',
          'Left Torso:',
          'Right Torso:',
          'Center Torso:',
          'Head:',
          'Left Leg:',
          'Right Leg:',
        ].includes(line),
      );

      expect(locationHeaders).toHaveLength(8);
      expect(locationHeaders[0]).toBe('Left Arm:');
      expect(locationHeaders[1]).toBe('Right Arm:');
      expect(locationHeaders[2]).toBe('Left Torso:');
      expect(locationHeaders[3]).toBe('Right Torso:');
      expect(locationHeaders[4]).toBe('Center Torso:');
      expect(locationHeaders[5]).toBe('Head:');
      expect(locationHeaders[6]).toBe('Left Leg:');
      expect(locationHeaders[7]).toBe('Right Leg:');
    });

    it('should pad all locations to 12 slots', () => {
      const unit = createMinimalUnit({
        criticalSlots: {
          HEAD: ['Sensors', 'Cockpit'],
          LEFT_ARM: ['Shoulder', 'Upper Arm Actuator'],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      });
      const result = service.export(unit);

      const lines = result.content!.split('\n');
      const headIndex = lines.indexOf('Head:');
      const headSlots = lines.slice(headIndex + 1, headIndex + 13);

      expect(headSlots).toHaveLength(12);
      expect(headSlots[0]).toBe('Sensors');
      expect(headSlots[1]).toBe('Cockpit');
      for (let i = 2; i < 12; i++) {
        expect(headSlots[i]).toBe('-Empty-');
      }
    });

    it('should output null slots as -Empty-', () => {
      const unit = createMinimalUnit({
        criticalSlots: {
          HEAD: ['Sensors', null, 'Cockpit', null, null, null],
          LEFT_ARM: [],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      });
      const result = service.export(unit);

      const lines = result.content!.split('\n');
      const headIndex = lines.indexOf('Head:');
      const headSlots = lines.slice(headIndex + 1, headIndex + 13);

      expect(headSlots[0]).toBe('Sensors');
      expect(headSlots[1]).toBe('-Empty-');
      expect(headSlots[2]).toBe('Cockpit');
      expect(headSlots[3]).toBe('-Empty-');
    });

    it('should output equipment slots correctly', () => {
      const unit = createMinimalUnit({
        criticalSlots: {
          HEAD: [],
          LEFT_ARM: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            'Medium Laser',
          ],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      });
      const result = service.export(unit);

      const lines = result.content!.split('\n');
      const leftArmIndex = lines.indexOf('Left Arm:');
      const leftArmSlots = lines.slice(leftArmIndex + 1, leftArmIndex + 13);

      expect(leftArmSlots[0]).toBe('Shoulder');
      expect(leftArmSlots[1]).toBe('Upper Arm Actuator');
      expect(leftArmSlots[2]).toBe('Lower Arm Actuator');
      expect(leftArmSlots[3]).toBe('Hand Actuator');
      expect(leftArmSlots[4]).toBe('Medium Laser');
      expect(leftArmSlots[5]).toBe('-Empty-');
    });

    it('should handle locations with no slots defined', () => {
      const unit = createMinimalUnit({
        criticalSlots: {
          HEAD: [],
          LEFT_ARM: [],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      });
      const result = service.export(unit);

      const lines = result.content!.split('\n');
      const leftArmIndex = lines.indexOf('Left Arm:');
      const leftArmSlots = lines.slice(leftArmIndex + 1, leftArmIndex + 13);

      expect(leftArmSlots).toHaveLength(12);
      leftArmSlots.forEach((slot) => {
        expect(slot).toBe('-Empty-');
      });
    });

    it('should handle missing locations in criticalSlots object', () => {
      const unit = createMinimalUnit();
      // Override with incomplete criticals to test handling of missing locations
      (
        unit as { criticalSlots: Record<string, (string | null)[]> }
      ).criticalSlots = {
        HEAD: ['Sensors'],
        LEFT_ARM: ['Shoulder'],
        // Missing RIGHT_ARM, LEFT_TORSO, RIGHT_TORSO, CENTER_TORSO, LEFT_LEG, RIGHT_LEG
      };
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Right Arm:');
      expect(result.content).toContain('Left Torso:');
    });

    it('should handle exactly 12 slots without adding padding', () => {
      const fullSlots: (string | null)[] = Array<string>(12).fill('Equipment');
      const unit = createMinimalUnit({
        criticalSlots: {
          HEAD: [] as (string | null)[],
          LEFT_ARM: fullSlots,
          RIGHT_ARM: [] as (string | null)[],
          LEFT_TORSO: [] as (string | null)[],
          RIGHT_TORSO: [] as (string | null)[],
          CENTER_TORSO: [] as (string | null)[],
          LEFT_LEG: [] as (string | null)[],
          RIGHT_LEG: [] as (string | null)[],
        },
      });
      const result = service.export(unit);

      const lines = result.content!.split('\n');
      const leftArmIndex = lines.indexOf('Left Arm:');
      const leftArmSlots = lines.slice(leftArmIndex + 1, leftArmIndex + 13);

      expect(leftArmSlots).toHaveLength(12);
      leftArmSlots.forEach((slot) => {
        expect(slot).toBe('Equipment');
      });
    });
  });
});
