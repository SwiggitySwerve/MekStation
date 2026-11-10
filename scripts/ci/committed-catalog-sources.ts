/** Emit shipped catalog objects for the guarded census; see committed-catalog-sources.md. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  extractBlkTags,
  getBlkString,
} from '../../src/services/conversion/BlkParserService.helpers';
import { parseHeader } from '../../src/services/conversion/MTFParserHelpers';
import catalogNames from '../megameklab-conversion/catalog-families.json';
import folders from '../megameklab-conversion/strict-families.json';
import { familyOf, sourceKey } from '../unit-bv-parity';
import { writeSourceManifest } from '../unit-bv-provenance';
import { sourceHash } from '../vehicle-aero-bv-delta';
import { readCatalog, type ICatalogEntry } from './committed-catalog-inputs';
import { buildObjectParity } from './committed-catalog-parity';
import { parseRows, sha256 } from './parity-scoreboard-io.cjs';

const identityOnly = new Set(['battlearmor', 'infantry', 'protomechs']);
const catalogFamily = (family: string) =>
  (catalogNames as Record<string, string>)[family] ?? family;
const families = Object.keys(folders).map(catalogFamily);
const Reference = z.object(sourceKey);
interface IReference {
  path: string;
  sha256: string;
}
export interface ISource extends IReference {
  family: string;
  chassis: string;
  model: string;
  sourceText: string;
}
interface IRow extends IReference {
  unit: ICatalogEntry['unit'] | null;
  sourceText?: string;
}
interface IJoin extends IReference {
  catalogFile: string;
  catalogBlob: string;
  family: string;
  evaluation: string;
  alias: boolean;
}
interface IJoinResult {
  rows: IRow[];
  joins: IJoin[];
  errors: string[];
  aliases: number;
}
export const MECH_UNKNOWN_MODEL_ALIAS =
  'mech-catalog-Unknown-to-empty-source-model';
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Root's S0b compatibility rule: catalog mech Unknown represents an empty source model. */
export function catalogModel(family: string, model: string): string {
  return family === 'battlemechs' && model === 'Unknown' ? '' : model;
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

function key(family: string, chassis: string, model: string): string {
  return JSON.stringify([family, chassis, model]);
}

export function joinCatalog(
  catalog: readonly ICatalogEntry[],
  sources: readonly ISource[],
  references: readonly IReference[],
  allowIdentityOnly: boolean,
): IJoinResult {
  const byKey = new Map<string, ISource[]>();
  for (const source of sources) {
    const k = key(source.family, source.chassis, source.model);
    byKey.set(k, [...(byKey.get(k) ?? []), source]);
  }
  const catalogCounts = new Map<string, number>();
  for (const entry of catalog) {
    const k = key(
      entry.family,
      entry.unit.chassis,
      catalogModel(entry.family, entry.unit.model),
    );
    catalogCounts.set(k, (catalogCounts.get(k) ?? 0) + 1);
  }
  const refs = new Map<string, IReference[]>();
  for (const ref of references)
    refs.set(ref.path, [...(refs.get(ref.path) ?? []), ref]);
  const rows: IRow[] = [],
    errors: string[] = [];
  const joins: IJoin[] = [];
  for (const entry of [...catalog].sort((a, b) => compare(a.file, b.file))) {
    const model = catalogModel(entry.family, entry.unit.model);
    const k = key(entry.family, entry.unit.chassis, model);
    const matches = byKey.get(k) ?? [];
    if (catalogCounts.get(k) !== 1) {
      errors.push(`multiple-catalog-matches: ${entry.file}`);
      continue;
    }
    if (matches.length !== 1) {
      errors.push(
        `${matches.length ? 'multiple' : 'zero'}-source-matches: ${entry.file}: ${matches
          .map((s) => s.path)
          .sort()
          .join(', ')}`,
      );
      continue;
    }
    const source = matches[0];
    const reference = refs.get(source.path) ?? [];
    if (reference.length !== 1 || reference[0].sha256 !== source.sha256) {
      errors.push(
        `reference-verification-failed: ${entry.file}: ${source.path}: count=${reference.length}, source=${source.sha256}, reference=${reference
          .map((r) => r.sha256)
          .sort()
          .join(',')}`,
      );
      continue;
    }
    const sourceOnly = identityOnly.has(entry.family);
    if (sourceOnly && !allowIdentityOnly) {
      errors.push(
        `source-only-families-identity-only acknowledgement required: ${entry.file}`,
      );
      continue;
    }
    rows.push({
      path: source.path,
      sha256: source.sha256,
      unit: sourceOnly ? null : entry.unit,
      ...(sourceOnly ? { sourceText: source.sourceText } : {}),
    });
    joins.push({
      catalogFile: entry.file,
      catalogBlob: entry.blob,
      path: source.path,
      sha256: source.sha256,
      family: entry.family,
      evaluation: sourceOnly ? 'identity-only/source-text' : 'committed-unit',
      alias: model !== entry.unit.model,
    });
  }
  const joined = new Set(rows.map((r) => r.path));
  for (const ref of [...references].sort((a, b) => compare(a.path, b.path))) {
    if (!joined.has(ref.path))
      errors.push(`reference-without-catalog: ${ref.path}`);
  }
  rows.sort((a, b) => compare(a.path, b.path));
  return { rows, joins, errors, aliases: joins.filter((j) => j.alias).length };
}

function readSources(mekfiles: string): ISource[] {
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

export function emitCommittedCatalog(options: {
  repo: string;
  commit: string;
  mekfiles: string;
  reference: string;
  out: string;
  python: string;
  allowIdentityOnly: boolean;
  regenerated?: string;
}): boolean {
  const out = path.resolve(options.out);
  const protectedData = fs.realpathSync(path.join(options.repo, 'public/data'));
  let ancestor = out;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const relative = path.relative(protectedData, fs.realpathSync(ancestor));
  if (
    relative === '' ||
    (!relative.startsWith('..') && !path.isAbsolute(relative))
  )
    throw new Error('Output must be scratch, outside public/data');
  if (fs.existsSync(out))
    throw new Error('Output already exists; use a new scratch directory');
  fs.mkdirSync(out, { recursive: true });
  const report: {
    errors: string[];
    unjoinables: { file: string; reason: string }[];
    [key: string]: unknown;
  } = { errors: [], unjoinables: [] };
  try {
    const catalog = readCatalog(
      options.repo,
      options.commit,
      families,
      options.python,
    );
    const referenceBytes = fs.readFileSync(options.reference);
    const references = parseRows(referenceBytes).map((row) =>
      Reference.parse(row),
    );
    if (!references.length) throw new Error('Reference contains no rows');
    const result = joinCatalog(
      catalog.entries,
      readSources(options.mekfiles),
      references,
      options.allowIdentityOnly,
    );
    report.errors = [...catalog.errors, ...result.errors];
    report.unjoinables = catalog.unjoinables;
    const regenerationBytes = options.regenerated
      ? fs.readFileSync(options.regenerated)
      : undefined;
    const objectParity = buildObjectParity(
      catalog.entries,
      result.joins,
      regenerationBytes ? parseRows(regenerationBytes) : undefined,
    );
    report.errors.push(...objectParity.errors);
    Object.assign(report, {
      producer: 'committed-catalog',
      catalogCommit: catalog.commit,
      indexes: catalog.indexes,
      objectParity,
      ...(regenerationBytes
        ? { regeneratedSha256: sha256(regenerationBytes) }
        : {}),
      referenceSha256: sha256(referenceBytes),
      sourceOnlyFamiliesIdentityOnly: options.allowIdentityOnly,
      indexed: catalog.entries.length,
      joined: result.rows.length,
      aliases: result.aliases,
      modelAliasRule: MECH_UNKNOWN_MODEL_ALIAS,
      joins: result.joins,
      byFamily: Object.fromEntries(
        families.map((f) => [
          f,
          result.joins.filter((j) => j.family === f).length,
        ]),
      ),
    });
    if (report.errors.length) return false;
    const payload = Buffer.from(
      result.rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
    const file = path.join(out, 'sources.ndjson');
    fs.writeFileSync(file, payload);
    writeSourceManifest(
      file,
      payload,
      Object.values(folders).flat(),
      'full',
      options.python,
    );
    const manifest: unknown = JSON.parse(
      fs.readFileSync(file + '.manifest.json', 'utf8'),
    );
    fs.writeFileSync(
      file + '.manifest.json',
      JSON.stringify(
        {
          ...z.record(z.string(), z.unknown()).parse(manifest),
          committedCatalog: report,
        },
        null,
        2,
      ) + '\n',
    );
    return true;
  } catch (error) {
    report.errors.push(String(error));
    return false;
  } finally {
    fs.writeFileSync(
      path.join(out, 'committed-catalog-report.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
  }
}

if (require.main === module) {
  const { values } = parseArgs({
    options: {
      repo: { type: 'string', default: process.cwd() },
      commit: { type: 'string', default: 'HEAD' },
      mekfiles: { type: 'string' },
      reference: { type: 'string' },
      out: { type: 'string' },
      regenerated: { type: 'string' },
      python: { type: 'string', default: 'python' },
      'source-only-families-identity-only': { type: 'boolean', default: false },
    },
  });
  if (!values.mekfiles || !values.reference || !values.out)
    throw new Error('Required: --mekfiles --reference --out');
  const ok = emitCommittedCatalog({
    repo: values.repo,
    commit: values.commit,
    mekfiles: values.mekfiles,
    reference: values.reference,
    out: values.out,
    python: values.python,
    allowIdentityOnly: values['source-only-families-identity-only'],
    regenerated: values.regenerated,
  });
  process.stdout.write(
    `Committed catalog: ${ok ? 'emitted' : 'failed'}; report: ${path.join(values.out, 'committed-catalog-report.json')}\n`,
  );
  process.exitCode = ok ? 0 : 1;
}
