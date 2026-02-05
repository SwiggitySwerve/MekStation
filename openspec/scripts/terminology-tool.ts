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

// Get __dirname equivalent for ES modules
const __filename_local =
  typeof __filename !== 'undefined'
    ? __filename
    : fileURLToPath(import.meta.url);
const __dirname_local =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename_local);

// ============================================================================
// Types
// ============================================================================

interface DeprecatedTerm {
  id: string;
  deprecated: string;
  canonical: string;
  severity: 'error' | 'warning';
  category: string;
  pattern: string;
  flags?: string;
  preserveCase?: boolean;
  context?: string;
  note?: string;
  skipContexts?: string[];
}

interface PropertyViolation {
  id: string;
  pattern: string;
  canonical: string;
  severity: 'error' | 'warning';
  context?: string;
}

interface CapitalizationRule {
  id: string;
  pattern: string;
  canonical: string;
  severity: 'error' | 'warning';
  context?: string;
}

interface SkipPatterns {
  lines: string[];
  contexts: Record<string, string[]>;
}

interface FilePatterns {
  specs: string[];
  source: string[];
  exclude: string[];
}

interface SmartReplacements {
  [key: string]: Record<string, string>;
}

interface TerminologyConfig {
  version: string;
  description: string;
  lastUpdated: string;
  deprecatedTerms: DeprecatedTerm[];
  propertyViolations: PropertyViolation[];
  capitalizationRules: CapitalizationRule[];
  skipPatterns: SkipPatterns;
  filePatterns: FilePatterns;
  smartReplacements: SmartReplacements;
}

interface Violation {
  file: string;
  line: number;
  column: number;
  type: 'deprecated-term' | 'property-naming' | 'capitalization';
  severity: 'error' | 'warning';
  ruleId: string;
  found: string;
  canonical: string;
  context?: string;
  lineText: string;
  fixable: boolean;
}

interface FileResult {
  file: string;
  violations: Violation[];
  fixed: number;
  wasModified: boolean;
}

interface RunResult {
  filesScanned: number;
  filesWithViolations: number;
  totalViolations: number;
  totalErrors: number;
  totalWarnings: number;
  totalFixed: number;
  results: FileResult[];
}

interface CliOptions {
  command: 'validate' | 'fix' | 'report';
  fix: boolean;
  dryRun: boolean;
  json: boolean;
  changedOnly: boolean;
  source: boolean;
  specsOnly: boolean;
  strict: boolean;
  verbose: boolean;
  configPath?: string;
  targetPath?: string;
}

// ============================================================================
// Colors (ANSI)
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const c = {
  error: (s: string) => `${colors.red}${s}${colors.reset}`,
  warn: (s: string) => `${colors.yellow}${s}${colors.reset}`,
  success: (s: string) => `${colors.green}${s}${colors.reset}`,
  info: (s: string) => `${colors.blue}${s}${colors.reset}`,
  bold: (s: string) => `${colors.bold}${s}${colors.reset}`,
  dim: (s: string) => `${colors.dim}${s}${colors.reset}`,
  file: (s: string) => `${colors.cyan}${s}${colors.reset}`,
  lineNum: (s: string) => `${colors.magenta}${s}${colors.reset}`,
};

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
  for (const pattern of excludePatterns) {
    // Handle common patterns
    if (pattern.includes('node_modules') && normalized.includes('node_modules'))
      return true;
    if (pattern.includes('.bak') && normalized.endsWith('.bak')) return true;
    if (pattern.includes('dist') && normalized.includes('/dist/')) return true;
    if (pattern.includes('build') && normalized.includes('/build/'))
      return true;
    if (
      pattern.includes('openspec/scripts') &&
      normalized.includes('/openspec/scripts/')
    )
      return true;
    if (
      pattern.includes('TERMINOLOGY_GLOSSARY.md') &&
      normalized.endsWith('TERMINOLOGY_GLOSSARY.md')
    )
      return true;
    if (
      pattern.includes('TERMINOLOGY_FIX_REPORT.md') &&
      normalized.endsWith('TERMINOLOGY_FIX_REPORT.md')
    )
      return true;
    // Skip any violation reports and templates
    if (normalized.includes('VIOLATIONS_REPORT.md')) return true;
    if (normalized.includes('VALIDATION_FINDINGS')) return true;
    if (normalized.includes('/templates/')) return true;
  }
  return false;
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

interface LineContext {
  inCodeBlock: boolean;
  inTypeScriptBlock: boolean;
  isComment: boolean;
  isDeprecatedExample: boolean;
  isComparison: boolean;
  isRuleDescription: boolean;
  isRationale: boolean;
  isChangelog: boolean;
  isWhenClause: boolean;
  isUserAction: boolean;
}

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

