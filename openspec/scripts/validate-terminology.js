#!/usr/bin/env node
/**
 * Canonical-spec compatibility check. The shared owner supplies every rule.
 * --fix remains unsupported; use the modern fixer to opt into mutations.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  loadConfig,
  findFiles,
  detectViolations,
  summarize,
} = require('./terminology-tool.core.js');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function validate(args = process.argv.slice(2)) {
  const options = { canonicalOnly: true };
  let target = path.join(__dirname, '..', 'specs');
  let configPath;
  let explicitTarget = false;
  let json = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--fix') {
      console.log(
        'Note: Automatic fixes are NOT implemented. Manual fixes required.\n',
      );
      continue;
    }
    if (arg === '--config') {
      configPath = args[++index];
      if (!configPath || configPath.startsWith('-'))
        throw new Error('--config requires a path');
      continue;
    }
    if (arg.startsWith('-')) throw new Error('Unknown option: ' + arg);
    if (explicitTarget) throw new Error('Only one target path is supported');
    target = arg;
    explicitTarget = true;
  }
  const config = loadConfig(configPath);
  const files = findFiles(target, options, config);
  const results = files.map((file) => ({
    file,
    violations: detectViolations(file, fs.readFileSync(file, 'utf8'), config),
    fixed: 0,
    wasModified: false,
  }));
  const violations = results.flatMap((result) => result.violations);
  const totalErrors = violations.filter((v) => v.severity === 'error').length;
  const totalWarnings = violations.length - totalErrors;
  const run = summarize(results);
  if (json) {
    console.log(JSON.stringify(run, null, 2));
    return totalErrors > 0 ? 1 : 0;
  }
  console.log(
    colors.blue + colors.bold + '\n🔍 Terminology Validation\n' + colors.reset,
  );
  console.log('Scanning ' + files.length + ' specification files...\n');
  for (const result of results.filter((r) => r.violations.length)) {
    console.log(
      colors.bold +
        path.relative(path.join(__dirname, '..'), result.file) +
        colors.reset,
    );
    for (const violation of result.violations) {
      const color = violation.severity === 'error' ? colors.red : colors.yellow;
      console.log(
        color +
          '  Line ' +
          violation.line +
          ': ' +
          violation.found +
          ' → ' +
          violation.canonical +
          colors.reset,
      );
      console.log('    ' + violation.lineText);
    }
    console.log('');
  }
  if (violations.length === 0) {
    console.log(
      colors.green +
        colors.bold +
        '✓ No terminology violations found!' +
        colors.reset +
        '\n',
    );
    console.log(
      'All ' +
        files.length +
        ' specification files are compliant with TERMINOLOGY_GLOSSARY.md\n',
    );
  } else {
    console.log(
      'Summary:\n  Total violations: ' +
        violations.length +
        '\n  Errors: ' +
        totalErrors +
        '\n  Warnings: ' +
        totalWarnings +
        '\n  Files with violations: ' +
        run.filesWithViolations,
    );
  }
  return totalErrors > 0 ? 1 : 0;
}

if (require.main === module) {
  try {
    process.exitCode = validate();
  } catch (error) {
    console.error('Terminology validation failed: ' + error.message);
    process.exitCode = 1;
  }
}
exports.validate = validate;
