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

  describe('OmniMech Round-Trip', () => {
    const parser = getMTFParserService();

    it('should preserve isOmni flag through export and re-parse', () => {
      const unit: ISerializedUnit = {
        id: 'test-omni',
        chassis: 'Test OmniMech',
        model: 'Prime',
        unitType: 'BattleMech',
        configuration: 'BIPED',
        techBase: 'CLAN',
        rulesLevel: 'STANDARD',
        era: 'Clan Invasion',
        year: 3050,
        tonnage: 50,
        isOmni: true,
        baseChassisHeatSinks: 10,
        engine: { type: 'XL', rating: 250 },
        gyro: { type: 'STANDARD' },
        cockpit: 'Standard',
        structure: { type: 'ENDO_STEEL' },
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 9,
            CENTER_TORSO: { front: 20, rear: 10 },
            LEFT_TORSO: { front: 16, rear: 8 },
            RIGHT_TORSO: { front: 16, rear: 8 },
            LEFT_ARM: 12,
            RIGHT_ARM: 12,
            LEFT_LEG: 16,
            RIGHT_LEG: 16,
          },
        },
        heatSinks: { type: 'DOUBLE', count: 10 },
        movement: { walk: 5, jump: 0 },
        equipment: [
          {
            id: 'ER Medium Laser',
            location: 'Left Arm',
            isOmniPodMounted: true,
          },
          {
            id: 'ER Medium Laser',
            location: 'Right Arm',
            isOmniPodMounted: true,
          },
        ],
        criticalSlots: {
          HEAD: [
            'Life Support',
            'Sensors',
            'Cockpit',
            null,
            'Sensors',
            'Life Support',
          ],
          LEFT_ARM: [],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      };

      // Export to MTF
      const exportResult = service.export(unit);
      expect(exportResult.success).toBe(true);

      // Parse the exported MTF
      const parseResult = parser.parse(exportResult.content!);
      expect(parseResult.success).toBe(true);
      expect(parseResult.unit).toBeDefined();
      const parsedUnit = parseResult.unit!;

      // Verify isOmni is preserved
      expect(parsedUnit.isOmni).toBe(true);
    });

    it('should preserve isOmniPodMounted through export and re-parse', () => {
      const unit: ISerializedUnit = {
        id: 'test-omni-pod',
        chassis: 'Test OmniMech',
        model: 'A',
        unitType: 'BattleMech',
        configuration: 'BIPED',
        techBase: 'CLAN',
        rulesLevel: 'STANDARD',
        era: 'Clan Invasion',
        year: 3050,
        tonnage: 50,
        isOmni: true,
        baseChassisHeatSinks: 10,
        engine: { type: 'XL', rating: 250 },
        gyro: { type: 'STANDARD' },
        cockpit: 'Standard',
        structure: { type: 'STANDARD' },
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 9,
            CENTER_TORSO: { front: 20, rear: 10 },
            LEFT_TORSO: { front: 16, rear: 8 },
            RIGHT_TORSO: { front: 16, rear: 8 },
            LEFT_ARM: 12,
            RIGHT_ARM: 12,
            LEFT_LEG: 16,
            RIGHT_LEG: 16,
          },
        },
        heatSinks: { type: 'DOUBLE', count: 10 },
        movement: { walk: 5, jump: 0 },
        equipment: [
          {
            id: 'ER Large Laser',
            location: 'Left Arm',
            isOmniPodMounted: true,
          },
          {
            id: 'Medium Pulse Laser',
            location: 'Center Torso',
            isOmniPodMounted: false,
          },
        ],
        criticalSlots: {
          HEAD: [
            'Life Support',
            'Sensors',
            'Cockpit',
            null,
            'Sensors',
            'Life Support',
          ],
          LEFT_ARM: [],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      };

      // Export to MTF
      const exportResult = service.export(unit);
      expect(exportResult.success).toBe(true);

      // Parse the exported MTF
      const parseResult = parser.parse(exportResult.content!);
      expect(parseResult.success).toBe(true);
      expect(parseResult.unit).toBeDefined();
      const parsedUnit = parseResult.unit!;

      // Verify equipment isOmniPodMounted is preserved
      const equipment = parsedUnit.equipment ?? [];

      // Note: Parser normalizes equipment IDs to lowercase-with-dashes
      const podMountedLaser = equipment.find((e) =>
        e.id.includes('er-large-laser'),
      );
      const fixedLaser = equipment.find((e) =>
        e.id.includes('medium-pulse-laser'),
      );

      expect(podMountedLaser?.isOmniPodMounted).toBe(true);
      // Fixed equipment should not have isOmniPodMounted or it should be false/undefined
      expect(fixedLaser?.isOmniPodMounted).toBeFalsy();
    });

    it('should preserve baseChassisHeatSinks through export and re-parse', () => {
      const unit: ISerializedUnit = {
        id: 'test-omni-hs',
        chassis: 'Test OmniMech',
        model: 'Prime',
        unitType: 'BattleMech',
        configuration: 'BIPED',
        techBase: 'CLAN',
        rulesLevel: 'STANDARD',
        era: 'Clan Invasion',
        year: 3050,
        tonnage: 75,
        isOmni: true,
        baseChassisHeatSinks: 15,
        engine: { type: 'XL', rating: 375 },
        gyro: { type: 'STANDARD' },
        cockpit: 'Standard',
        structure: { type: 'STANDARD' },
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 9,
            CENTER_TORSO: { front: 20, rear: 10 },
            LEFT_TORSO: { front: 16, rear: 8 },
            RIGHT_TORSO: { front: 16, rear: 8 },
            LEFT_ARM: 12,
            RIGHT_ARM: 12,
            LEFT_LEG: 16,
            RIGHT_LEG: 16,
          },
        },
        heatSinks: { type: 'DOUBLE', count: 15 },
        movement: { walk: 5, jump: 0 },
        equipment: [],
        criticalSlots: {
          HEAD: [
            'Life Support',
            'Sensors',
            'Cockpit',
            null,
            'Sensors',
            'Life Support',
          ],
          LEFT_ARM: [],
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      };

      // Export to MTF
      const exportResult = service.export(unit);
      expect(exportResult.success).toBe(true);

      // Parse the exported MTF
      const parseResult = parser.parse(exportResult.content!);
      expect(parseResult.success).toBe(true);
      expect(parseResult.unit).toBeDefined();
      const parsedUnit = parseResult.unit!;

      // Verify baseChassisHeatSinks is preserved
      expect(parsedUnit.baseChassisHeatSinks).toBe(15);
    });
  });
});
