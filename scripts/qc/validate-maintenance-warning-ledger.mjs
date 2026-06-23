#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const defaultLedgerPath = path.join(
  repoRoot,
  'docs',
  'qc',
  'maintenance-warning-ledger.json',
);
const scannerPath = path.join(
  repoRoot,
  'scripts',
  'maintenance',
  'scan-maintenance.mjs',
);

const waveCategories = new Set([
  'stale-todo',
  'file-bloat',
  'near-duplicate',
  'import-health',
  'design-violation',
]);
const actionableSeverities = new Set(['critical', 'high', 'medium', 'warn']);
const validStatuses = new Set(['fixed', 'accepted', 'follow-up']);

function parseArgs(argv) {
  const options = {
    ledgerPath:
      process.env.MEKSTATION_MAINTENANCE_LEDGER_PATH ?? defaultLedgerPath,
    scanJsonPath: process.env.MEKSTATION_MAINTENANCE_SCAN_JSON_PATH ?? null,
  };

  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;
    if (match[1] === 'ledger') {
      options.ledgerPath = path.resolve(repoRoot, match[2]);
    }
    if (match[1] === 'scan-json') {
      options.scanJsonPath = path.resolve(repoRoot, match[2]);
    }
  }

  return options;
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

function loadJson(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')));
}

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, '/');
}

function normalizeFile(file) {
  return String(file ?? '')
    .replaceAll('\\', '/')
    .replace(/^\.\//, '');
}

function findingKey(finding) {
  return [
    finding.category,
    finding.severity,
    normalizeFile(finding.file),
    finding.message,
  ].join('|');
}

function runScanner() {
  const result = spawnSync(process.execPath, [scannerPath, '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 100 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(
      `failed to run maintenance scanner: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `maintenance scanner exited ${result.status}: ${result.stderr}`,
    );
  }

  return JSON.parse(stripBom(result.stdout));
}

function liveScan(options) {
  if (options.scanJsonPath) {
    return loadJson(options.scanJsonPath);
  }
  return runScanner();
}

function isActionableWaveFinding(finding) {
  return (
    waveCategories.has(finding.category) &&
    actionableSeverities.has(finding.severity)
  );
}

function summarize(findings) {
  const summary = {};
  for (const finding of findings) {
    if (!waveCategories.has(finding.category)) continue;
    summary[finding.category] ??= {
      critical: 0,
      high: 0,
      medium: 0,
      warn: 0,
      info: 0,
    };
    summary[finding.category][finding.severity] ??= 0;
    summary[finding.category][finding.severity] += 1;
  }
  for (const category of waveCategories) {
    summary[category] ??= {
      critical: 0,
      high: 0,
      medium: 0,
      warn: 0,
      info: 0,
    };
  }
  return Object.fromEntries(
    [...Object.entries(summary)].sort(([a], [b]) => a.localeCompare(b)),
  );
}

function validateLedgerShape(ledger, issues) {
  if (ledger.version !== 1) {
    issues.push('ledger version must be 1');
  }
  if (!Array.isArray(ledger.categories)) {
    issues.push('ledger categories must be an array');
  } else {
    for (const category of waveCategories) {
      if (!ledger.categories.includes(category)) {
        issues.push(`ledger categories missing ${category}`);
      }
    }
  }
  if (!Array.isArray(ledger.entries)) {
    issues.push('ledger entries must be an array');
  }
}

function validateEntry(entry, index, issues) {
  const label = entry.key || `entries[${index}]`;
  for (const field of [
    'key',
    'category',
    'severity',
    'file',
    'message',
    'status',
    'rationale',
  ]) {
    if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
      issues.push(`${label}: ${field} must be a non-empty string`);
    }
  }

  if (!validStatuses.has(entry.status)) {
    issues.push(`${label}: status must be fixed, accepted, or follow-up`);
  }
  if (!waveCategories.has(entry.category)) {
    issues.push(`${label}: category is not a Wave 12 category`);
  }
  if (!actionableSeverities.has(entry.severity)) {
    issues.push(`${label}: severity must be critical, high, medium, or warn`);
  }

  const expectedKey = findingKey(entry);
  if (entry.key && entry.key !== expectedKey) {
    issues.push(`${label}: key does not match category/severity/file/message`);
  }

  const absolutePath = path.resolve(repoRoot, normalizeFile(entry.file));
  if (!fs.existsSync(absolutePath)) {
    issues.push(`${label}: file does not exist: ${entry.file}`);
  }

  if (
    entry.status === 'follow-up' &&
    (!Array.isArray(entry.followUps) || entry.followUps.length === 0)
  ) {
    issues.push(`${label}: follow-up entries must include followUps`);
  }
  if (
    entry.status === 'accepted' &&
    (!Array.isArray(entry.acceptanceEvidence) ||
      entry.acceptanceEvidence.length === 0)
  ) {
    issues.push(`${label}: accepted entries must include acceptanceEvidence`);
  }
}

function validate(options) {
  const issues = [];
  const warnings = [];
  const ledgerPath = path.resolve(repoRoot, options.ledgerPath);
  const ledger = loadJson(ledgerPath);
  const scan = liveScan(options);
  const findings = Array.isArray(scan.findings) ? scan.findings : [];
  const liveActionable = findings.filter(isActionableWaveFinding);
  const liveByKey = new Map(
    liveActionable.map((finding) => [findingKey(finding), finding]),
  );

  validateLedgerShape(ledger, issues);

  const ledgerEntries = Array.isArray(ledger.entries) ? ledger.entries : [];
  const ledgerByKey = new Map();
  ledgerEntries.forEach((entry, index) => {
    validateEntry(entry, index, issues);
    if (ledgerByKey.has(entry.key)) {
      issues.push(`${entry.key}: duplicate ledger key`);
    }
    ledgerByKey.set(entry.key, entry);
  });

  for (const [key, finding] of liveByKey) {
    const entry = ledgerByKey.get(key);
    if (!entry) {
      issues.push(
        `untracked actionable finding: ${finding.category} ${finding.severity} ${normalizeFile(finding.file)} - ${finding.message}`,
      );
      continue;
    }
    if (entry.status === 'fixed') {
      issues.push(`${key}: entry is marked fixed but still appears in scanner`);
    }
  }

  for (const entry of ledgerEntries) {
    if (!liveByKey.has(entry.key) && entry.status !== 'fixed') {
      warnings.push(`${entry.key}: tracked entry is no longer live`);
    }
  }

  return {
    issues,
    ledgerPath: toRepoRelative(ledgerPath),
    summary: summarize(findings),
    tracked: ledgerEntries.length,
    untracked: issues.filter((issue) =>
      issue.startsWith('untracked actionable finding:'),
    ).length,
    warnings,
  };
}

try {
  const result = validate(parseArgs(process.argv.slice(2)));
  console.log(`[maintenance-ledger] ledger: ${result.ledgerPath}`);
  for (const [category, counts] of Object.entries(result.summary)) {
    console.log(
      `[maintenance-ledger] ${category}: critical=${counts.critical} high=${counts.high} medium=${counts.medium} warn=${counts.warn} info=${counts.info}`,
    );
  }
  for (const warning of result.warnings) {
    console.log(`WARN: ${warning}`);
  }
  for (const issue of result.issues) {
    console.error(`ERROR: ${issue}`);
  }
  console.log(
    `[maintenance-ledger] tracked=${result.tracked} untracked=${result.untracked} errors=${result.issues.length}`,
  );
  process.exit(result.issues.length > 0 ? 1 : 0);
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
