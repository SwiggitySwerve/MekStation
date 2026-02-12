/**
 * ParityValidationService Tests
 *
 * Tests for round-trip MTF validation service.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  ParityValidationService,
  getParityValidationService,
  resetParityValidationService,
} from '../ParityValidationService';
import { DiscrepancyCategory } from '../types/ParityValidation';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

// Mock the parser and exporter services
jest.mock('../MTFParserService', () => ({
  getMTFParserService: jest.fn(() => ({
    parse: jest.fn(),
  })),
  MTFParserService: jest.fn(),
}));

jest.mock('../MTFExportService', () => ({
  getMTFExportService: jest.fn(() => ({
    export: jest.fn(),
  })),
  MTFExportService: jest.fn(),
}));

import { getMTFExportService } from '../MTFExportService';
import { getMTFParserService } from '../MTFParserService';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe('ParityValidationService', () => {
  let service: ParityValidationService;
  let mockParser: { parse: jest.Mock };
  let mockExporter: { export: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup path mocks
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.dirname.mockImplementation((p) =>
      p.split('/').slice(0, -1).join('/'),
    );
    mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');

    // Setup parser mock
    mockParser = { parse: jest.fn() };
    (getMTFParserService as jest.Mock).mockReturnValue(mockParser);

    // Setup exporter mock
    mockExporter = { export: jest.fn() };
    (getMTFExportService as jest.Mock).mockReturnValue(mockExporter);

    resetParityValidationService();
    service = getParityValidationService();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = getParityValidationService();
      const instance2 = getParityValidationService();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateUnit', () => {
    const testMtfPath = '/test/meks/Atlas_AS7-D.mtf';
    const testOutputDir = '/test/output';

    it('should return PARSE_ERROR when file cannot be read', () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(result.status).toBe('PARSE_ERROR');
      expect(result.parseErrors).toContain('Error: File not found');
      expect(result.chassis).toBe('Unknown');
      expect(result.model).toBe('Unknown');
    });

    it('should return PARSE_ERROR when parser fails', () => {
      mockedFs.readFileSync.mockReturnValue('invalid mtf content');
      mockParser.parse.mockReturnValue({
        success: false,
        errors: ['Invalid MTF format'],
        unit: null,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(result.status).toBe('PARSE_ERROR');
      expect(result.parseErrors).toContain('Invalid MTF format');
    });

    it('should return PARSE_ERROR when export fails', () => {
      mockedFs.readFileSync.mockReturnValue('valid mtf content');
      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: false,
        errors: ['Export failed'],
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(result.status).toBe('PARSE_ERROR');
      expect(result.parseErrors).toContain('Export failed');
    });

    it('should return PASSED when content matches', () => {
      const mtfContent = `chassis:Atlas
model:AS7-D
Config:Biped
mass:100`;

      mockedFs.readFileSync.mockReturnValue(mtfContent);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: mtfContent, // Same content = no discrepancies
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(result.status).toBe('PASSED');
      expect(result.issues.length).toBe(0);
    });

    it('should return ISSUES_FOUND when content differs', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
mass:100`;

      const generatedMtf = `chassis:Atlas
model:AS7-K
mass:100`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(result.status).toBe('ISSUES_FOUND');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.HeaderMismatch,
        ),
      ).toBe(true);
    });

    it('should detect armor mismatches', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
LA armor:30`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
LA armor:25`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.ArmorMismatch,
        ),
      ).toBe(true);
    });

    it('should detect engine mismatches', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
engine:300 Fusion Engine`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
engine:300 XL Engine`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ),
      ).toBe(true);
    });

    it('should detect movement mismatches', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
walk mp:3
jump mp:0`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
walk mp:4
jump mp:0`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.MovementMismatch,
        ),
      ).toBe(true);
    });

    it('should detect quirk mismatches', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
quirk:battle_fists_la
quirk:battle_fists_ra`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
quirk:battle_fists_la`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.QuirkMismatch,
        ),
      ).toBe(true);
    });

    it('should ignore comments in comparison', () => {
      const originalMtf = `# This is a comment
chassis:Atlas
model:AS7-D`;

      const generatedMtf = `# Different comment
chassis:Atlas
model:AS7-D`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      expect(result.status).toBe('PASSED');
    });

    it('should normalize techbase strings', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
techbase:Mixed (IS Chassis)`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
techbase:Mixed`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit(testMtfPath, testOutputDir);

      // Techbase should be normalized, no mismatch for Mixed variants
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });
  });

  describe('validateAll', () => {
    it('should validate all MTF files in directory', async () => {
      // Setup mock directory structure
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'Atlas_AS7-D.mtf', isDirectory: () => false },
        { name: 'Locust_LCT-1V.mtf', isDirectory: () => false },
      ]);

      mockedFs.readFileSync.mockReturnValue('chassis:Test\nmodel:T-1');
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Test\nmodel:T-1',
      });

      const { results, summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(results.length).toBe(2);
      expect(summary.unitsValidated).toBe(2);
    });

    it('should call progress callback', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'Atlas.mtf', isDirectory: () => false },
      ]);

      mockedFs.readFileSync.mockReturnValue('chassis:Atlas\nmodel:AS7-D');
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Atlas\nmodel:AS7-D',
      });

      const progressCallback = jest.fn();

      await service.validateAll(
        { mmDataPath: '/mm-data', outputPath: '/output' },
        progressCallback,
      );

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should apply unit filter', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'Atlas.mtf', isDirectory: () => false },
        { name: 'Locust.mtf', isDirectory: () => false },
      ]);

      mockedFs.readFileSync.mockReturnValue('chassis:Test\nmodel:T-1');
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Test\nmodel:T-1',
      });

      const { results } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
        unitFilter: (path) => path.includes('Atlas'),
      });

      expect(results.length).toBe(1);
    });

    it('should calculate summary correctly', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'passed.mtf', isDirectory: () => false },
        { name: 'issues.mtf', isDirectory: () => false },
        { name: 'error.mtf', isDirectory: () => false },
      ]);

      let callCount = 0;
      mockedFs.readFileSync.mockImplementation(() => {
        callCount++;
        if (callCount === 3) {
          throw new Error('Parse error');
        }
        return `chassis:Test\nmodel:T-${callCount}`;
      });

      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockImplementation(() => ({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      }));

      let exportCount = 0;
      mockExporter.export.mockImplementation(() => {
        exportCount++;
        if (exportCount === 2) {
          return {
            success: true,
            content: 'chassis:Test\nmodel:DIFFERENT',
          };
        }
        return {
          success: true,
          content: 'chassis:Test\nmodel:T-1',
        };
      });

      const { summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(summary.unitsValidated).toBe(3);
      // At least one passed, one with issues, one with parse error
    });

    it('should handle empty directory', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([]);

      const { results, summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(results.length).toBe(0);
      expect(summary.unitsValidated).toBe(0);
    });

    it('should handle non-existent directory', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const { results, summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(results.length).toBe(0);
      expect(summary.unitsValidated).toBe(0);
    });

    it('should recurse into subdirectories', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock)
        .mockReturnValueOnce([
          { name: 'subdir', isDirectory: () => true },
          { name: 'root.mtf', isDirectory: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'nested.mtf', isDirectory: () => false },
        ]);

      mockedFs.readFileSync.mockReturnValue('chassis:Test\nmodel:T-1');
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Test\nmodel:T-1',
      });

      const { results } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(results.length).toBe(2);
    });
  });

  describe('techbase normalization', () => {
    it('should normalize Clan techbase', () => {
      const originalMtf = `chassis:Timber Wolf
model:Prime
techbase:Clan`;

      const generatedMtf = `chassis:Timber Wolf
model:Prime
techbase:Clan`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Timber Wolf', model: 'Prime' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });

    it('should normalize Inner Sphere techbase', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
techbase:Inner Sphere`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
techbase:IS`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });

    it('should normalize Mixed (Clan Chassis) techbase', () => {
      const originalMtf = `chassis:Timber Wolf
model:C
techbase:Mixed (Clan Chassis)`;

      const generatedMtf = `chassis:Timber Wolf
model:C
techbase:Mixed`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Timber Wolf', model: 'C' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.issues.filter((i) => i.field === 'techbase').length).toBe(
        0,
      );
    });
  });

  describe('critical slot comparison', () => {
    it('should detect slot count mismatch', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
Medium Laser
-Empty-`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.SlotCountMismatch,
        ),
      ).toBe(true);
    });

    it('should detect missing actuator', () => {
      // Use non-trailing empty slot so normalizeSlots doesn't strip it
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
Hand Actuator
Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator
-Empty-
Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.MissingActuator,
        ),
      ).toBe(true);
    });

    it('should detect extra actuator', () => {
      // Use non-trailing actuator so normalizeSlots comparison works
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
-Empty-
Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Hand Actuator
Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.ExtraActuator,
        ),
      ).toBe(true);
    });

    it('should detect actuator slot mismatch', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Hand Actuator`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Lower Arm Actuator`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.SlotMismatch,
        ),
      ).toBe(true);
    });

    it('should detect non-actuator slot mismatch', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
Large Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) =>
            i.category === DiscrepancyCategory.SlotMismatch &&
            i.expected === 'Medium Laser',
        ),
      ).toBe(true);
    });

    it('should handle section break in critical slots', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
weapons:1 Medium Laser`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Arm:
Shoulder
Upper Arm Actuator
weapons:1 Medium Laser`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      // weapons: line should be treated as section break, not slot content
      expect(result.status).toBe('PASSED');
    });

    it('should handle quad mech locations', () => {
      const originalMtf = `chassis:Barghest
model:BGS-1T
Front Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Rear Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      const generatedMtf = `chassis:Barghest
model:BGS-1T
Front Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Rear Right Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Barghest', model: 'BGS-1T' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.status).toBe('PASSED');
    });

    it('should handle tripod mech center leg', () => {
      const originalMtf = `chassis:Ares
model:ARS-V1
Center Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      const generatedMtf = `chassis:Ares
model:ARS-V1
Center Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Ares', model: 'ARS-V1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(result.status).toBe('PASSED');
    });
  });

  describe('quirk comparison', () => {
    it('should detect extra quirk in generated', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
quirk:battle_fists_la`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
quirk:battle_fists_la
quirk:battle_fists_ra`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) =>
            i.category === DiscrepancyCategory.QuirkMismatch &&
            i.actual === 'battle_fists_ra',
        ),
      ).toBe(true);
    });
  });

  describe('getRelativePath', () => {
    it('should handle path without meks directory', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: originalMtf,
      });

      // Use a path without 'meks' in it
      const result = service.validateUnit('/other/path/test.mtf', '/output');
      expect(result.generatedPath).toContain('test.mtf');
    });
  });

  describe('git commit parsing', () => {
    it('should handle ref: style HEAD', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'test.mtf', isDirectory: () => false },
      ]);
      mockedFs.readFileSync
        .mockReturnValueOnce('chassis:Test\nmodel:T-1') // MTF file
        .mockReturnValueOnce('ref: refs/heads/master\n') // HEAD file
        .mockReturnValueOnce('abc1234567890\n'); // ref file
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Test\nmodel:T-1',
      });

      const { summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(summary.mmDataCommit).toBe('abc1234');
    });

    it('should handle detached HEAD', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'test.mtf', isDirectory: () => false },
      ]);
      mockedFs.readFileSync
        .mockReturnValueOnce('chassis:Test\nmodel:T-1')
        .mockReturnValueOnce('def5678901234567\n'); // Direct commit hash
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Test\nmodel:T-1',
      });

      const { summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(summary.mmDataCommit).toBe('def5678');
    });

    it('should handle git read error gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (mockedFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'test.mtf', isDirectory: () => false },
      ]);
      let readCount = 0;
      mockedFs.readFileSync.mockImplementation(() => {
        readCount++;
        if (readCount === 1) return 'chassis:Test\nmodel:T-1';
        throw new Error('Git file not found');
      });
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'T-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: 'chassis:Test\nmodel:T-1',
      });

      const { summary } = await service.validateAll({
        mmDataPath: '/mm-data',
        outputPath: '/output',
      });

      expect(summary.mmDataCommit).toBeUndefined();
    });
  });

  describe('engine normalization', () => {
    it('should normalize engine strings with tech base markers', () => {
      const originalMtf = `chassis:Atlas
model:AS7-D
engine:300 Fusion Engine(IS)`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
engine:300 Fusion Engine`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.filter(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ).length,
      ).toBe(0);
    });

    it('should normalize ICE engine variants', () => {
      const originalMtf = `chassis:Scorpion
model:SCR-1
engine:100 I.C.E.`;

      const generatedMtf = `chassis:Scorpion
model:SCR-1
engine:100 ICE`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Scorpion', model: 'SCR-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.filter(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ).length,
      ).toBe(0);
    });

    it('should normalize Fuel Cell engine variants', () => {
      const originalMtf = `chassis:Test
model:FC-1
engine:100 Fuel-Cell`;

      const generatedMtf = `chassis:Test
model:FC-1
engine:100 Fuel Cell`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Test', model: 'FC-1' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.filter(
          (i) => i.category === DiscrepancyCategory.EngineMismatch,
        ).length,
      ).toBe(0);
    });
  });

  describe('leg actuators', () => {
    it('should recognize leg actuators', () => {
      // Add equipment after actuator so trailing -Empty- isn't stripped
      const originalMtf = `chassis:Atlas
model:AS7-D
Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
Foot Actuator
Heat Sink`;

      const generatedMtf = `chassis:Atlas
model:AS7-D
Left Leg:
Hip
Upper Leg Actuator
Lower Leg Actuator
-Empty-
Heat Sink`;

      mockedFs.readFileSync.mockReturnValue(originalMtf);
      mockedFs.mkdirSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      mockParser.parse.mockReturnValue({
        success: true,
        unit: { id: 'test', chassis: 'Atlas', model: 'AS7-D' },
      });
      mockExporter.export.mockReturnValue({
        success: true,
        content: generatedMtf,
      });

      const result = service.validateUnit('/test/meks/test.mtf', '/output');
      expect(
        result.issues.some(
          (i) => i.category === DiscrepancyCategory.MissingActuator,
        ),
      ).toBe(true);
    });
  });
});
