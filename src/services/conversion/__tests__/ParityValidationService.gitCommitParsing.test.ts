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
});
