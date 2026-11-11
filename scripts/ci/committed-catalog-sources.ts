/** Emit shipped catalog objects for the guarded census; see committed-catalog-sources.md. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import folders from '../megameklab-conversion/strict-families.json';
import { familyOf, sourceKey } from '../unit-bv-parity';
import { writeSourceManifest } from '../unit-bv-provenance';
import {
  catalogFamily,
  readCatalog,
  readSources,
  type ISource,
  readCommittedReference,
  type ICatalogEntry,
} from './committed-catalog-inputs';
import { buildObjectParity } from './committed-catalog-parity';
import {
  compareText as compare,
  parseRows,
  sha256,
} from './parity-scoreboard-io.cjs';

export { sourceIdentity, type ISource } from './committed-catalog-inputs';

const identityOnly = new Set(['battlearmor', 'infantry', 'protomechs']);
const families = Object.keys(folders).map(catalogFamily);
const Reference = z.object(sourceKey);
interface IReference {
  path: string;
  sha256: string;
}

interface IRow extends IJoin {
  unit: ICatalogEntry['unit'] | null;
  sourceText?: string;
}
interface IJoin extends IReference {
  catalogFile: string;
  catalogBlob: string;
  family: string;
  evaluation: string;
  alias: boolean;
  sourceOnly: boolean;
}
interface IJoinResult {
  rows: IRow[];
  joins: IJoin[];
  errors: string[];
  aliases: number;
}
export const MECH_UNKNOWN_MODEL_ALIAS =
  'mech-catalog-Unknown-to-empty-source-model';

/** Root's S0b compatibility rule: catalog mech Unknown represents an empty source model. */
export function catalogModel(family: string, model: string): string {
  return family === 'battlemechs' && model === 'Unknown' ? '' : model;
}

function key(family: string, chassis: string, model: string): string {
  return JSON.stringify([family, chassis, model]);
}

export function joinCatalog(
  catalog: readonly ICatalogEntry[],
  sources: readonly ISource[],
  references: readonly IReference[],
  allowIdentityOnly: boolean,
  referenceOnly = false,
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
    const join = {
      catalogFile: entry.file,
      catalogBlob: entry.blob,
      path: source.path,
      sha256: source.sha256,
      family: entry.family,
      evaluation: referenceOnly
        ? 'identity-only/reference'
        : sourceOnly
          ? 'identity-only/source-text'
          : 'committed-unit',
      alias: model !== entry.unit.model,
      sourceOnly,
    };
    joins.push(join);
    rows.push({
      ...join,
      unit: sourceOnly ? null : entry.unit,
      ...(sourceOnly && !referenceOnly
        ? { sourceText: source.sourceText }
        : {}),
    });
  }
  const joined = new Set(rows.map((r) => r.path));
  for (const ref of [...references].sort((a, b) => compare(a.path, b.path))) {
    if (!joined.has(ref.path))
      errors.push(`reference-without-catalog: ${ref.path}`);
  }
  // Every validated index entry must produce one row; fixtures are outside the indexes.
  if (rows.length !== catalog.length)
    errors.push(
      `joined-population-mismatch: expected=${catalog.length}, actual=${rows.length}`,
    );
  rows.sort((a, b) => compare(a.path, b.path));
  return { rows, joins, errors, aliases: joins.filter((j) => j.alias).length };
}

export function emitCommittedCatalog(options: {
  repo: string;
  commit: string;
  mekfiles?: string;
  reference?: string;
  out: string;
  python: string;
  allowIdentityOnly: boolean;
  regenerated?: string;
  referenceOnly?: boolean;
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
    if (
      options.referenceOnly &&
      (options.mekfiles || options.reference || options.regenerated)
    )
      throw new Error(
        'reference-only mode accepts no mekfiles, reference or regenerated input',
      );
    const catalog = readCatalog(options.repo, options.commit, families);
    let referenceBytes: Buffer;
    let references: IReference[];
    let sources: ISource[];
    if (options.referenceOnly) {
      const committedReference = readCommittedReference(options.repo);
      referenceBytes = committedReference.bytes;
      references = committedReference.references;
      sources = committedReference.references.map((row) => ({
        ...row,
        family: catalogFamily(familyOf(row)),
        sourceText: '',
      }));
    } else {
      if (!options.reference || !options.mekfiles)
        throw new Error('Source-text mode requires --reference and --mekfiles');
      referenceBytes = fs.readFileSync(options.reference);
      references = parseRows(referenceBytes).map((row) => Reference.parse(row));
      sources = readSources(options.mekfiles);
    }
    if (!references.length) throw new Error('Reference contains no rows');
    const result = joinCatalog(
      catalog.entries,
      sources,
      references,
      options.allowIdentityOnly,
      options.referenceOnly,
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
      inputMode: options.referenceOnly ? 'committed-reference' : 'source-text',
      catalogCommit: catalog.commit,
      indexes: catalog.indexes,
      objectParity,
      ...(regenerationBytes
        ? { regeneratedSha256: sha256(regenerationBytes) }
        : {}),
      referenceSha256: sha256(referenceBytes),
      sourceOnlyFamiliesIdentityOnly: options.allowIdentityOnly,
      expectedPopulation: catalog.entries.length,
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
    if (options.referenceOnly)
      fs.writeFileSync(
        file + '.manifest.json',
        JSON.stringify(
          {
            version: 1,
            scope: 'committed-identity',
            folders: Object.values(folders).flat(),
            sourceCount: result.rows.length,
            sourcesSha256: sha256(payload),
            converterInputs: {},
          },
          null,
          2,
        ) + '\n',
      );
    else
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
      'reference-only': { type: 'boolean', default: false },
    },
  });
  if (
    !values.out ||
    (!values['reference-only'] && (!values.mekfiles || !values.reference))
  )
    throw new Error(
      'Required: --out and either --reference-only or --mekfiles --reference',
    );
  const ok = emitCommittedCatalog({
    repo: values.repo,
    commit: values.commit,
    mekfiles: values.mekfiles,
    reference: values.reference,
    out: values.out,
    python: values.python,
    allowIdentityOnly: values['source-only-families-identity-only'],
    regenerated: values.regenerated,
    referenceOnly: values['reference-only'],
  });
  process.stdout.write(
    `Committed catalog: ${ok ? 'emitted' : 'failed'}; report: ${path.join(values.out, 'committed-catalog-report.json')}\n`,
  );
  process.exitCode = ok ? 0 : 1;
}
