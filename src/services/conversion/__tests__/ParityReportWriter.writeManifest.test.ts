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

  describe('writeManifest()', () => {
    it('should write correctly structured manifest JSON', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'atlas-as7-d',
          chassis: 'Atlas',
          model: 'AS7-D',
          mtfPath: '/data/atlas.mtf',
          status: 'PASSED',
          issues: [],
        }),
      ];
      const summary = createValidationSummary({
        generatedAt: '2026-01-11T10:00:00Z',
        mmDataCommit: 'commit123',
      });
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'manifest.json'),
      );
      expect(manifestCall).toBeDefined();

      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      expect(manifest.generatedAt).toBe('2026-01-11T10:00:00Z');
      expect(manifest.mmDataCommit).toBe('commit123');
      expect(manifest.summary).toEqual(summary);
      expect(manifest.units).toHaveLength(1);
    });

    it('should include all required fields in manifest entries', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          id: 'test-unit',
          chassis: 'TestMech',
          model: 'TM-1',
          mtfPath: '/path/to/unit.mtf',
          status: 'PASSED',
          issues: [],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'manifest.json'),
      );
      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      const entry = manifest.units[0];
      expect(entry.id).toBe('test-unit');
      expect(entry.chassis).toBe('TestMech');
      expect(entry.model).toBe('TM-1');
      expect(entry.mtfPath).toBe('/path/to/unit.mtf');
      expect(entry.status).toBe('PASSED');
      expect(entry.issueCount).toBe(0);
      expect(entry.primaryIssueCategory).toBeUndefined();
    });

    it('should include primaryIssueCategory when issues exist', () => {
      const results: IUnitValidationResult[] = [
        createValidationResult({
          status: 'ISSUES_FOUND',
          issues: [
            {
              category: DiscrepancyCategory.EquipmentMismatch,
              expected: 'A',
              actual: 'B',
              suggestion: 'Fix',
            },
            {
              category: DiscrepancyCategory.ArmorMismatch,
              expected: 'C',
              actual: 'D',
              suggestion: 'Fix',
            },
          ],
        }),
      ];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'manifest.json'),
      );
      const manifestJson = manifestCall![1] as string;
      const manifest: IValidationManifest = JSON.parse(manifestJson);

      const entry = manifest.units[0];
      expect(entry.primaryIssueCategory).toBe(
        DiscrepancyCategory.EquipmentMismatch,
      );
      expect(entry.issueCount).toBe(2);
    });

    it('should format JSON with 2-space indentation', () => {
      const results: IUnitValidationResult[] = [createValidationResult()];
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.writeReports(results, summary, outputDir);

      const manifestCall = mockWriteFileSync.mock.calls.find(
        (call) => call[0] === path.join(outputDir, 'manifest.json'),
      );
      const manifestJson = manifestCall![1] as string;

      // Verify it contains newlines and indentation
      expect(manifestJson).toContain('\n');
      expect(manifestJson).toContain('  ');

      // Verify it's valid JSON that can be re-parsed
      expect(() => JSON.parse(manifestJson)).not.toThrow();
    });
  });
});
