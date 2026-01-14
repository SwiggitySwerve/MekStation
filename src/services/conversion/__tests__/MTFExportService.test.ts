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

import { MTFExportService, getMTFExportService } from '@/services/conversion/MTFExportService';
import { MTFParserService } from '@/services/conversion/MTFParserService';
import { ISerializedUnit, ISerializedFluff } from '@/types/unit/UnitSerialization';

describe('MTFExportService', () => {
  let service: MTFExportService;

  beforeEach(() => {
    service = getMTFExportService();
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getMTFExportService();
      const instance2 = getMTFExportService();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance from static method', () => {
      const instance1 = MTFExportService.getInstance();
      const instance2 = MTFExportService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // ============================================================================
  // Helper: Create Minimal Valid Unit
  // ============================================================================
  const createMinimalUnit = (overrides?: Partial<ISerializedUnit>): ISerializedUnit => ({
    id: 'test-mech-1',
    chassis: 'TestMech',
    model: 'TST-1',
    unitType: 'BattleMech',
    configuration: 'BIPED',
    techBase: 'INNER_SPHERE',
    rulesLevel: 'STANDARD',
    era: 'Succession Wars',
    year: 3025,
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
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
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [],
    criticalSlots: {
      HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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

  // ============================================================================
  // export() - Main Export Function
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

      expect(result.content).toContain('# MegaMek Data (C) 2025 by The MegaMek Team');
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

  // ============================================================================
  // formatConfig() - Configuration Formatting
  // ============================================================================
  describe('formatConfig()', () => {
    it('should format BIPED configuration', () => {
      const unit = createMinimalUnit({ configuration: 'BIPED' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:Biped');
    });

    it('should format QUAD configuration', () => {
      const unit = createMinimalUnit({ configuration: 'QUAD' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:Quad');
    });

    it('should format TRIPOD configuration', () => {
      const unit = createMinimalUnit({ configuration: 'TRIPOD' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:Tripod');
    });

    it('should format LAM configuration', () => {
      const unit = createMinimalUnit({ configuration: 'LAM' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:LAM');
    });

    it('should format QUADVEE configuration', () => {
      const unit = createMinimalUnit({ configuration: 'QUADVEE' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:QuadVee');
    });

    it('should pass through unknown configurations', () => {
      const unit = createMinimalUnit({ configuration: 'UNKNOWN_CONFIG' });
      const result = service.export(unit);

      expect(result.content).toContain('Config:UNKNOWN_CONFIG');
    });
  });

  // ============================================================================
  // formatTechBase() - Tech Base Formatting
  // ============================================================================
  describe('formatTechBase()', () => {
    it('should format INNER_SPHERE tech base', () => {
      const unit = createMinimalUnit({ techBase: 'INNER_SPHERE' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Inner Sphere');
    });

    it('should format CLAN tech base', () => {
      const unit = createMinimalUnit({ techBase: 'CLAN' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Clan');
    });

    it('should format MIXED tech base', () => {
      const unit = createMinimalUnit({ techBase: 'MIXED' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Mixed');
    });

    it('should default unknown tech bases to Inner Sphere', () => {
      const unit = createMinimalUnit({ techBase: 'UNKNOWN' });
      const result = service.export(unit);

      expect(result.content).toContain('techbase:Inner Sphere');
    });
  });

  // ============================================================================
  // formatRulesLevel() - Rules Level Formatting
  // ============================================================================
  describe('formatRulesLevel()', () => {
    it('should format INTRODUCTORY rules level as 1', () => {
      const unit = createMinimalUnit({ rulesLevel: 'INTRODUCTORY' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:1');
    });

    it('should format STANDARD rules level as 2', () => {
      const unit = createMinimalUnit({ rulesLevel: 'STANDARD' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:2');
    });

    it('should format ADVANCED rules level as 3', () => {
      const unit = createMinimalUnit({ rulesLevel: 'ADVANCED' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:3');
    });

    it('should format EXPERIMENTAL rules level as 4', () => {
      const unit = createMinimalUnit({ rulesLevel: 'EXPERIMENTAL' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:4');
    });

    it('should default unknown rules levels to 2', () => {
      const unit = createMinimalUnit({ rulesLevel: 'UNKNOWN' });
      const result = service.export(unit);

      expect(result.content).toContain('rules level:2');
    });
  });

  // ============================================================================
  // formatEngineType() - Engine Type Formatting
  // ============================================================================
  describe('formatEngineType()', () => {
    it('should format FUSION engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'FUSION', rating: 200 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fusion Engine');
    });

    it('should format STANDARD engine as Fusion', () => {
      const unit = createMinimalUnit({ engine: { type: 'STANDARD', rating: 200 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fusion Engine');
    });

    it('should format XL engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'XL', rating: 300 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:300 XL Fusion Engine');
    });

    it('should format XL_IS engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'XL_IS', rating: 300 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:300 XL Fusion Engine');
    });

    it('should format XL_CLAN engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'XL_CLAN', rating: 300 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:300 XL Fusion Engine (Clan)');
    });

    it('should format LIGHT engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'LIGHT', rating: 250 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:250 Light Fusion Engine');
    });

    it('should format COMPACT engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'COMPACT', rating: 150 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:150 Compact Fusion Engine');
    });

    it('should format XXL engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'XXL', rating: 400 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:400 XXL Fusion Engine');
    });

    it('should format ICE engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'ICE', rating: 100 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:100 ICE Engine');
    });

    it('should format FUEL_CELL engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'FUEL_CELL', rating: 180 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:180 Fuel Cell Engine');
    });

    it('should format FISSION engine', () => {
      const unit = createMinimalUnit({ engine: { type: 'FISSION', rating: 200 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fission Engine');
    });

    it('should default unknown engine types to Fusion', () => {
      const unit = createMinimalUnit({ engine: { type: 'UNKNOWN', rating: 200 } });
      const result = service.export(unit);

      expect(result.content).toContain('engine:200 Fusion Engine');
    });
  });

  // ============================================================================
  // Structure Type Formatting
  // ============================================================================
  describe('Structure Type Formatting', () => {
    it('should format STANDARD structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'STANDARD' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Standard');
    });

    it('should format ENDO_STEEL structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_STEEL' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Endo Steel');
    });

    it('should format ENDO_STEEL_IS structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_STEEL_IS' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Endo Steel');
    });

    it('should format ENDO_STEEL_CLAN structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_STEEL_CLAN' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Clan Endo Steel');
    });

    it('should format ENDO_COMPOSITE structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'ENDO_COMPOSITE' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Endo-Composite');
    });

    it('should format REINFORCED structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'REINFORCED' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Reinforced');
    });

    it('should format COMPOSITE structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'COMPOSITE' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Composite');
    });

    it('should format INDUSTRIAL structure', () => {
      const unit = createMinimalUnit({ structure: { type: 'INDUSTRIAL' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:Industrial');
    });

    it('should default unknown structure types to IS Standard', () => {
      const unit = createMinimalUnit({ structure: { type: 'UNKNOWN' } });
      const result = service.export(unit);

      expect(result.content).toContain('structure:IS Standard');
    });
  });

  // ============================================================================
  // Heat Sink Type Formatting
  // ============================================================================
  describe('Heat Sink Type Formatting', () => {
    it('should format SINGLE heat sinks', () => {
      const unit = createMinimalUnit({ heatSinks: { type: 'SINGLE', count: 10 } });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:10 Single');
    });

    it('should format DOUBLE heat sinks', () => {
      const unit = createMinimalUnit({ heatSinks: { type: 'DOUBLE', count: 15 } });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:15 Double');
    });

    it('should format DOUBLE_IS heat sinks', () => {
      const unit = createMinimalUnit({ heatSinks: { type: 'DOUBLE_IS', count: 15 } });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:15 Double');
    });

    it('should format DOUBLE_CLAN heat sinks', () => {
      const unit = createMinimalUnit({ heatSinks: { type: 'DOUBLE_CLAN', count: 20 } });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:20 Double');
    });

    it('should default unknown heat sink types to Single', () => {
      const unit = createMinimalUnit({ heatSinks: { type: 'UNKNOWN', count: 10 } });
      const result = service.export(unit);

      expect(result.content).toContain('heat sinks:10 Single');
    });
  });

  // ============================================================================
  // Armor Type Formatting
  // ============================================================================
  describe('Armor Type Formatting', () => {
    it('should format STANDARD armor', () => {
      const unit = createMinimalUnit();
      const result = service.export(unit);

      expect(result.content).toContain('armor:Standard(Inner Sphere)');
    });

    it('should format FERRO_FIBROUS armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Ferro-Fibrous');
    });

    it('should format FERRO_FIBROUS_IS armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS_IS' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Ferro-Fibrous');
    });

    it('should format FERRO_FIBROUS_CLAN armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'FERRO_FIBROUS_CLAN' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Ferro-Fibrous(Clan)');
    });

    it('should format LIGHT_FERRO armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'LIGHT_FERRO' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Light Ferro-Fibrous');
    });

    it('should format HEAVY_FERRO armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'HEAVY_FERRO' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Heavy Ferro-Fibrous');
    });

    it('should format STEALTH armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'STEALTH' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Stealth');
    });

    it('should format REACTIVE armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'REACTIVE' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Reactive');
    });

    it('should format REFLECTIVE armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'REFLECTIVE' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Reflective');
    });

    it('should format HARDENED armor', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'HARDENED' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Hardened');
    });

    it('should default unknown armor types to Standard', () => {
      const unit = createMinimalUnit({ armor: { ...createMinimalUnit().armor, type: 'UNKNOWN' } });
      const result = service.export(unit);

      expect(result.content).toContain('armor:Standard(Inner Sphere)');
    });
  });

  // ============================================================================
  // Armor Values Formatting
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

  // ============================================================================
  // formatEquipmentName() - Equipment Name Formatting
  // ============================================================================
  describe('formatEquipmentName()', () => {
    it('should format medium-laser', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'medium-laser', location: 'RIGHT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Medium Laser, Right Arm');
    });

    it('should format small-laser', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'small-laser', location: 'LEFT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Small Laser, Left Arm');
    });

    it('should format large-laser', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'large-laser', location: 'RIGHT_TORSO' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Large Laser, Right Torso');
    });

    it('should format ER lasers', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'er-medium-laser', location: 'RIGHT_ARM' },
          { id: 'er-small-laser', location: 'LEFT_ARM' },
          { id: 'er-large-laser', location: 'CENTER_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('ER Medium Laser, Right Arm');
      expect(result.content).toContain('ER Small Laser, Left Arm');
      expect(result.content).toContain('ER Large Laser, Center Torso');
    });

    it('should format PPCs', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'ppc', location: 'RIGHT_ARM' },
          { id: 'er-ppc', location: 'LEFT_ARM' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('PPC, Right Arm');
      expect(result.content).toContain('ER PPC, Left Arm');
    });

    it('should format LRMs', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'lrm-5', location: 'LEFT_TORSO' },
          { id: 'lrm-10', location: 'LEFT_TORSO' },
          { id: 'lrm-15', location: 'RIGHT_TORSO' },
          { id: 'lrm-20', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('LRM 5, Left Torso');
      expect(result.content).toContain('LRM 10, Left Torso');
      expect(result.content).toContain('LRM 15, Right Torso');
      expect(result.content).toContain('LRM 20, Right Torso');
    });

    it('should format SRMs', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'srm-2', location: 'LEFT_TORSO' },
          { id: 'srm-4', location: 'CENTER_TORSO' },
          { id: 'srm-6', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('SRM 2, Left Torso');
      expect(result.content).toContain('SRM 4, Center Torso');
      expect(result.content).toContain('SRM 6, Right Torso');
    });

    it('should format Autocannons', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'ac-2', location: 'LEFT_ARM' },
          { id: 'ac-5', location: 'RIGHT_ARM' },
          { id: 'ac-10', location: 'LEFT_TORSO' },
          { id: 'ac-20', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('AC/2, Left Arm');
      expect(result.content).toContain('AC/5, Right Arm');
      expect(result.content).toContain('AC/10, Left Torso');
      expect(result.content).toContain('AC/20, Right Torso');
    });

    it('should format machine guns and flamers', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'machine-gun', location: 'LEFT_ARM' },
          { id: 'flamer', location: 'RIGHT_ARM' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Machine Gun, Left Arm');
      expect(result.content).toContain('Flamer, Right Arm');
    });

    it('should format Gauss Rifle', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'gauss-rifle', location: 'RIGHT_TORSO' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Gauss Rifle, Right Torso');
    });

    it('should format unknown equipment by capitalizing words', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'unknown-weapon-system', location: 'CENTER_TORSO' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Unknown Weapon System, Center Torso');
    });

    it('should handle equipment with single word names', () => {
      const unit = createMinimalUnit({
        equipment: [{ id: 'hatchet', location: 'RIGHT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Hatchet, Right Arm');
    });

    it('should include weapon count in output', () => {
      const unit = createMinimalUnit({
        equipment: [
          { id: 'medium-laser', location: 'RIGHT_ARM' },
          { id: 'medium-laser', location: 'LEFT_ARM' },
          { id: 'ac-10', location: 'RIGHT_TORSO' },
        ],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Weapons:3');
    });

    it('should handle zero weapons', () => {
      const unit = createMinimalUnit({ equipment: [] });
      const result = service.export(unit);

      expect(result.content).toContain('Weapons:0');
    });

    it('should handle equipment with unknown location names', () => {
      const customLocation: string = 'CUSTOM_LOCATION';
      const unit = createMinimalUnit({
        equipment: [{ id: 'medium-laser', location: customLocation }],
      });
      const result = service.export(unit);

      expect(result.content).toContain('Medium Laser, CUSTOM_LOCATION');
    });
  });

  // ============================================================================
  // Critical Slots Formatting
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
        ].includes(line)
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
          LEFT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', 'Medium Laser'],
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
      (unit as { criticalSlots: Record<string, (string | null)[]> }).criticalSlots = {
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

  // ============================================================================
  // Quirks Formatting
  // ============================================================================
  describe('Quirks Formatting', () => {
    it('should include quirks section when present', () => {
      const unit = createMinimalUnit({
        quirks: ['battle_fists_la', 'battle_fists_ra'],
      });
      const result = service.export(unit);

      expect(result.content).toContain('quirk:battle_fists_la');
      expect(result.content).toContain('quirk:battle_fists_ra');
    });

    it('should omit quirks section when empty', () => {
      const unit = createMinimalUnit({ quirks: [] });
      const result = service.export(unit);

      expect(result.content).not.toContain('quirk:');
    });

    it('should omit quirks section when undefined', () => {
      const unit = createMinimalUnit() as ISerializedUnit & { quirks?: string[] };
      delete unit.quirks;
      const result = service.export(unit);

      expect(result.content).not.toContain('quirk:');
    });

    it('should output multiple quirks', () => {
      const unit = createMinimalUnit({
        quirks: ['improved_targeting_short', 'stable', 'difficult_maintain'],
      });
      const result = service.export(unit);

      expect(result.content).toContain('quirk:improved_targeting_short');
      expect(result.content).toContain('quirk:stable');
      expect(result.content).toContain('quirk:difficult_maintain');
    });
  });

  // ============================================================================
  // writeFluff() - Fluff Sections
  // ============================================================================
  describe('writeFluff()', () => {
    it('should include overview when present', () => {
      const fluff: ISerializedFluff = {
        overview: 'This is a test mech overview.',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain('overview:This is a test mech overview.');
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

      expect(result.content).toContain('history:Developed during the Succession Wars.');
    });

    it('should include manufacturer when present', () => {
      const fluff: ISerializedFluff = {
        manufacturer: 'Acme BattleMech Industries',
      };
      const unit = createMinimalUnit({ fluff });
      const result = service.export(unit);

      expect(result.content).toContain('manufacturer:Acme BattleMech Industries');
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
      expect(result.content).toContain('systemmanufacturer:Armor:Durallex Light');
      expect(result.content).toContain('systemmanufacturer:Communications:Tek BattleCom');
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

      expect(result.content).toContain('overview:A versatile medium BattleMech.');
      expect(result.content).toContain('capabilities:Well-balanced firepower and armor.');
      expect(result.content).toContain('deployment:Used throughout the Inner Sphere.');
      expect(result.content).toContain('history:One of the most successful designs.');
      expect(result.content).toContain('manufacturer:Bergan Industries');
      expect(result.content).toContain('primaryfactory:New Avalon');
      expect(result.content).toContain('systemmanufacturer:Engine:Omni 250');
      expect(result.content).toContain('systemmanufacturer:Armor:Starshield A');
    });

    it('should omit fluff section when undefined', () => {
      const unit = createMinimalUnit() as ISerializedUnit & { fluff?: ISerializedFluff };
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

      expect(result.content).toContain("overview:The Atlas is the Inner Sphere's most iconic assault 'Mech.");
      expect(result.content).toContain('manufacturer:Defiance Industries (A Division of GM)');
    });
  });

  // ============================================================================
  // Round-Trip Testing
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
          HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
          LEFT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', 'Medium Laser'],
          RIGHT_ARM: ['Shoulder', 'Upper Arm Actuator', 'Lower Arm Actuator', 'Hand Actuator', 'Medium Laser'],
          LEFT_TORSO: ['LRM 20', 'LRM 20', 'LRM 20', 'LRM 20', 'LRM 20'],
          RIGHT_TORSO: ['AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20', 'AC/20'],
          CENTER_TORSO: ['Fusion Engine', 'Fusion Engine', 'Fusion Engine', 'Gyro', 'Gyro', 'Gyro', 'Gyro', 'Fusion Engine', 'Fusion Engine', 'Fusion Engine', 'SRM 6', 'SRM 6'],
          LEFT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator'],
          RIGHT_LEG: ['Hip', 'Upper Leg Actuator', 'Lower Leg Actuator', 'Foot Actuator'],
        },
        quirks: ['battle_fists_la', 'battle_fists_ra'],
        fluff: {
          overview: 'The Atlas is one of the most feared BattleMechs in existence.',
          capabilities: 'The Atlas is capable of destroying nearly any other BattleMech in one-on-one combat.',
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
      expect(result.content).toContain('overview:The Atlas is one of the most feared BattleMechs in existence.');
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

  // ============================================================================
  // Edge Cases
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
        equipment: [{ id: 'super-long-experimental-weapon-name-that-goes-on-forever', location: 'RIGHT_ARM' }],
      });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Super Long Experimental Weapon Name That Goes On Forever');
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
      const unit = createMinimalUnit({ heatSinks: { type: 'SINGLE', count: 0 } });
      const result = service.export(unit);

      expect(result.success).toBe(true);
      expect(result.content).toContain('heat sinks:0 Single');
    });

    it('should handle very high heat sink count', () => {
      const unit = createMinimalUnit({ heatSinks: { type: 'DOUBLE', count: 50 } });
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

  // ============================================================================
  // OmniMech Export Tests
  // ============================================================================
  describe('OmniMech Export', () => {
    const createOmniMechUnit = (overrides?: Partial<ISerializedUnit>): ISerializedUnit => ({
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
        { id: 'Medium Pulse Laser', location: 'Center Torso', isOmniPodMounted: false },
      ],
      criticalSlots: {
        HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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

  // ============================================================================
  // OmniMech Round-Trip Tests
  // ============================================================================
  describe('OmniMech Round-Trip', () => {
    const parser = MTFParserService.getInstance();

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
          { id: 'ER Medium Laser', location: 'Left Arm', isOmniPodMounted: true },
          { id: 'ER Medium Laser', location: 'Right Arm', isOmniPodMounted: true },
        ],
        criticalSlots: {
          HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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
          { id: 'ER Large Laser', location: 'Left Arm', isOmniPodMounted: true },
          { id: 'Medium Pulse Laser', location: 'Center Torso', isOmniPodMounted: false },
        ],
        criticalSlots: {
          HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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
      const podMountedLaser = equipment.find(e => e.id.includes('er-large-laser'));
      const fixedLaser = equipment.find(e => e.id.includes('medium-pulse-laser'));

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
          HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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

  // ============================================================================
  // OmniMech Variant Workflow Tests
  // ============================================================================
  describe('OmniMech Variant Workflow', () => {
    const parser = MTFParserService.getInstance();

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
          { id: 'Targeting Computer', location: 'Right Torso', isOmniPodMounted: false },
          // Pod equipment (removed on reset)
          { id: 'ER Large Laser', location: 'Left Arm', isOmniPodMounted: true },
          { id: 'ER Large Laser', location: 'Right Arm', isOmniPodMounted: true },
          { id: 'LRM 20', location: 'Left Torso', isOmniPodMounted: true },
          { id: 'LRM 20', location: 'Right Torso', isOmniPodMounted: true },
        ],
        criticalSlots: {
          HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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
      const fixedEquipment = primeVariant.equipment.filter(eq => !eq.isOmniPodMounted);
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
          { id: 'Medium Pulse Laser', location: 'Left Torso', isOmniPodMounted: true },
          { id: 'Medium Pulse Laser', location: 'Right Torso', isOmniPodMounted: true },
        ],
      };

      // Step 4: Export A variant
      const exportResult = service.export(aVariant);
      expect(exportResult.success).toBe(true);

      // Verify export contains correct model
      expect(exportResult.content).toContain('model:A');

      // Verify fixed equipment has no (omnipod) suffix
      expect(exportResult.content).toContain('Targeting Computer, Right Torso');
      expect(exportResult.content).not.toContain('Targeting Computer (omnipod)');

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
      const fixedTC = equipment.find(e => e.id.includes('targeting-computer'));
      expect(fixedTC?.isOmniPodMounted).toBeFalsy();

      // Find pod-mounted weapons
      const podWeapons = equipment.filter(e => e.isOmniPodMounted === true);
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
          { id: 'ER Medium Laser', location: 'Center Torso', isOmniPodMounted: false },
        ],
        criticalSlots: {
          HEAD: ['Life Support', 'Sensors', 'Cockpit', null, 'Sensors', 'Life Support'],
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
      const fixedEquip = unit2.equipment?.find(e => !e.isOmniPodMounted);
      expect(fixedEquip).toBeDefined();
      expect(fixedEquip!.id).toContain('er-medium-laser');
    });
  });
});
