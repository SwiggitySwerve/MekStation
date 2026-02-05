/**
 * Parity Report Writer
 *
 * Generates validation reports: per-unit issue files, manifest, and console output.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  IUnitValidationResult,
  IValidationSummary,
  IValidationManifest,
  IManifestEntry,
  IUnitIssueReport,
} from './types/ParityValidation';

/**
 * Parity Report Writer
 */
export class ParityReportWriter {
  private static instance: ParityReportWriter | null = null;

  private constructor() {}

  static getInstance(): ParityReportWriter {
    if (!ParityReportWriter.instance) {
      ParityReportWriter.instance = new ParityReportWriter();
    }
    return ParityReportWriter.instance;
  }

  /**
   * Write all reports for a validation run
   */
  writeReports(
    results: IUnitValidationResult[],
    summary: IValidationSummary,
    outputDir: string,
  ): void {
    // Ensure output directories exist
    const issuesDir = path.join(outputDir, 'issues');
    fs.mkdirSync(issuesDir, { recursive: true });

    // Write per-unit issue files
    for (const result of results) {
      if (result.status === 'ISSUES_FOUND' || result.status === 'PARSE_ERROR') {
        this.writeUnitIssueFile(result, issuesDir);
      }
    }

    // Write manifest
    this.writeManifest(results, summary, outputDir);

    // Write summary
    this.writeSummary(summary, outputDir);
  }

  /**
   * Write per-unit issue file
   */
  private writeUnitIssueFile(
    result: IUnitValidationResult,
    issuesDir: string,
  ): void {
    const report: IUnitIssueReport = {
      id: result.id,
      chassis: result.chassis,
      model: result.model,
      mtfPath: result.mtfPath,
      generatedPath: result.generatedPath,
      issues: result.issues,
    };

    const filePath = path.join(issuesDir, `${result.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  }

  /**
   * Write manifest file
   */
  private writeManifest(
    results: IUnitValidationResult[],
    summary: IValidationSummary,
    outputDir: string,
  ): void {
    const entries: IManifestEntry[] = results.map((result) => ({
      id: result.id,
      chassis: result.chassis,
      model: result.model,
      mtfPath: result.mtfPath,
      status: result.status,
      primaryIssueCategory:
        result.issues.length > 0 ? result.issues[0].category : undefined,
      issueCount: result.issues.length,
    }));

    const manifest: IValidationManifest = {
      generatedAt: summary.generatedAt,
      mmDataCommit: summary.mmDataCommit,
      summary,
      units: entries,
    };

    const filePath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Write summary file
   */
  private writeSummary(summary: IValidationSummary, outputDir: string): void {
    const filePath = path.join(outputDir, 'summary.json');
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
  }

  /**
   * Print console summary
   */
  printConsoleSummary(summary: IValidationSummary, outputDir: string): void {
    const passRate = (
      (summary.unitsPassed / summary.unitsValidated) *
      100
    ).toFixed(1);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('              Parity Validation Complete');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    if (summary.mmDataCommit) {
      console.log(`  mm-data commit: ${summary.mmDataCommit}`);
    }
    console.log(`  Generated at:   ${summary.generatedAt}`);
    console.log('');

    console.log('  Summary:');
    console.log(`    Units validated:     ${summary.unitsValidated}`);
    console.log(
      `    Units passed:        ${summary.unitsPassed} (${passRate}%)`,
    );
    console.log(`    Units with issues:   ${summary.unitsWithIssues}`);
    console.log(`    Units with errors:   ${summary.unitsWithParseErrors}`);
    console.log('');

    // Show top issues by category
    const sortedCategories = Object.entries(summary.issuesByCategory)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);

    if (sortedCategories.length > 0) {
      console.log('  Top Issues by Category:');
      for (const [category, count] of sortedCategories.slice(0, 10)) {
        const padded = category.padEnd(25);
        console.log(`    ${padded} ${count}`);
      }
      console.log('');
    }

    console.log(`  Reports saved to: ${outputDir}`);
    console.log('    - manifest.json       (index of all units)');
    console.log('    - summary.json        (statistics)');
    console.log('    - issues/*.json       (per-unit issue files)');
    console.log('    - generated/*.mtf     (regenerated MTF files)');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
  }

  /**
   * Print progress during validation
   */
  printProgress(
    current: number,
    total: number,
    unit: string,
    verbose: boolean,
  ): void {
    if (verbose) {
      console.log(`[${current + 1}/${total}] ${path.basename(unit)}`);
    } else if (current % 100 === 0 || current === total - 1) {
      const percent = ((current / total) * 100).toFixed(0);
      process.stdout.write(
        `\r  Processing: ${current + 1}/${total} (${percent}%)`,
      );
    }
  }
}

/**
 * Get singleton instance
 */
export function getParityReportWriter(): ParityReportWriter {
  return ParityReportWriter.getInstance();
}
