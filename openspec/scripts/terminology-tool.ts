#!/usr/bin/env npx ts-node
/**
 * Unified OpenSpec Terminology Tool
 *
 * A comprehensive tool for validating and fixing terminology violations
 * in OpenSpec specification files and TypeScript source code.
 *
 * Features:
 * - Smart context detection (skips code blocks, comments, deprecated examples)
 * - Auto-fix capability with dry-run support
 * - Configurable via terminology.config.json
 * - Multiple output formats (human, json, sarif)
 * - Git integration for checking only changed files
 *
 * Usage:
 *   npx ts-node openspec/scripts/terminology-tool.ts validate [options]
 *   npx ts-node openspec/scripts/terminology-tool.ts fix [options]
 *   npx ts-node openspec/scripts/terminology-tool.ts report [options]
 *
 * Options:
 *   --fix           Apply fixes automatically
 *   --dry-run       Show what would be fixed without making changes
 *   --json          Output results as JSON
 *   --changed-only  Only check files changed in git
 *   --source        Include TypeScript source files
 *   --specs-only    Only check spec.md files
 *   --strict        Exit with error code on any violation
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  CliOptions,
  FileResult,
  RunResult,
  TerminologyConfig,
} from './terminology-tool.types';

import {
  loadConfig,
  detectViolations,
  findFiles,
  summarize,
} from './terminology-tool.core.js';
import { applyFixes } from './terminology-tool.fixers.js';
import {
  c,
  formatJson,
  formatSummary,
  formatViolation,
  showHelp,
} from './terminology-tool.output.js';

function processFile(
  filePath: string,
  config: TerminologyConfig,
  options: CliOptions,
): FileResult {
  const content = fs.readFileSync(filePath, 'utf-8');
  const violations = detectViolations(filePath, content, config);

  const result: FileResult = {
    file: filePath,
    violations,
    fixed: 0,
    wasModified: false,
  };

  if ((options.fix || options.command === 'fix') && violations.length > 0) {
    const { content: fixedContent, fixed } = applyFixes(
      content,
      violations,
      config,
    );

    if (fixed > 0 && fixedContent !== content) {
      if (!options.dryRun) {
        // Create backup
        const backupPath = filePath + '.bak';
        fs.writeFileSync(backupPath, content, {
          encoding: 'utf-8',
          flag: 'wx',
        });

        // Write fixed content
        fs.writeFileSync(filePath, fixedContent, 'utf-8');
        result.wasModified = true;
      }
      result.fixed = fixed;
    }
  }

  return result;
}

// ============================================================================
// CLI
// ============================================================================

const CLI_COMMANDS = new Set<CliOptions['command']>([
  'validate',
  'fix',
  'report',
]);

const CLI_FLAG_SETTERS: Record<string, (options: CliOptions) => void> = {
  '--fix': (options) => {
    options.fix = true;
  },
  '--dry-run': (options) => {
    options.dryRun = true;
  },
  '--json': (options) => {
    options.json = true;
  },
  '--changed-only': (options) => {
    options.changedOnly = true;
  },
  '--source': (options) => {
    options.source = true;
  },
  '--specs-only': (options) => {
    options.specsOnly = true;
  },
  '--strict': (options) => {
    options.strict = true;
  },
  '--verbose': (options) => {
    options.verbose = true;
  },
  '-v': (options) => {
    options.verbose = true;
  },
};

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: 'validate',
    fix: false,
    dryRun: false,
    json: false,
    changedOnly: false,
    source: false,
    specsOnly: false,
    strict: false,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (setCommandOption(arg, options)) continue;
    if (setFlagOption(arg, options)) continue;
    if (arg === '--config') {
      if (!args[i + 1] || args[i + 1].startsWith('-'))
        throw new Error('--config requires a path');
      options.configPath = args[++i];
      continue;
    }
    if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    if (options.targetPath)
      throw new Error('Only one target path is supported');
    options.targetPath = arg;
  }

  return options;
}

function setCommandOption(arg: string, options: CliOptions): boolean {
  if (!CLI_COMMANDS.has(arg as CliOptions['command'])) return false;
  options.command = arg as CliOptions['command'];
  return true;
}

function setFlagOption(arg: string, options: CliOptions): boolean {
  const setter = CLI_FLAG_SETTERS[arg];
  if (!setter) return false;
  setter(options);
  return true;
}

// ============================================================================
// Main
// ============================================================================

function shouldShowHelp(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

function loadConfigOrExit(configPath?: string): TerminologyConfig {
  try {
    return loadConfig(configPath);
  } catch (error) {
    console.error(c.error(`Failed to load configuration: ${error}`));
    process.exit(1);
  }
}

function printRunPreamble(
  options: CliOptions,
  config: TerminologyConfig,
): void {
  if (options.json) return;

  console.log(c.bold(`\n🔍 OpenSpec Terminology Tool v${config.version}\n`));
  if (options.command !== 'fix') return;

  const message = options.dryRun
    ? c.warn('DRY RUN - No files will be modified\n')
    : c.info('FIX MODE - Violations will be automatically fixed\n');
  console.log(message);
}

function printFileCount(options: CliOptions, files: string[]): void {
  if (!options.json) {
    console.log(`Found ${c.info(String(files.length))} file(s) to scan\n`);
  }
}

function processFiles(
  files: string[],
  rootDir: string,
  config: TerminologyConfig,
  options: CliOptions,
): RunResult {
  const results = files.map((file) => {
    const result = processFile(file, config, options);
    printFileResult(rootDir, options, result);
    return result;
  });

  return summarize(results);
}

function printFileResult(
  rootDir: string,
  options: CliOptions,
  result: FileResult,
): void {
  if (options.json || result.violations.length === 0) return;

  const relPath = path.relative(rootDir, result.file).replace(/\\/g, '/');
  console.log(
    `${c.bold(relPath)} (${result.violations.length} violation${result.violations.length !== 1 ? 's' : ''})\n`,
  );

  for (const violation of result.violations) {
    console.log(formatViolation(violation, rootDir));
  }

  if (result.fixed > 0) {
    console.log(c.success(`  ✓ Fixed ${result.fixed} violation(s)\n`));
  }
}

function printRunResult(runResult: RunResult, options: CliOptions): void {
  if (options.json) {
    console.log(formatJson(runResult));
    return;
  }

  if (runResult.totalViolations === 0) {
    console.log(c.success(`✓ No terminology violations found!\n`));
    console.log(
      `All ${runResult.filesScanned} file(s) are compliant with TERMINOLOGY_GLOSSARY.md\n`,
    );
    return;
  }

  console.log(formatSummary(runResult));
  console.log(c.bold('Next Steps:'));
  console.log('  1. Review violations above');
  console.log('  2. Run with --fix to automatically fix violations');
  console.log(
    '  3. Or update specs to use canonical terminology from TERMINOLOGY_GLOSSARY.md\n',
  );
}

function exitOnStrictErrors(options: CliOptions, runResult: RunResult): void {
  if (options.strict && runResult.totalErrors > 0) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (shouldShowHelp(args)) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);
  const rootDir = options.targetPath || process.cwd();
  const config = loadConfigOrExit(options.configPath);
  printRunPreamble(options, config);

  const files = findFiles(rootDir, options, config);
  printFileCount(options, files);

  const runResult = processFiles(files, rootDir, config, options);
  printRunResult(runResult, options);
  exitOnStrictErrors(options, runResult);
}

main().catch((error) => {
  console.error(c.error(`Fatal error: ${error}`));
  process.exit(1);
});
