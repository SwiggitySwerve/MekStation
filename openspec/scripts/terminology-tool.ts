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

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { applyFixes } from './terminology-tool.fixers.js';
import {
  c,
  formatJson,
  formatSummary,
  formatViolation,
  showHelp,
} from './terminology-tool.output.js';
import type {
  CapitalizationRule,
  CliOptions,
  DeprecatedTerm,
  FileResult,
  LineContext,
  RunResult,
  TerminologyConfig,
  Violation,
} from './terminology-tool.types';

// Get __dirname equivalent for ES modules
const __filename_local =
  typeof __filename !== 'undefined'
    ? __filename
    : fileURLToPath(import.meta.url);
const __dirname_local =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename_local);

// ============================================================================
// Configuration Loader
// ============================================================================

function loadConfig(configPath?: string): TerminologyConfig {
  const defaultPath = path.join(__dirname_local, 'terminology.config.json');
  const cfgPath = configPath || defaultPath;

  if (!fs.existsSync(cfgPath)) {
    throw new Error(`Configuration file not found: ${cfgPath}`);
  }

  const content = fs.readFileSync(cfgPath, 'utf-8');
  return JSON.parse(content) as TerminologyConfig;
}

const ALWAYS_EXCLUDED_PATH_FRAGMENTS = [
  'VIOLATIONS_REPORT.md',
  'VALIDATION_FINDINGS',
  '/templates/',
];

const EXCLUDE_PATTERN_RULES: Array<{
  patternFragment: string;
  matchesPath: (normalizedPath: string) => boolean;
}> = [
  {
    patternFragment: 'node_modules',
    matchesPath: (normalizedPath) => normalizedPath.includes('node_modules'),
  },
  {
    patternFragment: '.bak',
    matchesPath: (normalizedPath) => normalizedPath.endsWith('.bak'),
  },
  {
    patternFragment: 'dist',
    matchesPath: (normalizedPath) => normalizedPath.includes('/dist/'),
  },
  {
    patternFragment: 'build',
    matchesPath: (normalizedPath) => normalizedPath.includes('/build/'),
  },
  {
    patternFragment: 'openspec/changes/archive',
    matchesPath: (normalizedPath) =>
      normalizedPath.includes('/openspec/changes/archive/'),
  },
  {
    patternFragment: 'openspec/scripts',
    matchesPath: (normalizedPath) =>
      normalizedPath.includes('/openspec/scripts/'),
  },
  {
    patternFragment: 'TERMINOLOGY_GLOSSARY.md',
    matchesPath: (normalizedPath) =>
      normalizedPath.endsWith('TERMINOLOGY_GLOSSARY.md'),
  },
  {
    patternFragment: 'TERMINOLOGY_FIX_REPORT.md',
    matchesPath: (normalizedPath) =>
      normalizedPath.endsWith('TERMINOLOGY_FIX_REPORT.md'),
  },
];

// ============================================================================
// File Discovery
// ============================================================================

