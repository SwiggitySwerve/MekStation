/** Catalog/source inputs: committed blobs, verified reference and normalized source bytes. */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

import {
  extractBlkTags,
  getBlkString,
} from '../../src/services/conversion/BlkParserService.helpers';
import { parseHeader } from '../../src/services/conversion/MTFParserHelpers';
import catalogNames from '../megameklab-conversion/catalog-families.json';
import folders from '../megameklab-conversion/strict-families.json';
import indexRuleData from '../megameklab-conversion/unit-index-rules.json';
import { familyOf, sourceKey } from '../unit-bv-parity';
import { sourceHash } from '../vehicle-aero-bv-delta';
import {
  compareText as compare,
  loadReference,
  parseRows,
} from './parity-scoreboard-io.cjs';

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
const ReferenceIdentity = z.object({
  ...sourceKey,
  chassis: z.string().min(1),
  model: z.string(),
  concreteFamily: z.string(),
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

/** Hosted identity joins consume only the checked-in oracle and catalog blobs. */
export function readCommittedReference(repo: string): {
  bytes: Buffer;
  references: z.infer<typeof ReferenceIdentity>[];
} {
  const directory = path.join(repo, 'config/reference');
  const { reference } = z
    .object({
      reference: z.object({
        rows: z.number().int().positive(),
        file: z.string(),
        gzipSha256: z.string(),
        sha256: z.string(),
        sidecar: z.string(),
        sidecarSha256: z.string(),
      }),
    })
    .parse(
      JSON.parse(
        fs.readFileSync(path.join(directory, 'parity-scoreboard.json'), 'utf8'),
      ) as unknown,
    );
  const { bytes } = loadReference(directory, reference);
  const references = parseRows(bytes).map((row) =>
    ReferenceIdentity.parse(row),
  );
  if (references.length !== reference.rows)
    throw new Error(
      `reference-population-mismatch: expected=${reference.rows}, actual=${references.length}`,
    );
  return { bytes, references };
}

export function readCatalog(
  repo: string,
  commit: string,
  families: readonly string[],
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

export const catalogFamily = (family: string): string =>
  (catalogNames as Record<string, string>)[family] ?? family;

export interface ISource {
  path: string;
  sha256: string;
  family: string;
  chassis: string;
  model: string;
  sourceText: string;
}

export function sourceIdentity(
  file: string,
  text: string,
): Pick<ISource, 'family' | 'chassis' | 'model'> {
  if (file.endsWith('.mtf')) {
    const header = parseHeader(text.split(/\r?\n/));
    return {
      family: familyOf({ path: file, concreteFamily: '' }),
      chassis: header.chassis,
      model: header.model,
    };
  }
  const tags = extractBlkTags(text);
  const family = familyOf({
    path: file,
    concreteFamily: getBlkString(tags.UnitType) ?? '',
  });
  return {
    family: catalogFamily(family),
    chassis: getBlkString(tags.Name) ?? getBlkString(tags.name) ?? '',
    model: getBlkString(tags.Model) ?? getBlkString(tags.model) ?? '',
  };
}

export function readSources(mekfiles: string): ISource[] {
  const sources: ISource[] = [];
  const visit = (directory: string, extension: string) => {
    for (const entry of fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => compare(a.name, b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Source symlink: ${file}`);
      if (entry.isDirectory()) visit(file, extension);
      else if (entry.isFile() && entry.name.endsWith(extension)) {
        const bytes = fs.readFileSync(file),
          relative = path.relative(mekfiles, file).split(path.sep).join('/');
        // Equivalent LF/CRLF source checkouts must produce the same NDJSON bytes.
        const sourceText = bytes.toString('utf8').replace(/\r\n/g, '\n');
        sources.push({
          path: relative,
          // Hash UTF-8 source bytes with CRLF pairs normalized to LF (not Git blob bytes).
          // The same owner hashes MTF and BLK on Windows and Linux; lone CR is preserved.
          sha256: sourceHash(bytes),
          sourceText,
          ...sourceIdentity(relative, sourceText),
        });
      }
    }
  };
  for (const folder of Object.values(folders).flat())
    visit(path.join(mekfiles, folder), folder === 'meks' ? '.mtf' : '.blk');
  return sources;
}
