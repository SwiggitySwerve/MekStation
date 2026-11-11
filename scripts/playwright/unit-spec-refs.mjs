#!/usr/bin/env node
// Owns literal unit-to-E2E reference selection. Ported from C5's lane tool.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIMIT =
  'LIMIT: literal references only (id, "Chassis Model", or chassis and model literals within 5 lines). Specs that pick units by family, directory or glob are not listed; the shared-flows map path globs cover those.';
const extension = /\.(ts|tsx|js|mjs|cjs|json)$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const gitAt = (repo) => (args) =>
  execFileSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 64 << 20,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

export function decodeChangedPaths(nul, plain) {
  const files = nul.split('\0').filter(Boolean);
  const count = plain.split(/\r?\n/).filter(Boolean).length;
  if (count !== files.length)
    throw new Error(
      `unit-spec-refs: changed-file count mismatch (-z ${files.length}, plain ${count}); stopping`,
    );
  return files;
}

export function changedUnitFiles(
  range,
  { repo = process.cwd(), git = gitAt(repo) } = {},
) {
  const args = [
    'diff',
    '--name-only',
    '--no-renames',
    range,
    '--',
    'public/data/units',
  ];
  // Git quotes non-ASCII paths without -z. Compare counts before filtering.
  return decodeChangedPaths(git(['diff', '-z', ...args.slice(1)]), git(args));
}

function literalLines(text, value) {
  if (!value) return [];
  return [...text.matchAll(new RegExp(`['"\`]${esc(value)}['"\`]`, 'g'))].map(
    (match) => text.slice(0, match.index).split('\n').length,
  );
}

export function fieldsNear(text, chassis, model) {
  if (!chassis || !model || !text.includes(chassis) || !text.includes(model))
    return false;
  const a = literalLines(text, chassis);
  const b = literalLines(text, model);
  return a.some((x) => b.some((y) => Math.abs(x - y) <= 5));
}

/** Pure selection over unit identities and the current E2E source text. */
export function specsForChangedUnits(units, text, { exclude = [] } = {}) {
  const consumers = new Map();
  for (const file of text.keys()) {
    const base = path.posix.basename(file).replace(extension, '');
    const re = new RegExp(
      `['"\`/]${esc(base)}(\\.(ts|tsx|js|mjs|cjs|json))?['"\`]`,
    );
    consumers.set(
      file,
      [...text]
        .filter(
          ([other, source]) =>
            other !== file && source.includes(base) && re.test(source),
        )
        .map(([other]) => other),
    );
  }
  const reach = (file) => {
    const seen = new Set();
    const specs = new Set();
    const stack = [file];
    while (stack.length) {
      const next = stack.pop();
      if (seen.has(next)) continue;
      seen.add(next);
      if (next.endsWith('.spec.ts')) specs.add(next);
      else stack.push(...(consumers.get(next) ?? []));
    }
    return [...specs].sort();
  };
  const report = units.map((unit) => {
    const idRe = new RegExp(`(^|[^a-z0-9-])${esc(unit.id)}([^a-z0-9-]|$)`);
    const hits = [];
    for (const [file, source] of text) {
      const byId = source.includes(unit.id) && idRe.test(source);
      const byName =
        unit.name &&
        unit.name.includes(' ') &&
        unit.name.length >= 6 &&
        source.includes(unit.name);
      const byFields = !byName && fieldsNear(source, unit.chassis, unit.model);
      if (byId || byName || byFields)
        hits.push({
          file,
          by: [
            byId && 'id',
            byName && 'name',
            byFields && 'chassis+model fields',
          ]
            .filter(Boolean)
            .join('+'),
        });
    }
    return {
      ...unit,
      hits,
      specs: [...new Set(hits.flatMap(({ file }) => reach(file)))].sort(),
    };
  });
  const excluded = new Set(exclude);
  return {
    units: report,
    specs: [...new Set(report.flatMap(({ specs }) => specs))]
      .filter((spec) => !excluded.has(spec))
      .sort(),
  };
}

/** Read changed unit identities at head (or base for deletions) and live E2E sources. */
export function refsForFiles(repo, files, { range, exclude = [] } = {}) {
  const unitFiles = files
    .map((file) => file.replaceAll('\\', '/'))
    .filter(
      (file) =>
        file.startsWith('public/data/units/') &&
        file.endsWith('.json') &&
        !/manifest|index/i.test(path.posix.basename(file)),
    );
  if (!unitFiles.length) return { units: [], specs: [] };
  const git = gitAt(repo);
  const [base, head] = range ? range.split(/\.\.\.?/) : [];
  const units = unitFiles.map((file) => {
    for (const rev of range ? [head, base] : [null]) {
      let raw;
      try {
        raw = rev
          ? git(['show', `${rev}:${file}`])
          : fs.readFileSync(path.join(repo, file), 'utf8');
      } catch (error) {
        if (rev === head) continue; // A deleted unit is still keyed by its base identity.
        throw new Error(`Cannot read changed unit ${file}`, { cause: error });
      }
      const unit = JSON.parse(raw);
      if (typeof unit.id !== 'string' || !unit.id)
        throw new Error(`Changed unit has no id: ${file}`);
      return {
        file,
        id: unit.id,
        chassis: unit.chassis ?? '',
        model: unit.model ?? '',
        name: `${unit.chassis ?? ''} ${unit.model ?? ''}`.trim(),
        rev: rev ?? 'worktree',
      };
    }
    throw new Error(`Cannot read changed unit ${file}`);
  });
  const sources = git(['ls-files', '-z', 'e2e'])
    .split('\0')
    .filter((file) => extension.test(file));
  const text = new Map(
    sources.map((file) => [
      file,
      fs.readFileSync(path.join(repo, file), 'utf8'),
    ]),
  );
  return specsForChangedUnits(units, text, { exclude });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name) =>
    args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const repo = path.resolve(option('--repo') ?? process.cwd());
  const range = option('--range');
  if (!range && !args.includes('--files'))
    throw new Error(
      'Usage: unit-spec-refs.mjs [--repo <path>] (--range <base>...<head> | --files <path>...)',
    );
  const files = range
    ? changedUnitFiles(range, { repo })
    : args.slice(args.indexOf('--files') + 1);
  const report = refsForFiles(repo, files, { range });
  console.log(
    `changed unit files: ${report.units.length}; referenced by e2e: ${report.units.filter(({ hits }) => hits.length).length}`,
  );
  for (const unit of report.units.filter(({ hits }) => hits.length)) {
    console.log(
      `\n${unit.file}\n  id ${unit.id}; name "${unit.name}" (read from ${unit.rev})`,
    );
    for (const hit of unit.hits)
      console.log(`  referenced in ${hit.file} (by ${hit.by})`);
    console.log(
      `  specs: ${unit.specs.join(', ') || '(none reach this file)'}`,
    );
  }
  console.log(
    `\nSPECS TO RUN (${report.specs.length}): ${report.specs.join(' ') || '(none)'}`,
  );
  console.log(LIMIT);
}
