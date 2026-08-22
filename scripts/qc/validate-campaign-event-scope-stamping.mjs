#!/usr/bin/env node
/**
 * QC sweep: every campaign-event object literal that names a
 * CampaignEventType discriminant must stamp `scope` in the same object
 * (design D3 / task 3.1). A scan that matches nothing is a broken
 * pattern, not a clean tree.
 *
 * Usage:
 *   node scripts/qc/validate-campaign-event-scope-stamping.mjs
 *   node scripts/qc/validate-campaign-event-scope-stamping.mjs --scan-root=<dir>
 *   node scripts/qc/validate-campaign-event-scope-stamping.mjs --skip-self-check
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const campaignSyncPath = path.join(
  repoRoot,
  'src',
  'types',
  'campaign',
  'CampaignSync.ts',
);
const defaultScanRoot = path.join(repoRoot, 'src');
const fixtureSnippetPath = path.join(
  __dirname,
  '__fixtures__',
  'campaign-event-scope',
  'unstamped-event.ts',
);

/**
 * Parse CLI flags. Unknown flags fail closed so a typo cannot silently
 * skip the self-check or scan the wrong tree.
 */
function parseArgs(argv) {
  const options = { scanRoot: defaultScanRoot, skipSelfCheck: false };
  for (const token of argv) {
    if (token === '--skip-self-check') {
      options.skipSelfCheck = true;
      continue;
    }
    const match = /^--scan-root=(.+)$/.exec(token);
    if (match) {
      options.scanRoot = path.resolve(match[1]);
      continue;
    }
    fail(`unknown argument: ${token}`);
  }
  return options;
}

/** Read CampaignEventType union members from the canonical type file. */
function extractCampaignEventTypes(source) {
  const block = /export type CampaignEventType\s*=([\s\S]*?);/.exec(source);
  if (!block) return [];
  return Array.from(block[1].matchAll(/'([^']+)'/g)).map((match) => match[1]);
}

/** True if this relative path is a test, fixture, or declaration file. */
function isExcludedSource(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return (
    normalized.includes('/__tests__/') ||
    normalized.includes('/__fixtures__/') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx') ||
    normalized.endsWith('.spec.ts') ||
    normalized.endsWith('.spec.tsx') ||
    normalized.endsWith('.d.ts')
  );
}

/** Recursively list .ts/.tsx files under `root`. */
function listSourceFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!/\.tsx?$/.test(entry.name)) continue;
      files.push(full);
    }
  }
  return files.sort();
}

/**
 * Strip // and block comments that are outside strings so a commented
 * `type: 'FundsChanged'` cannot fake a construction site.
 */
function stripComments(source) {
  let output = '';
  let index = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        output += char;
      }
      index += 1;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }
    if (!inSingle && !inDouble && !inTemplate) {
      if (char === '/' && next === '/') {
        inLineComment = true;
        index += 2;
        continue;
      }
      if (char === '/' && next === '*') {
        inBlockComment = true;
        index += 2;
        continue;
      }
    }
    if (char === '\\' && (inSingle || inDouble || inTemplate)) {
      output += char + (next ?? '');
      index += 2;
      continue;
    }
    if (char === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
    else if (char === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
    else if (char === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
    output += char;
    index += 1;
  }
  return output;
}

/**
 * Walk left from `from` to the `{` that opens the containing object,
 * ignoring braces inside strings.
 */
function findObjectStart(source, from) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let index = from; index >= 0; index -= 1) {
    const char = source[index];
    const prev = source[index - 1];
    if (char === '\\' && (inSingle || inDouble || inTemplate)) continue;
    if (char === "'" && !inDouble && !inTemplate && prev !== '\\') {
      inSingle = !inSingle;
      continue;
    }
    if (char === '"' && !inSingle && !inTemplate && prev !== '\\') {
      inDouble = !inDouble;
      continue;
    }
    if (char === '`' && !inSingle && !inDouble && prev !== '\\') {
      inTemplate = !inTemplate;
      continue;
    }
    if (inSingle || inDouble || inTemplate) continue;
    if (char === '}') depth += 1;
    if (char === '{') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return -1;
}

