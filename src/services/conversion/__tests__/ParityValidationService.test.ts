/**
 * ParityValidationService Tests
 *
 * Tests for round-trip MTF validation service.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ParityValidationService, getParityValidationService } from '../ParityValidationService';
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

import { getMTFParserService } from '../MTFParserService';
import { getMTFExportService } from '../MTFExportService';

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
    mockedPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    mockedPath.basename.mockImplementation((p) => p.split('/').pop() || '');

    // Setup parser mock
    mockParser = { parse: jest.fn() };
    (getMTFParserService as jest.Mock).mockReturnValue(mockParser);

    // Setup exporter mock
    mockExporter = { export: jest.fn() };
    (getMTFExportService as jest.Mock).mockReturnValue(mockExporter);

    // Get fresh service instance
    // Note: Using type assertion to access private static for testing
    // @ts-expect-error - accessing private static for testing
    ParityValidationService.instance = null;
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
      expect(result.issues.some(i => i.category === DiscrepancyCategory.HEADER_MISMATCH)).toBe(true);
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

      expect(result.issues.some(i => i.category === DiscrepancyCategory.ARMOR_MISMATCH)).toBe(true);
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

      expect(result.issues.some(i => i.category === DiscrepancyCategory.ENGINE_MISMATCH)).toBe(true);
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

      expect(result.issues.some(i => i.category === DiscrepancyCategory.MOVEMENT_MISMATCH)).toBe(true);
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

      expect(result.issues.some(i => i.category === DiscrepancyCategory.QUIRK_MISMATCH)).toBe(true);
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
      expect(result.issues.filter(i => i.field === 'techbase').length).toBe(0);
    });
  });

  describe('validateAll', () => {
    it('should validate all MTF files in directory', async () => {
      // Setup mock directory structure
      mockedFs.existsSync.mockReturnValue(true);
      const mockDirents: fs.Dirent[] = [
        { name: 'Atlas_AS7-D.mtf', isDirectory: () => false } as fs.Dirent,
        { name: 'Locust_LCT-1V.mtf', isDirectory: () => false } as fs.Dirent,
      ];
      mockedFs.readdirSync.mockReturnValue(mockDirents);

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
      const mockDirents: fs.Dirent[] = [
        { name: 'Atlas.mtf', isDirectory: () => false } as fs.Dirent,
      ];
      mockedFs.readdirSync.mockReturnValue(mockDirents);

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
        progressCallback
      );

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should apply unit filter', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      const mockDirents: fs.Dirent[] = [
        { name: 'Atlas.mtf', isDirectory: () => false } as fs.Dirent,
        { name: 'Locust.mtf', isDirectory: () => false } as fs.Dirent,
      ];
      mockedFs.readdirSync.mockReturnValue(mockDirents);

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
      const mockDirents: fs.Dirent[] = [
        { name: 'passed.mtf', isDirectory: () => false } as fs.Dirent,
        { name: 'issues.mtf', isDirectory: () => false } as fs.Dirent,
        { name: 'error.mtf', isDirectory: () => false } as fs.Dirent,
      ];
      mockedFs.readdirSync.mockReturnValue(mockDirents);

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
  });
});
