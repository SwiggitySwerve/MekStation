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

  describe('File Path Handling', () => {
    it('should correctly join output directory with manifest filename', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/custom/output';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'manifest.json'),
        expect.any(String),
      );
    });

    it('should correctly join output directory with summary filename', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/custom/output';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'summary.json'),
        expect.any(String),
      );
    });

    it('should correctly join issues directory with unit ID', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'test-unit-123',
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.ArmorMismatch,
              expected: 'A',
              actual: 'B',
              suggestion: 'Fix',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/custom/output';

      writer.writeReports(results, summary, outputDir);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues', 'test-unit-123.json'),
        expect.any(String),
      );
    });

    it('should handle Windows-style paths', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = 'C:\\Users\\Test\\Reports';

      writer.writeReports(results, summary, outputDir);

      // Verify paths are correctly joined (path.join handles platform differences)
      expect(mockWriteFileSync).toHaveBeenCalled();
      expect(mockMkdirSync).toHaveBeenCalled();
    });
  });
});
