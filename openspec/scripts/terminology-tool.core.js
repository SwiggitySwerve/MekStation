const fs = require('node:fs');
const path = require('node:path');

/** @returns {import('./terminology-tool.types').TerminologyConfig} */
function loadConfig(
  configPath = path.join(__dirname, 'terminology.config.json'),
) {
  return validateConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
}

const contextChecks = {
  'rule-descriptions': (context) => context.isRuleDescription,
  'code-block': (context) => context.inCodeBlock,
  rationale: (context) => context.isRationale,
  changelog: (context) => context.isChangelog,
  comparisons: (context) => context.isComparison,
};

function lineContext(lines, index, config) {
  let fences = 0;
  let typescript = false;
  for (const line of lines.slice(0, index)) {
    if (!line.trim().startsWith('```')) continue;
    fences++;
    if (line.includes('typescript') || line.includes('ts'))
      typescript = fences % 2 === 1;
  }
  const line = lines[index];
  const includes = (key) =>
    config.skipPatterns.contexts[key].some((p) => line.includes(p));
  return {
    inCodeBlock: fences % 2 === 1,
    inTypeScriptBlock: fences % 2 === 1 && typescript,
    isDeprecatedExample: includes('deprecated-examples'),
    isComparison: includes('comparisons'),
    isRuleDescription: includes('rule-descriptions'),
    isRationale: includes('rationale'),
    isChangelog: includes('changelog'),
  };
}

function shouldSkip(rule, context, line, config) {
  return (
    context.isDeprecatedExample ||
    context.isComparison ||
    (rule.skipContexts || []).some((key) => contextChecks[key]?.(context)) ||
    line.includes('http://') ||
    line.includes('https://') ||
    config.skipPatterns.lines.some((p) => line.includes(p)) ||
    /^\s*\|.*→.*\|/.test(line) ||
    /^\s*\|.*".*"\s*\|.*".*"\s*\|/.test(line)
  );
}

/** @param {string} file @param {string} content
 * @param {import('./terminology-tool.types').TerminologyConfig} config
 * @returns {import('./terminology-tool.types').Violation[]} */
function detectViolations(file, content, config) {
  const violations = [];
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const context = lineContext(lines, index, config);
    const groups = [
      { rules: config.deprecatedTerms, type: 'deprecated-term', flags: 'gi' },
      {
        rules: config.propertyViolations,
        type: 'property-naming',
        flags: 'gm',
      },
      { rules: config.capitalizationRules, type: 'capitalization', flags: 'g' },
    ];
    for (const group of groups) {
      const property = group.type === 'property-naming';
      if (
        property &&
        (!context.inCodeBlock || /^(const|let|var)\s+\w+/.test(line.trim()))
      )
        continue;
      for (const rule of group.rules) {
        if (!property && shouldSkip(rule, context, line, config)) continue;
        const regex = new RegExp(rule.pattern, rule.flags || group.flags);
        let match;
        while ((match = regex.exec(line)) !== null) {
          if (match[0].length === 0)
            throw new Error('Rule matched an empty value: ' + rule.id);
          violations.push({
            file,
            line: index + 1,
            column: match.index + 1,
            type: group.type,
            severity: rule.severity,
            ruleId: rule.id,
            found: property ? match[0].trim() : match[0],
            canonical: rule.canonical,
            context: rule.context,
            lineText: line.trim(),
            fixable: rule.fixable ?? true,
          });
        }
      }
    }
  });
  return violations;
}

exports.loadConfig = loadConfig;
exports.detectViolations = detectViolations;

