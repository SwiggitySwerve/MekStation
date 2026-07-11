#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

type Severity = 'error' | 'tracked';

export interface PlaceholderAllowlistEntry {
  capability: string;
  path: string;
  owningChange: string;
  reason: string;
}

export interface DuplicateOwnerAllowlistEntry {
  codeHome: string;
  capabilities: string[];
  owningChange: string;
  reason: string;
}

export interface CodeHomeClaim {
  codeHome: string;
  capabilities: string[];
}

export interface OwnershipOrder {
  capability: string;
  order: Array<{
    change: string;
    sequence: number;
    role: string;
  }>;
}

export interface SpecPurposeConfig {
  version: number;
  generatedAt?: string;
  placeholderAllowlist: PlaceholderAllowlistEntry[];
  duplicateOwnerAllowlist: DuplicateOwnerAllowlistEntry[];
  codeHomeClaims: CodeHomeClaim[];
  activeChangeOwnershipOrder: OwnershipOrder[];
}

export interface Finding {
  severity: Severity;
  kind:
    | 'missing-purpose'
    | 'empty-purpose'
    | 'bare-tbd-purpose'
    | 'archive-placeholder-purpose'
    | 'stale-placeholder-allowlist'
    | 'duplicate-code-home-owner'
    | 'stale-duplicate-allowlist';
  capability: string;
  file?: string;
  line?: number;
  message: string;
  owningChange?: string;
}

export interface PurposeRecord {
  capability: string;
  file: string;
  headingLine?: number;
  headingLevel?: number;
  body: string;
}

export interface LintResult {
  specRoot: string;
  filesScanned: number;
  errors: Finding[];
  trackedDebt: Finding[];
  activeChangeOwnershipOrder: OwnershipOrder[];
}

interface CliOptions {
  root: string;
  specRoot?: string;
  configPath: string;
  json: boolean;
}

const archivePlaceholderPattern = /TBD - created by archiving/i;
const bareTbdPattern = /^TBD\.?$/i;

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/');
}

function capabilityFromSpecFile(file: string, specRoot: string): string {
  const relative = normalizePath(path.relative(specRoot, file));
  return relative.split('/')[0];
}

function findSpecFiles(specRoot: string): string[] {
  if (!fs.existsSync(specRoot)) {
    return [];
  }

  return fs
    .readdirSync(specRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(specRoot, entry.name, 'spec.md'))
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
}

function extractPurpose(file: string, specRoot: string): PurposeRecord {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const capability = capabilityFromSpecFile(file, specRoot);
  let headingIndex = lines.findIndex((line) =>
    /^##\s+Purpose\s*$/i.test(line.trim()),
  );

  if (headingIndex < 0) {
    headingIndex = lines.findIndex((line) =>
      /^###\s+Purpose\s*$/i.test(line.trim()),
    );
  }

  if (headingIndex < 0) {
    return {
      capability,
      file,
      body: '',
    };
  }

  const heading = lines[headingIndex].trim();
  const headingLevel = heading.match(/^#+/)?.[0].length ?? 2;
  const nextHeadingPattern = new RegExp(`^#{1,${headingLevel}}\\s+\\S`);
  const bodyLines: string[] = [];

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (nextHeadingPattern.test(line.trim())) {
      break;
    }
    bodyLines.push(line);
  }

  return {
    capability,
    file,
    headingLine: headingIndex + 1,
    headingLevel,
    body: bodyLines.join('\n').trim(),
  };
}

function relativeToRoot(root: string, file?: string): string | undefined {
  return file ? normalizePath(path.relative(root, file)) : undefined;
}

function loadConfig(configPath: string): SpecPurposeConfig {
  const content = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(content) as SpecPurposeConfig;
}

