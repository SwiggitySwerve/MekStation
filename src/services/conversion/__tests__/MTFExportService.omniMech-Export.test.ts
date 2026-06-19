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

  describe('OmniMech Export', () => {
    const createOmniMechUnit = (
      overrides?: Partial<ISerializedUnit>,
    ): ISerializedUnit => ({
      id: 'mad-cat-prime',
      chassis: 'Mad Cat',
      model: 'Prime',
      unitType: 'BattleMech',
      configuration: 'BIPED',
      techBase: 'CLAN',
      rulesLevel: 'STANDARD',
      era: 'Clan Invasion',
      year: 3049,
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
        { id: 'ER Large Laser', location: 'Left Arm', isOmniPodMounted: true },
        { id: 'ER Large Laser', location: 'Right Arm', isOmniPodMounted: true },
        { id: 'LRM 20', location: 'Left Torso', isOmniPodMounted: true },
        { id: 'LRM 20', location: 'Right Torso', isOmniPodMounted: true },
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
      ...overrides,
    });

    it('should export OmniMech with Config:Biped Omnimech', () => {
      const unit = createOmniMechUnit();
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Config:Biped Omnimech');
    });

    it('should export base chassis heat sinks for OmniMech', () => {
      const unit = createOmniMechUnit();
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Base Chassis Heat Sinks:12');
    });

    it('should add (omnipod) suffix to pod-mounted equipment', () => {
      const unit = createOmniMechUnit();
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('ER Large Laser (omnipod), Left Arm');
      expect(result.content).toContain('LRM 20 (omnipod), Left Torso');
    });

    it('should NOT add (omnipod) suffix to fixed equipment', () => {
      const unit = createOmniMechUnit();
      const result = service.export(unit);

      expect(result.success).toBe(true);
      // Fixed equipment should not have (omnipod)
      expect(result.content).toContain('Medium Pulse Laser, Center Torso');
      expect(result.content).not.toContain('Medium Pulse Laser (omnipod)');
    });
  });
});