function findFiles(
  rootDir: string,
  options: CliOptions,
  config: TerminologyConfig,
): string[] {
  const files: string[] = [];

  // If checking only changed files
  if (options.changedOnly) {
    try {
      const gitOutput = execSync('git diff --name-only HEAD', {
        cwd: rootDir,
        encoding: 'utf-8',
      });
      const changedFiles = gitOutput.split('\n').filter(Boolean);
      return changedFiles
        .map((f) => path.join(rootDir, f))
        .filter((f) => fs.existsSync(f) && matchesPatterns(f, config, options));
    } catch {
      console.warn(
        c.warn(
          'Warning: Could not get changed files from git, scanning all files',
        ),
      );
    }
  }

  function traverse(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded patterns
        if (isExcluded(fullPath, config.filePatterns.exclude)) {
          continue;
        }

        if (entry.isDirectory()) {
          traverse(fullPath);
        } else if (matchesPatterns(fullPath, config, options)) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  traverse(rootDir);
  return files;
}

function isExcluded(filePath: string, excludePatterns: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return (
    hasConfiguredExcludePattern(normalized, excludePatterns) ||
    ALWAYS_EXCLUDED_PATH_FRAGMENTS.some((fragment) =>
      normalized.includes(fragment),
    )
  );
}

function hasConfiguredExcludePattern(
  normalizedPath: string,
  excludePatterns: string[],
): boolean {
  return excludePatterns.some((pattern) =>
    EXCLUDE_PATTERN_RULES.some(
      (rule) =>
        pattern.includes(rule.patternFragment) && rule.matchesPath(normalizedPath),
    ),
  );
}

function matchesPatterns(
  filePath: string,
  config: TerminologyConfig,
  options: CliOptions,
): boolean {
  const normalized = filePath.replace(/\\/g, '/');

  // Specs only mode
  if (options.specsOnly) {
    return normalized.includes('/openspec/') && normalized.endsWith('.md');
  }

  // Check spec patterns
  const isSpec =
    (normalized.includes('/openspec/specs/') ||
      normalized.includes('/openspec/changes/')) &&
    normalized.endsWith('.md');

  // Check source patterns
  const isSource =
    (normalized.endsWith('.ts') || normalized.endsWith('.tsx')) &&
    normalized.includes('/src/');

  if (options.source) {
    return isSpec || isSource;
  }

  return isSpec;
}

// ============================================================================
// Context Detection
// ============================================================================

function analyzeLineContext(
  line: string,
  content: string,
  lineIndex: number,
  config: TerminologyConfig,
): LineContext {
  const lines = content.split('\n');

  // Count code block markers before this line
  let codeBlockCount = 0;
  let isTypeScript = false;
  for (let i = 0; i < lineIndex; i++) {
    if (lines[i].trim().startsWith('```')) {
      codeBlockCount++;
      if (lines[i].includes('typescript') || lines[i].includes('ts')) {
        isTypeScript = codeBlockCount % 2 === 1;
      }
    }
  }
  const inCodeBlock = codeBlockCount % 2 === 1;

  const skipPatterns = config.skipPatterns;

  return {
    inCodeBlock,
    inTypeScriptBlock: inCodeBlock && isTypeScript,
    isComment:
      line.trim().startsWith('//') ||
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*'),
    isDeprecatedExample: skipPatterns.contexts['deprecated-examples'].some(
      (p) => line.includes(p),
    ),
    isComparison: skipPatterns.contexts['comparisons'].some((p) =>
      line.includes(p),
    ),
    isRuleDescription: skipPatterns.contexts['rule-descriptions'].some((p) =>
      line.includes(p),
    ),
    isRationale: skipPatterns.contexts['rationale'].some((p) =>
      line.includes(p),
    ),
    isChangelog: skipPatterns.contexts['changelog'].some((p) =>
      line.includes(p),
    ),
    isWhenClause: skipPatterns.contexts['when-clauses'].some((p) =>
      line.includes(p),
    ),
    isUserAction: skipPatterns.contexts['user-actions'].some((p) =>
      line.includes(p),
    ),
  };
}

const SKIP_CONTEXT_CHECKS: Record<string, (context: LineContext) => boolean> = {
  'rule-descriptions': (context) => context.isRuleDescription,
  'code-block': (context) => context.inCodeBlock,
  rationale: (context) => context.isRationale,
  changelog: (context) => context.isChangelog,
  comparisons: (context) => context.isComparison,
};

function shouldSkipViolation(
  term: DeprecatedTerm | CapitalizationRule,
  context: LineContext,
  line: string,
  config: TerminologyConfig,
): boolean {
  return (
    isAlwaysSkippedContext(context) ||
    hasRuleSkipContext(term, context) ||
    isUrlLine(line) ||
    hasConfiguredLineSkip(line, config) ||
    isTerminologyReferenceTable(line)
  );
}

function isAlwaysSkippedContext(context: LineContext): boolean {
  return context.isDeprecatedExample || context.isComparison;
}

function hasRuleSkipContext(
  term: DeprecatedTerm | CapitalizationRule,
  context: LineContext,
): boolean {
  if (!('skipContexts' in term)) return false;
  return (term.skipContexts ?? []).some((skipContext) => {
    const check = SKIP_CONTEXT_CHECKS[skipContext];
    return check?.(context) ?? false;
  });
}

function isUrlLine(line: string): boolean {
  return line.includes('http://') || line.includes('https://');
}

function hasConfiguredLineSkip(
  line: string,
  config: TerminologyConfig,
): boolean {
  return config.skipPatterns.lines.some((skipPattern) =>
    line.includes(skipPattern),
  );
}

function isTerminologyReferenceTable(line: string): boolean {
  return (
    /^\s*\|.*→.*\|/.test(line) ||
    /^\s*\|.*".*"\s*\|.*".*"\s*\|/.test(line)
  );
}

// ============================================================================
// Violation Detection
// ============================================================================

function detectViolations(
  filePath: string,
  content: string,
  config: TerminologyConfig,
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const ctx = analyzeLineContext(line, content, index, config);

    // Check deprecated terms
    for (const term of config.deprecatedTerms) {
      if (shouldSkipViolation(term, ctx, line, config)) continue;

      const regex = new RegExp(term.pattern, term.flags || 'gi');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        violations.push({
          file: filePath,
          line: lineNumber,
          column: match.index + 1,
          type: 'deprecated-term',
          severity: term.severity,
          ruleId: term.id,
          found: match[0],
          canonical: term.canonical,
          context: term.context,
          lineText: line.trim(),
          fixable: true,
        });
      }
    }

    // Check property violations (only in code blocks)
    if (ctx.inCodeBlock || ctx.inTypeScriptBlock) {
      for (const prop of config.propertyViolations) {
        const regex = new RegExp(prop.pattern, 'gm');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(line)) !== null) {
          // Skip variable declarations
          if (/^(const|let|var)\s+\w+/.test(line.trim())) continue;

          violations.push({
            file: filePath,
            line: lineNumber,
            column: match.index + 1,
            type: 'property-naming',
            severity: prop.severity,
            ruleId: prop.id,
            found: match[0].trim(),
            canonical: prop.canonical,
            context: prop.context,
            lineText: line.trim(),
            fixable: true,
          });
        }
      }
    }

    // Check capitalization
    for (const rule of config.capitalizationRules) {
      if (shouldSkipViolation(rule, ctx, line, config)) continue;

      const regex = new RegExp(rule.pattern, 'g');
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line)) !== null) {
        violations.push({
          file: filePath,
          line: lineNumber,
          column: match.index + 1,
          type: 'capitalization',
          severity: rule.severity,
          ruleId: rule.id,
          found: match[0],
          canonical: rule.canonical,
          context: rule.context,
          lineText: line.trim(),
          fixable: true,
        });
      }
    }
  });

  return violations;
}