function stringList(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

/** Configuration is untrusted JSON; validate all fields consumed by the owner. */
function validateConfig(config) {
  if (
    !config ||
    typeof config !== 'object' ||
    typeof config.version !== 'string'
  )
    throw new Error('Invalid terminology configuration');
  const ids = new Set();
  for (const name of [
    'deprecatedTerms',
    'propertyViolations',
    'capitalizationRules',
  ]) {
    if (!Array.isArray(config[name]))
      throw new Error('Invalid rule group: ' + name);
    for (const rule of config[name]) {
      if (
        !rule ||
        !['id', 'pattern', 'canonical'].every(
          (key) => typeof rule[key] === 'string' && rule[key].length > 0,
        ) ||
        !['error', 'warning'].includes(rule.severity) ||
        ids.has(rule.id)
      )
        throw new Error('Invalid or duplicate terminology rule');
      if (rule.flags !== undefined && typeof rule.flags !== 'string')
        throw new Error('Invalid regex flags: ' + rule.id);
      if (
        name === 'deprecatedTerms' &&
        (typeof rule.deprecated !== 'string' ||
          typeof rule.category !== 'string')
      )
        throw new Error('Invalid deprecated term: ' + rule.id);
      if (
        rule.preserveCase !== undefined &&
        typeof rule.preserveCase !== 'boolean'
      )
        throw new Error('Invalid case preservation: ' + rule.id);
      if (rule.fixable !== undefined && typeof rule.fixable !== 'boolean')
        throw new Error('Invalid fixable flag: ' + rule.id);
      if (
        rule.skipContexts !== undefined &&
        (!stringList(rule.skipContexts) ||
          rule.skipContexts.some((key) => !Object.hasOwn(contextChecks, key)))
      )
        throw new Error('Invalid skip context: ' + rule.id);
      const regex = new RegExp(
        rule.pattern,
        rule.flags || (name === 'deprecatedTerms' ? 'gi' : 'gm'),
      );
      if (!regex.global || regex.test(''))
        throw new Error(
          'Rule must consume a nonempty global match: ' + rule.id,
        );
      ids.add(rule.id);
    }
  }
  if (
    !config.skipPatterns ||
    !stringList(config.skipPatterns.lines) ||
    !config.skipPatterns.contexts
  )
    throw new Error('Invalid skip patterns');
  for (const name of [
    'deprecated-examples',
    'comparisons',
    'rule-descriptions',
    'rationale',
    'changelog',
  ]) {
    if (!stringList(config.skipPatterns.contexts[name]))
      throw new Error('Invalid context: ' + name);
  }
  if (
    !config.filePatterns ||
    !['specs', 'source', 'exclude'].every((key) =>
      stringList(config.filePatterns[key]),
    )
  )
    throw new Error('Invalid file patterns');
  if (
    !config.smartReplacements ||
    typeof config.smartReplacements !== 'object' ||
    Object.values(config.smartReplacements).some(
      (value) =>
        !value ||
        typeof value !== 'object' ||
        Object.values(value).some(
          (replacement) => typeof replacement !== 'string',
        ),
    )
  )
    throw new Error('Invalid smart replacements');
  return config;
}

const { execFileSync } = require('node:child_process');
const exclusions = {
  node_modules: (p) => p.includes('node_modules'),
  '.bak': (p) => p.endsWith('.bak'),
  dist: (p) => p.includes('/dist/'),
  build: (p) => p.includes('/build/'),
  'openspec/changes/archive': (p) => p.includes('/openspec/changes/archive/'),
  'openspec/scripts': (p) => p.includes('/openspec/scripts/'),
  'TERMINOLOGY_GLOSSARY.md': (p) => p.endsWith('TERMINOLOGY_GLOSSARY.md'),
  'TERMINOLOGY_FIX_REPORT.md': (p) => p.endsWith('TERMINOLOGY_FIX_REPORT.md'),
};

/** @param {string} file @param {import('./terminology-tool.types').CliOptions} options */
function selectedFile(file, options) {
  const normalized = file.split(path.sep).join('/');
  if (options.canonicalOnly) return path.basename(file) === 'spec.md';
  if (options.specsOnly)
    return normalized.includes('/openspec/') && normalized.endsWith('.md');
  const spec =
    /\/openspec\/(?:specs|changes)\//.test(normalized) &&
    normalized.endsWith('.md');
  return (
    spec ||
    (options.source && /\/src\//.test(normalized) && /\.tsx?$/.test(normalized))
  );
}

/** @param {string} root @param {import('./terminology-tool.types').CliOptions} options
 * @param {import('./terminology-tool.types').TerminologyConfig} config @returns {string[]} */
function findFiles(root, options, config) {
  const excluded = (file) => {
    const normalized = file.split(path.sep).join('/');
    return (
      ['VIOLATIONS_REPORT.md', 'VALIDATION_FINDINGS', '/templates/'].some((p) =>
        normalized.includes(p),
      ) ||
      config.filePatterns.exclude.some((p) =>
        Object.entries(exclusions).some(
          ([key, matches]) => p.includes(key) && matches(normalized),
        ),
      )
    );
  };
  const target = path.resolve(root);
  const files = [];
  if (options.changedOnly) {
    const names = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd: target,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
    files.push(
      ...names
        .map((name) => path.join(target, name))
        .filter(
          (file) =>
            fs.existsSync(file) &&
            !excluded(file) &&
            selectedFile(file, options),
        ),
    );
  } else {
    const visit = (file) => {
      if (excluded(file)) return;
      const stat = fs.statSync(file);
      if (stat.isDirectory()) {
        for (const entry of fs.readdirSync(file).sort())
          visit(path.join(file, entry));
      } else if (stat.isFile() && selectedFile(file, options)) {
        fs.accessSync(file, fs.constants.R_OK);
        files.push(file);
      }
    };
    visit(target);
  }
  if (files.length === 0)
    throw new Error(
      'No files found in the required terminology scope: ' + target,
    );
  return files;
}

exports.findFiles = findFiles;

// SIZE_OK: Root approved this cohesive shared contract within the finite source grant.
/** @param {import('./terminology-tool.types').FileResult[]} results
 * @returns {import('./terminology-tool.types').RunResult} */
function summarize(results) {
  const violations = results.flatMap((result) => result.violations);
  return {
    filesScanned: results.length,
    filesWithViolations: results.filter(
      (result) => result.violations.length > 0,
    ).length,
    totalViolations: violations.length,
    totalErrors: violations.filter(
      (violation) => violation.severity === 'error',
    ).length,
    totalWarnings: violations.filter(
      (violation) => violation.severity === 'warning',
    ).length,
    totalFixed: results.reduce((sum, result) => sum + result.fixed, 0),
    results,
  };
}

exports.summarize = summarize;
