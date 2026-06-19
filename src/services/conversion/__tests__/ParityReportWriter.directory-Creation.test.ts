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

  describe('Directory Creation', () => {
    it('should create issues directory with recursive option', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true },
      );
    });

    it('should handle nested output directories', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/very/deep/nested/output/path';

      writer.writeReports(results, summary, outputDir);

      expect(mockMkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'issues'),
        { recursive: true },
      );
    });
  });
});
