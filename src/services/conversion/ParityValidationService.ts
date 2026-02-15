/**
 * Parity Validation Service
 *
 * Orchestrates round-trip validation: MTF -> JSON -> MTF -> diff
 * Identifies discrepancies between original MTF files and regenerated output.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';

import { getMTFExportService, MTFExportService } from './MTFExportService';
import { getMTFParserService, MTFParserService } from './MTFParserService';
import {
  compareAndCategorize,
  findMTFFiles,
  getGitCommit,
  getRelativePath,
  normalizeContent,
} from './ParityValidationHelpers';
import {
  DiscrepancyCategory,
  IUnitValidationResult,
  IParityValidationOptions,
  IValidationSummary,
} from './types/ParityValidation';

/**
 * Parity Validation Service
 */
export class ParityValidationService {
  private parser: MTFParserService;
  private exporter: MTFExportService;

  constructor() {
    this.parser = getMTFParserService();
    this.exporter = getMTFExportService();
  }

  /**
   * Validate a single unit by round-trip comparison
   */
  validateUnit(mtfPath: string, outputDir: string): IUnitValidationResult {
    try {
      const originalContent = fs.readFileSync(mtfPath, 'utf-8');
      const parseResult = this.parser.parse(originalContent);

      if (!parseResult.success || !parseResult.unit) {
        return {
          id: 'unknown',
          chassis: 'Unknown',
          model: 'Unknown',
          mtfPath,
          generatedPath: '',
          status: 'PARSE_ERROR',
          issues: [],
          parseErrors: parseResult.errors,
        };
      }

      const unit = parseResult.unit;
      const exportResult = this.exporter.export(unit);

      if (!exportResult.success || !exportResult.content) {
        return {
          id: unit.id,
          chassis: unit.chassis,
          model: unit.model,
          mtfPath,
          generatedPath: '',
          status: 'PARSE_ERROR',
          issues: [],
          parseErrors: exportResult.errors,
        };
      }

      const relativePath = getRelativePath(mtfPath);
      const generatedPath = path.join(outputDir, 'generated', relativePath);
      fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
      fs.writeFileSync(generatedPath, exportResult.content);

      const originalLines = normalizeContent(originalContent);
      const generatedLines = normalizeContent(exportResult.content);
      const issues = compareAndCategorize(originalLines, generatedLines);

      return {
        id: unit.id,
        chassis: unit.chassis,
        model: unit.model,
        mtfPath,
        generatedPath,
        status: issues.length > 0 ? 'ISSUES_FOUND' : 'PASSED',
        issues,
      };
    } catch (e) {
      return {
        id: 'unknown',
        chassis: 'Unknown',
        model: 'Unknown',
        mtfPath,
        generatedPath: '',
        status: 'PARSE_ERROR',
        issues: [],
        parseErrors: [`${e}`],
      };
    }
  }

  /**
   * Validate all units in mm-data
   */
  async validateAll(
    options: IParityValidationOptions,
    progressCallback?: (current: number, total: number, unit: string) => void,
  ): Promise<{
    results: IUnitValidationResult[];
    summary: IValidationSummary;
  }> {
    const meksDir = path.join(options.mmDataPath, 'data', 'mekfiles', 'meks');
    const mtfFiles = findMTFFiles(meksDir);
    const filteredFiles = options.unitFilter
      ? mtfFiles.filter(options.unitFilter)
      : mtfFiles;

    const results: IUnitValidationResult[] = [];
    const issuesByCategory: Record<DiscrepancyCategory, number> = {} as Record<
      DiscrepancyCategory,
      number
    >;

    for (const category of Object.values(DiscrepancyCategory)) {
      issuesByCategory[category] = 0;
    }

    let processed = 0;
    for (const mtfPath of filteredFiles) {
      if (progressCallback) {
        progressCallback(processed, filteredFiles.length, mtfPath);
      }

      const result = this.validateUnit(mtfPath, options.outputPath);
      results.push(result);

      for (const issue of result.issues) {
        issuesByCategory[issue.category]++;
      }

      processed++;
    }

    const mmDataCommit = getGitCommit(options.mmDataPath);

    const summary: IValidationSummary = {
      generatedAt: new Date().toISOString(),
      mmDataCommit,
      unitsValidated: results.length,
      unitsPassed: results.filter((r) => r.status === 'PASSED').length,
      unitsWithIssues: results.filter((r) => r.status === 'ISSUES_FOUND')
        .length,
      unitsWithParseErrors: results.filter((r) => r.status === 'PARSE_ERROR')
        .length,
      issuesByCategory,
    };

    return { results, summary };
  }
}

const parityValidationServiceFactory: SingletonFactory<ParityValidationService> =
  createSingleton((): ParityValidationService => new ParityValidationService());

export function getParityValidationService(): ParityValidationService {
  return parityValidationServiceFactory.get();
}

export function resetParityValidationService(): void {
  parityValidationServiceFactory.reset();
}
