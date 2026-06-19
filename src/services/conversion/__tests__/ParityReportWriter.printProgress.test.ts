/**
 * Parity Report Writer Tests
 *
 * Tests for writing parity validation reports to disk.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

/* oxlint-disable @typescript-eslint/no-unsafe-assignment */
/* oxlint-disable @typescript-eslint/no-unsafe-member-access */
/* oxlint-disable @typescript-eslint/no-unsafe-call */
/* oxlint-disable @typescript-eslint/no-unsafe-return */

import * as fs from 'fs';
import * as path from 'path';

import {
  ParityReportWriter,
  getParityReportWriter,
  resetParityReportWriter,
} from '@/services/conversion/ParityReportWriter';
import {
  IUnitValidationResult,
  IValidationSummary,
  IValidationManifest,
  IUnitIssueReport,
  DiscrepancyCategory,
} from '@/services/conversion/types/ParityValidation';

// Mock the fs module - this mocks file I/O but NOT the ParityReportWriter class
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import {
  createValidationResult,
  createValidationSummary,
} from './ParityReportWriter.test-helpers';

describe('ParityReportWriter', () => {
  let writer: ParityReportWriter;
  let mockWriteFileSync: jest.MockedFunction<typeof fs.writeFileSync>;
  let mockMkdirSync: jest.MockedFunction<typeof fs.mkdirSync>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    resetParityReportWriter();
    writer = getParityReportWriter();
    mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<
      typeof fs.writeFileSync
    >;
    mockMkdirSync = fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>;

    // Reset mock implementations to defaults
    mockWriteFileSync.mockImplementation(() => undefined);
    mockMkdirSync.mockImplementation(() => undefined);
  });

  // ============================================================================
  // Singleton Pattern
  // ============================================================================
  // ============================================================================
  // ============================================================================
  // writeManifest() - via writeReports()
  // ============================================================================
  // ============================================================================
  // writeSummary() - via writeReports()
  // ============================================================================
  // ============================================================================
  // writeUnitIssueFile() - via writeReports()
  // ============================================================================
  // ============================================================================
  // Directory Creation
  // ============================================================================
  // ============================================================================
  // File Path Handling
  // ============================================================================
  // ============================================================================
  // Error Handling
  // ============================================================================
  // ============================================================================
  // Edge Cases
  // ============================================================================
  // ============================================================================
  // JSON Formatting Validation
  // ============================================================================
  // ============================================================================
  // printConsoleSummary()
  // ============================================================================
  // ============================================================================
  // printProgress()
  // ============================================================================
  // ============================================================================
  // Integration Tests - Verify Real Implementation is Tested
  // ============================================================================

  describe('printProgress()', () => {
    let consoleLogSpy: jest.SpyInstance;
    let processStdoutWriteSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      processStdoutWriteSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      processStdoutWriteSpy.mockRestore();
    });

    it('should print detailed progress in verbose mode', () => {
      writer.printProgress(0, 100, '/path/to/unit.mtf', true);

      expect(consoleLogSpy).toHaveBeenCalledWith('[1/100] unit.mtf');
    });

    it('should use basename in verbose mode', () => {
      writer.printProgress(5, 100, '/very/long/path/to/shadow-hawk.mtf', true);

      expect(consoleLogSpy).toHaveBeenCalledWith('[6/100] shadow-hawk.mtf');
    });

    it('should print progress bar at 100-unit intervals in non-verbose mode', () => {
      writer.printProgress(0, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing: 1/1000'),
      );
    });

    it('should print progress bar at multiples of 100', () => {
      writer.printProgress(100, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing: 101/1000'),
      );
    });

    it('should print progress bar at last item', () => {
      writer.printProgress(999, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing: 1000/1000'),
      );
    });

    it('should not print progress in non-verbose mode for non-milestone items', () => {
      writer.printProgress(50, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should calculate percentage in non-verbose mode', () => {
      writer.printProgress(500, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('50%'),
      );
    });

    it('should use carriage return for progress bar updates', () => {
      writer.printProgress(0, 1000, '/path/to/unit.mtf', false);

      expect(processStdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\r/),
      );
    });
  });
});
