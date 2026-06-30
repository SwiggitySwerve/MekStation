import path from 'path';

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
};

export const c = {
  error: (s) => `${colors.red}${s}${colors.reset}`,
  warn: (s) => `${colors.yellow}${s}${colors.reset}`,
  success: (s) => `${colors.green}${s}${colors.reset}`,
  info: (s) => `${colors.blue}${s}${colors.reset}`,
  bold: (s) => `${colors.bold}${s}${colors.reset}`,
  dim: (s) => `${colors.dim}${s}${colors.reset}`,
  file: (s) => `${colors.cyan}${s}${colors.reset}`,
  lineNum: (s) => `${colors.magenta}${s}${colors.reset}`,
};

export function formatViolation(v, rootDir) {
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

export function formatSummary(result) {
  const lines = [];

  lines.push('');
  lines.push(c.bold('='.repeat(50)));
  lines.push(c.bold('Summary'));
  lines.push(c.bold('='.repeat(50)));
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

export function formatJson(result) {
  return JSON.stringify(result, null, 2);
}

export function showHelp() {
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
