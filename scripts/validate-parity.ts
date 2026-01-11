#!/usr/bin/env npx tsx
/**
 * Parity Validation CLI
 *
 * Validates MekStation unit data against canonical mm-data MTF files.
 * Performs round-trip validation: MTF → JSON → MTF → diff
 *
 * Usage:
 *   npx tsx scripts/validate-parity.ts [options]
 *
 * Options:
 *   --mm-data <path>    Path to mm-data repository (default: ../mm-data)
 *   --output <path>     Output directory (default: ./validation-output)
 *   --filter <pattern>  Filter units by path pattern (e.g., "3039u")
 *   --verbose           Show detailed progress
 *   --help              Show this help message
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

import * as path from 'path';
import { getParityValidationService } from '../src/services/conversion/ParityValidationService';
import { getParityReportWriter } from '../src/services/conversion/ParityReportWriter';
import { IParityValidationOptions } from '../src/services/conversion/types/ParityValidation';

interface CLIOptions {
  mmDataPath: string;
  outputPath: string;
  filter?: string;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    mmDataPath: path.resolve(process.cwd(), '../mm-data'),
    outputPath: path.resolve(process.cwd(), './validation-output'),
    verbose: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--mm-data':
        options.mmDataPath = path.resolve(args[++i] || '../mm-data');
        break;
      case '--output':
        options.outputPath = path.resolve(args[++i] || './validation-output');
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Parity Validation CLI

Validates MekStation unit data against canonical mm-data MTF files.
Performs round-trip validation: MTF → JSON → MTF → diff

Usage:
  npx tsx scripts/validate-parity.ts [options]

Options:
  --mm-data <path>    Path to mm-data repository (default: ../mm-data)
  --output <path>     Output directory (default: ./validation-output)
  --filter <pattern>  Filter units by path pattern (e.g., "3039u")
  --verbose, -v       Show detailed progress
  --help, -h          Show this help message

Examples:
  # Validate all units
  npx tsx scripts/validate-parity.ts

  # Validate only 3039u era units
  npx tsx scripts/validate-parity.ts --filter 3039u

  # Use custom paths with verbose output
  npx tsx scripts/validate-parity.ts --mm-data /path/to/mm-data --output ./reports -v
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('              MekStation Parity Validation');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  mm-data path: ${options.mmDataPath}`);
  console.log(`  Output path:  ${options.outputPath}`);
  if (options.filter) {
    console.log(`  Filter:       ${options.filter}`);
  }
  console.log('');

  const validationService = getParityValidationService();
  const reportWriter = getParityReportWriter();

  const validationOptions: IParityValidationOptions = {
    mmDataPath: options.mmDataPath,
    outputPath: options.outputPath,
    verbose: options.verbose,
    unitFilter: options.filter
      ? (mtfPath: string) => mtfPath.includes(options.filter!)
      : undefined,
  };

  console.log('  Starting validation...');
  console.log('');

  const startTime = Date.now();

  const { results, summary } = await validationService.validateAll(
    validationOptions,
    (current, total, unit) => {
      reportWriter.printProgress(current, total, unit, options.verbose);
    }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!options.verbose) {
    console.log(''); // New line after progress
  }

  console.log('');
  console.log(`  Completed in ${elapsed}s`);

  // Write reports
  reportWriter.writeReports(results, summary, options.outputPath);

  // Print summary
  reportWriter.printConsoleSummary(summary, options.outputPath);

  // Exit with error code if there are issues
  if (summary.unitsWithIssues > 0 || summary.unitsWithParseErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
