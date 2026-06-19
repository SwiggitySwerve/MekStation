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

  describe('OmniMech Variant Workflow', () => {
    const parser = getMTFParserService();

    it('should support variant switching workflow: Prime -> reset -> A variant', () => {
      // Step 1: Start with Prime variant (has pod equipment)
      const primeVariant: ISerializedUnit = {
        id: 'test-omni-prime',
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
        baseChassisHeatSinks: 12,
        engine: { type: 'XL', rating: 375 },
        gyro: { type: 'STANDARD' },
        cockpit: 'Standard',
        structure: { type: 'ENDO_STEEL' },
        armor: {
          type: 'FERRO_FIBROUS',
          allocation: {
            HEAD: 9,
            CENTER_TORSO: { front: 36, rear: 11 },
            LEFT_TORSO: { front: 24, rear: 8 },
            RIGHT_TORSO: { front: 24, rear: 8 },
            LEFT_ARM: 24,
            RIGHT_ARM: 24,
            LEFT_LEG: 32,
            RIGHT_LEG: 32,
          },
        },
        heatSinks: { type: 'DOUBLE', count: 12 },
        movement: { walk: 5, jump: 0 },
        equipment: [
          // Fixed equipment (stays after reset)
          {
            id: 'Targeting Computer',
            location: 'Right Torso',
            isOmniPodMounted: false,
          },
          // Pod equipment (removed on reset)
          {
            id: 'ER Large Laser',
            location: 'Left Arm',
            isOmniPodMounted: true,
          },
          {
            id: 'ER Large Laser',
            location: 'Right Arm',
            isOmniPodMounted: true,
          },
          { id: 'LRM 20', location: 'Left Torso', isOmniPodMounted: true },
          { id: 'LRM 20', location: 'Right Torso', isOmniPodMounted: true },
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

      // Verify Prime has 5 equipment items
      expect(primeVariant.equipment.length).toBe(5);

      // Step 2: Simulate chassis reset (filter out pod equipment)
      const fixedEquipment = primeVariant.equipment.filter(
        (eq) => !eq.isOmniPodMounted,
      );
      expect(fixedEquipment.length).toBe(1);
      expect(fixedEquipment[0].id).toBe('Targeting Computer');

      // Step 3: Create A variant with different pod loadout
      const aVariant: ISerializedUnit = {
        ...primeVariant,
        id: 'test-omni-a',
        model: 'A',
        equipment: [
          // Keep fixed equipment
          ...fixedEquipment,
          // Add new pod equipment for A variant
          { id: 'Ultra AC/5', location: 'Right Arm', isOmniPodMounted: true },
          { id: 'Ultra AC/5', location: 'Left Arm', isOmniPodMounted: true },
          { id: 'SRM 6', location: 'Center Torso', isOmniPodMounted: true },
          {
            id: 'Medium Pulse Laser',
            location: 'Left Torso',
            isOmniPodMounted: true,
          },
          {
            id: 'Medium Pulse Laser',
            location: 'Right Torso',
            isOmniPodMounted: true,
          },
        ],
      };

      // Step 4: Export A variant
      const exportResult = service.export(aVariant);
      expect(exportResult.success).toBe(true);

      // Verify export contains correct model
      expect(exportResult.content).toContain('model:A');

      // Verify fixed equipment has no (omnipod) suffix
      expect(exportResult.content).toContain('Targeting Computer, Right Torso');
      expect(exportResult.content).not.toContain(
        'Targeting Computer (omnipod)',
      );

      // Verify pod equipment has (omnipod) suffix
      expect(exportResult.content).toContain('Ultra AC/5 (omnipod), Right Arm');
      expect(exportResult.content).toContain('SRM 6 (omnipod), Center Torso');

      // Step 5: Parse back and verify
      const parseResult = parser.parse(exportResult.content!);
      expect(parseResult.success).toBe(true);
      expect(parseResult.unit).toBeDefined();
      const parsedUnit = parseResult.unit!;

      // Verify model is A
      expect(parsedUnit.model).toBe('A');

      // Verify equipment count and pod status
      const equipment = parsedUnit.equipment ?? [];
      expect(equipment.length).toBe(6); // 1 fixed + 5 pod

      // Find fixed targeting computer
      const fixedTC = equipment.find((e) =>
        e.id.includes('targeting-computer'),
      );
      expect(fixedTC?.isOmniPodMounted).toBeFalsy();

      // Find pod-mounted weapons
      const podWeapons = equipment.filter((e) => e.isOmniPodMounted === true);
      expect(podWeapons.length).toBe(5);
    });

    it('should preserve OmniMech configuration through multiple variant switches', () => {
      // Create base chassis config
      const baseUnit: ISerializedUnit = {
        id: 'multi-variant-test',
        chassis: 'Variant Test',
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
        clanName: 'Test Totem',
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

      // Export -> Parse -> Export -> Parse (double round-trip)
      const export1 = service.export(baseUnit);
      expect(export1.success).toBe(true);

      const parse1 = parser.parse(export1.content!);
      expect(parse1.success).toBe(true);
      expect(parse1.unit).toBeDefined();
      const unit1 = parse1.unit!;

      // Verify first parse preserved OmniMech fields
      expect(unit1.isOmni).toBe(true);
      expect(unit1.baseChassisHeatSinks).toBe(10);

      // Second export/parse cycle
      const export2 = service.export(unit1 as ISerializedUnit);
      expect(export2.success).toBe(true);

      const parse2 = parser.parse(export2.content!);
      expect(parse2.success).toBe(true);
      expect(parse2.unit).toBeDefined();
      const unit2 = parse2.unit!;

      // Verify OmniMech fields still preserved after double round-trip
      expect(unit2.isOmni).toBe(true);
      expect(unit2.baseChassisHeatSinks).toBe(10);

      // Verify fixed equipment preserved
      const fixedEquip = unit2.equipment?.find((e) => !e.isOmniPodMounted);
      expect(fixedEquip).toBeDefined();
      expect(fixedEquip!.id).toContain('er-medium-laser');
    });
  });
});