/** Brace-match the object that starts at `start`. Returns the slice. */
function extractObjectLiteral(source, start) {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '\\' && (inSingle || inDouble || inTemplate)) {
      index += 1;
      continue;
    }
    if (char === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
    else if (char === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
    else if (char === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;
    if (inSingle || inDouble || inTemplate) continue;
    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

/**
 * True if the object text stamps `scope` as a property (`scope:` or
 * shorthand `scope,` / `scope }`). Nested payload fields named scope
 * would also match; current campaign payloads have no such field.
 */
function objectStampsScope(objectText) {
  return (
    /(?:^|[{\s,])scope\s*:/.test(objectText) ||
    /(?:^|[{\s,])scope\s*[,}]/.test(objectText)
  );
}

/** Scan one file for discriminant object literals. */
function scanFile(filePath, types) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const source = stripComments(raw);
  const typePattern = types
    .map((type) => type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`\\btype\\s*:\\s*(['"])(${typePattern})\\1`, 'g');
  const sites = [];
  for (const match of source.matchAll(regex)) {
    const index = match.index ?? 0;
    const start = findObjectStart(source, index);
    const objectText = start >= 0 ? extractObjectLiteral(source, start) : null;
    const line = source.slice(0, index).split('\n').length;
    sites.push({
      file: filePath,
      line,
      type: match[2],
      stamped: objectText ? objectStampsScope(objectText) : false,
    });
  }
  return sites;
}

/** Scan a directory tree; test/fixture files are skipped only under src. */
function scanTree(root, types, skipTests) {
  const files = listSourceFiles(root);
  const scanned = [];
  const sites = [];
  for (const file of files) {
    const relative = path.relative(root, file);
    if (skipTests && isExcludedSource(relative)) continue;
    scanned.push(file);
    sites.push(...scanFile(file, types));
  }
  return { scannedFiles: scanned, sites };
}

/** Print a scan report so a silent zero-match cannot hide a broken pattern. */
function reportScan(label, types, result) {
  const stamped = result.sites.filter((site) => site.stamped);
  const unstamped = result.sites.filter((site) => !site.stamped);
  const lines = [
    `QC campaign-event-scope: ${label}`,
    `  types extracted: ${types.length} [${types.join(', ')}]`,
    `  files scanned: ${result.scannedFiles.length}`,
    `  construction sites: ${result.sites.length}`,
    `  stamped: ${stamped.length}`,
    `  unstamped: ${unstamped.length}`,
  ];
  for (const site of unstamped) {
    lines.push(
      `  UNSTAMPED ${path.relative(repoRoot, site.file)}:${site.line} type=${site.type}`,
    );
  }
  process.stdout.write(`${lines.join('\n')}\n`);
  return unstamped;
}

function fail(message) {
  throw new Error(`CAMPAIGN_EVENT_SCOPE_QC: ${message}`);
}

/**
 * Prove the detector still fails on a known-unstamped snippet. A scan
 * that lets this fixture pass means the pattern broke.
 */
function runSelfCheck(types) {
  const snippet = fs.readFileSync(fixtureSnippetPath, 'utf8');
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'campaign-event-scope-'),
  );
  const tempFile = path.join(tempDir, 'unstamped-event.ts');
  try {
    fs.writeFileSync(tempFile, snippet);
    const result = scanTree(tempDir, types, false);
    reportScan('self-check fixture', types, result);
    const unstamped = result.sites.filter((site) => !site.stamped);
    const stamped = result.sites.filter((site) => site.stamped);
    if (result.sites.length === 0) {
      fail(
        'self-check matched zero construction sites; the scan pattern broke',
      );
    }
    if (unstamped.length === 0) {
      fail(
        'self-check did not fail the deliberately unstamped FundsChanged snippet',
      );
    }
    if (!unstamped.some((site) => site.type === 'FundsChanged')) {
      fail(
        'self-check did not flag type=FundsChanged on the unstamped snippet',
      );
    }
    if (!stamped.some((site) => site.type === 'PilotHired')) {
      fail(
        'self-check did not accept the stamped PilotHired control in the same snippet',
      );
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(campaignSyncPath)) {
    fail(`missing CampaignSync.ts at ${campaignSyncPath}`);
  }
  const types = extractCampaignEventTypes(
    fs.readFileSync(campaignSyncPath, 'utf8'),
  );
  if (types.length === 0) {
    fail(
      'extracted zero CampaignEventType members; the type-union pattern broke',
    );
  }
  if (!options.skipSelfCheck) {
    runSelfCheck(types);
  }
  if (!fs.existsSync(options.scanRoot)) {
    fail(`scan root does not exist: ${options.scanRoot}`);
  }
  const skipTests =
    path.resolve(options.scanRoot) === path.resolve(defaultScanRoot);
  const result = scanTree(options.scanRoot, types, skipTests);
  const unstamped = reportScan('scan', types, result);
  if (result.sites.length === 0) {
    fail('scanned zero construction sites; the scan pattern broke');
  }
  if (unstamped.length > 0) {
    fail(`${unstamped.length} unstamped campaign-event construction site(s)`);
  }
  process.stdout.write('QC campaign-event-scope: pass\n');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