function shouldSkipViolation(
  term: DeprecatedTerm | CapitalizationRule,
  context: LineContext,
  line: string,
  config: TerminologyConfig,
): boolean {
  // Always skip deprecated examples and comparisons
  if (context.isDeprecatedExample || context.isComparison) {
    return true;
  }

  // Check rule-specific skip contexts
  if ('skipContexts' in term && term.skipContexts) {
    for (const skipContext of term.skipContexts) {
      if (skipContext === 'rule-descriptions' && context.isRuleDescription)
        return true;
      if (skipContext === 'rationale' && context.isRationale) return true;
      if (skipContext === 'changelog' && context.isChangelog) return true;
      if (skipContext === 'comparisons' && context.isComparison) return true;
    }
  }

  // Skip URLs
  if (line.includes('http://') || line.includes('https://')) {
    return true;
  }

  // Skip lines that contain any of the configured skip patterns
  for (const skipPattern of config.skipPatterns.lines) {
    if (line.includes(skipPattern)) {
      return true;
    }
  }

  // Skip documentation tables showing deprecated → canonical
  if (
    line.match(/^\s*\|.*→.*\|/) ||
    line.match(/^\s*\|.*".*"\s*\|.*".*"\s*\|/)
  ) {
    return true;
  }

  return false;
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
// Auto-Fix
// ============================================================================

function applyFixes(
  content: string,
  violations: Violation[],
  config: TerminologyConfig,
): { content: string; fixed: number } {
  let modifiedContent = content;
  let fixedCount = 0;

  // Group violations by line (fix from bottom to top to preserve positions)
  const sortedViolations = [...violations].sort((a, b) => {
    if (a.line !== b.line) return b.line - a.line;
    return b.column - a.column;
  });

  for (const violation of sortedViolations) {
    if (!violation.fixable) continue;

    const lines = modifiedContent.split('\n');
    const lineIndex = violation.line - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;

    let line = lines[lineIndex];
    let fixed = false;

    // Find the violation in the line and replace it
    const term = config.deprecatedTerms.find((t) => t.id === violation.ruleId);
    if (term) {
      // Smart case preservation
      if (
        term.preserveCase &&
        config.smartReplacements[term.deprecated.toLowerCase()]
      ) {
        const replacements =
          config.smartReplacements[term.deprecated.toLowerCase()];
        for (const [search, replace] of Object.entries(replacements)) {
          if (line.includes(search)) {
            line = line.replace(new RegExp(escapeRegex(search), 'g'), replace);
            fixed = true;
          }
        }
      }

      if (!fixed) {
        const regex = new RegExp(term.pattern, term.flags || 'gi');
        if (regex.test(line)) {
          line = line.replace(regex, term.canonical);
          fixed = true;
        }
      }
    }

    // Property violations
    const prop = config.propertyViolations.find(
      (p) => p.id === violation.ruleId,
    );
    if (prop && !fixed) {
      const propMatch = violation.found.match(/^(\s*(?:readonly\s+)?)\w+:/);
      if (propMatch) {
        const prefix = propMatch[1];
        line = line.replace(violation.found, `${prefix}${prop.canonical}`);
        fixed = true;
      }
    }

    // Capitalization
    const capRule = config.capitalizationRules.find(
      (r) => r.id === violation.ruleId,
    );
    if (capRule && !fixed) {
      const regex = new RegExp(capRule.pattern, 'g');
      // Only fix if canonical is a single option (not "X or Y")
      if (!capRule.canonical.includes(' or ')) {
        line = line.replace(regex, capRule.canonical);
        fixed = true;
      }
    }

    if (fixed) {
      lines[lineIndex] = line;
      modifiedContent = lines.join('\n');
      fixedCount++;
    }
  }

  return { content: modifiedContent, fixed: fixedCount };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
// Output Formatting
// ============================================================================

function formatViolation(v: Violation, rootDir: string): string {
  const relPath = path.relative(rootDir, v.file).replace(/\\/g, '/');
  const severity = v.severity === 'error' ? c.error('ERROR') : c.warn('WARN');
  const location = `${c.file(relPath)}:${c.lineNum(String(v.line))}:${v.column}`;

  let output = `${severity} ${location}\n`;
  output += `  ${c.bold('Found:')} "${v.found}"\n`;
  output += `  ${c.bold('Should be:')} "${v.canonical}"`;

  if (v.context) {
    output += `\n  ${c.bold('Context:')} ${v.context}`;
  }

  output += `\n  ${c.dim(v.lineText)}\n`;

  return output;
}

function formatSummary(result: RunResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(c.bold('═'.repeat(50)));
  lines.push(c.bold('Summary'));
  lines.push(c.bold('═'.repeat(50)));
  lines.push(
    `  Files scanned:          ${c.info(String(result.filesScanned))}`,
  );
  lines.push(
    `  Files with violations:  ${c.warn(String(result.filesWithViolations))}`,
  );
  lines.push(`  ${c.error('Errors:')}                ${result.totalErrors}`);
  lines.push(`  ${c.warn('Warnings:')}              ${result.totalWarnings}`);
  lines.push(`  Total violations:       ${result.totalViolations}`);

  if (result.totalFixed > 0) {
    lines.push(`  ${c.success('Fixed:')}                 ${result.totalFixed}`);
  }

  lines.push('');

  return lines.join('\n');
}

function formatJson(result: RunResult): string {
  return JSON.stringify(result, null, 2);
}

// ============================================================================
// CLI
// ============================================================================

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

    if (arg === 'validate' || arg === 'fix' || arg === 'report') {
      options.command = arg;
    } else if (arg === '--fix') {
      options.fix = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--changed-only') {
      options.changedOnly = true;
    } else if (arg === '--source') {
      options.source = true;
    } else if (arg === '--specs-only') {
      options.specsOnly = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--config' && args[i + 1]) {
      options.configPath = args[++i];
    } else if (!arg.startsWith('-')) {
      options.targetPath = arg;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
${c.bold('OpenSpec Terminology Tool')} - Validate and fix terminology violations

${c.bold('Usage:')}
  npx ts-node terminology-tool.ts <command> [options] [path]

${c.bold('Commands:')}
  validate    Check for terminology violations (default)
  fix         Fix violations automatically
  report      Generate detailed report

${c.bold('Options:')}
  --fix           Apply fixes automatically (with validate command)
  --dry-run       Show what would be fixed without making changes
  --json          Output results as JSON
  --changed-only  Only check files changed in git
  --source        Include TypeScript source files
  --specs-only    Only check spec.md files
  --strict        Exit with error code on any violation
  --verbose, -v   Show detailed output
  --config PATH   Use custom config file

${c.bold('Examples:')}
  npx ts-node terminology-tool.ts validate
  npx ts-node terminology-tool.ts validate --strict
  npx ts-node terminology-tool.ts fix --dry-run
  npx ts-node terminology-tool.ts fix
  npx ts-node terminology-tool.ts validate --source --changed-only
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = parseArgs(args);
  const rootDir = options.targetPath || process.cwd();

  // Load configuration
  let config: TerminologyConfig;
  try {
    config = loadConfig(options.configPath);
  } catch (error) {
    console.error(c.error(`Failed to load configuration: ${error}`));
    process.exit(1);
  }

  if (!options.json) {
    console.log(c.bold(`\n🔍 OpenSpec Terminology Tool v${config.version}\n`));

    if (options.command === 'fix') {
      if (options.dryRun) {
        console.log(c.warn('DRY RUN - No files will be modified\n'));
      } else {
        console.log(
          c.info('FIX MODE - Violations will be automatically fixed\n'),
        );
      }
    }
  }

  // Find files
  const files = findFiles(rootDir, options, config);

  if (!options.json && files.length === 0) {
    console.log(c.warn('No files found to scan\n'));
    process.exit(0);
  }

  if (!options.json) {
    console.log(`Found ${c.info(String(files.length))} file(s) to scan\n`);
  }

  // Process files
  const results: FileResult[] = [];
  let totalViolations = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalFixed = 0;

  for (const file of files) {
    const result = processFile(file, config, options);
    results.push(result);

    totalViolations += result.violations.length;
    totalErrors += result.violations.filter(
      (v) => v.severity === 'error',
    ).length;
    totalWarnings += result.violations.filter(
      (v) => v.severity === 'warning',
    ).length;
    totalFixed += result.fixed;

    // Output violations
    if (!options.json && result.violations.length > 0) {
      const relPath = path.relative(rootDir, result.file).replace(/\\/g, '/');
      console.log(
        `${c.bold(relPath)} (${result.violations.length} violation${result.violations.length !== 1 ? 's' : ''})\n`,
      );

      for (const v of result.violations) {
        console.log(formatViolation(v, rootDir));
      }

      if (result.fixed > 0) {
        console.log(c.success(`  ✓ Fixed ${result.fixed} violation(s)\n`));
      }
    }
  }

  // Build run result
  const runResult: RunResult = {
    filesScanned: files.length,
    filesWithViolations: results.filter((r) => r.violations.length > 0).length,
    totalViolations,
    totalErrors,
    totalWarnings,
    totalFixed,
    results,
  };

  // Output
  if (options.json) {
    console.log(formatJson(runResult));
  } else {
    if (totalViolations === 0) {
      console.log(c.success(`✓ No terminology violations found!\n`));
      console.log(
        `All ${files.length} file(s) are compliant with TERMINOLOGY_GLOSSARY.md\n`,
      );
    } else {
      console.log(formatSummary(runResult));

      console.log(c.bold('Next Steps:'));
      console.log('  1. Review violations above');
      console.log('  2. Run with --fix to automatically fix violations');
      console.log(
        '  3. Or update specs to use canonical terminology from TERMINOLOGY_GLOSSARY.md\n',
      );
    }
  }

  // Exit code
  if (options.strict && totalErrors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(c.error(`Fatal error: ${error}`));
  process.exit(1);
});
