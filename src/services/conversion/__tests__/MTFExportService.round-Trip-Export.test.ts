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

  describe('Round-Trip Export', () => {
    it('should export a complete unit with all features', () => {
      const completeUnit: ISerializedUnit = {
        id: 'atlas-as7-d',
        chassis: 'Atlas',
        model: 'AS7-D',
        unitType: 'BattleMech',
        configuration: 'BIPED',
        techBase: 'INNER_SPHERE',
        rulesLevel: 'STANDARD',
        era: 'Succession Wars',
        year: 2755,
        tonnage: 100,
        engine: { type: 'FUSION', rating: 300 },
        gyro: { type: 'STANDARD' },
        cockpit: 'Standard',
        structure: { type: 'STANDARD' },
        armor: {
          type: 'STANDARD',
          allocation: {
            HEAD: 9,
            CENTER_TORSO: { front: 47, rear: 14 },
            LEFT_TORSO: { front: 32, rear: 10 },
            RIGHT_TORSO: { front: 32, rear: 10 },
            LEFT_ARM: 34,
            RIGHT_ARM: 34,
            LEFT_LEG: 41,
            RIGHT_LEG: 41,
          },
        },
        heatSinks: { type: 'SINGLE', count: 20 },
        movement: { walk: 3, jump: 0 },
        equipment: [
          { id: 'ac-20', location: 'RIGHT_TORSO' },
          { id: 'lrm-20', location: 'LEFT_TORSO' },
          { id: 'medium-laser', location: 'RIGHT_ARM' },
          { id: 'medium-laser', location: 'LEFT_ARM' },
          { id: 'srm-6', location: 'CENTER_TORSO' },
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
          LEFT_ARM: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            'Medium Laser',
          ],
          RIGHT_ARM: [
            'Shoulder',
            'Upper Arm Actuator',
            'Lower Arm Actuator',
            'Hand Actuator',
            'Medium Laser',
          ],
          LEFT_TORSO: ['LRM 20', 'LRM 20', 'LRM 20', 'LRM 20', 'LRM 20'],
          RIGHT_TORSO: [
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
            'AC/20',
          ],
          CENTER_TORSO: [
            'Fusion Engine',
            'Fusion Engine',
            'Fusion Engine',
            'Gyro',
            'Gyro',
            'Gyro',
            'Gyro',
            'Fusion Engine',
            'Fusion Engine',
            'Fusion Engine',
            'SRM 6',
            'SRM 6',
          ],
          LEFT_LEG: [
            'Hip',
            'Upper Leg Actuator',
            'Lower Leg Actuator',
            'Foot Actuator',
          ],
          RIGHT_LEG: [
            'Hip',
            'Upper Leg Actuator',
            'Lower Leg Actuator',
            'Foot Actuator',
          ],
        },
        quirks: ['battle_fists_la', 'battle_fists_ra'],
        fluff: {
          overview:
            'The Atlas is one of the most feared BattleMechs in existence.',
          capabilities:
            'The Atlas is capable of destroying nearly any other BattleMech in one-on-one combat.',
          deployment: 'Atlas are prized and protected command units.',
          history: 'Developed by the Star League.',
          manufacturer: 'Defiance Industries',
          primaryFactory: 'Hesperus II',
          systemManufacturer: {
            Engine: 'Vlar 300',
            Armor: 'Durallex Special Heavy',
          },
        },
      };

      const result = service.export(completeUnit);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.errors).toHaveLength(0);

      // Verify key sections exist
      expect(result.content).toContain('chassis:Atlas');
      expect(result.content).toContain('model:AS7-D');
      expect(result.content).toContain('Config:Biped');
      expect(result.content).toContain('techbase:Inner Sphere');
      expect(result.content).toContain('era:2755');
      expect(result.content).toContain('rules level:2');
      expect(result.content).toContain('mass:100');
      expect(result.content).toContain('engine:300 Fusion Engine');
      expect(result.content).toContain('structure:IS Standard');
      expect(result.content).toContain('heat sinks:20 Single');
      expect(result.content).toContain('walk mp:3');
      expect(result.content).toContain('jump mp:0');
      expect(result.content).toContain('armor:Standard(Inner Sphere)');
      expect(result.content).toContain('Weapons:5');
      expect(result.content).toContain('quirk:battle_fists_la');
      expect(result.content).toContain(
        'overview:The Atlas is one of the most feared BattleMechs in existence.',
      );
    });

    it('should export a Clan tech unit correctly', () => {
      const clanUnit = createMinimalUnit({
        chassis: 'Mad Cat',
        model: 'Prime',
        techBase: 'CLAN',
        engine: { type: 'XL_CLAN', rating: 300 },
        structure: { type: 'ENDO_STEEL_CLAN' },
        armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS_CLAN' },
        heatSinks: { type: 'DOUBLE_CLAN', count: 20 },
      });

      const result = service.export(clanUnit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('chassis:Mad Cat');
      expect(result.content).toContain('model:Prime');
      expect(result.content).toContain('techbase:Clan');
      expect(result.content).toContain('engine:300 XL Fusion Engine (Clan)');
      expect(result.content).toContain('structure:Clan Endo Steel');
      expect(result.content).toContain('armor:Ferro-Fibrous(Clan)');
      expect(result.content).toContain('heat sinks:20 Double');
    });

    it('should export a mixed tech unit correctly', () => {
      const mixedUnit = createMinimalUnit({
        techBase: 'MIXED',
        engine: { type: 'XL_IS', rating: 250 },
        heatSinks: { type: 'DOUBLE_CLAN', count: 15 },
      });

      const result = service.export(mixedUnit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('techbase:Mixed');
      expect(result.content).toContain('engine:250 XL Fusion Engine');
      expect(result.content).toContain('heat sinks:15 Double');
    });

    it('should export a quad mech correctly', () => {
      const quadUnit = createMinimalUnit({
        configuration: 'QUAD',
        criticalSlots: {
          HEAD: [],
          LEFT_ARM: [], // Quads still use arm locations but they're legs
          RIGHT_ARM: [],
          LEFT_TORSO: [],
          RIGHT_TORSO: [],
          CENTER_TORSO: [],
          LEFT_LEG: [],
          RIGHT_LEG: [],
        },
      });

      const result = service.export(quadUnit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Config:Quad');
    });

    it('should handle units with advanced technology', () => {
      const advancedUnit = createMinimalUnit({
        rulesLevel: 'ADVANCED',
        engine: { type: 'XXL', rating: 400 },
        structure: { type: 'ENDO_COMPOSITE' },
        armor: { ...createMinimalUnit().armor, type: 'STEALTH' },
      });

      const result = service.export(advancedUnit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('rules level:3');
      expect(result.content).toContain('engine:400 XXL Fusion Engine');
      expect(result.content).toContain('structure:Endo-Composite');
      expect(result.content).toContain('armor:Stealth');
    });

    it('should handle experimental technology', () => {
      const experimentalUnit = createMinimalUnit({
        rulesLevel: 'EXPERIMENTAL',
        structure: { type: 'REINFORCED' },
        armor: { ...createMinimalUnit().armor, type: 'HARDENED' },
      });

      const result = service.export(experimentalUnit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('rules level:4');
      expect(result.content).toContain('structure:Reinforced');
      expect(result.content).toContain('armor:Hardened');
    });
  });
});
