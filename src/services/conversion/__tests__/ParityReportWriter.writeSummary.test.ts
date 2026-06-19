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

  describe('writeSummary()', () => {
    it('should write correctly structured summary JSON', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary({
        generatedAt: '2026-01-11T10:00:00Z',
        mmDataCommit: 'commit456',
        unitsValidated: 100,
        unitsPassed: 85,
        unitsWithIssues: 12,
        unitsWithParseErrors: 3,
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'summary.json'),
      );
      expect(summaryCall).toBeDefined();

      const summaryJson = summaryCall![1] as string;
      const parsedSummary: IValidationSummary = JSON.parse(summaryJson);

      expect(parsedSummary.generatedAt).toBe('2026-01-11T10:00:00Z');
      expect(parsedSummary.mmDataCommit).toBe('commit456');
      expect(parsedSummary.unitsValidated).toBe(100);
      expect(parsedSummary.unitsPassed).toBe(85);
      expect(parsedSummary.unitsWithIssues).toBe(12);
      expect(parsedSummary.unitsWithParseErrors).toBe(3);
    });

    it('should include issuesByCategory in summary', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UnknownEquipment]: 10,
          [DiscrepancyCategory.EquipmentMismatch]: 5,
          [DiscrepancyCategory.MissingActuator]: 2,
          [DiscrepancyCategory.ExtraActuator]: 1,
          [DiscrepancyCategory.SlotMismatch]: 3,
          [DiscrepancyCategory.SlotCountMismatch]: 0,
          [DiscrepancyCategory.ArmorMismatch]: 4,
          [DiscrepancyCategory.EngineMismatch]: 1,
          [DiscrepancyCategory.MovementMismatch]: 0,
          [DiscrepancyCategory.HeaderMismatch]: 0,
          [DiscrepancyCategory.QuirkMismatch]: 0,
          [DiscrepancyCategory.FluffMismatch]: 0,
          [DiscrepancyCategory.ParseError]: 2,
        },
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'summary.json'),
      );
      const summaryJson = summaryCall![1] as string;
      const parsedSummary: IValidationSummary = JSON.parse(summaryJson);

      expect(
        parsedSummary.issuesByCategory[DiscrepancyCategory.UnknownEquipment],
      ).toBe(10);
      expect(
        parsedSummary.issuesByCategory[DiscrepancyCategory.EquipmentMismatch],
      ).toBe(5);
      expect(
        parsedSummary.issuesByCategory[DiscrepancyCategory.ArmorMismatch],
      ).toBe(4);
    });

    it('should format JSON with 2-space indentation', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const summaryCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'summary.json'),
      );
      const summaryJson = summaryCall![1] as string;

      // Verify it contains newlines and indentation
      expect(summaryJson).toContain('\n');
      expect(summaryJson).toContain('  ');

      // Verify it's valid JSON
      expect(() => JSON.parse(summaryJson)).not.toThrow();
    });
  });
});
