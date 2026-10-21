#!/usr/bin/env node
// Advisory Linux comparison only. The required TS7 gate remains authoritative.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

export const TSRS_VERSION = '0.18.0-ts7.1.0-dev.20260929';
export const TSRS_SHA256 =
  'd0bd720c20e9900764811bb0f36e46d2d56916d3048e768053919d40db02a194';
export const PROJECTS = [
  ['root', ['--noEmit', '--skipLibCheck']],
  ['scripts', ['-p', 'scripts/tsconfig.json', '--noEmit']],
];
const BLOCK_LIMIT = 64 * 1024;
const SUMMARY_LIMIT = 900 * 1024;
const RUN_TIMEOUT_MS = 3 * 60 * 1000;

export function classifyExit(status) {
  if (status === 0) return 'clean';
  // TS7 7.0.x regressed to 1 for --noEmit errors; 7.1/tsrs restore tsc's 2.
  if (status === 1 || status === 2) return 'diagnostics';
  return 'error';
}

export function normalizeDiagnostics(output, cwd) {
  const root = cwd.replaceAll('\\', '/').replace(/\/$/, '') + '/';
  const diagnostics = [];
  const unparsed = [];
  let current;
  for (const line of stripVTControlCharacters(output)
    .replaceAll('\r\n', '\n')
    .split('\n')) {
    const header = /^(.*\(\d+,\d+\)): (error|warning) (TS\d+): (.*)$/.exec(
      line,
    );
    const global = /^(error|warning) (TS\d+): (.*)$/.test(line);
    if (header || global) {
      let normalized = line;
      if (header) {
        let location = header[1].replaceAll('\\', '/');
        if (location.startsWith(root)) location = location.slice(root.length);
        location = location.replace(/^\.\//, '');
        normalized = `${location}: ${header[2]} ${header[3]}: ${header[4]}`;
      }
      current = [normalized];
      diagnostics.push(current);
    } else if (/^\s+\S/.test(line) && current) {
      current.push(line);
    } else if (line.trim()) {
      unparsed.push(line);
      current = undefined;
    }
  }
  // Preserve duplicate counts and full multiline messages; only ordering is ignored.
  return {
    diagnostics: diagnostics.map((lines) => lines.join('\n')).sort(),
    unparsed,
  };
}

export function compareRuns(baseline, candidate, cwd) {
  const normalize = (run) => ({
    exit: classifyExit(run.status),
    stdout: normalizeDiagnostics(run.stdout ?? '', cwd),
    stderr: normalizeDiagnostics(run.stderr ?? '', cwd),
  });
  const ts7 = normalize(baseline);
  const tsrs = normalize(candidate);
  const problems = [];
  const timedOut = [baseline, candidate].some(
    (run) => run.error?.code === 'ETIMEDOUT',
  );
  for (const [name, run, normalized] of [
    ['TS7', baseline, ts7],
    ['tsrs', candidate, tsrs],
  ]) {
    const count =
      normalized.stdout.diagnostics.length +
      normalized.stderr.diagnostics.length;
    if (run.error?.code === 'ETIMEDOUT') {
      problems.push(`${name}: TIMEOUT after ${RUN_TIMEOUT_MS / 1000}s`);
    } else if (
      run.error ||
      run.signal ||
      normalized.exit === 'error' ||
      (normalized.exit === 'diagnostics' && count === 0) ||
      (normalized.exit === 'clean' && count > 0) ||
      normalized.stdout.unparsed.length ||
      normalized.stderr.unparsed.length
    ) {
      problems.push(
        `${name}: status=${run.status}, signal=${run.signal ?? 'none'}, error=${run.error?.message ?? 'none'}; unexpected exit/output`,
      );
    }
  }
  const diff = [];
  if (ts7.exit !== tsrs.exit)
    diff.push(`Exit classification: TS7=${ts7.exit}, tsrs=${tsrs.exit}`);
  for (const stream of ['stdout', 'stderr']) {
    for (const field of ['diagnostics', 'unparsed']) {
      const remaining = [...tsrs[stream][field]];
      for (const record of ts7[stream][field]) {
        const index = remaining.indexOf(record);
        if (index === -1) diff.push(`- TS7 ${stream}/${field}: ${record}`);
        else remaining.splice(index, 1);
      }
      diff.push(
        ...remaining.map((record) => `+ tsrs ${stream}/${field}: ${record}`),
      );
    }
  }
  return {
    parity: timedOut
      ? 'TIMEOUT'
      : problems.length
        ? 'ERROR'
        : diff.length
          ? 'MISMATCH'
          : 'MATCH',
    diff: [...problems, ...diff],
  };
}

export function clip(text, limit = BLOCK_LIMIT) {
  const bytes = Buffer.from(text);
  if (bytes.length <= limit) return text;
  const note = `\n[truncated; full ${bytes.length} bytes are in the job log]\n`;
  let end = Math.max(0, limit - Buffer.byteLength(note));
  // Avoid replacing a partial UTF-8 character with a larger replacement character.
  while (end > 0 && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.toString('utf8', 0, end) + note.slice(0, limit);
}

export function fenced(text, limit = BLOCK_LIMIT) {
  const body = clip(text, limit);
  const longest = Array.from(
    body.matchAll(/`+/g),
    (match) => match[0].length,
  ).reduce((max, length) => Math.max(max, length), 0);
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}text\n${body}\n${fence}\n`;
}

export function runSideCheck({
  cwd = process.cwd(),
  prefix,
  summary = process.env.GITHUB_STEP_SUMMARY,
}) {
  const report = [
    '## tsrs Side-Check (advisory)',
    '',
    'Extra, non-required check. TS7 remains the required gate. Times are cold wall seconds, not a benchmark.',
    `tsrs: ${TSRS_VERSION}; native SHA256: ${TSRS_SHA256}.`,
    '',
  ];
  const fullReport = [...report];
  const add = (...lines) => {
    report.push(...lines);
    fullReport.push(...lines);
  };
  const addBlock = (text) => {
    report.push(fenced(text));
    fullReport.push(fenced(text, Infinity));
  };
  let failed = false;
  try {
    if (!prefix)
      throw new Error(
        'Pass the isolated tsrs installation prefix as the first argument.',
      );
    const binary = path.join(prefix, 'node_modules/@tsrs/linux-x64-gnu/tsrs');
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(prefix, 'node_modules/tsrs/package.json'),
        'utf8',
      ),
    );
    const nativeManifest = JSON.parse(
      fs.readFileSync(
        path.join(prefix, 'node_modules/@tsrs/linux-x64-gnu/package.json'),
        'utf8',
      ),
    );
    const hash = createHash('sha256')
      .update(fs.readFileSync(binary))
      .digest('hex');
    if (
      manifest.version !== TSRS_VERSION ||
      nativeManifest.version !== TSRS_VERSION ||
      hash !== TSRS_SHA256
    ) {
      throw new Error(
        `tsrs integrity mismatch: version=${manifest.version}, nativeVersion=${nativeManifest.version}, sha256=${hash}`,
      );
    }
    add('Native binary integrity: MATCH (checked before execution).', '');
    for (const [project, args] of PROJECTS) {
      const runs = [];
      for (const [name, command, launcher, extra] of [
        ['TS7', process.execPath, ['node_modules/typescript7/bin/tsc'], []],
        ['tsrs', binary, [], ['--checkerAssignment', 'go', '--noLazyMembers']],
      ]) {
        const buildInfo = path.join(cwd, 'tsconfig.tsbuildinfo');
        if (project === 'root') fs.rmSync(buildInfo, { force: true });
        const start = performance.now();
        let result;
        try {
          result = spawnSync(
            command,
            [...launcher, ...args, '--pretty', 'false', ...extra],
            {
              cwd,
              encoding: 'utf8',
              timeout: RUN_TIMEOUT_MS,
              maxBuffer: 32 * 1024 * 1024,
              env: { ...process.env, NO_COLOR: '1' },
            },
          );
        } finally {
          if (project === 'root') fs.rmSync(buildInfo, { force: true });
        }
        const seconds = ((performance.now() - start) / 1000).toFixed(3);
        runs.push(result);
        add(
          `- ${project} / ${name}: ${seconds}s; exit ${result.status}; ${result.error?.code === 'ETIMEDOUT' ? 'TIMEOUT' : classifyExit(result.status)}.`,
        );
      }
      const comparison = compareRuns(...runs, cwd);
      failed ||= comparison.parity !== 'MATCH';
      add('', `${project} parity: **${comparison.parity}**`, '');
      if (comparison.diff.length) addBlock(comparison.diff.join('\n'));
      // Preserve unexpected output (including compiler crashes) for diagnosis.
      if (comparison.parity === 'ERROR' || comparison.parity === 'TIMEOUT') {
        for (const [index, run] of runs.entries()) {
          addBlock(
            `${index === 0 ? 'TS7' : 'tsrs'} stdout:\n${run.stdout ?? ''}\nstderr:\n${run.stderr ?? ''}`,
          );
        }
      }
    }
  } catch (error) {
    failed = true;
    add('Side-check: **ERROR**', '');
    addBlock(error.message);
  }
  const markdown = report.join('\n') + '\n';
  if (summary) fs.appendFileSync(summary, clip(markdown, SUMMARY_LIMIT));
  process.stdout.write(fullReport.join('\n') + '\n');
  // Job-level continue-on-error makes disagreements visible without gating the PR.
  return failed ? 1 : 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = runSideCheck({ prefix: process.argv[2] });
}