// ============================================================================
// File Processing
// ============================================================================

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
        fs.writeFileSync(backupPath, content, 'utf-8');

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
    if (arg === '--config' && args[i + 1]) {
      options.configPath = args[++i];
      continue;
    }
    if (!arg.startsWith('-')) options.targetPath = arg;
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

function exitWhenNoFiles(options: CliOptions, files: string[]): void {
  if (options.json || files.length > 0) return;
  console.log(c.warn('No files found to scan\n'));
  process.exit(0);
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

  return {
    filesScanned: files.length,
    filesWithViolations: results.filter((r) => r.violations.length > 0).length,
    totalViolations: sumViolations(results),
    totalErrors: sumSeverity(results, 'error'),
    totalWarnings: sumSeverity(results, 'warning'),
    totalFixed: results.reduce((sum, result) => sum + result.fixed, 0),
    results,
  };
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

function sumViolations(results: FileResult[]): number {
  return results.reduce((sum, result) => sum + result.violations.length, 0);
}

function sumSeverity(
  results: FileResult[],
  severity: Violation['severity'],
): number {
  return results.reduce(
    (sum, result) =>
      sum +
      result.violations.filter((violation) => violation.severity === severity)
        .length,
    0,
  );
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
  exitWhenNoFiles(options, files);
  printFileCount(options, files);

  const runResult = processFiles(files, rootDir, config, options);
  printRunResult(runResult, options);
  exitOnStrictErrors(options, runResult);
}

main().catch((error) => {
  console.error(c.error(`Fatal error: ${error}`));
  process.exit(1);
});
