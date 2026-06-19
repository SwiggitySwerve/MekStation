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
});