function purposeFinding(
  record: PurposeRecord,
  root: string,
): Omit<Finding, 'severity' | 'owningChange'> | undefined {
  const file = relativeToRoot(root, record.file);

  if (record.headingLine === undefined) {
    return {
      kind: 'missing-purpose',
      capability: record.capability,
      file,
      message: 'spec.md is missing a Purpose section.',
    };
  }

  if (record.body.length === 0) {
    return {
      kind: 'empty-purpose',
      capability: record.capability,
      file,
      line: record.headingLine,
      message: 'Purpose section is empty.',
    };
  }

  if (bareTbdPattern.test(record.body.trim())) {
    return {
      kind: 'bare-tbd-purpose',
      capability: record.capability,
      file,
      line: record.headingLine,
      message: 'Purpose section is a bare TBD.',
    };
  }

  if (archivePlaceholderPattern.test(record.body)) {
    return {
      kind: 'archive-placeholder-purpose',
      capability: record.capability,
      file,
      line: record.headingLine,
      message: 'Purpose section still contains the archive placeholder.',
    };
  }

  return undefined;
}

function isPointerPurpose(
  purpose: string,
  capability: string,
  groupCapabilities: string[],
): boolean {
  const lower = purpose.toLowerCase();
  if (!/(pointer|canonical|authoritative|see|owned by|delegates to)/.test(lower)) {
    return false;
  }

  return groupCapabilities
    .filter((other) => other !== capability)
    .some((other) => lower.includes(other.toLowerCase()));
}

function duplicateKey(codeHome: string): string {
  return codeHome.toLowerCase();
}

function analyzeDuplicateOwners(
  config: SpecPurposeConfig,
  purposeByCapability: Map<string, PurposeRecord>,
  root: string,
): { errors: Finding[]; trackedDebt: Finding[] } {
  const errors: Finding[] = [];
  const trackedDebt: Finding[] = [];
  const duplicateAllowlistByCodeHome = new Map(
    config.duplicateOwnerAllowlist.map((entry) => [
      duplicateKey(entry.codeHome),
      entry,
    ]),
  );
  const unresolvedDuplicateCodeHomes = new Set<string>();

  for (const claim of config.codeHomeClaims) {
    const nonPointerCapabilities = claim.capabilities.filter((capability) => {
      const purpose = purposeByCapability.get(capability);
      if (!purpose) {
        return true;
      }
      return !isPointerPurpose(
        purpose.body,
        capability,
        claim.capabilities,
      );
    });

    if (nonPointerCapabilities.length < 2) {
      continue;
    }

    const key = duplicateKey(claim.codeHome);
    unresolvedDuplicateCodeHomes.add(key);
    const allowlistEntry = duplicateAllowlistByCodeHome.get(key);
    const message = `${claim.codeHome} is claimed by ${nonPointerCapabilities.join(', ')}.`;

    if (allowlistEntry) {
      trackedDebt.push({
        severity: 'tracked',
        kind: 'duplicate-code-home-owner',
        capability: nonPointerCapabilities.join(','),
        message,
        owningChange: allowlistEntry.owningChange,
      });
    } else {
      errors.push({
        severity: 'error',
        kind: 'duplicate-code-home-owner',
        capability: nonPointerCapabilities.join(','),
        message,
      });
    }
  }

  for (const allowlistEntry of config.duplicateOwnerAllowlist) {
    const key = duplicateKey(allowlistEntry.codeHome);
    if (!unresolvedDuplicateCodeHomes.has(key)) {
      errors.push({
        severity: 'error',
        kind: 'stale-duplicate-allowlist',
        capability: allowlistEntry.capabilities.join(','),
        message: `${allowlistEntry.codeHome} is allowlisted but no duplicate owner violation remains.`,
        owningChange: allowlistEntry.owningChange,
      });
    }
  }

  return { errors, trackedDebt };
}

