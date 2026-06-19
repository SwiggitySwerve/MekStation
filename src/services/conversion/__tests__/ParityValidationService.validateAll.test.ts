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
});
