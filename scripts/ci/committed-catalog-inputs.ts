/** Immutable catalog input boundary: index membership and Git blob bytes. */
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { z } from 'zod';

import indexRuleData from '../megameklab-conversion/unit-index-rules.json';

export const CatalogUnit = z
  .object({ chassis: z.string().min(1), model: z.string() })
  .passthrough();
export interface ICatalogEntry {
  family: string;
  file: string;
  blob: string;
  unit: z.infer<typeof CatalogUnit>;
}
export interface IUnjoinable {
  file: string;
  reason: string;
}
const Index = z.object({
  totalUnits: z.number().int().nonnegative(),
  units: z.array(z.object({ path: z.string() })),
});

function git(repo: string, args: string[], input?: Buffer): Buffer {
  return execFileSync(
    'git',
    ['--no-replace-objects', '-c', 'core.quotepath=false', '-C', repo, ...args],
    {
      input,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 60000,
      windowsHide: true,
    },
  );
}

export function resolveCommit(repo: string, commit: string): string {
  return git(repo, ['rev-parse', '--verify', `${commit}^{commit}`])
    .toString('ascii')
    .trim();
}

/** Fixture membership has one JSON owner, also consumed by Python's index generator. */
const indexRules = z
  .object({
    fixtures: z.record(z.string(), z.array(z.string())),
    nonUnits: z.array(z.string()),
  })
  .parse(indexRuleData);

export function readCatalog(
  repo: string,
  commit: string,
  families: readonly string[],
  _python?: string,
): {
  commit: string;
  entries: ICatalogEntry[];
  unjoinables: IUnjoinable[];
  errors: string[];
  indexes: { file: string; blob: string }[];
} {
  const resolved = resolveCommit(repo, commit);
  const rules = indexRules;
  const tree = git(repo, [
    'ls-tree',
    '-rz',
    resolved,
    '--',
    ...families.map((f) => `public/data/units/${f}/`),
  ]);
  const objects = tree
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((line) => {
      const [header, file] = line.split('\t');
      const [mode, kind, blob] = header.split(' ');
      if (kind !== 'blob' || !['100644', '100755'].includes(mode))
        throw new Error(`Non-regular catalog entry: ${file}`);
      return { file, blob };
    })
    .filter((entry) => entry.file.endsWith('.json'));
  const blobs = new Map<string, { blob: string; bytes: Buffer }>();
  // Bounded batches avoid Windows command-length limits and pipe deadlocks.
  for (let start = 0; start < objects.length; start += 512) {
    const batch = objects.slice(start, start + 512);
    const buffer = git(
      repo,
      ['cat-file', '--batch'],
      Buffer.from(batch.map((e) => e.blob + '\n').join('')),
    );
    let offset = 0;
    for (const entry of batch) {
      const end = buffer.indexOf(10, offset);
      const [blob, kind, size] = buffer
        .subarray(offset, end)
        .toString('ascii')
        .split(' ');
      if (
        end < 0 ||
        blob !== entry.blob ||
        kind !== 'blob' ||
        !/^\d+$/.test(size)
      )
        throw new Error(`Invalid blob response: ${entry.file}`);
      offset = end + 1;
      const bytes = buffer.subarray(offset, offset + Number(size));
      offset += Number(size);
      if (bytes.length !== Number(size) || buffer[offset++] !== 10)
        throw new Error(`Truncated blob: ${entry.file}`);
      blobs.set(entry.file, { blob, bytes });
    }
    if (offset !== buffer.length)
      throw new Error('Unexpected trailing Git blob output');
  }
  const entries: ICatalogEntry[] = [],
    unjoinables: IUnjoinable[] = [],
    errors: string[] = [];
  const indexes: { file: string; blob: string }[] = [];
  for (const family of [...families].sort()) {
    const prefix = `public/data/units/${family}/`;
    const indexFile = prefix + 'index.json';
    try {
      const blob = blobs.get(indexFile);
      if (!blob) throw new Error(`Missing committed index: ${indexFile}`);
      const index = Index.parse(
        JSON.parse(blob.bytes.toString('utf8')) as unknown,
      );
      indexes.push({ file: indexFile, blob: blob.blob });
      if (index.totalUnits !== index.units.length)
        throw new Error(`Index total differs: ${indexFile}`);
      const indexed = new Set<string>();
      for (const entry of index.units) {
        const rel = entry.path;
        if (
          !rel ||
          rel.includes('\\') ||
          path.posix.isAbsolute(rel) ||
          path.posix.normalize(rel) !== rel ||
          rel.split('/').includes('..') ||
          !rel.endsWith('.json')
        )
          throw new Error(`Unsafe index path: ${indexFile}: ${rel}`);
        if (indexed.has(rel))
          throw new Error(`Duplicate index path: ${indexFile}: ${rel}`);
        indexed.add(rel);
        if (
          rules.nonUnits.includes(path.posix.basename(rel)) ||
          rules.fixtures[family]?.includes(rel)
        )
          throw new Error(`Excluded file in index: ${prefix + rel}`);
        const design = blobs.get(prefix + rel);
        if (!design)
          throw new Error(`Missing committed design: ${prefix + rel}`);
        entries.push({
          family,
          file: prefix + rel,
          blob: design.blob,
          unit: CatalogUnit.parse(
            JSON.parse(design.bytes.toString('utf8')) as unknown,
          ),
        });
      }
      for (const file of [...blobs.keys()]
        .filter((f) => f.startsWith(prefix))
        .sort()) {
        const rel = file.slice(prefix.length);
        if (
          indexed.has(rel) ||
          rules.nonUnits.includes(path.posix.basename(rel))
        )
          continue;
        if (rules.fixtures[family]?.includes(rel))
          unjoinables.push({ file, reason: 'legacy_fixture_not_in_index' });
        else errors.push(`unindexed-committed-design: ${file}`);
      }
    } catch (error) {
      errors.push(String(error));
    }
  }
  return { commit: resolved, entries, unjoinables, errors, indexes };
}