export function runSpecPurposeLint(
  options: Partial<CliOptions> = {},
): LintResult {
  const root = path.resolve(options.root ?? process.cwd());
  const configPath = path.resolve(
    options.configPath ??
      path.join(__dirname, 'spec-purpose-allowlist.json'),
  );
  const specRoot = path.resolve(
    options.specRoot ?? path.join(root, 'openspec', 'specs'),
  );
  const config = loadConfig(configPath);
  const placeholderAllowlistByCapability = new Map(
    config.placeholderAllowlist.map((entry) => [entry.capability, entry]),
  );
  const unresolvedPlaceholderCapabilities = new Set<string>();
  const errors: Finding[] = [];
  const trackedDebt: Finding[] = [];
  const purposeRecords = findSpecFiles(specRoot).map((file) =>
    extractPurpose(file, specRoot),
  );
  const purposeByCapability = new Map(
    purposeRecords.map((record) => [record.capability, record]),
  );

  for (const record of purposeRecords) {
    const finding = purposeFinding(record, root);
    if (!finding) {
      continue;
    }

    const allowlistEntry = placeholderAllowlistByCapability.get(
      record.capability,
    );
    if (allowlistEntry) {
      unresolvedPlaceholderCapabilities.add(record.capability);
      trackedDebt.push({
        ...finding,
        severity: 'tracked',
        owningChange: allowlistEntry.owningChange,
      });
    } else {
      errors.push({
        ...finding,
        severity: 'error',
      });
    }
  }

  for (const allowlistEntry of config.placeholderAllowlist) {
    if (!unresolvedPlaceholderCapabilities.has(allowlistEntry.capability)) {
      errors.push({
        severity: 'error',
        kind: 'stale-placeholder-allowlist',
        capability: allowlistEntry.capability,
        file: allowlistEntry.path,
        message: `${allowlistEntry.capability} is allowlisted but no placeholder Purpose violation remains.`,
        owningChange: allowlistEntry.owningChange,
      });
    }
  }

  const duplicateResults = analyzeDuplicateOwners(
    config,
    purposeByCapability,
    root,
  );

  return {
    specRoot,
    filesScanned: purposeRecords.length,
    errors: [...errors, ...duplicateResults.errors],
    trackedDebt: [...trackedDebt, ...duplicateResults.trackedDebt],
    activeChangeOwnershipOrder: config.activeChangeOwnershipOrder,
  };
}

function parseArgs(args: string[]): CliOptions {
  const defaultConfigPath = path.join(
    __dirname,
    'spec-purpose-allowlist.json',
  );
  const options: CliOptions = {
    root: process.cwd(),
    configPath: defaultConfigPath,
    json: false,
  };
  const valueHandlers: Record<string, (value: string | undefined) => boolean> = {
    '--root': (value) => {
      if (!value) return false;
      options.root = value;
      return true;
    },
    '--spec-root': (value) => {
      if (!value) return false;
      options.specRoot = value;
      return true;
    },
    '--config': (value) => {
      if (!value) return false;
      options.configPath = value;
      return true;
    },
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }

    const consumeValue = valueHandlers[arg];
    if (consumeValue?.(args[index + 1])) {
      index += 1;
    }
  }

  return options;
}

function formatFinding(finding: Finding): string {
  const location = finding.file
    ? `${finding.file}${finding.line ? `:${finding.line}` : ''}`
    : finding.capability;
  const owner = finding.owningChange
    ? ` (owning change: ${finding.owningChange})`
    : '';
  return `- [${finding.severity}] ${finding.kind}: ${location} - ${finding.message}${owner}`;
}

function printHuman(result: LintResult): void {
  console.log('OpenSpec spec-purpose lint');
  console.log(`Spec root: ${normalizePath(result.specRoot)}`);
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`Errors: ${result.errors.length}`);
  console.log(`Tracked source-of-truth debt: ${result.trackedDebt.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors');
    for (const finding of result.errors) {
      console.log(formatFinding(finding));
    }
  }

  if (result.trackedDebt.length > 0) {
    console.log('\nTracked debt');
    for (const finding of result.trackedDebt) {
      console.log(formatFinding(finding));
    }
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = runSpecPurposeLint(options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

if (path.resolve(process.argv[1] ?? '') === path.resolve(__filename)) {
  main();
}
