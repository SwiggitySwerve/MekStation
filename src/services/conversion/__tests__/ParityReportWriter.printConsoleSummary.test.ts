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

  describe('printConsoleSummary()', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should print summary header', () => {
      const summary = createValidationSummary();
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parity Validation Complete'),
      );
    });

    it('should print validation statistics', () => {
      const summary = createValidationSummary({
        unitsValidated: 100,
        unitsPassed: 85,
        unitsWithIssues: 12,
        unitsWithParseErrors: 3,
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Units validated:     100'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Units passed:        85'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Units with issues:   12'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Units with errors:   3'),
      );
    });

    it('should calculate and print pass rate', () => {
      const summary = createValidationSummary({
        unitsValidated: 100,
        unitsPassed: 85,
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('85.0%'),
      );
    });

    it('should print mmDataCommit when present', () => {
      const summary = createValidationSummary({
        mmDataCommit: 'abc123def456',
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('mm-data commit: abc123def456'),
      );
    });

    it('should not print mmDataCommit when absent', () => {
      const summary = createValidationSummary({
        mmDataCommit: undefined,
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      const mmDataCalls = consoleLogSpy.mock.calls.filter(
        (call) =>
          call[0] && call[0].includes && call[0].includes('mm-data commit'),
      );
      expect(mmDataCalls).toHaveLength(0);
    });

    it('should print generatedAt timestamp', () => {
      const summary = createValidationSummary({
        generatedAt: '2026-01-11T12:00:00Z',
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generated at:   2026-01-11T12:00:00Z'),
      );
    });

    it('should print output directory', () => {
      const summary = createValidationSummary();
      const outputDir = '/custom/output/path';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reports saved to: /custom/output/path'),
      );
    });

    it('should print top issues by category when issues exist', () => {
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UnknownEquipment]: 15,
          [DiscrepancyCategory.EquipmentMismatch]: 10,
          [DiscrepancyCategory.ArmorMismatch]: 5,
          [DiscrepancyCategory.MissingActuator]: 0,
          [DiscrepancyCategory.ExtraActuator]: 0,
          [DiscrepancyCategory.SlotMismatch]: 0,
          [DiscrepancyCategory.SlotCountMismatch]: 0,
          [DiscrepancyCategory.EngineMismatch]: 0,
          [DiscrepancyCategory.MovementMismatch]: 0,
          [DiscrepancyCategory.HeaderMismatch]: 0,
          [DiscrepancyCategory.QuirkMismatch]: 0,
          [DiscrepancyCategory.FluffMismatch]: 0,
          [DiscrepancyCategory.ParseError]: 0,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Top Issues by Category:'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('UNKNOWN_EQUIPMENT'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('15'));
    });

    it('should sort issues by count in descending order', () => {
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.ArmorMismatch]: 5,
          [DiscrepancyCategory.EquipmentMismatch]: 10,
          [DiscrepancyCategory.UnknownEquipment]: 15,
          [DiscrepancyCategory.MissingActuator]: 0,
          [DiscrepancyCategory.ExtraActuator]: 0,
          [DiscrepancyCategory.SlotMismatch]: 0,
          [DiscrepancyCategory.SlotCountMismatch]: 0,
          [DiscrepancyCategory.EngineMismatch]: 0,
          [DiscrepancyCategory.MovementMismatch]: 0,
          [DiscrepancyCategory.HeaderMismatch]: 0,
          [DiscrepancyCategory.QuirkMismatch]: 0,
          [DiscrepancyCategory.FluffMismatch]: 0,
          [DiscrepancyCategory.ParseError]: 0,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      const categoryLines = consoleLogSpy.mock.calls
        .map((call) => call[0])
        .filter(
          (line) =>
            line &&
            typeof line === 'string' &&
            (line.includes('UNKNOWN_EQUIPMENT') ||
              line.includes('EQUIPMENT_MISMATCH') ||
              line.includes('ARMOR_MISMATCH')),
        );

      // Verify the highest count appears first
      const unknownIndex = categoryLines.findIndex((line) =>
        line.includes('UNKNOWN_EQUIPMENT'),
      );
      const equipmentIndex = categoryLines.findIndex((line) =>
        line.includes('EQUIPMENT_MISMATCH'),
      );
      const armorIndex = categoryLines.findIndex((line) =>
        line.includes('ARMOR_MISMATCH'),
      );

      expect(unknownIndex).toBeLessThan(equipmentIndex);
      expect(equipmentIndex).toBeLessThan(armorIndex);
    });

    it('should not print issues section when no issues exist', () => {
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UnknownEquipment]: 0,
          [DiscrepancyCategory.EquipmentMismatch]: 0,
          [DiscrepancyCategory.MissingActuator]: 0,
          [DiscrepancyCategory.ExtraActuator]: 0,
          [DiscrepancyCategory.SlotMismatch]: 0,
          [DiscrepancyCategory.SlotCountMismatch]: 0,
          [DiscrepancyCategory.ArmorMismatch]: 0,
          [DiscrepancyCategory.EngineMismatch]: 0,
          [DiscrepancyCategory.MovementMismatch]: 0,
          [DiscrepancyCategory.HeaderMismatch]: 0,
          [DiscrepancyCategory.QuirkMismatch]: 0,
          [DiscrepancyCategory.FluffMismatch]: 0,
          [DiscrepancyCategory.ParseError]: 0,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      const issuesCalls = consoleLogSpy.mock.calls.filter(
        (call) =>
          call[0] &&
          call[0].includes &&
          call[0].includes('Top Issues by Category'),
      );
      expect(issuesCalls).toHaveLength(0);
    });

    it('should limit to top 10 issues', () => {
      // Create 15 different issue categories with counts
      const summary = createValidationSummary({
        issuesByCategory: {
          [DiscrepancyCategory.UnknownEquipment]: 15,
          [DiscrepancyCategory.EquipmentMismatch]: 14,
          [DiscrepancyCategory.ArmorMismatch]: 13,
          [DiscrepancyCategory.MissingActuator]: 12,
          [DiscrepancyCategory.ExtraActuator]: 11,
          [DiscrepancyCategory.SlotMismatch]: 10,
          [DiscrepancyCategory.SlotCountMismatch]: 9,
          [DiscrepancyCategory.EngineMismatch]: 8,
          [DiscrepancyCategory.MovementMismatch]: 7,
          [DiscrepancyCategory.HeaderMismatch]: 6,
          [DiscrepancyCategory.QuirkMismatch]: 5,
          [DiscrepancyCategory.FluffMismatch]: 4,
          [DiscrepancyCategory.ParseError]: 3,
        },
      });
      const outputDir = '/output/reports';

      writer.printConsoleSummary(summary, outputDir);

      // Count how many issue category lines were printed (excluding the header)
      const categoryLines = consoleLogSpy.mock.calls
        .map((call) => call[0])
        .filter(
          (line) =>
            line &&
            typeof line === 'string' &&
            Object.values(DiscrepancyCategory).some((cat) =>
              line.includes(cat),
            ),
        );

      expect(categoryLines.length).toBeLessThanOrEqual(10);
    });
  });
});
